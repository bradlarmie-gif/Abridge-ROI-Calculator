import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";

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
 * exact same primitives Explore's `patientAccess` driver
 * (`exploreDriverCalcs.ts`) already prices freed time with — freed hours
 * per provider, a visit length in hours, and a reinvestment share — so this
 * chain is a faithful decomposition of that same mechanism into an ordered,
 * demand-gated sequence, not a second, disconnected model. Visit length
 * defaults to the ~20 minute benchmark this task specifies but is a real,
 * editable D3 input (`accessVisitLength`), not a hardcoded constant -
 * `computeAccessCapacity` divides the freed hours committed to access by
 * this exact value, so a shorter visit converts the same freed hours into
 * more capacity. Explore's own card lets a partner edit that assumption at
 * 30 minutes by default, which is why the two dollar figures are close but
 * not identical by design (this chain is demand-gated, Explore's headline
 * driver is not).
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

/** Fallback margin per visit when no specific line is in scope yet
 * (Enterprise toggle, or nothing selected), or for a custom line with no
 * preset. Matches Explore's own `revenuePerVisit` default. */
export const DEFAULT_BLENDED_MARGIN_PER_VISIT = 200;

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

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

function utilizationFraction(baseline: AttainBaseline, fallbackPct = 100): number {
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
  /** Providers actually in scope for access, capped to the partner's own
   * Starting-point provider count (or, for Enterprise, exactly that count). */
  providersInScope: number;
  /** Selected service lines (presets + any custom-added lines). Empty when
   * Enterprise is on, or when nothing has been picked yet. */
  lines: string[];
  enterprise: boolean;
}

/** D1: reads the partner's line selection, Enterprise toggle, and requested
 * provider count off the flat `LeverValues` bag (`accessLines`,
 * `accessEnterprise`, `accessProviders`), and resolves the real providers
 * in scope against the Starting-point baseline. Enterprise always resolves
 * to every provider in the baseline; otherwise the requested count is
 * capped so a partner can never scope in more providers than they told the
 * Starting-point step they have. */
export function computeAccessScope(baseline: AttainBaseline, values: LeverValues): AccessScope {
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  const enterprise = asNum(values.accessEnterprise) === 1;
  const lines = asLines(values.accessLines);
  const requested = Math.max(0, Math.round(asNum(values.accessProviders)));
  const providersInScope = enterprise
    ? totalProviders
    : totalProviders > 0
      ? Math.min(requested, totalProviders)
      : requested;
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
  backlogVisits: number;
  sameDayVisits: number;
  noShowVisits: number;
  newReferralVisits: number;
  /** Sum of every demand source — the hard ceiling on realized visits. */
  demandCeiling: number;
}

/** D4: four demand sources, summed into one ceiling. Referral backlog is a
 * direct visit count; same-day/urgent and no-show recovery are percentages
 * of the in-scope encounter volume; new referrals is a monthly rate,
 * annualized. This is the ceiling — capacity above this line is simply
 * unfillable and worth nothing (rule 2). */
export function computeAccessDemand(baseline: AttainBaseline, scope: AccessScope, values: LeverValues): AccessDemand {
  const encounters = scope.providersInScope * perProviderEncounters(baseline) * utilizationFraction(baseline);
  const backlogVisits = Math.max(0, Math.round(asNum(values.accessDemandBacklog)));
  const sameDayPct = clampPct(asNum(values.accessDemandSameDayPct));
  const noShowPct = clampPct(asNum(values.accessDemandNoShowPct));
  const newReferralsPerMonth = Math.max(0, asNum(values.accessDemandNewReferrals));
  const sameDayVisits = Math.round(encounters * (sameDayPct / 100));
  const noShowVisits = Math.round(encounters * (noShowPct / 100));
  const newReferralVisits = Math.round(newReferralsPerMonth * 12);
  const demandCeiling = backlogVisits + sameDayVisits + noShowVisits + newReferralVisits;
  return { backlogVisits, sameDayVisits, noShowVisits, newReferralVisits, demandCeiling };
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

  const demandFormula = demand.demandCeiling > 0
    ? `${demand.backlogVisits.toLocaleString()} backlog + ${demand.sameDayVisits.toLocaleString()} same-day + ${demand.noShowVisits.toLocaleString()} no-show + ${demand.newReferralVisits.toLocaleString()} new referrals = ${demand.demandCeiling.toLocaleString()} visits/yr demand ceiling.`
    : NO_MOVE_FORMULA;

  const payoffFormula = payoff.value > 0
    ? `${payoff.realizedVisits.toLocaleString()} realized visits (the smaller of ${Math.round(capacity.capacityVisits).toLocaleString()} capacity and ${demand.demandCeiling.toLocaleString()} demand) × ~$${Math.round(payoff.blendedMarginUsed).toLocaleString()}/visit = ~${fmtMoneyCompact(payoff.value)}.`
    : NO_MOVE_FORMULA;

  return { scope, capacity, demand, payoff, formulas: { scope: scopeFormula, capacity: capacityFormula, demand: demandFormula, payoff: payoffFormula } };
}

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
  "accessDemandSameDayPct",
  "accessDemandNoShowPct",
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
      id: "accessDemandSameDayPct",
      count: demand.sameDayVisits,
      formula: demand.sameDayVisits > 0 ? `${demand.sameDayVisits.toLocaleString()} visits/yr from same-day and urgent demand.` : NO_MOVE_FORMULA,
    },
    {
      id: "accessDemandNoShowPct",
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
        { id: "accessDemandSameDayPct", n: demand.sameDayVisits },
        { id: "accessDemandNoShowPct", n: demand.noShowVisits },
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
