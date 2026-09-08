import { describe, it, expect } from "vitest";
import { soloModel, SOLO_WEEKS, SOLO_HAIRCUT, type SoloInputs } from "@/pages/forecast/soloModel";

/**
 * One provider's own return.
 *
 * The defect this suite exists for: the screen used to say plainly that a
 * coding lift only reaches a doctor who is paid on productivity, and then put
 * up dollars from "extra patients a week" with no such caveat, rolling both
 * into one total and one multiple. A salaried doctor moved the slider and
 * watched money appear that would never reach them, on the one screen whose
 * whole argument is that it tells them the truth.
 *
 * So how they are paid is now an input, and it decides who the SAME arithmetic
 * belongs to: the provider, or whoever employs them. Nothing about the dollars
 * changes; only whose pocket they land in.
 */

const base: SoloInputs = {
  payModel: "productivity",
  perWeek: 70,
  noteNow: 9,
  noteWith: 6,
  wrvuNow: 1.9,
  wrvuWith: 2.0,
  perWrvu: 33.4,
  visitMins: 20,
  extraPerWeek: 0,
  cost: 3000,
};

describe("one provider's return", () => {
  it("turns minutes off a note into hours, over a working year", () => {
    const m = soloModel(base);
    expect(m.visitsYear).toBe(70 * SOLO_WEEKS);
    expect(m.savedPerNote).toBe(3);
    expect(m.hoursBack).toBeCloseTo((3 * 70 * SOLO_WEEKS) / 60, 6);
  });

  it("takes a haircut off a coding lift for the other things that move it", () => {
    const m = soloModel(base);
    const full = m.visitsYear * 0.1 * 33.4;
    expect(m.lift).toBeCloseTo(0.1, 10);
    expect(m.codingGain).toBeCloseTo(full * (1 - SOLO_HAIRCUT), 4);
    // a reduction, not a share: most of the lift they entered survives it
    expect(SOLO_HAIRCUT).toBeGreaterThan(0);
    expect(SOLO_HAIRCUT).toBeLessThan(0.5);
    expect(m.codingGain).toBeLessThan(full);
  });

  it("takes no haircut off an extra visit, which either happened or did not", () => {
    const m = soloModel({ ...base, extraPerWeek: 2 });
    expect(m.extraGain).toBeCloseTo(m.extraYear * 2.0 * 33.4, 4);
  });

  it("cannot spend the same hour twice", () => {
    const m = soloModel({ ...base, extraPerWeek: 3 });
    expect(m.hoursSpent + m.hoursKept).toBeCloseTo(m.hoursBack, 6);
    // and it will not offer more patients than the reclaimed time pays for
    const greedy = soloModel({ ...base, extraPerWeek: 999 });
    expect(greedy.extra).toBe(greedy.maxExtraPerWeek);
    expect(greedy.hoursKept).toBeGreaterThanOrEqual(0);
  });

  it("offers no extra patients until a visit length is known", () => {
    const m = soloModel({ ...base, visitMins: 0, extraPerWeek: 5 });
    expect(m.maxExtraPerWeek).toBe(0);
    expect(m.extra).toBe(0);
    expect(m.extraGain).toBe(0);
  });

  /**
   * The gate. Both halves of the money move together, because both halves have
   * the same fate: on a flat salary, better coding and an extra patient are
   * revenue for whoever employs you.
   */
  describe("how they are paid decides whose money it is", () => {
    it("pays the provider when they are paid on productivity", () => {
      const m = soloModel({ ...base, extraPerWeek: 2 });
      expect(m.grossValue).toBeGreaterThan(0);
      expect(m.toYou).toBeCloseTo(m.grossValue, 6);
      expect(m.toPractice).toBe(0);
      expect(m.net).toBeCloseTo(m.grossValue - 3000, 6);
      expect(m.multiple).toBeCloseTo(m.grossValue / 3000, 6);
    });

    it("pays the employer when they are on a flat salary, including the extra visits", () => {
      const m = soloModel({ ...base, payModel: "salary", extraPerWeek: 2 });
      expect(m.grossValue, "the arithmetic is the same either way").toBeGreaterThan(0);
      expect(m.extraGain, "extra visits are still revenue, just not theirs").toBeGreaterThan(0);
      expect(m.toYou, "not one dollar of this reaches a salaried doctor").toBe(0);
      expect(m.toPractice).toBeCloseTo(m.grossValue, 6);
      // no return multiple: it would be dividing their employer's money by theirs
      expect(m.multiple).toBe(0);
      expect(m.net).toBe(-3000);
    });

    it("leaves a salaried doctor the hours, which are real either way", () => {
      const m = soloModel({ ...base, payModel: "salary" });
      const paid = soloModel(base);
      expect(m.hoursBack).toBeCloseTo(paid.hoursBack, 6);
      expect(m.hoursKept).toBeCloseTo(paid.hoursKept, 6);
    });

    it("shows no dollars at all until the question is answered", () => {
      const m = soloModel({ ...base, payModel: null, extraPerWeek: 2 });
      expect(m.toYou).toBe(0);
      expect(m.toPractice).toBe(0);
      expect(m.multiple).toBe(0);
      expect(m.hasMoney).toBe(false);
      expect(m.hoursBack, "their hours do not depend on how they are paid").toBeGreaterThan(0);
    });
  });

  it("holds no multiple until they say what they pay", () => {
    const m = soloModel({ ...base, cost: 0 });
    expect(m.multiple).toBe(0);
    expect(m.net).toBeCloseTo(m.toYou, 6);
  });

  it("never returns a negative saving from a slower note", () => {
    const m = soloModel({ ...base, noteNow: 5, noteWith: 9, wrvuWith: 1.2 });
    expect(m.savedPerNote).toBe(0);
    expect(m.hoursBack).toBe(0);
    expect(m.lift).toBe(0);
    expect(m.codingGain).toBe(0);
  });

  it("is blank, not zero, on an untouched screen", () => {
    const m = soloModel({
      payModel: null, perWeek: 0, noteNow: 0, noteWith: 0, wrvuNow: 0, wrvuWith: 0,
      perWrvu: 33.4, visitMins: 0, extraPerWeek: 0, cost: 0,
    });
    expect(m.hasTime).toBe(false);
    expect(m.hasMoney).toBe(false);
    expect(m.grossValue).toBe(0);
    expect(m.hoursBack).toBe(0);
  });
});
