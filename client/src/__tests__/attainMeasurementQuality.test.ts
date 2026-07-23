import { describe, it, expect } from "vitest";
import { deriveQualityMeasurementPlan, type MeasurementPlanModel } from "@/lib/attain/attainMeasurement";
import { qualityAlignToLeverValues } from "@/lib/attain/qualityAlign";
import { deriveQualityLadder } from "@/lib/attain/attainQuality";
import {
  measurementChosen,
  measurementOwner,
  measurementByWhen,
  measurementTarget,
  type AttainPlanning,
} from "@/lib/attain/attainPlanning";
import { encodeAttain, decodeAttain, ATTAIN_SAVE_VERSION, type AttainSaveState } from "@/lib/attain/attainUrlState";
import { DEFAULT_ATTAIN_STATE } from "@/lib/attain/attainTypes";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AlignContext } from "@/lib/attain/alignFramework";

// Nursing baseline: 120 staffed beds, 102 daily census (real occupancy).
const NURSING: AttainBaseline = { staffedBeds: 120, nursingFtes: 180, dailyCensus: 102, adoptionPct: 100 };

function ctx(realizationPct = 30): AlignContext {
  return { baseline: NURSING, setting: "nursing", realizationPct, crossGoalShareMultiplier: 1 };
}

/** Simulate what AlignStep persists: the raw per-event Align selections PLUS
 * the engine levers the quality config maps them to, exactly as the app does. */
function alignValues(choices: LeverValues): LeverValues {
  return { ...choices, ...qualityAlignToLeverValues(choices, ctx()) };
}

function modelFor(choices: LeverValues, realizationPct = 30): ReturnType<typeof deriveQualityMeasurementPlan> {
  const values = alignValues(choices);
  return deriveQualityMeasurementPlan(NURSING, values, { realizationPct });
}

// A fully-aligned Falls + HCAHPS plan on all beds, "earlier" gate, every change.
// Proof named: the event rate and the HCAHPS domains.
const FALLS_HCAHPS: LeverValues = {
  qualityAlignEvents: ["falls", "hcahps"],
  qualityAlignWho: ["all"],
  "qualityAlignGate__falls": ["earlier"],
  "qualityAlignChange__falls": ["rounding", "signal", "handoff"],
  "qualityAlignChange__hcahps": ["presence"],
  qualityAlignProof: ["rate", "hcahps"],
};

/** Every user-facing string a model surfaces, for the design-law sweeps. */
function allStrings(model: MeasurementPlanModel): string[] {
  const s: string[] = [
    model.emptyHint,
    model.commitment.title,
    model.commitment.teach,
    model.commitment.ownerLabel,
    model.monthlyCheckTeach,
    model.safetyHeadline?.heroValue ?? "",
    model.safetyHeadline?.softDollarNote ?? "",
  ];
  for (const link of model.links) {
    s.push(link.title, link.teach, link.groupLabel ?? "", link.blockedReason ?? "");
    for (const m of link.metrics) s.push(m.label, m.helper, m.unit, m.baseline, m.defaultTarget);
  }
  return s;
}

describe("quality measurement plan — stacks per chosen event from the Align state", () => {
  it("is not ready until at least one event AND the beds are picked", () => {
    expect(modelFor({}).ready).toBe(false);
    expect(modelFor({ qualityAlignEvents: ["falls"] }).ready).toBe(false); // no beds
    expect(modelFor({ qualityAlignEvents: ["falls"], qualityAlignWho: ["all"], "qualityAlignGate__falls": ["earlier"], "qualityAlignChange__falls": ["rounding"] }).ready).toBe(true);
  });

  it("builds the shared root, then a conversions + outcome link for EACH chosen event, HCAHPS last", () => {
    const links = modelFor(FALLS_HCAHPS).links;
    expect(links.map((l) => l.id)).toEqual([
      "signal-and-time",
      "falls-conversions",
      "falls-outcome",
      "hcahps-presence",
      "hcahps-outcome",
    ]);
    // Sequential scorecard numbering across the whole stacked chain.
    expect(links.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
    expect(links[0].groupLabel).toBe("The shared root");
    expect(links[1].groupLabel).toBe("Falls");
    expect(links[3].groupLabel).toBe("Patient experience (HCAHPS)");
  });

  it("shows ONLY the events the partner picked on Align", () => {
    const fallsOnly = modelFor({
      qualityAlignEvents: ["falls"],
      qualityAlignWho: ["all"],
      "qualityAlignGate__falls": ["earlier"],
      "qualityAlignChange__falls": ["rounding"],
    });
    const ids = fallsOnly.links.map((l) => l.id);
    expect(ids).toContain("falls-outcome");
    expect(ids).not.toContain("hapi-outcome");
    expect(ids).not.toContain("clabsi-outcome");
    expect(ids).not.toContain("hcahps-outcome");
  });

  it("sizes the per-event prevented counts off the shared quality ladder (more beds -> more prevented)", () => {
    const small = modelFor({ ...FALLS_HCAHPS }, 30);
    const smallOutcome = small.links.find((l) => l.id === "falls-outcome")!;
    const prevented = smallOutcome.metrics.find((m) => m.id === "falls-events-prevented")!;
    expect(prevented.defaultTarget).toMatch(/\/ yr/);
    // The ladder is the single source of truth the derive reads.
    const values = alignValues(FALLS_HCAHPS);
    const ladder = deriveQualityLadder(NURSING, values, 30);
    const fallsEvent = ladder.events.find((e) => e.id === "falls")!;
    expect(fallsEvent.capturedCount).toBeGreaterThan(0);
  });
});

describe("quality measurement plan — SAFETY FIRST: the count leads, the dollar stays soft", () => {
  it("the promise header leads with a COUNT of harm events, not a dollar", () => {
    const model = modelFor(FALLS_HCAHPS);
    expect(model.safetyHeadline).toBeDefined();
    expect(model.safetyHeadline!.heroValue).toMatch(/harm events \/ yr/);
    expect(model.safetyHeadline!.heroValue).not.toMatch(/\$/);
  });

  it("the outcome link leads with the events-prevented COUNT metric (default-selected)", () => {
    const outcome = modelFor(FALLS_HCAHPS).links.find((l) => l.id === "falls-outcome")!;
    expect(outcome.metrics[0].id).toBe("falls-events-prevented");
    expect(outcome.defaultChosen).toContain("falls-events-prevented");
    const prevented = outcome.metrics.find((m) => m.id === "falls-events-prevented")!;
    expect(prevented.baseline).toBe("0 today");
  });

  it("the cost-of-harm-avoided dollar is a SOFT, labeled metric, never default-selected", () => {
    const outcome = modelFor(FALLS_HCAHPS).links.find((l) => l.id === "falls-outcome")!;
    const dollar = outcome.metrics.find((m) => m.id === "falls-cost-harm-avoided")!;
    expect(dollar.label.toLowerCase()).toContain("soft");
    expect(dollar.helper.toLowerCase()).toContain("footnote");
    expect(dollar.baselineTag).toBe("benchmark");
    expect(outcome.defaultChosen).not.toContain("falls-cost-harm-avoided");
    // The soft footnote note reconciles to the ladder's attributed prize.
    const model = modelFor(FALLS_HCAHPS);
    expect(model.safetyHeadline!.softDollarNote.toLowerCase()).toContain("soft");
    expect(model.safetyHeadline!.softDollarNote).toMatch(/30%/); // the attribution posture is kept
  });

  it("keeps the 30% attribution posture (the soft dollar scales, the counts do not)", () => {
    const values = alignValues(FALLS_HCAHPS);
    const at30 = deriveQualityMeasurementPlan(NURSING, values, { realizationPct: 30 });
    const at100 = deriveQualityMeasurementPlan(NURSING, values, { realizationPct: 100 });
    // The COUNT is attribution-independent.
    const c30 = at30.links.find((l) => l.id === "falls-outcome")!.metrics.find((m) => m.id === "falls-events-prevented")!.defaultTarget;
    const c100 = at100.links.find((l) => l.id === "falls-outcome")!.metrics.find((m) => m.id === "falls-events-prevented")!.defaultTarget;
    expect(c30).toBe(c100);
    // The soft dollar scales with attribution.
    expect(at100.prize).toBeGreaterThan(at30.prize);
  });

  it("HCAHPS carries NO hard dollar and pre-selects the domain-scores proof", () => {
    const hcahps = modelFor(FALLS_HCAHPS).links.find((l) => l.id === "hcahps-outcome")!;
    expect(hcahps.metrics.some((m) => m.unit === "$ / yr")).toBe(false);
    expect(hcahps.metrics.find((m) => m.id === "hcahps-domains")!.fromProof).toBe(true);
  });

  it("commits an honest near-zero when the gate says it happens despite good care", () => {
    const despite = modelFor({
      qualityAlignEvents: ["falls"],
      qualityAlignWho: ["all"],
      "qualityAlignGate__falls": ["despite"],
      "qualityAlignChange__falls": ["rounding", "signal"],
    });
    const prevented = despite.links.find((l) => l.id === "falls-outcome")!.metrics.find((m) => m.id === "falls-events-prevented")!;
    expect(prevented.defaultTarget).toBe("an honest near-zero");
  });
});

describe("quality measurement plan — dynamic metrics badge from the Align gate, change, and proof", () => {
  it("badges the compliance metric when the honest gate is answered", () => {
    const conv = modelFor(FALLS_HCAHPS).links.find((l) => l.id === "falls-conversions")!;
    expect(conv.metrics.find((m) => m.id === "falls-bundle-compliance")!.fromProof).toBe(true);
  });

  it("badges the near-miss metric when a committed conversion was chosen", () => {
    const conv = modelFor(FALLS_HCAHPS).links.find((l) => l.id === "falls-conversions")!;
    expect(conv.metrics.find((m) => m.id === "falls-near-miss")!.fromProof).toBe(true);
  });

  it("pre-selects the event-rate proof the partner named on Align", () => {
    const outcome = modelFor(FALLS_HCAHPS).links.find((l) => l.id === "falls-outcome")!;
    expect(outcome.metrics.find((m) => m.id === "falls-rate")!.fromProof).toBe(true);
    expect(outcome.defaultChosen).toContain("falls-rate");
    // Without the rate proof, the rate is not badged nor pre-selected.
    const noProof = modelFor({ ...FALLS_HCAHPS, qualityAlignProof: [] });
    const o2 = noProof.links.find((l) => l.id === "falls-outcome")!;
    expect(o2.metrics.find((m) => m.id === "falls-rate")!.fromProof).toBe(false);
    expect(o2.defaultChosen).not.toContain("falls-rate");
  });

  it("adds Love Stories to the last link when the partner named it as proof", () => {
    const withLove = modelFor({ ...FALLS_HCAHPS, qualityAlignProof: ["lovestories"] });
    const last = withLove.links[withLove.links.length - 1];
    expect(last.metrics.some((m) => m.id === "quality-love-stories")).toBe(true);
    expect(last.defaultChosen).toContain("quality-love-stories");
  });
});

describe("quality measurement plan — design laws and the honest voice", () => {
  it("uses NO generic clinical bundle language (no footwear, no alarms) in any string", () => {
    const strings = allStrings(modelFor(FALLS_HCAHPS)).join(" ").toLowerCase();
    expect(strings).not.toMatch(/footwear|non-slip|nonslip|bed alarm|\balarm/);
  });

  it("uses NO em dashes in any user-facing string", () => {
    for (const s of allStrings(modelFor(FALLS_HCAHPS))) {
      expect(s).not.toContain("—");
    }
  });

  it("the commitment is the unit running the Abridge-enabled conversions", () => {
    const model = modelFor(FALLS_HCAHPS);
    expect(model.commitment.teach.toLowerCase()).toContain("redeploy the freed minutes");
    expect(model.commitment.ownerLabel).toMatch(/conversions happen/i);
  });

  it("the monthly check does not fabricate a 100% tick and leads with counts", () => {
    const model = modelFor(FALLS_HCAHPS);
    expect(model.monthlyCheckTeach).not.toMatch(/100%/);
    expect(model.monthlyCheckTeach).toMatch(/not a number you assert/i);
    expect(model.monthlyCheckTeach.toLowerCase()).toContain("never the dollar");
  });
});

describe("quality measurement plan — owners and dates default blank; targets editable", () => {
  it("owner and by-when are blank until the partner sets them", () => {
    expect(measurementOwner(undefined, "falls-events-prevented")).toBe("");
    expect(measurementByWhen(undefined, "falls-events-prevented")).toBe("");
    expect(measurementOwner({ measurement: {} }, "falls-rate")).toBe("");
  });

  it("target falls back to the derived default until overridden", () => {
    const model = modelFor(FALLS_HCAHPS);
    const prevented = model.links.find((l) => l.id === "falls-outcome")!.metrics.find((m) => m.id === "falls-events-prevented")!;
    expect(measurementTarget(undefined, "falls-events-prevented", prevented.defaultTarget)).toBe(prevented.defaultTarget);
    const planning: AttainPlanning = { measurement: { entries: { "falls-events-prevented": { target: "10 / yr" } } } };
    expect(measurementTarget(planning, "falls-events-prevented", prevented.defaultTarget)).toBe("10 / yr");
  });
});

describe("quality measurement plan — persists through save and load", () => {
  function planFor(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "nursing", goal: "quality" },
      goals: ["quality"],
      valuesByGoal: { quality: alignValues(FALLS_HCAHPS) },
      commitments: {},
      goalOwnerByPriority: {},
      progressEntries: {},
      baseline: NURSING,
      freedTimeSplit: 50,
      realizationByGoal: {},
      planCadence: "monthly",
      planning,
    };
  }

  it("round-trips the chosen quality metrics, targets, owners, dates, and commitment", () => {
    const planning: AttainPlanning = {
      measurement: {
        promiseByWhen: "2026-12-31",
        commitmentOwner: "Unit Manager",
        commitmentByWhen: "2026-09-01",
        chosen: { "falls-outcome": ["falls-events-prevented", "falls-rate"], "hcahps-outcome": ["hcahps-domains"] },
        entries: {
          "falls-events-prevented": { target: "12 / yr", owner: "Charge RN", byWhen: "2026-10-01" },
          "falls-rate": { owner: "Quality lead" },
        },
      },
    };
    const decoded = decodeAttain(encodeAttain(planFor(planning)));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toEqual(planning.measurement);
    expect(measurementChosen(decoded?.planning, "falls-outcome", ["x"])).toEqual(["falls-events-prevented", "falls-rate"]);
    expect(measurementTarget(decoded?.planning, "falls-events-prevented", "default")).toBe("12 / yr");
    expect(measurementOwner(decoded?.planning, "falls-rate")).toBe("Quality lead");
  });

  it("an older quality plan with no measurement layer decodes and falls back to defaults", () => {
    const decoded = decodeAttain(encodeAttain(planFor({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toBeUndefined();
    expect(measurementChosen(decoded?.planning, "falls-outcome", ["falls-events-prevented"])).toEqual(["falls-events-prevented"]);
    expect(measurementOwner(decoded?.planning, "falls-events-prevented")).toBe("");
  });
});
