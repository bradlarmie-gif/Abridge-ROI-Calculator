import { outpatientAccess, type AttainCell, type ChoiceOption, type MetricDef } from "./attainContent";
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
    segments: {
      prompt: "Which zone or shift is this about?",
      helper: "The gap isn't even across the department, so this sharpens where the throughput actually moves and what a visit is worth there.",
      allLabel: "Across the whole ED",
      allSummary: "the whole ED",
      options: [
        { id: "fasttrack", title: "Fast-track", desc: "Lower-acuity, high-volume, where saved minutes compound.", value: 250 },
        { id: "main", title: "Main ED", desc: "Higher-acuity beds where boarding bites hardest.", value: 480 },
        { id: "peak", title: "Peak surge hours", desc: "When the front end is most likely to back up.", value: 480 },
        { id: "steady", title: "Steady-state hours", desc: "The baseline flow across the rest of the day.", value: 380 },
      ],
      defaultValue: 380,
      unitValueLabel: "contribution margin",
      nameMap: { fasttrack: "fast-track", main: "main ED", peak: "peak surge", steady: "steady-state" },
    },
    scope: { prompt: "Across how many ED providers?", unitLabel: "ED providers, from your Starting Point", ceiling: 45, default: "30" },
    choices: [
      { id: "bottleneck", kicker: "The bottleneck", prompt: "Where's the bottleneck, and is it documentation?", helper: "Be honest here. Throughput has several bottlenecks and documentation is only one. Naming yours sets how much of the gain a lighter, faster note can actually move; if it's front-end intake or back-end boarding, the documentation share is small.", mode: "single", defaultId: "docload", options: [
        { id: "frontend", title: "Front-end intake", desc: "Registration and triage before a clinician is involved." },
        { id: "provider", title: "Provider availability at the front", desc: "Not enough clinician time where patients arrive." },
        { id: "boarding", title: "Back-end boarding and disposition", desc: "Admitted patients held in the ED, backing up the front." },
        { id: "docload", title: "The documentation and charting load itself", desc: "Charting time a lighter note would give back to the front end." },
      ] },
    ],
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
    honestNote: "Only the share of throughput a lighter, faster note actually moves. Most ED bottlenecks are front-end intake and back-end boarding, not the chart, so the number reflects documentation's share alone.",
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
// Wellness-first, goal-first, per-setting depth to the Patient Access exemplar's bar. The
// financial number is DEMOTED: the walk leads with what holding people protects, and the
// dollar is the quiet, capped, doc-addressable-burnout-share claim at the end. The honest
// escape hatch (mostly pay or life → a lighter day won't decide it) stays. The depth is the
// PER-SETTING burden anatomy + at-risk segments each setting brings.
type RetentionConfig = {
  setting: string;
  nounSingular: string;   // "clinician" | "hospitalist" | "nurse"
  nounPlural: string;     // display plural: "clinicians" | "ED clinicians" | "hospitalists" | "nurses"
  peopleWord: string;     // "Clinicians" | "Hospitalists" | "Nurses" — for proof / plan copy
  isNurse: boolean;
  scopeCeiling: number;
  scopeDefault: string;
  signals: MetricDef[];
  signalsShort: string;
  anatomy: ChoiceOption[];   // step 2 — the burden anatomy, SETTING-SPECIFIC (multi)
  atRisk: ChoiceOption[];    // step 3 — who's most at risk, SETTING-SPECIFIC (multi)
  turnoverPlaceholder: string;
  burnoutPlaceholder: string;
  turnoverToday: string;     // plan metric baselines
  turnoverTarget: string;
};

function retentionCell(cfg: RetentionConfig): AttainCell {
  const { setting, nounSingular, nounPlural, peopleWord, isNurse } = cfg;
  const surveySource = isNurse ? "Nurse survey" : "Provider survey";
  // nurses lean on travel and agency; physicians on agency and locums
  const agencyTitle = isNurse ? "Wind down travel and agency spend" : "Wind down agency and locum spend";
  const agencyDesc = "Stop paying premium rates to cover the gaps that turnover opens.";
  const bedsideOrScreen = isNurse ? "Give the time back at the bedside" : "Protect time with patients, not the screen";
  return {
    setting,
    category: "Provider Retention", // stable key across settings; nurses aren't providers, so relabel the heading
    categoryLabel: isNurse ? "Nurse Retention" : undefined,
    align: {
      outcomesMode: "multi",
      value: { mode: "scopeBased", perScope: 0, scopeNoun: nounPlural, mathTail: `in avoided turnover cost.` },
      outcomesPrompt: "What are you really after?",
      outcomesHelper: `When a team says "we want to work on wellness," that's the goal. Our job is to already know what it breaks down into for your setting and walk you there. Pick everything you're after with your ${nounPlural}. We lead with what holding your people protects; the dollar comes last, and it's the softest claim we make.`,
      outcomes: [
        { id: "betterday", title: "A lighter, more livable day", desc: `The same team, with the day that finally ends when it's supposed to.`, plays: ["Protect the freed time, don't just refill it", "Cut the after-hours charting", bedsideOrScreen], proof: ["pulse", "stay", "tin", "wow"] },
        { id: "keep", title: "Keep the people you have", desc: `Fewer of the ${nounPlural} you have today choosing to leave.`, plays: ["Check in with the people most at risk of leaving", "Make the lighter day visible to the team", "Protect the freed time so it's actually felt"], proof: ["turnover", "pulse"] },
        { id: "agency", title: agencyTitle, desc: agencyDesc, plays: [isNurse ? "Redirect freed hours before backfilling with travel or agency" : "Hold coverage in-house before reaching for locums", "Watch the premium-rate spend ease as turnover comes down"], proof: ["turnover"] },
        { id: "line", title: "Protect a fragile service line", desc: "One or two departures away from a real coverage problem.", plays: ["Shore up the thinnest coverage first", "Track who's at risk on the fragile service or shift"], proof: ["turnover", "stay"] },
      ],
      scope: { prompt: `Across how many ${nounPlural}?`, unitLabel: `${nounPlural}, from your Starting Point`, ceiling: cfg.scopeCeiling, default: cfg.scopeDefault },
      choices: [
        { id: "anatomy", kicker: "The burden", prompt: `What's driving the burden, for your setting?`, helper: `This is the part we already know how to decompose. Pick the ones that ring true for your ${nounPlural}; it's where a lighter documentation day actually reaches.`, mode: "multi", options: cfg.anatomy },
        { id: "atrisk", kicker: "Where to focus", prompt: "Who's most at risk?", helper: "Turnover isn't even across the group. Naming where it concentrates is where to focus first, and where a lighter day earns its keep.", mode: "multi", options: cfg.atRisk },
        { id: "driver", kicker: "The driver", prompt: "What's driving your departures?", helper: "Be honest here. It tells us how much of the turnover a lighter day can realistically touch, and how much it can't.", mode: "single", defaultId: "burnout", options: [
          { id: "burnout", title: "Mostly burnout and workload", desc: "The day is too heavy, and the charting follows people home." },
          { id: "meaningful", title: "A meaningful share is burnout", desc: "Some of it is workload; some is pay or life." },
          { id: "paylife", title: "Mostly pay or life", desc: "Honestly, a lighter day won't be the deciding factor here." },
        ] },
      ],
      trend: {
        kicker: "Today, and the trend",
        prompt: "Where's your turnover and burnout today, and which way is it trending?",
        helper: "Set roughly where you are now, then tell us the direction. A slipping trend is the urgent case; a steady one is a reason to stay humble about what a lighter day will move. These feed the quiet dollar later; the direction just tells us how hard to lean.",
        numbers: [
          { key: "turnover", label: "Voluntary turnover today", suffix: "%", placeholder: cfg.turnoverPlaceholder },
          { key: "burnout", label: "Burnout on your last pulse", suffix: "%", placeholder: cfg.burnoutPlaceholder },
        ],
        trendId: "trend",
        trendPrompt: "Which way has it been trending?",
        options: [
          { id: "improving", title: "Improving", desc: "It's been getting better." },
          { id: "flat", title: "Flat", desc: "It's held about steady." },
          { id: "slipping", title: "Slipping", desc: "It's been drifting the wrong way. This is the urgent case." },
        ],
      },
      proof: {
        prompt: "What would tell you it's working?",
        helper: "Pick what you'd point to in a review. The experience signals move first, well before the turnover number does.",
        signals: [
          { id: "pulse", label: "A burnout pulse easing", desc: "A short, repeated read on how the team is actually doing, coming down.", unit: "%" },
          { id: "stay", label: "Likelihood to stay rising", desc: `The share of ${nounPlural} who say they intend to stay, climbing.`, unit: "%" },
          { id: "tin", label: isNurse ? "Charting time per shift dropping" : "Time in note dropping", desc: isNurse ? "Minutes spent documenting across a shift, coming down." : "Minutes spent documenting per encounter, coming down.", unit: "min" },
          { id: "wow", label: isNurse ? "Charting after the shift dropping" : "After-hours minutes dropping", desc: isNurse ? "Documentation finished after the shift ends, the work outside of work, easing." : "The pajama-time work outside of work in the EHR, easing.", unit: "min" },
          { id: "turnover", label: "The turnover number moving", desc: "Voluntary departures coming down against your baseline.", unit: "%" },
          { id: "lovestories", label: "Love Stories", desc: `${peopleWord} telling you the day got better, in their words.`, unit: "" },
        ],
      },
      unlock: {
        prompt: "What does holding onto your people protect?",
        helper: "This is the real reason to hold the line, and it's what we lead with. The dollar comes after it, and it's the softest claim in the plan. Pick what holding your people actually protects.",
        options: [
          { id: "line", title: "A fragile service line", desc: "One or two departures away from a real coverage problem." },
          { id: "agency", title: agencyTitle, desc: agencyDesc },
          { id: "knowledge", title: "Institutional knowledge", desc: "The people who know how your place actually runs." },
          { id: "access", title: "Steady access for patients", desc: "Turnover quietly closes schedules; holding people keeps them open." },
          { id: "recruit", title: "Easier recruiting", desc: "A place people stay is a place people want to join." },
        ],
      },
      valueNoun: nounPlural,
      panelKicker: "The quiet dollar, from your numbers",
      honestNote: "The softest claim in the plan, and it comes last. We count only the burnout-driven share of turnover a lighter documentation day can address, and we cap even that at half. The pay and life reasons a lighter day won't change are left out.",
    },
    plan: {
      valueInPlay: engineValueInPlay(setting, "Provider Retention"),
      segmentsSummary: `your ${nounPlural}`,
      outcomes: ["A lighter, more livable day", "Keep the people you have"],
      signalsGroupLabel: "What Abridge can enable",
      signalsTag: "measured directly from Epic Signal",
      abridgeSignals: cfg.signals,
      connector: "When the day gets lighter and burnout eases, more of your people choose to stay.",
      outcomeGroups: [
        { outcome: "A lighter, more livable day", metrics: [
          { id: "burnout", name: "Burnout pulse", measure: `Share of ${nounPlural} reporting burnout on a short, repeated survey.`, source: surveySource, unit: "%", today: "48", target: "32" },
          { id: "stay", name: "Likelihood to stay", measure: `Share of ${nounPlural} who say they intend to stay.`, source: surveySource, unit: "%", today: "71", target: "84" },
        ] },
        { outcome: "Keep the people you have", metrics: [
          { id: "turnover", name: "Voluntary turnover rate", measure: `${peopleWord} choosing to leave in a year.`, source: "HRIS", unit: "%", today: cfg.turnoverToday, target: cfg.turnoverTarget },
          { id: "departures", name: "Departures avoided", measure: "Departures you'd expect to prevent against your baseline.", source: "HRIS", unit: "/ yr", today: "—", target: "6" },
          { id: "replace", name: "Replacement cost saved", measure: "The recruiting, onboarding, and coverage cost those departures would have carried.", source: "Finance", unit: "$/yr", today: "—", target: "—" },
        ] },
      ],
      signalsShortList: cfg.signalsShort,
      outcomesShortList: "burnout and turnover",
    },
  };
}

const nurseSignals: MetricDef[] = [
  { id: "tin", name: "Charting time per shift", measure: "Minutes a nurse spends documenting across a shift.", source: "Epic Signal", unit: "min", today: "95", target: "65" },
  { id: "wow", name: "Charting after shift", measure: "Minutes of documentation finished after the shift ends.", source: "Epic Signal", unit: "min", today: "35", target: "12" },
];
const providerSignals: MetricDef[] = [
  { id: "tin", name: "Time in note", measure: "Minutes spent documenting per encounter.", source: "Epic Signal", unit: "min", today: "9.5", target: "5.5" },
  { id: "wow", name: "Work outside of work", measure: "After-hours time in the EHR per day, the \"pajama time\" tied to burnout.", source: "Epic Signal", unit: "min/day", today: "48", target: "25" },
];

// Per-setting burden anatomy (step 2) and at-risk segments (step 3) — the depth.
const outpatientRetention = retentionCell({
  setting: "Outpatient", nounSingular: "clinician", nounPlural: "clinicians", peopleWord: "Clinicians", isNurse: false,
  scopeCeiling: 60, scopeDefault: "40", signals: providerSignals, signalsShort: "time in note and work outside of work",
  turnoverPlaceholder: "6", burnoutPlaceholder: "48", turnoverToday: "14", turnoverTarget: "9",
  anatomy: [
    { id: "inbox", title: "The inbox and message burden", desc: "In-basket messages and results piling up between and after visits." },
    { id: "pajama", title: "After-hours \"pajama time\" charting", desc: "Notes finished at night, the work outside of work tied to burnout." },
    { id: "cadence", title: "Visit-cadence pressure", desc: "Back-to-back visits with no room to chart in the moment." },
  ],
  atRisk: [
    { id: "highpanel", title: "High-panel PCPs", desc: "The largest panels and the heaviest in-baskets." },
    { id: "parttime", title: "Part-timers carrying a full inbox", desc: "A reduced schedule, but the message load never shrank." },
    { id: "newer", title: "Newer clinicians still building speed", desc: "Where the day feels heaviest before the workflow clicks." },
  ],
});
const edRetention = retentionCell({
  setting: "ED", nounSingular: "clinician", nounPlural: "ED clinicians", peopleWord: "ED clinicians", isNurse: false,
  scopeCeiling: 45, scopeDefault: "30", signals: providerSignals, signalsShort: "time in note and work outside of work",
  turnoverPlaceholder: "6", burnoutPlaceholder: "50", turnoverToday: "15", turnoverTarget: "10",
  anatomy: [
    { id: "between", title: "Charting between patients on a heavy shift", desc: "Documentation squeezed into the gaps on a full board." },
    { id: "surge", title: "Documentation piling up during surges", desc: "Notes stacking unfinished when volume spikes." },
    { id: "boarding", title: "Boarding stretching the shift", desc: "Holding admitted patients drags the shift and the charting past its end." },
  ],
  atRisk: [
    { id: "nights", title: "Nights and weekends", desc: "The shifts hardest to cover and hardest to keep staffed." },
    { id: "acuity", title: "High-acuity coverage", desc: "The clinicians carrying the sickest boards." },
    { id: "newer", title: "Newer attendings on the heaviest rotations", desc: "Where the shift feels heaviest before the pace becomes routine." },
  ],
});
const inpatientRetention = retentionCell({
  setting: "Inpatient", nounSingular: "hospitalist", nounPlural: "hospitalists", peopleWord: "Hospitalists", isNurse: false,
  scopeCeiling: 35, scopeDefault: "24", signals: providerSignals, signalsShort: "time in note and work outside of work",
  turnoverPlaceholder: "8", burnoutPlaceholder: "52", turnoverToday: "16", turnoverTarget: "11",
  anatomy: [
    { id: "census", title: "Note load scaling with census", desc: "Every added patient is another full note on the list." },
    { id: "crunch", title: "The discharge-summary and admission H&P crunch", desc: "The heaviest notes land at the busiest moments of the day." },
    { id: "rounding", title: "Rounding time lost to the note", desc: "Time meant for the bedside going to documentation." },
  ],
  atRisk: [
    { id: "highcensus", title: "High-census services", desc: "The teams carrying the most patients per rounder." },
    { id: "nocturnist", title: "Nocturnists and swing", desc: "Overnight and swing coverage that's hardest to staff." },
    { id: "newer", title: "Newer hospitalists on the busiest services", desc: "Where the list feels heaviest before the rhythm settles." },
  ],
});
const nursingRetention = retentionCell({
  setting: "Nursing", nounSingular: "nurse", nounPlural: "nurses", peopleWord: "Nurses", isNurse: true,
  scopeCeiling: 400, scopeDefault: "260", signals: nurseSignals, signalsShort: "charting time per shift and charting after shift",
  turnoverPlaceholder: "18", burnoutPlaceholder: "45", turnoverToday: "22", turnoverTarget: "15",
  anatomy: [
    { id: "bedside", title: "Charting stealing time from the bedside", desc: "Documentation pulling nurses away from patient care." },
    { id: "endshift", title: "End-of-shift and missed-break documentation", desc: "Notes finished after the shift, and through breaks that never happened." },
    { id: "ratio", title: "Ratio pressure", desc: "Too many patients per nurse leaves no time to chart in the moment." },
  ],
  atRisk: [
    { id: "medsurg", title: "High-ratio med-surg", desc: "The units with the most patients per nurse." },
    { id: "nights", title: "Nights", desc: "The shifts hardest to staff and quickest to burn out." },
    { id: "firstyear", title: "First-year nurses", desc: "Where turnover concentrates in the first year on the floor." },
  ],
});

// ---------------------------------------------------------------- Nursing · Capacity
const nursingCapacity: AttainCell = {
  setting: "Nursing",
  category: "Nursing Capacity",
  align: {
    outcomesMode: "multi",
    value: { mode: "scopeBased", perScope: 2_250, scopeNoun: "nurses", mathTail: "in documentation-tied overtime." },
    outcomesPrompt: "Pick every outcome you're after",
    outcomesHelper: "Lighter charting shows up in more than one place: the overtime line, the shift that finally ends on time, and the hours you get back at the bedside. Pick each outcome that matters and we'll size it from your nurse count. The dollar stays tied to the overtime we can attribute to documentation; the wider goals we align on and track alongside it.",
    outcomes: [
      { id: "cost", title: "Cut the overtime cost", desc: "The documentation-driven overtime dollars in your budget.", plays: ["Hold nurses to an on-time clock-out", "Chart in the room, not after the shift", "Watch the overtime line by unit"], proof: ["othours", "budget"] },
      { id: "ontime", title: "Nurses finishing on time", desc: "Shifts that end when they're supposed to, not an hour later.", plays: ["Chart at the bedside during the shift", "Protect the last hour from documentation", "Hand off before the charting, not after"], proof: ["ontime"] },
      { id: "bedside", title: "Time back at the bedside", desc: "Documentation time returned to patient care instead of the screen.", plays: ["Chart in the room during care, not after", "Protect face-to-face time from the keyboard", "Drop the low-value documentation asks"], proof: ["ontime"] },
      { id: "ratio", title: "Hold the ratio without adding heads", desc: "Absorb the census with the team you already have.", plays: ["Convert freed charting time into capacity", "Flex the lighter load across the unit", "Watch the ratio against the census"], proof: ["othours"] },
      { id: "agency", title: "Lean off agency and travel", desc: "Less reliance on premium-rate coverage to fill the gaps.", plays: ["Redirect freed hours before backfilling with agency", "Hold on-time finishes so shifts stay covered", "Watch the agency line by unit"], proof: ["agency", "budget"] },
    ],
    segments: {
      prompt: "Which units is this for?",
      helper: "Overtime and charting load aren't the same on every unit, so this scopes the plan and sharpens where to watch first.",
      allLabel: "Across all units",
      allSummary: "all nursing units",
      options: [
        { id: "medsurg", title: "Med-surg", desc: "Highest volume, where post-shift charting piles up.", value: 70 },
        { id: "icu", title: "ICU", desc: "Heavy documentation per patient against tight ratios.", value: 90 },
        { id: "ednursing", title: "ED nursing", desc: "Bursty load, with charting batched to the end of the shift.", value: 80 },
        { id: "other", title: "Other floors", desc: "We'll size it across the board and narrow later.", value: 70 },
      ],
      defaultValue: 75,
      unitValueLabel: "loaded overtime rate",
      nameMap: { medsurg: "med-surg", icu: "ICU", ednursing: "ED nursing", other: "other floors" },
    },
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
        { id: "agency", label: "Agency and travel spend easing", desc: "Premium-rate coverage coming down as the team absorbs the load.", unit: "$/yr" },
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
    honestNote: "Valued at a loaded hourly rate. The dollar is only the overtime we can attribute to documentation; the wider goals we align on and track, not add to the number.",
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
      { id: "book", stage: "frame", kicker: "The payers", prompt: "Which part of your book is this about?", helper: "Revenue capture forks by how you get paid, and you can pick more than one. Fee-for-service pays on the visit level, so how the visit codes is the money. Risk contracts (Medicare Advantage, Medicaid, ACA) pay on the conditions you capture, so recapture is the money. Pick both and we walk both.", mode: "multi", defaultId: "ffs", options: [
        { id: "ffs", title: "Fee-for-service", desc: "The level on the claim drives what you're paid." },
        { id: "ma", title: "Medicare Advantage", desc: "Paid on the risk you capture; recapture is the lever." },
        { id: "medicaid", title: "Medicaid managed care", desc: "Risk-adjusted, and accurate coding matters too." },
        { id: "aca", title: "ACA / Exchange", desc: "Risk-adjusted, like Medicare Advantage." },
      ] },
    ],
    discovery: {
      populations: [
        // ---- Fee-for-service: 7 beats ----
        { id: "ffs", showIf: ["ffs"], beats: [
          { kind: "choice", id: "ffsWhere", mode: "multi", kicker: "Where it slips", prompt: "Where's the money slipping?",
            helper: "Name the places you actually see it. You can pick more than one.", options: [
            { id: "undercode", title: "Visits coding below the work done", desc: "A level-4 workup goes out as a level 3 because the note didn't carry it." },
            { id: "lines", title: "A specific service line or two", desc: "The gap concentrates where the visits are most complex." },
            { id: "denials", title: "Denials you end up writing off", desc: "Medical-necessity denials a more complete note would have prevented." },
          ] },
          { kind: "choice", id: "ffsWhy", mode: "single", kicker: "The cause", prompt: "Why is it slipping?",
            helper: "Be honest here. We only count what a more complete note can defensibly fix, not revenue that was never really there.", options: [
            { id: "note", title: "The note undersold the visit", desc: "The care happened; the documentation didn't carry it." },
            { id: "lower", title: "Some of it is genuinely lower complexity", desc: "Part is documentation; part was honestly a simpler visit." },
            { id: "downstream", title: "Mostly a downstream coding or workflow gap", desc: "The note is there; the miss is after it, in coding or the queue." },
          ] },
          { kind: "segments", kicker: "The service lines", prompt: "Which service lines is this really about?",
            helper: "A cardiology visit and a primary-care visit aren't worth the same, so this sharpens the number.", allLabel: "Across all lines", options: [
            { id: "primary", title: "Primary care", desc: "Highest volume, where undercoding adds up quietly." },
            { id: "cardiology", title: "Cardiology", desc: "Higher-complexity visits, more room between the care and the code." },
            { id: "ortho", title: "Orthopedics & surgical", desc: "Procedural visits with real level swings." },
            { id: "behavioral", title: "Behavioral health", desc: "Time-based coding the note often understates." },
            { id: "other", title: "Other specialties", desc: "We'll size it across the board and narrow later." },
          ] },
          { kind: "number", id: "ffsUndercoded", kicker: "The volume", prompt: "How many visits a year code below the work done?",
            helper: "Your own estimate is fine; it's the base we size the coding lift from.", label: "Undercoded visits a year", unit: "visits / yr", placeholder: "e.g., 6,000" },
          { kind: "economics", leverId: "ffs", kicker: "The economics", prompt: "What's the coding worth?",
            helper: "Set your current wRVU per visit and your conversion factor. The lift a more complete note supports we seed conservatively; change it if you have a better read." },
          { kind: "stance", leverId: "ffs", kicker: "What you keep", prompt: "How much of the lift do you capture and keep through billing and audit?" },
          { kind: "outcome", id: "ffsGoal", kicker: "The goal", prompt: "What does getting paid fairly let you do?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "fund", title: "Fund the documentation program itself", desc: "The capture can cover the cost of the platform." },
            { id: "defend", title: "Defend a service line's margin", desc: "Keep a line whole that's under margin pressure." },
            { id: "earned", title: "Stop leaving earned revenue on the table", desc: "Bill accurately for care you already delivered." },
            { id: "integrity", title: "Meet a coding-integrity bar you're committed to", desc: "A compliance standard you have to hold." },
          ] },
        ] },
        // ---- Risk / VBC: 8 beats (stance folded into the economics beat) ----
        { id: "risk", showIf: ["ma", "medicaid", "aca"], beats: [
          { kind: "choice", id: "riskGoing", mode: "multi", kicker: "The target", prompt: "What are you going after?",
            helper: "Pick both if both apply.", options: [
            { id: "recapture", title: "Recapture conditions that reset every year", desc: "Chronic conditions coded last year that fall off and have to be re-established (existing)." },
            { id: "new", title: "Capture conditions documented but never coded", desc: "Conditions treated and in the note that never made it onto the claim (new)." },
          ] },
          { kind: "choice", id: "riskScope", mode: "single", kicker: "The scope", prompt: "The whole risk population, or one contract or panel?",
            helper: "This tells us how wide to size, and which team owns it.", options: [
            { id: "all", title: "All your risk lives", desc: "Every member under a risk arrangement." },
            { id: "one", title: "A specific contract or panel", desc: "One payer, product, or panel you're focused on." },
          ] },
          { kind: "choice", id: "riskPay", mode: "single", kicker: "The contract", prompt: "How does the contract pay?",
            helper: "This changes what accuracy is worth and how you'd prove it.", options: [
            { id: "shared", title: "Shared savings", desc: "You share in the savings against a benchmark." },
            { id: "cap", title: "Capitated", desc: "A fixed payment per member; accuracy sets the rate." },
            { id: "full", title: "Full risk", desc: "You hold the risk; the score is the revenue." },
          ] },
          { kind: "number", id: "riskPatients", kicker: "The lives", prompt: "How many risk lives are in play?",
            helper: "The members under the arrangement you're sizing. This is what the recapture value scales on.", label: "Risk-contract lives", unit: "lives", placeholder: "e.g., 18,000" },
          { kind: "number", id: "riskRateToday", kicker: "Today's rate", prompt: "Where's your recapture rate today?",
            helper: "Roughly the share of open conditions you close in a year. It sets the starting line.", label: "Current recapture rate", unit: "%", placeholder: "e.g., 55" },
          { kind: "choice", id: "riskTrend", mode: "single", kicker: "The trend", prompt: "Which way has it been trending?",
            helper: "Where it's been heading tells us how much of the gap is still open.", options: [
            { id: "improving", title: "Improving", desc: "It's been climbing." },
            { id: "flat", title: "Flat", desc: "It's held steady." },
            { id: "slipping", title: "Slipping", desc: "It's been drifting down." },
          ] },
          { kind: "economics", leverId: "risk", kicker: "The economics", prompt: "What's a recaptured condition worth, and how much survives audit?",
            helper: "Set the annual value one recaptured condition carries. The conditions open per patient we seed conservatively. Risk coding carries more audit exposure than fee-for-service, so stay tighter on what survives.", withStance: true },
          { kind: "outcome", id: "riskGoal", kicker: "The goal", prompt: "What does closing the gap protect or unlock?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "target", title: "Hit the shared-savings target", desc: "Clear the benchmark you're measured against." },
            { id: "margin", title: "Protect the capitation margin", desc: "Keep the fixed payment matched to real risk." },
            { id: "scores", title: "Lift the quality and risk scores", desc: "The scores your contracts turn on." },
            { id: "radv", title: "Defend the RAF against a RADV audit", desc: "A complete record that holds up if CMS looks." },
          ] },
        ] },
      ],
    },
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
    outcomesPrompt: "Pick the goals you're after",
    outcomesHelper: "This is money for care you already delivered in the ED that the documentation didn't carry to the claim. It slips in a couple of distinct places, so pick the mechanisms you're tackling below and we'll walk each one from your own figures, not a benchmark.",
    outcomes: [
      { id: "em", title: "Get paid for the acuity you treat", desc: "The high-acuity workup happened; the note just didn't carry it, so the visit codes below the level of care. This closes the gap between the acuity and the code.", dig: { label: "ED visits a year you suspect are under-leveled", unit: "visits / yr", placeholder: "e.g., 4,000" }, mathLabel: "under-leveled", plays: ["Capture the full workup in the note", "Coder feedback to ED providers", "Level-driver prompts in the ED note"], unitValue: 40, proof: ["losmix", "captured"] },
      { id: "denials", title: "Stop writing off preventable denials", desc: "Medical-necessity denials a more complete ED note would have prevented.", dig: { label: "Preventable denials a year", unit: "denials / yr", placeholder: "e.g., 350" }, mathLabel: "denials", plays: ["Establish medical necessity in the note", "Fix the top ED denial reasons", "Payer-specific documentation prompts"], unitValue: 3500, proof: ["denialrate", "captured"] },
    ],
    scope: { prompt: "Across how many ED providers?", unitLabel: "ED providers, from your Starting Point", ceiling: 45, default: "30" },
    choices: [
      { id: "edframe", stage: "frame", kicker: "The mechanisms", prompt: "Which of these are you tackling?",
        helper: "ED revenue slips in a couple of distinct places, and each one is a different conversation. Pick the ones you're working on and we'll walk each with you. You can pick both.", mode: "multi", options: [
        { id: "edcoding", title: "Getting paid for the acuity you treat", desc: "High-acuity visits that code below the care delivered because the note didn't carry the workup." },
        { id: "eddenials", title: "Denials you end up writing off", desc: "Medical-necessity denials a more complete ED note would have prevented." },
      ] },
    ],
    discovery: {
      populations: [
        // ---- Acuity coding: 6 beats ----
        { id: "edcoding", showIf: ["edcoding"], beats: [
          { kind: "choice", id: "edcodingWhere", mode: "multi", kicker: "Where it slips", prompt: "Where's the acuity getting lost?",
            helper: "Name the places you actually see it. You can pick more than one.", options: [
            { id: "highacuity", title: "High-acuity visits coding low", desc: "A real workup lands as a lower-level visit because the note didn't establish the acuity." },
            { id: "presentations", title: "Specific presentations", desc: "Certain chief complaints where the documentation routinely undersells the work." },
            { id: "shift", title: "A service or a shift", desc: "The gap concentrates on a team, a location, or the overnight." },
          ] },
          { kind: "choice", id: "edcodingWhy", mode: "single", kicker: "The cause", prompt: "Why is it slipping?",
            helper: "Be honest here. We only count the part a more complete note can defensibly fix, not acuity that was never really there.", options: [
            { id: "note", title: "The note didn't carry the workup", desc: "The care happened; the documentation didn't establish the level." },
            { id: "lower", title: "Some of it is genuinely lower acuity", desc: "Part is documentation; part was honestly a simpler visit." },
            { id: "downstream", title: "A downstream coding gap", desc: "The note is there; the miss is after it, in coding or the queue." },
          ] },
          { kind: "number", id: "edUnderLeveled", kicker: "The volume", prompt: "How many ED visits a year code below the acuity treated?",
            helper: "Your own estimate is fine; it's the base we size the coding lift from.", label: "Under-leveled ED visits a year", unit: "visits / yr", placeholder: "e.g., 4,000" },
          { kind: "economics", leverId: "edcoding", kicker: "The economics", prompt: "What's the acuity coding worth?",
            helper: "Set your current wRVU per ED visit and your conversion factor. The E&M lift a more complete note supports we seed conservatively; change it if you have a better read." },
          { kind: "stance", leverId: "edcoding", kicker: "What you keep", prompt: "How much of the lift survives billing and audit?" },
          { kind: "outcome", id: "edcodingGoal", kicker: "The goal", prompt: "What does getting paid for the acuity let you do?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "economics", title: "Defend the ED's economics", desc: "Keep the department's revenue matched to the acuity it carries." },
            { id: "staffing", title: "Support the staffing the department needs", desc: "Fund the coverage the volume and acuity actually demand." },
            { id: "fair", title: "Fair reimbursement for the acuity you carry", desc: "Get paid for the level of care your team already delivers." },
          ] },
        ] },
        // ---- Preventable denials: 5 beats ----
        { id: "eddenials", showIf: ["eddenials"], beats: [
          { kind: "choice", id: "eddenialsWhy", mode: "single", kicker: "The cause", prompt: "What's driving the denials?",
            helper: "Where they originate tells us how much a more complete note can defensibly prevent.", options: [
            { id: "necessity", title: "Medical necessity not established in the note", desc: "The documentation didn't carry why the care was warranted." },
            { id: "eligibility", title: "Eligibility or registration", desc: "Front-end data the note can't fix." },
            { id: "downstream", title: "A downstream process", desc: "The denial originates after the note, in coding or billing." },
          ] },
          { kind: "number", id: "edPreventableDenials", kicker: "The volume", prompt: "How many preventable denials a year?",
            helper: "Your own estimate is fine; it's the base we size the recovered revenue from.", label: "Preventable denials a year", unit: "denials / yr", placeholder: "e.g., 350" },
          { kind: "economics", leverId: "eddenials", kicker: "The economics", prompt: "What's a prevented denial worth?",
            helper: "Set the average value on a claim you'd otherwise write off. The medical-necessity denial rate we seed conservatively; change it if you have a better read." },
          { kind: "stance", leverId: "eddenials", kicker: "What you keep", prompt: "How much of the lift survives billing and audit?" },
          { kind: "outcome", id: "eddenialsGoal", kicker: "The goal", prompt: "What does cutting the denials open up?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "recovered", title: "Recovered revenue", desc: "Dollars you were writing off, kept instead." },
            { id: "queue", title: "A lighter revenue-cycle queue", desc: "Fewer denials landing on the team's desk to work." },
            { id: "writeoffs", title: "Fewer write-offs", desc: "Less earned revenue lost at the back end." },
          ] },
        ] },
      ],
    },
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
    outcomes: ["Get paid for the acuity you treat", "Stop writing off preventable denials"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured from the Abridge platform",
    abridgeSignals: REVENUE_DOC_SIGNALS,
    connector: "When the ED note captures the full workup, the acuity coding follows.",
    outcomeGroups: [
      { outcome: "Get paid for the acuity you treat", lever: "edcoding", metrics: [
        { id: "embelow", name: "E/M below supported level", measure: "Share of ED visits coding below the acuity documented.", source: "Billing / claims", unit: "%", today: "25", target: "13" },
        { id: "losmix", name: "Average E/M level", measure: "Average ED E/M level (99281 to 99285).", source: "Billing / claims", unit: "level", today: "3.4", target: "3.8" },
      ] },
      { outcome: "Stop writing off preventable denials", lever: "eddenials", metrics: [
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
    outcomesPrompt: "Pick the goals you're after",
    outcomesHelper: "Inpatient pay follows the documentation: the DRG weight, the CDI query pile, the status on the claim. Each is a distinct conversation, so pick the mechanisms you're tackling below and we'll walk each one from your own figures, not a benchmark.",
    outcomes: [
      { id: "drg", title: "Get the DRG weight the acuity earns", desc: "A sick patient that groups to a lower-weight DRG because a CC or MCC never made it into the note. This closes the gap between the severity treated and the weight paid.", dig: { label: "Admissions a year that group below the weight earned", unit: "admissions / yr", placeholder: "e.g., 200" }, mathLabel: "under-weighted", plays: ["Document CC/MCC severity up front", "Focus CDI on the high-impact charts", "Feedback loop to the attendings"], unitValue: 2500, proof: ["cmi", "captured"] },
      { id: "cdi", title: "Cut the CDI query pile", desc: "Queries your CDI team writes because the note arrived without the specificity coding needs.", dig: { label: "CDI queries a year a complete note would avoid", unit: "queries / yr", placeholder: "e.g., 1,500" }, mathLabel: "queries avoided", plays: ["Complete the note the first time", "Target the top query types", "Provider education on specificity"], unitValue: 90, proof: ["queryrate", "team"] },
      { id: "obs", title: "Defend inpatient status", desc: "Inpatient-level care billed as observation because severity wasn't established up front.", dig: { label: "Downgrades a year you could defend", unit: "stays / yr", placeholder: "e.g., 250" }, mathLabel: "downgrades", plays: ["Document severity at admission", "Concurrent status review", "Physician advisor at the front end"], unitValue: 4000, proof: ["obsrate", "captured"] },
    ],
    scope: { prompt: "Across how many hospitalists?", unitLabel: "hospitalists, from your Starting Point", ceiling: 35, default: "24" },
    choices: [
      { id: "ipframe", stage: "frame", kicker: "The mechanisms", prompt: "Which of these are you tackling?",
        helper: "Inpatient revenue follows the documentation in a few distinct places, and each is a different conversation. Pick the ones you're working on and we'll walk each with you. You can pick more than one.", mode: "multi", options: [
        { id: "drg", title: "Get the DRG weight the acuity earns", desc: "Admissions that group below the weight the severity earns because a CC or MCC never made the note." },
        { id: "cdi", title: "Cut the CDI query pile", desc: "Queries your CDI team writes because the note arrived without the specificity coding needs." },
        { id: "obs", title: "Defend inpatient status", desc: "Inpatient-level care billed as observation because severity wasn't established up front." },
      ] },
    ],
    discovery: {
      populations: [
        // ---- DRG weight: 6 beats ----
        { id: "drg", showIf: ["drg"], beats: [
          { kind: "choice", id: "drgWhere", mode: "multi", kicker: "Where it slips", prompt: "Where's the weight getting lost?",
            helper: "Name the places you actually see it. You can pick more than one.", options: [
            { id: "ccmcc", title: "A CC or MCC never documented", desc: "A complication or comorbidity that was treated but never made the note." },
            { id: "severity", title: "Severity not established up front", desc: "The acuity was real but the admission note didn't carry it." },
            { id: "lines", title: "Specific service lines", desc: "The gap concentrates on certain admitting services." },
          ] },
          { kind: "choice", id: "drgWhy", mode: "single", kicker: "The cause", prompt: "Why?",
            helper: "Be honest here. We only count the part a more complete note can defensibly fix, not weight that was never really earned.", options: [
            { id: "note", title: "The note didn't establish severity", desc: "The acuity was there; the documentation didn't carry it." },
            { id: "appropriate", title: "Genuinely appropriate as grouped", desc: "Part is documentation; part honestly grouped correctly." },
            { id: "downstream", title: "A downstream coding gap", desc: "The note is there; the miss is after it, in coding or the query loop." },
          ] },
          { kind: "number", id: "drgUnderWeighted", kicker: "The volume", prompt: "Admissions a year grouping below the weight earned?",
            helper: "Your own estimate is fine; it's the base we size the weight capture from.", label: "Under-weighted admissions a year", unit: "admissions / yr", placeholder: "e.g., 200" },
          { kind: "economics", leverId: "drg", kicker: "The economics", prompt: "What's the weight worth?",
            helper: "Set your average DRG base payment. The CMI lift and the share attributable to Abridge (versus your CDI team) we seed conservatively; change either if you have a better read." },
          { kind: "stance", leverId: "drg", kicker: "What you keep", prompt: "How much of the lift survives audit?" },
          { kind: "outcome", id: "drgGoal", kicker: "The goal", prompt: "What does capturing the weight protect?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "cmi", title: "An accurate case mix index", desc: "A CMI that reflects the acuity you actually treat." },
            { id: "payment", title: "Fair DRG payment", desc: "Get paid the weight the severity earns." },
            { id: "defensible", title: "Defensible against audit", desc: "A record that holds up if a payer or CMS looks." },
          ] },
        ] },
        // ---- CDI query reduction: 4 beats (realization folded into economics so CDI stands alone) ----
        { id: "cdi", showIf: ["cdi"], beats: [
          { kind: "choice", id: "cdiWhy", mode: "single", kicker: "The cause", prompt: "What's driving the query volume?",
            helper: "Where the queries come from tells us how many a complete note could head off.", options: [
            { id: "specificity", title: "Notes arrive without the specificity coding needs", desc: "The detail is missing at the source, so CDI has to ask for it." },
            { id: "timing", title: "Timing", desc: "The note lands late, so the query happens after the fact." },
            { id: "engagement", title: "Provider engagement", desc: "Responses are slow or incomplete, so the loop repeats." },
          ] },
          { kind: "number", id: "cdiQueriesAvoided", kicker: "The volume", prompt: "CDI queries a year a complete note would avoid?",
            helper: "Your own estimate is fine; it's the base we size the query savings from.", label: "Avoidable CDI queries a year", unit: "queries / yr", placeholder: "e.g., 1,500" },
          { kind: "economics", leverId: "cdi", kicker: "The economics", prompt: "What's the query pile costing you, and how much do you realize?",
            helper: "Set the loaded cost of one query cycle, the coder and physician time it takes. The volume a complete note would avoid we seed conservatively. Query savings are operational, not revenue exposed to audit, so set the share you'd actually realize.", withStance: true },
          { kind: "outcome", id: "cdiGoal", kicker: "The goal", prompt: "What does a lighter query pile free up?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "capacity", title: "CDI capacity for the high-impact charts", desc: "Fewer routine queries means the team works the charts that move the weight." },
            { id: "coding", title: "Faster coding", desc: "Complete notes clear the coding queue sooner." },
            { id: "goodwill", title: "Provider goodwill", desc: "Fewer back-and-forth queries landing on the attendings." },
          ] },
        ] },
        // ---- Inpatient status defense: 5 beats ----
        { id: "obs", showIf: ["obs"], beats: [
          { kind: "choice", id: "obsWhere", mode: "single", kicker: "The cause", prompt: "Where do the downgrades come from?",
            helper: "Where they originate tells us how many a more complete note can defensibly hold.", options: [
            { id: "admission", title: "Severity not established at admission", desc: "The note didn't carry why inpatient level was warranted." },
            { id: "concurrent", title: "Concurrent-review gaps", desc: "The status question wasn't caught while the patient was still in house." },
            { id: "payer", title: "Payer pushback", desc: "The payer downgraded despite a defensible stay." },
          ] },
          { kind: "number", id: "obsDowngrades", kicker: "The volume", prompt: "Defensible status downgrades a year?",
            helper: "Your own estimate is fine; it's the base we size the defended revenue from.", label: "Defensible downgrades a year", unit: "stays / yr", placeholder: "e.g., 250" },
          { kind: "economics", leverId: "obs", kicker: "The economics", prompt: "What's a defended stay worth?",
            helper: "Set the revenue delta between inpatient and observation on one stay held. The downgrade rate we seed conservatively; change it if you have a better read." },
          { kind: "stance", leverId: "obs", kicker: "What you keep", prompt: "How much of the lift survives audit?" },
          { kind: "outcome", id: "obsGoal", kicker: "The goal", prompt: "What does defending status protect?",
            helper: "The reason underneath the dollar. Pick each that fits.", options: [
            { id: "revenue", title: "Earned inpatient revenue", desc: "Payment for the level of care the stay actually warranted." },
            { id: "integrity", title: "Status integrity", desc: "A status determination that matches the documentation." },
            { id: "appeals", title: "Fewer appeals", desc: "Less back-end rework fighting downgrades after the fact." },
          ] },
        ] },
      ],
    },
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
    outcomes: ["Get the DRG weight the acuity earns", "Cut the CDI query pile", "Defend inpatient status"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured from the Abridge platform",
    abridgeSignals: REVENUE_DOC_SIGNALS,
    connector: "When the note establishes severity up front, the weight and the status follow, and the queries fall away.",
    outcomeGroups: [
      { outcome: "Get the DRG weight the acuity earns", lever: "drg", metrics: [
        { id: "cmi", name: "Case mix index", measure: "The acuity weight across your admissions.", source: "Billing / claims", unit: "CMI", today: "1.42", target: "1.55" },
        { id: "ccmcc", name: "CC/MCC capture rate", measure: "Share of admissions with the complication or comorbidity captured.", source: "Billing / claims", unit: "%", today: "68", target: "82" },
      ] },
      { outcome: "Cut the CDI query pile", lever: "cdi", metrics: [
        { id: "queryrate", name: "CDI query rate", measure: "Share of charts needing a CDI query.", source: "Data warehouse (SQL)", unit: "%", today: "18", target: "9" },
        { id: "turnaround", name: "Query turnaround", measure: "Days from query to response.", source: "Data warehouse (SQL)", unit: "days", today: "3.5", target: "1.5" },
      ] },
      { outcome: "Defend inpatient status", lever: "obs", metrics: [
        { id: "obsrate", name: "Observation downgrade rate", measure: "Share of inpatient-level stays billed as observation.", source: "Billing / claims", unit: "%", today: "5", target: "2.5" },
      ] },
    ],
    signalsShortList: "note completeness, diagnosis specificity, and documentation adoption",
    outcomesShortList: "case mix, CDI queries, and inpatient status",
  },
};

// ---------------------------------------------------------------- Inpatient · Capacity
// North Star: beds turn earlier because the discharge documentation is ready on time.
// This is NOT a length-of-stay play. The spine is discharges-before-noon + taking
// documentation off the list of reasons a discharge slips. Sized modestly: only the
// documentation-gated share of the before-noon miss, valued as an earlier bed turn.
const inpatientCapacity: AttainCell = {
  setting: "Inpatient",
  category: "Inpatient Capacity",
  align: {
    outcomesMode: "multi",
    value: { mode: "scopeBased", perScope: 700, scopeNoun: "hospitalists", mathTail: "in earlier bed turns from documentation readiness." },
    outcomesPrompt: "Pick every outcome you're after",
    outcomesHelper: "Capacity on the floor is rarely one thing, and documentation is only one lever on it. Pick each outcome that matters and we'll size it from your own discharge numbers, holding to the share a discharge note that's ready on time can honestly move. This is about turning beds earlier in the day, not about shortening the stay.",
    outcomes: [
      { id: "beforenoon", title: "Get more discharges out before noon", desc: "When the discharge note is complete and timely, the order and summary land earlier, so the bed opens before noon instead of after.", dig: { label: "Discharges a year that could leave before noon", unit: "discharges / yr", placeholder: "e.g., 2,000" }, mathLabel: "before noon", plays: ["Draft the discharge summary at the last progress note, not on the day", "Round with discharge in mind, note first", "Flag likely next-day discharges the evening before"], unitValue: 300, proof: ["beforenoon", "bedturn"] },
      { id: "notgate", title: "Take documentation off the list of reasons discharges slip", desc: "Prove the note is not what's holding the discharge, so the conversation moves to the delays that really are.", dig: { label: "Discharges a year where the note is the gate", unit: "discharges / yr", placeholder: "e.g., 900" }, mathLabel: "note-gated", plays: ["Track why each discharge slipped, with documentation as its own reason", "Close the discharge note before the order is written", "Review the note-gated slips each week"], unitValue: 300, proof: ["turnaround", "beforenoon"] },
      { id: "roundingtime", title: "Give hospitalists rounding time back", desc: "Freed charting time is the capacity we can actually own: hours back for rounding and discharge planning.", dig: { label: "Charting hours a year you'd redirect to rounding", unit: "hours / yr", placeholder: "e.g., 1,200" }, mathLabel: "hours back", plays: ["Protect the freed time for discharge planning", "Move charting out of the discharge conversation", "Hold a documentation-light discharge huddle"], proof: ["tin"] },
    ],
    scope: { prompt: "Across how many hospitalists?", unitLabel: "hospitalists, from your Starting Point", ceiling: 35, default: "24" },
    choices: [
      { id: "bottleneck", kicker: "The bottleneck", prompt: "Is documentation part of what delays your discharges?", helper: "Be honest here. Discharge delay has several drivers and documentation is only one. Naming yours tells us how much of the before-noon miss a ready note can realistically move, and if it's mostly placement or consults, the honest opportunity is small.", mode: "single", defaultId: "notelag", options: [
        { id: "notelag", title: "The discharge summary or note lag holds the order", desc: "The medicine is done, but the order waits on the documentation." },
        { id: "partly", title: "Partly, alongside placement and consults", desc: "Some of it is the note; some is the bed, the ride, or a pending consult." },
        { id: "placement", title: "No, the delay is placement, auth, or consults", desc: "Honestly, the note isn't the gate, so the documentation opportunity here is small." },
      ] },
    ],
    proof: {
      prompt: "What would tell you it's working?",
      helper: "Pick what you'd point to in a review. The documentation signals move before the before-noon rate does.",
      signals: [
        { id: "beforenoon", label: "Discharge-before-noon rate rising", desc: "The share of discharges completed before noon, climbing against your baseline.", unit: "%" },
        { id: "turnaround", label: "Discharge-summary turnaround dropping", desc: "Hours from the discharge decision to a complete summary, coming down.", unit: "hrs" },
        { id: "tin", label: "Hospitalist time in note dropping", desc: "Minutes documenting per encounter, going down.", unit: "min" },
        { id: "bedturn", label: "Bed-turn time dropping", desc: "Hours from discharge order to the next patient in the bed.", unit: "hrs" },
        { id: "love", label: "Love Stories", desc: "Hospitalists and unit leaders telling you discharge got smoother, in their words.", unit: "" },
      ],
    },
    unlock: {
      prompt: "If this works, what does it let you do?",
      helper: "The earlier bed turn is the hard part; this is the reason underneath it. Pick what hitting this actually opens up.",
      options: [
        { id: "admitsooner", title: "Admit from the ED sooner", desc: "An earlier bed upstairs pulls the next patient off the ED floor faster." },
        { id: "diversion", title: "Come off diversion", desc: "Beds that open before noon keep the doors open to the community." },
        { id: "boarding", title: "Ease boarding upstream", desc: "A faster bed turn takes pressure off the ED and the PACU." },
        { id: "offtable", title: "Take documentation off the table as a delay", desc: "Prove the note isn't the gate, so the team can work the delays that are." },
        { id: "census", title: "Absorb census without adding beds", desc: "Earlier turns are capacity you already have, not capacity you build." },
      ],
    },
    valueNoun: "discharges",
    panelKicker: "The value in play, from your numbers",
    honestNote: "Only the documentation-gated share of the before-noon miss, valued as an earlier bed turn, never a shorter length of stay.",
  },
  plan: {
    valueInPlay: engineValueInPlay("Inpatient", "Inpatient Capacity"),
    segmentsSummary: "your inpatient units",
    outcomes: ["Get more discharges out before noon", "Take documentation off the list of reasons discharges slip"],
    signalsGroupLabel: "What Abridge can enable",
    signalsTag: "measured directly from Epic Signal",
    abridgeSignals: [
      { id: "tin", name: "Time in note", measure: "Minutes a hospitalist spends documenting per encounter.", source: "Epic Signal", unit: "min", today: "11", target: "7" },
      { id: "wow", name: "Work outside of work", measure: "After-hours time in the EHR per day, the \"pajama time\" tied to burnout.", source: "Epic Signal", unit: "min/day", today: "45", target: "24" },
      { id: "sdc", name: "Same-day note closure", measure: "Share of encounters with the note closed the same day, not carried over.", source: "Epic Signal", unit: "%", today: "60", target: "85" },
    ],
    connector: "When the discharge note is ready on time, the order and summary land earlier and the bed opens before noon.",
    outcomeGroups: [
      { outcome: "Get more discharges out before noon", metrics: [
        { id: "beforenoon", name: "Discharge-before-noon rate", measure: "Share of discharges completed before noon.", source: "Reporting Workbench", unit: "%", today: "22", target: "40" },
        { id: "bedturn", name: "Bed-turn time", measure: "Hours from the discharge order to the next patient in the bed.", source: "Reporting Workbench", unit: "hrs", today: "3.5", target: "2.2" },
      ] },
      { outcome: "Take documentation off the list of reasons discharges slip", metrics: [
        { id: "turnaround", name: "Discharge-summary turnaround", measure: "Hours from the discharge decision to a complete summary.", source: "Epic Signal", unit: "hrs", today: "6", target: "2" },
      ] },
    ],
    signalsShortList: "time in note, work outside of work, and same-day note closure",
    outcomesShortList: "discharge-before-noon and summary turnaround",
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
  inpatientCapacity,
  inpatientRevenue,
  inpatientRetention,
  nursingQuality,
  nursingRetention,
  nursingCapacity,
];
