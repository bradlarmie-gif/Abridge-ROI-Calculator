// xlsx-js-style is a drop-in fork of SheetJS that actually RENDERS the `.s`
// cell styles below. The community `xlsx` package silently dropped all of them,
// which is why the downloaded sheet looked like a raw grid.
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import type { DataRequestSetting } from './dataRequestFields';
import { getDriverFieldGroups, getRequestFieldPlan } from './dataRequestFields';

// ── Brand palette (matches measureDataRequestExcel) ───────────────────────────
const C = {
  black:        '1A1A1A',
  red:          'EA2C00',
  redLight:     'FEF6F3',
  cream:        'F5F0EB',
  white:        'FFFFFF',
  separator:    'E8E2DC',
  driverLine:   'F2E8E4',
  textPrimary:  '1A1A1A',
  textBody:     '5C504A',
  textMuted:    '9E948C',
  textSection:  '4A3D36',
  inputFill:    'FFFDF0',
  inputBorder:  'C4A882',
};

const H = {
  colHeader: 22,
  section:   19,
  driver:    20,
  dataRow:   42,
};

const NUM_COLS = 5;
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function b(color: string, style: 'thin' | 'medium' = 'thin') {
  return { style, color: { rgb: color } };
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

const S_DESC = {
  font: { sz: 9, color: { rgb: C.textBody } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.driverLine) },
};

const S_WHO = {
  font: { sz: 9, italic: true, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.driverLine) },
};

const S_EXAMPLE = {
  font: { sz: 9, italic: true, color: { rgb: C.textMuted } },
  fill: { fgColor: { rgb: C.white } },
  alignment: { vertical: 'top', wrapText: true },
  border: { bottom: b(C.driverLine) },
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

// Optional fields get a quieter input cell so the must-fills clearly pop.
const S_INPUT_OPTIONAL = {
  fill: { fgColor: { rgb: 'F7F5F2' } },
  font: { sz: 10, color: { rgb: C.textMuted } },
  alignment: { vertical: 'center', horizontal: 'center' },
  border: {
    top: b(C.separator), bottom: b(C.separator),
    left: b(C.separator), right: b(C.separator),
  },
};

// Required tier band — coral, white, "do these." Optional band reuses S_SECTION (cream).
const S_SECTION_REQUIRED = {
  font: { bold: true, sz: 10, color: { rgb: C.white } },
  fill: { fgColor: { rgb: C.red } },
  alignment: { vertical: 'center', indent: 1 },
  border: { top: b(C.red), bottom: b(C.red) },
};

function ensureCell(ws: XLSX.WorkSheet, ref: string, style: object) {
  if (!ws[ref]) ws[ref] = { t: 'z', v: undefined };
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

// ── Sheet builders ────────────────────────────────────────────────────────────

function buildDataFieldsSheet(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
): XLSX.WorkSheet {
  const plan = getRequestFieldPlan(setting, selectedDriverIds);
  const aoa: (string | number | null)[][] = [];
  const rowHeights: number[] = [];
  // Track how to style each input cell (bright = required, quiet = optional).
  const inputStyleByRow: Record<number, object> = {};

  const pushHeader = () => { aoa.push(['Field', 'Description', 'Who Has This', 'Example', 'Your Value']); rowHeights.push(H.colHeader); };
  const pushField = (f: { label: string; description: string; who: string; example: string }, required: boolean) => {
    aoa.push([f.label, f.description, f.who, f.example, '']);
    rowHeights.push(H.dataRow);
    inputStyleByRow[aoa.length - 1] = required ? S_INPUT : S_INPUT_OPTIONAL;
  };

  pushHeader();

  // ── Tier 1: required ("we need these") ──
  aoa.push([`WE NEED THESE · ${plan.requiredCount} numbers`, null, null, null, null]);
  rowHeights.push(H.section);
  const requiredBandRow = aoa.length - 1;
  for (const f of plan.required) pushField(f, true);

  // ── Tier 2: optional (benchmarked if blank) ──
  const optionalBandRow = aoa.length;
  aoa.push([`OPTIONAL · WE'LL USE INDUSTRY BENCHMARKS IF LEFT BLANK`, null, null, null, null]);
  rowHeights.push(H.section);
  for (const f of plan.optionalBaseline) pushField(f, false);

  const driverBandRows: number[] = [];
  for (const group of plan.driverGroups) {
    driverBandRows.push(aoa.length);
    aoa.push([group.driverLabel, null, null, null, null]);
    rowHeights.push(H.driver);
    for (const f of group.fields) pushField(f, false);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 32 },  // A Field
    { wch: 46 },  // B Description
    { wch: 24 },  // C Who Has This
    { wch: 20 },  // D Example
    { wch: 20 },  // E Your Value
  ];
  ws['!rows'] = rowHeights.map(hpt => ({ hpt }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  (ws as any)['!sheetView'] = [{ showGridLines: false }];

  // Column headers
  for (const col of COL_LETTERS) ensureCell(ws, `${col}1`, S_HEADER);

  // Section bands (row index → A1 ref is row+1)
  styleIfExists(ws, `A${requiredBandRow + 1}`, S_SECTION_REQUIRED); mergeRow(ws, requiredBandRow);
  styleIfExists(ws, `A${optionalBandRow + 1}`, S_SECTION); mergeRow(ws, optionalBandRow);
  for (const dr of driverBandRows) { styleIfExists(ws, `A${dr + 1}`, S_DRIVER); mergeRow(ws, dr); }

  // Field rows: every row that has an input style is a field row.
  for (const [rowIdxStr, inputStyle] of Object.entries(inputStyleByRow)) {
    const row = Number(rowIdxStr) + 1;
    styleIfExists(ws, `A${row}`, S_FIELD_LABEL);
    styleIfExists(ws, `B${row}`, S_DESC);
    styleIfExists(ws, `C${row}`, S_WHO);
    styleIfExists(ws, `D${row}`, S_EXAMPLE);
    ensureCell(ws, `E${row}`, inputStyle);
  }

  return ws;
}

function buildInstructionsSheet(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
  orgName?: string,
): XLSX.WorkSheet {
  const driverGroups = getDriverFieldGroups(setting, selectedDriverIds);
  const driverLabels = driverGroups.map(g => g.driverLabel);

  const settingDisplay: Record<DataRequestSetting, string> = {
    outpatient: 'Outpatient',
    ed: 'Emergency Department',
    inpatient: 'Inpatient',
    nursing: 'Nursing',
  };

  const aoa: (string | null)[][] = [
    [null],
    ['ABRIDGE'],
    ['Data Request Template'],
    [orgName ? `Prepared for ${orgName}` : 'Prepared by your Abridge account team'],
    [null],
    [null],
    ['PURPOSE'],
    [`This collects the numbers we use to model the value of Abridge for your ${settingDisplay[setting]} organization. We only truly need the short "We need these" block. Everything else is optional and sharpens the estimate.`],
    [null],
    ['HOW TO USE'],
    ['1.  Fill the "We need these" block on the Data Fields tab. That is all we truly need.'],
    ['2.  Optional fields make it sharper. Leave any blank and we use an industry benchmark.'],
    ['3.  Return the file to your Abridge account team.'],
    [null],
    ['AREAS BEING MODELED'],
    ...driverLabels.map(label => [`    ${label}`]),
    [null],
    ['Questions? Contact your Abridge account team.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 82 }];
  ws['!rows'] = [
    { hpt: 8 },
    { hpt: 14 },
    { hpt: 32 },
    { hpt: 18 },
    { hpt: 10 },
    { hpt: 4 },
    { hpt: 16 },
    { hpt: 50 },
    { hpt: 10 },
    { hpt: 16 },
    { hpt: 16 }, { hpt: 16 }, { hpt: 16 },
    { hpt: 10 },
    { hpt: 16 },
    ...driverLabels.map(() => ({ hpt: 15 })),
    { hpt: 10 },
    { hpt: 15 },
  ];

  (ws as any)['!sheetView'] = [{ showGridLines: false }];

  if (ws['A2']) ws['A2'].s = { font: { bold: true, sz: 8, color: { rgb: C.textMuted } } };
  if (ws['A3']) ws['A3'].s = { font: { bold: true, sz: 20, color: { rgb: C.black } } };
  if (ws['A4']) ws['A4'].s = {
    font: { bold: true, sz: 12, color: { rgb: C.red } },
    border: { bottom: b(C.separator) },
  };

  const sectionStyle = {
    font: { bold: true, sz: 9, color: { rgb: C.textSection } },
    border: { bottom: b(C.red, 'medium') },
  };
  const bodyStyle = {
    font: { sz: 10, color: { rgb: C.textBody } },
    alignment: { wrapText: true, vertical: 'top' },
  };
  const listStyle = { font: { sz: 10, color: { rgb: C.textBody } } };
  const mutedStyle = { font: { sz: 9, italic: true, color: { rgb: C.textMuted } } };

  if (ws['A7'])  ws['A7'].s  = sectionStyle;
  if (ws['A8'])  ws['A8'].s  = bodyStyle;
  if (ws['A10']) ws['A10'].s = sectionStyle;
  if (ws['A11']) ws['A11'].s = listStyle;
  if (ws['A12']) ws['A12'].s = listStyle;
  if (ws['A13']) ws['A13'].s = listStyle;

  const areasRow = 15;
  if (ws[`A${areasRow}`]) ws[`A${areasRow}`].s = sectionStyle;
  driverLabels.forEach((_, i) => {
    const ref = `A${areasRow + 1 + i}`;
    if (ws[ref]) ws[ref].s = listStyle;
  });

  const contactRow = areasRow + driverLabels.length + 2;
  if (ws[`A${contactRow}`]) ws[`A${contactRow}`].s = mutedStyle;

  return ws;
}

// ── Export ────────────────────────────────────────────────────────────────────

const SETTING_TAB_COLORS: Record<DataRequestSetting, string> = {
  outpatient: 'EA2C00',
  ed:         'C42800',
  inpatient:  'A82000',
  nursing:    '8C1A00',
};

const SETTING_FILE_LABELS: Record<DataRequestSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency-Department',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

/** Pure builder (no browser APIs) so it can be unit-tested. */
export function buildDataRequestWorkbook(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
  orgName?: string,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const instrSheet = buildInstructionsSheet(setting, selectedDriverIds, orgName);
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  const dataSheet = buildDataFieldsSheet(setting, selectedDriverIds);
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data Fields');

  // Tab colors
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Sheets = wb.Workbook.Sheets || [];
  (wb.Workbook.Sheets[0] as any) = { ...(wb.Workbook.Sheets[0] || {}), tabColor: { rgb: C.black } };
  (wb.Workbook.Sheets[1] as any) = { ...(wb.Workbook.Sheets[1] || {}), tabColor: { rgb: SETTING_TAB_COLORS[setting] } };

  return wb;
}

export function generateDataRequestExcel(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
  orgName?: string,
): void {
  const wb = buildDataRequestWorkbook(setting, selectedDriverIds, orgName);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `Abridge-Data-Request-${SETTING_FILE_LABELS[setting]}.xlsx`,
  );
}
