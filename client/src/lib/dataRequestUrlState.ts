import LZString from 'lz-string';
import type { MeasureCareSetting } from './measureCalculator';

export interface DataRequestMetricEntry {
  metricId: string;
  before: number | null;
  after: number | null;
  monthlyData?: number[];
  isMonthlyMode: boolean;
}

export interface MeasureDataRequestResponse {
  setting: MeasureCareSetting;
  metrics: DataRequestMetricEntry[];
}

export interface DataFormPreseed {
  setting: MeasureCareSetting;
  preSelectedIds?: string[];
}

export function encodeDataRequest(data: MeasureDataRequestResponse): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeDataRequest(encoded: string): MeasureDataRequestResponse | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    if (!parsed?.setting || !Array.isArray(parsed.metrics)) return null;
    return parsed as MeasureDataRequestResponse;
  } catch {
    return null;
  }
}

export function encodeDataFormPreseed(data: DataFormPreseed): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeDataFormPreseed(encoded: string): DataFormPreseed | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    return JSON.parse(decompressed) as DataFormPreseed;
  } catch {
    return null;
  }
}

export function generateDataFormUrl(preseed: DataFormPreseed): string {
  const encoded = encodeDataFormPreseed(preseed);
  return `${window.location.origin}/?data_form=${encoded}`;
}

const SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency Department',
  inpatient: 'Inpatient / Hospital Medicine',
  nursing: 'Nursing / Care Teams',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function generateDataResponseText(data: MeasureDataRequestResponse, metricLabels: Record<string, string>): string {
  const lines: string[] = [
    `ABRIDGE — MEASURE DATA REQUEST (${SETTING_LABELS[data.setting]})`,
    '',
  ];

  for (const m of data.metrics) {
    const label = metricLabels[m.metricId] || m.metricId;
    const parts: string[] = [`  ${label}`];
    if (m.before != null) parts.push(`    Before: ${m.before}`);
    if (m.after != null) parts.push(`    After:  ${m.after}`);
    if (m.isMonthlyMode && m.monthlyData) {
      const trend = m.monthlyData.map((v, i) => `${MONTH_NAMES[i]}: ${v ?? '—'}`).join(', ');
      parts.push(`    Monthly: ${trend}`);
    }
    lines.push(parts.join('\n'));
  }

  return lines.join('\n').trim();
}

export function generateDataReceiptUrl(data: MeasureDataRequestResponse): string {
  return `${window.location.origin}/?data_receipt=${encodeDataRequest(data)}`;
}

export function getDataFormPreseedFromUrl(): DataFormPreseed | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('data_form');
  if (!encoded) return null;
  return decodeDataFormPreseed(encoded);
}
