import { outpatientAccess, type AttainCell } from "./attainContent";
import { engineValueInPlay } from "./attainEngineAdapter";

/**
 * THROWAWAY. Authored cells beyond the outpatient-access exemplar, grounded in
 * the real Align configs (accessAlign/edAccessAlign/workforceAlign/capacityAlign/
 * qualityAlign) and the Measure/attainMeasurement menus. Revenue cells are a
 * separate pass (dynamic multi-path). Numbers are conservative illustrative.
 */

// ---------------------------------------------------------------- ED · Access
const edAccess: AttainCell = {
  setting: "ED",
  category: "Patient Access",
  align: {
    outcomesMode: "multi",
    value: { mode: "sumOutcomeDigs", unitValueLabel: "contribution margin" },
    outcomesPrompt: "Pick every outcome you're after",
    outcomesHelper: "Most EDs are chasing more than one thing. Pick each outcome that matters and we'll size it from your own numbers, not a benchmark.",
    outcomes: [
      { id: "lwbs", title: "Cut left-without-being-seen", desc: "Recover patients who leave before a clinician sees them.", dig: { label: "Patients a year you could keep from leaving", unit: "visits / yr", placeholder: "e.g., 900" }, mathLabel: "LWBS recovered", plays: ["Put a provider in triage", "Redeploy freed charting time to the front end", "Pull waiting patients back sooner"], unitValue: 380, proof: ["lwbsrate", "recovered"] },
      { id: "doortoprovider", title: "Speed up door-to-provider", desc: "Get patients in front of a clinician sooner.", dig: { label: "Visits a year a faster front end would recover", unit: "visits / yr", placeholder: "e.g., 500" }, mathLabel: "from faster intake", plays: ["Provider-in-triage model", "Convert freed charting time to bedside time", "Streamline the intake steps"], unitValue: 380, proof: ["doortime", "recovered"] },
      { id: "admissions", title: "Capture more admissions", desc: "Keep admissions that would otherwise be lost to diversion.", dig: { label: "Admissions a year you could capture", unit: "admissions / yr", placeholder: "e.g., 120" }, mathLabel: "admissions", plays: ["Faster disposition decisions", "Tighten the admit handoff", "Cut boarding to free the beds"], unitValue: 8000, proof: ["admissions"] },
    ],
    scope: { prompt: "Across how many ED providers?", unitLabel: "ED providers, from your Starting Point", ceiling: 45, default: "30" },
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. The throughput signals move before the recovered visits show up.",
      signals: [
        { id: "lwbsrate", label: "LWBS rate dropping", desc: "The share leaving before being seen, coming down against your baseline.", unit: "%" },
        { id: "doortime", label: "Door-to-provider time dropping", desc: "Minutes from arrival to a clinician trending down.", unit: "min" },
        { id: "boarding", label: "Boarding hours dropping", desc: "Admitted patients held in the ED, going down.", unit: "hrs" },
        { id: "recovered", label: "Recovered visits", desc: "Visits that stayed instead of walking out.", unit: "visits / yr" },
        { id: "admissions", label: "Captured admissions", desc: "Admissions kept in your system.", unit: "admissions / yr" },
        { id: "love", label: "Love Stories", desc: "Staff and patients telling you the front end got better, in their words.", unit: "" },
      ],
    },
    unlock: {
      prompt: "If this works, what does it let you do?",
      helper: "The dollar is the hard part; this is the reason underneath it. Pick what hitting this actually opens up.",
      options: [
        { id: "diversion", title: "Stay off diversion", desc: "Keep the doors open to EMS and the community." },
        { id: "keepadmits", title: "Keep admissions in your system", desc: "Capture the downstream stay instead of losing it." },
        { id: "boarding", title: "Ease boarding downstream", desc: "A faster front end takes pressure off the whole hospital." },
        { id: "retain", title: "Hold on to ED staff", desc: "A lighter charting load is a reason people stay." },
        { id: "standard", title: "Meet a throughput standard", desc: "A board or CMS measure on door-to-provider you have to hit." },
      ],
    },
    valueNoun: "visits",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Counted once, valued at margin, never charges.",
  },
  plan: {
    valueInPlay: engineValueInPlay("ED", "Patient Access"),
    segmentsSummary: "your ED",
    outcomes: ["Cut left-without-being-seen", "Capture more admissions"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured directly from Epic Signal",
    abridgeSignals: [
      { id: "tin", name: "Time in note", measure: "Minutes spent documenting per encounter.", source: "Epic Signal", unit: "min", today: "9", target: "5.5" },
      { id: "wow", name: "Work outside of work", measure: "After-hours time in the EHR per shift.", source: "Epic Signal", unit: "min", today: "40", target: "22" },
      { id: "same", name: "Same-shift note completion", measure: "Share of encounters with the note finished before the shift ends.", source: "Epic Signal", unit: "%", today: "55", target: "85" },
    ],
    connector: "When charting time drops, the front end moves faster and fewer patients leave.",
    outcomeGroups: [
      { outcome: "Cut left-without-being-seen", metrics: [
        { id: "lwbsrate", name: "LWBS rate", measure: "Share of arrivals who leave before being seen.", source: "Reporting Workbench", unit: "%", today: "3.5", target: "1.5" },
        { id: "doortime", name: "Door-to-provider time", measure: "Minutes from arrival to first clinician contact.", source: "Epic Cadence", unit: "min", today: "42", target: "22" },
      ] },
      { outcome: "Capture more admissions", metrics: [
        { id: "captadmits", name: "Captured admissions", measure: "Admissions kept in your system rather than lost to diversion or walkout.", source: "Billing / claims", unit: "/ yr", today: "—", target: "120" },
      ] },
    ],
    signalsShortList: "time in note, work outside of work, and same-shift note completion",
    outcomesShortList: "LWBS and door-to-provider",
  },
};

// ---------------------------------------------------------------- Retention (all settings)
function retentionCell(setting: string, nounSingular: string, nounPlural: string, scopeCeiling: number, scopeDefault: string, perScope: number, signals: AttainCell["plan"]["abridgeSignals"], signalsShort: string): AttainCell {
  // setting-appropriate vocabulary: nurses aren't "providers", don't use "locums", and work at the bedside not "in the visit"
  const isNurse = nounSingular === "nurse";
  const surveySource = isNurse ? "Nurse survey" : "Provider survey";
  return {
    setting,
    category: "Provider Retention", // stable key across settings; nurses aren't providers, so relabel the heading
    categoryLabel: nounSingular === "nurse" ? "Nurse Retention" : undefined,
    align: {
      outcomesMode: "single",
      value: { mode: "scopeBased", perScope, scopeNoun: nounPlural, mathTail: `in avoided turnover cost.` },
      outcomesPrompt: "What matters most here?",
      outcomesHelper: `Retention is rarely just one thing. Tell us what you're really after with your ${nounPlural}, and we'll size the value from your own headcount.`,
      outcomes: [
        { id: "keep", title: "Keep our people", desc: `Fewer of the ${nounPlural} you have today choosing to leave.`, plays: ["Protect the freed time, don't just refill it", "Check in with the people most at risk of leaving", "Make the change visible to the team"] },
        { id: "betterday", title: "A better day", desc: "The same team, with a lighter, more livable day.", plays: ["Cut the after-hours charting", "Protect time with patients, not the screen", "Drop the low-value documentation asks"] },
        { id: "both", title: "Both", desc: "Lower voluntary turnover and a better day, together.", plays: ["Protect the freed time", "Check in with the at-risk", "Track the day getting lighter"], proof: ["turnover", "pulse"] },
      ],
      scope: { prompt: `Across how many ${nounPlural}?`, unitLabel: `${nounPlural}, from your Starting Point`, ceiling: scopeCeiling, default: scopeDefault },
      choices: [
        { id: "driver", kicker: "The driver", prompt: "What's driving your departures?", helper: "Be honest here. It tells us how much of the turnover a lighter day can realistically touch, and how much it can't.", mode: "single", defaultId: "burnout", options: [
          { id: "burnout", title: "Mostly burnout and workload", desc: "The day is too heavy, and the charting follows people home." },
          { id: "meaningful", title: "A meaningful share is burnout", desc: "Some of it is workload; some is pay or life." },
          { id: "paylife", title: "Mostly pay or life", desc: "Honestly, a lighter day won't be the deciding factor here." },
        ] },
        { id: "burden", kicker: "The burden", prompt: "Where does it hurt most?", helper: "Where the day feels heaviest tells us which signals to watch first.", mode: "single", defaultId: "afterhours", options: [
          { id: "visit", title: isNurse ? "At the bedside" : "In the visit", desc: isNurse ? "Charting instead of being present with the patient." : "Documenting while trying to be present with the patient." },
          { id: "afterhours", title: "After hours", desc: "Charting at night, the work outside of work tied to burnout." },
          { id: "both", title: "Both", desc: "Heavy in the room and heavy at home." },
        ] },
      ],
      proof: {
        prompt: "What would tell you it's working?",
        helper: "Pick what you'd point to in a review. The experience signals move before the turnover number does.",
        signals: [
          { id: "turnover", label: "The turnover number moving", desc: "Voluntary departures coming down against your baseline.", unit: "%" },
          { id: "vacancy", label: "Open roles filling faster", desc: "Time-to-fill and vacancy easing.", unit: "days" },
          { id: "pulse", label: "A burnout pulse", desc: "A short, repeated read on how the team is actually doing.", unit: "score" },
          { id: "lovestories", label: "Love Stories", desc: `${nounSingular === "nurse" ? "Nurses" : "Clinicians"} telling you the day got better, in their words.`, unit: "" },
        ],
      },
      unlock: {
        prompt: "If this works, what does it let you do?",
        helper: "The turnover cost is the hard part; this is the reason underneath it.",
        options: [
          { id: "line", title: "Protect a fragile service line", desc: "One or two departures away from a real coverage problem." },
          { id: "agency", title: isNurse ? "Wind down travel and agency spend" : "Wind down agency and locum spend", desc: "Stop paying premium rates to cover gaps." },
          { id: "knowledge", title: "Keep institutional knowledge", desc: "The people who know how your place actually runs." },
          { id: "access", title: "Steady access for patients", desc: "Turnover quietly closes schedules; retention keeps them open." },
          { id: "recruit", title: "Make recruiting easier", desc: "A place people stay is a place people want to join." },
        ],
      },
      valueNoun: nounPlural,
      panelKicker: "The value in play, from your numbers",
      honestNote: "Only the share a lighter documentation day can realistically address.",
    },
    plan: {
      valueInPlay: engineValueInPlay(setting, "Provider Retention"),
      segmentsSummary: `your ${nounPlural}`,
      outcomes: ["Keep our people", "A better day"],
      signalsGroupLabel: "What Abridge can enable",
      signalsTag: "measured directly from Epic Signal",
      abridgeSignals: signals,
      connector: "When the day gets lighter and burnout eases, more of your people choose to stay.",
      outcomeGroups: [
        { outcome: "A better day", metrics: [
          { id: "burnout", name: "Burnout pulse", measure: `Share of ${nounPlural} reporting burnout on a short, repeated survey.`, source: surveySource, unit: "%", today: "48", target: "32" },
          { id: "stay", name: "Likelihood to stay", measure: `Share of ${nounPlural} who say they intend to stay.`, source: surveySource, unit: "%", today: "71", target: "84" },
        ] },
        { outcome: "Keep our people", metrics: [
          { id: "turnover", name: "Voluntary turnover rate", measure: `${nounSingular === "nurse" ? "Nurses" : "Clinicians"} choosing to leave in a year.`, source: "HRIS", unit: "%", today: "14", target: "9" },
          { id: "departures", name: "Departures avoided", measure: "Departures you'd expect to prevent against your baseline.", source: "HRIS", unit: "/ yr", today: "—", target: "6" },
          { id: "replace", name: "Replacement cost saved", measure: "The recruiting, onboarding, and coverage cost those departures would have carried.", source: "Finance", unit: "$/yr", today: "—", target: "—" },
        ] },
      ],
      signalsShortList: signalsShort,
      outcomesShortList: "burnout and turnover",
    },
  };
}

const nurseSignals: AttainCell["plan"]["abridgeSignals"] = [
  { id: "tin", name: "Charting time per shift", measure: "Minutes a nurse spends documenting across a shift.", source: "Epic Signal", unit: "min", today: "95", target: "65" },
  { id: "after", name: "Charting after shift", measure: "Minutes of documentation finished after the shift ends.", source: "Epic Signal", unit: "min", today: "35", target: "12" },
];
const providerSignals: AttainCell["plan"]["abridgeSignals"] = [
  { id: "tin", name: "Time in note", measure: "Minutes spent documenting per encounter.", source: "Epic Signal", unit: "min", today: "9.5", target: "5.5" },
  { id: "wow", name: "Work outside of work", measure: "After-hours time in the EHR per day, the \"pajama time\" tied to burnout.", source: "Epic Signal", unit: "min/day", today: "48", target: "25" },
];

const outpatientRetention = retentionCell("Outpatient", "clinician", "clinicians", 60, "40", 20_000, providerSignals, "time in note and work outside of work");
const edRetention = retentionCell("ED", "clinician", "ED clinicians", 45, "30", 22_000, providerSignals, "time in note and work outside of work");
const inpatientRetention = retentionCell("Inpatient", "clinician", "hospitalists", 35, "24", 24_000, providerSignals, "time in note and work outside of work");
const nursingRetention = retentionCell("Nursing", "nurse", "nurses", 400, "260", 4_000, nurseSignals, "charting time per shift and charting after shift");

// ---------------------------------------------------------------- Nursing · Capacity
const nursingCapacity: AttainCell = {
  setting: "Nursing",
  category: "Nursing Capacity",
  align: {
    outcomesMode: "single",
    value: { mode: "scopeBased", perScope: 2_250, scopeNoun: "nurses", mathTail: "in documentation-tied overtime." },
    outcomesPrompt: "What matters most here?",
    outcomesHelper: "Overtime shows up in two places: the budget and the shift that never ends. Tell us which you're really after, and we'll size it from your nurse count.",
    outcomes: [
      { id: "cost", title: "Cut the overtime cost", desc: "The documentation-driven overtime dollars in your budget.", plays: ["Hold nurses to an on-time clock-out", "Chart in the room, not after the shift", "Watch the overtime line by unit"] },
      { id: "ontime", title: "Nurses finishing on time", desc: "Shifts that end when they're supposed to, not an hour later.", plays: ["Chart at the bedside during the shift", "Protect the last hour from documentation", "Hand off before the charting, not after"] },
      { id: "both", title: "Both", desc: "Lower overtime cost and nurses finishing on time, together.", plays: ["Chart in the moment", "Hold the on-time clock-out", "Watch the overtime line by unit"], proof: ["othours", "budget"] },
    ],
    scope: { prompt: "Across how many nurses?", unitLabel: "nurses, from your Starting Point", ceiling: 400, default: "260" },
    choices: [
      { id: "where", kicker: "The pattern", prompt: "Where does the overtime show up?", helper: "The pattern tells us which signals to watch and how much a lighter charting load can realistically touch.", mode: "single", defaultId: "postshift", options: [
        { id: "postshift", title: "Post-shift charting", desc: "Nurses staying late to finish notes after the shift ends." },
        { id: "batching", title: "Batching notes during the day", desc: "Documentation piling up and getting done in bursts." },
        { id: "lunches", title: "Missed lunches pushing work late", desc: "No time to chart in the moment, so it all lands at the end." },
      ] },
    ],
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. On-time finishes move before the budget line does.",
      signals: [
        { id: "othours", label: "Overtime hours per nurse dropping", desc: "Documentation-related overtime coming down against your baseline.", unit: "hrs/wk" },
        { id: "ontime", label: "Nurses finishing on time", desc: "Share of shifts ending on schedule.", unit: "%" },
        { id: "budget", label: "The overtime dollars in the budget", desc: "The line item finance actually watches, easing.", unit: "$/yr" },
        { id: "lovestories", label: "Love Stories", desc: "Nurses telling you they got their evenings back, in their words.", unit: "" },
      ],
    },
    unlock: {
      prompt: "If this works, what does it let you do?",
      helper: "The overtime cost is the hard part; this is the reason underneath it.",
      options: [
        { id: "agency", title: "Lean less on travel and agency", desc: "Overtime and agency spend are the same pressure valve." },
        { id: "retain", title: "Hold on to the nurses you have", desc: "A shift that ends on time is a reason to stay." },
        { id: "budget", title: "Give a real number back to finance", desc: "A documentation-tied overtime line you can defend." },
        { id: "safety", title: "Protect care at the end of the shift", desc: "Tired, rushed charting is where safety slips." },
      ],
    },
    valueNoun: "nurses",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Valued at a loaded hourly rate; only the overtime we can attribute to documentation.",
  },
  plan: {
    valueInPlay: engineValueInPlay("Nursing", "Nursing Capacity"),
    segmentsSummary: "your nursing units",
    outcomes: ["Cut the overtime cost", "Nurses finishing on time"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured directly from Epic Signal",
    abridgeSignals: [
      { id: "tin", name: "Charting time per shift", measure: "Minutes a nurse spends documenting across a shift.", source: "Epic Signal", unit: "min", today: "95", target: "65" },
      { id: "after", name: "Charting after shift", measure: "Minutes of documentation finished after the shift ends.", source: "Epic Signal", unit: "min", today: "35", target: "12" },
    ],
    connector: "When post-shift charting drops, nurses finish on time and the overtime line eases.",
    outcomeGroups: [
      { outcome: "Nurses finishing on time", metrics: [
        { id: "ontime", name: "On-time shift completion", measure: "Share of shifts that end on schedule.", source: "Reporting Workbench", unit: "%", today: "58", target: "82" },
      ] },
      { outcome: "Cut the overtime cost", metrics: [
        { id: "othours", name: "Overtime hours per nurse", measure: "Documentation-related overtime per nurse each week.", source: "HRIS", unit: "hrs/wk", today: "1.0", target: "0.4" },
        { id: "otcost", name: "Overtime cost", measure: "The documentation-tied overtime dollars in the budget.", source: "Finance", unit: "$/yr", today: "—", target: "—" },
      ] },
    ],
    signalsShortList: "charting time per shift and charting after shift",
    outcomesShortList: "on-time finishes and overtime",
  },
};

// ---------------------------------------------------------------- Nursing · Quality & Safety
const nursingQuality: AttainCell = {
  setting: "Nursing",
  category: "Quality & Safety",
  align: {
    outcomesMode: "multi",
    value: { mode: "sumOutcomeDigs", unitValueLabel: "cost of harm avoided" },
    outcomesPrompt: "Which harm are you focused on?",
    outcomesHelper: "Abridge can give nurses more time at the bedside and can surface the risk on the chart sooner. That's the realistic lever on harm, not a claim we prevent it. Pick what you're working on and we'll size it from your own rates, leading with the events, not the dollars.",
    outcomes: [
      { id: "falls", title: "Falls with injury", desc: "Fewer when nurses have time to round and the fall risk is flagged and handed off.", dig: { label: "Falls a year where more rounding would have helped", unit: "events / yr", placeholder: "e.g., 40" }, mathLabel: "falls", unitValue: 14_000, plays: ["Round more on high-risk patients", "Act on the fall risk the note flags", "Tighten shift handoffs on at-risk patients"], proof: ["rate", "nearmiss"] },
      { id: "hapi", title: "Pressure injuries (HAPI)", desc: "Fewer when the turn schedule holds and skin risk is documented early.", dig: { label: "HAPIs a year tied to missed turns or late risk", unit: "events / yr", placeholder: "e.g., 30" }, mathLabel: "HAPI", unitValue: 21_000, plays: ["Hold the turn schedule", "Act on the skin risk documented early", "Standardize the skin assessment in the note"], proof: ["rate", "compliance"] },
      { id: "clabsi", title: "Central-line infections (CLABSI)", desc: "Fewer when daily line-necessity review actually happens and is charted.", dig: { label: "CLABSIs a year where earlier line review would help", unit: "events / yr", placeholder: "e.g., 12" }, mathLabel: "CLABSI", unitValue: 48_000, plays: ["Do the daily line-necessity review", "Act on the line note that surfaces earlier", "Pull lines that are no longer needed sooner"], proof: ["rate", "compliance"] },
      { id: "sepsis", title: "Sepsis caught late", desc: "Caught sooner when early deterioration is on the record and handed off cleanly.", dig: { label: "Sepsis cases a year where earlier signal would help", unit: "events / yr", placeholder: "e.g., 25" }, mathLabel: "sepsis", unitValue: 18_000, plays: ["Act on the early deterioration the note surfaces", "Tighten handoffs on the fuller notes", "Escalate to the rapid-response team faster"], proof: ["rate", "nearmiss"] },
      { id: "hcahps", title: "Time at the bedside (HCAHPS)", desc: "The presence patients feel when nurses aren't buried in charting. We watch the scores; no dollar.", plays: ["Protect face-to-face time at the bedside", "Purposeful hourly rounding", "Sit at eye level for the big conversations"], proof: ["hcahps"] },
    ],
    scope: { prompt: "Which beds is this for?", unitLabel: "staffed beds, from your Starting Point", ceiling: 300, default: "180" },
    choices: [
      { id: "gate", kicker: "What's reachable", prompt: "How much of this could earlier attention actually change?", helper: "We only count what more time and earlier documentation can realistically move, never harm that happens despite good care.", mode: "single", defaultId: "meaningful", options: [
        { id: "earlier", title: "A lot, we usually see it coming", desc: "The risk is often knowable in time; acting on it is the gap." },
        { id: "meaningful", title: "Some of it", desc: "Part is reachable earlier; part isn't." },
        { id: "despite", title: "Little, it mostly happens despite good care", desc: "Honestly, earlier attention won't move most of these." },
      ] },
    ],
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. The leading signals move before the event rate does.",
      signals: [
        { id: "rate", label: "Event rate per 1,000 dropping", desc: "The harm rate coming down against your baseline.", unit: "per 1,000" },
        { id: "compliance", label: "Bundle compliance climbing", desc: "The prevention steps actually happening, documented.", unit: "%" },
        { id: "nearmiss", label: "Near-miss catches", desc: "Risks caught and acted on before harm.", unit: "/ month" },
        { id: "hcahps", label: "HCAHPS domain scores", desc: "Patient-experience domains improving.", unit: "percentile" },
        { id: "lovestories", label: "Love Stories", desc: "A patient caught earlier, in the team's words.", unit: "" },
      ],
    },
    unlock: {
      prompt: "If this works, what does it let you do?",
      helper: "The harm avoided is the hard part; this is the reason underneath it.",
      options: [
        { id: "hac", title: "Get out of HAC penalties", desc: "Fewer hospital-acquired conditions on the CMS ledger." },
        { id: "reputation", title: "Protect your quality reputation", desc: "The scores boards, payers, and patients actually see." },
        { id: "nurses", title: "Give nurses time at the bedside", desc: "Freed charting time is presence at the bedside, the moments where harm is most preventable." },
        { id: "vbc", title: "Strengthen value-based performance", desc: "Quality is the lever your risk contracts turn on." },
      ],
    },
    valueNoun: "events",
    panelKicker: "The harm avoided, from your numbers",
    honestNote: "Counted as events prevented, valued conservatively; the dollar is a footnote to the count.",
  },
  plan: {
    valueInPlay: engineValueInPlay("Nursing", "Quality & Safety"),
    segmentsSummary: "your staffed beds",
    outcomes: ["Falls with injury", "Pressure injuries (HAPI)"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured directly from Epic Signal",
    abridgeSignals: [
      { id: "tin", name: "Charting time per shift", measure: "Minutes a nurse spends documenting across a shift.", source: "Epic Signal", unit: "min", today: "95", target: "65" },
      { id: "risk", name: "Risk documented earlier", measure: "Share of high-risk patients with the risk noted earlier in the stay.", source: "Abridge platform", unit: "%", today: "—", target: "—" },
    ],
    connector: "When charting is lighter and the risk is on the record earlier, the team can act before harm.",
    outcomeGroups: [
      { outcome: "Falls with injury", metrics: [
        { id: "fallrate", name: "Fall rate per 1,000 patient-days", measure: "Inpatient falls against volume.", source: "Reporting Workbench", unit: "per 1,000", today: "3.4", target: "2.4" },
        { id: "fallprev", name: "Falls prevented", measure: "Falls you'd expect to prevent against your baseline.", source: "Reporting Workbench", unit: "/ yr", today: "—", target: "12" },
      ] },
      { outcome: "Pressure injuries (HAPI)", metrics: [
        { id: "hapirate", name: "HAPI rate per 1,000 patient-days", measure: "Hospital-acquired pressure injuries against volume.", source: "Reporting Workbench", unit: "per 1,000", today: "2.1", target: "1.3" },
        { id: "bundle", name: "Bundle compliance", measure: "Prevention steps completed and documented on schedule.", source: "Reporting Workbench", unit: "%", today: "74", target: "92" },
      ] },
    ],
    signalsShortList: "charting time per shift and risk documented earlier",
    outcomesShortList: "fall and HAPI rates",
  },
};

// ---------------------------------------------------------------- Revenue (op / ed / ip)
// Revenue's causal signal is documentation completeness/specificity from the
// Abridge platform, which drives the coding that follows. Multi-path outcomes.
const REVENUE_DOC_SIGNALS: AttainCell["plan"]["abridgeSignals"] = [
  { id: "complete", name: "Note completeness", measure: "Share of encounters where the note captures what was actually done.", source: "Abridge platform", unit: "%", today: "78", target: "94" },
  { id: "specificity", name: "Diagnosis specificity", measure: "Share of diagnoses documented to the specificity coding needs.", source: "Abridge platform", unit: "%", today: "64", target: "85" },
  { id: "adoption", name: "Documentation adoption", measure: "Share of eligible notes created through Abridge.", source: "Abridge platform", unit: "%", today: "40", target: "80" },
];
const REVENUE_UNLOCK = {
  prompt: "If this works, what does it let you do?",
  helper: "The captured dollars are the hard part; this is the reason underneath it.",
  options: [
    { id: "fund", title: "Fund the documentation program itself", desc: "The capture can cover the cost of the platform." },
    { id: "earned", title: "Stop leaving earned revenue on the table", desc: "Bill accurately for care you already delivered." },
    { id: "audit", title: "Reduce audit and compliance risk", desc: "A complete note defends the claim if anyone asks." },
    { id: "queue", title: "Give revenue-cycle a lighter queue", desc: "Fewer queries and reworks landing on their desk." },
  ],
};

const outpatientRevenue: AttainCell = {
  setting: "Outpatient",
  category: "Revenue Capture",
  align: {
    outcomesMode: "multi",
    value: { mode: "sumOutcomeDigs", unitValueLabel: "captured revenue" },
    outcomesPrompt: "Pick the goals you're after",
    outcomesHelper: "These are the goals your payer mix opens up, so pick each one that matters. As you do, we'll size the number behind it from your own figures, not a benchmark. Fee-for-service goals size on how the visit codes; risk goals size on the conditions you recapture.",
    outcomes: [
      { id: "em", lever: "ffs", title: "Get paid for the level of care you deliver", desc: "The workup happened; the note just didn't carry it, so a level-4 visit goes out as a level 3. This closes the gap between the care and the code.", dig: { label: "Visits a year you suspect are undercoded", unit: "visits / yr", placeholder: "e.g., 6,000" }, mathLabel: "undercoded", plays: ["Coder feedback to providers", "Bake the level drivers into the note", "Spot-audit the level distribution"], unitValue: 33, proof: ["losmix", "captured"] },
      { id: "hcc", lever: "risk", title: "Improve your risk accuracy", desc: "Chronic conditions treated and documented in the visit, but never coded, so the risk score and the payment reset every January.", dig: { label: "Risk-contract patients with open condition gaps", unit: "patients", placeholder: "e.g., 900" }, mathLabel: "gaps closed", plays: ["Surface open conditions at the visit", "Address the full problem list each year", "Pre-visit gap lists for the provider"], unitValue: 1200, proof: ["recapture", "captured"] },
      { id: "denials", title: "Stop writing off preventable denials", desc: "Medical-necessity denials a more complete note would have prevented.", dig: { label: "Preventable denials a year", unit: "denials / yr", placeholder: "e.g., 300" }, mathLabel: "denials", plays: ["Put medical necessity in the note", "Fix the top denial reasons at the source", "Payer-specific documentation prompts"], unitValue: 3500, proof: ["denialrate", "captured"] },
    ],
    scope: { prompt: "Across how many providers?", unitLabel: "providers, from your Starting Point", ceiling: 60, default: "40" },
    choices: [
      { id: "book", stage: "frame", kicker: "The payers", prompt: "Which payers are we talking about?", helper: "This sets the lever, and you can pick more than one. Fee-for-service pays on the visit level, so how you code the visit is the money (wRVU). Risk contracts (Medicare Advantage, Medicaid, ACA) pay on the conditions you capture, so recapture is (HCC). Pick both and we size both.", mode: "multi", defaultId: "ffs", options: [
        { id: "ffs", title: "Fee-for-service", desc: "The level on the claim drives what you're paid." },
        { id: "ma", title: "Medicare Advantage", desc: "Paid on the risk you capture; recapture is the lever." },
        { id: "medicaid", title: "Medicaid managed care", desc: "Risk-adjusted, and accurate coding matters too." },
        { id: "aca", title: "ACA / Exchange", desc: "Risk-adjusted, like Medicare Advantage." },
      ] },
      { id: "gate", kicker: "The cause", prompt: "Why is it slipping?", helper: "Be honest here. We only count the part a more complete note can defensibly fix, not revenue that was never really there.", mode: "single", defaultId: "note", options: [
        { id: "note", title: "The note undersold the visit", desc: "The care happened; the documentation didn't carry it." },
        { id: "some", title: "Some of it, honestly", desc: "Part documentation, part genuinely lower-complexity." },
        { id: "coding", title: "Mostly a coding or workflow gap", desc: "The documentation's there; the miss is downstream of the note." },
      ] },
    ],
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. The documentation signals move before the captured dollars land.",
      signals: [
        { id: "losmix", label: "Level-of-service mix moving", desc: "The distribution of E/M levels shifting toward the care delivered.", unit: "avg level" },
        { id: "recapture", label: "Recapture rate rising", desc: "Risk-adjustment conditions making it to the claim.", unit: "%" },
        { id: "denialrate", label: "Denial rate dropping", desc: "Medical-necessity denials coming down against your baseline.", unit: "%" },
        { id: "captured", label: "Captured dollars showing up", desc: "The revenue actually landing, net of adjustments.", unit: "$/yr" },
        { id: "team", label: "The revenue-cycle team sees it", desc: "Coders and CDI feeling a lighter, cleaner queue.", unit: "" },
      ],
    },
    unlock: REVENUE_UNLOCK,
    valueNoun: "items",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Only the share the note can defensibly support.",
  },
  plan: {
    valueInPlay: engineValueInPlay("Outpatient", "Revenue Capture"),
    segmentsSummary: "your billed encounters",
    outcomes: ["Get paid for the level of care you deliver", "Improve your risk accuracy", "Stop writing off preventable denials"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured from the Abridge platform",
    abridgeSignals: REVENUE_DOC_SIGNALS,
    connector: "When the note captures what actually happened, the coding follows.",
    outcomeGroups: [
      { outcome: "Get paid for the level of care you deliver", lever: "ffs", metrics: [
        { id: "embelow", name: "E/M below supported level", measure: "Share of visits coding below what the documentation supports.", source: "Billing / claims", unit: "%", today: "22", target: "12" },
        { id: "losmix", name: "Level-of-service mix", measure: "Average E/M level across the book.", source: "Billing / claims", unit: "avg level", today: "3.6", target: "3.9" },
      ] },
      { outcome: "Improve your risk accuracy", lever: "risk", metrics: [
        { id: "recapture", name: "HCC recapture rate", measure: "Share of open risk-adjustment conditions recaptured to the claim each year.", source: "Billing / claims", unit: "%", today: "50", target: "75" },
        { id: "hcccomplete", name: "Condition capture completeness", measure: "Share of conditions documented at the visit that make it onto the coded claim.", source: "Billing / claims", unit: "%", today: "70", target: "88" },
      ] },
      { outcome: "Stop writing off preventable denials", metrics: [
        { id: "denialrate", name: "Medical-necessity denial rate", measure: "Share of claims denied for medical necessity.", source: "Billing / claims", unit: "%", today: "6", target: "3" },
        { id: "recovered", name: "Denials recovered", measure: "Denied revenue recovered or prevented.", source: "Billing / claims", unit: "$/yr", today: "—", target: "—" },
      ] },
    ],
    signalsShortList: "note completeness, diagnosis specificity, and documentation adoption",
    outcomesShortList: "E/M accuracy and denials",
  },
};

const edRevenue: AttainCell = {
  setting: "ED",
  category: "Revenue Capture",
  align: {
    outcomesMode: "multi",
    value: { mode: "sumOutcomeDigs", unitValueLabel: "captured revenue" },
    outcomesPrompt: "Where is the revenue slipping?",
    outcomesHelper: "This is money for care you already delivered in the ED that the documentation didn't carry to the claim. Pick where you see it, and we'll size it from your own numbers.",
    outcomes: [
      { id: "em", title: "Visits billing below the acuity treated", desc: "A high-acuity workup that codes as a low-level visit because the note didn't carry it.", dig: { label: "ED visits a year you suspect are under-leveled", unit: "visits / yr", placeholder: "e.g., 4,000" }, mathLabel: "under-leveled", plays: ["Capture the full workup in the note", "Coder feedback to ED providers", "Level-driver prompts in the ED note"], unitValue: 40, proof: ["losmix", "captured"] },
      { id: "denials", title: "Denials you end up writing off", desc: "Medical-necessity denials a more complete ED note would have prevented.", dig: { label: "Preventable denials a year", unit: "denials / yr", placeholder: "e.g., 350" }, mathLabel: "denials", plays: ["Establish medical necessity in the note", "Fix the top ED denial reasons", "Payer-specific documentation prompts"], unitValue: 3500, proof: ["denialrate", "captured"] },
    ],
    choices: [
      { id: "gate", kicker: "The cause", prompt: "Why is it slipping?", helper: "Be honest here. We only count the part a more complete note can defensibly fix, not revenue that was never really there.", mode: "single", defaultId: "note", options: [
        { id: "note", title: "The note undersold the acuity", desc: "The workup happened; the documentation didn't carry it." },
        { id: "some", title: "Some of it, honestly", desc: "Part documentation, part genuinely lower acuity." },
        { id: "acuity", title: "Mostly a coding or workflow gap", desc: "The documentation's there; the miss is downstream of the note." },
      ] },
    ],
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. The documentation signals move before the captured dollars land.",
      signals: [
        { id: "losmix", label: "Level-of-service mix moving", desc: "The distribution of ED E/M levels shifting toward the acuity delivered.", unit: "avg level" },
        { id: "denialrate", label: "Denial rate dropping", desc: "Medical-necessity denials coming down against your baseline.", unit: "%" },
        { id: "captured", label: "Captured dollars showing up", desc: "The revenue actually landing, net of adjustments.", unit: "$/yr" },
        { id: "team", label: "The revenue-cycle team sees it", desc: "Coders feeling a lighter, cleaner queue.", unit: "" },
      ],
    },
    unlock: REVENUE_UNLOCK,
    valueNoun: "items",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Only the share the note can defensibly support.",
  },
  plan: {
    valueInPlay: engineValueInPlay("ED", "Revenue Capture"),
    segmentsSummary: "your ED claims",
    outcomes: ["Visits billing below the acuity treated", "Denials you end up writing off"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured from the Abridge platform",
    abridgeSignals: REVENUE_DOC_SIGNALS,
    connector: "When the ED note captures the full workup, the acuity coding follows.",
    outcomeGroups: [
      { outcome: "Visits billing below the acuity treated", metrics: [
        { id: "embelow", name: "E/M below supported level", measure: "Share of ED visits coding below the acuity documented.", source: "Billing / claims", unit: "%", today: "25", target: "13" },
        { id: "losmix", name: "Average E/M level", measure: "Average ED E/M level (99281 to 99285).", source: "Billing / claims", unit: "level", today: "3.4", target: "3.8" },
      ] },
      { outcome: "Denials you end up writing off", metrics: [
        { id: "denialrate", name: "Medical-necessity denial rate", measure: "Share of ED claims denied for medical necessity.", source: "Billing / claims", unit: "%", today: "7", target: "3.5" },
      ] },
    ],
    signalsShortList: "note completeness, diagnosis specificity, and documentation adoption",
    outcomesShortList: "E/M accuracy and denials",
  },
};

const inpatientRevenue: AttainCell = {
  setting: "Inpatient",
  category: "Revenue Capture",
  align: {
    outcomesMode: "multi",
    value: { mode: "sumOutcomeDigs", unitValueLabel: "captured revenue" },
    outcomesPrompt: "Where is the revenue slipping?",
    outcomesHelper: "Inpatient pay follows the documentation: the weight, the queries, the status. Pick where you see it slip, and we'll size it from your own numbers.",
    outcomes: [
      { id: "drg", title: "Admissions grouping below the acuity treated", desc: "A sick patient that groups to a lower-weight DRG because a CC or MCC never made it into the note.", dig: { label: "Admissions a year that group below the weight earned", unit: "admissions / yr", placeholder: "e.g., 200" }, mathLabel: "under-weighted", plays: ["Document CC/MCC severity up front", "Focus CDI on the high-impact charts", "Feedback loop to the attendings"], unitValue: 2500, proof: ["cmi", "captured"] },
      { id: "cdi", title: "The CDI query pile", desc: "Queries your CDI team writes because the note arrived without the specificity coding needs.", dig: { label: "CDI queries a year a complete note would avoid", unit: "queries / yr", placeholder: "e.g., 1,500" }, mathLabel: "queries avoided", plays: ["Complete the note the first time", "Target the top query types", "Provider education on specificity"], unitValue: 90, proof: ["queryrate", "team"] },
      { id: "obs", title: "Stays downgraded to observation", desc: "Inpatient-level care billed as observation because severity wasn't established up front.", dig: { label: "Downgrades a year you could defend", unit: "stays / yr", placeholder: "e.g., 250" }, mathLabel: "downgrades", plays: ["Document severity at admission", "Concurrent status review", "Physician advisor at the front end"], unitValue: 4000, proof: ["obsrate", "captured"] },
    ],
    choices: [
      { id: "gate", kicker: "The cause", prompt: "Why is it slipping?", helper: "Be honest here. We only count the part a more complete note can defensibly fix, not revenue that was never really there.", mode: "single", defaultId: "note", options: [
        { id: "note", title: "Severity was under-documented", desc: "The acuity was there; the note didn't establish it." },
        { id: "some", title: "Some of it, honestly", desc: "Part documentation, part genuinely appropriate." },
        { id: "appropriate", title: "Mostly appropriate as coded", desc: "Honestly, the coding already reflects the care." },
      ] },
    ],
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. The documentation signals move before the captured dollars land.",
      signals: [
        { id: "cmi", label: "Case mix index moving", desc: "CMI reflecting the acuity you actually treat.", unit: "CMI" },
        { id: "queryrate", label: "Fewer CDI queries", desc: "The query rate coming down as notes arrive complete.", unit: "%" },
        { id: "obsrate", label: "Fewer status downgrades", desc: "Observation downgrades trending down.", unit: "%" },
        { id: "captured", label: "Captured dollars showing up", desc: "The revenue actually landing, net of adjustments.", unit: "$/yr" },
        { id: "team", label: "The CDI and coding team see it", desc: "A lighter, cleaner query queue.", unit: "" },
      ],
    },
    unlock: REVENUE_UNLOCK,
    valueNoun: "items",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Only the share the note can defensibly support.",
  },
  plan: {
    valueInPlay: engineValueInPlay("Inpatient", "Revenue Capture"),
    segmentsSummary: "your admissions",
    outcomes: ["Admissions grouping below the acuity treated", "The CDI query pile"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured from the Abridge platform",
    abridgeSignals: REVENUE_DOC_SIGNALS,
    connector: "When the note establishes severity up front, the weight and the status follow, and the queries fall away.",
    outcomeGroups: [
      { outcome: "Admissions grouping below the acuity treated", metrics: [
        { id: "cmi", name: "Case mix index", measure: "The acuity weight across your admissions.", source: "Billing / claims", unit: "CMI", today: "1.42", target: "1.55" },
        { id: "ccmcc", name: "CC/MCC capture rate", measure: "Share of admissions with the complication or comorbidity captured.", source: "Billing / claims", unit: "%", today: "68", target: "82" },
      ] },
      { outcome: "The CDI query pile", metrics: [
        { id: "queryrate", name: "CDI query rate", measure: "Share of charts needing a CDI query.", source: "Data warehouse (SQL)", unit: "%", today: "18", target: "9" },
        { id: "turnaround", name: "Query turnaround", measure: "Days from query to response.", source: "Data warehouse (SQL)", unit: "days", today: "3.5", target: "1.5" },
      ] },
    ],
    signalsShortList: "note completeness, diagnosis specificity, and documentation adoption",
    outcomesShortList: "case mix and CDI queries",
  },
};

// Full matrix, ordered by setting then category (mirrors SETTING_GOAL_MATRIX).
export const ATTAIN_MATRIX: AttainCell[] = [
  outpatientAccess,
  outpatientRetention,
  outpatientRevenue,
  edAccess,
  edRetention,
  edRevenue,
  inpatientRevenue,
  inpatientRetention,
  nursingQuality,
  nursingRetention,
  nursingCapacity,
];
