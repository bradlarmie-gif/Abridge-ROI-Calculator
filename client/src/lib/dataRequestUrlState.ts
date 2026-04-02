import LZString from 'lz-string';
import type { MeasureCareSetting } from './measureCalculator';

export interface DataRequestMetricEntry {
  metricId: string;
  before: number | null;
  after: number | null;
  monthlyData?: number[];
  isMonthlyMode: boolean;
  notes?: string;
}

export interface DeploymentSnapshot {
  organizationName: string;
  goLiveDate?: string | null;
  monthsOnAbridge: number;
  totalProviders: number;
  liveProviders: number;
  mruProviders: number;
  totalEncounters: number;
  abridgeEncounters: number;
}

export interface MeasureDataRequestResponse {
  setting: MeasureCareSetting;
  deployment: DeploymentSnapshot;
  metrics: DataRequestMetricEntry[];
}

export interface DataFormPreseed {
  settings: MeasureCareSetting[];
  setting?: MeasureCareSetting;
  preSelectedIds?: string[];
  repName?: string;
  orgName?: string;
}

export function encodeDataRequest(data: MeasureDataRequestResponse): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

function safeFiniteNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeDeployment(raw: unknown): DeploymentSnapshot {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const totalProviders = safeFiniteNum(d.totalProviders);
  const liveProviders = Math.min(safeFiniteNum(d.liveProviders), totalProviders);
  const mruProviders = Math.min(safeFiniteNum(d.mruProviders), liveProviders);
  const totalEncounters = safeFiniteNum(d.totalEncounters);
  const abridgeEncounters = Math.min(safeFiniteNum(d.abridgeEncounters), totalEncounters);
  return {
    organizationName: typeof d.organizationName === 'string' ? d.organizationName : '',
    goLiveDate: typeof d.goLiveDate === 'string' ? d.goLiveDate : null,
    monthsOnAbridge: safeFiniteNum(d.monthsOnAbridge),
    totalProviders,
    liveProviders,
    mruProviders,
    totalEncounters,
    abridgeEncounters,
  };
}

export function hasDeploymentData(dep?: DeploymentSnapshot): boolean {
  if (!dep) return false;
  return !!(dep.organizationName || dep.monthsOnAbridge > 0 || dep.totalProviders > 0 || dep.totalEncounters > 0);
}

export function decodeDataRequest(encoded: string): MeasureDataRequestResponse | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    if (!parsed?.setting || !Array.isArray(parsed.metrics)) return null;
    parsed.deployment = normalizeDeployment(parsed.deployment);
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
    const parsed = JSON.parse(decompressed) as Record<string, unknown>;
    if (!parsed.settings && parsed.setting) {
      parsed.settings = [parsed.setting];
    }
    if (!Array.isArray(parsed.settings) || parsed.settings.length === 0) {
      parsed.settings = ['outpatient'];
    }
    return parsed as unknown as DataFormPreseed;
  } catch {
    return null;
  }
}

export async function generateDataFormUrl(preseed: DataFormPreseed): Promise<string> {
  const { createShortLink } = await import('./shortLinks');
  const encoded = encodeDataFormPreseed(preseed);
  return createShortLink('data_form', encoded);
}

const SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency Department',
  inpatient: 'Inpatient / Hospital Medicine',
  nursing: 'Nursing / Care Teams',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function generateDataResponseText(data: MeasureDataRequestResponse, metricLabels: Record<string, string>): string {
  const dep = data.deployment;
  const lines: string[] = [
    `ABRIDGE — MEASURE DATA REQUEST (${SETTING_LABELS[data.setting]})`,
    '',
  ];

  if (dep.organizationName) lines.push(`  Organization: ${dep.organizationName}`);
  if (dep.monthsOnAbridge) lines.push(`  Months on Abridge: ${dep.monthsOnAbridge}`);
  if (dep.totalProviders) lines.push(`  Total providers: ${dep.totalProviders}`);
  if (dep.liveProviders) lines.push(`  Live on Abridge: ${dep.liveProviders}`);
  if (dep.mruProviders) lines.push(`  Monthly recording users: ${dep.mruProviders}`);
  if (dep.totalEncounters) lines.push(`  Total encounters: ${dep.totalEncounters.toLocaleString('en-US')}`);
  if (dep.abridgeEncounters) lines.push(`  Abridge encounters: ${dep.abridgeEncounters.toLocaleString('en-US')}`);
  lines.push('');

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

export async function generateDataReceiptUrl(data: MeasureDataRequestResponse): Promise<string> {
  const { createShortLink } = await import('./shortLinks');
  const encoded = encodeDataRequest(data);
  return createShortLink('data_receipt', encoded);
}

export function getDataFormPreseedFromUrl(): DataFormPreseed | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('data_form');
  if (!encoded) return null;
  return decodeDataFormPreseed(encoded);
}
