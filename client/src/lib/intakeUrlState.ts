import LZString from 'lz-string';
import type { ExploreCareSetting } from '../pages/explore/ExploreFlow';

export interface ExploreIntakeResponse {
  settings: ExploreCareSetting[];

  opProviders?: number | null;
  opAnnualEncounters?: number | null;
  opRevenuePerVisit?: number | null;
  opCurrentWrvu?: number | null;
  opConversionFactor?: number | null;
  opDenialRate?: number | null;
  opAvgClaimValue?: number | null;
  opPanelSize?: number | null;
  opMaEnrollmentRate?: number | null;
  opAnnualPaymentPerRaf?: number | null;
  opTurnoverRate?: number | null;
  opReplacementCost?: number | null;

  edProviders?: number | null;
  edAnnualVisits?: number | null;
  edLwbsRate?: number | null;
  edRevenuePerVisit?: number | null;
  edAdmissionRate?: number | null;
  edAdmissionRevenue?: number | null;
  edTurnoverRate?: number | null;
  edReplacementCost?: number | null;

  ipProviders?: number | null;
  ipAnnualAdmissions?: number | null;
  ipDenialRate?: number | null;
  ipAvgClaimValue?: number | null;
  ipTurnoverRate?: number | null;
  ipReplacementCost?: number | null;

  nursingFTEs?: number | null;
  nursingStaffedBeds?: number | null;
  nursingOccupancyRate?: number | null;
  nursingOtHoursPerWeek?: number | null;
  nursingOtHourlyRate?: number | null;
  nursingTurnoverRate?: number | null;
  nursingReplacementCost?: number | null;
  hapiRatePer1000?: number | null;
  fallRatePer1000?: number | null;
  cautiRatePer1000?: number | null;
  clabsiRatePer1000?: number | null;
}

export interface IntakeFormPreseed {
  preSelectedSettings?: ExploreCareSetting[];
}

export function encodeIntake(data: ExploreIntakeResponse): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeIntake(encoded: string): ExploreIntakeResponse | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    if (!parsed?.settings || !Array.isArray(parsed.settings)) return null;
    return parsed as ExploreIntakeResponse;
  } catch {
    return null;
  }
}

export function encodeIntakePreseed(data: IntakeFormPreseed): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeIntakePreseed(encoded: string): IntakeFormPreseed | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    return JSON.parse(decompressed) as IntakeFormPreseed;
  } catch {
    return null;
  }
}

export function generateIntakeFormUrl(preSelectedSettings?: ExploreCareSetting[]): string {
  const preseed: IntakeFormPreseed = { preSelectedSettings };
  const encoded = encodeIntakePreseed(preseed);
  return `${window.location.origin}/?intake_form=${encoded}`;
}

const SETTING_LABELS: Record<ExploreCareSetting, string> = {
  outpatient: 'Outpatient Clinic',
  ed: 'Emergency Department',
  inpatient: 'Inpatient / Hospital Medicine',
  nursing: 'Nursing / Care Teams',
};

function fmtNum(v: number | null | undefined, opts?: { suffix?: string; decimals?: number }): string {
  if (v == null) return '';
  const n = opts?.decimals != null ? v.toFixed(opts.decimals) : v.toLocaleString('en-US');
  return opts?.suffix ? `${n}${opts.suffix}` : n;
}

function line(label: string, v: number | null | undefined, opts?: { suffix?: string; decimals?: number }): string {
  if (v == null) return '';
  return `  ${label}: ${fmtNum(v, opts)}`;
}

export function generateIntakeResponseText(data: ExploreIntakeResponse): string {
  const lines: string[] = ['ABRIDGE — EXPLORE INTAKE RESPONSES', ''];

  for (const s of data.settings) {
    lines.push(`── ${SETTING_LABELS[s]} ──`);
    if (s === 'outpatient') {
      lines.push(
        line('Physicians / APPs', data.opProviders),
        line('Annual encounters', data.opAnnualEncounters),
        line('Revenue per visit', data.opRevenuePerVisit, { suffix: ' $' }),
        line('Avg wRVU per encounter', data.opCurrentWrvu, { decimals: 2 }),
        line('$/wRVU conversion rate', data.opConversionFactor),
        line('Annual provider turnover', data.opTurnoverRate, { suffix: '%' }),
        line('Cost to replace one provider', data.opReplacementCost, { suffix: ' $' }),
        line('Claim denial rate', data.opDenialRate, { suffix: '%' }),
        line('Avg denied claim value', data.opAvgClaimValue, { suffix: ' $' }),
        line('Panel size', data.opPanelSize),
        line('% panel on Medicare Advantage', data.opMaEnrollmentRate, { suffix: '%' }),
        line('Annual payment per RAF point', data.opAnnualPaymentPerRaf, { suffix: ' $' }),
      );
    }
    if (s === 'ed') {
      lines.push(
        line('ED physicians / APPs', data.edProviders),
        line('Annual ED visits', data.edAnnualVisits),
        line('Current LWBS rate', data.edLwbsRate, { suffix: '%' }),
        line('Revenue per ED visit', data.edRevenuePerVisit, { suffix: ' $' }),
        line('% LWBS patients admitted', data.edAdmissionRate, { suffix: '%' }),
        line('Revenue per admission', data.edAdmissionRevenue, { suffix: ' $' }),
        line('Annual provider turnover', data.edTurnoverRate, { suffix: '%' }),
        line('Cost to replace one provider', data.edReplacementCost, { suffix: ' $' }),
      );
    }
    if (s === 'inpatient') {
      lines.push(
        line('Hospitalists', data.ipProviders),
        line('Annual admissions', data.ipAnnualAdmissions),
        line('Obs/IP status denial rate', data.ipDenialRate, { suffix: '%' }),
        line('Avg claim value at risk', data.ipAvgClaimValue, { suffix: ' $' }),
        line('Annual hospitalist turnover', data.ipTurnoverRate, { suffix: '%' }),
        line('Cost to replace one hospitalist', data.ipReplacementCost, { suffix: ' $' }),
      );
    }
    if (s === 'nursing') {
      lines.push(
        line('Nurse FTEs', data.nursingFTEs),
        line('Staffed beds', data.nursingStaffedBeds),
        line('Occupancy rate', data.nursingOccupancyRate, { suffix: '%' }),
        line('OT hours / nurse / week', data.nursingOtHoursPerWeek),
        line('OT hourly rate', data.nursingOtHourlyRate, { suffix: ' $/hr' }),
        line('Annual nurse turnover', data.nursingTurnoverRate, { suffix: '%' }),
        line('Cost to replace one nurse', data.nursingReplacementCost, { suffix: ' $' }),
        line('HAPI rate / 1k pt days', data.hapiRatePer1000, { decimals: 1 }),
        line('Falls rate / 1k pt days', data.fallRatePer1000, { decimals: 1 }),
        line('CAUTI rate / 1k', data.cautiRatePer1000, { decimals: 1 }),
        line('CLABSI rate / 1k', data.clabsiRatePer1000, { decimals: 1 }),
      );
    }
    lines.push('');
  }
  return lines.filter(l => l !== '').join('\n').trim();
}

export async function generateIntakeReceiptUrl(data: ExploreIntakeResponse): Promise<string> {
  const { createShortLink } = await import('./shortLinks');
  const encoded = encodeIntake(data);
  return createShortLink('intake_receipt', encoded);
}

export function getIntakePreseedFromUrl(): IntakeFormPreseed | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('intake_form');
  if (!encoded) return null;
  return decodeIntakePreseed(encoded);
}

