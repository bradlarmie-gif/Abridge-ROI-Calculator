import type {
  YearlyPricing,
  YearlyUtilization,
  DriverOnset,
} from "@/pages/proforma/proformaTypes";

export type ForecastCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

export type PricingModel = "perProviderMonth" | "perEncounter" | "annualFixed";

export interface PricingConfig {
  model: PricingModel;
  perProviderMonth?: number;
  perEncounter?: number;
  annualFixed?: number;
  yearlyPricing?: YearlyPricing;
  implementationFee?: number;
}

export interface AdoptionCurve {
  year1: number;
  year2: number;
  year3: number;
  year4?: number;
  year5?: number;
}

export interface UtilizationCurve extends YearlyUtilization {
  year4?: number;
  year5?: number;
}

export interface EncounterShareCurve {
  year1: number;
  year2: number;
  year3: number;
  year4?: number;
  year5?: number;
}

export interface ForecastValueDriver {
  id: string;
  name: string;
  category: "time" | "documentation" | "retention" | "quality";
  enabled: boolean;
  annualValue: number;
  onset: DriverOnset;
  careSetting: ForecastCareSetting;
}

export interface ForecastSettingConfig {
  id: string;
  careSetting: ForecastCareSetting;
  label: string;
  totalProviders: number;
  totalEncounters: number;
  adoption: AdoptionCurve;
  utilization: UtilizationCurve;
  encounterShare: EncounterShareCurve;
  drivers: ForecastValueDriver[];
}

export interface ForecastScenario {
  id: string;
  name: string;
  pricing: PricingConfig;
  contractTermMonths: number;
  settings: ForecastSettingConfig[];
  notes?: string;
  color?: string;
}

export interface ForecastImportSource {
  type: "measure" | "scratch" | "saved";
  measureLink?: string;
  savedScenarioId?: string;
  importedAt?: number;
}

export interface ForecastState {
  partnerName: string;
  partnerNotes: string;
  baseScenario: ForecastScenario;
  comparisonScenarios: ForecastScenario[];
  importSource: ForecastImportSource;
  createdAt: number;
  updatedAt: number;
}

export interface SavedForecast {
  id: string;
  name: string;
  state: ForecastState;
  savedAt: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  model: "perProviderMonth",
  perProviderMonth: 250,
  implementationFee: 0,
};

export const DEFAULT_ADOPTION_CURVE: AdoptionCurve = {
  year1: 60,
  year2: 90,
  year3: 100,
};

export const DEFAULT_UTILIZATION_CURVE: UtilizationCurve = {
  year1: 55,
  year2: 75,
  year3: 85,
};

export const DEFAULT_ENCOUNTER_SHARE_CURVE: EncounterShareCurve = {
  year1: 60,
  year2: 80,
  year3: 90,
};

export function makeEmptyScenario(name = "Base scenario"): ForecastScenario {
  return {
    id: `scenario-${Date.now().toString(36)}`,
    name,
    pricing: { ...DEFAULT_PRICING_CONFIG },
    contractTermMonths: 36,
    settings: [],
    color: "#EA2C00",
  };
}

export function makeEmptyForecastState(): ForecastState {
  const now = Date.now();
  return {
    partnerName: "",
    partnerNotes: "",
    baseScenario: makeEmptyScenario(),
    comparisonScenarios: [],
    importSource: { type: "scratch" },
    createdAt: now,
    updatedAt: now,
  };
}
