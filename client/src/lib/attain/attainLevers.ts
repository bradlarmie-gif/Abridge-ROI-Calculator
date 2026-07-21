import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { calcHapi, calcFalls, calcSepsis } from "@/lib/nursingQualityCalcs";
import {
  DEFAULT_EXPLORE_STATE,
  type ExploreState,
} from "@/pages/explore/ExploreFlow";
import type { AttainSetting, GoalId } from "./attainTypes";
import { computeAccessContributions } from "./attainAccess";

/**
 * Attain - lever layer.
 *
 * A "lever" is one concrete thing a partner can do for a goal (open a
 * service line, dial up a percent, set a coverage level). Each lever carries
 * a `realityStart`, the value that represents "current reality, doing
 * nothing new." Every lever's dollar contribution is computed as a DELTA
 * off that baseline, run through the same `ExploreState` synthesis plus
 * `computeAllDriverValues` engine the rest of the Attain path
 * (`attainCalc.ts`) already uses. That is what keeps the figures reconciled
 * with the rest of the app rather than inventing a separate math model.
 *
 * THE PARTNER'S OPERATIONAL BASELINE
 * -----------------------------------
 * `AttainBaseline` is the handful of numbers a partner enters once, on the
 * "Your starting point" step, that describe their actual operation: how
 * many providers/beds are in scope, how many encounters they see, how much
 * of the org has adopted Abridge. Every lever's synthesized `ExploreState`
 * below is built FROM this baseline (via `effectiveEncountersPerUnit`,
 * `utilizationFraction`, `adoptionFraction`, `nursingOccupancyFraction`, and
 * `baselineUnits`), not from an assumed constant. A partner with 80
 * providers and a partner with 40 providers dial the exact same lever and
 * get a proportionally different dollar figure, because the figure is
 * always "their baseline x this decision," never a flat assumption. When a
 * baseline field is missing, each helper falls back to the same illustrative
 * constant the original model used, so a lever never breaks before the
 * partner has filled in every field.
 *
 * CONTRIBUTION MODEL - how the levers combine
 * --------------------------------------------
 * Each lever's dollar contribution is computed as an INDEPENDENT channel: a
 * small synthesized `ExploreState` that sweeps ONLY that lever's own value,
 * holding every other input at a fixed reference constant (not at another
 * lever's chosen value). Each lever's engine value is that channel's result
 * MINUS the same channel evaluated at the lever's own `realityStart`, so a
 * lever that is already partly active today (e.g. "Fill the new slots"
 * starts at ~60%) is only credited for movement above where the partner
 * already is. `totalMargin` sums every lever's delta at its CHOSEN value;
 * `marginalMargin` for a lever is that same sum minus the sum with just
 * that one lever reset to its `realityStart` (the exact leave-one-out
 * subtraction called for by the spec). Because each channel only depends on
 * its own lever, this leave-one-out subtraction always isolates exactly
 * that lever's own delta, with no cross terms, and "doing nothing new"
 * (every lever at its realityStart) always nets to exactly 0.
 *
 * This decomposition is a deliberate simplification, not a literal
 * multiplicative reproduction of a single combined ExploreState. A single
 * shared formula (e.g. one patientAccess call fed by all 4 access levers at
 * once) is mathematically an AND-gate: if any one lever sits at a
 * realityStart of 0 (e.g. "reinvest freed time" hasn't started yet), every
 * OTHER lever's marginal effect would also read as 0 whenever swept alone
 * from the full-reality baseline, even though it is a genuinely separate
 * decision. Modeling each lever as its own channel (with the other inputs
 * held at a defensible reference value, not zero) avoids that false
 * dependency and gives an honest, independent "moving this decision from
 * where you are today adds ~$X" figure per lever, while every channel is
 * still computed by the same `computeAllDriverValues` engine used
 * everywhere else in the app.
 *
 * Every lever also carries a live `formula` string: the exact "THE MATH"
 * breakdown `computeAllDriverCalcSummaries` already generates for the
 * matching Explore driver, run against this lever's own synthesized state,
 * with the resulting dollar figure appended. Reusing that function (instead
 * of hand-writing a second formula generator) is what guarantees the
 * printed math and the engine's dollar figure can never disagree.
 *
 * Per-goal driver mappings (documented per the plan's mapping-decision
 * requirement):
 *  - access (outpatient + ED): rebuilt as an ORDERED DECISION CHAIN, not an
 *    independent-channel lever set, in `attainAccess.ts`. Money is volume x
 *    margin, and volume itself is MIN(capacity, demand), so a dollar figure
 *    cannot exist until scope, margin, capacity, AND demand are all real.
 *    `computeLeverContributions` delegates the whole `goal === "access"`
 *    case to `computeAccessContributions` there; see that module's header
 *    for the full chain and its reconciliation to Explore's `patientAccess`
 *    primitives (freed hours, visit length, margin/visit).
 *  - retention (all settings): all 4 levers sweep the existing
 *    `retentionImpactScenario: 'custom'` + `retentionCustomPercent` knob,
 *    scaled against each setting's optimistic-scenario ceiling (15pp
 *    physician, 25pp nursing), "backfill coverage gaps" and "sustain it"
 *    have no dedicated fields, so they are modeled as fractions of that same
 *    ceiling (documented simplification).
 *  - revenue (outpatient/ED): "act on documented complexity" sweeps
 *    `wrvuCustomPercent`; "close queries fast" sweeps `wrvuRealization`
 *    (faster closure -> more of the coded lift survives, so days convert to
 *    a realization percent, inverted: fewer days -> higher realization);
 *    "protect against downcoding" is a separate, genuinely additive
 *    mechanism using the existing `denialsEnabled`/`denialsRealization`
 *    field (booked once, alongside wRVU, never blended into one number).
 *  - revenue (inpatient): "act on documented complexity" sweeps
 *    `ipDrgCustomPercent`; "close queries fast" sweeps `ipCdiRealization`
 *    (the CDI query-cost-avoidance channel, the inpatient analog of a
 *    query); "protect against downcoding" sweeps `ipDrgRealization`
 *    (protecting the captured DRG weight from audit downgrade).
 *  - quality (nursing): "close real-time gaps" sweeps
 *    `nursingHapiPreventionRate`; "tie deterioration signals to a response"
 *    sweeps `nursingSepsisRealization` (the SEP-1 early-warning bundle is
 *    the natural home for "deterioration signal -> response"); "lift bundle
 *    compliance" sweeps `nursingFallsPreventionRate` (the mobility/turning
 *    bundle). Three genuinely distinct, already-wired nursing-quality
 *    drivers, one per lever, so no double count.
 *
 * Every "lines" lever (scope) uses a per-(setting, goal) preset list in
 * `LINE_PRESETS` below; `realityStart: []` means no lines are committed to
 * the plan yet, distinct from the partner's operational baseline collected
 * on the Scope step.
 */

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export interface Lever {
  id: string;
  label: string; // the decision, phrased as an action the partner takes
  help: string; // one plain sentence teaching how it moves the bottom line
  control: "percent" | "countPerUnit" | "lines" | "toggleLevel";
  unit: string;
  min: number;
  max: number;
  step: number;
  realityStart: number | string[];
  ownerRole: string;
  defaultDue: string;
  /** The one number this decision's owner should watch to know if it is
   * actually moving — pre-fills Commit's "Signal to watch" field. Plain and
   * specific, not the dollar figure itself (that is the payoff, not the
   * signal that predicts it). */
  signal: string;
}

export type LeverValues = Record<string, number | string[]>;

export interface LeverContribution {
  id: string;
  marginalMargin: number;
  marginalCount: number;
  pctOfTotal: number;
  /** The live "THE MATH" derivation for this lever's CHOSEN value, e.g.
   * "40 providers x 2.5 visits/wk x 48 wks x $200/visit = ~$480K" - built
   * from the partner's own baseline, never invented. */
  formula: string;
}

export interface LeverContributionsResult {
  perLever: LeverContribution[];
  totalMargin: number;
  totalCount: number;
}

/**
 * The partner's operational baseline - the handful of real-world numbers
 * every lever's dollar figure is computed against. Collected once on the
 * "Your starting point" step, per care setting:
 *  - outpatient / ED / inpatient: providers, annual encounters, utilization
 *  - nursing: staffed beds, nursing FTEs, daily census, adoption rate
 *
 * All fields are optional so a lever never throws before every field is
 * filled in; missing fields fall back to the same illustrative constants
 * the model used before baseline entry existed (see the per-function
 * fallback values below).
 */
export interface AttainBaseline {
  providers?: number;
  annualEncounters?: number;
  utilizationPct?: number;
  staffedBeds?: number;
  nursingFtes?: number;
  dailyCensus?: number;
  adoptionPct?: number;
}

/** Sensible benchmark defaults, one per care setting, matching the same
 * "typical" presets Explore's Opportunity step offers (3,500 outpatient /
 * 1,800 ED encounters per provider per year, 400 inpatient discharges per
 * hospitalist, 70% typical utilization; nursing's typical Med/Surg FTE
 * ratio, 85% occupancy translated to daily census, 50% typical adoption).
 * Prefills the Scope step so a partner sees a defensible plan on load and
 * edits from there. */
export function defaultBaseline(setting: AttainSetting): AttainBaseline {
  switch (setting) {
    case "outpatient":
      return { providers: 40, annualEncounters: 40 * 3_500, utilizationPct: 70 };
    case "ed":
      return { providers: 55, annualEncounters: 55 * 1_800, utilizationPct: 70 };
    case "inpatient":
      return { providers: 45, annualEncounters: 45 * 400, utilizationPct: 70 };
    case "nursing":
      return { staffedBeds: 120, nursingFtes: 180, dailyCensus: 102, adoptionPct: 50 };
    default:
      return {};
  }
}

// ────────────────────────────────────────────────────────────────────────
// LEVERS catalog
// ────────────────────────────────────────────────────────────────────────

export const LEVERS: Record<GoalId, Lever[]> = {
  // Access is a decision CHAIN (D1 scope -> D2 margin -> D3 capacity -> D4
  // demand -> D5 payoff), rendered bespoke on Build the case
  // (`AccessDecisionChain.tsx`), not through the generic lever renderer.
  // This catalog entry exists so Commit and Your Plan, which walk every
  // goal's `LEVERS[goal]` generically, keep working: one row per decision,
  // ids matching the flat `LeverValues` keys `attainAccess.ts` reads
  // directly (`accessProviders`, `accessMargin`, `accessFreedShare`, and
  // the four `accessDemand*` sources). See `attainAccess.ts`'s
  // `ACCESS_LEVER_IDS` and `computeAccessContributions` for the engine.
  access: [
    {
      id: "accessProviders",
      label: "Point providers at access",
      help: "Providers actually committed to converting freed time into access are the scope every decision below is built from.",
      control: "countPerUnit",
      unit: "providers",
      min: 0,
      max: 500,
      step: 1,
      realityStart: 0,
      ownerRole: "Service-line chief",
      defaultDue: "Month 1",
      signal: "Providers actually converting freed time into access, of those pointed at it",
    },
    {
      id: "accessMargin",
      label: "Set the margin per visit",
      help: "Contribution margin, not charges. Cardiology and primary care are not worth the same visit, so this is priced per line.",
      control: "countPerUnit",
      unit: "$/visit",
      min: 0,
      max: 2_000,
      step: 10,
      realityStart: 0,
      ownerRole: "Partner finance",
      defaultDue: "Month 1",
      signal: "Contribution margin booked per visit, this line",
    },
    {
      id: "accessFreedShare",
      label: "Convert freed time to capacity",
      help: "The share of freed documentation time committed to the schedule, instead of relief, becomes new visit capacity. This is the only source of new capacity.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Ambulatory operations",
      defaultDue: "Month 2",
      signal: "Share of freed documentation time routed to the schedule",
    },
    {
      id: "accessDemandBacklog",
      label: "Count the referral backlog",
      help: "Patients already waiting to be seen are demand you already have, not demand you need to go find.",
      control: "countPerUnit",
      unit: "patients",
      min: 0,
      max: 10_000,
      step: 10,
      realityStart: 0,
      ownerRole: "Access / referral ops",
      defaultDue: "Month 3",
      signal: "Referral backlog size",
    },
    {
      id: "accessDemandSameDayPct",
      label: "Add same-day and urgent demand",
      help: "Share of encounters that would book same-day or urgent if an open slot existed for them today.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Access / referral ops",
      defaultDue: "Month 3",
      signal: "Share of encounters booking same-day or urgent",
    },
    {
      id: "accessDemandNoShowPct",
      label: "Recover no-shows",
      help: "Share of encounters recoverable by filling a no-show slot instead of losing it outright.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Ops / staffing",
      defaultDue: "Month 3",
      signal: "No-show recovery rate",
    },
    {
      id: "accessDemandNewReferrals",
      label: "Count new referrals",
      help: "New referrals arriving every month that a fuller schedule could absorb instead of routing elsewhere.",
      control: "countPerUnit",
      unit: "referrals/mo",
      min: 0,
      max: 1_000,
      step: 5,
      realityStart: 0,
      ownerRole: "Access / referral ops",
      defaultDue: "Month 3",
      signal: "New referrals arriving per month",
    },
  ],
  retention: [
    {
      id: "retentionLines",
      label: "Departments in scope",
      help: "Each department brought into the plan adds its provider count to the pool this plan is working to keep from leaving.",
      control: "lines",
      unit: "departments",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Department leadership",
      defaultDue: "Month 1",
      signal: "Departments actively brought into the plan",
    },
    {
      id: "retentionFloor",
      label: "Hold an after-hours relief floor",
      help: "A protected floor on after-hours documentation is what keeps freed time from being quietly absorbed back into a bigger panel.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Department leadership",
      defaultDue: "Month 2",
      signal: "After-hours documentation load against the floor",
    },
    {
      id: "retentionBackfill",
      label: "Backfill coverage gaps",
      help: "Backfilling an open shift or panel before the remaining staff absorb it is what keeps relief from being clawed back.",
      control: "toggleLevel",
      unit: "coverage level",
      min: 0,
      max: 2,
      step: 1,
      realityStart: 0,
      ownerRole: "Ops / staffing",
      defaultDue: "Month 2",
      signal: "Coverage-gap backfill level",
    },
    {
      id: "retentionSustain",
      label: "Sustain it",
      help: "Relief that holds for more months compounds into a larger share of the departures this plan is working to avoid.",
      control: "countPerUnit",
      unit: "months sustained",
      min: 0,
      max: 12,
      step: 1,
      realityStart: 0,
      ownerRole: "Department chiefs",
      defaultDue: "Month 3",
      signal: "Months the relief floor has held",
    },
  ],
  revenue: [
    {
      id: "revenueLines",
      label: "Specialties in scope",
      help: "Each specialty brought into the plan adds its encounter volume to the pool of visits with documented complexity not yet coded.",
      control: "lines",
      unit: "specialties",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Revenue cycle / coding",
      defaultDue: "Month 1",
      signal: "Specialties actively brought into the plan",
    },
    {
      id: "revenueUptake",
      label: "Act on documented complexity in coding",
      help: "Complexity that is documented but never coded is not revenue. This is the share of the documented detail coding actually acts on.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 30,
      ownerRole: "Revenue cycle / coding",
      defaultDue: "Month 2",
      signal: "Share of documented complexity coding acts on",
    },
    {
      id: "revenueQueryDays",
      label: "Close provider queries fast",
      help: "A query that ages past a week gets answered from memory or dropped. This is the target turnaround, in days.",
      control: "countPerUnit",
      unit: "days",
      min: 1,
      max: 21,
      step: 1,
      realityStart: 14,
      ownerRole: "CDI + providers",
      defaultDue: "Month 2",
      signal: "Provider query turnaround, in days",
    },
    {
      id: "revenueProtect",
      label: "Protect against downcoding",
      help: "A captured level that gets downgraded on appeal never reaches the bank. This is the share of captured levels protected from downcoding.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Billing",
      defaultDue: "Month 3",
      signal: "Share of captured levels protected from downcoding",
    },
  ],
  quality: [
    {
      id: "qualityLines",
      label: "Units in scope",
      help: "Each unit brought into the plan adds its patient-days to the pool this plan is working to keep safe.",
      control: "lines",
      unit: "units",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Unit leadership",
      defaultDue: "Month 1",
      signal: "Units actively brought into the plan",
    },
    {
      id: "qualityRealTime",
      label: "Close real-time gaps during the shift",
      help: "A missed bundle step closed during the shift prevents an event before it happens. This is the share of gaps closed in real time, above where you are today.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 55,
      ownerRole: "Charge nurses / unit leads",
      defaultDue: "Month 2",
      signal: "Share of bundle gaps closed in real time, during the shift",
    },
    {
      id: "qualityResponse",
      label: "Tie deterioration signals to a response",
      help: "An early-warning signal with no named responder is just a note. This sets how reliably a signal turns into an actual intervention.",
      control: "toggleLevel",
      unit: "response level",
      min: 0,
      max: 2,
      step: 1,
      realityStart: 0,
      ownerRole: "Rapid response / unit",
      defaultDue: "Month 2",
      signal: "Deterioration-response level",
    },
    {
      id: "qualityBundle",
      label: "Lift bundle compliance",
      help: "Bundle compliance above today's audited rate is what turns a documented step into a prevented event.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Unit leadership",
      defaultDue: "Month 3",
      signal: "Audited bundle compliance rate",
    },
  ],
};

/** All levers at their `realityStart`, the plan before the partner has
 * decided to do anything new. */
export function defaultLeverValues(goal: GoalId): LeverValues {
  const values: LeverValues = {};
  for (const lever of LEVERS[goal]) {
    values[lever.id] = lever.realityStart;
  }
  return values;
}

// ────────────────────────────────────────────────────────────────────────
// Line presets, per (setting, goal), the service lines/departments/units a
// "lines" lever can select from. Not every setting supports every goal; see
// `SETTING_GOAL_MATRIX` in attainGoals.ts.
// ────────────────────────────────────────────────────────────────────────

const LINE_PRESETS: Record<AttainSetting, Partial<Record<GoalId, string[]>>> = {
  outpatient: {
    access: ["Cardiology", "Orthopedics", "Primary Care", "Endocrinology"],
    retention: ["Primary Care", "Cardiology", "Endocrinology", "Specialty Clinics"],
    revenue: ["Cardiology", "Endocrinology", "Primary Care"],
  },
  ed: {
    access: ["General ED", "Fast Track", "Observation Unit", "Behavioral Health"],
    retention: ["General ED", "Fast Track", "Observation Unit"],
    revenue: ["General ED", "Fast Track", "Observation Unit"],
  },
  inpatient: {
    revenue: ["Med-Surg", "ICU", "Telemetry"],
    retention: ["Med-Surg", "ICU", "Telemetry"],
  },
  nursing: {
    quality: ["Med-Surg", "ICU", "Step-Down"],
    retention: ["Med-Surg", "ICU", "Step-Down"],
  },
};

function presetsFor(setting: AttainSetting, goal: GoalId): string[] {
  return LINE_PRESETS[setting]?.[goal] ?? [];
}

/** Every line/department/unit option a "lines" lever can select from for
 * this (goal, setting), or [] if this combination has no lines lever. Used
 * by the Build the Case step to render the multi-select chips; this is the
 * one export the UI layer needs on top of the LINE_PRESETS table above. */
export function lineOptions(goal: GoalId, setting: AttainSetting): string[] {
  return presetsFor(setting, goal);
}

function linesFraction(setting: AttainSetting, goal: GoalId, selected: string[]): number {
  const presets = presetsFor(setting, goal);
  if (presets.length === 0) return 0;
  const valid = selected.filter((s) => presets.includes(s));
  return Math.min(1, valid.length / presets.length);
}

// ────────────────────────────────────────────────────────────────────────
// Baseline helpers - turn the partner's operational baseline into the
// numbers each channel needs, falling back to the original illustrative
// constants whenever a field is missing.
// ────────────────────────────────────────────────────────────────────────

/** How many providers/beds/FTEs are "in scope" for a given (setting, goal)
 * pair. Nursing splits by goal because quality levers work off staffed
 * beds while retention works off nursing FTEs - two different real
 * headcounts a partner enters separately on the Scope step. */
function baselineUnits(setting: AttainSetting, goal: GoalId, baseline: AttainBaseline): number {
  if (setting === "nursing") {
    const n = goal === "quality" ? baseline.staffedBeds : baseline.nursingFtes;
    return Math.max(0, Math.round(n ?? 0));
  }
  return Math.max(0, Math.round(baseline.providers ?? 0));
}

/** Real encounters-per-unit ratio from the partner's own baseline
 * (annualEncounters / providers), or the fallback illustrative rate this
 * channel used before baseline entry existed. */
function effectiveEncountersPerUnit(baseline: AttainBaseline, fallback: number): number {
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  return providers > 0 && encounters > 0 ? encounters / providers : fallback;
}

/** Fraction of encounters/patient-days actually reachable today, from the
 * partner's own utilization/adoption entry. Defaults to 100% (no
 * reduction) when the partner hasn't entered one, so a lever never
 * silently shrinks before the Scope step is filled in. */
function utilizationFraction(baseline: AttainBaseline, fallbackPct = 100): number {
  const pct = baseline.utilizationPct ?? fallbackPct;
  return Math.min(1, Math.max(0, pct / 100));
}

function adoptionFraction(baseline: AttainBaseline, fallbackPct = 100): number {
  const pct = baseline.adoptionPct ?? fallbackPct;
  return Math.min(1, Math.max(0, pct / 100));
}

/** Real occupancy (daily census / staffed beds) from the partner's own
 * baseline, or the original 85% illustrative default. */
function nursingOccupancyFraction(baseline: AttainBaseline, fallback = 0.85): number {
  const beds = baseline.staffedBeds ?? 0;
  const census = baseline.dailyCensus ?? 0;
  return beds > 0 && census > 0 ? Math.min(1, census / beds) : fallback;
}

/** Compact "$480K" style money for embedding at the end of a formula
 * string. Local to this module so a formula never depends on a UI
 * formatter living elsewhere. */
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

/** Builds the printed formula for a driver field from the same
 * `computeAllDriverCalcSummaries` helper the rest of the app already uses
 * for its "THE MATH" panels, appending the resulting dollar figure so the
 * printed line always reads as a complete derivation, not just factors. */
function formulaFor(summaries: Record<string, string>, key: string, margin: number): string {
  const base = summaries[key];
  if (!base || margin <= 0) return NO_MOVE_FORMULA;
  return `${base} = ~${fmtMoneyCompact(margin)}`;
}

// ────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

/** Rounds to one decimal. Several levers compute a percent-of-a-percent
 * (e.g. a 0-100% slider scaled against a setting's ceiling) which is prone
 * to binary floating-point noise (0.6 * 9 = 5.399999999999999...). Since
 * this value gets printed verbatim in the lever's "THE MATH" formula, it is
 * rounded once, right where it's derived, rather than let the noise reach
 * the printed line. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}

function mkState(setting: AttainSetting): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: setting,
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

/** Days -> realization %. Fewer days (faster query turnaround) survives as
 * a higher realization of the coded/DRG lift; this is the one lever whose
 * raw value improves by going DOWN, so the mapping is inverted here. */
function realizationFromDays(days: number): number {
  const clamped = Math.min(21, Math.max(1, days));
  return Math.max(0, Math.min(100, 100 - clamped * 4));
}

interface ChannelValue {
  margin: number;
  count: number;
  formula: string;
}

const ZERO: ChannelValue = { margin: 0, count: 0, formula: NO_MOVE_FORMULA };

// ACCESS is no longer an independent-channel goal - it is a decision chain,
// computed by `computeAccessContributions` in `attainAccess.ts` and wired
// directly into `computeLeverContributions` and `computeMultiGoalContributions`
// below, bypassing this leave-one-out channel architecture entirely (see
// both functions' comments for why: capacity, demand, and margin are
// jointly dependent through a MIN, not independent parallel channels).

// ────────────────────────────────────────────────────────────────────────
// RETENTION channels
// ────────────────────────────────────────────────────────────────────────

function retentionValue(setting: AttainSetting, eff: number, impactCustomPct: number): ChannelValue {
  if (eff <= 0 || impactCustomPct <= 0) return ZERO;
  if (setting === "nursing") {
    const turnoverRate = 19;
    const replacementCost = 55_000;
    const state: ExploreState = {
      ...mkState("nursing"),
      numberOfProviders: eff,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        nursingRetentionEnabled: true,
        nursingTurnoverRate: turnoverRate,
        nursingReplacementCost: replacementCost,
        retentionImpactScenario: "custom",
        retentionCustomPercent: impactCustomPct,
      },
    };
    const values = computeAllDriverValues(state, 0);
    const summaries = computeAllDriverCalcSummaries(state, 0);
    const retained = eff * (turnoverRate / 100) * 0.4 * (impactCustomPct / 100);
    const margin = values.nursingRetention ?? 0;
    return { margin, count: Math.round(retained), formula: formulaFor(summaries, "nursingRetention", margin) };
  }

  const isIP = setting === "inpatient";
  const turnoverRate = isIP ? 16 : setting === "ed" ? 18 : 14;
  const burnoutShare = isIP ? 45 : setting === "ed" ? 50 : 40;
  const replacementCost = isIP ? 375_000 : setting === "ed" ? 450_000 : 375_000;
  const state: ExploreState = {
    ...mkState(setting),
    numberOfProviders: eff,
    timeDriverInputs: {
      ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
      wellbeingEnabled: true,
      calculateRetentionValue: true,
      annualTurnoverRate: turnoverRate,
      burnoutRelatedTurnover: burnoutShare,
      replacementCost,
      ipAnnualTurnoverRate: turnoverRate,
      ipBurnoutRelatedTurnover: burnoutShare,
      ipReplacementCost: replacementCost,
      retentionImpactScenario: "custom",
      retentionCustomPercent: impactCustomPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const retained = eff * (turnoverRate / 100) * (burnoutShare / 100) * (impactCustomPct / 100);
  const margin = values.providerWellbeing ?? 0;
  return { margin, count: Math.round(retained), formula: formulaFor(summaries, "providerWellbeing", margin) };
}

function retentionChannel(setting: AttainSetting, units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  const ceiling = setting === "nursing" ? 25 : 15; // matches each setting's optimistic-scenario ceiling
  switch (leverId) {
    case "retentionLines": {
      const fraction = linesFraction(setting, "retention", asLines(raw));
      return retentionValue(setting, Math.round(units * fraction), 8);
    }
    case "retentionFloor":
      return retentionValue(setting, Math.round(units * 0.5), round1((asNum(raw) / 100) * ceiling));
    case "retentionBackfill": {
      const level = Math.min(2, Math.max(0, Math.round(asNum(raw))));
      const impactPct = [0, ceiling * 0.4, ceiling * 0.8][level];
      return retentionValue(setting, Math.round(units * 0.5), impactPct);
    }
    case "retentionSustain": {
      const months = Math.min(12, Math.max(0, asNum(raw)));
      return retentionValue(setting, Math.round(units * 0.5), round1(ceiling * (months / 12)));
    }
    default:
      return ZERO;
  }
}

// ────────────────────────────────────────────────────────────────────────
// REVENUE channels
// ────────────────────────────────────────────────────────────────────────

function wrvuValue(setting: AttainSetting, eff: number, liftPct: number, realizationPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || liftPct <= 0 || realizationPct <= 0) return ZERO;
  const isED = setting === "ed";
  const perUnitEncounters = effectiveEncountersPerUnit(baseline, isED ? 1_700 : 2_300);
  const util = utilizationFraction(baseline);
  const annualEncounters = Math.round(eff * perUnitEncounters * util);
  const currentWrvu = isED ? 1.9 : 1.4;
  const conversionFactor = 36;
  const state: ExploreState = {
    ...mkState(setting),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      wrvuEnabled: true,
      wrvuScenario: "custom",
      wrvuCustomPercent: liftPct,
      currentWrvu,
      conversionFactor,
      wrvuRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const lift = (currentWrvu * liftPct) / 100;
  const wrvusCaptured = Math.round(annualEncounters * lift);
  const key = isED ? "edEmLevel" : "wrvu";
  const margin = values[key] ?? 0;
  return { margin, count: wrvusCaptured, formula: formulaFor(summaries, key, margin) };
}

function denialsValue(setting: AttainSetting, eff: number, realizationPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || realizationPct <= 0) return ZERO;
  const isED = setting === "ed";
  const perUnitEncounters = effectiveEncountersPerUnit(baseline, isED ? 1_700 : 2_300);
  const util = utilizationFraction(baseline);
  const annualEncounters = Math.round(eff * perUnitEncounters * util);
  const state: ExploreState = {
    ...mkState(setting),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      denialsEnabled: true,
      denialsScenario: "typical",
      medNecessityDenialRate: 5,
      avgClaimValue: 800,
      denialsRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const prevented = Math.round(annualEncounters * 0.05 * (isED ? 0.3 : 0.5));
  const margin = values.denialPrevention ?? 0;
  return { margin, count: prevented, formula: formulaFor(summaries, "denialPrevention", margin) };
}

function opEdRevenueChannel(
  setting: AttainSetting,
  units: number,
  leverId: string,
  raw: number | string[] | undefined,
  baseline: AttainBaseline,
): ChannelValue {
  const isED = setting === "ed";
  const maxLift = isED ? 6 : 9;
  switch (leverId) {
    case "revenueLines": {
      const fraction = linesFraction(setting, "revenue", asLines(raw));
      return wrvuValue(setting, Math.round(units * fraction), 3, 50, baseline);
    }
    case "revenueUptake":
      return wrvuValue(setting, Math.round(units * 0.5), round1((asNum(raw) / 100) * maxLift), 50, baseline);
    case "revenueQueryDays":
      return wrvuValue(setting, Math.round(units * 0.5), 3, realizationFromDays(asNum(raw)), baseline);
    case "revenueProtect":
      return denialsValue(setting, Math.round(units * 0.5), asNum(raw), baseline);
    default:
      return ZERO;
  }
}

function drgValue(eff: number, protectPct: number, realizationPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || protectPct <= 0 || realizationPct <= 0) return ZERO;
  const perUnitEncounters = effectiveEncountersPerUnit(baseline, 180);
  const util = utilizationFraction(baseline);
  const annualEncounters = Math.round(eff * perUnitEncounters * util);
  const state: ExploreState = {
    ...mkState("inpatient"),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      ipDrgEnabled: true,
      ipDrgScenario: "custom",
      ipDrgCustomPercent: protectPct,
      ipDrgAtRiskRate: 35,
      ipDrgWeightIncrease: 0.35,
      ipDrgBasePayment: 6_500,
      ipDrgRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const atRisk = annualEncounters * 0.35;
  const cases = Math.round(atRisk * (protectPct / 100));
  const margin = values.drgAccuracy ?? 0;
  return { margin, count: cases, formula: formulaFor(summaries, "drgAccuracy", margin) };
}

function cdiValue(eff: number, cdiPct: number, realizationPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || cdiPct <= 0 || realizationPct <= 0) return ZERO;
  const perUnitEncounters = effectiveEncountersPerUnit(baseline, 180);
  const util = utilizationFraction(baseline);
  const annualEncounters = Math.round(eff * perUnitEncounters * util);
  const state: ExploreState = {
    ...mkState("inpatient"),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      ipCdiEnabled: true,
      ipCdiScenario: "custom",
      ipCdiCustomPercent: cdiPct,
      ipCdiQueryRate: 30,
      ipCdiCostPerQuery: 50,
      ipCdiRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const queries = annualEncounters * 0.3;
  const closed = Math.round(queries * (cdiPct / 100));
  const margin = values.cdiQueryReduction ?? 0;
  return { margin, count: closed, formula: formulaFor(summaries, "cdiQueryReduction", margin) };
}

function ipRevenueChannel(units: number, leverId: string, raw: number | string[] | undefined, baseline: AttainBaseline): ChannelValue {
  switch (leverId) {
    case "revenueLines": {
      const fraction = linesFraction("inpatient", "revenue", asLines(raw));
      return drgValue(Math.round(units * fraction), 15, 50, baseline);
    }
    case "revenueUptake":
      return drgValue(Math.round(units * 0.5), round1((asNum(raw) / 100) * 25), 50, baseline);
    case "revenueQueryDays":
      return cdiValue(Math.round(units * 0.5), 25, realizationFromDays(asNum(raw)), baseline);
    case "revenueProtect":
      return drgValue(Math.round(units * 0.5), 15, asNum(raw), baseline);
    default:
      return ZERO;
  }
}

function revenueChannel(
  setting: AttainSetting,
  units: number,
  leverId: string,
  raw: number | string[] | undefined,
  baseline: AttainBaseline,
): ChannelValue {
  return setting === "inpatient"
    ? ipRevenueChannel(units, leverId, raw, baseline)
    : opEdRevenueChannel(setting, units, leverId, raw, baseline);
}

// ────────────────────────────────────────────────────────────────────────
// QUALITY channels (nursing only, per SETTING_GOAL_MATRIX)
// ────────────────────────────────────────────────────────────────────────

function bedsToPatientDays(beds: number, occupancyFraction: number): number {
  return beds * occupancyFraction * 365;
}

function hapiValue(eff: number, preventionPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || preventionPct <= 0) return ZERO;
  const occupancy = nursingOccupancyFraction(baseline);
  const adopted = Math.round(eff * adoptionFraction(baseline));
  if (adopted <= 0) return ZERO;
  const occupancyPct = Math.round(occupancy * 100);
  const state: ExploreState = {
    ...mkState("nursing"),
    nursingStaffedBeds: adopted,
    nursingOccupancyRate: occupancyPct,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingHapiEnabled: true,
      nursingHapiRate: 2.8,
      nursingHapiPreventionRate: preventionPct,
      nursingHapiCost: 18_000,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const hapi = calcHapi({ patientDays: bedsToPatientDays(adopted, occupancy), rate: 2.8, preventionPct, cost: 18_000 });
  const margin = values.nursingHapi ?? 0;
  return { margin, count: Math.round(hapi.prevented), formula: formulaFor(summaries, "nursingHapi", margin) };
}

function sepsisValue(eff: number, realizationPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || realizationPct <= 0) return ZERO;
  const occupancy = nursingOccupancyFraction(baseline);
  const adopted = Math.round(eff * adoptionFraction(baseline));
  if (adopted <= 0) return ZERO;
  const occupancyPct = Math.round(occupancy * 100);
  const state: ExploreState = {
    ...mkState("nursing"),
    nursingStaffedBeds: adopted,
    nursingOccupancyRate: occupancyPct,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingSepsisEnabled: true,
      nursingSepsisRatePerThousand: 2.0,
      nursingSepsisCurrentCompliance: 75,
      nursingSepsisDocLagPercent: 30,
      nursingSepsisExcessCostPerCase: 3_500,
      nursingSepsisRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const sepsis = calcSepsis({
    patientDays: bedsToPatientDays(adopted, occupancy),
    ratePerThousand: 2.0,
    currentCompliancePct: 75,
    docLagPct: 30,
    excessCostPerCase: 3_500,
    realizationPct,
  });
  const margin = values.nursingSepsis ?? 0;
  return { margin, count: Math.round(sepsis.prevented), formula: formulaFor(summaries, "nursingSepsis", margin) };
}

function fallsValue(eff: number, preventionPct: number, baseline: AttainBaseline): ChannelValue {
  if (eff <= 0 || preventionPct <= 0) return ZERO;
  const occupancy = nursingOccupancyFraction(baseline);
  const adopted = Math.round(eff * adoptionFraction(baseline));
  if (adopted <= 0) return ZERO;
  const occupancyPct = Math.round(occupancy * 100);
  const state: ExploreState = {
    ...mkState("nursing"),
    nursingStaffedBeds: adopted,
    nursingOccupancyRate: occupancyPct,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingFallsEnabled: true,
      nursingFallsRate: 3.5,
      nursingFallsPreventionRate: preventionPct,
      nursingFallsCost: 6_500,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const summaries = computeAllDriverCalcSummaries(state, 0);
  const falls = calcFalls({ patientDays: bedsToPatientDays(adopted, occupancy), rate: 3.5, preventionPct, cost: 6_500 });
  const margin = values.nursingFalls ?? 0;
  return { margin, count: Math.round(falls.prevented), formula: formulaFor(summaries, "nursingFalls", margin) };
}

function qualityChannel(units: number, leverId: string, raw: number | string[] | undefined, baseline: AttainBaseline): ChannelValue {
  switch (leverId) {
    case "qualityLines": {
      const fraction = linesFraction("nursing", "quality", asLines(raw));
      return hapiValue(Math.round(units * fraction), 20, baseline);
    }
    case "qualityRealTime":
      return hapiValue(Math.round(units * 0.5), asNum(raw), baseline);
    case "qualityResponse": {
      const level = Math.min(2, Math.max(0, Math.round(asNum(raw))));
      const realizationPct = [0, 55, 80][level];
      return sepsisValue(Math.round(units * 0.5), realizationPct, baseline);
    }
    case "qualityBundle":
      return fallsValue(Math.round(units * 0.5), asNum(raw), baseline);
    default:
      return ZERO;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Combined contribution math
// ────────────────────────────────────────────────────────────────────────

function channelValue(
  goal: GoalId,
  setting: AttainSetting,
  units: number,
  leverId: string,
  raw: number | string[] | undefined,
  baseline: AttainBaseline,
): ChannelValue {
  switch (goal) {
    case "retention":
      return retentionChannel(setting, units, leverId, raw);
    case "revenue":
      return revenueChannel(setting, units, leverId, raw, baseline);
    case "quality":
      return qualityChannel(units, leverId, raw, baseline);
    default:
      return ZERO;
  }
}

/**
 * Every lever's live dollar/count/formula contribution for a goal,
 * reconciled through the same engine `computeAllDriverValues` uses, and
 * synthesized from the partner's own `AttainBaseline` rather than an
 * assumed constant. See the module header for the contribution model and
 * per-goal driver mappings.
 *
 * ACCESS is the one goal that does NOT go through the independent-channel
 * / leave-one-out architecture below - it delegates whole to
 * `computeAccessContributions` (`attainAccess.ts`), because capacity,
 * demand, and margin are jointly dependent through a MIN, not independent
 * parallel channels a leave-one-out subtraction could isolate cleanly.
 */
export function computeLeverContributions(
  goal: GoalId,
  setting: AttainSetting,
  baseline: AttainBaseline,
  values: LeverValues,
): LeverContributionsResult {
  if (goal === "access") return computeAccessContributions(baseline, values);

  const levers = LEVERS[goal];
  const units = baselineUnits(setting, goal, baseline);

  // Each lever's contribution is the delta between its chosen value and its
  // OWN realityStart, not its raw channel value. Several levers have a
  // nonzero realityStart (e.g. "Fill the new slots" already runs at ~60%
  // today) - counting their raw channel value would credit the plan for
  // work the partner already does, breaking "doing nothing new adds
  // nothing." Subtracting each lever's own baseline here is what makes that
  // property hold while still letting every lever's marginalMargin (the
  // leave-one-out subtraction below) isolate exactly that lever's delta.
  const engineValue = (vals: LeverValues): { margin: number; count: number } => {
    let margin = 0;
    let count = 0;
    for (const lever of levers) {
      const chosen = channelValue(goal, setting, units, lever.id, vals[lever.id], baseline);
      const baselineChannel = channelValue(goal, setting, units, lever.id, lever.realityStart, baseline);
      margin += chosen.margin - baselineChannel.margin;
      count += chosen.count - baselineChannel.count;
    }
    return { margin, count };
  };

  const chosen = engineValue(values);
  const rawPerLever = levers.map((lever) => {
    const withoutLever = engineValue({ ...values, [lever.id]: lever.realityStart });
    const chosenChannel = channelValue(goal, setting, units, lever.id, values[lever.id], baseline);
    return {
      id: lever.id,
      marginalMargin: chosen.margin - withoutLever.margin,
      marginalCount: chosen.count - withoutLever.count,
      formula: chosenChannel.formula,
    };
  });

  const marginalSum = rawPerLever.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
  const perLever: LeverContribution[] = rawPerLever.map((l) => ({
    ...l,
    pctOfTotal: marginalSum > 0 ? Math.max(0, l.marginalMargin) / marginalSum : 0,
  }));

  return { perLever, totalMargin: chosen.margin, totalCount: chosen.count };
}

// ────────────────────────────────────────────────────────────────────────
// Multi-goal combine
// ────────────────────────────────────────────────────────────────────────

export interface MultiGoalContributionsResult {
  byGoal: Partial<Record<GoalId, LeverContributionsResult>>;
  combinedMargin: number;
  combinedCount: number;
}

/** The one freed-time lever retention owns. Access's own share of the same
 * freed hour is handled directly inside `computeMultiGoalContributions`
 * below (by re-running the whole access chain with a scaled share, not by
 * post-hoc-scaling a dollar figure - see that function's comment), so
 * access is deliberately absent from this map. */
const FREED_TIME_LEVER: Partial<Record<GoalId, string>> = {
  retention: "retentionFloor",
};

/**
 * Combines any number of goals into one plan.
 *
 * MOST priorities are genuinely additive: a health system chasing Revenue
 * and Quality together is drawing on two different mechanisms (coding
 * accuracy, bedside bundle compliance), so their dollar contributions are
 * computed independently, each via `computeLeverContributions`, and simply
 * summed. `combinedMargin`/`combinedCount` for those goals are exact sums,
 * with no adjustment - see the "independent goals" test below.
 *
 * ACCESS and RETENTION are the one pair that is not independent. Both draw
 * on the same freed-documentation hour: access books its D3 share
 * (`accessFreedShare`, in `attainAccess.ts`) as new visit capacity,
 * retention books its own `retentionFloor` share as protected relief. If
 * both goals are selected and each is credited for the FULL hour, the plan
 * double-books a single hour of freed time as two dollars of value.
 *
 * The fix: when (and only when) both `access` and `retention` are selected,
 * `freedTimeSplit` (0-100, default 50) is the percentage of the freed hour
 * a partner has decided to route to opening access (schedule). The
 * remainder routes to protecting relief.
 *
 * RETENTION's side of the fix is unchanged from before: its
 * `computeLeverContributions` result is recomputed with ONLY its
 * `retentionFloor` lever's marginal (and total) contribution scaled by
 * `1 - accessShare` - every other retention lever is untouched, because it
 * draws on its own, separate mechanism and was never double-booked.
 *
 * ACCESS's side is different because access is a decision CHAIN, not an
 * independent channel: scaling an already-computed dollar figure after the
 * fact would scale whichever row happens to be attributed the payoff
 * (which may be a demand row, not the capacity row at all - see
 * `computeAccessContributions`'s binding-constraint attribution), which
 * would silently do nothing whenever demand, not capacity, is the binding
 * constraint. Instead, the WHOLE access chain is re-run with
 * `accessShare` passed in as `computeAccessChain`'s
 * `crossGoalShareMultiplier`, which scales D3's share BEFORE capacity (and
 * therefore the MIN, and therefore the dollar) is computed. This is exact,
 * not an approximation: at split = 100, access's share multiplier is 1 (no
 * reduction); at split = 0, its multiplier is 0, so capacity - and every
 * dollar downstream of it - is exactly 0.
 */
export function computeMultiGoalContributions(
  goals: GoalId[],
  setting: AttainSetting,
  baseline: AttainBaseline,
  valuesByGoal: Partial<Record<GoalId, LeverValues>>,
  freedTimeSplit: number = 50,
): MultiGoalContributionsResult {
  const uniqueGoals = Array.from(new Set(goals));
  const hasFreedTimeConflict = uniqueGoals.includes("access") && uniqueGoals.includes("retention");
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const retentionShare = 1 - accessShare;

  const byGoal: Partial<Record<GoalId, LeverContributionsResult>> = {};
  let combinedMargin = 0;
  let combinedCount = 0;

  for (const goal of uniqueGoals) {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal);

    if (goal === "access") {
      const shareMultiplier = hasFreedTimeConflict ? accessShare : 1;
      const result = computeAccessContributions(baseline, values, shareMultiplier);
      byGoal.access = result;
      combinedMargin += result.totalMargin;
      combinedCount += result.totalCount;
      continue;
    }

    const base = computeLeverContributions(goal, setting, baseline, values);
    const freedLeverId = hasFreedTimeConflict ? FREED_TIME_LEVER[goal] : undefined;

    if (!freedLeverId) {
      byGoal[goal] = base;
      combinedMargin += base.totalMargin;
      combinedCount += base.totalCount;
      continue;
    }

    const share = retentionShare;
    const freedBase = base.perLever.find((p) => p.id === freedLeverId);
    const freedBaseMargin = freedBase?.marginalMargin ?? 0;
    const freedBaseCount = freedBase?.marginalCount ?? 0;
    const freedScaledMargin = freedBaseMargin * share;
    const freedScaledCount = freedBaseCount * share;

    const scaledPerLeverRaw = base.perLever.map((p) =>
      p.id === freedLeverId
        ? { ...p, marginalMargin: freedScaledMargin, marginalCount: Math.round(freedScaledCount) }
        : p,
    );
    // Every goal's totalMargin is exactly the sum of its own perLever
    // marginal deltas (see the module header on independence / no cross
    // terms), so re-deriving the scaled total from the scaled per-lever
    // deltas keeps this exact rather than approximated.
    const scaledMarginalSum = scaledPerLeverRaw.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
    const scaled: LeverContributionsResult = {
      perLever: scaledPerLeverRaw.map((l) => ({
        ...l,
        pctOfTotal: scaledMarginalSum > 0 ? Math.max(0, l.marginalMargin) / scaledMarginalSum : 0,
      })),
      totalMargin: base.totalMargin - freedBaseMargin + freedScaledMargin,
      totalCount: base.totalCount - freedBaseCount + freedScaledCount,
    };

    byGoal[goal] = scaled;
    combinedMargin += scaled.totalMargin;
    combinedCount += scaled.totalCount;
  }

  return { byGoal, combinedMargin, combinedCount };
}
