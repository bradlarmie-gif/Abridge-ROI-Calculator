/**
 * Attain target / attainment result shapes.
 *
 * The functions that used to live here (`computeGoalTarget`,
 * `computeAttainment`, and their per-goal `*Target` helpers) were a dead
 * parallel money model: nothing in the app called them - `AttainFlow`
 * computes `builtTarget` from `combined` (the live `computeMultiGoalContributions`
 * result in `attainLevers.ts`) and reimplements attainment inline, off the
 * partner's own baseline. The removed code embedded its OWN divergent
 * hardcoded constants (600 encounters/provider, 2200 ED visits/provider, a
 * flat 70% realization, per-ambition margins, etc.) that could silently
 * disagree with the shipping engine if a future change ever wired them back
 * in. Removed rather than kept as unreachable code - see git history for the
 * prior implementation if it's ever needed as reference.
 *
 * The two result shapes below are kept: `GoalTargetResult` describes the
 * `target` the app actually builds (see `AttainFlow.tsx`'s `builtTarget`),
 * and `AttainmentResult` describes the `attainment` the app actually
 * computes inline, both still passed through `StepAttainment.tsx`,
 * `AttainLivePanel.tsx`, and `attain-pdf.tsx`.
 */

export interface GoalTargetResult {
  count: number;
  margin: number;
  label: string;
}

export interface AttainmentResult {
  pct: number;
  onPacePct: number;
  marginToDate: number;
}
