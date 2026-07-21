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
 * become. There is no schedule to open, but there IS a real capacity
 * mechanism — same discipline as outpatient, not a different one:
 *
 *   D1 SCOPE — which ED providers are pointed at this plan (capped to the
 *      partner's own Starting-point baseline), and how many annual ED
 *      visits that represents. No dollar yet.
 *   D2 WHAT IT IS WORTH — contribution margin per recovered ED visit (NOT
 *      gross revenue — a recovered visit on an already-staffed shift is
 *      worth its margin, not its charge), and margin per downstream
 *      admission, priced SEPARATELY because they are not the same claim.
 *      Benchmarked defaults, never fabricated. Still no dollar total.
 *   D3 CONVERT FREED TIME TO THROUGHPUT (the ONE capacity mechanism) —
 *      minutes saved per note frees provider-hours; the partner decides
 *      what SHARE of that freed time is committed to faster
 *      door-to-provider throughput (`edAccessThroughputShare`), same shape
 *      as outpatient's `accessFreedShare`. That committed time, divided by
 *      a benchmarked "hours of expedited attention per recovered patient"
 *      conversion (`edAccessHoursPerRecovery` — outpatient's `accessVisitLength`
 *      played by a different, ED-specific constant), is how many patients
 *      this plan can MECHANICALLY afford to bring back. Zero minutes saved,
 *      or zero share committed, mechanically zeroes this number — there is
 *      no way to book a dollar by typing a target with no time behind it.
 *   D4 THE RECOVERABLE POOL (a genuine, independent ceiling) — the
 *      partner's own current LWBS rate x the ED volume in scope is the pool
 *      of patients who actually left without being seen — a measured fact,
 *      computed from a completely different set of inputs than D3's
 *      freed-time mechanism. Realized recovery is `MIN(pool, mechanically
 *      enabled recovery)` — the exact "MIN discipline" outpatient's D4 uses
 *      for `MIN(capacity, demand)`, and for the same reason: this MIN can
 *      genuinely bind on EITHER side, because the two numbers being
 *      compared are independently sourced (unlike the old model, where the
 *      "target" was defined as a percentage OF the pool and so could never
 *      exceed it — see CHANGELOG below). A share of realized recovery
 *      becomes admissions, and that admission leg is capped too: not every
 *      captured admission finds a bed or a payer-accepted stay
 *      (`edAccessAdmissionRealization`).
 *   D5 THE PAYOFF (dollars, derived) — realized recovered visits x margin
 *      per visit, plus REALIZED (bed/payer-capped) captured admissions x
 *      margin per admission. Both legs are contribution margin, so the sum
 *      is honestly "contribution margin," not a gross-revenue-plus-margin
 *      mixed figure. The first dollar figure in the chain.
 *
 * CHANGELOG (premium audit, 2026-07): the previous version of this module
 * let a partner type an LWBS-reduction TARGET directly as a 0-100% slider —
 * a free-typed outcome, not a mechanism. Minutes-saved was carried through
 * only as "informational context," never multiplying into the payoff, so a
 * partner could set it to 0 and still book the full dollar. That is the
 * exact "Abridge causes the outcome" overclaim the Defensible-Claims
 * doctrine exists to prevent, and it made the "recoverable pool ceiling"
 * tautological: because the old target was defined as a PERCENT OF the
 * pool, `target = pool x reduction% <= pool` by construction, so the MIN
 * never bound and the "your target asked for more than the pool has"
 * branch was dead UI. This version fixes both defects with one change: the
 * partner's decision is now `edAccessThroughputShare` (how much of the
 * freed hour goes to faster throughput), which drives a MECHANICALLY
 * DERIVED recovery number (D3) that is genuinely independent of the pool
 * (D4), so the MIN is a real, testable ceiling again, and the counterfactual
 * (0 minutes saved -> ~0 recovery, regardless of any other setting) holds
 * structurally, not by convention. It also fixed two other audit findings:
 * the visit leg now prices contribution margin, not gross revenue (was
 * mixed with the admission leg's margin under one "contribution margin"
 * headline — an honest unit-mixing bug), and the admission leg now carries
 * its own bed/payer-availability realization cap instead of being credited
 * at 100% margin with no ceiling anywhere in the chain.
 *
 * WHY ED ACCESS NOW COMPETES WITH RETENTION FOR THE SAME FREED HOUR (unlike
 * the pre-audit version): now that D3 mechanically divides freed hours by a
 * conversion constant to create throughput capacity (the exact same shape
 * as outpatient access's D3 dividing freed hours by a visit length), ED
 * access draws on the identical freed-charting hour ED retention's own D2
 * (`retentionProtect`) protects as relief. `attainLevers.ts`'s
 * `computeMultiGoalContributions` now extends the access/retention
 * freed-time split to setting `"ed"`, not just `"outpatient"` — see that
 * function's own comment.
 *
 * RECONCILIATION: `computeEdAccessPayoff`'s visit/admission dollars are the
 * exact same multiplication `exploreDriverCalcs.ts`'s `edLwbsEnabled` /
 * `edThroughputEnabled` blocks already use (`lwbs = annualEncounters x
 * edLwbsRate`; `recovered = lwbs x edLwbsReduction`; `value = recovered x
 * edRevenuePerVisit`; `adm = recovered x edAdmissionRate`; `value = adm x
 * edAdmissionRevenue`). `exploreStateForEdAccessReconciliation` derives the
 * engine's `edLwbsReduction` input as this chain's OWN realized recovery
 * expressed as a percent of the pool (`realizedRecovered / poolVisits`), so
 * the engine's `recovered` term lands on this chain's `realizedRecovered`
 * exactly, and feeds this chain's genuine `admissionRealizationPct` into
 * the engine's `edAdmissionRealization` knob (previously hardcoded to 100%,
 * which is the exact bug this audit fixed for the admission leg — see the
 * CHANGELOG). `edLwbsRealization` stays at 100%: the audit concluded that
 * knob (not every recovered patient completes the visit) is legitimately
 * redundant with this chain's ceiling, unlike the admission knob (bed
 * availability, payer mix), which is not a visit-completion discount at
 * all and has no other cap anywhere in this chain.
 */

// ────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────

/** Benchmark minutes saved per note. ED-specific (higher than outpatient's
 * 2 min default): matches the authored ED narrative ("9 min saved per
 * encounter" -> "1.9 hrs/wk freed per provider", see attainGoals.ts's
 * `edAccess` copy). A real multiplicand in the payoff (see module header) —
 * zero here mechanically zeroes recovery regardless of any other input. */
export const DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE = 9;

/** Benchmark current LWBS rate, matching the authored ED narrative's own
 * "LWBS rate 8%" world card. A real, editable D4 input, not assumed. */
export const DEFAULT_ED_ACCESS_LWBS_RATE = 8;

/** Benchmark CONTRIBUTION MARGIN per recovered ED visit — deliberately NOT
 * the $480 gross-charge figure the pre-audit version used. Matches
 * `attainAccess.ts`'s own "General ED" per-visit contribution-margin preset
 * (`DEFAULT_LINE_MARGIN_PER_VISIT["General ED"]`), so this chain reuses an
 * already-audited margin benchmark instead of inventing a new number. A
 * recovered visit on an already-staffed ED shift is worth its margin, not
 * its charge — see the module header's CHANGELOG. */
export const DEFAULT_ED_ACCESS_MARGIN_PER_VISIT = 380;

/** Documented reference point only - matches the live engine's own default
 * (`edAdmissionRate`) - NOT auto-applied when `edAccessAdmissionRate` is
 * unset. Unlike the benchmarks above, the admission share is a genuine
 * decision (`computeEdAccessRecovery` reads it with a true realityStart of
 * 0%, no default masking it) - see that function's own comment for why. */
export const DEFAULT_ED_ACCESS_ADMISSION_RATE = 18;

/** Benchmark margin per downstream admission, matching the live engine's
 * own default (`edAdmissionRevenue`). */
export const DEFAULT_ED_ACCESS_ADMISSION_MARGIN = 8_000;

/** Benchmark realization on the ADMISSION leg only — matches the live
 * engine's own default (`DEFAULT_EXPLORE_STATE.timeDriverInputs.
 * edAdmissionRealization`, "bed availability, payer mix"). Not every
 * captured admission finds an empty bed or a payer-accepted stay; this is
 * the honest cap the pre-audit chain was missing on this leg (see the
 * module header's CHANGELOG / audit finding I1). Deliberately does NOT
 * apply to the visit leg — see `DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE`'s
 * sibling knob `edLwbsRealization`, which the audit found IS legitimately
 * redundant with the recoverable-pool ceiling, unlike this one. */
export const DEFAULT_ED_ACCESS_ADMISSION_REALIZATION = 60;

/**
 * Benchmark hours of committed, expedited-throughput provider time it takes
 * to bring back one additional patient who would otherwise have left
 * without being seen — the ED-specific analog of outpatient access's
 * `DEFAULT_VISIT_LENGTH_MIN` (the conversion constant that turns committed
 * freed hours into a patient count). Unlike `DEFAULT_VISIT_LENGTH_MIN`,
 * which reuses an existing, already-shipped Explore assumption (a visit's
 * own length), there is no equivalent existing benchmark for "how much
 * dedicated throughput time recovers one LWBS patient" anywhere else in
 * this codebase — this is a genuinely NEW assumption introduced by this
 * audit fix, editable in D3, and flagged in the audit report for a
 * clinical/ops owner to validate or correct. 1.5 hours (90 minutes) is an
 * illustrative starting point: faster triage plus the expedited visit
 * itself, not just the triage moment alone.
 */
export const DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY = 1.5;

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

function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
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
// D2 — WHAT IT IS WORTH (contribution margin, not charges)
// ────────────────────────────────────────────────────────────────────────

/** D2: CONTRIBUTION MARGIN booked per recovered ED visit, editable, stored
 * under `edAccessMarginPerVisit`, falling back to the engine's own
 * benchmark. Deliberately margin, not gross revenue — see the module
 * header's CHANGELOG. */
export function marginPerVisitFor(values: LeverValues): number {
  const raw = values.edAccessMarginPerVisit;
  return typeof raw === "number" && raw > 0 ? raw : DEFAULT_ED_ACCESS_MARGIN_PER_VISIT;
}

/** D2: margin booked per downstream admission, editable, stored under
 * `edAccessAdmissionMargin`, falling back to the engine's own benchmark. */
export function admissionMarginFor(values: LeverValues): number {
  const raw = values.edAccessAdmissionMargin;
  return typeof raw === "number" && raw > 0 ? raw : DEFAULT_ED_ACCESS_ADMISSION_MARGIN;
}

/** D4: the share of a captured admission that actually realizes as booked
 * margin — bed availability, payer mix. Editable, stored under
 * `edAccessAdmissionRealization`, falling back to the live engine's own
 * benchmark. This is the honest cap the admission leg was missing (audit
 * finding I1) — see `DEFAULT_ED_ACCESS_ADMISSION_REALIZATION`. */
export function admissionRealizationFor(values: LeverValues): number {
  const raw = values.edAccessAdmissionRealization;
  return typeof raw === "number" && raw > 0 ? clampPct(raw) : DEFAULT_ED_ACCESS_ADMISSION_REALIZATION;
}

// ────────────────────────────────────────────────────────────────────────
// D3 — CONVERT FREED TIME TO THROUGHPUT (the one capacity mechanism)
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessMechanism {
  minutesSavedPerNote: number;
  freedHoursTotal: number;
  /** The share of the freed hour actually committed to throughput, AFTER
   * any cross-goal (access/retention) scaling — see `computeEdAccessChain`. */
  throughputSharePct: number;
  freedHoursToThroughput: number;
  hoursPerRecovery: number;
  /** Visits/year this freed-time commitment can MECHANICALLY afford to
   * bring back — the ED analog of outpatient's `capacityVisits`. Never a
   * dollar figure. Zero minutes saved, or zero share committed, zeroes this
   * exactly, by construction. */
  mechanicallyEnabledRecovered: number;
}

/**
 * D3: freed hours = providersInScope x notes/provider/yr x minutesSaved,
 * then only `throughputSharePct` of that hour is committed to faster
 * door-to-provider throughput (the rest stays protected relief, never
 * counted here — same split outpatient access's D3 makes between capacity
 * and relief). That committed time, divided by `hoursPerRecovery` (a real,
 * editable D3 input — see `DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY`), is how
 * many patients this plan can mechanically afford to bring back. This is
 * the ONLY place a recovery number is created from freed time in this
 * chain — there is no second, disconnected "type your target" mechanism.
 */
export function computeEdAccessMechanism(
  baseline: AttainBaseline,
  scope: EdAccessScope,
  minutesSavedPerNote: number,
  throughputSharePct: number,
  hoursPerRecovery: number = DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY,
): EdAccessMechanism {
  const safeHoursPerRecovery = hoursPerRecovery > 0 ? hoursPerRecovery : DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY;
  if (scope.providersInScope <= 0) {
    return {
      minutesSavedPerNote,
      freedHoursTotal: 0,
      throughputSharePct: 0,
      freedHoursToThroughput: 0,
      hoursPerRecovery: safeHoursPerRecovery,
      mechanicallyEnabledRecovered: 0,
    };
  }
  const notesPerProvider = perProviderEncounters(baseline) * utilizationFraction(baseline);
  const freedHoursTotal = scope.providersInScope * notesPerProvider * (minutesSavedPerNote / 60);
  const share = clampShare(throughputSharePct / 100);
  const freedHoursToThroughput = freedHoursTotal * share;
  const mechanicallyEnabledRecovered = freedHoursToThroughput / safeHoursPerRecovery;
  return {
    minutesSavedPerNote,
    freedHoursTotal,
    throughputSharePct,
    freedHoursToThroughput,
    hoursPerRecovery: safeHoursPerRecovery,
    mechanicallyEnabledRecovered,
  };
}

// ────────────────────────────────────────────────────────────────────────
// D4 — THE RECOVERABLE POOL (a genuine, independent ceiling) + admissions
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessPool {
  lwbsRatePct: number;
  /** The other side of the ceiling: how many patients actually left
   * without being seen, this year, at this scope. A measured fact, computed
   * from a completely different set of inputs than D3's freed-time
   * mechanism — that independence is what makes the MIN below a genuine
   * ceiling, not a tautology. */
  poolVisits: number;
}

/** D4a: the current, measured LWBS rate x the ED volume in scope. */
export function computeEdAccessPool(scope: EdAccessScope, values: LeverValues): EdAccessPool {
  const raw = values.edAccessLwbsRate;
  const lwbsRatePct = typeof raw === "number" && raw > 0 ? raw : DEFAULT_ED_ACCESS_LWBS_RATE;
  const poolVisits = scope.visitsInScope * (lwbsRatePct / 100);
  return { lwbsRatePct, poolVisits };
}

/** D4b: `MIN(poolVisits, mechanicallyEnabledRecovered)` — the exact "MIN
 * discipline" outpatient access's D4 demand ceiling uses
 * (`Math.min(capacity, demand)`). Because the two sides are now
 * independently sourced (see the module header's CHANGELOG), this MIN can
 * genuinely bind on either side, unlike the pre-audit version where the
 * "target" was defined as a percent of the pool and so the pool side could
 * never bind. Exported and independently testable so that "genuinely
 * either side can be the ceiling" is provable with hand-picked numbers. */
export function computeEdAccessRealized(poolVisits: number, mechanicallyEnabledRecovered: number): number {
  return Math.max(0, Math.min(Math.max(0, poolVisits), Math.max(0, mechanicallyEnabledRecovered)));
}

export type EdAccessBinding = "pool" | "throughput" | "none";

export interface EdAccessRecovery {
  realizedRecovered: number;
  /** Which side actually limited the outcome, so D4's card can say "the
   * pool is the limiter" or "freed throughput time is the limiter" out
   * loud — the ED analog of outpatient's `AccessPayoff.binding`. */
  binding: EdAccessBinding;
  admissionRatePct: number;
  /** Recovered patients who convert to an admission attempt, BEFORE the
   * bed/payer realization cap. */
  capturedAdmissionsRaw: number;
  /** Share of an admission attempt that actually realizes as booked
   * margin — bed availability, payer mix (audit finding I1's fix). */
  admissionRealizationPct: number;
  /** The realized, bed/payer-capped admission count — what the payoff
   * actually prices. */
  capturedAdmissions: number;
}

/** D4, whole: realized recovery is the MIN of the pool and the
 * mechanically-enabled recovery from D3, then the admission-rate decision
 * (`edAccessAdmissionRate`) applied to the REALIZED recovery (not the
 * mechanical number, and not the pool) to get an admission attempt count,
 * then the bed/payer realization cap (`edAccessAdmissionRealization`)
 * applied to THAT to get the admissions this chain actually prices. */
export function computeEdAccessRecovery(poolVisits: number, mechanicallyEnabledRecovered: number, values: LeverValues): EdAccessRecovery {
  const realizedRecovered = computeEdAccessRealized(poolVisits, mechanicallyEnabledRecovered);
  const binding: EdAccessBinding =
    realizedRecovered <= 0
      ? "none"
      : Math.max(0, poolVisits) <= Math.max(0, mechanicallyEnabledRecovered)
        ? "pool"
        : "throughput";

  // Unlike D2/D3's WORTH/mechanism facts (margin/visit, admission margin,
  // hours-per-recovery), the admission SHARE is treated as a genuine
  // decision, same discipline outpatient access uses nowhere but this
  // chain's own admission leg needs: realityStart (0) means literally 0%,
  // no benchmark-default masking it. Not gating this would silently credit
  // admission margin nobody committed to, and would make the leave-one-out
  // adapter's "reset to reality" comparison lie (resetting to 0 would
  // re-trigger the SAME default instead of truly removing the decision).
  const admissionRatePct = clampPct(asNum(values.edAccessAdmissionRate));
  const capturedAdmissionsRaw = realizedRecovered * (admissionRatePct / 100);

  const admissionRealizationPct = admissionRealizationFor(values);
  const capturedAdmissions = capturedAdmissionsRaw * (admissionRealizationPct / 100);

  return {
    realizedRecovered,
    binding,
    admissionRatePct,
    capturedAdmissionsRaw,
    admissionRealizationPct,
    capturedAdmissions,
  };
}

/** Plain-language teaching of which side of the ceiling actually binds, for
 * the D4 card — never printed as literal `MIN(` notation, same convention
 * as outpatient access's `bindingPlainPhrase`. */
export function edAccessBindingPlainPhrase(binding: EdAccessBinding): string {
  switch (binding) {
    case "pool":
      return "The recoverable pool is the limiter here. Every LWBS patient this plan can reach is already being reached.";
    case "throughput":
      return "Freed throughput time is the limiter here. The pool has more patients than this plan's committed time can reach yet.";
    default:
      return "Set your minutes saved, throughput share, and current LWBS rate above to see which one limits you.";
  }
}

// ────────────────────────────────────────────────────────────────────────
// D5 — THE PAYOFF (dollars, derived, for the first time)
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessPayoff {
  marginPerVisit: number;
  admissionMargin: number;
  visitValue: number;
  admissionValue: number;
  /** The first dollar figure in the whole chain. Both legs are
   * contribution margin (see the module header's CHANGELOG), so this total
   * is honestly "contribution margin," not a mixed gross-revenue-plus-margin
   * figure. */
  value: number;
}

/** D5: realized recovered visits x contribution margin/visit, plus the
 * REALIZED (bed/payer-capped) captured admissions x margin/admission. The
 * only function in the chain that produces a dollar. Reconciles to
 * `exploreDriverCalcs.ts`'s `edLwbsEnabled` / `edThroughputEnabled` blocks -
 * see the module header. */
export function computeEdAccessPayoff(realizedRecovered: number, capturedAdmissions: number, values: LeverValues): EdAccessPayoff {
  const marginPerVisit = marginPerVisitFor(values);
  const admissionMargin = admissionMarginFor(values);
  const visitValue = Math.round(Math.max(0, realizedRecovered) * marginPerVisit);
  const admissionValue = Math.round(Math.max(0, capturedAdmissions) * admissionMargin);
  return { marginPerVisit, admissionMargin, visitValue, admissionValue, value: visitValue + admissionValue };
}

// ────────────────────────────────────────────────────────────────────────
// The full chain + THE MATH strings
// ────────────────────────────────────────────────────────────────────────

export interface EdAccessChainResult {
  scope: EdAccessScope;
  mechanism: EdAccessMechanism;
  pool: EdAccessPool;
  recovery: EdAccessRecovery;
  payoff: EdAccessPayoff;
  formulas: {
    scope: string;
    mechanism: string;
    pool: string;
    recovery: string;
    payoff: string;
  };
}

/**
 * Runs the whole D1 -> D5 chain once. `crossGoalShareMultiplier` (0-1) is
 * the ONLY place the access/retention shared-hour conflict touches this
 * chain — the exact same convention `computeAccessChain` uses for
 * outpatient: when both goals are in play, the partner's D3 throughput
 * share is scaled down by however much of that same hour retention's own
 * floor is holding, BEFORE the mechanically-enabled recovery (and therefore
 * everything downstream of it, including the realized dollar) is computed.
 * See attainLevers.ts `computeMultiGoalContributions` for where this
 * multiplier comes from.
 */
export function computeEdAccessChain(baseline: AttainBaseline, values: LeverValues, crossGoalShareMultiplier = 1): EdAccessChainResult {
  const scope = computeEdAccessScope(baseline, values);
  const pool = computeEdAccessPool(scope, values);

  const rawThroughputSharePct = clampPct(asNum(values.edAccessThroughputShare));
  const effectiveThroughputSharePct = rawThroughputSharePct * clampShare(crossGoalShareMultiplier);
  // Deliberately `typeof === "number"`, NOT `> 0`, unlike the benchmark
  // fallbacks elsewhere in this module (margin/visit, admission margin,
  // hours-per-recovery): minutes-saved is a real multiplicand in the
  // payoff now (see the module header's CHANGELOG), and the audited
  // counterfactual this chain has to hold is "0 minutes saved -> ~0
  // recovery" - if 0 were treated as "unset" and silently replaced with
  // the 9-minute benchmark, a partner (or a test) could never actually
  // observe that counterfactual through this chain.
  const rawMinutes = values.edAccessMinutesSaved;
  const minutesSavedPerNote = typeof rawMinutes === "number" ? Math.max(0, rawMinutes) : DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE;
  const rawHoursPerRecovery = values.edAccessHoursPerRecovery;
  const hoursPerRecovery = typeof rawHoursPerRecovery === "number" && rawHoursPerRecovery > 0 ? rawHoursPerRecovery : DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY;

  const mechanism = computeEdAccessMechanism(baseline, scope, minutesSavedPerNote, effectiveThroughputSharePct, hoursPerRecovery);
  const recovery = computeEdAccessRecovery(pool.poolVisits, mechanism.mechanicallyEnabledRecovered, values);
  const payoff = computeEdAccessPayoff(recovery.realizedRecovered, recovery.capturedAdmissions, values);

  const scopeFormula = scope.providersInScope > 0
    ? `${fmtInt(scope.providersInScope)} providers in scope for ED access, ${fmtInt(scope.visitsInScope)} ED visits/yr.`
    : NO_MOVE_FORMULA;

  const mechanismFormula = mechanism.mechanicallyEnabledRecovered > 0
    ? `${fmtInt(scope.providersInScope)} providers × ${fmtInt(mechanism.freedHoursTotal / Math.max(1, scope.providersInScope))} freed hrs/provider/yr × ${Math.round(mechanism.throughputSharePct)}% to throughput = ${fmtInt(mechanism.freedHoursToThroughput)} hrs ÷ ${fmt1(mechanism.hoursPerRecovery)} hrs/recovered patient = ${fmtInt(mechanism.mechanicallyEnabledRecovered)} patients/yr this plan can mechanically afford to bring back.`
    : NO_MOVE_FORMULA;

  const poolFormula = pool.poolVisits > 0
    ? `${fmtInt(scope.visitsInScope)} ED visits/yr × ${pool.lwbsRatePct}% LWBS rate = ${fmtInt(pool.poolVisits)} patients who left without being seen (the pool).`
    : NO_MOVE_FORMULA;

  const recoveryFormula = recovery.realizedRecovered > 0
    ? `${fmtInt(pool.poolVisits)} pool vs ${fmtInt(mechanism.mechanicallyEnabledRecovered)} freed-time capacity = ${fmtInt(recovery.realizedRecovered)} realized recovered visits (the smaller of the two) × ${Math.round(recovery.admissionRatePct)}% admission share = ${fmtInt(recovery.capturedAdmissionsRaw)} admission attempts × ${Math.round(recovery.admissionRealizationPct)}% bed/payer realization = ${fmtInt(recovery.capturedAdmissions)} captured admissions.`
    : NO_MOVE_FORMULA;

  const payoffFormula = payoff.value > 0
    ? `${fmtInt(recovery.realizedRecovered)} recovered visits × $${fmtInt(payoff.marginPerVisit)}/visit margin + ${fmtInt(recovery.capturedAdmissions)} admissions × $${fmtInt(payoff.admissionMargin)}/admission margin = ~${fmtMoneyCompact(payoff.value)} contribution margin.`
    : NO_MOVE_FORMULA;

  return {
    scope,
    mechanism,
    pool,
    recovery,
    payoff,
    formulas: { scope: scopeFormula, mechanism: mechanismFormula, pool: poolFormula, recovery: recoveryFormula, payoff: payoffFormula },
  };
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

  // The engine's own `edLwbsReduction` is a percent OF the pool
  // (`recovered = lwbs x edLwbsReduction/100`) — exactly the unit this
  // chain's `realizedRecovered` already is relative to `pool.poolVisits`,
  // so deriving it this way (rather than re-deriving the mechanical
  // recovery independently inside the engine, which has no such mechanism)
  // makes the engine's `recovered` term land on this chain's
  // `realizedRecovered` exactly.
  const derivedReductionPct = chain.pool.poolVisits > 0
    ? (chain.recovery.realizedRecovered / chain.pool.poolVisits) * 100
    : 0;

  const td = state.timeDriverInputs as any;
  td.edLwbsEnabled = true;
  td.edLwbsRate = chain.pool.lwbsRatePct;
  td.edLwbsReduction = derivedReductionPct;
  td.edRevenuePerVisit = chain.payoff.marginPerVisit;
  td.edLwbsRealization = 100; // legitimately redundant with this chain's ceiling - see module header
  td.edThroughputEnabled = true;
  td.edAdmissionRate = chain.recovery.admissionRatePct;
  td.edAdmissionRevenue = chain.payoff.admissionMargin;
  td.edAdmissionRealization = chain.recovery.admissionRealizationPct; // the I1 fix - no longer hardcoded to 100

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
  "edAccessMarginPerVisit",
  "edAccessAdmissionMargin",
  "edAccessMinutesSaved",
  "edAccessHoursPerRecovery",
  "edAccessThroughputShare",
  "edAccessLwbsRate",
  "edAccessAdmissionRate",
  "edAccessAdmissionRealization",
] as const;

/**
 * Adapts the D1-D5 chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns, so
 * `computeMultiGoalContributions`, `StepCommit`, and `StepAttainment` keep
 * working against ED access unmodified.
 *
 * D1 (`edAccessProviders`) and the context/benchmark rows
 * (`edAccessMarginPerVisit`, `edAccessAdmissionMargin`,
 * `edAccessMinutesSaved`, `edAccessHoursPerRecovery`, `edAccessLwbsRate`,
 * `edAccessAdmissionRealization`) are structural bookkeeping rows,
 * `marginalMargin: 0` — the same convention Quality's D1 rows use
 * (attainQuality.ts's `d1Rows`), since these are benchmarked defaults or
 * scope facts, not decisions a marginal subtraction can meaningfully
 * isolate.
 *
 * The two real decisions (`edAccessThroughputShare`, `edAccessAdmissionRate`)
 * are attributed DIRECTLY to their own leg of the payoff
 * (`payoff.visitValue` / `payoff.admissionValue`), NOT via a nested
 * leave-one-out chain reset. This is a deliberate fix for a real bug the
 * premium audit found (finding M1): the visit and admission legs are
 * nested (captured admissions are a share of REALIZED recovery), so
 * resetting `edAccessThroughputShare` to 0 collapses realized recovery to
 * 0, which ALSO collapses admissions to 0 — a naive "reset and subtract"
 * marginal for that row would silently include the admission leg's own
 * dollar a second time (once embedded in the throughput row's inflated
 * marginal, once again in the admission row's own marginal), so the two
 * marginals would sum to MORE than the total payoff and every row's
 * `pctOfTotal` would be inflated. Because the visit leg and the admission
 * leg are strictly additive and non-overlapping by construction
 * (`payoff.value = payoff.visitValue + payoff.admissionValue`), attributing
 * each leg directly to the ONE decision that produces it is exact, not an
 * approximation — `marginSum` below equals `payoff.value` on the nose, so
 * `pctOfTotal` across the two decision rows always sums to exactly 1 (or 0
 * when nothing has been decided yet).
 */
export function computeEdAccessContributions(baseline: AttainBaseline, values: LeverValues, crossGoalShareMultiplier = 1): LeverContributionsResult {
  const chosen = computeEdAccessChain(baseline, values, crossGoalShareMultiplier);
  const { scope, mechanism, pool, recovery, payoff, formulas } = chosen;

  const decisionRows: LeverContribution[] = [
    {
      id: "edAccessThroughputShare",
      marginalMargin: payoff.visitValue,
      marginalCount: Math.round(recovery.realizedRecovered),
      pctOfTotal: 0,
      formula: formulas.mechanism,
    },
    {
      id: "edAccessAdmissionRate",
      marginalMargin: payoff.admissionValue,
      marginalCount: Math.round(recovery.capturedAdmissions),
      pctOfTotal: 0,
      formula: formulas.recovery,
    },
  ];

  const structuralRows: LeverContribution[] = [
    { id: "edAccessProviders", marginalMargin: 0, marginalCount: Math.round(scope.providersInScope), pctOfTotal: 0, formula: formulas.scope },
    { id: "edAccessMarginPerVisit", marginalMargin: 0, marginalCount: Math.round(payoff.marginPerVisit), pctOfTotal: 0, formula: formulas.payoff },
    { id: "edAccessAdmissionMargin", marginalMargin: 0, marginalCount: Math.round(payoff.admissionMargin), pctOfTotal: 0, formula: formulas.payoff },
    { id: "edAccessMinutesSaved", marginalMargin: 0, marginalCount: Math.round(mechanism.minutesSavedPerNote), pctOfTotal: 0, formula: formulas.mechanism },
    { id: "edAccessHoursPerRecovery", marginalMargin: 0, marginalCount: Math.round(mechanism.hoursPerRecovery * 10) / 10, pctOfTotal: 0, formula: formulas.mechanism },
    { id: "edAccessLwbsRate", marginalMargin: 0, marginalCount: Math.round(pool.poolVisits), pctOfTotal: 0, formula: formulas.pool },
    { id: "edAccessAdmissionRealization", marginalMargin: 0, marginalCount: Math.round(recovery.admissionRealizationPct), pctOfTotal: 0, formula: formulas.recovery },
  ];

  const marginSum = payoff.visitValue + payoff.admissionValue;
  const orderedRows = [
    structuralRows[0],
    structuralRows[1],
    structuralRows[2],
    structuralRows[3],
    structuralRows[4],
    decisionRows[0],
    structuralRows[5],
    decisionRows[1],
    structuralRows[6],
  ];
  const perLever: LeverContribution[] = orderedRows.map((l) => ({
    ...l,
    pctOfTotal: marginSum > 0 ? Math.max(0, l.marginalMargin) / marginSum : 0,
  }));

  return { perLever, totalMargin: payoff.value, totalCount: Math.round(recovery.realizedRecovered + recovery.capturedAdmissions) };
}
