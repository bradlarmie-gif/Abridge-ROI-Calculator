/**
 * Attain — Progress-from-committed-decisions math.
 *
 * The Attainment hub's Progress tab tracks every committed decision on its
 * own baseline -> current -> target line (the "before" the partner entered
 * on Commit, where the metric actually is today, and the lever value they
 * dialed on Build the case). This module is the ONLY place attainment gets
 * computed off those REAL, partner-entered observations. `attainCalc.ts`'s
 * `AttainmentResult` is a projection (pace x whether committed decisions'
 * due dates have arrived) and is unchanged by this module — the Strategy
 * tab keeps showing that figure; the Progress tab shows this one.
 */

export interface DecisionProgressInput {
  key: string;
  baseline: number;
  current: number;
  target: number;
  /** Dollar worth used to weight this decision in the combined percent —
   * always the same marginalMargin figure shown elsewhere in the plan,
   * never invented. Negative worth is treated as 0 weight (never has a
   * negative pull on the average). */
  worth: number;
}

export type AttainmentStatus = "not_started" | "in_motion" | "landed";

/** Turns a lever's chosen/reality value (a plain number for percent/count/
 * toggle controls, or a string array for "lines" controls) into the single
 * number the progress track is built from — the array's length for a
 * "lines" lever (how many lines are actually live), the number itself
 * otherwise. Shared by the baseline default (realityStart) and the target
 * (the chosen build-case value), so both sides of a track are always
 * derived the same way. */
export function leverNumericValue(value: number | string[] | undefined): number {
  if (Array.isArray(value)) return value.length;
  return typeof value === "number" ? value : 0;
}

/**
 * 0-1 how far `current` has moved from `baseline` toward `target`, for one
 * decision. Direction-agnostic: works whether the metric climbs toward its
 * target (e.g. a percent moving up) or falls toward it (e.g. query
 * turnaround days moving down), because the numerator and denominator flip
 * sign together. Clamped to [0, 1] so overshoot reads as fully landed and
 * moving the wrong way never reads as negative attainment.
 */
export function decisionAttainmentFraction(baseline: number, current: number, target: number): number {
  const span = target - baseline;
  if (span === 0) return current === target ? 1 : 0;
  return Math.min(1, Math.max(0, (current - baseline) / span));
}

/** Status label from a decision's fraction, house-palette only: gray for
 * not started, coral for in motion, ink for landed. Never green, never
 * amber — see the UI layer's `STATUS_STYLE` for the actual colors. */
export function decisionStatus(fraction: number): AttainmentStatus {
  if (fraction >= 1) return "landed";
  if (fraction <= 0) return "not_started";
  return "in_motion";
}

/**
 * Weighted average attainment percent (0-100) across every committed
 * decision, weighted by each decision's own worth so a high-value decision
 * moves the number more than a token one — the same "worth" already shown
 * on Commit and in the plan's decision table, never a separate figure.
 * Falls back to a plain (unweighted) average when every decision's worth is
 * 0 or negative, so a plan that hasn't built a dollar figure yet still has
 * a real, moving percent instead of being stuck at 0. Returns 0 for an
 * empty decision list.
 */
export function computeProgressAttainmentPct(decisions: DecisionProgressInput[]): number {
  if (decisions.length === 0) return 0;

  const totalWorth = decisions.reduce((sum, d) => sum + Math.max(0, d.worth), 0);

  if (totalWorth <= 0) {
    const avg =
      decisions.reduce((sum, d) => sum + decisionAttainmentFraction(d.baseline, d.current, d.target), 0) /
      decisions.length;
    return Math.round(avg * 100);
  }

  const weighted = decisions.reduce(
    (sum, d) => sum + decisionAttainmentFraction(d.baseline, d.current, d.target) * Math.max(0, d.worth),
    0,
  );
  return Math.round((weighted / totalWorth) * 100);
}
