import LZString from "lz-string";
import {
  type ForecastState,
  type SavedForecast,
  makeEmptyForecastState,
} from "@/pages/forecast/types";

const SESSION_KEY = "abridge_forecast_session_v1";
const SAVED_KEY = "abridge_forecast_saved_v1";
const URL_PARAM = "f";

export function encodeStateToUrl(state: ForecastState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeStateFromUrl(encoded: string): ForecastState | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    if (
      parsed &&
      typeof parsed === "object" &&
      "currentPricing" in parsed &&
      "contractTermMonths" in parsed
    ) {
      // Merge into a fresh empty state so missing fields hydrate to defaults
      const base = makeEmptyForecastState();
      return { ...base, ...(parsed as Partial<ForecastState>) } as ForecastState;
    }
    return null;
  } catch {
    return null;
  }
}

export function getStateFromCurrentUrl(): ForecastState | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(URL_PARAM);
  if (!encoded) return null;
  return decodeStateFromUrl(encoded);
}

export function clearUrlState(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM);
  window.history.replaceState({}, "", url.pathname + (url.search || ""));
}

export function generateShareableUrl(state: ForecastState): string {
  const encoded = encodeStateToUrl(state);
  return `${window.location.origin}/forecast?${URL_PARAM}=${encoded}`;
}

export function persistSession(state: ForecastState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, encodeStateToUrl(state));
  } catch {
    /* ignore */
  }
}

export function loadSession(): ForecastState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return decodeStateFromUrl(raw);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function listSavedForecasts(): SavedForecast[] {
  try {
    const raw = sessionStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedForecast[];
  } catch {
    return [];
  }
}

export function saveForecast(name: string, state: ForecastState): SavedForecast {
  const existing = listSavedForecasts();
  const entry: SavedForecast = {
    id: `forecast-${Date.now().toString(36)}`,
    name: name.trim() || "Untitled forecast",
    state,
    savedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify([entry, ...existing]));
  } catch {
    /* ignore */
  }
  return entry;
}

export function deleteSavedForecast(id: string): void {
  try {
    const next = listSavedForecasts().filter((f) => f.id !== id);
    sessionStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getInitialForecastState(): ForecastState {
  return getStateFromCurrentUrl() || loadSession() || makeEmptyForecastState();
}
