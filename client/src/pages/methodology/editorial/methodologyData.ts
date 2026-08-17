// Data model for the editorial "Value Methodology" pages (one per care setting).
// One shared component (MethodologyEditorial) renders all four from this data, so
// the layout stays identical and only the content and the proof-layer flag move.
//
// The four-domain doctrine drives everything: every setting has Capacity /
// Workforce / Revenue / Quality, and in each setting a specific domain (or two)
// is the NON-FINANCIAL proof layer, tracked but never dollarized. That flip is
// carried by each domain's `chip` and its drivers' `mode`, matching the Explore
// engine and the Investment/Model recaps exactly:
//   outpatient -> Quality is proof
//   ed         -> Quality is proof
//   inpatient  -> Capacity AND Quality are proof
//   nursing    -> Revenue is proof

export type MethodQuadrant = "Capacity" | "Workforce" | "Revenue" | "Quality";

export interface MethodDriver {
  name: string;
  sub: string;
  /** dollar -> "$ / yr" chip; watch -> "Watch" pill (proof-layer signal) */
  mode: "dollar" | "watch";
}

export type DomainChip =
  | { kind: "dollar" }
  | { kind: "proof"; note: string };

export interface MethodDomain {
  num: string; // "01".."04"
  name: MethodQuadrant;
  enable: string; // how Abridge earns this domain, mechanism-first
  chip: DomainChip;
  drivers: MethodDriver[];
}

export interface MethodFlowStep {
  step: string; // small coral eyebrow, e.g. "In the room"
  text: string; // short statement, e.g. "The visit happens"
}

export interface MethodArcStage {
  when: string; // "Weeks 4-8"
  stage: "Signal" | "Trend" | "Proof";
  title: string; // "The provider feels it"
  desc: string;
}

export interface MethodologyData {
  key: "outpatient" | "ed" | "inpatient" | "nursing";
  settingLabel: string;
  eyebrow: string;
  headline: string;
  sub: string;
  flowLabel: string;
  flow: MethodFlowStep[];
  domains: MethodDomain[]; // always Capacity, Workforce, Revenue, Quality
  arcLabel: string;
  arcHeadline: string;
  arc: MethodArcStage[];
}

const dollar = { kind: "dollar" } as const;

export const OUTPATIENT_METHODOLOGY: MethodologyData = {
  key: "outpatient",
  settingLabel: "Outpatient",
  eyebrow: "Outpatient",
  headline: "The value drivers, and how Abridge earns each.",
  sub: "Primary care and specialty, where documentation is a daily burden and access is the constraint. The value lands in four areas. Below is the mechanism behind each, and the number it moves.",
  flowLabel: "It all traces back to one moment",
  flow: [
    { step: "In the room", text: "The visit happens" },
    { step: "As it is spoken", text: "Abridge captures it" },
    { step: "Before the room clears", text: "The note is complete" },
    { step: "From there", text: "Every area below moves" },
  ],
  domains: [
    {
      num: "01", name: "Capacity", chip: dollar,
      enable: "Charting used to happen after the visit. Now it is done in the room, and that reclaimed time goes back into the schedule as room for more patients, without adding cost.",
      drivers: [
        { name: "Patient Access", sub: "Reclaimed documentation time reinvested as additional visits", mode: "dollar" },
      ],
    },
    {
      num: "02", name: "Workforce", chip: dollar,
      enable: "A heavy documentation load is a leading reason clinicians burn out and leave, and why practices pay for scribes and locums. Lighten it and you keep your people and spend less covering gaps.",
      drivers: [
        { name: "Provider Retention", sub: "Replacement cost avoided when fewer providers leave", mode: "dollar" },
        { name: "Locum & Agency Spend", sub: "Contract coverage reduced as staffing stabilizes", mode: "dollar" },
        { name: "Scribe Spend", sub: "Scribe cost retired as Abridge covers the documentation role", mode: "dollar" },
      ],
    },
    {
      num: "03", name: "Revenue", chip: dollar,
      enable: "When the note fully reflects the visit, the coding can too. Complexity that was performed but under-documented gets captured, and claims that establish medical necessity come back denied less often.",
      drivers: [
        { name: "wRVU Capture", sub: "E/M levels reflect the complexity actually documented", mode: "dollar" },
        { name: "HCC Capture", sub: "Chronic conditions recaptured for the risk-adjusted panel", mode: "dollar" },
        { name: "Medical Necessity Denials", sub: "Documentation that establishes necessity, so fewer denials", mode: "dollar" },
      ],
    },
    {
      num: "04", name: "Quality", chip: { kind: "proof", note: "The proof layer · no dollar" },
      enable: "Quality scores are built from documentation. Capture the visit accurately and the preventive work that happened is on the record, so the scores reflect the care you actually delivered.",
      drivers: [
        { name: "CDI Query Volume Trend", sub: "Documentation capturing complexity at the point of care", mode: "watch" },
        { name: "Care Gap Closure Rate", sub: "Preventive work recorded, so gaps read as closed", mode: "watch" },
        { name: "HEDIS Composite Score", sub: "The year-end measure the early signals point toward", mode: "watch" },
        { name: "MA STARS Performance", sub: "Where documentation accuracy becomes the rating", mode: "watch" },
      ],
    },
  ],
  arcLabel: "And it lands on a clock",
  arcHeadline: "Value accrues in sequence, not all at once",
  arc: [
    { when: "Weeks 4-8", stage: "Signal", title: "The provider feels it", desc: "Note completion time drops. Pajama time approaches zero. Audit logs show charting closing at the point of care." },
    { when: "Months 2-4", stage: "Trend", title: "The schedule and chart show it", desc: "E/M distribution shifts in billing data. Care gap documentation rises. Same-day slots open as clinical time is recaptured." },
    { when: "Months 6-18", stage: "Proof", title: "The practice measures it", desc: "Third Next Available improves. HEDIS composite responds. Retention data confirms what the early signals predicted." },
  ],
};

export const ED_METHODOLOGY: MethodologyData = {
  key: "ed",
  settingLabel: "Emergency",
  eyebrow: "Emergency Department",
  headline: "The value drivers, and how Abridge earns each.",
  sub: "The emergency department, where throughput is everything and every minute at the keyboard is a minute away from the next patient. The value lands in four areas. Below is the mechanism behind each, and the number it moves.",
  flowLabel: "It all traces back to one moment",
  flow: [
    { step: "At the bedside", text: "Care is delivered" },
    { step: "As it is spoken", text: "Abridge captures it" },
    { step: "Before disposition", text: "The note is complete" },
    { step: "From there", text: "Every area below moves" },
  ],
  domains: [
    {
      num: "01", name: "Capacity", chip: dollar,
      enable: "Faster documentation moves patients through the department. Some of the patients who would have left before being seen are now seen, and a share of them need admission.",
      drivers: [
        { name: "LWBS Recovery", sub: "Patients recovered who would have left before being seen", mode: "dollar" },
        { name: "Admission Capture", sub: "Revenue when recovered patients require inpatient admission", mode: "dollar" },
      ],
    },
    {
      num: "02", name: "Workforce", chip: dollar,
      enable: "Documentation load drives emergency physician burnout and the reliance on locums. A lighter load helps you keep your people and spend less on contract coverage and scribes.",
      drivers: [
        { name: "Provider Retention", sub: "Replacement cost avoided when fewer providers leave", mode: "dollar" },
        { name: "Locum & Agency Spend", sub: "Contract coverage reduced as staffing stabilizes", mode: "dollar" },
        { name: "Scribe Spend", sub: "Scribe cost retired as Abridge covers the documentation role", mode: "dollar" },
      ],
    },
    {
      num: "03", name: "Revenue", chip: dollar,
      enable: "The ED note is the source document for coding. When it captures the full complexity of the visit and establishes medical necessity, the level of service holds up and fewer claims come back denied.",
      drivers: [
        { name: "E&M Level Accuracy", sub: "Coding reflects the complexity actually documented", mode: "dollar" },
        { name: "Medical Necessity Denials", sub: "Documentation that establishes necessity, so fewer denials", mode: "dollar" },
      ],
    },
    {
      num: "04", name: "Quality", chip: { kind: "proof", note: "The proof layer · no dollar" },
      enable: "Quality measures in the ED are partly an attribution problem: if the action was taken but not documented in time, the system cannot credit it. Capture it as it happens and the measures reflect the care delivered.",
      drivers: [
        { name: "Core Measure Documentation Rate", sub: "Protocol adherence documented as it happens", mode: "watch" },
        { name: "Documentation Deficiency Rate", sub: "Fewer deficiencies routed back for rework", mode: "watch" },
        { name: "HCAHPS Physician Communication", sub: "Attention shifts from the screen to the patient", mode: "watch" },
        { name: "Sepsis Bundle (SEP-1)", sub: "Time-sensitive elements documented in the window", mode: "watch" },
      ],
    },
  ],
  arcLabel: "And it lands on a clock",
  arcHeadline: "Value accrues in sequence, not all at once",
  arc: [
    { when: "Weeks 2-4", stage: "Signal", title: "The physician feels it", desc: "Documentation time per encounter drops. Same-shift note completion rises. Charting no longer trails the shift." },
    { when: "Months 1-3", stage: "Trend", title: "The board shows it", desc: "Door-to-disposition tightens. LWBS starts to fall. E/M distribution and core-measure capture move in the data." },
    { when: "Months 3-6", stage: "Proof", title: "The department measures it", desc: "LWBS recovery holds. SEP-1 and core-measure rates confirm the capture. HCAHPS physician communication responds." },
  ],
};

export const INPATIENT_METHODOLOGY: MethodologyData = {
  key: "inpatient",
  settingLabel: "Inpatient",
  eyebrow: "Inpatient",
  headline: "The value drivers, and how Abridge earns each.",
  sub: "The hospital medicine service, where length of stay and documentation accuracy set the economics of every admission. The value lands in four areas. Below is the mechanism behind each, and the number it moves.",
  flowLabel: "It all traces back to one moment",
  flow: [
    { step: "On rounds", text: "The encounter happens" },
    { step: "As it is spoken", text: "Abridge captures it" },
    { step: "Before the next patient", text: "The note is complete" },
    { step: "From there", text: "Every area below moves" },
  ],
  domains: [
    {
      num: "01", name: "Capacity", chip: { kind: "proof", note: "The proof layer · no dollar" },
      enable: "Real-time documentation keeps the record current through the stay, so discharge planning and consults start on time and the team is not waiting on a note. The capacity this frees is tracked here as proof; we do not put a dollar on throughput we do not control.",
      drivers: [
        { name: "Census Capacity", sub: "Discharge planning starts earlier, so beds turn over on time", mode: "watch" },
        { name: "Consult Capacity", sub: "Consult notes land the same day, so downstream teams act sooner", mode: "watch" },
        { name: "Discharge Timeliness", sub: "Summaries complete on time. Coming soon, not counted today", mode: "watch" },
      ],
    },
    {
      num: "02", name: "Workforce", chip: dollar,
      enable: "Documentation burden drives hospitalist burnout and the premium coverage bought to absorb it. A lighter load helps you keep your people and lean less on incremental staffing. The administrative friction it also removes is tracked as proof.",
      drivers: [
        { name: "Provider Retention", sub: "Replacement cost avoided when fewer providers leave", mode: "dollar" },
        { name: "Incremental Staffing Avoided", sub: "Locum, moonlighting, overtime and extra shifts you stop buying", mode: "dollar" },
        { name: "Administrative Efficiency", sub: "Fewer UM clarifications and CDI queries to chase. Tracked, counted once in Revenue", mode: "watch" },
      ],
    },
    {
      num: "03", name: "Revenue", chip: dollar,
      enable: "When the note captures the comorbidities and complications as spoken, the CC/MCC assignments that raise DRG weight are preserved, and admissions hold up as inpatient rather than drawing a status or medical-necessity denial.",
      drivers: [
        { name: "Case Mix Index (DRG Accuracy)", sub: "Documented acuity reflects the patients actually treated", mode: "dollar" },
        { name: "Status / Medical Necessity Denials", sub: "Admission documentation that defends the reimbursement you billed", mode: "dollar" },
      ],
    },
    {
      num: "04", name: "Quality", chip: { kind: "proof", note: "The proof layer · no dollar" },
      enable: "Complete, timely documentation is what quality review reads. Capture the encounter accurately and the record supports the measure rather than working against it. The dollar depends on your specific quality program, so we track it rather than price it.",
      drivers: [
        { name: "Quality Measurement Fidelity", sub: "Risk-adjusted and quality measures reflect the care delivered", mode: "watch" },
        { name: "Clinical Quality / Care Gaps", sub: "Important findings surfaced and acted on, not buried in an incomplete note", mode: "watch" },
      ],
    },
  ],
  arcLabel: "And it lands on a clock",
  arcHeadline: "Value accrues in sequence, not all at once",
  arc: [
    { when: "Weeks 2-4", stage: "Signal", title: "The hospitalist feels it", desc: "H&P and progress-note documentation time drops. Notes close the same shift. The documentation lag starts shrinking." },
    { when: "Months 2-4", stage: "Trend", title: "The chart shows it", desc: "CC/MCC capture rises. Discharge planning starts earlier. CDI queries per provider begin to fall." },
    { when: "Months 6-12", stage: "Proof", title: "The service measures it", desc: "Case Mix Index reflects true acuity. Length of stay eases. Status and medical-necessity denials fall as admission documentation holds." },
  ],
};

export const NURSING_METHODOLOGY: MethodologyData = {
  key: "nursing",
  settingLabel: "Nursing",
  eyebrow: "Inpatient Nursing",
  headline: "The value drivers, and how Abridge earns each.",
  sub: "The inpatient nursing unit, where charting competes with time at the bedside and the harm that follows is expensive. The value lands in four areas. Below is the mechanism behind each, and the number it moves.",
  flowLabel: "It all traces back to one moment",
  flow: [
    { step: "At the bedside", text: "Care happens" },
    { step: "As it is given", text: "Abridge captures it" },
    { step: "In real time", text: "The chart is current" },
    { step: "From there", text: "Every area below moves" },
  ],
  domains: [
    {
      num: "01", name: "Capacity", chip: dollar,
      enable: "When documentation happens at the bedside instead of piling up for the end of the shift, the charting that used to spill into paid overtime falls away.",
      drivers: [
        { name: "Overtime Spend", sub: "Documentation-driven overtime reduced as charting stays current", mode: "dollar" },
      ],
    },
    {
      num: "02", name: "Workforce", chip: dollar,
      enable: "Documentation burden is a real contributor to nurse burnout and turnover, and to the reliance on travel and agency coverage. A lighter load helps you hold on to experienced nurses.",
      drivers: [
        { name: "RN Retention", sub: "Replacement cost avoided when fewer nurses leave", mode: "dollar" },
        { name: "Travel & Agency Spend", sub: "Contract coverage reduced as retention stabilizes", mode: "dollar" },
      ],
    },
    {
      num: "03", name: "Revenue", chip: { kind: "proof", note: "Tracked as proof · no dollar here" },
      enable: "Strong nursing documentation corroborates the physician record that CDI depends on to close queries. That contribution is real, but the dollar is claimed on the physician side, so here it is tracked as proof.",
      drivers: [
        { name: "Documentation Completion Rate", sub: "Flowsheet entries complete and on time", mode: "watch" },
        { name: "CDI Query Response", sub: "Nursing record corroborates the clinical picture", mode: "watch" },
      ],
    },
    {
      num: "04", name: "Quality", chip: dollar,
      enable: "Harm-prevention bundles are scored on documentation done in time. Real-time Braden scores, turning events, and line checks at the point of care keep the record current, so protocols act before harm progresses.",
      drivers: [
        { name: "HAPI Prevention", sub: "Real-time Braden scores and turning events", mode: "dollar" },
        { name: "Falls Prevention", sub: "Protocols act on a current Morse score", mode: "dollar" },
        { name: "CAUTI Prevention", sub: "Each necessity review is the prompt for removal", mode: "dollar" },
        { name: "CLABSI Prevention", sub: "Bundle compliance scored from timestamps", mode: "dollar" },
        { name: "Sepsis Bundle Compliance", sub: "SEP-1 elements documented in the window", mode: "dollar" },
      ],
    },
  ],
  arcLabel: "And it lands on a clock",
  arcHeadline: "Value accrues in sequence, not all at once",
  arc: [
    { when: "Weeks 1-3", stage: "Signal", title: "The nurse feels it", desc: "Point-of-care documentation rises. The post-shift flowsheet queue shrinks. Charting after the shift starts to fall." },
    { when: "Months 2-4", stage: "Trend", title: "The unit shows it", desc: "Bundle-element documentation rises. Overtime tied to charting eases. Braden and line-check timeliness improve." },
    { when: "Months 4-9", stage: "Proof", title: "The unit measures it", desc: "HAPI, fall, and CAUTI rates respond. Retention holds. HCAHPS nurse communication confirms the time back at the bedside." },
  ],
};

export const METHODOLOGY_DATA: Record<MethodologyData["key"], MethodologyData> = {
  outpatient: OUTPATIENT_METHODOLOGY,
  ed: ED_METHODOLOGY,
  inpatient: INPATIENT_METHODOLOGY,
  nursing: NURSING_METHODOLOGY,
};
