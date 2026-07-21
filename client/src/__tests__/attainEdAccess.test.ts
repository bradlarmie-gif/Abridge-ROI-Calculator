import { describe, it, expect } from "vitest";
import {
  computeEdAccessScope,
  computeEdAccessPool,
  computeEdAccessRecovery,
  computeEdAccessRealized,
  computeEdAccessPayoff,
  computeEdAccessChain,
  computeEdAccessContributions,
  exploreStateForEdAccessReconciliation,
  computeAllDriverValues,
  edAccessCeilingPlainPhrase,
  ED_ACCESS_LEVER_IDS,
  DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE,
  DEFAULT_ED_ACCESS_LWBS_RATE,
  DEFAULT_ED_ACCESS_REVENUE_PER_VISIT,
  DEFAULT_ED_ACCESS_ADMISSION_RATE,
  DEFAULT_ED_ACCESS_ADMISSION_MARGIN,
} from "@/lib/attain/attainEdAccess";
import { computeLeverContributions, computeMultiGoalContributions, LEVERS, leversFor, type AttainBaseline, type LeverValues } from "@/lib/attain/attainLevers";

// Full ED scope, 100% utilization - the fixture that lets visitsInScope equal
// baseline.annualEncounters exactly, so recovered/admission math reconciles
// 1:1 to the live exploreDriverCalcs engine (same convention
// attainQuality.test.ts uses: qualityBeds === the full staffed-bed baseline).
const BASELINE: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };

describe("D1 scope", () => {
  it("providers in scope is capped to the Starting-point baseline", () => {
    const capped = computeEdAccessScope(BASELINE, { edAccessProviders: 999 });
    expect(capped.providersInScope).toBe(55);
    const partial = computeEdAccessScope(BASELINE, { edAccessProviders: 20 });
    expect(partial.providersInScope).toBe(20);
  });

  it("visits in scope scales with providers in scope, and equals the full baseline at full scope + 100% utilization", () => {
    const full = computeEdAccessScope(BASELINE, { edAccessProviders: 55 });
    expect(full.visitsInScope).toBeCloseTo(55 * 1_800, 3);
    const half = computeEdAccessScope(BASELINE, { edAccessProviders: 27.5 });
    expect(half.visitsInScope).toBeCloseTo(full.visitsInScope / 2, 1);
  });

  it("no providers requested means no visits in scope, even with a real baseline", () => {
    const scope = computeEdAccessScope(BASELINE, {});
    expect(scope.providersInScope).toBe(0);
    expect(scope.visitsInScope).toBe(0);
  });
});

describe("D2 - worth", () => {
  it("no dollars yet - worth alone (no scope, no recovery decision) is not itself a dollar figure", () => {
    // D2's own helpers just return a per-unit rate, never a total - proven by
    // the full chain test further down showing $0 when only D2 is set.
    const chain = computeEdAccessChain(BASELINE, { edAccessRevenuePerVisit: 600, edAccessAdmissionMargin: 12_000 });
    expect(chain.payoff.value).toBe(0);
  });

  it("revenue per visit and admission margin default to sensible benchmarks when unset", () => {
    const chain = computeEdAccessChain(BASELINE, {
      edAccessProviders: 55,
      edAccessLwbsRate: 8,
      edAccessLwbsReduction: 20,
      edAccessAdmissionRate: 18,
    });
    expect(chain.payoff.revenuePerVisit).toBe(DEFAULT_ED_ACCESS_REVENUE_PER_VISIT);
    expect(chain.payoff.admissionMargin).toBe(DEFAULT_ED_ACCESS_ADMISSION_MARGIN);
  });
});

describe("D3/D4 - the recoverable pool (the ceiling)", () => {
  it("pool = visits in scope x current LWBS rate", () => {
    const scope = { providersInScope: 55, visitsInScope: 55 * 1_800 };
    const pool = computeEdAccessPool(scope, { edAccessLwbsRate: 8 });
    expect(pool.lwbsRatePct).toBe(8);
    expect(pool.poolVisits).toBeCloseTo(55 * 1_800 * 0.08, 3);
  });

  it("LWBS rate defaults to the ED benchmark (8%) when unset", () => {
    expect(DEFAULT_ED_ACCESS_LWBS_RATE).toBe(8);
    const scope = { providersInScope: 55, visitsInScope: 55 * 1_800 };
    const pool = computeEdAccessPool(scope, {});
    expect(pool.lwbsRatePct).toBe(DEFAULT_ED_ACCESS_LWBS_RATE);
  });

  it("zero visits in scope means zero pool, even with a real LWBS rate", () => {
    const pool = computeEdAccessPool({ providersInScope: 0, visitsInScope: 0 }, { edAccessLwbsRate: 8 });
    expect(pool.poolVisits).toBe(0);
  });

  it("computeEdAccessRealized never exceeds the pool, even when the targeted number is far larger (the MIN/ceiling discipline)", () => {
    expect(computeEdAccessRealized(100, 500)).toBe(100);
    expect(computeEdAccessRealized(100, 40)).toBe(40);
    expect(computeEdAccessRealized(0, 40)).toBe(0);
    expect(computeEdAccessRealized(100, -10)).toBe(0);
  });

  it("computeEdAccessRecovery: realized recovered visits never exceed the pool, and admissions are a share of realized recovery, not of the pool", () => {
    const recovery = computeEdAccessRecovery(1_000, 30, { edAccessAdmissionRate: 20 });
    expect(recovery.targetedRecovered).toBeCloseTo(300, 3);
    expect(recovery.realizedRecovered).toBeCloseTo(300, 3);
    expect(recovery.realizedRecovered).toBeLessThanOrEqual(1_000);
    expect(recovery.capturedAdmissions).toBeCloseTo(60, 3); // 300 * 20%
  });

  it("a reduction target of 0 (reality, nothing new) recovers nothing and captures no admissions", () => {
    const recovery = computeEdAccessRecovery(1_000, 0, { edAccessAdmissionRate: 20 });
    expect(recovery.targetedRecovered).toBe(0);
    expect(recovery.realizedRecovered).toBe(0);
    expect(recovery.capturedAdmissions).toBe(0);
  });

  it("admission share at reality (unset/0) captures exactly zero admissions, even with real recovered visits - it is a genuine decision, not a benchmark default", () => {
    const recovery = computeEdAccessRecovery(1_000, 40, {});
    expect(recovery.realizedRecovered).toBeGreaterThan(0);
    expect(recovery.admissionRatePct).toBe(0);
    expect(recovery.capturedAdmissions).toBe(0);
  });

  it("edAccessCeilingPlainPhrase teaches the pool/target relationship in plain language, never printing MIN(", () => {
    expect(edAccessCeilingPlainPhrase(0, 0, 0)).not.toContain("MIN(");
    expect(edAccessCeilingPlainPhrase(1_000, 300, 300)).not.toContain("MIN(");
    expect(edAccessCeilingPlainPhrase(100, 500, 100).toLowerCase()).toContain("capped");
  });
});

describe("D5 - the payoff (dollars, derived)", () => {
  it("value = realized recovered visits x revenue/visit + captured admissions x admission margin", () => {
    const payoff = computeEdAccessPayoff(300, 60, { edAccessRevenuePerVisit: 480, edAccessAdmissionMargin: 8_000 });
    expect(payoff.visitValue).toBe(Math.round(300 * 480));
    expect(payoff.admissionValue).toBe(Math.round(60 * 8_000));
    expect(payoff.value).toBe(payoff.visitValue + payoff.admissionValue);
  });

  it("zero realized recovery means zero dollars, even with a real admission share and real worth set", () => {
    const payoff = computeEdAccessPayoff(0, 0, { edAccessRevenuePerVisit: 480, edAccessAdmissionMargin: 8_000 });
    expect(payoff.value).toBe(0);
  });
});

describe("the full D1-D5 chain - dollars are gated until every decision is real", () => {
  it("doing nothing new (every lever at realityStart) nets exactly $0", () => {
    const chain = computeEdAccessChain(BASELINE, {});
    expect(chain.payoff.value).toBe(0);
  });

  it("scope alone (D1), with no recovery decision, nets $0", () => {
    const chain = computeEdAccessChain(BASELINE, { edAccessProviders: 55 });
    expect(chain.payoff.value).toBe(0);
  });

  it("a reduction target alone (D3), with no providers in scope, nets $0 - no pool to draw from", () => {
    const chain = computeEdAccessChain(BASELINE, { edAccessLwbsReduction: 40, edAccessLwbsRate: 8 });
    expect(chain.scope.providersInScope).toBe(0);
    expect(chain.pool.poolVisits).toBe(0);
    expect(chain.payoff.value).toBe(0);
  });

  it("the full chain (scope + rate + reduction target + admission share) realizes real recovered visits, admissions, and dollars", () => {
    const chain = computeEdAccessChain(BASELINE, {
      edAccessProviders: 55,
      edAccessLwbsRate: 8,
      edAccessLwbsReduction: 25,
      edAccessAdmissionRate: 18,
    });
    expect(chain.recovery.realizedRecovered).toBeGreaterThan(0);
    expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.pool.poolVisits);
    expect(chain.recovery.capturedAdmissions).toBeGreaterThan(0);
    expect(chain.payoff.value).toBeGreaterThan(0);
  });

  it("realized recovered visits never exceed the recoverable pool, across a range of aggressive reduction targets", () => {
    for (const reductionPct of [10, 40, 70, 100]) {
      const chain = computeEdAccessChain(BASELINE, {
        edAccessProviders: 55,
        edAccessLwbsRate: 8,
        edAccessLwbsReduction: reductionPct,
      });
      expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.pool.poolVisits + 1e-6);
    }
  });

  it("printed formulas never contain literal MIN( notation", () => {
    const chain = computeEdAccessChain(BASELINE, {
      edAccessProviders: 55,
      edAccessLwbsRate: 8,
      edAccessLwbsReduction: 25,
      edAccessAdmissionRate: 18,
    });
    expect(chain.formulas.scope).not.toContain("MIN(");
    expect(chain.formulas.pool).not.toContain("MIN(");
    expect(chain.formulas.recovery).not.toContain("MIN(");
    expect(chain.formulas.payoff).not.toContain("MIN(");
  });

  it("minutes saved per note defaults to the ED benchmark of 9 (matches the authored ED narrative)", () => {
    expect(DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE).toBe(9);
    const chain = computeEdAccessChain(BASELINE, { edAccessProviders: 55 });
    expect(chain.recovery.minutesSavedPerNote).toBe(9);
  });
});

describe("reconciliation to the live edLwbs / admissionCapture engine (exploreDriverCalcs.ts)", () => {
  it("recovered-visit value reconciles to computeAllDriverValues's lwbsRecovery within tolerance", () => {
    const values: LeverValues = {
      edAccessProviders: 55,
      edAccessLwbsRate: 8,
      edAccessLwbsReduction: 25,
      edAccessRevenuePerVisit: 480,
      edAccessAdmissionRate: 18,
      edAccessAdmissionMargin: 8_000,
    };
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);

    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });

  it("reconciles across a second, different set of real numbers (not curve-fit to one fixture)", () => {
    const values: LeverValues = {
      edAccessProviders: 55,
      edAccessLwbsRate: 5,
      edAccessLwbsReduction: 40,
      edAccessRevenuePerVisit: 520,
      edAccessAdmissionRate: 22,
      edAccessAdmissionMargin: 9_500,
    };
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);

    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });
});

describe("computeEdAccessContributions adapter", () => {
  const fullValues = (): LeverValues => ({
    edAccessProviders: 55,
    edAccessRevenuePerVisit: 480,
    edAccessAdmissionMargin: 8_000,
    edAccessMinutesSaved: 9,
    edAccessLwbsRate: 8,
    edAccessLwbsReduction: 25,
    edAccessAdmissionRate: 18,
  });

  it("returns the LeverContributionsResult shape with every catalog lever id represented", () => {
    const result = computeEdAccessContributions(BASELINE, fullValues());
    expect(result.totalMargin).toBeGreaterThan(0);
    expect(result.perLever).toHaveLength(ED_ACCESS_LEVER_IDS.length);
    const ids = result.perLever.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining([...ED_ACCESS_LEVER_IDS]));
    for (const l of result.perLever) {
      expect(Number.isFinite(l.pctOfTotal)).toBe(true);
      expect(l.formula.length).toBeGreaterThan(0);
    }
  });

  it("doing nothing new nets exactly $0 through the adapter", () => {
    const result = computeEdAccessContributions(BASELINE, {});
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("leave-one-out marginals are exact, not inflated by a hidden benchmark default: removing admissionRate zeroes exactly the admission dollar, removing the reduction target zeroes the whole payoff", () => {
    const values = fullValues();
    const chosen = computeEdAccessChain(BASELINE, values);
    const result = computeEdAccessContributions(BASELINE, values);

    const admissionRow = result.perLever.find((l) => l.id === "edAccessAdmissionRate")!;
    const reductionRow = result.perLever.find((l) => l.id === "edAccessLwbsReduction")!;

    // Removing admissionRate alone must remove EXACTLY today's admission
    // dollar (chosen.payoff.admissionValue) - not more, not less - proving
    // the leave-one-out reset-to-0 does not silently re-trigger a
    // benchmark default for this row.
    expect(admissionRow.marginalMargin).toBeCloseTo(chosen.payoff.admissionValue, 0);
    // Removing the reduction target alone collapses realized recovery (and
    // therefore admissions too) to exactly 0, so its marginal is the WHOLE
    // payoff.
    expect(reductionRow.marginalMargin).toBeCloseTo(chosen.payoff.value, 0);
  });
});

describe("wiring - computeLeverContributions / computeMultiGoalContributions dispatch access by setting", () => {
  it("goal access at setting ed uses the ED chain, not the outpatient scheduling chain", () => {
    const values: LeverValues = {
      edAccessProviders: 55,
      edAccessLwbsRate: 8,
      edAccessLwbsReduction: 25,
      edAccessAdmissionRate: 18,
    };
    const viaLevers = computeLeverContributions("access", "ed", BASELINE, values);
    const direct = computeEdAccessContributions(BASELINE, values);
    expect(viaLevers.totalMargin).toBe(direct.totalMargin);
    expect(viaLevers.totalMargin).toBeGreaterThan(0);
  });

  it("goal access at setting outpatient is unaffected - still the outpatient scheduling chain, keyed by accessProviders/accessFreedShare", () => {
    const outpatientValues: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 50,
      accessDemandBacklog: 500,
    };
    const result = computeLeverContributions("access", "outpatient", { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 }, outpatientValues);
    expect(result.totalMargin).toBeGreaterThan(0);
  });

  it("leversFor(access, ed) returns the ED catalog, distinct from leversFor(access, outpatient)", () => {
    const edLevers = leversFor("access", "ed");
    const opLevers = leversFor("access", "outpatient");
    expect(edLevers.map((l) => l.id)).toEqual([...ED_ACCESS_LEVER_IDS]);
    expect(opLevers.map((l) => l.id)).not.toEqual(edLevers.map((l) => l.id));
    expect(LEVERS.access).toBe(opLevers);
  });

  it("computeMultiGoalContributions dispatches ED access through its own chain when combined with retention, without crashing or double-counting a freed hour it does not mechanically consume", () => {
    const baseline: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };
    const valuesByGoal = {
      access: {
        edAccessProviders: 55,
        edAccessLwbsRate: 8,
        edAccessLwbsReduction: 25,
        edAccessAdmissionRate: 18,
      },
      retention: {
        retentionProviders: 55,
        retentionProtect: 60,
        retentionSustain: 6,
      },
    };
    const combined = computeMultiGoalContributions(["access", "retention"], "ed", baseline, valuesByGoal, 50);
    const accessAlone = computeEdAccessContributions(baseline, valuesByGoal.access);
    const retentionAlone = computeLeverContributions("retention", "ed", baseline, valuesByGoal.retention);

    // ED access does not mechanically consume the shared freed-time hour (its
    // dollar math is pool x reduction%, not freed-hours-driven), so it gets
    // full, unscaled credit even with retention also selected - unlike
    // outpatient access, which DOES split the hour with retention.
    expect(combined.byGoal.access?.totalMargin).toBeCloseTo(accessAlone.totalMargin, 5);
    // Retention's own D2 (retentionProtect) is likewise NOT scaled down for
    // ED, since ED access isn't contending for the same hour.
    expect(combined.byGoal.retention?.totalMargin).toBeCloseTo(retentionAlone.totalMargin, 5);
  });
});

describe("blank starting-point baseline ({}), no NaN / no crash", () => {
  it("every function stays finite and non-negative against a blank baseline", () => {
    const chain = computeEdAccessChain({}, {
      edAccessProviders: 55,
      edAccessLwbsRate: 8,
      edAccessLwbsReduction: 25,
      edAccessAdmissionRate: 18,
    });
    expect(Number.isNaN(chain.payoff.value)).toBe(false);
    expect(Number.isFinite(chain.payoff.value)).toBe(true);
    expect(chain.payoff.value).toBeGreaterThanOrEqual(0);
  });

  it("computeEdAccessContributions nets exactly $0 against a blank baseline with no providers requested", () => {
    const result = computeEdAccessContributions({}, { edAccessLwbsRate: 8, edAccessLwbsReduction: 25 });
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });
});
