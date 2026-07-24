import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

/**
 * Attain — ACCESS decision chain engine.
 *
 * Access is rebuilt here as an ORDERED chain, not a flat set of independent
 * levers, because the old flat-lever model violated three rules the product
 * owner called a "logic bug, wrong shape":
 *
 *  1. ONE capacity mechanism. Freed documentation time is the only thing
 *     that creates new provider capacity. The old model double-counted by
 *     having "reinvest freed time" AND "open slots on the template" both
 *     add visits from the same freed hour. There is no `accessSlots` /
 *     `accessFill` lever here — capacity is derived from freed time alone
 *     (`computeAccessCapacity`).
 *  2. DEMAND IS A CEILING, not a percent. `computeAccessPayoff` realizes
 *     `MIN(capacity, demand ceiling)` visits, never more. An empty slot
 *     with no demand behind it is worth nothing, so zero demand always
 *     realizes zero value even when capacity is large.
 *  3. MARGIN IS PER LINE. Cardiology and primary care are not worth the
 *     same visit; `marginPerVisitFor` prices each selected service line on
 *     its own contribution margin, falling back to a blended rate only when
 *     no specific line is in scope (Enterprise, or nothing selected yet).
 *
 * Because money is volume × margin, and volume itself is MIN(capacity,
 * demand), a dollar figure cannot exist until every one of scope, margin,
 * capacity, AND demand has a real value. `computeAccessContributions`
 * reflects that directly: every decision below the final payoff carries
 * `marginalMargin: 0` in its own row — the dollar is attributed to whichever
 * decision is the chain's binding constraint (see `computeAccessPayoff`'s
 * `binding` field), never smeared evenly across every row, and never shown
 * before the chain is actually complete.
 *
 * Reconciliation with the existing engine: `computeAccessCapacity` uses the
 * exact same PRIMITIVES Explore's `patientAccess` driver
 * (`exploreDriverCalcs.ts`) already prices freed time with — freed hours
 * per provider, a visit length in hours, and a reinvestment share — so this
 * chain is a decomposition of that same MECHANISM into an ordered,
 * demand-gated sequence, not a second, disconnected model. `exploreStateForReconciliation`
 * below proves that formula-level tie, mirroring `attainRevenue.ts`'s /
 * `attainWorkforce.ts`'s own reconciliation harnesses (see attainAccess.test.ts).
 *
 * That said, this chain's own DEFAULTS are deliberately more conservative
 * than either Explore's headline defaults OR this feature's own narrative
 * copy, on purpose, not by drift: `DEFAULT_MINUTES_SAVED_PER_NOTE` (2 min)
 * is far below Explore's typical per-encounter time-saved assumption, and
 * `DEFAULT_VISIT_LENGTH_MIN` (20 min) differs from Explore's own 30-minute
 * default. Visit length is a real, editable D3 input (`accessVisitLength`),
 * not a hardcoded constant - `computeAccessCapacity` divides the freed hours
 * committed to access by this exact value, so a shorter visit converts the
 * same freed hours into more capacity. So "faithful" here means the chain
 * reuses Explore's exact FORMULA and can be proven to reconcile at matching
 * inputs (the test file does exactly that) - it does NOT mean the two
 * screens land on the same dollar at their respective DEFAULT inputs, which
 * they deliberately do not (this chain is also demand-gated; Explore's
 * headline driver is not). See attainGoals.ts's outpatient-access narrative
 * for the copy that is kept in sync with this chain's 2-minute default.
 */

// ────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────

/** Benchmark minutes saved per note, editable in D3. Conservative default,
 * matching Abridge's own 2-4 min/encounter evidence rather than an
 * optimistic headline figure. */
export const DEFAULT_MINUTES_SAVED_PER_NOTE = 2;

/** The visit-length assumption this chain prices capacity against by
 * default, editable in D3 (`accessVisitLength`) rather than a fixed
 * constant - a shorter visit converts the identical freed hours into more
 * visits, so this has to be a real input the capacity math reads, not a
 * hardcoded number. ~20 minutes is the starting benchmark. */
export const DEFAULT_VISIT_LENGTH_MIN = 20;

/** Sensible per-line contribution-margin-per-visit defaults (D2), editable.
 * "Contribution margin, not charges" — these are illustrative starting
 * points a partner's finance owner corrects to their own numbers. */
export const DEFAULT_LINE_MARGIN_PER_VISIT: Record<string, number> = {
  Cardiology: 280,
  Orthopedics: 260,
  "Primary Care": 150,
  Endocrinology: 190,
  Neurology: 270,
  "Specialty Clinics": 220,
  "General ED": 380,
  "Fast Track": 220,
  "Observation Unit": 340,
  "Behavioral Health": 260,
};

/** Benchmark share of in-scope encounters that are typical no-shows or late
 * cancellations - a descriptive fact about today's operation, used ONLY by
 * the optional D4 no-show HELPER (`accessDemandNoShowRate`), never as a
 * direct ceiling driver itself. The helper estimates a suggested patient
 * COUNT as `recoveryRate x (noShowRate x encounters)` for a partner who only
 * knows their rates; the actual ceiling is always the countable
 * `accessDemandNoShowCount` field, whether typed directly or copied in from
 * the helper's estimate. ~12% is a conservative, commonly-cited outpatient
 * no-show benchmark; flagged for the partner's own number to replace it,
 * same convention every other descriptive-default in this chain uses. */
export const DEFAULT_NO_SHOW_RATE_PCT = 12;

/** Fallback margin per visit when no specific line is in scope yet
 * (Enterprise toggle, or nothing selected), or for a custom line with no
 * preset. Matches Explore's own `revenuePerVisit` default. */
export const DEFAULT_BLENDED_MARGIN_PER_VISIT = 200;

const NO_MOVE_FORMULA = "Set the numbers above and the math appears here.";

// ────────────────────────────────────────────────────────────────────────
// Small local helpers (deliberately not shared with attainLevers.ts, to
// keep this chain a self-contained, independently reasoned-about module)
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

function clampShare(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Real encounters-per-provider from the partner's own Scope baseline, or
 * a defensible fallback (matches the outpatient illustrative default used
 * elsewhere in the app) while the baseline is still empty. */
function perProviderEncounters(baseline: AttainBaseline, fallback = 3_500): number {
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  return providers > 0 && encounters > 0 ? encounters / providers : fallback;
}

// Falls back to 70% - the same "typical" utilization `defaultBaseline`
// documents app-wide (attainLevers.ts), not an optimistic 100% - so a blank
// Scope step never silently assumes every provider runs at full capacity.
function utilizationFraction(baseline: AttainBaseline, fallbackPct = 70): number {
  const pct = baseline.utilizationPct ?? fallbackPct;
  return clampShare(pct / 100);
}

function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

// ────────────────────────────────────────────────────────────────────────
// D1 — WHO you point at access
// ────────────────────────────────────────────────────────────────────────

export interface AccessScope {
  /** Providers actually in scope for access, always capped to the
   * partner's own Starting-point provider count. Enterprise defaults this
   * to the full count as a convenience, but does NOT force it — a partner
   * can still lower it to a subset. */
  providersInScope: number;
  /** Selected service lines (presets + any custom-added lines). Empty when
   * Enterprise is on, or when nothing has been picked yet. */
  lines: string[];
  enterprise: boolean;
}

/** D1: reads the partner's line selection, Enterprise toggle, and requested
 * provider count off the flat `LeverValues` bag (`accessLines`,
 * `accessEnterprise`, `accessProviders`), and resolves the real providers
 * in scope against the Starting-point baseline. Enterprise means "not
 * broken out by a specific service line," NOT "every provider" — it
 * defaults the requested count to every provider in the baseline only as a
 * convenience when nothing has been requested yet, and a partner can still
 * lower it to a subset. Either way the requested count is capped so a
 * partner can never scope in more providers than they told the
 * Starting-point step they have. */
export function computeAccessScope(baseline: AttainBaseline, values: LeverValues): AccessScope {
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  const enterprise = asNum(values.accessEnterprise) === 1;
  const lines = asLines(values.accessLines);
  const rawRequested = Math.max(0, Math.round(asNum(values.accessProviders)));
  // Enterprise means "not broken out by a specific service line," NOT
  // "every single provider." It defaults the requested count to the full
  // Starting-point count as a convenience only when nothing has been
  // requested yet — a partner can still scope Enterprise access to a
  // subset of providers by lowering this same field.
  const requested = enterprise && rawRequested <= 0 ? totalProviders : rawRequested;
  const providersInScope = totalProviders > 0 ? Math.min(requested, totalProviders) : requested;
  return { providersInScope, lines, enterprise };
}

// ────────────────────────────────────────────────────────────────────────
// D2 — WHAT A VISIT IS WORTH
// ────────────────────────────────────────────────────────────────────────

/** D2, per line: an editable contribution-margin-per-visit, stored under
 * `accessMarginLine__<line>`, falling back to a sensible per-line default,
 * then to the blended default for a line with no preset. */
export function marginPerVisitFor(line: string, values: LeverValues): number {
  const raw = values[`accessMarginLine__${line}`];
  if (typeof raw === "number" && raw > 0) return raw;
  return DEFAULT_LINE_MARGIN_PER_VISIT[line] ?? DEFAULT_BLENDED_MARGIN_PER_VISIT;
}

/** D2, blended: the single margin-per-visit input used when Enterprise is
 * on or no line has been selected yet, stored under `accessMargin`. */
export function blendedMarginPerVisit(values: LeverValues): number {
  const raw = values.accessMargin;
  if (typeof raw === "number" && raw > 0) return raw;
  return DEFAULT_BLENDED_MARGIN_PER_VISIT;
}

// ────────────────────────────────────────────────────────────────────────
// D3 — CONVERT FREED TIME TO CAPACITY (the one capacity mechanism)
// ────────────────────────────────────────────────────────────────────────

export interface AccessCapacity {
  freedHoursTotal: number;
  freedHoursToAccess: number;
  /** Visits/year of NEW capacity. Never a dollar figure. */
  capacityVisits: number;
  /** The share of the freed hour actually applied here, AFTER any
   * cross-goal (access/retention) scaling — see `computeAccessChain`. */
  effectiveSharePct: number;
  minutesSavedPerNote: number;
  /** The average visit length (minutes) capacity is priced against - a
   * real, editable D3 input (`accessVisitLength`), defaulting to
   * `DEFAULT_VISIT_LENGTH_MIN`. */
  visitLengthMinutes: number;
}

/**
 * D3: freed hours = providersInScope × notes/provider/yr × minutesSaved,
 * then only `effectiveSharePct` of that hour is committed to the schedule
 * (the rest stays protected relief, never counted here). Capacity is that
 * committed time divided by the visit length — the ONLY place new visit
 * capacity is created in this chain. There is no second "open slots"
 * mechanism; a slot that isn't backed by freed time doesn't exist here.
 *
 * `visitLengthMinutes` is a real input, not a hardcoded constant: a shorter
 * average visit converts the identical freed hours into more visits, so
 * capacity scales inversely with it. Defaults to `DEFAULT_VISIT_LENGTH_MIN`
 * (~20 min) when the partner hasn't overridden it yet.
 */
export function computeAccessCapacity(
  baseline: AttainBaseline,
  scope: AccessScope,
  minutesSavedPerNote: number,
  effectiveSharePct: number,
  visitLengthMinutes: number = DEFAULT_VISIT_LENGTH_MIN,
): AccessCapacity {
  const safeVisitLengthMinutes = visitLengthMinutes > 0 ? visitLengthMinutes : DEFAULT_VISIT_LENGTH_MIN;
  if (scope.providersInScope <= 0) {
    return {
      freedHoursTotal: 0,
      freedHoursToAccess: 0,
      capacityVisits: 0,
      effectiveSharePct: 0,
      minutesSavedPerNote,
      visitLengthMinutes: safeVisitLengthMinutes,
    };
  }
  const notesPerProvider = perProviderEncounters(baseline) * utilizationFraction(baseline);
  const freedHoursTotal = scope.providersInScope * notesPerProvider * (minutesSavedPerNote / 60);
  const share = clampShare(effectiveSharePct / 100);
  const freedHoursToAccess = freedHoursTotal * share;
  const visitLengthHrs = safeVisitLengthMinutes / 60;
  const capacityVisits = freedHoursToAccess / visitLengthHrs;
  return {
    freedHoursTotal,
    freedHoursToAccess,
    capacityVisits,
    effectiveSharePct,
    minutesSavedPerNote,
    visitLengthMinutes: safeVisitLengthMinutes,
  };
}

// ────────────────────────────────────────────────────────────────────────
// D4 — WHERE THE DEMAND COMES FROM (the ceiling)
// ────────────────────────────────────────────────────────────────────────

export interface AccessDemand {
  /** Total patients already referred and waiting, right now - a one-time
   * count, never annualized. */
  backlogVisits: number;
  /** The raw monthly referral rate this term was annualized from, kept on
   * the result so THE MATH can show its own derivation ("850/mo x 12 =
   * 10,200/yr") instead of silently printing only the annualized number -
   * without this a partner sees their 850/mo input "become" 10,200 with no
   * visible arithmetic. */
  newReferralsPerMonth: number;
  /** `newReferralsPerMonth x 12`. */
  newReferralVisits: number;
  /** Same-day/urgent demand the schedule cannot fit today - a direct,
   * countable patients/yr number the partner enters, never a percent of
   * encounters (rule 2's "real, countable patient, not a rate"). */
  sameDayVisits: number;
  /** No-shows recoverable by filling that slot with a waiting patient - a
   * direct, countable patients/yr number, same as `sameDayVisits`. This is
   * the value that actually counts toward `demandCeiling`, whether the
   * partner typed it directly or copied in the optional rate-helper's
   * estimate below. */
  noShowVisits: number;
  /** In-scope encounter volume, kept only so the optional no-show helper
   * below has a real number to estimate against - no percentage here is
   * ever multiplied directly into `demandCeiling`. */
  encountersInScope: number;
  /** The no-show HELPER's own "typical no-show rate" input (share of
   * in-scope encounters that are a no-show or late cancellation in the
   * first place), defaulting to `DEFAULT_NO_SHOW_RATE_PCT`. Purely a
   * suggestion input - see `noShowHelperEstimate`. */
  noShowHelperRatePct: number;
  /** The no-show HELPER's own "recoverable share" input - the share of that
   * no-show pool a waiting patient could actually refill. Purely a
   * suggestion input - see `noShowHelperEstimate`. */
  noShowHelperRecoveryPct: number;
  /** The helper's derived suggestion - `encountersInScope x
   * noShowHelperRatePct x noShowHelperRecoveryPct`, via
   * `estimateNoShowRecoveryCount` - for a partner who only knows their rates
   * and wants a starting count. Never feeds `demandCeiling` on its own; a
   * partner has to copy it into `accessDemandNoShowCount` (the UI's "use
   * estimate" action) for it to count. */
  noShowHelperEstimate: number;
  /** Sum of the four countable sources — the hard ceiling on realized
   * visits. Any source left blank simply contributes 0; there is no
   * requirement to fill all, one, or none of them. */
  demandCeiling: number;
}

/** The no-show rate-helper's own math, exported standalone so it is directly
 * testable and reusable by the D4 UI's "estimate from your no-show rate"
 * action without going through the full demand chain: a typical no-show
 * RATE first sizes the no-show POOL out of total encounters, then the
 * RECOVERY share is applied to that pool, never to every encounter directly
 * - recoveryRate x (noShowRate x encounters), never recoveryRate x
 * encounters, which would silently treat "recover 60% of no-shows" as "60%
 * of every encounter is a recovered no-show." The result is a suggested
 * COUNT, not itself a rate - it is meant to be copied into the real,
 * countable no-show field, never applied automatically. */
export function estimateNoShowRecoveryCount(encountersInScope: number, noShowRatePct: number, recoveryPct: number): number {
  const rate = clampPct(noShowRatePct) / 100;
  const recovery = clampPct(recoveryPct) / 100;
  return Math.max(0, Math.round(encountersInScope * rate * recovery));
}

/** D4: four demand sources, summed into one ceiling. Every source is a
 * real, countable number of patients, never a rate applied to capacity
 * (the product owner's fix for D4's confusing mixed percent/count model):
 * referral backlog is a one-time count of patients already waiting;
 * same-day/urgent and no-show recovery are each a direct patients/yr count;
 * new referrals is a patients/mo count, annualized (x12) below. None of the
 * four is required - a source left at 0 simply contributes 0, so filling in
 * all, one, or none of them is equally valid.
 *
 * The no-show source additionally carries an OPTIONAL rate-based helper
 * (`accessDemandNoShowRate`, `accessDemandNoShowPct`) for a partner who only
 * knows their no-show rate and recovery rate, not a patient count outright -
 * `estimateNoShowRecoveryCount` derives a suggested count from those two
 * rates, exposed here as `noShowHelperEstimate`, but it never feeds
 * `demandCeiling` by itself; only the actual `noShowVisits` count does,
 * whether typed directly or copied in from the helper's suggestion. */
export function computeAccessDemand(baseline: AttainBaseline, scope: AccessScope, values: LeverValues): AccessDemand {
  const encountersInScope = scope.providersInScope * perProviderEncounters(baseline) * utilizationFraction(baseline);
  const backlogVisits = Math.max(0, Math.round(asNum(values.accessDemandBacklog)));
  const newReferralsPerMonth = Math.max(0, asNum(values.accessDemandNewReferrals));
  const newReferralVisits = Math.round(newReferralsPerMonth * 12);
  const sameDayVisits = Math.max(0, Math.round(asNum(values.accessDemandSameDayCount)));
  const noShowVisits = Math.max(0, Math.round(asNum(values.accessDemandNoShowCount)));

  const rawHelperRate = asNum(values.accessDemandNoShowRate);
  const noShowHelperRatePct = clampPct(rawHelperRate > 0 ? rawHelperRate : DEFAULT_NO_SHOW_RATE_PCT);
  const noShowHelperRecoveryPct = clampPct(asNum(values.accessDemandNoShowPct));
  const noShowHelperEstimate = estimateNoShowRecoveryCount(encountersInScope, noShowHelperRatePct, noShowHelperRecoveryPct);

  const demandCeiling = backlogVisits + newReferralVisits + sameDayVisits + noShowVisits;
  return {
    backlogVisits,
    newReferralsPerMonth,
    newReferralVisits,
    sameDayVisits,
    noShowVisits,
    encountersInScope,
    noShowHelperRatePct,
    noShowHelperRecoveryPct,
    noShowHelperEstimate,
    demandCeiling,
  };
}

// ────────────────────────────────────────────────────────────────────────
// D5 — THE PAYOFF (dollars, derived, for the first time)
// ────────────────────────────────────────────────────────────────────────

export interface AccessPayoffLine {
  line: string;
  visits: number;
  marginPerVisit: number;
  value: number;
}

export interface AccessPayoff {
  /** MIN(capacity, demand). Never exceeds either input. */
  realizedVisits: number;
  /** Which side of the MIN actually limited the outcome, so D4's card can
   * say "capacity-limited" or "demand-limited" out loud. */
  binding: "capacity" | "demand" | "none";
  /** realizedVisits × per-line margin, summed. The first dollar figure in
   * the whole chain. */
  value: number;
  /** Weighted-average margin actually realized, for display. */
  blendedMarginUsed: number;
  perLine: AccessPayoffLine[];
}

/**
 * D5: realized visits = MIN(capacity, demand) (rule 2), split evenly across
 * whichever lines are in scope and priced at THAT line's own margin (rule
 * 3), then summed. Enterprise or "no line yet" prices every realized visit
 * at the one blended margin instead. This is the only function in the
 * chain that produces a dollar.
 */
/** The D4 result, in plain language: a short phrase naming whichever side
 * (capacity or demand) is actually the ceiling on realized visits, for an
 * exec reading the result, never printed as "MIN(capacity, demand)". Pure
 * and independently testable since the wording is content, not math - the
 * math itself (`binding`) is already computed by `computeAccessPayoff`. */
export function bindingPlainPhrase(binding: AccessPayoff["binding"]): string {
  switch (binding) {
    case "capacity":
      return "Capacity is the limiter here.";
    case "demand":
      return "Demand is the limiter here.";
    default:
      return "Set your capacity and demand above to see which one limits you.";
  }
}

export function computeAccessPayoff(
  scope: AccessScope,
  values: LeverValues,
  capacityVisits: number,
  demandCeiling: number,
): AccessPayoff {
  const realizedVisits = Math.max(0, Math.min(capacityVisits, demandCeiling));
  const binding: AccessPayoff["binding"] =
    realizedVisits <= 0 ? "none" : capacityVisits <= demandCeiling ? "capacity" : "demand";

  const lines = !scope.enterprise && scope.lines.length > 0 ? scope.lines : [];

  if (lines.length === 0) {
    const margin = blendedMarginPerVisit(values);
    const value = Math.round(realizedVisits * margin);
    return {
      realizedVisits,
      binding,
      value,
      blendedMarginUsed: margin,
      perLine: [{ line: scope.enterprise ? "Enterprise" : "Blended", visits: realizedVisits, marginPerVisit: margin, value }],
    };
  }

  const perLineVisits = realizedVisits / lines.length;
  const perLine: AccessPayoffLine[] = lines.map((line) => {
    const marginPerVisit = marginPerVisitFor(line, values);
    return { line, visits: perLineVisits, marginPerVisit, value: Math.round(perLineVisits * marginPerVisit) };
  });
  const value = perLine.reduce((sum, l) => sum + l.value, 0);
  const blendedMarginUsed = realizedVisits > 0 ? value / realizedVisits : 0;
  return { realizedVisits, binding, value, blendedMarginUsed, perLine };
}

/**
 * Builds THE MATH line for D4, term by term, so every source shows its own
 * derivation and unit instead of a silently-annualized total that looks
 * like it "jumped" (850/mo becoming 10,200/yr with no visible arithmetic).
 * Backlog is always labeled "(one-time)" — it is a count of patients
 * waiting right now, not a rate. New referrals shows "(X/mo x 12 = Y/yr)"
 * whenever the monthly rate is nonzero. Same-day and no-show are each
 * already a direct count, so they print plainly ("X/yr same-day"), UNLESS
 * the no-show count in play is exactly the rate-helper's own estimate, in
 * which case it shows that helper's derivation instead ("estimated: X% no-
 * show rate x Y% recovered of E encounters") so a partner who used the
 * helper can see where the number came from. Any term that is exactly 0
 * prints plainly ("0 same-day"), not a derivation of nothing.
 */
function buildDemandFormula(demand: AccessDemand): string {
  const backlogTerm = `${demand.backlogVisits.toLocaleString()} backlog (one-time)`;

  const referralsTerm = demand.newReferralsPerMonth > 0
    ? `(${demand.newReferralsPerMonth.toLocaleString()}/mo x 12 = ${demand.newReferralVisits.toLocaleString()}/yr) new referrals`
    : "0 new referrals";

  const sameDayTerm = demand.sameDayVisits > 0
    ? `${demand.sameDayVisits.toLocaleString()}/yr same-day / urgent`
    : "0 same-day";

  const usedHelper = demand.noShowVisits > 0 && demand.noShowHelperEstimate > 0 && demand.noShowVisits === demand.noShowHelperEstimate;
  const noShowTerm = demand.noShowVisits > 0
    ? usedHelper
      ? `${demand.noShowVisits.toLocaleString()}/yr no-show recovery (estimated: ${Math.round(demand.noShowHelperRatePct)}% no-show rate x ${Math.round(demand.noShowHelperRecoveryPct)}% recovered of ${Math.round(demand.encountersInScope).toLocaleString()} encounters)`
      : `${demand.noShowVisits.toLocaleString()}/yr no-show recovery`
    : "0 no-show recovery";

  return `${backlogTerm} + ${referralsTerm} + ${sameDayTerm} + ${noShowTerm} = ${demand.demandCeiling.toLocaleString()} demand ceiling (backlog counted once, the rest per year).`;
}

// ────────────────────────────────────────────────────────────────────────
// The full chain + THE MATH strings
// ────────────────────────────────────────────────────────────────────────

export interface AccessChainResult {
  scope: AccessScope;
  capacity: AccessCapacity;
  demand: AccessDemand;
  payoff: AccessPayoff;
  formulas: {
    scope: string;
    capacity: string;
    demand: string;
    payoff: string;
  };
}

/**
 * Runs the whole D1 → D5 chain once. `crossGoalShareMultiplier` (0-1) is
 * the ONLY place the access/retention shared-hour conflict touches this
 * chain: when both goals are in play, the partner's D3 share is scaled
 * down by however much of that same hour retention's own floor is holding,
 * BEFORE capacity (and therefore everything downstream of it, including
 * the realized dollar) is computed — never as a post-hoc discount applied
 * to an already-finished dollar figure. See attainLevers.ts
 * `computeMultiGoalContributions` for where this multiplier comes from.
 */
export function computeAccessChain(
  baseline: AttainBaseline,
  values: LeverValues,
  crossGoalShareMultiplier = 1,
): AccessChainResult {
  const scope = computeAccessScope(baseline, values);
  const rawSharePct = clampPct(asNum(values.accessFreedShare));
  const effectiveSharePct = rawSharePct * clampShare(crossGoalShareMultiplier);
  const minutesSavedPerNote = asNum(values.accessMinutesSaved) > 0 ? asNum(values.accessMinutesSaved) : DEFAULT_MINUTES_SAVED_PER_NOTE;
  const visitLengthMinutes = asNum(values.accessVisitLength) > 0 ? asNum(values.accessVisitLength) : DEFAULT_VISIT_LENGTH_MIN;

  const capacity = computeAccessCapacity(baseline, scope, minutesSavedPerNote, effectiveSharePct, visitLengthMinutes);
  const demand = computeAccessDemand(baseline, scope, values);
  const payoff = computeAccessPayoff(scope, values, capacity.capacityVisits, demand.demandCeiling);

  const scopeFormula = scope.providersInScope > 0
    ? `${scope.providersInScope} providers in scope for access.`
    : NO_MOVE_FORMULA;

  const capacityFormula = capacity.capacityVisits > 0
    ? `${scope.providersInScope} providers × ${Math.round(capacity.freedHoursTotal / Math.max(1, scope.providersInScope))} freed hrs/provider/yr × ${Math.round(capacity.effectiveSharePct)}% to access ÷ ${capacity.visitLengthMinutes} min/visit = ${Math.round(capacity.capacityVisits).toLocaleString()} visits/yr capacity.`
    : NO_MOVE_FORMULA;

  const demandFormula = demand.demandCeiling > 0 ? buildDemandFormula(demand) : NO_MOVE_FORMULA;

  const payoffFormula = payoff.value > 0
    ? `${payoff.realizedVisits.toLocaleString()} realized visits (the smaller of ${Math.round(capacity.capacityVisits).toLocaleString()} capacity and ${demand.demandCeiling.toLocaleString()} demand) × ~$${Math.round(payoff.blendedMarginUsed).toLocaleString()}/visit = ~${fmtMoneyCompact(payoff.value)}.`
    : NO_MOVE_FORMULA;

  return { scope, capacity, demand, payoff, formulas: { scope: scopeFormula, capacity: capacityFormula, demand: demandFormula, payoff: payoffFormula } };
}

// ────────────────────────────────────────────────────────────────────────
// Reconciliation harness — proves the chain ties to Explore's own engine,
// the same way attainRevenue.ts / attainWorkforce.ts / attainInpatientRevenue.ts
// already do (this module was previously the one exception, asserting
// "faithful decomposition" only in prose - see the module header). Not used
// by the app itself, only by tests (attainAccess.test.ts).
// ────────────────────────────────────────────────────────────────────────

function mkState(): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "outpatient",
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

/**
 * The exact `ExploreState` this chain's D1-D3 decisions correspond to, built
 * so `computeAllDriverValues`'s `patientAccess` driver can be fed the SAME
 * freed-hours-per-provider, reinvestment share, visit length, and blended
 * margin this chain itself derives — never a second, hand-rolled formula
 * that could drift from the Explore engine. `totalHoursSaved` (Explore's own
 * second argument to `computeAllDriverValues`, computed by
 * `ExploreFlow.tsx`'s own `totalHoursSaved` memo as `annualEncounters x
 * utilizationPercent/100 x minutesSavedPerEncounter / 60`) is reproduced the
 * same way by the caller, not by this function, to keep this helper a pure
 * state-builder like its sibling chains' own reconciliation helpers.
 *
 * Reconciliation only holds when access is CAPACITY-bound (demand ceiling at
 * or above capacity) and priced at the blended margin (no per-line split,
 * which Explore's single `revenuePerVisit` cannot represent) - see the
 * module header for why the two chains are demand-gated vs not by design,
 * and attainAccess.test.ts for the passing scenario.
 */
export function exploreStateForReconciliation(
  baseline: AttainBaseline,
  values: LeverValues,
  crossGoalShareMultiplier = 1,
): ExploreState {
  const chain = computeAccessChain(baseline, values, crossGoalShareMultiplier);
  const { scope, capacity, payoff } = chain;
  const state = mkState();
  state.numberOfProviders = scope.providersInScope;
  state.annualEncounters = Math.round(scope.providersInScope * perProviderEncounters(baseline) * utilizationFraction(baseline));
  state.utilizationPercent = 100; // utilization already folded into annualEncounters above
  state.minutesSavedPerEncounter = capacity.minutesSavedPerNote;

  const td = state.timeDriverInputs as any;
  td.patientAccessEnabled = true;
  td.accessProviders = scope.providersInScope;
  td.capacityRealizationPercent = capacity.effectiveSharePct;
  td.visitDuration = capacity.visitLengthMinutes;
  td.revenuePerVisit = payoff.blendedMarginUsed > 0 ? payoff.blendedMarginUsed : blendedMarginPerVisit(values);

  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every access "row" this chain surfaces to the generic Commit/Plan
 * bookkeeping, in chain order. Kept in sync with `LEVERS.access` in
 * attainLevers.ts — each id here must match a `LEVERS.access[].id`. */
export const ACCESS_LEVER_IDS = [
  "accessProviders",
  "accessMargin",
  "accessFreedShare",
  "accessDemandBacklog",
  "accessDemandSameDayCount",
  "accessDemandNoShowCount",
  "accessDemandNewReferrals",
] as const;

/**
 * Adapts the D1-D5 chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns, so
 * `computeMultiGoalContributions`, `StepCommit`, and `StepAttainment` keep
 * working against access unmodified.
 *
 * Every row's `marginalMargin` is 0 except ONE: whichever decision is the
 * chain's actual binding constraint (`payoff.binding`) carries the entire
 * realized dollar value. This is deliberate, not a simplification of
 * convenience — none of D1-D4 individually "adds" a dollar (the dollar is
 * a joint function of all four), so splitting it evenly across every row
 * would invent precision that doesn't exist, and leaving every row at 0
 * would make the Commit/Plan "worth $X" columns silently blank. Attributing
 * the whole figure to the binding constraint is the same idea Build the
 * case's D4 card states out loud ("capacity-limited" / "demand-limited").
 */
export function computeAccessContributions(
  baseline: AttainBaseline,
  values: LeverValues,
  crossGoalShareMultiplier = 1,
): LeverContributionsResult {
  const chain = computeAccessChain(baseline, values, crossGoalShareMultiplier);
  const { scope, capacity, demand, payoff, formulas } = chain;

  const rows: { id: string; count: number; formula: string }[] = [
    { id: "accessProviders", count: scope.providersInScope, formula: formulas.scope },
    {
      id: "accessMargin",
      count: Math.round(payoff.blendedMarginUsed),
      formula: payoff.blendedMarginUsed > 0
        ? `~$${Math.round(payoff.blendedMarginUsed).toLocaleString()}/visit contribution margin across ${payoff.perLine.length} line(s).`
        : NO_MOVE_FORMULA,
    },
    { id: "accessFreedShare", count: Math.round(capacity.capacityVisits), formula: formulas.capacity },
    {
      id: "accessDemandBacklog",
      count: demand.backlogVisits,
      formula: demand.backlogVisits > 0 ? `${demand.backlogVisits.toLocaleString()} patients waiting in the referral backlog.` : NO_MOVE_FORMULA,
    },
    {
      id: "accessDemandSameDayCount",
      count: demand.sameDayVisits,
      formula: demand.sameDayVisits > 0 ? `${demand.sameDayVisits.toLocaleString()} visits/yr from same-day and urgent demand.` : NO_MOVE_FORMULA,
    },
    {
      id: "accessDemandNoShowCount",
      count: demand.noShowVisits,
      formula: demand.noShowVisits > 0 ? `${demand.noShowVisits.toLocaleString()} visits/yr recovered from no-shows.` : NO_MOVE_FORMULA,
    },
    {
      id: "accessDemandNewReferrals",
      count: demand.newReferralVisits,
      formula: demand.newReferralVisits > 0 ? `${demand.newReferralVisits.toLocaleString()} visits/yr from new referrals.` : NO_MOVE_FORMULA,
    },
  ];

  let attributedId: string | null = null;
  if (payoff.value > 0) {
    if (payoff.binding === "capacity") {
      attributedId = "accessFreedShare";
    } else {
      const demandRows = [
        { id: "accessDemandBacklog", n: demand.backlogVisits },
        { id: "accessDemandSameDayCount", n: demand.sameDayVisits },
        { id: "accessDemandNoShowCount", n: demand.noShowVisits },
        { id: "accessDemandNewReferrals", n: demand.newReferralVisits },
      ].sort((a, b) => b.n - a.n);
      attributedId = demandRows[0].n > 0 ? demandRows[0].id : "accessFreedShare";
    }
  }

  const perLever: LeverContribution[] = rows.map((r) => ({
    id: r.id,
    marginalMargin: r.id === attributedId ? payoff.value : 0,
    marginalCount: r.count,
    pctOfTotal: r.id === attributedId ? 1 : 0,
    formula: r.formula,
  }));

  return { perLever, totalMargin: payoff.value, totalCount: payoff.realizedVisits };
}
