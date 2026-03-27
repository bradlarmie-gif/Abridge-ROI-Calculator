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

export function generateIntakeResponseUrl(data: ExploreIntakeResponse): string {
  const encoded = encodeIntake(data);
  return `${window.location.origin}/?intake=${encoded}`;
}

export function getIntakeResponseFromUrl(): ExploreIntakeResponse | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('intake');
  if (!encoded) return null;
  return decodeIntake(encoded);
}

export function getIntakePreseedFromUrl(): IntakeFormPreseed | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('intake_form');
  if (!encoded) return null;
  return decodeIntakePreseed(encoded);
}

export function getIntakeProviders(intake: ExploreIntakeResponse): number | null {
  const s = intake.settings[0];
  if (s === 'outpatient') return intake.opProviders ?? null;
  if (s === 'ed') return intake.edProviders ?? null;
  if (s === 'inpatient') return intake.ipProviders ?? null;
  if (s === 'nursing') return intake.nursingFTEs ?? null;
  return null;
}

export function getIntakeEncounters(intake: ExploreIntakeResponse): number | null {
  const s = intake.settings[0];
  if (s === 'outpatient') return intake.opAnnualEncounters ?? null;
  if (s === 'ed') return intake.edAnnualVisits ?? null;
  if (s === 'inpatient') return intake.ipAnnualAdmissions ?? null;
  return null;
}
