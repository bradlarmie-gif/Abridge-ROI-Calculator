import { describe, it, expect } from "vitest";
import {
  edAccessAlignConfig,
  edAccessAlignToLeverValues,
  deriveEdAccessAlignProof,
  ED_ACCESS_GATE_DOC_CAUSED_SHARE_PCT,
  ED_ACCESS_GATE_THROUGHPUT_SHARE_PCT,
} from "@/lib/attain/edAccessAlign";
import {
  computeEdAccessChain,
  exploreStateForEdAccessReconciliation,
  computeAllDriverValues,
  DEFAULT_ED_ACCESS_ADMISSION_RATE,
} from "@/lib/attain/attainEdAccess";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

// Full ED scope, 100% utilization, so visitsInScope == baseline.annualEncounters
// and the merged choices below equal attainEdAccess.test.ts's own fixture,
// reconciling 1:1 to the live edLwbs / admissionCapture engine.
const BASELINE: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };

function ctxFor(baseline: AttainBaseline, overrides: Partial<AlignContext> = {}): AlignContext {
  return { baseline, setting: "ed" as AttainSetting, realizationPct: 100, crossGoalShareMultiplier: 1, ...overrides };
}

/** A fully-aligned set of ED access choices with a real, typed LWBS rate, so
 * the merged engine levers match the ED chain's own fullValues fixture. */
function fullChoices(overrides: LeverValues = {}): LeverValues {
  return {
    edAccessAlignOutcome: ["lwbs", "admissions"],
    edAccessAlignWho: ["all"],
    edAccessAlignGate: ["documentation"],
    edAccessAlignWhere: ["triage"],
    edAccessAlignLwbsRate: 8,
    edAccessAlignProof: ["lwbsrate", "recovered", "admissions"],
    ...overrides,
  };
}

describe("ED access Align config shape", () => {
  it("has exactly 5 choose-questions, in the contract's order", () => {
    expect(edAccessAlignConfig.questions).toHaveLength(5);
    expect(edAccessAlignConfig.questions.map((q) => q.id)).toEqual(["outcome", "who", "gate", "where", "proof"]);
  });

  it("who and gate are single-select; outcome, where, proof are multi-select", () => {
    const modes = Object.fromEntries(edAccessAlignConfig.questions.map((q) => [q.id, q.mode]));
    expect(modes.outcome).toBe("multi");
    expect(modes.who).toBe("single");
    expect(modes.gate).toBe("single");
    expect(modes.where).toBe("multi");
    expect(modes.proof).toBe("multi");
  });

  it("carries the honest gate with a documentation / staffing / lowdemand triad", () => {
    const gate = edAccessAlignConfig.questions.find((q) => q.id === "gate")!;
    expect(gate.options.map((o) => o.id)).toEqual(["documentation", "staffing", "lowdemand"]);
  });

  it("carries no em dash and no green/amber word in any user-facing string", () => {
    const strings: string[] = [edAccessAlignConfig.intro, edAccessAlignConfig.eyebrow];
    for (const q of edAccessAlignConfig.questions) {
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

  it("re-asks no inherited fact: no prompt asks for minutes saved, margin, or the raw provider count", () => {
    for (const q of edAccessAlignConfig.questions) {
      expect(q.prompt.toLowerCase()).not.toMatch(/minutes saved|contribution margin|how many providers do you have/);
    }
  });
});

describe("Q2 who -> edAccessProviders (headcount inherited, optional number sharpens)", () => {
  it("'all ED providers' inherits the full Starting-point headcount", () => {
    const lv = edAccessAlignToLeverValues(fullChoices({ edAccessAlignWho: ["all"] }), ctxFor(BASELINE));
    expect(lv.edAccessProviders).toBe(55);
  });

  it("'a focused set' with a number uses it, capped to the baseline", () => {
    const lv = edAccessAlignToLeverValues(fullChoices({ edAccessAlignWho: ["focused"], edAccessAlignWhoCount: 20 }), ctxFor(BASELINE));
    expect(lv.edAccessProviders).toBe(20);
  });

  it("'a focused set' left blank falls back to a conservative benchmark (about half)", () => {
    const lv = edAccessAlignToLeverValues(fullChoices({ edAccessAlignWho: ["focused"], edAccessAlignWhoCount: 0 }), ctxFor(BASELINE));
    expect(lv.edAccessProviders).toBe(28); // round(55 / 2)
  });

  it("nothing chosen yet nets 0 providers and never fabricates a headcount", () => {
    expect(edAccessAlignToLeverValues({}, ctxFor(BASELINE)).edAccessProviders).toBe(0);
  });
});

describe("Q3 the honest gate -> the diagnosis + throughput share (only documentation lets Abridge move it)", () => {
  it("maps documentation / staffing to the diagnosis share and directed throughput share the chain reads", () => {
    for (const gate of ["documentation", "staffing"] as const) {
      const lv = edAccessAlignToLeverValues(fullChoices({ edAccessAlignGate: [gate] }), ctxFor(BASELINE));
      expect(lv.edAccessDocCausedShare).toBe(ED_ACCESS_GATE_DOC_CAUSED_SHARE_PCT[gate]);
      expect(lv.edAccessThroughputShare).toBe(ED_ACCESS_GATE_THROUGHPUT_SHARE_PCT[gate]);
    }
  });

  it("only the documentation-bound answer makes the leak recoverable; staffing / beds recovers zero", () => {
    expect(ED_ACCESS_GATE_DOC_CAUSED_SHARE_PCT.documentation).toBeGreaterThan(0);
    expect(ED_ACCESS_GATE_DOC_CAUSED_SHARE_PCT.staffing).toBe(0);
    expect(ED_ACCESS_GATE_THROUGHPUT_SHARE_PCT.staffing).toBe(0);
  });
});

describe("the honest gate reduces/limits the derived value (the diagnosis ceiling)", () => {
  it("documentation-bound produces a real number; staffing / beds limits it to zero", () => {
    const ctx = ctxFor(BASELINE);
    const doc = deriveEdAccessAlignProof(fullChoices({ edAccessAlignGate: ["documentation"] }), ctx);
    const staffing = deriveEdAccessAlignProof(fullChoices({ edAccessAlignGate: ["staffing"] }), ctx);
    expect(doc.headlineValue).toBeGreaterThan(0);
    expect(staffing.headlineValue).toBe(0);
    expect(staffing.ready).toBe(false);
    expect(doc.headlineValue).toBeGreaterThan(staffing.headlineValue);
  });

  it("'low demand' collapses a blank-LWBS plan to zero until a real rate is named", () => {
    const ctx = ctxFor(BASELINE);
    // Blank LWBS rate under the low-demand gate: nothing recoverable.
    const blank = deriveEdAccessAlignProof(fullChoices({ edAccessAlignGate: ["lowdemand"], edAccessAlignLwbsRate: 0 }), ctx);
    expect(blank.headlineValue).toBe(0);
    expect(blank.emptyHint.toLowerCase()).toContain("demand is low");
    // A real, named LWBS rate revives it (honors real data).
    const named = deriveEdAccessAlignProof(fullChoices({ edAccessAlignGate: ["lowdemand"], edAccessAlignLwbsRate: 10 }), ctx);
    expect(named.headlineValue).toBeGreaterThan(0);
  });
});

describe("Q1 outcome -> the admission leg (only in play when they are after admissions)", () => {
  it("selecting admissions turns on a conservative admission share; leaving it off keeps it at zero", () => {
    const withAdm = edAccessAlignToLeverValues(fullChoices({ edAccessAlignOutcome: ["lwbs", "admissions"] }), ctxFor(BASELINE));
    expect(withAdm.edAccessAdmissionRate).toBe(DEFAULT_ED_ACCESS_ADMISSION_RATE);
    const noAdm = edAccessAlignToLeverValues(fullChoices({ edAccessAlignOutcome: ["lwbs"] }), ctxFor(BASELINE));
    expect(noAdm.edAccessAdmissionRate).toBe(0);
  });

  it("an optional admission-share number sharpens the benchmark", () => {
    const lv = edAccessAlignToLeverValues(
      fullChoices({ edAccessAlignOutcome: ["admissions"], edAccessAlignAdmissionRate: 25 }),
      ctxFor(BASELINE),
    );
    expect(lv.edAccessAdmissionRate).toBe(25);
  });

  it("the admission leg adds value only when admissions are chosen", () => {
    const ctx = ctxFor(BASELINE);
    const withAdm = deriveEdAccessAlignProof(fullChoices({ edAccessAlignOutcome: ["lwbs", "admissions"] }), ctx);
    const noAdm = deriveEdAccessAlignProof(fullChoices({ edAccessAlignOutcome: ["lwbs"] }), ctx);
    expect(withAdm.headlineValue).toBeGreaterThan(noAdm.headlineValue);
  });
});

describe("facts inherited, not re-asked: minutes / margins / hours stay at benchmark", () => {
  it("the mapping never writes minutes saved, margin/visit, admission margin, hours/recovery, or admission realization", () => {
    const lv = edAccessAlignToLeverValues(fullChoices(), ctxFor(BASELINE));
    expect(lv.edAccessMinutesSaved).toBeUndefined();
    expect(lv.edAccessMarginPerVisit).toBeUndefined();
    expect(lv.edAccessAdmissionMargin).toBeUndefined();
    expect(lv.edAccessHoursPerRecovery).toBeUndefined();
    expect(lv.edAccessAdmissionRealization).toBeUndefined();
  });

  it("the proof labels margin per visit as a benchmark and 'all' scope as inherited", () => {
    const proof = deriveEdAccessAlignProof(fullChoices({ edAccessAlignWho: ["all"] }), ctxFor(BASELINE));
    const margin = proof.figures.find((f) => f.label === "Margin / visit")!;
    const scope = proof.figures.find((f) => f.label === "In scope")!;
    expect(margin.tag).toBe("benchmark");
    expect(scope.tag).toBe("inherited");
    expect(scope.value).toContain("55");
  });
});

describe("the derived number reconciles to the engine (no second money model)", () => {
  it("fully-aligned ED access choices reconcile to computeAllDriverValues's lwbsRecovery + admissionCapture", () => {
    const ctx = ctxFor(BASELINE);
    const choices = fullChoices();
    const engine = edAccessAlignToLeverValues(choices, ctx);
    const merged: LeverValues = { ...choices, ...engine };

    const chain = computeEdAccessChain(BASELINE, merged);
    expect(chain.payoff.value).toBeGreaterThan(0);

    const state = exploreStateForEdAccessReconciliation(BASELINE, merged);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.lwbsRecovery).toBeCloseTo(chain.payoff.visitValue, 0);
    expect(engineValues.admissionCapture).toBeCloseTo(chain.payoff.admissionValue, 0);

    // The proof's headline is the (realized) same figure.
    const proof = deriveEdAccessAlignProof(choices, ctx);
    expect(proof.ready).toBe(true);
    expect(Math.round(proof.headlineValue)).toBe(chain.payoff.value);
  });

  it("the freed-hour split multiplier scales the derived dollar down, same as the ladder did", () => {
    const choices = fullChoices();
    const full = deriveEdAccessAlignProof(choices, ctxFor(BASELINE, { crossGoalShareMultiplier: 1 }));
    const half = deriveEdAccessAlignProof(choices, ctxFor(BASELINE, { crossGoalShareMultiplier: 0.5 }));
    expect(half.headlineValue).toBeLessThan(full.headlineValue);
    expect(half.headlineValue).toBeGreaterThan(0);
  });
});

describe("the number is proof, not the goal: it only appears once the meaning is set", () => {
  it("no choices -> not ready, and the hint asks who this is for", () => {
    const proof = deriveEdAccessAlignProof({}, ctxFor(BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
    expect(proof.emptyHint.toLowerCase()).toContain("who");
  });

  it("who set but the honest gate not yet -> still not ready, hint moves on to what's limiting throughput", () => {
    const proof = deriveEdAccessAlignProof({ edAccessAlignWho: ["all"] }, ctxFor(BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("limiting ed throughput");
  });

  it("staffing-bound -> not ready, the hint says Abridge cannot add staff or open beds", () => {
    const proof = deriveEdAccessAlignProof(fullChoices({ edAccessAlignGate: ["staffing"] }), ctxFor(BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("add staff or open beds");
  });
});
