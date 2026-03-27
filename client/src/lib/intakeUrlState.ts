import LZString from 'lz-string';
import type { ExploreCareSetting } from '../pages/explore/ExploreFlow';

export interface ExploreIntakeResponse {
  settings: ExploreCareSetting[];
  providers: number | null;
  annualEncounters: number | null;
  staffedBeds?: number | null;
  occupancyRate?: number | null;
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
