import { describe, it, expect } from "vitest";
import {
  trackedMetricsForGoal,
  trackedMetricsByGoal,
  crossGoalShareMultiplierFor,
  parseLeadingNumber,
} from "@/lib/attain/measurementScorecard";
import {
  computeMultiGoalContributions,
  defaultBaseline,
  defaultLeverValues,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import { accessAlignConfig } from "@/lib/attain/accessAlign";
import { workforceAlignConfig } from "@/lib/attain/workforceAlign";
import type { AttainPlanning } from "@/lib/attain/attainPlanning";
import {
  computeProgressAttainmentPct,
  currentValueFromEntries,
  todayISODate,
  type ProgressEntry,
} from "@/lib/attain/attainProgress";
import type { AlignConfig, AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * The CLOSED LOOP: the Attainment hub tracks exactly the metrics the partner
 * chose in the measurement Plan (planning.measurement / measurementByGoal), and
 * measured attainment is computed from dated updates logged against THOSE
 * metrics. These tests exercise the shared derivation both the hub and the
 * flow's seeding read from, so a drift between plan and hub would fail here.
 */

const setting: AttainSetting = "outpatient";
const baseline = defaultBaseline(setting);

/** Full raw selections for an align config (first option each), plus the engine
 * levers the config maps them to — exactly what the app persists. */
function mergedValues(config: AlignConfig): LeverValues {
  const sel: LeverValues = {};
  for (const q of config.questions) {
    if (q.stacksOnQuestionId) continue;
    sel[q.storeKey] = q.mode === "single" ? [q.options[0].id] : q.options.map((o) => o.id);
  }
  const ctx: AlignContext = { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 };
  return { ...sel, ...config.toLeverValues(sel, ctx) };
}

const accessVals = mergedValues(accessAlignConfig);
const retentionVals = mergedValues(workforceAlignConfig);

function combinedFor(goals: GoalId[], valuesByGoal: Partial<Record<GoalId, LeverValues>>, split = 50) {
  return computeMultiGoalContributions(goals, setting, baseline, valuesByGoal, split);
}

describe("parseLeadingNumber — numeric vs qualitative targets", () => {
  it("reads the leading number out of a real target string", () => {
    expect(parseLeadingNumber("under 14 days")).toBe(14);
    expect(parseLeadingNumber("over 80%")).toBe(80);
    expect(parseLeadingNumber("$760K / yr")).toBe(760);
    expect(parseLeadingNumber("2 min")).toBe(2);
  });
  it("returns null for a directional/qualitative target that carries no number", () => {
    expect(parseLeadingNumber("cleared")).toBeNull();
    expect(parseLeadingNumber("half the queue")).toBeNull();
    expect(parseLeadingNumber("rising against baseline")).toBeNull();
    expect(parseLeadingNumber("collected each quarter")).toBeNull();
    expect(parseLeadingNumber(undefined)).toBeNull();
  });
});

describe("closed loop — the hub tracks exactly the metrics chosen in Plan", () => {
  it("tracks the derived default picks when the partner has not overridden them", () => {
    const combined = combinedFor(["access"], { access: accessVals });
    const rows = trackedMetricsForGoal({
      goal: "access",
      setting,
      baseline,
      values: accessVals,
      combined,
      multiplier: 1,
      planning: {},
      isMulti: false,
    });
    expect(rows.length).toBeGreaterThan(0);
    // Every tracked row is keyed `${goal}:${metricId}` and carries a baseline/target.
    for (const r of rows) {
      expect(r.key).toBe(`access:${r.metricId}`);
      expect(r.goal).toBe("access");
      expect(typeof r.baselineText).toBe("string");
      expect(typeof r.targetText).toBe("string");
    }
  });

  it("tracks EXACTLY the partner's explicit picks, not the defaults", () => {
    // Pick a single, specific metric on the wait link and nothing else there.
    const planning: AttainPlanning = {
      measurement: { chosen: { wait: ["no-show-rate"], minutes: ["minutes-saved-per-note"], schedule: [], visits: [] } },
    };
    const combined = combinedFor(["access"], { access: accessVals });
    const rows = trackedMetricsForGoal({
      goal: "access",
      setting,
      baseline,
      values: accessVals,
      combined,
      multiplier: 1,
      planning,
      isMulti: false,
    });
    const ids = rows.map((r) => r.metricId);
    // The one picked wait metric is tracked; the deselected links contribute nothing.
    expect(ids).toContain("no-show-rate");
    expect(ids).toContain("minutes-saved-per-note");
    expect(ids).not.toContain("third-next-available");
    expect(ids).not.toContain("realized-visits");
  });

  it("carries the partner's target/owner/date, and shows blank owner/date honestly", () => {
    const planning: AttainPlanning = {
      measurement: {
        chosen: { minutes: ["minutes-saved-per-note"] },
        entries: { "minutes-saved-per-note": { target: "3 min", owner: "Ops Lead", byWhen: "2026-10-01" } },
      },
    };
    const combined = combinedFor(["access"], { access: accessVals });
    const rows = trackedMetricsForGoal({
      goal: "access", setting, baseline, values: accessVals, combined, multiplier: 1, planning, isMulti: false,
    });
    const minutes = rows.find((r) => r.metricId === "minutes-saved-per-note")!;
    expect(minutes.targetText).toBe("3 min");
    expect(minutes.targetNum).toBe(3);
    expect(minutes.owner).toBe("Ops Lead");
    expect(minutes.byWhen).toBe("2026-10-01");

    // A metric the partner picked but never assigned reads blank, never fabricated.
    const planningBlank: AttainPlanning = { measurement: { chosen: { minutes: ["minutes-saved-per-note"] } } };
    const blankRows = trackedMetricsForGoal({
      goal: "access", setting, baseline, values: accessVals, combined, multiplier: 1, planning: planningBlank, isMulti: false,
    });
    const blank = blankRows.find((r) => r.metricId === "minutes-saved-per-note")!;
    expect(blank.owner).toBe("");
    expect(blank.byWhen).toBe("");
  });
});

describe("closed loop — measured attainment computes from logged updates against the chosen metrics", () => {
  it("moves the measured percent as real values are logged toward target", () => {
    const planning: AttainPlanning = {
      measurement: { chosen: { minutes: ["minutes-saved-per-note"] } },
    };
    const combined = combinedFor(["access"], { access: accessVals });
    const rows = trackedMetricsForGoal({
      goal: "access", setting, baseline, values: accessVals, combined, multiplier: 1, planning, isMulti: false,
    });
    const minutes = rows.find((r) => r.metricId === "minutes-saved-per-note")!;
    expect(minutes.baselineNum).toBe(0);
    expect(minutes.targetNum).not.toBeNull();
    const target = minutes.targetNum as number;
    expect(target).toBeGreaterThan(0);

    // Mirror StepAttainment's exact computation: current = latest logged value.
    const score = (entries: ProgressEntry[]) =>
      computeProgressAttainmentPct([
        {
          key: minutes.key,
          baseline: minutes.baselineNum,
          current: currentValueFromEntries(entries, minutes.baselineNum),
          target,
          worth: 1,
        },
      ]);

    // At baseline (only the seed entry) attainment is 0.
    expect(score([{ date: todayISODate(), value: minutes.baselineNum }])).toBe(0);
    // Halfway to target -> 50%. At/over target -> 100%.
    expect(score([{ date: "2026-01-01", value: minutes.baselineNum }, { date: "2026-02-01", value: target / 2 }])).toBe(50);
    expect(score([{ date: "2026-01-01", value: minutes.baselineNum }, { date: "2026-03-01", value: target }])).toBe(100);
  });
});

describe("closed loop — multi-goal groups per goal, read from measurementByGoal", () => {
  it("returns one group per goal, keyed per goal so two goals never collide", () => {
    const goals: GoalId[] = ["access", "retention"];
    const valuesByGoal = { access: accessVals, retention: retentionVals };
    const combined = combinedFor(goals, valuesByGoal, 60);
    // Per-goal picks live under measurementByGoal (access and retention even
    // share the metric id `minutes-saved-per-note`).
    const planning: AttainPlanning = {
      measurementByGoal: {
        access: { chosen: { minutes: ["minutes-saved-per-note"] } },
        retention: { chosen: { charting: ["minutes-saved-per-note"] } },
      },
    };
    const byGoal = trackedMetricsByGoal({
      goals,
      setting,
      baseline,
      valuesByGoal,
      combined,
      freedTimeSplit: 60,
      planning,
      defaultValues: (g) => defaultLeverValues(g, setting),
    });
    expect(byGoal.map((g) => g.goal)).toEqual(["access", "retention"]);
    const accessKeys = byGoal.find((g) => g.goal === "access")!.rows.map((r) => r.key);
    const retentionKeys = byGoal.find((g) => g.goal === "retention")!.rows.map((r) => r.key);
    expect(accessKeys).toContain("access:minutes-saved-per-note");
    expect(retentionKeys).toContain("retention:minutes-saved-per-note");
    // The shared metric id resolves to two DISTINCT keys, never one collision.
    expect(accessKeys).not.toContain("retention:minutes-saved-per-note");
  });

  it("splits the shared freed-time multiplier between access and retention", () => {
    const goals: GoalId[] = ["access", "retention"];
    expect(crossGoalShareMultiplierFor(goals, "outpatient", 70, "access")).toBeCloseTo(0.7);
    expect(crossGoalShareMultiplierFor(goals, "outpatient", 70, "retention")).toBeCloseTo(0.3);
    // A single-goal plan (or any other pairing) is never split.
    expect(crossGoalShareMultiplierFor(["access"], "outpatient", 70, "access")).toBe(1);
    expect(crossGoalShareMultiplierFor(["revenue", "quality"], "outpatient", 70, "revenue")).toBe(1);
  });
});
