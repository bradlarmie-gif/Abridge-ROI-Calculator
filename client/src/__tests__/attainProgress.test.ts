import { describe, it, expect } from "vitest";
import {
  leverNumericValue,
  decisionAttainmentFraction,
  decisionStatus,
  computeProgressAttainmentPct,
  parseSignalBaseline,
  perSignalWorth,
  latestEntry,
  currentValueFromEntries,
  todayISODate,
  nextCheckDueDate,
  computeActualTrajectory,
  computeSparklineGeometry,
  type DecisionProgressInput,
  type ProgressEntry,
  type SignalProgressInput,
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

// ────────────────────────────────────────────────────────────────────────
// Multi-signal Commit (Change 3): each committed decision now carries a
// LIST of signals to watch, each with its own free-text "baseline today"
// capture (e.g. "18 days", "62%") rather than one NumberField per decision.
// `parseSignalBaseline` turns that free text into the number the fraction
// math above needs, and `perSignalWorth` spreads a decision's total worth
// evenly across however many signals it has, so a decision broken into two
// signal rows doesn't out-weigh a decision left at one.
// ────────────────────────────────────────────────────────────────────────
describe("parseSignalBaseline", () => {
  it("reads the leading number out of a free-text capture", () => {
    expect(parseSignalBaseline("18 days")).toBe(18);
    expect(parseSignalBaseline("62%")).toBe(62);
    expect(parseSignalBaseline("1,900")).toBe(1900); // digit-grouping commas are stripped, so a grouped baseline reads on its real scale
    expect(parseSignalBaseline("4,900 / yr")).toBe(4900);
  });

  it("reads a bare number with no unit", () => {
    expect(parseSignalBaseline("18")).toBe(18);
    expect(parseSignalBaseline("0")).toBe(0);
    expect(parseSignalBaseline("4.5")).toBe(4.5);
  });

  it("reads a leading negative number", () => {
    expect(parseSignalBaseline("-3 pts")).toBe(-3);
  });

  it("returns 0 for blank, undefined, or non-numeric text, never NaN", () => {
    expect(parseSignalBaseline("")).toBe(0);
    expect(parseSignalBaseline(undefined)).toBe(0);
    expect(parseSignalBaseline("not captured yet")).toBe(0);
    expect(Number.isNaN(parseSignalBaseline("???"))).toBe(false);
  });
});

describe("perSignalWorth", () => {
  it("splits a decision's worth evenly across its signals", () => {
    expect(perSignalWorth(1_000, 2)).toBe(500);
    expect(perSignalWorth(900, 3)).toBe(300);
  });

  it("returns the full worth when there is exactly one signal", () => {
    expect(perSignalWorth(750, 1)).toBe(750);
  });

  it("is 0 when there are no signals, never divides by zero into NaN/Infinity", () => {
    expect(perSignalWorth(750, 0)).toBe(0);
  });

  it("never returns a negative share, even for negative worth", () => {
    expect(perSignalWorth(-100, 2)).toBe(0);
  });

  it("summed back across every signal reconstructs the decision's original worth", () => {
    const total = 1_200;
    const signalCount = 4;
    const perSignal = perSignalWorth(total, signalCount);
    expect(perSignal * signalCount).toBeCloseTo(total, 5);
  });
});

describe("multi-signal attainment aggregation (end to end)", () => {
  it("a decision split into two signals contributes the SAME combined weight as it would as a single signal", () => {
    // One decision, one signal, fully landed, worth 1000 - should be 100%.
    const single: DecisionProgressInput[] = [{ key: "d1", baseline: 0, current: 100, target: 100, worth: 1_000 }];
    expect(computeProgressAttainmentPct(single)).toBe(100);

    // Same decision, same total worth, now split into two signal rows -
    // both fully landed - should still read 100%, not 200% or halved.
    const perSignal = perSignalWorth(1_000, 2);
    const split: DecisionProgressInput[] = [
      { key: "d1:s0", baseline: 0, current: 100, target: 100, worth: perSignal },
      { key: "d1:s1", baseline: 0, current: 50, target: 50, worth: perSignal },
    ];
    expect(computeProgressAttainmentPct(split)).toBe(100);
  });

  it("one signal landed and one not-started, evenly weighted, nets 50%", () => {
    const perSignal = perSignalWorth(1_000, 2);
    const rows: DecisionProgressInput[] = [
      { key: "d1:s0", baseline: 0, current: 100, target: 100, worth: perSignal },
      { key: "d1:s1", baseline: 0, current: 0, target: 100, worth: perSignal },
    ];
    expect(computeProgressAttainmentPct(rows)).toBe(50);
  });

  it("parses free-text baselines end to end through the fraction/aggregation math", () => {
    const rows: DecisionProgressInput[] = [
      { key: "d1:s0", baseline: parseSignalBaseline("18 days"), current: parseSignalBaseline("10 days"), target: 5, worth: 500 },
      { key: "d1:s1", baseline: parseSignalBaseline("not captured yet"), current: 0, target: 20, worth: 500 },
    ];
    // s0: (18-10)/(18-5) = 8/13 ~ 0.615; s1: 0/20 = 0. Weighted 50/50 -> ~31%.
    expect(computeProgressAttainmentPct(rows)).toBe(Math.round((8 / 13 / 2) * 100));
  });
});

// ────────────────────────────────────────────────────────────────────────
// Change 2 — Progress tab time dimension: every signal now carries a dated
// `entries` log (seeded at commit with the baseline, appended to by "Log an
// update") instead of one editable "current" number. These helpers turn
// that log into: the latest value (what every other calc already expects
// as `current`), when the next check is due off the signal's own cadence,
// and the real dated trajectory the curve plots.
// ────────────────────────────────────────────────────────────────────────
describe("latestEntry / currentValueFromEntries", () => {
  it("returns undefined for an empty or missing log", () => {
    expect(latestEntry(undefined)).toBeUndefined();
    expect(latestEntry([])).toBeUndefined();
  });

  it("returns the last entry, not the largest or first", () => {
    const entries: ProgressEntry[] = [
      { date: "2026-01-01", value: 10 },
      { date: "2026-03-01", value: 40 },
      { date: "2026-02-01", value: 25 },
    ];
    // appended order, not date-sorted — "latest" means most recently logged.
    expect(latestEntry(entries)?.value).toBe(25);
  });

  it("currentValueFromEntries falls back to the baseline when there is no log yet", () => {
    expect(currentValueFromEntries(undefined, 18)).toBe(18);
    expect(currentValueFromEntries([], 18)).toBe(18);
  });

  it("currentValueFromEntries reads the latest logged value", () => {
    const entries: ProgressEntry[] = [{ date: "2026-01-01", value: 18 }, { date: "2026-02-01", value: 22 }];
    expect(currentValueFromEntries(entries, 18)).toBe(22);
  });
});

describe("todayISODate", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("nextCheckDueDate", () => {
  it("adds 7 days for a weekly cadence", () => {
    expect(nextCheckDueDate("2026-07-01", "weekly")).toBe("2026-07-08");
  });

  it("adds 14 days for a biweekly cadence", () => {
    expect(nextCheckDueDate("2026-07-01", "biweekly")).toBe("2026-07-15");
  });

  it("adds ~30 days for a monthly cadence", () => {
    expect(nextCheckDueDate("2026-07-01", "monthly")).toBe("2026-07-31");
  });

  it("adds ~91 days for a quarterly cadence", () => {
    expect(nextCheckDueDate("2026-07-01", "quarterly")).toBe("2026-09-30");
  });
});

describe("computeActualTrajectory", () => {
  it("is empty when no signal has any entries", () => {
    expect(computeActualTrajectory([], "2026-07-20")).toEqual([]);
  });

  it("a single signal produces one point per distinct entry date, plus today", () => {
    const signals: SignalProgressInput[] = [
      {
        key: "a",
        baseline: 0,
        target: 100,
        worth: 1000,
        entries: [
          { date: "2026-01-01", value: 0 },
          { date: "2026-02-01", value: 50 },
        ],
      },
    ];
    const points = computeActualTrajectory(signals, "2026-03-01");
    expect(points.map((p) => p.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(points[0].monthsFromStart).toBe(0);
    expect(points[0].pct).toBe(0);
    expect(points[1].pct).toBe(50);
    // no new entry logged between Feb and today — carries the last known value forward.
    expect(points[2].pct).toBe(50);
    expect(points[2].monthsFromStart).toBeGreaterThan(points[1].monthsFromStart);
  });

  it("weights multiple signals by worth at every sampled date, same as computeProgressAttainmentPct", () => {
    const signals: SignalProgressInput[] = [
      { key: "big", baseline: 0, target: 100, worth: 900, entries: [{ date: "2026-01-01", value: 100 }] },
      { key: "small", baseline: 0, target: 100, worth: 100, entries: [{ date: "2026-01-01", value: 0 }] },
    ];
    const points = computeActualTrajectory(signals, "2026-01-01");
    expect(points).toHaveLength(1);
    expect(points[0].pct).toBe(90);
  });

  it("excludes a signal from a date's weighting before that signal's first entry exists", () => {
    const signals: SignalProgressInput[] = [
      { key: "early", baseline: 0, target: 100, worth: 500, entries: [{ date: "2026-01-01", value: 100 }] },
      { key: "late", baseline: 0, target: 100, worth: 500, entries: [{ date: "2026-02-01", value: 0 }] },
    ];
    const points = computeActualTrajectory(signals, "2026-02-01");
    // At 2026-01-01, "late" hasn't been committed yet — only "early" counts, fully landed -> 100%.
    expect(points[0].date).toBe("2026-01-01");
    expect(points[0].pct).toBe(100);
    // At 2026-02-01, both count: early=100 (worth 500), late=0 (worth 500) -> 50%.
    expect(points[1].pct).toBe(50);
  });
});

describe("computeSparklineGeometry", () => {
  it("returns no points for an empty value list", () => {
    expect(computeSparklineGeometry([], 100, 80, 24).points).toEqual([]);
  });

  it("places a single value at the horizontal midpoint", () => {
    const geo = computeSparklineGeometry([50], 100, 80, 24);
    expect(geo.points).toHaveLength(1);
    expect(geo.points[0].x).toBe(40);
  });

  it("spans the full width evenly across multiple values", () => {
    const geo = computeSparklineGeometry([0, 50, 100], 100, 80, 24);
    expect(geo.points[0].x).toBe(0);
    expect(geo.points[1].x).toBe(40);
    expect(geo.points[2].x).toBe(80);
  });

  it("scales the min value to the bottom and the max (including the target) to the top", () => {
    const geo = computeSparklineGeometry([0, 100], 100, 80, 24);
    expect(geo.points[0].y).toBe(24); // min -> bottom
    expect(geo.points[1].y).toBe(0); // max -> top
    expect(geo.targetY).toBe(0); // target equals the max value here
  });

  it("keeps the target line inside range when every logged value is still below it", () => {
    const geo = computeSparklineGeometry([10, 20, 30], 100, 80, 24);
    // target (100) becomes the new max, so the highest logged value (30) sits below the top edge.
    expect(geo.targetY).toBe(0);
    expect(geo.points[2].y).toBeGreaterThan(0);
  });

  it("never divides by zero when every value (and the target) are identical", () => {
    const geo = computeSparklineGeometry([50, 50], 50, 80, 24);
    expect(geo.points.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});
