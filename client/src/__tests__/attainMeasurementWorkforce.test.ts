import { describe, it, expect } from "vitest";
import { deriveRetentionMeasurementPlan } from "@/lib/attain/attainMeasurement";
import { workforceAlignToLeverValues } from "@/lib/attain/workforceAlign";
import { computeWorkforceChain } from "@/lib/attain/attainWorkforce";
import { DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
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
const NURSING_BASELINE: AttainBaseline = { nursingFtes: 200, staffedBeds: 300, dailyCensus: 240 };

function ctx(setting: AttainSetting, baseline: AttainBaseline): AlignContext {
  return { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 };
}

/** Simulate what AlignStep persists: the raw selections PLUS the engine levers
 * the workforce config maps them to, exactly as the app writes both. */
function alignValues(choices: LeverValues, setting: AttainSetting, baseline: AttainBaseline): LeverValues {
  return { ...choices, ...workforceAlignToLeverValues(choices, ctx(setting, baseline)) };
}

function modelFor(choices: LeverValues, setting: AttainSetting = "outpatient", baseline: AttainBaseline = OP_BASELINE) {
  const values = alignValues(choices, setting, baseline);
  const chain = computeWorkforceChain(baseline, setting, values, 1);
  return deriveRetentionMeasurementPlan(baseline, setting, values, 1, {
    minutes: DEFAULT_MINUTES_SAVED_PER_NOTE,
    departuresAvoided: chain.payoff.departuresAvoided,
    prize: chain.payoff.value,
  });
}

const FULL_CHOICES: LeverValues = {
  retentionAlignOutcome: ["keep"],
  retentionAlignWho: ["all"],
  retentionAlignGate: ["burnout"],
  retentionAlignBurden: ["afterhours"],
  retentionAlignProof: ["turnover", "pulse"],
};

describe("retention measurement plan — derives from the workforce Align state", () => {
  it("is not ready until who and gate are chosen", () => {
    expect(modelFor({}).ready).toBe(false);
    expect(modelFor({ retentionAlignWho: ["all"] }).ready).toBe(false);
    expect(modelFor({ retentionAlignWho: ["all"], retentionAlignGate: ["burnout"] }).ready).toBe(true);
  });

  it("builds the four causal links in chain order", () => {
    const links = modelFor(FULL_CHOICES).links;
    expect(links.map((l) => l.id)).toEqual(["charting", "burnout", "stay", "turnover"]);
    expect(links.map((l) => l.n)).toEqual([1, 2, 3, 4]);
  });

  it("prices the outcome (link 4) off their scope numbers and the chain payoff", () => {
    const model = modelFor(FULL_CHOICES);
    const turnover = model.links.find((l) => l.id === "turnover")!;
    const rate = turnover.metrics.find((m) => m.id === "voluntary-turnover-rate")!;
    // 14% outpatient benchmark turnover, target below it so the gap shows.
    expect(rate.baseline).toMatch(/%/);
    expect(rate.defaultTarget).toMatch(/^under /);
    const departures = turnover.metrics.find((m) => m.id === "departures-avoided")!;
    expect(departures.defaultTarget).toMatch(/\/ yr/);
    const cost = turnover.metrics.find((m) => m.id === "replacement-cost-saved")!;
    expect(cost.defaultTarget).toMatch(/\/ yr/);
    expect(model.prize).toBeGreaterThan(0);
  });

  it("names link 1 for the setting's charting term", () => {
    expect(modelFor(FULL_CHOICES, "outpatient", OP_BASELINE).links[0].title).toMatch(/after-hours charting/i);
    expect(modelFor(FULL_CHOICES, "nursing", NURSING_BASELINE).links[0].title).toMatch(/post-shift charting/i);
  });
});

describe("retention measurement plan — dynamic to the Align choices", () => {
  it("pre-selects the after-hours-charting metric when the burden is after hours", () => {
    const afterhours = modelFor({ ...FULL_CHOICES, retentionAlignBurden: ["afterhours"] });
    const charting = afterhours.links.find((l) => l.id === "charting")!;
    const metric = charting.metrics.find((m) => m.id === "after-hours-charting-minutes")!;
    expect(metric.fromProof).toBe(true);
    expect(charting.defaultChosen).toContain("after-hours-charting-minutes");
    // In-the-visit burden leaves minutes-saved as the default instead.
    const visit = modelFor({ ...FULL_CHOICES, retentionAlignBurden: ["visit"] });
    const vCharting = visit.links.find((l) => l.id === "charting")!;
    expect(vCharting.metrics.find((m) => m.id === "after-hours-charting-minutes")!.fromProof).toBe(false);
    expect(vCharting.defaultChosen).toEqual(["minutes-saved-per-note"]);
  });

  it("badges the burnout pulse when the gate names burnout as a driver", () => {
    const burnout = modelFor({ ...FULL_CHOICES, retentionAlignGate: ["burnout"] })
      .links.find((l) => l.id === "burnout")!.metrics.find((m) => m.id === "burnout-score")!;
    expect(burnout.fromProof).toBe(true);
    // Mostly pay/life does not name burnout, and no pulse proof -> not badged.
    const paylife = modelFor({ ...FULL_CHOICES, retentionAlignGate: ["paylife"], retentionAlignProof: ["turnover"] })
      .links.find((l) => l.id === "burnout")!.metrics.find((m) => m.id === "burnout-score")!;
    expect(paylife.fromProof).toBe(false);
  });

  it("pre-selects the turnover metrics the partner named as proof on Align", () => {
    const model = modelFor({ ...FULL_CHOICES, retentionAlignProof: ["turnover"] });
    const turnover = model.links.find((l) => l.id === "turnover")!;
    expect(turnover.metrics.find((m) => m.id === "voluntary-turnover-rate")!.fromProof).toBe(true);
    expect(turnover.metrics.find((m) => m.id === "departures-avoided")!.fromProof).toBe(true);
    expect(turnover.defaultChosen).toEqual(expect.arrayContaining(["voluntary-turnover-rate", "departures-avoided"]));
  });

  it("badges the intent-to-stay and burnout metrics when a pulse is the proof", () => {
    const model = modelFor({ ...FULL_CHOICES, retentionAlignProof: ["pulse"] });
    expect(model.links.find((l) => l.id === "stay")!.metrics.find((m) => m.id === "intent-to-stay")!.fromProof).toBe(true);
    expect(model.links.find((l) => l.id === "burnout")!.metrics.find((m) => m.id === "burnout-score")!.fromProof).toBe(true);
  });

  it("adds Love Stories on link 4 only when it is named as proof", () => {
    const withLove = modelFor({ ...FULL_CHOICES, retentionAlignProof: ["lovestories"] });
    const turnover = withLove.links.find((l) => l.id === "turnover")!;
    expect(turnover.metrics.find((m) => m.id === "love-stories")).toBeTruthy();
    expect(turnover.defaultChosen).toContain("love-stories");
    const without = modelFor({ ...FULL_CHOICES, retentionAlignProof: ["turnover"] });
    expect(without.links.find((l) => l.id === "turnover")!.metrics.find((m) => m.id === "love-stories")).toBeUndefined();
  });
});

describe("retention measurement plan — baselines are their numbers or labeled benchmarks", () => {
  it("labels the after-hours-charting and burnout baselines as benchmarks", () => {
    const model = modelFor(FULL_CHOICES);
    const charting = model.links.find((l) => l.id === "charting")!.metrics.find((m) => m.id === "after-hours-charting-minutes")!;
    expect(charting.baselineTag).toBe("benchmark");
    const burnout = model.links.find((l) => l.id === "burnout")!.metrics.find((m) => m.id === "burnout-score")!;
    expect(burnout.baselineTag).toBe("benchmark");
  });

  it("tags the turnover baseline as their number when they entered a rate, else a benchmark", () => {
    const bench = modelFor(FULL_CHOICES)
      .links.find((l) => l.id === "turnover")!.metrics.find((m) => m.id === "voluntary-turnover-rate")!;
    expect(bench.baselineTag).toBe("benchmark");
    const withTheirRate = modelFor({ ...FULL_CHOICES, retentionTurnoverRate: 22 })
      .links.find((l) => l.id === "turnover")!.metrics.find((m) => m.id === "voluntary-turnover-rate")!;
    expect(withTheirRate.baselineTag).toBe("data");
    expect(withTheirRate.baseline).toMatch(/22/);
  });

  it("scales the departures-avoided target with the provider scope", () => {
    const all = modelFor(FULL_CHOICES);
    const focused = modelFor({ ...FULL_CHOICES, retentionAlignWho: ["focused"], retentionAlignWhoCount: 4 });
    const allDep = all.links.find((l) => l.id === "turnover")!.metrics.find((m) => m.id === "departures-avoided")!.defaultTarget;
    const focusedDep = focused.links.find((l) => l.id === "turnover")!.metrics.find((m) => m.id === "departures-avoided")!.defaultTarget;
    // A smaller focused cut yields a smaller derived prize than the full team.
    expect(focused.prize).toBeGreaterThan(0);
    expect(focused.prize).toBeLessThan(all.prize);
    expect(allDep).toMatch(/\/ yr/);
    expect(focusedDep).toMatch(/\/ yr/);
  });
});

describe("retention measurement plan — owners and dates default blank", () => {
  it("owner and by-when are blank until the partner sets them", () => {
    expect(measurementOwner(undefined, "voluntary-turnover-rate")).toBe("");
    expect(measurementByWhen(undefined, "voluntary-turnover-rate")).toBe("");
    expect(measurementOwner({ measurement: {} }, "departures-avoided")).toBe("");
    expect(measurementByWhen({ measurement: { entries: {} } }, "departures-avoided")).toBe("");
  });

  it("the commitment carries the protect-the-relief copy and a blank owner path", () => {
    const model = modelFor(FULL_CHOICES);
    expect(model.commitment.ownerLabel).toMatch(/protecting the relief/i);
    expect(model.commitment.teach).toMatch(/relief/i);
    expect(measurementOwner(undefined, "commitment")).toBe("");
  });

  it("target falls back to the derived default until overridden", () => {
    const model = modelFor(FULL_CHOICES);
    const rate = model.links.find((l) => l.id === "turnover")!.metrics.find((m) => m.id === "voluntary-turnover-rate")!;
    expect(measurementTarget(undefined, "voluntary-turnover-rate", rate.defaultTarget)).toBe(rate.defaultTarget);
    const planning: AttainPlanning = { measurement: { entries: { "voluntary-turnover-rate": { target: "under 9%" } } } };
    expect(measurementTarget(planning, "voluntary-turnover-rate", rate.defaultTarget)).toBe("under 9%");
  });
});

describe("retention measurement plan — persists through save and load", () => {
  function planFor(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "outpatient", goal: "retention" },
      goals: ["retention"],
      valuesByGoal: { retention: alignValues(FULL_CHOICES, "outpatient", OP_BASELINE) },
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

  it("round-trips the chosen retention metrics, targets, owners, dates, and commitment", () => {
    const planning: AttainPlanning = {
      measurement: {
        promiseByWhen: "2026-12-31",
        commitmentOwner: "Dr. Rivera",
        commitmentByWhen: "2026-09-01",
        chosen: { charting: ["after-hours-charting-minutes"], turnover: ["voluntary-turnover-rate", "departures-avoided"] },
        entries: {
          "voluntary-turnover-rate": { target: "under 9%", owner: "CMO", byWhen: "2026-10-01" },
          "departures-avoided": { owner: "CFO" },
        },
      },
    };
    const decoded = decodeAttain(encodeAttain(planFor(planning)));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toEqual(planning.measurement);
    expect(measurementChosen(decoded?.planning, "turnover", ["x"])).toEqual(["voluntary-turnover-rate", "departures-avoided"]);
    expect(measurementTarget(decoded?.planning, "voluntary-turnover-rate", "under 12%")).toBe("under 9%");
    expect(measurementOwner(decoded?.planning, "departures-avoided")).toBe("CFO");
  });

  it("an older retention plan with no measurement layer decodes and falls back to defaults", () => {
    const decoded = decodeAttain(encodeAttain(planFor({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.measurement).toBeUndefined();
    expect(measurementChosen(decoded?.planning, "turnover", ["voluntary-turnover-rate"])).toEqual(["voluntary-turnover-rate"]);
    expect(measurementOwner(decoded?.planning, "voluntary-turnover-rate")).toBe("");
  });
});
