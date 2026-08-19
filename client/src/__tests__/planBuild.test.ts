import { describe, it, expect } from "vitest";
import { buildOutcomePlan, applyOverlay } from "@/lib/attain/planBuild";
import { SETTING_GOAL_MATRIX } from "@/lib/attain/attainGoals";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const SETTINGS: AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

describe("planBuild — owner-grouped outcome deconstruction", () => {
  it("builds a valid owner-grouped plan for every setting × goal", () => {
    for (const setting of SETTINGS) {
      for (const goal of SETTING_GOAL_MATRIX[setting]) {
        const plan = buildOutcomePlan(setting, goal);
        // owners exist and none is empty
        expect(plan.owners.length).toBeGreaterThan(0);
        for (const o of plan.owners) {
          expect(o.role.length).toBeGreaterThan(0);
          expect(o.steps.length).toBeGreaterThan(0);
          // every step has a signal + a source (provenance the CFO trusts)
          for (const s of o.steps) {
            expect(s.signal.length).toBeGreaterThan(0);
            expect(s.source.length).toBeGreaterThan(0);
          }
        }
        // at least one Abridge-proven leading signal, and exactly one booked outcome
        expect(plan.leadingCount).toBeGreaterThanOrEqual(1);
        const outcomeSteps = plan.owners.flatMap((o) => o.steps).filter((s) => s.layer === "outcome");
        expect(outcomeSteps).toHaveLength(1);
        expect(outcomeSteps[0].n).toBe(plan.outcomeStepN);
        // every one of the chain's steps is grouped under exactly one owner (no orphans, no dupes)
        const ns = plan.owners.flatMap((o) => o.steps.map((s) => s.n)).sort((a, b) => a - b);
        expect(ns).toEqual(Array.from(new Set(ns)));
      }
    }
  });

  it("owners default to blank person names and steps to blank overlay values", () => {
    const plan = buildOutcomePlan("outpatient", "access");
    for (const o of plan.owners) expect(o.person).toBeUndefined();
    for (const s of plan.owners.flatMap((o) => o.steps)) {
      expect(s.baseline).toBeUndefined();
      expect(s.target).toBeUndefined();
      expect(s.byWhen).toBeUndefined();
    }
  });

  it("applyOverlay layers typed values without mutating the source plan", () => {
    const plan = buildOutcomePlan("outpatient", "access");
    const firstOwner = plan.owners[0];
    const firstStepN = firstOwner.steps[0].n;
    const out = applyOverlay(
      plan,
      { [firstStepN]: { baseline: "65%", target: "80%", byWhen: "Q2" } },
      { [firstOwner.role]: "Dana Ruiz" },
    );
    // overlay applied
    expect(out.owners[0].person).toBe("Dana Ruiz");
    expect(out.owners[0].steps[0].baseline).toBe("65%");
    expect(out.owners[0].steps[0].target).toBe("80%");
    // source plan untouched
    expect(plan.owners[0].person).toBeUndefined();
    expect(plan.owners[0].steps[0].baseline).toBeUndefined();
  });
});
