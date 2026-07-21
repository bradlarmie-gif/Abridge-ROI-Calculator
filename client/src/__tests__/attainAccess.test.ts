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

describe("C2 fix - no-show recovery is a share of the no-show POOL, not of every encounter", () => {
  it("entering a 60% recovery rate recovers ~60% of the no-show pool, not 60% of all encounters", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, {
      accessDemandNoShowPct: 60,
      // no accessDemandNoShowRate set - defaults to DEFAULT_NO_SHOW_RATE_PCT (12%)
    });
    // 40 providers x 3,600 encounters/provider x 100% utilization = 144,000
    // encounters in scope. A partner reading the tooltip and entering "60%"
    // means "recover 60% of our no-shows" - at a ~12% typical no-show rate,
    // that pool is 17,280, so recovery should land near 10,368, nowhere
    // near 60% of the full 144,000-encounter volume (86,400) the old,
    // un-pooled model would have booked - an ~8.3x overstatement.
    expect(demand.encountersInScope).toBe(144_000);
    expect(demand.noShowRatePct).toBe(DEFAULT_NO_SHOW_RATE_PCT);
    expect(demand.noShowPool).toBeCloseTo(144_000 * 0.12, 3);
    expect(demand.noShowVisits).toBe(Math.round(demand.noShowPool * 0.6));
    expect(demand.noShowVisits).toBeLessThan(demand.encountersInScope * 0.6);
    // The recovered count should be a small fraction of total encounters,
    // consistent with "recovering most of a small no-show pool", not "most
    // of the whole schedule".
    expect(demand.noShowVisits / demand.encountersInScope).toBeLessThan(0.1);
  });

  it("a higher typical no-show rate (accessDemandNoShowRate) grows the pool, and therefore the recovered count, at a fixed recovery rate", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const lowRate = computeAccessDemand(BASELINE, scope, { accessDemandNoShowRate: 5, accessDemandNoShowPct: 50 });
    const highRate = computeAccessDemand(BASELINE, scope, { accessDemandNoShowRate: 25, accessDemandNoShowPct: 50 });
    expect(highRate.noShowPool).toBeGreaterThan(lowRate.noShowPool);
    expect(highRate.noShowVisits).toBeGreaterThan(lowRate.noShowVisits);
    // Exactly 5x the pool (25% / 5%) at the identical recovery rate.
    expect(highRate.noShowPool).toBeCloseTo(lowRate.noShowPool * 5, 3);
  });

  it("zero recovery rate recovers nothing, even with a large no-show pool", () => {
    const scope = computeAccessScope(BASELINE, { accessProviders: 40 });
    const demand = computeAccessDemand(BASELINE, scope, { accessDemandNoShowRate: 30, accessDemandNoShowPct: 0 });
    expect(demand.noShowPool).toBeGreaterThan(0);
    expect(demand.noShowVisits).toBe(0);
  });

  it("THE MATH shows the two-step derivation (rate -> pool -> recovered), not a single bare percent", () => {
    const chain = computeAccessChain(BASELINE, {
      accessProviders: 40,
      accessDemandNoShowRate: 12,
      accessDemandNoShowPct: 60,
    });
    expect(chain.formulas.demand).toContain("no-show rate");
    expect(chain.formulas.demand).toContain("no-show pool");
    expect(chain.formulas.demand).toContain("% recovered");
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
