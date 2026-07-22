import type { AttainSetting, GoalId } from "./attainTypes";
import { computeAccessContributions } from "./attainAccess";
import { computeEdAccessContributions } from "./attainEdAccess";
import { computeRevenueContributions } from "./attainRevenue";
import { computeIpRevenueContributions } from "./attainInpatientRevenue";
import { computeWorkforceContributions } from "./attainWorkforce";
import {
  computeQualityContributions,
  QUALITY_EVENT_IDS,
  QUALITY_EVENT_LABELS,
  QUALITY_INTERVENTIONS,
  QUALITY_CEILING_PCT,
  QUALITY_SIGNAL_PRIMARY,
  QUALITY_SIGNAL_SECONDARY,
  type QualityEventId,
} from "./attainQuality";
import { computeCapacityContributions } from "./attainCapacity";

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
 *  - access, OUTPATIENT: rebuilt as an ORDERED DECISION CHAIN, not an
 *    independent-channel lever set, in `attainAccess.ts`. Money is volume x
 *    margin, and volume itself is MIN(capacity, demand), so a dollar figure
 *    cannot exist until scope, margin, capacity, AND demand are all real.
 *    `computeLeverContributions` delegates `goal === "access" && setting
 *    !== "ed"` to `computeAccessContributions` there; see that module's
 *    header for the full chain and its reconciliation to Explore's
 *    `patientAccess` primitives (freed hours, visit length, margin/visit).
 *  - access, ED: a GENUINELY DIFFERENT mechanism — recovering patients who
 *    left without being seen (LWBS) and capturing the downstream
 *    admissions some of them become, not opening new schedule capacity.
 *    Rebuilt as its own ORDERED DECISION CHAIN in `attainEdAccess.ts`
 *    (D1 scope -> D2 worth -> D3/D4 the recoverable LWBS pool, the ceiling
 *    -> D5 payoff). `computeLeverContributions` delegates `goal ===
 *    "access" && setting === "ed"` to `computeEdAccessContributions` there;
 *    see that module's header for the full chain, why it does not compete
 *    with retention for the same freed hour the way outpatient access
 *    does, and its reconciliation to Explore's `edLwbs`/`admissionCapture`
 *    primitives.
 *  - retention / WORKFORCE (all settings): rebuilt as an ORDERED DECISION
 *    CHAIN (D1 scope/turnover/replacement cost -> D2 protect the recovered
 *    relief -> D3 survey cadence -> D4 backfill coverage gaps -> D5 sustain
 *    -> the payoff), not an independent-channel lever set, in
 *    `attainWorkforce.ts`. Departures avoided = providers x turnover x
 *    burnout share x the composite impact D2-D5 produce, reconciled to the
 *    same `retentionImpactScenario: 'custom'` + `retentionCustomPercent`
 *    knob (`providerWellbeing`/`nursingRetention`) the old flat-lever model
 *    used. `computeLeverContributions` delegates the whole `goal ===
 *    "retention"` case to `computeWorkforceContributions` there for every
 *    setting; see that module's header for the full chain and the
 *    access/retention shared-freed-hour split.
 *  - revenue (outpatient/ED): rebuilt as a THREE-PATH decision chain, not an
 *    independent-channel lever set, in `attainRevenue.ts`. A partner picks
 *    one or more of Risk Adjustment (HCC capture, outpatient only), E/M
 *    Level Accuracy (the wRVU lift, ED reuses this), and Medical Necessity
 *    Denials (ED reuses this too); each path's own dollar is derived from
 *    its own gated decisions and the three paths simply SUM (they are
 *    genuinely separate claims mechanisms, not jointly dependent the way
 *    Access's capacity/demand are). `computeLeverContributions` delegates
 *    the whole `goal === "revenue" && setting !== "inpatient"` case to
 *    `computeRevenueContributions` there; see that module's header for the
 *    full chain and its reconciliation to Explore's `hccPlans`/`wrvu`/
 *    `denials` primitives.
 *  - revenue (inpatient): its OWN, GENUINELY DIFFERENT three-path decision
 *    chain, in `attainInpatientRevenue.ts` (`IP_REVENUE_LEVERS` below).
 *    Inpatient reimbursement is DRG-weight / case-mix based, not
 *    visit-level E/M coding, so none of outpatient/ED revenue's paths
 *    (HCC, wRVU, denials) apply here. A partner picks one or more of Case
 *    Mix / DRG Accuracy (CC/MCC capture), CDI Query Efficiency, and
 *    Observation / IP Status Defense; each path's own dollar is derived
 *    from its own gated decisions and reconciles exactly to Explore's
 *    `ipDrg`/`ipCdi`/`ipObsDefense` primitives, and the three paths simply
 *    SUM (each is a genuinely separate claim). `computeLeverContributions`
 *    delegates the whole `goal === "revenue" && setting === "inpatient"`
 *    case to `computeIpRevenueContributions` there; see that module's
 *    header for the full chain.
 *  - quality (nursing): rebuilt as an ORDERED DECISION CHAIN (D1 scope +
 *    event-type selection -> D2 commit to the named interventions that
 *    actually prevent EACH selected event type -> the payoff), not an
 *    independent-channel lever set, in `attainQuality.ts`. The partner
 *    picks one or more targeted event types (HAPI, CLABSI, CAUTI, Falls,
 *    Sepsis); each gets its OWN sub-panel of real, trackable clinical
 *    interventions (hourly rounding for Falls, a daily line-necessity
 *    review for CLABSI, and so on - never one generic slider shared across
 *    every event type), each contributing a fixed pp toward THAT event's
 *    own literature-grounded prevention ceiling. Each selected type's own
 *    dollar is prevented events x cost per event, read straight off its own
 *    `calc*` helper in `nursingQualityCalcs.ts`, and the types simply SUM
 *    (each is its own genuinely separate harm event, never double-counted).
 *    `computeLeverContributions` delegates the whole `goal === "quality"`
 *    case to `computeQualityContributions` there; see that module's header
 *    for the full chain, the per-event ceilings and their literature
 *    rationale, why Sepsis's own richer `calcSepsis` model feeds a
 *    realization ceiling rather than a share of all sepsis cases, and the
 *    reconciliation to Explore's `nursingHapi`/`nursingClabsi`/
 *    `nursingCauti`/`nursingFalls`/`nursingSepsis` primitives.
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
  control: "percent" | "countPerUnit" | "lines" | "toggleLevel" | "toggle";
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
  /** Curated owner-ROLE suggestions for Commit's Owner select (Change 2):
   * who else plausibly owns this exact decision at a partner site, 2-5
   * entries, always headed by `ownerRole` itself at index 0 so the select's
   * pre-selected value matches the existing default exactly. The partner
   * confirms one of these or picks "Custom..." to type a specific person or
   * title — we suggest, they decide. Curated per decision, not a generic
   * list reused across every lever. */
  ownerRoleOptions: string[];
  /** Curated signal suggestions for Commit's Signal-to-watch select(s)
   * (Change 3): what else a real owner of this decision might plausibly
   * track, 2-4 entries, always headed by `signal` itself at index 0. Same
   * "we suggest, they confirm or override with Custom..." pattern as
   * `ownerRoleOptions`. */
  signalOptions: string[];
  /** Index into `signalOptions` naming the REQUIRED "track this" signal —
   * the single best proof that this decision is actually working, the one
   * Commit shows by default with its own baseline-today capture. Every
   * OTHER curated option (and any custom signal a partner adds) is optional,
   * behind Commit's "+ Add a signal" affordance, never shown by default.
   * Omitted means index 0: this decision's own `signal`, which was already
   * curated as "the one number this decision's owner should watch" (see
   * that field's own doc) — the natural required default for nearly every
   * decision. Set explicitly only when a different curated option is
   * genuinely the better required default for a specific decision. */
  requiredSignalIndex?: number;
}

export type LeverValues = Record<string, number | string[]>;

/** The single required "track this" signal for a decision — see
 * `Lever.requiredSignalIndex`'s doc for why index 0 (the lever's own
 * `signal`) is the sensible default across nearly every decision in the
 * catalog. Falls back to `lever.signal` itself if the index is somehow out
 * of range, so this can never return a blank string. */
export function requiredSignalLabel(lever: Lever): string {
  const idx = lever.requiredSignalIndex ?? 0;
  return lever.signalOptions[idx] ?? lever.signal;
}

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
 *
 * NOT auto-applied to the Scope step's inputs — those start genuinely blank
 * (see AttainFlow's `baseline` state, initialized to `{}`) so a partner's
 * plan is always built from THEIR real numbers, never a silently-accepted
 * benchmark they never actually typed in. These figures are only ever shown
 * as the fields' "e.g., 40" style placeholders and as this function's own
 * defensible default when nothing else is available. Every downstream lever
 * already treats a missing baseline field as 0 (see the per-function
 * fallback constants below), so leaving the Scope step blank is safe: money
 * and capacity simply read $0 / 0 until the partner fills it in. */
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

/** Owner/cadence per event type for quality's per-event intervention
 * checklists (C1's headline fix) - curated per event, reusing the same role
 * vocabulary the rest of Quality's catalog already uses (Charge nurses /
 * unit leads, Unit leadership, Quality / patient safety, Nursing
 * administration, Rapid response / unit), never a generic list. */
const QUALITY_EVENT_OWNER: Record<QualityEventId, { ownerRole: string; ownerRoleOptions: string[]; defaultDue: string }> = {
  hapi: {
    ownerRole: "Charge nurses / unit leads",
    ownerRoleOptions: ["Charge nurses / unit leads", "Unit leadership", "Quality / patient safety", "Nursing administration"],
    defaultDue: "Month 2",
  },
  clabsi: {
    ownerRole: "Charge nurses / unit leads",
    ownerRoleOptions: ["Charge nurses / unit leads", "Unit leadership", "Quality / patient safety", "Nursing administration"],
    defaultDue: "Month 2",
  },
  cauti: {
    ownerRole: "Charge nurses / unit leads",
    ownerRoleOptions: ["Charge nurses / unit leads", "Unit leadership", "Quality / patient safety", "Nursing administration"],
    defaultDue: "Month 2",
  },
  falls: {
    ownerRole: "Charge nurses / unit leads",
    ownerRoleOptions: ["Charge nurses / unit leads", "Unit leadership", "Rapid response / unit", "Quality / patient safety"],
    defaultDue: "Month 2",
  },
  sepsis: {
    ownerRole: "Rapid response / unit",
    ownerRoleOptions: ["Rapid response / unit", "Charge nurses / unit leads", "Unit leadership", "Quality / patient safety"],
    defaultDue: "Month 2",
  },
};

/** Quality's per-event intervention catalog entries (C1's headline fix,
 * see `attainQuality.ts`'s module header) - built directly off
 * `QUALITY_INTERVENTIONS` so the catalog can never drift out of sync with
 * the engine's own intervention ids, labels, and weights. Each entry is a
 * `"toggle"` control (0 = not committed, 1 = committed), never a slider -
 * these are real, binary, trackable commitments a unit either has in place
 * or does not, not a rate to dial. */
const QUALITY_INTERVENTION_LEVERS: Lever[] = QUALITY_EVENT_IDS.flatMap((id) => {
  const owner = QUALITY_EVENT_OWNER[id];
  const eventLabel = QUALITY_EVENT_LABELS[id];
  const signal = QUALITY_SIGNAL_PRIMARY[id];
  const signalOptions = [signal, QUALITY_SIGNAL_SECONDARY[id], "Intervention audit pass rate, by unit"];
  const defs = QUALITY_INTERVENTIONS[id];
  return defs.map((iv) => ({
    id: iv.id,
    label: iv.label,
    help: `One of ${defs.length} named ${eventLabel} interventions. Committing to it adds ${iv.weightPp}pp toward ${eventLabel}'s own ${QUALITY_CEILING_PCT[id]}pp prevention ceiling, never another event type's.`,
    control: "toggle" as const,
    unit: "committed",
    min: 0,
    max: 1,
    step: 1,
    realityStart: 0,
    ownerRole: owner.ownerRole,
    defaultDue: owner.defaultDue,
    signal,
    ownerRoleOptions: owner.ownerRoleOptions,
    signalOptions,
  }));
});

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
      ownerRoleOptions: ["Service-line chief", "Ambulatory operations", "Practice manager", "Department chair"],
      signalOptions: ["Providers actually converting freed time into access, of those pointed at it", "Scheduled hours committed per provider", "Providers pointed at access vs enrolled"],
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
      ownerRoleOptions: ["Partner finance", "Revenue cycle / coding", "Service-line chief", "Managed care contracting"],
      signalOptions: ["Contribution margin booked per visit, this line", "Payer mix shift by line", "Average reimbursement per visit"],
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
      ownerRoleOptions: ["Ambulatory operations", "Service-line chief", "Practice manager", "Department leadership"],
      signalOptions: ["Share of freed documentation time routed to the schedule", "After-hours documentation time, per provider", "Scheduling template slots added"],
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
      ownerRoleOptions: ["Access / referral ops", "Practice manager", "Ambulatory operations", "Call center / scheduling"],
      signalOptions: ["Referral backlog size", "Days to third-next-available appointment", "Referral-to-scheduled conversion rate"],
    },
    {
      id: "accessDemandSameDayCount",
      label: "Add same-day and urgent demand",
      help: "Patients per year who would book same-day or urgent if an open slot existed for them today - a real count, not a percent of your schedule.",
      control: "countPerUnit",
      unit: "patients/yr",
      min: 0,
      max: 50_000,
      step: 10,
      realityStart: 0,
      ownerRole: "Access / referral ops",
      defaultDue: "Month 3",
      signal: "Same-day/urgent patients booked per year",
      ownerRoleOptions: ["Access / referral ops", "Ambulatory operations", "Call center / scheduling", "Practice manager"],
      signalOptions: ["Same-day/urgent patients booked per year", "Same-day slot utilization", "Urgent-visit turnaway rate"],
    },
    {
      id: "accessDemandNoShowCount",
      label: "Recover no-shows",
      help: "Patients per year recoverable by filling a no-show slot with a waiting patient instead of losing it outright - a real count. If you only know your no-show and recovery rates, D4's optional helper estimates a starting count for you.",
      control: "countPerUnit",
      unit: "patients/yr",
      min: 0,
      max: 50_000,
      step: 10,
      realityStart: 0,
      ownerRole: "Ops / staffing",
      defaultDue: "Month 3",
      signal: "No-show patients recovered per year",
      ownerRoleOptions: ["Ops / staffing", "Access / referral ops", "Practice manager", "Call center / scheduling"],
      signalOptions: ["No-show patients recovered per year", "No-show rate against booked slots", "Same-day rebooking rate"],
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
      ownerRoleOptions: ["Access / referral ops", "Practice manager", "Ambulatory operations", "Business development / outreach"],
      signalOptions: ["New referrals arriving per month", "Referral source volume by month", "Referral-to-scheduled conversion rate"],
    },
  ],
  // Retention (Workforce) is a D1-D5 DECISION CHAIN, rendered bespoke on
  // Build the case as the shared step-down ladder (`WorkforceLadderChain.tsx`,
  // every setting), not through the generic lever renderer - same convention
  // as access/revenue. This catalog entry
  // exists so Commit and the Attainment hub, which walk every goal's
  // `LEVERS[goal]` generically, keep working: one row per decision, ids
  // matching the flat `LeverValues` keys `attainWorkforce.ts` reads
  // directly. See `attainWorkforce.ts`'s `WORKFORCE_LEVER_IDS` and
  // `computeWorkforceContributions` for the engine.
  retention: [
    {
      id: "retentionLines",
      label: "Departments or cohort in scope",
      help: "Each department brought into the plan names which cohort this plan is working to keep from leaving.",
      control: "lines",
      unit: "departments",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Department leadership",
      defaultDue: "Month 1",
      signal: "Departments actively brought into the plan",
      ownerRoleOptions: ["Department leadership", "HR / workforce analytics", "Department chiefs", "Ops / staffing"],
      signalOptions: ["Departments actively brought into the plan", "Departments named in scope vs committed", "Headcount covered by department"],
    },
    {
      id: "retentionProviders",
      label: "How many providers are in scope",
      help: "The real headcount this plan is built against, capped to your Starting-point baseline. No dollar figure yet, there is no impact decided.",
      control: "countPerUnit",
      unit: "providers",
      min: 0,
      max: 2_000,
      step: 1,
      realityStart: 0,
      ownerRole: "Department leadership",
      defaultDue: "Month 1",
      signal: "Providers actually covered by the plan, of those named in scope",
      ownerRoleOptions: ["Department leadership", "HR / workforce analytics", "Department chiefs", "Finance / HR"],
      signalOptions: ["Providers actually covered by the plan, of those named in scope", "Headcount in scope vs baseline census", "FTE coverage ratio"],
    },
    {
      id: "retentionTurnoverRate",
      label: "Your current voluntary turnover rate",
      help: "The rate departures avoided is measured against, your own number, not an assumed benchmark.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 40,
      step: 1,
      realityStart: 0,
      ownerRole: "HR / workforce analytics",
      defaultDue: "Month 1",
      signal: "Voluntary turnover rate against this baseline",
      ownerRoleOptions: ["HR / workforce analytics", "Department leadership", "Finance / HR", "HR / people analytics"],
      signalOptions: ["Voluntary turnover rate against this baseline", "Departures per month against this baseline", "Exit-survey burnout mentions"],
    },
    {
      id: "retentionReplacementCost",
      label: "Set the replacement cost per departure",
      help: "The dollar every avoided departure is actually worth, your own number. Benchmarked but never assumed: physicians run $250K-$500K, nurses lower.",
      control: "countPerUnit",
      unit: "$/departure",
      min: 0,
      max: 600_000,
      step: 5_000,
      realityStart: 0,
      ownerRole: "Finance / HR",
      defaultDue: "Month 1",
      signal: "Replacement cost booked per avoided departure",
      ownerRoleOptions: ["Finance / HR", "Partner finance", "HR / workforce analytics", "Department leadership"],
      signalOptions: ["Replacement cost booked per avoided departure", "Time-to-fill per open role", "Recruiting and onboarding spend per hire"],
    },
    {
      id: "retentionProtect",
      label: "Protect the recovered relief",
      help: "The share of freed documentation time held down and not refilled by a bigger panel or a covering shift. This is the core lever that moves likelihood-to-stay.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Department leadership",
      defaultDue: "Month 2",
      signal: "After-hours documentation load against the floor",
      ownerRoleOptions: ["Department leadership", "Ops / staffing", "HR / people analytics", "Department chiefs"],
      signalOptions: ["After-hours documentation load against the floor", "Panel size or shift load vs floor", "Freed time reinvested into relief"],
    },
    {
      id: "retentionSurveyCadence",
      label: "Run a likelihood-to-stay and burnout pulse",
      help: "A short pulse, not the annual engagement survey, is both the intervention that catches erosion early and the signal this plan watches later.",
      control: "toggleLevel",
      unit: "cadence",
      min: 0,
      max: 2,
      step: 1,
      realityStart: 0,
      ownerRole: "HR / people analytics",
      defaultDue: "Month 2",
      signal: "Likelihood-to-stay and burnout pulse score, checked at this cadence",
      ownerRoleOptions: ["HR / people analytics", "Department leadership", "HR / workforce analytics", "Department chiefs"],
      signalOptions: ["Likelihood-to-stay and burnout pulse score, checked at this cadence", "Survey response rate", "Burnout flag rate among respondents"],
    },
    {
      id: "retentionBackfill",
      label: "Backfill coverage gaps",
      help: "Backfilling an open shift or panel before the remaining staff absorb it is what keeps the recovered relief from being clawed back.",
      control: "toggleLevel",
      unit: "coverage level",
      min: 0,
      max: 2,
      step: 1,
      realityStart: 0,
      ownerRole: "Ops / staffing",
      defaultDue: "Month 2",
      signal: "Coverage-gap backfill level",
      ownerRoleOptions: ["Ops / staffing", "Department leadership", "HR / workforce analytics", "Department chiefs"],
      signalOptions: ["Coverage-gap backfill level", "Open shifts covered within target window", "Coverage-gap hours per month"],
    },
    {
      id: "retentionSustain",
      label: "Sustain it",
      help: "Relief that holds for more months compounds into a larger share of the departures this plan is working to avoid. Zero months held is zero departures avoided.",
      control: "countPerUnit",
      unit: "months sustained",
      min: 0,
      max: 12,
      step: 1,
      realityStart: 0,
      ownerRole: "Department chiefs",
      defaultDue: "Month 3",
      signal: "Months the relief floor has held",
      ownerRoleOptions: ["Department chiefs", "Department leadership", "HR / workforce analytics", "Ops / staffing"],
      signalOptions: ["Months the relief floor has held", "Consecutive months relief floor held", "Departure rate trend vs baseline"],
    },
  ],
  // Revenue is a THREE-PATH decision chain for outpatient/ED (Risk
  // Adjustment / E/M Level Accuracy / Medical Necessity Denials), rendered
  // bespoke on Build the case (`RevenueDecisionChain.tsx`), not through the
  // generic lever renderer - same convention as access. This catalog entry
  // exists so Commit and Your Plan, which walk every goal's `leversFor`
  // generically, keep working: one row per decision, ids matching the flat
  // `LeverValues` keys `attainRevenue.ts` reads directly. Path/population
  // SCOPE choices (`revenuePaths`, `revenueHccPopulations`) are UI-only, not
  // separately tracked here, the same way access's `accessLines` isn't. See
  // `attainRevenue.ts`'s `REVENUE_LEVER_IDS` and `computeRevenueContributions`
  // for the engine. Inpatient revenue is its OWN three-path chain on a
  // different mechanism (DRG/CDI/obs-defense, not HCC/wRVU/denials) - see
  // `IP_REVENUE_LEVERS` below and `attainInpatientRevenue.ts`.
  revenue: [
    {
      id: "revenueHccRecapture",
      label: "Recapture dropped HCCs",
      help: "A condition documented before that quietly dropped off recapture is not revenue. This is the recapture uplift you are actually committing to, above today's rate.",
      control: "percent",
      unit: "pp uplift",
      min: 0,
      max: 15,
      step: 1,
      realityStart: 0,
      ownerRole: "Risk adjustment / coding",
      defaultDue: "Month 2",
      signal: "Recapture rate on the risk-adjustment gap",
      ownerRoleOptions: ["Risk adjustment / coding", "CDI + providers", "Partner finance", "Revenue cycle / coding"],
      signalOptions: ["Recapture rate on the risk-adjustment gap", "Chart-level HCC drop rate", "RAF score trend vs prior period"],
    },
    {
      id: "revenueHccNetNew",
      label: "Surface suspected and net-new HCCs",
      help: "A condition never coded before is not a recapture, it is a first-time discovery. This is the share of your risk-adjustment panel where ambient surfaces one.",
      control: "percent",
      unit: "% discovery",
      min: 0,
      max: 20,
      step: 1,
      realityStart: 0,
      ownerRole: "Risk adjustment / coding",
      defaultDue: "Month 2",
      signal: "Suspected-HCC discovery rate",
      ownerRoleOptions: ["Risk adjustment / coding", "CDI + providers", "Revenue cycle / coding", "Partner finance"],
      signalOptions: ["Suspected-HCC discovery rate", "New conditions surfaced per ambient note", "Provider acceptance rate on surfaced suggestions"],
    },
    {
      id: "revenueHccValuePerHcc",
      label: "Set the value per HCC",
      help: "The dollar every recaptured or net-new condition above is actually worth, once coded and accepted.",
      control: "countPerUnit",
      unit: "$/HCC",
      min: 0,
      max: 5_000,
      step: 50,
      realityStart: 0,
      ownerRole: "Partner finance",
      defaultDue: "Month 1",
      signal: "Value booked per captured HCC",
      ownerRoleOptions: ["Partner finance", "Risk adjustment / coding", "Managed care contracting", "Revenue cycle / coding"],
      signalOptions: ["Value booked per captured HCC", "Payer mix across the risk-adjusted panel", "Realized RAF-to-dollar conversion"],
    },
    {
      id: "revenueEmLift",
      label: "Lift E/M level and wRVU accuracy",
      help: "Documented complexity that never reaches the coded level is not revenue. This is the wRVU lift you are committing to, above today's average level.",
      control: "percent",
      unit: "% lift",
      min: 0,
      max: 15,
      step: 1,
      realityStart: 0,
      ownerRole: "Revenue cycle / coding",
      defaultDue: "Month 2",
      signal: "Average E/M level or wRVU per visit",
      ownerRoleOptions: ["Revenue cycle / coding", "CDI + providers", "Billing", "Partner finance"],
      signalOptions: ["Average E/M level or wRVU per visit", "Coding-level distribution vs documented complexity", "Chart audit pass rate"],
    },
    {
      id: "revenueEmConversionFactor",
      label: "Enter your conversion factor",
      help: "The dollar every extra wRVU is actually worth once billed, your own negotiated rate, not a benchmark.",
      control: "countPerUnit",
      unit: "$/wRVU",
      min: 0,
      max: 100,
      step: 1,
      realityStart: 0,
      ownerRole: "Partner finance",
      defaultDue: "Month 1",
      signal: "Conversion factor booked per wRVU",
      ownerRoleOptions: ["Partner finance", "Revenue cycle / coding", "Managed care contracting", "Billing"],
      signalOptions: ["Conversion factor booked per wRVU", "Payer-negotiated rate changes", "Realized wRVU-to-dollar conversion"],
    },
    {
      id: "revenueDenialsPreventable",
      label: "Prevent avoidable medical-necessity denials",
      help: "A denial that never should have happened still costs the claim. This is the share of your medical-necessity denials cleaner documentation actually prevents.",
      control: "percent",
      unit: "% preventable",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Billing",
      defaultDue: "Month 3",
      signal: "First-pass rate / denial rate on medical-necessity claims",
      ownerRoleOptions: ["Billing", "Revenue cycle / coding", "Case management / utilization review", "Partner finance"],
      signalOptions: ["First-pass rate / denial rate on medical-necessity claims", "Denial appeal win rate", "Days in A/R on denied claims"],
    },
    {
      id: "revenueDenialsAvgClaimValue",
      label: "Set the average claim value",
      help: "The dollar every prevented medical-necessity denial actually protects. Priced at claim value, not contribution margin, on purpose: the care was already delivered before the denial, so there is no new variable cost to net out, unlike a brand-new visit.",
      control: "countPerUnit",
      unit: "$/claim",
      min: 0,
      max: 10_000,
      step: 50,
      realityStart: 0,
      ownerRole: "Partner finance",
      defaultDue: "Month 1",
      signal: "Average claim value protected",
      ownerRoleOptions: ["Partner finance", "Billing", "Revenue cycle / coding", "Managed care contracting"],
      signalOptions: ["Average claim value protected", "Payer mix on denied claims", "Average claim value overall"],
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
      ownerRoleOptions: ["Unit leadership", "Charge nurses / unit leads", "Quality / patient safety", "Rapid response / unit"],
      signalOptions: ["Units actively brought into the plan", "Units named in scope vs committed", "Patient-days covered by unit"],
    },
    {
      id: "qualityBeds",
      label: "How many beds are in scope",
      help: "The real bed count this plan is built against, capped to your Starting-point baseline. No dollar figure yet, there is no prevention rate decided.",
      control: "countPerUnit",
      unit: "beds",
      min: 0,
      max: 2_000,
      step: 1,
      realityStart: 0,
      ownerRole: "Unit leadership",
      defaultDue: "Month 1",
      signal: "Beds actually covered by the plan, of those named in scope",
      ownerRoleOptions: ["Unit leadership", "Charge nurses / unit leads", "Quality / patient safety", "Nursing administration"],
      signalOptions: ["Beds actually covered by the plan, of those named in scope", "Bed coverage vs baseline census", "Patient-days in scope per month"],
    },
    ...QUALITY_INTERVENTION_LEVERS,
  ],
  // Capacity (nursing) = OVERTIME reduction, a single gated ladder rendered
  // bespoke on Build the case (`CapacityLadderChain.tsx`), not through the
  // generic lever renderer - same convention as access/quality. This catalog
  // entry exists so Commit and the Attainment hub, which walk every goal's
  // `LEVERS[goal]` generically, keep working: one row per decision, ids
  // matching the flat `LeverValues` keys `attainCapacity.ts` reads directly.
  // See `attainCapacity.ts`'s `CAPACITY_LEVER_IDS` and
  // `computeCapacityContributions` for the engine, which reconciles to
  // Explore's own `nursingOvertime` driver.
  capacity: [
    {
      id: "capacityLines",
      label: "Units in scope",
      help: "Each unit brought into the plan adds its nurses to the overtime this plan is working to bring down.",
      control: "lines",
      unit: "units",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Nursing operations",
      defaultDue: "Month 1",
      signal: "Units actively brought into the plan",
      ownerRoleOptions: ["Nursing operations", "Charge nurses / unit leads", "Unit leadership", "Nursing administration"],
      signalOptions: ["Units actively brought into the plan", "Units named in scope vs committed", "Nurses covered by unit"],
    },
    {
      id: "capacityNurses",
      label: "How many nurses are in scope",
      help: "The real nurse count this plan is built against, capped to your Starting-point baseline. No dollar figure yet, there is no overtime decided.",
      control: "countPerUnit",
      unit: "nurses",
      min: 0,
      max: 4_000,
      step: 1,
      realityStart: 0,
      ownerRole: "Nursing operations",
      defaultDue: "Month 1",
      signal: "Nurses actually covered by the plan, of those named in scope",
      ownerRoleOptions: ["Nursing operations", "Charge nurses / unit leads", "Unit leadership", "Nursing administration"],
      signalOptions: ["Nurses actually covered by the plan, of those named in scope", "Headcount in scope vs baseline FTEs", "Nurse coverage ratio"],
    },
    {
      id: "capacityOtHoursPerWeek",
      label: "Overtime hours per nurse per week",
      help: "Your own current overtime, per nurse, per week. This is the pool the documentation-attributable share is measured against, not a benchmark you never checked.",
      control: "countPerUnit",
      unit: "OT hrs/wk",
      min: 0,
      max: 20,
      step: 0.5,
      realityStart: 0,
      ownerRole: "HR / nursing operations",
      defaultDue: "Month 1",
      signal: "Overtime hours per nurse per week, against this baseline",
      ownerRoleOptions: ["HR / nursing operations", "Nursing operations", "Finance / nursing", "Nursing administration"],
      signalOptions: ["Overtime hours per nurse per week, against this baseline", "Total overtime hours per month", "Late shift finishes per week"],
    },
    {
      id: "capacityOtRate",
      label: "Set the loaded overtime rate",
      help: "The fully loaded overtime hourly rate, base pay plus the overtime premium, your own number. Every overtime hour avoided is worth this.",
      control: "countPerUnit",
      unit: "$/hr",
      min: 0,
      max: 300,
      step: 5,
      realityStart: 0,
      ownerRole: "Finance / nursing",
      defaultDue: "Month 1",
      signal: "Loaded overtime rate booked per hour",
      ownerRoleOptions: ["Finance / nursing", "HR / nursing operations", "Partner finance", "Nursing administration"],
      signalOptions: ["Loaded overtime rate booked per hour", "Overtime premium multiplier", "Blended overtime cost per hour"],
    },
    {
      id: "capacityDocShare",
      label: "Diagnose the leak: the documentation-driven share of overtime",
      help: "Of your overtime, the share driven by charting after the shift, batching notes, and missed lunches, versus short staffing or a census surge, which Abridge cannot touch. Only the documentation-driven share is yours to cut, so it is the ceiling.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Nursing operations",
      defaultDue: "Month 1",
      signal: "Share of overtime attributable to documentation",
      ownerRoleOptions: ["Nursing operations", "Charge nurses / unit leads", "HR / nursing operations", "Nursing administration"],
      signalOptions: ["Share of overtime attributable to documentation", "Overtime reason-code mix, charting vs staffing or census", "After-shift charting time per nurse"],
    },
    {
      id: "capacityConversion",
      label: "Commit to the share of that overtime you remove",
      help: "The conservative share of the documentation-driven overtime this plan actually removes, once the freed minute lands on the shift. This is the one decision that turns the ceiling into overtime hours avoided.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Nursing operations",
      defaultDue: "Month 2",
      signal: "On-time shift completion %",
      ownerRoleOptions: ["Nursing operations", "Charge nurses / unit leads", "Unit leadership", "Nursing administration"],
      signalOptions: ["On-time shift completion %", "Overtime hours avoided vs the documentation-attributable pool", "Missed-lunch rate"],
    },
  ],
};

/**
 * Inpatient revenue's own, unrelated catalog - Case Mix/DRG Accuracy, CDI
 * Query Efficiency, and Observation/IP Status Defense, a genuinely
 * different mechanism from outpatient/ED (documentation-driven case weight
 * and query/downgrade cost avoidance, not HCC/wRVU/denials). Rebuilt as its
 * own THREE-PATH decision chain, rendered bespoke on Build the case
 * (`InpatientRevenueDecisionChain.tsx`), not through the generic lever
 * renderer - same convention as outpatient/ED revenue. This catalog entry
 * exists so Commit and the Attainment hub, which walk every goal's
 * `leversFor` generically, keep working: one row per decision, ids matching
 * the flat `LeverValues` keys `attainInpatientRevenue.ts` reads directly.
 * Path SCOPE choice (`ipRevenuePaths`) is UI-only, not separately tracked
 * here, the same way outpatient revenue's `revenuePaths` isn't. See
 * `attainInpatientRevenue.ts`'s `IP_REVENUE_LEVER_IDS` and
 * `computeIpRevenueContributions` for the engine.
 */
export const IP_REVENUE_LEVERS: Lever[] = [
  {
    id: "ipDrgAtRiskRate",
    label: "Count your current at-risk DRG rate",
    help: "The share of admissions with documentation gaps large enough to risk grouping at a lower-weight DRG. Your own number, not a benchmark you never checked.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 60,
    step: 1,
    realityStart: 0,
    ownerRole: "CDI / coding leadership",
    defaultDue: "Month 1",
    signal: "At-risk DRG rate, measured against this baseline",
    ownerRoleOptions: ["CDI / coding leadership", "CDI + hospitalists", "Revenue cycle / coding", "Case management / utilization review"],
    signalOptions: ["At-risk DRG rate, measured against this baseline", "Charts flagged for documentation gaps", "CC/MCC capture rate trend"],
  },
  {
    id: "ipDrgCapture",
    label: "Set the CC/MCC capture improvement you are committing to",
    help: "A comorbidity or complication that is documented but never coded specifically enough is not a captured DRG. This is the share of your AT-RISK admissions (not your overall capture rate) this plan commits to newly capturing.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 30,
    step: 1,
    realityStart: 0,
    ownerRole: "CDI + hospitalists",
    defaultDue: "Month 2",
    signal: "Case mix index / CC-MCC capture rate",
    ownerRoleOptions: ["CDI + hospitalists", "CDI / coding leadership", "Revenue cycle / coding", "CDI + providers"],
    signalOptions: ["Case mix index / CC-MCC capture rate", "Query response rate from hospitalists", "Case mix index trend"],
  },
  {
    id: "ipDrgWeightIncrease",
    label: "Set the average DRG weight lift",
    help: "The average DRG weight difference a captured comorbidity or complication actually adds, once coded and accepted.",
    control: "countPerUnit",
    unit: "DRG weight",
    min: 0,
    max: 1,
    step: 0.05,
    realityStart: 0,
    ownerRole: "Revenue cycle / coding",
    defaultDue: "Month 1",
    signal: "Average DRG weight per captured case",
    ownerRoleOptions: ["Revenue cycle / coding", "CDI / coding leadership", "Partner finance", "CDI + hospitalists"],
    signalOptions: ["Average DRG weight per captured case", "DRG weight distribution vs prior period", "Coding audit accuracy rate"],
  },
  {
    id: "ipDrgBasePayment",
    label: "Set the base DRG payment per case",
    help: "The base payment per case the weight lift above is actually multiplied against, your own contracted rate.",
    control: "countPerUnit",
    unit: "$/case",
    min: 0,
    max: 20_000,
    step: 250,
    realityStart: 0,
    ownerRole: "Partner finance",
    defaultDue: "Month 1",
    signal: "Base DRG payment per case",
    ownerRoleOptions: ["Partner finance", "Revenue cycle / coding", "Managed care contracting", "CDI / coding leadership"],
    signalOptions: ["Base DRG payment per case", "Payer mix across DRG-weighted cases", "Contracted rate changes by payer"],
  },
  {
    id: "ipCdiQueryRate",
    label: "Count your current CDI query rate",
    help: "The share of eligible admissions that generate a physician query today. Your own number, not an assumed one.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 60,
    step: 1,
    realityStart: 0,
    ownerRole: "CDI leadership",
    defaultDue: "Month 1",
    signal: "CDI query volume, measured against this baseline",
    ownerRoleOptions: ["CDI leadership", "CDI + providers", "CDI / coding leadership", "Revenue cycle"],
    signalOptions: ["CDI query volume, measured against this baseline", "Query volume per eligible admission", "Query response time"],
  },
  {
    id: "ipCdiReduction",
    label: "Set the query-volume reduction you are targeting",
    help: "A query that still gets generated still costs CDI staff time to chase, whether or not it closes in time. This is the share of today's query volume this plan avoids generating in the first place, because the note is complete enough up front.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "CDI + providers",
    defaultDue: "Month 2",
    signal: "CDI query rate",
    ownerRoleOptions: ["CDI + providers", "CDI leadership", "CDI / coding leadership", "Hospitalists"],
    signalOptions: ["CDI query rate", "Query volume avoided per admission", "Query aging past discharge"],
  },
  {
    id: "ipCdiCostPerQuery",
    label: "Set the admin cost avoided per query",
    help: "The CDI-staff time every avoided query no longer costs to generate, track, and chase. Admin cost only, capped at $200/query on purpose so it can never restate the DRG reimbursement already booked in the DRG path above.",
    control: "countPerUnit",
    unit: "$/query",
    min: 0,
    max: 200,
    step: 10,
    realityStart: 0,
    ownerRole: "Revenue cycle",
    defaultDue: "Month 1",
    signal: "Admin cost avoided per query",
    ownerRoleOptions: ["Revenue cycle", "Partner finance", "CDI leadership", "CDI / coding leadership"],
    signalOptions: ["Admin cost avoided per query", "Query volume avoided vs generated", "CDI specialist time per query trend"],
  },
  {
    id: "ipObsDenialRate",
    label: "Count your current observation downgrade rate",
    help: "The share of eligible admissions downgraded from inpatient to observation status today. Your own number, not a benchmark you never checked.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 30,
    step: 1,
    realityStart: 0,
    ownerRole: "Case management / utilization review",
    defaultDue: "Month 1",
    signal: "Observation downgrade volume, measured against this baseline",
    ownerRoleOptions: ["Case management / utilization review", "CDI leadership", "Case management / CDI", "Revenue cycle / coding"],
    signalOptions: ["Observation downgrade volume, measured against this baseline", "Status downgrade volume by month", "Payer denial rate on observation stays"],
  },
  {
    id: "ipObsPreventable",
    label: "Set the preventable share you are targeting",
    help: "A downgrade driven by documentation that under-specified severity of illness is preventable. This is the share cleaner documentation actually prevents, above today's zero.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "Case management / CDI",
    defaultDue: "Month 2",
    signal: "Observation downgrade rate",
    ownerRoleOptions: ["Case management / CDI", "Case management / utilization review", "CDI leadership", "CDI + providers"],
    signalOptions: ["Observation downgrade rate", "Severity-of-illness documentation completeness", "Downgrade appeal win rate"],
  },
  {
    id: "ipObsRevenueDelta",
    label: "Set the revenue delta per defended case",
    help: "The dollar an inpatient status successfully defended is worth over an observation stay, your own contracted rate.",
    control: "countPerUnit",
    unit: "$/case",
    min: 0,
    max: 20_000,
    step: 250,
    realityStart: 0,
    ownerRole: "Partner finance",
    defaultDue: "Month 1",
    signal: "Revenue delta per defended case",
    ownerRoleOptions: ["Partner finance", "Case management / utilization review", "Revenue cycle / coding", "Managed care contracting"],
    signalOptions: ["Revenue delta per defended case", "Payer mix on defended cases", "Average revenue delta trend"],
  },
];

/**
 * ED access's own, unrelated catalog — recovering LWBS patients and
 * capturing downstream admissions, a genuinely different mechanism from
 * outpatient's schedule-capacity model (`LEVERS.access`). Rendered bespoke
 * on Build the case (`EdAccessDecisionChain.tsx`), not through the generic
 * lever renderer. Ids match the flat `LeverValues` keys `attainEdAccess.ts`
 * reads directly. See `attainEdAccess.ts`'s `ED_ACCESS_LEVER_IDS` and
 * `computeEdAccessContributions` for the engine.
 */
export const ED_ACCESS_LEVERS: Lever[] = [
  {
    id: "edAccessProviders",
    label: "Point ED providers at recovery",
    help: "Providers actually committed to converting freed charting time into faster throughput are the scope every decision below is built from.",
    control: "countPerUnit",
    unit: "providers",
    min: 0,
    max: 500,
    step: 1,
    realityStart: 0,
    ownerRole: "ED medical director",
    defaultDue: "Month 1",
    signal: "Providers actually converting freed charting time into faster throughput, of those pointed at it",
    ownerRoleOptions: ["ED medical director", "ED operations", "ED operations / quality", "Department chair"],
    signalOptions: ["Providers actually converting freed charting time into faster throughput, of those pointed at it", "Scheduled charting time committed per provider", "Providers pointed at recovery vs enrolled"],
  },
  {
    id: "edAccessMarginPerVisit",
    label: "Set contribution margin per recovered visit",
    help: "Contribution margin, not charges. This is what one more ED visit is actually worth to the bottom line on an already-staffed shift, benchmarked but your own number.",
    control: "countPerUnit",
    unit: "$/visit",
    min: 0,
    max: 2_000,
    step: 10,
    realityStart: 0,
    ownerRole: "Partner finance",
    defaultDue: "Month 1",
    signal: "Contribution margin booked per recovered ED visit",
    ownerRoleOptions: ["Partner finance", "ED operations", "Managed care contracting", "Revenue cycle / coding"],
    signalOptions: ["Contribution margin booked per recovered ED visit", "Payer mix on recovered ED visits", "Average reimbursement per ED visit"],
  },
  {
    id: "edAccessAdmissionMargin",
    label: "Set margin per downstream admission",
    help: "A recovered visit and the admission it sometimes becomes are not the same claim. This is what one more admission is worth.",
    control: "countPerUnit",
    unit: "$/admission",
    min: 0,
    max: 20_000,
    step: 250,
    realityStart: 0,
    ownerRole: "Partner finance",
    defaultDue: "Month 1",
    signal: "Margin booked per captured admission",
    ownerRoleOptions: ["Partner finance", "ED operations / case management", "Managed care contracting", "Revenue cycle / coding"],
    signalOptions: ["Margin booked per captured admission", "Payer mix on captured admissions", "Admission conversion margin trend"],
  },
  {
    id: "edAccessMinutesSaved",
    label: "Set target minutes saved per note",
    help: "How much documentation time Abridge is expected to save on the average ED note, a planning target rather than a measured result. The freed time this creates is what the throughput commitment below actually converts into recovered patients.",
    control: "countPerUnit",
    unit: "min/note",
    min: 0,
    max: 60,
    step: 1,
    realityStart: 0,
    ownerRole: "ED operations",
    defaultDue: "Month 1",
    signal: "Charting minutes per note, median",
    ownerRoleOptions: ["ED operations", "ED medical director", "ED operations / quality", "Charge nurses / unit leads"],
    signalOptions: ["Charting minutes per note, median", "Door-to-provider time, median", "Provider time to disposition"],
  },
  {
    id: "edAccessHoursPerRecovery",
    label: "Set hours of throughput time per recovered patient",
    help: "How many provider-hours of committed, expedited attention it typically takes to bring back one patient who would otherwise have left. A real assumption, editable, not a hidden constant.",
    control: "countPerUnit",
    unit: "hrs/patient",
    min: 0.25,
    max: 8,
    step: 0.25,
    realityStart: 0,
    ownerRole: "ED operations",
    defaultDue: "Month 1",
    signal: "Provider-hours of expedited throughput time per recovered patient, measured",
    ownerRoleOptions: ["ED operations", "ED medical director", "ED operations / quality", "Charge nurses / unit leads"],
    signalOptions: ["Provider-hours of expedited throughput time per recovered patient, measured", "Fast-track cycle time, median", "Door-to-provider time trend"],
  },
  {
    id: "edAccessThroughputShare",
    label: "Commit freed time to faster throughput",
    help: "The share of freed charting time committed to faster door-to-provider throughput, instead of staying as protected relief. This is the one decision that mechanically turns freed time into recovered patients.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "ED medical director",
    defaultDue: "Month 2",
    signal: "Freed charting time actually committed to throughput, of the hour freed",
    ownerRoleOptions: ["ED medical director", "ED operations / quality", "ED operations", "ED operations / case management"],
    signalOptions: ["Freed charting time actually committed to throughput, of the hour freed", "Recovered LWBS pool realized vs mechanically enabled", "Door-to-provider time trend"],
  },
  {
    id: "edAccessLwbsRate",
    label: "Count your current LWBS rate",
    help: "The rate the recoverable pool, and everything downstream of it, is measured against. Your own number, not a benchmark you never checked.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 50,
    step: 1,
    realityStart: 0,
    ownerRole: "ED operations / quality",
    defaultDue: "Month 1",
    signal: "LWBS rate, measured against this baseline",
    ownerRoleOptions: ["ED operations / quality", "ED medical director", "ED operations", "ED operations / case management"],
    signalOptions: ["LWBS rate, measured against this baseline", "LWBS volume by shift", "Door-to-provider time trend"],
  },
  {
    id: "edAccessDocCausedShare",
    label: "Diagnose the leak: the charting-caused share of LWBS",
    help: "Of the patients who leave without being seen, the share that leaves because charting time chokes throughput, which Abridge can move, versus short staffing or no beds, which it cannot. Only the charting-caused share is recoverable.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "ED operations / quality",
    defaultDue: "Month 1",
    signal: "Share of LWBS attributable to documentation-choked throughput",
    ownerRoleOptions: ["ED operations / quality", "ED medical director", "ED operations", "ED operations / case management"],
    signalOptions: ["Share of LWBS attributable to documentation-choked throughput", "LWBS reason-code mix, throughput vs staffing or beds", "Door-to-provider time trend"],
  },
  {
    id: "edAccessAdmissionRate",
    label: "Set the share who become admissions",
    help: "Not every recovered patient is admitted. This is the share of realized recovery that converts to a downstream admission attempt.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "ED operations / case management",
    defaultDue: "Month 2",
    signal: "Share of recovered patients captured as admission attempts",
    ownerRoleOptions: ["ED operations / case management", "ED medical director", "ED operations / quality", "ED operations"],
    signalOptions: ["Share of recovered patients captured as admission attempts", "Admission conversion rate by shift", "Recovered-visit acuity mix"],
  },
  {
    id: "edAccessAdmissionRealization",
    label: "Set the admission realization rate",
    help: "Not every admission attempt finds an empty bed or a payer-accepted stay. This is the honest cap on the admission leg, bed availability and payer mix.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "ED operations / case management",
    defaultDue: "Month 2",
    signal: "Admission attempts that actually realize as a booked stay",
    ownerRoleOptions: ["ED operations / case management", "Partner finance", "Managed care contracting", "ED operations"],
    signalOptions: ["Admission attempts that actually realize as a booked stay", "Bed availability at admission attempt", "Payer mix on captured admissions"],
  },
];

/** The real lever catalog for a (goal, setting) pair. Every goal except
 * access and revenue is setting-independent (retention/quality vary their
 * line PRESETS by setting, never their catalog shape). Access and revenue
 * are the two goals whose catalog structurally differs by setting: access
 * at ED is a genuinely different LWBS/throughput mechanism
 * (`ED_ACCESS_LEVERS`) from outpatient's schedule-capacity model
 * (`LEVERS.access`); revenue's outpatient/ED get the three-path chain
 * (`LEVERS.revenue`), inpatient gets its OWN three-path chain
 * (`IP_REVENUE_LEVERS`) — a different mechanism, not the same catalog. See
 * `attainInpatientRevenue.ts`'s module header. `setting` is optional so
 * every existing non-setting-aware call site keeps compiling; omitting it
 * for access or revenue defaults to the (more common) outpatient catalog. */
export function leversFor(goal: GoalId, setting?: AttainSetting): Lever[] {
  if (goal === "access" && setting === "ed") return ED_ACCESS_LEVERS;
  if (goal === "revenue" && setting === "inpatient") return IP_REVENUE_LEVERS;
  return LEVERS[goal];
}

/** All levers at their `realityStart`, the plan before the partner has
 * decided to do anything new. */
export function defaultLeverValues(goal: GoalId, setting?: AttainSetting): LeverValues {
  const values: LeverValues = {};
  for (const lever of leversFor(goal, setting)) {
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
    access: ["Primary Care", "Cardiology", "Endocrinology", "Neurology"],
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
    capacity: ["Med-Surg", "ICU", "Step-Down"],
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

// ────────────────────────────────────────────────────────────────────────
// Baseline helpers - turn the partner's operational baseline into the
// numbers the (now-unreachable, see `channelValue` below) generic channel
// architecture needs, falling back to the original illustrative constants
// whenever a field is missing.
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

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

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

// RETENTION / WORKFORCE no longer runs through this leave-one-out channel
// architecture - it is a decision chain, computed by
// `computeWorkforceContributions` in `attainWorkforce.ts` and wired directly
// into `computeLeverContributions` and `computeMultiGoalContributions` below,
// for the same reason ACCESS is excluded (see above): D2-D5 combine through
// a joint composite impact, not independent parallel channels.

// REVENUE (every setting) no longer runs through this leave-one-out channel
// architecture either — outpatient/ED delegate whole to
// `computeRevenueContributions` (`attainRevenue.ts`) and inpatient delegates
// whole to `computeIpRevenueContributions` (`attainInpatientRevenue.ts`),
// both dispatched directly from `computeLeverContributions` below, for the
// same reason ACCESS/RETENTION are excluded above: each is a gated decision
// chain (or, for revenue, several chosen paths summed), not independent
// parallel percent/count channels.

// QUALITY is no longer an independent-channel goal - it is a decision chain,
// computed by `computeQualityContributions` in `attainQuality.ts` and wired
// directly into `computeLeverContributions` below, for the same reason
// access/retention/revenue are excluded (see above): the targeted event
// types are selected in D1 and their dollars are summed, not swept as
// independent parallel channels.

// ────────────────────────────────────────────────────────────────────────
// Combined contribution math
// ────────────────────────────────────────────────────────────────────────

/** Every current goal is dispatched to its own bespoke decision-chain
 * module before reaching `computeLeverContributions`'s generic branch below
 * (see that function's own comment), so no goal currently routes through
 * this independent-channel architecture. Kept as a `ZERO`-returning stub,
 * along with the generic `engineValue` sweep below, only so a future goal
 * added without its own bespoke chain has a fallback shape that compiles
 * and behaves sanely (every lever contributing exactly $0) rather than
 * missing entirely. */
function channelValue(
  _goal: GoalId,
  _setting: AttainSetting,
  _units: number,
  _leverId: string,
  _raw: number | string[] | undefined,
  _baseline: AttainBaseline,
): ChannelValue {
  return ZERO;
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
 *
 * REVENUE is the second goal excluded, at EVERY setting - outpatient/ED
 * delegates whole to `computeRevenueContributions` (`attainRevenue.ts`,
 * three paths: Risk Adjustment / E/M / Denials); inpatient delegates whole
 * to `computeIpRevenueContributions` (`attainInpatientRevenue.ts`, its own
 * three paths: Case Mix/DRG Accuracy / CDI Query Efficiency / Observation-
 * IP Status Defense, a genuinely different mechanism). Both are gated
 * decision chains whose chosen paths simply sum, not independent percent/
 * count channels a leave-one-out subtraction could isolate cleanly.
 *
 * RETENTION / WORKFORCE (every setting) is the third goal excluded - it
 * delegates whole to `computeWorkforceContributions` (`attainWorkforce.ts`),
 * its D2 (protect) -> D3 (survey) -> D4 (backfill) -> D5 (sustain) decisions
 * combine multiplicatively/additively into one composite impact percent
 * before the payoff, not independent parallel channels.
 *
 * QUALITY (nursing) is the fourth goal excluded - it delegates whole to
 * `computeQualityContributions` (`attainQuality.ts`), because the partner's
 * D1 event-type selection determines WHICH `calc*` helpers even run, and
 * each selected type's own prevented-events dollar is summed, not swept as
 * independent parallel percent/count channels.
 */
export function computeLeverContributions(
  goal: GoalId,
  setting: AttainSetting,
  baseline: AttainBaseline,
  values: LeverValues,
): LeverContributionsResult {
  if (goal === "access") return setting === "ed" ? computeEdAccessContributions(baseline, values) : computeAccessContributions(baseline, values);
  if (goal === "revenue") return setting === "inpatient" ? computeIpRevenueContributions(baseline, values) : computeRevenueContributions(baseline, setting, values);
  if (goal === "retention") return computeWorkforceContributions(baseline, setting, values);
  if (goal === "quality") return computeQualityContributions(baseline, values);
  if (goal === "capacity") return computeCapacityContributions(baseline, values);

  const levers = leversFor(goal, setting);
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

// ────────────────────────────────────────────────────────────────────────
// Realization rate — attribution, layered on top of the engine's own
// dollar. Attain deliberately reads the full derived dollar for a
// committed decision chain (unlike Explore, it does not apply a
// realization haircut, because each decision already caps itself). But a
// partner may be running MULTIPLE efforts against the same outcome (their
// own initiative, a different vendor, a parallel program), so this is the
// dial that lets them credit only the share of a priority's outcome that
// actually belongs to THIS plan. Default 100 (full credit, identical to
// today's number); a partner only ever dials it DOWN, never up.
//
// `applyRealization` is the ONE place this scaling happens, called once
// per goal inside `computeMultiGoalContributions` below, immediately after
// that goal's raw (unscaled) chain result is computed and before it is
// folded into `byGoal`/`combinedMargin`/`combinedCount`. Every downstream
// consumer (AttainLivePanel's "Plan so far", StepCommit's "worth",
// StepAttainment's Strategy/Progress tabs, attain-pdf.tsx) reads only
// `combined.byGoal[goal]` / `combined.combinedMargin` — never a goal's raw
// chain result directly — so this single application point is enough to
// keep every one of those surfaces reconciled with no second place the
// scaling could drift.
//
// Both `totalMargin` and every row's `marginalMargin`/`marginalCount` scale
// by the identical factor, so the "parts equal the whole" invariant
// (`byGoal[g].totalMargin` summed across goals equals `combinedMargin`,
// see the C1 regression test) survives scaling. `pctOfTotal` is a SHARE
// within the goal (this row's dollar / the goal's own marginal-dollar
// sum) — a uniform scale multiplies both the numerator and denominator by
// the same factor, so it is left untouched.
// ────────────────────────────────────────────────────────────────────────

export type RealizationByGoal = Partial<Record<GoalId, number>>;

function clampRealizationPct(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

function fmtMoneyCompactRealization(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** Scales one number by a realization percent (0-100, clamped, defaults to
 * a no-op at 100). Exported so the Build-the-case decision-chain
 * components — which compute their own live preview chain directly, for
 * the same reason documented in `channelValue`'s comment above — can apply
 * the exact same scaling to their own local display, instead of a second,
 * hand-rolled multiply that could drift from this one. */
export function realizedValue(value: number, realizationPct: number): number {
  return value * (clampRealizationPct(realizationPct) / 100);
}

/** Appends a trailing "× N% realization = ~$X" clause to a THE MATH
 * formula string — but only when `realizationPct` is below 100, so the
 * default (full credit) never clutters the math. Returns `formula`
 * unchanged at 100%. `scaledValue` is the already-realized dollar this
 * row/chain now carries (see `realizedValue` above) — passed in rather
 * than recomputed here so the printed number can never disagree with the
 * one actually used for the row's own `marginalMargin`. */
export function formulaWithRealization(formula: string, realizationPct: number, scaledValue: number): string {
  const pct = clampRealizationPct(realizationPct);
  if (pct >= 100) return formula;
  const base = formula.endsWith(".") ? formula.slice(0, -1) : formula;
  return `${base} × ${Math.round(pct)}% realization = ~${fmtMoneyCompactRealization(scaledValue)}.`;
}

/**
 * The ONE place a goal's `LeverContributionsResult` gets scaled down for
 * attribution. At `realizationPct >= 100` this is an exact no-op (returns
 * `result` itself, not a copy) — so "at realization 100 the numbers equal
 * today's" holds by construction, not by coincidence of the arithmetic.
 * Below 100, every row's `marginalMargin`/`marginalCount` (and the goal's
 * own `totalMargin`/`totalCount`) scale by the identical factor, and any
 * row that actually carries a nonzero raw dollar (`marginalMargin !== 0`
 * before scaling — the same convention every chain module already uses to
 * mark "this is the row the dollar is attributed to", see attainAccess.ts's
 * module header) gets the trailing realization clause appended to its own
 * formula. Rows with no dollar to attribute (D1-D4 scope/context rows)
 * never get the suffix, at any realization percent — there's nothing to
 * scale, so nothing to caption.
 */
export function applyRealization(result: LeverContributionsResult, realizationPct: number): LeverContributionsResult {
  const pct = clampRealizationPct(realizationPct);
  if (pct >= 100) return result;
  const scale = pct / 100;
  const perLever: LeverContribution[] = result.perLever.map((lever) => {
    const scaledMargin = lever.marginalMargin * scale;
    const scaledCount = lever.marginalCount * scale;
    return {
      ...lever,
      marginalMargin: scaledMargin,
      marginalCount: scaledCount,
      formula: lever.marginalMargin !== 0 ? formulaWithRealization(lever.formula, pct, scaledMargin) : lever.formula,
    };
  });
  return { perLever, totalMargin: result.totalMargin * scale, totalCount: result.totalCount * scale };
}

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
 * retention books its own D2 share (`retentionProtect`, in
 * `attainWorkforce.ts`) as protected relief. If both goals are selected and
 * each is credited for the FULL hour, the plan double-books a single hour
 * of freed time as two dollars of value.
 *
 * The fix: when (and only when) both `access` and `retention` are selected,
 * `freedTimeSplit` (0-100, default 50) is the percentage of the freed hour
 * a partner has decided to route to opening access/throughput. The
 * remainder routes to protecting relief. This now applies at BOTH
 * `"outpatient"` (access's D3 mechanically divides freed hours by a visit
 * length) AND `"ed"` (ED access's D3 mechanically divides freed hours by
 * its own hours-per-recovery constant - see `attainEdAccess.ts`'s module
 * header) - the premium audit that rebuilt ED access's freed-time mechanism
 * found the two goals narrating the same freed charting hour with no split
 * at ED (finding I6), which this fix closes the same way outpatient's was
 * already closed. `"inpatient"` and `"nursing"` access chains still do not
 * mechanically consume a share of freed hours, so the split never engages
 * there.
 *
 * BOTH sides of the fix use the exact same convention, because both are
 * decision CHAINS, not independent channels: scaling an already-computed
 * dollar figure after the fact would scale whichever row happens to carry
 * the marginal dollar (access's binding constraint, or one of retention's
 * D2-D5 leave-one-out rows), which is not necessarily the actual share
 * being split and could silently do nothing. Instead, the WHOLE chain is
 * re-run for each goal with its own share passed in as a
 * `crossGoalShareMultiplier` - `computeAccessChain`'s D3 share, or
 * `computeWorkforceChain`'s D2 share - which scales that decision BEFORE
 * the rest of the chain (and therefore the dollar) is computed. This is
 * exact, not an approximation: at split = 100, access's multiplier is 1 (no
 * reduction) and retention's is 0 (zeroing D2, and therefore its composite
 * impact and payoff); at split = 0, the reverse.
 */
export function computeMultiGoalContributions(
  goals: GoalId[],
  setting: AttainSetting,
  baseline: AttainBaseline,
  valuesByGoal: Partial<Record<GoalId, LeverValues>>,
  freedTimeSplit: number = 50,
  realizationByGoal: RealizationByGoal = {},
): MultiGoalContributionsResult {
  const uniqueGoals = Array.from(new Set(goals));
  // The shared-hour conflict exists at both outpatient AND ed, since both
  // settings' access chains mechanically divide freed hours by a
  // conversion constant to create their own capacity/throughput (see
  // attainAccess.ts's D3 and attainEdAccess.ts's D3, and the module-header
  // comment above this function) - inpatient/nursing access chains have no
  // such mechanism, so the split never engages there.
  const hasFreedTimeConflict = (setting === "outpatient" || setting === "ed") && uniqueGoals.includes("access") && uniqueGoals.includes("retention");
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const retentionShare = 1 - accessShare;

  const byGoal: Partial<Record<GoalId, LeverContributionsResult>> = {};
  let combinedMargin = 0;
  let combinedCount = 0;

  // Realization is applied once, right here, to every goal's raw chain
  // result before it is stored/summed — see `applyRealization`'s comment
  // above for why this single call site is enough to keep every consumer
  // (Strategy, Commit, Progress, the PDF) reconciled.
  const record = (goal: GoalId, raw: LeverContributionsResult) => {
    const realized = applyRealization(raw, realizationByGoal[goal] ?? 100);
    byGoal[goal] = realized;
    combinedMargin += realized.totalMargin;
    combinedCount += realized.totalCount;
  };

  for (const goal of uniqueGoals) {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);

    if (goal === "access") {
      const shareMultiplier = hasFreedTimeConflict ? accessShare : 1;
      if (setting === "ed") {
        record(goal, computeEdAccessContributions(baseline, values, shareMultiplier));
        continue;
      }
      record(goal, computeAccessContributions(baseline, values, shareMultiplier));
      continue;
    }

    if (goal === "retention") {
      const shareMultiplier = hasFreedTimeConflict ? retentionShare : 1;
      record(goal, computeWorkforceContributions(baseline, setting, values, shareMultiplier));
      continue;
    }

    record(goal, computeLeverContributions(goal, setting, baseline, values));
  }

  return { byGoal, combinedMargin, combinedCount };
}
