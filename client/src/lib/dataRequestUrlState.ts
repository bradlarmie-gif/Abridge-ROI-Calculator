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

export function generateDataResponseUrl(data: MeasureDataRequestResponse): string {
  const encoded = encodeDataRequest(data);
  return `${window.location.origin}/?data_request=${encoded}`;
}

export function getDataRequestResponseFromUrl(): MeasureDataRequestResponse | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('data_request');
  if (!encoded) return null;
  return decodeDataRequest(encoded);
}

export function getDataFormPreseedFromUrl(): DataFormPreseed | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('data_form');
  if (!encoded) return null;
  return decodeDataFormPreseed(encoded);
}
