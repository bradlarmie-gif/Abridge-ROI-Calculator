import { describe, it, expect } from "vitest";
import { deriveEdAccessMeasurementPlan } from "@/lib/attain/attainMeasurement";
import { edAccessAlignToLeverValues } from "@/lib/attain/edAccessAlign";
import {
  computeEdAccessChain,
  exploreStateForEdAccessReconciliation,
  computeAllDriverValues,
} from "@/lib/attain/attainEdAccess";
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

const BASELINE: AttainBaseline = { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 100 };

function ctx(baseline: AttainBaseline): AlignContext {
  return { baseline, setting: "ed", realizationPct: 100, crossGoalShareMultiplier: 1 };
}

/** Simulate what AlignStep persists: the raw selections PLUS the engine levers
 * the ED access config maps them to, exactly as the app writes both. */
function alignValues(choices: LeverValues, baseline: AttainBaseline): LeverValues {
  return { ...choices, ...edAccessAlignToLeverValues(choices, ctx(baseline)) };
}

function modelFor(choices: LeverValues, baseline: AttainBaseline = BASELINE) {
  const values = alignValues(choices, baseline);
  const chain = computeEdAccessChain(baseline, values);
  return deriveEdAccessMeasurementPlan(baseline, values, 1, {
    realizedRecovered: chain.recovery.realizedRecovered,
    capturedAdmissions: chain.recovery.capturedAdmissions,
    prize: chain.payoff.value,
  });
}

const FULL_CHOICES: LeverValues = {
  edAccessAlignOutcome: ["lwbs", "admissions"],
  edAccessAlignWho: ["all"],
  edAccessAlignGate: ["documentation"],
  edAccessAlignWhere: ["triage", "doortoprovider"],
  edAccessAlignLwbsRate: 8,
  edAccessAlignProof: ["lwbsrate", "recovered", "admissions"],
};

describe("ED access measurement plan — derives from the ED access Align state", () => {
  it("is not ready until who and gate are chosen", () => {
    expect(modelFor({}).ready).toBe(false);
    expect(modelFor({ edAccessAlignWho: ["all"] }).ready).toBe(false);
    expect(modelFor({ edAccessAlignWho: ["all"], edAccessAlignGate: ["documentation"] }).ready).toBe(true);
  });

  it("builds the four causal links in chain order", () => {
    const links = modelFor(FULL_CHOICES).links;
    expect(links.map((l) => l.id)).toEqual(["throughput", "door", "lwbs", "recovered"]);
    expect(links.map((l) => l.n)).toEqual([1, 2, 3, 4]);
  });

  it("offers the right metric menu per link", () => {
    const model = modelFor(FULL_CHOICES);
    const throughput = model.links.find((l) => l.id === "throughput")!;
    expect(throughput.metrics.map((m) => m.id)).toEqual(["minutes-saved-per-note", "freed-throughput-hours"]);
    const door = model.links.find((l) => l.id === "door")!;
    expect(door.metrics.map((m) => m.id)).toEqual(["door-to-provider-time", "share-freed-time-throughput"]);
    const lwbs = model.links.find((l) => l.id === "lwbs")!;
    expect(lwbs.metrics.map((m) => m.id)).toEqual(["lwbs-rate", "recoverable-pool"]);
    const recovered = model.links.find((l) => l.id === "recovered")!;
    expect(recovered.metrics.map((m) => m.id)).toEqual(
      expect.arrayContaining(["recovered-visits", "captured-admissions", "recovered-margin"]),
    );
  });
});

describe("ED access measurement plan — baselines from their Align + Starting Point", () => {
  it("prices the outcome (link 4) off their scope numbers and the chain payoff", () => {
    const model = modelFor(FULL_CHOICES);
    const recovered = model.links.find((l) => l.id === "recovered")!;
    expect(recovered.metrics.find((m) => m.id === "recovered-visits")!.defaultTarget).toMatch(/\/ yr/);
    expect(recovered.metrics.find((m) => m.id === "recovered-margin")!.defaultTarget).toMatch(/\/ yr/);
    expect(model.prize).toBeGreaterThan(0);
  });

  it("tags the LWBS baseline as their own number when typed, a benchmark when blank", () => {
    const typed = modelFor(FULL_CHOICES);
    expect(typed.links.find((l) => l.id === "lwbs")!.metrics.find((m) => m.id === "lwbs-rate")!.baselineTag).toBe("data");
    const blank = modelFor({ ...FULL_CHOICES, edAccessAlignLwbsRate: 0 });
    expect(blank.links.find((l) => l.id === "lwbs")!.metrics.find((m) => m.id === "lwbs-rate")!.baselineTag).toBe("benchmark");
  });

  it("tags the door-to-provider and recovered-visit baselines correctly", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.links.find((l) => l.id === "door")!.metrics.find((m) => m.id === "door-to-provider-time")!.baselineTag).toBe("benchmark");
    expect(model.links.find((l) => l.id === "recovered")!.metrics.find((m) => m.id === "recovered-visits")!.baselineTag).toBe("data");
  });

  it("scales the prize with the provider scope", () => {
    const all = modelFor(FULL_CHOICES);
    const focused = modelFor({ ...FULL_CHOICES, edAccessAlignWho: ["focused"], edAccessAlignWhoCount: 10 });
    expect(focused.prize).toBeGreaterThan(0);
    expect(focused.prize).toBeLessThan(all.prize);
  });
});

describe("ED access measurement plan — dynamic to the Align choices", () => {
  it("pre-selects the door metric when door-to-provider is where the loss shows up", () => {
    const model = modelFor(FULL_CHOICES);
    const door = model.links.find((l) => l.id === "door")!;
    expect(door.metrics.find((m) => m.id === "door-to-provider-time")!.fromProof).toBe(true);
  });

  it("pre-selects the proof metrics the partner named on Align", () => {
    const model = modelFor(FULL_CHOICES);
    const lwbs = model.links.find((l) => l.id === "lwbs")!;
    expect(lwbs.metrics.find((m) => m.id === "lwbs-rate")!.fromProof).toBe(true);
    const recovered = model.links.find((l) => l.id === "recovered")!;
    expect(recovered.metrics.find((m) => m.id === "recovered-visits")!.fromProof).toBe(true);
    expect(recovered.metrics.find((m) => m.id === "captured-admissions")!.fromProof).toBe(true);
    expect(recovered.defaultChosen).toEqual(expect.arrayContaining(["recovered-visits", "captured-admissions"]));
  });

  it("shows the captured-admissions metric as out of scope when admissions are not an outcome", () => {
    const noAdm = modelFor({ ...FULL_CHOICES, edAccessAlignOutcome: ["lwbs"], edAccessAlignProof: ["recovered"] });
    const captured = noAdm.links.find((l) => l.id === "recovered")!.metrics.find((m) => m.id === "captured-admissions")!;
    expect(captured.defaultTarget).toMatch(/add admissions on Align/i);
    expect(captured.fromProof).toBe(false);
  });
});

describe("ED access measurement plan — the honest gate collapses the chain", () => {
  it("closes the make-or-break door link and zeroes the number when the leak is staffing or beds", () => {
    const model = modelFor({ ...FULL_CHOICES, edAccessAlignGate: ["staffing"] });
    const door = model.links.find((l) => l.id === "door")!;
    expect(door.blocked).toBe(true);
    expect(door.metrics).toEqual([]);
    expect(door.defaultChosen).toEqual([]);
    expect(door.blockedReason).toMatch(/staffing or beds/i);
    expect(model.prize).toBe(0);
    // The outcome link reads an honest zero, never a stray number.
    const recovered = model.links.find((l) => l.id === "recovered")!;
    expect(recovered.metrics.find((m) => m.id === "recovered-margin")!.defaultTarget).toMatch(/honest zero/i);
  });

  it("keeps the chain open for the documentation gate", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.links.find((l) => l.id === "door")!.blocked).toBe(false);
    expect(model.prize).toBeGreaterThan(0);
  });
});

describe("ED access measurement plan — owners and dates default blank", () => {
  it("owner and by-when are blank until the partner sets them", () => {
    expect(measurementOwner(undefined, "recovered-visits")).toBe("");
    expect(measurementByWhen(undefined, "recovered-visits")).toBe("");
    expect(measurementOwner({ measurement: {} }, "door-to-provider-time")).toBe("");
    expect(measurementByWhen({ measurement: { entries: {} } }, "door-to-provider-time")).toBe("");
  });

  it("the commitment carries the freed-time-to-throughput copy, a capability not a promise", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.commitment.ownerLabel).toMatch(/throughput/i);
    expect(model.commitment.teach).toMatch(/door to a provider/i);
    expect(measurementOwner(undefined, "commitment")).toBe("");
  });

  it("target falls back to the derived default until overridden", () => {
    const model = modelFor(FULL_CHOICES);
    const margin = model.links.find((l) => l.id === "recovered")!.metrics.find((m) => m.id === "recovered-margin")!;
    expect(measurementTarget(undefined, "recovered-margin", margin.defaultTarget)).toBe(margin.defaultTarget);
    const planning: AttainPlanning = { measurement: { entries: { "recovered-margin": { target: "$1M / yr" } } } };
    expect(measurementTarget(planning, "recovered-margin", margin.defaultTarget)).toBe("$1M / yr");
  });
});

describe("ED access measurement plan — reconciles to the ED access drivers", () => {
  it("the plan prize equals computeAllDriverValues().lwbsRecovery + admissionCapture", () => {
    const values = alignValues(FULL_CHOICES, BASELINE);
    const chain = computeEdAccessChain(BASELINE, values);
    const model = deriveEdAccessMeasurementPlan(BASELINE, values, 1, {
      realizedRecovered: chain.recovery.realizedRecovered,
      capturedAdmissions: chain.recovery.capturedAdmissions,
      prize: chain.payoff.value,
    });
    const engine = computeAllDriverValues(exploreStateForEdAccessReconciliation(BASELINE, values), 0);
    expect(model.prize).toBeCloseTo(engine.lwbsRecovery + engine.admissionCapture, 0);
    expect(model.realizedVisits).toBe(chain.recovery.realizedRecovered);
  });
});

describe("ED access measurement plan — persists through save and load", () => {
  function planFor(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "ed", goal: "access" },
      goals: ["access"],
      valuesByGoal: { access: alignValues(FULL_CHOICES, BASELINE) },
      commitments: {},
      goalOwnerByPriority: {},
      progressEntries: {},
      baseline: BASELINE,
      freedTimeSplit: 50,
      realizationByGoal: {},
      planCadence: "monthly",
      planning,
    };
  }

  it("round-trips the chosen ED access metrics, targets, owners, dates, and commitment", () => {
    const planning: AttainPlanning = {
      measurement: {
        promiseByWhen: "2026-12-31",
        commitmentOwner: "Dir. ED Ops",
        commitmentByWhen: "2026-09-01",
        chosen: { lwbs: ["lwbs-rate"], recovered: ["recovered-visits", "recovered-margin"] },
        entries: {
          "recovered-margin": { target: "$1M / yr", owner: "CFO", byWhen: "2026-10-01" },
          "recovered-visits": { owner: "ED Charge Nurse" },
        },
      },
    };
    const decoded = decodeAttain(encodeAttain(planFor(planning)));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toEqual(planning.measurement);
    expect(measurementChosen(decoded?.planning, "recovered", ["x"])).toEqual(["recovered-visits", "recovered-margin"]);
    expect(measurementTarget(decoded?.planning, "recovered-margin", "$1 / yr")).toBe("$1M / yr");
    expect(measurementOwner(decoded?.planning, "recovered-visits")).toBe("ED Charge Nurse");
  });

  it("an older ED access plan with no measurement layer decodes and falls back to defaults", () => {
    const decoded = decodeAttain(encodeAttain(planFor({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toBeUndefined();
    expect(measurementChosen(decoded?.planning, "recovered", ["recovered-visits"])).toEqual(["recovered-visits"]);
    expect(measurementOwner(decoded?.planning, "recovered-visits")).toBe("");
  });
});
