import { describe, it, expect } from "vitest";
import {
  PLAN_PHASE_IDS,
  phaseBoundaries,
  phaseValueRamp,
  phaseOwner,
  phaseSignalTarget,
  type AttainPlanning,
} from "@/lib/attain/attainPlanning";

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
