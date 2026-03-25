import LZString from 'lz-string';
import { type MeasureState, DEFAULT_MEASURE_STATE } from './measureCalculator';

/**
 * Encodes the measure state into a compressed URL-safe string
 */
export function encodeStateToUrl(state: MeasureState): string {
  const json = JSON.stringify(state);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return compressed;
}

/**
 * Decodes a compressed URL string back into measure state
 */
export function decodeStateFromUrl(encoded: string): MeasureState | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    // Validate it has the expected shape
    if (parsed && typeof parsed === 'object' && 'deployment' in parsed) {
      // Ensure backward compatibility - add trendConfig if missing
      if (!parsed.trendConfig) {
        parsed.trendConfig = DEFAULT_MEASURE_STATE.trendConfig;
      }
      // Ensure backward compatibility - add emDistribution if missing
      if (!parsed.emDistribution) {
        parsed.emDistribution = DEFAULT_MEASURE_STATE.emDistribution;
      }
      if (!parsed.settingData) {
        parsed.settingData = {};
      }
      if (!parsed.dataSource) {
        parsed.dataSource = DEFAULT_MEASURE_STATE.dataSource;
      }
      if (parsed.goLiveDate === undefined) {
        parsed.goLiveDate = null;
      }
      if (!parsed.abridgeNativeData) {
        parsed.abridgeNativeData = {};
      }
      if (!parsed.outpatientMetrics) {
        parsed.outpatientMetrics = DEFAULT_MEASURE_STATE.outpatientMetrics;
      }
      if (!parsed.outpatientNativeData) {
        parsed.outpatientNativeData = DEFAULT_MEASURE_STATE.outpatientNativeData;
      }
      if (!parsed.edMetrics) {
        parsed.edMetrics = DEFAULT_MEASURE_STATE.edMetrics;
      }
      if (!parsed.edAbridgeNativeData) {
        parsed.edAbridgeNativeData = DEFAULT_MEASURE_STATE.edAbridgeNativeData;
      }
      if (parsed.deployment) {
        if (parsed.deployment.liveProviders === undefined) {
          parsed.deployment.liveProviders = parsed.deployment.providers || 0;
        }
        if (parsed.deployment.mruProviders === undefined) {
          parsed.deployment.mruProviders = parsed.deployment.providers || 0;
        }
        if (parsed.deployment.abridgeEncounters === undefined) {
          parsed.deployment.abridgeEncounters = parsed.deployment.totalEncounters > 0
            ? Math.round(parsed.deployment.totalEncounters * (parsed.deployment.utilizationRate / 100))
            : 0;
        }
        if (parsed.deployment.encounterCoverageRate === undefined) {
          parsed.deployment.encounterCoverageRate = parsed.deployment.totalEncounters > 0 && parsed.deployment.abridgeEncounters > 0
            ? Math.round((parsed.deployment.abridgeEncounters / parsed.deployment.totalEncounters) * 100)
            : parsed.deployment.utilizationRate;
        }
        if (parsed.deployment.mruActivationRate === undefined) {
          parsed.deployment.mruActivationRate = parsed.deployment.liveProviders > 0
            ? Math.round((parsed.deployment.mruProviders / parsed.deployment.liveProviders) * 100)
            : 0;
        }
      }
      return parsed as MeasureState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a full shareable URL with the encoded state
 */
export function generateShareableUrl(state: MeasureState): string {
  const encoded = encodeStateToUrl(state);
  const baseUrl = window.location.origin;
  return `${baseUrl}/measure?d=${encoded}`;
}

/**
 * Extracts state from current URL if present
 */
export function getStateFromCurrentUrl(): MeasureState | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('d');
  if (!encoded) return null;
  return decodeStateFromUrl(encoded);
}

/**
 * Clears the state parameter from the URL without page reload
 */
export function clearUrlState(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('d');
  window.history.replaceState({}, '', url.pathname);
}
