import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { calcHapi, calcFalls, calcClabsi, calcCauti, calcSepsis } from "@/lib/nursingQualityCalcs";
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
 *      plan targets (HAPI, CLABSI, CAUTI, Falls, Sepsis — one or more).
 *      Patient days = beds in scope × occupancy (from the Starting-point's
 *      own daily census ÷ staffed beds) × 365. No dollar yet, and no event
 *      count yet either — this is volume, not rate.
 *   D2 COMMIT TO THE INTERVENTIONS THAT ACTUALLY PREVENT EACH EVENT — the
 *      headline fix (a "logic bug, wrong shape" per the audit this rebuild
 *      answers): reducing a harm event is a bundle of specific, trackable
 *      clinical interventions, not one generic slider shared across every
 *      event type. Each SELECTED event type gets its own sub-panel of the
 *      real interventions a unit commits to (see `QUALITY_INTERVENTIONS`
 *      below) — hourly rounding for Falls is a genuinely different
 *      commitment from a daily line-necessity review for CLABSI, and a
 *      partner has to be able to steer one without touching the other.
 *      Each checked intervention adds its own fixed weight (pp) toward
 *      THAT event's own prevention ceiling (or, for Sepsis, its own
 *      realization ceiling — see below); nothing here is shared across
 *      event types, so committing to Falls interventions can never move
 *      HAPI's number and vice versa. Output is still in pp of that event's
 *      own ceiling, no dollar yet — the dollar only appears once an event
 *      type's own interventions are actually committed to.
 *   THE PAYOFF — for every SELECTED event type, prevented events × cost per
 *      event, read straight off that type's own `calc*` helper, summed.
 *      "Selecting more event types increases the total" holds by
 *      construction: each additional type adds its own nonnegative term.
 *
 * PROGRAM-LEVEL PREVENTION vs ABRIDGE'S OWN SHARE — a deliberate two-layer
 * split, not one number trying to do both jobs. Each event's own committed-
 * intervention percentage (D2, capped at that event's own ceiling — see
 * "PER-EVENT CEILINGS" below) models what a STRONG CLINICAL PROGRAM,
 * running every one of its named interventions, can defensibly prevent.
 * It is not an Abridge-only claim. The separate, pre-existing "Realization
 * rate" / "Attributed to this plan" control (one per priority, seeded in
 * `AttainLivePanel.tsx`'s "Attributed to this plan" panel, read here via
 * `deriveQualityLadder`'s own `realizationPct` argument) is the ONE place
 * that attributes the share of THAT program-level outcome which belongs to
 * this plan specifically — the same dial every other goal already uses to
 * avoid over-claiming when other efforts are also moving the number. The
 * two never collapse into each other: a partner cannot inflate Abridge's
 * share by checking more intervention boxes, because the interventions only
 * ever move the clinical program's own ceiling, and the realization dial
 * still has the final, independent say over what fraction of that is
 * credited here.
 *
 * QUALITY'S OWN DEFAULT (30%, not the other goals' 100%) — every other
 * goal's realization dial DEFAULTS to 100% (full credit) because Abridge's
 * own decision chain is the mechanism that produces the whole outcome. In
 * quality, that is not true: Abridge surfaces the risk earlier (the freed,
 * earlier signal), but the bedside unit still has to run the prevention
 * bundle for the event to actually not happen. Defaulting this dial to
 * 100% would credit Abridge for the unit's own clinical work, so
 * `defaultRealizationPct` in `attainLevers.ts` special-cases `"quality"` to
 * start at 30% instead — still a fully adjustable 0-100 dial, only the
 * starting position differs. Combined with each event's own literature-
 * grounded ceiling below (20-30pp), a fully committed bundle nets ~6-9%
 * documentation-attributable prevention of that event's own gross rate,
 * the defensible band this default is anchored to.
 *
 * PER-EVENT CEILINGS (C2 recalibration) — the old model let one shared
 * composite reach 60% (documented at the time as "6-12pp of illustrative,
 * documentation-attributable prevention, at Explore's own default rates" —
 * 3-6x higher than the literature this module cites). Each event type now
 * carries its OWN literature-grounded ceiling for a STRONG, fully-committed
 * intervention program (not a documentation-only effect), split evenly
 * across that event's own named interventions since there is no granular
 * evidence to weight one sub-practice over another within the same bundle:
 *   - Falls: 21% (7 interventions × 3pp). Multicomponent fall-prevention
 *     bundles (rounding + alarms + toileting + footwear + med review +
 *     mobility + hazard checks) report ~20-30% relative reduction in
 *     hospital QI literature; anchored to the conservative end.
 *   - HAPI: 20% (4 interventions × 5pp). Turn/reposition + support-surface
 *     + Braden assessment + nutrition bundles report ~20-25% reduction in
 *     strong implementations; conservative relative to higher claims in
 *     some single-site studies.
 *   - CLABSI: 30% (3 interventions × 10pp). Central-line insertion bundles
 *     are among the best-evidenced HAI interventions (some large
 *     collaboratives report considerably higher reductions); capped well
 *     below that literature to stay conservative and defensible.
 *   - CAUTI: 24% (4 interventions × 6pp). Catheter-necessity review +
 *     aseptic insertion + perineal care + early removal bundles are
 *     evidenced but adherence is typically weaker than CLABSI bundles in
 *     practice, so this sits a bit below CLABSI's ceiling.
 *   - Sepsis: kept as its own, already-narrow mechanism (see "WHY SEPSIS
 *     IS NOT FOLDED IN" below) — its ceiling is a REALIZATION ceiling (75%,
 *     3 interventions × 25pp) on an already-small addressable pool
 *     (non-compliant cases × doc-lag share), not a share of all sepsis
 *     cases, so it is structurally conservative regardless of the number.
 *
 * WHY SEPSIS IS NOT FOLDED INTO THE SHARED PREVENTION MECHANISM (a
 * deliberate, documented deviation): `calcSepsis`'s own shape is a
 * genuinely different mechanism from HAPI/CLABSI/Falls/CAUTI's simple
 * `(days, rate, preventionPct, cost)` — it prices the ADDRESSABLE GAP (100%
 * − `currentCompliancePct`) × the share of that gap attributable to
 * documentation lag (`docLagPct`) × how much of THAT is actually realized
 * (`realizationPct`). Sepsis's own three named interventions (early-warning
 * screening, a time-to-antibiotics target, SEP-1 bundle compliance) feed
 * `realizationPct` directly instead, reusing the exact mechanism that
 * already existed, just replacing a single abstract "response level" with
 * three real, separately-trackable commitments.
 *
 * RECONCILIATION: every selected event type's `value` is read straight off
 * its own `calcHapi`/`calcClabsi`/`calcCauti`/`calcFalls`/`calcSepsis`
 * helper (the single source of truth shared with Explore's live engine, UI,
 * and PDF — see `nursingQualityCalcs.ts`'s own header), AND cross-checked
 * against `computeAllDriverValues`'s `nursingHapi`/`nursingClabsi`/
 * `nursingCauti`/`nursingFalls`/`nursingSepsis` fields via
 * `exploreStateForReconciliation` below, never a second, hand-rolled
 * formula.
 */

// ────────────────────────────────────────────────────────────────────────
// Local helpers (deliberately self-contained, same convention
// attainAccess.ts / attainRevenue.ts / attainWorkforce.ts use).
// ────────────────────────────────────────────────────────────────────────

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}
function asBool(raw: number | string[] | undefined): boolean {
  return asNum(raw) === 1;
}
function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
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

/** Local copies of attainLevers' `realizedValue` / `formulaWithRealization`,
 * inlined deliberately to avoid a runtime import CYCLE: attainLevers imports
 * this module's `QUALITY_EVENT_IDS` at load time, so this module must not
 * import any VALUE back from attainLevers (only erased types). Behaviour is
 * identical to the shared helpers. */
function clampPct(pct: number): number {
  return Math.max(0, Math.min(100, pct));
}
function realizedValue(value: number, realizationPct: number): number {
  return value * (clampPct(realizationPct) / 100);
}
function formulaWithRealization(formula: string, realizationPct: number, scaledValue: number): string {
  const pct = clampPct(realizationPct);
  if (pct >= 100) return formula;
  const base = formula.endsWith(".") ? formula.slice(0, -1) : formula;
  return `${base} × ${Math.round(pct)}% realization = ~${fmtMoneyCompact(scaledValue)}.`;
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
// Event-type identity — the five choices on the D1 event-type chooser.
// ────────────────────────────────────────────────────────────────────────

export const QUALITY_EVENT_LABELS = {
  hapi: "HAPI",
  clabsi: "CLABSI",
  cauti: "CAUTI",
  falls: "Falls",
  sepsis: "Sepsis",
} as const;

export type QualityEventId = keyof typeof QUALITY_EVENT_LABELS;
export const QUALITY_EVENT_IDS: QualityEventId[] = ["hapi", "clabsi", "cauti", "falls", "sepsis"];

export function selectedEventTypes(values: LeverValues): QualityEventId[] {
  const raw = asLines(values.qualityEventTypes);
  return QUALITY_EVENT_IDS.filter((id) => raw.includes(QUALITY_EVENT_LABELS[id]));
}

// ────────────────────────────────────────────────────────────────────────
// Descriptive defaults per event type — matching the pre-rebuild flat
// lever's own illustrative constants (HAPI/Falls/Sepsis) and Explore's own
// `DEFAULT_EXPLORE_STATE` defaults verbatim for CLABSI/CAUTI (both new to
// this chain) — never invented numbers.
// ────────────────────────────────────────────────────────────────────────

export const HAPI_RATE_PER_1000 = 2.8;
export const HAPI_COST_PER_EVENT = 18_000;
export const FALLS_RATE_PER_1000 = 3.5;
export const FALLS_COST_PER_EVENT = 6_500;
export const CLABSI_UTILIZATION_PCT = 20; // central-line days as % of patient days
export const CLABSI_RATE_PER_1000_LINE_DAYS = 0.8;
export const CLABSI_COST_PER_EVENT = 20_000;
export const CAUTI_UTILIZATION_PCT = 30; // catheter days as % of patient days
export const CAUTI_RATE_PER_1000_CATHETER_DAYS = 1.8;
export const CAUTI_COST_PER_EVENT = 13_000;
export const SEPSIS_RATE_PER_1000 = 2.0;
export const SEPSIS_COMPLIANCE_BASELINE_PCT = 75;
export const SEPSIS_DOC_LAG_PCT = 30;
export const SEPSIS_EXCESS_COST_PER_CASE = 3_500;

// ────────────────────────────────────────────────────────────────────────
// GROUND IT — the event rate and cost per event are the partner's own facts,
// so they are editable off the flat `LeverValues` bag with the canonical
// Explore default as the fallback. A blank value falls straight back to the
// same constant `exploreStateForReconciliation` feeds the live engine, so a
// partner who never touches them can never drift the reconciliation, and a
// partner who sets their own rate/cost moves Build, Planning, and the engine
// together. Utilization / SEP-1 compliance / doc-lag stay fixed constants,
// deliberately, to keep the editable surface to the two facts a CFO actually
// carries into the room (the rate and the cost).
// ────────────────────────────────────────────────────────────────────────

const QUALITY_RATE_KEY: Record<QualityEventId, string> = {
  hapi: "qualityHapiRate",
  clabsi: "qualityClabsiRate",
  cauti: "qualityCautiRate",
  falls: "qualityFallsRate",
  sepsis: "qualitySepsisRate",
};
const QUALITY_COST_KEY: Record<QualityEventId, string> = {
  hapi: "qualityHapiCost",
  clabsi: "qualityClabsiCost",
  cauti: "qualityCautiCost",
  falls: "qualityFallsCost",
  sepsis: "qualitySepsisCost",
};
export const QUALITY_DEFAULT_RATE: Record<QualityEventId, number> = {
  hapi: HAPI_RATE_PER_1000,
  clabsi: CLABSI_RATE_PER_1000_LINE_DAYS,
  cauti: CAUTI_RATE_PER_1000_CATHETER_DAYS,
  falls: FALLS_RATE_PER_1000,
  sepsis: SEPSIS_RATE_PER_1000,
};
export const QUALITY_DEFAULT_COST: Record<QualityEventId, number> = {
  hapi: HAPI_COST_PER_EVENT,
  clabsi: CLABSI_COST_PER_EVENT,
  cauti: CAUTI_COST_PER_EVENT,
  falls: FALLS_COST_PER_EVENT,
  sepsis: SEPSIS_EXCESS_COST_PER_CASE,
};

/** The event rate this plan is grounded on: the partner's own figure if set,
 * else the canonical Explore default. */
export function qualityRateFor(id: QualityEventId, values: LeverValues): number {
  const v = asNum(values[QUALITY_RATE_KEY[id]]);
  return v > 0 ? v : QUALITY_DEFAULT_RATE[id];
}
/** The cost per event this plan prices harm at: the partner's own figure if
 * set, else the canonical Explore default. */
export function qualityCostFor(id: QualityEventId, values: LeverValues): number {
  const v = asNum(values[QUALITY_COST_KEY[id]]);
  return v > 0 ? v : QUALITY_DEFAULT_COST[id];
}
export function qualityRateKey(id: QualityEventId): string {
  return QUALITY_RATE_KEY[id];
}
export function qualityCostKey(id: QualityEventId): string {
  return QUALITY_COST_KEY[id];
}

/** The unit denominator each event's rate is measured against, for plain
 * "events a year" grounding copy. */
export const QUALITY_RATE_UNIT: Record<QualityEventId, string> = {
  hapi: "patient-days",
  clabsi: "line-days",
  cauti: "catheter-days",
  falls: "patient-days",
  sepsis: "patient-days",
};

/** WHO ACTS, per event: the freed risk signal only prevents an event if the
 * unit runs the bundle. Abridge surfaces the risk earlier; these owners hold
 * the bedside routine that actually prevents. */
export const QUALITY_WHO_ACTS: Record<QualityEventId, string> = {
  hapi: "Bedside nurses and wound care",
  clabsi: "Bedside nurses and the line team",
  cauti: "Bedside nurses and the charge nurse",
  falls: "Bedside nurses and the charge nurse",
  sepsis: "Bedside nurses and the rapid-response team",
};

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
 * baseline, same convention as Workforce's D1), and the targeted event
 * type(s) off the flat `LeverValues` bag. */
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
// D2 — COMMIT TO THE INTERVENTIONS THAT ACTUALLY PREVENT EACH EVENT.
// One named, checkable intervention set PER event type, each intervention
// worth a fixed pp of that event's own ceiling. See the module header for
// the literature rationale behind each ceiling.
// ────────────────────────────────────────────────────────────────────────

export interface QualityInterventionDef {
  /** Matches a `LeverValues` key (0/1) and a `LEVERS.quality[].id`. */
  id: string;
  /** The decision, phrased as the concrete thing a unit commits to. */
  label: string;
  /** pp of this event's own ceiling this one intervention is worth when
   * committed to (`values[id] === 1`). Every event's own set sums exactly
   * to that event's ceiling, so checking every box reaches, and never
   * exceeds, the ceiling. */
  weightPp: number;
}

export const FALLS_CEILING_PCT = 21;
export const FALLS_INTERVENTIONS: QualityInterventionDef[] = [
  { id: "qualityFallsRounding", label: "Commit to hourly rounding compliance", weightPp: 3 },
  { id: "qualityFallsAlarms", label: "Turn on bed/chair alarms for at-risk patients", weightPp: 3 },
  { id: "qualityFallsToileting", label: "Run scheduled toileting for high-risk patients", weightPp: 3 },
  { id: "qualityFallsFootwear", label: "Provide non-slip footwear", weightPp: 3 },
  { id: "qualityFallsMedReview", label: "Review sedating and high-risk medications", weightPp: 3 },
  { id: "qualityFallsMobility", label: "Place PT and mobility orders", weightPp: 3 },
  { id: "qualityFallsHazards", label: "Run environmental hazard checks", weightPp: 3 },
];

export const HAPI_CEILING_PCT = 20;
export const HAPI_INTERVENTIONS: QualityInterventionDef[] = [
  { id: "qualityHapiReposition", label: "Commit to the turn and reposition schedule", weightPp: 5 },
  { id: "qualityHapiSupportSurface", label: "Allocate the right support surface", weightPp: 5 },
  { id: "qualityHapiSkinAssessment", label: "Run a Braden skin assessment every shift", weightPp: 5 },
  { id: "qualityHapiNutrition", label: "Get a nutrition and hydration consult", weightPp: 5 },
];

export const CLABSI_CEILING_PCT = 30;
export const CLABSI_INTERVENTIONS: QualityInterventionDef[] = [
  { id: "qualityClabsiInsertionBundle", label: "Commit to the insertion-bundle checklist", weightPp: 10 },
  { id: "qualityClabsiDailyReview", label: "Review line necessity daily", weightPp: 10 },
  { id: "qualityClabsiSiteCare", label: "Use chlorhexidine dressing and site care", weightPp: 10 },
];

export const CAUTI_CEILING_PCT = 24;
export const CAUTI_INTERVENTIONS: QualityInterventionDef[] = [
  { id: "qualityCautiNecessity", label: "Review indwelling catheter necessity daily", weightPp: 6 },
  { id: "qualityCautiAsepticInsertion", label: "Use aseptic insertion technique", weightPp: 6 },
  { id: "qualityCautiPerinealCare", label: "Perform routine perineal care", weightPp: 6 },
  { id: "qualityCautiEarlyRemoval", label: "Remove the catheter as soon as it is not needed", weightPp: 6 },
];

/** Sepsis's own ceiling is a REALIZATION ceiling (see module header), not a
 * share of all sepsis cases — feeds `calcSepsis`'s `realizationPct`. */
export const SEPSIS_REALIZATION_CEILING_PCT = 75;
export const SEPSIS_INTERVENTIONS: QualityInterventionDef[] = [
  { id: "qualitySepsisScreening", label: "Run early-warning screening (SIRS, qSOFA, or MEWS)", weightPp: 25 },
  { id: "qualitySepsisTimeToAbx", label: "Commit to a time-to-antibiotics target", weightPp: 25 },
  { id: "qualitySepsisBundle", label: "Audit SEP-1 bundle compliance", weightPp: 25 },
];

export const QUALITY_INTERVENTIONS: Record<QualityEventId, QualityInterventionDef[]> = {
  hapi: HAPI_INTERVENTIONS,
  clabsi: CLABSI_INTERVENTIONS,
  cauti: CAUTI_INTERVENTIONS,
  falls: FALLS_INTERVENTIONS,
  sepsis: SEPSIS_INTERVENTIONS,
};

export const QUALITY_CEILING_PCT: Record<QualityEventId, number> = {
  hapi: HAPI_CEILING_PCT,
  clabsi: CLABSI_CEILING_PCT,
  cauti: CAUTI_CEILING_PCT,
  falls: FALLS_CEILING_PCT,
  sepsis: SEPSIS_REALIZATION_CEILING_PCT,
};

/** The one outcome signal, and one process signal, Commit pre-fills for
 * every intervention under a given event type (Change 2/3's curated
 * Select+Custom pattern lives on the matching `LEVERS.quality` catalog
 * entries in attainLevers.ts — these are the plain strings that data uses). */
export const QUALITY_SIGNAL_PRIMARY: Record<QualityEventId, string> = {
  hapi: "HAPI rate per 1,000 patient-days",
  clabsi: "CLABSI per 1,000 line-days",
  cauti: "CAUTI per 1,000 catheter-days",
  falls: "Fall rate per 1,000 patient-days",
  sepsis: "SEP-1 bundle compliance %",
};

export const QUALITY_SIGNAL_SECONDARY: Record<QualityEventId, string> = {
  hapi: "Repositioning compliance %, by unit",
  clabsi: "Share of lines reviewed daily for necessity",
  cauti: "Share of catheters reviewed daily for necessity",
  falls: "Rounding compliance %, by unit",
  sepsis: "Median time-to-antibiotics (minutes)",
};

/** Sum of the checked interventions' own weight, capped at this event's
 * ceiling (the cap never actually binds below "every box checked," since
 * each event's own weights are designed to sum exactly to its ceiling — see
 * `QualityInterventionDef.weightPp`'s own doc comment). */
export function committedPct(id: QualityEventId, values: LeverValues): number {
  const sum = QUALITY_INTERVENTIONS[id].reduce((s, iv) => s + (asBool(values[iv.id]) ? iv.weightPp : 0), 0);
  return Math.min(QUALITY_CEILING_PCT[id], sum);
}

export interface QualityEventIntervention {
  id: QualityEventId;
  label: string;
  interventions: QualityInterventionDef[];
  checkedIds: string[];
  /** preventionPct for HAPI/CLABSI/CAUTI/Falls, realizationPct for Sepsis —
   * see the module header for why Sepsis's ceiling means something
   * different from the other four. */
  committedPct: number;
  ceilingPct: number;
  formula: string;
}

/** D2, one sub-panel per SELECTED event type (never rendered, and never
 * contributing a dollar, for an event type that was not picked on D1 — the
 * structural fix to the old model's phantom "prevention building" output
 * when nothing was gating it). */
export function computeQualityInterventions(scope: QualityScope, values: LeverValues): QualityEventIntervention[] {
  return scope.eventTypes.map((id) => {
    const defs = QUALITY_INTERVENTIONS[id];
    const checkedIds = defs.filter((d) => asBool(values[d.id])).map((d) => d.id);
    const pct = committedPct(id, values);
    const ceilingPct = QUALITY_CEILING_PCT[id];
    const label = QUALITY_EVENT_LABELS[id];
    const weightPp = defs[0]?.weightPp ?? 0;
    const formula = pct > 0
      ? `${checkedIds.length} of ${defs.length} ${label} intervention${defs.length === 1 ? "" : "s"} committed × ${fmtPct(weightPp)}pp each = ${fmtPct(pct)}% of the ${ceilingPct}pp ceiling.`
      : NO_MOVE_FORMULA;
    return { id, label, interventions: defs, checkedIds, committedPct: pct, ceilingPct, formula };
  });
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
  /** The event rate this plan is grounded on (per 1,000 of its own
   * denominator). */
  rate: number;
  /** The denominator that sizes the events: patient-days, or line-days /
   * catheter-days for CLABSI / CAUTI. */
  sizingDays: number;
  sizingUnit: string;
  /** THE DIAGNOSE (honesty) ceiling: the most events a fully committed
   * prevention program could ever reach at this event's own defensible
   * ceiling. For Sepsis, the addressable documentation-lag pool. Prevented
   * can never exceed this. */
  ceilingCount: number;
  formula: string;
}

function eventResultFor(id: QualityEventId, scope: QualityScope, pct: number, values: LeverValues): QualityEventResult {
  const label = QUALITY_EVENT_LABELS[id];
  const ceilingPct = QUALITY_CEILING_PCT[id];
  const rate = qualityRateFor(id, values);
  const cost = qualityCostFor(id, values);

  if (id === "sepsis") {
    const r = calcSepsis({
      patientDays: scope.patientDays,
      ratePerThousand: rate,
      currentCompliancePct: SEPSIS_COMPLIANCE_BASELINE_PCT,
      docLagPct: SEPSIS_DOC_LAG_PCT,
      excessCostPerCase: cost,
      realizationPct: pct,
    });
    const value = Math.round(r.value);
    // Addressable cases are shown BEFORE realization, then realization
    // shrinks that pool to the actual prevented count, then × cost = value
    // — every multiplicand appears exactly once, so this can never disagree
    // with `value` the way printing "prevented" (already post-realization)
    // as a mid-string factor AND multiplying by realization again would.
    const formula = value > 0
      ? `${fmtInt(scope.patientDays)} patient-days × ${rate}/1k sepsis × ${fmtPct(r.complianceGapPct)}% non-compliance × ${SEPSIS_DOC_LAG_PCT}% doc lag = ${fmtInt(r.docLagCases)} addressable cases × ${fmtPct(pct)}% realization (of a ${ceilingPct}pp ceiling) = ${fmtInt(r.prevented)} prevented × $${fmtInt(cost)}/case = ~${fmtMoneyCompact(value)}.`
      : NO_MOVE_FORMULA;
    return {
      id, label, events: r.events, prevented: r.prevented, value, costPerEvent: cost,
      rate, sizingDays: scope.patientDays, sizingUnit: QUALITY_RATE_UNIT[id],
      ceilingCount: r.docLagCases, formula,
    };
  }

  const r =
    id === "hapi"
      ? calcHapi({ patientDays: scope.patientDays, rate, preventionPct: pct, cost })
      : id === "falls"
        ? calcFalls({ patientDays: scope.patientDays, rate, preventionPct: pct, cost })
        : id === "cauti"
          ? calcCauti({ patientDays: scope.patientDays, utilizationPct: CAUTI_UTILIZATION_PCT, rate, preventionPct: pct, cost })
          : calcClabsi({ patientDays: scope.patientDays, utilizationPct: CLABSI_UTILIZATION_PCT, rate, preventionPct: pct, cost });

  const value = Math.round(r.value);
  const sizingDays =
    id === "clabsi" ? (r as any).lineDays : id === "cauti" ? (r as any).catheterDays : scope.patientDays;
  const dayNoun = `${fmtInt(sizingDays)} ${QUALITY_RATE_UNIT[id]}`;
  const formula = value > 0
    ? `${dayNoun} × ${rate}/1k ${label} × ${fmtPct(pct)}% prevention (of a ${ceilingPct}pp ceiling) × $${fmtInt(cost)}/case = ~${fmtMoneyCompact(value)}.`
    : NO_MOVE_FORMULA;

  return {
    id, label, events: r.events, prevented: r.prevented, value, costPerEvent: cost,
    rate, sizingDays, sizingUnit: QUALITY_RATE_UNIT[id],
    ceilingCount: r.events * (ceilingPct / 100), formula,
  };
}

export interface QualityPayoff {
  events: QualityEventResult[];
  totalPrevented: number;
  totalValue: number;
}

export function computeQualityPayoff(scope: QualityScope, eventInterventions: QualityEventIntervention[], values: LeverValues): QualityPayoff {
  const pctById = new Map(eventInterventions.map((ei) => [ei.id, ei.committedPct]));
  const events = scope.eventTypes.map((id) => eventResultFor(id, scope, pctById.get(id) ?? 0, values));
  const totalPrevented = events.reduce((sum, e) => sum + e.prevented, 0);
  const totalValue = events.reduce((sum, e) => sum + e.value, 0);
  return { events, totalPrevented, totalValue };
}

// ────────────────────────────────────────────────────────────────────────
// The full chain + THE MATH strings
// ────────────────────────────────────────────────────────────────────────

export interface QualityChainResult {
  scope: QualityScope;
  eventInterventions: QualityEventIntervention[];
  payoff: QualityPayoff;
  formulas: {
    scope: string;
    payoff: string;
  };
}

export function computeQualityChain(baseline: AttainBaseline, values: LeverValues): QualityChainResult {
  const scope = computeQualityScope(baseline, values);
  const eventInterventions = computeQualityInterventions(scope, values);
  const payoff = computeQualityPayoff(scope, eventInterventions, values);

  const scopeFormula = scope.patientDays > 0
    ? `${fmtInt(scope.bedsInScope)} beds in scope × ${fmtPct(scope.occupancyFraction * 100)}% occupancy × 365 days = ${fmtInt(scope.patientDays)} patient-days/yr. Targeting: ${scope.eventTypes.length > 0 ? scope.eventTypes.map((id) => QUALITY_EVENT_LABELS[id]).join(", ") : "no event types picked yet"}.`
    : NO_MOVE_FORMULA;

  const payoffTerms = payoff.events.map((e) => `${fmtInt(e.prevented)} ${e.label} prevented × $${fmtInt(e.costPerEvent)}/case = ~${fmtMoneyCompact(e.value)}`);
  // A single targeted event type already ends with its own "= ~$X"; only a
  // multi-event sum needs the trailing "= ~$total" to show the addition.
  const payoffFormula = payoff.totalValue > 0
    ? payoffTerms.length > 1
      ? `${payoffTerms.join(" + ")} = ~${fmtMoneyCompact(payoff.totalValue)}.`
      : `${payoffTerms[0]}.`
    : NO_MOVE_FORMULA;

  return { scope, eventInterventions, payoff, formulas: { scope: scopeFormula, payoff: payoffFormula } };
}

// ────────────────────────────────────────────────────────────────────────
// THE SHARED, CONVERGING QUALITY LADDER — the one derivation both Build the
// case (QualityLadderChain) and Planning read, so their per-event gates and
// their one converged prize can never diverge. Same SHAPE as the revenue
// ladder (`deriveRevenueLadder`): one shared first domino (earlier, more
// complete risk documentation at the point of care) feeding several parallel
// per-event sub-ladders that converge into one prevented-harm prize, each
// event an honestly distinct harm pool, summed once and never double-counted.
//
// `realizationPct` scales every event's dollar (and the converged prize)
// exactly once, the same way `applyRealization` scales the engine result the
// side panel reads, so Build the case (which passes its own live slider) and
// Planning (which passes the factor implied by the combined engine result)
// show identical per-event dollars and the same converged prize.
// ────────────────────────────────────────────────────────────────────────

export interface QualityEventLadder {
  id: QualityEventId;
  label: string;
  /** Beat 1, GROUND: the events a year this rate and this unit size produce. */
  groundLabel: string;
  groundValue: string;
  groundDetail: string;
  groundSet: boolean;
  /** The events a year this rate and unit size produce, before any
   * prevention. The denominator of the whole event. */
  groundEvents: number;
  rate: number;
  costPerEvent: number;
  /** Beat 2, DIAGNOSE (the honesty rung): the most events a fully committed
   * prevention program could reach, the defensible ceiling. What is left
   * occurs despite best practice, so it stays out of the number. */
  ceilingLabel: string;
  ceilingCount: number;
  ceilingUnit: string;
  /** What this plan's committed interventions actually prevent, out of that
   * ceiling. */
  capturedLabel: string;
  capturedCount: number;
  capturedUnit: string;
  /** Beat 3, WHO ACTS: Abridge surfaces the risk signal earlier, this owner
   * runs the bundle that prevents. */
  whoActs: string;
  /** Beat 4, THE NUMBER: the realized cost-of-harm-avoided dollar. */
  priceLabel: string;
  value: number;
  formula: string;
  hasValue: boolean;
}

export interface QualityLadderModel {
  scope: QualityScope;
  events: QualityEventLadder[];
  /** The one converged prize: every selected event's cost-of-harm-avoided
   * summed, each a distinct harm pool, never double-counted. */
  convergedPrize: number;
  anySelected: boolean;
}

export function deriveQualityLadder(baseline: AttainBaseline, values: LeverValues, realizationPct = 100): QualityLadderModel {
  const chain = computeQualityChain(baseline, values);
  const events: QualityEventLadder[] = chain.payoff.events.map((e) => {
    const value = Math.round(realizedValue(e.value, realizationPct));
    const eventsSet = e.events > 0;
    return {
      id: e.id,
      label: e.label,
      groundLabel: "Events a year at your rate",
      groundValue: eventsSet ? `${fmtEventCount(e.events)} events / yr` : "Not set yet",
      groundDetail: eventsSet
        ? `${fmtInt(e.sizingDays)} ${e.sizingUnit} × ${e.rate} per 1,000`
        : "Set your beds in scope to size this event.",
      groundSet: eventsSet,
      groundEvents: e.events,
      rate: e.rate,
      costPerEvent: e.costPerEvent,
      ceilingLabel:
        e.id === "sepsis"
          ? "Cases the documentation can move, the rest occur despite best practice"
          : "Events a fully committed program can prevent, the rest occur despite best practice",
      ceilingCount: e.ceilingCount,
      ceilingUnit: e.id === "sepsis" ? "cases / yr" : "events / yr",
      capturedLabel: "Events this plan's committed interventions prevent",
      capturedCount: e.prevented,
      capturedUnit: e.id === "sepsis" ? "cases / yr" : "events / yr",
      whoActs: QUALITY_WHO_ACTS[e.id],
      priceLabel: `$${fmtInt(e.costPerEvent)} / event`,
      value,
      formula: value > 0 ? formulaWithRealization(e.formula, realizationPct, value) : e.formula,
      hasValue: value > 0,
    };
  });
  const convergedPrize = events.reduce((sum, e) => sum + e.value, 0);
  return { scope: chain.scope, events, convergedPrize, anySelected: chain.scope.eventTypes.length > 0 };
}

/** A prevented / event count: whole numbers for large pools, one decimal for
 * the small fractional counts a single unit can produce, so a real 0.6
 * prevented never collapses to a fabricated 0 or 1 (mirrors revenue's
 * `fmtRevenueCount`). */
function fmtEventCount(n: number): string {
  if (n > 0 && n < 10) return (Math.round(n * 10) / 10).toLocaleString();
  return Math.round(n).toLocaleString();
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

  const pctById = new Map(chain.eventInterventions.map((ei) => [ei.id, ei.committedPct]));
  const dq = state.docQualityInputs as any;
  if (chain.scope.eventTypes.includes("hapi")) {
    dq.nursingHapiEnabled = true;
    dq.nursingHapiRate = qualityRateFor("hapi", values);
    dq.nursingHapiPreventionRate = pctById.get("hapi") ?? 0;
    dq.nursingHapiCost = qualityCostFor("hapi", values);
  }
  if (chain.scope.eventTypes.includes("falls")) {
    dq.nursingFallsEnabled = true;
    dq.nursingFallsRate = qualityRateFor("falls", values);
    dq.nursingFallsPreventionRate = pctById.get("falls") ?? 0;
    dq.nursingFallsCost = qualityCostFor("falls", values);
  }
  if (chain.scope.eventTypes.includes("clabsi")) {
    dq.nursingClabsiEnabled = true;
    dq.nursingClabsiUtilizationRatio = CLABSI_UTILIZATION_PCT;
    dq.nursingClabsiRate = qualityRateFor("clabsi", values);
    dq.nursingClabsiPreventionRate = pctById.get("clabsi") ?? 0;
    dq.nursingClabsiCost = qualityCostFor("clabsi", values);
  }
  if (chain.scope.eventTypes.includes("cauti")) {
    dq.nursingCautiEnabled = true;
    dq.nursingCautiUtilizationRatio = CAUTI_UTILIZATION_PCT;
    dq.nursingCautiRate = qualityRateFor("cauti", values);
    dq.nursingCautiPreventionRate = pctById.get("cauti") ?? 0;
    dq.nursingCautiCost = qualityCostFor("cauti", values);
  }
  if (chain.scope.eventTypes.includes("sepsis")) {
    dq.nursingSepsisEnabled = true;
    dq.nursingSepsisRatePerThousand = qualityRateFor("sepsis", values);
    dq.nursingSepsisCurrentCompliance = SEPSIS_COMPLIANCE_BASELINE_PCT;
    dq.nursingSepsisDocLagPercent = SEPSIS_DOC_LAG_PCT;
    dq.nursingSepsisExcessCostPerCase = qualityCostFor("sepsis", values);
    dq.nursingSepsisRealization = pctById.get("sepsis") ?? 0;
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
export const QUALITY_LEVER_IDS: string[] = [
  "qualityLines",
  "qualityBeds",
  ...QUALITY_EVENT_IDS.flatMap((id) => QUALITY_INTERVENTIONS[id].map((iv) => iv.id)),
];

/**
 * Adapts the D1-D2 chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns. Because every
 * intervention adds a fixed, independent weight to its OWN event's own
 * ceiling (never another event's, and the weights are designed to never
 * overshoot that ceiling — see `QualityInterventionDef.weightPp`), a clean
 * leave-one-out marginal (this ONE intervention reset to "not committed,"
 * chain re-run, subtracted from the chosen payoff) isolates exactly that
 * intervention's own dollar with no cross terms and no smearing — a
 * genuine improvement over the old shared-composite model, which had to
 * leave-one-out an entire generic slider at once.
 */
export function computeQualityContributions(baseline: AttainBaseline, values: LeverValues): LeverContributionsResult {
  const chosen = computeQualityChain(baseline, values);
  const { scope, payoff, eventInterventions, formulas } = chosen;

  const withInterventionOff = (leverId: string): QualityPayoff => {
    const swapped: LeverValues = { ...values, [leverId]: 0 };
    const swappedChain = computeQualityChain(baseline, swapped);
    return swappedChain.payoff;
  };

  const decisionRows: LeverContribution[] = [];
  for (const ei of eventInterventions) {
    for (const iv of ei.interventions) {
      const checked = ei.checkedIds.includes(iv.id);
      const without = withInterventionOff(iv.id);
      const marginalMargin = payoff.totalValue - without.totalValue;
      const marginalCount = payoff.totalPrevented - without.totalPrevented;
      const formula = checked
        ? `${iv.label} for ${ei.label} adds ${fmtPct(iv.weightPp)}pp toward its ${ei.ceilingPct}pp prevention ceiling.`
        : NO_MOVE_FORMULA;
      decisionRows.push({ id: iv.id, marginalMargin, marginalCount, pctOfTotal: 0, formula });
    }
  }

  const d1Rows: LeverContribution[] = [
    { id: "qualityLines", marginalMargin: 0, marginalCount: scope.units.length, pctOfTotal: 0, formula: formulas.scope },
    { id: "qualityBeds", marginalMargin: 0, marginalCount: scope.bedsInScope, pctOfTotal: 0, formula: formulas.scope },
  ];

  const marginSum = decisionRows.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
  const perLever: LeverContribution[] = [...d1Rows, ...decisionRows].map((l) => ({
    ...l,
    pctOfTotal: marginSum > 0 ? Math.max(0, l.marginalMargin) / marginSum : 0,
  }));

  return { perLever, totalMargin: payoff.totalValue, totalCount: Math.round(payoff.totalPrevented) };
}
