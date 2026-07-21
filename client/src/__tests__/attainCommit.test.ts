import { describe, it, expect } from "vitest";
import { LEVERS, requiredSignalLabel } from "@/lib/attain/attainLevers";
import { defaultCommitmentFor } from "@/pages/attain/steps/StepCommit";

/**
 * TDD guardrail for the Commit redesign's data model: per decision, the
 * commitment is owner + by-when + ONE required signal (with its baseline),
 * plus an initially-empty list of optional signals a partner can add later.
 * No per-signal cadence anymore — cadence moved to one plan-level control
 * (see attainUrlState.test.ts / AttainFlow's `planCadence`).
 */
describe("defaultCommitmentFor (Commit's fresh-decision default shape)", () => {
  const lever = LEVERS.access[0]; // accessProviders

  it("defaults owner to blank and due to the lever's own defaultDue", () => {
    const c = defaultCommitmentFor("access", lever, "outpatient");
    expect(c.owner).toBe("");
    expect(c.due).toBe(lever.defaultDue);
  });

  it("pre-fills exactly one required signal, labeled from the lever's designated required signal", () => {
    const c = defaultCommitmentFor("access", lever, "outpatient");
    expect(c.requiredSignal.label).toBe(requiredSignalLabel(lever));
    expect(c.requiredSignal.baseline).toBe("");
    expect(c.requiredSignal.unit).toBe(lever.unit);
    expect(c.requiredSignal.id.length).toBeGreaterThan(0);
  });

  it("starts with zero optional signals — nothing is pre-added behind + Add a signal", () => {
    const c = defaultCommitmentFor("access", lever, "outpatient");
    expect(c.optionalSignals).toEqual([]);
  });

  it("produces a deterministic required-signal id (same lever + goal -> same id every call)", () => {
    const a = defaultCommitmentFor("access", lever, "outpatient");
    const b = defaultCommitmentFor("access", lever, "outpatient");
    expect(a.requiredSignal.id).toBe(b.requiredSignal.id);
  });

  it("every lever in every goal produces exactly one required signal by default", () => {
    for (const goal of Object.keys(LEVERS) as Array<keyof typeof LEVERS>) {
      for (const l of LEVERS[goal]) {
        const c = defaultCommitmentFor(goal, l);
        expect(c.requiredSignal, `${goal}:${l.id}`).toBeDefined();
        expect(c.optionalSignals, `${goal}:${l.id}`).toEqual([]);
      }
    }
  });
});
