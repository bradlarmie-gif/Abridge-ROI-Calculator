import { describe, it, expect } from "vitest";
import {
  computeAccessScope,
  computeAccessCapacity,
  computeAccessDemand,
  computeAccessPayoff,
  computeAccessChain,
  computeAccessContributions,
  exploreStateForReconciliation,
  computeAllDriverValues,
  estimateNoShowRecoveryCount,
  DEFAULT_MINUTES_SAVED_PER_NOTE,
  DEFAULT_VISIT_LENGTH_MIN,
  DEFAULT_NO_SHOW_RATE_PCT,
} from "@/lib/attain/attainAccess";
import { type AttainBaseline, type LeverValues } from "@/lib/attain/attainLevers";

/**
 * Dedicated test file for the ACCESS decision chain - the exemplar bar the
 * rest of Attain is measured against. Historically its own math lived only
 * inside attainLevers.test.ts's generic sweep; this file is the module's
 * OWN home (matching attainRevenue.test.ts / attainWorkforce.test.ts /
 * attainInpatientRevenue.test.ts's convention), added specifically so the
 * reconciliation-to-Explore claim in attainAccess.ts's module header is
 * PROVEN here, not just asserted in prose (I3, premium audit).
 */

const BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_600, utilizationPct: 100 };

describe("D4 rebuild - every demand source is a countable number of patients, not a rate", () => {
  it("demand ceiling is the sum of the four countable sources: backlog (one-time) + referrals x 12 + same-day count + no-show count", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, {
      accessDemandBacklog: 500,
      accessDemandNewReferrals: 50, // /mo
      accessDemandSameDayCount: 300, // patients/yr, a direct count now
      accessDemandNoShowCount: 200, // patients/yr, a direct count now
    });
    expect(demand.backlogVisits).toBe(500);
    expect(demand.newReferralVisits).toBe(600); // 50/mo x 12
    expect(demand.sameDayVisits).toBe(300);
    expect(demand.noShowVisits).toBe(200);
    expect(demand.demandCeiling).toBe(500 + 600 + 300 + 200);
  });

  it("same-day and no-show are never treated as a percent of encounters - a huge encounter volume does not inflate a small count", () => {
    const bigBaseline: AttainBaseline = { providers: 400, annualEncounters: 400 * 10_000, utilizationPct: 100 };
    const scope = computeAccessScope(bigBaseline, { accessProviders: 400 });
    const demand = computeAccessDemand(bigBaseline, scope, {
      accessDemandSameDayCount: 50,
      accessDemandNoShowCount: 25,
    });
    // Regardless of the (very large) encounter volume in scope, the counts
    // entered are exactly what land on the ceiling - no hidden multiplication
    // by encountersInScope anywhere in this path.
    expect(demand.encountersInScope).toBeGreaterThan(1_000_000);
    expect(demand.sameDayVisits).toBe(50);
    expect(demand.noShowVisits).toBe(25);
    expect(demand.demandCeiling).toBe(75);
  });

  it("pick-what-applies: adding only ONE source works, every other source contributes exactly 0", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const backlogOnly = computeAccessDemand(BASELINE, scope, { accessDemandBacklog: 1_200 });
    expect(backlogOnly.newReferralVisits).toBe(0);
    expect(backlogOnly.sameDayVisits).toBe(0);
    expect(backlogOnly.noShowVisits).toBe(0);
    expect(backlogOnly.demandCeiling).toBe(1_200);

    const sameDayOnly = computeAccessDemand(BASELINE, scope, { accessDemandSameDayCount: 400 });
    expect(sameDayOnly.backlogVisits).toBe(0);
    expect(sameDayOnly.newReferralVisits).toBe(0);
    expect(sameDayOnly.noShowVisits).toBe(0);
    expect(sameDayOnly.demandCeiling).toBe(400);
  });

  it("NONE of the sources filled in produces a demand ceiling of exactly 0, never a hidden default", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, {});
    expect(demand.demandCeiling).toBe(0);
  });

  it("ALL four sources filled in sums cleanly (no double-counting, no interaction between terms)", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, {
      accessDemandBacklog: 5_000,
      accessDemandNewReferrals: 850,
      accessDemandSameDayCount: 900,
      accessDemandNoShowCount: 600,
    });
    expect(demand.demandCeiling).toBe(5_000 + 850 * 12 + 900 + 600);
  });
});

describe("D4 no-show helper - an OPTIONAL rate-based estimate, for partners who only know rates", () => {
  it("estimateNoShowRecoveryCount derives a count from (no-show rate x encounters x recovery rate), pure and directly testable", () => {
    // 24,000 encounters x 12% no-show rate = 2,880 no-show pool, x 60%
    // recovered = 1,728.
    expect(estimateNoShowRecoveryCount(24_000, 12, 60)).toBe(1_728);
    expect(estimateNoShowRecoveryCount(24_000, 0, 60)).toBe(0);
    expect(estimateNoShowRecoveryCount(24_000, 12, 0)).toBe(0);
  });

  it("computeAccessDemand exposes the helper's own estimate on the result, without it silently becoming the ceiling", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, {
      accessDemandNoShowRate: 20,
      accessDemandNoShowPct: 50,
      // accessDemandNoShowCount deliberately left unset - the partner has
      // not copied the helper's estimate into the real count field yet.
    });
    expect(demand.encountersInScope).toBe(144_000); // 40 x 3,600 x 100%
    expect(demand.noShowHelperRatePct).toBe(20);
    expect(demand.noShowHelperRecoveryPct).toBe(50);
    expect(demand.noShowHelperEstimate).toBe(Math.round(144_000 * 0.2 * 0.5));
    // The helper's estimate does NOT feed the ceiling on its own - only the
    // actual count field does, and it is still 0 here.
    expect(demand.noShowVisits).toBe(0);
    expect(demand.demandCeiling).toBe(0);
  });

  it("copying the helper's estimate into the count field is what actually counts toward the ceiling", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const withHelper = computeAccessDemand(BASELINE, scope, { accessDemandNoShowRate: 20, accessDemandNoShowPct: 50 });
    const applied = computeAccessDemand(BASELINE, scope, {
      accessDemandNoShowRate: 20,
      accessDemandNoShowPct: 50,
      accessDemandNoShowCount: withHelper.noShowHelperEstimate,
    });
    expect(applied.noShowVisits).toBe(withHelper.noShowHelperEstimate);
    expect(applied.demandCeiling).toBe(withHelper.noShowHelperEstimate);
  });

  it("the helper's rate input defaults to the ~12% benchmark when the partner hasn't set their own", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, { accessDemandNoShowPct: 60 });
    expect(demand.noShowHelperRatePct).toBe(DEFAULT_NO_SHOW_RATE_PCT);
    expect(demand.noShowHelperEstimate).toBe(Math.round(demand.encountersInScope * 0.12 * 0.6));
  });

  it("THE MATH shows the helper's own derivation only when the count in play actually came from it, not a bare count", () => {
    const helperDriven = computeAccessChain(BASELINE, {
      accessProviders: 40,
      accessDemandNoShowRate: 12,
      accessDemandNoShowPct: 60,
      accessDemandNoShowCount: Math.round(144_000 * 0.12 * 0.6),
    });
    expect(helperDriven.formulas.demand).toContain("estimated");
    expect(helperDriven.formulas.demand).toContain("no-show rate");
    expect(helperDriven.formulas.demand).toContain("recovered");

    const manualCount = computeAccessChain(BASELINE, {
      accessProviders: 40,
      accessDemandNoShowCount: 250,
    });
    expect(manualCount.formulas.demand).not.toContain("estimated");
    expect(manualCount.formulas.demand).toContain("250");
  });
});

describe("C1 fix - crossGoalShareMultiplier scales the whole chain, including the D5 payoff, before the dollar is computed", () => {
  it("a 50% cross-goal share halves the effective freed-time share, and therefore the payoff, vs an unsplit (1.0) run", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 80,
      accessDemandBacklog: 1_000_000, // demand never binds, isolate the capacity-side effect
    };
    const unsplit = computeAccessChain(BASELINE, values, 1);
    const split = computeAccessChain(BASELINE, values, 0.5);
    expect(split.capacity.effectiveSharePct).toBeCloseTo(unsplit.capacity.effectiveSharePct * 0.5, 5);
    expect(split.payoff.value).toBeLessThan(unsplit.payoff.value);
    expect(split.payoff.value).toBeCloseTo(unsplit.payoff.value * 0.5, 0);
  });

  it("computeAccessContributions (the Commit/Plan/PDF adapter) applies the identical split as computeAccessChain (the D5 live preview) - the two can never disagree", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 80,
      accessDemandBacklog: 1_000_000,
    };
    const chain = computeAccessChain(BASELINE, values, 0.5);
    const contributions = computeAccessContributions(BASELINE, values, 0.5);
    expect(contributions.totalMargin).toBe(chain.payoff.value);
  });
});

describe("I3 - exploreStateForReconciliation ties the chain to Explore's own patientAccess engine", () => {
  it("reconciles EXACTLY when the visits/week division lands on a clean decimal (no Explore-side rounding noise)", () => {
    // Chosen so Explore's own 1-decimal visits/week rounding
    // (Math.round(x*10)/10) is a no-op: hrsPerProvWk(7.5) x reinvest(1.0) /
    // visitHrs(0.25) = 30.0 exactly.
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 100,
      accessMinutesSaved: 6,
      accessVisitLength: 15,
      accessMargin: 200,
      accessDemandBacklog: 1_000_000, // capacity-bound, not demand-bound
    };
    const chain = computeAccessChain(BASELINE, values);
    expect(chain.payoff.binding).toBe("capacity");
    expect(chain.payoff.value).toBeGreaterThan(0);

    const state = exploreStateForReconciliation(BASELINE, values);
    const totalHoursSaved = Math.round(
      state.annualEncounters * (state.utilizationPercent / 100) * state.minutesSavedPerEncounter / 60,
    );
    const engineValues = computeAllDriverValues(state, totalHoursSaved);
    expect(engineValues.patientAccess).toBeGreaterThan(0);
    expect(engineValues.patientAccess).toBe(chain.payoff.value);
  });

  it("reconciles within a small tolerance on a second, more typical set of inputs (real-world visits/week rounding included)", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 50,
      accessMinutesSaved: DEFAULT_MINUTES_SAVED_PER_NOTE,
      accessVisitLength: DEFAULT_VISIT_LENGTH_MIN,
      accessMargin: 220,
      accessDemandBacklog: 1_000_000, // capacity-bound, not demand-bound
    };
    const chain = computeAccessChain(BASELINE, values);
    expect(chain.payoff.binding).toBe("capacity");

    const state = exploreStateForReconciliation(BASELINE, values);
    const totalHoursSaved = Math.round(
      state.annualEncounters * (state.utilizationPercent / 100) * state.minutesSavedPerEncounter / 60,
    );
    const engineValues = computeAllDriverValues(state, totalHoursSaved);
    expect(engineValues.patientAccess).toBeGreaterThan(0);
    // Explore rounds visits/week to one decimal before multiplying out, so
    // an exact match is not guaranteed at every input - a small percentage
    // tolerance (same convention attainRevenue.test.ts's HCC reconciliation
    // test uses) proves the two formulas agree, not two disconnected models.
    expect(Math.abs(chain.payoff.value - engineValues.patientAccess)).toBeLessThan(
      Math.max(50, engineValues.patientAccess * 0.03),
    );
  });

  it("threads the cross-goal split into the reconciled state too - a split chain reconciles to a proportionally split engine value", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 100,
      accessMinutesSaved: 6,
      accessVisitLength: 15,
      accessMargin: 200,
      accessDemandBacklog: 1_000_000,
    };
    const full = exploreStateForReconciliation(BASELINE, values, 1);
    const halved = exploreStateForReconciliation(BASELINE, values, 0.5);
    // Freed hours TOTAL (before the split) is identical in both states -
    // only the reinvest share (`capacityRealizationPercent`) differs, so
    // `totalHoursSaved` is the same for both calls, computed once here.
    const totalHoursSaved = Math.round(
      full.annualEncounters * (full.utilizationPercent / 100) * full.minutesSavedPerEncounter / 60,
    );
    const fullValue = computeAllDriverValues(full, totalHoursSaved).patientAccess;
    const halvedValue = computeAllDriverValues(halved, totalHoursSaved).patientAccess;
    expect(halvedValue).toBeLessThan(fullValue);
    expect(halvedValue).toBeCloseTo(fullValue * 0.5, 0);
  });

  it("at realization 100 (this priority's full, unattributed dollar), the reconciled figure is the SAME figure used everywhere else on the page - no second number", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 100,
      accessMinutesSaved: 6,
      accessVisitLength: 15,
      accessMargin: 200,
      accessDemandBacklog: 1_000_000,
    };
    const chain = computeAccessChain(BASELINE, values);
    const contributions = computeAccessContributions(BASELINE, values);
    const state = exploreStateForReconciliation(BASELINE, values);
    const totalHoursSaved = Math.round(
      state.annualEncounters * (state.utilizationPercent / 100) * state.minutesSavedPerEncounter / 60,
    );
    const engineValues = computeAllDriverValues(state, totalHoursSaved);
    expect(contributions.totalMargin).toBe(chain.payoff.value);
    expect(engineValues.patientAccess).toBe(chain.payoff.value);
  });
});

describe("D1-D5 sanity (doing nothing new nets exactly $0)", () => {
  it("a blank plan (no decisions moved) produces zero capacity, zero demand terms beyond backlog, and zero dollars", () => {
    const chain = computeAccessChain(BASELINE, { accessProviders: 40 });
    expect(chain.capacity.capacityVisits).toBe(0); // accessFreedShare defaults to 0 (realityStart)
    expect(chain.payoff.value).toBe(0);
  });

  it("computeAccessPayoff never exceeds MIN(capacity, demand), regardless of margin", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const payoff = computeAccessPayoff(scope, { accessMargin: 500 }, 1_000, 300);
    expect(payoff.realizedVisits).toBe(300);
    expect(payoff.binding).toBe("demand");
  });
});
