import { describe, it, expect } from "vitest";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";
import { SETTING_GOAL_MATRIX, categoryForGoal } from "@/lib/attain/attainGoals";
import { categoryForGoal as categoryForGoalFlow } from "@/pages/attain/AttainFlowV2";
import { categoryForGoal as categoryForGoalPdf } from "@/pages/attain/pdf/attainPdfData";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * ORPHAN / REACHABILITY GUARD.
 *
 * Every cell in ATTAIN_MATRIX must be reachable by the real funnel path:
 *   SETTING_GOAL_MATRIX[setting] → categoryForGoal(setting, goal) → the cell's `category`.
 * If a cell exists but no (setting, goal) resolves to it, it is an orphan: it can leak
 * into the fast preview and the exported PDF as an "available later" teaser that the
 * build-a-plan funnel can never actually produce. This is exactly how "Inpatient Capacity"
 * shipped half-wired — the cell + engine driver existed, but no GoalId mapped to it.
 *
 * It also asserts the GoalId→category resolver is ONE source of truth: the live funnel
 * (AttainFlowV2) and the PDF builder (attainPdfData) must resolve it identically, or the
 * screen and the download can silently disagree about which cell a goal means.
 */

// display label on a cell → the SETTING_GOAL_MATRIX key
const SETTING_KEY: Record<string, AttainSetting> = {
  Outpatient: "outpatient",
  ED: "ed",
  Inpatient: "inpatient",
  Nursing: "nursing",
};

describe("Attain matrix reachability", () => {
  it("every ATTAIN_MATRIX cell is reachable via SETTING_GOAL_MATRIX → categoryForGoal", () => {
    for (const cell of ATTAIN_MATRIX) {
      const setting = SETTING_KEY[cell.setting];
      expect(setting, `unknown setting label "${cell.setting}"`).toBeTruthy();
      const goals = SETTING_GOAL_MATRIX[setting];
      const reachable = goals.some((g) => categoryForGoal(setting, g) === cell.category);
      expect(
        reachable,
        `ORPHAN: "${cell.setting} · ${cell.category}" is in ATTAIN_MATRIX but no goal in ` +
          `SETTING_GOAL_MATRIX.${setting} (${goals.join(", ")}) resolves to it`,
      ).toBe(true);
    }
  });

  it("every (setting, goal) resolves to a category that has a matrix cell", () => {
    for (const setting of Object.keys(SETTING_GOAL_MATRIX) as AttainSetting[]) {
      for (const goal of SETTING_GOAL_MATRIX[setting]) {
        const category = categoryForGoal(setting, goal);
        expect(category, `categoryForGoal(${setting}, ${goal}) is empty`).toBeTruthy();
        const cell = ATTAIN_MATRIX.find(
          (c) => SETTING_KEY[c.setting] === setting && c.category === category,
        );
        expect(
          cell,
          `no ATTAIN_MATRIX cell for ${setting} · "${category}" (goal ${goal})`,
        ).toBeTruthy();
      }
    }
  });

  it("Inpatient Capacity is now reachable (the fixed orphan)", () => {
    const reachable = SETTING_GOAL_MATRIX.inpatient.some(
      (g) => categoryForGoal("inpatient", g) === "Inpatient Capacity",
    );
    expect(reachable).toBe(true);
    // and the shared resolver keeps the two capacity cells distinct per setting
    expect(categoryForGoal("inpatient", "capacity")).toBe("Inpatient Capacity");
    expect(categoryForGoal("nursing", "capacity")).toBe("Nursing Capacity");
  });

  it("the funnel and the PDF resolve GoalId→category through the same source of truth", () => {
    // reference identity: both surfaces re-export the single attainGoals resolver
    expect(categoryForGoalFlow).toBe(categoryForGoal);
    expect(categoryForGoalPdf).toBe(categoryForGoal);
    // and, behaviorally, they agree for every (setting, goal) combination
    const allGoals: GoalId[] = ["access", "retention", "revenue", "quality", "capacity"];
    for (const setting of Object.keys(SETTING_GOAL_MATRIX) as AttainSetting[]) {
      for (const goal of allGoals) {
        expect(categoryForGoalFlow(setting, goal)).toBe(categoryForGoalPdf(setting, goal));
      }
    }
  });
});
