import { describe, it, expect } from "vitest";
import {
  GOAL_CATALOG,
  SETTING_GOAL_MATRIX,
  CONTENT,
  goalsForSetting,
  getContent,
} from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId, SettingGoalContent } from "@/lib/attain/attainTypes";

const SETTINGS: AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

// Collect every string leaf in an object/array tree so the em-dash sweep
// covers all copy fields without having to enumerate them by hand.
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }
  return out;
}

describe("SETTING_GOAL_MATRIX", () => {
  it("matches the locked matrix from the plan", () => {
    expect(SETTING_GOAL_MATRIX.outpatient).toEqual(["access", "retention", "revenue"]);
    expect(SETTING_GOAL_MATRIX.ed).toEqual(["access", "retention", "revenue"]);
    expect(SETTING_GOAL_MATRIX.inpatient).toEqual(["revenue", "retention"]);
    expect(SETTING_GOAL_MATRIX.nursing).toEqual(["quality", "retention", "capacity"]);
  });

  it("resolves getContent(setting, goal) to a defined object for every listed goal", () => {
    SETTINGS.forEach((setting) => {
      SETTING_GOAL_MATRIX[setting].forEach((goal) => {
        const content = getContent(setting, goal);
        expect(content, `getContent(${setting}, ${goal})`).toBeDefined();
      });
    });
  });

  it("goalsForSetting returns GoalDef entries matching the matrix, in order", () => {
    SETTINGS.forEach((setting) => {
      const defs = goalsForSetting(setting);
      expect(defs.map((d) => d.id)).toEqual(SETTING_GOAL_MATRIX[setting]);
    });
  });
});

describe("GOAL_CATALOG structural integrity", () => {
  (Object.keys(GOAL_CATALOG) as GoalId[]).forEach((goalId) => {
    const def = GOAL_CATALOG[goalId];

    it(`${goalId}: chain has exactly 7 links`, () => {
      expect(def.chain).toHaveLength(7);
    });

    it(`${goalId}: links are numbered 1-7 in order`, () => {
      expect(def.chain.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it(`${goalId}: links 3 and 4 are fragile, no others`, () => {
      def.chain.forEach((link) => {
        if (link.n === 3 || link.n === 4) {
          expect(link.fragile, `link ${link.n} should be fragile`).toBe(true);
        } else {
          expect(link.fragile, `link ${link.n} should not be fragile`).toBe(false);
        }
      });
    });

    it(`${goalId}: links 1 and 2 are delivered by Abridge`, () => {
      expect(def.chain[0].isAbridge).toBe(true);
      expect(def.chain[1].isAbridge).toBe(true);
    });

    it(`${goalId}: has exactly 3 mechanisms`, () => {
      expect(def.mechanisms).toHaveLength(3);
    });
  });
});

describe("SettingGoalContent integrity", () => {
  const entries: { setting: AttainSetting; goal: GoalId; content: SettingGoalContent }[] = [];
  SETTINGS.forEach((setting) => {
    SETTING_GOAL_MATRIX[setting].forEach((goal) => {
      const content = getContent(setting, goal);
      if (content) entries.push({ setting, goal, content });
    });
  });

  entries.forEach(({ setting, goal, content }) => {
    it(`${setting}/${goal}: worldCards has length 4`, () => {
      expect(content.worldCards).toHaveLength(4);
    });

    it(`${setting}/${goal}: goodCells has length 4`, () => {
      expect(content.goodCells).toHaveLength(4);
    });

    it(`${setting}/${goal}: has all 3 ambition tiers`, () => {
      const keys = content.ambition.map((a) => a.key).sort();
      expect(keys).toEqual(["ambitious", "conservative", "typical"]);
    });

    it(`${setting}/${goal}: no copy string contains an em dash`, () => {
      const allStrings = [
        ...collectStrings(content),
        ...collectStrings(GOAL_CATALOG[goal]),
      ];
      const offenders = allStrings.filter((s) => s.includes("—"));
      expect(offenders, `em dash found in ${setting}/${goal}`).toEqual([]);
    });
  });
});

describe("CONTENT does not have entries outside the matrix", () => {
  it("every CONTENT[setting] key is listed in SETTING_GOAL_MATRIX[setting]", () => {
    SETTINGS.forEach((setting) => {
      const goalsWithContent = Object.keys(CONTENT[setting] ?? {}) as GoalId[];
      goalsWithContent.forEach((goal) => {
        expect(SETTING_GOAL_MATRIX[setting]).toContain(goal);
      });
    });
  });
});
