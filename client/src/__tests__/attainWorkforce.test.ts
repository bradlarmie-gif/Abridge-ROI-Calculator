import { describe, it, expect } from "vitest";
import {
  computeWorkforceScope,
  computeWorkforceProtect,
  computeWorkforceSurvey,
  computeWorkforceBackfill,
  computeWorkforceSustain,
  computeWorkforcePayoff,
  computeWorkforceChain,
  computeWorkforceContributions,
  computeWorkforceCeiling,
  exploreStateForReconciliation,
  computeAllDriverValues,
  WORKFORCE_LEVER_IDS,
  WORKFORCE_TURNOVER_DEFAULT_PCT,
  WORKFORCE_REPLACEMENT_COST_DEFAULT,
  WORKFORCE_BURNOUT_SHARE_PCT,
  WORKFORCE_IMPACT_CEILING_PP,
} from "@/lib/attain/attainWorkforce";
import { CONTENT } from "@/lib/attain/attainGoals";
import {
  LEVERS,
  leversFor,
  defaultLeverValues,
  computeLeverContributions,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import { computeAccessContributions } from "@/lib/attain/attainAccess";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const OP_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };
const NURSING_BASELINE: AttainBaseline = { staffedBeds: 400, nursingFtes: 480, dailyCensus: 340, adoptionPct: 100 };

// A fully-decided plan: scope, protect, survey, backfill, and sustain all
// set to real values - the only shape that reaches a nonzero payoff, per
// the decision-chain discipline (0 months sustained is 0 dollars no matter
// how strong D2-D4 are).
function fullValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    retentionLines: ["Primary Care", "Cardiology"],
    retentionProviders: 40,
    retentionTurnoverRate: 14,
    retentionReplacementCost: 375_000,
    retentionProtect: 60,
    retentionSurveyCadence: 1,
    retentionBackfill: 1,
    retentionSustain: 6,
    ...overrides,
  };
}

describe("D1 - who/scope, turnover rate, replacement cost (no dollar yet)", () => {
  it("providers in scope is capped to the Starting-point baseline", () => {
    const capped = computeWorkforceScope("outpatient", OP_BASELINE, { retentionProviders: 999 });
    expect(capped.providersInScope).toBe(40);

    const partial = computeWorkforceScope("outpatient", OP_BASELINE, { retentionProviders: 12 });
    expect(partial.providersInScope).toBe(12);
  });

  it("nursing scope reads nursingFtes, not staffedBeds", () => {
    const scope = computeWorkforceScope("nursing", NURSING_BASELINE, { retentionProviders: 999 });
    expect(scope.providersInScope).toBe(480);
  });

  it("turnover rate and replacement cost fall back to this setting's benchmark default when not entered", () => {
    const scope = computeWorkforceScope("outpatient", OP_BASELINE, { retentionProviders: 40 });
    expect(scope.turnoverRatePct).toBe(WORKFORCE_TURNOVER_DEFAULT_PCT.outpatient);
    expect(scope.replacementCost).toBe(WORKFORCE_REPLACEMENT_COST_DEFAULT.outpatient);
  });

  it("turnover rate and replacement cost are real, editable inputs that override the default", () => {
    const scope = computeWorkforceScope("outpatient", OP_BASELINE, {
      retentionProviders: 40,
      retentionTurnoverRate: 22,
      retentionReplacementCost: 500_000,
    });
    expect(scope.turnoverRatePct).toBe(22);
    expect(scope.replacementCost).toBe(500_000);
  });

  it("burnout share is fixed per setting, matching the benchmark copy (40% outpatient, 50% ED, 45% inpatient, 40% nursing)", () => {
    expect(WORKFORCE_BURNOUT_SHARE_PCT.outpatient).toBe(40);
    expect(WORKFORCE_BURNOUT_SHARE_PCT.ed).toBe(50);
    expect(WORKFORCE_BURNOUT_SHARE_PCT.inpatient).toBe(45);
    expect(WORKFORCE_BURNOUT_SHARE_PCT.nursing).toBe(40);
  });

  it("replacement cost benchmarks: physicians run $250K-$500K, nurses lower", () => {
    for (const setting of ["outpatient", "ed", "inpatient"] as AttainSetting[]) {
      expect(WORKFORCE_REPLACEMENT_COST_DEFAULT[setting]).toBeGreaterThanOrEqual(250_000);
      expect(WORKFORCE_REPLACEMENT_COST_DEFAULT[setting]).toBeLessThanOrEqual(500_000);
    }
    expect(WORKFORCE_REPLACEMENT_COST_DEFAULT.nursing).toBeLessThan(WORKFORCE_REPLACEMENT_COST_DEFAULT.outpatient);
  });
});

describe("D2 - protect the recovered relief (the shared freed-time lever)", () => {
  it("zero protected share means zero D2 impact, even with a real ceiling", () => {
    const protect = computeWorkforceProtect("outpatient", { retentionProtect: 0 });
    expect(protect.impactPp).toBe(0);
  });

  it("turning up the protected share increases D2's own impact", () => {
    const low = computeWorkforceProtect("outpatient", { retentionProtect: 20 });
    const high = computeWorkforceProtect("outpatient", { retentionProtect: 80 });
    expect(high.impactPp).toBeGreaterThan(low.impactPp);
  });

  it("the cross-goal share multiplier scales D2's effective share exactly, before impact is computed", () => {
    const full = computeWorkforceProtect("outpatient", { retentionProtect: 60 }, 1);
    const half = computeWorkforceProtect("outpatient", { retentionProtect: 60 }, 0.5);
    const zero = computeWorkforceProtect("outpatient", { retentionProtect: 60 }, 0);
    expect(half.impactPp).toBeCloseTo(full.impactPp * 0.5, 6);
    expect(zero.impactPp).toBe(0);
  });

  it("every setting shares the 50% product ceiling: at most half of the burnout-related departures can be avoided", () => {
    for (const setting of ["outpatient", "ed", "inpatient", "nursing"] as AttainSetting[]) {
      expect(WORKFORCE_IMPACT_CEILING_PP[setting]).toBe(50);
    }
  });
});

describe("the composite is a fraction of the 50% ceiling: full commitment reaches 50%, a sensible default lands at a meaningful mid-point", () => {
  // The representative default plan the app is driven to on Build the case:
  // 60% of freed relief protected, a quarterly pulse, partial coverage
  // backfill, and the floor held for 9 of the next 12 months, on the
  // 40-provider outpatient baseline.
  const DEFAULT_PLAN = (): LeverValues => ({
    retentionProviders: 40,
    retentionTurnoverRate: 14,
    retentionReplacementCost: 375_000,
    retentionProtect: 60,
    retentionSurveyCadence: 1,
    retentionBackfill: 1,
    retentionSustain: 9,
  });

  // A fully committed plan: every lever maxed.
  const MAX_PLAN = (): LeverValues => ({
    retentionProviders: 40,
    retentionTurnoverRate: 14,
    retentionReplacementCost: 375_000,
    retentionProtect: 100,
    retentionSurveyCadence: 2,
    retentionBackfill: 2,
    retentionSustain: 12,
  });

  it("a fully committed plan reaches the full 50% ceiling, never more", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", MAX_PLAN());
    expect(chain.sustain.compositeImpactPct).toBeCloseTo(50, 6);
    expect(chain.sustain.compositeImpactPct).toBeLessThanOrEqual(50);
  });

  it("the default plan lands at a meaningful mid-point (roughly 20-25%, about half the ceiling), not the old ~4%", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", DEFAULT_PLAN());
    expect(chain.sustain.compositeImpactPct).toBeGreaterThanOrEqual(20);
    expect(chain.sustain.compositeImpactPct).toBeLessThanOrEqual(25);
  });

  it("the composite is monotonic in commitment: the default is above nothing-committed and below the full ceiling", () => {
    const nothing = computeWorkforceChain(OP_BASELINE, "outpatient", {
      retentionProviders: 40,
      retentionTurnoverRate: 14,
      retentionReplacementCost: 375_000,
    });
    const dflt = computeWorkforceChain(OP_BASELINE, "outpatient", DEFAULT_PLAN());
    const max = computeWorkforceChain(OP_BASELINE, "outpatient", MAX_PLAN());
    expect(dflt.sustain.compositeImpactPct).toBeGreaterThan(nothing.sustain.compositeImpactPct);
    expect(dflt.sustain.compositeImpactPct).toBeLessThan(max.sustain.compositeImpactPct);
  });

  it("the default plan's dollar payoff reconciles to the engine's providerWellbeing exactly at the new ceiling", () => {
    const values = DEFAULT_PLAN();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values);
    const state = exploreStateForReconciliation(OP_BASELINE, "outpatient", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(chain.payoff.value).toBe(engineValues.providerWellbeing);
  });
});

describe("D3 - run a pulse / survey cadence (intervention AND signal)", () => {
  it("a cadence with nothing protected yet (D2 at 0) still realizes 0 - there is nothing to catch early", () => {
    const survey = computeWorkforceSurvey(0, { retentionSurveyCadence: 2 });
    expect(survey.impactPpAfterSurvey).toBe(0);
  });

  it("a faster cadence raises the realized impact of what D2 already protects", () => {
    const none = computeWorkforceSurvey(5, { retentionSurveyCadence: 0 });
    const quarterly = computeWorkforceSurvey(5, { retentionSurveyCadence: 1 });
    const monthly = computeWorkforceSurvey(5, { retentionSurveyCadence: 2 });
    expect(quarterly.impactPpAfterSurvey).toBeGreaterThan(none.impactPpAfterSurvey);
    expect(monthly.impactPpAfterSurvey).toBeGreaterThan(quarterly.impactPpAfterSurvey);
  });
});

describe("D4 - backfill coverage gaps (a separate, additive mechanism)", () => {
  it("backfill adds its own impact even when D2/D3 are still at zero - it does not require protecting relief first", () => {
    const none = computeWorkforceBackfill("outpatient", 0, { retentionBackfill: 0 });
    const partial = computeWorkforceBackfill("outpatient", 0, { retentionBackfill: 1 });
    const full = computeWorkforceBackfill("outpatient", 0, { retentionBackfill: 2 });
    expect(none.impactPpAfterBackfill).toBe(0);
    expect(partial.impactPpAfterBackfill).toBeGreaterThan(0);
    expect(full.impactPpAfterBackfill).toBeGreaterThan(partial.impactPpAfterBackfill);
  });

  it("backfill's bonus is capped at the setting's ceiling, even stacked on a large D2/D3 impact", () => {
    const ceiling = WORKFORCE_IMPACT_CEILING_PP.outpatient;
    const backfill = computeWorkforceBackfill("outpatient", ceiling * 2, { retentionBackfill: 2 });
    expect(backfill.impactPpAfterBackfill).toBeLessThanOrEqual(ceiling);
  });
});

describe("D5 - sustain (0 months held is 0 departures avoided)", () => {
  it("zero months sustained nets zero composite impact, no matter how strong the impact-so-far is", () => {
    const sustain = computeWorkforceSustain(10, { retentionSustain: 0 });
    expect(sustain.compositeImpactPct).toBe(0);
  });

  it("sustaining longer increases the realized composite impact", () => {
    const short = computeWorkforceSustain(10, { retentionSustain: 3 });
    const long = computeWorkforceSustain(10, { retentionSustain: 9 });
    expect(long.compositeImpactPct).toBeGreaterThan(short.compositeImpactPct);
  });

  it("12 months sustained realizes the full impact-so-far (fraction = 1)", () => {
    const sustain = computeWorkforceSustain(7.2, { retentionSustain: 12 });
    expect(sustain.compositeImpactPct).toBeCloseTo(7.2, 6);
  });
});

describe("THE PAYOFF - departures avoided x replacement cost", () => {
  it("departures avoided = providers x turnover x burnout share x composite impact, exactly", () => {
    const scope = computeWorkforceScope("outpatient", OP_BASELINE, fullValues());
    const payoff = computeWorkforcePayoff(scope, 5);
    const expected = scope.providersInScope * (scope.turnoverRatePct / 100) * (scope.burnoutSharePct / 100) * (5 / 100);
    expect(payoff.departuresAvoided).toBeCloseTo(expected, 6);
    expect(payoff.value).toBe(Math.round(expected * scope.replacementCost));
  });

  it("zero providers in scope means zero value even with a full composite impact", () => {
    const scope = computeWorkforceScope("outpatient", OP_BASELINE, { retentionProviders: 0 });
    const payoff = computeWorkforcePayoff(scope, 15);
    expect(payoff.value).toBe(0);
  });
});

describe("the whole chain - no single decision alone realizes any value", () => {
  it("doing nothing new (every decision at realityStart) nets exactly $0", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", {});
    expect(chain.payoff.value).toBe(0);
  });

  it("scope alone (providers, turnover, replacement cost) with D2-D5 untouched realizes $0", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", {
      retentionProviders: 40,
      retentionTurnoverRate: 14,
      retentionReplacementCost: 375_000,
    });
    expect(chain.payoff.value).toBe(0);
  });

  it("protecting relief (D2) alone, with D5 (sustain) still at 0 months, realizes $0", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", {
      retentionProviders: 40,
      retentionProtect: 80,
    });
    expect(chain.payoff.value).toBe(0);
  });

  it("sustaining (D5) alone, with D2/D4 still at 0, realizes $0 - there is nothing to sustain", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", {
      retentionProviders: 40,
      retentionSustain: 12,
    });
    expect(chain.payoff.value).toBe(0);
  });

  it("the full chain (scope + protect + survey + backfill + sustain) realizes real value", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", fullValues());
    expect(chain.payoff.value).toBeGreaterThan(0);
    expect(chain.payoff.departuresAvoided).toBeGreaterThan(0);
  });
});

describe("each decision's own monotonic effect on departures avoided (the required property)", () => {
  const base = fullValues();

  it("protecting more relief (D2) increases departures avoided", () => {
    const low = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionProtect: 20 });
    const high = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionProtect: 90 });
    expect(high.payoff.departuresAvoided).toBeGreaterThan(low.payoff.departuresAvoided);
  });

  it("adding the survey (D3) increases departures avoided", () => {
    const none = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionSurveyCadence: 0 });
    const quarterly = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionSurveyCadence: 1 });
    const monthly = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionSurveyCadence: 2 });
    expect(quarterly.payoff.departuresAvoided).toBeGreaterThan(none.payoff.departuresAvoided);
    expect(monthly.payoff.departuresAvoided).toBeGreaterThan(quarterly.payoff.departuresAvoided);
  });

  it("backfilling coverage gaps (D4) increases departures avoided", () => {
    const none = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionBackfill: 0 });
    const full = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionBackfill: 2 });
    expect(full.payoff.departuresAvoided).toBeGreaterThan(none.payoff.departuresAvoided);
  });

  it("sustaining longer (D5) increases departures avoided", () => {
    const short = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionSustain: 2 });
    const long = computeWorkforceChain(OP_BASELINE, "outpatient", { ...base, retentionSustain: 11 });
    expect(long.payoff.departuresAvoided).toBeGreaterThan(short.payoff.departuresAvoided);
  });
});

describe("reconciliation to the Explore retention driver (providerWellbeing / nursingRetention)", () => {
  it("outpatient reconciles to providerWellbeing exactly (same custom-scenario formula)", () => {
    const values = fullValues();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values);
    const state = exploreStateForReconciliation(OP_BASELINE, "outpatient", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.providerWellbeing).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(engineValues.providerWellbeing);
  });

  it("ED reconciles to providerWellbeing exactly, using ED's own turnover/burnout/replacement defaults", () => {
    const edBaseline: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };
    const values = fullValues({ retentionProviders: 55 });
    const chain = computeWorkforceChain(edBaseline, "ed", values);
    const state = exploreStateForReconciliation(edBaseline, "ed", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.providerWellbeing).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(engineValues.providerWellbeing);
  });

  it("inpatient reconciles to providerWellbeing exactly, using inpatient's own ip* fields", () => {
    const ipBaseline: AttainBaseline = { providers: 45, annualEncounters: 45 * 400, utilizationPct: 100 };
    const values = fullValues({ retentionProviders: 45 });
    const chain = computeWorkforceChain(ipBaseline, "inpatient", values);
    const state = exploreStateForReconciliation(ipBaseline, "inpatient", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.providerWellbeing).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(engineValues.providerWellbeing);
  });

  it("nursing reconciles to nursingRetention exactly, using the nursing replacement-cost scale", () => {
    const values = fullValues({ retentionProviders: 480, retentionTurnoverRate: 0, retentionReplacementCost: 0 });
    const chain = computeWorkforceChain(NURSING_BASELINE, "nursing", values);
    const state = exploreStateForReconciliation(NURSING_BASELINE, "nursing", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.nursingRetention).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(engineValues.nursingRetention);
    // Nursing uses its own, lower replacement-cost scale - never the
    // physician default.
    expect(chain.scope.replacementCost).toBe(WORKFORCE_REPLACEMENT_COST_DEFAULT.nursing);
    expect(chain.scope.replacementCost).toBeLessThan(WORKFORCE_REPLACEMENT_COST_DEFAULT.outpatient);
  });
});

describe("computeWorkforceContributions (LeverContributionsResult adapter)", () => {
  it("doing nothing new nets exactly $0 and carries one row per WORKFORCE_LEVER_IDS entry", () => {
    const result = computeWorkforceContributions(OP_BASELINE, "outpatient", {});
    expect(result.totalMargin).toBe(0);
    expect(result.perLever).toHaveLength(WORKFORCE_LEVER_IDS.length);
  });

  it("D1 scope/price rows never carry the marginal dollar directly", () => {
    const result = computeWorkforceContributions(OP_BASELINE, "outpatient", fullValues());
    for (const id of ["retentionLines", "retentionProviders", "retentionTurnoverRate", "retentionReplacementCost"]) {
      const row = result.perLever.find((p) => p.id === id)!;
      expect(row.marginalMargin).toBe(0);
    }
  });

  it("D2-D5 each carry a positive leave-one-out marginal on a fully-decided plan", () => {
    const result = computeWorkforceContributions(OP_BASELINE, "outpatient", fullValues());
    for (const id of ["retentionProtect", "retentionSurveyCadence", "retentionBackfill", "retentionSustain"]) {
      const row = result.perLever.find((p) => p.id === id)!;
      expect(row.marginalMargin).toBeGreaterThan(0);
    }
  });

  it("every row carries a live, non-empty formula string with no em dash", () => {
    const result = computeWorkforceContributions(OP_BASELINE, "outpatient", fullValues());
    for (const row of result.perLever) {
      expect(row.formula.length).toBeGreaterThan(0);
      expect(row.formula).not.toContain("—");
    }
  });

  it("pctOfTotal is well-formed (no divide-by-zero blowup) whether or not anything is selected", () => {
    for (const values of [{}, fullValues()]) {
      const result = computeWorkforceContributions(OP_BASELINE, "outpatient", values);
      for (const row of result.perLever) {
        expect(Number.isFinite(row.pctOfTotal)).toBe(true);
      }
    }
  });
});

describe("computeLeverContributions dispatch (attainLevers.ts integration)", () => {
  it("goal retention at every setting delegates to the workforce chain", () => {
    for (const setting of ["outpatient", "ed", "inpatient"] as AttainSetting[]) {
      const result = computeLeverContributions("retention", setting, OP_BASELINE, fullValues());
      expect(result.totalMargin).toBeGreaterThan(0);
      expect(result.perLever.map((p) => p.id).sort()).toEqual([...WORKFORCE_LEVER_IDS].sort());
    }
    const nursingResult = computeLeverContributions("retention", "nursing", NURSING_BASELINE, fullValues({ retentionProviders: 480 }));
    expect(nursingResult.totalMargin).toBeGreaterThan(0);
  });

  it("LEVERS.retention has 8 unique ids matching WORKFORCE_LEVER_IDS", () => {
    const ids = LEVERS.retention.map((l) => l.id);
    expect(new Set(ids)).toEqual(new Set(WORKFORCE_LEVER_IDS));
  });

  it("leversFor(retention, setting) returns LEVERS.retention regardless of setting", () => {
    for (const setting of ["outpatient", "ed", "inpatient", "nursing"] as AttainSetting[]) {
      expect(leversFor("retention", setting)).toBe(LEVERS.retention);
    }
  });
});

describe("access + retention freed-time no-double-count (preserved from the flat-lever model)", () => {
  // ONLY D2 (protect) and D5 (sustain) set - D3 (survey) and D4 (backfill)
  // are genuinely separate mechanisms that do NOT draw on the shared freed
  // hour, so this fixture isolates D2's own share-scaling property exactly,
  // the same way attainLevers.test.ts's retentionFullChainValues() does.
  const sharedHourValues = (): LeverValues => ({
    retentionProviders: 40,
    retentionProtect: 60,
    retentionSustain: 6,
  });

  it("retention's D2 share is scaled exactly by the cross-goal multiplier before the composite impact is computed", () => {
    const values = sharedHourValues();
    const full = computeWorkforceContributions(OP_BASELINE, "outpatient", values, 1);
    const half = computeWorkforceContributions(OP_BASELINE, "outpatient", values, 0.5);
    const zero = computeWorkforceContributions(OP_BASELINE, "outpatient", values, 0);
    expect(half.totalMargin).toBeCloseTo(full.totalMargin * 0.5, -1);
    expect(zero.totalMargin).toBe(0);
  });

  it("access + retention combined never double-counts the shared freed hour, at a contended 50/50 split", () => {
    const baseline: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 };
    const accessValues: LeverValues = { accessProviders: 40, accessFreedShare: 60, accessDemandNewReferrals: 1_000 };
    const retentionValues = sharedHourValues();
    const valuesByGoal = { access: accessValues, retention: retentionValues };

    const accessAlone = computeAccessContributions(baseline, accessValues);
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, retentionValues);
    const naiveDoubleCounted = accessAlone.totalMargin + retentionAlone.totalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 50);
    expect(combined.combinedMargin).toBeLessThan(naiveDoubleCounted);
    expect(combined.combinedMargin).toBeCloseTo(naiveDoubleCounted * 0.5, -1);
  });

  it("when only retention is selected (no access), D2's full requested share applies with no reduction", () => {
    const values = fullValues();
    const combined = computeMultiGoalContributions(["retention"], "outpatient", OP_BASELINE, { retention: values });
    const alone = computeLeverContributions("retention", "outpatient", OP_BASELINE, values);
    expect(combined.byGoal.retention?.totalMargin).toBeCloseTo(alone.totalMargin, 5);
  });
});

describe("blank starting-point baseline ({}), no NaN / no crash", () => {
  it("every step of the chain nets exactly $0 against a blank baseline when retentionProviders is also unset", () => {
    const chain = computeWorkforceChain({}, "outpatient", {});
    expect(chain.scope.providersInScope).toBe(0);
    expect(chain.payoff.value).toBe(0);
    expect(Number.isNaN(chain.payoff.value)).toBe(false);
  });

  it("dialing up every OTHER decision while the baseline stays blank never NaNs, crashes, or goes negative", () => {
    const chain = computeWorkforceChain({}, "outpatient", fullValues());
    expect(Number.isNaN(chain.payoff.value)).toBe(false);
    expect(Number.isFinite(chain.payoff.value)).toBe(true);
    expect(chain.payoff.value).toBeGreaterThanOrEqual(0);
    // D1's own requested provider count is honored even with no baseline to
    // cap it against - same convention as access's D1.
    expect(chain.scope.providersInScope).toBe(40);
  });
});

describe("no em dash anywhere in the catalog copy for retention", () => {
  it("no lever label or help string contains an em dash", () => {
    for (const lever of LEVERS.retention) {
      expect(lever.label).not.toContain("—");
      expect(lever.help).not.toContain("—");
    }
  });

  it("every lever has a signal string, used to pre-fill Commit's default signal", () => {
    for (const lever of LEVERS.retention) {
      expect(lever.signal.length).toBeGreaterThan(0);
    }
  });
});

describe("units honesty - the composite impact is a share of burnout departures, never 'pp of turnover' (Wave A fix)", () => {
  it("none of the chain's formula strings claim 'pp of turnover' - that reads as points off the turnover RATE, which this number is not", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", fullValues());
    for (const formula of Object.values(chain.formulas)) {
      expect(formula).not.toContain("pp of turnover");
      expect(formula).not.toMatch(/pp ceiling/);
    }
  });

  it("the D2-D5 formula strings instead say '% of burnout departures avoided', matching how the number is actually used in the payoff", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", fullValues());
    expect(chain.formulas.protect).toContain("% of burnout departures avoided");
    expect(chain.formulas.sustain).toContain("% of burnout departures avoided");
  });

  it("the payoff carries a HONEST resulting turnover-rate-points figure, far smaller than the composite impact percent", () => {
    const scope = computeWorkforceScope("outpatient", OP_BASELINE, fullValues());
    const payoff = computeWorkforcePayoff(scope, 50); // the maxed-out 50% composite
    // Avoiding half the burnout departures is NOT 50 points off the turnover
    // rate - the real rate effect is turnover x burnout share x 50%, an
    // order of magnitude smaller.
    expect(payoff.turnoverPointsReduced).toBeGreaterThan(0);
    expect(payoff.turnoverPointsReduced).toBeLessThan(50);
    expect(payoff.turnoverPointsReduced).toBeCloseTo(
      scope.turnoverRatePct * (scope.burnoutSharePct / 100) * (50 / 100),
      6,
    );
  });

  it("the payoff formula string surfaces the resulting turnover-points figure, not just the composite percent", () => {
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", fullValues());
    expect(chain.formulas.payoff).toContain("pts off your turnover rate");
  });
});

describe("computeWorkforceCeiling - the chain's own achievable maximum at a stated scale (Wave A fix)", () => {
  it("maxing every D2-D5 decision reaches EXACTLY the setting's ceiling composite, matching computeWorkforceCeiling", () => {
    const maxedValues = fullValues({
      retentionProviders: 120,
      retentionProtect: 100,
      retentionSurveyCadence: 2,
      retentionBackfill: 2,
      retentionSustain: 12,
    });
    const baseline: AttainBaseline = { providers: 120, annualEncounters: 120 * 3_500, utilizationPct: 100 };
    const chain = computeWorkforceChain(baseline, "outpatient", maxedValues);
    const ceiling = computeWorkforceCeiling("outpatient", 120);

    expect(chain.sustain.compositeImpactPct).toBeCloseTo(WORKFORCE_IMPACT_CEILING_PP.outpatient, 6);
    expect(chain.payoff.value).toBe(ceiling.value);
    expect(chain.payoff.departuresAvoided).toBeCloseTo(ceiling.departuresAvoided, 6);
  });

  it("the ceiling scales with headcount and never exceeds what providers x turnover x burnout x ceiling% implies", () => {
    for (const setting of ["outpatient", "ed", "inpatient", "nursing"] as AttainSetting[]) {
      const ceiling = computeWorkforceCeiling(setting, 100);
      const expectedMax =
        100 * (WORKFORCE_TURNOVER_DEFAULT_PCT[setting] / 100) * (WORKFORCE_BURNOUT_SHARE_PCT[setting] / 100) *
        (WORKFORCE_IMPACT_CEILING_PP[setting] / 100);
      expect(ceiling.departuresAvoided).toBeCloseTo(expectedMax, 6);
    }
  });
});

describe("retention story-page 'prize' copy agrees with the chain's own ceiling (Wave A fix for the ~4-8x ambition gap)", () => {
  const cases: { setting: AttainSetting; statedScale: number }[] = [
    { setting: "outpatient", statedScale: 120 },
    { setting: "ed", statedScale: 55 },
    { setting: "inpatient", statedScale: 45 },
    { setting: "nursing", statedScale: 480 },
  ];

  it.each(cases)(
    "$setting: the 'ambitious' ambition tier's goalMargin equals the chain's own ceiling value at the stated scale, never a number beyond it",
    ({ setting, statedScale }) => {
      const content = CONTENT[setting]?.retention;
      expect(content).toBeDefined();
      const ambitious = content!.ambition.find((a) => a.key === "ambitious");
      expect(ambitious).toBeDefined();

      const ceiling = computeWorkforceCeiling(setting, statedScale);
      expect(ambitious!.goalMargin).toBe(ceiling.value);
    },
  );

  it.each(cases)(
    "$setting: every ambition tier's goalMargin is at or under the chain's own achievable ceiling - the prize can never promise more than the chain can build",
    ({ setting, statedScale }) => {
      const content = CONTENT[setting]?.retention;
      const ceiling = computeWorkforceCeiling(setting, statedScale);
      for (const tier of content!.ambition) {
        expect(tier.goalMargin).toBeLessThanOrEqual(ceiling.value);
      }
    },
  );
});

describe("nursing burnout share is one consistent value across the engine and the story copy (Wave A fix)", () => {
  it("the engine's nursing burnout share matches computeAllDriverValues' own hardcoded nursingRetention burnout share (40%)", () => {
    expect(WORKFORCE_BURNOUT_SHARE_PCT.nursing).toBe(40);
  });

  it("the nursing retention world-card copy quotes the same 40%, not a different hand-picked number", () => {
    const content = CONTENT.nursing?.retention;
    expect(content).toBeDefined();
    const burnoutCard = content!.worldCards.find((c) => c.k === "Burnout share of exits");
    expect(burnoutCard).toBeDefined();
    expect(burnoutCard!.n).toBe(`~${WORKFORCE_BURNOUT_SHARE_PCT.nursing}%`);
  });
});
