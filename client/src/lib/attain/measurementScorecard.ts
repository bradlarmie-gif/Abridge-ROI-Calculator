/**
 * Attain — the measurement scorecard, the single source of truth for WHICH
 * metrics a plan tracks.
 *
 * This is the closed loop. The Plan step (StepMeasurementPlan /
 * StepMultiMeasurementPlan, via MeasurementPlanSurface) lets the partner pick,
 * per chain link, the metrics they will own, each with a baseline, an editable
 * target, an owner, and a rough by-when, all persisted on
 * `planning.measurement` (single-goal) / `planning.measurementByGoal[goal]`
 * (multi-goal). `trackedMetricsForGoal` reads exactly those picks back out, so
 * the Attainment hub tracks the very metrics the partner chose in Plan and
 * nothing else.
 *
 * Pure data/logic (no JSX) so both the Attainment hub (StepAttainment) and the
 * flow's progress-log seeding (AttainFlow) can share one derivation and can
 * never disagree about which metrics exist.
 */

import type { GoalId, AttainSetting } from "./attainTypes";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "./attainLevers";
import type { MeasurementBaselineTag } from "./attainMeasurement";
import {
  measurementChosen,
  measurementBaseline,
  measurementBaselineIsOwn,
  measurementCustom,
  measurementTarget,
  measurementOwner,
  measurementByWhen,
  measurementPlanningFor,
  type AttainPlanning,
} from "./attainPlanning";
import { parseSignalBaseline } from "./attainProgress";
import { deriveMeasurementModelFor } from "@/pages/attain/steps/MeasurementPlanSurface";

/** The goals that render through the shared measurement surface. */
export type MeasurementGoalId = Extract<GoalId, "access" | "retention" | "revenue" | "quality" | "capacity">;

export function isMeasurementGoal(goal: GoalId): goal is MeasurementGoalId {
  return goal === "access" || goal === "retention" || goal === "revenue" || goal === "quality" || goal === "capacity";
}

/**
 * The freed-documentation-hour split for one goal, matching how the Plan step
 * (StepMultiMeasurementPlan) and the engine (computeMultiGoalContributions)
 * both book it: 1 for every single-goal plan and every pairing except access +
 * retention at outpatient/ED, where the one shared hour is split so the two
 * goals never double-count it. Recomputing it here (rather than threading it in)
 * keeps the Attainment hub's baselines reconciled to the same combined prize.
 */
export function crossGoalShareMultiplierFor(
  goals: GoalId[],
  setting: AttainSetting,
  freedTimeSplit: number,
  goal: GoalId,
): number {
  const hasFreedTimeConflict =
    (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");
  if (!hasFreedTimeConflict) return 1;
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  if (goal === "access") return accessShare;
  if (goal === "retention") return 1 - accessShare;
  return 1;
}

/** Reads the leading number out of a free-text target like "under 14 days",
 * "over 80%", or "$760K / yr" -> 14 / 80 / 760. Returns `null` (never NaN) for
 * a directional/qualitative target that carries no number ("cleared", "half the
 * queue", "rising against baseline", "collected each quarter"), so the caller
 * can track those metrics honestly without a fabricated numeric fraction. */
export function parseLeadingNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  // Strip digit-grouping commas first so a real target like "4,900 / yr" reads
  // as 4900, not 4 (a truncated target would make any small logged value read
  // as fully landed). The K/M scale suffix is intentionally left to the reader.
  const match = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

/** One metric the partner chose to track, resolved live off the derived chain
 * and the partner's own picks/targets/owners/dates. This is the unit the
 * Attainment hub tracks: exactly what was chosen in Plan. */
export interface TrackedMetric {
  /** Progress-log key, also the stable React key: `${goal}:${metricId}`. */
  key: string;
  goal: GoalId;
  metricId: string;
  linkId: string;
  /** The 1-based chain-link number, for the ordered scorecard. */
  linkN: number;
  linkTitle: string;
  label: string;
  helper: string;
  unit: string;
  /** The metric's baseline exactly as the plan shows it ("18 days", "$0 today"). */
  baselineText: string;
  /** The numeric read of that baseline (0 when it carries no number). */
  baselineNum: number;
  baselineTag: MeasurementBaselineTag;
  /** The partner's target, or the derived/benchmark default if they left it. */
  targetText: string;
  /** The numeric read of that target, or `null` for a directional/qualitative
   * target that carries no number. Only numeric-target metrics feed the
   * measured attainment percent and the curve. */
  targetNum: number | null;
  /** The owner the partner named, or "" when they left it blank (shown honestly
   * as unassigned, never fabricated). */
  owner: string;
  /** The rough by-when the partner set, or "" when blank (shown as undated). */
  byWhen: string;
  /** True when the partner already named this metric as proof on Align. */
  fromProof: boolean;
  /** True when the partner added this metric themselves. A custom metric is a
   * tracked SIGNAL, never in the engine chain, so it never affects the derived
   * number; it only rides the scorecard and the Attainment progress log. */
  isCustom?: boolean;
}

/**
 * Every metric the partner chose to track for one goal, in chain order, blocked
 * links excluded. Reads the SAME `planning.measurement` slice the Plan step
 * wrote, so the loop closes: this returns exactly what they picked.
 */
export function trackedMetricsForGoal(params: {
  goal: MeasurementGoalId;
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  combined: MultiGoalContributionsResult | null;
  multiplier: number;
  /** The FULL planning object; the goal's slice is resolved internally. */
  planning: AttainPlanning;
  /** Whether this is one goal within a multi-goal plan (reads
   * `planning.measurementByGoal[goal]`) or a single-goal plan (reads
   * `planning.measurement`). */
  isMulti: boolean;
  /** When true, returns the chosen metrics even before the plan is "ready"
   * (its Align gate settled), mirroring exactly what the Plan step's monthly
   * check shows on screen. The Attainment hub leaves this false so it never
   * tracks an unbuilt plan; the Plan-step scorecard preview sets it true so the
   * sidebar and the main-column monthly check can never disagree. */
  ignoreReady?: boolean;
}): TrackedMetric[] {
  const { goal, setting, baseline, values, combined, multiplier, planning, isMulti, ignoreReady = false } = params;
  const model = deriveMeasurementModelFor(goal, setting, baseline, values, combined, multiplier);
  const slice = measurementPlanningFor(planning, isMulti ? goal : undefined);
  if (!ignoreReady && !model.ready) return [];

  const rows: TrackedMetric[] = [];
  for (const link of model.links) {
    if (link.blocked) continue;
    const chosen = measurementChosen(slice, link.id, link.defaultChosen);
    for (const metricId of chosen) {
      const metric = link.metrics.find((m) => m.id === metricId);
      if (!metric) continue;
      const targetText = measurementTarget(slice, metric.id, metric.defaultTarget);
      // The partner's own "today" number where they dropped one in on the Plan,
      // else the derived baseline (a fact, an Align number, or a labeled
      // benchmark). Typing one flips the tag to their data, so a benchmark is
      // never shown as their number.
      const baselineText = measurementBaseline(slice, metric.id, metric.baseline);
      const baselineIsOwn = measurementBaselineIsOwn(slice, metric.id);
      rows.push({
        key: `${goal}:${metric.id}`,
        goal,
        metricId: metric.id,
        linkId: link.id,
        linkN: link.n,
        linkTitle: link.title,
        label: metric.label,
        helper: metric.helper,
        unit: metric.unit,
        baselineText,
        baselineNum: parseSignalBaseline(baselineText),
        baselineTag: baselineIsOwn ? "data" : metric.baselineTag,
        targetText,
        targetNum: parseLeadingNumber(targetText),
        owner: measurementOwner(slice, metric.id),
        byWhen: measurementByWhen(slice, metric.id),
        fromProof: metric.fromProof,
      });
    }
    // Partner-added custom metrics for this link: tracked signals, never priced.
    // Their baseline/target/owner/date live in `entries` under the custom id,
    // exactly like a built-in, but they are not in the engine chain.
    for (const c of measurementCustom(slice, link.id)) {
      const baseText = measurementBaseline(slice, c.id, "");
      const tgtText = measurementTarget(slice, c.id, "");
      rows.push({
        key: `${goal}:${c.id}`,
        goal,
        metricId: c.id,
        linkId: link.id,
        linkN: link.n,
        linkTitle: link.title,
        label: c.label.trim() || "Custom metric",
        helper: "",
        unit: "",
        baselineText: baseText,
        baselineNum: parseSignalBaseline(baseText),
        baselineTag: "data",
        targetText: tgtText,
        targetNum: parseLeadingNumber(tgtText),
        owner: measurementOwner(slice, c.id),
        byWhen: measurementByWhen(slice, c.id),
        fromProof: false,
        isCustom: true,
      });
    }
  }
  return rows;
}

/** Every tracked metric across every goal in a plan, grouped per goal in the
 * plan's own goal order (empty groups dropped). The one entry point the
 * Attainment hub and the flow's seeding both call. */
export function trackedMetricsByGoal(params: {
  goals: GoalId[];
  setting: AttainSetting;
  baseline: AttainBaseline;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  freedTimeSplit: number;
  planning: AttainPlanning;
  defaultValues: (goal: GoalId) => LeverValues;
  /** Passed through to `trackedMetricsForGoal`: true for the Plan-step preview
   * so it mirrors the monthly check, false (default) for the Attainment hub. */
  ignoreReady?: boolean;
}): { goal: MeasurementGoalId; rows: TrackedMetric[] }[] {
  const { goals, setting, baseline, valuesByGoal, combined, freedTimeSplit, planning, defaultValues, ignoreReady = false } = params;
  const isMulti = goals.length > 1;
  const out: { goal: MeasurementGoalId; rows: TrackedMetric[] }[] = [];
  for (const goal of goals) {
    if (!isMeasurementGoal(goal)) continue;
    const rows = trackedMetricsForGoal({
      goal,
      setting,
      baseline,
      values: valuesByGoal[goal] ?? defaultValues(goal),
      combined,
      multiplier: crossGoalShareMultiplierFor(goals, setting, freedTimeSplit, goal),
      planning,
      isMulti,
      ignoreReady,
    });
    if (rows.length > 0) out.push({ goal, rows });
  }
  return out;
}
