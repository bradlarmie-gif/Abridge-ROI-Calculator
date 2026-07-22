import { describe, it, expect } from "vitest";
import {
  PLAN_PHASE_IDS,
  phaseBoundaries,
  phaseValueRamp,
  phaseOwner,
  phaseSignalTarget,
  phaseSignalLabel,
  type AttainPlanning,
} from "@/lib/attain/attainPlanning";
import { encodeAttain, decodeAttain, ATTAIN_SAVE_VERSION, type AttainSaveState } from "@/lib/attain/attainUrlState";
import { DEFAULT_ATTAIN_STATE } from "@/lib/attain/attainTypes";

describe("attainPlanning — phase boundaries", () => {
  it("splits a 9-month horizon into 0-3, 3-6, 6-9", () => {
    const b = phaseBoundaries(9);
    expect(b.start).toEqual([0, 3]);
    expect(b.expand).toEqual([3, 6]);
    expect(b.steady).toEqual([6, 9]);
  });

  it("stays valid for a non-9 horizon and never leaves a gap or overlap", () => {
    const b = phaseBoundaries(12);
    expect(b.start[0]).toBe(0);
    expect(b.steady[1]).toBe(12);
    expect(b.start[1]).toBe(b.expand[0]);
    expect(b.expand[1]).toBe(b.steady[0]);
  });

  it("falls back to a 9-month horizon for a zero or negative total", () => {
    expect(phaseBoundaries(0).steady[1]).toBe(9);
    expect(phaseBoundaries(-4).steady[1]).toBe(9);
  });
});

describe("attainPlanning — value ramp", () => {
  it("climbs roughly one third, two thirds, then the full prize", () => {
    const r = phaseValueRamp(900_000);
    expect(r.start).toBe(300_000);
    expect(r.expand).toBe(600_000);
    expect(r.steady).toBe(900_000);
  });

  it("the last rung equals the full prize", () => {
    const prize = 762_345;
    expect(phaseValueRamp(prize).steady).toBe(prize);
  });

  it("ramps to zero across the board when there is no prize yet", () => {
    const r = phaseValueRamp(0);
    expect(r).toEqual({ start: 0, expand: 0, steady: 0 });
    expect(phaseValueRamp(-100).steady).toBe(0);
  });
});

describe("attainPlanning — resolvers", () => {
  const planning: AttainPlanning = {
    phaseOwners: { expand: "Dr. Rivera" },
    phaseSignalTargets: { start: "6 min per note" },
  };

  it("phaseOwner uses the override, else the goal owner, else empty", () => {
    expect(phaseOwner(planning, "expand", "Goal Owner")).toBe("Dr. Rivera");
    expect(phaseOwner(planning, "start", "Goal Owner")).toBe("Goal Owner");
    expect(phaseOwner(undefined, "start", "")).toBe("");
  });

  it("phaseSignalTarget uses the override, else the derived default", () => {
    expect(phaseSignalTarget(planning, "start", "2 min per note")).toBe("6 min per note");
    expect(phaseSignalTarget(planning, "steady", "1,234 per year")).toBe("1,234 per year");
    expect(phaseSignalTarget(undefined, "steady", "1,234 per year")).toBe("1,234 per year");
  });

  it("treats a blank override as unset (falls back)", () => {
    const blank: AttainPlanning = { phaseOwners: { start: "   " }, phaseSignalTargets: { start: "  " } };
    expect(phaseOwner(blank, "start", "Goal Owner")).toBe("Goal Owner");
    expect(phaseSignalTarget(blank, "start", "2 min per note")).toBe("2 min per note");
  });

  it("covers exactly three phases", () => {
    expect(PLAN_PHASE_IDS).toEqual(["start", "expand", "steady"]);
  });
});

describe("attainPlanning — leading-signal metric choice", () => {
  it("phaseSignalLabel uses the chosen metric, else the derived default", () => {
    const planning: AttainPlanning = { phaseSignalLabels: { expand: "No-show rate" } };
    expect(phaseSignalLabel(planning, "expand", "Third-next-available dropping")).toBe("No-show rate");
    expect(phaseSignalLabel(planning, "start", "Minutes saved per note")).toBe("Minutes saved per note");
    expect(phaseSignalLabel(undefined, "start", "Minutes saved per note")).toBe("Minutes saved per note");
  });

  it("treats a blank choice as unset (falls back to the default)", () => {
    const blank: AttainPlanning = { phaseSignalLabels: { start: "   " } };
    expect(phaseSignalLabel(blank, "start", "Minutes saved per note")).toBe("Minutes saved per note");
  });

  it("an untouched plan defaults to exactly the prior fixed phase labels", () => {
    // Before the dropdowns shipped, each phase rendered a fixed label. With no
    // choice stored, the resolver must return that same label unchanged, so an
    // untouched plan reads exactly as it did before.
    const priorFixedLabels: Record<(typeof PLAN_PHASE_IDS)[number], string> = {
      start: "Minutes saved per note",
      expand: "Third-next-available dropping",
      steady: "Realized visits per year",
    };
    for (const phase of PLAN_PHASE_IDS) {
      expect(phaseSignalLabel({}, phase, priorFixedLabels[phase])).toBe(priorFixedLabels[phase]);
      expect(phaseSignalLabel(undefined, phase, priorFixedLabels[phase])).toBe(priorFixedLabels[phase]);
    }
  });
});

describe("attainPlanning — phase-signal choice persists through save/load", () => {
  function buildPlanWithSignalChoices(planning: AttainPlanning): AttainSaveState {
    return {
      version: ATTAIN_SAVE_VERSION,
      savedAt: "2026-07-22T12:00:00.000Z",
      state: { ...DEFAULT_ATTAIN_STATE, setting: "outpatient", goal: "access", totalMonths: 9 },
      goals: ["access"],
      valuesByGoal: { access: {} },
      commitments: {},
      goalOwnerByPriority: {},
      progressEntries: {},
      baseline: { providers: 40, annualEncounters: 140000, utilizationPct: 78 },
      freedTimeSplit: 50,
      realizationByGoal: {},
      planCadence: "monthly",
      planning,
    };
  }

  it("round-trips a chosen leading-signal metric per phase", () => {
    const planning: AttainPlanning = {
      phaseSignalLabels: { start: "Referral backlog", expand: "No-show rate", steady: "Realized visits per year" },
      phaseSignalTargets: { start: "under 40" },
      phaseOwners: { expand: "Dr. Rivera" },
    };
    const decoded = decodeAttain(encodeAttain(buildPlanWithSignalChoices(planning)));
    expect(decoded?.planning?.phaseSignalLabels).toEqual(planning.phaseSignalLabels);
    expect(decoded?.planning?.phaseSignalTargets).toEqual(planning.phaseSignalTargets);
    // The restored choice drives the resolver exactly as it did before saving.
    expect(phaseSignalLabel(decoded?.planning, "expand", "Third-next-available dropping")).toBe("No-show rate");
  });

  it("an older saved plan with no signal choices still decodes and falls back to defaults", () => {
    // Backward-compat: a plan that predates the dropdowns carries no
    // phaseSignalLabels; it must decode cleanly and read the derived defaults.
    const decoded = decodeAttain(encodeAttain(buildPlanWithSignalChoices({})));
    expect(decoded).not.toBeNull();
    expect(decoded?.planning?.phaseSignalLabels).toBeUndefined();
    expect(phaseSignalLabel(decoded?.planning, "start", "Minutes saved per note")).toBe("Minutes saved per note");
  });
});
