import type { ExploreSetting } from "./exploreDrivers";

export type ForecastScenarioLevel = 'conservative' | 'typical' | 'optimistic';

export const SETTING_FORECAST_VALUE_PER_PROVIDER: Record<ExploreSetting, Record<ForecastScenarioLevel, number>> = {
  outpatient: {
    conservative: 50000,
    typical: 90000,
    optimistic: 150000,
  },
  ed: {
    conservative: 70000,
    typical: 130000,
    optimistic: 220000,
  },
  inpatient: {
    conservative: 60000,
    typical: 110000,
    optimistic: 180000,
  },
  nursing: {
    conservative: 7000,
    typical: 12000,
    optimistic: 19000,
  },
};

export const SETTING_LABELS: Record<ExploreSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

export const FORECAST_BASELINE_UTILIZATION = 70;

export function computeAddedSettingValue(params: {
  setting: ExploreSetting;
  providers: number;
  utilizationPercent: number;
  scenario: ForecastScenarioLevel;
  customValueOverride?: number;
}): number {
  if (params.customValueOverride !== undefined && params.customValueOverride > 0) {
    return params.customValueOverride;
  }
  const valuePerProvider = SETTING_FORECAST_VALUE_PER_PROVIDER[params.setting][params.scenario];
  const utilizationFactor = params.utilizationPercent / FORECAST_BASELINE_UTILIZATION;
  return Math.round(params.providers * valuePerProvider * utilizationFactor);
}
