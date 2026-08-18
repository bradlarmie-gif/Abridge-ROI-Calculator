import type { AttainSetting, GoalId } from "./attainTypes";

/**
 * VALUE ATTAINMENT STRATEGY: the backward-trace model.
 *
 * This is the FRONT half of value attainment: before any ROI or financial work,
 * we trace a desired outcome backward through the four things that have to be
 * true for it to actually happen: operating conditions, decisions, behaviors,
 * and dependencies. It is a theory of change, not a calculator: there are no
 * dollars here, and no owners either. Owners, cadence, and what we track are the
 * job of the Planning back half, so this model deliberately carries none of them.
 *
 * Interaction is HYBRID: each layer ships authored suggestions (some `defaultOn`),
 * and the partner keeps, cuts, or adds their own.
 */

export type TraceLayer = "conditions" | "decisions" | "behaviors" | "dependencies";

export interface TraceItem {
  id: string;
  label: string;
  /** one quiet line teaching why this has to be true */
  helper?: string;
  /** pre-suggested (checked) on landing */
  defaultOn?: boolean;
  /** commonly the weak link, flagged on the map so it gets attention */
  fragile?: boolean;
}

export interface OutcomeTrace {
  outcome: string;
  outcomeSub?: string;
  conditions: TraceItem[];
  decisions: TraceItem[];
  behaviors: TraceItem[];
  dependencies: TraceItem[];
}

export const LAYER_ORDER: TraceLayer[] = ["conditions", "decisions", "behaviors", "dependencies"];

export const LAYER_META: Record<
  TraceLayer,
  { n: number; eyebrow: string; question: string; helper: string; addLabel: string; addPlaceholder: string; noun: string }
> = {
  conditions: {
    n: 1,
    eyebrow: "Operating conditions",
    question: "What has to be true operationally?",
    helper: "The operating state that already has to hold for this outcome to even be possible.",
    addLabel: "Add a condition",
    addPlaceholder: "e.g., providers have room on their panels",
    noun: "condition",
  },
  decisions: {
    n: 2,
    eyebrow: "Decisions",
    question: "What has to be decided?",
    helper: "The calls leadership and operations have to make for this to move.",
    addLabel: "Add a decision",
    addPlaceholder: "e.g., freed time is reinvested in access, not margin",
    noun: "decision",
  },
  behaviors: {
    n: 3,
    eyebrow: "Behaviors",
    question: "What has to change in how people work?",
    helper: "The day-to-day behaviors that have to shift on the ground.",
    addLabel: "Add a behavior",
    addPlaceholder: "e.g., schedulers actively fill the freed slots",
    noun: "behavior",
  },
  dependencies: {
    n: 4,
    eyebrow: "Dependencies",
    question: "What has to be in place?",
    helper: "The systems and data that have to exist for everything above to hold.",
    addLabel: "Add a dependency",
    addPlaceholder: "e.g., wait-time reporting from the EHR",
    noun: "dependency",
  },
};

// ── Flagship: Outpatient · Patient Access ────────────────────────────────────
const outpatientAccess: OutcomeTrace = {
  outcome: "Open real access: more patients seen, sooner, without adding providers.",
  outcomeSub: "The documentation time ambient AI gives back becomes visits, not just shorter days.",
  conditions: [
    { id: "c_time", label: "The freed documentation time is real", helper: "Providers are live on Abridge and closing notes in the room, so the time actually shows up.", defaultOn: true },
    { id: "c_slots", label: "There are open or fillable slots to absorb it", helper: "The schedule has room, or templates can add slots, so freed time can become visits.", defaultOn: true },
    { id: "c_demand", label: "There is unmet demand to fill them", helper: "A backlog or waitlist of patients who want to be seen.", defaultOn: true },
    { id: "c_panel", label: "Panels have room to grow", helper: "Providers are not already sitting at a hard panel cap." },
  ],
  decisions: [
    { id: "d_reinvest", label: "Freed time is reinvested into access", helper: "Leadership commits the recovered time to seeing more patients, not only to shorter days or margin.", defaultOn: true, fragile: true },
    { id: "d_target", label: "A concrete access target is set", helper: "For example, added new-patient visits per provider per week.", defaultOn: true },
    { id: "d_first", label: "The first clinics or specialties are chosen", helper: "Where the freed capacity gets pointed first." },
    { id: "d_metric", label: "Access is the metric that counts this period", helper: "Wait time and new-patient volume define success, not utilization." },
  ],
  behaviors: [
    { id: "b_document", label: "Providers document in the room and close same day", helper: "The behavior that actually frees the time.", defaultOn: true },
    { id: "b_fill", label: "Schedulers actively fill the freed slots", helper: "Freed time gets booked instead of quietly evaporating.", defaultOn: true, fragile: true },
    { id: "b_accept", label: "Providers accept the added visits", helper: "The flexed template gets used, not worked around." },
    { id: "b_review", label: "Clinic leads watch open-slot fill", helper: "Someone notices whether the capacity is actually landing." },
  ],
  dependencies: [
    { id: "dep_adoption", label: "Adoption and note-timing visibility", helper: "Who is live, and whether notes are closing in the room.", defaultOn: true },
    { id: "dep_access", label: "Access and wait-time data from the EHR", helper: "New-patient wait, third-next-available, and slot fill.", defaultOn: true },
    { id: "dep_volume", label: "Visit-volume reporting by provider", helper: "So added visits can be seen and attributed." },
    { id: "dep_templates", label: "Scheduling templates that can flex", helper: "The system can add freed slots without a full rebuild." },
  ],
};

// ── Outpatient · Provider Retention ──────────────────────────────────────────
const outpatientRetention: OutcomeTrace = {
  outcome: "Keep the providers you have by making the day sustainable.",
  outcomeSub: "The relief ambient AI creates only changes who stays if it is protected, not quietly absorbed.",
  conditions: [
    { id: "c_burden", label: "The documentation burden actually drops", helper: "Providers are live and after-hours charting, the pajama time, measurably falls.", defaultOn: true },
    { id: "c_risk", label: "You can see who is at risk", helper: "The providers close to leaving or burning out are identifiable, not a guess.", defaultOn: true },
    { id: "c_cost", label: "Turnover is a real, costed problem", helper: "Vacancies, locum coverage, and lost ramp-up make retention worth the effort." },
    { id: "c_visible", label: "Leaders can see workload, not just output", helper: "Something more than RVUs tells you how heavy the day really is." },
  ],
  decisions: [
    { id: "d_protect", label: "Freed time is protected as relief", helper: "Leadership commits to a lighter day, not to backfilling the recovered time with more volume.", defaultOn: true, fragile: true },
    { id: "d_define", label: "What sustainable means is defined", helper: "For example, notes closed by end of clinic and no weekend charting.", defaultOn: true },
    { id: "d_goal", label: "Retention is an explicit goal this year", helper: "Not just an outcome you hope follows from productivity." },
    { id: "d_own", label: "Wellbeing is treated as a managed outcome", helper: "It has a real place in operating reviews, not a slogan on a slide." },
  ],
  behaviors: [
    { id: "b_close", label: "Providers close notes in clinic", helper: "The charting stops following them home, which is the point.", defaultOn: true },
    { id: "b_checkin", label: "Managers check on workload, not only volume", helper: "The conversation includes how heavy the day feels.", defaultOn: true },
    { id: "b_nofill", label: "Leaders resist refilling the freed time", helper: "New mandates and added sessions do not quietly eat the relief.", fragile: true },
    { id: "b_take", label: "Providers actually take the relief", helper: "The recovered time is used to decompress, not self-imposed as more work." },
  ],
  dependencies: [
    { id: "dep_afterhours", label: "After-hours documentation signal", helper: "Pajama-time and note-lag data, so you can see the burden change.", defaultOn: true },
    { id: "dep_turnover", label: "Turnover and vacancy data by group", helper: "The baseline retention picture you are trying to move.", defaultOn: true },
    { id: "dep_sentiment", label: "A read on provider sentiment", helper: "A survey or pulse that captures how the day feels." },
    { id: "dep_adoption", label: "Adoption visibility", helper: "Who is live and who is not." },
  ],
};

// ── Outpatient · Revenue Capture ─────────────────────────────────────────────
const outpatientRevenue: OutcomeTrace = {
  outcome: "Bill accurately for the care you already deliver.",
  outcomeSub: "More complete documentation supports the visit level and specificity the encounter truly warranted.",
  conditions: [
    { id: "c_complete", label: "Documentation is more complete and specific", helper: "The note now reflects the full complexity the provider addressed.", defaultOn: true },
    { id: "c_gap", label: "There is known coding leakage to recover", helper: "Under-leveling or specificity gaps that leave earned revenue on the table.", defaultOn: true },
    { id: "c_capacity", label: "Coding and CDI can act on better notes", helper: "There is review capacity to turn improved documentation into correct codes." },
    { id: "c_room", label: "Providers are not already coding at ceiling", helper: "There is genuine room to capture, not just a wish to bill more." },
  ],
  decisions: [
    { id: "d_standard", label: "The standard is accurate capture that survives audit", helper: "Documenting the work that was truly done, at a level a reviewer would uphold.", defaultOn: true },
    { id: "d_focus", label: "The first service lines are chosen", helper: "Where the leveling or specificity gap is largest and most recoverable.", defaultOn: true },
    { id: "d_educate", label: "Coding education is paired with the tooling", helper: "The note improving only helps if the coding workflow acts on it." },
    { id: "d_baseline", label: "A baseline and target are set", helper: "For example, the current E/M distribution and where it should land." },
  ],
  behaviors: [
    { id: "b_document", label: "Providers document the full complexity they addressed", helper: "Assessment and medical decision-making reflect the real work.", defaultOn: true },
    { id: "b_apply", label: "Coders and CDI apply the improved documentation", helper: "The better note has to reach the code for any of this to land.", defaultOn: true, fragile: true },
    { id: "b_close", label: "Queries close faster because the note answers them", helper: "Less back-and-forth between coder and provider." },
    { id: "b_feedback", label: "Providers respond to coder feedback", helper: "The loop actually closes." },
  ],
  dependencies: [
    { id: "dep_em", label: "E/M level distribution and wRVU data", helper: "So the capture opportunity and the movement are visible.", defaultOn: true },
    { id: "dep_workflow", label: "A coding and CDI workflow that ingests the notes", helper: "The path from a better note to a correct code.", defaultOn: true },
    { id: "dep_denials", label: "Denial and audit-outcome tracking", helper: "Proof the capture survives, so it is real revenue." },
    { id: "dep_adoption", label: "Adoption by provider", helper: "Who is documenting with Abridge." },
  ],
};

// ── Outpatient · Quality & Safety ────────────────────────────────────────────
const outpatientQuality: OutcomeTrace = {
  outcome: "Turn attention back to the patient, and to better, safer care.",
  outcomeSub: "Time not spent typing becomes time on the exam, the history, and the plan.",
  conditions: [
    { id: "c_present", label: "Providers are more present in the visit", helper: "Eye contact and attention return when the keyboard recedes.", defaultOn: true },
    { id: "c_gaps", label: "There are quality gaps worth closing", helper: "Screening, follow-up, or care-gap closure with real room to improve.", defaultOn: true },
    { id: "c_measured", label: "Quality outcomes are tracked and attributable", helper: "You can see whether the measure actually moved." },
    { id: "c_visit", label: "The visit is where the quality action happens", helper: "The outcome depends on what happens in the room, not only back-office work." },
  ],
  decisions: [
    { id: "d_target", label: "The quality outcomes to target are chosen", helper: "For example, screening rates or follow-up closure, not everything at once.", defaultOn: true },
    { id: "d_point", label: "Freed attention is pointed at the gaps", helper: "The recovered focus goes to care, not only to moving faster.", defaultOn: true, fragile: true },
    { id: "d_outcome", label: "Quality is measured as an outcome, not just documented", helper: "The goal is the result, not a completed checkbox." },
    { id: "d_roles", label: "Care-team roles in closing gaps are defined", helper: "Who does what between visits is clear." },
  ],
  behaviors: [
    { id: "b_address", label: "Providers address care gaps while in the room", helper: "The moment of attention is used, not deferred.", defaultOn: true },
    { id: "b_plan", label: "The note captures the plan clearly", helper: "Follow-up can happen because the next step is unambiguous.", defaultOn: true },
    { id: "b_followup", label: "The team follows up on flagged gaps", helper: "Between-visit closure actually occurs." },
    { id: "b_review", label: "Providers review their quality dashboards", helper: "The signal reaches the person who can act on it." },
  ],
  dependencies: [
    { id: "dep_measures", label: "Care-gap and quality-measure data in the EHR", helper: "The gaps have to be visible to be closed.", defaultOn: true },
    { id: "dep_closure", label: "Follow-up and closure tracking", helper: "So you can see the gap actually close.", defaultOn: true },
    { id: "dep_experience", label: "A patient-experience signal", helper: "Whether the added presence is felt." },
    { id: "dep_adoption", label: "Adoption visibility", helper: "Who is live." },
  ],
};

// ── ED · Patient Access (throughput) ─────────────────────────────────────────
const edAccess: OutcomeTrace = {
  outcome: "Move patients through faster and recover the ones who leave.",
  outcomeSub: "Charting time returned at the bedside becomes throughput: shorter door-to-doc and fewer patients who leave without being seen.",
  conditions: [
    { id: "c_realtime", label: "Clinicians document in real time at the bedside", helper: "Ambient capture happens in the moment, not at the end of the shift.", defaultOn: true },
    { id: "c_constraint", label: "Documentation time is a real throughput constraint", helper: "If boarding is the true bottleneck, freed charting time will not move flow.", defaultOn: true, fragile: true },
    { id: "c_lwbs", label: "There is measurable LWBS or long door-to-doc to recover", helper: "A throughput gap worth closing." },
    { id: "c_downstream", label: "Downstream capacity can absorb a faster front end", helper: "Beds and disposition can keep up with quicker intake." },
  ],
  decisions: [
    { id: "d_sooner", label: "Freed time is used to see waiting patients sooner", helper: "The recovered capacity goes to the waiting room, not to shorter shifts alone.", defaultOn: true },
    { id: "d_metric", label: "Throughput is the target", helper: "Door-to-doc and LWBS are what success is measured against.", defaultOn: true },
    { id: "d_flow", label: "The staffing and flow model uses the freed capacity", helper: "Assignments adjust so the time actually becomes throughput." },
    { id: "d_first", label: "The first shifts or zones are chosen", helper: "Where to prove it before spreading it." },
  ],
  behaviors: [
    { id: "b_pickup", label: "Clinicians pick up waiting patients faster", helper: "The freed time turns into earlier first contact.", defaultOn: true },
    { id: "b_moment", label: "Charting happens in the moment", helper: "Notes do not pile up for the end of the shift.", defaultOn: true },
    { id: "b_board", label: "The team works the board and acts on LWBS risk", helper: "Someone owns the flow in real time, or the gains do not appear.", fragile: true },
    { id: "b_flex", label: "Charge nurses flex to the freed capacity", helper: "The department bends to use the recovered time." },
  ],
  dependencies: [
    { id: "dep_flow", label: "Door-to-doc, LWBS, and length-of-stay data", helper: "The throughput picture you are trying to move.", defaultOn: true },
    { id: "dep_board", label: "A real-time tracking board", helper: "So flow can be acted on as it happens.", defaultOn: true },
    { id: "dep_boarding", label: "Boarding and downstream-capacity visibility", helper: "So you know whether the front end is the real constraint." },
    { id: "dep_adoption", label: "Adoption by shift", helper: "Who is live, when." },
  ],
};

// ── ED · Provider Retention ──────────────────────────────────────────────────
const edRetention: OutcomeTrace = {
  outcome: "Keep emergency clinicians by taking the after-shift charting off them.",
  outcomeSub: "The documentation tail that follows an ED shift home is a leading burnout driver; removing it changes who stays.",
  conditions: [
    { id: "c_tail", label: "The end-of-shift charting tail actually shrinks", helper: "Clinicians leave closer to on time because the notes are done.", defaultOn: true },
    { id: "c_risk", label: "You can see burnout and agency reliance", helper: "Who is at risk, and how much locum coverage the gaps already cost.", defaultOn: true },
    { id: "c_cost", label: "Turnover and coverage are a real cost", helper: "Vacancies and premium agency shifts make this worth solving." },
    { id: "c_visible", label: "Workload is visible, not just productivity", helper: "You can see how heavy shifts really are." },
  ],
  decisions: [
    { id: "d_protect", label: "The relief is protected, not reclaimed", helper: "Recovered time is not spent adding patients per shift.", defaultOn: true, fragile: true },
    { id: "d_define", label: "Sustainable is defined", helper: "For example, charting finished before leaving the department.", defaultOn: true },
    { id: "d_goal", label: "Retention is an explicit goal", helper: "Named, not assumed to follow from throughput." },
    { id: "d_agency", label: "Reducing agency and locum reliance is an aim", helper: "The relief is meant to stabilize the core team." },
  ],
  behaviors: [
    { id: "b_finish", label: "Clinicians finish notes before leaving", helper: "The shift ends when the shift ends.", defaultOn: true },
    { id: "b_recovery", label: "Scheduling protects recovery between shifts", helper: "The lighter load is not undone by the calendar.", defaultOn: true },
    { id: "b_nofill", label: "Leaders do not backfill the freed time", helper: "New expectations do not absorb the relief.", fragile: true },
    { id: "b_share", label: "Wins are shared so the change is felt", helper: "The team sees the day actually got lighter." },
  ],
  dependencies: [
    { id: "dep_lag", label: "End-of-shift charting-lag signal", helper: "Whether notes are closing before clinicians leave.", defaultOn: true },
    { id: "dep_turnover", label: "Turnover and agency-spend data", helper: "The retention and coverage baseline.", defaultOn: true },
    { id: "dep_sentiment", label: "A sentiment pulse", helper: "How the shifts feel to the people working them." },
    { id: "dep_adoption", label: "Adoption by clinician", helper: "Who is live." },
  ],
};

// ── ED · Revenue Capture ─────────────────────────────────────────────────────
const edRevenue: OutcomeTrace = {
  outcome: "Capture the acuity and the admissions the visit actually warranted.",
  outcomeSub: "Complete ED documentation supports the visit level, critical-care time, and the correct admission status.",
  conditions: [
    { id: "c_complete", label: "Documentation is more complete", helper: "Acuity, procedures, and time-based services are captured in the note.", defaultOn: true },
    { id: "c_leak", label: "There is known leveling or status leakage", helper: "Under-captured acuity, missed critical-care time, or observation-versus-inpatient errors.", defaultOn: true },
    { id: "c_act", label: "Coding and CDI can act on the notes", helper: "There is capacity to turn better documentation into correct codes and status." },
    { id: "c_room", label: "There is genuine capture to recover", helper: "Not already at ceiling on acuity and status." },
  ],
  decisions: [
    { id: "d_standard", label: "The standard is accurate capture that survives audit", helper: "The acuity and status the record truly supports.", defaultOn: true },
    { id: "d_focus", label: "The focus areas are chosen", helper: "For example, visit leveling, critical-care time, or observation-versus-inpatient status.", defaultOn: true },
    { id: "d_educate", label: "Coding education is paired with the tooling", helper: "The improved note has to be acted on." },
    { id: "d_baseline", label: "A baseline and target are set", helper: "The current picture and where it should land." },
  ],
  behaviors: [
    { id: "b_document", label: "Clinicians document acuity, time, and decision-making", helper: "The record reflects the real intensity of the care.", defaultOn: true },
    { id: "b_apply", label: "Coders apply the improved notes", helper: "The better documentation has to reach the code and the status.", defaultOn: true, fragile: true },
    { id: "b_status", label: "Status decisions are documented clearly", helper: "Observation versus inpatient is supported in the note." },
    { id: "b_feedback", label: "Clinicians answer queries", helper: "The loop closes." },
  ],
  dependencies: [
    { id: "dep_capture", label: "Level distribution and critical-care capture data", helper: "So the opportunity and the movement are visible.", defaultOn: true },
    { id: "dep_workflow", label: "A coding and CDI workflow", helper: "The path from note to correct code and status.", defaultOn: true },
    { id: "dep_status", label: "Denial and status-change tracking", helper: "Proof the capture holds." },
    { id: "dep_adoption", label: "Adoption by clinician", helper: "Who is live." },
  ],
};

// ── ED · Quality & Safety ────────────────────────────────────────────────────
const edQuality: OutcomeTrace = {
  outcome: "Put clinician attention back on the sick patient.",
  outcomeSub: "Time off the keyboard is time watching the patient who is decompensating.",
  conditions: [
    { id: "c_present", label: "Bedside attention is freed", helper: "Clinicians are watching patients instead of screens.", defaultOn: true },
    { id: "c_targets", label: "There are safety targets that depend on presence", helper: "For example, sepsis, stroke, or timely reassessment.", defaultOn: true },
    { id: "c_measured", label: "The measures are tracked", helper: "Bundle compliance and reassessment can be seen." },
    { id: "c_here", label: "The ED is where the action happens", helper: "The outcome turns on real-time bedside decisions." },
  ],
  decisions: [
    { id: "d_target", label: "The safety outcomes to target are chosen", helper: "A focused set, not every metric at once.", defaultOn: true },
    { id: "d_point", label: "Freed attention goes to protocol adherence", helper: "The recovered focus is spent on the steps that keep patients safe.", defaultOn: true, fragile: true },
    { id: "d_outcome", label: "Safety is measured as an outcome", helper: "The result, not just documentation of it." },
    { id: "d_roles", label: "Team roles in the protocols are defined", helper: "Who does what when the bundle fires." },
  ],
  behaviors: [
    { id: "b_reassess", label: "Clinicians complete timely reassessments", helper: "The freed attention shows up as closer watching.", defaultOn: true },
    { id: "b_protocol", label: "Protocol steps happen in the moment", helper: "Bundles are completed at the bedside, on time.", defaultOn: true },
    { id: "b_support", label: "Documentation supports bundle compliance", helper: "The record shows the steps were done." },
    { id: "b_review", label: "The team reviews misses", helper: "Near-misses feed back into practice." },
  ],
  dependencies: [
    { id: "dep_bundle", label: "Sepsis, stroke, and reassessment data", helper: "The safety picture you are trying to move.", defaultOn: true },
    { id: "dep_prompt", label: "Real-time protocol prompts", helper: "So the right step surfaces at the right time.", defaultOn: true },
    { id: "dep_events", label: "Safety-event tracking", helper: "So harm and near-misses are visible." },
    { id: "dep_adoption", label: "Adoption by shift", helper: "Who is live." },
  ],
};

// ── Inpatient · Capacity (discharge timing & bed turns) ──────────────────────
const inpatientCapacity: OutcomeTrace = {
  outcome: "Free beds sooner by getting the discharge work done earlier.",
  outcomeSub: "Documentation time returned to hospitalists becomes earlier rounds, earlier discharge orders, and earlier bed turns.",
  conditions: [
    { id: "c_burden", label: "The hospitalist documentation burden drops", helper: "Progress notes and summaries take less of the morning.", defaultOn: true },
    { id: "c_gated", label: "Discharge is gated by provider work, not only placement", helper: "If beds turn on SNF placement, freed charting time will not move them.", defaultOn: true, fragile: true },
    { id: "c_pressure", label: "There is real bed pressure to relieve", helper: "Census and boarding make earlier turns valuable." },
    { id: "c_team", label: "The care team can act on earlier orders", helper: "Case management and nursing can move when the order lands sooner." },
  ],
  decisions: [
    { id: "d_route", label: "Freed time goes to earlier discharge work", helper: "The recovered morning is spent on the discharges, not deferred.", defaultOn: true },
    { id: "d_target", label: "An earlier-discharge target is set", helper: "For example, discharge orders in by late morning.", defaultOn: true },
    { id: "d_first", label: "The first units are chosen", helper: "Where the flow constraint is tightest." },
    { id: "d_metric", label: "Capacity is the metric that counts", helper: "Discharge timing and bed turns, not note volume." },
  ],
  behaviors: [
    { id: "b_orders", label: "Hospitalists write discharge orders earlier", helper: "The freed morning turns into earlier decisions.", defaultOn: true },
    { id: "b_moment", label: "Progress notes are documented in the moment", helper: "Rounding is not held up by charting.", defaultOn: true },
    { id: "b_cm", label: "Case management acts on early orders", helper: "The handoff has to move, or the earlier order does not turn the bed.", fragile: true },
    { id: "b_round", label: "Teams round with discharge in mind", helper: "The plan for leaving starts on the morning round." },
  ],
  dependencies: [
    { id: "dep_timing", label: "Discharge-timing data", helper: "When orders are written and patients leave.", defaultOn: true },
    { id: "dep_los", label: "Length-of-stay and bed-turn data", helper: "The capacity picture you are trying to move.", defaultOn: true },
    { id: "dep_barriers", label: "Placement and barrier tracking", helper: "So you can see whether provider work is the real constraint." },
    { id: "dep_adoption", label: "Adoption by service", helper: "Who is live." },
  ],
};

// ── Inpatient · Provider Retention (hospitalists) ────────────────────────────
const inpatientRetention: OutcomeTrace = {
  outcome: "Keep hospitalists by cutting the documentation load of the service.",
  outcomeSub: "Admissions, progress notes, and discharge summaries pile up; lifting that load changes who stays.",
  conditions: [
    { id: "c_burden", label: "The note load drops across the service", helper: "H&Ps, progress notes, and discharge summaries take measurably less time.", defaultOn: true },
    { id: "c_risk", label: "You can see risk and locum reliance", helper: "Who is at risk, and how much the gaps cost in locum coverage.", defaultOn: true },
    { id: "c_cost", label: "Turnover is a real cost", helper: "Recruiting and locum coverage make retention worth the effort." },
    { id: "c_visible", label: "Workload is visible", helper: "Census and note lag show how heavy the service really is." },
  ],
  decisions: [
    { id: "d_protect", label: "The relief is protected, not reclaimed", helper: "The lighter load is not spent on a higher census.", defaultOn: true, fragile: true },
    { id: "d_define", label: "Sustainable is defined", helper: "For example, notes closed during the shift." },
    { id: "d_goal", label: "Retention is an explicit goal", helper: "Named, not assumed.", defaultOn: true },
    { id: "d_locum", label: "Reducing locum reliance is an aim", helper: "The relief is meant to stabilize the core group." },
  ],
  behaviors: [
    { id: "b_close", label: "Notes are closed during the shift", helper: "The charting does not follow hospitalists home.", defaultOn: true },
    { id: "b_census", label: "A reasonable census and workload are held", helper: "The recovered time is not immediately re-spent.", defaultOn: true },
    { id: "b_nofill", label: "Leaders do not backfill the freed time", helper: "New service expectations do not absorb the relief.", fragile: true },
    { id: "b_share", label: "Wins are shared so the change is felt", helper: "The team sees the load actually lift." },
  ],
  dependencies: [
    { id: "dep_lag", label: "Note-lag and after-hours signal", helper: "Whether notes are closing during the shift.", defaultOn: true },
    { id: "dep_turnover", label: "Turnover and locum-spend data", helper: "The retention and coverage baseline.", defaultOn: true },
    { id: "dep_sentiment", label: "A sentiment pulse", helper: "How the service feels to work." },
    { id: "dep_adoption", label: "Adoption by hospitalist", helper: "Who is live." },
  ],
};

// ── Inpatient · Revenue Capture (severity) ───────────────────────────────────
const inpatientRevenue: OutcomeTrace = {
  outcome: "Capture the true severity of the patients you treat.",
  outcomeSub: "Complete, specific documentation supports the right DRG, the CC and MCC capture, and the severity of illness the record shows.",
  conditions: [
    { id: "c_specific", label: "Documentation is more specific and complete", helper: "The note carries the detail CDI needs to query accurately.", defaultOn: true },
    { id: "c_gap", label: "There is a known severity-capture gap", helper: "DRG or CC and MCC capture that under-reflects the real acuity.", defaultOn: true },
    { id: "c_cdi", label: "CDI can query on better notes", helper: "There is capacity to turn documentation into accurate severity." },
    { id: "c_room", label: "There is genuine capture to recover", helper: "Not already at ceiling on case mix." },
  ],
  decisions: [
    { id: "d_standard", label: "The standard is accurate severity that survives audit", helper: "The acuity the record truly supports, not upcoding.", defaultOn: true },
    { id: "d_focus", label: "The focus DRGs or service lines are chosen", helper: "Where the capture gap is largest.", defaultOn: true },
    { id: "d_educate", label: "CDI and provider education are paired", helper: "The better note only helps if querying acts on it." },
    { id: "d_baseline", label: "A baseline case mix and target are set", helper: "The current picture and where it should land." },
  ],
  behaviors: [
    { id: "b_document", label: "Providers document the specificity CDI needs", helper: "The detail that supports the correct severity is in the note.", defaultOn: true },
    { id: "b_close", label: "Queries close because the notes answer them", helper: "Better documentation shortens the query loop, but CDI still has to work it.", defaultOn: true, fragile: true },
    { id: "b_respond", label: "Providers respond to queries", helper: "The loop closes in time to affect the bill." },
    { id: "b_apply", label: "Coding applies the captured severity", helper: "The final code reflects the documented acuity." },
  ],
  dependencies: [
    { id: "dep_cmi", label: "Case-mix, CC and MCC, and query data", helper: "The severity-capture picture you are trying to move.", defaultOn: true },
    { id: "dep_workflow", label: "A CDI workflow that ingests the notes", helper: "The path from documentation to accurate severity.", defaultOn: true },
    { id: "dep_denials", label: "Denial and audit tracking", helper: "Proof the capture holds." },
    { id: "dep_adoption", label: "Adoption by provider", helper: "Who is live." },
  ],
};

// ── Inpatient · Quality & Safety ─────────────────────────────────────────────
const inpatientQuality: OutcomeTrace = {
  outcome: "Safer inpatient care from more time with patients and clearer records.",
  outcomeSub: "Time back at the bedside and accurate problem lists support harm prevention and earlier response.",
  conditions: [
    { id: "c_present", label: "Rounding and bedside attention are freed", helper: "Teams spend more of the round with the patient.", defaultOn: true },
    { id: "c_targets", label: "There are harm targets that depend on it", helper: "For example, hospital-acquired conditions, readmissions, or safety events.", defaultOn: true },
    { id: "c_docs", label: "Documentation drives some of the quality", helper: "Accurate problem lists and present-on-admission capture matter here." },
    { id: "c_measured", label: "The measures are tracked", helper: "The harm picture is visible." },
  ],
  decisions: [
    { id: "d_target", label: "The harm outcomes to target are chosen", helper: "A focused set with real room to improve.", defaultOn: true },
    { id: "d_point", label: "Freed attention goes to protocols and rounding quality", helper: "The recovered focus is spent on the steps that keep patients safe.", defaultOn: true, fragile: true },
    { id: "d_outcome", label: "Safety is measured as an outcome", helper: "The result, not documentation of it." },
    { id: "d_roles", label: "Roles in the protocols are defined", helper: "Who acts on an early warning." },
  ],
  behaviors: [
    { id: "b_steps", label: "Teams complete harm-prevention steps", helper: "The freed attention shows up as reliable protocol completion.", defaultOn: true },
    { id: "b_problem", label: "Problem lists and present-on-admission are documented accurately", helper: "The record supports the right quality picture.", defaultOn: true },
    { id: "b_escalate", label: "Teams act on early-warning signals", helper: "Deterioration is caught and escalated sooner." },
    { id: "b_review", label: "Events are reviewed", helper: "Misses feed back into practice." },
  ],
  dependencies: [
    { id: "dep_harm", label: "Hospital-acquired condition and readmission data", helper: "The harm picture you are trying to move.", defaultOn: true },
    { id: "dep_warning", label: "An early-warning or deterioration signal", helper: "So response can be earlier.", defaultOn: true },
    { id: "dep_events", label: "Safety-event tracking", helper: "So harm and near-misses are visible." },
    { id: "dep_adoption", label: "Adoption by service", helper: "Who is live." },
  ],
};

// ── Nursing · Capacity (overtime & bedside time) ─────────────────────────────
const nursingCapacity: OutcomeTrace = {
  outcome: "Cut the documentation-driven overtime and give time back to the bedside.",
  outcomeSub: "Ambient capture lowers the charting load, so nurses finish on time and spend more of the shift in the room.",
  conditions: [
    { id: "c_burden", label: "The nursing documentation load drops", helper: "Charting takes less of the shift with ambient capture.", defaultOn: true },
    { id: "c_driven", label: "Overtime is documentation-driven, not pure short-staffing", helper: "If overtime comes from open positions, less charting will not remove it.", defaultOn: true, fragile: true },
    { id: "c_cost", label: "The overtime cost is material", helper: "Unplanned overtime is a real, recurring number." },
    { id: "c_flow", label: "Freed time can return to care", helper: "The workflow lets recovered minutes go to the bedside, not new tasks." },
  ],
  decisions: [
    { id: "d_protect", label: "Freed time is protected, not absorbed", helper: "It is not immediately reclaimed by heavier ratios.", defaultOn: true, fragile: true },
    { id: "d_target", label: "An overtime or bedside-time target is set", helper: "What the recovered time is meant to change.", defaultOn: true },
    { id: "d_first", label: "The first units are chosen", helper: "Where the documentation-driven overtime is worst." },
    { id: "d_metric", label: "Capacity and wellbeing are the metric", helper: "Overtime and time at the bedside, not note counts." },
  ],
  behaviors: [
    { id: "b_moment", label: "Nurses chart in the moment", helper: "Documentation keeps up with care instead of stacking at shift end.", defaultOn: true },
    { id: "b_ratios", label: "Leaders hold ratios steady", helper: "The relief is not undone by stretching assignments.", defaultOn: true },
    { id: "b_redirect", label: "Charge nurses redirect freed time to care", helper: "The recovered minutes go to patients." },
    { id: "b_ontime", label: "Teams end the shift on time", helper: "The overtime actually falls." },
  ],
  dependencies: [
    { id: "dep_overtime", label: "Overtime and charting-time data", helper: "The picture you are trying to move.", defaultOn: true },
    { id: "dep_ratios", label: "Staffing-ratio and census data", helper: "So you can see whether the relief is being reinvested or absorbed.", defaultOn: true },
    { id: "dep_bedside", label: "A time-at-bedside signal", helper: "Whether the recovered time reaches patients." },
    { id: "dep_adoption", label: "Adoption by unit", helper: "Who is live." },
  ],
};

// ── Nursing · Nurse Retention ────────────────────────────────────────────────
const nursingRetention: OutcomeTrace = {
  outcome: "Keep nurses by making the shift finishable.",
  outcomeSub: "The charting that keeps nurses past the end of the shift is a leading reason they leave; removing it changes retention.",
  conditions: [
    { id: "c_tail", label: "The after-shift charting drops", helper: "Nurses leave closer to on time because documentation is done.", defaultOn: true },
    { id: "c_risk", label: "You can see turnover and agency reliance", helper: "Who is at risk, and how much travel and agency coverage already costs.", defaultOn: true },
    { id: "c_cost", label: "Turnover and agency are a real cost", helper: "Vacancies and premium coverage make this worth solving." },
    { id: "c_visible", label: "Workload is visible", helper: "Overtime and charting lag show how heavy shifts really are." },
  ],
  decisions: [
    { id: "d_protect", label: "The relief is protected, not reclaimed", helper: "The lighter shift is not spent on a heavier assignment.", defaultOn: true, fragile: true },
    { id: "d_define", label: "Sustainable is defined", helper: "For example, charting finished within the shift.", defaultOn: true },
    { id: "d_goal", label: "Retention is an explicit goal", helper: "Named, not assumed." },
    { id: "d_agency", label: "Reducing travel and agency reliance is an aim", helper: "The relief is meant to stabilize the core staff." },
  ],
  behaviors: [
    { id: "b_finish", label: "Nurses finish notes before leaving", helper: "The shift ends when the shift ends.", defaultOn: true },
    { id: "b_recovery", label: "Leaders protect recovery between shifts", helper: "The lighter load is not undone by the schedule.", defaultOn: true },
    { id: "b_nofill", label: "The freed time is not filled with new tasks", helper: "New duties do not absorb the relief.", fragile: true },
    { id: "b_share", label: "Wins are shared so the change is felt", helper: "Nurses see the shift actually got finishable." },
  ],
  dependencies: [
    { id: "dep_lag", label: "Charting-lag and overtime signal", helper: "Whether documentation is closing within the shift.", defaultOn: true },
    { id: "dep_turnover", label: "Turnover and agency-spend data", helper: "The retention and coverage baseline.", defaultOn: true },
    { id: "dep_sentiment", label: "A nurse-sentiment pulse", helper: "How the shifts feel to work." },
    { id: "dep_adoption", label: "Adoption by unit", helper: "Who is live." },
  ],
};

// ── Nursing · Revenue Capture ────────────────────────────────────────────────
const nursingRevenue: OutcomeTrace = {
  outcome: "Make sure nursing documentation supports the charges and acuity already earned.",
  outcomeSub: "Complete, timely nursing documentation supports charge capture and the severity picture coding relies on.",
  conditions: [
    { id: "c_complete", label: "Nursing documentation is complete and timely", helper: "Interventions and assessments are captured while they are fresh.", defaultOn: true },
    { id: "c_leak", label: "There is known charge or acuity leakage nursing docs affect", helper: "Missed infusion, procedure, or supply charges, or unsupported acuity.", defaultOn: true },
    { id: "c_rely", label: "Coding relies on nursing documentation", helper: "The nursing record feeds charge capture and the severity picture." },
    { id: "c_room", label: "There is genuine capture to recover", helper: "Late or dropped charges that are truly earned." },
  ],
  decisions: [
    { id: "d_focus", label: "The charge or acuity areas to focus are chosen", helper: "For example, infusions, procedures, or observation support.", defaultOn: true },
    { id: "d_standard", label: "The standard is accurate capture", helper: "Charges the record truly supports, not more.", defaultOn: true },
    { id: "d_align", label: "Coding and nursing are aligned", helper: "The two see the same documentation and expectations." },
    { id: "d_baseline", label: "A baseline and target are set", helper: "Current late-charge or leakage rate and where it should land." },
  ],
  behaviors: [
    { id: "b_document", label: "Nurses document billable interventions completely", helper: "The work that was done is in the record.", defaultOn: true },
    { id: "b_reconcile", label: "Charge capture is reconciled to documentation", helper: "The charges have to match the record, or the capture does not land.", defaultOn: true, fragile: true },
    { id: "b_acuity", label: "Nurses document acuity and status support", helper: "The record supports the right severity and status picture." },
    { id: "b_feedback", label: "Nurses respond to coder feedback", helper: "The loop closes." },
  ],
  dependencies: [
    { id: "dep_charges", label: "Charge-capture and late-charge data", helper: "The leakage picture you are trying to move.", defaultOn: true },
    { id: "dep_workflow", label: "A coding workflow that uses nursing documentation", helper: "The path from the nursing note to the charge.", defaultOn: true },
    { id: "dep_status", label: "Status and acuity tracking", helper: "So the severity support is visible." },
    { id: "dep_adoption", label: "Adoption by unit", helper: "Who is live." },
  ],
};

// ── Nursing · Quality & Safety ───────────────────────────────────────────────
const nursingQuality: OutcomeTrace = {
  outcome: "Fewer preventable harm events from more time at the bedside.",
  outcomeSub: "Time returned from charting is time for rounding, assessments, and catching deterioration early.",
  conditions: [
    { id: "c_present", label: "Bedside time is freed", helper: "Nurses spend more of the shift with patients, not the keyboard.", defaultOn: true },
    { id: "c_targets", label: "There are harm targets that depend on presence", helper: "For example, falls, pressure injuries, or line and catheter infections.", defaultOn: true },
    { id: "c_driven", label: "Nursing presence actually drives these outcomes", helper: "The harm you are targeting responds to time at the bedside." },
    { id: "c_measured", label: "The measures are tracked", helper: "The harm picture is visible." },
  ],
  decisions: [
    { id: "d_target", label: "The harm outcomes to target are chosen", helper: "A focused set with real room to improve.", defaultOn: true },
    { id: "d_point", label: "Freed time goes to rounding and protocols", helper: "The recovered time is spent on the steps that keep patients safe.", defaultOn: true, fragile: true },
    { id: "d_outcome", label: "Safety is measured as an outcome", helper: "The result, not documentation of it." },
    { id: "d_roles", label: "Roles in the protocols are defined", helper: "Who does what on rounds and escalation." },
  ],
  behaviors: [
    { id: "b_rounds", label: "Nurses complete rounding, turns, and assessments on time", helper: "The freed time shows up as reliable bedside care.", defaultOn: true },
    { id: "b_bundle", label: "Bundle compliance is documented", helper: "The prevention steps are done and recorded.", defaultOn: true },
    { id: "b_escalate", label: "Deterioration is escalated early", helper: "Closer watching turns into earlier response." },
    { id: "b_review", label: "Events are reviewed", helper: "Misses feed back into practice." },
  ],
  dependencies: [
    { id: "dep_harm", label: "Falls, pressure-injury, and infection data", helper: "The harm picture you are trying to move.", defaultOn: true },
    { id: "dep_rounding", label: "Rounding and bundle-compliance tracking", helper: "So you can see whether the freed time reaches prevention.", defaultOn: true },
    { id: "dep_warning", label: "An early-warning signal", helper: "So deterioration can be caught sooner." },
    { id: "dep_adoption", label: "Adoption by unit", helper: "Who is live." },
  ],
};

export const VALUE_STRATEGY: Partial<Record<AttainSetting, Partial<Record<GoalId, OutcomeTrace>>>> = {
  outpatient: { access: outpatientAccess, retention: outpatientRetention, revenue: outpatientRevenue, quality: outpatientQuality },
  ed: { access: edAccess, retention: edRetention, revenue: edRevenue, quality: edQuality },
  inpatient: { capacity: inpatientCapacity, retention: inpatientRetention, revenue: inpatientRevenue, quality: inpatientQuality },
  nursing: { capacity: nursingCapacity, retention: nursingRetention, revenue: nursingRevenue, quality: nursingQuality },
};

/**
 * The goals offered in the Value Attainment Strategy flow, one per domain
 * (Capacity, Workforce, Revenue, Quality) for each setting. This is decoupled
 * from SETTING_GOAL_MATRIX on purpose: that matrix governs the dollar Planning
 * and PDF cells, which do not exist for every domain yet. The strategy flow only
 * needs an authored backward trace, and it has one for every entry here.
 */
export const STRATEGY_GOALS: Record<AttainSetting, GoalId[]> = {
  outpatient: ["access", "retention", "revenue", "quality"],
  ed: ["access", "retention", "revenue", "quality"],
  inpatient: ["capacity", "retention", "revenue", "quality"],
  nursing: ["capacity", "retention", "revenue", "quality"],
};

export function getTrace(setting: AttainSetting, goal: GoalId): OutcomeTrace | null {
  return VALUE_STRATEGY[setting]?.[goal] ?? null;
}

// ── Live selection state (what the partner kept / added), persisted in the snapshot ──
export interface LayerSelection {
  /** ids of authored items that are checked */
  checked: string[];
  /** the partner's own added items (free text) */
  custom: string[];
}
export type GoalTrace = Record<TraceLayer, LayerSelection>;
/** keyed by GoalId */
export type StrategyTraceState = Record<string, GoalTrace>;

export function initLayerSelection(items: TraceItem[]): LayerSelection {
  return { checked: items.filter((i) => i.defaultOn).map((i) => i.id), custom: [] };
}
export function initGoalTrace(trace: OutcomeTrace): GoalTrace {
  return {
    conditions: initLayerSelection(trace.conditions),
    decisions: initLayerSelection(trace.decisions),
    behaviors: initLayerSelection(trace.behaviors),
    dependencies: initLayerSelection(trace.dependencies),
  };
}
