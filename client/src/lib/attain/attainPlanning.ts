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

export type PlanPhaseId = "start" | "expand" | "steady";

export const PLAN_PHASE_IDS: PlanPhaseId[] = ["start", "expand", "steady"];

/** The partner-editable layer on top of the derived phased plan: a per-phase
 * owner override (falls back to the goal owner), a per-phase leading-signal
 * target (falls back to a derived default), and one optional partner-
 * disclosed risk that only renders when it is actually filled in. */
export interface AttainPlanning {
  phaseOwners?: Partial<Record<PlanPhaseId, string>>;
  phaseSignalTargets?: Partial<Record<PlanPhaseId, string>>;
  partnerRisk?: string;
}

export const DEFAULT_ATTAIN_PLANNING: AttainPlanning = {};

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
export function phaseOwner(planning: AttainPlanning | undefined, phase: PlanPhaseId, goalOwnerName: string): string {
  const override = planning?.phaseOwners?.[phase]?.trim();
  if (override) return override;
  return goalOwnerName.trim();
}

/** Read a phase's leading-signal target, falling back to a derived default
 * the caller supplies (e.g. the committed minutes/note, or the realized
 * visit count). */
export function phaseSignalTarget(
  planning: AttainPlanning | undefined,
  phase: PlanPhaseId,
  derivedDefault: string,
): string {
  const override = planning?.phaseSignalTargets?.[phase]?.trim();
  return override ? override : derivedDefault;
}
