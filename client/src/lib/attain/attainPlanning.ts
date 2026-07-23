/**
 * Attain — Planning (step-down phased plan) data + pure derivation.
 *
 * This is the data layer for the rebuilt "Planning" step (formerly "Commit")
 * for the OUTPATIENT PATIENT ACCESS goal only. It is deliberately additive
 * and backward-compatible: `AttainPlanning` holds only the handful of fields
 * the phased view lets a partner edit on top of numbers that are otherwise
 * fully DERIVED from the access chain (see `attainAccess.ts`). Nothing here
 * hardcodes a dollar, a visit count, or a minutes-per-note figure — the view
 * feeds those in from `computeAccessChain` / the combined engine result.
 *
 * Every field on `AttainPlanning` is optional, so an older saved plan that
 * never carried it decodes cleanly (see attainUrlState.ts) and a phase with
 * no override simply falls back to the goal owner / the derived target.
 */

import type { GoalId } from "./attainTypes";

export type PlanPhaseId = "start" | "expand" | "steady";

export const PLAN_PHASE_IDS: PlanPhaseId[] = ["start", "expand", "steady"];

/** The per-phase editable layer that belongs to ONE priority's phased plan:
 * a per-phase owner override (falls back to the goal/plan owner), the chosen
 * leading-signal metric per phase, and the per-phase target. Factored out of
 * `AttainPlanning` so a MULTI-priority plan can key one of these per priority
 * (`AttainPlanning.byGoal`) while a single-goal plan keeps carrying it at the
 * top level, unchanged. Every field is optional, so an unset phase simply
 * falls back to its derived default downstream. */
export interface PlanningPhaseLayer {
  phaseOwners?: Partial<Record<PlanPhaseId, string>>;
  /** Which leading-signal metric the partner chose to track per phase (a
   * member of the goal's metric menu). Falls back to the phase's derived
   * default, so an older saved plan that never carried it reads exactly as it
   * did before the dropdowns shipped. */
  phaseSignalLabels?: Partial<Record<PlanPhaseId, string>>;
  phaseSignalTargets?: Partial<Record<PlanPhaseId, string>>;
}

/** The partner-editable layer on top of the derived phased plan.
 *
 * A SINGLE-goal plan carries its one priority's phase overrides at the top
 * level (the `PlanningPhaseLayer` fields it extends) plus one optional
 * partner-disclosed risk — exactly the shape it has always had, so older
 * single-goal saved links decode unchanged.
 *
 * A MULTI-priority plan additionally carries `planExecOwner` (one accountable
 * owner for the whole plan) and `byGoal` (each selected priority's own phase
 * layer). Both are additive and optional: a link that never carried them
 * decodes cleanly, and a plan with no per-priority overrides simply falls
 * back to the derived defaults. */
export interface AttainPlanning extends PlanningPhaseLayer {
  partnerRisk?: string;
  /** One accountable exec owner for a MULTI-priority plan, shown once in the
   * combined header. Single-goal plans use `goalOwnerByPriority` instead and
   * never set this. */
  planExecOwner?: { name: string; title: string };
  /** Per-priority phase layers for a MULTI-priority plan, keyed by goal.
   * Single-goal plans keep using the top-level `PlanningPhaseLayer` fields and
   * never set this. */
  byGoal?: Partial<Record<GoalId, PlanningPhaseLayer>>;
  /** The MEASUREMENT-PLAN editable layer for a SINGLE-goal plan on the rebuilt
   * Plan step (see attainMeasurement.ts + StepMeasurementPlan.tsx). Additive
   * and fully optional, so every older saved link decodes unchanged and never
   * touches it. */
  measurement?: MeasurementPlanState;
  /** Per-goal MEASUREMENT-PLAN layers for a MULTI-goal plan, keyed by goal, so
   * two goals' metric picks/targets/owners never collide (access and retention
   * even share metric ids like `minutes-saved-per-note`). Single-goal plans
   * keep using the top-level `measurement` field and never set this. Additive
   * and optional, so an older link that never carried it decodes cleanly. */
  measurementByGoal?: Partial<Record<GoalId, MeasurementPlanState>>;
}

/** One partner-editable metric row on the measurement plan: the baseline they
 * start from, the target they are aiming at (defaults to the derived/benchmark
 * target downstream), the owner who holds it, and a rough by-when. Every field
 * is optional and BLANK by default: an owner or a date is only ever the
 * partner's own, never a fabricated name or an invented month.
 *
 * The BASELINE is the partner's own "today" number where they drop it in. When
 * blank, the metric falls back to its derived baseline (a Starting-Point fact,
 * an Align number, or a clearly-labeled industry benchmark). Typing one here
 * flips that metric's baseline tag to the partner's own data, so a benchmark
 * is never presented as their number and the counterfactual reads off the
 * truth they gave us. */
export interface MeasurementMetricEntry {
  /** Overrides the derived baseline with the partner's own "today" number.
   * Blank -> use the derived baseline (fact / Align number / labeled benchmark). */
  baseline?: string;
  /** Overrides the derived/benchmark default target. Blank -> use the default. */
  target?: string;
  /** The person who owns moving this metric. Blank by default (never invented). */
  owner?: string;
  /** A rough by-when the partner sets. Blank by default (never pre-populated). */
  byWhen?: string;
}

/** The whole measurement-plan editable layer. The DERIVED chain (which links
 * exist, each link's metric menu, every baseline and default target) is not
 * stored here; it is recomputed live from the Align state so it always tracks
 * the partner's choices. This layer holds only what the partner CHOSE and
 * TYPED on top of that: which metrics they picked per link, each picked
 * metric's target/owner/by-when, the promise date, and the one make-or-break
 * commitment. All optional, so an untouched plan falls back to derived
 * defaults everywhere. */
export interface MeasurementPlanState {
  /** The date the partner set for the promise ("by [their date]"). Blank by
   * default; the plan never invents a month. */
  promiseByWhen?: string;
  /** The owner of the make-or-break commitment (direct the freed time to the
   * schedule). Blank by default. */
  commitmentOwner?: string;
  /** A rough by-when for the commitment. Blank by default. */
  commitmentByWhen?: string;
  /** Which metric ids the partner picked to own, keyed by chain-link id. An
   * absent link entry means "use the derived default set" (the metrics they
   * already named as proof on Align); a present entry (even an empty array)
   * is the partner's own explicit pick and is honored as-is. */
  chosen?: Record<string, string[]>;
  /** Per-metric target/owner/by-when overrides, keyed by the globally-unique
   * metric id. */
  entries?: Record<string, MeasurementMetricEntry>;
  /** Metrics the partner added themselves, keyed by chain-link id. A custom
   * metric is a SIGNAL TO WATCH, not a new dollar: it rides the scorecard and
   * the Attainment progress log (baseline/target/owner/date live in `entries`
   * under its id), but it is never in the engine chain, so it can never inflate
   * the derived number. */
  custom?: Record<string, MeasurementCustomMetric[]>;
}

/** One partner-added metric on a chain link: a stable id and the label they
 * typed. Its baseline/target/owner/date live in `entries[id]` like any metric. */
export interface MeasurementCustomMetric {
  id: string;
  label: string;
}

export const DEFAULT_MEASUREMENT_PLAN: MeasurementPlanState = {};

export const DEFAULT_ATTAIN_PLANNING: AttainPlanning = {};

/** The phase-override layer to read/write for one priority. A multi-priority
 * plan keys it per goal (`byGoal[goal]`); a single-goal plan (no `goal`
 * passed) uses the top-level fields, so single-goal behavior is untouched. */
export function planningLayerFor(planning: AttainPlanning | undefined, goal?: GoalId): PlanningPhaseLayer {
  if (!planning) return {};
  if (goal) return planning.byGoal?.[goal] ?? {};
  return planning;
}

/** Three equal thirds of the plan horizon. For the outpatient-access default
 * of 9 months this is 0-3, 3-6, 6-9; it stays honest if the horizon changes.
 * Never divides by zero (a 0/negative horizon falls back to 9). */
export function phaseBoundaries(
  totalMonths: number,
): Record<PlanPhaseId, [number, number]> {
  const t = totalMonths > 0 ? Math.round(totalMonths) : 9;
  const a = Math.round(t / 3);
  const b = Math.round((2 * t) / 3);
  return { start: [0, a], expand: [a, b], steady: [b, t] };
}

/** The value-realized ramp climbing to the full prize: roughly one third by
 * the end of Start, two thirds by the end of Expand, the full prize by the
 * end of Steady. Derived straight off the prize, never hand-picked. A
 * non-positive prize (chain not complete yet) ramps to 0 across the board. */
export function phaseValueRamp(prize: number): Record<PlanPhaseId, number> {
  const p = Math.max(0, prize);
  return {
    start: Math.round(p / 3),
    expand: Math.round((2 * p) / 3),
    steady: Math.round(p),
  };
}

/** Read a phase's owner, falling back to the goal owner's name (or "" when
 * neither is set — the view shows a prompt in that case, never a fake name). */
export function phaseOwner(planning: PlanningPhaseLayer | undefined, phase: PlanPhaseId, goalOwnerName: string): string {
  const override = planning?.phaseOwners?.[phase]?.trim();
  if (override) return override;
  return goalOwnerName.trim();
}

/** Read a phase's leading-signal target, falling back to a derived default
 * the caller supplies (e.g. the committed minutes/note, or the realized
 * visit count). */
export function phaseSignalTarget(
  planning: PlanningPhaseLayer | undefined,
  phase: PlanPhaseId,
  derivedDefault: string,
): string {
  const override = planning?.phaseSignalTargets?.[phase]?.trim();
  return override ? override : derivedDefault;
}

/** Read a phase's chosen leading-signal metric, falling back to the phase's
 * derived default label (the first-domino-to-outcome sequence). An unset or
 * blank choice means "use the default", so an untouched plan reads exactly as
 * it did before the dropdowns shipped. */
export function phaseSignalLabel(
  planning: PlanningPhaseLayer | undefined,
  phase: PlanPhaseId,
  derivedDefault: string,
): string {
  const override = planning?.phaseSignalLabels?.[phase]?.trim();
  return override ? override : derivedDefault;
}

// ── Measurement-plan resolvers ──────────────────────────────────────────────
//
// The measurement plan's derived shape lives in attainMeasurement.ts; these
// resolvers read the partner's editable layer off `AttainPlanning.measurement`,
// falling back to the derived defaults so an untouched plan reads entirely off
// the Align state. Owners and dates fall back to BLANK, never a fabricated
// value.

/** The measurement layer to read for one goal, wrapped as an `AttainPlanning`
 * so the shared resolvers below (measurementChosen / Target / Owner / ByWhen)
 * and the shared `MeasurementPlanSurface` read it unchanged. A SINGLE-goal plan
 * (no `goal` passed) uses the top-level `measurement`; a MULTI-goal plan keys it
 * per goal in `measurementByGoal[goal]`, so two goals' picks never collide. */
export function measurementPlanningFor(planning: AttainPlanning | undefined, goal?: GoalId): AttainPlanning {
  if (!planning) return {};
  if (!goal) return planning;
  return { measurement: planning.measurementByGoal?.[goal] };
}

/** The metric ids the partner picked for one chain link, falling back to the
 * derived default set (the metrics they already named as proof on Align). An
 * unset link entry means "use the default"; a present entry (even empty) is an
 * explicit partner pick and is returned as-is, so deselecting every metric on
 * a link survives a reload instead of snapping back to the default. */
export function measurementChosen(
  planning: AttainPlanning | undefined,
  linkId: string,
  defaultIds: string[],
): string[] {
  const stored = planning?.measurement?.chosen?.[linkId];
  return stored === undefined ? defaultIds : stored;
}

/** A picked metric's baseline, falling back to the derived baseline (a
 * Starting-Point fact, an Align number, or a labeled benchmark). Trimmed to a
 * non-empty string, so a blanked field cleanly reverts to the derived value. */
export function measurementBaseline(
  planning: AttainPlanning | undefined,
  metricId: string,
  derivedDefault: string,
): string {
  const override = planning?.measurement?.entries?.[metricId]?.baseline?.trim();
  return override ? override : derivedDefault;
}

/** True when the partner typed their own baseline for this metric (so it is
 * their data, not a derived/benchmark default). Drives the honest baseline
 * label on the Plan and the scorecard. */
export function measurementBaselineIsOwn(planning: AttainPlanning | undefined, metricId: string): boolean {
  return !!planning?.measurement?.entries?.[metricId]?.baseline?.trim();
}

/** A picked metric's target, falling back to the derived/benchmark default. */
export function measurementTarget(
  planning: AttainPlanning | undefined,
  metricId: string,
  derivedDefault: string,
): string {
  const override = planning?.measurement?.entries?.[metricId]?.target?.trim();
  return override ? override : derivedDefault;
}

/** A picked metric's owner, falling back to BLANK (never a fabricated name). */
export function measurementOwner(planning: AttainPlanning | undefined, metricId: string): string {
  return planning?.measurement?.entries?.[metricId]?.owner ?? "";
}

/** A picked metric's rough by-when, falling back to BLANK (never invented). */
export function measurementByWhen(planning: AttainPlanning | undefined, metricId: string): string {
  return planning?.measurement?.entries?.[metricId]?.byWhen ?? "";
}

/** The partner-added custom metrics for one chain link (empty when none). */
export function measurementCustom(planning: AttainPlanning | undefined, linkId: string): MeasurementCustomMetric[] {
  return planning?.measurement?.custom?.[linkId] ?? [];
}
