import { describe, it, expect } from "vitest";
import {
  calculateForecast,
  computeAdoptionCurve,
  computeCost,
  rampFactor,
  yearlyEscalatorForMonth,
} from "@/lib/forecastCalculator";
import {
  type ForecastState,
  type PricingConfig,
  type ForecastValueDriver,
  makeEmptyForecastState,
  makeDefaultUtilizationCurve,
  makeDefaultEncounterShareCurve,
} from "@/pages/forecast/types";
import { decodeStateFromUrl, encodeStateToUrl } from "@/lib/forecastUrlState";

function makeState(overrides: Partial<ForecastState> = {}): ForecastState {
  const base = makeEmptyForecastState();
  // Make the projection deterministic: full adoption from M1, full utilization, no growth
  return {
    ...base,
    activeUsersToday: 100,
    provisionedSeats: 100,
    abridgeEncountersLTM: 600_000,
    totalOrgEncountersLTM: 1_000_000,
    growthSource: "benchmark",
    historicalGrowthMonthly: [0],
    contractTermMonths: 36,
    adoptionCurve: { type: "linear", rampMonths: 1, startPct: 100, endPct: 100 },
    utilizationCurve: {
      values: Array.from({ length: 12 }, () => 100),
    },
    encounterShareCurve: {
      values: Array.from({ length: 12 }, () => 60),
    },
    ...overrides,
  };
}

describe("rampFactor", () => {
  it("returns 0 before onset delay", () => {
    expect(rampFactor("longTerm", 1)).toBe(0);
    expect(rampFactor("longTerm", 14)).toBe(0);
  });

  it("ramps linearly over 3 months after delay (longTerm)", () => {
    // longTerm delay = 15. Month 15 → first month of ramp → 1/3
    expect(rampFactor("longTerm", 15)).toBeCloseTo(1 / 3, 5);
    expect(rampFactor("longTerm", 16)).toBeCloseTo(2 / 3, 5);
    expect(rampFactor("longTerm", 17)).toBeCloseTo(1, 5);
    expect(rampFactor("longTerm", 18)).toBe(1);
  });

  it("immediate onset starts at month 2", () => {
    expect(rampFactor("immediate", 1)).toBe(0);
    expect(rampFactor("immediate", 2)).toBeCloseTo(1 / 3, 5);
    expect(rampFactor("immediate", 4)).toBe(1);
  });
});

describe("yearlyEscalatorForMonth", () => {
  it("flat (no escalators) = 1", () => {
    expect(yearlyEscalatorForMonth([0, 0, 0], 1)).toBe(1);
    expect(yearlyEscalatorForMonth([0, 0, 0], 36)).toBe(1);
  });

  it("compounds escalators across years", () => {
    expect(yearlyEscalatorForMonth([0, 5, 5], 1)).toBe(1);
    expect(yearlyEscalatorForMonth([0, 5, 5], 12)).toBe(1);
    expect(yearlyEscalatorForMonth([0, 5, 5], 13)).toBeCloseTo(1.05, 5);
    expect(yearlyEscalatorForMonth([0, 5, 5], 25)).toBeCloseTo(1.1025, 5);
  });
});

describe("computeAdoptionCurve", () => {
  it("linear ramps from start to end", () => {
    const v = computeAdoptionCurve(
      { type: "linear", rampMonths: 6, startPct: 0, endPct: 100 },
      6,
    );
    expect(v).toBeCloseTo(1, 5);
  });

  it("s-curve is monotonic", () => {
    const a = computeAdoptionCurve(
      { type: "s-curve", rampMonths: 6, startPct: 40, endPct: 85 },
      1,
    );
    const b = computeAdoptionCurve(
      { type: "s-curve", rampMonths: 6, startPct: 40, endPct: 85 },
      12,
    );
    expect(b).toBeGreaterThan(a);
  });
});

describe("computeCost", () => {
  it("perProvider: providers × price", () => {
    const p: PricingConfig = { model: "perProvider", unitPrice: 200, yearlyEscalators: [0] };
    const r = computeCost(p, 1, 100, 5_000, undefined, 0);
    expect(r.cost).toBe(20_000);
    expect(r.overage).toBe(0);
  });

  it("perStaffedBed: beds × price", () => {
    const p: PricingConfig = { model: "perStaffedBed", unitPrice: 150, yearlyEscalators: [0] };
    const r = computeCost(p, 1, 0, 0, 50, 0);
    expect(r.cost).toBe(7_500);
  });

  it("annualFlat: price / 12", () => {
    const p: PricingConfig = { model: "annualFlat", unitPrice: 600_000, yearlyEscalators: [0] };
    const r = computeCost(p, 1, 0, 0, undefined, 0);
    expect(r.cost).toBe(50_000);
  });

  it("perEncounter: charges per encounter, overage when above limit", () => {
    const p: PricingConfig = {
      model: "perEncounter",
      unitPrice: 5,
      yearlyEscalators: [0],
      contractEncounterLimit: 10_000,
      overageRate: 8,
    };
    // Below limit
    const below = computeCost(p, 1, 0, 4_000, undefined, 0);
    expect(below.cost).toBe(20_000);
    expect(below.overage).toBe(0);
    // Crosses limit
    const cross = computeCost(p, 2, 0, 4_000, undefined, 8_000);
    // 4_000 enc * 5 = 20_000 base; 2_000 of those above limit → 2_000 * 8 = 16_000 overage
    expect(cross.overage).toBe(16_000);
    expect(cross.cost).toBe(20_000 + 16_000);
  });

  it("hybrid: primary (per-provider) + secondary (per-encounter)", () => {
    const p: PricingConfig = {
      model: "hybrid",
      unitPrice: 200,
      yearlyEscalators: [0],
      secondaryModel: "perEncounter",
      secondaryUnitPrice: 2,
    };
    const r = computeCost(p, 1, 50, 1_000, undefined, 0);
    expect(r.cost).toBe(50 * 200 + 1_000 * 2);
  });
});

describe("calculateForecast", () => {
  it("per-provider flat: 100 providers × $200/mo × 36 months = $720,000 total cost", () => {
    const state = makeState({
      currentPricing: {
        model: "perProvider",
        unitPrice: 200,
        yearlyEscalators: [0, 0, 0, 0, 0],
      },
    });
    const r = calculateForecast(state);
    expect(r.kpis.totalContractCost).toBeCloseTo(720_000, 0);
  });

  it("per-bed nursing: 50 beds × $150/mo × 60 months = $450,000", () => {
    const state = makeState({
      contractTermMonths: 60,
      careSettings: ["nursing"],
      nursingStaffedBeds: 50,
      utilizationCurve: makeDefaultUtilizationCurve(60),
      encounterShareCurve: makeDefaultEncounterShareCurve(60, 60),
      currentPricing: {
        model: "perStaffedBed",
        unitPrice: 150,
        yearlyEscalators: [0, 0, 0, 0, 0],
      },
    });
    const r = calculateForecast(state);
    expect(r.kpis.totalContractCost).toBeCloseTo(450_000, 0);
  });

  it("annualFlat with 5% Y2/Y3 escalators: Y1 $500K, Y2 $525K, Y3 $551.25K", () => {
    const state = makeState({
      contractTermMonths: 36,
      currentPricing: {
        model: "annualFlat",
        unitPrice: 500_000,
        yearlyEscalators: [0, 5, 5, 0, 0],
      },
    });
    const r = calculateForecast(state);
    const y1 = r.monthly.slice(0, 12).reduce((s, m) => s + m.cost, 0);
    const y2 = r.monthly.slice(12, 24).reduce((s, m) => s + m.cost, 0);
    const y3 = r.monthly.slice(24, 36).reduce((s, m) => s + m.cost, 0);
    expect(y1).toBeCloseTo(500_000, 0);
    expect(y2).toBeCloseTo(525_000, 0);
    expect(y3).toBeCloseTo(551_250, 0);
  });

  it("per-encounter runway: triggers at expected month with constant volume", () => {
    // 50,000 encounters/month at 100% share, limit 500K → runway hits month 10
    const state = makeState({
      totalOrgEncountersLTM: 600_000, // 50K/month
      abridgeEncountersLTM: 600_000,
      encounterShareCurve: { values: Array.from({ length: 12 }, () => 100) },
      currentPricing: {
        model: "perEncounter",
        unitPrice: 5,
        yearlyEscalators: [0],
        contractEncounterLimit: 500_000,
        overageRate: 5,
      },
    });
    const r = calculateForecast(state);
    expect(r.kpis.runwayMonth).toBe(10);
    // Should also generate a runway alert
    expect(r.alerts.find((a) => a.type === "runway")).toBeDefined();
  });

  it("per-encounter overage: nonzero projected overage when limit is hit", () => {
    const state = makeState({
      totalOrgEncountersLTM: 600_000,
      abridgeEncountersLTM: 600_000,
      encounterShareCurve: { values: Array.from({ length: 12 }, () => 100) },
      currentPricing: {
        model: "perEncounter",
        unitPrice: 5,
        yearlyEscalators: [0],
        contractEncounterLimit: 500_000,
        overageRate: 8,
      },
    });
    const r = calculateForecast(state);
    expect(r.kpis.projectedOverage).toBeGreaterThan(0);
  });

  it("hybrid: per-provider + per-encounter both contribute", () => {
    const state = makeState({
      currentPricing: {
        model: "hybrid",
        unitPrice: 100,
        yearlyEscalators: [0],
        secondaryModel: "perEncounter",
        secondaryUnitPrice: 1,
      },
    });
    const r = calculateForecast(state);
    // Each month: 100 users × $100 = $10K + 50K enc × $1 = $50K → $60K
    expect(r.monthly[0].cost).toBeCloseTo(100 * 100 + 50_000 * 1, 0);
  });

  it("longTerm onset: 0 through M14, ramps M15-M17, full from M18", () => {
    const driver: ForecastValueDriver = {
      id: "d1",
      label: "Long retention",
      domain: "workforce",
      category: "retention",
      scalingUnit: "perActiveUser",
      projectedDelta: 100, // $100/active user/month at full ramp
      confidence: 100,
      realizationPct: 100,
      onset: "longTerm",
    };
    const state = makeState({ valueDrivers: [driver] });
    const r = calculateForecast(state);
    expect(r.monthly[0].totalValue).toBe(0);
    expect(r.monthly[13].totalValue).toBe(0); // M14
    expect(r.monthly[14].totalValue).toBeGreaterThan(0); // M15
    expect(r.monthly[14].totalValue).toBeCloseTo(100 * 100 * (1 / 3), 0); // 100 users × $100 × 1/3
    expect(r.monthly[17].totalValue).toBeCloseTo(100 * 100, 0); // M18 fully ramped
  });

  it("break-even band: full break-even is no later than fast (full counts long-term value)", () => {
    const immediate: ForecastValueDriver = {
      id: "i1",
      label: "Immediate",
      domain: "capacity",
      category: "time",
      scalingUnit: "perActiveUser",
      projectedDelta: 300,
      confidence: 100,
      realizationPct: 100,
      onset: "immediate",
    };
    const longTerm: ForecastValueDriver = {
      id: "l1",
      label: "Long",
      domain: "workforce",
      category: "retention",
      scalingUnit: "perActiveUser",
      projectedDelta: 1_000,
      confidence: 100,
      realizationPct: 100,
      onset: "longTerm",
    };
    const state = makeState({
      valueDrivers: [immediate, longTerm],
      currentPricing: {
        model: "perProvider",
        unitPrice: 200,
        yearlyEscalators: [0],
      },
    });
    const r = calculateForecast(state);
    expect(r.kpis.fastBreakEvenMonth).not.toBeNull();
    expect(r.kpis.fullBreakEvenMonth).not.toBeNull();
    if (r.kpis.fastBreakEvenMonth && r.kpis.fullBreakEvenMonth) {
      expect(r.kpis.fullBreakEvenMonth).toBeLessThanOrEqual(r.kpis.fastBreakEvenMonth);
    }
  });

  it("URL roundtrip: encode → decode restores the same forecast state", () => {
    const driver: ForecastValueDriver = {
      id: "rt1",
      label: "RT driver",
      domain: "revenue",
      category: "documentation",
      scalingUnit: "perEncounter",
      projectedDelta: 7,
      confidence: 90,
      realizationPct: 80,
      onset: "delayed",
    };
    const state = makeState({
      partnerName: "Roundtrip Health",
      contractTermMonths: 24,
      careSettings: ["outpatient", "ed"],
      valueDrivers: [driver],
      currentPricing: {
        model: "perEncounter",
        unitPrice: 4.5,
        yearlyEscalators: [0, 3],
        contractEncounterLimit: 250_000,
        capacityCeiling: 300_000,
        overageRate: 7,
      },
    });
    const encoded = encodeStateToUrl(state);
    const decoded = decodeStateFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.partnerName).toBe("Roundtrip Health");
    expect(decoded!.contractTermMonths).toBe(24);
    expect(decoded!.currentPricing.model).toBe("perEncounter");
    expect(decoded!.currentPricing.contractEncounterLimit).toBe(250_000);
    expect(decoded!.valueDrivers).toHaveLength(1);
    expect(decoded!.valueDrivers[0].label).toBe("RT driver");
    // Calculator output should match
    const before = calculateForecast(state);
    const after = calculateForecast(decoded!);
    expect(after.kpis.totalContractCost).toBeCloseTo(before.kpis.totalContractCost, 2);
    expect(after.kpis.totalContractValue).toBeCloseTo(before.kpis.totalContractValue, 2);
  });

  it("decodeStateFromUrl: rejects invalid payloads", () => {
    expect(decodeStateFromUrl("not-a-real-encoded-string")).toBeNull();
    const bogus = encodeStateToUrl({ totallyWrong: true } as unknown as ForecastState);
    expect(decodeStateFromUrl(bogus)).toBeNull();
  });

  it("pricing comparison: swapping pricing changes cost only, not value", () => {
    const driver: ForecastValueDriver = {
      id: "d1",
      label: "Encounter value",
      domain: "revenue",
      category: "documentation",
      scalingUnit: "perEncounter",
      projectedDelta: 2,
      confidence: 100,
      realizationPct: 100,
      onset: "immediate",
    };
    const state = makeState({
      valueDrivers: [driver],
      currentPricing: {
        model: "perProvider",
        unitPrice: 200,
        yearlyEscalators: [0],
      },
      comparisonPricing: [
        {
          id: "alt-encounter",
          label: "Per encounter",
          pricing: {
            model: "perEncounter",
            unitPrice: 1,
            yearlyEscalators: [0],
          },
        },
      ],
    });
    const r = calculateForecast(state);
    const altMonthly = r.alternateMonthly["alt-encounter"];
    expect(altMonthly).toBeDefined();
    // Values must match month-by-month
    for (let i = 0; i < r.monthly.length; i++) {
      expect(altMonthly[i].totalValue).toBeCloseTo(r.monthly[i].totalValue, 5);
    }
    // Costs differ
    expect(r.kpis.totalContractCost).not.toBeCloseTo(
      r.alternateKpis["alt-encounter"].totalContractCost,
      0,
    );
  });
});
