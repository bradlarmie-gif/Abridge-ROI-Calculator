import { describe, it, expect } from "vitest";
import {
  calculateScribeGap,
  formatCurrency,
  type ScribeInputs,
} from "@/lib/scribeGapCalculator";

/**
 * Guardrails for the scribe "true cost" engine. The headline numbers on
 * ScribeFullAnalysis and the exported PDF must both read from
 * calculateScribeGap (single source of truth) — previously each recomputed the
 * turnover/overhead math inline, risking screen-vs-PDF drift. These tests pin
 * the consolidated outputs.
 */

const base: ScribeInputs = {
  scribeCount: 10,
  scribeCostPerHour: 25,
  scribeHoursPerWeek: 40,
  providersWithScribes: 20,
  totalProviders: 50,
  annualEncounters: 200000,
  minutesPerEncounter: 10,
  turnoverRate: 40,
  trainingCostPerScribe: 5000,
};

describe("calculateScribeGap — true cost", () => {
  it("computes turnover, overhead, true total, and true cost per provider", () => {
    const c = calculateScribeGap(base);
    // salary = 25 * 40 * 50 = 50,000; total = 10 * 50,000 = 500,000
    expect(c.scribeSalaryAnnual).toBe(50000);
    expect(c.totalScribeCost).toBe(500000);
    // turnover = 10 * 0.40 * 5000 = 20,000
    expect(c.annualTurnoverCost).toBe(20000);
    // overhead = 500,000 * 0.15 = 75,000
    expect(c.managementOverhead).toBe(75000);
    expect(c.totalHiddenCosts).toBe(95000);
    expect(c.trueTotalCost).toBe(595000);
    // 595,000 / 20 = 29,750
    expect(c.trueCostPerProvider).toBe(29750);
    // 95,000 / 500,000 = 19%
    expect(c.hiddenCostPercent).toBe(19);
  });

  it("falls back to default turnover (40%) and training ($5k) when not provided", () => {
    const c = calculateScribeGap({ ...base, turnoverRate: 0, trainingCostPerScribe: 0 });
    // 10 * 0.40 * 5000 = 20,000
    expect(c.annualTurnoverCost).toBe(20000);
  });
});

describe("calculateScribeGap — coverage ratio floor", () => {
  it("floors the scaling ratio at 1.5 so generous staffing does not balloon scribesNeeded", () => {
    // current ratio = 20 providers / 20 scribes = 1.0 providers per scribe
    const c = calculateScribeGap({ ...base, scribeCount: 20, providersWithScribes: 20, totalProviders: 40 });
    expect(c.scribeRatio).toBe(1.0); // honest current ratio preserved
    expect(c.scalingRatio).toBe(1.5); // floored for projection
    // ceil(40 / 1.5) = 27, NOT ceil(40 / 1.0) = 40
    expect(c.scribesNeededForFullCoverage).toBe(27);
  });

  it("never produces Infinity when providersWithScribes is 0 but scribes exist", () => {
    const c = calculateScribeGap({ ...base, scribeCount: 5, providersWithScribes: 0, totalProviders: 10 });
    expect(Number.isFinite(c.scribesNeededForFullCoverage)).toBe(true);
    expect(Number.isFinite(c.fullScribeCost)).toBe(true);
    expect(Number.isFinite(c.costToScale)).toBe(true);
    // ceil(10 / 1.5) = 7
    expect(c.scribesNeededForFullCoverage).toBe(7);
    // guarded divide-by-zero
    expect(c.trueCostPerProvider).toBe(0);
  });
});

describe("calculateScribeGap — scale multiplier", () => {
  it("reports the scale multiplier to one decimal", () => {
    // ratio = 20/10 = 2.0 providers/scribe; scalingRatio = 2.0
    // scribesNeeded = ceil(30 / 2.0) = 15; full = 15 * salary, current = 10 * salary => 1.5x
    const c = calculateScribeGap({ ...base, scribeCount: 10, providersWithScribes: 20, totalProviders: 30 });
    expect(c.scaleMultiplier).toBe(1.5);
  });
});

describe("formatCurrency", () => {
  it("rolls up to millions at the rounding boundary instead of showing $1000K", () => {
    expect(formatCurrency(999500)).toBe("$1.0M");
    expect(formatCurrency(999499)).toBe("$999K");
    expect(formatCurrency(1500000)).toBe("$1.5M");
  });
});
