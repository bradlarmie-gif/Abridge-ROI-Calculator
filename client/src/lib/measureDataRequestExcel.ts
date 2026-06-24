// xlsx-js-style renders the `.s` cell styles below; the community `xlsx`
// package silently dropped them (raw-grid output).
import * as XLSX from 'xlsx-js-style';
import { shareOrSaveBlob } from './pdf-save';
import type { MeasureState } from './measureCalculator';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
import { EXPLORE_DRIVERS, type ExploreQuadrant, type ExploreSetting } from './exploreDrivers';

type Row = (string | number | null)[];

// ── Brand palette ─────────────────────────────────────────────────────────────
const C = {
  black:        '1A1A1A',
  red:          'EA2C00',
  redLight:     'FEF6F3',   // very light red tint for driver rows
  cream:        'F5F0EB',   // warm section bg
  warmWhite:    'FAFAF8',   // near-white alt bg
  white:        'FFFFFF',
  separator:    'E8E2DC',   // warm gray row border
  driverLine:   'F2E8E4',   // subtle bottom on driver data rows
  textPrimary:  '1A1A1A',
  textBody:     '5C504A',   // warm dark gray
  textMuted:    '9E948C',   // muted warm gray
  textSection:  '4A3D36',   // dark warm brown
  inputFill:    'FFFDF0',   // very light warm yellow
  inputBorder:  'C4A882',   // warm tan box border
  filledFill:   'F2FAF4',   // very light green
  filledBorder: 'A3CCA8',   // light green border
  filledText:   '2D6E35',   // forest green
};

// ── Row heights (points) ──────────────────────────────────────────────────────
const H = {
  colHeader:  22,
  section:    19,
  driver:     20,
  dataRow:    42,   // tall enough for wrap text
  unitRow:    36,
};

const NUM_COLS = 6;
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Border helpers ────────────────────────────────────────────────────────────
function b(color: string, style: 'thin' | 'medium' = 'thin') {
  return { style, color: { rgb: color } };
}

// ── Style definitions ─────────────────────────────────────────────────────────

const S_HEADER = {
  font: { bold: true, sz: 10, color: { rgb: C.white } },
  fill: { fgColor: { rgb: C.black } },
  alignment: { vertical: 'center', horizontal: 'left', wrapText: false },
  border: { bottom: b(C.red, 'medium') },
};

const S_SECTION = {
  font: { bold: true, sz: 9, color: { rgb: C.textSection } },
  fill: { fgColor: { rgb: C.cream } },
  alignment: { vertical: 'center', indent: 1 },
  border: { top: b(C.separator), bottom: b(C.separator) },
};

const S_DRIVER = {
  font: { bold: true, sz: 10, color: { rgb: C.red } },
  fill: { fgColor: { rgb: C.redLight } },
  alignment: { vertical: 'center', indent: 1 },
  border: { left: b(C.red, 'medium'), bottom: b('F5EBE8') },
};

const S_FIELD_LABEL = {
  font: { bold: true, sz: 10, color: { rgb: C.textPrimary } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true, indent: 1 },
  border: { bottom: b(C.driverLine) },
};

const S_UNIT_LABEL = {
  font: { sz: 9, italic: false, color: { rgb: C.textBody } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true, indent: 2 },
  border: { bottom: b(C.separator) },
};

const S_DESC = {
  font: { sz: 9, color: { rgb: C.textBody } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.driverLine) },
};

const S_DESC_UNIT = {
  font: { sz: 9, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.separator) },
};

const S_SOURCE = {
  font: { sz: 9, italic: true, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top' },
  border: { bottom: b(C.driverLine) },
};

const S_SOURCE_UNIT = {
  font: { sz: 9, italic: true, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top' },
  border: { bottom: b(C.separator) },
};

const S_INPUT = {
  fill: { fgColor: { rgb: C.inputFill } },
  font: { sz: 10, color: { rgb: C.textPrimary } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: b(C.inputBorder), bottom: b(C.inputBorder),
    left: b(C.inputBorder), right: b(C.inputBorder),
  },
};

const S_PREFILLED = {
  fill: { fgColor: { rgb: C.filledFill } },
  font: { sz: 10, color: { rgb: C.filledText } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: b(C.filledBorder), bottom: b(C.filledBorder),
    left: b(C.filledBorder), right: b(C.filledBorder),
  },
};

const S_NOTE = {
  font: { sz: 8, italic: true, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.driverLine) },
};

const S_NOTE_UNIT = {
  font: { sz: 8, italic: true, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.separator) },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureCell(ws: XLSX.WorkSheet, ref: string, style: object) {
  if (!ws[ref]) {
    ws[ref] = { t: 'z', v: undefined };
  }
  ws[ref].s = style;
}

function styleIfExists(ws: XLSX.WorkSheet, ref: string, style: object) {
  if (!ws[ref]) return;
  ws[ref].s = style;
}

function mergeRow(ws: XLSX.WorkSheet, rowIdx: number) {
  ws['!merges'] = ws['!merges'] || [];
  (ws['!merges'] as XLSX.Range[]).push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: NUM_COLS - 1 } });
}

const QUADRANT_ORDER: ExploreQuadrant[] = ['Capacity', 'Workforce', 'Revenue', 'Quality'];

const SETTING_TAB: Record<string, string> = {
  outpatient: 'Outpatient',
  ed: 'ED',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const SETTING_DISPLAY: Record<string, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency Department',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const SETTING_TAB_COLORS: Record<string, string> = {
  outpatient: 'EA2C00',
  ed:         'C42800',
  inpatient:  'A82000',
  nursing:    '8C1A00',
};

const DATA_SOURCES: Record<string, string> = {
  patientAccess:          'EHR / Practice management',
  lwbsRecovery:           'ED operations / EHR',
  admissionCapture:       'ADT / Revenue Cycle',
  bedsideTime:            'Work sampling / EHR audit',
  nursingOvertime:        'Payroll / HR',
  providerWellbeing:      'HR / People Ops',
  physicianLocumAgency:   'HR / Finance',
  scribeCostReduction:    'Finance / Staffing',
  nursingRetention:       'HR / People Ops',
  nursingAgency:          'HR / Finance',
  wrvu:                   'EHR / Revenue Cycle',
  edEmLevel:              'EHR / Revenue Cycle',
  hccCapture:             'Revenue Cycle / Risk Adjustment',
  denialPrevention:       'Revenue Cycle / Billing',
  drgAccuracy:            'HIM / CDI team',
  obsDefense:             'HIM / Utilization Mgmt',
  nursingHapi:            'Quality / Infection Prevention',
  nursingFalls:           'Quality / Patient Safety',
  nursingCauti:           'Quality / Infection Prevention',
  nursingClabsi:          'Quality / Infection Prevention',
  nursingSepsis:          'Quality / Infection Prevention',
  nursingCdiResponse:     'HIM / CDI team',
  nursingDocCompletion:   'HIM / Revenue Cycle',
  nursingHcahps:          'Press Ganey / HCAHPS',
  nursingEarlyDeterioration: 'EHR / Clinical analytics',
  nursingBundleCompliance:'Quality / Infection Prevention',
  opCdiQueryTrend:        'HIM / CDI team',
  opCareGapClosureRate:   'Quality / Care Management',
  opHedisCompositeScore:  'Population Health / Quality',
  opMaStarsPerformance:   'CMS / Population Health',
  edCoreMeasureDocRate:   'Quality / Compliance',
  edDocDeficiencyRate:    'HIM / EHR audit',
  edPatientExperience:    'Press Ganey / HCAHPS',
  edNoteCompleteness:     'EHR / HIM audit',
  edSepsisBundle:         'Quality / Compliance',
  opAppointmentDelay:     'Practice management system',
  opThirdNextAvailable:   'Scheduling / Practice mgmt',
  opSameDayAccess:        'Scheduling system',
  opPanelSizePerProvider: 'EHR / Practice analytics',
};

function getDataSource(id: string): string {
  return DATA_SOURCES[id] || 'EHR / Quality team';
}

function formatCurrency(value: number, prefix?: string): string {
  const formatted = value >= 1000
    ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return prefix ? `${prefix}${formatted}` : formatted;
}

function getDriversForSetting(setting: string, state: MeasureState) {
  const tracked = state.trackedDrivers?.[setting];
  const hasTracked = tracked && Object.keys(tracked).length > 0;

  if (hasTracked) {
    const ids = new Set(Object.keys(tracked));
    return EXPLORE_DRIVERS.filter(d =>
      d.settings.includes(setting as ExploreSetting) && ids.has(d.id)
    );
  }
  return EXPLORE_DRIVERS.filter(d =>
    d.settings.includes(setting as ExploreSetting) &&
    d.visibility === 'quantified' &&
    !d.childOfDriverId &&
    !d.comingSoon
  );
}

interface BaselineField {
  label: string;
  desc: string;
  source: string;
  value: string | number | null;
  note: string;
}

function getBaselineFields(setting: string, state: MeasureState): BaselineField[] {
  const dep = state.deployment || {} as MeasureState['deployment'];
  const fields: BaselineField[] = [
    { label: 'Organization',      desc: 'Health system or hospital name',                       source: 'Your org',       value: dep.organizationName || null, note: '' },
    { label: 'Go-Live Date',      desc: 'Date Abridge launched in this setting',                 source: 'Abridge CS',     value: state.goLiveDate || null,     note: '' },
    { label: 'Months on Abridge', desc: 'Months since go-live at time of this measurement',      source: 'Calculated',     value: dep.monthsOnAbridge || null,  note: '' },
  ];

  if (setting === 'nursing') {
    fields.push({ label: 'Total Nurses (FTE)',   desc: 'Total bedside nursing FTEs on the unit(s)',       source: 'HR / Staffing',    value: dep.totalProviders || null, note: '' });
    fields.push({ label: 'Live on Abridge',      desc: 'Nurses actively using Abridge',                  source: 'Abridge CS',       value: dep.liveProviders || null,  note: '' });
    fields.push({ label: 'Annual Patient Days',  desc: 'Total inpatient patient-days per year',           source: 'ADT / Operations', value: null,                       note: 'Required for HAPI, Falls, CAUTI, CLABSI, and Sepsis calculations' });
  } else {
    fields.push({ label: 'Total Providers',         desc: 'Total provider FTEs in scope',                    source: 'HR / Scheduling',  value: dep.totalProviders || null,      note: '' });
    fields.push({ label: 'Live on Abridge',          desc: 'Providers actively using Abridge',               source: 'Abridge CS',       value: dep.liveProviders || null,       note: '' });
    fields.push({ label: 'MRU Providers',            desc: 'Providers meeting minimum recording usage',      source: 'Abridge CS',       value: dep.mruProviders || null,        note: '' });
    fields.push({ label: 'Total Encounters',         desc: 'Annual encounters in scope',                      source: 'EHR / Practice mgmt', value: dep.totalEncounters || null,  note: '' });
    fields.push({ label: 'Abridge Encounters',       desc: 'Encounters using Abridge',                        source: 'Abridge CS',       value: dep.abridgeEncounters || null,   note: '' });
    fields.push({ label: 'Non-Abridge Encounters',   desc: 'Control group — same providers without Abridge', source: 'EHR / Abridge CS', value: dep.nonAbridgeEncounters || null, note: 'Establishes the comparison baseline' });
  }
  return fields;
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSettingSheet(setting: string, state: MeasureState): XLSX.WorkSheet {
  const aoa: Row[] = [];
  const rowHeights: number[] = [];

  const drivers = getDriversForSetting(setting, state);
  const baselineFields = getBaselineFields(setting, state);

  // Column header
  aoa.push(['Field', 'Description / How to find it', 'Data Source', 'Before Abridge', 'After Abridge', 'Notes']);
  rowHeights.push(H.colHeader);

  // Baseline section
  aoa.push(['DEPLOYMENT SNAPSHOT — Always Required', null, null, null, null, null]);
  rowHeights.push(H.section);

  for (const f of baselineFields) {
    // Use '' for input cells so the cell object exists for styling
    aoa.push([f.label, f.desc, f.source, f.value ?? '', null, f.note]);
    rowHeights.push(H.dataRow);
  }

  // Driver sections
  for (const quadrant of QUADRANT_ORDER) {
    const qDrivers = drivers.filter(d => d.quadrant === quadrant);
    if (qDrivers.length === 0) continue;

    aoa.push([quadrant.toUpperCase(), null, null, null, null, null]);
    rowHeights.push(H.section);

    for (const driver of qDrivers) {
      const md = driver.measureDefaults;
      if (!md) continue;
      const entry = state.trackedDrivers?.[setting]?.[driver.id];

      // Driver name row
      aoa.push([driver.label, null, null, null, null, null]);
      rowHeights.push(H.driver);

      if (driver.visibility === 'quantified') {
        // Delta metric row
        aoa.push([
          md.deltaLabel,
          md.benchmarkHint || `Measure the change in ${md.deltaUnit}`,
          getDataSource(driver.id),
          entry !== undefined ? entry.withoutAbridge : '',
          entry !== undefined ? entry.withAbridge : '',
          md.deltaUnit,
        ]);
        rowHeights.push(H.dataRow);

        // $/unit calibration row — always empty, example in notes
        const unitExample = formatCurrency(md.valuePerUnitDefault, md.valuePerUnitPrefix);
        const unitNote = entry !== undefined
          ? `Wizard entry: ${formatCurrency(entry.valuePerUnit, md.valuePerUnitPrefix)} — confirm with Finance`
          : `Example: ${unitExample} — enter your org's actual rate`;
        aoa.push([
          `  ↳ ${md.valuePerUnitLabel}`,
          "Per-unit financial value for the calculation. Enter your organization's actual rate.",
          'Finance / Revenue Cycle',
          '',
          null,
          unitNote,
        ]);
        rowHeights.push(H.unitRow);
      } else {
        // Qualitative signal row
        aoa.push([
          md.deltaLabel,
          md.benchmarkHint || `Track ${md.deltaUnit} over time`,
          getDataSource(driver.id),
          entry !== undefined ? entry.withoutAbridge : '',
          entry !== undefined ? entry.withAbridge : '',
          'Signal — tracked, no financial calculation',
        ]);
        rowHeights.push(H.dataRow);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 32 },  // A Field
    { wch: 48 },  // B Description
    { wch: 24 },  // C Source
    { wch: 17 },  // D Before
    { wch: 17 },  // E After
    { wch: 34 },  // F Notes
  ];

  ws['!rows'] = rowHeights.map(hpt => ({ hpt }));

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Hide gridlines
  (ws as any)['!sheetView'] = [{ showGridLines: false }];

  // ── Apply styles ──────────────────────────────────────────────────────────

  // Column headers
  for (const col of COL_LETTERS) {
    ensureCell(ws, `${col}1`, S_HEADER);
  }

  let r = 1; // 0-based row index, row 0 = header above

  // Baseline section header
  styleIfExists(ws, `A${r + 1}`, S_SECTION);
  mergeRow(ws, r);
  r++;

  for (const f of baselineFields) {
    const row = r + 1;
    styleIfExists(ws, `A${row}`, S_FIELD_LABEL);
    styleIfExists(ws, `B${row}`, S_DESC);
    styleIfExists(ws, `C${row}`, S_SOURCE);
    const hasPrefill = f.value !== null && f.value !== undefined && f.value !== '';
    ensureCell(ws, `D${row}`, hasPrefill ? S_PREFILLED : S_INPUT);
    ensureCell(ws, `E${row}`, S_INPUT);
    styleIfExists(ws, `F${row}`, S_NOTE);
    r++;
  }

  // Driver sections
  for (const quadrant of QUADRANT_ORDER) {
    const qDrivers = drivers.filter(d => d.quadrant === quadrant);
    if (qDrivers.length === 0) continue;

    // Quadrant header
    styleIfExists(ws, `A${r + 1}`, S_SECTION);
    mergeRow(ws, r);
    r++;

    for (const driver of qDrivers) {
      const md = driver.measureDefaults;
      if (!md) continue;
      const entry = state.trackedDrivers?.[setting]?.[driver.id];

      // Driver name row — merged, red left accent
      styleIfExists(ws, `A${r + 1}`, S_DRIVER);
      mergeRow(ws, r);
      r++;

      if (driver.visibility === 'quantified') {
        // Delta row
        const row = r + 1;
        styleIfExists(ws, `A${row}`, S_FIELD_LABEL);
        styleIfExists(ws, `B${row}`, S_DESC);
        styleIfExists(ws, `C${row}`, S_SOURCE);
        ensureCell(ws, `D${row}`, entry !== undefined ? S_PREFILLED : S_INPUT);
        ensureCell(ws, `E${row}`, entry !== undefined ? S_PREFILLED : S_INPUT);
        styleIfExists(ws, `F${row}`, S_NOTE);
        r++;

        // $/unit row — always input
        const uRow = r + 1;
        styleIfExists(ws, `A${uRow}`, S_UNIT_LABEL);
        styleIfExists(ws, `B${uRow}`, S_DESC_UNIT);
        styleIfExists(ws, `C${uRow}`, S_SOURCE_UNIT);
        ensureCell(ws, `D${uRow}`, S_INPUT);
        styleIfExists(ws, `F${uRow}`, S_NOTE_UNIT);
        r++;
      } else {
        // Signal row
        const row = r + 1;
        styleIfExists(ws, `A${row}`, S_FIELD_LABEL);
        styleIfExists(ws, `B${row}`, S_DESC);
        styleIfExists(ws, `C${row}`, S_SOURCE);
        ensureCell(ws, `D${row}`, entry !== undefined ? S_PREFILLED : S_INPUT);
        ensureCell(ws, `E${row}`, entry !== undefined ? S_PREFILLED : S_INPUT);
        styleIfExists(ws, `F${row}`, S_NOTE);
        r++;
      }
    }
  }

  return ws;
}

// ── Instructions sheet ────────────────────────────────────────────────────────

function buildInstructionsSheet(state: MeasureState, activeSettings: string[]): XLSX.WorkSheet {
  const orgName = state.deployment?.organizationName;
  const settingNames = activeSettings.map(s => SETTING_DISPLAY[s] || s);

  const aoa: Row[] = [
    [null],
    ['ABRIDGE'],
    ['Measurement Data Template'],
    [orgName ? `Prepared for ${orgName}` : 'Prepared by your Abridge account team'],
    [null],
    [null],
    ['PURPOSE'],
    ['This template collects the before-and-after data needed to quantify the impact of Abridge at your organization. Share the relevant setting tab(s) with your data, finance, or quality team and ask them to fill in every highlighted cell.'],
    [null],
    ['HOW TO USE'],
    ['1.  Send the relevant tab(s) to your data, billing, or quality contact.'],
    ['2.  Ask them to fill in every yellow cell — yellow means we need their number.'],
    ['3.  Return the completed file to your Abridge account team.'],
    ['4.  Your Abridge rep will use the completed data to produce a finalized measurement report.'],
    [null],
    ['SETTINGS IN THIS TEMPLATE'],
    ...settingNames.map(name => [`    ${name}`] as Row),
    [null],
    ['COLOR GUIDE'],
    ['    Yellow cells   →   data needed from your team'],
    ['    Green cells    →   pre-populated from your Measure Wizard entries (verify before sharing)'],
    ['    Notes column   →   example values and context; the cell itself should be filled with your actual data'],
    [null],
    ['Questions? Contact your Abridge account team.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 82 }, { wch: 1 }];
  ws['!rows'] = [
    { hpt: 8 },   // empty padding
    { hpt: 14 },  // ABRIDGE label
    { hpt: 32 },  // title
    { hpt: 18 },  // org name
    { hpt: 10 },
    { hpt: 4 },
    { hpt: 16 },  // PURPOSE header
    { hpt: 50 },  // body (wrapped)
    { hpt: 10 },
    { hpt: 16 },  // HOW TO USE header
    { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 },
    { hpt: 10 },
    { hpt: 16 },  // SETTINGS header
    ...settingNames.map(() => ({ hpt: 15 })),
    { hpt: 10 },
    { hpt: 16 },  // COLOR GUIDE header
    { hpt: 15 }, { hpt: 15 }, { hpt: 15 },
    { hpt: 10 },
    { hpt: 15 },  // contact
  ];

  // Hide gridlines
  (ws as any)['!sheetView'] = [{ showGridLines: false }];

  // Title block
  if (ws['A2']) ws['A2'].s = { font: { bold: true, sz: 8, color: { rgb: C.textMuted } }, alignment: { indent: 0 } };
  if (ws['A3']) ws['A3'].s = { font: { bold: true, sz: 20, color: { rgb: C.black } } };
  if (ws['A4']) ws['A4'].s = {
    font: { bold: true, sz: 12, color: { rgb: C.red } },
    border: { bottom: b(C.separator) },
  };

  // Section headers
  const sectionStyle = {
    font: { bold: true, sz: 9, color: { rgb: C.textSection } },
    border: { bottom: b(C.red, 'medium') },
  };

  const bodyStyle = {
    font: { sz: 10, color: { rgb: C.textBody } },
    alignment: { wrapText: true, vertical: 'top' },
  };

  const listStyle = {
    font: { sz: 10, color: { rgb: C.textBody } },
  };

  const mutedStyle = {
    font: { sz: 9, italic: true, color: { rgb: C.textMuted } },
  };

  if (ws['A7'])  ws['A7'].s  = sectionStyle;
  if (ws['A8'])  ws['A8'].s  = bodyStyle;
  if (ws['A10']) ws['A10'].s = sectionStyle;
  if (ws['A11']) ws['A11'].s = listStyle;
  if (ws['A12']) ws['A12'].s = listStyle;
  if (ws['A13']) ws['A13'].s = listStyle;
  if (ws['A14']) ws['A14'].s = listStyle;

  const settingsHeaderRow = 16;
  const settingsRef = `A${settingsHeaderRow}`;
  if (ws[settingsRef]) ws[settingsRef].s = sectionStyle;
  settingNames.forEach((_, i) => {
    const ref = `A${settingsHeaderRow + 1 + i}`;
    if (ws[ref]) ws[ref].s = listStyle;
  });

  const colorGuideRow = settingsHeaderRow + settingNames.length + 2;
  const cgRef = `A${colorGuideRow}`;
  if (ws[cgRef]) ws[cgRef].s = sectionStyle;
  if (ws[`A${colorGuideRow + 1}`]) ws[`A${colorGuideRow + 1}`].s = mutedStyle;
  if (ws[`A${colorGuideRow + 2}`]) ws[`A${colorGuideRow + 2}`].s = mutedStyle;
  if (ws[`A${colorGuideRow + 3}`]) ws[`A${colorGuideRow + 3}`].s = mutedStyle;

  const contactRow = colorGuideRow + 5;
  const contactRef = `A${contactRow}`;
  if (ws[contactRef]) ws[contactRef].s = mutedStyle;

  return ws;
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function generateMeasureDataRequestExcel(state: MeasureState): Promise<void> {
  const wb = XLSX.utils.book_new();

  const activeSettings = state.activeCareSettings?.length > 0
    ? [...state.activeCareSettings]
    : ['outpatient'];

  const instrSheet = buildInstructionsSheet(state, activeSettings);
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  for (const setting of activeSettings) {
    const sheet = buildSettingSheet(setting, state);
    XLSX.utils.book_append_sheet(wb, sheet, SETTING_TAB[setting] || setting);
  }

  // Tab colors (cast: tabColor is valid OOXML but not in SheetJS types)
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Sheets = wb.Workbook.Sheets || [];
  (wb.Workbook.Sheets[0] as any) = { ...(wb.Workbook.Sheets[0] || {}), tabColor: { rgb: C.black } };
  activeSettings.forEach((setting, i) => {
    (wb.Workbook!.Sheets![i + 1] as any) = {
      ...(wb.Workbook!.Sheets![i + 1] || {}),
      tabColor: { rgb: SETTING_TAB_COLORS[setting] || C.red },
    };
  });

  const orgSlug = state.deployment?.organizationName
    ? state.deployment.organizationName
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 30)
    : 'Org';

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await shareOrSaveBlob(
    new Blob([buf], { type: XLSX_MIME }),
    `Abridge-Measure-Template-${orgSlug}.xlsx`,
    'Abridge Data Request',
  );
}
