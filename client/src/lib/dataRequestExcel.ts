import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { DataRequestSetting, DataRequestField } from './dataRequestFields';
import { BASELINE_FIELDS, getDriverFieldGroups } from './dataRequestFields';

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
  const aoa: (string | number | null)[][] = [];
  const rowHeights: number[] = [];

  aoa.push(['Field', 'Description', 'Who Has This', 'Example', 'Your Value']);
  rowHeights.push(H.colHeader);

  // Baseline section
  const baselineFields = BASELINE_FIELDS[setting];
  aoa.push(['BASELINE — Always Required', null, null, null, null]);
  rowHeights.push(H.section);

  for (const f of baselineFields) {
    aoa.push([f.label, f.description, f.who, f.example, '']);
    rowHeights.push(H.dataRow);
  }

  // Driver groups
  const driverGroups = getDriverFieldGroups(setting, selectedDriverIds);
  for (const group of driverGroups) {
    aoa.push([group.driverLabel, null, null, null, null]);
    rowHeights.push(H.driver);
    for (const f of group.fields) {
      aoa.push([f.label, f.description, f.who, f.example, '']);
      rowHeights.push(H.dataRow);
    }
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
  for (const col of COL_LETTERS) {
    ensureCell(ws, `${col}1`, S_HEADER);
  }

  let r = 1;

  // Baseline section header
  styleIfExists(ws, `A${r + 1}`, S_SECTION);
  mergeRow(ws, r);
  r++;

  for (const _f of baselineFields) {
    const row = r + 1;
    styleIfExists(ws, `A${row}`, S_FIELD_LABEL);
    styleIfExists(ws, `B${row}`, S_DESC);
    styleIfExists(ws, `C${row}`, S_WHO);
    styleIfExists(ws, `D${row}`, S_EXAMPLE);
    ensureCell(ws, `E${row}`, S_INPUT);
    r++;
  }

  // Driver group sections
  for (const group of driverGroups) {
    // Driver header — red left accent, same as Measure
    styleIfExists(ws, `A${r + 1}`, S_DRIVER);
    mergeRow(ws, r);
    r++;

    for (const _f of group.fields) {
      const row = r + 1;
      styleIfExists(ws, `A${row}`, S_FIELD_LABEL);
      styleIfExists(ws, `B${row}`, S_DESC);
      styleIfExists(ws, `C${row}`, S_WHO);
      styleIfExists(ws, `D${row}`, S_EXAMPLE);
      ensureCell(ws, `E${row}`, S_INPUT);
      r++;
    }
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
    [`This template collects the data needed to model the value of Abridge for your ${settingDisplay[setting]} organization. Fill in every yellow cell in the Data Fields tab and return the completed file to your Abridge account team.`],
    [null],
    ['HOW TO USE'],
    ['1.  Share the Data Fields tab with your data or finance contact.'],
    ['2.  Ask them to fill in every yellow cell — yellow means we need their number.'],
    ['3.  Return the completed file to your Abridge account team.'],
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

export function generateDataRequestExcel(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
  orgName?: string,
): void {
  const settingLabels: Record<DataRequestSetting, string> = {
    outpatient: 'Outpatient',
    ed: 'Emergency-Department',
    inpatient: 'Inpatient',
    nursing: 'Nursing',
  };

  const settingTabColors: Record<DataRequestSetting, string> = {
    outpatient: 'EA2C00',
    ed:         'C42800',
    inpatient:  'A82000',
    nursing:    '8C1A00',
  };

  const wb = XLSX.utils.book_new();

  const instrSheet = buildInstructionsSheet(setting, selectedDriverIds, orgName);
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  const dataSheet = buildDataFieldsSheet(setting, selectedDriverIds);
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data Fields');

  // Tab colors
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Sheets = wb.Workbook.Sheets || [];
  (wb.Workbook.Sheets[0] as any) = { ...(wb.Workbook.Sheets[0] || {}), tabColor: { rgb: C.black } };
  (wb.Workbook.Sheets[1] as any) = { ...(wb.Workbook.Sheets[1] || {}), tabColor: { rgb: settingTabColors[setting] } };

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `Abridge-Data-Request-${settingLabels[setting]}.xlsx`,
  );
}
