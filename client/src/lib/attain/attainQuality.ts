import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { calcHapi, calcFalls, calcClabsi, calcSepsis } from "@/lib/nursingQualityCalcs";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import type { AttainSetting } from "./attainTypes";

/**
 * Attain — QUALITY & SAFETY (nursing) decision chain engine.
 *
 * Quality is about PREVENTED HARM EVENTS: the value is prevented events ×
 * cost per event, one term per targeted event type, summed. Rebuilt here as
 * an ORDERED chain — same discipline as `attainAccess.ts` / `attainRevenue.ts`
 * / `attainWorkforce.ts` — because a prevented-events figure is not honest
 * until every decision behind it is real:
 *
 *   D1 SCOPE — which units are in scope, how many staffed beds that
 *      represents (capped to the partner's own Starting-point baseline,
 *      same convention as Workforce's D1), and which event type(s) this
 *      plan targets (HAPI, CLABSI, Falls, Sepsis — one or more). Patient
 *      days = beds in scope × occupancy (from the Starting-point's own
 *      daily census ÷ staffed beds) × 365. No dollar yet, and no event
 *      count yet either — this is volume, not rate.
 *   D2 CLOSE REAL-TIME GAPS DURING THE SHIFT — the core Abridge-driven
 *      lever. Point-of-care documentation means a missed bundle step is
 *      visible while there is still time to act on it. This is the share
 *      of gaps closed in real time, ABOVE today's baseline (55%, the same
 *      descriptive "reality" the pre-rebuild flat lever used) — moving the
 *      slider back down to 55% credits nothing, since that is not a new
 *      decision. Drives `compositePreventionPct`, the prevention rate fed
 *      into HAPI/CLABSI/Falls's own `calc*` helper as `preventionPct`.
 *      Output in prevented events, no dollar yet.
 *   D3 TIE DETERIORATION SIGNALS TO A RESPONSE — a response-level decision
 *      (none / partial / reliable) that is deliberately scoped to Sepsis
 *      specifically, not blended into the shared composite above. A
 *      deterioration signal with no named responder is just a note; this is
 *      how reliably a signal turns into an actual bedside intervention. It
 *      feeds `realizationPct` in `calcSepsis` directly, reusing the exact
 *      0/55/80 level mapping the pre-rebuild flat lever already used.
 *   D4 LIFT BUNDLE COMPLIANCE — an audited compliance target, additive on
 *      top of D2's contribution to `compositePreventionPct` (bundle
 *      compliance is a separate mechanism from real-time gap closure: a
 *      nurse can close a gap in the moment and still miss a bundle step
 *      that was never on the checklist, and vice versa).
 *   THE PAYOFF — for every SELECTED event type, prevented events × cost per
 *      event, read straight off that type's own `calc*` helper, summed.
 *      "Selecting more event types increases the total" holds by
 *      construction: each additional type adds its own nonnegative term.
 *
 * WHY SEPSIS IS NOT FOLDED INTO THE SHARED COMPOSITE (a deliberate,
 * documented deviation from a fully-unified model): `calcSepsis`'s own
 * shape is a genuinely different mechanism from HAPI/CLABSI/Falls's simple
 * `(patientDays, rate, preventionPct, cost)` — it prices the ADDRESSABLE GAP
 * (100% − `currentCompliancePct`) × the share of that gap attributable to
 * documentation lag (`docLagPct`) × how much of THAT is actually realized
 * (`realizationPct`). Feeding D4's compliance TARGET into
 * `currentCompliancePct` would SHRINK the addressable gap the higher the
 * target goes (a smaller gap means fewer preventable cases in that specific
 * formula), which directly contradicts "higher compliance increases
 * prevented events." So `currentCompliancePct` and `docLagPct` stay at their
 * descriptive baseline defaults (75% / 30%, matching the pre-rebuild flat
 * lever's own hardcoded values) and D3 (response level) is sepsis's one real
 * lever, reusing the exact realization mapping that already existed.
 *
 * RECONCILIATION: every selected event type's `value` is read straight off
 * its own `calcHapi`/`calcClabsi`/`calcFalls`/`calcSepsis` helper (the
 * single source of truth shared with Explore's live engine, UI, and PDF —
 * see `nursingQualityCalcs.ts`'s own header), AND cross-checked against
 * `computeAllDriverValues`'s `nursingHapi`/`nursingClabsi`/`nursingFalls`/
 * `nursingSepsis` fields via `exploreStateForReconciliation` below, never a
 * second, hand-rolled formula.
 */

// ────────────────────────────────────────────────────────────────────────
// Local helpers (deliberately self-contained, same convention
// attainAccess.ts / attainRevenue.ts / attainWorkforce.ts use).
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
function clampLevel(n: number): number {
  return Math.min(2, Math.max(0, Math.round(n)));
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
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

function mkState(setting: AttainSetting): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: setting,
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

// ────────────────────────────────────────────────────────────────────────
// Event-type identity — the four choices on the D1 event-type chooser.
// ────────────────────────────────────────────────────────────────────────

export const QUALITY_EVENT_LABELS = {
  hapi: "HAPI",
  clabsi: "CLABSI",
  falls: "Falls",
  sepsis: "Sepsis",
} as const;

export type QualityEventId = keyof typeof QUALITY_EVENT_LABELS;
export const QUALITY_EVENT_IDS: QualityEventId[] = ["hapi", "clabsi", "falls", "sepsis"];

export function selectedEventTypes(values: LeverValues): QualityEventId[] {
  const raw = asLines(values.qualityEventTypes);
  return QUALITY_EVENT_IDS.filter((id) => raw.includes(QUALITY_EVENT_LABELS[id]));
}

// ────────────────────────────────────────────────────────────────────────
// Descriptive defaults per event type — matching the pre-rebuild flat
// lever's own illustrative constants (HAPI/Falls/Sepsis, in the old
// `hapiValue`/`fallsValue`/`sepsisValue` in attainLevers.ts) and, for
// CLABSI (new to this chain), Explore's own `DEFAULT_EXPLORE_STATE`
// defaults verbatim — never invented numbers.
// ────────────────────────────────────────────────────────────────────────

export const HAPI_RATE_PER_1000 = 2.8;
export const HAPI_COST_PER_EVENT = 18_000;
export const FALLS_RATE_PER_1000 = 3.5;
export const FALLS_COST_PER_EVENT = 6_500;
export const CLABSI_UTILIZATION_PCT = 20; // central-line days as % of patient days
export const CLABSI_RATE_PER_1000_LINE_DAYS = 0.8;
export const CLABSI_COST_PER_EVENT = 20_000;
export const SEPSIS_RATE_PER_1000 = 2.0;
export const SEPSIS_COMPLIANCE_BASELINE_PCT = 75;
export const SEPSIS_DOC_LAG_PCT = 30;
export const SEPSIS_EXCESS_COST_PER_CASE = 3_500;

// ────────────────────────────────────────────────────────────────────────
// D1 — SCOPE (units, beds, event types → patient days). No dollar yet.
// ────────────────────────────────────────────────────────────────────────

export interface QualityScope {
  units: string[];
  eventTypes: QualityEventId[];
  bedsInScope: number;
  occupancyFraction: number;
  patientDays: number;
}

function totalBedsFor(baseline: AttainBaseline): number {
  return Math.max(0, Math.round(baseline.staffedBeds ?? 0));
}

/** Real occupancy (daily census ÷ staffed beds) from the partner's own
 * Starting-point baseline, or the original 85% illustrative default —
 * exactly matching `nursingOccupancyFraction` in attainLevers.ts. */
function occupancyFractionFor(baseline: AttainBaseline, fallback = 0.85): number {
  const beds = baseline.staffedBeds ?? 0;
  const census = baseline.dailyCensus ?? 0;
  return beds > 0 && census > 0 ? Math.min(1, census / beds) : fallback;
}

/** D1: reads unit scope, requested beds count (capped to the Starting-point
 * baseline, same convention as Workforce's `computeWorkforceScope`), and the
 * targeted event type(s) off the flat `LeverValues` bag. */
export function computeQualityScope(baseline: AttainBaseline, values: LeverValues): QualityScope {
  const totalBeds = totalBedsFor(baseline);
  const units = asLines(values.qualityLines);
  const requested = Math.max(0, Math.round(asNum(values.qualityBeds)));
  const bedsInScope = totalBeds > 0 ? Math.min(requested, totalBeds) : requested;
  const occupancyFraction = occupancyFractionFor(baseline);
  const patientDays = bedsInScope * occupancyFraction * 365;
  const eventTypes = selectedEventTypes(values);
  return { units, eventTypes, bedsInScope, occupancyFraction, patientDays };
}

// ────────────────────────────────────────────────────────────────────────
// D2 — CLOSE REAL-TIME GAPS DURING THE SHIFT (the core lever, shared by
// HAPI/CLABSI/Falls's composite prevention rate).
// ────────────────────────────────────────────────────────────────────────

/** The ceiling any single event type's prevention rate can reach — even
 * excellent real-time closure and bundle compliance cannot prevent every
 * HAI/fall, so this stops short of 100%, matching the realistic range
 * nursing-quality literature and Explore's own illustrative prevention
 * rates (6-12%) sit well under. */
export const QUALITY_PREVENTION_CEILING_PCT = 60;

/** "Reality today" for D2 — matches the pre-rebuild flat lever's own
 * `realityStart: 55` for `qualityRealTime`; moving the slider back down to
 * this value (or leaving it there) credits nothing, since it is not a new
 * decision. */
export const QUALITY_REALTIME_BASELINE_PCT = 55;

/** D2's own weight of the ceiling — the core Abridge-driven lever, so it
 * carries the larger share (mirrors Workforce's `PROTECT_WEIGHT = 0.55` for
 * its own core lever). */
export const REALTIME_WEIGHT = 0.6;
/** D4's remaining weight of the ceiling (0.6 + 0.4 = 1.0 at both maxed). */
export const BUNDLE_WEIGHT = 0.4;

export interface QualityRealTime {
  requestedPct: number;
  effectiveLiftPct: number;
  impactPp: number;
}

export function computeQualityRealTime(values: LeverValues): QualityRealTime {
  const requestedPct = clampPct(asNum(values.qualityRealTime));
  const effectiveLiftPct = Math.max(0, requestedPct - QUALITY_REALTIME_BASELINE_PCT);
  const liftRoom = 100 - QUALITY_REALTIME_BASELINE_PCT; // 45pp of room above reality
  const impactPp = QUALITY_PREVENTION_CEILING_PCT * REALTIME_WEIGHT * (effectiveLiftPct / liftRoom);
  return { requestedPct, effectiveLiftPct, impactPp };
}

// ────────────────────────────────────────────────────────────────────────
// D3 — TIE DETERIORATION SIGNALS TO A RESPONSE (Sepsis-specific).
// ────────────────────────────────────────────────────────────────────────

export const RESPONSE_LEVEL_LABELS = ["No named responder", "Partial coverage", "Reliable response"];
/** Reuses the exact 0/55/80 level → realization mapping the pre-rebuild
 * flat lever (`sepsisValue` in attainLevers.ts) already used. */
export const RESPONSE_REALIZATION_PCT = [0, 55, 80];

export interface QualityResponse {
  level: number;
  realizationPct: number;
}

export function computeQualityResponse(values: LeverValues): QualityResponse {
  const level = clampLevel(asNum(values.qualityResponse));
  return { level, realizationPct: RESPONSE_REALIZATION_PCT[level] };
}

// ────────────────────────────────────────────────────────────────────────
// D4 — LIFT BUNDLE COMPLIANCE (additive on top of D2, for HAPI/CLABSI/Falls).
// ────────────────────────────────────────────────────────────────────────

export interface QualityBundle {
  compliancePct: number;
  bonusPp: number;
  compositePreventionPct: number;
}

/** D4: bundle compliance is a separate mechanism from real-time closure
 * (D2), so it ADDS to D2's contribution rather than multiplying it, capped
 * at the shared ceiling — same additive-bonus convention Workforce's D4
 * (`computeWorkforceBackfill`) uses on top of its own D2/D3. */
export function computeQualityBundle(realTimeImpactPp: number, values: LeverValues): QualityBundle {
  const compliancePct = clampPct(asNum(values.qualityBundle));
  const bonusPp = QUALITY_PREVENTION_CEILING_PCT * BUNDLE_WEIGHT * (compliancePct / 100);
  const compositePreventionPct = Math.min(QUALITY_PREVENTION_CEILING_PCT, realTimeImpactPp + bonusPp);
  return { compliancePct, bonusPp, compositePreventionPct };
}

// ────────────────────────────────────────────────────────────────────────
// THE PAYOFF — prevented events × cost per event, per targeted event type.
// ────────────────────────────────────────────────────────────────────────

export interface QualityEventResult {
  id: QualityEventId;
  label: string;
  events: number;
  prevented: number;
  value: number;
  costPerEvent: number;
  formula: string;
}

function eventResultFor(
  id: QualityEventId,
  scope: QualityScope,
  compositePreventionPct: number,
  response: QualityResponse,
): QualityEventResult {
  const label = QUALITY_EVENT_LABELS[id];
  if (id === "sepsis") {
    const r = calcSepsis({
      patientDays: scope.patientDays,
      ratePerThousand: SEPSIS_RATE_PER_1000,
      currentCompliancePct: SEPSIS_COMPLIANCE_BASELINE_PCT,
      docLagPct: SEPSIS_DOC_LAG_PCT,
      excessCostPerCase: SEPSIS_EXCESS_COST_PER_CASE,
      realizationPct: response.realizationPct,
    });
    const value = Math.round(r.value);
    const formula = value > 0
      ? `${fmtInt(scope.patientDays)} patient-days × ${SEPSIS_RATE_PER_1000}/1k sepsis × ${fmtPct(r.complianceGapPct)}% non-compliance × ${SEPSIS_DOC_LAG_PCT}% doc lag × ${fmtInt(r.prevented)} prevented × $${fmtInt(SEPSIS_EXCESS_COST_PER_CASE)}/case × ${response.realizationPct}% realization = ~${fmtMoneyCompact(value)}.`
      : NO_MOVE_FORMULA;
    return { id, label, events: r.events, prevented: r.prevented, value, costPerEvent: SEPSIS_EXCESS_COST_PER_CASE, formula };
  }

  const rate = id === "hapi" ? HAPI_RATE_PER_1000 : id === "falls" ? FALLS_RATE_PER_1000 : CLABSI_RATE_PER_1000_LINE_DAYS;
  const cost = id === "hapi" ? HAPI_COST_PER_EVENT : id === "falls" ? FALLS_COST_PER_EVENT : CLABSI_COST_PER_EVENT;

  const r =
    id === "hapi"
      ? calcHapi({ patientDays: scope.patientDays, rate, preventionPct: compositePreventionPct, cost })
      : id === "falls"
        ? calcFalls({ patientDays: scope.patientDays, rate, preventionPct: compositePreventionPct, cost })
        : calcClabsi({ patientDays: scope.patientDays, utilizationPct: CLABSI_UTILIZATION_PCT, rate, preventionPct: compositePreventionPct, cost });

  const value = Math.round(r.value);
  const dayNoun = id === "clabsi" ? `${fmtInt((r as any).lineDays)} line-days` : `${fmtInt(scope.patientDays)} patient-days`;
  const formula = value > 0
    ? `${dayNoun} × ${rate}/1k ${label} × ${fmtPct(compositePreventionPct)}% prevention × $${fmtInt(cost)}/case = ~${fmtMoneyCompact(value)}.`
    : NO_MOVE_FORMULA;

  return { id, label, events: r.events, prevented: r.prevented, value, costPerEvent: cost, formula };
}

export interface QualityPayoff {
  events: QualityEventResult[];
  totalPrevented: number;
  totalValue: number;
}

export function computeQualityPayoff(
  scope: QualityScope,
  compositePreventionPct: number,
  response: QualityResponse,
): QualityPayoff {
  const events = scope.eventTypes.map((id) => eventResultFor(id, scope, compositePreventionPct, response));
  const totalPrevented = events.reduce((sum, e) => sum + e.prevented, 0);
  const totalValue = events.reduce((sum, e) => sum + e.value, 0);
  return { events, totalPrevented, totalValue };
}

// ────────────────────────────────────────────────────────────────────────
// The full chain + THE MATH strings
// ────────────────────────────────────────────────────────────────────────

export interface QualityChainResult {
  scope: QualityScope;
  realTime: QualityRealTime;
  response: QualityResponse;
  bundle: QualityBundle;
  payoff: QualityPayoff;
  formulas: {
    scope: string;
    realTime: string;
    response: string;
    bundle: string;
    payoff: string;
  };
}

export function computeQualityChain(baseline: AttainBaseline, values: LeverValues): QualityChainResult {
  const scope = computeQualityScope(baseline, values);
  const realTime = computeQualityRealTime(values);
  const response = computeQualityResponse(values);
  const bundle = computeQualityBundle(realTime.impactPp, values);
  const payoff = computeQualityPayoff(scope, bundle.compositePreventionPct, response);

  const scopeFormula = scope.patientDays > 0
    ? `${fmtInt(scope.bedsInScope)} beds in scope × ${fmtPct(scope.occupancyFraction * 100)}% occupancy × 365 days = ${fmtInt(scope.patientDays)} patient-days/yr. Targeting: ${scope.eventTypes.length > 0 ? scope.eventTypes.map((id) => QUALITY_EVENT_LABELS[id]).join(", ") : "no event types picked yet"}.`
    : NO_MOVE_FORMULA;

  const realTimeFormula = realTime.impactPp > 0
    ? `${fmtPct(realTime.effectiveLiftPct)}pp above your ${QUALITY_REALTIME_BASELINE_PCT}% reality × ${fmtPct(REALTIME_WEIGHT * 100)}% weight × ${QUALITY_PREVENTION_CEILING_PCT}pp ceiling = ${fmtPct(realTime.impactPp)}pp of prevention building.`
    : NO_MOVE_FORMULA;

  const responseFormula = response.realizationPct > 0
    ? `${RESPONSE_LEVEL_LABELS[response.level]} realizes ${response.realizationPct}% of the addressable documentation-lag opportunity for Sepsis specifically.`
    : "Move this decision above reality to see the math. Applies to Sepsis only.";

  const bundleFormula = bundle.compositePreventionPct > 0
    ? `${fmtPct(bundle.compliancePct)}% bundle compliance target × ${fmtPct(BUNDLE_WEIGHT * 100)}% weight × ${QUALITY_PREVENTION_CEILING_PCT}pp ceiling = +${fmtPct(bundle.bonusPp)}pp. Composite prevention rate for HAPI/CLABSI/Falls: ${fmtPct(bundle.compositePreventionPct)}%.`
    : NO_MOVE_FORMULA;

  const payoffFormula = payoff.totalValue > 0
    ? `${payoff.events.map((e) => `${fmtInt(e.prevented)} ${e.label} prevented × $${fmtInt(e.costPerEvent)}/case = ~${fmtMoneyCompact(e.value)}`).join(" + ")} = ~${fmtMoneyCompact(payoff.totalValue)}.`
    : NO_MOVE_FORMULA;

  return {
    scope,
    realTime,
    response,
    bundle,
    payoff,
    formulas: { scope: scopeFormula, realTime: realTimeFormula, response: responseFormula, bundle: bundleFormula, payoff: payoffFormula },
  };
}

// ────────────────────────────────────────────────────────────────────────
// Reconciliation helper — the exact ExploreState this chain's decisions
// correspond to, for tests to feed straight into computeAllDriverValues and
// prove the two can never disagree (see attainQuality.test.ts). Not used by
// the app itself, same convention as attainWorkforce.ts / attainRevenue.ts.
// ────────────────────────────────────────────────────────────────────────

export function exploreStateForReconciliation(baseline: AttainBaseline, values: LeverValues): ExploreState {
  const chain = computeQualityChain(baseline, values);
  const state = mkState("nursing");
  state.nursingStaffedBeds = chain.scope.bedsInScope;
  state.nursingOccupancyRate = Math.round(chain.scope.occupancyFraction * 100);

  const dq = state.docQualityInputs as any;
  if (chain.scope.eventTypes.includes("hapi")) {
    dq.nursingHapiEnabled = true;
    dq.nursingHapiRate = HAPI_RATE_PER_1000;
    dq.nursingHapiPreventionRate = chain.bundle.compositePreventionPct;
    dq.nursingHapiCost = HAPI_COST_PER_EVENT;
  }
  if (chain.scope.eventTypes.includes("falls")) {
    dq.nursingFallsEnabled = true;
    dq.nursingFallsRate = FALLS_RATE_PER_1000;
    dq.nursingFallsPreventionRate = chain.bundle.compositePreventionPct;
    dq.nursingFallsCost = FALLS_COST_PER_EVENT;
  }
  if (chain.scope.eventTypes.includes("clabsi")) {
    dq.nursingClabsiEnabled = true;
    dq.nursingClabsiUtilizationRatio = CLABSI_UTILIZATION_PCT;
    dq.nursingClabsiRate = CLABSI_RATE_PER_1000_LINE_DAYS;
    dq.nursingClabsiPreventionRate = chain.bundle.compositePreventionPct;
    dq.nursingClabsiCost = CLABSI_COST_PER_EVENT;
  }
  if (chain.scope.eventTypes.includes("sepsis")) {
    dq.nursingSepsisEnabled = true;
    dq.nursingSepsisRatePerThousand = SEPSIS_RATE_PER_1000;
    dq.nursingSepsisCurrentCompliance = SEPSIS_COMPLIANCE_BASELINE_PCT;
    dq.nursingSepsisDocLagPercent = SEPSIS_DOC_LAG_PCT;
    dq.nursingSepsisExcessCostPerCase = SEPSIS_EXCESS_COST_PER_CASE;
    dq.nursingSepsisRealization = chain.response.realizationPct;
  }
  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every quality "row" this chain surfaces to the generic Commit/Plan
 * bookkeeping, in chain order. Kept in sync with `LEVERS.quality` in
 * attainLevers.ts — each id here must match a `LEVERS.quality[].id`.
 * `qualityEventTypes` is UI-only scope state (like Revenue's `revenuePaths`)
 * and is deliberately not tracked as its own committable decision. */
export const QUALITY_LEVER_IDS = ["qualityLines", "qualityBeds", "qualityRealTime", "qualityResponse", "qualityBundle"] as const;

/**
 * Adapts the D1-D4 chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns. D2/D3/D4 each get
 * a LEAVE-ONE-OUT marginal (this decision reset to its own realityStart,
 * chain re-run, subtracted from the chosen payoff) — the same convention
 * Workforce's D2-D5 use, applied here to the one shared composite plus
 * Sepsis's own separate response lever.
 */
export function computeQualityContributions(baseline: AttainBaseline, values: LeverValues): LeverContributionsResult {
  const chosen = computeQualityChain(baseline, values);
  const { scope, payoff, formulas } = chosen;

  const withoutLever = (leverId: string, resetTo: number): QualityPayoff => {
    const swapped: LeverValues = { ...values, [leverId]: resetTo };
    return computeQualityChain(baseline, swapped).payoff;
  };

  const decisionRows: { id: string; resetTo: number; formula: string }[] = [
    { id: "qualityRealTime", resetTo: QUALITY_REALTIME_BASELINE_PCT, formula: formulas.realTime },
    { id: "qualityResponse", resetTo: 0, formula: formulas.response },
    { id: "qualityBundle", resetTo: 0, formula: formulas.bundle },
  ];

  const perLeverDecisions: LeverContribution[] = decisionRows.map((r) => {
    const without = withoutLever(r.id, r.resetTo);
    const marginalMargin = payoff.totalValue - without.totalValue;
    const marginalCount = payoff.totalPrevented - without.totalPrevented;
    return { id: r.id, marginalMargin, marginalCount, pctOfTotal: 0, formula: r.formula };
  });

  const d1Rows: LeverContribution[] = [
    { id: "qualityLines", marginalMargin: 0, marginalCount: scope.units.length, pctOfTotal: 0, formula: formulas.scope },
    { id: "qualityBeds", marginalMargin: 0, marginalCount: scope.bedsInScope, pctOfTotal: 0, formula: formulas.scope },
  ];

  const marginSum = perLeverDecisions.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
  const perLever: LeverContribution[] = [...d1Rows, ...perLeverDecisions].map((l) => ({
    ...l,
    pctOfTotal: marginSum > 0 ? Math.max(0, l.marginalMargin) / marginSum : 0,
  }));

  return { perLever, totalMargin: payoff.totalValue, totalCount: Math.round(payoff.totalPrevented) };
}
