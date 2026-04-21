import {
  type AdoptionCurve,
  type ComparisonPricing,
  type DriverOnset,
  type ForecastState,
  type ForecastStateSnapshot,
  type ForecastValueDriver,
  type PricingConfig,
  type ScalingUnit,
  type ValueDomain,
  ONSET_DELAY_MONTHS,
} from "@/pages/forecast/types";

type CalcInput = ForecastState | ForecastStateSnapshot;

const RAMP_MONTHS = 3;
const LONG_TERM_ONSETS: DriverOnset[] = ["longTerm"];

export interface ForecastMonthRow {
  month: number;
  activeUsers: number;
  monthlyOrgEncounters: number;
  monthlyAbridgeEncounters: number;
  cumulativeEncounters: number;
  cost: number;
  totalValue: number;
  netValue: number;
  cumulativeNet: number;
  cumulativeNetExcludingLongTerm: number;
  valueByDomain: Record<ValueDomain, number>;
  overage: number;
}

export interface ForecastAlert {
  type: "runway" | "capacity" | "pricing-savings";
  month?: number;
  comparisonId?: string;
  delta?: number;
  message: string;
}

export interface ForecastKpis {
  totalContractValue: number;
  totalContractCost: number;
  netContractValue: number;
  roiMultiple: number;
  fastBreakEvenMonth: number | null;
  fullBreakEvenMonth: number | null;
  runwayMonth: number | null;
  capacityBreachMonth: number | null;
  projectedOverage: number;
}

export interface ForecastResult {
  monthly: ForecastMonthRow[];
  kpis: ForecastKpis;
  alternateMonthly: Record<string, ForecastMonthRow[]>;
  alternateKpis: Record<string, ForecastKpis>;
  alerts: ForecastAlert[];
}

// ---------- helpers ----------

export function computeAdoptionCurve(curve: AdoptionCurve, month: number): number {
  if (curve.type === "manual" && curve.manualValues && curve.manualValues.length > 0) {
    const idx = Math.min(month - 1, curve.manualValues.length - 1);
    return Math.max(0, Math.min(1, curve.manualValues[idx] / 100));
  }

  const start = curve.startPct / 100;
  const end = curve.endPct / 100;
  const ramp = Math.max(1, curve.rampMonths);

  if (curve.type === "linear") {
    const t = Math.min(1, Math.max(0, month / ramp));
    return start + (end - start) * t;
  }

  // s-curve via logistic centered at rampMonths/2
  const k = 12 / ramp; // steepness scaled to ramp length
  const x0 = ramp / 2;
  const sigmoid = 1 / (1 + Math.exp(-k * (month - x0)));
  const v = start + (end - start) * sigmoid;
  return Math.max(0, Math.min(1, v));
}

export function quarterIdx(month: number): number {
  return Math.max(0, Math.floor((month - 1) / 3));
}

function curveValueAtMonth(values: number[], month: number, fallback: number): number {
  if (!values || values.length === 0) return fallback / 100;
  const idx = Math.min(quarterIdx(month), values.length - 1);
  return Math.max(0, values[idx] / 100);
}

export function rampFactor(onset: DriverOnset, month: number): number {
  const delay = ONSET_DELAY_MONTHS[onset];
  if (month < delay) return 0;
  return Math.min(1, (month - delay + 1) / RAMP_MONTHS);
}

export function scalingBasis(
  unit: ScalingUnit,
  activeUsers: number,
  monthlyEncounters: number,
  nursingBeds?: number,
): number {
  switch (unit) {
    case "perEncounter":
      return monthlyEncounters;
    case "perActiveUser":
      return activeUsers;
    case "perBed":
      return nursingBeds ?? 0;
    case "annualFlat":
      return 1 / 12;
  }
}

export function yearlyEscalatorForMonth(escalators: number[] | undefined, month: number): number {
  if (!escalators || escalators.length === 0) return 1;
  // Compound escalators across years 1..N. Year index for month: floor((month-1)/12)
  const yearIdx = Math.floor((month - 1) / 12);
  let factor = 1;
  for (let i = 0; i <= yearIdx && i < escalators.length; i++) {
    if (i === 0) continue; // Y1 baseline (no escalator applied)
    const pct = escalators[i] || 0;
    factor *= 1 + pct / 100;
  }
  return factor;
}

export function computeCost(
  p: PricingConfig,
  month: number,
  activeUsers: number,
  monthlyEncounters: number,
  nursingBeds: number | undefined,
  cumulativeEncountersBefore: number,
): { cost: number; overage: number } {
  const escalator = yearlyEscalatorForMonth(p.yearlyEscalators, month);
  const basePrice = (p.unitPrice || 0) * escalator;

  const computeFor = (
    model: PricingConfig["model"],
    unitPrice: number,
  ): { cost: number; overage: number } => {
    switch (model) {
      case "perProvider":
        return { cost: activeUsers * unitPrice, overage: 0 };
      case "perStaffedBed":
        return { cost: (nursingBeds ?? 0) * unitPrice, overage: 0 };
      case "annualFlat":
        return { cost: unitPrice / 12, overage: 0 };
      case "perEncounter": {
        let c = monthlyEncounters * unitPrice;
        let overage = 0;
        const limit = p.contractEncounterLimit;
        if (limit && cumulativeEncountersBefore + monthlyEncounters > limit) {
          // Encounters that fall above the limit this month
          const overageEncs = Math.min(
            monthlyEncounters,
            cumulativeEncountersBefore + monthlyEncounters - limit,
          );
          overage = overageEncs * (p.overageRate ?? unitPrice);
          c += overage;
        }
        return { cost: c, overage };
      }
      case "hybrid": {
        // primary uses base unitPrice + same escalator;
        // we recursively call computeFor with whatever model the primary pricing intends.
        // Convention: for hybrid, the primary model is encoded as p.model="hybrid", primary
        // billing is per-provider, secondary is per-encounter (overage style). To keep this
        // simple and predictable, hybrid here means primary=perProvider + secondary applies.
        return { cost: 0, overage: 0 };
      }
    }
  };

  if (p.model === "hybrid") {
    // primary = perProvider with unitPrice (base), secondary = secondaryModel/secondaryUnitPrice
    const escalatedSecondary =
      (p.secondaryUnitPrice ?? 0) * escalator;
    const primary = computeFor("perProvider", basePrice);
    let secondary = { cost: 0, overage: 0 };
    if (p.secondaryModel && p.secondaryModel !== "hybrid") {
      secondary = computeFor(p.secondaryModel, escalatedSecondary);
    }
    return {
      cost: primary.cost + secondary.cost,
      overage: primary.overage + secondary.overage,
    };
  }

  return computeFor(p.model, basePrice);
}

// ---------- main engine ----------

function emptyDomainMap(): Record<ValueDomain, number> {
  return { capacity: 0, revenue: 0, workforce: 0, quality: 0 };
}

function monthlyGrowthRate(state: CalcInput): number {
  const arr = state.historicalGrowthMonthly && state.historicalGrowthMonthly.length > 0
    ? state.historicalGrowthMonthly
    : [0];
  const avg = arr.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) / arr.length;
  return avg / 100;
}

function runProjection(
  state: CalcInput,
  pricing: PricingConfig,
): { monthly: ForecastMonthRow[]; kpis: ForecastKpis } {
  const months = state.contractTermMonths;
  const monthlyRows: ForecastMonthRow[] = [];
  const growthRate = monthlyGrowthRate(state);

  let cumulativeEncounters = 0;
  let cumulativeNet = 0;
  let cumulativeNetExcludingLongTerm = 0;
  let totalContractValue = 0;
  let totalContractCost = 0;
  let projectedOverage = 0;
  let fastBreakEvenMonth: number | null = null;
  let fullBreakEvenMonth: number | null = null;
  let runwayMonth: number | null = null;
  let capacityBreachMonth: number | null = null;

  for (let month = 1; month <= months; month++) {
    const adoptionPct = computeAdoptionCurve(state.adoptionCurve, month);
    const utilizationPct = curveValueAtMonth(state.utilizationCurve.values, month, 75);
    const activeUsers = state.provisionedSeats * adoptionPct * utilizationPct;

    const monthlyOrg =
      (state.totalOrgEncountersLTM / 12) * Math.pow(1 + growthRate, month - 1);
    const sharePct = curveValueAtMonth(
      state.encounterShareCurve.values,
      month,
      state.totalOrgEncountersLTM > 0
        ? (state.abridgeEncountersLTM / state.totalOrgEncountersLTM) * 100
        : 0,
    );
    const monthlyAbridgeEncounters = monthlyOrg * sharePct;

    const { cost, overage } = computeCost(
      pricing,
      month,
      activeUsers,
      monthlyAbridgeEncounters,
      state.nursingStaffedBeds || undefined,
      cumulativeEncounters,
    );

    let totalValue = 0;
    let longTermValue = 0;
    const valueByDomain = emptyDomainMap();

    for (const driver of state.valueDrivers) {
      const ramp = rampFactor(driver.onset, month);
      if (ramp <= 0) continue;
      const basis = scalingBasis(
        driver.scalingUnit,
        activeUsers,
        monthlyAbridgeEncounters,
        state.nursingStaffedBeds || undefined,
      );
      const v =
        driver.projectedDelta *
        basis *
        ramp *
        ((driver.confidence || 100) / 100) *
        ((driver.realizationPct || 100) / 100);
      totalValue += v;
      valueByDomain[driver.domain] += v;
      if (LONG_TERM_ONSETS.includes(driver.onset)) {
        longTermValue += v;
      }
    }

    const netValue = totalValue - cost;
    cumulativeEncounters += monthlyAbridgeEncounters;
    cumulativeNet += netValue;
    cumulativeNetExcludingLongTerm += totalValue - longTermValue - cost;
    totalContractValue += totalValue;
    totalContractCost += cost;
    projectedOverage += overage;

    if (fastBreakEvenMonth === null && cumulativeNetExcludingLongTerm >= 0) {
      fastBreakEvenMonth = month;
    }
    if (fullBreakEvenMonth === null && cumulativeNet >= 0) {
      fullBreakEvenMonth = month;
    }
    if (
      runwayMonth === null &&
      pricing.contractEncounterLimit &&
      cumulativeEncounters >= pricing.contractEncounterLimit
    ) {
      runwayMonth = month;
    }
    if (
      capacityBreachMonth === null &&
      pricing.capacityCeiling &&
      cumulativeEncounters >= pricing.capacityCeiling
    ) {
      capacityBreachMonth = month;
    }

    monthlyRows.push({
      month,
      activeUsers,
      monthlyOrgEncounters: monthlyOrg,
      monthlyAbridgeEncounters,
      cumulativeEncounters,
      cost,
      totalValue,
      netValue,
      cumulativeNet,
      cumulativeNetExcludingLongTerm,
      valueByDomain,
      overage,
    });
  }

  const roiMultiple = totalContractCost > 0 ? totalContractValue / totalContractCost : 0;

  return {
    monthly: monthlyRows,
    kpis: {
      totalContractValue,
      totalContractCost,
      netContractValue: totalContractValue - totalContractCost,
      roiMultiple,
      fastBreakEvenMonth,
      fullBreakEvenMonth,
      runwayMonth,
      capacityBreachMonth,
      projectedOverage,
    },
  };
}

export function calculateForecast(state: CalcInput): ForecastResult {
  const main = runProjection(state, state.currentPricing);

  const alternateMonthly: Record<string, ForecastMonthRow[]> = {};
  const alternateKpis: Record<string, ForecastKpis> = {};
  const alerts: ForecastAlert[] = [];

  for (const cmp of state.comparisonPricing) {
    const r = runProjection(state, cmp.pricing);
    alternateMonthly[cmp.id] = r.monthly;
    alternateKpis[cmp.id] = r.kpis;
    if (
      main.kpis.totalContractCost > 0 &&
      main.kpis.totalContractCost - r.kpis.totalContractCost >
        main.kpis.totalContractCost * 0.1
    ) {
      const delta = main.kpis.totalContractCost - r.kpis.totalContractCost;
      alerts.push({
        type: "pricing-savings",
        comparisonId: cmp.id,
        delta,
        message: `${cmp.label} saves $${Math.round(delta).toLocaleString()} vs current pricing`,
      });
    }
  }

  if (main.kpis.runwayMonth !== null && main.kpis.runwayMonth <= state.contractTermMonths) {
    const limit = state.currentPricing.contractEncounterLimit ?? 0;
    alerts.push({
      type: "runway",
      month: main.kpis.runwayMonth,
      message: `You'll hit ${limit.toLocaleString()} encounters in Month ${main.kpis.runwayMonth}`,
    });
  }
  if (
    main.kpis.capacityBreachMonth !== null &&
    main.kpis.capacityBreachMonth <= state.contractTermMonths
  ) {
    alerts.push({
      type: "capacity",
      month: main.kpis.capacityBreachMonth,
      message: `Projected to exceed capacity ceiling in Month ${main.kpis.capacityBreachMonth}`,
    });
  }

  return {
    monthly: main.monthly,
    kpis: main.kpis,
    alternateMonthly,
    alternateKpis,
    alerts,
  };
}

// re-export useful drivers helpers
export type { ForecastValueDriver, ComparisonPricing };
