import type {
  AttainSetting,
  GoalId,
  GoalDef,
  SettingGoalContent,
} from "./attainTypes";
import { computeWorkforceCeiling, WORKFORCE_TURNOVER_DEFAULT_PCT } from "./attainWorkforce";

/**
 * Attain goal catalog.
 *
 * `GOAL_CATALOG` holds the four goal-level structural templates (the 7-link
 * value chain, the 3 hardest-link mechanisms, and the pill-flow) - these are
 * the same shape regardless of care setting, because the chain positions are
 * what define the goal (e.g. "access" is always Abridge adopted -> time
 * saved -> freed time routed -> capacity opened -> capacity filled ->
 * outcome completed -> margin booked). `CONTENT[setting][goal]` holds the
 * per-(setting, goal) copy: the numbers, the world, the teach copy.
 *
 * Sourcing:
 *  - outpatient/access: ported verbatim from the locked mockup
 *    `value-attainment-patient-access.html`.
 *  - outpatient/revenue, nursing/quality: ported from
 *    `Value-Attainment/mockup/content.py` (REVENUE, QUALITY), which are
 *    already outpatient-specialty- and nursing-flavored respectively.
 *  - outpatient/retention and inpatient/retention: content.py's RETENTION
 *    plan spans both ("Hospital Medicine & Primary Care"); it is split here
 *    into its outpatient (primary/specialty care) and inpatient (hospital
 *    medicine) halves.
 *  - ed/access, ed/retention, ed/revenue, inpatient/revenue,
 *    nursing/retention: authored fresh for this task, reusing the matching
 *    goal's 7-link chain shape with setting-correct metrics and copy,
 *    following the same voice rules (teach the mechanism, no em dashes, no
 *    "causes" claims, contribution margin, no double count).
 */

// ────────────────────────────────────────────────────────────────────────
// Retention "prize" copy - DERIVED, never hand-picked.
//
// The retention story pages (goodCells + the ambition tiers below) used to
// hardcode a departures-avoided/dollar figure that could drift arbitrarily
// far from what the interactive Build-the-case chain can actually build
// (see `attainWorkforce.ts`'s D2-D5 chain and its
// `WORKFORCE_IMPACT_CEILING_PP` cap). `retentionPrize` fixes that by reading
// the SAME formula the chain's own payoff uses
// (`computeWorkforceCeiling`) at this setting's stated scale (the headcount
// each retention page's own subtitle/worldCards already quote), with every
// D2-D5 decision maxed. "Ambitious" is therefore the chain's true ceiling,
// never a number beyond it; "typical" and "conservative" keep the exact
// same 1:2:3 ratio the original illustrative copy used, now anchored under
// that ceiling instead of floating above it.
// ────────────────────────────────────────────────────────────────────────

function fmtMoneyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}K`;
  return `$${Math.round(abs)}`;
}

function fmtOneDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

interface RetentionPrizeTier {
  value: number;
  departures: number;
  turnoverPts: number;
}

interface RetentionPrize {
  conservative: RetentionPrizeTier;
  typical: RetentionPrizeTier;
  ambitious: RetentionPrizeTier;
}

/** `statedScale` is the headcount this setting's retention story is written
 * against (the same number its own subtitle/worldCards quote — 120
 * outpatient providers, 55 ED providers, 45 hospitalists, 480 bedside
 * nurses), not the app's blank-Scope-step fallback default. */
function retentionPrize(setting: AttainSetting, statedScale: number): RetentionPrize {
  const ceiling = computeWorkforceCeiling(setting, statedScale);
  const unit = {
    value: ceiling.value / 3,
    departures: ceiling.departuresAvoided / 3,
    turnoverPts: ceiling.turnoverPointsReduced / 3,
  };
  return {
    conservative: { value: unit.value, departures: unit.departures, turnoverPts: unit.turnoverPts },
    typical: { value: unit.value * 2, departures: unit.departures * 2, turnoverPts: unit.turnoverPts * 2 },
    ambitious: { value: ceiling.value, departures: ceiling.departuresAvoided, turnoverPts: ceiling.turnoverPointsReduced },
  };
}

// ────────────────────────────────────────────────────────────────────────
// GOAL_CATALOG - structural templates, one per goal id
// ────────────────────────────────────────────────────────────────────────

export const GOAL_CATALOG: Record<GoalId, GoalDef> = {
  access: {
    id: "access",
    label: "Patient Access",
    pill: "Capacity",
    pillBg: "#1A1A1A",
    domainSub: "Panel Capacity & Appointment Access",
    chainTitle: "How Access Is Attained",
    chainArrow: "↑",
    quadrant: "Capacity",
    chain: [
      {
        n: 1,
        name: "Abridge adopted",
        signal: "% providers recording, % notes via Abridge",
        ownerRole: "Abridge CSM + champion",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 2,
        name: "Time saved per note",
        signal: "Documentation minutes per note",
        ownerRole: "Abridge",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 3,
        name: "Freed time routed to access",
        signal: "Scheduled hours up, after-hours doc down",
        ownerRole: "Service-line chief",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 4,
        name: "Schedule capacity opened",
        signal: "Added slots on the template",
        ownerRole: "Ambulatory operations",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 5,
        name: "Slots filled",
        signal: "Fill rate, third-next-available falling",
        ownerRole: "Access / referral ops",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 6,
        name: "Net-new visits completed",
        signal: "Visit volume per provider vs baseline",
        ownerRole: "Joint",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 7,
        name: "Margin booked",
        signal: "Incremental contribution margin",
        ownerRole: "Partner finance",
        fragile: false,
        isAbridge: false,
      },
    ],
    mechanisms: [
      {
        heading: "Split the time, per provider, per week",
        body: "The freed time is a number, not a vibe: a fixed share is committed to the schedule, the rest stays as relief.",
      },
      {
        heading: "Measure both halves",
        body: "Access shows up as visits (Capacity). Relief shows up as after-hours documentation falling (Workforce). Different quadrants, different dollars, no double count. The provider keeps their relief and the access opens.",
      },
      {
        heading: "Forcing function",
        body: "Unconverted access time reclassifies to relief and attainment visibly drops. Drift shows up early, not at the review. The ask is phased small, then expanded once fill rate holds.",
      },
    ],
    flow: [
      { label: "Abridge Ambient", kind: "start" },
      { label: "Time saved / note ↓", kind: "mid" },
      { label: "Freed time routed", kind: "risk" },
      { label: "Slots opened", kind: "risk" },
      { label: "Slots filled", kind: "mid" },
      { label: "Patient Access ↑", kind: "end" },
    ],
    valueUnit: {
      countNoun: "net-new visits a year",
      heroIsDollar: false,
      outcomeTemplate: "Open room for about {count} more visits a year.",
    },
  },

  retention: {
    id: "retention",
    label: "Provider Retention",
    pill: "Workforce",
    pillBg: "#574A43",
    domainSub: "Provider Wellbeing & Retention",
    chainTitle: "How Retention Holds",
    chainArrow: "↓",
    quadrant: "Workforce",
    chain: [
      {
        n: 1,
        name: "Abridge adopted",
        signal: "% providers recording, % notes via Abridge",
        ownerRole: "Abridge CSM + champion",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 2,
        name: "After-hours documentation down",
        signal: "Evening / off-shift charting minutes",
        ownerRole: "Abridge",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 3,
        name: "Relief protected",
        signal: "Panel size / assignment load, schedule stability",
        ownerRole: "Department leadership",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 4,
        name: "Coverage gaps backfilled",
        signal: "Unfilled shifts / lines",
        ownerRole: "Ops / staffing",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 5,
        name: "Likelihood-to-stay up",
        signal: "Quarterly pulse",
        ownerRole: "Department chiefs",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 6,
        name: "Departures avoided",
        signal: "Voluntary turnover vs baseline",
        ownerRole: "Joint",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 7,
        name: "Replacement cost avoided",
        signal: "Cost per avoided departure",
        ownerRole: "Finance / HR",
        fragile: false,
        isAbridge: false,
      },
    ],
    mechanisms: [
      {
        heading: "Set a relief floor, per provider",
        body: "Define the after-hours ceiling that must hold. It is a number, not a vibe.",
      },
      {
        heading: "Backfill before you absorb",
        body: "Open shifts and departures get covered before the remaining staff absorb the load. Absorbed load is borrowed relief.",
      },
      {
        heading: "Pulse, do not wait for the survey",
        body: "A short likelihood-to-stay pulse each quarter catches erosion months before the annual engagement survey does.",
      },
    ],
    flow: [
      { label: "Abridge Ambient", kind: "start" },
      { label: "After-hours doc ↓", kind: "mid" },
      { label: "Relief protected", kind: "risk" },
      { label: "Coverage held", kind: "risk" },
      { label: "Likelihood-to-stay ↑", kind: "mid" },
      { label: "Retention ↑", kind: "end" },
    ],
    valueUnit: {
      countNoun: "departures avoided a year",
      heroIsDollar: false,
      outcomeTemplate: "Keep about {count} clinicians a year who would otherwise leave.",
    },
  },

  revenue: {
    id: "revenue",
    label: "Revenue Capture",
    pill: "Revenue",
    pillBg: "#EA2C00",
    domainSub: "Coding Accuracy & Documentation Integrity",
    chainTitle: "How Revenue Is Captured",
    chainArrow: "↑",
    quadrant: "Revenue",
    chain: [
      {
        n: 1,
        name: "Abridge adopted",
        signal: "% providers recording, % notes via Abridge",
        ownerRole: "Abridge CSM + champion",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 2,
        name: "Documentation completeness up",
        signal: "Problems / complexity documented per encounter",
        ownerRole: "Abridge",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 3,
        name: "Coding acts on the detail",
        signal: "Coder / CDI uptake of the documented complexity",
        ownerRole: "Revenue cycle / coding",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 4,
        name: "Queries close quickly",
        signal: "Provider query turnaround",
        ownerRole: "CDI + providers",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 5,
        name: "Claims clear first-pass",
        signal: "First-pass rate, share paid below the coded level",
        ownerRole: "Billing",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 6,
        name: "Captured level realized",
        signal: "wRVU / E&M / DRG weight vs baseline",
        ownerRole: "Joint",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 7,
        name: "Margin booked",
        signal: "Captured contribution margin",
        ownerRole: "Finance",
        fragile: false,
        isAbridge: false,
      },
    ],
    mechanisms: [
      {
        heading: "Route the complexity to the coder",
        body: "The documented detail surfaces in the coding workflow, not buried in the note body. Detail the coder cannot see is detail that does not get coded.",
      },
      {
        heading: "Close queries in days, not weeks",
        body: "A query that ages past a week gets answered from memory or dropped. Fast turnaround is where captured levels survive.",
      },
      {
        heading: "Count it once",
        body: "E/M level, wRVU, and DRG-weight lift can monetize the same encounter. The plan books one, so the number is defensible and never double-counts.",
      },
    ],
    flow: [
      { label: "Abridge Ambient", kind: "start" },
      { label: "Note completeness ↑", kind: "mid" },
      { label: "Coder acts on it", kind: "risk" },
      { label: "Query closes fast", kind: "risk" },
      { label: "Claim clears", kind: "mid" },
      { label: "Revenue captured", kind: "end" },
    ],
    valueUnit: {
      countNoun: "",
      heroIsDollar: true,
      outcomeTemplate: "Put about {dollar} of care you already deliver back on the claim.",
    },
  },

  quality: {
    id: "quality",
    label: "Quality & Safety",
    pill: "Quality",
    pillBg: "#6B7280",
    domainSub: "Care Bundles & Patient Safety",
    chainTitle: "How Safety Events Fall",
    chainArrow: "↓",
    quadrant: "Quality",
    chain: [
      {
        n: 1,
        name: "Abridge adopted",
        signal: "% staff documenting via Abridge",
        ownerRole: "Abridge CSM + unit champion",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 2,
        name: "Point-of-care documentation up",
        signal: "Charting lag per event",
        ownerRole: "Abridge",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 3,
        name: "Real-time gaps acted on",
        signal: "Bundle-step completion within the shift",
        ownerRole: "Charge nurses / unit leads",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 4,
        name: "Deterioration response",
        signal: "Signal-to-intervention time",
        ownerRole: "Rapid response / unit",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 5,
        name: "Bundle compliance up",
        signal: "Audited compliance",
        ownerRole: "Unit leadership",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 6,
        name: "Safety events fall",
        signal: "Event rate vs baseline",
        ownerRole: "Joint / quality",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 7,
        name: "Safety-cost exposure reduced",
        signal: "Cost per safety event",
        ownerRole: "Finance / quality",
        fragile: false,
        isAbridge: false,
      },
    ],
    mechanisms: [
      {
        heading: "Make the gap a shift task, not an audit finding",
        body: "A missed step surfaces during the shift as something to close now, not a number reviewed next month.",
      },
      {
        heading: "Tie the signal to a response",
        body: "An early deterioration flag routes to a named responder with a clear next step. A signal with no owner is just a note.",
      },
      {
        heading: "Close the loop weekly",
        body: "Unit leadership reviews the misses with staff every week. Prevention is a habit built by feedback, not a policy.",
      },
    ],
    flow: [
      { label: "Abridge Ambient", kind: "start" },
      { label: "Point-of-care doc ↑", kind: "mid" },
      { label: "Gaps visible live", kind: "risk" },
      { label: "Bedside routine changes", kind: "risk" },
      { label: "Bundle compliance ↑", kind: "mid" },
      { label: "Events ↓", kind: "end" },
    ],
    valueUnit: {
      countNoun: "safety events a year",
      heroIsDollar: false,
      outcomeTemplate: "Work toward about {count} fewer safety events a year.",
    },
  },

  capacity: {
    id: "capacity",
    label: "Nursing Capacity",
    pill: "Capacity",
    pillBg: "#1A1A1A",
    domainSub: "Overtime & After-Shift Charting",
    chainTitle: "How Overtime Comes Down",
    chainArrow: "↓",
    quadrant: "Capacity",
    chain: [
      {
        n: 1,
        name: "Abridge adopted",
        signal: "% nurses documenting via Abridge",
        ownerRole: "Abridge CSM + unit champion",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 2,
        name: "Charting moves into the shift",
        signal: "Share of notes finished at the point of care",
        ownerRole: "Abridge",
        fragile: false,
        isAbridge: true,
      },
      {
        n: 3,
        name: "Freed minutes land during the shift",
        signal: "After-shift charting time per nurse",
        ownerRole: "Nursing operations",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 4,
        name: "Overtime not backfilled by new tasks",
        signal: "Late finishes, missed lunches",
        ownerRole: "Charge nurses / unit leads",
        fragile: true,
        isAbridge: false,
      },
      {
        n: 5,
        name: "On-time shift completion up",
        signal: "On-time shift completion %",
        ownerRole: "Nursing operations",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 6,
        name: "Documentation-driven overtime removed",
        signal: "Overtime hours per nurse per week",
        ownerRole: "Joint / nursing ops",
        fragile: false,
        isAbridge: false,
      },
      {
        n: 7,
        name: "Overtime wages avoided",
        signal: "Loaded overtime spend vs baseline",
        ownerRole: "Finance / nursing",
        fragile: false,
        isAbridge: false,
      },
    ],
    mechanisms: [
      {
        heading: "Make the freed minute land during the shift",
        body: "Charting in the moment only cuts overtime if the recovered minute stays on the shift, not turned into a new task. The freed time has to close the shift on time.",
      },
      {
        heading: "Only the overtime that charting causes",
        body: "Overtime from short staffing or a census surge is not Abridge's to fix. The documentation-attributable share is the ceiling, so the number never claims overtime that charting did not cause.",
      },
      {
        heading: "Counted once, not twice",
        body: "Overtime avoided is wages you stop paying now. Retention is the replacement cost of a nurse who would have quit. Same root, different dollars, so the plan books each once.",
      },
    ],
    flow: [
      { label: "Abridge Ambient", kind: "start" },
      { label: "Chart in the moment", kind: "mid" },
      { label: "Freed time lands on shift", kind: "risk" },
      { label: "Not refilled by new tasks", kind: "risk" },
      { label: "On-time completion ↑", kind: "mid" },
      { label: "Overtime ↓", kind: "end" },
    ],
    valueUnit: {
      countNoun: "overtime hours avoided a year",
      heroIsDollar: false,
      outcomeTemplate: "Take about {count} overtime hours a year off the schedule.",
    },
  },

  // Nursing's Patient Experience play: less time charting -> more presence at the
  // bedside -> clearer nurse-patient communication -> HCAHPS. A proof/experience
  // story (tracked, not a hard dollar) that lives in the strategy discovery only.
  experience: {
    id: "experience",
    label: "Patient Experience",
    pill: "Experience",
    pillBg: "#0891B2",
    domainSub: "Bedside Presence & Communication",
    chainTitle: "How Experience Rises",
    chainArrow: "↑",
    quadrant: "Quality",
    chain: [
      { n: 1, name: "Abridge adopted", signal: "% staff documenting via Abridge", ownerRole: "Abridge CSM + unit champion", fragile: false, isAbridge: true },
      { n: 2, name: "Charting off the bedside conversation", signal: "Point-of-care doc rate", ownerRole: "Abridge", fragile: false, isAbridge: true },
      { n: 3, name: "Nurses present at the bedside", signal: "Direct-care time ratio", ownerRole: "Charge nurses / unit leads", fragile: true, isAbridge: false },
      { n: 4, name: "Clearer nurse-patient communication", signal: "Rounding + teaching quality", ownerRole: "Unit / bedside nurses", fragile: true, isAbridge: false },
      { n: 5, name: "Experience captured in the survey", signal: "HCAHPS response rate", ownerRole: "Patient experience office", fragile: false, isAbridge: false },
      { n: 6, name: "Nurse-communication score rises", signal: "HCAHPS nurse-communication domain", ownerRole: "Nursing / experience", fragile: false, isAbridge: false },
      { n: 7, name: "VBP position improves", signal: "Value-based purchasing score", ownerRole: "Finance / quality", fragile: false, isAbridge: false },
    ],
    mechanisms: [
      { heading: "Take the screen out of the room", body: "When the note happens in the conversation, the nurse faces the patient instead of the workstation." },
      { heading: "Return the minutes to the bedside", body: "Time saved on charting only helps experience if it is spent in the room, not refilled with more assignment." },
      { heading: "Make the survey a habit, not a surprise", body: "Experience leadership reviews nurse-communication scores with units regularly, so the signal reaches the people who shape it." },
    ],
    flow: [
      { label: "Abridge Ambient", kind: "start" },
      { label: "Bedside presence", kind: "mid" },
      { label: "Time protected", kind: "risk" },
      { label: "HCAHPS ↑", kind: "end" },
    ],
    valueUnit: {
      countNoun: "points of HCAHPS nurse-communication",
      heroIsDollar: false,
      outcomeTemplate: "Move the HCAHPS nurse-communication score, tracked as an experience signal.",
    },
  },
};

// ────────────────────────────────────────────────────────────────────────
// SETTING_GOAL_MATRIX
// ────────────────────────────────────────────────────────────────────────

export const SETTING_GOAL_MATRIX: Record<AttainSetting, GoalId[]> = {
  outpatient: ["access", "retention", "revenue"],
  ed: ["access", "retention", "revenue"],
  // Inpatient's capacity is the discharge-before-noon / earlier-bed-turn play (its
  // non-financial-adjacent capacity layer). It ships as a fully authored cell in
  // ATTAIN_MATRIX ("Inpatient Capacity"), so it is offered here too — resolved to the
  // right cell by the setting-aware `categoryForGoal` below (capacity → "Inpatient
  // Capacity" for inpatient, "Nursing Capacity" for nursing).
  inpatient: ["capacity", "revenue", "retention"],
  nursing: ["quality", "retention", "capacity"],
};

/**
 * The STABLE `AttainCell.category` key a (setting, goal) resolves to — the single
 * source of truth for the GoalId→category mapping used by BOTH the live funnel
 * (AttainFlowV2.cellsFor) and the PDF builder (attainPdfData.buildFromSnapshot),
 * so the two can never drift. It is SETTING-AWARE because one GoalId ("capacity")
 * maps to two different cells: inpatient's discharge-capacity cell vs nursing's
 * overtime cell. Every other goal maps to one stable category across settings.
 */
export function categoryForGoal(setting: AttainSetting, goal: GoalId): string {
  if (goal === "capacity") return setting === "inpatient" ? "Inpatient Capacity" : "Nursing Capacity";
  const base: Record<Exclude<GoalId, "capacity">, string> = {
    access: "Patient Access",
    retention: "Provider Retention",
    revenue: "Revenue Capture",
    quality: "Quality & Safety",
    experience: "Patient Experience",
  };
  return base[goal];
}

/**
 * The CUSTOMER-FACING label for a (setting, goal). Kept SEPARATE from
 * `categoryForGoal` because that returns the stable cell-lookup KEY (funnel,
 * PDF, scope econ models, tests all depend on "Provider Retention"), which
 * must never change. Display can and should be setting-native: nurses are not
 * "providers", so nursing retention reads "Nurse Retention". Everything else
 * delegates to the key. Use this anywhere a category is SHOWN to the customer.
 */
export function goalDisplayLabel(setting: AttainSetting, goal: GoalId): string {
  if (goal === "retention" && setting === "nursing") return "Nurse Retention";
  return categoryForGoal(setting, goal);
}

// ────────────────────────────────────────────────────────────────────────
// CONTENT - per (setting, goal) copy
// ────────────────────────────────────────────────────────────────────────

const outpatientAccess: SettingGoalContent = {
  subtitle: "Outpatient",
  thesis1: "The capacity is already here.",
  thesis2: "This is the plan to convert it.",
  p1Lead:
    "Providers in this scope are booking patients weeks out while finishing each day with hours of documentation still to write. The demand is real and the backlog is real. The capacity to meet it already exists. Right now it is trapped in the note, and it leaves the building every evening as unpaid charting instead of as an open appointment.",
  worldCards: [
    { k: "3rd-next-available", n: "14+ days", benchmark: true, f: "Benchmark threshold for active attention" },
    { k: "Time saved / note", n: "~2 min", benchmark: true, f: "Typical with ambient documentation" },
  ],
  opportunity:
    "You have the capacity. The schedule has not caught up yet. Converting even part of the freed time into open appointments turns a three-week wait and a 1,900-patient backlog into visits your providers can actually deliver. This plan is how that conversion happens, and how we hold it.",
  trappedLabel: "How the capacity gets trapped",
  trappedSteps: [
    "12 min of documentation / visit",
    "Behind by the 5th patient",
    "1 to 2 hours over each day",
    "Time leaves as evening charting",
  ],
  trappedCap:
    "Ambient documentation gives that hour back. Whether it becomes an open appointment or just an earlier night at home is a choice, not an automatic outcome. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 9 months out',
  goodCells: [
    { n: "+2", k: "Visits / provider / week" },
    { n: "3,800", k: "Net-new visits / year" },
    { n: "$760K", coral: true, k: "Contribution margin" },
    { n: "<14d", k: "Third-next-available" },
  ],
  curveIntro:
    "Most deployments drift. Time gets freed, the schedule never absorbs it, and realized value settles well below what the model promised. That is the dashed line, and it is where access programs usually land. Your plan is the line above it. The distance between them is not luck. It is whether the middle of the chain gets steered, month by month, to a named owner. That is the entire job of this document.",
  bendsLead:
    "The dashed path is not Abridge underdelivering. Adoption and time saved hit target on nearly every deployment. The line drifts only when the freed hour is never turned into an appointment. Three things bend it back up, and all three live in your operations, not the software:",
  bends: [
    "Freed time is committed to the schedule, not quietly absorbed as an earlier night home.",
    "Slots are actually opened on the template.",
    "Referrals and backlog are routed to fill them.",
  ],
  bendsCloser: "The first two links are where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because they are where every access deal quietly dies. Relief is the default; access is a deliberate weekly decision. Freed time drifts to finish on time unless someone actively converts it into open slots. That conversion is yours, and it is the one thing this plan holds.",
  hardestTitle: "Routing Freed Time",
  hardestArrow: "↓",
  hardestLead:
    "Relief is the default. Access is a decision someone makes on purpose, every week. Finishing on time happens the moment the note gets easier. Opening a slot takes deliberate action. So without a forcing function, freed time drifts to relief and the access goal dies quietly at Link 3. We hold it three ways.",
  splitLabel: "The two places freed time can go",
  splitLeft: ["Relief", "The provider finishes on time and after-hours charting falls. This shows up as workforce value: less burnout, better retention."],
  splitRight: ["Access", "The freed hour becomes open appointments. This shows up as capacity value: more visits, shorter waits, the goal of this plan."],
  splitCloser: "Both are real value, and measured in separate buckets they never double-count. But only one is access. The split has to be a decision made out loud, not a hope.",
  barHead: "Where the freed time is going now",
  barAcc: 55,
  barTarget: 60,
  barAccLbl: "committed to access",
  barRelLbl: "staying as relief",
  cadenceLead:
    "A plan only closes the gap if someone steers it between the big reviews. Four things keep this one honest, and none of them depends on Abridge having authority we do not have.",
  monthly: [
    "Are the first two links still on track?",
    "Which middle link moved, and by how much?",
    "What is attainment now, against where the plan expected us to be?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, expand it. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set an access goal together, we are on our way and climbing, here is the runway on the rest." The capacity was always there. This is the plan that converted it. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $460K · 2,300 visits", goalMargin: 460_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $760K · 3,800 visits", goalMargin: 760_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $1.06M · 5,300 visits", goalMargin: 1_060_000 },
  ],
};

const outpatientRetentionPrize = retentionPrize("outpatient", 120);

const outpatientRetention: SettingGoalContent = {
  subtitle: "Outpatient",
  thesis1: "The relief is real.",
  thesis2: "This is the plan to make it stick.",
  p1Lead:
    "Providers in this scope are documenting for hours after every shift, most of it from home. Exit interviews name charting burden as a leading reason people leave. The relief Abridge creates is real and immediate. Whether it lasts, or gets quietly refilled by bigger panels and coverage gaps, is the difference between a number that holds and one that fades by month nine.",
  worldCards: [
    { k: "Annual turnover", n: `${WORKFORCE_TURNOVER_DEFAULT_PCT.outpatient}%`, benchmark: true, f: "Starting voluntary turnover this plan uses" },
    { k: "Burnout share of exits", n: "~40%", benchmark: true, f: "Typical share attributed to burnout" },
    { k: "Replacement cost / provider", n: "$250K to $500K", benchmark: true, f: "Typical cost to rehire" },
  ],
  opportunity:
    "The recovered time is worth more than a nicer evening. When after-hours charting falls and stays down, likelihood-to-stay rises and fewer providers reach the decision to leave. Each avoided departure is $250K to $500K you do not spend rehiring. The plan protects the relief so it converts into retention, not just a quieter month.",
  trappedLabel: "How the burnout compounds",
  trappedSteps: [
    "1 to 2 hrs charting after every shift",
    "Work follows them home",
    "Likelihood-to-stay erodes",
    "The departure decision",
  ],
  trappedCap:
    "Ambient cuts the after-hours load at the point of care. Whether that relief holds long enough to change the departure decision is a choice about how the recovered time gets protected. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 12 months out',
  goodCells: [
    { n: `-${fmtOneDecimal(outpatientRetentionPrize.typical.turnoverPts)} pts`, k: "Voluntary turnover" },
    { n: fmtOneDecimal(outpatientRetentionPrize.typical.departures), k: "Departures avoided / year" },
    { n: fmtMoneyCompact(outpatientRetentionPrize.typical.value), coral: true, k: "Replacement cost avoided" },
    { n: "<0.5h", k: "After-hours documentation" },
  ],
  curveIntro:
    "Most retention stories fade. The relief shows up in month one, then panels grow, coverage gaps refill the evening, and by the time the annual survey runs the after-hours load is back and so is the attrition. That is the dashed line. Your plan is the line above it: relief that is measured and protected, month by month, until it changes the departure decision.",
  bendsLead:
    "The dashed path is not Abridge wearing off. The after-hours load drops on nearly every deployment. Retention fades only when that relief is allowed to refill. Three things hold the line, and all three live in how you run the group, not the software:",
  bends: [
    "Recovered evening time is protected, not absorbed by larger panels.",
    "Coverage gaps are backfilled so the burden does not quietly return.",
    "Likelihood-to-stay is pulsed in a short check, not once a year.",
  ],
  bendsCloser: "The first link is where relief like this usually slips, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because relief is easy to give and easy to take back. Bigger panels and unfilled shifts quietly refill the evening, and the retention gain evaporates before it ever shows up in turnover. Protecting the recovered time is the one thing this plan holds.",
  hardestTitle: "Protecting the Relief",
  hardestArrow: "↑",
  hardestLead:
    "Relief is easy to hand out and easy to claw back. The moment panels grow or a colleague leaves unbackfilled, the recovered evening fills right back up, and the provider is exactly where they were before Abridge. Retention only holds if the relief is treated as a protected asset, not a temporary bonus. We hold it three ways.",
  splitLabel: "The two ways recovered time gets used",
  splitLeft: ["Absorbed", "The evening refills with a bigger panel or covering a gap. The relief was real but temporary, and it shows up as nothing."],
  splitRight: ["Protected", "The evening stays quiet. Likelihood-to-stay rises and the departure decision never gets made. This is retention value."],
  splitCloser: "Both start from the same recovered hour. Only protected time becomes retention. The floor has to be a commitment, not a hope.",
  barHead: "Where the recovered time is going now",
  barAcc: 62,
  barTarget: 75,
  barAccLbl: "protected",
  barRelLbl: "absorbed",
  cadenceLead: "Retention fades between the annual surveys, so the plan is steered monthly on the leading signals, not on the lagging turnover number.",
  monthly: [
    "Is after-hours documentation still under the floor?",
    "Did any panel grow or shift go unbackfilled this month?",
    "What did the likelihood-to-stay pulse show?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, hold. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to avoid the departures burnout was driving, we are on our way and holding the relief, here is the runway on the rest." The relief was always real. This is the plan that made it stick. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: `Goal · ${fmtMoneyCompact(outpatientRetentionPrize.conservative.value)} · ${fmtOneDecimal(outpatientRetentionPrize.conservative.departures)} departures avoided`, goalMargin: outpatientRetentionPrize.conservative.value },
    { key: "typical", label: "Typical", goalLabel: `Goal · ${fmtMoneyCompact(outpatientRetentionPrize.typical.value)} · ${fmtOneDecimal(outpatientRetentionPrize.typical.departures)} departures avoided`, goalMargin: outpatientRetentionPrize.typical.value },
    { key: "ambitious", label: "Ambitious", goalLabel: `Goal · ${fmtMoneyCompact(outpatientRetentionPrize.ambitious.value)} · ${fmtOneDecimal(outpatientRetentionPrize.ambitious.departures)} departures avoided`, goalMargin: outpatientRetentionPrize.ambitious.value },
  ],
};

const outpatientRevenue: SettingGoalContent = {
  subtitle: "Outpatient",
  thesis1: "The work was already done.",
  thesis2: "This is the plan to capture it.",
  p1Lead:
    "Providers in this scope are delivering complex care and documenting less of it than they perform. A visit that addressed three active problems gets coded as if it addressed one, because the note did not carry the detail the coder needed. The clinical work already happened. Whether it shows up on the claim is a documentation-to-coding handoff that mostly does not get watched.",
  worldCards: [
    { k: "Avg E/M level", n: "3.8", benchmark: true, f: "Specialty benchmark" },
    { k: "First-pass acceptance", n: "95%+", benchmark: true, f: "Clean-claim benchmark" },
  ],
  opportunity:
    "This is not about coding more aggressively. It is about coding accurately for care that was delivered and is now documented. When the note carries the complexity, the coder can support the level and the claim reflects the visit. That gap, closed, is captured margin, counted once.",
  trappedLabel: "How the revenue leaks",
  trappedSteps: [
    "Complex visit delivered",
    "Note omits the detail",
    "Coder supports a lower level",
    "Revenue left on the claim",
  ],
  trappedCap:
    "Ambient captures the complexity in the note at the point of care. Whether that turns into an accurate code depends on the billing workflow downstream. That handoff is what this plan is built around.",
  goodHead: 'What "good" looks like, 9 months out',
  goodCells: [
    { n: "+0.4", k: "wRVU / encounter" },
    { n: "3.8", k: "Average E/M level" },
    { n: "$2.1M", coral: true, k: "Captured margin" },
    { n: "96%", k: "First-pass acceptance" },
  ],
  curveIntro:
    "Most coding-accuracy gains stall. The documentation improves in month one, but the coding and billing workflow keeps running the way it always has, and the captured revenue never lands. That is the dashed line. Your plan is the line above it: completeness that actually flows through to the code and the claim, watched month by month.",
  bendsLead:
    "The dashed path is not Abridge failing to capture detail. Note completeness improves on nearly every deployment. Revenue leaks only when the completeness never reaches the code. Three things bend it back up, and all three live in your revenue cycle, not the software:",
  bends: [
    "Coders and CDI act on the fuller documentation instead of defaulting to prior patterns.",
    "Provider queries close quickly rather than aging out.",
    "The captured level clears first-pass and holds up on appeal, instead of going out below the care that was delivered.",
  ],
  bendsCloser: "The first two links are where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because they are where completeness stops being revenue. Coders default to prior-year patterns and queries age out, so the documented complexity never reaches the claim. Acting on the fuller note is the one thing this plan holds. And to stay honest, the value is counted once: E/M level and wRVU lift monetize the same encounter, so only one is booked.",
  hardestTitle: "Getting the Coding to Act",
  hardestArrow: "↑",
  hardestLead:
    "A more complete note does not code itself. Coders and CDI work from habit and volume, and unless the workflow points them at the new detail, they support the level they always have. The completeness is real, but it stops at the note. Revenue only lands if the coding acts on it. We hold it three ways.",
  splitLabel: "Where the completeness can go",
  splitLeft: ["Stops at the note", "The detail is captured but the coder never acts on it. Real documentation, zero revenue."],
  splitRight: ["Reaches the claim", "The documented complexity supports an accurate level that clears first-pass. This is captured margin."],
  splitCloser: "Both start from the same complete note. Only one becomes revenue. Acting on it has to be built into the workflow, not left to habit.",
  barHead: "Where the documented complexity is going now",
  barAcc: 50,
  barTarget: 80,
  barAccLbl: "reaching the claim",
  barRelLbl: "stopping at the note",
  cadenceLead: "Captured revenue shows up on a lag in the claims data, so the plan is steered monthly on coder uptake and query turnaround, not on the booked number.",
  monthly: [
    "Is documentation completeness still rising?",
    "What share of the documented complexity did coding act on?",
    "What is query turnaround, and is it under a week?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, expand. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to capture the care that was already documented, we are on our way, here is the runway on the rest." The work was always being done. This is the plan that captured it. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $1.1M captured", goalMargin: 1_100_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $2.1M captured", goalMargin: 2_100_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $3.2M captured", goalMargin: 3_200_000 },
  ],
};

const edAccess: SettingGoalContent = {
  subtitle: "Emergency Department · 24/7 coverage",
  thesis1: "The beds are already turning.",
  thesis2: "This is the plan to stop losing patients at the door.",
  p1Lead:
    "Providers in this scope are finishing charting well after the patient leaves, and the queue behind triage keeps growing while that note gets written. Patients who could have been seen leave without being seen instead. The capacity to see them exists in the same shift. Right now it leaves as after-encounter charting instead of as a patient actually brought back.",
  worldCards: [
    { k: "LWBS rate", n: "<5%", benchmark: true, f: "Benchmark threshold for active attention" },
    { k: "Door-to-provider", n: "<30 min", benchmark: true, f: "Typical median target" },
  ],
  opportunity:
    "You already have the shift coverage. The queue has not caught up yet. Converting even part of the freed charting time into faster throughput turns a rising left-without-being-seen rate into patients your team can actually treat. This plan is how that conversion happens, and how we hold it.",
  trappedLabel: "How the throughput gets trapped",
  trappedSteps: [
    "9 min of documentation / encounter",
    "Charting queue builds behind triage",
    "Door-to-provider time climbs",
    "Time leaves as patients who walk out",
  ],
  trappedCap:
    "Ambient documentation gives that time back at the bedside. Whether it becomes a faster door-to-provider time or just a calmer end of shift is a choice, not an automatic outcome. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 6 months out',
  goodCells: [
    { n: "40%", k: "Of the LWBS pool recovered" },
    { n: "1,200", k: "Recovered visits / year" },
    { n: "$540K", coral: true, k: "Contribution margin" },
    { n: "<35m", k: "Door-to-provider" },
  ],
  curveIntro:
    "Most ED throughput pushes drift. Charting time frees up, but triage and fast-track never absorb it, and the recovered visits settle well below what the model promised. That is the dashed line, and it is where ED access programs usually land. Your plan is the line above it. The distance between them is whether the middle of the chain gets steered, week by week, to a named owner.",
  bendsLead:
    "The dashed path is not Abridge underdelivering. Adoption and time saved hit target on nearly every deployment. The line drifts only when the freed minute is never turned into a faster triage cycle. Three things bend it back up, and all three live in your operations, not the software:",
  bends: [
    "Freed charting time is committed to triage and fast-track, not quietly absorbed as a calmer shift.",
    "Fast-track or a second provider lane is actually opened during peak hours.",
    "Triage protocols route recoverable LWBS patients back before they leave.",
  ],
  bendsCloser: "The first two links are where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because they are where every ED throughput plan quietly dies. A calmer shift is the default; faster throughput is a deliberate hourly decision. Freed time drifts to catching up on the queue unless someone actively converts it into an open lane. That conversion is yours, and it is the one thing this plan holds.",
  hardestTitle: "Routing Freed Time to Throughput",
  hardestArrow: "↓",
  hardestLead:
    "Relief is the default. Faster throughput is a decision someone makes on purpose, every shift. Catching up on the queue happens the moment the note gets easier. Opening a fast-track lane takes deliberate action. So without a forcing function, freed time drifts to relief and the throughput goal dies quietly at Link 3. We hold it three ways.",
  splitLabel: "The two places freed time can go",
  splitLeft: ["Relief", "The provider catches up on the queue and finishes closer to on time. This shows up as workforce value: less burnout, better retention."],
  splitRight: ["Throughput", "The freed minutes open a fast-track lane or a faster triage cycle. This shows up as capacity value: fewer LWBS, more visits, the goal of this plan."],
  splitCloser: "Both are real value, and measured in separate buckets they never double-count. But only one reduces LWBS. The split has to be a decision made out loud, not a hope.",
  barHead: "Where the freed time is going now",
  barAcc: 48,
  barTarget: 60,
  barAccLbl: "committed to throughput",
  barRelLbl: "staying as relief",
  cadenceLead: "LWBS moves fast when triage drifts, so the plan is steered weekly on door-to-provider time, not on the monthly volume report.",
  monthly: [
    "Are the first two links still on track?",
    "Which middle link moved this week, and by how much?",
    "What is attainment now, against where the plan expected us to be?",
    "What is the one ask this week, and who owns it?",
    "Did last week's ask get done? If yes, expand it. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set a 1,200-visit recovery goal together, we are most of the way there and climbing, here is the runway on the rest." The coverage was always there. This is the plan that converted it. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $320K · 700 visits recovered", goalMargin: 320_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $540K · 1,200 visits recovered", goalMargin: 540_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $780K · 1,700 visits recovered", goalMargin: 780_000 },
  ],
};

const edRetentionPrize = retentionPrize("ed", 55);

const edRetention: SettingGoalContent = {
  subtitle: "Emergency Department · 24/7 coverage",
  thesis1: "The relief is real.",
  thesis2: "This is the plan to make it stick.",
  p1Lead:
    "Providers in this scope are finishing charts hours after the shift ends, often from the parking lot or from home. Exit interviews name charting burden and shift intensity as leading reasons people leave emergency medicine. The relief Abridge creates is real and immediate. Whether it lasts, or gets quietly refilled by heavier shift loads, is the difference between a number that holds and one that fades by month nine.",
  worldCards: [
    { k: "Annual turnover", n: `${WORKFORCE_TURNOVER_DEFAULT_PCT.ed}%`, benchmark: true, f: "Starting voluntary turnover this plan uses" },
    { k: "Burnout share of exits", n: "~50%", benchmark: true, f: "Typical share attributed to burnout" },
    { k: "Replacement cost / provider", n: "$300K to $600K", benchmark: true, f: "Typical to rehire and cover" },
  ],
  opportunity:
    "The recovered time is worth more than a shorter drive home. When after-shift charting falls and stays down, likelihood-to-stay rises and fewer providers reach the decision to leave emergency medicine. Each avoided departure is $300K to $600K you do not spend rehiring and covering with locums. The plan protects the relief so it converts into retention, not just a quieter month.",
  trappedLabel: "How the burnout compounds",
  trappedSteps: [
    "1.5 hrs charting after every shift",
    "Work follows them past the shift",
    "Likelihood-to-stay erodes",
    "The departure decision",
  ],
  trappedCap:
    "Ambient cuts the after-shift load at the point of care. Whether that relief holds long enough to change the departure decision is a choice about how the recovered time gets protected. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 12 months out',
  goodCells: [
    { n: `-${fmtOneDecimal(edRetentionPrize.typical.turnoverPts)} pts`, k: "Voluntary turnover" },
    { n: fmtOneDecimal(edRetentionPrize.typical.departures), k: "Departures avoided / year" },
    { n: fmtMoneyCompact(edRetentionPrize.typical.value), coral: true, k: "Replacement cost avoided" },
    { n: "<0.5h", k: "After-shift documentation" },
  ],
  curveIntro:
    "Most ED retention stories fade. The relief shows up in month one, then shift loads grow and coverage gaps refill the after-shift charting, and by the time the annual survey runs the burden is back and so is the attrition. That is the dashed line. Your plan is the line above it: relief that is measured and protected, month by month, until it changes the departure decision.",
  bendsLead:
    "The dashed path is not Abridge wearing off. The after-shift load drops on nearly every deployment. Retention fades only when that relief is allowed to refill. Three things hold the line, and all three live in how you staff the department, not the software:",
  bends: [
    "Recovered post-shift time is protected, not absorbed by heavier shift assignments.",
    "Coverage gaps are backfilled with locums or float staff so the burden does not quietly return.",
    "Likelihood-to-stay is pulsed in a short check, not once a year.",
  ],
  bendsCloser: "The first link is where relief like this usually slips, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because relief is easy to give and easy to take back. Heavier shift assignments and unfilled lines quietly refill the after-shift load, and the retention gain evaporates before it ever shows up in turnover. Protecting the recovered time is the one thing this plan holds.",
  hardestTitle: "Protecting the Relief",
  hardestArrow: "↑",
  hardestLead:
    "Relief is easy to hand out and easy to claw back. The moment shift assignments get heavier or a colleague leaves unbackfilled, the after-shift charting fills right back up, and the provider is exactly where they were before Abridge. Retention only holds if the relief is treated as a protected asset, not a temporary bonus. We hold it three ways.",
  splitLabel: "The two ways recovered time gets used",
  splitLeft: ["Absorbed", "The after-shift time refills with a heavier assignment or covering a gap. The relief was real but temporary, and it shows up as nothing."],
  splitRight: ["Protected", "The after-shift time stays freed. Likelihood-to-stay rises and the departure decision never gets made. This is retention value."],
  splitCloser: "Both start from the same recovered hour. Only protected time becomes retention. The floor has to be a commitment, not a hope.",
  barHead: "Where the recovered time is going now",
  barAcc: 58,
  barTarget: 72,
  barAccLbl: "protected",
  barRelLbl: "absorbed",
  cadenceLead: "Retention fades between the annual surveys, so the plan is steered monthly on the leading signals, not on the lagging turnover number.",
  monthly: [
    "Is after-shift documentation still under the floor?",
    "Did any shift assignment go unbackfilled this month?",
    "What did the likelihood-to-stay pulse show?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, hold. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to avoid three departures, we are well on the way and holding the relief, here is the runway on the rest." The relief was always real. This is the plan that made it stick. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: `Goal · ${fmtMoneyCompact(edRetentionPrize.conservative.value)} · ${fmtOneDecimal(edRetentionPrize.conservative.departures)} departures avoided`, goalMargin: edRetentionPrize.conservative.value },
    { key: "typical", label: "Typical", goalLabel: `Goal · ${fmtMoneyCompact(edRetentionPrize.typical.value)} · ${fmtOneDecimal(edRetentionPrize.typical.departures)} departures avoided`, goalMargin: edRetentionPrize.typical.value },
    { key: "ambitious", label: "Ambitious", goalLabel: `Goal · ${fmtMoneyCompact(edRetentionPrize.ambitious.value)} · ${fmtOneDecimal(edRetentionPrize.ambitious.departures)} departures avoided`, goalMargin: edRetentionPrize.ambitious.value },
  ],
};

const edRevenue: SettingGoalContent = {
  subtitle: "Emergency Department · 24/7 coverage",
  thesis1: "The work was already done.",
  thesis2: "This is the plan to capture it.",
  p1Lead:
    "Providers in this scope are managing multiple concurrent problems per encounter and documenting less of that complexity than they actually perform, especially on high-acuity charts written between patients. A visit that involved a real medical-decision-making workup gets coded lower because the note did not carry the detail the coder needed. The clinical work already happened. Whether it shows up on the claim is a documentation-to-coding handoff that mostly does not get watched.",
  worldCards: [
    { k: "Avg E/M level", n: "3.5", benchmark: true, f: "ED benchmark" },
    { k: "First-pass acceptance", n: "94%+", benchmark: true, f: "Clean-claim benchmark" },
  ],
  opportunity:
    "This is not about coding more aggressively. It is about coding accurately for care that was delivered and is now documented. When the note carries the complexity of the workup, the coder can support the level and the claim reflects the encounter. That gap, closed, is captured margin, counted once.",
  trappedLabel: "How the revenue leaks",
  trappedSteps: [
    "Complex workup delivered",
    "Note omits the decision-making detail",
    "Coder supports a lower level",
    "Revenue left on the claim",
  ],
  trappedCap:
    "Ambient captures the complexity in the note at the point of care. Whether that turns into an accurate code depends on the billing workflow downstream. That handoff is what this plan is built around.",
  goodHead: 'What "good" looks like, 9 months out',
  goodCells: [
    { n: "+0.3", k: "wRVU / encounter" },
    { n: "3.5", k: "Average E/M level" },
    { n: "$980K", coral: true, k: "Captured margin" },
    { n: "94%", k: "First-pass acceptance" },
  ],
  curveIntro:
    "Most ED coding-accuracy gains stall. The documentation improves in month one, but the coding and billing workflow keeps running the way it always has, and the captured revenue never lands. That is the dashed line. Your plan is the line above it: completeness that actually flows through to the code and the claim, watched month by month.",
  bendsLead:
    "The dashed path is not Abridge failing to capture detail. Note completeness improves on nearly every deployment. Revenue leaks only when the completeness never reaches the code. Three things bend it back up, and all three live in your revenue cycle, not the software:",
  bends: [
    "Coders act on the fuller medical-decision-making documentation instead of defaulting to prior patterns.",
    "Provider queries close quickly rather than aging out.",
    "The captured level clears first-pass and holds up on appeal, instead of going out below the care that was delivered.",
  ],
  bendsCloser: "The first two links are where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because they are where completeness stops being revenue. Coders default to prior-year patterns and queries age out, so the documented complexity never reaches the claim. Acting on the fuller note is the one thing this plan holds. And to stay honest, the value is counted once: E/M level and wRVU lift monetize the same encounter, so only one is booked.",
  hardestTitle: "Getting the Coding to Act",
  hardestArrow: "↑",
  hardestLead:
    "A more complete note does not code itself. Coders work from habit and volume, and unless the workflow points them at the new detail, they support the level they always have. The completeness is real, but it stops at the note. Revenue only lands if the coding acts on it. We hold it three ways.",
  splitLabel: "Where the completeness can go",
  splitLeft: ["Stops at the note", "The detail is captured but the coder never acts on it. Real documentation, zero revenue."],
  splitRight: ["Reaches the claim", "The documented complexity supports an accurate level that clears first-pass. This is captured margin."],
  splitCloser: "Both start from the same complete note. Only one becomes revenue. Acting on it has to be built into the workflow, not left to habit.",
  barHead: "Where the documented complexity is going now",
  barAcc: 46,
  barTarget: 78,
  barAccLbl: "reaching the claim",
  barRelLbl: "stopping at the note",
  cadenceLead: "Captured revenue shows up on a lag in the claims data, so the plan is steered monthly on coder uptake and query turnaround, not on the booked number.",
  monthly: [
    "Is documentation completeness still rising?",
    "What share of the documented complexity did coding act on?",
    "What is query turnaround, and is it under a week?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, expand. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to capture $980K in accurately coded care, we are well on the way, here is the runway on the rest." The work was always being done. This is the plan that captured it. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $520K captured", goalMargin: 520_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $980K captured", goalMargin: 980_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $1.5M captured", goalMargin: 1_500_000 },
  ],
};

const inpatientRevenue: SettingGoalContent = {
  subtitle: "Hospital Medicine · Med-Surg & ICU",
  thesis1: "The acuity was already documented.",
  thesis2: "This is the plan to let the DRG reflect it.",
  p1Lead:
    "Hospitalists in this scope are managing patients with real complexity and comorbidity burden, but the daily progress notes and discharge summaries often do not carry enough specificity for coding to assign the DRG the admission actually earned. A patient managed through three active comorbidities gets grouped as if they had one. The clinical acuity was real. Whether it is reflected in the DRG weight depends on documentation specificity that mostly goes unwatched until the retrospective audit.",
  worldCards: [
    { k: "CC/MCC capture rate", n: "72%", benchmark: true, f: "Industry benchmark" },
    { k: "CDI query rate", n: "~30%", benchmark: true, f: "Typical of eligible admissions" },
  ],
  opportunity:
    "This is not about upcoding. It is about the documentation carrying the comorbidity and severity detail that was actually managed, so coding can assign the DRG weight the admission earned. When the note specifies the complication or comorbidity, the claim reflects the acuity. That gap, closed, is protected margin, counted once.",
  trappedLabel: "How the DRG weight leaks",
  trappedSteps: [
    "Complex admission managed",
    "Note under-specifies the comorbidity",
    "Coding defaults to the lower-weight DRG",
    "Payment left on the claim",
  ],
  trappedCap:
    "Ambient captures the comorbidity and severity detail in the note at the point of care. Whether that specificity survives into the DRG assignment depends on the CDI and coding workflow downstream. That handoff is what this plan is built around.",
  goodHead: 'What "good" looks like, 9 months out',
  goodCells: [
    { n: "+10%", k: "Of at-risk admissions newly captured" },
    { n: "0.12", k: "Avg case-mix index lift" },
    { n: "$1.6M", coral: true, k: "Protected margin" },
    { n: "-9 pts", k: "CDI query rate" },
  ],
  curveIntro:
    "Most DRG-accuracy pushes stall. Documentation specificity improves in month one, but CDI queries keep aging and coding keeps defaulting to prior patterns, so the case-mix lift never lands. That is the dashed line. Your plan is the line above it: specificity that actually survives into the DRG assignment, watched admission by admission.",
  bendsLead:
    "The dashed path is not Abridge failing to capture acuity. Documentation specificity improves on nearly every deployment. DRG weight leaks only when that specificity never reaches the coder in time. Three things bend it back up, and all three live in your CDI and coding workflow, not the software:",
  bends: [
    "CDI reviews the fuller documentation before the coder finalizes, not after.",
    "Physician queries close within the stay, not after discharge.",
    "The captured DRG weight clears the payer audit and is not downgraded on appeal.",
  ],
  bendsCloser: "The first two links are where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because they are where specificity stops being a captured DRG. CDI and coding default to prior patterns and queries age past discharge, so the documented acuity never reaches the claim. Acting on the fuller note before discharge is the one thing this plan holds. And to stay honest, the value is counted once: DRG-weight lift and CDI-query-avoidance cost are booked as separate mechanisms, never blended into one inflated number.",
  hardestTitle: "Closing the Query Before Discharge",
  hardestArrow: "↑",
  hardestLead:
    "A more complete progress note does not code itself. CDI and coding work from habit and volume, and a query that ages past discharge gets answered from memory, if at all. The specificity is real, but it stops at the note. The DRG weight only lands if the query closes while the patient is still admitted. We hold it three ways.",
  splitLabel: "Where the specificity can go",
  splitLeft: ["Stops at the note", "The comorbidity detail is documented but the query never closes before discharge. Real documentation, zero DRG lift."],
  splitRight: ["Reaches the claim", "The documented specificity supports the higher-weight DRG and clears audit. This is protected margin."],
  splitCloser: "Both start from the same complete progress note. Only one becomes protected margin. Closing the query has to be built into the stay, not left to the retrospective audit.",
  barHead: "Where documented comorbidities are going now",
  barAcc: 52,
  barTarget: 82,
  barAccLbl: "closed before discharge",
  barRelLbl: "aging past discharge",
  cadenceLead: "DRG-weight lift shows up on a lag once claims are billed, so the plan is steered weekly on open CDI queries and their age, not on the billed case-mix index.",
  monthly: [
    "Is documentation specificity still rising?",
    "How many CDI queries are open, and what is their average age?",
    "What share closed before discharge this month?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, expand. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to protect $1.6M in DRG weight the acuity already earned, here is where we are and the runway on the rest." The acuity was always being managed. This is the plan that let the DRG reflect it. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $850K protected", goalMargin: 850_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $1.6M protected", goalMargin: 1_600_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $2.4M protected", goalMargin: 2_400_000 },
  ],
};

const inpatientRetentionPrize = retentionPrize("inpatient", 45);

const inpatientRetention: SettingGoalContent = {
  subtitle: "Hospital Medicine · Med-Surg & ICU",
  thesis1: "The relief is real.",
  thesis2: "This is the plan to make it stick.",
  p1Lead:
    "Hospitalists in this scope are documenting for hours after every shift, most of it from home, on top of a rounding load that already runs long. Exit interviews name charting burden as a leading reason people leave hospital medicine. The relief Abridge creates is real and immediate. Whether it lasts, or gets quietly refilled by bigger panels and coverage gaps, is the difference between a number that holds and one that fades by month nine.",
  worldCards: [
    { k: "Annual turnover", n: `${WORKFORCE_TURNOVER_DEFAULT_PCT.inpatient}%`, benchmark: true, f: "Starting voluntary turnover this plan uses" },
    { k: "Burnout share of exits", n: "~45%", benchmark: true, f: "Typical share attributed to burnout" },
    { k: "Replacement cost / hospitalist", n: "$250K to $500K", benchmark: true, f: "Typical to rehire and cover" },
  ],
  opportunity:
    "The recovered time is worth more than a nicer evening. When after-hours charting falls and stays down, likelihood-to-stay rises and fewer hospitalists reach the decision to leave. Each avoided departure is $250K to $500K you do not spend rehiring and covering with locums. The plan protects the relief so it converts into retention, not just a quieter month.",
  trappedLabel: "How the burnout compounds",
  trappedSteps: [
    "1 to 2 hrs charting after every shift",
    "Work follows them home",
    "Likelihood-to-stay erodes",
    "The departure decision",
  ],
  trappedCap:
    "Ambient cuts the after-hours load at the point of care. Whether that relief holds long enough to change the departure decision is a choice about how the recovered time gets protected. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 12 months out',
  goodCells: [
    { n: `-${fmtOneDecimal(inpatientRetentionPrize.typical.turnoverPts)} pts`, k: "Voluntary turnover" },
    { n: fmtOneDecimal(inpatientRetentionPrize.typical.departures), k: "Departures avoided / year" },
    { n: fmtMoneyCompact(inpatientRetentionPrize.typical.value), coral: true, k: "Replacement cost avoided" },
    { n: "<0.5h", k: "After-hours documentation" },
  ],
  curveIntro:
    "Most retention stories fade. The relief shows up in month one, then panels grow, coverage gaps refill the evening, and by the time the annual survey runs the after-hours load is back and so is the attrition. That is the dashed line. Your plan is the line above it: relief that is measured and protected, month by month, until it changes the departure decision.",
  bendsLead:
    "The dashed path is not Abridge wearing off. The after-hours load drops on nearly every deployment. Retention fades only when that relief is allowed to refill. Three things hold the line, and all three live in how you run the group, not the software:",
  bends: [
    "Recovered evening time is protected, not absorbed by larger panels.",
    "Coverage gaps are backfilled so the burden does not quietly return.",
    "Likelihood-to-stay is pulsed in a short check, not once a year.",
  ],
  bendsCloser: "The first link is where relief like this usually slips, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because relief is easy to give and easy to take back. Bigger panels and unfilled shifts quietly refill the evening, and the retention gain evaporates before it ever shows up in turnover. Protecting the recovered time is the one thing this plan holds.",
  hardestTitle: "Protecting the Relief",
  hardestArrow: "↑",
  hardestLead:
    "Relief is easy to hand out and easy to claw back. The moment panels grow or a colleague leaves unbackfilled, the recovered evening fills right back up, and the hospitalist is exactly where they were before Abridge. Retention only holds if the relief is treated as a protected asset, not a temporary bonus. We hold it three ways.",
  splitLabel: "The two ways recovered time gets used",
  splitLeft: ["Absorbed", "The evening refills with a bigger panel or covering a gap. The relief was real but temporary, and it shows up as nothing."],
  splitRight: ["Protected", "The evening stays quiet. Likelihood-to-stay rises and the departure decision never gets made. This is retention value."],
  splitCloser: "Both start from the same recovered hour. Only protected time becomes retention. The floor has to be a commitment, not a hope.",
  barHead: "Where the recovered time is going now",
  barAcc: 62,
  barTarget: 75,
  barAccLbl: "protected",
  barRelLbl: "absorbed",
  cadenceLead: "Retention fades between the annual surveys, so the plan is steered monthly on the leading signals, not on the lagging turnover number.",
  monthly: [
    "Is after-hours documentation still under the floor?",
    "Did any panel grow or shift go unbackfilled this month?",
    "What did the likelihood-to-stay pulse show?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, hold. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to avoid the departures burnout was driving, we are on our way and holding the relief, here is the runway on the rest." The relief was always real. This is the plan that made it stick. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: `Goal · ${fmtMoneyCompact(inpatientRetentionPrize.conservative.value)} · ${fmtOneDecimal(inpatientRetentionPrize.conservative.departures)} departures avoided`, goalMargin: inpatientRetentionPrize.conservative.value },
    { key: "typical", label: "Typical", goalLabel: `Goal · ${fmtMoneyCompact(inpatientRetentionPrize.typical.value)} · ${fmtOneDecimal(inpatientRetentionPrize.typical.departures)} departures avoided`, goalMargin: inpatientRetentionPrize.typical.value },
    { key: "ambitious", label: "Ambitious", goalLabel: `Goal · ${fmtMoneyCompact(inpatientRetentionPrize.ambitious.value)} · ${fmtOneDecimal(inpatientRetentionPrize.ambitious.departures)} departures avoided`, goalMargin: inpatientRetentionPrize.ambitious.value },
  ],
};

const nursingQuality: SettingGoalContent = {
  subtitle: "Med-Surg & ICU · Nursing",
  thesis1: "The documentation is timelier.",
  thesis2: "This is the plan to turn it into fewer events.",
  p1Lead:
    "Nurses in this scope are charting closer to the point of care and less at the end of the shift. Timely documentation is the leading edge of safer care: bundles get charted when they are done, deterioration gets flagged when it appears. But timelier notes only translate into safer care if the routine at the bedside changes with them. That is the link that usually goes unwatched.",
  worldCards: [
    { k: "HAPI rate", n: "2.0 / 1k", benchmark: true, f: "Benchmark, per 1,000 patient-days" },
    { k: "Bundle compliance", n: "95%+", benchmark: true, f: "Typical target" },
    { k: "Cost / safety event", n: "$20K to $50K", benchmark: true, f: "Typical cost per event" },
  ],
  opportunity:
    "Ambient frees nurses from end-of-shift batch charting, so documentation happens with the care event, not hours later. That timeliness is what makes bundle compliance real and deterioration visible early. Each pressure injury or bloodstream infection runs $20K to $50K in cost, and is harm a patient should never experience. The plan turns timelier notes into stronger safety measures.",
  trappedLabel: "How harm slips through",
  trappedSteps: [
    "End-of-shift batch charting",
    "Bundle steps charted late",
    "Gaps invisible in real time",
    "The preventable event",
  ],
  trappedCap:
    "Ambient moves documentation to the point of care, so a missed bundle step is visible while there is still time to act. Whether that visibility changes the bedside routine is a choice about unit workflow. That is what this plan is built around.",
  goodHead: 'What "good" looks like, 12 months out',
  goodCells: [
    { n: "-0.9", k: "HAPI rate / 1,000" },
    { n: "22", k: "Fewer safety events / year" },
    { n: "$1.6M", coral: true, k: "Safety-cost exposure" },
    { n: "95%", k: "Bundle compliance" },
  ],
  curveIntro:
    "Most quality gains stall at the chart. Documentation gets timelier, but the bedside routine does not change, so bundle compliance and event rates hold where they were. That is the dashed line. Your plan is the line above it: timely documentation that actually changes the care at the bedside, unit by unit, month by month.",
  bendsLead:
    "The dashed path is not Abridge failing to capture care. Documentation timeliness improves on nearly every deployment. Event rates fall only when the timeliness changes the bedside routine. Three things bend it back up, and all three live on the unit, not in the software:",
  bends: [
    "Real-time bundle gaps are acted on during the shift, not reconciled after it.",
    "Early deterioration signals trigger a response, not just a note.",
    "Unit leadership reviews the misses weekly and closes the loop with staff.",
  ],
  bendsCloser: "The first two links are where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because timely charting only translates into safer care if someone acts on what it shows. A gap visible on the screen still needs a nurse to close it at the bedside. Changing that routine is the one thing this plan holds. Value is counted as the documentation-attributable cost per event, so it never inflates.",
  hardestTitle: "Changing the Bedside Routine",
  hardestArrow: "↑",
  hardestLead:
    "A timelier note does not change an outcome on its own. It makes the missed bundle step or the early warning visible, but a person still has to act while there is time. Unless the unit routine changes to act on what the documentation shows, the timeliness is just a cleaner record of the same outcome. The outcome only changes if the bedside changes. We hold it three ways.",
  splitLabel: "Where the timely documentation can go",
  splitLeft: ["A cleaner record", "The care event is charted on time, but the routine is unchanged. Better documentation of the same event rate."],
  splitRight: ["An event caught in time", "The gap is seen and closed at the bedside while it matters. This is the documentation-attributable cost, counted conservatively."],
  splitCloser: "Both start from the same timely note. Only one changes the outcome. Acting on it has to be built into the shift, not left to the audit.",
  barHead: "Where real-time gaps are being handled now",
  barAcc: 55,
  barTarget: 85,
  barAccLbl: "closed during the shift",
  barRelLbl: "reconciled after",
  cadenceLead: "Event rates move slowly and on a lag, so the plan is steered monthly on bundle compliance and real-time gap closure, not on the quarterly harm numbers.",
  monthly: [
    "Is point-of-care documentation still holding?",
    "What share of real-time bundle gaps got closed during the shift?",
    "How did audited bundle compliance move on each unit?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, expand. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to move the safety measures this documentation makes visible, we are on our way, here is the runway on the rest." The documentation was always getting timelier. This is the plan that turned it into stronger safety measures. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $900K · 12 fewer safety events", goalMargin: 900_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $1.6M · 22 fewer safety events", goalMargin: 1_600_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $2.3M · 32 fewer safety events", goalMargin: 2_300_000 },
  ],
};

const nursingRetentionPrize = retentionPrize("nursing", 480);

const nursingRetention: SettingGoalContent = {
  subtitle: "Med-Surg & ICU · Nursing",
  thesis1: "The relief is real.",
  thesis2: "This is the plan to make it stick.",
  p1Lead:
    "Nurses in this scope are staying late to finish charting, and exit interviews name documentation burden alongside staffing ratios as a leading reason nurses leave the bedside. The relief Abridge creates at the point of care is real and immediate. Whether it lasts, or gets quietly refilled by heavier assignments and unfilled shifts, is the difference between a number that holds and one that fades by month twelve.",
  worldCards: [
    { k: "Annual RN turnover", n: `${WORKFORCE_TURNOVER_DEFAULT_PCT.nursing}%`, benchmark: true, f: "Starting voluntary RN turnover this plan uses" },
    { k: "Burnout share of exits", n: "~40%", benchmark: true, f: "Typical share attributed to burnout" },
    { k: "Replacement cost / RN", n: "$40K to $65K", benchmark: true, f: "Typical to rehire and orient" },
  ],
  opportunity:
    "The recovered time is worth more than a shorter handoff. When charting-after-shift falls and stays down, likelihood-to-stay rises and fewer nurses reach the decision to leave the unit. Each avoided departure is $40K to $65K you do not spend on hiring, orientation, and interim agency coverage. The plan protects the relief so it converts into retention, not just a quieter shift.",
  trappedLabel: "How the burnout compounds",
  trappedSteps: [
    "Charting stacks up during the shift",
    "The record gets finished late, off the clock",
    "Likelihood-to-stay erodes",
    "The departure decision",
  ],
  trappedCap:
    "Ambient documentation moves charting closer to the bedside, cutting the late finish. Whether that relief holds long enough to change the departure decision is a choice about how the recovered time gets protected on the unit. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 12 months out',
  goodCells: [
    { n: `-${fmtOneDecimal(nursingRetentionPrize.typical.turnoverPts)} pts`, k: "Voluntary RN turnover" },
    { n: fmtOneDecimal(nursingRetentionPrize.typical.departures), k: "Departures avoided / year" },
    { n: fmtMoneyCompact(nursingRetentionPrize.typical.value), coral: true, k: "Replacement cost avoided" },
    { n: "<10m", k: "Charting after shift" },
  ],
  curveIntro:
    "Most nursing retention stories fade. The relief shows up in month one, then assignments get heavier and open shifts go uncovered, and by the time the annual engagement survey runs the after-shift charting is back and so is the attrition. That is the dashed line. Your plan is the line above it: relief that is measured and protected, month by month, until it changes the departure decision.",
  bendsLead:
    "The dashed path is not Abridge wearing off. Charting-after-shift drops on nearly every deployment. Retention fades only when that relief is allowed to refill. Three things hold the line, and all three live in how the unit is staffed, not the software:",
  bends: [
    "Recovered time is protected, not absorbed by heavier patient assignments.",
    "Open shifts are backfilled so the burden does not quietly return to the remaining nurses.",
    "Likelihood-to-stay is pulsed each quarter, not once a year.",
  ],
  bendsCloser: "The first link is where relief like this usually slips, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because relief is easy to give and easy to take back. Heavier assignments and unfilled shifts quietly refill the after-shift charting, and the retention gain evaporates before it ever shows up in turnover. Protecting the recovered time is the one thing this plan holds.",
  hardestTitle: "Protecting the Relief",
  hardestArrow: "↑",
  hardestLead:
    "Relief is easy to hand out and easy to claw back. The moment an assignment gets heavier or a shift goes unfilled, the after-shift charting fills right back up, and the nurse is exactly where they were before Abridge. Retention only holds if the relief is treated as a protected asset, not a temporary bonus. We hold it three ways.",
  splitLabel: "The two ways recovered time gets used",
  splitLeft: ["Absorbed", "The recovered minutes refill with a heavier assignment or covering an open shift. The relief was real but temporary, and it shows up as nothing."],
  splitRight: ["Protected", "The nurse leaves closer to on time. Likelihood-to-stay rises and the departure decision never gets made. This is retention value."],
  splitCloser: "Both start from the same recovered minutes. Only protected time becomes retention. The floor has to be a commitment, not a hope.",
  barHead: "Where the recovered time is going now",
  barAcc: 58,
  barTarget: 78,
  barAccLbl: "protected",
  barRelLbl: "absorbed",
  cadenceLead: "Retention fades between the annual surveys, so the plan is steered monthly on the leading signals, not on the lagging turnover number.",
  monthly: [
    "Is charting-after-shift still under the floor?",
    "Did any assignment grow or shift go unbackfilled this month?",
    "What did the likelihood-to-stay pulse show?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, hold. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to avoid nine departures, we are well on the way and holding the relief, here is the runway on the rest." The relief was always real. This is the plan that made it stick. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: `Goal · ${fmtMoneyCompact(nursingRetentionPrize.conservative.value)} · ${fmtOneDecimal(nursingRetentionPrize.conservative.departures)} departures avoided`, goalMargin: nursingRetentionPrize.conservative.value },
    { key: "typical", label: "Typical", goalLabel: `Goal · ${fmtMoneyCompact(nursingRetentionPrize.typical.value)} · ${fmtOneDecimal(nursingRetentionPrize.typical.departures)} departures avoided`, goalMargin: nursingRetentionPrize.typical.value },
    { key: "ambitious", label: "Ambitious", goalLabel: `Goal · ${fmtMoneyCompact(nursingRetentionPrize.ambitious.value)} · ${fmtOneDecimal(nursingRetentionPrize.ambitious.departures)} departures avoided`, goalMargin: nursingRetentionPrize.ambitious.value },
  ],
};

const nursingCapacity: SettingGoalContent = {
  subtitle: "Med-Surg & ICU · Nursing",
  thesis1: "The overtime is real.",
  thesis2: "This is the plan to take out the share of overtime that charting causes.",
  p1Lead:
    "Nurses in this scope are staying past the end of the shift to finish charting, batching notes and catching up late, sometimes working through lunch to get the record done. Some of that overtime is short staffing and census, which no documentation tool can move. But a real share of it is the charting itself. Ambient documentation lets nurses chart in the moment, so the shift can close on time. Whether that freed minute lands on the shift, or turns into a new task, is the difference between overtime that comes down and overtime that holds.",
  worldCards: [
    { k: "Documentation-driven OT", n: "~55%", benchmark: true, f: "Typical share of overtime" },
    { k: "Loaded OT rate", n: "$75/hr", benchmark: true, f: "Typical base plus premium" },
  ],
  opportunity:
    "You can only cut the overtime charting causes, and that share is the ceiling. When after-shift charting falls and the shift closes on time, the documentation-driven overtime comes off the payroll. Each overtime hour avoided is loaded overtime wages you stop paying now. The plan takes out that share and leaves the staffing and census overtime honestly out of the number.",
  trappedLabel: "How the overtime accrues",
  trappedSteps: [
    "Charting stacks up during the shift",
    "Notes get batched and caught up late",
    "The shift runs past its end",
    "Time is paid as overtime",
  ],
  trappedCap:
    "Ambient moves charting to the point of care, so the shift can close on time. Whether that freed minute stays on the shift or becomes a new task is a choice about the unit workflow. That choice is what this plan is built around.",
  goodHead: 'What "good" looks like, 9 months out',
  goodCells: [
    { n: "-1.4", k: "Overtime hrs / nurse / week" },
    { n: "6,900", k: "Overtime hours avoided / year" },
    { n: "$520K", coral: true, k: "Overtime wages avoided" },
    { n: ">90%", k: "On-time shift completion" },
  ],
  curveIntro:
    "Most overtime pushes drift. Charting gets easier, but the freed minute is quietly refilled by a new task and the shift still runs late, so the overtime holds where it was. That is the dashed line. Your plan is the line above it: freed time that actually closes the shift on time, unit by unit, month by month.",
  bendsLead:
    "The dashed path is not Abridge failing to save time. Charting moves into the shift on nearly every deployment. Overtime comes down only when that freed minute lands on the shift instead of becoming a new task. Three things bend it back down, and all three live on the unit, not in the software:",
  bends: [
    "The freed minute closes the shift on time, instead of being refilled by a new task.",
    "Late finishes and missed lunches are tracked and worked down, not absorbed.",
    "Nursing operations holds the share of overtime that is documentation-driven, separate from staffing and census.",
  ],
  bendsCloser: "The first link is where plans like this usually slip, so every link below gets an owner and a date.",
  fragile:
    "Links 3 and 4 are flagged because the freed minute is easy to give and easy to refill. A new task or a heavier assignment quietly fills the recovered time, and the shift still runs late, so the overtime never comes off. Making that minute close the shift on time is the one thing this plan holds. And to stay honest, overtime avoided is counted once: it is wages you stop paying now, separate from the replacement cost retention books.",
  hardestTitle: "Landing the Freed Minute on the Shift",
  hardestArrow: "↓",
  hardestLead:
    "A faster note does not cut overtime on its own. It gives the minute back, but a person still has to let the shift close on time instead of filling that minute with a new task. Unless the unit workflow protects the recovered minute, the shift still runs late and the overtime holds. Overtime only comes down if the freed minute lands on the shift. We hold it three ways.",
  splitLabel: "Where the freed minute can go",
  splitLeft: ["Refilled", "A new task or a heavier assignment fills the recovered minute. The shift still runs late, and the overtime is exactly where it was."],
  splitRight: ["On the shift", "The recovered minute closes the shift on time. The documentation-driven overtime comes off the payroll. This is overtime wages avoided."],
  splitCloser: "Both start from the same recovered minute. Only one takes out overtime. Closing the shift on time has to be a commitment, not a hope.",
  barHead: "Where the freed minute is going now",
  barAcc: 55,
  barTarget: 80,
  barAccLbl: "closing the shift on time",
  barRelLbl: "refilled by a new task",
  cadenceLead: "Overtime shows up on a lag in the payroll data, so the plan is steered monthly on overtime hours per nurse and on-time shift completion, not on the booked overtime spend.",
  monthly: [
    "Is after-shift charting still falling?",
    "What share of shifts are closing on time?",
    "How did overtime hours per nurse move on each unit?",
    "What is the one ask this month, and who owns it?",
    "Did last month's ask get done? If yes, expand. If no, escalate to the goal-owner.",
  ],
  renewal:
    'The conversation is no longer "was it worth the price." It is "we set out to take out $520K of documentation-driven overtime, we are well on the way, here is the runway on the rest." The overtime was always partly the charting. This is the plan that took out that share. Price becomes progress.',
  ambition: [
    { key: "conservative", label: "Conservative", goalLabel: "Goal · $290K · 3,900 OT hrs avoided", goalMargin: 290_000 },
    { key: "typical", label: "Typical", goalLabel: "Goal · $520K · 6,900 OT hrs avoided", goalMargin: 520_000 },
    { key: "ambitious", label: "Ambitious", goalLabel: "Goal · $760K · 10,100 OT hrs avoided", goalMargin: 760_000 },
  ],
};

export const CONTENT: Record<AttainSetting, Partial<Record<GoalId, SettingGoalContent>>> = {
  outpatient: {
    access: outpatientAccess,
    retention: outpatientRetention,
    revenue: outpatientRevenue,
  },
  ed: {
    access: edAccess,
    retention: edRetention,
    revenue: edRevenue,
  },
  inpatient: {
    revenue: inpatientRevenue,
    retention: inpatientRetention,
  },
  nursing: {
    quality: nursingQuality,
    retention: nursingRetention,
    capacity: nursingCapacity,
  },
};

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/** Resolve an arbitrary GoalId list to setting-correct GoalDefs (applies the
 * per-setting relabels). Used by goalsForSetting and by the Value Attainment
 * Strategy flow, which offers its own all-four-domains goal list. */
export function goalDefs(setting: AttainSetting, ids: GoalId[]): GoalDef[] {
  return ids.map((goalId) => {
    const g = GOAL_CATALOG[goalId];
    // nurses aren't "providers" — relabel the retention goal on the Nursing setting (id stays "retention")
    if (setting === "nursing" && goalId === "retention") {
      return { ...g, label: "Nurse Retention", domainSub: "Nurse Wellbeing & Retention" };
    }
    // the shared "capacity" goal is Nursing's overtime play by default; on Inpatient it is the
    // discharge-timing / earlier-bed-turn play, so relabel it (id stays "capacity").
    if (setting === "inpatient" && goalId === "capacity") {
      return { ...g, label: "Inpatient Capacity", domainSub: "Discharge Timing & Bed Turns" };
    }
    return g;
  });
}

export function goalsForSetting(setting: AttainSetting): GoalDef[] {
  return goalDefs(setting, SETTING_GOAL_MATRIX[setting]);
}

export function getContent(
  setting: AttainSetting,
  goal: GoalId,
): SettingGoalContent | undefined {
  return CONTENT[setting]?.[goal];
}
