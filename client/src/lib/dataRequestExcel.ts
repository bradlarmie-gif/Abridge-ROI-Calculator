import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { DataRequestSetting, DataRequestField } from './dataRequestFields';
import { BASELINE_FIELDS, getDriverFieldGroups } from './dataRequestFields';

const SETTING_LABELS: Record<DataRequestSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency-Department',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const SETTING_DISPLAY: Record<DataRequestSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency Department',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

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
    font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },
    fill: { fgColor: { rgb: 'F0EDE8' } },
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

function applyExampleStyle(ws: XLSX.WorkSheet, cellRef: string) {
  if (!ws[cellRef]) return;
  ws[cellRef].s = {
    font: { italic: true, sz: 10, color: { rgb: '888888' } },
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

function buildDataFieldsSheet(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
): XLSX.WorkSheet {
  const aoa: (string | null)[][] = [];

  aoa.push(['Field', 'Description', 'Who Has This', 'Example', 'Your Value']);

  const baselineFields = BASELINE_FIELDS[setting];
  aoa.push(['BASELINE — Always Required', null, null, null, null]);
  for (const f of baselineFields) {
    aoa.push([f.label, f.description, f.who, f.example, null]);
  }

  const driverGroups = getDriverFieldGroups(setting, selectedDriverIds);
  for (const group of driverGroups) {
    aoa.push([group.driverLabel, null, null, null, null]);
    for (const f of group.fields) {
      aoa.push([f.label, f.description, f.who, f.example, null]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 30 },
    { wch: 45 },
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
  ];

  applyHeaderStyle(ws, 'A1');
  applyHeaderStyle(ws, 'B1');
  applyHeaderStyle(ws, 'C1');
  applyHeaderStyle(ws, 'D1');
  applyHeaderStyle(ws, 'E1');

  let rowIdx = 1;

  applySectionStyle(ws, `A${rowIdx + 1}`);
  ws[`!merges`] = ws[`!merges`] || [];
  (ws[`!merges`] as XLSX.Range[]).push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 4 } });
  rowIdx++;

  for (const _f of baselineFields) {
    applyFieldLabelStyle(ws, `A${rowIdx + 1}`);
    applyDescStyle(ws, `B${rowIdx + 1}`);
    applyDescStyle(ws, `C${rowIdx + 1}`);
    applyExampleStyle(ws, `D${rowIdx + 1}`);
    applyInputStyle(ws, `E${rowIdx + 1}`);
    rowIdx++;
  }

  for (const group of driverGroups) {
    applySectionStyle(ws, `A${rowIdx + 1}`);
    (ws[`!merges`] as XLSX.Range[]).push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 4 } });
    rowIdx++;

    for (const _f of group.fields) {
      applyFieldLabelStyle(ws, `A${rowIdx + 1}`);
      applyDescStyle(ws, `B${rowIdx + 1}`);
      applyDescStyle(ws, `C${rowIdx + 1}`);
      applyExampleStyle(ws, `D${rowIdx + 1}`);
      applyInputStyle(ws, `E${rowIdx + 1}`);
      rowIdx++;
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

  const aoa: (string | null)[][] = [
    ['Abridge Data Request'],
    [SETTING_DISPLAY[setting]],
    [null],
    ['This file was prepared by your Abridge representative to model the value of Abridge for your organization.'],
    ['Fill in the yellow cells in the \'Data Fields\' sheet. Each field includes a description and notes on who typically has this information.'],
    [null],
    ['Questions? Contact your Abridge account team.'],
    [null],
    ['Areas being modeled:'],
    ...driverLabels.map(label => [label]),
  ];

  if (orgName) {
    aoa.splice(2, 0, [`Prepared for: ${orgName}`]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 70 }];

  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: '1A1A1A' } },
    };
  }
  if (ws['A2']) {
    ws['A2'].s = {
      font: { bold: true, sz: 12, color: { rgb: '666666' } },
    };
  }
  if (ws['A9']) {
    ws['A9'].s = {
      font: { bold: true, sz: 10, color: { rgb: '1A1A1A' } },
    };
  }

  return ws;
}

export function generateDataRequestExcel(
  setting: DataRequestSetting,
  selectedDriverIds: string[],
  orgName?: string,
): void {
  const settingLabel = SETTING_LABELS[setting];

  const wb = XLSX.utils.book_new();

  const instrSheet = buildInstructionsSheet(setting, selectedDriverIds, orgName);
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions');

  const dataSheet = buildDataFieldsSheet(setting, selectedDriverIds);
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data Fields');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `Abridge-Data-Request-${settingLabel}.xlsx`,
  );
}
