import { describe, it, expect } from "vitest";
import {
  LEVERS,
  defaultLeverValues,
  defaultBaseline,
  computeLeverContributions,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import {
  computeAccessScope,
  computeAccessCapacity,
  computeAccessDemand,
  computeAccessPayoff,
  computeAccessChain,
  computeAccessContributions,
  DEFAULT_MINUTES_SAVED_PER_NOTE,
  DEFAULT_VISIT_LENGTH_MIN,
} from "@/lib/attain/attainAccess";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const GOAL_IDS: GoalId[] = ["access", "retention", "revenue", "quality"];

// Retention/revenue/quality are independent-channel goals: sweeping ONE
// lever alone (holding the others at realityStart) still produces a
// positive marginal effect, because `computeLeverContributions`'s
// leave-one-out architecture applies. Access is a decision CHAIN
// (attainAccess.ts) - moving only one of scope/margin/capacity/demand
// alone is EXPECTED to still net ~$0 (that is rule 2, "demand is a
// ceiling"), so access is deliberately excluded from that generic sweep
// and covered by its own "ACCESS decision chain" describe block below.
const GOAL_IDS_CHANNEL: GoalId[] = ["retention", "revenue", "quality"];

// One valid (setting, goal) pair per goal, used for the generic property
// tests below (SETTING_GOAL_MATRIX in attainGoals.ts confirms each is legal).
const SETTING_FOR: Record<GoalId, AttainSetting> = {
  access: "outpatient",
  retention: "outpatient",
  revenue: "outpatient",
  quality: "nursing",
};

// A baseline per goal's test setting: outpatient (providers-based) for
// access/retention/revenue, nursing (beds-based) for quality. 40 units in
// scope either way, matching the old scope.unitCount = 40 fixture this
// replaces.
const BASELINE_FOR: Record<GoalId, AttainBaseline> = {
  access: { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 },
  retention: { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 },
  revenue: { providers: 40, annualEncounters: 40 * 2_300, utilizationPct: 100 },
  quality: { staffedBeds: 40, nursingFtes: 40, dailyCensus: 34, adoptionPct: 100 },
};

// A value for each lever that is an improvement over its realityStart (for
// "Close provider queries fast" that means FEWER days, not more - noted
// inline). Used to prove each lever's isolated marginal effect is positive.
const IMPROVED_VALUE: Record<GoalId, Record<string, number | string[]>> = {
  // Access is a decision chain, not independent channels - this fixture
  // is unused by the generic "moving any single lever" sweep (see
  // GOAL_IDS_CHANNEL above) but kept here, with every decision in the
  // chain set to a real value, so the type stays a total Record<GoalId,...>
  // and any future generic catalog test that reads it sees a
  // realistic, fully-decided access plan rather than a partial one.
  access: {
    accessProviders: 40,
    accessMargin: 200,
    accessFreedShare: 50,
    accessDemandBacklog: 500,
    accessDemandSameDayPct: 5,
    accessDemandNoShowPct: 5,
    accessDemandNewReferrals: 50,
  },
  retention: {
    retentionLines: ["Primary Care", "Cardiology"],
    retentionFloor: 40,
    retentionBackfill: 2,
    retentionSustain: 6,
  },
  revenue: {
    revenueLines: ["Cardiology", "Endocrinology"],
    revenueUptake: 70,
    revenueQueryDays: 5, // fewer days = faster = better, even though numerically lower
    revenueProtect: 60,
  },
  quality: {
    qualityLines: ["Med-Surg", "ICU"],
    qualityRealTime: 85,
    qualityResponse: 2,
    qualityBundle: 60,
  },
};

describe("LEVERS catalog", () => {
  it("every GoalId has at least 4 levers", () => {
    for (const goal of GOAL_IDS) {
      expect(LEVERS[goal].length).toBeGreaterThanOrEqual(4);
    }
  });

  it("no lever label or help string contains an em dash", () => {
    for (const goal of GOAL_IDS) {
      for (const lever of LEVERS[goal]) {
        expect(lever.label).not.toContain("—");
        expect(lever.help).not.toContain("—");
      }
    }
  });

  it("every lever has a unique id within its goal", () => {
    for (const goal of GOAL_IDS) {
      const ids = LEVERS[goal].map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("defaultLeverValues", () => {
  it("returns realityStart for every lever of every goal", () => {
    for (const goal of GOAL_IDS) {
      const values = defaultLeverValues(goal);
      for (const lever of LEVERS[goal]) {
        expect(values[lever.id]).toEqual(lever.realityStart);
      }
    }
  });
});

describe("defaultBaseline", () => {
  it("returns a provider-based baseline for outpatient/ed/inpatient", () => {
    for (const setting of ["outpatient", "ed", "inpatient"] as AttainSetting[]) {
      const baseline = defaultBaseline(setting);
      expect(baseline.providers).toBeGreaterThan(0);
      expect(baseline.annualEncounters).toBeGreaterThan(0);
      expect(baseline.utilizationPct).toBeGreaterThan(0);
    }
  });

  it("returns a bed/FTE-based baseline for nursing", () => {
    const baseline = defaultBaseline("nursing");
    expect(baseline.staffedBeds).toBeGreaterThan(0);
    expect(baseline.nursingFtes).toBeGreaterThan(0);
    expect(baseline.dailyCensus).toBeGreaterThan(0);
    expect(baseline.adoptionPct).toBeGreaterThan(0);
  });
});

describe("computeLeverContributions", () => {
  it("doing nothing new (all levers at realityStart) adds ~0 margin", () => {
    for (const goal of GOAL_IDS) {
      const setting = SETTING_FOR[goal];
      const values = defaultLeverValues(goal);
      const result = computeLeverContributions(goal, setting, BASELINE_FOR[goal], values);
      expect(Math.abs(result.totalMargin)).toBeLessThan(1_000);
    }
  });

  it("moving any single lever toward its goal increases totalMargin and that lever's own marginal contribution", () => {
    // Excludes access - see GOAL_IDS_CHANNEL's comment. Access's analog of
    // this property ("moving only one decision in the chain alone nets
    // ~$0") is covered explicitly in the "ACCESS decision chain" block
    // below, since for access that is a REQUIRED property, not a bug.
    for (const goal of GOAL_IDS_CHANNEL) {
      const setting = SETTING_FOR[goal];
      for (const lever of LEVERS[goal]) {
        const values: LeverValues = defaultLeverValues(goal);
        values[lever.id] = IMPROVED_VALUE[goal][lever.id];
        const result = computeLeverContributions(goal, setting, BASELINE_FOR[goal], values);
        expect(result.totalMargin).toBeGreaterThan(0);
        const contribution = result.perLever.find((l) => l.id === lever.id);
        expect(contribution).toBeDefined();
        expect(contribution!.marginalMargin).toBeGreaterThan(0);
        // Every moved lever carries a live, non-empty derivation string so
        // the UI always has something honest to show under the decision.
        expect(contribution!.formula.length).toBeGreaterThan(0);
        expect(contribution!.formula).not.toContain("—");
      }
    }
  });

  it("pctOfTotal across levers is well-formed (no divide-by-zero blowup)", () => {
    for (const goal of GOAL_IDS) {
      const setting = SETTING_FOR[goal];
      const values = defaultLeverValues(goal);
      const result = computeLeverContributions(goal, setting, BASELINE_FOR[goal], values);
      for (const l of result.perLever) {
        expect(Number.isFinite(l.pctOfTotal)).toBe(true);
      }
    }
  });

  it("a plausible outpatient/access typical plan (scope + margin + capacity + demand all decided) lands totalMargin in a $400K-$1M band", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 50,
      // Minutes saved is explicitly set here rather than left to the D3
      // default: this test's $400K-$1M band was calibrated against a
      // "typical" 12 min/note assumption, a separate concern from what
      // DEFAULT_MINUTES_SAVED_PER_NOTE (now 2, the conservative default -
      // see the dedicated default-value test above) should be.
      accessMinutesSaved: 12,
      accessDemandBacklog: 500,
      accessDemandSameDayPct: 5,
      accessDemandNoShowPct: 5,
      accessDemandNewReferrals: 50,
    };
    const result = computeLeverContributions("access", "outpatient", BASELINE_FOR.access, values);
    expect(result.totalMargin).toBeGreaterThanOrEqual(400_000);
    expect(result.totalMargin).toBeLessThanOrEqual(1_000_000);
  });

  it("a bigger providers baseline yields a proportionally bigger contribution (reads the partner's own baseline, not a fixed assumption)", () => {
    // Enterprise scope + demand set far above capacity so capacity is the
    // binding constraint at both baselines - isolates the "does the engine
    // read the baseline" property from the demand ceiling.
    const values: LeverValues = { accessEnterprise: 1, accessFreedShare: 40, accessDemandSameDayPct: 100 };
    const small: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 };
    const big: AttainBaseline = { providers: 80, annualEncounters: 80 * 600, utilizationPct: 100 };

    const smallResult = computeLeverContributions("access", "outpatient", small, values);
    const bigResult = computeLeverContributions("access", "outpatient", big, values);

    expect(smallResult.totalMargin).toBeGreaterThan(0);
    // Doubling providers (and encounters, at the same per-provider rate)
    // should roughly double the dollar figure, proving the engine reads
    // the baseline rather than an assumed constant provider count.
    expect(bigResult.totalMargin).toBeGreaterThan(smallResult.totalMargin * 1.5);
    expect(bigResult.totalMargin).toBeLessThan(smallResult.totalMargin * 2.5);
  });

  it("a lower utilizationPct in the baseline yields a smaller contribution than 100% utilization, all else equal", () => {
    const values: LeverValues = { accessEnterprise: 1, accessFreedShare: 40, accessDemandSameDayPct: 100 };
    const fullUtil: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 };
    const halfUtil: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 50 };

    const fullResult = computeLeverContributions("access", "outpatient", fullUtil, values);
    const halfResult = computeLeverContributions("access", "outpatient", halfUtil, values);

    expect(halfResult.totalMargin).toBeLessThan(fullResult.totalMargin);
  });
});

describe("ACCESS decision chain (attainAccess.ts)", () => {
  const baseline: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 };

  it("D1: providers in scope is capped to the Starting-point baseline, and Enterprise resolves to every provider", () => {
    const capped = computeAccessScope(baseline, { accessProviders: 999 });
    expect(capped.providersInScope).toBe(40);

    const enterprise = computeAccessScope(baseline, { accessEnterprise: 1, accessProviders: 5 });
    expect(enterprise.providersInScope).toBe(40);

    const partial = computeAccessScope(baseline, { accessProviders: 12 });
    expect(partial.providersInScope).toBe(12);
  });

  it("D3: capacity scales linearly with providers in scope", () => {
    const half = computeAccessCapacity(baseline, { providersInScope: 20, lines: [], enterprise: false }, 12, 50);
    const full = computeAccessCapacity(baseline, { providersInScope: 40, lines: [], enterprise: false }, 12, 50);
    expect(half.capacityVisits).toBeGreaterThan(0);
    expect(full.capacityVisits).toBeCloseTo(half.capacityVisits * 2, 1);
  });

  it("D3: capacity scales linearly with the freed-time share directed to access", () => {
    const scope = { providersInScope: 40, lines: [], enterprise: false };
    const quarterShare = computeAccessCapacity(baseline, scope, 12, 25);
    const halfShare = computeAccessCapacity(baseline, scope, 12, 50);
    expect(quarterShare.capacityVisits).toBeGreaterThan(0);
    expect(halfShare.capacityVisits).toBeCloseTo(quarterShare.capacityVisits * 2, 1);
  });

  it("D3: zero freed-time share means zero capacity, even with providers in scope", () => {
    const capacity = computeAccessCapacity(baseline, { providersInScope: 40, lines: [], enterprise: false }, 12, 0);
    expect(capacity.capacityVisits).toBe(0);
  });

  it("D3: minutes saved per note default is 2 (conservative, matches Abridge's 2-4 min/encounter evidence)", () => {
    expect(DEFAULT_MINUTES_SAVED_PER_NOTE).toBe(2);
  });

  it("D3: visit length defaults to ~20 minutes when not overridden", () => {
    expect(DEFAULT_VISIT_LENGTH_MIN).toBe(20);
  });

  it("D3: capacity is a real, editable input - a shorter visit length converts the same freed hours into more visits", () => {
    const scope = { providersInScope: 40, lines: [], enterprise: false };
    const longVisit = computeAccessCapacity(baseline, scope, 12, 50, 30);
    const defaultVisit = computeAccessCapacity(baseline, scope, 12, 50, 20);
    const shortVisit = computeAccessCapacity(baseline, scope, 12, 50, 15);
    expect(shortVisit.capacityVisits).toBeGreaterThan(defaultVisit.capacityVisits);
    expect(defaultVisit.capacityVisits).toBeGreaterThan(longVisit.capacityVisits);
    // Capacity is exactly inverse to visit length, at a fixed freed-hours
    // input: halving the visit length must exactly double the visits it
    // buys, since capacityVisits = freedHoursToAccess / (visitLength/60).
    expect(shortVisit.capacityVisits).toBeCloseTo(longVisit.capacityVisits * 2, 0);
  });

  it("D3: omitting visitLengthMinutes falls back to the ~20 minute default, unchanged from before this was editable", () => {
    const scope = { providersInScope: 40, lines: [], enterprise: false };
    const noArg = computeAccessCapacity(baseline, scope, 12, 50);
    const explicitDefault = computeAccessCapacity(baseline, scope, 12, 50, DEFAULT_VISIT_LENGTH_MIN);
    expect(noArg.capacityVisits).toBeCloseTo(explicitDefault.capacityVisits, 5);
  });

  it("D3 (whole chain): accessVisitLength threads from the flat LeverValues bag into capacity - a shorter visit length yields more realized capacity from the identical freed hours", () => {
    const baseValues: LeverValues = { accessProviders: 40, accessFreedShare: 50 };
    const defaultChain = computeAccessChain(baseline, baseValues);
    const shortChain = computeAccessChain(baseline, { ...baseValues, accessVisitLength: 10 });
    expect(shortChain.capacity.capacityVisits).toBeGreaterThan(defaultChain.capacity.capacityVisits);
    expect(shortChain.capacity.capacityVisits).toBeCloseTo(defaultChain.capacity.capacityVisits * 2, 0);
  });

  it("D4: demand ceiling is the sum of every demand source", () => {
    const scope = { providersInScope: 40, lines: [], enterprise: false };
    const demand = computeAccessDemand(baseline, scope, {
      accessDemandBacklog: 500,
      accessDemandSameDayPct: 5,
      accessDemandNoShowPct: 5,
      accessDemandNewReferrals: 50,
    });
    expect(demand.backlogVisits).toBe(500);
    expect(demand.sameDayVisits).toBe(1_200); // 40*600*5%
    expect(demand.noShowVisits).toBe(1_200);
    expect(demand.newReferralVisits).toBe(600); // 50/mo * 12
    expect(demand.demandCeiling).toBe(500 + 1_200 + 1_200 + 600);
  });

  it("D5: realized visits never exceed the demand ceiling, even when capacity is much larger (the MIN holds)", () => {
    const scope = { providersInScope: 40, lines: [], enterprise: false };
    const capacity = computeAccessCapacity(baseline, scope, 12, 100); // max possible capacity
    const demand = computeAccessDemand(baseline, scope, { accessDemandBacklog: 10 }); // a tiny ceiling
    const payoff = computeAccessPayoff(scope, {}, capacity.capacityVisits, demand.demandCeiling);
    expect(capacity.capacityVisits).toBeGreaterThan(demand.demandCeiling);
    expect(payoff.realizedVisits).toBe(demand.demandCeiling);
    expect(payoff.realizedVisits).toBeLessThanOrEqual(capacity.capacityVisits);
    expect(payoff.binding).toBe("demand");
  });

  it("D5: zero demand realizes zero value, even with a fully committed capacity decision", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 100,
      // No accessDemand* fields set at all - the ceiling is 0.
    };
    const chain = computeAccessChain(baseline, values);
    expect(chain.capacity.capacityVisits).toBeGreaterThan(0);
    expect(chain.demand.demandCeiling).toBe(0);
    expect(chain.payoff.realizedVisits).toBe(0);
    expect(chain.payoff.value).toBe(0);
    expect(chain.payoff.binding).toBe("none");
  });

  it("D5: value = realized visits x margin per visit (blended case)", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessMargin: 220,
      accessFreedShare: 50,
      accessDemandBacklog: 100,
    };
    const chain = computeAccessChain(baseline, values);
    expect(chain.payoff.realizedVisits).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(Math.round(chain.payoff.realizedVisits * 220));
  });

  it("D5: with multiple lines in scope, value is the sum of each line's own visits x its own margin (margin is per line, not blended)", () => {
    const values: LeverValues = {
      accessLines: ["Cardiology", "Primary Care"],
      accessProviders: 40,
      accessFreedShare: 50,
      accessDemandBacklog: 10_000, // demand far above capacity, so capacity binds and both lines get real volume
      "accessMarginLine__Cardiology": 300,
      "accessMarginLine__Primary Care": 100,
    };
    const chain = computeAccessChain(baseline, values);
    expect(chain.payoff.perLine).toHaveLength(2);
    const cardio = chain.payoff.perLine.find((l) => l.line === "Cardiology")!;
    const primary = chain.payoff.perLine.find((l) => l.line === "Primary Care")!;
    expect(cardio.marginPerVisit).toBe(300);
    expect(primary.marginPerVisit).toBe(100);
    // Same visit volume per line (split evenly), different margin, so
    // Cardiology's dollar value must be exactly 3x Primary Care's.
    expect(cardio.visits).toBeCloseTo(primary.visits, 5);
    expect(cardio.value).toBeCloseTo(primary.value * 3, -1);
    expect(chain.payoff.value).toBe(cardio.value + primary.value);
  });

  it("no single decision alone (scope, or capacity, or demand) realizes any value - only the full chain does", () => {
    const scopeOnly = computeAccessChain(baseline, { accessProviders: 40 });
    expect(scopeOnly.payoff.value).toBe(0);

    const capacityOnly = computeAccessChain(baseline, { accessProviders: 40, accessFreedShare: 80 });
    expect(capacityOnly.payoff.value).toBe(0); // no demand set - still 0, capacity alone is not a sale

    const demandOnly = computeAccessChain(baseline, { accessDemandBacklog: 5_000 });
    expect(demandOnly.payoff.value).toBe(0); // no providers in scope - no capacity to realize it with

    const fullChain = computeAccessChain(baseline, {
      accessProviders: 40,
      accessFreedShare: 80,
      accessDemandBacklog: 5_000,
    });
    expect(fullChain.payoff.value).toBeGreaterThan(0);
  });

  it("computeAccessContributions adapts the chain into the LeverContributionsResult shape Commit/Plan expect, attributing the whole dollar to exactly one row (the binding constraint)", () => {
    const values: LeverValues = {
      accessProviders: 40,
      accessFreedShare: 50,
      accessDemandBacklog: 500,
      accessDemandSameDayPct: 5,
      accessDemandNoShowPct: 5,
      accessDemandNewReferrals: 50,
    };
    const result = computeAccessContributions(baseline, values);
    expect(result.totalMargin).toBeGreaterThan(0);
    expect(result.perLever).toHaveLength(7);
    const nonZero = result.perLever.filter((l) => l.marginalMargin > 0);
    expect(nonZero).toHaveLength(1);
    expect(nonZero[0].marginalMargin).toBe(result.totalMargin);
    const sumPct = result.perLever.reduce((s, l) => s + l.pctOfTotal, 0);
    expect(sumPct).toBeCloseTo(1, 5);
  });
});

describe("computeMultiGoalContributions", () => {
  it("combining two independent goals (retention + revenue, no access) equals the exact sum of their singles", () => {
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      retention: { ...defaultLeverValues("retention"), ...IMPROVED_VALUE.retention },
      revenue: { ...defaultLeverValues("revenue"), ...IMPROVED_VALUE.revenue },
    };
    const baseline = BASELINE_FOR.revenue;
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const revenueAlone = computeLeverContributions("revenue", "outpatient", baseline, valuesByGoal.revenue!);

    const combined = computeMultiGoalContributions(["retention", "revenue"], "outpatient", baseline, valuesByGoal);

    expect(combined.combinedMargin).toBeCloseTo(retentionAlone.totalMargin + revenueAlone.totalMargin, 5);
    expect(combined.combinedCount).toBe(retentionAlone.totalCount + revenueAlone.totalCount);
    // Neither goal's per-lever figures were touched, since neither owns the
    // contended freed-time lever without the other goal being access.
    expect(combined.byGoal.retention?.totalMargin).toBeCloseTo(retentionAlone.totalMargin, 5);
    expect(combined.byGoal.revenue?.totalMargin).toBeCloseTo(revenueAlone.totalMargin, 5);
  });

  // Access's fixture below deliberately sets demand (via a large monthly
  // new-referral count) far above whatever capacity the scaled freed-time
  // share can produce, so capacity is always the binding constraint and
  // scales linearly and exactly with the cross-goal share multiplier - the
  // same clean property the old accessReinvest-lever tests checked, now
  // proven through the whole chain instead of a single independent lever.
  const accessFullChainValues = (): LeverValues => ({
    accessProviders: 40,
    accessFreedShare: 60,
    accessDemandNewReferrals: 1_000, // 12,000 visits/yr ceiling, never the binding constraint here
  });

  it("access + retention with a 50/50 split never double-counts the freed-time hour", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const accessAlone = computeAccessContributions(baseline, valuesByGoal.access!); // multiplier = 1 (full credit)
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const retentionFreedAlone = retentionAlone.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 50);
    const accessScaled = combined.byGoal.access?.totalMargin ?? 0;
    const retentionScaled = combined.byGoal.retention?.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin ?? 0;

    // The split hour, however divided, never exceeds what each side would
    // have gotten alone at full credit - it is shared, not cloned.
    expect(accessScaled + retentionScaled).toBeLessThanOrEqual(accessAlone.totalMargin + retentionFreedAlone + 1e-6);
    expect(accessScaled).toBeLessThanOrEqual(accessAlone.totalMargin + 1e-6);
    expect(retentionScaled).toBeLessThanOrEqual(retentionFreedAlone + 1e-6);
    // At an even 50/50 split, capacity - and therefore the realized dollar,
    // since capacity is the binding constraint in this fixture - is
    // exactly halved, not approximately.
    expect(accessScaled).toBeCloseTo(accessAlone.totalMargin * 0.5, -1);
  });

  it("split at 100 gives access the full freed-time share and retention zero", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const accessAlone = computeAccessContributions(baseline, valuesByGoal.access!);

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 100);
    const accessScaled = combined.byGoal.access?.totalMargin ?? 0;
    const retentionScaled = combined.byGoal.retention?.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin ?? 0;

    expect(accessScaled).toBeCloseTo(accessAlone.totalMargin, 5);
    expect(retentionScaled).toBe(0);
  });

  it("split at 0 gives retention the full freed-time share and access zero (capacity, and every dollar downstream of it, collapses to 0)", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const retentionFreedAlone = retentionAlone.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 0);
    const accessScaled = combined.byGoal.access?.totalMargin ?? 0;
    const retentionScaled = combined.byGoal.retention?.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin ?? 0;

    expect(accessScaled).toBe(0);
    expect(retentionScaled).toBeCloseTo(retentionFreedAlone, 5);
  });

  it("combinedMargin with access + retention is strictly less than the naive (double-counted) sum of both alone, when the shared hour is contended", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const accessAlone = computeAccessContributions(baseline, valuesByGoal.access!);
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const naiveDoubleCounted = accessAlone.totalMargin + retentionAlone.totalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 50);
    expect(combined.combinedMargin).toBeLessThan(naiveDoubleCounted);
  });
});
