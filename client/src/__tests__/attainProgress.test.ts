import { describe, it, expect } from "vitest";
import {
  leverNumericValue,
  decisionAttainmentFraction,
  decisionStatus,
  computeProgressAttainmentPct,
  type DecisionProgressInput,
} from "@/lib/attain/attainProgress";

describe("leverNumericValue", () => {
  it("returns a plain number unchanged", () => {
    expect(leverNumericValue(42)).toBe(42);
    expect(leverNumericValue(0)).toBe(0);
  });

  it("returns the length of a lines array", () => {
    expect(leverNumericValue(["Cardiology", "Orthopedics"])).toBe(2);
    expect(leverNumericValue([])).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(leverNumericValue(undefined)).toBe(0);
  });
});

describe("decisionAttainmentFraction", () => {
  it("is 0 exactly at baseline", () => {
    expect(decisionAttainmentFraction(20, 20, 60)).toBe(0);
  });

  it("is 1 exactly at target", () => {
    expect(decisionAttainmentFraction(20, 60, 60)).toBe(1);
  });

  it("is 0.5 exactly halfway between baseline and target", () => {
    expect(decisionAttainmentFraction(20, 40, 60)).toBeCloseTo(0.5);
  });

  it("clamps overshoot past the target to 1", () => {
    expect(decisionAttainmentFraction(20, 100, 60)).toBe(1);
  });

  it("clamps movement below baseline to 0", () => {
    expect(decisionAttainmentFraction(20, 5, 60)).toBe(0);
  });

  it("handles an inverted (falling) metric, e.g. days getting shorter", () => {
    // baseline 14 days, target 5 days (faster is better) — 9 days in is halfway
    expect(decisionAttainmentFraction(14, 9, 5)).toBeCloseTo(5 / 9, 5);
    expect(decisionAttainmentFraction(14, 5, 5)).toBe(1);
    expect(decisionAttainmentFraction(14, 14, 5)).toBe(0);
    // moving the wrong way (up, when it should fall) clamps to 0, not negative
    expect(decisionAttainmentFraction(14, 20, 5)).toBe(0);
  });

  it("treats a zero span (baseline already equals target) as landed only when current matches", () => {
    expect(decisionAttainmentFraction(50, 50, 50)).toBe(1);
    expect(decisionAttainmentFraction(50, 40, 50)).toBe(0);
  });
});

describe("decisionStatus", () => {
  it("is not_started at fraction 0", () => {
    expect(decisionStatus(0)).toBe("not_started");
  });

  it("is in_motion strictly between 0 and 1", () => {
    expect(decisionStatus(0.01)).toBe("in_motion");
    expect(decisionStatus(0.5)).toBe("in_motion");
    expect(decisionStatus(0.99)).toBe("in_motion");
  });

  it("is landed at fraction 1 or above", () => {
    expect(decisionStatus(1)).toBe("landed");
    expect(decisionStatus(1.2)).toBe("landed");
  });
});

describe("computeProgressAttainmentPct", () => {
  it("is 0 for an empty decision list", () => {
    expect(computeProgressAttainmentPct([])).toBe(0);
  });

  it("matches a single decision's own fraction, as a percent", () => {
    const decisions: DecisionProgressInput[] = [{ key: "a", baseline: 0, current: 30, target: 100, worth: 1000 }];
    expect(computeProgressAttainmentPct(decisions)).toBe(30);
  });

  it("is 0 when every decision's current still sits at its baseline (first visit)", () => {
    const decisions: DecisionProgressInput[] = [
      { key: "a", baseline: 20, current: 20, target: 60, worth: 500 },
      { key: "b", baseline: 0, current: 0, target: 10, worth: 800 },
    ];
    expect(computeProgressAttainmentPct(decisions)).toBe(0);
  });

  it("is 100 once every decision has reached its target", () => {
    const decisions: DecisionProgressInput[] = [
      { key: "a", baseline: 20, current: 60, target: 60, worth: 500 },
      { key: "b", baseline: 0, current: 10, target: 10, worth: 800 },
    ];
    expect(computeProgressAttainmentPct(decisions)).toBe(100);
  });

  it("weights decisions by worth, so a high-value decision moves the number more", () => {
    const decisions: DecisionProgressInput[] = [
      // fully landed, worth 900 of 1000 total
      { key: "big", baseline: 0, current: 100, target: 100, worth: 900 },
      // untouched, worth 100 of 1000 total
      { key: "small", baseline: 0, current: 0, target: 100, worth: 100 },
    ];
    // weighted: (1 * 900 + 0 * 100) / 1000 = 0.9 -> 90%
    expect(computeProgressAttainmentPct(decisions)).toBe(90);
  });

  it("falls back to a plain average when every decision has zero worth", () => {
    const decisions: DecisionProgressInput[] = [
      { key: "a", baseline: 0, current: 50, target: 100, worth: 0 },
      { key: "b", baseline: 0, current: 100, target: 100, worth: 0 },
    ];
    // plain average of 0.5 and 1.0 = 0.75 -> 75%
    expect(computeProgressAttainmentPct(decisions)).toBe(75);
  });

  it("never lets a negative-worth decision pull the average negative", () => {
    const decisions: DecisionProgressInput[] = [
      { key: "a", baseline: 0, current: 100, target: 100, worth: 500 },
      { key: "b", baseline: 0, current: 0, target: 100, worth: -50 },
    ];
    expect(computeProgressAttainmentPct(decisions)).toBeGreaterThanOrEqual(0);
    expect(computeProgressAttainmentPct(decisions)).toBeLessThanOrEqual(100);
  });
});
