import { type ExploreState } from "../explore/ExploreFlow";

export type DriverOnset = "immediate" | "delayed" | "phased" | "longTerm";
export type ExploreQuadrant = "Capacity" | "Workforce" | "Revenue" | "Quality";

export interface ProformaDriver {
  id: string;
  name: string;
  value: number;
  category: "time" | "documentation";
  quadrant: ExploreQuadrant;
  onset: DriverOnset;
}

export interface YearlyProviders {
  year1: number;
  year2: number;
  year3: number;
}

export interface YearlyPricing {
  year1: number;
  year2: number;
  year3: number;
}

export interface QuarterlyProviders {
  q1: number; q2: number; q3: number; q4: number;
  q5: number; q6: number; q7: number; q8: number;
  q9: number; q10: number; q11: number; q12: number;
}

export interface QuarterlyPricing {
  q1: number; q2: number; q3: number; q4: number;
  q5: number; q6: number; q7: number; q8: number;
  q9: number; q10: number; q11: number; q12: number;
}

export interface QuarterlyUtilization {
  q1: number; q2: number; q3: number; q4: number;
  q5: number; q6: number; q7: number; q8: number;
  q9: number; q10: number; q11: number; q12: number;
}

export interface ScenarioDealTerms {
  pricingModel?: "perUnit" | "annualFlat" | "perEncounter" | "platform";
  costPerUnit?: number;
  costPerEncounter?: number;
  annualLicenseFee?: number;
  platformEncRate?: number;
  yearlyPricing?: YearlyPricing;
  providerCount?: number;
  fullScaleProviders?: number;
  yearlyProviders?: YearlyProviders;
  yearlyUtilization?: YearlyUtilization;
  yearlyEncounters?: { year1: number; year2: number; year3: number };
  goLiveMonth?: number;
}

export interface CostOffset {
  id: string;
  label: string;
  annualSpend: number;
  displacementPct: number;
  transitionMonths: number;
}

export interface ProformaSettingSnapshot {
  id: string;
  careSetting: "outpatient" | "ed" | "inpatient" | "nursing";
  label: string;
  providerCount: number;
  fullScaleProviders: number;
  fullScaleUtilization: number;
  encounters: number;
  utilizationPercent: number;
  annualValue: number;
  timeValue: number;
  docValue: number;
  retentionValue: number;
  totalHoursSaved: number;
  drivers: ProformaDriver[];
  costPerUnit: number;
  pricingModel?: "perUnit" | "annualFlat" | "perEncounter" | "platform";
  platformEncRate?: number;
  annualLicenseFee?: number;
  bankedEncounters?: boolean;
  costPerEncounter?: number;
  yearlyPricing?: YearlyPricing;
  implementationFee: number;
  goLiveMonth: number;
  color: string;
  fullExploreState: ExploreState;
  yearlyProviders?: YearlyProviders;
  yearlyEncounters?: { year1: number; year2: number; year3: number };
  yearlyUtilization?: YearlyUtilization;
  retentionRate?: number;
  replacementCost?: number;
  quarterlyProviders?: QuarterlyProviders;
  quarterlyPricing?: QuarterlyPricing;
  quarterlyUtilization?: QuarterlyUtilization;
  capacityValue: number;
  workforceValue: number;
  revenueValue: number;
  qualityValue: number;
  scenarioB?: ScenarioDealTerms;
  costOffsets?: CostOffset[];
}

export interface RetentionPhasing {
  year1Pct: number;
  year2Pct: number;
  year3Pct: number;
  year4Pct?: number;
  year5Pct?: number;
  year6Pct?: number;
}

export interface YearlyUtilization {
  year1: number;
  year2: number;
  year3: number;
}

export interface ProformaConfig {
  contractTermMonths: number;
  viewMode: "quarterly" | "yearly";
  retentionPhasing: RetentionPhasing;
  nursingRetentionPhasing?: RetentionPhasing;
  implementationRampMonths: number;
  yearlyUtilization: YearlyUtilization;
  nursingYearlyUtilization?: YearlyUtilization;
  granularity?: "annual" | "quarterly";
  systemWideFee?: number;
}

export interface ProformaCashFlowRow {
  period: number;
  label: string;
  investment: number;
  capacityValue: number;
  workforceValue: number;
  revenueValue: number;
  qualityValue: number;
  totalValue: number;
  netValue: number;
  cumulativeNet: number;
  economicCumulativeNet?: number;
  displacementValue: number;
  bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; encounters: number; capacityValue: number; workforceValue: number; revenueValue: number; qualityValue: number; displacementValue: number }>;
}

export interface ProformaSummary {
  totalSystemValue: number;
  simpleROI: number;
  valueToCost: number;
  atScaleReturn: number;
  totalHours: number;
  paybackMonth: number | null;
  termNet: number;
  termValue: number;
  termInvestment: number;
  runRateValue: number;
  runRateInvestment: number;
}

export const SETTING_COLORS: Record<string, string> = {
  outpatient: "#E8350A",
  ed: "#BF2A06",
  inpatient: "#333333",
  nursing: "#7A1F04",
};

export const SETTING_LABELS: Record<string, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

export const SETTING_UNIT_LABELS: Record<string, string> = {
  outpatient: "providers",
  ed: "physicians",
  inpatient: "hospitalists",
  nursing: "beds",
};

export const DEFAULT_YEARLY_UTILIZATION: YearlyUtilization = {
  year1: 55,
  year2: 75,
  year3: 85,
};

export const NURSING_YEARLY_UTILIZATION: YearlyUtilization = {
  year1: 45,
  year2: 65,
  year3: 80,
};

export const MAX_UTILIZATION = 85;

export const DEFAULT_PROFORMA_CONFIG: ProformaConfig = {
  contractTermMonths: 36,
  viewMode: "quarterly",
  implementationRampMonths: 3,
  yearlyUtilization: { ...DEFAULT_YEARLY_UTILIZATION },
  nursingYearlyUtilization: { ...NURSING_YEARLY_UTILIZATION },
  retentionPhasing: {
    year1Pct: 35,
    year2Pct: 75,
    year3Pct: 100,
    year4Pct: 100,
    year5Pct: 100,
    year6Pct: 100,
  },
  nursingRetentionPhasing: {
    year1Pct: 35,
    year2Pct: 75,
    year3Pct: 100,
    year4Pct: 100,
    year5Pct: 100,
    year6Pct: 100,
  },
};

export const CONTRACT_TERM_OPTIONS = [
  { label: "1-Year", months: 12 },
  { label: "2-Year", months: 24 },
  { label: "3-Year", months: 36 },
  { label: "4-Year", months: 48 },
  { label: "5-Year", months: 60 },
] as const;

export interface ProformaScenario {
  id: string;
  name: string;
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  createdAt: number;
  pricingLabel?: string;
  settingCount?: number;
}

export const SCENARIO_COLORS = ["#EA2C00", "#1E3A5F", "#D4930A", "#2D7377"];
export const SCENARIO_DASHES = ["", "8 4", "4 4", "8 2 2 2"];
export const MAX_SCENARIOS = 4;

export const ONSET_DELAY_MONTHS: Record<DriverOnset, number> = {
  immediate: 1,
  delayed: 3,
  phased: 6,
  longTerm: 12,
};

export const ONSET_LABELS: Record<DriverOnset, string> = {
  immediate: "Immediate",
  delayed: `Delayed (M${ONSET_DELAY_MONTHS.delayed}+)`,
  phased: "Phased (Y1/Y2/Y3)",
  longTerm: `Long-term (M${ONSET_DELAY_MONTHS.longTerm}+)`,
};
