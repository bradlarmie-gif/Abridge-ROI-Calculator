import { describe, it, expect } from "vitest";
import {
  computeEdAccessScope,
  computeEdAccessPool,
  computeEdAccessMechanism,
  computeEdAccessRecovery,
  computeEdAccessRealized,
  computeEdAccessPayoff,
  computeEdAccessChain,
  computeEdAccessContributions,
  exploreStateForEdAccessReconciliation,
  computeAllDriverValues,
  edAccessBindingPlainPhrase,
  ED_ACCESS_LEVER_IDS,
  DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE,
  DEFAULT_ED_ACCESS_LWBS_RATE,
  DEFAULT_ED_ACCESS_MARGIN_PER_VISIT,
  DEFAULT_ED_ACCESS_ADMISSION_MARGIN,
  DEFAULT_ED_ACCESS_ADMISSION_REALIZATION,
  DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY,
} from "@/lib/attain/attainEdAccess";
import { computeLeverContributions, computeMultiGoalContributions, defaultLeverValues, LEVERS, leversFor, type AttainBaseline, type LeverValues } from "@/lib/attain/attainLevers";

// Full ED scope, 100% utilization - the fixture that lets visitsInScope equal
// baseline.annualEncounters exactly, so recovered/admission math reconciles
// 1:1 to the live exploreDriverCalcs engine (same convention
// attainQuality.test.ts uses: qualityBeds === the full staffed-bed baseline).
const BASELINE: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };

/** A "full chain" fixture with every real decision moved off reality, tuned
 * so the freed-time mechanism (D3) and the recoverable pool (D4) are close
 * enough in magnitude that either side can plausibly bind, depending on the
 * exact numbers a given test uses - see the "genuine either-side ceiling"
 * describe block below for cases that deliberately push it one way. */
function fullValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    edAccessProviders: 55,
    edAccessMarginPerVisit: 380,
    edAccessAdmissionMargin: 8_000,
    edAccessMinutesSaved: 9,
    edAccessHoursPerRecovery: 1.5,
    edAccessThroughputShare: 50,
    edAccessLwbsRate: 8,
    edAccessDocCausedShare: 60,
    edAccessAdmissionRate: 18,
    edAccessAdmissionRealization: 60,
    ...overrides,
  };
}

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

describe("D2 - worth (contribution margin, not charges)", () => {
  it("no dollars yet - worth alone (no scope, no recovery decision) is not itself a dollar figure", () => {
    const chain = computeEdAccessChain(BASELINE, { edAccessMarginPerVisit: 600, edAccessAdmissionMargin: 12_000 });
    expect(chain.payoff.value).toBe(0);
  });

  it("margin per visit and admission margin default to sensible benchmarks when unset", () => {
    const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessMarginPerVisit: undefined, edAccessAdmissionMargin: undefined }));
    expect(chain.payoff.marginPerVisit).toBe(DEFAULT_ED_ACCESS_MARGIN_PER_VISIT);
    expect(chain.payoff.admissionMargin).toBe(DEFAULT_ED_ACCESS_ADMISSION_MARGIN);
  });

  it("margin per visit is a CONTRIBUTION MARGIN benchmark, not the old gross-charge figure", () => {
    // The pre-audit default was $480 (gross ED revenue per visit). The
    // fixed default reuses attainAccess.ts's own audited "General ED"
    // contribution-margin preset ($380), a materially different, more
    // conservative number - this test pins that the fix actually landed.
    expect(DEFAULT_ED_ACCESS_MARGIN_PER_VISIT).toBe(380);
    expect(DEFAULT_ED_ACCESS_MARGIN_PER_VISIT).not.toBe(480);
  });

  it("admission realization defaults to the live engine's own bed/payer benchmark (60%) when unset", () => {
    expect(DEFAULT_ED_ACCESS_ADMISSION_REALIZATION).toBe(60);
  });
});

describe("D3 - convert freed time to throughput (the one capacity mechanism)", () => {
  it("freed hours = providers x notes/provider/yr x minutes saved, and mechanical recovery = (freed hours x throughput share) / hours per recovery", () => {
    const scope = { providersInScope: 55, visitsInScope: 55 * 1_800 };
    const mech = computeEdAccessMechanism(BASELINE, scope, 9, 50, 1.5);
    const expectedFreedHours = 55 * 1_800 * (9 / 60);
    expect(mech.freedHoursTotal).toBeCloseTo(expectedFreedHours, 1);
    expect(mech.freedHoursToThroughput).toBeCloseTo(expectedFreedHours * 0.5, 1);
    expect(mech.mechanicallyEnabledRecovered).toBeCloseTo((expectedFreedHours * 0.5) / 1.5, 1);
  });

  it("COUNTERFACTUAL: zero minutes saved per note mechanically zeroes recovery, regardless of throughput share", () => {
    const scope = { providersInScope: 55, visitsInScope: 55 * 1_800 };
    const mech = computeEdAccessMechanism(BASELINE, scope, 0, 100, 1.5);
    expect(mech.freedHoursTotal).toBe(0);
    expect(mech.mechanicallyEnabledRecovered).toBe(0);

    const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessMinutesSaved: 0, edAccessThroughputShare: 100 }));
    expect(chain.mechanism.mechanicallyEnabledRecovered).toBe(0);
    expect(chain.recovery.realizedRecovered).toBe(0);
    expect(chain.payoff.value).toBe(0);
  });

  it("COUNTERFACTUAL: zero throughput share mechanically zeroes recovery, regardless of minutes saved", () => {
    const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessThroughputShare: 0, edAccessMinutesSaved: 30 }));
    expect(chain.mechanism.mechanicallyEnabledRecovered).toBe(0);
    expect(chain.recovery.realizedRecovered).toBe(0);
    expect(chain.payoff.value).toBe(0);
  });

  it("a shorter hours-per-recovery assumption converts the identical freed hours into MORE mechanically enabled recovery", () => {
    const scope = { providersInScope: 55, visitsInScope: 55 * 1_800 };
    const short = computeEdAccessMechanism(BASELINE, scope, 9, 50, 1);
    const long = computeEdAccessMechanism(BASELINE, scope, 9, 50, 3);
    expect(short.mechanicallyEnabledRecovered).toBeGreaterThan(long.mechanicallyEnabledRecovered);
  });

  it("hours per recovery defaults to the benchmark of 1.5 when unset", () => {
    expect(DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY).toBe(1.5);
  });

  it("zero providers in scope means zero freed hours and zero mechanical recovery, even with real minutes/share", () => {
    const mech = computeEdAccessMechanism(BASELINE, { providersInScope: 0, visitsInScope: 0 }, 9, 100, 1.5);
    expect(mech.freedHoursTotal).toBe(0);
    expect(mech.mechanicallyEnabledRecovered).toBe(0);
  });
});

describe("D4 - the recoverable pool (a genuine, independent ceiling)", () => {
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

  it("computeEdAccessRealized is a genuine MIN of two independent sides", () => {
    expect(computeEdAccessRealized(100, 500)).toBe(100);
    expect(computeEdAccessRealized(100, 40)).toBe(40);
    expect(computeEdAccessRealized(0, 40)).toBe(0);
    expect(computeEdAccessRealized(100, -10)).toBe(0);
  });

  it("GENUINE CEILING: the pool binds when mechanical recovery is deliberately much larger than the pool", () => {
    // Large mechanical number (freed-time capacity), small pool - unlike
    // the pre-audit tautological ceiling (target defined as a percent OF
    // the pool, so it could never exceed it), this MIN can and does bind
    // on the POOL side here, proving the two sides are truly independent.
    const recovery = computeEdAccessRecovery(100, 5_000, { edAccessAdmissionRate: 20 });
    expect(recovery.realizedRecovered).toBe(100);
    expect(recovery.binding).toBe("pool");
  });

  it("GENUINE CEILING: freed-time (throughput) capacity binds when the pool is deliberately much larger", () => {
    const recovery = computeEdAccessRecovery(5_000, 100, { edAccessAdmissionRate: 20 });
    expect(recovery.realizedRecovered).toBe(100);
    expect(recovery.binding).toBe("throughput");
  });

  it("computeEdAccessRecovery: admissions are a share of REALIZED recovery, then capped again by admission realization", () => {
    const recovery = computeEdAccessRecovery(1_000, 300, { edAccessAdmissionRate: 20, edAccessAdmissionRealization: 50 });
    expect(recovery.realizedRecovered).toBeCloseTo(300, 3);
    expect(recovery.capturedAdmissionsRaw).toBeCloseTo(60, 3); // 300 * 20%
    expect(recovery.admissionRealizationPct).toBe(50);
    expect(recovery.capturedAdmissions).toBeCloseTo(30, 3); // 60 * 50%
  });

  it("admission realization defaults to the bed/payer benchmark (60%) when unset, capping admissions even with no partner override", () => {
    const recovery = computeEdAccessRecovery(1_000, 300, { edAccessAdmissionRate: 20 });
    expect(recovery.admissionRealizationPct).toBe(DEFAULT_ED_ACCESS_ADMISSION_REALIZATION);
    expect(recovery.capturedAdmissions).toBeCloseTo(60 * 0.6, 3);
    expect(recovery.capturedAdmissions).toBeLessThan(recovery.capturedAdmissionsRaw);
  });

  it("zero mechanical recovery (D3) recovers nothing and captures no admissions, even with a real pool", () => {
    const recovery = computeEdAccessRecovery(1_000, 0, { edAccessAdmissionRate: 20 });
    expect(recovery.realizedRecovered).toBe(0);
    expect(recovery.capturedAdmissions).toBe(0);
    expect(recovery.binding).toBe("none");
  });

  it("admission share at reality (unset/0) captures exactly zero admissions, even with real recovered visits - it is a genuine decision, not a benchmark default", () => {
    const recovery = computeEdAccessRecovery(1_000, 400, {});
    expect(recovery.realizedRecovered).toBeGreaterThan(0);
    expect(recovery.admissionRatePct).toBe(0);
    expect(recovery.capturedAdmissions).toBe(0);
  });

  it("edAccessBindingPlainPhrase teaches which side binds in plain language, never printing MIN(", () => {
    expect(edAccessBindingPlainPhrase("none")).not.toContain("MIN(");
    expect(edAccessBindingPlainPhrase("pool")).not.toContain("MIN(");
    expect(edAccessBindingPlainPhrase("throughput")).not.toContain("MIN(");
    expect(edAccessBindingPlainPhrase("pool").toLowerCase()).toContain("pool");
    expect(edAccessBindingPlainPhrase("throughput").toLowerCase()).toContain("throughput");
  });
});

describe("D4 - the diagnosis gate (the load-bearing rung: is the leak Abridge's to fix)", () => {
  it("recoverable pool = full LWBS pool x the documentation-caused share", () => {
    const scope = { providersInScope: 55, visitsInScope: 55 * 1_800 };
    const pool = computeEdAccessPool(scope, { edAccessLwbsRate: 8, edAccessDocCausedShare: 60 });
    expect(pool.poolVisits).toBeCloseTo(55 * 1_800 * 0.08, 3);
    expect(pool.docCausedSharePct).toBe(60);
    expect(pool.recoverablePool).toBeCloseTo(pool.poolVisits * 0.6, 3);
    expect(pool.recoverablePool).toBeLessThan(pool.poolVisits);
  });

  it("LOAD-BEARING: an un-made diagnosis (doc-caused share unset/0) recovers nothing and nets $0, even with full throughput and a real LWBS pool", () => {
    const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessDocCausedShare: 0, edAccessThroughputShare: 100 }));
    expect(chain.pool.poolVisits).toBeGreaterThan(0);
    expect(chain.pool.recoverablePool).toBe(0);
    expect(chain.recovery.realizedRecovered).toBe(0);
    expect(chain.recovery.binding).toBe("none");
    expect(chain.payoff.value).toBe(0);
  });

  it("DIAGNOSIS CEILING BINDS: a small charting-caused share caps recovery below what freed time affords", () => {
    // Full throughput so freed-time capacity is large; a small diagnosis makes
    // the recoverable pool the limiter, and realized recovery equals it.
    const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessDocCausedShare: 5, edAccessThroughputShare: 100, edAccessHoursPerRecovery: 0.5 }));
    expect(chain.recovery.realizedRecovered).toBeCloseTo(chain.pool.recoverablePool, 6);
    expect(chain.recovery.realizedRecovered).toBeLessThan(chain.mechanism.mechanicallyEnabledRecovered);
    expect(chain.recovery.binding).toBe("pool");
  });

  it("only Abridge's share counts: lowering the charting-caused diagnosis strictly lowers realized recovery and the prize", () => {
    // Force the pool side to bind in both cases (large freed-time capacity), so
    // the diagnosis is what moves the number.
    const high = computeEdAccessChain(BASELINE, fullValues({ edAccessDocCausedShare: 80, edAccessThroughputShare: 100, edAccessHoursPerRecovery: 0.5 }));
    const low = computeEdAccessChain(BASELINE, fullValues({ edAccessDocCausedShare: 30, edAccessThroughputShare: 100, edAccessHoursPerRecovery: 0.5 }));
    expect(low.recovery.realizedRecovered).toBeLessThan(high.recovery.realizedRecovered);
    expect(low.payoff.value).toBeLessThan(high.payoff.value);
  });

  it("realized recovery never exceeds the recoverable (diagnosis-limited) pool, across a range of diagnoses", () => {
    for (const docShare of [10, 40, 70, 100]) {
      const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessDocCausedShare: docShare }));
      expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.pool.recoverablePool + 1e-6);
      expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.mechanism.mechanicallyEnabledRecovered + 1e-6);
    }
  });

  it("the diagnosis flows into reconciliation: the engine's recovered term still lands on this chain's realized recovery", () => {
    const values = fullValues({ edAccessDocCausedShare: 45 });
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });
});

describe("D5 - the payoff (dollars, derived, honest contribution margin)", () => {
  it("value = realized recovered visits x margin/visit + REALIZED captured admissions x admission margin", () => {
    const payoff = computeEdAccessPayoff(300, 30, { edAccessMarginPerVisit: 380, edAccessAdmissionMargin: 8_000 });
    expect(payoff.visitValue).toBe(Math.round(300 * 380));
    expect(payoff.admissionValue).toBe(Math.round(30 * 8_000));
    expect(payoff.value).toBe(payoff.visitValue + payoff.admissionValue);
  });

  it("zero realized recovery means zero dollars, even with a real admission share and real worth set", () => {
    const payoff = computeEdAccessPayoff(0, 0, { edAccessMarginPerVisit: 380, edAccessAdmissionMargin: 8_000 });
    expect(payoff.value).toBe(0);
  });
});

describe("the full D1-D5 chain - dollars are gated until every decision is real", () => {
  it("doing nothing new (every lever at realityStart) nets exactly $0", () => {
    const chain = computeEdAccessChain(BASELINE, {});
    expect(chain.payoff.value).toBe(0);
  });

  it("scope alone (D1), with no throughput commitment, nets $0", () => {
    const chain = computeEdAccessChain(BASELINE, { edAccessProviders: 55 });
    expect(chain.payoff.value).toBe(0);
  });

  it("a throughput share alone (D3), with no providers in scope, nets $0 - no freed time to draw from", () => {
    const chain = computeEdAccessChain(BASELINE, { edAccessThroughputShare: 100, edAccessLwbsRate: 8 });
    expect(chain.scope.providersInScope).toBe(0);
    expect(chain.mechanism.mechanicallyEnabledRecovered).toBe(0);
    expect(chain.payoff.value).toBe(0);
  });

  it("the full chain (scope + freed time + pool + admission decisions) realizes real recovered visits, admissions, and dollars", () => {
    const chain = computeEdAccessChain(BASELINE, fullValues());
    expect(chain.recovery.realizedRecovered).toBeGreaterThan(0);
    expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.pool.poolVisits + 1e-6);
    expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.mechanism.mechanicallyEnabledRecovered + 1e-6);
    expect(chain.recovery.capturedAdmissions).toBeGreaterThan(0);
    expect(chain.payoff.value).toBeGreaterThan(0);
  });

  it("realized recovered visits never exceed either the pool or the mechanical freed-time capacity, across a range of throughput shares", () => {
    for (const throughputShare of [10, 40, 70, 100]) {
      const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessThroughputShare: throughputShare }));
      expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.pool.poolVisits + 1e-6);
      expect(chain.recovery.realizedRecovered).toBeLessThanOrEqual(chain.mechanism.mechanicallyEnabledRecovered + 1e-6);
    }
  });

  it("printed formulas never contain literal MIN( notation", () => {
    const chain = computeEdAccessChain(BASELINE, fullValues());
    expect(chain.formulas.scope).not.toContain("MIN(");
    expect(chain.formulas.mechanism).not.toContain("MIN(");
    expect(chain.formulas.pool).not.toContain("MIN(");
    expect(chain.formulas.recovery).not.toContain("MIN(");
    expect(chain.formulas.payoff).not.toContain("MIN(");
  });

  it("minutes saved per note defaults to the ED benchmark of 9 (matches the authored ED narrative)", () => {
    expect(DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE).toBe(9);
    const chain = computeEdAccessChain(BASELINE, { edAccessProviders: 55 });
    expect(chain.mechanism.minutesSavedPerNote).toBe(9);
  });

  it("PAYOFF IS HONEST CONTRIBUTION MARGIN: the visit leg is priced at margin, not the old $480 gross-revenue default", () => {
    const chain = computeEdAccessChain(BASELINE, fullValues({ edAccessMarginPerVisit: undefined }));
    expect(chain.payoff.marginPerVisit).toBe(380);
    expect(chain.payoff.marginPerVisit).not.toBe(480);
  });
});

describe("reconciliation to the live edLwbs / admissionCapture engine (exploreDriverCalcs.ts)", () => {
  it("recovered-visit value reconciles to computeAllDriverValues's lwbsRecovery within tolerance", () => {
    const values = fullValues();
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);

    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });

  it("reconciles across a second, different set of real numbers (not curve-fit to one fixture)", () => {
    const values = fullValues({
      edAccessLwbsRate: 5,
      edAccessThroughputShare: 80,
      edAccessHoursPerRecovery: 2,
      edAccessMarginPerVisit: 520,
      edAccessAdmissionRate: 22,
      edAccessAdmissionMargin: 9_500,
      edAccessAdmissionRealization: 45,
    });
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);

    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });

  it("the admission-realization fix (I1) actually changes the reconciled engine dollar - hardcoding it to 100% would not reconcile", () => {
    const values = fullValues({ edAccessAdmissionRealization: 30 });
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    expect(state.timeDriverInputs.edAdmissionRealization).toBe(30);
    expect(state.timeDriverInputs.edAdmissionRealization).not.toBe(100);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });
});

describe("ED access arrives alive (regression C1: the chain used to be a permanent $0)", () => {
  it("defaultLeverValues seeds edAccessMinutesSaved at the 9-min benchmark, not a dead numeric 0", () => {
    const seeded = defaultLeverValues("access", "ed");
    expect(seeded.edAccessMinutesSaved).toBe(DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE);
    expect(seeded.edAccessMinutesSaved as number).toBeGreaterThan(0);
  });

  it("the seeded minutes plus a real throughput commitment produce non-zero freed capacity and payoff; a seeded 0 would zero the whole chain", () => {
    const seededMinutes = defaultLeverValues("access", "ed").edAccessMinutesSaved as number;
    const alive = computeEdAccessChain(BASELINE, fullValues({ edAccessMinutesSaved: seededMinutes }));
    expect(alive.mechanism.mechanicallyEnabledRecovered).toBeGreaterThan(0);
    expect(alive.payoff.value).toBeGreaterThan(0);
    // The exact counterfactual C1 was silently stuck on: 0 minutes saved ->
    // 0 freed-time capacity -> MIN(pool, capacity) = 0 -> $0.
    const dead = computeEdAccessChain(BASELINE, fullValues({ edAccessMinutesSaved: 0 }));
    expect(dead.mechanism.mechanicallyEnabledRecovered).toBe(0);
    expect(dead.payoff.value).toBe(0);
  });

  it("the seeded-minutes chain still reconciles to computeAllDriverValues", () => {
    const seededMinutes = defaultLeverValues("access", "ed").edAccessMinutesSaved as number;
    const values = fullValues({ edAccessMinutesSaved: seededMinutes });
    const chain = computeEdAccessChain(BASELINE, values);
    const state = exploreStateForEdAccessReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);
  });
});

describe("computeEdAccessContributions adapter", () => {
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

  it("M1 FIX: the visit leg and admission leg are attributed directly and non-overlapping - the two decision rows sum to EXACTLY the total payoff, never more", () => {
    const values = fullValues();
    const chosen = computeEdAccessChain(BASELINE, values);
    const result = computeEdAccessContributions(BASELINE, values);

    const throughputRow = result.perLever.find((l) => l.id === "edAccessThroughputShare")!;
    const admissionRow = result.perLever.find((l) => l.id === "edAccessAdmissionRate")!;

    expect(throughputRow.marginalMargin).toBeCloseTo(chosen.payoff.visitValue, 0);
    expect(admissionRow.marginalMargin).toBeCloseTo(chosen.payoff.admissionValue, 0);
    // The old nested leave-one-out bug (M1) double-counted the admission
    // dollar: resetting the throughput decision to 0 collapsed BOTH legs,
    // so its marginal absorbed the whole payoff while the admission row
    // separately claimed its own leg too, and the two summed to MORE than
    // the total. Direct leg attribution cannot do that by construction.
    expect(throughputRow.marginalMargin + admissionRow.marginalMargin).toBeCloseTo(chosen.payoff.value, 0);
    expect(throughputRow.pctOfTotal + admissionRow.pctOfTotal).toBeCloseTo(1, 5);
  });

  it("structural/context rows (D1-D3 facts) carry zero marginal margin, never smearing the dollar across rows that didn't produce it", () => {
    const result = computeEdAccessContributions(BASELINE, fullValues());
    for (const id of ["edAccessProviders", "edAccessMarginPerVisit", "edAccessAdmissionMargin", "edAccessMinutesSaved", "edAccessHoursPerRecovery", "edAccessLwbsRate", "edAccessDocCausedShare", "edAccessAdmissionRealization"]) {
      const row = result.perLever.find((l) => l.id === id)!;
      expect(row.marginalMargin).toBe(0);
      expect(row.pctOfTotal).toBe(0);
    }
  });
});

describe("wiring - computeLeverContributions / computeMultiGoalContributions dispatch access by setting", () => {
  it("goal access at setting ed uses the ED chain, not the outpatient scheduling chain", () => {
    const values = fullValues();
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

  it("I6 FIX: computeMultiGoalContributions now SPLITS the shared freed hour between ED access and ED retention, the same way it already does at outpatient", () => {
    const baseline: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };
    const valuesByGoal = {
      access: fullValues(),
      retention: {
        retentionProviders: 55,
        retentionProtect: 60,
        retentionSustain: 6,
      },
    };
    const accessAlone = computeEdAccessContributions(baseline, valuesByGoal.access);
    const retentionAlone = computeLeverContributions("retention", "ed", baseline, valuesByGoal.retention);

    const split50 = computeMultiGoalContributions(["access", "retention"], "ed", baseline, valuesByGoal, 50);
    // At a 50/50 split, ED access gets roughly HALF its unscaled credit
    // (its D3 throughput share is scaled by the access side of the split
    // before the mechanical recovery, and therefore the dollar, is
    // computed) - strictly less than the full, unscaled figure either
    // goal would get alone, proving the hour is no longer double-narrated.
    expect(split50.byGoal.access!.totalMargin).toBeLessThan(accessAlone.totalMargin);
    expect(split50.byGoal.access!.totalMargin).toBeGreaterThan(0);

    const split100 = computeMultiGoalContributions(["access", "retention"], "ed", baseline, valuesByGoal, 100);
    expect(split100.byGoal.access!.totalMargin).toBeCloseTo(accessAlone.totalMargin, 5);

    const split0 = computeMultiGoalContributions(["access", "retention"], "ed", baseline, valuesByGoal, 0);
    expect(split0.byGoal.access!.totalMargin).toBeCloseTo(0, 5);
    expect(split0.byGoal.retention!.totalMargin).toBeCloseTo(retentionAlone.totalMargin, 5);
  });

  it("the split does NOT engage for ED access + a goal other than retention (e.g. revenue) - full, unscaled credit", () => {
    const baseline: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };
    const valuesByGoal = { access: fullValues() };
    const combined = computeMultiGoalContributions(["access"], "ed", baseline, valuesByGoal, 50);
    const accessAlone = computeEdAccessContributions(baseline, valuesByGoal.access);
    expect(combined.byGoal.access!.totalMargin).toBeCloseTo(accessAlone.totalMargin, 5);
  });
});

describe("blank starting-point baseline ({}), no NaN / no crash", () => {
  it("every function stays finite and non-negative against a blank baseline", () => {
    const chain = computeEdAccessChain({}, fullValues());
    expect(Number.isNaN(chain.payoff.value)).toBe(false);
    expect(Number.isFinite(chain.payoff.value)).toBe(true);
    expect(chain.payoff.value).toBeGreaterThanOrEqual(0);
  });

  it("computeEdAccessContributions nets exactly $0 against a blank baseline with no providers requested", () => {
    const result = computeEdAccessContributions({}, { edAccessLwbsRate: 8, edAccessThroughputShare: 25 });
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });
});
