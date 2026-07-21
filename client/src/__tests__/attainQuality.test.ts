import { describe, it, expect } from "vitest";
import {
  computeQualityScope,
  computeQualityRealTime,
  computeQualityResponse,
  computeQualityBundle,
  computeQualityPayoff,
  computeQualityChain,
  computeQualityContributions,
  exploreStateForReconciliation,
  computeAllDriverValues,
  selectedEventTypes,
  QUALITY_EVENT_LABELS,
  QUALITY_REALTIME_BASELINE_PCT,
  QUALITY_PREVENTION_CEILING_PCT,
  HAPI_RATE_PER_1000,
  HAPI_COST_PER_EVENT,
  FALLS_RATE_PER_1000,
  FALLS_COST_PER_EVENT,
  CLABSI_UTILIZATION_PCT,
  CLABSI_RATE_PER_1000_LINE_DAYS,
  CLABSI_COST_PER_EVENT,
  SEPSIS_RATE_PER_1000,
  SEPSIS_COMPLIANCE_BASELINE_PCT,
  SEPSIS_DOC_LAG_PCT,
  SEPSIS_EXCESS_COST_PER_CASE,
} from "@/lib/attain/attainQuality";
import { calcHapi, calcFalls, calcClabsi, calcSepsis } from "@/lib/nursingQualityCalcs";
import { computeLeverContributions, type AttainBaseline, type LeverValues } from "@/lib/attain/attainLevers";

const BASELINE: AttainBaseline = { staffedBeds: 120, nursingFtes: 180, dailyCensus: 102, adoptionPct: 100 };

const ALL_EVENT_LABELS = Object.values(QUALITY_EVENT_LABELS);

function fullValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    qualityLines: ["Med-Surg", "ICU"],
    qualityBeds: 120,
    qualityEventTypes: [...ALL_EVENT_LABELS],
    qualityRealTime: 90,
    qualityResponse: 2,
    qualityBundle: 70,
    ...overrides,
  };
}

describe("D1 scope", () => {
  it("patient days = beds in scope x occupancy (census/beds) x 365", () => {
    const scope = computeQualityScope(BASELINE, { qualityBeds: 120 });
    expect(scope.bedsInScope).toBe(120);
    expect(scope.occupancyFraction).toBeCloseTo(102 / 120, 5);
    expect(scope.patientDays).toBeCloseTo(120 * (102 / 120) * 365, 5);
    expect(scope.patientDays).toBeCloseTo(102 * 365, 5);
  });

  it("beds requested is capped to the Starting-point staffed-beds baseline", () => {
    const scope = computeQualityScope(BASELINE, { qualityBeds: 999 });
    expect(scope.bedsInScope).toBe(120);
  });

  it("falls back to 85% occupancy when the baseline has no census", () => {
    const scope = computeQualityScope({ staffedBeds: 100 }, { qualityBeds: 100 });
    expect(scope.occupancyFraction).toBeCloseTo(0.85, 5);
  });

  it("selectedEventTypes reads only the recognized labels, in canonical order", () => {
    const types = selectedEventTypes({ qualityEventTypes: ["Sepsis", "HAPI", "Not A Real Type"] });
    expect(types).toEqual(["hapi", "sepsis"]);
  });

  it("no event types selected means no events in the payoff, even with beds and rates dialed up", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: [] }));
    expect(chain.payoff.events).toHaveLength(0);
    expect(chain.payoff.totalValue).toBe(0);
  });
});

describe("D2/D3/D4 gating - dollars are 0 until decisions are set", () => {
  it("at reality (D2 at its 55% baseline, D3 none, D4 at 0) every selected event type nets $0", () => {
    const values: LeverValues = {
      qualityLines: ["Med-Surg"],
      qualityBeds: 120,
      qualityEventTypes: [...ALL_EVENT_LABELS],
      qualityRealTime: QUALITY_REALTIME_BASELINE_PCT,
      qualityResponse: 0,
      qualityBundle: 0,
    };
    const chain = computeQualityChain(BASELINE, values);
    expect(chain.bundle.compositePreventionPct).toBe(0);
    expect(chain.response.realizationPct).toBe(0);
    for (const e of chain.payoff.events) {
      // Every event type's DOLLAR is 0 - the gating property this test is
      // actually about. Sepsis's own `prevented` count (calcSepsis's
      // `docLagCases`) is the addressable documentation-lag opportunity,
      // which is a function of the descriptive baseline compliance/doc-lag
      // rate, not of D3's realization - so it is not itself required to be
      // 0 here, only the dollar it produces is (realizationPct is what
      // gates the value, per calcSepsis's own formula).
      expect(e.value).toBe(0);
      if (e.id !== "sepsis") {
        expect(e.prevented).toBeCloseTo(0, 5);
      }
    }
    expect(chain.payoff.totalValue).toBe(0);
  });

  it("beds/units alone (D1), with no D2/D3/D4 movement, still nets $0", () => {
    const chain = computeQualityChain(BASELINE, {
      qualityLines: ["Med-Surg", "ICU"],
      qualityBeds: 120,
      qualityEventTypes: [...ALL_EVENT_LABELS],
    });
    expect(chain.payoff.totalValue).toBe(0);
  });

  it("D2 moved above reality alone (D4 still 0) produces a positive composite prevention rate for HAPI/CLABSI/Falls", () => {
    const rt = computeQualityRealTime({ qualityRealTime: 85 });
    expect(rt.effectiveLiftPct).toBeCloseTo(30, 5);
    expect(rt.impactPp).toBeGreaterThan(0);
    const bundle = computeQualityBundle(rt.impactPp, { qualityBundle: 0 });
    expect(bundle.compositePreventionPct).toBeGreaterThan(0);
  });
});

describe("D2/D4 monotonicity - more real-time closure / higher compliance increases prevented events", () => {
  it("increasing D2 (real-time gap closure) increases the composite prevention rate and total prevented events", () => {
    const low = computeQualityChain(BASELINE, fullValues({ qualityRealTime: 65, qualityBundle: 20 }));
    const high = computeQualityChain(BASELINE, fullValues({ qualityRealTime: 95, qualityBundle: 20 }));
    expect(high.bundle.compositePreventionPct).toBeGreaterThan(low.bundle.compositePreventionPct);
    expect(high.payoff.totalPrevented).toBeGreaterThan(low.payoff.totalPrevented);
    expect(high.payoff.totalValue).toBeGreaterThan(low.payoff.totalValue);
  });

  it("increasing D4 (bundle compliance) increases the composite prevention rate and total prevented events", () => {
    const low = computeQualityChain(BASELINE, fullValues({ qualityRealTime: 70, qualityBundle: 10 }));
    const high = computeQualityChain(BASELINE, fullValues({ qualityRealTime: 70, qualityBundle: 80 }));
    expect(high.bundle.compositePreventionPct).toBeGreaterThan(low.bundle.compositePreventionPct);
    expect(high.payoff.totalPrevented).toBeGreaterThan(low.payoff.totalPrevented);
    expect(high.payoff.totalValue).toBeGreaterThan(low.payoff.totalValue);
  });

  it("the composite prevention rate never exceeds the ceiling, even at max D2 + D4", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityRealTime: 100, qualityBundle: 100 }));
    expect(chain.bundle.compositePreventionPct).toBeLessThanOrEqual(QUALITY_PREVENTION_CEILING_PCT);
  });
});

describe("D3 - deterioration response raises Sepsis's prevention effect specifically", () => {
  it("a higher response level increases Sepsis's prevented count and value, sepsis-only", () => {
    const none = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["Sepsis"], qualityResponse: 0 }));
    const partial = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["Sepsis"], qualityResponse: 1 }));
    const full = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["Sepsis"], qualityResponse: 2 }));
    expect(none.payoff.totalValue).toBe(0);
    expect(partial.payoff.totalValue).toBeGreaterThan(none.payoff.totalValue);
    expect(full.payoff.totalValue).toBeGreaterThan(partial.payoff.totalValue);
  });
});

describe("selecting more event types increases the total", () => {
  it("adding event types one at a time strictly increases totalValue and totalPrevented", () => {
    const values = fullValues();
    let prevValue = -1;
    let prevCount = -1;
    const order: (keyof typeof QUALITY_EVENT_LABELS)[] = ["hapi", "falls", "clabsi", "sepsis"];
    const picked: string[] = [];
    for (const id of order) {
      picked.push(QUALITY_EVENT_LABELS[id]);
      const chain = computeQualityChain(BASELINE, { ...values, qualityEventTypes: [...picked] });
      expect(chain.payoff.totalValue).toBeGreaterThan(prevValue);
      expect(chain.payoff.totalPrevented).toBeGreaterThan(prevCount);
      prevValue = chain.payoff.totalValue;
      prevCount = chain.payoff.totalPrevented;
    }
  });
});

describe("reconciliation to the calc* helpers", () => {
  it("HAPI's contribution reconciles to calcHapi within tolerance", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["HAPI"] }));
    const hapi = chain.payoff.events.find((e) => e.id === "hapi")!;
    const direct = calcHapi({
      patientDays: chain.scope.patientDays,
      rate: HAPI_RATE_PER_1000,
      preventionPct: chain.bundle.compositePreventionPct,
      cost: HAPI_COST_PER_EVENT,
    });
    expect(hapi.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(hapi.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("Falls's contribution reconciles to calcFalls within tolerance", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["Falls"] }));
    const falls = chain.payoff.events.find((e) => e.id === "falls")!;
    const direct = calcFalls({
      patientDays: chain.scope.patientDays,
      rate: FALLS_RATE_PER_1000,
      preventionPct: chain.bundle.compositePreventionPct,
      cost: FALLS_COST_PER_EVENT,
    });
    expect(falls.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(falls.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("CLABSI's contribution reconciles to calcClabsi within tolerance", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["CLABSI"] }));
    const clabsi = chain.payoff.events.find((e) => e.id === "clabsi")!;
    const direct = calcClabsi({
      patientDays: chain.scope.patientDays,
      utilizationPct: CLABSI_UTILIZATION_PCT,
      rate: CLABSI_RATE_PER_1000_LINE_DAYS,
      preventionPct: chain.bundle.compositePreventionPct,
      cost: CLABSI_COST_PER_EVENT,
    });
    expect(clabsi.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(clabsi.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("Sepsis's contribution reconciles to calcSepsis within tolerance", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: ["Sepsis"] }));
    const sepsis = chain.payoff.events.find((e) => e.id === "sepsis")!;
    const direct = calcSepsis({
      patientDays: chain.scope.patientDays,
      ratePerThousand: SEPSIS_RATE_PER_1000,
      currentCompliancePct: SEPSIS_COMPLIANCE_BASELINE_PCT,
      docLagPct: SEPSIS_DOC_LAG_PCT,
      excessCostPerCase: SEPSIS_EXCESS_COST_PER_CASE,
      realizationPct: chain.response.realizationPct,
    });
    expect(sepsis.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(sepsis.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("every selected event type's value reconciles to computeAllDriverValues (the live engine), via exploreStateForReconciliation", () => {
    const values = fullValues();
    const chain = computeQualityChain(BASELINE, values);
    const state = exploreStateForReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);

    const hapi = chain.payoff.events.find((e) => e.id === "hapi")!;
    const falls = chain.payoff.events.find((e) => e.id === "falls")!;
    const clabsi = chain.payoff.events.find((e) => e.id === "clabsi")!;
    const sepsis = chain.payoff.events.find((e) => e.id === "sepsis")!;

    expect(engineValues.nursingHapi).toBeCloseTo(hapi.value, 0);
    expect(engineValues.nursingFalls).toBeCloseTo(falls.value, 0);
    expect(engineValues.nursingClabsi).toBeCloseTo(clabsi.value, 0);
    expect(engineValues.nursingSepsis).toBeCloseTo(sepsis.value, 0);
  });

  it("totalValue is the exact sum of every selected event type's own value (no smearing, no double count)", () => {
    const chain = computeQualityChain(BASELINE, fullValues());
    const sum = chain.payoff.events.reduce((s, e) => s + e.value, 0);
    expect(chain.payoff.totalValue).toBe(sum);
  });
});

describe("computeQualityContributions adapter", () => {
  it("returns the LeverContributionsResult shape, with every catalog lever id represented", () => {
    const result = computeQualityContributions(BASELINE, fullValues());
    expect(result.totalMargin).toBeGreaterThan(0);
    const ids = result.perLever.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(["qualityLines", "qualityBeds", "qualityRealTime", "qualityResponse", "qualityBundle"]));
    for (const l of result.perLever) {
      expect(Number.isFinite(l.pctOfTotal)).toBe(true);
      expect(l.formula.length).toBeGreaterThan(0);
    }
  });

  it("doing nothing new (defaults) nets exactly $0 through computeLeverContributions's quality dispatch", () => {
    const values: LeverValues = {
      qualityLines: [],
      qualityBeds: 0,
      qualityEventTypes: [],
      qualityRealTime: QUALITY_REALTIME_BASELINE_PCT,
      qualityResponse: 0,
      qualityBundle: 0,
    };
    const result = computeLeverContributions("quality", "nursing", BASELINE, values);
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("a real plan through computeLeverContributions's quality dispatch produces a positive total, reconciled to the chain", () => {
    const values = fullValues();
    const viaLevers = computeLeverContributions("quality", "nursing", BASELINE, values);
    const direct = computeQualityContributions(BASELINE, values);
    expect(viaLevers.totalMargin).toBe(direct.totalMargin);
    expect(viaLevers.totalMargin).toBeGreaterThan(0);
  });
});

describe("blank / partial baseline safety", () => {
  it("a blank baseline with no beds requested nets exactly $0, even with every rate decision dialed up", () => {
    const result = computeQualityContributions({}, fullValues({ qualityBeds: 0 }));
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    expect(Number.isNaN(result.totalCount)).toBe(false);
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("D1's own requested bed count is honored even when the Starting-point baseline stays blank (same convention as Workforce's D1 fallback) - NOT expected to net $0, expected to stay finite and non-negative", () => {
    const result = computeQualityContributions({}, fullValues());
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    expect(Number.isFinite(result.totalMargin)).toBe(true);
    expect(result.totalMargin).toBeGreaterThan(0);
    expect(result.totalMargin).toBeGreaterThanOrEqual(0);
  });

  it("a partial baseline (beds, no census) still produces finite, non-negative numbers", () => {
    const chain = computeQualityChain({ staffedBeds: 80 }, fullValues({ qualityBeds: 80 }));
    expect(Number.isFinite(chain.payoff.totalValue)).toBe(true);
    expect(chain.payoff.totalValue).toBeGreaterThanOrEqual(0);
  });
});
