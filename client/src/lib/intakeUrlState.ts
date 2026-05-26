import LZString from 'lz-string';
import type { ExploreCareSetting } from '../pages/explore/ExploreFlow';

export interface ExploreIntakeResponse {
  settings: ExploreCareSetting[];
  repName?: string;
  orgName?: string;

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
  opScribeAnnualSpend?: number | null;

  edProviders?: number | null;
  edAnnualVisits?: number | null;
  edLwbsRate?: number | null;
  edRevenuePerVisit?: number | null;
  edAdmissionRate?: number | null;
  edAdmissionRevenue?: number | null;
  edTurnoverRate?: number | null;
  edReplacementCost?: number | null;
  edScribeAnnualSpend?: number | null;

  ipProviders?: number | null;
  ipAnnualAdmissions?: number | null;
  ipDenialRate?: number | null;
  ipAvgClaimValue?: number | null;
  ipTurnoverRate?: number | null;
  ipReplacementCost?: number | null;
  ipDrgAtRiskRate?: number | null;
  ipDrgWeightIncrease?: number | null;
  ipDrgBasePayment?: number | null;
  ipCdiQueryRate?: number | null;
  ipCdiCostPerQuery?: number | null;
  ipConcurrentReviewRate?: number | null;
  ipConcurrentDenialRate?: number | null;
  ipConcurrentAvgDays?: number | null;
  ipConcurrentDailyRate?: number | null;
  ipAvgLos?: number | null;
  ipDrgRealizationRate?: number | null;
  ipDocAppealContribution?: number | null;
  ipDocBurnoutShare?: number | null;
  ipEmRevenuePerEncounter?: number | null;
  ipEmConsultsPerAdmission?: number | null;
  ipEmRealizationRate?: number | null;

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
  repName?: string;
  orgName?: string;
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

export async function generateIntakeFormUrl(opts?: { preSelectedSettings?: ExploreCareSetting[]; repName?: string; orgName?: string }): Promise<string> {
  const { createShortLink } = await import('./shortLinks');
  const preseed: IntakeFormPreseed = {
    preSelectedSettings: opts?.preSelectedSettings,
    repName: opts?.repName,
    orgName: opts?.orgName,
  };
  const encoded = encodeIntakePreseed(preseed);
  try {
    return await createShortLink('intake_form', encoded);
  } catch {
    // Fallback: direct URL with encoded params (no database required)
    return `${window.location.origin}/?intake_form=${encoded}`;
  }
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
        line('Annual scribe / documentation support spend', data.opScribeAnnualSpend, { suffix: ' $' }),
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
        line('Annual scribe / documentation support spend', data.edScribeAnnualSpend, { suffix: ' $' }),
      );
    }
    if (s === 'inpatient') {
      lines.push(
        line('Hospitalists', data.ipProviders),
        line('Annual admissions', data.ipAnnualAdmissions),
        line('Average length of stay (days)', data.ipAvgLos, { decimals: 1 }),
        line('Obs/IP status denial rate', data.ipDenialRate, { suffix: '%' }),
        line('Avg claim value at risk', data.ipAvgClaimValue, { suffix: ' $' }),
        line("Documentation's role in successful appeals", data.ipDocAppealContribution, { suffix: '%' }),
        line('DRG at-risk rate', data.ipDrgAtRiskRate, { suffix: '%' }),
        line('DRG weight increase', data.ipDrgWeightIncrease, { decimals: 2 }),
        line('Base DRG payment', data.ipDrgBasePayment, { suffix: ' $' }),
        line('DRG realization rate', data.ipDrgRealizationRate, { suffix: '%' }),
        line('CDI query rate', data.ipCdiQueryRate, { suffix: '%' }),
        line('Cost per CDI query', data.ipCdiCostPerQuery, { suffix: ' $' }),
        line('Concurrent review rate', data.ipConcurrentReviewRate, { suffix: '%' }),
        line('Concurrent denial rate', data.ipConcurrentDenialRate, { suffix: '%' }),
        line('Avg continued-stay days', data.ipConcurrentAvgDays, { decimals: 1 }),
        line('Daily rate', data.ipConcurrentDailyRate, { suffix: ' $' }),
        line('Annual hospitalist turnover', data.ipTurnoverRate, { suffix: '%' }),
        line('Cost to replace one hospitalist', data.ipReplacementCost, { suffix: ' $' }),
        line("Documentation burden's share of turnover", data.ipDocBurnoutShare, { suffix: '%' }),
        line('Avg revenue per E/M encounter', data.ipEmRevenuePerEncounter, { suffix: ' $' }),
        line('Consults per admission', data.ipEmConsultsPerAdmission, { decimals: 1 }),
        line('E/M realization rate', data.ipEmRealizationRate, { suffix: '%' }),
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

