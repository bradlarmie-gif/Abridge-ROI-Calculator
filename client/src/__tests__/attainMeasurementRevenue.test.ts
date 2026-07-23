import { describe, it, expect } from "vitest";
import { deriveRevenueMeasurementPlan } from "@/lib/attain/attainMeasurement";
import { revenueAlignToLeverValues } from "@/lib/attain/revenueAlign";
import { computeRevenueChain, deriveRevenueLadder } from "@/lib/attain/attainRevenue";
import { computeIpRevenueChain, deriveIpRevenueLadder } from "@/lib/attain/attainInpatientRevenue";
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
import type { AttainSetting } from "@/lib/attain/attainTypes";

const OP_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };
const IP_BASELINE: AttainBaseline = { providers: 30, annualEncounters: 30 * 400, utilizationPct: 100 };

function ctx(setting: AttainSetting, baseline: AttainBaseline): AlignContext {
  return { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 };
}

/** Simulate what AlignStep persists: the raw per-path selections PLUS the engine
 * levers the revenue config maps them to, exactly as the app writes both. */
function alignValues(choices: LeverValues, setting: AttainSetting, baseline: AttainBaseline): LeverValues {
  return { ...choices, ...revenueAlignToLeverValues(choices, ctx(setting, baseline)) };
}

function modelFor(choices: LeverValues, setting: AttainSetting = "outpatient", baseline: AttainBaseline = OP_BASELINE) {
  // Outpatient revenue is now book-gated: default a book that pays every path
  // (FFS opens E/M, MA opens HCC) unless the test sets its own, so the per-path
  // assertions below stay about the paths, not the book.
  const withBook =
    setting === "outpatient" && choices.revenueAlignBook === undefined
      ? { revenueAlignBook: ["ffs", "ma"], ...choices }
      : choices;
  const values = alignValues(withBook, setting, baseline);
  return deriveRevenueMeasurementPlan(baseline, setting, values, { realizationPct: 100 });
}

// Outpatient: E/M + Risk Adjustment (HCC), each with its own who + gate, plus
// the two proofs that badge the matching signals.
const OP_CHOICES: LeverValues = {
  revenueAlignBook: ["ffs", "ma"],
  revenueAlignPaths: ["em", "hcc"],
  revenueAlignWhoEm__em: ["most"],
  revenueAlignGateEm__em: ["note"],
  revenueAlignGateHcc__hcc: ["gap"],
  revenueAlignProof: ["losmix", "recapture"],
};

const IP_CHOICES: LeverValues = {
  revenueAlignPaths: ["drg", "cdi"],
  revenueAlignGateDrg__drg: ["note"],
  revenueAlignGateCdi__cdi: ["note"],
  revenueAlignProof: ["cmi", "queryrate"],
};

describe("revenue measurement plan — stacks per chosen path from the Align state", () => {
  it("is not ready until at least one path is picked", () => {
    expect(modelFor({}).ready).toBe(false);
    expect(modelFor({ revenueAlignPaths: ["em"], revenueAlignGateEm__em: ["note"] }).ready).toBe(true);
  });

  it("builds the shared root, then a capture + outcome link for EACH chosen path", () => {
    const links = modelFor(OP_CHOICES).links;
    // Root first, then per-path stacking. deriveRevenueLadder orders hcc, em.
    expect(links[0].id).toBe("documentation");
    expect(links.map((l) => l.id)).toEqual([
      "documentation",
      "hcc-capture",
      "hcc-outcome",
      "em-capture",
      "em-outcome",
    ]);
    // Sequential scorecard numbering across the whole stacked chain.
    expect(links.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
    // Each link carries a group label so the surface can section per path.
    expect(links[0].groupLabel).toBe("The shared root");
    expect(links[1].groupLabel).toBe("Risk adjustment");
    expect(links[3].groupLabel).toBe("E/M level accuracy");
  });

  it("shows ONLY the paths the partner picked on Align", () => {
    const emOnly = modelFor({ revenueAlignPaths: ["em"], revenueAlignGateEm__em: ["note"], revenueAlignWhoEm__em: ["most"] });
    const ids = emOnly.links.map((l) => l.id);
    expect(ids).toContain("em-capture");
    expect(ids).not.toContain("hcc-capture");
    expect(ids).not.toContain("denials-capture");
  });

  it("prices each path's OUTCOME link off its ladder value, and the promise off the converged prize", () => {
    const values = alignValues(OP_CHOICES, "outpatient", OP_BASELINE);
    const ladder = deriveRevenueLadder(OP_BASELINE, "outpatient", values, 100);
    const model = deriveRevenueMeasurementPlan(OP_BASELINE, "outpatient", values, { realizationPct: 100 });
    expect(model.prize).toBe(ladder.convergedPrize);
    expect(model.prize).toBeGreaterThan(0);
    const emOutcome = model.links.find((l) => l.id === "em-outcome")!;
    const emRevenue = emOutcome.metrics.find((m) => m.id === "em-captured-revenue")!;
    expect(emRevenue.baseline).toBe("$0 today");
    expect(emRevenue.defaultTarget).toMatch(/\/ yr/);
  });

  it("scales the prize with scope (more providers -> more captured revenue)", () => {
    const small = modelFor(OP_CHOICES, "outpatient", { ...OP_BASELINE, providers: 10, annualEncounters: 10 * 3_500 });
    const big = modelFor(OP_CHOICES, "outpatient", { ...OP_BASELINE, providers: 80, annualEncounters: 80 * 3_500 });
    expect(small.prize).toBeGreaterThan(0);
    expect(big.prize).toBeGreaterThan(small.prize);
  });
});

describe("revenue measurement plan — dynamic metrics and baselines from Align", () => {
  it("pre-selects and badges the capture metric the partner named as proof", () => {
    const model = modelFor(OP_CHOICES);
    const emCapture = model.links.find((l) => l.id === "em-capture")!;
    expect(emCapture.metrics.find((m) => m.id === "em-level-mix")!.fromProof).toBe(true);
    const hccCapture = model.links.find((l) => l.id === "hcc-capture")!;
    expect(hccCapture.metrics.find((m) => m.id === "hcc-recapture-rate")!.fromProof).toBe(true);
  });

  it("badges the E/M honest ceiling metric when the gate is answered on Align", () => {
    const answered = modelFor({ revenueAlignPaths: ["em"], revenueAlignWhoEm__em: ["most"], revenueAlignGateEm__em: ["note"] });
    const below = answered.links.find((l) => l.id === "em-capture")!.metrics.find((m) => m.id === "em-below-supported")!;
    expect(below.fromProof).toBe(true);
    // Its baseline is a percentage, tagged as a benchmark, never faked.
    expect(below.baseline).toMatch(/%/);
    expect(below.baselineTag).toBe("benchmark");
    expect(below.defaultTarget).toMatch(/^under /);
  });

  it("tags the HCC recapture baseline as their number when they entered a rate, else a benchmark", () => {
    const bench = modelFor(OP_CHOICES).links.find((l) => l.id === "hcc-capture")!.metrics.find((m) => m.id === "hcc-recapture-rate")!;
    expect(bench.baselineTag).toBe("benchmark");
    const withTheirs = modelFor({ ...OP_CHOICES, revenueHccCurrentRecapture: 70 })
      .links.find((l) => l.id === "hcc-capture")!.metrics.find((m) => m.id === "hcc-recapture-rate")!;
    expect(withTheirs.baselineTag).toBe("data");
    expect(withTheirs.baseline).toMatch(/70/);
  });

  it("uses plain language for the E/M leak, never 'downcoding'", () => {
    const emCapture = modelFor(OP_CHOICES).links.find((l) => l.id === "em-capture")!;
    const below = emCapture.metrics.find((m) => m.id === "em-below-supported")!;
    expect(below.helper.toLowerCase()).not.toContain("downcod");
    expect(below.helper).toMatch(/below the care you delivered/i);
  });

  it("builds the ED E/M + denials paths with their real metric menus", () => {
    const ED_CHOICES: LeverValues = {
      revenueAlignPaths: ["em", "denials"],
      revenueAlignWhoEm__em: ["most"],
      revenueAlignGateEm__em: ["note"],
      revenueAlignGateDenials__denials: ["note"],
      revenueAlignProof: ["denialrate"],
    };
    const ED_BASELINE: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };
    const model = modelFor(ED_CHOICES, "ed", ED_BASELINE);
    const ids = model.links.map((l) => l.id);
    expect(ids).toContain("em-capture");
    expect(ids).toContain("denials-capture");
    expect(ids).not.toContain("hcc-capture"); // ED has no HCC path
    const denialsCapture = model.links.find((l) => l.id === "denials-capture")!;
    const rate = denialsCapture.metrics.find((m) => m.id === "denials-mednec-rate")!;
    expect(rate.fromProof).toBe(true); // named as proof
    expect(rate.baseline).toMatch(/%/);
    // Denials framing stays consistent with the engine: prevented, not new margin.
    expect(denialsCapture.metrics.some((m) => m.id === "denials-appeal-overturn")).toBe(true);
    expect(model.prize).toBeGreaterThan(0);
  });

  it("stacks the inpatient DRG/CDI paths and prices CDI on admin time only", () => {
    const values = alignValues(IP_CHOICES, "inpatient", IP_BASELINE);
    const ladder = deriveIpRevenueLadder(IP_BASELINE, values, 100);
    const model = deriveRevenueMeasurementPlan(IP_BASELINE, "inpatient", values, { realizationPct: 100 });
    expect(model.links.map((l) => l.id)).toEqual([
      "documentation",
      "drg-capture",
      "drg-outcome",
      "cdi-capture",
      "cdi-outcome",
    ]);
    const cdiOutcome = model.links.find((l) => l.id === "cdi-outcome")!;
    expect(cdiOutcome.title).toMatch(/CDI time is saved/i);
    expect(model.prize).toBe(ladder.convergedPrize);
    // The DRG proof (case mix index) badges the CMI metric.
    expect(model.links.find((l) => l.id === "drg-capture")!.metrics.find((m) => m.id === "drg-cmi")!.fromProof).toBe(true);
  });
});

describe("revenue measurement plan — owners and dates default blank; targets editable", () => {
  it("owner and by-when are blank until the partner sets them", () => {
    expect(measurementOwner(undefined, "em-captured-revenue")).toBe("");
    expect(measurementByWhen(undefined, "em-captured-revenue")).toBe("");
    expect(measurementOwner({ measurement: {} }, "hcc-recapture-rate")).toBe("");
  });

  it("the commitment is the coders/providers acting on the documentation, with a blank owner", () => {
    const model = modelFor(OP_CHOICES);
    expect(model.commitment.teach.toLowerCase()).toContain("acting on the better documentation");
    expect(model.commitment.ownerLabel).toMatch(/coders and providers acting/i);
  });

  it("target falls back to the derived default until overridden", () => {
    const model = modelFor(OP_CHOICES);
    const emRevenue = model.links.find((l) => l.id === "em-outcome")!.metrics.find((m) => m.id === "em-captured-revenue")!;
    expect(measurementTarget(undefined, "em-captured-revenue", emRevenue.defaultTarget)).toBe(emRevenue.defaultTarget);
    const planning: AttainPlanning = { measurement: { entries: { "em-captured-revenue": { target: "$500K / yr" } } } };
    expect(measurementTarget(planning, "em-captured-revenue", emRevenue.defaultTarget)).toBe("$500K / yr");
  });

  it("the monthly check does not fabricate a 100% tick", () => {
    const model = modelFor(OP_CHOICES);
    expect(model.monthlyCheckTeach).not.toMatch(/100%/);
    expect(model.monthlyCheckTeach).toMatch(/not a number you assert/i);
  });
});

describe("revenue measurement plan — persists through save and load", () => {
  function planFor(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "outpatient", goal: "revenue" },
      goals: ["revenue"],
      valuesByGoal: { revenue: alignValues(OP_CHOICES, "outpatient", OP_BASELINE) },
      commitments: {},
      goalOwnerByPriority: {},
      progressEntries: {},
      baseline: OP_BASELINE,
      freedTimeSplit: 50,
      realizationByGoal: {},
      planCadence: "monthly",
      planning,
    };
  }

  it("round-trips the chosen revenue metrics, targets, owners, dates, and commitment", () => {
    const planning: AttainPlanning = {
      measurement: {
        promiseByWhen: "2026-12-31",
        commitmentOwner: "VP Rev Cycle",
        commitmentByWhen: "2026-09-01",
        chosen: { "em-capture": ["em-below-supported", "em-level-mix"], "hcc-outcome": ["hcc-captured-revenue"] },
        entries: {
          "em-captured-revenue": { target: "$400K / yr", owner: "CFO", byWhen: "2026-10-01" },
          "hcc-recapture-rate": { owner: "Coding lead" },
        },
      },
    };
    const decoded = decodeAttain(encodeAttain(planFor(planning)));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toEqual(planning.measurement);
    expect(measurementChosen(decoded?.planning, "em-capture", ["x"])).toEqual(["em-below-supported", "em-level-mix"]);
    expect(measurementTarget(decoded?.planning, "em-captured-revenue", "default")).toBe("$400K / yr");
    expect(measurementOwner(decoded?.planning, "hcc-recapture-rate")).toBe("Coding lead");
  });

  it("an older revenue plan with no measurement layer decodes and falls back to defaults", () => {
    const decoded = decodeAttain(encodeAttain(planFor({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toBeUndefined();
    expect(measurementChosen(decoded?.planning, "em-capture", ["em-below-supported"])).toEqual(["em-below-supported"]);
    expect(measurementOwner(decoded?.planning, "em-captured-revenue")).toBe("");
  });
});
