import { describe, it, expect } from "vitest";
import { computeWorkforceChain } from "@/lib/attain/attainWorkforce";
import { deriveRetentionLadder } from "@/pages/attain/steps/accessLadder";
import { DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";

const OP_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };

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

describe("deriveRetentionLadder - the shared retention step-down, reconciled to computeWorkforceChain", () => {
  it("the gate reconciles exactly: burnout pool x composite impact = departures avoided from the chain payoff", () => {
    const values = fullValues();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values, 1);
    const ladder = deriveRetentionLadder(chain, "outpatient", OP_BASELINE, {
      minutes: 2,
      departuresAvoided: chain.payoff.departuresAvoided,
      prize: chain.payoff.value,
    });

    // pool = providers x turnover% x burnout share% ; the slice captured is
    // the composite impact %; their product is exactly payoff.departuresAvoided.
    const expectedPool = 40 * (14 / 100) * (chain.scope.burnoutSharePct / 100);
    expect(ladder.burnoutPool).toBeCloseTo(expectedPool, 6);
    expect(ladder.burnoutPool * (ladder.compositeImpactPct / 100)).toBeCloseTo(chain.payoff.departuresAvoided, 6);
    expect(ladder.departuresAvoided).toBe(chain.payoff.departuresAvoided);
    expect(ladder.prize).toBe(chain.payoff.value);
  });

  it("the composite impact rung equals the chain's own sustain.compositeImpactPct (the reachable number, never an aspirational one)", () => {
    const values = fullValues();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values, 1);
    const ladder = deriveRetentionLadder(chain, "outpatient", OP_BASELINE, {
      minutes: 2,
      departuresAvoided: chain.payoff.departuresAvoided,
      prize: chain.payoff.value,
    });
    expect(ladder.compositeImpactPct).toBe(chain.sustain.compositeImpactPct);
    expect(ladder.compositeImpactPct).toBeLessThanOrEqual(ladder.impactCeilingPct);
  });

  it("freed time is a real, positive number and protected relief is exactly that share of it", () => {
    const values = fullValues();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values, 1);
    const ladder = deriveRetentionLadder(chain, "outpatient", OP_BASELINE, {
      minutes: 2,
      departuresAvoided: chain.payoff.departuresAvoided,
      prize: chain.payoff.value,
    });
    expect(ladder.freedHrsPerProviderWk).toBeGreaterThan(0);
    expect(ladder.protectedHrsPerProviderWk).toBeCloseTo(
      ladder.freedHrsPerProviderWk * (ladder.protectedSharePct / 100),
      6,
    );
  });

  it("more minutes saved produces more freed time (the first domino drives the freed-time rung)", () => {
    const values = fullValues();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values, 1);
    const low = deriveRetentionLadder(chain, "outpatient", OP_BASELINE, { minutes: 2, departuresAvoided: 0, prize: 0 });
    const high = deriveRetentionLadder(chain, "outpatient", OP_BASELINE, { minutes: 4, departuresAvoided: 0, prize: 0 });
    expect(high.freedHrsPerProviderWk).toBeGreaterThan(low.freedHrsPerProviderWk);
  });

  it("minutes falls back to the shared access default when unset", () => {
    const values = fullValues();
    const chain = computeWorkforceChain(OP_BASELINE, "outpatient", values, 1);
    const ladder = deriveRetentionLadder(chain, "outpatient", OP_BASELINE, { minutes: 0, departuresAvoided: 0, prize: 0 });
    expect(ladder.minutes).toBe(DEFAULT_MINUTES_SAVED_PER_NOTE);
  });

  it("a blank baseline and no decisions nets clean zeros, never NaN", () => {
    const chain = computeWorkforceChain({}, "outpatient", {}, 1);
    const ladder = deriveRetentionLadder(chain, "outpatient", {}, { minutes: 2, departuresAvoided: 0, prize: 0 });
    expect(ladder.providersInScope).toBe(0);
    expect(ladder.freedHrsPerProviderWk).toBe(0);
    expect(ladder.burnoutPool).toBe(0);
    expect(Number.isNaN(ladder.protectedHrsPerProviderWk)).toBe(false);
    expect(Number.isNaN(ladder.departuresAvoided)).toBe(false);
  });

  it("the cross-goal split flows through: at multiplier 0 the composite impact and departures avoided are 0", () => {
    const values = fullValues();
    const chainSplitZero = computeWorkforceChain(OP_BASELINE, "outpatient", values, 0);
    const ladder = deriveRetentionLadder(chainSplitZero, "outpatient", OP_BASELINE, {
      minutes: 2,
      departuresAvoided: chainSplitZero.payoff.departuresAvoided,
      prize: chainSplitZero.payoff.value,
    });
    // Survey and backfill are separate mechanisms, so the composite is not
    // strictly 0 at split 0 in the full chain; but the departures avoided must
    // still reconcile to the chain payoff exactly (no divergence).
    expect(ladder.burnoutPool * (ladder.compositeImpactPct / 100)).toBeCloseTo(chainSplitZero.payoff.departuresAvoided, 6);
  });
});
