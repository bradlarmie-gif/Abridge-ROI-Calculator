/**
 * THROWAWAY prototype content model (?attainpreview=1). NOT wired to the engine.
 *
 * Data-driven content for the Attain Align + Plan chapters across every care
 * setting and category. The locked access exemplar is authored here; other cells
 * are added as they're built. Views render from this; nothing is hardcoded in JSX.
 */

// ---------- shared ----------

import { engineValueInPlay } from "./attainEngineAdapter";

// "Measured from" options (LOCKED), named the way an Epic shop names them,
// complete across capacity / wellness / revenue.
export const SOURCES = ["Epic Signal", "Epic Cadence", "Reporting Workbench", "Billing / claims", "Provider survey", "Nurse survey", "HRIS", "Finance", "Data warehouse (SQL)", "Abridge platform"];

// ---------- Align ----------

export type AlignOutcome = {
  id: string;
  title: string;
  desc: string;
  dig?: { label: string; unit: string; placeholder: string }; // omit for single-select framing outcomes
  mathLabel?: string;           // short word for the math-line breakdown, e.g. "backlog"
  plays?: string[]; // concrete action(s) that turn the lever into this outcome; shown in a dedicated, dynamic "the play" question
  unitValue?: number;           // $ per counted unit (used when not reweighting by segment)
  reweightBySegment?: boolean;  // if true, use the mean of selected segment values instead
  proof?: string[];             // proof-signal ids this outcome carries into the proof question
  lever?: string;               // population-scoped goal: only shows when this lever (e.g. ffs / risk) is live
};

export type AlignSegment = { id: string; title: string; desc: string; value: number };
export type ProofSignal = { id: string; label: string; desc: string; unit: string };
export type UnlockOption = { id: string; title: string; desc: string };
export type ChoiceOption = { id: string; title: string; desc: string };
// a framing question (gate / burden / where): shown for shared understanding; in the
// prototype it doesn't move the number (attribution is set honestly in Plan).
// stage "frame" questions (e.g. payer mix) set the revenue lever, so Align asks them
// FIRST, before the outcomes. Everything else is asked after the leak is named.
export type ChoiceQuestion = { id: string; kicker: string; prompt: string; helper: string; mode: "single" | "multi"; options: ChoiceOption[]; defaultId?: string; stage?: "frame" };

// ---------- Discovery (population-gated question walk) ----------
// An optional richer middle for the Align beats. WHEN PRESENT on a cell, it replaces the
// fixed outcomes → segments → scope → non-frame-choices → economics run with an ordered,
// population-gated walk. The payer FRAME choice (stage:"frame") still renders first, and
// proof + unlock + the live value panel still render after. Cells without `discovery`
// render exactly as before. Each population turns on when its `showIf` (payer-frame option
// ids) intersects the frame answer (choice id "book"). Beats feed the SAME state the
// downstream engine + plan already read: choice/outcome → answers.choices[id];
// number → inputs.econ[id]; economics fields → inputs.econ[fieldKey]; stance → inputs.stance.
export type DiscoveryBeat =
  | { kind: "choice"; id: string; kicker: string; prompt: string; helper: string; mode: "single" | "multi"; options: ChoiceOption[] }
  | { kind: "number"; id: string; kicker: string; prompt: string; helper: string; label: string; unit: string; placeholder: string } // a "dig": persists in the align econ map under `id`
  | { kind: "segments"; kicker: string; prompt: string; helper: string; allLabel: string; options: ChoiceOption[] } // FFS service lines → answers.segs
  | { kind: "economics"; leverId: string; kicker: string; prompt: string; helper: string; withStance?: boolean } // that lever's fields (+ assumptions); withStance folds the realization bands in
  | { kind: "stance"; leverId: string; kicker: string; prompt: string } // the shared realization bands (feeds inputs.stance)
  | { kind: "outcome"; id: string; kicker: string; prompt: string; helper: string; options: ChoiceOption[] }; // the North Star (multi) → answers.choices[id]

// `label` names the mechanism (e.g. "Fee-for-service", "Risk contracts"); shown as a divider
// heading before the population's beats WHEN more than one mechanism is active, so a walk that
// covers two levers reads as two clearly separated conversations rather than one long list.
// The value-attainment leak question — universal across every setting and category. Value leaks
// after the plan is signed, in the handoffs the partner owns; naming the likely leaks lets the
// Plan (and PDF) put an owner against each. Pure strategy — feeds the plan's watch-list, never the
// dollar. Lives here (pure data) so AlignView, the Plan, and the PDF all read one source.
export const LEAKS: { id: string; title: string; desc: string }[] = [
  { id: "adoption", title: "Adoption stalls below plan", desc: "Fewer clinicians record with Abridge than the plan assumes, so the signal never builds." },
  { id: "habit", title: "The new habit doesn't stick", desc: "Documentation improves at first, then drifts back once attention moves on." },
  { id: "cadence", title: "The review cadence slips", desc: "The check-ins that keep this on track quietly stop happening." },
  { id: "owner", title: "No clear owner for the follow-through", desc: "Everyone agrees on the goal; nobody carries it week to week." },
  { id: "absorbed", title: "The gain gets absorbed elsewhere", desc: "The freed capacity or captured margin gets spent on something else before this goal sees it." },
];

export type DiscoveryPopulation = { id: string; showIf: string[]; label?: string; beats: DiscoveryBeat[] };
export type Discovery = { populations: DiscoveryPopulation[] };

// ---------- Trend beat (fixed-run only) ----------
// A single conversational beat that captures where the partner is TODAY (one or two current
// numbers, persisted into the align econ map under each `key`) plus the DIRECTION of travel
// (a single-select persisted into answers.choices under `trendId`). Built for retention:
// a slipping trend is the urgent case, a steady one is a reason to stay humble. The numbers
// feed the (demoted) economics math; the trend itself is a framing signal and does not move
// the number. Rendered between the framing choices and the scope question when present.
export type TrendNumber = { key: string; label: string; prefix?: string; suffix?: string; placeholder: string };
export type TrendBeat = {
  kicker: string;
  prompt: string;
  helper: string;
  numbers: TrendNumber[];
  trendId: string;
  trendPrompt: string;
  options: ChoiceOption[];
};

// how the live value panel computes the number
export type ValueModel =
  | { mode: "sumOutcomeDigs"; unitValueLabel: string }                                   // access, quality: Σ(dig × unit/segment)
  | { mode: "scopeBased"; perScope: number; scopeNoun: string; mathTail: string };       // retention, capacity: scopeCount × $/unit

export type AlignContent = {
  outcomesMode: "multi" | "single";
  outcomesPrompt: string;
  outcomesHelper: string;
  outcomes: AlignOutcome[];
  segments?: {
    kicker?: string;          // section eyebrow over the segments question; defaults to "The specialties" (fits Outpatient). ED = "The zone or shift", Nursing = "The units".
    prompt: string;
    helper: string;
    allLabel: string;         // "Across all lines"
    allSummary?: string;      // clean phrase when every line is selected, e.g. "the entire ambulatory" (avoids enumerating every specialty)
    options: AlignSegment[];
    defaultValue: number;     // used when no segment selected
    unitValueLabel: string;   // "contribution margin"
    nameMap: Record<string, string>; // id -> short name for the math line
  };
  scope?: { prompt: string; unitLabel: string; ceiling: number; default: string };
  discovery?: Discovery; // when present, replaces the fixed middle with a population-gated walk
  choices?: ChoiceQuestion[]; // framing questions; in the fixed run they render before the trend + scope
  trend?: TrendBeat; // fixed-run only: a "where you are today + which way it's trending" beat (retention)
  // Suppress the standalone "The play" beat in Align — the moves become the Plan's to run, keeping
  // walks that would otherwise hit 9 questions inside the ≤8 bar. The plays still live on outcomes.
  noPlayBeat?: boolean;
  proof: { prompt: string; helper: string; signals: ProofSignal[] };
  unlock: { prompt: string; helper: string; options: UnlockOption[] };
  value: ValueModel;
  valueNoun: string;          // "visits"
  panelKicker: string;        // "The value in play, from your numbers"
  honestNote: string;         // "Counted once, valued at margin, never charges."
};

// ---------- Plan ----------

export type MetricDef = { id: string; name: string; measure: string; source: string; unit: string; today: string; target: string };

export type PlanContent = {
  valueInPlay: number;
  segmentsSummary: string;    // "primary care + cardiology" (carried from Align)
  outcomes: string[];         // carried from Align
  signalsGroupLabel: string;  // "What Abridge can enable"
  signalsTag: string;         // "measured directly from Epic Signal"
  abridgeSignals: MetricDef[];
  connector: string;          // "When those move, the freed capacity is what makes these outcomes reachable."
  // A group tagged with a `lever` only shows in the plan when that revenue lever is
  // live (from the payer frame). Untagged groups always show.
  outcomeGroups: { outcome: string; metrics: MetricDef[]; lever?: string }[];
  // plain-English summary pieces
  signalsShortList: string;   // "time in note, work outside of work, and same-day note closure"
  outcomesShortList: string;  // "backlog and wait"
};

// ---------- a full cell ----------

export type AttainCell = {
  setting: string;         // display, e.g., "Outpatient"
  category: string;        // STABLE KEY for lookups + storage + engine, e.g., "Provider Retention"
  categoryLabel?: string;  // display override when the key reads wrong for the setting, e.g., "Nurse Retention" on Nursing
  // PROOF-ONLY: this category carries NO dollar anywhere. It's the wellbeing / belief / proof
  // layer that makes the other cases credible — tracked, never dollarized (the way quality
  // signals are "tracked as proof, uncounted"). Drives the Align panel, the Strategy rollup row,
  // and the Progress attainment (measured on signals, contributes $0 to the value-in-play total).
  proofOnly?: boolean;
  align: AlignContent;
  plan: PlanContent;
};

// =====================================================================
// LOCKED EXEMPLAR — Outpatient · Patient Access
// =====================================================================

export const outpatientAccess: AttainCell = {
  setting: "Outpatient",
  category: "Patient Access",
  align: {
    outcomesMode: "multi",
    value: { mode: "sumOutcomeDigs", unitValueLabel: "contribution margin" },
    outcomesPrompt: "Pick every outcome you're after",
    outcomesHelper:
      "Most groups want more than one thing, and that's fine. Pick each outcome that matters. As you do, we'll dig into the number behind it with you, from your own figures, not a benchmark.",
    outcomes: [
      { id: "backlog", title: "Work down the referral backlog", desc: "Patients already referred and waiting to be scheduled.", dig: { label: "How many are waiting right now?", unit: "patients", placeholder: "e.g., 1,900" }, mathLabel: "backlog", plays: ["Open dedicated backlog-clearing blocks", "Convert freed charting time into visit slots", "Work the waitlist down proactively"], unitValue: 210, reweightBySegment: true, proof: ["backlog"] },
      { id: "wait", title: "Shorten the wait for a new appointment", desc: "Get new patients in sooner, so the wait comes down.", dig: { label: "New patients a year you'd see sooner if the wait dropped", unit: "visits / yr", placeholder: "e.g., 1,200" }, mathLabel: "sooner", plays: ["Hold slots for new patients", "Convert freed time into new-patient visits", "Tighten the scheduling template"], unitValue: 210, reweightBySegment: true, proof: ["wait", "tna"] },
      { id: "noshow", title: "Recover no-shows", desc: "Refill slots that would otherwise go empty.", dig: { label: "No-shows a year you could refill from the waitlist", unit: "visits / yr", placeholder: "e.g., 800" }, mathLabel: "recovered", plays: ["Work a real-time waitlist", "Same-day fill from a cancellation list", "Confirm and remind to cut no-shows"], unitValue: 210, reweightBySegment: true, proof: ["visits"] },
      { id: "grow", title: "Grow the panel", desc: "Take on net-new patients over time.", dig: { label: "Net-new visits a year you're aiming to add", unit: "visits / yr", placeholder: "e.g., 2,000" }, mathLabel: "new", plays: ["Open the panel to new patients", "Add visit capacity from freed time", "Tell referrers the door is open"], unitValue: 210, reweightBySegment: true, proof: ["visits"] },
    ],
    segments: {
      prompt: "Where is the access gap?",
      helper: "Pick the lines this is really about. It scopes the plan and sharpens the margin per visit, since a cardiology slot and a behavioral-health slot aren't worth the same.",
      allLabel: "Across all lines",
      allSummary: "the entire ambulatory practice",
      options: [
        { id: "primary", title: "Primary care", desc: "Highest volume, where the backlog and wait usually concentrate.", value: 150 },
        { id: "cardiology", title: "Cardiology", desc: "Higher margin per visit; a shorter wait moves real revenue.", value: 280 },
        { id: "ortho", title: "Orthopedics & surgical", desc: "Downstream procedures ride on the first visit.", value: 350 },
        { id: "behavioral", title: "Behavioral health", desc: "Access is the whole battle; long waits, high no-shows.", value: 110 },
        { id: "other", title: "Other specialties", desc: "We'll size it across the board and narrow later.", value: 180 },
      ],
      defaultValue: 210,
      unitValueLabel: "contribution margin",
      nameMap: { primary: "primary care", cardiology: "cardiology", ortho: "ortho", behavioral: "behavioral", other: "other" },
    },
    choices: [
      { id: "accessgap", kicker: "The bottleneck", prompt: "What's driving the access gap, and is it documentation?", helper: "The honest part. A lighter, faster note only moves the share of the gap that's about clinical time lost to charting. If it's scheduling, demand, or the front desk, that's real, but it isn't ours to claim.", mode: "single", defaultId: "charting", options: [
        { id: "charting", title: "Charting load eating clinical time", desc: "Time on documentation that could be time seeing patients." },
        { id: "template", title: "Scheduling and template design", desc: "How the day is built, not how long the note takes." },
        { id: "demand", title: "Demand outstripping capacity", desc: "More need than the panel can hold, documentation aside." },
        { id: "frontdesk", title: "Front-desk and referral workflow", desc: "Intake and referral handoffs before the visit." },
      ] },
    ],
    scope: { prompt: "Across how many providers?", unitLabel: "providers in those lines, from your Starting Point", ceiling: 60, default: "40" },
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. These become the signals your plan tracks, and the first ones move before the visits do.",
      signals: [
        { id: "tna", label: "Third-next-available falling", desc: "The standard access measure, coming down against your baseline.", unit: "days" },
        { id: "backlog", label: "Referral backlog shrinking", desc: "The count of patients waiting to be scheduled going down.", unit: "patients" },
        { id: "wait", label: "New-patient wait dropping", desc: "Days to a first appointment trending down.", unit: "days" },
        { id: "visits", label: "Visit volume up", desc: "More visits actually landing on the schedule.", unit: "visits / yr" },
        { id: "love", label: "Love Stories", desc: "Patients and staff telling you access got better, in their words.", unit: "" },
      ],
    },
    unlock: {
      prompt: "If this works, what does it let you do?",
      helper: "The dollar is the hard part; this is the reason underneath it. Pick what hitting this actually opens up. This is what we'd stand behind alongside the number.",
      options: [
        { id: "contract", title: "Take on a new contract or payer", desc: "Access headroom you can commit to in a deal you can't take today." },
        { id: "service", title: "Keep a service line whole", desc: "Stop referrals leaking out to competitors for lack of a slot." },
        { id: "retain", title: "Hold on to the providers you have", desc: "A lighter documentation load is a reason people stay." },
        { id: "site", title: "Open or fill a new site", desc: "Grow into capacity instead of adding cost to create it." },
        { id: "standard", title: "Meet an access standard you're committed to", desc: "A board or system promise on wait times you have to hit." },
      ],
    },
    valueNoun: "visits",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Counted once, valued at margin, never charges.",
  },
  plan: {
    valueInPlay: engineValueInPlay("Outpatient", "Patient Access"), // from computeAllDriverValues
    segmentsSummary: "primary care + cardiology",
    outcomes: ["Work down the referral backlog", "Shorten the wait for a new appointment"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured directly from Epic Signal",
    abridgeSignals: [
      { id: "tin", name: "Time in note", measure: "Minutes spent documenting per encounter.", source: "Epic Signal", unit: "min", today: "9.5", target: "5.5" },
      { id: "wow", name: "Work outside of work", measure: "After-hours time in the EHR per day, the \"pajama time\" providers feel.", source: "Epic Signal", unit: "min/day", today: "48", target: "25" },
      { id: "sdc", name: "Same-day note closure", measure: "Share of visits with the note closed the same day, not carried home.", source: "Epic Signal", unit: "%", today: "62", target: "88" },
    ],
    connector: "When those move, the freed capacity is what makes these outcomes reachable.",
    outcomeGroups: [
      { outcome: "Work down the referral backlog", metrics: [
        { id: "backlog", name: "Referral backlog", measure: "Referred patients still waiting to be scheduled.", source: "Reporting Workbench", unit: "patients", today: "1,900", target: "600" },
      ] },
      { outcome: "Shorten the wait for a new appointment", metrics: [
        { id: "tna", name: "Third-next-available", measure: "Days to the third open new-patient slot, the standard access measure.", source: "Epic Cadence", unit: "days", today: "14", target: "7" },
        { id: "wait", name: "New-patient wait", measure: "Average days from referral to first appointment.", source: "Epic Cadence", unit: "days", today: "31", target: "18" },
      ] },
      { outcome: "Recover no-shows", metrics: [
        { id: "noshowrate", name: "No-show rate", measure: "Share of scheduled visits where the patient doesn't arrive.", source: "Reporting Workbench", unit: "%", today: "12", target: "7" },
        { id: "recovered", name: "Recovered visits", measure: "No-show slots refilled from the waitlist.", source: "Reporting Workbench", unit: "visits / yr", today: "—", target: "—" },
      ] },
      { outcome: "Grow the panel", metrics: [
        { id: "panel", name: "Active panel size", measure: "Patients attributed to the panel.", source: "Reporting Workbench", unit: "patients", today: "—", target: "—" },
        { id: "netnew", name: "Net-new visits", measure: "New-patient visits added from freed capacity.", source: "Reporting Workbench", unit: "visits / yr", today: "—", target: "—" },
      ] },
    ],
    signalsShortList: "time in note, work outside of work, and same-day note closure",
    outcomesShortList: "backlog and wait",
  },
};

// The matrix is assembled in attainCells.ts (exemplar + authored cells) to keep
// this file focused on the model + exemplar and avoid an import cycle.
