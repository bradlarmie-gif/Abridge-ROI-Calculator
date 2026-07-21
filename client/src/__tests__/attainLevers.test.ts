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
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const GOAL_IDS: GoalId[] = ["access", "retention", "revenue", "quality"];

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
  access: {
    accessLines: ["Cardiology", "Orthopedics"],
    accessReinvest: 40,
    accessSlots: 2,
    accessFill: 90,
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
    for (const goal of GOAL_IDS) {
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

  it("a plausible outpatient/access typical plan lands totalMargin in a $400K-$1M band", () => {
    const values: LeverValues = {
      accessLines: ["Cardiology", "Orthopedics"],
      accessReinvest: 30,
      accessSlots: 1.5,
      accessFill: 70,
    };
    const result = computeLeverContributions("access", "outpatient", BASELINE_FOR.access, values);
    expect(result.totalMargin).toBeGreaterThanOrEqual(400_000);
    expect(result.totalMargin).toBeLessThanOrEqual(1_000_000);
  });

  it("a bigger providers baseline yields a proportionally bigger contribution (reads the partner's own baseline, not a fixed assumption)", () => {
    const values: LeverValues = { ...defaultLeverValues("access"), accessReinvest: 40 };
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
    const values: LeverValues = { ...defaultLeverValues("access"), accessReinvest: 40 };
    const fullUtil: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 100 };
    const halfUtil: AttainBaseline = { providers: 40, annualEncounters: 40 * 600, utilizationPct: 50 };

    const fullResult = computeLeverContributions("access", "outpatient", fullUtil, values);
    const halfResult = computeLeverContributions("access", "outpatient", halfUtil, values);

    expect(halfResult.totalMargin).toBeLessThan(fullResult.totalMargin);
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

  it("access + retention with a 50/50 split never double-counts the freed-time lever", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: { ...defaultLeverValues("access"), accessReinvest: 60 },
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const accessAlone = computeLeverContributions("access", "outpatient", baseline, valuesByGoal.access!);
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const accessFreedAlone = accessAlone.perLever.find((p) => p.id === "accessReinvest")!.marginalMargin;
    const retentionFreedAlone = retentionAlone.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 50);
    const accessFreedScaled = combined.byGoal.access?.perLever.find((p) => p.id === "accessReinvest")!.marginalMargin ?? 0;
    const retentionFreedScaled = combined.byGoal.retention?.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin ?? 0;

    // The split hour, however divided, never exceeds what each side would
    // have gotten alone at full credit - it is shared, not cloned.
    expect(accessFreedScaled + retentionFreedScaled).toBeLessThanOrEqual(accessFreedAlone + retentionFreedAlone + 1e-6);
    expect(accessFreedScaled).toBeLessThanOrEqual(accessFreedAlone + 1e-6);
    expect(retentionFreedScaled).toBeLessThanOrEqual(retentionFreedAlone + 1e-6);
  });

  it("split at 100 gives access the full freed-time share and retention zero", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: { ...defaultLeverValues("access"), accessReinvest: 60 },
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const accessAlone = computeLeverContributions("access", "outpatient", baseline, valuesByGoal.access!);
    const accessFreedAlone = accessAlone.perLever.find((p) => p.id === "accessReinvest")!.marginalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 100);
    const accessFreedScaled = combined.byGoal.access?.perLever.find((p) => p.id === "accessReinvest")!.marginalMargin ?? 0;
    const retentionFreedScaled = combined.byGoal.retention?.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin ?? 0;

    expect(accessFreedScaled).toBeCloseTo(accessFreedAlone, 5);
    expect(retentionFreedScaled).toBe(0);
  });

  it("split at 0 gives retention the full freed-time share and access zero", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: { ...defaultLeverValues("access"), accessReinvest: 60 },
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const retentionFreedAlone = retentionAlone.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 0);
    const accessFreedScaled = combined.byGoal.access?.perLever.find((p) => p.id === "accessReinvest")!.marginalMargin ?? 0;
    const retentionFreedScaled = combined.byGoal.retention?.perLever.find((p) => p.id === "retentionFloor")!.marginalMargin ?? 0;

    expect(accessFreedScaled).toBe(0);
    expect(retentionFreedScaled).toBeCloseTo(retentionFreedAlone, 5);
  });

  it("combinedMargin with access + retention is strictly less than the naive (double-counted) sum of both alone, when the freed-time lever is moved", () => {
    const baseline = BASELINE_FOR.access;
    const valuesByGoal: Partial<Record<GoalId, LeverValues>> = {
      access: { ...defaultLeverValues("access"), accessReinvest: 60 },
      retention: { ...defaultLeverValues("retention"), retentionFloor: 60 },
    };
    const accessAlone = computeLeverContributions("access", "outpatient", baseline, valuesByGoal.access!);
    const retentionAlone = computeLeverContributions("retention", "outpatient", baseline, valuesByGoal.retention!);
    const naiveDoubleCounted = accessAlone.totalMargin + retentionAlone.totalMargin;

    const combined = computeMultiGoalContributions(["access", "retention"], "outpatient", baseline, valuesByGoal, 50);
    expect(combined.combinedMargin).toBeLessThan(naiveDoubleCounted);
  });
});
