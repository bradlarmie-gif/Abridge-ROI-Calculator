import { describe, it, expect } from "vitest";
import { deriveCapacityMeasurementPlan } from "@/lib/attain/attainMeasurement";
import { capacityAlignToLeverValues } from "@/lib/attain/capacityAlign";
import {
  computeCapacityChain,
  exploreStateForReconciliation,
  computeAllDriverValues,
} from "@/lib/attain/attainCapacity";
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

const NURSING_BASELINE: AttainBaseline = { nursingFtes: 200, staffedBeds: 300, dailyCensus: 240 };

function ctx(baseline: AttainBaseline): AlignContext {
  return { baseline, setting: "nursing", realizationPct: 100, crossGoalShareMultiplier: 1 };
}

/** Simulate what AlignStep persists: the raw selections PLUS the engine levers
 * the capacity config maps them to, exactly as the app writes both. */
function alignValues(choices: LeverValues, baseline: AttainBaseline): LeverValues {
  return { ...choices, ...capacityAlignToLeverValues(choices, ctx(baseline)) };
}

function modelFor(choices: LeverValues, baseline: AttainBaseline = NURSING_BASELINE) {
  const values = alignValues(choices, baseline);
  const chain = computeCapacityChain(baseline, values);
  return deriveCapacityMeasurementPlan(baseline, values, {
    realizedOtHoursAvoided: chain.realizedOtHoursAvoided,
    prize: chain.prize,
  });
}

const FULL_CHOICES: LeverValues = {
  capacityAlignOutcome: ["cost"],
  capacityAlignWho: ["all"],
  capacityAlignGate: ["documentation"],
  capacityAlignWhere: ["postshift"],
  capacityAlignProof: ["othours", "budget"],
};

describe("capacity measurement plan — derives from the capacity Align state", () => {
  it("is not ready until who and gate are chosen", () => {
    expect(modelFor({}).ready).toBe(false);
    expect(modelFor({ capacityAlignWho: ["all"] }).ready).toBe(false);
    expect(modelFor({ capacityAlignWho: ["all"], capacityAlignGate: ["documentation"] }).ready).toBe(true);
  });

  it("builds the three causal links in chain order", () => {
    const links = modelFor(FULL_CHOICES).links;
    expect(links.map((l) => l.id)).toEqual(["charting", "finish", "overtime"]);
    expect(links.map((l) => l.n)).toEqual([1, 2, 3]);
  });

  it("offers the right metric menu per link", () => {
    const model = modelFor(FULL_CHOICES);
    const charting = model.links.find((l) => l.id === "charting")!;
    expect(charting.metrics.map((m) => m.id)).toEqual(["minutes-saved-per-note", "post-shift-charting-minutes"]);
    const finish = model.links.find((l) => l.id === "finish")!;
    expect(finish.metrics.map((m) => m.id)).toEqual(["on-time-shift-completion", "doc-attributable-share"]);
    const overtime = model.links.find((l) => l.id === "overtime")!;
    expect(overtime.metrics.map((m) => m.id)).toEqual(
      expect.arrayContaining(["ot-hours-per-nurse-week", "ot-hours-avoided", "ot-dollars-saved"]),
    );
  });
});

describe("capacity measurement plan — baselines from their Align + Starting Point", () => {
  it("prices the outcome (link 3) off their scope numbers and the chain payoff", () => {
    const model = modelFor(FULL_CHOICES);
    const overtime = model.links.find((l) => l.id === "overtime")!;
    const avoided = overtime.metrics.find((m) => m.id === "ot-hours-avoided")!;
    expect(avoided.defaultTarget).toMatch(/\/ yr/);
    const dollars = overtime.metrics.find((m) => m.id === "ot-dollars-saved")!;
    expect(dollars.defaultTarget).toMatch(/\/ yr/);
    expect(model.prize).toBeGreaterThan(0);
  });

  it("sets the documentation-attributable share baseline off the where answer", () => {
    // postshift maps to a 60% documentation-attributable share.
    const model = modelFor(FULL_CHOICES);
    const share = model.links.find((l) => l.id === "finish")!.metrics.find((m) => m.id === "doc-attributable-share")!;
    expect(share.baseline).toMatch(/60%/);
    expect(share.baselineTag).toBe("benchmark");
    // A missed-lunch where maps to a smaller share.
    const lunches = modelFor({ ...FULL_CHOICES, capacityAlignWhere: ["lunches"] });
    expect(lunches.links.find((l) => l.id === "finish")!.metrics.find((m) => m.id === "doc-attributable-share")!.baseline).toMatch(/40%/);
  });

  it("scales the prize with the nurse scope", () => {
    const all = modelFor(FULL_CHOICES);
    const focused = modelFor({ ...FULL_CHOICES, capacityAlignWho: ["focused"], capacityAlignWhoCount: 40 });
    expect(focused.prize).toBeGreaterThan(0);
    expect(focused.prize).toBeLessThan(all.prize);
  });

  it("tags the OT-per-nurse and on-time baselines as benchmarks, the avoided count as data", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.links.find((l) => l.id === "overtime")!.metrics.find((m) => m.id === "ot-hours-per-nurse-week")!.baselineTag).toBe("benchmark");
    expect(model.links.find((l) => l.id === "finish")!.metrics.find((m) => m.id === "on-time-shift-completion")!.baselineTag).toBe("benchmark");
    expect(model.links.find((l) => l.id === "overtime")!.metrics.find((m) => m.id === "ot-hours-avoided")!.baselineTag).toBe("data");
  });
});

describe("capacity measurement plan — dynamic to the Align choices", () => {
  it("pre-selects the post-shift-charting metric when a where is chosen", () => {
    const model = modelFor(FULL_CHOICES);
    const charting = model.links.find((l) => l.id === "charting")!;
    expect(charting.metrics.find((m) => m.id === "post-shift-charting-minutes")!.fromProof).toBe(true);
    expect(charting.defaultChosen).toEqual(["post-shift-charting-minutes"]);
    // No where chosen -> minutes-saved is the default instead.
    const noWhere = modelFor({ capacityAlignWho: ["all"], capacityAlignGate: ["documentation"] });
    const nwCharting = noWhere.links.find((l) => l.id === "charting")!;
    expect(nwCharting.metrics.find((m) => m.id === "post-shift-charting-minutes")!.fromProof).toBe(false);
    expect(nwCharting.defaultChosen).toEqual(["minutes-saved-per-note"]);
  });

  it("pre-selects the proof metrics the partner named on Align", () => {
    const model = modelFor(FULL_CHOICES);
    const overtime = model.links.find((l) => l.id === "overtime")!;
    expect(overtime.metrics.find((m) => m.id === "ot-hours-per-nurse-week")!.fromProof).toBe(true);
    expect(overtime.metrics.find((m) => m.id === "ot-dollars-saved")!.fromProof).toBe(true);
    expect(overtime.defaultChosen).toEqual(expect.arrayContaining(["ot-hours-per-nurse-week", "ot-dollars-saved"]));
    // On-time proof badges the on-time-completion metric on link 2.
    const ontime = modelFor({ ...FULL_CHOICES, capacityAlignProof: ["ontime"] });
    expect(ontime.links.find((l) => l.id === "finish")!.metrics.find((m) => m.id === "on-time-shift-completion")!.fromProof).toBe(true);
  });

  it("adds Love Stories on link 3 only when it is named as proof", () => {
    const withLove = modelFor({ ...FULL_CHOICES, capacityAlignProof: ["lovestories"] });
    const overtime = withLove.links.find((l) => l.id === "overtime")!;
    expect(overtime.metrics.find((m) => m.id === "love-stories")).toBeTruthy();
    expect(overtime.defaultChosen).toContain("love-stories");
    const without = modelFor({ ...FULL_CHOICES, capacityAlignProof: ["othours"] });
    expect(without.links.find((l) => l.id === "overtime")!.metrics.find((m) => m.id === "love-stories")).toBeUndefined();
  });
});

describe("capacity measurement plan — the honest gate collapses the chain", () => {
  it("closes the make-or-break link and zeroes the number when the overtime is short staffing", () => {
    const model = modelFor({ ...FULL_CHOICES, capacityAlignGate: ["staffing"] });
    const finish = model.links.find((l) => l.id === "finish")!;
    expect(finish.blocked).toBe(true);
    expect(finish.metrics).toEqual([]);
    expect(finish.defaultChosen).toEqual([]);
    expect(finish.blockedReason).toMatch(/short staffing/i);
    expect(model.prize).toBe(0);
    // The outcome link reads an honest zero, never a stray number.
    const overtime = model.links.find((l) => l.id === "overtime")!;
    expect(overtime.metrics.find((m) => m.id === "ot-dollars-saved")!.defaultTarget).toMatch(/honest zero/i);
  });

  it("closes the make-or-break link when the overtime is census surges", () => {
    const model = modelFor({ ...FULL_CHOICES, capacityAlignGate: ["census"] });
    expect(model.links.find((l) => l.id === "finish")!.blocked).toBe(true);
    expect(model.prize).toBe(0);
  });

  it("keeps the chain open for the documentation gate", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.links.find((l) => l.id === "finish")!.blocked).toBe(false);
    expect(model.prize).toBeGreaterThan(0);
  });
});

describe("capacity measurement plan — owners and dates default blank", () => {
  it("owner and by-when are blank until the partner sets them", () => {
    expect(measurementOwner(undefined, "ot-hours-avoided")).toBe("");
    expect(measurementByWhen(undefined, "ot-hours-avoided")).toBe("");
    expect(measurementOwner({ measurement: {} }, "on-time-shift-completion")).toBe("");
    expect(measurementByWhen({ measurement: { entries: {} } }, "on-time-shift-completion")).toBe("");
  });

  it("the commitment carries the leaving-on-time copy and the no-double-count with retention", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.commitment.ownerLabel).toMatch(/leaving on time/i);
    expect(model.commitment.teach).toMatch(/leaving on time/i);
    // States plainly: overtime wages now vs replacement cost future, counted once.
    expect(model.commitment.teach).toMatch(/replacement cost/i);
    expect(model.commitment.teach).toMatch(/counted once/i);
    expect(measurementOwner(undefined, "commitment")).toBe("");
  });

  it("target falls back to the derived default until overridden", () => {
    const model = modelFor(FULL_CHOICES);
    const dollars = model.links.find((l) => l.id === "overtime")!.metrics.find((m) => m.id === "ot-dollars-saved")!;
    expect(measurementTarget(undefined, "ot-dollars-saved", dollars.defaultTarget)).toBe(dollars.defaultTarget);
    const planning: AttainPlanning = { measurement: { entries: { "ot-dollars-saved": { target: "$300K / yr" } } } };
    expect(measurementTarget(planning, "ot-dollars-saved", dollars.defaultTarget)).toBe("$300K / yr");
  });
});

describe("capacity measurement plan — reconciles to the nursingOvertime engine", () => {
  it("the plan prize equals computeAllDriverValues().nursingOvertime", () => {
    const values = alignValues(FULL_CHOICES, NURSING_BASELINE);
    const chain = computeCapacityChain(NURSING_BASELINE, values);
    const model = deriveCapacityMeasurementPlan(NURSING_BASELINE, values, {
      realizedOtHoursAvoided: chain.realizedOtHoursAvoided,
      prize: chain.prize,
    });
    const engine = computeAllDriverValues(exploreStateForReconciliation(NURSING_BASELINE, values), 0);
    expect(model.prize).toBe(engine.nursingOvertime);
    expect(model.realizedVisits).toBe(chain.realizedOtHoursAvoided);
  });
});

describe("capacity measurement plan — persists through save and load", () => {
  function planFor(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "nursing", goal: "capacity" },
      goals: ["capacity"],
      valuesByGoal: { capacity: alignValues(FULL_CHOICES, NURSING_BASELINE) },
      commitments: {},
      goalOwnerByPriority: {},
      progressEntries: {},
      baseline: NURSING_BASELINE,
      freedTimeSplit: 50,
      realizationByGoal: {},
      planCadence: "monthly",
      planning,
    };
  }

  it("round-trips the chosen capacity metrics, targets, owners, dates, and commitment", () => {
    const planning: AttainPlanning = {
      measurement: {
        promiseByWhen: "2026-12-31",
        commitmentOwner: "Dir. Nursing Ops",
        commitmentByWhen: "2026-09-01",
        chosen: { charting: ["post-shift-charting-minutes"], overtime: ["ot-hours-avoided", "ot-dollars-saved"] },
        entries: {
          "ot-dollars-saved": { target: "$300K / yr", owner: "CFO", byWhen: "2026-10-01" },
          "ot-hours-avoided": { owner: "Nurse Manager" },
        },
      },
    };
    const decoded = decodeAttain(encodeAttain(planFor(planning)));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toEqual(planning.measurement);
    expect(measurementChosen(decoded?.planning, "overtime", ["x"])).toEqual(["ot-hours-avoided", "ot-dollars-saved"]);
    expect(measurementTarget(decoded?.planning, "ot-dollars-saved", "$1 / yr")).toBe("$300K / yr");
    expect(measurementOwner(decoded?.planning, "ot-hours-avoided")).toBe("Nurse Manager");
  });

  it("an older capacity plan with no measurement layer decodes and falls back to defaults", () => {
    const decoded = decodeAttain(encodeAttain(planFor({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toBeUndefined();
    expect(measurementChosen(decoded?.planning, "overtime", ["ot-hours-avoided"])).toEqual(["ot-hours-avoided"]);
    expect(measurementOwner(decoded?.planning, "ot-hours-avoided")).toBe("");
  });
});
