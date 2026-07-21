import type { AttainSetting, GoalId } from "./attainTypes";
import { computeAccessContributions } from "./attainAccess";
import { computeEdAccessContributions } from "./attainEdAccess";
import { computeRevenueContributions } from "./attainRevenue";
import { computeIpRevenueContributions } from "./attainInpatientRevenue";
import { computeWorkforceContributions } from "./attainWorkforce";
import { computeQualityContributions } from "./attainQuality";

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
 *    event-type selection -> D2 close real-time gaps -> D3 tie
 *    deterioration signals to a response -> D4 lift bundle compliance ->
 *    the payoff), not an independent-channel lever set, in
 *    `attainQuality.ts`. The partner picks one or more targeted event types
 *    (HAPI, CLABSI, Falls, Sepsis); each selected type's own dollar is
 *    prevented events x cost per event, read straight off its own
 *    `calc*` helper in `nursingQualityCalcs.ts`, and the types simply SUM
 *    (each is its own genuinely separate harm event, never double-counted).
 *    `computeLeverContributions` delegates the whole `goal === "quality"`
 *    case to `computeQualityContributions` there; see that module's header
 *    for the full chain, why Sepsis's own richer `calcSepsis` model is
 *    reconciled through D3 alone rather than folded into the shared D2/D4
 *    composite, and the reconciliation to Explore's
 *    `nursingHapi`/`nursingClabsi`/`nursingFalls`/`nursingSepsis` primitives.
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
  // Retention (Workforce) is a D1-D5 DECISION CHAIN, rendered bespoke on
  // Build the case (`WorkforceDecisionChain.tsx`), not through the generic
  // lever renderer - same convention as access/revenue. This catalog entry
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
    },
    {
      id: "revenueDenialsAvgClaimValue",
      label: "Set the average claim value",
      help: "The dollar every prevented medical-necessity denial actually protects.",
      control: "countPerUnit",
      unit: "$/claim",
      min: 0,
      max: 10_000,
      step: 50,
      realityStart: 0,
      ownerRole: "Partner finance",
      defaultDue: "Month 1",
      signal: "Average claim value protected",
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
  },
  {
    id: "ipDrgCapture",
    label: "Set the CC/MCC capture improvement you are committing to",
    help: "A comorbidity or complication that is documented but never coded specifically enough is not a captured DRG. This is the improvement above today's capture rate this plan commits to.",
    control: "percent",
    unit: "pp",
    min: 0,
    max: 30,
    step: 1,
    realityStart: 0,
    ownerRole: "CDI + hospitalists",
    defaultDue: "Month 2",
    signal: "Case mix index / CC-MCC capture rate",
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
  },
  {
    id: "ipCdiReduction",
    label: "Set the query-closure improvement you are targeting",
    help: "A query that ages past discharge gets answered from memory or dropped. This is the share of today's queries this plan commits to closing before that happens.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "CDI + providers",
    defaultDue: "Month 2",
    signal: "CDI query rate",
  },
  {
    id: "ipCdiCostPerQuery",
    label: "Set the avoided cost per query",
    help: "The dollar every avoided or resolved query actually protects, your own number.",
    control: "countPerUnit",
    unit: "$/query",
    min: 0,
    max: 500,
    step: 10,
    realityStart: 0,
    ownerRole: "Revenue cycle",
    defaultDue: "Month 1",
    signal: "Cost avoided per closed query",
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
  },
  {
    id: "edAccessRevenuePerVisit",
    label: "Set revenue per recovered visit",
    help: "The dollar every recovered ED visit is actually worth. Benchmarked, but your own number, not an assumed one.",
    control: "countPerUnit",
    unit: "$/visit",
    min: 0,
    max: 2_000,
    step: 10,
    realityStart: 0,
    ownerRole: "Partner finance",
    defaultDue: "Month 1",
    signal: "Revenue booked per recovered ED visit",
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
  },
  {
    id: "edAccessMinutesSaved",
    label: "Convert freed time to faster throughput",
    help: "Minutes saved on the note is what buys a faster door-to-provider time. This is the context the LWBS reduction target below is actually built on.",
    control: "countPerUnit",
    unit: "min/note",
    min: 0,
    max: 60,
    step: 1,
    realityStart: 0,
    ownerRole: "ED operations",
    defaultDue: "Month 1",
    signal: "Door-to-provider time, median",
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
  },
  {
    id: "edAccessLwbsReduction",
    label: "Set the LWBS reduction you are targeting",
    help: "The share of the recoverable pool this plan commits to bringing back, driven by how much faster door-to-provider time the freed minutes above buy.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "ED medical director",
    defaultDue: "Month 2",
    signal: "LWBS reduction achieved against your current rate",
  },
  {
    id: "edAccessAdmissionRate",
    label: "Set the share who become admissions",
    help: "Not every recovered patient is admitted. This is the share of realized recovery that converts to a downstream admission.",
    control: "percent",
    unit: "%",
    min: 0,
    max: 100,
    step: 5,
    realityStart: 0,
    ownerRole: "ED operations / case management",
    defaultDue: "Month 2",
    signal: "Share of recovered patients captured as admissions",
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
 * The fix: when (and only when) both `access` and `retention` are selected
 * AT OUTPATIENT, `freedTimeSplit` (0-100, default 50) is the percentage of
 * the freed hour a partner has decided to route to opening access
 * (schedule). The remainder routes to protecting relief. ED access does
 * NOT compete for this hour - see `attainEdAccess.ts`'s module header for
 * why its dollar math never mechanically consumes a share of freed hours -
 * so at setting `"ed"` this split never engages and both goals get full,
 * unscaled credit even when both are selected.
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
): MultiGoalContributionsResult {
  const uniqueGoals = Array.from(new Set(goals));
  // The shared-hour conflict is outpatient access's own mechanism (D3
  // mechanically divides freed hours by a visit length) - ED access's
  // dollar math never does that division (see attainEdAccess.ts's module
  // header), so it never contends for the hour and the split must not
  // engage at setting "ed".
  const hasFreedTimeConflict = setting === "outpatient" && uniqueGoals.includes("access") && uniqueGoals.includes("retention");
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const retentionShare = 1 - accessShare;

  const byGoal: Partial<Record<GoalId, LeverContributionsResult>> = {};
  let combinedMargin = 0;
  let combinedCount = 0;

  for (const goal of uniqueGoals) {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal);

    if (goal === "access") {
      if (setting === "ed") {
        const result = computeEdAccessContributions(baseline, values);
        byGoal.access = result;
        combinedMargin += result.totalMargin;
        combinedCount += result.totalCount;
        continue;
      }
      const shareMultiplier = hasFreedTimeConflict ? accessShare : 1;
      const result = computeAccessContributions(baseline, values, shareMultiplier);
      byGoal.access = result;
      combinedMargin += result.totalMargin;
      combinedCount += result.totalCount;
      continue;
    }

    if (goal === "retention") {
      const shareMultiplier = hasFreedTimeConflict ? retentionShare : 1;
      const result = computeWorkforceContributions(baseline, setting, values, shareMultiplier);
      byGoal.retention = result;
      combinedMargin += result.totalMargin;
      combinedCount += result.totalCount;
      continue;
    }

    const base = computeLeverContributions(goal, setting, baseline, values);
    byGoal[goal] = base;
    combinedMargin += base.totalMargin;
    combinedCount += base.totalCount;
  }

  return { byGoal, combinedMargin, combinedCount };
}
