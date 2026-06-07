import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { MeasureState } from './measureCalculator';
import { EXPLORE_DRIVERS, type ExploreQuadrant, type ExploreSetting } from './exploreDrivers';

type Row = (string | number | null)[];

const SETTING_DISPLAY: Record<string, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency Department',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const SETTING_TAB: Record<string, string> = {
  outpatient: 'Outpatient',
  ed: 'ED',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const QUADRANT_ORDER: ExploreQuadrant[] = ['Capacity', 'Workforce', 'Revenue', 'Quality'];

const NUM_COLS = 6;

function applyHeaderStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1A1A1A' } },
    alignment: { wrapText: false },
  };
}

function applySectionStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { bold: true, sz: 10, color: { rgb: '1A1A1A' } },
    fill: { fgColor: { rgb: 'F0EDE8' } },
  };
}

function applyDriverHeaderStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { bold: true, sz: 10, color: { rgb: 'EA2C00' } },
    fill: { fgColor: { rgb: 'FDF4F0' } },
  };
}

function applyFieldLabelStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { bold: true, sz: 10, color: { rgb: '1A1A1A' } },
    alignment: { wrapText: true, vertical: 'top' },
  };
}

function applyDescStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { sz: 10, color: { rgb: '444444' } },
    alignment: { wrapText: true, vertical: 'top' },
  };
}

function applyInputStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    fill: { fgColor: { rgb: 'FFFDE7' } },
    alignment: { vertical: 'top' },
  };
}

function applyPrefilledStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    fill: { fgColor: { rgb: 'E8F5E9' } },
    font: { sz: 10, color: { rgb: '2E7D32' } },
    alignment: { vertical: 'top' },
  };
}

function applyNoteStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { italic: true, sz: 10, color: { rgb: '888888' } },
    alignment: { wrapText: true, vertical: 'top' },
  };
}

function mergeRow(ws: XLSX.WorkSheet, rowIdx: number) {
  ws['!merges'] = ws['!merges'] || [];
  (ws['!merges'] as XLSX.Range[]).push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: NUM_COLS - 1 } });
}

const DATA_SOURCES: Record<string, string> = {
  patientAccess: 'EHR / Practice management',
  lwbsRecovery: 'ED operations / EHR',
  admissionCapture: 'ADT / Revenue Cycle',
  bedsideTime: 'Work sampling / EHR audit',
  nursingOvertime: 'Payroll / HR',
  providerWellbeing: 'HR / People Ops',
  physicianLocumAgency: 'HR / Finance',
  scribeCostReduction: 'Finance / Staffing',
  nursingRetention: 'HR / People Ops',
  nursingAgency: 'HR / Finance',
  wrvu: 'EHR / Revenue Cycle',
  edEmLevel: 'EHR / Revenue Cycle',
  hccCapture: 'Revenue Cycle / Risk Adjustment',
  denialPrevention: 'Revenue Cycle / Billing',
  drgAccuracy: 'HIM / CDI team',
  obsDefense: 'HIM / Utilization Management',
  nursingHapi: 'Quality / Infection Prevention',
  nursingFalls: 'Quality / Patient Safety',
  nursingCauti: 'Quality / Infection Prevention',
  nursingClabsi: 'Quality / Infection Prevention',
  nursingSepsis: 'Quality / Infection Prevention',
  nursingCdiResponse: 'HIM / CDI team',
  nursingDocCompletion: 'HIM / Revenue Cycle',
  nursingHcahps: 'Press Ganey / CMS HCAHPS',
  nursingEarlyDeterioration: 'EHR / Clinical analytics',
  nursingBundleCompliance: 'Quality / Infection Prevention',
  opCdiQueryTrend: 'HIM / CDI team',
  opCareGapClosureRate: 'Quality / Care Management',
  opHedisCompositeScore: 'Population Health / Quality',
  opMaStarsPerformance: 'CMS / Population Health',
  edCoreMeasureDocRate: 'Quality / Compliance',
  edDocDeficiencyRate: 'HIM / EHR audit',
  edPatientExperience: 'Press Ganey / HCAHPS',
  edNoteCompleteness: 'EHR / HIM audit',
  edSepsisBundle: 'Quality / Compliance',
  opAppointmentDelay: 'Practice management system',
  opThirdNextAvailable: 'Scheduling / Practice mgmt',
  opSameDayAccess: 'Scheduling system',
  opPanelSizePerProvider: 'EHR / Practice analytics',
};

function getDataSource(driverId: string): string {
  return DATA_SOURCES[driverId] || 'EHR / Quality team';
}

function formatCurrency(value: number, prefix?: string): string {
  const formatted = value >= 1000
    ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return prefix ? `${prefix}${formatted}` : formatted;
}

function getDriversForSetting(setting: string, state: MeasureState) {
  const trackedForSetting = state.trackedDrivers?.[setting];
  const hasTracked = trackedForSetting && Object.keys(trackedForSetting).length > 0;

  if (hasTracked) {
    const trackedIds = new Set(Object.keys(trackedForSetting));
    return EXPLORE_DRIVERS.filter(d =>
      d.settings.includes(setting as ExploreSetting) &&
      trackedIds.has(d.id)
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
  const fields: BaselineField[] = [];

  fields.push({ label: 'Organization', desc: 'Health system or hospital name', source: 'Your org', value: dep.organizationName || null, note: '' });
  fields.push({ label: 'Go-Live Date', desc: 'Date Abridge launched in this setting', source: 'Abridge CS', value: state.goLiveDate || null, note: '' });
  fields.push({ label: 'Months on Abridge', desc: 'Months since go-live at time of measurement', source: 'Calculated', value: dep.monthsOnAbridge || null, note: '' });

  if (setting === 'nursing') {
    fields.push({ label: 'Total Nurses (FTE)', desc: 'Total bedside nursing FTEs on the unit(s)', source: 'HR / Staffing', value: dep.totalProviders || null, note: '' });
    fields.push({ label: 'Live on Abridge', desc: 'Nurses actively using Abridge', source: 'Abridge CS', value: dep.liveProviders || null, note: '' });
    fields.push({ label: 'Annual Patient Days', desc: 'Total inpatient patient-days per year', source: 'ADT / Operations', value: null, note: 'Required for HAPI, Falls, CAUTI, CLABSI, Sepsis calculations' });
  } else {
    fields.push({ label: 'Total Providers', desc: 'Total provider FTEs in scope', source: 'HR / Scheduling', value: dep.totalProviders || null, note: '' });
    fields.push({ label: 'Live on Abridge', desc: 'Providers actively using Abridge', source: 'Abridge CS', value: dep.liveProviders || null, note: '' });
    fields.push({ label: 'MRU Providers', desc: 'Providers meeting minimum recording usage', source: 'Abridge CS', value: dep.mruProviders || null, note: '' });
    fields.push({ label: 'Total Encounters', desc: 'Annual encounters in scope', source: 'EHR / Practice mgmt', value: dep.totalEncounters || null, note: '' });
    fields.push({ label: 'Abridge Encounters', desc: 'Encounters using Abridge', source: 'Abridge CS', value: dep.abridgeEncounters || null, note: '' });
    fields.push({ label: 'Non-Abridge Encounters', desc: 'Control group — same providers without Abridge', source: 'EHR / Abridge CS', value: dep.nonAbridgeEncounters || null, note: 'Used to establish the comparison baseline' });
  }

  return fields;
}

function buildSettingSheet(setting: string, state: MeasureState): XLSX.WorkSheet {
  const aoa: Row[] = [];
  const drivers = getDriversForSetting(setting, state);
  const baselineFields = getBaselineFields(setting, state);

  // Header row
  aoa.push(['Field', 'Description / How to find it', 'Data Source', 'Before Abridge', 'After Abridge', 'Notes']);

  // Baseline section
  aoa.push(['DEPLOYMENT SNAPSHOT — Always Required', null, null, null, null, null]);
  for (const f of baselineFields) {
    aoa.push([f.label, f.desc, f.source, f.value, null, f.note]);
  }

  // Driver sections grouped by quadrant
  for (const quadrant of QUADRANT_ORDER) {
    const quadrantDrivers = drivers.filter(d => d.quadrant === quadrant);
    if (quadrantDrivers.length === 0) continue;

    aoa.push([quadrant.toUpperCase(), null, null, null, null, null]);

    for (const driver of quadrantDrivers) {
      const md = driver.measureDefaults;
      if (!md) continue;

      const entry = state.trackedDrivers?.[setting]?.[driver.id];

      // Driver name row
      aoa.push([driver.label, driver.shortDescription, null, null, null, null]);

      if (driver.visibility === 'quantified') {
        // Delta metric row — the primary measurement
        const beforeVal = entry !== undefined ? entry.withoutAbridge : null;
        const afterVal = entry !== undefined ? entry.withAbridge : null;
        aoa.push([
          md.deltaLabel,
          md.benchmarkHint || `Measure the change in ${md.deltaUnit}`,
          getDataSource(driver.id),
          beforeVal,
          afterVal,
          md.deltaUnit,
        ]);

        // $/unit calibration row — leave blank so recipient fills in their own rate
        const unitExample = formatCurrency(md.valuePerUnitDefault, md.valuePerUnitPrefix);
        const unitNote = entry !== undefined
          ? `Wizard entry: ${formatCurrency(entry.valuePerUnit, md.valuePerUnitPrefix)} — confirm with Finance before using`
          : `Example: ${unitExample} — confirm your org's actual rate with Finance`;
        aoa.push([
          `  ↳ ${md.valuePerUnitLabel}`,
          'Per-unit financial value used in the calculation. Enter your organization\'s actual rate.',
          'Finance / Revenue Cycle',
          null,
          null,
          unitNote,
        ]);
      } else {
        // Qualitative signal row
        const beforeVal = entry !== undefined ? entry.withoutAbridge : null;
        const afterVal = entry !== undefined ? entry.withAbridge : null;
        aoa.push([
          md.deltaLabel,
          md.benchmarkHint || `Track ${md.deltaUnit} over time`,
          getDataSource(driver.id),
          beforeVal,
          afterVal,
          'Signal — tracked, no financial calculation',
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 34 },
    { wch: 50 },
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 34 },
  ];

  // Style header row
  for (const col of ['A', 'B', 'C', 'D', 'E', 'F']) {
    applyHeaderStyle(ws, `${col}1`);
  }

  let rowIdx = 1;

  // Style baseline section
  applySectionStyle(ws, `A${rowIdx + 1}`);
  mergeRow(ws, rowIdx);
  rowIdx++;

  for (const f of baselineFields) {
    applyFieldLabelStyle(ws, `A${rowIdx + 1}`);
    applyDescStyle(ws, `B${rowIdx + 1}`);
    applyDescStyle(ws, `C${rowIdx + 1}`);
    if (f.value !== null && f.value !== undefined && f.value !== '') {
      applyPrefilledStyle(ws, `D${rowIdx + 1}`);
    } else {
      applyInputStyle(ws, `D${rowIdx + 1}`);
    }
    applyInputStyle(ws, `E${rowIdx + 1}`);
    applyNoteStyle(ws, `F${rowIdx + 1}`);
    rowIdx++;
  }

  // Style driver sections
  for (const quadrant of QUADRANT_ORDER) {
    const quadrantDrivers = drivers.filter(d => d.quadrant === quadrant);
    if (quadrantDrivers.length === 0) continue;

    // Quadrant header
    applySectionStyle(ws, `A${rowIdx + 1}`);
    mergeRow(ws, rowIdx);
    rowIdx++;

    for (const driver of quadrantDrivers) {
      const md = driver.measureDefaults;
      if (!md) continue;

      const entry = state.trackedDrivers?.[setting]?.[driver.id];

      // Driver name row — span all cols
      applyDriverHeaderStyle(ws, `A${rowIdx + 1}`);
      applyDescStyle(ws, `B${rowIdx + 1}`);
      mergeRow(ws, rowIdx);
      rowIdx++;

      if (driver.visibility === 'quantified') {
        // Delta row
        applyFieldLabelStyle(ws, `A${rowIdx + 1}`);
        applyDescStyle(ws, `B${rowIdx + 1}`);
        applyDescStyle(ws, `C${rowIdx + 1}`);
        if (entry !== undefined) {
          applyPrefilledStyle(ws, `D${rowIdx + 1}`);
          applyPrefilledStyle(ws, `E${rowIdx + 1}`);
        } else {
          applyInputStyle(ws, `D${rowIdx + 1}`);
          applyInputStyle(ws, `E${rowIdx + 1}`);
        }
        applyNoteStyle(ws, `F${rowIdx + 1}`);
        rowIdx++;

        // $/unit calibration row — always yellow, example in notes
        applyDescStyle(ws, `A${rowIdx + 1}`);
        applyDescStyle(ws, `B${rowIdx + 1}`);
        applyDescStyle(ws, `C${rowIdx + 1}`);
        applyInputStyle(ws, `D${rowIdx + 1}`);
        applyNoteStyle(ws, `F${rowIdx + 1}`);
        rowIdx++;
      } else {
        // Signal row
        applyFieldLabelStyle(ws, `A${rowIdx + 1}`);
        applyDescStyle(ws, `B${rowIdx + 1}`);
        applyDescStyle(ws, `C${rowIdx + 1}`);
        if (entry !== undefined) {
          applyPrefilledStyle(ws, `D${rowIdx + 1}`);
          applyPrefilledStyle(ws, `E${rowIdx + 1}`);
        } else {
          applyInputStyle(ws, `D${rowIdx + 1}`);
          applyInputStyle(ws, `E${rowIdx + 1}`);
        }
        applyNoteStyle(ws, `F${rowIdx + 1}`);
        rowIdx++;
      }
    }
  }

  return ws;
}

function buildInstructionsSheet(state: MeasureState, activeSettings: string[]): XLSX.WorkSheet {
  const orgName = state.deployment?.organizationName;
  const settingNames = activeSettings.map(s => SETTING_DISPLAY[s] || s);

  const aoa: Row[] = [
    ['Abridge Measure — Data Collection Template'],
    [orgName ? `Prepared for: ${orgName}` : 'Prepared by your Abridge account team'],
    [null],
    ['Purpose'],
    ['This template collects the data needed to quantify the impact of Abridge at your organization.'],
    ['Share the relevant setting tabs with your data, finance, or quality team and ask them to fill in the highlighted cells.'],
    [null],
    ['Cell colors'],
    ['  Yellow — data needed from your team'],
    ['  Green  — pre-populated from your Measure Wizard entries (verify before sharing)'],
    ['  Warm/italic — suggested default value; confirm with Finance before using'],
    [null],
    ['Settings in this template:'],
    ...settingNames.map(name => [`  • ${name}`] as Row),
    [null],
    ['How to use'],
    ['1. Forward the relevant tab(s) to your data, billing, or quality contact.'],
    ['2. Ask them to fill in every yellow cell.'],
    ['3. Return the completed file to your Abridge account team.'],
    ['4. Your Abridge rep will use the completed data to produce a finalized measurement report.'],
    [null],
    ['Questions? Contact your Abridge account team.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 80 }];

  if (ws['A1']) {
    ws['A1'].s = { font: { bold: true, sz: 16, color: { rgb: '1A1A1A' } } };
  }
  if (ws['A2']) {
    ws['A2'].s = { font: { bold: true, sz: 12, color: { rgb: '666666' } } };
  }
  if (ws['A4']) {
    ws['A4'].s = { font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } } };
  }
  if (ws['A8']) {
    ws['A8'].s = { font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } } };
  }
  const modelsRowIdx = 13 + settingNames.length + 1;
  const howToRef = `A${modelsRowIdx + 1}`;
  if (ws[howToRef]) {
    ws[howToRef].s = { font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } } };
  }

  return ws;
}

export function generateMeasureDataRequestExcel(state: MeasureState): void {
  const wb = XLSX.utils.book_new();

  const activeSettings = state.activeCareSettings?.length > 0
    ? [...state.activeCareSettings]
    : ['outpatient'];

  const instrSheet = buildInstructionsSheet(state, activeSettings);
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  for (const setting of activeSettings) {
    const sheet = buildSettingSheet(setting, state);
    const tabName = SETTING_TAB[setting] || setting;
    XLSX.utils.book_append_sheet(wb, sheet, tabName);
  }

  const orgSlug = state.deployment?.organizationName
    ? state.deployment.organizationName
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 30)
    : 'Org';

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `Abridge-Measure-Template-${orgSlug}.xlsx`,
  );
}
