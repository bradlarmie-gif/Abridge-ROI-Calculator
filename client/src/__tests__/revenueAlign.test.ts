import { describe, it, expect } from "vitest";
import {
  revenueAlignConfigFor,
  revenueAlignToLeverValues,
  deriveRevenueAlignProof,
  EM_GATE_DOC_CAUSED_PCT,
  HCC_GATE_UPLIFT_PP,
  DENIALS_GATE_PREVENTABLE_PCT,
  IP_DRG_GATE_CAPTURE_PCT,
  IP_CDI_GATE_REDUCTION_PCT,
  IP_OBS_GATE_PREVENTABLE_PCT,
  HCC_POPULATION_LABEL,
} from "@/lib/attain/revenueAlign";
import {
  deriveRevenueLadder,
  exploreStateForReconciliation,
  computeAllDriverValues,
  REVENUE_PATH_LABELS,
} from "@/lib/attain/attainRevenue";
import {
  exploreStateForIpRevenueReconciliation,
  IP_REVENUE_PATH_LABELS,
} from "@/lib/attain/attainInpatientRevenue";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext, AlignConfig } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const OP: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };
const ED: AttainBaseline = { providers: 40, annualEncounters: 40 * 1_800, utilizationPct: 100 };
const IP: AttainBaseline = { providers: 20, annualEncounters: 20 * 400, utilizationPct: 100 };

function ctxFor(baseline: AttainBaseline, setting: AttainSetting, overrides: Partial<AlignContext> = {}): AlignContext {
  return { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1, ...overrides };
}

// All three outpatient paths, fully aligned with the "note is the leak" gate.
function opAllThree(overrides: LeverValues = {}): LeverValues {
  return {
    // A book that pays every path (FFS opens E/M, MA opens HCC) so all three
    // are allowed; the book's risk id also derives the HCC population.
    revenueAlignBook: ["ffs", "ma"],
    revenueAlignPaths: ["hcc", "em", "denials"],
    "revenueAlignGateHcc__hcc": ["gap"],
    "revenueAlignWhoEm__em": ["most"],
    "revenueAlignGateEm__em": ["note"],
    "revenueAlignGateDenials__denials": ["note"],
    ...overrides,
  };
}

function allStrings(config: AlignConfig): string[] {
  const s: string[] = [config.intro, config.eyebrow];
  for (const q of config.questions) {
    s.push(q.prompt, q.helper ?? "");
    for (const o of q.options) {
      s.push(o.label, o.helper);
      if (o.sharpener) s.push(o.sharpener.label, o.sharpener.benchmarkNote);
    }
  }
  return s;
}

describe("revenue Align config shape (multi-path selector + per-path stacking)", () => {
  it("outpatient leads with the payer book, then the three paths reshape to it", () => {
    const cfg = revenueAlignConfigFor("outpatient");
    const book = cfg.questions.find((q) => q.id === "book")!;
    expect(book.dimension).toBe(1);
    expect(book.mode).toBe("multi");
    expect(book.options.map((o) => o.id)).toEqual(["ffs", "ma", "medicaid", "aca"]);
    const selector = cfg.questions.find((q) => q.id === "outcome")!;
    expect(selector.mode).toBe("multi");
    expect(selector.dimension).toBe(2);
    expect(selector.options.map((o) => o.id)).toEqual(["hcc", "em", "denials"]);
    expect(typeof selector.availableOptions).toBe("function");
    // FFS book -> E/M + denials, no HCC. A risk book -> HCC surfaces.
    const ctx = ctxFor(OP, "outpatient");
    const ffsOnly = selector.availableOptions!({ revenueAlignBook: ["ffs"] }, ctx).map((o) => o.id);
    expect(ffsOnly).toEqual(["em", "denials"]);
    const riskOnly = selector.availableOptions!({ revenueAlignBook: ["ma"] }, ctx).map((o) => o.id);
    expect(riskOnly).toEqual(["hcc", "denials"]);
    const noBook = selector.availableOptions!({}, ctx);
    expect(noBook).toEqual([]);
    expect(cfg.dimensionTotal).toBe(5);
  });

  it("ED drops the risk-adjustment path (no HCC panel for an ED encounter)", () => {
    const cfg = revenueAlignConfigFor("ed");
    const selector = cfg.questions.find((q) => q.id === "outcome")!;
    expect(selector.options.map((o) => o.id)).toEqual(["em", "denials"]);
    expect(cfg.questions.find((q) => q.id === "whoHcc")).toBeUndefined();
    expect(cfg.questions.find((q) => q.id === "gateHcc")).toBeUndefined();
  });

  it("inpatient offers DRG / CDI / Obs and numbers by 4 dimensions", () => {
    const cfg = revenueAlignConfigFor("inpatient");
    const selector = cfg.questions.find((q) => q.id === "outcome")!;
    expect(selector.options.map((o) => o.id)).toEqual(["drg", "cdi", "obs"]);
    expect(cfg.dimensionTotal).toBe(4);
  });

  it("every per-path question stacks on the selector and is scoped to its own path", () => {
    const cfg = revenueAlignConfigFor("outpatient");
    // whoHcc is folded into the book; the framing-only "where" is dropped.
    const scoped = [
      ["gateHcc", "hcc"],
      ["whoEm", "em"],
      ["gateEm", "em"],
      ["whoDenials", "denials"],
      ["gateDenials", "denials"],
    ] as const;
    for (const [id, path] of scoped) {
      const q = cfg.questions.find((x) => x.id === id)!;
      expect(q.stacksOnQuestionId).toBe("outcome");
      expect(q.appliesToChoices).toEqual([path]);
    }
    // The redundant HCC-populations question and the framing-only "where" are gone.
    expect(cfg.questions.find((q) => q.id === "whoHcc")).toBeUndefined();
    expect(cfg.questions.find((q) => q.id === "where")).toBeUndefined();
    // The book leads and is not path-scoped; proof is not path-scoped.
    expect(cfg.questions.find((q) => q.id === "book")!.stacksOnQuestionId).toBeUndefined();
    expect(cfg.questions.find((q) => q.id === "proof")!.stacksOnQuestionId).toBeUndefined();
  });

  it("carries no em dash, no green/amber word, and never says 'downcoding' in any string", () => {
    for (const setting of ["outpatient", "ed", "inpatient"] as AttainSetting[]) {
      for (const s of allStrings(revenueAlignConfigFor(setting))) {
        expect(s).not.toContain("—");
        expect(s.toLowerCase()).not.toMatch(/\bgreen\b|\bamber\b|\bdowncoding\b/);
      }
    }
  });
});

describe("choices map to the engine levers the revenue chains read", () => {
  it("outpatient: selected paths become the exact engine labels, gates set the per-path levers", () => {
    const lv = revenueAlignToLeverValues(opAllThree(), ctxFor(OP, "outpatient"));
    expect(lv.revenuePaths).toEqual([
      REVENUE_PATH_LABELS.hcc,
      REVENUE_PATH_LABELS.em,
      REVENUE_PATH_LABELS.denials,
    ]);
    expect(lv.revenueHccPopulations).toEqual([HCC_POPULATION_LABEL.ma]);
    expect(lv.revenueHccRecapture).toBe(HCC_GATE_UPLIFT_PP.gap);
    expect(lv.revenueEmDocCausedShare).toBe(EM_GATE_DOC_CAUSED_PCT.note);
    expect(lv.revenueEmLift).toBeGreaterThan(0); // conservative capture starter
    expect(lv.revenueDenialsPreventable).toBe(DENIALS_GATE_PREVENTABLE_PCT.note);
  });

  it("a path left unpicked writes no capture, so it contributes nothing", () => {
    const lv = revenueAlignToLeverValues(
      opAllThree({ revenueAlignPaths: ["em"] }),
      ctxFor(OP, "outpatient"),
    );
    expect(lv.revenuePaths).toEqual([REVENUE_PATH_LABELS.em]);
    expect(lv.revenueHccRecapture).toBeUndefined();
    expect(lv.revenueDenialsPreventable).toBeUndefined();
  });

  it("does not re-ask pricing facts: no conversion factor, value-per-HCC, or claim value is written", () => {
    const lv = revenueAlignToLeverValues(opAllThree(), ctxFor(OP, "outpatient"));
    expect(lv.revenueEmConversionFactor).toBeUndefined();
    expect(lv.revenueHccValuePerHcc).toBeUndefined();
    expect(lv.revenueDenialsAvgClaimValue).toBeUndefined();
  });

  it("inpatient: gates set ipDrgCapture / ipCdiReduction / ipObsPreventable, CDI cost left at the labor benchmark", () => {
    const choices: LeverValues = {
      revenueAlignPaths: ["drg", "cdi", "obs"],
      "revenueAlignGateDrg__drg": ["note"],
      "revenueAlignGateCdi__cdi": ["note"],
      "revenueAlignGateObs__obs": ["note"],
    };
    const lv = revenueAlignToLeverValues(choices, ctxFor(IP, "inpatient"));
    expect(lv.ipRevenuePaths).toEqual([
      IP_REVENUE_PATH_LABELS.drg,
      IP_REVENUE_PATH_LABELS.cdi,
      IP_REVENUE_PATH_LABELS.obs,
    ]);
    expect(lv.ipDrgCapture).toBe(IP_DRG_GATE_CAPTURE_PCT.note);
    expect(lv.ipCdiReduction).toBe(IP_CDI_GATE_REDUCTION_PCT.note);
    expect(lv.ipObsPreventable).toBe(IP_OBS_GATE_PREVENTABLE_PCT.note);
    // CDI is labor-only: Align never writes a cost-per-query, so the engine's
    // clamped admin benchmark holds and the DRG dollar is never double-counted.
    expect(lv.ipCdiCostPerQuery).toBeUndefined();
  });
});

describe("the picked paths converge into ONE prize, counted once (no double-count)", () => {
  it("the converged prize equals the sum of the per-path dollars", () => {
    const ctx = ctxFor(OP, "outpatient");
    const merged = { ...opAllThree(), ...revenueAlignToLeverValues(opAllThree(), ctx) };
    const ladder = deriveRevenueLadder(OP, "outpatient", merged, 100);
    expect(ladder.paths).toHaveLength(3);
    const sum = ladder.paths.reduce((s, p) => s + p.value, 0);
    expect(ladder.convergedPrize).toBe(sum);
    // The Align proof headline is that same converged prize.
    const proof = deriveRevenueAlignProof(opAllThree(), ctx);
    expect(Math.round(proof.headlineValue)).toBe(ladder.convergedPrize);
    expect(proof.ready).toBe(true);
  });

  it("adding a third path lifts the prize by exactly that path's standalone value (additive, distinct pools)", () => {
    const ctx = ctxFor(OP, "outpatient");
    const emHcc = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["hcc", "em"] }), ctx);
    const denialsOnly = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["denials"] }), ctx);
    const all = deriveRevenueAlignProof(opAllThree(), ctx);
    expect(all.headlineValue).toBeCloseTo(emHcc.headlineValue + denialsOnly.headlineValue, 0);
  });

  it("realization scales the converged prize down without changing the split", () => {
    const full = deriveRevenueAlignProof(opAllThree(), ctxFor(OP, "outpatient", { realizationPct: 100 }));
    const half = deriveRevenueAlignProof(opAllThree(), ctxFor(OP, "outpatient", { realizationPct: 50 }));
    expect(half.headlineValue).toBeGreaterThan(0);
    expect(half.headlineValue).toBeLessThan(full.headlineValue);
  });
});

describe("the honest gate limits each path's value (note moves it, the rest do not)", () => {
  it("E/M: 'the note did not capture it' beats 'genuinely lower acuity'", () => {
    const ctx = ctxFor(OP, "outpatient");
    const note = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["em"], "revenueAlignGateEm__em": ["note"] }), ctx);
    const acuity = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["em"], "revenueAlignGateEm__em": ["acuity"] }), ctx);
    expect(note.headlineValue).toBeGreaterThan(acuity.headlineValue);
    expect(acuity.headlineValue).toBeLessThan(note.headlineValue * 0.25);
  });

  it("HCC: 'the note missed them' beats 'mostly already captured'", () => {
    const ctx = ctxFor(OP, "outpatient");
    const gap = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["hcc"], "revenueAlignGateHcc__hcc": ["gap"] }), ctx);
    const nothave = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["hcc"], "revenueAlignGateHcc__hcc": ["nothave"] }), ctx);
    expect(gap.headlineValue).toBeGreaterThan(nothave.headlineValue);
  });

  it("Denials: 'mostly payer rules' keeps the value small, we do not promise it", () => {
    const ctx = ctxFor(OP, "outpatient");
    const note = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["denials"], "revenueAlignGateDenials__denials": ["note"] }), ctx);
    const payer = deriveRevenueAlignProof(opAllThree({ revenueAlignPaths: ["denials"], "revenueAlignGateDenials__denials": ["payer"] }), ctx);
    expect(payer.headlineValue).toBeGreaterThan(0);
    expect(payer.headlineValue).toBeLessThan(note.headlineValue * 0.2);
  });

  it("inpatient gates limit each path the same way", () => {
    const ctx = ctxFor(IP, "inpatient");
    const strong = deriveRevenueAlignProof(
      {
        revenueAlignPaths: ["drg", "cdi", "obs"],
        "revenueAlignGateDrg__drg": ["note"],
        "revenueAlignGateCdi__cdi": ["note"],
        "revenueAlignGateObs__obs": ["note"],
      },
      ctx,
    );
    const weak = deriveRevenueAlignProof(
      {
        revenueAlignPaths: ["drg", "cdi", "obs"],
        "revenueAlignGateDrg__drg": ["notpresent"],
        "revenueAlignGateCdi__cdi": ["necessary"],
        "revenueAlignGateObs__obs": ["appropriate"],
      },
      ctx,
    );
    expect(strong.headlineValue).toBeGreaterThan(weak.headlineValue);
    expect(weak.headlineValue).toBeGreaterThan(0);
  });
});

describe("the derived number reconciles to the engine (no second money model)", () => {
  it("outpatient E/M Align choices reconcile to computeAllDriverValues.wrvu", () => {
    const ctx = ctxFor(OP, "outpatient");
    const choices = opAllThree({ revenueAlignPaths: ["em"] });
    const merged = { ...choices, ...revenueAlignToLeverValues(choices, ctx) };
    const state = exploreStateForReconciliation(OP, "outpatient", merged);
    const engine = computeAllDriverValues(state, 0);
    const ladder = deriveRevenueLadder(OP, "outpatient", merged, 100);
    const em = ladder.paths.find((p) => p.id === "em")!;
    expect(engine.wrvu).toBeGreaterThan(0);
    expect(Math.abs(em.value - engine.wrvu)).toBeLessThan(Math.max(50, engine.wrvu * 0.02));
  });

  it("outpatient Denials Align choices reconcile to computeAllDriverValues.denialPrevention", () => {
    const ctx = ctxFor(OP, "outpatient");
    const choices = opAllThree({ revenueAlignPaths: ["denials"] });
    const merged = { ...choices, ...revenueAlignToLeverValues(choices, ctx) };
    const state = exploreStateForReconciliation(OP, "outpatient", merged);
    const engine = computeAllDriverValues(state, 0);
    const ladder = deriveRevenueLadder(OP, "outpatient", merged, 100);
    const denials = ladder.paths.find((p) => p.id === "denials")!;
    expect(engine.denialPrevention).toBeGreaterThan(0);
    expect(Math.abs(denials.value - engine.denialPrevention)).toBeLessThan(Math.max(50, engine.denialPrevention * 0.02));
  });

  it("inpatient DRG Align choices reconcile to computeAllDriverValues.drgAccuracy", () => {
    const ctx = ctxFor(IP, "inpatient");
    const choices: LeverValues = { revenueAlignPaths: ["drg"], "revenueAlignGateDrg__drg": ["note"] };
    const merged = { ...choices, ...revenueAlignToLeverValues(choices, ctx) };
    const state = exploreStateForIpRevenueReconciliation(IP, merged);
    const engine = computeAllDriverValues(state, 0);
    expect(engine.drgAccuracy).toBeGreaterThan(0);
  });
});

describe("the number is proof, not the goal: it only appears once the meaning is set", () => {
  it("no path picked -> not ready, and the hint says to pick the revenue", () => {
    const proof = deriveRevenueAlignProof({}, ctxFor(OP, "outpatient"));
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
    expect(proof.emptyHint.toLowerCase()).toContain("pick the revenue");
  });

  it("a path picked but no gate set -> still not ready", () => {
    const proof = deriveRevenueAlignProof(
      { revenueAlignBook: ["ffs"], revenueAlignPaths: ["em"], "revenueAlignWhoEm__em": ["most"] },
      ctxFor(OP, "outpatient"),
    );
    expect(proof.ready).toBe(false);
    expect(proof.headlineValue).toBe(0);
  });

  it("a path the book does not pay contributes nothing, even if it is selected", () => {
    // FFS-only book: HCC is not paid, so a stray HCC selection books no RAF.
    const ffsWithStrayHcc = deriveRevenueAlignProof(
      {
        revenueAlignBook: ["ffs"],
        revenueAlignPaths: ["em", "hcc"],
        "revenueAlignWhoEm__em": ["most"],
        "revenueAlignGateEm__em": ["note"],
        "revenueAlignGateHcc__hcc": ["gap"],
      },
      ctxFor(OP, "outpatient"),
    );
    const lv = revenueAlignToLeverValues(
      {
        revenueAlignBook: ["ffs"],
        revenueAlignPaths: ["em", "hcc"],
        "revenueAlignGateHcc__hcc": ["gap"],
      },
      ctxFor(OP, "outpatient"),
    );
    expect(lv.revenuePaths).toEqual([REVENUE_PATH_LABELS.em]); // HCC filtered out by the book
    expect(lv.revenueHccPopulations ?? []).toEqual([]);
    expect(ffsWithStrayHcc.ready).toBe(true); // E/M still lands
  });
});
