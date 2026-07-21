import { describe, it, expect } from "vitest";
import {
  LEVERS,
  defaultLeverValues,
  computeLeverContributions,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import type { AttainScope, AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const GOAL_IDS: GoalId[] = ["access", "retention", "revenue", "quality"];

// One valid (setting, goal) pair per goal, used for the generic property
// tests below (SETTING_GOAL_MATRIX in attainGoals.ts confirms each is legal).
const SETTING_FOR: Record<GoalId, AttainSetting> = {
  access: "outpatient",
  retention: "outpatient",
  revenue: "outpatient",
  quality: "nursing",
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

const scope: AttainScope = { unitCount: 40, serviceLines: [] };

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

describe("computeLeverContributions", () => {
  it("doing nothing new (all levers at realityStart) adds ~0 margin", () => {
    for (const goal of GOAL_IDS) {
      const setting = SETTING_FOR[goal];
      const values = defaultLeverValues(goal);
      const result = computeLeverContributions(goal, setting, scope, values);
      expect(Math.abs(result.totalMargin)).toBeLessThan(1_000);
    }
  });

  it("moving any single lever toward its goal increases totalMargin and that lever's own marginal contribution", () => {
    for (const goal of GOAL_IDS) {
      const setting = SETTING_FOR[goal];
      for (const lever of LEVERS[goal]) {
        const values: LeverValues = defaultLeverValues(goal);
        values[lever.id] = IMPROVED_VALUE[goal][lever.id];
        const result = computeLeverContributions(goal, setting, scope, values);
        expect(result.totalMargin).toBeGreaterThan(0);
        const contribution = result.perLever.find((l) => l.id === lever.id);
        expect(contribution).toBeDefined();
        expect(contribution!.marginalMargin).toBeGreaterThan(0);
      }
    }
  });

  it("pctOfTotal across levers is well-formed (no divide-by-zero blowup)", () => {
    for (const goal of GOAL_IDS) {
      const setting = SETTING_FOR[goal];
      const values = defaultLeverValues(goal);
      const result = computeLeverContributions(goal, setting, scope, values);
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
    const result = computeLeverContributions("access", "outpatient", scope, values);
    expect(result.totalMargin).toBeGreaterThanOrEqual(400_000);
    expect(result.totalMargin).toBeLessThanOrEqual(1_000_000);
  });
});
