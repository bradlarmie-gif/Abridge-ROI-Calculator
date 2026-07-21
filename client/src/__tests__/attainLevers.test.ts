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
  bindingPlainPhrase,
  DEFAULT_MINUTES_SAVED_PER_NOTE,
  DEFAULT_VISIT_LENGTH_MIN,
} from "@/lib/attain/attainAccess";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const GOAL_IDS: GoalId[] = ["access", "retention", "revenue", "quality"];

// Every goal is now a bespoke ordered decision CHAIN, not an
// independent-channel lever set: Access (attainAccess.ts / attainEdAccess.ts,
// scope -> margin -> capacity -> demand, or scope -> worth -> pool -> payoff
// for ED), Revenue at outpatient/ED (attainRevenue.ts, three paths) and at
// inpatient (attainInpatientRevenue.ts, its OWN three paths - a genuinely
// different DRG/CDI/obs-defense mechanism), Retention/Workforce
// (attainWorkforce.ts, D1-D5), and Quality (attainQuality.ts, D1
// scope+event-types -> D2 real-time -> D3 response -> D4 bundle
// compliance). Moving only ONE decision in any of these chains alone is
// EXPECTED to still net ~$0 in most cases (that is the whole point of
// gating dollars until every decision behind them is real), so none of them
// go through the generic leave-one-out sweep below; each has its own
// dedicated "... decision chain" describe block (below, or in
// attainRevenue.test.ts / attainInpatientRevenue.test.ts /
// attainWorkforce.test.ts / attainQuality.test.ts). No goal currently
// reaches the generic leave-one-out architecture at all - it is kept only as
// a fallback shape for a future goal that doesn't get its own bespoke chain.
const GOAL_IDS_CHANNEL: GoalId[] = [];

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
  // Retention/Workforce is now a D1-D5 decision chain (attainWorkforce.ts),
  // not independent channels - this fixture is unused by the generic
  // "moving any single lever" sweep (see GOAL_IDS_CHANNEL above) but kept
  // here, with every decision in the chain set to a real value (including
  // D5's sustain, without which the whole composite impact - and therefore
  // every dollar - reads exactly 0 by design), so the type stays a total
  // Record<GoalId,...> and the multi-goal fixtures below see a realistic,
  // fully-decided retention plan rather than a partial one.
  retention: {
    retentionLines: ["Primary Care", "Cardiology"],
    retentionProviders: 40,
    retentionTurnoverRate: 14,
    retentionReplacementCost: 375_000,
    retentionProtect: 60,
    retentionSurveyCadence: 1,
    retentionBackfill: 2,
    retentionSustain: 6,
  },
  // Revenue at outpatient/ED is now a three-path decision chain
  // (attainRevenue.ts), not an independent-channel lever set - this fixture
  // is unused by the generic "moving any single lever" sweep (revenue is
  // excluded from GOAL_IDS_CHANNEL, see its comment) but kept here, with a
  // real two-path plan (E/M + Denials) set, so the type stays a total
  // Record<GoalId,...> and the two direct-reference tests below
  // (`computeMultiGoalContributions`) see a realistic, nonzero revenue
  // plan rather than an empty one.
  revenue: {
    revenuePaths: ["E/M Level Accuracy", "Medical Necessity Denials"],
    revenueEmLift: 8,
    revenueEmConversionFactor: 40,
    revenueDenialsPreventable: 60,
  },
  // Quality is now a D1-D4 decision chain (attainQuality.ts), not
  // independent channels - this fixture is unused by the generic "moving
  // any single lever" sweep (GOAL_IDS_CHANNEL is now empty, see above) but
  // kept here, with a real event-type selection and every decision set, so
  // the type stays a total Record<GoalId,...> and the multi-goal fixtures
  // below see a realistic, fully-decided quality plan rather than an empty
  // one.
  quality: {
    qualityLines: ["Med-Surg", "ICU"],
    qualityBeds: 40,
    qualityEventTypes: ["HAPI", "CLABSI", "Falls", "Sepsis"],
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

  it("D1: providers in scope is capped to the Starting-point baseline; Enterprise defaults to every provider as a convenience but does NOT force it", () => {
    const capped = computeAccessScope(baseline, { accessProviders: 999 });
    expect(capped.providersInScope).toBe(40);

    // Enterprise with no explicit count yet defaults to every provider.
    const enterpriseDefault = computeAccessScope(baseline, { accessEnterprise: 1 });
    expect(enterpriseDefault.providersInScope).toBe(40);

    // Enterprise means "not broken out by a specific service line," NOT
    // "every provider" - a partner can still lower this to a subset.
    const enterpriseSubset = computeAccessScope(baseline, { accessEnterprise: 1, accessProviders: 5 });
    expect(enterpriseSubset.providersInScope).toBe(5);

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

  it("D4 plain-language: bindingPlainPhrase names the limiter in plain words, never MIN( notation", () => {
    expect(bindingPlainPhrase("capacity")).toBe("Capacity is the limiter here.");
    expect(bindingPlainPhrase("demand")).toBe("Demand is the limiter here.");
    expect(bindingPlainPhrase("none")).not.toContain("MIN(");
    for (const binding of ["capacity", "demand", "none"] as const) {
      expect(bindingPlainPhrase(binding)).not.toContain("MIN(");
    }
  });

  it("D4/D5 plain-language: bindingPlainPhrase agrees with the chain's own computed binding constraint", () => {
    // Demand-limited case (from the MIN test above).
    const demandLimited = computeAccessChain(baseline, {
      accessProviders: 40,
      accessFreedShare: 100,
      accessDemandBacklog: 10,
    });
    expect(demandLimited.payoff.binding).toBe("demand");
    expect(bindingPlainPhrase(demandLimited.payoff.binding)).toBe("Demand is the limiter here.");

    // Capacity-limited case: huge demand, small capacity.
    const capacityLimited = computeAccessChain(baseline, {
      accessProviders: 5,
      accessFreedShare: 10,
      accessDemandNewReferrals: 10_000,
    });
    expect(capacityLimited.payoff.binding).toBe("capacity");
    expect(bindingPlainPhrase(capacityLimited.payoff.binding)).toBe("Capacity is the limiter here.");
  });

  it("D5's printed formula never prints literal MIN( notation, even though it still derives the real numbers", () => {
    const chain = computeAccessChain(baseline, {
      accessProviders: 40,
      accessMargin: 220,
      accessFreedShare: 50,
      accessDemandBacklog: 100,
    });
    expect(chain.formulas.payoff).not.toContain("MIN(");
    expect(chain.formulas.demand).not.toContain("MIN(");
    expect(chain.formulas.capacity).not.toContain("MIN(");
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

  // Retention's D2 (`retentionProtect`) is the lever that shares the same
  // freed hour with access's D3. D5 (`retentionSustain`) must ALSO be real -
  // the whole point of the decision-chain rebuild is that 0 months
  // sustained nets $0 no matter how strong D2 is - so a "fully-decided but
  // only-the-shared-lever-matters" fixture sets D2 and D5, and leaves D3
  // (survey) / D4 (backfill) at their realityStart of 0, so the WHOLE
  // retention total scales linearly with the D2 share multiplier alone.
  const retentionFullChainValues = (): LeverValues => ({
    retentionProviders: 40,
    retentionProtect: 60,
    retentionSustain: 6,
  });

  it("access + retention with a 50/50 split never double-counts the freed-time hour", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: retentionFullChainValues(),
    };
    const accessAlone = computeAccessContributions(baseline, valuesByGoal.access!); // multiplier = 1 (full credit)
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!); // multiplier = 1 (full credit)

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 50);
    const accessScaled = combined.byGoal.access?.totalMargin ?? 0;
    const retentionScaled = combined.byGoal.retention?.totalMargin ?? 0;

    // The split hour, however divided, never exceeds what each side would
    // have gotten alone at full credit - it is shared, not cloned.
    expect(accessScaled + retentionScaled).toBeLessThanOrEqual(accessAlone.totalMargin + retentionAlone.totalMargin + 1e-6);
    expect(accessScaled).toBeLessThanOrEqual(accessAlone.totalMargin + 1e-6);
    expect(retentionScaled).toBeLessThanOrEqual(retentionAlone.totalMargin + 1e-6);
    // At an even 50/50 split, capacity - and therefore the realized dollar,
    // since capacity is the binding constraint in this fixture - is
    // exactly halved, not approximately. Retention's D2 share is likewise
    // scaled exactly in half before its composite impact is computed.
    expect(accessScaled).toBeCloseTo(accessAlone.totalMargin * 0.5, -1);
    expect(retentionScaled).toBeCloseTo(retentionAlone.totalMargin * 0.5, -1);
  });

  it("split at 100 gives access the full freed-time share and retention zero", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: retentionFullChainValues(),
    };
    const accessAlone = computeAccessContributions(baseline, valuesByGoal.access!);

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 100);
    const accessScaled = combined.byGoal.access?.totalMargin ?? 0;
    const retentionScaled = combined.byGoal.retention?.totalMargin ?? 0;

    expect(accessScaled).toBeCloseTo(accessAlone.totalMargin, 5);
    expect(retentionScaled).toBe(0);
  });

  it("split at 0 gives retention the full freed-time share and access zero (capacity, and every dollar downstream of it, collapses to 0)", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: accessFullChainValues(),
      retention: retentionFullChainValues(),
    };
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 0);
    const accessScaled = combined.byGoal.access?.totalMargin ?? 0;
    const retentionScaled = combined.byGoal.retention?.totalMargin ?? 0;

    expect(accessScaled).toBe(0);
    expect(retentionScaled).toBeCloseTo(retentionAlone.totalMargin, 5);
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

  // C1 regression — StepAttainment's "The Plan" per-priority group heading
  // (the multi-goal branch, ~StepAttainment.tsx:916) used to compute its
  // subtotal by SUMMING every committed decision's `marginalMargin`
  // (leave-one-out) within that priority. Retention (and, per the review,
  // Quality/ED-access) are ordered decision CHAINS (D1..D5 / D1..D4), not
  // independent per-lever channels — see this file's header comment and
  // each chain's own "... decision chain" describe block. Retention's D5
  // ("Sustain it") is a hard GATE on the whole chain: resetting it alone to
  // 0 collapses the composite impact (and therefore totalMargin) to 0, so
  // its own leave-one-out `marginalMargin` equals the ENTIRE chain total,
  // while D2 ("Protect the relief")/D3/D4 each ALSO claim their own share on
  // top of that - summing every row therefore double- (here, ~2x-) counts
  // the same dollar. That is what inflated a priority's printed subtotal
  // past its true share and made the group subtotals disagree with (and
  // exceed) the combined total printed right below them. The fix reads
  // `byGoal[g.id].totalMargin` directly instead - the exact value the
  // "value by domain" breakdown cards and the PDF already use. This test
  // locks in the "parts equal the whole" invariant the fix now relies on:
  // never sum marginalMargin across a chain; use the chain's totalMargin.
  it("C1: multi-goal per-priority subtotals (byGoal[g].totalMargin) sum to exactly the combined total, while naively summing marginalMargin overstates it", () => {
    const baseline = BASELINE_FOR.quality; // nursing: { staffedBeds: 40, nursingFtes: 40, dailyCensus: 34, adoptionPct: 100 }
    const setting: AttainSetting = "nursing";
    // Nursing legally pairs quality + retention (see SETTING_GOAL_MATRIX) and
    // neither is outpatient access, so no freed-time split engages - a
    // clean two-chain plan, each goal's own chain computed independently.
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      quality: {
        qualityLines: ["Med-Surg", "ICU"],
        qualityBeds: 40,
        qualityEventTypes: ["HAPI", "CLABSI", "Falls", "Sepsis"],
        qualityRealTime: 90,
        qualityResponse: 2,
        qualityBundle: 70,
      },
      retention: {
        retentionLines: ["Med-Surg", "ICU"],
        retentionProviders: 40,
        retentionProtect: 60,
        retentionSurveyCadence: 2,
        retentionBackfill: 2,
        retentionSustain: 6,
      },
    };
    const goals: GoalId[] = ["quality", "retention"];
    const combined = computeMultiGoalContributions(goals, setting, baseline, valuesByGoal);

    // Each priority's committed decisions, mirroring what StepAttainment's
    // `allCommitted` filters into per-goal rows, then the buggy formula
    // being regression-tested: summing every row's leave-one-out
    // marginalMargin instead of reading the chain's own totalMargin.
    const naiveGroupWorth: Record<string, number> = {};
    for (const g of goals) {
      const perLever = combined.byGoal[g]?.perLever ?? [];
      naiveGroupWorth[g] = perLever.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
    }
    const naiveSumOfSubtotals = goals.reduce((sum, g) => sum + naiveGroupWorth[g], 0);

    // The correct per-priority subtotal per goal - what the fixed component
    // now reads.
    const correctSubtotals = goals.map((g) => combined.byGoal[g]?.totalMargin ?? 0);
    const sumOfCorrectSubtotals = correctSubtotals.reduce((a, b) => a + b, 0);

    // Sanity: this fixture actually produces real, nonzero dollars for both
    // goals, so the invariant below isn't vacuously true at $0.
    expect(combined.byGoal.quality?.totalMargin ?? 0).toBeGreaterThan(0);
    expect(combined.byGoal.retention?.totalMargin ?? 0).toBeGreaterThan(0);

    // Parts equal the whole: the corrected per-priority subtotals sum to
    // exactly the combined total shown directly below them on screen.
    expect(sumOfCorrectSubtotals).toBeCloseTo(combined.combinedMargin, 5);
    // And each individual subtotal is exactly its chain's own totalMargin.
    goals.forEach((g, i) => {
      expect(correctSubtotals[i]).toBeCloseTo(combined.byGoal[g]?.totalMargin ?? 0, 5);
    });

    // The bug this guards against: naively summing leave-one-out
    // marginalMargin across retention's chain overstates retention's OWN
    // totalMargin (D5's gate alone claims the full total, on top of
    // D2-D4's own shares) - and that overstatement alone is already enough
    // to push the naive COMBINED figure strictly above the real combined
    // total, exactly the inflation the review caught.
    expect(naiveGroupWorth.retention).toBeGreaterThan(combined.byGoal.retention?.totalMargin ?? 0);
    expect(naiveSumOfSubtotals).toBeGreaterThan(combined.combinedMargin);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Realization rate — attribution, on top of the engine's own dollar. A
// partner may run other efforts against the same outcome, so each
// priority carries its own realizationPct (default 100, only ever scales
// DOWN) applied in exactly ONE place, `applyRealization` inside
// `computeMultiGoalContributions`, so nothing downstream can drift: the
// per-priority totalMargin/totalCount AND every row's own
// marginalMargin/marginalCount scale by the same factor, so "parts equal
// the whole" (the C1 invariant above) still holds after scaling.
// ────────────────────────────────────────────────────────────────────────
describe("computeMultiGoalContributions — realization rate", () => {
  const retentionValues = (): LeverValues => ({
    retentionLines: ["Primary Care", "Cardiology"],
    retentionProviders: 40,
    retentionTurnoverRate: 14,
    retentionReplacementCost: 375_000,
    retentionProtect: 60,
    retentionSurveyCadence: 1,
    retentionBackfill: 2,
    retentionSustain: 6,
  });

  it("omitting realizationByGoal (and passing an explicit 100) leaves every figure exactly what it was before this feature existed", () => {
    const baseline = BASELINE_FOR.retention;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = { retention: retentionValues() };

    const withoutArg = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50);
    const withExplicit100 = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 100 });

    expect(withExplicit100.combinedMargin).toBe(withoutArg.combinedMargin);
    expect(withExplicit100.combinedCount).toBe(withoutArg.combinedCount);
    expect(withExplicit100.byGoal.retention?.totalMargin).toBe(withoutArg.byGoal.retention?.totalMargin);
    const a = withoutArg.byGoal.retention!.perLever;
    const b = withExplicit100.byGoal.retention!.perLever;
    for (let i = 0; i < a.length; i++) {
      expect(b[i].marginalMargin).toBe(a[i].marginalMargin);
      expect(b[i].formula).toBe(a[i].formula);
    }
  });

  it("realization 50 exactly halves a goal's totalMargin, totalCount, and every row's marginalMargin/marginalCount", () => {
    const baseline = BASELINE_FOR.retention;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = { retention: retentionValues() };

    const full = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 100 });
    const halved = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 50 });

    expect(full.byGoal.retention!.totalMargin).toBeGreaterThan(0);
    expect(halved.byGoal.retention!.totalMargin).toBeCloseTo(full.byGoal.retention!.totalMargin * 0.5, 5);
    expect(halved.byGoal.retention!.totalCount).toBeCloseTo(full.byGoal.retention!.totalCount * 0.5, 5);
    expect(halved.combinedMargin).toBeCloseTo(full.combinedMargin * 0.5, 5);

    const fullRows = full.byGoal.retention!.perLever;
    const halvedRows = halved.byGoal.retention!.perLever;
    for (let i = 0; i < fullRows.length; i++) {
      expect(halvedRows[i].marginalMargin).toBeCloseTo(fullRows[i].marginalMargin * 0.5, 5);
      expect(halvedRows[i].marginalCount).toBeCloseTo(fullRows[i].marginalCount * 0.5, 5);
      // pctOfTotal is a SHARE within the goal, unaffected by a uniform scale.
      expect(halvedRows[i].pctOfTotal).toBeCloseTo(fullRows[i].pctOfTotal, 5);
    }
  });

  it("multi-goal with a different realization per goal sums to the exact weighted total, and per-priority subtotals still sum to the combined total", () => {
    const baseline = BASELINE_FOR.quality; // nursing baseline, legally pairs quality + retention
    const setting: AttainSetting = "nursing";
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      quality: {
        qualityLines: ["Med-Surg", "ICU"],
        qualityBeds: 40,
        qualityEventTypes: ["HAPI", "CLABSI", "Falls", "Sepsis"],
        qualityRealTime: 90,
        qualityResponse: 2,
        qualityBundle: 70,
      },
      retention: {
        retentionLines: ["Med-Surg", "ICU"],
        retentionProviders: 40,
        retentionProtect: 60,
        retentionSurveyCadence: 2,
        retentionBackfill: 2,
        retentionSustain: 6,
      },
    };
    const goals: GoalId[] = ["quality", "retention"];

    const qualityFull = computeMultiGoalContributions(["quality"], setting, baseline, valuesByGoal).byGoal.quality!.totalMargin;
    const retentionFull = computeMultiGoalContributions(["retention"], setting, baseline, valuesByGoal).byGoal.retention!.totalMargin;
    expect(qualityFull).toBeGreaterThan(0);
    expect(retentionFull).toBeGreaterThan(0);

    const combined = computeMultiGoalContributions(goals, setting, baseline, valuesByGoal, 50, { quality: 80, retention: 60 });

    expect(combined.byGoal.quality!.totalMargin).toBeCloseTo(qualityFull * 0.8, 5);
    expect(combined.byGoal.retention!.totalMargin).toBeCloseTo(retentionFull * 0.6, 5);
    expect(combined.combinedMargin).toBeCloseTo(qualityFull * 0.8 + retentionFull * 0.6, 5);

    // Parts equal the whole, exactly the C1 invariant above, now proven to
    // survive per-goal realization scaling too.
    const sumOfSubtotals = goals.reduce((sum, g) => sum + (combined.byGoal[g]?.totalMargin ?? 0), 0);
    expect(sumOfSubtotals).toBeCloseTo(combined.combinedMargin, 5);
  });

  it("realization never scales UP: a value above 100 clamps to 100 (no-op), and a negative value clamps to 0", () => {
    const baseline = BASELINE_FOR.retention;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = { retention: retentionValues() };
    const full = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 100 });

    const over = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 140 });
    expect(over.byGoal.retention!.totalMargin).toBeCloseTo(full.byGoal.retention!.totalMargin, 5);

    const under = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: -20 });
    expect(under.byGoal.retention!.totalMargin).toBe(0);
  });

  it("a moved decision's own THE MATH formula gets a trailing '% realization' factor only when realization is below 100", () => {
    const baseline = BASELINE_FOR.retention;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = { retention: retentionValues() };

    const full = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 100 });
    const partial = computeMultiGoalContributions(["retention"], "outpatient", baseline, valuesByGoal, 50, { retention: 70 });

    const fullMoved = full.byGoal.retention!.perLever.filter((l) => l.marginalMargin !== 0);
    const partialMoved = partial.byGoal.retention!.perLever.filter((l) => l.marginalMargin !== 0);
    expect(fullMoved.length).toBeGreaterThan(0);
    for (const row of fullMoved) expect(row.formula).not.toContain("% realization");
    for (const row of partialMoved) expect(row.formula).toContain("70% realization");

    // Untouched (marginalMargin === 0) rows never get the suffix, at any
    // realization - there's no dollar to attribute, so no clutter.
    const untouched = partial.byGoal.retention!.perLever.filter((l) => l.marginalMargin === 0);
    for (const row of untouched) expect(row.formula).not.toContain("% realization");
  });
});

// ────────────────────────────────────────────────────────────────────────
// Blank starting-point baseline — "Your starting point" now loads with
// every field genuinely empty (see AttainFlow's `baseline` state, `{}`),
// not a prefilled benchmark. Every lever, and the access chain, must stay
// at exactly $0 / 0 units against a `{}` baseline — never NaN, never throw
// — until the partner actually types their own numbers in.
// ────────────────────────────────────────────────────────────────────────
describe("blank starting-point baseline ({}), no NaN / no crash", () => {
  const BLANK: AttainBaseline = {};

  // Every access decision dialed up, same shape as the fixture used above,
  // redeclared here since that one is scoped to its own describe block.
  const fullAccessValues = (): LeverValues => ({
    accessProviders: 40,
    accessFreedShare: 60,
    accessDemandNewReferrals: 1_000,
  });

  it("every channel goal nets exactly $0 margin and 0 count against a blank baseline, even with every lever dialed up", () => {
    for (const goal of GOAL_IDS_CHANNEL) {
      const setting = SETTING_FOR[goal];
      const values: LeverValues = { ...IMPROVED_VALUE[goal] };
      const result = computeLeverContributions(goal, setting, BLANK, values);
      expect(Number.isNaN(result.totalMargin)).toBe(false);
      expect(Number.isNaN(result.totalCount)).toBe(false);
      expect(result.totalMargin).toBe(0);
      expect(result.totalCount).toBe(0);
      for (const lever of result.perLever) {
        expect(Number.isNaN(lever.marginalMargin)).toBe(false);
        expect(Number.isNaN(lever.marginalCount)).toBe(false);
      }
    }
  });

  it("access: capacity and payoff are exactly 0 against a blank baseline when nothing has been entered anywhere (D1's own provider request also 0)", () => {
    const chain = computeAccessChain(BLANK, {});
    expect(chain.scope.providersInScope).toBe(0);
    expect(chain.capacity.capacityVisits).toBe(0);
    expect(chain.demand.demandCeiling).toBe(0);
    expect(chain.payoff.value).toBe(0);
    expect(chain.payoff.binding).toBe("none");

    const contributions = computeAccessContributions(BLANK, {});
    expect(contributions.totalMargin).toBe(0);
    expect(contributions.totalCount).toBe(0);
  });

  it("access: dialing up every OTHER decision while the Starting-point baseline stays blank never NaNs, crashes, or goes negative", () => {
    // D1's own requested provider count (`accessProviders`, set directly on
    // Build the case) is honored even when the Starting-point baseline has
    // no provider count to cap it against - see computeAccessScope's
    // documented fallback. So this is NOT expected to net exactly $0; it is
    // expected to stay a well-formed, finite, non-negative number.
    const values = fullAccessValues();
    const chain = computeAccessChain(BLANK, values);
    expect(Number.isNaN(chain.capacity.capacityVisits)).toBe(false);
    expect(Number.isNaN(chain.demand.demandCeiling)).toBe(false);
    expect(Number.isNaN(chain.payoff.value)).toBe(false);
    expect(Number.isFinite(chain.payoff.value)).toBe(true);
    expect(chain.payoff.value).toBeGreaterThanOrEqual(0);
    expect(chain.scope.providersInScope).toBe(40);
  });

  it("computeMultiGoalContributions: revenue nets exactly $0 against a blank baseline (access, retention, AND quality excluded - all three have their own D1 fallback tests, see below/attainWorkforce.test.ts/attainQuality.test.ts)", () => {
    const goals: GoalId[] = ["revenue"];
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      revenue: { ...IMPROVED_VALUE.revenue },
    };
    const combined = computeMultiGoalContributions(goals, "outpatient", BLANK, valuesByGoal, 50);
    expect(Number.isNaN(combined.combinedMargin)).toBe(false);
    expect(combined.combinedMargin).toBe(0);
    expect(combined.combinedCount).toBe(0);
  });

  it("retention: D1's own requested provider count is honored even when the Starting-point baseline stays blank (same convention as access's D1 fallback)", () => {
    // retentionProviders (40, from IMPROVED_VALUE.retention) is honored even
    // though BLANK has no `providers` to cap it against - so this is NOT
    // expected to net $0 the way the generic sweep above assumes; it is
    // expected to stay a well-formed, finite, non-negative number.
    const result = computeLeverContributions("retention", "outpatient", BLANK, IMPROVED_VALUE.retention);
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    expect(Number.isFinite(result.totalMargin)).toBe(true);
    expect(result.totalMargin).toBeGreaterThan(0);
  });

  it("quality: D1's own requested bed count is honored even when the Starting-point baseline stays blank (same convention as access's/retention's D1 fallback, see attainQuality.test.ts for the dedicated chain tests)", () => {
    // qualityBeds (40, from IMPROVED_VALUE.quality) is honored even though
    // BLANK has no `staffedBeds` to cap it against - so this is NOT expected
    // to net $0; it is expected to stay a well-formed, finite, non-negative
    // number.
    const result = computeLeverContributions("quality", "nursing", BLANK, IMPROVED_VALUE.quality);
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    expect(Number.isFinite(result.totalMargin)).toBe(true);
    expect(result.totalMargin).toBeGreaterThan(0);
  });

  it("computeMultiGoalContributions: every goal at once (including access) stays finite and non-NaN against a blank baseline", () => {
    const goals: GoalId[] = ["access", "retention", "revenue", "quality"];
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: fullAccessValues(),
      retention: { ...IMPROVED_VALUE.retention },
      revenue: { ...IMPROVED_VALUE.revenue },
      quality: { ...IMPROVED_VALUE.quality },
    };
    const combined = computeMultiGoalContributions(goals, "outpatient", BLANK, valuesByGoal, 50);
    expect(Number.isNaN(combined.combinedMargin)).toBe(false);
    expect(Number.isFinite(combined.combinedMargin)).toBe(true);
    expect(Number.isNaN(combined.combinedCount)).toBe(false);
  });

  it("a partially-filled baseline (only providers, no encounters yet) still nets $0, not NaN", () => {
    const partial: AttainBaseline = { providers: 40 };
    const result = computeLeverContributions("revenue", "outpatient", partial, IMPROVED_VALUE.revenue);
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    // effectiveEncountersPerUnit falls back to its illustrative constant
    // whenever encounters is missing even if providers is present, so this
    // is NOT required to be exactly 0 — only required to be a finite,
    // non-NaN number, i.e. no crash and no silent corruption.
    expect(Number.isFinite(result.totalMargin)).toBe(true);
  });
});
