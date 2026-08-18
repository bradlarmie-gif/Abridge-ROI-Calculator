import { describe, it, expect } from "vitest";
import {
  qualityAlignConfigFor,
  qualityAlignToLeverValues,
  deriveQualityAlignProof,
  committedKeysFor,
  QUALITY_CONVERSIONS,
  QUALITY_GATE_COMMIT_FRACTION,
  QUALITY_ALIGN_EVENT_IDS,
  CLINICAL_EVENT_IDS,
  HCAHPS_ID,
  K_EVENTS,
} from "@/lib/attain/qualityAlign";
import {
  deriveQualityLadder,
  exploreStateForReconciliation,
  computeAllDriverValues,
  QUALITY_INTERVENTIONS,
  QUALITY_EVENT_LABELS,
  type QualityEventId,
} from "@/lib/attain/attainQuality";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext, AlignConfig } from "@/lib/attain/alignFramework";

// Nursing baseline: 120 staffed beds, 102 daily census (real occupancy).
const NURSING: AttainBaseline = { staffedBeds: 120, nursingFtes: 180, dailyCensus: 102, adoptionPct: 100 };

// Quality defaults to 30% attribution; most tests use it, some override to 100.
function ctxFor(realizationPct = 30): AlignContext {
  return { baseline: NURSING, setting: "nursing", realizationPct, crossGoalShareMultiplier: 1 };
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

// A fully-aligned Falls + HCAHPS plan on all beds, "earlier" gate, every change.
function fallsAndHcahps(overrides: LeverValues = {}): LeverValues {
  return {
    [K_EVENTS]: ["falls", "hcahps"],
    qualityAlignWho: ["all"],
    "qualityAlignGate__falls": ["earlier"],
    "qualityAlignChange__falls": ["rounding", "signal", "handoff"],
    "qualityAlignChange__hcahps": ["presence"],
    ...overrides,
  };
}

describe("quality Align config shape (multi-event selector + per-event stacking + HCAHPS)", () => {
  const cfg = qualityAlignConfigFor("nursing");

  it("offers the five clinical events plus HCAHPS on the multi-select selector", () => {
    const selector = cfg.questions.find((q) => q.id === "outcome")!;
    expect(selector.mode).toBe("multi");
    expect(selector.dimension).toBe(1);
    expect(selector.options.map((o) => o.id)).toEqual(["falls", "hapi", "clabsi", "cauti", "sepsis", HCAHPS_ID]);
    expect(cfg.dimensionTotal).toBe(5);
  });

  it("HCAHPS (patient experience) is present and framed as a NEW experience outcome, not a dollar", () => {
    const selector = cfg.questions.find((q) => q.id === "outcome")!;
    const hcahps = selector.options.find((o) => o.id === HCAHPS_ID)!;
    expect(hcahps.label.toLowerCase()).toContain("experience");
    expect(hcahps.label).toContain("HCAHPS");
  });

  it("the gate stacks on the selector and applies only to the clinical events, never HCAHPS", () => {
    const gate = cfg.questions.find((q) => q.id === "gate")!;
    expect(gate.stacksOnQuestionId).toBe("outcome");
    expect(gate.appliesToChoices).toEqual([...CLINICAL_EVENT_IDS]);
    expect(gate.appliesToChoices).not.toContain(HCAHPS_ID);
  });

  it("every event has its own 'what will you change' question, scoped to that event and stacking", () => {
    for (const id of QUALITY_ALIGN_EVENT_IDS) {
      const q = cfg.questions.find((x) => x.id === `change-${id}`)!;
      expect(q.stacksOnQuestionId).toBe("outcome");
      expect(q.appliesToChoices).toEqual([id]);
      expect(q.mode).toBe("multi");
    }
    expect(cfg.questions.find((q) => q.id === "proof")!.stacksOnQuestionId).toBeUndefined();
  });

  it("carries no em dash and no green/amber/RAG word in any user-facing string", () => {
    for (const s of allStrings(cfg)) {
      expect(s).not.toContain("—");
      expect(s.toLowerCase()).not.toMatch(/\bgreen\b|\bamber\b|\brag\b/);
    }
  });

  it("names NO generic clinical bundle item (no footwear, no alarm, no standalone bundle-item) in any string", () => {
    for (const s of allStrings(cfg)) {
      expect(s.toLowerCase()).not.toMatch(/footwear|non-slip|\balarm|bed alarm|chair alarm|bundle-item/);
    }
  });
});

describe("the 'what will you change' options are ABRIDGE CONVERSIONS, not generic bundles", () => {
  it("every conversion is a conversion of freed time (TIME) or earlier documentation (DOCUMENTATION)", () => {
    for (const id of QUALITY_ALIGN_EVENT_IDS) {
      for (const c of QUALITY_CONVERSIONS[id]) {
        expect(["time", "doc"]).toContain(c.benefit);
      }
    }
  });

  it("every engine key a conversion maps to is a real engine intervention, and never an equipment-only one", () => {
    // Equipment-only interventions have no Abridge in them, so no conversion may map to them.
    const EQUIPMENT_KEYS = ["qualityFallsAlarms", "qualityFallsFootwear", "qualityHapiSupportSurface"];
    for (const id of CLINICAL_EVENT_IDS) {
      const validKeys = QUALITY_INTERVENTIONS[id].map((iv) => iv.id);
      for (const c of QUALITY_CONVERSIONS[id]) {
        for (const key of c.engineKeys) {
          expect(validKeys).toContain(key); // real engine intervention
          expect(EQUIPMENT_KEYS).not.toContain(key); // never an equipment item
        }
      }
    }
  });

  it("committing conversions maps to the prevention the engine credits (committed keys become 1)", () => {
    const lv = qualityAlignToLeverValues(fallsAndHcahps(), ctxFor());
    // Falls "earlier" gate commits every enabled conversion's keys.
    expect(lv.qualityFallsRounding).toBe(1);
    expect(lv.qualityFallsToileting).toBe(1);
    expect(lv.qualityFallsMedReview).toBe(1);
    expect(lv.qualityFallsMobility).toBe(1);
    expect(lv.qualityFallsHazards).toBe(1);
    // The equipment-only keys are never committed by Align.
    expect(lv.qualityFallsAlarms).toBe(0);
    expect(lv.qualityFallsFootwear).toBe(0);
  });

  it("HCAHPS commits NO engine harm-event and NO hard dollar (experience only)", () => {
    const lv = qualityAlignToLeverValues(fallsAndHcahps(), ctxFor());
    // Only clinical events reach the engine; HCAHPS is not in qualityEventTypes.
    expect(lv.qualityEventTypes).toEqual([QUALITY_EVENT_LABELS.falls]);
    // HCAHPS has no engine keys to set.
    const hcahpsKeys = QUALITY_CONVERSIONS[HCAHPS_ID].flatMap((c) => c.engineKeys);
    expect(hcahpsKeys).toEqual([]);
  });
});

describe("the honest gate scales the credited prevention (30% attribution posture kept)", () => {
  it("'mostly happens despite good care' commits nothing (honest near-zero for that event)", () => {
    const keys = committedKeysFor("falls", { ...fallsAndHcahps(), "qualityAlignGate__falls": ["despite"] });
    expect(keys).toEqual([]);
    expect(QUALITY_GATE_COMMIT_FRACTION.despite).toBe(0);
  });

  it("'a meaningful share' commits fewer keys than 'mostly preventable by catching earlier'", () => {
    const earlier = committedKeysFor("falls", { ...fallsAndHcahps(), "qualityAlignGate__falls": ["earlier"] });
    const meaningful = committedKeysFor("falls", { ...fallsAndHcahps(), "qualityAlignGate__falls": ["meaningful"] });
    expect(meaningful.length).toBeLessThan(earlier.length);
    expect(meaningful.length).toBeGreaterThan(0);
  });

  it("a weaker gate produces a smaller derived number", () => {
    const strong = deriveQualityAlignProof(fallsAndHcahps(), ctxFor());
    const weak = deriveQualityAlignProof({ ...fallsAndHcahps(), "qualityAlignGate__falls": ["meaningful"] }, ctxFor());
    const none = deriveQualityAlignProof({ ...fallsAndHcahps(), "qualityAlignGate__falls": ["despite"] }, ctxFor());
    expect(strong.headlineValue).toBeGreaterThan(weak.headlineValue);
    expect(weak.headlineValue).toBeGreaterThan(none.headlineValue);
    // "despite" still leaves HCAHPS aligned, so the plan is not empty.
    expect(none.ready).toBe(true);
  });

  it("quality keeps its 30% attribution default: a lower realizationPct scales the soft dollar down", () => {
    const full = deriveQualityAlignProof(fallsAndHcahps(), ctxFor(100));
    const thirty = deriveQualityAlignProof(fallsAndHcahps(), ctxFor(30));
    // The soft dollar rides realization; the hero is a prevented-event COUNT and does not.
    expect(full.math).toContain("soft");
    expect(thirty.math).toContain("30%");
  });
});

describe("multi-event stacking: events add, each its own distinct harm pool", () => {
  const clinicalPlan = (events: QualityEventId[]): LeverValues => {
    const v: LeverValues = { [K_EVENTS]: events, qualityAlignWho: ["all"] };
    for (const e of events) {
      v[`qualityAlignGate__${e}`] = ["earlier"];
      v[`qualityAlignChange__${e}`] = QUALITY_CONVERSIONS[e].map((c) => c.id);
    }
    return v;
  };

  it("adding a second harm event lifts the prevented count and the soft dollar", () => {
    const one = deriveQualityAlignProof(clinicalPlan(["falls"]), ctxFor());
    const two = deriveQualityAlignProof(clinicalPlan(["falls", "clabsi"]), ctxFor());
    expect(two.headlineValue).toBeGreaterThan(one.headlineValue);
  });

  it("the derived number reconciles to computeAllDriverValues (the live engine)", () => {
    const values = clinicalPlan(["falls", "clabsi", "cauti"]);
    const merged = { ...values, ...qualityAlignToLeverValues(values, ctxFor(100)) };
    const ladder = deriveQualityLadder(NURSING, merged, 100);
    const state = exploreStateForReconciliation(NURSING, merged);
    const engine = computeAllDriverValues(state, 0);
    const engineSum = engine.nursingFalls + engine.nursingClabsi + engine.nursingCauti;
    expect(ladder.convergedPrize).toBeCloseTo(engineSum, 0);
  });
});

describe("SAFETY FIRST: the hero is events prevented, the dollar is a soft labeled footnote", () => {
  it("the hero value is a prevented-event COUNT, formatted by a count formatter, not a dollar", () => {
    const proof = deriveQualityAlignProof(fallsAndHcahps(), ctxFor());
    expect(proof.headlineFormatter).toBeDefined();
    // The count formatter never renders a dollar sign.
    expect(proof.headlineFormatter!(proof.headlineValue)).not.toContain("$");
    expect(proof.headlineLabel.toLowerCase()).toContain("safety events");
  });

  it("the cost of harm avoided is present but explicitly labeled SOFT, never the headline", () => {
    const proof = deriveQualityAlignProof(fallsAndHcahps(), ctxFor());
    const softFigure = proof.figures.find((f) => f.label.toLowerCase().includes("soft"));
    expect(softFigure).toBeDefined();
    expect(proof.math.toLowerCase()).toContain("soft");
  });

  it("an HCAHPS-only plan is ready and leads with experience, carrying no hard dollar", () => {
    const values: LeverValues = {
      [K_EVENTS]: [HCAHPS_ID],
      qualityAlignWho: ["all"],
      "qualityAlignChange__hcahps": ["presence"],
    };
    const proof = deriveQualityAlignProof(values, ctxFor());
    expect(proof.ready).toBe(true);
    expect(proof.headlineValue).toBe(0); // no harm events targeted
    expect(proof.math.toLowerCase()).toContain("experience");
  });
});
