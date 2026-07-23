import { describe, it, expect } from "vitest";
import { deriveAccessMeasurementPlan } from "@/lib/attain/attainMeasurement";
import { accessAlignToLeverValues } from "@/lib/attain/accessAlign";
import { computeAccessChain } from "@/lib/attain/attainAccess";
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

const OP_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 100 };

function ctx(): AlignContext {
  return { baseline: OP_BASELINE, setting: "outpatient", realizationPct: 100, crossGoalShareMultiplier: 1 };
}

/** Simulate what AlignStep persists: the raw selections PLUS the engine levers
 * the config maps them to, exactly as the app writes both into the values bag. */
function alignValues(choices: LeverValues): LeverValues {
  return { ...choices, ...accessAlignToLeverValues(choices, ctx()) };
}

function modelFor(choices: LeverValues) {
  const values = alignValues(choices);
  const chain = computeAccessChain(OP_BASELINE, values, 1);
  return deriveAccessMeasurementPlan(OP_BASELINE, values, 1, {
    realizedVisits: chain.payoff.realizedVisits,
    prize: chain.payoff.value,
  });
}

const FULL_CHOICES: LeverValues = {
  accessAlignOutcome: ["wait"],
  accessAlignWho: ["all"],
  accessAlignGate: ["documentation"],
  accessAlignDemand: ["backlog"],
  accessAlignBacklogCount: 500,
  accessAlignProof: ["tna", "visits"],
};

describe("measurement plan — derives from the Align state", () => {
  it("is not ready until who and gate are chosen", () => {
    expect(modelFor({}).ready).toBe(false);
    expect(modelFor({ accessAlignWho: ["all"] }).ready).toBe(false);
    expect(modelFor({ accessAlignWho: ["all"], accessAlignGate: ["documentation"] }).ready).toBe(true);
  });

  it("builds the four causal links in chain order", () => {
    const links = modelFor(FULL_CHOICES).links;
    expect(links.map((l) => l.id)).toEqual(["minutes", "schedule", "wait", "visits"]);
    expect(links.map((l) => l.n)).toEqual([1, 2, 3, 4]);
  });

  it("pulls the freed-hours and realized-visit baselines/targets from their own numbers", () => {
    const model = modelFor(FULL_CHOICES);
    const freed = model.links[0].metrics.find((m) => m.id === "freed-hours-per-provider")!;
    // 40 providers, real encounters -> a real, non-benchmark freed-hours target.
    expect(freed.defaultTarget).toMatch(/hrs \/ wk/);
    const realized = model.links[3].metrics.find((m) => m.id === "realized-visits")!;
    expect(realized.defaultTarget).toMatch(/\/ yr/);
    expect(model.realizedVisits).toBeGreaterThan(0);
    expect(model.prize).toBeGreaterThan(0);
  });

  it("pre-selects the metrics the partner named as proof on Align", () => {
    const model = modelFor(FULL_CHOICES); // proof: tna + visits
    const wait = model.links.find((l) => l.id === "wait")!;
    const tna = wait.metrics.find((m) => m.id === "third-next-available")!;
    expect(tna.fromProof).toBe(true);
    expect(wait.defaultChosen).toContain("third-next-available");
    const visits = model.links.find((l) => l.id === "visits")!;
    expect(visits.defaultChosen).toContain("realized-visits");
  });

  it("uses the partner's typed backlog as the baseline, tagged as their number", () => {
    const model = modelFor(FULL_CHOICES); // backlog demand + typed 500
    const backlog = model.links.find((l) => l.id === "wait")!.metrics.find((m) => m.id === "referral-backlog")!;
    expect(backlog.baseline).toMatch(/500/);
    expect(backlog.baselineTag).toBe("data");
  });

  it("labels a benchmark baseline as a benchmark, never a partner number", () => {
    const model = modelFor(FULL_CHOICES);
    const tna = model.links.find((l) => l.id === "wait")!.metrics.find((m) => m.id === "third-next-available")!;
    expect(tna.baselineTag).toBe("benchmark");
    expect(tna.baseline).toMatch(/days/);
    expect(tna.defaultTarget).toMatch(/under 14/);
  });
});

describe("measurement plan — a different Align produces a different chain", () => {
  it("closes the schedule link when the honest gate is people/rooms/space", () => {
    const bodies = modelFor({ ...FULL_CHOICES, accessAlignGate: ["bodies"] });
    const schedule = bodies.links.find((l) => l.id === "schedule")!;
    expect(schedule.blocked).toBe(true);
    expect(schedule.metrics).toHaveLength(0);
    expect(schedule.defaultChosen).toHaveLength(0);
    // The documentation gate leaves it open with real metrics.
    const doc = modelFor(FULL_CHOICES).links.find((l) => l.id === "schedule")!;
    expect(doc.blocked).toBe(false);
    expect(doc.metrics.length).toBeGreaterThan(0);
  });

  it("changes link-3 metrics with the demand sources chosen", () => {
    const backlogIds = modelFor({ ...FULL_CHOICES, accessAlignDemand: ["backlog"] })
      .links.find((l) => l.id === "wait")!.metrics.map((m) => m.id);
    const noShowIds = modelFor({ ...FULL_CHOICES, accessAlignDemand: ["noshow"], accessAlignProof: [] })
      .links.find((l) => l.id === "wait")!.metrics.map((m) => m.id);
    expect(backlogIds).toContain("referral-backlog");
    expect(noShowIds).toContain("no-show-rate");
    expect(noShowIds).not.toContain("referral-backlog");
  });

  it("names link 3 after the Align outcome", () => {
    expect(modelFor({ ...FULL_CHOICES, accessAlignOutcome: ["backlog"] }).links[2].title).toMatch(/backlog/i);
    expect(modelFor({ ...FULL_CHOICES, accessAlignOutcome: ["grow"] }).links[2].title).toMatch(/grow/i);
    expect(modelFor({ ...FULL_CHOICES, accessAlignOutcome: ["wait"] }).links[2].title).toMatch(/wait/i);
  });

  it("scales the realized-visit target with the provider scope", () => {
    // A backlog far above capacity makes the chain capacity-bound, so realized
    // visits track the provider scope rather than the demand ceiling.
    const capacityBound = { ...FULL_CHOICES, accessAlignBacklogCount: 1_000_000 };
    const all = modelFor(capacityBound);
    const focused = modelFor({ ...capacityBound, accessAlignWho: ["focused"], accessAlignWhoCount: 4 });
    expect(focused.realizedVisits).toBeGreaterThan(0);
    expect(focused.realizedVisits).toBeLessThan(all.realizedVisits);
    // Both freed-hours figures are per-provider, so they read the same unit.
    expect(all.links[0].metrics.find((m) => m.id === "freed-hours-per-provider")!.defaultTarget).toMatch(/hrs/);
  });
});

describe("measurement plan — owners and dates default blank", () => {
  it("chosen falls back to the derived default, else the stored pick", () => {
    const planning: AttainPlanning = { measurement: { chosen: { wait: ["no-show-rate"] } } };
    expect(measurementChosen(planning, "wait", ["third-next-available"])).toEqual(["no-show-rate"]);
    // An explicit empty pick is honored (deselecting every metric persists).
    expect(measurementChosen({ measurement: { chosen: { wait: [] } } }, "wait", ["x"])).toEqual([]);
    // No stored entry -> the derived default.
    expect(measurementChosen(undefined, "wait", ["third-next-available"])).toEqual(["third-next-available"]);
  });

  it("owner and by-when are blank until the partner sets them", () => {
    expect(measurementOwner(undefined, "realized-visits")).toBe("");
    expect(measurementByWhen(undefined, "realized-visits")).toBe("");
    expect(measurementOwner({ measurement: {} }, "realized-visits")).toBe("");
    expect(measurementByWhen({ measurement: { entries: {} } }, "realized-visits")).toBe("");
  });

  it("target falls back to the derived default until overridden", () => {
    expect(measurementTarget(undefined, "third-next-available", "under 14 days")).toBe("under 14 days");
    const planning: AttainPlanning = { measurement: { entries: { "third-next-available": { target: "under 10 days" } } } };
    expect(measurementTarget(planning, "third-next-available", "under 14 days")).toBe("under 10 days");
    // A blank override is treated as unset.
    expect(measurementTarget({ measurement: { entries: { x: { target: "  " } } } }, "x", "def")).toBe("def");
  });
});

describe("measurement plan — persists through save and load", () => {
  function planFor(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "outpatient", goal: "access" },
      goals: ["access"],
      valuesByGoal: { access: alignValues(FULL_CHOICES) },
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

  it("round-trips the chosen metrics, targets, owners, dates, and commitment", () => {
    const planning: AttainPlanning = {
      measurement: {
        promiseByWhen: "2026-12-31",
        commitmentOwner: "Dr. Rivera",
        commitmentByWhen: "2026-09-01",
        chosen: { wait: ["third-next-available", "no-show-rate"], visits: ["realized-visits"] },
        entries: {
          "third-next-available": { target: "under 10 days", owner: "Ops Lead", byWhen: "2026-10-01" },
          "realized-visits": { owner: "CFO" },
        },
      },
    };
    const decoded = decodeAttain(encodeAttain(planFor(planning)));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toEqual(planning.measurement);
    expect(measurementChosen(decoded?.planning, "wait", ["x"])).toEqual(["third-next-available", "no-show-rate"]);
    expect(measurementTarget(decoded?.planning, "third-next-available", "under 14 days")).toBe("under 10 days");
    expect(measurementOwner(decoded?.planning, "realized-visits")).toBe("CFO");
  });

  it("an older plan with no measurement layer still decodes and falls back to defaults", () => {
    const decoded = decodeAttain(encodeAttain(planFor({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toBeUndefined();
    expect(measurementChosen(decoded?.planning, "wait", ["third-next-available"])).toEqual(["third-next-available"]);
    expect(measurementOwner(decoded?.planning, "realized-visits")).toBe("");
  });

  it("rejects a malformed measurement blob rather than trusting it blind", () => {
    const bad = planFor({}) as unknown as Record<string, unknown>;
    (bad.planning as Record<string, unknown>).measurement = { chosen: { wait: [1, 2] } };
    expect(decodeAttain(encodeAttain(bad as unknown as AttainSaveState))).toBeNull();
  });
});
