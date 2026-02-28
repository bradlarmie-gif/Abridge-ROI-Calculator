import { type ExploreState } from "../explore/ExploreFlow";

export type DriverOnset = "immediate" | "delayed" | "phased";

export interface ProformaDriver {
  id: string;
  name: string;
  value: number;
  category: "time" | "documentation";
  onset: DriverOnset;
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
  implementationFee: number;
  goLiveMonth: number;
  color: string;
  fullExploreState: ExploreState;
}

export interface RetentionPhasing {
  year1Pct: number;
  year2Pct: number;
  year3Pct: number;
}

export interface ProformaConfig {
  contractTermMonths: 24 | 36;
  viewMode: "monthly" | "quarterly";
  retentionPhasing: RetentionPhasing;
}

export interface ProformaCashFlowRow {
  period: number;
  label: string;
  investment: number;
  docValue: number;
  timeValue: number;
  retentionValue: number;
  totalValue: number;
  netValue: number;
  cumulativeNet: number;
  bySettings: Record<string, { value: number; investment: number; providers: number; docValue: number; timeValue: number; retentionValue: number }>;
}

export interface ProformaSummary {
  totalSystemValue: number;
  totalInvestment: number;
  combinedROI: number;
  simpleROI: number;
  totalHours: number;
  irr: number;
  paybackMonth: number | null;
  threeYearNet: number;
  threeYearValue: number;
  threeYearInvestment: number;
}

export const SETTING_COLORS: Record<string, string> = {
  outpatient: "#EA2C00",
  ed: "#2563EB",
  inpatient: "#475569",
  nursing: "#059669",
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

export const DEFAULT_PROFORMA_CONFIG: ProformaConfig = {
  contractTermMonths: 36,
  viewMode: "monthly",
  retentionPhasing: {
    year1Pct: 0,
    year2Pct: 50,
    year3Pct: 100,
  },
};

export const ONSET_LABELS: Record<DriverOnset, string> = {
  immediate: "Immediate",
  delayed: "Delayed (M3+)",
  phased: "Phased (Y1/Y2/Y3)",
};

export const ONSET_DELAY_MONTHS: Record<DriverOnset, number> = {
  immediate: 0,
  delayed: 3,
  phased: 0,
};
