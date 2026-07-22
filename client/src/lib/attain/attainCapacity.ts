import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

/**
 * Attain — CAPACITY (nursing) decision chain engine.
 *
 * Capacity for nurses is OVERTIME reduction. Overtime is driven by charting
 * after the shift: ambient documentation lets nurses chart in the moment
 * instead of catching up late, batching notes, or working past shift end
 * through a missed lunch. This module EXPOSES the existing Explore driver
 * `nursingOvertime` (see exploreDriverCalcs.ts) as an ordered step-down
 * ladder, the same discipline as attainAccess.ts / attainQuality.ts. Nothing
 * here is a new money model; it decomposes the SAME engine formula into an
 * honest, gated sequence a CFO can read.
 *
 * THE ENGINE FORMULA (exploreDriverCalcs.ts, `nursingOvertime`):
 *   otHoursPerNurseWeek × (reductionPercent / 100) × nurses × 52 × otHourlyRate
 *
 * THE LADDER (single gated ladder, like access):
 *   THE FIRST DOMINO — minutes saved per note, so nurses chart in the moment
 *     instead of after the shift. The mechanism, not a dollar.
 *   GROUND IT — overtime hours per nurse per week now, nurses in scope, and
 *     the loaded overtime hourly rate. Total overtime hours a year =
 *     otHoursPerNurseWeek × nurses × 52. No dollar yet, this is the pool.
 *   THE GATE / DIAGNOSE THE LEAK — of that overtime, what share is
 *     documentation-driven (post-shift charting, batching notes and catching
 *     up late, missed lunches pushing work past shift end) versus overtime
 *     from short staffing or a census surge, which Abridge cannot touch. The
 *     documentation-attributable overtime is the CEILING. You can only cut the
 *     overtime charting causes.
 *   REALIZED — overtime hours avoided = the conservative share of the
 *     documentation-attributable overtime this plan actually removes.
 *   THE PRIZE — overtime hours avoided × loaded overtime rate.
 *
 * RECONCILIATION: the two gate factors are the engine's ONE reduction knob,
 * split into a diagnosis and a conversion. The effective reduction the engine
 * sees is `docAttributableSharePct/100 × conversionPct/100 × 100`, so the
 * prize is exactly `nursingOvertime` at that reduction. `exploreStateForReconciliation`
 * below proves that formula-level tie against `computeAllDriverValues`, the
 * same way every sibling chain does (see attainCapacity.test.ts).
 *
 * NO DOUBLE-COUNT WITH RETENTION: overtime avoided is wages you stop paying
 * now; retention is the replacement cost of a nurse who would have quit.
 * Different dollars, same root (less after-hours charting). The engine already
 * keeps `nursingOvertime` and `nursingRetention` as separate lines, so this
 * ladder never credits the same relief twice — see `NURSING_CAPACITY_NO_DOUBLE_COUNT`.
 */

// ────────────────────────────────────────────────────────────────────────
// Constants — descriptive defaults matching Explore's own DEFAULT_EXPLORE_STATE
// (nursingOtHoursPerNurseWeek 1.0, nursingOtHourlyRate 75), never invented.
// ────────────────────────────────────────────────────────────────────────

export const DEFAULT_OT_HOURS_PER_NURSE_WEEK = 1.0;
export const DEFAULT_OT_HOURLY_RATE = 75;

/** Who has to act, shared verbatim across Build the case and Planning: the
 * freed minutes only remove overtime if they actually land during the shift
 * (chart in the moment), not become a new task. That is nursing operations'
 * to hold, not Abridge's. */
export const NURSING_CAPACITY_WHO_ACTS = "Nursing operations, the chart-in-the-moment workflow";

/** The no-double-count discipline, stated plainly and shown to the partner.
 * Deliberately em-dash free (design law). */
export const NURSING_CAPACITY_NO_DOUBLE_COUNT =
  "Counted once. Overtime avoided is wages you stop paying now. Retention is the replacement cost of a nurse who would have quit. Different dollars, same root of less after-hours charting, so the plan never credits the same relief twice.";

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

// ────────────────────────────────────────────────────────────────────────
// Local helpers (self-contained, same convention as attainAccess.ts)
// ────────────────────────────────────────────────────────────────────────

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}
function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtHours(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}
function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function mkState(): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "nursing",
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

// ────────────────────────────────────────────────────────────────────────
// GROUND IT — the editable facts. Each falls back to Explore's own default so
// a partner who never touches a field can never drift the reconciliation, and
// a partner who sets their own figure moves Build, Planning, and the engine
// together.
// ────────────────────────────────────────────────────────────────────────

export function otHoursPerNurseWeekFor(values: LeverValues): number {
  const v = asNum(values.capacityOtHoursPerWeek);
  return v > 0 ? v : DEFAULT_OT_HOURS_PER_NURSE_WEEK;
}
export function otHourlyRateFor(values: LeverValues): number {
  const v = asNum(values.capacityOtRate);
  return v > 0 ? v : DEFAULT_OT_HOURLY_RATE;
}

// ────────────────────────────────────────────────────────────────────────
// Scope — nurses in scope, capped to the partner's Starting-point nursing
// FTE count (same convention every other nursing chain uses).
// ────────────────────────────────────────────────────────────────────────

export interface CapacityScope {
  units: string[];
  nursesInScope: number;
}

export function computeCapacityScope(baseline: AttainBaseline, values: LeverValues): CapacityScope {
  const totalNurses = Math.max(0, Math.round(baseline.nursingFtes ?? 0));
  const requested = Math.max(0, Math.round(asNum(values.capacityNurses)));
  const nursesInScope = totalNurses > 0 ? Math.min(requested, totalNurses) : requested;
  return { units: asLines(values.capacityLines), nursesInScope };
}

// ────────────────────────────────────────────────────────────────────────
// The full chain
// ────────────────────────────────────────────────────────────────────────

export interface CapacityChainResult {
  scope: CapacityScope;
  otHoursPerNurseWeek: number;
  otHourlyRate: number;
  /** The pool: overtime hours a year now, before any diagnosis. */
  totalOtHoursYr: number;
  /** THE GATE: the documentation-attributable share of overtime, the ceiling
   * on what charting can move. */
  docAttributableSharePct: number;
  docAttributableOtHoursYr: number;
  /** The conservative share of the documentation-attributable overtime this
   * plan actually removes. */
  conversionPct: number;
  /** REALIZED: overtime hours avoided. */
  realizedOtHoursAvoided: number;
  /** The single engine-equivalent reduction percent (of total overtime), so
   * `nursingOvertime` at this reduction equals the prize exactly. */
  effectiveReductionPct: number;
  /** THE PRIZE: overtime hours avoided × loaded overtime rate. */
  prize: number;
  formulas: {
    ground: string;
    gate: string;
    payoff: string;
  };
}

export function computeCapacityChain(baseline: AttainBaseline, values: LeverValues): CapacityChainResult {
  const scope = computeCapacityScope(baseline, values);
  const otHoursPerNurseWeek = otHoursPerNurseWeekFor(values);
  const otHourlyRate = otHourlyRateFor(values);
  const docAttributableSharePct = clampPct(asNum(values.capacityDocShare));
  const conversionPct = clampPct(asNum(values.capacityConversion));

  const totalOtHoursYr = scope.nursesInScope * otHoursPerNurseWeek * 52;
  const docAttributableOtHoursYr = totalOtHoursYr * (docAttributableSharePct / 100);
  const realizedOtHoursAvoided = docAttributableOtHoursYr * (conversionPct / 100);
  const effectiveReductionPct = (docAttributableSharePct / 100) * (conversionPct / 100) * 100;
  const prize = Math.round(realizedOtHoursAvoided * otHourlyRate);

  const groundFormula = totalOtHoursYr > 0
    ? `${fmtInt(scope.nursesInScope)} nurses × ${fmtHours(otHoursPerNurseWeek)} OT hrs/nurse/wk × 52 wks = ${fmtInt(totalOtHoursYr)} overtime hrs/yr.`
    : NO_MOVE_FORMULA;

  const staffingShare = Math.max(0, 100 - Math.round(docAttributableSharePct));
  const gateFormula = docAttributableOtHoursYr > 0
    ? `${fmtInt(totalOtHoursYr)} overtime hrs/yr × ${fmtPct(docAttributableSharePct)}% documentation-attributable = ${fmtInt(docAttributableOtHoursYr)} hrs charting can move. The other ${staffingShare}% is short staffing or census, which this plan cannot touch.`
    : NO_MOVE_FORMULA;

  const payoffFormula = prize > 0
    ? `${fmtInt(docAttributableOtHoursYr)} documentation-attributable hrs × ${fmtPct(conversionPct)}% removed = ${fmtInt(realizedOtHoursAvoided)} overtime hrs avoided × $${fmtInt(otHourlyRate)}/hr = ~${fmtMoneyCompact(prize)}.`
    : NO_MOVE_FORMULA;

  return {
    scope,
    otHoursPerNurseWeek,
    otHourlyRate,
    totalOtHoursYr,
    docAttributableSharePct,
    docAttributableOtHoursYr,
    conversionPct,
    realizedOtHoursAvoided,
    effectiveReductionPct,
    prize,
    formulas: { ground: groundFormula, gate: gateFormula, payoff: payoffFormula },
  };
}

// ────────────────────────────────────────────────────────────────────────
// Reconciliation harness — proves the chain ties to Explore's own
// `nursingOvertime` driver. Not used by the app itself, only by tests.
// ────────────────────────────────────────────────────────────────────────

export function exploreStateForReconciliation(baseline: AttainBaseline, values: LeverValues): ExploreState {
  const chain = computeCapacityChain(baseline, values);
  const state = mkState();
  state.numberOfProviders = chain.scope.nursesInScope;
  const td = state.timeDriverInputs as any;
  td.nursingOtEnabled = true;
  td.nursingOtHoursPerNurseWeek = chain.otHoursPerNurseWeek;
  td.nursingOtReductionPercent = chain.effectiveReductionPct;
  td.nursingOtHourlyRate = chain.otHourlyRate;
  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every capacity "row" this chain surfaces to the generic Commit/Plan
 * bookkeeping, in chain order. Kept in sync with `LEVERS.capacity` in
 * attainLevers.ts — each id here must match a `LEVERS.capacity[].id`. */
export const CAPACITY_LEVER_IDS = [
  "capacityLines",
  "capacityNurses",
  "capacityOtHoursPerWeek",
  "capacityOtRate",
  "capacityDocShare",
  "capacityConversion",
] as const;

/**
 * Adapts the chain into the same `LeverContributionsResult` shape every other
 * goal returns. Like access, this is a single gated ladder: no rung is
 * independently "worth $X" (the rungs multiply), so the whole realized dollar
 * is attributed to the conversion decision (`capacityConversion`, the share of
 * documentation-attributable overtime this plan removes) and every other row
 * carries $0. The running total is the one honest figure.
 */
export function computeCapacityContributions(baseline: AttainBaseline, values: LeverValues): LeverContributionsResult {
  const chain = computeCapacityChain(baseline, values);
  const { scope, formulas, prize, realizedOtHoursAvoided, totalOtHoursYr, docAttributableOtHoursYr } = chain;

  const rows: { id: string; count: number; formula: string }[] = [
    { id: "capacityLines", count: scope.units.length, formula: scope.units.length > 0 ? `${scope.units.length} unit(s) in scope.` : NO_MOVE_FORMULA },
    { id: "capacityNurses", count: scope.nursesInScope, formula: scope.nursesInScope > 0 ? `${fmtInt(scope.nursesInScope)} nurses in scope.` : NO_MOVE_FORMULA },
    { id: "capacityOtHoursPerWeek", count: Math.round(totalOtHoursYr), formula: formulas.ground },
    { id: "capacityOtRate", count: Math.round(chain.otHourlyRate), formula: chain.otHourlyRate > 0 ? `$${fmtInt(chain.otHourlyRate)}/hr loaded overtime rate.` : NO_MOVE_FORMULA },
    { id: "capacityDocShare", count: Math.round(docAttributableOtHoursYr), formula: formulas.gate },
    { id: "capacityConversion", count: Math.round(realizedOtHoursAvoided), formula: formulas.payoff },
  ];

  const attributedId = prize > 0 ? "capacityConversion" : null;
  const perLever: LeverContribution[] = rows.map((r) => ({
    id: r.id,
    marginalMargin: r.id === attributedId ? prize : 0,
    marginalCount: r.count,
    pctOfTotal: r.id === attributedId ? 1 : 0,
    formula: r.formula,
  }));

  return { perLever, totalMargin: prize, totalCount: Math.round(realizedOtHoursAvoided) };
}
