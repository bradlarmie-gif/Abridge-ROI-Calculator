export type ForecastCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

export type PricingModel =
  | "perProvider"
  | "perStaffedBed"
  | "annualFlat"
  | "perEncounter"
  | "hybrid";

export type ScalingUnit = "perEncounter" | "perActiveUser" | "perBed" | "annualFlat";

export type ValueDomain = "capacity" | "revenue" | "workforce" | "quality";

export type DriverOnset = "immediate" | "delayed" | "phased" | "longTerm";

export type GrowthSource = "benchmark" | "historical";

export interface PricingConfig {
  model: PricingModel;
  unitPrice: number;
  /** Per-year escalator percentages (e.g. [0,5,5,5,5] for 0% Y1, 5% Y2+). length up to 5. */
  yearlyEscalators: number[];
  // perEncounter / hybrid extras
  contractEncounterLimit?: number;
  capacityCeiling?: number;
  overageRate?: number;
  // hybrid extras
  secondaryModel?: PricingModel;
  secondaryUnitPrice?: number;
}

export interface AdoptionCurve {
  type: "s-curve" | "linear" | "manual";
  rampMonths: number;
  startPct: number;
  endPct: number;
  manualValues?: number[];
}

export interface QuarterlyCurve {
  /** Per-quarter values (length should be ceil(contractTermMonths/3)) */
  values: number[];
}

export type UtilizationCurve = QuarterlyCurve;
export type EncounterShareCurve = QuarterlyCurve;

export interface ForecastValueDriver {
  id: string;
  label: string;
  domain: ValueDomain;
  category: "time" | "documentation" | "retention" | "quality";
  scalingUnit: ScalingUnit;
  /** Dollars per scaling-unit-event (e.g. $/encounter, $/user/month, $/bed/month) */
  projectedDelta: number;
  /** Confidence 0-100 */
  confidence: number;
  /** Realization 0-100 */
  realizationPct: number;
  onset: DriverOnset;
  source?: "measure" | "manual";
  measuredDelta?: number;
}

export interface ComparisonPricing {
  id: string;
  label: string;
  pricing: PricingConfig;
}

export interface ForecastScenario {
  id: string;
  name: string;
  /** Snapshot of full state at save time */
  snapshot: ForecastStateSnapshot;
  createdAt: number;
  /** Whether this scenario is overlaid on Chart 2 */
  overlayOnChart: boolean;
  colorIdx: number;
}

/** Pruned-state shape stored in scenarios — same as ForecastState but without `scenarios` to avoid recursion. */
export type ForecastStateSnapshot = Omit<ForecastState, "scenarios">;

export interface ForecastImportSource {
  type: "measure" | "scratch" | "saved";
  measureLink?: string;
  savedScenarioId?: string;
  importedAt?: number;
}

export interface ForecastState {
  // metadata
  partnerName: string;
  partnerNotes: string;
  importSource: ForecastImportSource;
  createdAt: number;
  updatedAt: number;

  // baseline
  activeUsersToday: number;
  provisionedSeats: number;
  abridgeEncountersLTM: number;
  totalOrgEncountersLTM: number;
  growthSource: GrowthSource;
  /** When growthSource = 'benchmark' length is 1; when 'historical' length is up to 6 (MoM %s) */
  historicalGrowthMonthly: number[];
  careSettings: ForecastCareSetting[];
  nursingStaffedBeds: number;

  // contract
  contractTermMonths: number;
  /** ISO YYYY-MM-DD */
  contractStartDate: string | null;
  currentPricing: PricingConfig;

  // projection inputs
  adoptionCurve: AdoptionCurve;
  utilizationCurve: UtilizationCurve;
  encounterShareCurve: EncounterShareCurve;
  valueDrivers: ForecastValueDriver[];

  // comparisons / scenarios
  comparisonPricing: ComparisonPricing[];
  scenarios: ForecastScenario[];
}

export interface SavedForecast {
  id: string;
  name: string;
  state: ForecastState;
  savedAt: number;
}

// ---------- defaults ----------

export const BENCHMARK_MOM_GROWTH_PCT = 4;

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  model: "perProvider",
  unitPrice: 250,
  yearlyEscalators: [0, 0, 0, 0, 0],
};

export const DEFAULT_ADOPTION_CURVE: AdoptionCurve = {
  type: "s-curve",
  rampMonths: 6,
  startPct: 40,
  endPct: 85,
};

export function makeDefaultUtilizationCurve(contractTermMonths = 36): UtilizationCurve {
  const quarters = Math.max(1, Math.ceil(contractTermMonths / 3));
  return { values: Array.from({ length: quarters }, () => 75) };
}

export function makeDefaultEncounterShareCurve(
  contractTermMonths = 36,
  basisSharePct = 60,
): EncounterShareCurve {
  const quarters = Math.max(1, Math.ceil(contractTermMonths / 3));
  return { values: Array.from({ length: quarters }, () => basisSharePct) };
}

export function makeEmptyForecastState(): ForecastState {
  const now = Date.now();
  return {
    partnerName: "",
    partnerNotes: "",
    importSource: { type: "scratch" },
    createdAt: now,
    updatedAt: now,

    activeUsersToday: 0,
    provisionedSeats: 0,
    abridgeEncountersLTM: 0,
    totalOrgEncountersLTM: 0,
    growthSource: "benchmark",
    historicalGrowthMonthly: [BENCHMARK_MOM_GROWTH_PCT],
    careSettings: ["outpatient"],
    nursingStaffedBeds: 0,

    contractTermMonths: 36,
    contractStartDate: null,
    currentPricing: { ...DEFAULT_PRICING_CONFIG, yearlyEscalators: [0, 0, 0, 0, 0] },

    adoptionCurve: { ...DEFAULT_ADOPTION_CURVE },
    utilizationCurve: makeDefaultUtilizationCurve(36),
    encounterShareCurve: makeDefaultEncounterShareCurve(36, 60),
    valueDrivers: [],

    comparisonPricing: [],
    scenarios: [],
  };
}

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  perProvider: "Per Provider / Month",
  perStaffedBed: "Per Staffed Bed / Month",
  annualFlat: "Annual Flat Fee",
  perEncounter: "Per Encounter",
  hybrid: "Hybrid",
};

export const PRICING_UNIT_LABELS: Record<PricingModel, string> = {
  perProvider: "$ per provider / month",
  perStaffedBed: "$ per bed / month",
  annualFlat: "Annual fee",
  perEncounter: "$ per encounter",
  hybrid: "Primary unit price",
};

export const CARE_SETTING_LABELS: Record<ForecastCareSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

export const VALUE_DOMAIN_LABELS: Record<ValueDomain, string> = {
  capacity: "Capacity",
  revenue: "Revenue",
  workforce: "Workforce",
  quality: "Quality",
};

export const ONSET_DELAY_MONTHS: Record<DriverOnset, number> = {
  immediate: 2,
  delayed: 5,
  phased: 6,
  longTerm: 15,
};
