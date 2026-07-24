import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import type { AttainSetting } from "./attainTypes";

/**
 * Attain — WORKFORCE (Provider Retention) decision chain engine.
 *
 * Workforce is about VOLUNTARY TURNOVER, and the value is
 * departures avoided × replacement cost. Rebuilt here as an ORDERED chain,
 * not a flat set of independent levers — same discipline as
 * `attainAccess.ts` and `attainRevenue.ts` — because a departures-avoided
 * figure is not honest until every decision behind it is real:
 *
 *   D1 WHO / SCOPE — which departments/cohort and how many providers are in
 *      scope, their current voluntary turnover rate, and the replacement
 *      cost per departure (a partner-entered number, benchmarked but never
 *      assumed). No dollar yet — this is scope and price, not volume.
 *   D2 PROTECT THE RECOVERED RELIEF — the core Abridge-driven lever. Freed
 *      documentation time (after-hours load) is held down and not refilled.
 *      This is the primary driver of the retention impact and the ONE
 *      decision that shares the same freed hour with Access (see the
 *      cross-goal note below).
 *   D3 RUN A PULSE / SURVEY CADENCE — committing to a likelihood-to-stay +
 *      burnout pulse is BOTH the intervention (it catches erosion before it
 *      becomes a resignation) AND the signal Commit watches later. A faster
 *      cadence raises how much of D2's protection actually realizes as
 *      retention, because problems get caught and fixed before someone
 *      quits over them.
 *   D4 BACKFILL COVERAGE GAPS — a separate mechanism from D2: covering an
 *      open shift or panel before the remaining staff absorb it keeps the
 *      burden from quietly returning. Additive, not multiplicative, and
 *      does NOT require D2 to be moved to have its own effect.
 *   D5 SUSTAIN — the relief only counts for as many months as it actually
 *      holds; 0 months sustained is 0 departures avoided, no matter how
 *      strong D2-D4 are, the same way Access's realized visits are 0
 *      without real demand behind the capacity.
 *   THE PAYOFF — departures avoided = providers × turnover × burnout share
 *      × the composite impact the decisions above produce; value =
 *      departures avoided × replacement cost. The one place a dollar
 *      appears, always derived, shown with THE MATH.
 *
 * RECONCILIATION: the payoff's engine value is read straight off
 * `computeAllDriverValues`'s `providerWellbeing` (physician settings) /
 * `nursingRetention` (nursing), fed a synthesized `ExploreState` whose
 * `retentionCustomPercent` is EXACTLY this chain's own composite impact
 * percent — the same "custom" scenario knob the old flat-lever retention
 * model already used (see the RETENTION_SCENARIOS_* tables in
 * `exploreDriverCalcs.ts`), never a second, hand-rolled formula.
 *
 * CROSS-GOAL FREED-TIME SPLIT (access + retention, no double count): D2
 * (`retentionProtect`) is the ONLY decision here that draws on the same
 * freed documentation hour Access's D3 (`accessFreedShare`) draws on.
 * `crossGoalShareMultiplier` (0-1) scales D2's effective protected share
 * BEFORE the composite impact (and therefore the payoff) is computed —
 * exactly the same convention `computeAccessChain` uses for its own D3 —
 * so the split is exact, not a post-hoc discount on an already-finished
 * dollar figure. D3/D4/D5 are genuinely separate mechanisms (a pulse
 * survey and backfilled coverage do not consume freed documentation time)
 * and are never touched by this multiplier.
 */

// ────────────────────────────────────────────────────────────────────────
// Setting-level defaults, so this chain never invents a second set of
// numbers. The turnover rate below is the SINGLE SOURCE OF TRUTH for both
// the dollar and the "Where you are today" turnover card: attainGoals.ts
// imports WORKFORCE_TURNOVER_DEFAULT_PCT and renders the exact same value it
// is figured on, so the card and the money can never quote two different
// "today" rates. Burnout share and replacement cost track the engine's own
// pre-existing illustrative constants (exploreDriverCalcs.ts /
// attainCalc.ts's retentionTarget).
// ────────────────────────────────────────────────────────────────────────

export const WORKFORCE_TURNOVER_DEFAULT_PCT: Record<AttainSetting, number> = {
  outpatient: 14,
  ed: 18,
  inpatient: 16,
  nursing: 19,
};

/** Physicians ~$250K-$500K per departure, nurses lower — per the product
 * spec. These match the benchmarks already quoted in each setting's
 * retention copy in attainGoals.ts. */
export const WORKFORCE_REPLACEMENT_COST_DEFAULT: Record<AttainSetting, number> = {
  outpatient: 375_000,
  ed: 450_000,
  inpatient: 375_000,
  nursing: 55_000,
};

/** Share of voluntary turnover attributed to burnout, fixed per setting
 * (not a partner decision) — matches the engine's own hardcoded physician
 * burnout share and nursing's fixed 40% (see `computeAllDriverValues`). */
export const WORKFORCE_BURNOUT_SHARE_PCT: Record<AttainSetting, number> = {
  outpatient: 40,
  ed: 50,
  inpatient: 45,
  nursing: 40,
};

/** The ceiling this chain's composite impact can reach: the maximum SHARE
 * of a setting's burnout-related departures Abridge can realistically help a
 * partner avoid. Set by product decision at 50% of the burnout-related
 * departures for every setting that has a retention story (physician settings
 * and nursing alike) — a fully committed plan avoids at most half of the
 * departures burnout actually causes, never all of them. The name keeps the
 * `_PP` suffix for backward compatibility, but the unit is a percent-of-pool,
 * not points off the turnover rate (see the UNITS NOTE above
 * `computeWorkforcePayoff`). This ceiling is fed straight into the engine as
 * the "custom" retention scenario percent, so it is the one number the story
 * pages' prize copy and the payoff both derive from. */
export const WORKFORCE_IMPACT_CEILING_PP: Record<AttainSetting, number> = {
  outpatient: 50,
  ed: 50,
  inpatient: 50,
  nursing: 50,
};

export const SURVEY_CADENCE_LABELS = ["Not yet", "Quarterly pulse", "Monthly pulse"];
export const BACKFILL_LEVEL_LABELS = ["None", "Partial", "Full"];

const NO_MOVE_FORMULA = "Set the numbers above and the math appears here.";

// ────────────────────────────────────────────────────────────────────────
// Local helpers (deliberately not shared with attainLevers.ts, same
// self-contained-module convention attainAccess.ts / attainRevenue.ts use).
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
function clampLevel(n: number): number {
  return Math.min(2, Math.max(0, Math.round(n)));
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtPp(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function mkState(setting: AttainSetting): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: setting,
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

// ────────────────────────────────────────────────────────────────────────
// D1 — WHO / SCOPE (+ turnover rate + replacement cost). No dollar yet.
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceScope {
  departments: string[];
  /** Providers (physician settings) or nursing FTEs (nursing), capped to
   * the partner's own Starting-point baseline count. */
  providersInScope: number;
  turnoverRatePct: number;
  replacementCost: number;
  /** Fixed per setting, not a partner decision — see the module header. */
  burnoutSharePct: number;
}

/** The real headcount this setting's retention plan draws providersInScope
 * against — physicians settings use `providers`, nursing uses `nursingFtes`
 * (a nurse's own real headcount, distinct from `staffedBeds` which Quality
 * uses — see `baselineUnits` in attainLevers.ts for the same split). */
function totalUnitsFor(setting: AttainSetting, baseline: AttainBaseline): number {
  const n = setting === "nursing" ? baseline.nursingFtes : baseline.providers;
  return Math.max(0, Math.round(n ?? 0));
}

/** D1: reads department scope, requested provider count, turnover rate, and
 * replacement cost off the flat `LeverValues` bag (`retentionLines`,
 * `retentionProviders`, `retentionTurnoverRate`, `retentionReplacementCost`),
 * capping providers to the Starting-point baseline the same way
 * `computeAccessScope` does, and falling back to this setting's own
 * benchmark default whenever turnover rate / replacement cost hasn't been
 * entered yet (same "descriptive default" convention as Access's D2 blended
 * margin). */
export function computeWorkforceScope(setting: AttainSetting, baseline: AttainBaseline, values: LeverValues): WorkforceScope {
  const totalUnits = totalUnitsFor(setting, baseline);
  const departments = asLines(values.retentionLines);
  const requested = Math.max(0, Math.round(asNum(values.retentionProviders)));
  const providersInScope = totalUnits > 0 ? Math.min(requested, totalUnits) : requested;

  const turnoverRaw = asNum(values.retentionTurnoverRate);
  const turnoverRatePct = clampPct(turnoverRaw > 0 ? turnoverRaw : WORKFORCE_TURNOVER_DEFAULT_PCT[setting]);

  const replacementRaw = asNum(values.retentionReplacementCost);
  const replacementCost = replacementRaw > 0 ? replacementRaw : WORKFORCE_REPLACEMENT_COST_DEFAULT[setting];

  return { departments, providersInScope, turnoverRatePct, replacementCost, burnoutSharePct: WORKFORCE_BURNOUT_SHARE_PCT[setting] };
}

// ────────────────────────────────────────────────────────────────────────
// D2 — PROTECT THE RECOVERED RELIEF (the shared freed-time lever)
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceProtect {
  /** The partner's raw D2 slider value (0-100%). */
  requestedSharePct: number;
  /** After the access/retention cross-goal split — see the module header. */
  effectiveSharePct: number;
  /** ceiling × 0.55 × effectiveSharePct/100 — D2's own contribution to the
   * composite impact, before D3/D4/D5 are applied. */
  impactPp: number;
}

/** The weight D2 alone can reach, as a fraction of the setting's ceiling —
 * protecting relief is "the core Abridge-driven lever" per the product
 * spec, so it carries the largest single share of the ceiling. */
const PROTECT_WEIGHT = 0.55;

export function computeWorkforceProtect(setting: AttainSetting, values: LeverValues, crossGoalShareMultiplier = 1): WorkforceProtect {
  const ceiling = WORKFORCE_IMPACT_CEILING_PP[setting];
  const requestedSharePct = clampPct(asNum(values.retentionProtect));
  const effectiveSharePct = requestedSharePct * clampShare(crossGoalShareMultiplier);
  const impactPp = ceiling * PROTECT_WEIGHT * (effectiveSharePct / 100);
  return { requestedSharePct, effectiveSharePct, impactPp };
}

// ────────────────────────────────────────────────────────────────────────
// D3 — RUN A PULSE / SURVEY CADENCE (intervention AND signal)
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceSurvey {
  cadenceLevel: number; // 0 none, 1 quarterly, 2 monthly
  multiplier: number; // 1.0 / 1.15 / 1.30
  /** D2's impact after the survey's realization boost. */
  impactPpAfterSurvey: number;
}

const SURVEY_MULTIPLIER = [1, 1.25, 1.4];

/** D3: a likelihood-to-stay + burnout pulse catches erosion in what D2
 * already protects, before it becomes a resignation — so it multiplies
 * D2's own impact rather than adding a separate, independent amount. A
 * pulse with nothing protected yet (D2 at 0) has nothing to realize. */
export function computeWorkforceSurvey(protectImpactPp: number, values: LeverValues): WorkforceSurvey {
  const cadenceLevel = clampLevel(asNum(values.retentionSurveyCadence));
  const multiplier = SURVEY_MULTIPLIER[cadenceLevel];
  return { cadenceLevel, multiplier, impactPpAfterSurvey: protectImpactPp * multiplier };
}

// ────────────────────────────────────────────────────────────────────────
// D4 — BACKFILL COVERAGE GAPS (a separate, additive mechanism)
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceBackfill {
  level: number; // 0 none, 1 partial, 2 full
  bonusPp: number;
  /** D3's impact plus D4's own bonus, capped at the setting's ceiling. */
  impactPpAfterBackfill: number;
}

const BACKFILL_BONUS_FRACTION = [0, 0.2, 0.3];

/** D4: backfilling an open shift or panel before the remaining staff absorb
 * it is a genuinely separate mechanism from protecting relief (it is a
 * staffing decision, not a freed-documentation-time one), so it ADDS to
 * whatever D2/D3 have already built rather than multiplying it — and it has
 * its own effect even when D2 is still at zero. */
export function computeWorkforceBackfill(setting: AttainSetting, impactPpAfterSurvey: number, values: LeverValues): WorkforceBackfill {
  const ceiling = WORKFORCE_IMPACT_CEILING_PP[setting];
  const level = clampLevel(asNum(values.retentionBackfill));
  const bonusPp = ceiling * BACKFILL_BONUS_FRACTION[level];
  const impactPpAfterBackfill = Math.min(ceiling, impactPpAfterSurvey + bonusPp);
  return { level, bonusPp, impactPpAfterBackfill };
}

// ────────────────────────────────────────────────────────────────────────
// D5 — SUSTAIN (how many months the relief actually holds)
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceSustain {
  months: number;
  fraction: number; // months / 12
  /** The final composite impact percent, ready for the payoff — 0 months
   * sustained means 0 realized impact, no matter how strong D2-D4 are,
   * the same discipline Access's demand ceiling enforces. */
  compositeImpactPct: number;
}

export function computeWorkforceSustain(impactPpAfterBackfill: number, values: LeverValues): WorkforceSustain {
  const months = Math.min(12, Math.max(0, asNum(values.retentionSustain)));
  const fraction = months / 12;
  return { months, fraction, compositeImpactPct: impactPpAfterBackfill * fraction };
}

// ────────────────────────────────────────────────────────────────────────
// THE PAYOFF — departures avoided × replacement cost
// ────────────────────────────────────────────────────────────────────────

export interface WorkforcePayoff {
  departuresAvoided: number;
  value: number;
  /** The HONEST resulting effect on the headline turnover RATE, in
   * percentage points (e.g. 0.8, not the composite's 0-to-50 "impact"
   * scale) — turnoverRatePct × burnoutSharePct/100 × compositeImpactPct/100.
   * Surfaced so a CFO reading the payoff never mistakes the composite
   * impact number for a drop in the turnover rate itself (see the module
   * header's units note above `computeWorkforceProtect`). */
  turnoverPointsReduced: number;
}

/** Departures avoided = providers × turnover × burnout share × the
 * composite impact the decisions above produce; value = departures
 * avoided × replacement cost — reads EXACTLY like `computeAllDriverValues`'s
 * `providerWellbeing`/`nursingRetention` block, see the module header.
 *
 * UNITS NOTE: `compositeImpactPct` (the D2-D5 composite, 0 to this setting's
 * 50% ceiling) is a SHARE OF BURNOUT-RELATED DEPARTURES avoided, not
 * percentage points off the turnover rate. A composite of 50 means "half of
 * the burnout-attributable departures in this pool are avoided," which is a
 * far smaller effect on the headline turnover rate than fifty points off the
 * rate would imply — see `turnoverPointsReduced` for the actual rate effect. */
export function computeWorkforcePayoff(scope: WorkforceScope, compositeImpactPct: number): WorkforcePayoff {
  const departuresAvoided =
    scope.providersInScope * (scope.turnoverRatePct / 100) * (scope.burnoutSharePct / 100) * (compositeImpactPct / 100);
  const value = Math.round(departuresAvoided * scope.replacementCost);
  const turnoverPointsReduced = scope.turnoverRatePct * (scope.burnoutSharePct / 100) * (compositeImpactPct / 100);
  return { departuresAvoided, value, turnoverPointsReduced };
}

// ────────────────────────────────────────────────────────────────────────
// THE CHAIN'S OWN CEILING — the honest maximum this chain can ever build to
// at a given headcount, used so the story-page "prize" copy
// (attainGoals.ts's retention goodCells/ambition tiers) is DERIVED from this
// same formula rather than a second, hand-picked number. Every D2-D5
// decision maxed (protect 100%, monthly pulse, full backfill, all 12
// months sustained) drives the composite impact to EXACTLY this setting's
// ceiling — see computeWorkforceBackfill's Math.min cap and
// computeWorkforceSustain's fraction=1 at 12 months — so the ceiling
// composite really is `WORKFORCE_IMPACT_CEILING_PP[setting]`, not an
// estimate.
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceCeiling {
  departuresAvoided: number;
  value: number;
  turnoverPointsReduced: number;
}

export function computeWorkforceCeiling(setting: AttainSetting, providersInScope: number): WorkforceCeiling {
  const scope: WorkforceScope = {
    departments: [],
    providersInScope,
    turnoverRatePct: WORKFORCE_TURNOVER_DEFAULT_PCT[setting],
    replacementCost: WORKFORCE_REPLACEMENT_COST_DEFAULT[setting],
    burnoutSharePct: WORKFORCE_BURNOUT_SHARE_PCT[setting],
  };
  const payoff = computeWorkforcePayoff(scope, WORKFORCE_IMPACT_CEILING_PP[setting]);
  return { departuresAvoided: payoff.departuresAvoided, value: payoff.value, turnoverPointsReduced: payoff.turnoverPointsReduced };
}

// ────────────────────────────────────────────────────────────────────────
// The full chain + THE MATH strings
// ────────────────────────────────────────────────────────────────────────

export interface WorkforceChainResult {
  scope: WorkforceScope;
  protect: WorkforceProtect;
  survey: WorkforceSurvey;
  backfill: WorkforceBackfill;
  sustain: WorkforceSustain;
  payoff: WorkforcePayoff;
  formulas: {
    scope: string;
    protect: string;
    survey: string;
    backfill: string;
    sustain: string;
    payoff: string;
  };
}

export function computeWorkforceChain(
  baseline: AttainBaseline,
  setting: AttainSetting,
  values: LeverValues,
  crossGoalShareMultiplier = 1,
): WorkforceChainResult {
  const scope = computeWorkforceScope(setting, baseline, values);
  const protect = computeWorkforceProtect(setting, values, crossGoalShareMultiplier);
  const survey = computeWorkforceSurvey(protect.impactPp, values);
  const backfill = computeWorkforceBackfill(setting, survey.impactPpAfterSurvey, values);
  const sustain = computeWorkforceSustain(backfill.impactPpAfterBackfill, values);
  const payoff = computeWorkforcePayoff(scope, sustain.compositeImpactPct);
  const unitNoun = setting === "nursing" ? "nurses" : "providers";

  const scopeFormula = scope.providersInScope > 0
    ? `${fmtInt(scope.providersInScope)} ${unitNoun} in scope, at ${fmtPp(scope.turnoverRatePct)}% voluntary turnover and $${fmtInt(scope.replacementCost)} per avoided departure.`
    : NO_MOVE_FORMULA;

  const protectFormula = protect.impactPp > 0
    ? `${fmtPp(protect.effectiveSharePct)}% of the recovered relief protected × ${fmtPp(PROTECT_WEIGHT * 100)}% weight × ${fmtPp(WORKFORCE_IMPACT_CEILING_PP[setting])}% ceiling = ${fmtPp(protect.impactPp)}% of burnout departures avoided.`
    : NO_MOVE_FORMULA;

  const surveyFormula = survey.cadenceLevel > 0
    ? `${fmtPp(protect.impactPp)}% × ${fmtPp(survey.multiplier * 100)}% realized (the ${SURVEY_CADENCE_LABELS[survey.cadenceLevel].toLowerCase()} catches erosion early) = ${fmtPp(survey.impactPpAfterSurvey)}%.`
    : NO_MOVE_FORMULA;

  const backfillFormula = backfill.bonusPp > 0
    ? `${fmtPp(survey.impactPpAfterSurvey)}% + ${fmtPp(backfill.bonusPp)}% from ${BACKFILL_LEVEL_LABELS[backfill.level].toLowerCase()} coverage backfill = ${fmtPp(backfill.impactPpAfterBackfill)}%.`
    : NO_MOVE_FORMULA;

  const sustainFormula = sustain.compositeImpactPct > 0
    ? `${fmtPp(backfill.impactPpAfterBackfill)}% × ${sustain.months}/12 months sustained = ${fmtPp(sustain.compositeImpactPct)}% of burnout departures avoided.`
    : NO_MOVE_FORMULA;

  const payoffFormula = payoff.value > 0
    ? `${fmtInt(scope.providersInScope)} ${unitNoun} × ${fmtPp(scope.turnoverRatePct)}% turnover × ${fmtPp(scope.burnoutSharePct)}% burnout share × ${fmtPp(sustain.compositeImpactPct)}% of burnout departures avoided = ${payoff.departuresAvoided.toFixed(1)} departures avoided (about ${fmtPp(payoff.turnoverPointsReduced)} pts off your turnover rate) × $${fmtInt(scope.replacementCost)}/departure = ~${fmtMoneyCompact(payoff.value)}.`
    : NO_MOVE_FORMULA;

  return {
    scope,
    protect,
    survey,
    backfill,
    sustain,
    payoff,
    formulas: { scope: scopeFormula, protect: protectFormula, survey: surveyFormula, backfill: backfillFormula, sustain: sustainFormula, payoff: payoffFormula },
  };
}

// ────────────────────────────────────────────────────────────────────────
// Reconciliation helper — the exact ExploreState this chain's decisions
// correspond to, for tests to feed straight into computeAllDriverValues and
// prove the two can never disagree (see attainWorkforce.test.ts). Not used
// by the app itself, same convention as attainRevenue.ts's own version.
// ────────────────────────────────────────────────────────────────────────

export function exploreStateForReconciliation(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): ExploreState {
  const chain = computeWorkforceChain(baseline, setting, values);
  const state = mkState(setting);
  state.numberOfProviders = chain.scope.providersInScope;

  if (setting === "nursing") {
    (state.timeDriverInputs as any).nursingRetentionEnabled = true;
    (state.timeDriverInputs as any).nursingTurnoverRate = chain.scope.turnoverRatePct;
    (state.timeDriverInputs as any).nursingReplacementCost = chain.scope.replacementCost;
    (state.timeDriverInputs as any).retentionImpactScenario = "custom";
    (state.timeDriverInputs as any).retentionCustomPercent = chain.sustain.compositeImpactPct;
  } else {
    (state.timeDriverInputs as any).wellbeingEnabled = true;
    (state.timeDriverInputs as any).calculateRetentionValue = true;
    (state.timeDriverInputs as any).annualTurnoverRate = chain.scope.turnoverRatePct;
    (state.timeDriverInputs as any).burnoutRelatedTurnover = chain.scope.burnoutSharePct;
    (state.timeDriverInputs as any).replacementCost = chain.scope.replacementCost;
    (state.timeDriverInputs as any).ipAnnualTurnoverRate = chain.scope.turnoverRatePct;
    (state.timeDriverInputs as any).ipBurnoutRelatedTurnover = chain.scope.burnoutSharePct;
    (state.timeDriverInputs as any).ipReplacementCost = chain.scope.replacementCost;
    (state.timeDriverInputs as any).retentionImpactScenario = "custom";
    (state.timeDriverInputs as any).retentionCustomPercent = chain.sustain.compositeImpactPct;
  }
  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every workforce "row" this chain surfaces to the generic Commit/Plan
 * bookkeeping, in chain order. Kept in sync with `LEVERS.retention` in
 * attainLevers.ts — each id here must match a `LEVERS.retention[].id`. */
export const WORKFORCE_LEVER_IDS = [
  "retentionLines",
  "retentionProviders",
  "retentionTurnoverRate",
  "retentionReplacementCost",
  "retentionProtect",
  "retentionSurveyCadence",
  "retentionBackfill",
  "retentionSustain",
] as const;

/**
 * Adapts the D1-D5 chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns. D2-D5
 * (`retentionProtect`/`retentionSurveyCadence`/`retentionBackfill`/
 * `retentionSustain`) each get a LEAVE-ONE-OUT marginal (this decision reset
 * to its own realityStart, chain re-run, subtracted from the chosen payoff)
 * — the same leave-one-out convention the app already uses for Quality and
 * inpatient Revenue, just applied to this one joint composite chain instead
 * of four independent parallel channels, since D2-D5 combine multiplicatively
 * and additively rather than through a single MIN the way Access's capacity
 * and demand do.
 */
export function computeWorkforceContributions(
  baseline: AttainBaseline,
  setting: AttainSetting,
  values: LeverValues,
  crossGoalShareMultiplier = 1,
): LeverContributionsResult {
  const chosen = computeWorkforceChain(baseline, setting, values, crossGoalShareMultiplier);
  const { scope, payoff, formulas } = chosen;

  const withoutLever = (leverId: string): WorkforcePayoff => {
    const swapped: LeverValues = { ...values, [leverId]: 0 };
    return computeWorkforceChain(baseline, setting, swapped, crossGoalShareMultiplier).payoff;
  };

  const decisionRows: { id: string; count: number; formula: string }[] = [
    { id: "retentionProtect", count: 0, formula: formulas.protect },
    { id: "retentionSurveyCadence", count: 0, formula: formulas.survey },
    { id: "retentionBackfill", count: 0, formula: formulas.backfill },
    { id: "retentionSustain", count: 0, formula: formulas.sustain },
  ];

  const perLeverDecisions: LeverContribution[] = decisionRows.map((r) => {
    const without = withoutLever(r.id);
    const marginalMargin = payoff.value - without.value;
    const marginalCount = payoff.departuresAvoided - without.departuresAvoided;
    return { id: r.id, marginalMargin, marginalCount, pctOfTotal: 0, formula: r.formula };
  });

  const d1Rows: LeverContribution[] = [
    { id: "retentionLines", marginalMargin: 0, marginalCount: scope.departments.length, pctOfTotal: 0, formula: formulas.scope },
    { id: "retentionProviders", marginalMargin: 0, marginalCount: scope.providersInScope, pctOfTotal: 0, formula: formulas.scope },
    {
      id: "retentionTurnoverRate",
      marginalMargin: 0,
      marginalCount: 0,
      pctOfTotal: 0,
      formula: scope.providersInScope > 0
        ? `${fmtPp(scope.turnoverRatePct)}% voluntary turnover applied to the providers in scope.`
        : NO_MOVE_FORMULA,
    },
    {
      id: "retentionReplacementCost",
      marginalMargin: 0,
      marginalCount: 0,
      pctOfTotal: 0,
      formula: scope.providersInScope > 0
        ? `$${fmtInt(scope.replacementCost)} booked per avoided departure, applied to the departures below.`
        : NO_MOVE_FORMULA,
    },
  ];

  const marginSum = perLeverDecisions.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
  const perLever: LeverContribution[] = [...d1Rows, ...perLeverDecisions].map((l) => ({
    ...l,
    pctOfTotal: marginSum > 0 ? Math.max(0, l.marginalMargin) / marginSum : 0,
  }));

  // Keep insertion order = WORKFORCE_LEVER_IDS order for a stable, readable
  // Commit/Plan table (D1 rows first, then D2-D5 in chain order).
  return { perLever, totalMargin: payoff.value, totalCount: Math.round(payoff.departuresAvoided) };
}
