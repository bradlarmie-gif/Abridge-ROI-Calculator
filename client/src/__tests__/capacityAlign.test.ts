import { describe, it, expect } from "vitest";
import {
  capacityAlignConfig,
  capacityAlignToLeverValues,
  deriveCapacityAlignProof,
  CAPACITY_GATE_DOC_MULT,
  CAPACITY_WHERE_DOC_SHARE_PCT,
  CAPACITY_ALIGN_CONVERSION_PCT,
} from "@/lib/attain/capacityAlign";
import {
  computeCapacityChain,
  exploreStateForReconciliation,
  computeAllDriverValues,
} from "@/lib/attain/attainCapacity";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const NURSING_BASELINE: AttainBaseline = { staffedBeds: 400, nursingFtes: 300, dailyCensus: 340, adoptionPct: 100 };

function ctxFor(baseline: AttainBaseline, overrides: Partial<AlignContext> = {}): AlignContext {
  return { baseline, setting: "nursing" as AttainSetting, realizationPct: 100, crossGoalShareMultiplier: 1, ...overrides };
}

/** A fully-aligned, documentation-bound set of choices (the real number path). */
function alignedChoices(overrides: LeverValues = {}): LeverValues {
  return {
    capacityAlignOutcome: ["cost"],
    capacityAlignWho: ["all"],
    capacityAlignGate: ["documentation"],
    capacityAlignWhere: ["postshift"],
    capacityAlignProof: ["othours", "budget"],
    ...overrides,
  };
}

describe("capacity Align config shape", () => {
  it("has exactly 5 choose-questions, in the contract's order", () => {
    expect(capacityAlignConfig.questions).toHaveLength(5);
    expect(capacityAlignConfig.questions.map((q) => q.id)).toEqual(["outcome", "who", "gate", "where", "proof"]);
  });

  it("is a single gated ladder: outcome/who/gate/where are single-select, only proof is multi", () => {
    const modes = Object.fromEntries(capacityAlignConfig.questions.map((q) => [q.id, q.mode]));
    expect(modes.outcome).toBe("single");
    expect(modes.who).toBe("single");
    expect(modes.gate).toBe("single");
    expect(modes.where).toBe("single");
    expect(modes.proof).toBe("multi");
  });

  it("carries the honest gate with a documentation / staffing / census triad", () => {
    const gate = capacityAlignConfig.questions.find((q) => q.id === "gate")!;
    expect(gate.options.map((o) => o.id)).toEqual(["documentation", "staffing", "census"]);
  });

  it("carries no em dash and no green/amber word in any user-facing string", () => {
    const strings: string[] = [capacityAlignConfig.intro, capacityAlignConfig.eyebrow];
    for (const q of capacityAlignConfig.questions) {
      strings.push(q.prompt, q.helper ?? "");
      for (const o of q.options) {
        strings.push(o.label, o.helper);
        if (o.sharpener) strings.push(o.sharpener.label, o.sharpener.benchmarkNote);
      }
    }
    for (const s of strings) {
      expect(s).not.toMatch(/[—–]/);
      expect(s.toLowerCase()).not.toMatch(/\bgreen\b|\bamber\b/);
    }
  });

  it("re-asks no inherited fact: no prompt asks for overtime hours per week, the loaded rate, or the nurse count they have", () => {
    for (const q of capacityAlignConfig.questions) {
      expect(q.prompt.toLowerCase()).not.toMatch(/overtime hours per|loaded (overtime )?rate|how many nurses do you have/);
    }
  });
});

describe("Q2 who -> capacityNurses (headcount inherited, optional number sharpens)", () => {
  it("'all units and nurses' inherits the full Starting-point FTE count", () => {
    const lv = capacityAlignToLeverValues(alignedChoices({ capacityAlignWho: ["all"] }), ctxFor(NURSING_BASELINE));
    expect(lv.capacityNurses).toBe(300);
  });

  it("'a focused unit' with a number uses it, capped to the baseline", () => {
    const lv = capacityAlignToLeverValues(
      alignedChoices({ capacityAlignWho: ["focused"], capacityAlignWhoCount: 40 }),
      ctxFor(NURSING_BASELINE),
    );
    expect(lv.capacityNurses).toBe(40);
  });

  it("'a focused unit' left blank falls back to a conservative benchmark (about half), never 0", () => {
    const lv = capacityAlignToLeverValues(
      alignedChoices({ capacityAlignWho: ["focused"], capacityAlignWhoCount: 0 }),
      ctxFor(NURSING_BASELINE),
    );
    expect(lv.capacityNurses).toBe(150);
  });

  it("nothing chosen yet nets 0 nurses and never fabricates a headcount", () => {
    const lv = capacityAlignToLeverValues({}, ctxFor(NURSING_BASELINE));
    expect(lv.capacityNurses).toBe(0);
  });
});

describe("Q3 the honest gate -> the documentation-attributable share (only documentation lets Abridge move it)", () => {
  it("maps documentation / staffing / census to the gate multiplier the mapping reads", () => {
    expect(CAPACITY_GATE_DOC_MULT.documentation).toBe(1);
    expect(CAPACITY_GATE_DOC_MULT.staffing).toBe(0);
    expect(CAPACITY_GATE_DOC_MULT.census).toBe(0);
  });

  it("documentation opens a real doc-attributable share; staffing/census collapse it to zero", () => {
    const doc = capacityAlignToLeverValues(alignedChoices({ capacityAlignGate: ["documentation"] }), ctxFor(NURSING_BASELINE));
    const staffing = capacityAlignToLeverValues(alignedChoices({ capacityAlignGate: ["staffing"] }), ctxFor(NURSING_BASELINE));
    const census = capacityAlignToLeverValues(alignedChoices({ capacityAlignGate: ["census"] }), ctxFor(NURSING_BASELINE));
    expect(doc.capacityDocShare).toBeGreaterThan(0);
    expect(staffing.capacityDocShare).toBe(0);
    expect(census.capacityDocShare).toBe(0);
    // The conversion is zeroed too when the gate collapses, so no stray value rides the saved plan.
    expect(staffing.capacityConversion).toBe(0);
    expect(census.capacityConversion).toBe(0);
  });
});

describe("the gate collapses the derived value for short staffing / census (the honest ceiling)", () => {
  it("documentation-bound produces a real number; staffing and census limit it to zero", () => {
    const ctx = ctxFor(NURSING_BASELINE);
    const doc = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["documentation"] }), ctx);
    const staffing = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["staffing"] }), ctx);
    const census = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["census"] }), ctx);
    expect(doc.headlineValue).toBeGreaterThan(0);
    expect(doc.ready).toBe(true);
    expect(staffing.headlineValue).toBe(0);
    expect(staffing.ready).toBe(false);
    expect(census.headlineValue).toBe(0);
    expect(census.ready).toBe(false);
    expect(doc.headlineValue).toBeGreaterThan(staffing.headlineValue);
  });

  it("the empty-state hint names the real reason: Abridge cannot add nurses or flatten census", () => {
    const ctx = ctxFor(NURSING_BASELINE);
    const staffing = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["staffing"] }), ctx);
    const census = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["census"] }), ctx);
    expect(staffing.emptyHint.toLowerCase()).toContain("cannot add nurses");
    expect(census.emptyHint.toLowerCase()).toContain("flatten census");
  });
});

describe("Q4 where -> the documentation-attributable share magnitude (blank = labeled benchmark)", () => {
  it("post-shift charting opens the largest defensible share; each where maps to its own", () => {
    for (const where of ["postshift", "batching", "lunches"] as const) {
      const lv = capacityAlignToLeverValues(alignedChoices({ capacityAlignWhere: [where] }), ctxFor(NURSING_BASELINE));
      expect(lv.capacityDocShare).toBe(CAPACITY_WHERE_DOC_SHARE_PCT[where]);
    }
    expect(CAPACITY_WHERE_DOC_SHARE_PCT.postshift).toBeGreaterThan(CAPACITY_WHERE_DOC_SHARE_PCT.lunches);
  });

  it("a documentation + where plan carries the conservative Align conversion starter (the Plan owns the real commitment)", () => {
    const lv = capacityAlignToLeverValues(alignedChoices({ capacityAlignWhere: ["postshift"] }), ctxFor(NURSING_BASELINE));
    expect(lv.capacityConversion).toBe(CAPACITY_ALIGN_CONVERSION_PCT);
  });

  it("where is a required choice: a blank where holds the doc-attributable share at 0 until it is set", () => {
    const lv = capacityAlignToLeverValues(
      alignedChoices({ capacityAlignGate: ["documentation"], capacityAlignWhere: [] }),
      ctxFor(NURSING_BASELINE),
    );
    expect(lv.capacityDocShare).toBe(0);
    expect(lv.capacityConversion).toBe(0);
  });
});

describe("facts inherited, not re-asked: OT hours/week and the loaded rate stay at benchmark", () => {
  it("the mapping never writes capacityOtHoursPerWeek or capacityOtRate", () => {
    const lv = capacityAlignToLeverValues(alignedChoices(), ctxFor(NURSING_BASELINE));
    expect(lv.capacityOtHoursPerWeek).toBeUndefined();
    expect(lv.capacityOtRate).toBeUndefined();
  });

  it("the proof labels OT hours/week and the rate as benchmarks and 'all' scope as inherited", () => {
    const proof = deriveCapacityAlignProof(alignedChoices({ capacityAlignWho: ["all"] }), ctxFor(NURSING_BASELINE));
    const otHrs = proof.figures.find((f) => f.label === "OT / nurse / wk")!;
    const rate = proof.figures.find((f) => f.label === "Overtime rate")!;
    const scope = proof.figures.find((f) => f.label === "In scope")!;
    expect(otHrs.tag).toBe("benchmark");
    expect(rate.tag).toBe("benchmark");
    expect(scope.tag).toBe("inherited");
    expect(scope.value).toContain("300");
  });
});

describe("the derived number reconciles to the engine (no second money model)", () => {
  it("aligned choices reconcile to computeAllDriverValues().nursingOvertime exactly", () => {
    const ctx = ctxFor(NURSING_BASELINE);
    const choices = alignedChoices();
    const engine = capacityAlignToLeverValues(choices, ctx);
    const merged: LeverValues = { ...choices, ...engine };

    const chain = computeCapacityChain(NURSING_BASELINE, merged);
    expect(chain.prize).toBeGreaterThan(0);

    const state = exploreStateForReconciliation(NURSING_BASELINE, merged);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.nursingOvertime).toBe(chain.prize);

    // The proof's headline is the (realized) same figure.
    const proof = deriveCapacityAlignProof(choices, ctx);
    expect(proof.ready).toBe(true);
    expect(Math.round(proof.headlineValue)).toBe(chain.prize);
  });

  it("holds across several who / where combinations", () => {
    for (const [who, where] of [
      ["all", "postshift"],
      ["all", "batching"],
      ["focused", "lunches"],
    ] as const) {
      const ctx = ctxFor(NURSING_BASELINE);
      const choices = alignedChoices({ capacityAlignWho: [who], capacityAlignWhere: [where], capacityAlignWhoCount: who === "focused" ? 120 : 0 });
      const merged: LeverValues = { ...choices, ...capacityAlignToLeverValues(choices, ctx) };
      const chain = computeCapacityChain(NURSING_BASELINE, merged);
      const engine = computeAllDriverValues(exploreStateForReconciliation(NURSING_BASELINE, merged), 0);
      expect(engine.nursingOvertime).toBe(chain.prize);
    }
  });

  it("the realization percent scales the derived dollar down, same as the ladder did", () => {
    const choices = alignedChoices();
    const full = deriveCapacityAlignProof(choices, ctxFor(NURSING_BASELINE, { realizationPct: 100 }));
    const half = deriveCapacityAlignProof(choices, ctxFor(NURSING_BASELINE, { realizationPct: 50 }));
    expect(half.headlineValue).toBeLessThan(full.headlineValue);
    expect(half.headlineValue).toBeGreaterThan(0);
  });
});

describe("the number is proof, not the goal: it only appears once the meaning is set", () => {
  it("no choices -> not ready, and the hint asks who this is for", () => {
    const proof = deriveCapacityAlignProof({}, ctxFor(NURSING_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
    expect(proof.emptyHint.toLowerCase()).toContain("who");
  });

  it("who set but the honest gate not yet -> still not ready, hint moves on to what's driving the overtime", () => {
    const proof = deriveCapacityAlignProof({ capacityAlignWho: ["all"] }, ctxFor(NURSING_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("driving the overtime");
  });

  it("documentation gate but no where yet -> still not ready, hint asks where the overtime shows up", () => {
    const proof = deriveCapacityAlignProof(
      { capacityAlignWho: ["all"], capacityAlignGate: ["documentation"] },
      ctxFor(NURSING_BASELINE),
    );
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("where the overtime shows up");
  });
});

describe("no double-count with retention, stated plainly in the proof footnote", () => {
  it("the proof carries the counted-once, wages-vs-replacement-cost line", () => {
    const proof = deriveCapacityAlignProof(alignedChoices(), ctxFor(NURSING_BASELINE));
    expect(proof.footnote).toBeDefined();
    expect(proof.footnote!).toMatch(/counted once/i);
    expect(proof.footnote!).toMatch(/wages/i);
    expect(proof.footnote!).toMatch(/replacement cost/i);
    expect(proof.footnote!).not.toMatch(/[—–]/);
  });
});

describe("capacity Align proof — honest zero lands in the math slot", () => {
  it("puts the short-staffing explanation in the math slot, not only the empty hint", () => {
    const proof = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["staffing"] }), ctxFor(NURSING_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
    expect(proof.math).toMatch(/short staffing/i);
    expect(proof.math).toMatch(/honest number here is zero/i);
    expect(proof.math).not.toMatch(/appears once you set/i);
  });

  it("puts the census-surge explanation in the math slot", () => {
    const proof = deriveCapacityAlignProof(alignedChoices({ capacityAlignGate: ["census"] }), ctxFor(NURSING_BASELINE));
    expect(proof.math).toMatch(/census surges/i);
    expect(proof.math).toMatch(/honest number here is zero/i);
  });

  it("still shows the derived formula in the math slot on the documentation path", () => {
    const proof = deriveCapacityAlignProof(alignedChoices(), ctxFor(NURSING_BASELINE));
    expect(proof.ready).toBe(true);
    expect(proof.math).not.toMatch(/honest number here is zero/i);
  });
});
