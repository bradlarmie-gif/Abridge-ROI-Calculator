import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

/**
 * Attain — ED ACCESS decision chain engine.
 *
 * ED access is a DIFFERENT mechanism from outpatient access
 * (`attainAccess.ts`). Outpatient access is about opening NEW capacity on a
 * schedule and filling it with demand that already exists (MIN(capacity,
 * demand)). ED access is about RECOVERING patients who already showed up
 * and left before being seen (left-without-being-seen, "LWBS"), plus
 * capturing the downstream admissions some of those recovered patients
 * become. There is no schedule to open and no separate demand ceiling to
 * find — the "demand" already walked in the door; the only question is
 * whether faster door-to-provider time gets to them before they leave.
 *
 * Rebuilt here as an ORDERED CHAIN, same discipline as every other bespoke
 * Attain chain (access/outpatient, revenue, retention/workforce, quality):
 *
 *   D1 SCOPE — which ED providers are pointed at this plan (capped to the
 *      partner's own Starting-point baseline, same convention as every
 *      other chain's D1), and how many annual ED visits that represents.
 *      No dollar yet.
 *   D2 WHAT IT IS WORTH — revenue per recovered ED visit, and margin per
 *      downstream admission, priced SEPARATELY because they are not the
 *      same claim. Benchmarked defaults, never a fabricated number. Still
 *      no dollar total, there is no volume yet.
 *   D3/D4 THE RECOVERABLE POOL (the ceiling) — the partner's own current
 *      LWBS rate x the ED volume in scope is the pool of patients who
 *      actually left without being seen. That pool is a hard ceiling:
 *      `computeEdAccessRealized` clamps realized recovery to it exactly
 *      the way outpatient's payoff clamps realized visits to
 *      MIN(capacity, demand). The partner's LWBS-reduction TARGET (the
 *      decision, informed by how much faster door-to-provider time freed
 *      charting minutes buys) is a percentage OF that same pool, so it
 *      can never exceed the pool by construction once entered through the
 *      normal 0-100% control — the clamp exists anyway, as an explicit,
 *      tested safety property, not a hope. A share of realized recovery
 *      becomes admissions.
 *   D5 THE PAYOFF (dollars, derived) — realized recovered visits x
 *      revenue/visit, plus captured admissions x admission margin. The
 *      first dollar figure in the chain.
 *
 * WHY NO CROSS-GOAL FREED-TIME SPLIT WITH RETENTION (unlike outpatient
 * access): outpatient access's D3 mechanically converts a SHARE of freed
 * documentation hours into visit capacity (`accessFreedShare` divides
 * freed hours by a visit length), so it competes with retention's D2
 * (`retentionProtect`) for the exact same hour, and `attainLevers.ts`
 * splits that one hour between them. ED access's dollar math never does
 * that division: the reduction-target decision (`edAccessLwbsReduction`)
 * is a percentage of the LWBS pool, not a literal share of freed hours,
 * and `edAccessMinutesSaved` is carried through only as informational
 * context (feeds the door-to-provider narrative and Commit's signal,
 * never a multiplicand in the payoff). There is no mechanical double
 * count to guard against, so `computeMultiGoalContributions` gives ED
 * access full, unscaled credit even when retention is also selected — see
 * that function's dispatch and the wiring test in attainEdAccess.test.ts.
 *
 * RECONCILIATION: `computeEdAccessPayoff`'s visit/admission dollars are the
 * exact same multiplication `exploreDriverCalcs.ts`'s `edLwbsEnabled` /
 * `edThroughputEnabled` blocks already use (`lwbs = annualEncounters x
 * edLwbsRate`; `recovered = lwbs x edLwbsReduction`; `value = recovered x
 * edRevenuePerVisit`; `adm = recovered x edAdmissionRate`; `value = adm x
 * edAdmissionRevenue`) — deliberately WITHOUT the engine's own
 * `edLwbsRealization`/`edAdmissionRealization` knobs. Those two knobs model
 * "not every recovered patient completes the visit" / "bed availability,
 * payer mix" — the exact same kind of honesty-cap the recoverable-pool
 * ceiling above already provides for this chain, so folding them in on top
 * would double-discount the same risk. `exploreStateForEdAccessReconciliation`
 * sets both realization knobs to 100% so tests can compare this chain's
 * dollar directly against `computeAllDriverValues`'s live engine output.
 */

// ────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────

/** Benchmark minutes saved per note. ED-specific (higher than outpatient's
 * 2 min default): matches the authored ED narrative ("9 min saved per
 * encounter" -> "1.9 hrs/wk freed per provider", see attainGoals.ts's
 * `edAccess` copy). Informational only — see the module header for why
 * this never multiplies into the payoff. */
export const DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE = 9;

/** Benchmark current LWBS rate, matching the authored ED narrative's own
 * "LWBS rate 8%" world card. A real, editable D3 input, not assumed. */
export const DEFAULT_ED_ACCESS_LWBS_RATE = 8;

/** Benchmark revenue per recovered ED visit, matching the live engine's own
 * default (`DEFAULT_EXPLORE_STATE.timeDriverInputs.edRevenuePerVisit`). */
export const DEFAULT_ED_ACCESS_REVENUE_PER_VISIT = 480;

/** Documented reference point only - matches the live engine's own default
 * (`edAdmissionRate`) - NOT auto-applied when `edAccessAdmissionRate` is
 * unset. Unlike the three benchmarks above, the admission share is a
 * genuine decision (`computeEdAccessRecovery` reads it with a true
 * realityStart of 0%, no default masking it) - see that function's own
 * comment for why. */
export const DEFAULT_ED_ACCESS_ADMISSION_RATE = 18;

/** Benchmark margin per downstream admission, matching the live engine's
 * own default (`edAdmissionRevenue`). */
export const DEFAULT_ED_ACCESS_ADMISSION_MARGIN = 8_000;

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

// ────────────────────────────────────────────────────────────────────────
// Small local helpers (deliberately not shared with attainAccess.ts /
// attainLevers.ts, to keep this chain a self-contained, independently
// reasoned-about module — same convention every other chain module uses).
// ────────────────────────────────────────────────────────────────────────

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function clampShare(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Real encounters-per-provider from the partner's own Scope baseline, or
 * the ED-specific illustrative fallback (matches `defaultBaseline("ed")` in
 * attainLevers.ts: 1,800 ED encounters/provider/yr) while the baseline is
 * still empty. */
function perProviderEncounters(baseline: AttainBaseline, fallback = 1_800): number {
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  return providers > 0 && encounters > 0 ? encounters / providers : fallback;
}

function utilizationFraction(baseline: AttainBaseline, fallbackPct = 100): number {
  const pct = baseline.utilizationPct ?? fallbackPct;
  return clampShare(pct / 100);
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
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
    careSetting: "ed",
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

// ────────────────────────────────────────────────────────────────────────
// D1 — SCOPE (who you point at ED access)
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessScope {
  /** Providers actually in scope, capped to the Starting-point baseline. */
  providersInScope: number;
  /** Annual ED visits that scope represents (providersInScope's own share
   * of the baseline's annual ED volume). */
  visitsInScope: number;
}

/** D1: reads the partner's requested provider count off the flat
 * `LeverValues` bag (`edAccessProviders`), capped to the real Starting-point
 * baseline, then derives the annual ED-visit volume that scope represents. */
export function computeEdAccessScope(baseline: AttainBaseline, values: LeverValues): EdAccessScope {
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  const requested = Math.max(0, asNum(values.edAccessProviders));
  const providersInScope = totalProviders > 0 ? Math.min(requested, totalProviders) : requested;
  const visitsInScope = providersInScope * perProviderEncounters(baseline) * utilizationFraction(baseline);
  return { providersInScope, visitsInScope };
}

// ────────────────────────────────────────────────────────────────────────
// D2 — WHAT IT IS WORTH
// ────────────────────────────────────────────────────────────────────────

/** D2: revenue booked per recovered ED visit, editable, stored under
 * `edAccessRevenuePerVisit`, falling back to the engine's own benchmark. */
export function revenuePerVisitFor(values: LeverValues): number {
  const raw = values.edAccessRevenuePerVisit;
  return typeof raw === "number" && raw > 0 ? raw : DEFAULT_ED_ACCESS_REVENUE_PER_VISIT;
}

/** D2: margin booked per downstream admission, editable, stored under
 * `edAccessAdmissionMargin`, falling back to the engine's own benchmark. */
export function admissionMarginFor(values: LeverValues): number {
  const raw = values.edAccessAdmissionMargin;
  return typeof raw === "number" && raw > 0 ? raw : DEFAULT_ED_ACCESS_ADMISSION_MARGIN;
}

// ────────────────────────────────────────────────────────────────────────
// D3/D4 — THE RECOVERABLE POOL (the ceiling)
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessPool {
  lwbsRatePct: number;
  /** The hard ceiling: how many patients actually left without being seen,
   * this year, at this scope. Nothing can recover more than this. */
  poolVisits: number;
}

/** D3/D4: the current, measured LWBS rate x the ED volume in scope. This is
 * the pool — a real, observed fact, not a decision, and the ceiling every
 * realized recovery below is clamped to. */
export function computeEdAccessPool(scope: EdAccessScope, values: LeverValues): EdAccessPool {
  const raw = values.edAccessLwbsRate;
  const lwbsRatePct = typeof raw === "number" && raw > 0 ? raw : DEFAULT_ED_ACCESS_LWBS_RATE;
  const poolVisits = scope.visitsInScope * (lwbsRatePct / 100);
  return { lwbsRatePct, poolVisits };
}

/** Clamps a targeted recovery figure to the recoverable pool — the exact
 * "MIN discipline" outpatient access's D4 demand ceiling uses
 * (`Math.min(capacity, demand)`), applied here to (pool, target) instead of
 * (capacity, demand). Exported and independently testable so the ceiling
 * property ("realized recovery never exceeds the pool") can be proven with
 * hand-picked, deliberately mismatched numbers, the same way
 * `computeAccessPayoff` is tested with a capacity that dwarfs demand. */
export function computeEdAccessRealized(poolVisits: number, targetedRecovered: number): number {
  return Math.max(0, Math.min(Math.max(0, poolVisits), Math.max(0, targetedRecovered)));
}

export interface EdAccessRecovery {
  minutesSavedPerNote: number;
  /** Informational only (see module header) - freed provider-hours/yr
   * redirected toward faster throughput, at this scope and minutes-saved
   * assumption. Never multiplies into the payoff. */
  freedHoursTotal: number;
  reductionPct: number;
  /** reductionPct's share of the pool, BEFORE the ceiling clamp. */
  targetedRecovered: number;
  /** The ceiling-clamped figure - what the chain actually realizes. */
  realizedRecovered: number;
  admissionRatePct: number;
  capturedAdmissions: number;
}

/** D3/D4, whole: the partner's reduction TARGET (a percent of the pool,
 * `edAccessLwbsReduction`) times the pool, clamped to the pool by
 * `computeEdAccessRealized`, then the admission-rate decision
 * (`edAccessAdmissionRate`) applied to the REALIZED recovery (not the raw
 * target, and not the pool) to get captured admissions. */
export function computeEdAccessRecovery(poolVisits: number, reductionPct: number, values: LeverValues): EdAccessRecovery {
  const clampedReduction = clampPct(reductionPct);
  const targetedRecovered = Math.max(0, poolVisits) * (clampedReduction / 100);
  const realizedRecovered = computeEdAccessRealized(poolVisits, targetedRecovered);

  // Unlike D2/D4's WORTH-facts (revenue/visit, admission margin, LWBS rate),
  // the admission SHARE is treated as a genuine decision, same discipline as
  // the reduction target: realityStart (0) means literally 0%, no
  // benchmark-default masking it. Not gating this would silently credit
  // admission revenue nobody committed to, and would make the leave-one-out
  // adapter's "reset to reality" comparison lie (resetting to 0 would
  // re-trigger the SAME default instead of truly removing the decision).
  const admissionRatePct = clampPct(asNum(values.edAccessAdmissionRate));
  const capturedAdmissions = realizedRecovered * (admissionRatePct / 100);

  const rawMinutes = values.edAccessMinutesSaved;
  const minutesSavedPerNote = typeof rawMinutes === "number" && rawMinutes > 0 ? rawMinutes : DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE;

  return {
    minutesSavedPerNote,
    freedHoursTotal: 0, // filled in by computeEdAccessChain, which has scope/baseline
    reductionPct: clampedReduction,
    targetedRecovered,
    realizedRecovered,
    admissionRatePct,
    capturedAdmissions,
  };
}

/** Plain-language teaching of the pool/target/realized relationship, for
 * the D4 card - never printed as literal `MIN(` notation, same convention
 * as outpatient access's `bindingPlainPhrase`. */
export function edAccessCeilingPlainPhrase(poolVisits: number, targetedRecovered: number, realizedRecovered: number): string {
  if (poolVisits <= 0) return "Set your current LWBS rate above to see the recoverable pool.";
  if (targetedRecovered <= 0) return "Set your LWBS reduction target above to see how many patients this recovers.";
  if (realizedRecovered < targetedRecovered - 1e-6) {
    return `Your target asked for more than the pool has. Capped to the full pool of ${fmtInt(poolVisits)} patients.`;
  }
  return `Recovering ${fmtInt(realizedRecovered)} of the ${fmtInt(poolVisits)} patients who left without being seen, this plan's entire recoverable pool.`;
}

// ────────────────────────────────────────────────────────────────────────
// D5 — THE PAYOFF (dollars, derived, for the first time)
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessPayoff {
  revenuePerVisit: number;
  admissionMargin: number;
  visitValue: number;
  admissionValue: number;
  /** The first dollar figure in the whole chain. */
  value: number;
}

/** D5: realized recovered visits x revenue/visit, plus captured admissions
 * x admission margin. The only function in the chain that produces a
 * dollar. Reconciles to `exploreDriverCalcs.ts`'s `edLwbsEnabled` /
 * `edThroughputEnabled` blocks - see the module header. */
export function computeEdAccessPayoff(realizedRecovered: number, capturedAdmissions: number, values: LeverValues): EdAccessPayoff {
  const revenuePerVisit = revenuePerVisitFor(values);
  const admissionMargin = admissionMarginFor(values);
  const visitValue = Math.round(Math.max(0, realizedRecovered) * revenuePerVisit);
  const admissionValue = Math.round(Math.max(0, capturedAdmissions) * admissionMargin);
  return { revenuePerVisit, admissionMargin, visitValue, admissionValue, value: visitValue + admissionValue };
}

// ────────────────────────────────────────────────────────────────────────
// The full chain + THE MATH strings
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessChainResult {
  scope: EdAccessScope;
  pool: EdAccessPool;
  recovery: EdAccessRecovery;
  payoff: EdAccessPayoff;
  formulas: {
    scope: string;
    pool: string;
    recovery: string;
    payoff: string;
  };
}

/** Runs the whole D1 -> D5 chain once. */
export function computeEdAccessChain(baseline: AttainBaseline, values: LeverValues): EdAccessChainResult {
  const scope = computeEdAccessScope(baseline, values);
  const pool = computeEdAccessPool(scope, values);
  const reductionPct = clampPct(asNum(values.edAccessLwbsReduction));
  const recoveryRaw = computeEdAccessRecovery(pool.poolVisits, reductionPct, values);

  const notesPerProvider = perProviderEncounters(baseline) * utilizationFraction(baseline);
  const freedHoursTotal = scope.providersInScope * notesPerProvider * (recoveryRaw.minutesSavedPerNote / 60);
  const recovery: EdAccessRecovery = { ...recoveryRaw, freedHoursTotal };

  const payoff = computeEdAccessPayoff(recovery.realizedRecovered, recovery.capturedAdmissions, values);

  const scopeFormula = scope.providersInScope > 0
    ? `${fmtInt(scope.providersInScope)} providers in scope for ED access, ${fmtInt(scope.visitsInScope)} ED visits/yr.`
    : NO_MOVE_FORMULA;

  const poolFormula = pool.poolVisits > 0
    ? `${fmtInt(scope.visitsInScope)} ED visits/yr × ${pool.lwbsRatePct}% LWBS rate = ${fmtInt(pool.poolVisits)} patients who left without being seen (the pool).`
    : NO_MOVE_FORMULA;

  const recoveryFormula = recovery.realizedRecovered > 0
    ? `${fmtInt(pool.poolVisits)} pool × ${recovery.reductionPct}% reduction target = ${fmtInt(recovery.targetedRecovered)} targeted, capped at the pool = ${fmtInt(recovery.realizedRecovered)} realized recovered visits × ${recovery.admissionRatePct}% admission share = ${fmtInt(recovery.capturedAdmissions)} captured admissions.`
    : NO_MOVE_FORMULA;

  const payoffFormula = payoff.value > 0
    ? `${fmtInt(recovery.realizedRecovered)} recovered visits × $${fmtInt(payoff.revenuePerVisit)}/visit + ${fmtInt(recovery.capturedAdmissions)} admissions × $${fmtInt(payoff.admissionMargin)}/admission = ~${fmtMoneyCompact(payoff.value)}.`
    : NO_MOVE_FORMULA;

  return { scope, pool, recovery, payoff, formulas: { scope: scopeFormula, pool: poolFormula, recovery: recoveryFormula, payoff: payoffFormula } };
}

// ────────────────────────────────────────────────────────────────────────
// Reconciliation helper — the exact ExploreState this chain's decisions
// correspond to, for tests to feed straight into computeAllDriverValues and
// prove the two can never disagree (see attainEdAccess.test.ts). Not used
// by the app itself, same convention as attainQuality.ts's
// `exploreStateForReconciliation`.
// ────────────────────────────────────────────────────────────────────────

export function exploreStateForEdAccessReconciliation(baseline: AttainBaseline, values: LeverValues): ExploreState {
  const chain = computeEdAccessChain(baseline, values);
  const state = mkState();
  state.numberOfProviders = chain.scope.providersInScope;
  state.annualEncounters = chain.scope.visitsInScope;
  state.utilizationPercent = 100; // scope.visitsInScope already applied utilization

  const td = state.timeDriverInputs as any;
  td.edLwbsEnabled = true;
  td.edLwbsRate = chain.pool.lwbsRatePct;
  td.edLwbsReduction = chain.recovery.reductionPct;
  td.edRevenuePerVisit = chain.payoff.revenuePerVisit;
  td.edLwbsRealization = 100; // this chain has no realization knob - see module header
  td.edThroughputEnabled = true;
  td.edAdmissionRate = chain.recovery.admissionRatePct;
  td.edAdmissionRevenue = chain.payoff.admissionMargin;
  td.edAdmissionRealization = 100; // ditto

  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every ED-access "row" this chain surfaces to the generic Commit/Plan
 * bookkeeping, in chain order. Kept in sync with `ED_ACCESS_LEVERS` in
 * attainLevers.ts — each id here must match an `ED_ACCESS_LEVERS[].id`. */
export const ED_ACCESS_LEVER_IDS = [
  "edAccessProviders",
  "edAccessRevenuePerVisit",
  "edAccessAdmissionMargin",
  "edAccessMinutesSaved",
  "edAccessLwbsRate",
  "edAccessLwbsReduction",
  "edAccessAdmissionRate",
] as const;

/**
 * Adapts the D1-D5 chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns, so
 * `computeMultiGoalContributions`, `StepCommit`, and `StepAttainment` keep
 * working against ED access unmodified.
 *
 * D1 (`edAccessProviders`) and the three D2/D3 context/benchmark rows
 * (`edAccessRevenuePerVisit`, `edAccessAdmissionMargin`,
 * `edAccessMinutesSaved`, `edAccessLwbsRate`) are structural bookkeeping
 * rows, `marginalMargin: 0` — the same convention Quality's D1 rows use
 * (attainQuality.ts's `d1Rows`), since these are benchmarked defaults or
 * scope facts, not decisions a leave-one-out subtraction can meaningfully
 * isolate (resetting a benchmark to its own realityStart of 0 just
 * re-triggers the SAME default, so its "marginal" effect is always exactly
 * 0 by construction, never a bug). The two real decisions
 * (`edAccessLwbsReduction`, `edAccessAdmissionRate`) get a genuine
 * leave-one-out marginal: reset to realityStart (0), re-run the whole
 * chain, subtract.
 */
export function computeEdAccessContributions(baseline: AttainBaseline, values: LeverValues): LeverContributionsResult {
  const chosen = computeEdAccessChain(baseline, values);
  const { scope, pool, recovery, payoff, formulas } = chosen;

  const withoutLever = (leverId: string): EdAccessChainResult => {
    const swapped: LeverValues = { ...values, [leverId]: 0 };
    return computeEdAccessChain(baseline, swapped);
  };

  const reductionWithout = withoutLever("edAccessLwbsReduction");
  const admissionWithout = withoutLever("edAccessAdmissionRate");

  const decisionRows: LeverContribution[] = [
    {
      id: "edAccessLwbsReduction",
      marginalMargin: payoff.value - reductionWithout.payoff.value,
      marginalCount: Math.round(recovery.realizedRecovered - reductionWithout.recovery.realizedRecovered),
      pctOfTotal: 0,
      formula: formulas.recovery,
    },
    {
      id: "edAccessAdmissionRate",
      marginalMargin: payoff.value - admissionWithout.payoff.value,
      marginalCount: Math.round(recovery.capturedAdmissions - admissionWithout.recovery.capturedAdmissions),
      pctOfTotal: 0,
      formula: formulas.recovery,
    },
  ];

  const structuralRows: LeverContribution[] = [
    { id: "edAccessProviders", marginalMargin: 0, marginalCount: Math.round(scope.providersInScope), pctOfTotal: 0, formula: formulas.scope },
    { id: "edAccessRevenuePerVisit", marginalMargin: 0, marginalCount: Math.round(payoff.revenuePerVisit), pctOfTotal: 0, formula: formulas.payoff },
    { id: "edAccessAdmissionMargin", marginalMargin: 0, marginalCount: Math.round(payoff.admissionMargin), pctOfTotal: 0, formula: formulas.payoff },
    { id: "edAccessMinutesSaved", marginalMargin: 0, marginalCount: Math.round(recovery.minutesSavedPerNote), pctOfTotal: 0, formula: formulas.scope },
    { id: "edAccessLwbsRate", marginalMargin: 0, marginalCount: Math.round(pool.poolVisits), pctOfTotal: 0, formula: formulas.pool },
  ];

  const marginSum = decisionRows.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
  const orderedRows = [...structuralRows.slice(0, 1), structuralRows[1], structuralRows[2], structuralRows[3], structuralRows[4], decisionRows[0], decisionRows[1]];
  const perLever: LeverContribution[] = orderedRows.map((l) => ({
    ...l,
    pctOfTotal: marginSum > 0 ? Math.max(0, l.marginalMargin) / marginSum : 0,
  }));

  return { perLever, totalMargin: payoff.value, totalCount: Math.round(recovery.realizedRecovered + recovery.capturedAdmissions) };
}
