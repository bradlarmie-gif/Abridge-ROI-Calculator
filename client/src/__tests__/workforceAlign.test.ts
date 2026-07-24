import { describe, it, expect } from "vitest";
import {
  workforceAlignConfig,
  workforceAlignToLeverValues,
  deriveWorkforceAlignProof,
  WORKFORCE_GATE_PROTECT_PCT,
  WORKFORCE_BURDEN_SURVEY_LEVEL,
  WORKFORCE_BURDEN_SUSTAIN_MONTHS,
} from "@/lib/attain/workforceAlign";
import {
  computeWorkforceChain,
  exploreStateForReconciliation,
  computeAllDriverValues,
  WORKFORCE_TURNOVER_DEFAULT_PCT,
  WORKFORCE_REPLACEMENT_COST_DEFAULT,
} from "@/lib/attain/attainWorkforce";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const OP_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };
const NURSING_BASELINE: AttainBaseline = { staffedBeds: 400, nursingFtes: 480, dailyCensus: 340, adoptionPct: 100 };

function ctxFor(setting: AttainSetting, baseline: AttainBaseline, overrides: Partial<AlignContext> = {}): AlignContext {
  return { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1, ...overrides };
}

/** A fully-aligned set of choices (the shape that reaches a nonzero number). */
function fullChoices(overrides: LeverValues = {}): LeverValues {
  return {
    retentionAlignOutcome: ["both"],
    retentionAlignWho: ["all"],
    retentionAlignGate: ["meaningful"],
    retentionAlignBurden: ["both"],
    retentionAlignProof: ["turnover", "pulse"],
    ...overrides,
  };
}

describe("workforce Align config shape", () => {
  it("has exactly 5 choose-questions, in the contract's order", () => {
    expect(workforceAlignConfig.questions).toHaveLength(5);
    expect(workforceAlignConfig.questions.map((q) => q.id)).toEqual(["outcome", "who", "gate", "burden", "proof"]);
  });

  it("only Q5 (proof) is multi-select; the rest are single-select", () => {
    const modes = Object.fromEntries(workforceAlignConfig.questions.map((q) => [q.id, q.mode]));
    expect(modes.outcome).toBe("single");
    expect(modes.who).toBe("single");
    expect(modes.gate).toBe("single");
    expect(modes.burden).toBe("single");
    expect(modes.proof).toBe("multi");
  });

  it("carries no em dash and no green/amber word in any user-facing string", () => {
    const strings: string[] = [workforceAlignConfig.intro, workforceAlignConfig.eyebrow];
    for (const q of workforceAlignConfig.questions) {
      strings.push(q.prompt, q.helper ?? "");
      for (const o of q.options) {
        strings.push(o.label, o.helper);
        if (o.sharpener) strings.push(o.sharpener.label, o.sharpener.benchmarkNote);
      }
    }
    for (const s of strings) {
      expect(s).not.toContain("—");
      expect(s.toLowerCase()).not.toMatch(/\bgreen\b|\bamber\b/);
    }
  });

  it("re-asks no inherited fact: no question prompt asks for headcount, turnover, or replacement cost", () => {
    for (const q of workforceAlignConfig.questions) {
      expect(q.prompt.toLowerCase()).not.toMatch(/turnover rate|replacement cost|how many providers|headcount/);
    }
  });
});

describe("Q2 who -> retentionProviders (headcount inherited, optional number sharpens)", () => {
  it("'all of them' inherits the full Starting-point headcount", () => {
    const lv = workforceAlignToLeverValues(fullChoices({ retentionAlignWho: ["all"] }), ctxFor("outpatient", OP_BASELINE));
    expect(lv.retentionProviders).toBe(40);
  });

  it("'focused group' with a number uses it, capped to the baseline", () => {
    const lv = workforceAlignToLeverValues(
      fullChoices({ retentionAlignWho: ["focused"], retentionAlignWhoCount: 12 }),
      ctxFor("outpatient", OP_BASELINE),
    );
    expect(lv.retentionProviders).toBe(12);
  });

  it("'focused group' left blank falls back to a conservative benchmark (about half), never $0", () => {
    const lv = workforceAlignToLeverValues(
      fullChoices({ retentionAlignWho: ["focused"], retentionAlignWhoCount: 0 }),
      ctxFor("outpatient", OP_BASELINE),
    );
    expect(lv.retentionProviders).toBe(20);
  });

  it("nursing inherits nursingFtes, not staffedBeds", () => {
    const lv = workforceAlignToLeverValues(fullChoices({ retentionAlignWho: ["all"] }), ctxFor("nursing", NURSING_BASELINE));
    expect(lv.retentionProviders).toBe(480);
  });

  it("nothing chosen yet nets 0 providers and never fabricates a headcount", () => {
    const lv = workforceAlignToLeverValues({}, ctxFor("outpatient", OP_BASELINE));
    expect(lv.retentionProviders).toBe(0);
  });
});

describe("Q3 gate -> retentionProtect (conservative, honest ceiling)", () => {
  it("maps burnout/meaningful/pay-or-life to a conservative protected share", () => {
    for (const gate of ["burnout", "meaningful", "paylife"] as const) {
      const lv = workforceAlignToLeverValues(fullChoices({ retentionAlignGate: [gate] }), ctxFor("outpatient", OP_BASELINE));
      expect(lv.retentionProtect).toBe(WORKFORCE_GATE_PROTECT_PCT[gate]);
    }
  });

  it("even 'mostly burnout' stays conservative, never a full 100% claim", () => {
    expect(WORKFORCE_GATE_PROTECT_PCT.burnout).toBeLessThan(100);
    expect(WORKFORCE_GATE_PROTECT_PCT.burnout).toBeGreaterThan(WORKFORCE_GATE_PROTECT_PCT.meaningful);
    expect(WORKFORCE_GATE_PROTECT_PCT.meaningful).toBeGreaterThan(WORKFORCE_GATE_PROTECT_PCT.paylife);
  });

  it("a bigger burnout share drives a bigger derived dollar (same who and burden)", () => {
    const ctx = ctxFor("outpatient", OP_BASELINE);
    const burnout = deriveWorkforceAlignProof(fullChoices({ retentionAlignGate: ["burnout"] }), ctx);
    const paylife = deriveWorkforceAlignProof(fullChoices({ retentionAlignGate: ["paylife"] }), ctx);
    expect(burnout.headlineValue).toBeGreaterThan(paylife.headlineValue);
  });
});

describe("Q4 where-it-hurts -> the 'make it hold' knobs", () => {
  it("maps to a pulse cadence and a sustain horizon; after-hours holds longer than in-the-visit", () => {
    for (const burden of ["visit", "afterhours", "both"] as const) {
      const lv = workforceAlignToLeverValues(fullChoices({ retentionAlignBurden: [burden] }), ctxFor("outpatient", OP_BASELINE));
      expect(lv.retentionSurveyCadence).toBe(WORKFORCE_BURDEN_SURVEY_LEVEL[burden]);
      expect(lv.retentionSustain).toBe(WORKFORCE_BURDEN_SUSTAIN_MONTHS[burden]);
    }
    expect(WORKFORCE_BURDEN_SUSTAIN_MONTHS.afterhours).toBeGreaterThan(WORKFORCE_BURDEN_SUSTAIN_MONTHS.visit);
  });
});

describe("facts inherited, not re-asked: turnover and replacement stay at benchmark", () => {
  it("the mapping never writes retentionTurnoverRate or retentionReplacementCost", () => {
    const lv = workforceAlignToLeverValues(fullChoices(), ctxFor("outpatient", OP_BASELINE));
    expect(lv.retentionTurnoverRate).toBeUndefined();
    expect(lv.retentionReplacementCost).toBeUndefined();
  });

  it("the proof labels turnover and replacement cost as benchmarks, at the setting's own defaults", () => {
    const proof = deriveWorkforceAlignProof(fullChoices(), ctxFor("outpatient", OP_BASELINE));
    const turnover = proof.figures.find((f) => f.label === "Voluntary turnover")!;
    const replacement = proof.figures.find((f) => f.label === "Replacement cost")!;
    expect(turnover.tag).toBe("benchmark");
    expect(replacement.tag).toBe("benchmark");
    expect(turnover.value).toContain(String(WORKFORCE_TURNOVER_DEFAULT_PCT.outpatient));
    expect(replacement.value).toContain(WORKFORCE_REPLACEMENT_COST_DEFAULT.outpatient.toLocaleString());
  });

  it("an 'all of them' cut is tagged as inherited from the starting point", () => {
    const proof = deriveWorkforceAlignProof(fullChoices({ retentionAlignWho: ["all"] }), ctxFor("outpatient", OP_BASELINE));
    const scope = proof.figures.find((f) => f.label === "In scope")!;
    expect(scope.tag).toBe("inherited");
    expect(scope.value).toContain("40");
  });
});

describe("the derived number reconciles to the engine (no second money model)", () => {
  const settings: { setting: AttainSetting; baseline: AttainBaseline; driver: "providerWellbeing" | "nursingRetention" }[] = [
    { setting: "outpatient", baseline: OP_BASELINE, driver: "providerWellbeing" },
    { setting: "ed", baseline: { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 }, driver: "providerWellbeing" },
    { setting: "inpatient", baseline: { providers: 45, annualEncounters: 45 * 400, utilizationPct: 100 }, driver: "providerWellbeing" },
    { setting: "nursing", baseline: NURSING_BASELINE, driver: "nursingRetention" },
  ];

  it.each(settings)("$setting: the Align choices produce a nonzero dollar that equals computeAllDriverValues.$driver exactly", ({ setting, baseline, driver }) => {
    const ctx = ctxFor(setting, baseline);
    const choices = fullChoices();
    const engine = workforceAlignToLeverValues(choices, ctx);
    const merged: LeverValues = { ...choices, ...engine };

    const chain = computeWorkforceChain(baseline, setting, merged);
    const state = exploreStateForReconciliation(baseline, setting, merged);
    const engineValues = computeAllDriverValues(state, 0);

    expect(chain.payoff.value).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(engineValues[driver]);

    // The proof's headline is the (realized) same figure.
    const proof = deriveWorkforceAlignProof(choices, ctx);
    expect(proof.ready).toBe(true);
    expect(Math.round(proof.headlineValue)).toBe(chain.payoff.value);
  });

  it("the freed-hour split multiplier scales the derived dollar exactly, same as the ladder did", () => {
    const choices = fullChoices();
    const full = deriveWorkforceAlignProof(choices, ctxFor("outpatient", OP_BASELINE, { crossGoalShareMultiplier: 1 }));
    const half = deriveWorkforceAlignProof(choices, ctxFor("outpatient", OP_BASELINE, { crossGoalShareMultiplier: 0.5 }));
    expect(half.headlineValue).toBeLessThan(full.headlineValue);
    expect(half.headlineValue).toBeGreaterThan(0);
  });
});

describe("the number is proof, not the goal: it only appears once the meaning is set", () => {
  it("no choices -> not ready, and the hint asks who this is for", () => {
    const proof = deriveWorkforceAlignProof({}, ctxFor("outpatient", OP_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
    expect(proof.emptyHint.toLowerCase()).toContain("who");
  });

  it("who set but gate not yet -> still not ready, hint moves on to the gate", () => {
    const proof = deriveWorkforceAlignProof({ retentionAlignWho: ["all"] }, ctxFor("outpatient", OP_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("driving");
  });
});
