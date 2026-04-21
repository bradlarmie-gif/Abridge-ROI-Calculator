import type { MeasureState } from "./measureCalculator";
import { decodeStateFromUrl, encodeStateToUrl } from "./measureUrlState";

const KEY = "abridge_measure_recent_sessions_v1";
const MAX = 5;

export interface MeasureSessionEntry {
  id: string;
  partnerName: string;
  settings: string[];
  savedAt: number;
  encoded: string;
}

export function listRecentMeasureSessions(): MeasureSessionEntry[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MeasureSessionEntry[];
  } catch {
    return [];
  }
}

export function registerMeasureSession(state: MeasureState): void {
  try {
    const partnerName = state.deployment?.organizationName?.trim();
    if (!partnerName) return; // Only track named sessions
    const settings =
      state.activeCareSettings && state.activeCareSettings.length > 0
        ? state.activeCareSettings
        : state.careSetting
        ? [state.careSetting]
        : ["outpatient"];
    const encoded = encodeStateToUrl(state);
    const entry: MeasureSessionEntry = {
      id: `ms-${Date.now().toString(36)}`,
      partnerName,
      settings,
      savedAt: Date.now(),
      encoded,
    };
    const existing = listRecentMeasureSessions().filter(
      (e) => e.partnerName.toLowerCase() !== partnerName.toLowerCase(),
    );
    const next = [entry, ...existing].slice(0, MAX);
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function decodeMeasureSession(entry: MeasureSessionEntry): MeasureState | null {
  try {
    return decodeStateFromUrl(entry.encoded);
  } catch {
    return null;
  }
}

/** Used by quick decompress utility for short-link payloads. */
export function decompressMeasurePayload(payload: string): MeasureState | null {
  try {
    return decodeStateFromUrl(payload);
  } catch {
    return null;
  }
}
