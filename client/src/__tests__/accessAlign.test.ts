import { describe, it, expect } from "vitest";
import {
  accessAlignConfig,
  accessAlignToLeverValues,
  deriveAccessAlignProof,
  ACCESS_GATE_FREED_SHARE_PCT,
  ACCESS_GATE_DEMAND_BENCH_MULT,
  ACCESS_DEMAND_SOURCES,
} from "@/lib/attain/accessAlign";
import {
  computeAccessChain,
  exploreStateForReconciliation,
  computeAllDriverValues,
} from "@/lib/attain/attainAccess";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

// utilizationPct 100 keeps the reconciliation arithmetic clean (the chain's
// own convention in attainAccess.test.ts).
const OP_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };

function ctxFor(baseline: AttainBaseline, overrides: Partial<AlignContext> = {}): AlignContext {
  return { baseline, setting: "outpatient" as AttainSetting, realizationPct: 100, crossGoalShareMultiplier: 1, ...overrides };
}

/** A fully-aligned, capacity-bound set of choices (backlog demand far above
 * capacity, so the number reconciles to Explore's capacity-bound formula). */
function capacityBoundChoices(overrides: LeverValues = {}): LeverValues {
  return {
    accessAlignOutcome: ["grow"],
    accessAlignWho: ["all"],
    accessAlignGate: ["documentation"],
    accessAlignDemand: ["backlog"],
    accessAlignBacklogCount: 1_000_000,
    accessAlignProof: ["visits", "tna"],
    ...overrides,
  };
}

/** Fully aligned but demand left to a blank benchmark (documentation gate). */
function benchmarkChoices(overrides: LeverValues = {}): LeverValues {
  return {
    accessAlignOutcome: ["backlog"],
    accessAlignWho: ["all"],
    accessAlignGate: ["documentation"],
    accessAlignDemand: ["backlog"],
    accessAlignProof: ["waittime"],
    ...overrides,
  };
}

describe("access Align config shape", () => {
  it("has exactly 5 choose-questions, in the contract's order", () => {
    expect(accessAlignConfig.questions).toHaveLength(5);
    expect(accessAlignConfig.questions.map((q) => q.id)).toEqual(["outcome", "who", "gate", "demand", "proof"]);
  });

  it("outcome/who/gate are single-select; demand and proof are multi-select", () => {
    const modes = Object.fromEntries(accessAlignConfig.questions.map((q) => [q.id, q.mode]));
    expect(modes.outcome).toBe("single");
    expect(modes.who).toBe("single");
    expect(modes.gate).toBe("single");
    expect(modes.demand).toBe("multi");
    expect(modes.proof).toBe("multi");
  });

  it("carries the honest gate with a documentation / bodies / demand triad", () => {
    const gate = accessAlignConfig.questions.find((q) => q.id === "gate")!;
    expect(gate.options.map((o) => o.id)).toEqual(["documentation", "bodies", "demand"]);
  });

  it("carries no em dash and no green/amber word in any user-facing string", () => {
    const strings: string[] = [accessAlignConfig.intro, accessAlignConfig.eyebrow];
    for (const q of accessAlignConfig.questions) {
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

  it("re-asks no inherited fact: no prompt asks for minutes saved, visit length, margin, or provider count", () => {
    for (const q of accessAlignConfig.questions) {
      expect(q.prompt.toLowerCase()).not.toMatch(/minutes saved|visit length|contribution margin|how many providers do you have/);
    }
  });
});

describe("Q2 who -> accessProviders (headcount inherited, optional number sharpens)", () => {
  it("'all lines and providers' inherits the full Starting-point headcount and goes enterprise", () => {
    const lv = accessAlignToLeverValues(capacityBoundChoices({ accessAlignWho: ["all"] }), ctxFor(OP_BASELINE));
    expect(lv.accessProviders).toBe(40);
    expect(lv.accessEnterprise).toBe(1);
  });

  it("'a focused set' with a number uses it, capped to the baseline, not enterprise", () => {
    const lv = accessAlignToLeverValues(
      capacityBoundChoices({ accessAlignWho: ["focused"], accessAlignWhoCount: 12 }),
      ctxFor(OP_BASELINE),
    );
    expect(lv.accessProviders).toBe(12);
    expect(lv.accessEnterprise).toBe(0);
  });

  it("'a focused set' left blank falls back to a conservative benchmark (about half), never $0", () => {
    const lv = accessAlignToLeverValues(
      capacityBoundChoices({ accessAlignWho: ["focused"], accessAlignWhoCount: 0 }),
      ctxFor(OP_BASELINE),
    );
    expect(lv.accessProviders).toBe(20);
  });

  it("nothing chosen yet nets 0 providers and never fabricates a headcount", () => {
    const lv = accessAlignToLeverValues({}, ctxFor(OP_BASELINE));
    expect(lv.accessProviders).toBe(0);
  });
});

describe("Q3 the honest gate -> accessFreedShare (only documentation lets Abridge move it)", () => {
  it("maps documentation / bodies / demand to the directed share the chain reads", () => {
    for (const gate of ["documentation", "bodies", "demand"] as const) {
      const lv = accessAlignToLeverValues(capacityBoundChoices({ accessAlignGate: [gate] }), ctxFor(OP_BASELINE));
      expect(lv.accessFreedShare).toBe(ACCESS_GATE_FREED_SHARE_PCT[gate]);
    }
  });

  it("only the documentation-bound answer opens capacity; bodies/space directs zero", () => {
    expect(ACCESS_GATE_FREED_SHARE_PCT.documentation).toBeGreaterThan(0);
    expect(ACCESS_GATE_FREED_SHARE_PCT.bodies).toBe(0);
  });

  it("'no demand' collapses the blank-source benchmark to zero", () => {
    expect(ACCESS_GATE_DEMAND_BENCH_MULT.demand).toBe(0);
    expect(ACCESS_GATE_DEMAND_BENCH_MULT.documentation).toBe(1);
  });
});

describe("the constraint gate reduces/limits the derived value (the honest ceiling)", () => {
  it("documentation-bound produces a real number; bodies/space limits it to zero", () => {
    const ctx = ctxFor(OP_BASELINE);
    const doc = deriveAccessAlignProof(benchmarkChoices({ accessAlignGate: ["documentation"] }), ctx);
    const bodies = deriveAccessAlignProof(benchmarkChoices({ accessAlignGate: ["bodies"] }), ctx);
    expect(doc.headlineValue).toBeGreaterThan(0);
    expect(bodies.headlineValue).toBe(0);
    expect(bodies.ready).toBe(false);
    expect(doc.headlineValue).toBeGreaterThan(bodies.headlineValue);
  });

  it("'not enough demand' limits a blank-demand plan to zero until real patients are named", () => {
    const ctx = ctxFor(OP_BASELINE);
    const doc = deriveAccessAlignProof(benchmarkChoices({ accessAlignGate: ["documentation"] }), ctx);
    const noDemand = deriveAccessAlignProof(benchmarkChoices({ accessAlignGate: ["demand"] }), ctx);
    expect(noDemand.headlineValue).toBe(0);
    expect(doc.headlineValue).toBeGreaterThan(noDemand.headlineValue);
  });

  it("'not enough demand' still counts a real, named demand count (honors real data)", () => {
    const ctx = ctxFor(OP_BASELINE);
    const named = deriveAccessAlignProof(
      benchmarkChoices({ accessAlignGate: ["demand"], accessAlignBacklogCount: 3_000 }),
      ctx,
    );
    expect(named.headlineValue).toBeGreaterThan(0);
  });
});

describe("Q4 demand -> the four countable ceilings (numbers optional, blank = labeled benchmark)", () => {
  it("a selected source with a typed count uses it exactly; referrals is a per-month rate", () => {
    const lv = accessAlignToLeverValues(
      benchmarkChoices({
        accessAlignDemand: ["backlog", "referrals", "sameday", "noshow"],
        accessAlignBacklogCount: 500,
        accessAlignReferralsCount: 50,
        accessAlignSameDayCount: 300,
        accessAlignNoShowCount: 200,
      }),
      ctxFor(OP_BASELINE),
    );
    expect(lv.accessDemandBacklog).toBe(500);
    expect(lv.accessDemandNewReferrals).toBe(50); // stored per month; the engine annualizes x12
    expect(lv.accessDemandSameDayCount).toBe(300);
    expect(lv.accessDemandNoShowCount).toBe(200);
  });

  it("an unselected source contributes exactly 0", () => {
    const lv = accessAlignToLeverValues(
      benchmarkChoices({ accessAlignDemand: ["backlog"], accessAlignBacklogCount: 500 }),
      ctxFor(OP_BASELINE),
    );
    expect(lv.accessDemandBacklog).toBe(500);
    expect(lv.accessDemandNewReferrals).toBe(0);
    expect(lv.accessDemandSameDayCount).toBe(0);
    expect(lv.accessDemandNoShowCount).toBe(0);
  });

  it("a selected source left blank falls back to a conservative benchmark share of in-scope volume, never $0", () => {
    const lv = accessAlignToLeverValues(
      benchmarkChoices({ accessAlignDemand: ["backlog"] }),
      ctxFor(OP_BASELINE),
    );
    // 40 x 3,500 x 100% x 2% = 2,800 patients waiting (benchmark).
    expect(lv.accessDemandBacklog).toBe(2_800);
  });

  it("exposes one demand-source table shared by the mapping and the UI options", () => {
    expect(ACCESS_DEMAND_SOURCES.map((s) => s.id)).toEqual(["backlog", "referrals", "sameday", "noshow"]);
    const referrals = ACCESS_DEMAND_SOURCES.find((s) => s.id === "referrals")!;
    expect(referrals.monthly).toBe(true);
  });
});

describe("facts inherited, not re-asked: minutes/visit length/margin stay at benchmark", () => {
  it("the mapping never writes accessMinutesSaved, accessVisitLength, or accessMargin", () => {
    const lv = accessAlignToLeverValues(capacityBoundChoices(), ctxFor(OP_BASELINE));
    expect(lv.accessMinutesSaved).toBeUndefined();
    expect(lv.accessVisitLength).toBeUndefined();
    expect(lv.accessMargin).toBeUndefined();
  });

  it("the proof labels margin per visit as a benchmark and 'all' scope as inherited", () => {
    const proof = deriveAccessAlignProof(capacityBoundChoices({ accessAlignWho: ["all"] }), ctxFor(OP_BASELINE));
    const margin = proof.figures.find((f) => f.label === "Margin / visit")!;
    const scope = proof.figures.find((f) => f.label === "In scope")!;
    expect(margin.tag).toBe("benchmark");
    expect(scope.tag).toBe("inherited");
    expect(scope.value).toContain("40");
  });
});

describe("the derived number reconciles to the engine (no second money model)", () => {
  it("capacity-bound Align choices reconcile to computeAllDriverValues.patientAccess within tolerance", () => {
    const ctx = ctxFor(OP_BASELINE);
    const choices = capacityBoundChoices();
    const engine = accessAlignToLeverValues(choices, ctx);
    const merged: LeverValues = { ...choices, ...engine };

    const chain = computeAccessChain(OP_BASELINE, merged);
    expect(chain.payoff.binding).toBe("capacity");
    expect(chain.payoff.value).toBeGreaterThan(0);

    const state = exploreStateForReconciliation(OP_BASELINE, merged);
    const totalHoursSaved = Math.round(
      state.annualEncounters * (state.utilizationPercent / 100) * state.minutesSavedPerEncounter / 60,
    );
    const engineValues = computeAllDriverValues(state, totalHoursSaved);
    expect(engineValues.patientAccess).toBeGreaterThan(0);
    expect(Math.abs(chain.payoff.value - engineValues.patientAccess)).toBeLessThan(
      Math.max(50, engineValues.patientAccess * 0.03),
    );

    // The proof's headline is the (realized) same figure.
    const proof = deriveAccessAlignProof(choices, ctx);
    expect(proof.ready).toBe(true);
    expect(Math.round(proof.headlineValue)).toBe(chain.payoff.value);
  });

  it("the freed-hour split multiplier scales the derived dollar down, same as the ladder did", () => {
    const choices = capacityBoundChoices();
    const full = deriveAccessAlignProof(choices, ctxFor(OP_BASELINE, { crossGoalShareMultiplier: 1 }));
    const half = deriveAccessAlignProof(choices, ctxFor(OP_BASELINE, { crossGoalShareMultiplier: 0.5 }));
    expect(half.headlineValue).toBeLessThan(full.headlineValue);
    expect(half.headlineValue).toBeGreaterThan(0);
  });
});

describe("the number is proof, not the goal: it only appears once the meaning is set", () => {
  it("no choices -> not ready, and the hint asks who this is for", () => {
    const proof = deriveAccessAlignProof({}, ctxFor(OP_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
    expect(proof.emptyHint.toLowerCase()).toContain("who");
  });

  it("who set but the honest gate not yet -> still not ready, hint moves on to the limit", () => {
    const proof = deriveAccessAlignProof({ accessAlignWho: ["all"] }, ctxFor(OP_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("limiting access");
  });

  it("bodies-bound -> not ready, the hint says Abridge cannot add bodies or space", () => {
    const proof = deriveAccessAlignProof(benchmarkChoices({ accessAlignGate: ["bodies"] }), ctxFor(OP_BASELINE));
    expect(proof.ready).toBe(false);
    expect(proof.emptyHint.toLowerCase()).toContain("bodies or space");
  });
});
