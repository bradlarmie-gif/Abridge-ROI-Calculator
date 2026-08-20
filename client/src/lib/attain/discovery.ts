import type { AttainSetting, GoalId } from "./attainTypes";
import { categoryForGoal } from "./attainGoals";

/**
 * VALUE ATTAINMENT STRATEGY: the pre-ROI discovery interview.
 *
 * A branching, consultant-style questionnaire (multiple choice, no numbers) that
 * runs BEFORE any ROI. It surfaces what the partner is really trying to do,
 * educates as it goes, and hands off a brief that names WHERE THE REAL MONEY IS
 * (a real Explore driver) plus the honest caveat. Numbers get agreed later, in
 * the ROI/Plan.
 *
 * Each question is single-select and advances on click; the chosen option routes
 * to the next question id (branching) or to "BRIEF". Options can `capture` a fact
 * for the brief, `pin` the ROI lever, or flag `honest` (the "not documentation's
 * to fix" answer, which makes the brief read honestly). Authored ≤ ~6 questions
 * on any path. Branch logic is distilled from attainCells.ts.
 */

export const BRIEF = "BRIEF" as const;

export interface DiscoveryLever {
  driverId: string; // a real Explore driver id (see exploreDriverKeys.ts)
  label: string;
}

export interface DiscoveryOption {
  id: string;
  label: string;
  teach?: string; // what this answer means / educates / corrects
  capture?: string; // a fact, in the partner's frame, appended to the brief narrative
  lever?: DiscoveryLever; // pins where the real money is (COUNTED)
  proof?: string; // this outcome is a proof-play (tracked, not counted): the line to show
  proofDriverId?: string; // a proof-play that still toggles an Explore driver ON (in tracked mode), e.g. retention
  honest?: boolean; // the honest "not really documentation's to fix" answer
  reflect?: string; // a one-line "got it, so..." acknowledgment shown on the next question
  next: string | typeof BRIEF;
}

export interface DiscoveryQuestion {
  eyebrow?: string;
  prompt: string;
  teach?: string;
  options: DiscoveryOption[];
}

/** What an authored thesis reads: the partner's answers + the resolved result. */
export interface ThesisCtx {
  pick: (qid: string) => string | undefined;
  /** read a shared grounding answer (scope, tried, whynow), for foundation reads. */
  ground?: (gid: string) => string | undefined;
  narrative: string[];
  lever?: DiscoveryLever;
  proof?: string;
  honest: boolean;
  goalLabel: string;
  settingLabel: string;
}

/**
 * The FOUNDATION read: Strategy's real job. Not a hypothesis or a verdict, a
 * mirror of what the partner told us: where they are today and where they want
 * to go. The gap between the two is what the ROI sizes and the Plan closes.
 * Honesty falls out of the current-state picture (the bridge line), not a gate.
 */
export interface FoundationItem { label: string; value: string; }
export interface FoundationRead {
  current: FoundationItem[];
  desired: FoundationItem[];
  bridge: string;
  /** the desired-state item that is the success signal (rendered as the accent). */
  signalLabel?: string;
}

/**
 * The OPERATING layer: the qualified thesis turned into a felt, ownable playbook.
 * Diagnosis says WHERE the money is; this says HOW it actually gets run on the
 * floor, what you FEEL first (before any dollar moves), and where it usually
 * stalls. Rendered as the "How this actually runs" brief panel. Number-free.
 */
export interface OperatingPlaybook {
  lever: string; // the isolated driver + its rough (number-free) size, so the ceiling is honest
  mechanism: string; // how the freed time actually converts to the dollar
  holds: string; // the operating condition/dependency that has to be true
  signal: string; // the felt leading indicator, which becomes the tracked metric in the Plan
}

export interface DiscoveryScript {
  entry: string;
  questions: Record<string, DiscoveryQuestion>;
  /** one line that opens the brief for this goal */
  briefIntro: string;
  /** who should be at the table (seeds the Plan) */
  roles: string[];
  /** the fragile-link caveat used when they did NOT pick an honest answer */
  caveat: string;
  /** for proof-plays with no counted ROI dollar (e.g. inpatient capacity,
   * non-nursing quality): the "where the value is" line, tracked not counted. */
  proofLine?: string;
  /** an authored, answer-keyed synthesis for the brief. Falls back to a generic
   * composer when absent. This is what makes the brief read like a consultant. */
  thesis?: (t: ThesisCtx) => string;
  /** optional answer-derived additions to "who should be at the table". */
  extraRoles?: (t: ThesisCtx) => string[];
  /** Optional OPERATING layer, keyed to the operating-chapter answers. Returns
   * null on honest or not-yet-answered paths so the panel degrades cleanly. */
  playbook?: (t: ThesisCtx) => OperatingPlaybook | null;
  /** Optional FOUNDATION read (current-state / desired-state mirror). When
   * present, the brief renders this instead of the thesis/verdict layout. */
  foundation?: (t: ThesisCtx) => FoundationRead | null;
}

// A short "where the real money is" line per lever, for the brief.
export const LEVER_LINE: Record<string, string> = {
  patientAccess: "the margin on the net-new visits the freed time makes room for.",
  wrvu: "the visit level (the E/M code) each encounter truly supported, captured accurately on the claim.",
  edEmLevel: "the acuity (the E/M level) each ED visit truly reflects, captured accurately on the claim.",
  hccCapture: "the risk-adjusted payment for the chronic conditions (HCCs) you accurately recapture each year.",
  denialPrevention: "the preventable medical-necessity denials a more complete note avoids.",
  lwbsRecovery: "the visits you keep by pulling waiting patients back before they leave.",
  admissionCapture: "the margin on admissions you would otherwise lose to diversion or a long wait.",
  drgAccuracy: "the DRG weight the acuity earns, through fuller capture of complications and comorbidities (the CC/MCC that set severity).",
  obsDefense: "the inpatient stays you defend against observation and medical-necessity downgrades.",
  nursingOvertime: "the documentation-driven overtime you stop paying when charting fits in the shift.",
  nursingFalls: "the cost of falls with injury, the share where closer documented attention makes the difference.",
  nursingHapi: "the cost of pressure injuries, the share where reliable, documented assessment makes the difference.",
  nursingClabsi: "the cost of central-line infections, the share where tighter documented practice makes the difference.",
  nursingSepsis: "the excess cost of sepsis caught late, the share a faster documented response can reduce.",
  providerWellbeing: "the replacement cost you avoid by keeping the people you have. This is usually carried as a proof signal and counted only when you choose to.",
  nursingRetention: "the replacement cost you avoid by keeping nurses. This is usually carried as a proof signal and counted only when you choose to.",
};

// ── Outpatient · Patient Access ──────────────────────────────────────────────
const outpatientAccess: DiscoveryScript = {
  entry: "aim",
  briefIntro: "You said you want more access. Here is what that actually means for you, and where the value is.",
  roles: ["Ambulatory operations", "Access and scheduling lead", "A service-line chief"],
  caveat: "This only becomes visits if the freed time is deliberately pointed at the schedule and there is demand to fill it. Without that decision, it quietly turns into a lighter day instead.",
  questions: {
    aim: {
      eyebrow: "The aim",
      prompt: "When you say you want more access, what are you really trying to open up?",
      teach: "Access is not one thing. Where the patients come from changes the entire plan.",
      options: [
        { id: "backlog", label: "Work down a backlog of patients already waiting", capture: "work down a referral and new-patient backlog", next: "gap" },
        { id: "wait", label: "Shorten the wait for a new appointment", capture: "shorten the new-patient wait", next: "gap" },
        { id: "noshow", label: "Recover the slots lost to no-shows", capture: "recover slots lost to no-shows", next: "gap" },
        { id: "grow", label: "Grow the panel you can carry", capture: "grow the panel", next: "gap" },
      ],
    },
    gap: {
      eyebrow: "The honest part",
      prompt: "What is actually in the way of seeing more patients today?",
      teach: "Ambient documentation only helps if clinician time is the real constraint. If it is not, we will tell you.",
      options: [
        { id: "charting", label: "Providers are buried in charting", teach: "This is the constraint Abridge moves directly.", capture: "the constraint today is documentation time", reflect: "So it is charting time, not the templates or the front desk. That is the one Abridge moves directly.", lever: { driverId: "patientAccess", label: "Net-new visit margin" }, next: "reinvest" },
        { id: "template", label: "The schedule templates have no room", teach: "Freeing time helps, but only if the template changes to add the slots.", capture: "the constraint is scheduling templates, which will have to change", reflect: "Noted: the time helps, but the template has to change to add the slots. We will flag that.", lever: { driverId: "patientAccess", label: "Net-new visit margin" }, next: "reinvest" },
        { id: "demand", label: "You are at capacity, with demand waiting", capture: "already at capacity, with demand waiting", reflect: "Good: the demand is there, capacity is the wall. That is the gap freed time can fill.", lever: { driverId: "patientAccess", label: "Net-new visit margin" }, next: "reinvest" },
        { id: "frontdesk", label: "It is really a front-desk or referral-workflow problem", teach: "Then documentation is not your main lever here, and we should say so.", capture: "the real constraint is front-desk and referral workflow, which documentation does not fix", honest: true, next: BRIEF },
      ],
    },
    reinvest: {
      eyebrow: "The fork that decides it",
      prompt: "If ambient documentation gives each provider time back, where does it go?",
      teach: "Freed time only becomes access if you point it there. Otherwise it becomes relief, which is real, but it is a different kind of value.",
      options: [
        { id: "visits", label: "Into seeing more patients", capture: "freed time is committed to new visits", next: "absorb" },
        { id: "relief", label: "Into a lighter day for the team", teach: "That is retention value, not access. Worth pursuing, but we would model it under workforce.", capture: "freed time is going to relief, not access", honest: true, next: BRIEF },
        { id: "unsure", label: "We have not decided yet", teach: "This is the single most important decision to make before the ROI is real.", capture: "the reinvestment decision is still open", next: "absorb" },
      ],
    },
    absorb: {
      eyebrow: "Can it land",
      prompt: "Can the schedule actually take on the added visits?",
      teach: "Freed time only converts to access if there is somewhere for it to go.",
      options: [
        { id: "yes", label: "Yes, there is demand and room to book it", capture: "there is demand and room to absorb the added visits", next: "operating" },
        { id: "templates", label: "Only if we adjust the templates", capture: "it will take a scheduling-template change to land", next: "operating" },
        { id: "no", label: "Not really, not today", capture: "there is not room to absorb more visits today", honest: true, next: BRIEF },
      ],
    },
    // ── operating chapter: turn the qualified thesis into a runnable play ──
    operating: {
      eyebrow: "What has to hold",
      prompt: "For the freed time to become visits and not just an easier day, what has to change in how the day runs?",
      teach: "This is the operating condition the outcome depends on. The time is only access if something concrete changes on the schedule. Who owns it and how often it is reviewed comes later, in the Plan.",
      options: [
        { id: "book", label: "Open slots get added to the template and actively booked", capture: "opened time is added to the template and actively booked", next: BRIEF },
        { id: "central", label: "Central scheduling fills the opened time by rule", capture: "central scheduling fills the opened time by rule", next: BRIEF },
        { id: "sameday", label: "Providers hold the time for same-day and overflow", capture: "the freed time is held for same-day and overflow demand", next: BRIEF },
        { id: "undesigned", label: "Honestly, we have not designed that yet", teach: "Worth naming. Without a concrete move, the time quietly becomes a lighter day.", capture: "the operational move is not yet designed", next: BRIEF },
      ],
    },
  },
};

// ── Outpatient · Revenue Capture (the FFS vs VBC branch) ─────────────────────
const outpatientRevenue: DiscoveryScript = {
  entry: "payer",
  briefIntro: "You said revenue. What that means, and where the money is, depends entirely on how you get paid.",
  roles: ["Revenue cycle and coding", "A CDI lead", "A service-line chief"],
  caveat: "The note improving only turns into revenue if coding acts on it and it survives the audit. We size only the share a complete note can defensibly support.",
  questions: {
    payer: {
      eyebrow: "The payers",
      prompt: "When you say revenue, which part of your book is this about?",
      teach: "Revenue forks by how you get paid. Fee-for-service pays on how the visit codes. Risk contracts pay on the conditions you capture. They are two different plays.",
      options: [
        { id: "ffs", label: "Fee-for-service", capture: "fee-for-service billing", reflect: "Fee-for-service, so how the visit codes is where the money is. Let's find the gap.", next: "ffsWhat" },
        { id: "risk", label: "Risk contracts (Medicare Advantage, Medicaid, ACA)", capture: "risk and value-based contracts", reflect: "Risk contracts, so recapture is the money. Let's find where it leaks.", next: "riskWhat" },
        { id: "both", label: "A mix of both", teach: "We will start with the fee-for-service side; the risk side is its own walk.", capture: "a mix of fee-for-service and risk", reflect: "Both, then. We will start on the fee-for-service side and flag the risk walk for next.", next: "ffsWhat" },
      ],
    },
    ffsWhat: {
      eyebrow: "The gap",
      prompt: "On the fee-for-service side, where is the money leaking?",
      teach: "The common one: the workup happened, but the note did not carry it, so a level-4 visit goes out as a level-3.",
      options: [
        { id: "leveling", label: "Visits code below the care actually delivered", capture: "E/M visits coding below the level delivered", lever: { driverId: "wrvu", label: "wRVU and E/M Capture" }, next: "ffsWhy" },
        { id: "denials", label: "Preventable medical-necessity denials", capture: "preventable medical-necessity denials", lever: { driverId: "denialPrevention", label: "Medical-Necessity Denials" }, next: "ffsWhy" },
      ],
    },
    ffsWhy: {
      eyebrow: "The honest part",
      prompt: "Why is the level slipping?",
      teach: "Be honest here. We only count what a more complete note can defensibly fix, not revenue that was never really there.",
      options: [
        { id: "note", label: "The note undersold the visit", capture: "the note undersells the complexity that actually happened", next: BRIEF },
        { id: "lower", label: "Some of it is genuinely simpler care", capture: "part is documentation and part was honestly lower complexity", next: BRIEF },
        { id: "downstream", label: "It is mostly a downstream coding gap", teach: "Then the note is not the lever; the miss is after it. We would track that, not count it.", capture: "the miss is mostly downstream in coding, not the note", honest: true, next: BRIEF },
      ],
    },
    riskWhat: {
      eyebrow: "The target",
      prompt: "On the risk side, what are you going after?",
      teach: "Chronic conditions reset every January. The money is in getting them documented and accurately coded again.",
      options: [
        { id: "recapture", label: "Recapture conditions that reset each year", capture: "recapturing chronic conditions that reset annually", lever: { driverId: "hccCapture", label: "HCC Capture" }, next: "riskCause" },
        { id: "new", label: "Capture conditions documented but never coded", capture: "capturing documented-but-never-coded conditions", lever: { driverId: "hccCapture", label: "HCC Capture" }, next: "riskCause" },
      ],
    },
    riskCause: {
      eyebrow: "The honest part",
      prompt: "Where is the gap, at the visit or downstream?",
      teach: "We only work the conditions that go uncaptured because they were not surfaced at the visit. If the gap is downstream, that is not ours to claim.",
      options: [
        { id: "visit", label: "Conditions are not surfaced at the visit", capture: "chronic conditions are not surfaced and carried at the visit", next: BRIEF },
        { id: "submission", label: "Documented, but not reaching the claim", capture: "conditions are documented but drop before the claim", next: BRIEF },
        { id: "downstream", label: "Mostly downstream (coder capacity or caution)", teach: "Then documentation is not the lever. We would track it, not count it.", capture: "the gap is mostly downstream, not documentation", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── Retention (a shared shape, authored per setting) ─────────────────────────
// Retention is PROOF-FIRST (tracked, not counted): the value is the replacement
// cost avoided by keeping people, which a CFO counts only when they choose to.
// So it pins no counted `lever`; it carries a `proofDriverId` that still toggles
// the retention driver ON in Explore (in tracked mode) at the handoff.
function retentionScript(opts: {
  who: string; // "providers" | "clinicians" | "hospitalists" | "nurses"
  driverId: string; // "providerWellbeing" | "nursingRetention"
  briefIntro: string;
  roles: string[];
  anatomy: { id: string; label: string; capture: string }[];
  atrisk: { id: string; label: string; capture: string }[];
}): DiscoveryScript {
  return {
    entry: "driver",
    briefIntro: opts.briefIntro,
    roles: opts.roles,
    caveat: `Retention only moves if the recovered time is protected, not quietly refilled with more work.`,
    thesis: (t) => {
      const d = t.pick("driver");
      if (d === "paylife") return `On retention, the honest read is that people are leaving mostly for pay or life elsewhere. A lighter day helps morale, but it will not be the deciding factor, so we would not build a retention case on documentation alone here.`;
      const load = d === "workload" ? "workload and pace" : "burnout and documentation load";
      const p = t.pick("protect");
      const hinge = p === "no" ? "But you also told us the relief will likely get refilled with more work, which is exactly how these fail. Protecting it is the whole point." : p === "unsure" ? "The open question is whether the relief gets protected or quietly refilled, and that decides who stays." : "And you intend to protect that relief rather than refill it, which is what makes it stick.";
      return `The people you are losing are going because of ${load}, and ambient documentation takes a real bite out of that. Kept honest, retention shows up first as a proof signal: the replacement cost you avoid by keeping the people you have, counted only when you choose to. ${hinge}`;
    },
    questions: {
      driver: {
        eyebrow: "The honest part",
        prompt: `Why are ${opts.who} actually leaving?`,
        teach: "Ambient documentation helps if the load is a real driver. If it is mostly pay or life elsewhere, a lighter day will not be the deciding factor, and we will say so.",
        options: [
          { id: "burden", label: "Burnout and documentation load", capture: "burnout and documentation load are driving turnover", reflect: "So it is the load driving people out, not pay or life elsewhere. That is the part ambient documentation actually moves.", proof: LEVER_LINE[opts.driverId], proofDriverId: opts.driverId, next: "anatomy" },
          { id: "workload", label: "Workload and pace", capture: "workload and pace are the driver", reflect: "So it is the workload, not pay or life elsewhere. Then the question is whether a lighter day is protected.", proof: LEVER_LINE[opts.driverId], proofDriverId: opts.driverId, next: "anatomy" },
          { id: "paylife", label: "Mostly pay, or life elsewhere", capture: "the main driver is pay or life elsewhere, which documentation will not fix", honest: true, next: BRIEF },
        ],
      },
      anatomy: {
        eyebrow: "Where it shows up",
        prompt: "Where does the load show up most?",
        teach: "The specific burden tells us where the relief has to land.",
        options: opts.anatomy.map((a) => ({ id: a.id, label: a.label, capture: a.capture, next: "atrisk" })),
      },
      atrisk: {
        eyebrow: "Who is at risk",
        prompt: "Who is most at risk?",
        teach: "Retention plays work best pointed at the people most likely to leave.",
        options: opts.atrisk.map((a) => ({ id: a.id, label: a.label, capture: a.capture, next: "protect" })),
      },
      protect: {
        eyebrow: "The fork that decides it",
        prompt: "If the day gets lighter, will the relief be protected?",
        teach: "Retention only moves if the recovered time is not immediately refilled with more work.",
        options: [
          { id: "yes", label: "Yes, we will protect it", capture: "the relief will be protected, not reclaimed", next: BRIEF },
          { id: "unsure", label: "Not sure yet", capture: "whether the relief is protected is still open", next: BRIEF },
          { id: "no", label: "Honestly, it will get refilled", capture: "the relief is likely to be reclaimed by more work", honest: true, next: BRIEF },
        ],
      },
    },
  };
}

const outpatientRetention = retentionScript({
  who: "providers", driverId: "providerWellbeing",
  briefIntro: "You said retention. Whether a lighter day changes who stays depends on what is actually driving people out.",
  roles: ["Clinical leadership", "The medical group's people lead", "Department chiefs"],
  anatomy: [
    { id: "inbox", label: "Inbox and message burden", capture: "the inbox and message burden is the heaviest part" },
    { id: "afterhours", label: "After-hours charting", capture: "after-hours charting is the heaviest part" },
    { id: "cadence", label: "Visit-cadence pressure", capture: "visit-cadence pressure is the heaviest part" },
  ],
  atrisk: [
    { id: "highpanel", label: "High-panel PCPs", capture: "high-panel PCPs are most at risk" },
    { id: "parttime", label: "Part-timers carrying a full inbox", capture: "part-timers carrying a full inbox are most at risk" },
    { id: "newer", label: "Newer clinicians", capture: "newer clinicians are most at risk" },
  ],
});

const edRetention = retentionScript({
  who: "clinicians", driverId: "providerWellbeing",
  briefIntro: "You said retention. In the ED the after-shift documentation tail is often the driver, but not always, so we check.",
  roles: ["ED medical director", "Nursing and physician leadership", "The group's people lead"],
  anatomy: [
    { id: "between", label: "Charting between patients on a heavy shift", capture: "charting between patients is the heaviest part" },
    { id: "surges", label: "Documentation piling up during surges", capture: "documentation piling up during surges is the heaviest part" },
    { id: "boarding", label: "Boarding stretching the shift", capture: "boarding stretching the shift is the heaviest part" },
  ],
  atrisk: [
    { id: "nights", label: "Nights and weekends", capture: "nights and weekends are most at risk" },
    { id: "acuity", label: "High-acuity coverage", capture: "high-acuity coverage is most at risk" },
    { id: "newer", label: "Newer attendings on the heaviest rotations", capture: "newer attendings on the heaviest rotations are most at risk" },
  ],
});

const inpatientRetention = retentionScript({
  who: "hospitalists", driverId: "providerWellbeing",
  briefIntro: "You said retention. For hospitalists the note load of the service is often the driver, but we confirm before we build on it.",
  roles: ["Hospitalist group leadership", "The service medical director", "The people lead"],
  anatomy: [
    { id: "census", label: "Note load scaling with census", capture: "note load scaling with census is the heaviest part" },
    { id: "crunch", label: "The discharge-summary and admission H&P crunch", capture: "the discharge-summary and H&P crunch is the heaviest part" },
    { id: "rounding", label: "Rounding time lost to notes", capture: "rounding time lost to notes is the heaviest part" },
  ],
  atrisk: [
    { id: "highcensus", label: "High-census services", capture: "high-census services are most at risk" },
    { id: "noc", label: "Nocturnists and swing", capture: "nocturnists and swing are most at risk" },
    { id: "newer", label: "Newer hospitalists", capture: "newer hospitalists are most at risk" },
  ],
});

const nursingRetentionScript = ((): DiscoveryScript => {
  const s = retentionScript({
    who: "nurses", driverId: "nursingRetention",
    briefIntro: "You said retention. For nurses the charting that keeps them past the end of the shift is often the driver, but we check first.",
    roles: ["Nursing leadership", "Unit managers", "The CNO's office"],
    anatomy: [
      { id: "bedside", label: "Charting stealing bedside time", capture: "charting stealing bedside time is the heaviest part" },
      { id: "endshift", label: "End-of-shift and missed-break documentation", capture: "end-of-shift and missed-break documentation is the heaviest part" },
      { id: "ratio", label: "Ratio pressure", capture: "ratio pressure is the heaviest part" },
    ],
    atrisk: [
      { id: "medsurg", label: "High-ratio med-surg", capture: "high-ratio med-surg is most at risk" },
      { id: "nights", label: "Nights", capture: "nights are most at risk" },
      { id: "firstyear", label: "First-year nurses", capture: "first-year nurses are most at risk" },
    ],
  });
  s.questions.driver.options[1].label = "Workload and ratios";
  return s;
})();

// ── Quality (proof-play for OP/ED/IP; counted for Nursing) ───────────────────
function proofQuality(opts: {
  briefIntro: string; proofLine: string; roles: string[]; caveat: string;
  outcomes: { id: string; label: string; capture: string }[];
}): DiscoveryScript {
  return {
    entry: "outcome",
    briefIntro: opts.briefIntro,
    proofLine: opts.proofLine,
    roles: opts.roles,
    caveat: opts.caveat,
    thesis: (t) => {
      const g = t.pick("gate");
      if (g === "little") return `On quality, you were honest that this is mostly structural, not something more attention in the room changes. That is worth saying out loud before anyone builds a case on it.`;
      const act = t.pick("act");
      const hinge = act === "no" ? "But the freed attention is unlikely to reach the work today, which caps it." : act === "unsure" ? "The open question is whether the freed attention actually reaches the work." : "And the team will act on it, which is what turns attention into outcomes.";
      return `${capfirst(t.narrative[0] ?? "improving quality")} is real here, but it lands as better measures and fewer gaps, not a hard dollar, so we track it as a metric rather than book it. ${hinge}`;
    },
    questions: {
      outcome: {
        eyebrow: "The outcome",
        prompt: "Which quality outcome are you after?",
        teach: "Attention returns to the patient when the keyboard recedes. Where should it go?",
        options: opts.outcomes.map((o) => ({ id: o.id, label: o.label, capture: o.capture, next: "gate" })),
      },
      gate: {
        eyebrow: "The honest part",
        prompt: "How much could more attention actually change this?",
        teach: "Be honest. Some of this moves with attention; some is structural.",
        options: [
          { id: "lot", label: "A lot, we see it coming", capture: "attention can move this materially", reflect: "Good, so attention in the room can move this. Then it comes down to whether the team acts on it.", next: "act" },
          { id: "some", label: "Some of it", capture: "attention moves part of this", reflect: "Noted, some of it moves with attention. The question is whether the team acts on it.", next: "act" },
          { id: "little", label: "Little, it is mostly structural", capture: "this is mostly structural, not an attention problem", honest: true, next: BRIEF },
        ],
      },
      act: {
        eyebrow: "The fragile link",
        prompt: "Will the freed attention actually reach the work?",
        teach: "Quality only moves if someone acts, in the moment or right after.",
        options: [
          { id: "yes", label: "Yes, the team will act on it", capture: "the team will act on it", next: BRIEF },
          { id: "unsure", label: "Not sure", capture: "whether the team acts on it is still open", next: BRIEF },
          { id: "no", label: "Honestly, probably not today", capture: "it is unlikely to be acted on today", honest: true, next: BRIEF },
        ],
      },
    },
  };
}

const outpatientQuality = proofQuality({
  briefIntro: "You said quality. In the outpatient world this is real, but it shows up as better measures and closed gaps, not a hard ROI dollar.",
  proofLine: "closing care gaps and lifting quality measures, tracked as a metric rather than booked as a dollar.",
  roles: ["Quality leadership", "The care-team lead", "Population health"],
  caveat: "The freed attention only becomes better care if it is pointed at the gaps in the room, not just at moving faster.",
  outcomes: [
    { id: "gaps", label: "Close care gaps and screening", capture: "closing care gaps and screening" },
    { id: "followup", label: "Tighten follow-up and closure", capture: "tightening follow-up and closure" },
    { id: "experience", label: "Improve the patient experience", capture: "improving the patient experience" },
  ],
});

const edQuality = proofQuality({
  briefIntro: "You said quality. In the ED this shows up as faster, more reliable protocol adherence and safety measures, not a hard ROI dollar.",
  proofLine: "faster, more reliable protocol adherence and safety measures, tracked as metrics.",
  roles: ["ED medical director", "Quality and safety", "Charge nurses"],
  caveat: "Safety only moves if the freed attention reaches the protocol at the bedside, in the moment.",
  outcomes: [
    { id: "sepsis", label: "Sepsis bundle (SEP-1) compliance", capture: "improving sepsis bundle compliance" },
    { id: "stroke", label: "Stroke and time-critical response", capture: "sharpening time-critical stroke response" },
    { id: "reassess", label: "Timely reassessment", capture: "improving timely reassessment" },
  ],
});

const inpatientQuality = proofQuality({
  briefIntro: "You said quality. Inpatient, this shows up as a stronger safety record and cleaner safety measures, tracked rather than booked as a hard dollar.",
  proofLine: "a stronger safety record and cleaner safety measures, tracked as metrics.",
  roles: ["Quality leadership", "Hospitalist and nursing leads", "Patient safety"],
  caveat: "The safety measures only move if the freed attention reaches rounding and the protocols, and someone acts on the early signals the record surfaces.",
  outcomes: [
    { id: "hac", label: "Hospital-acquired conditions", capture: "improving hospital-acquired-condition rates" },
    { id: "readmit", label: "Readmissions", capture: "reducing readmissions" },
    { id: "events", label: "Safety events", capture: "improving safety-event rates" },
  ],
});

const nursingQuality: DiscoveryScript = {
  entry: "outcome",
  briefIntro: "You said quality. In nursing this is the one place documentation time most directly supports the safety measures you can actually cost.",
  roles: ["Nursing quality", "Unit managers", "Infection prevention"],
  caveat: "A timely chart only helps if someone acts at the bedside. The freed time has to reach the room.",
  questions: {
    outcome: {
      eyebrow: "The focus",
      prompt: "Which safety outcome are you focused on?",
      teach: "Each has a different amount of documentation leverage, so we are honest about which move most.",
      options: [
        { id: "falls", label: "Falls with injury", capture: "reducing falls with injury", lever: { driverId: "nursingFalls", label: "Patient Falls" }, next: "gate" },
        { id: "hapi", label: "Pressure injuries", teach: "Mostly a turn-schedule and staffing story, so we track this rather than book it.", capture: "reducing pressure injuries", proof: "supporting pressure-injury documentation, which is mostly a turn-schedule and staffing story, so we track it rather than book it as a dollar.", next: "gate" },
        { id: "clabsi", label: "Central-line infections", teach: "The smallest documentation lever of the four, so we track it, not book it.", capture: "reducing central-line infections", proof: "supporting central-line documentation, the smallest documentation lever of the four, so we track it rather than book it.", next: "gate" },
        { id: "sepsis", label: "Sepsis caught late", capture: "catching sepsis earlier", lever: { driverId: "nursingSepsis", label: "Sepsis Bundle (SEP-1)" }, next: "gate" },
      ],
    },
    gate: {
      eyebrow: "The honest part",
      prompt: "How much could earlier attention actually change this?",
      teach: "Be honest. Some harm we see coming; some happens despite good care.",
      options: [
        { id: "lot", label: "A lot, we usually see it coming", capture: "earlier attention can move this materially", reflect: "Good, so you usually see it coming. Then it comes down to whether the freed time reaches the bedside.", next: "act" },
        { id: "some", label: "Some of it", capture: "earlier attention moves part of this", reflect: "Noted, earlier attention moves part of this. The question is whether the freed time reaches the bedside.", next: "act" },
        { id: "little", label: "Little, it happens despite good care", capture: "this largely happens despite good care", honest: true, next: BRIEF },
      ],
    },
    act: {
      eyebrow: "The fragile link",
      prompt: "Will the freed time reach the bedside?",
      teach: "This only moves if the recovered time goes to rounding and the protocols.",
      options: [
        { id: "yes", label: "Yes, into rounding and the protocols", capture: "the freed time will go to rounding and the protocols", next: BRIEF },
        { id: "unsure", label: "Not sure", capture: "whether freed time reaches the bedside is still open", next: BRIEF },
        { id: "no", label: "Honestly, not reliably", capture: "the freed time is unlikely to reach the bedside reliably", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── ED · Patient Access (throughput) ─────────────────────────────────────────
const edAccess: DiscoveryScript = {
  entry: "aim",
  briefIntro: "You said access. In the ED that means throughput: getting patients seen before they leave, and capturing the ones you lose.",
  roles: ["ED operations", "Charge-nurse leadership", "The ED medical director"],
  caveat: "Freed charting time only becomes throughput if someone works the board and the back end can absorb a faster front end.",
  questions: {
    aim: {
      eyebrow: "The aim",
      prompt: "What are you really trying to move?",
      teach: "ED access is throughput. Where is it leaking?",
      options: [
        { id: "lwbs", label: "Cut the patients who leave without being seen", capture: "cutting left-without-being-seen", lever: { driverId: "lwbsRecovery", label: "LWBS Recovery" }, next: "bottleneck" },
        { id: "door", label: "Speed up door-to-provider", capture: "speeding door-to-provider time", lever: { driverId: "lwbsRecovery", label: "LWBS Recovery" }, next: "bottleneck" },
        { id: "admissions", label: "Capture admissions you lose to diversion", capture: "capturing admissions lost to diversion", lever: { driverId: "admissionCapture", label: "Admission Capture" }, next: "bottleneck" },
      ],
    },
    bottleneck: {
      eyebrow: "The honest part",
      prompt: "Where is the real bottleneck today?",
      teach: "Ambient documentation only helps if the front-end charting load is part of the constraint.",
      options: [
        { id: "docload", label: "The charting load on providers", capture: "the charting load is part of the bottleneck", reflect: "So the charting load is part of the constraint, which is what Abridge frees. Then it is who works the board.", next: "act" },
        { id: "frontend", label: "Front-end intake and triage", capture: "front-end intake is part of the bottleneck", reflect: "So the front end is part of it and documentation helps at the margin. Then it is who works the board.", next: "act" },
        { id: "provider", label: "Provider availability at the front", capture: "provider availability at the front is a constraint", reflect: "So provider availability is the real limiter. Then it is who works the board.", next: "act" },
        { id: "boarding", label: "Back-end boarding and disposition", capture: "the bottleneck is back-end boarding, which documentation does not fix", honest: true, next: BRIEF },
      ],
    },
    act: {
      eyebrow: "The fragile link",
      prompt: "Will someone work the board and pull waiting patients back?",
      teach: "Throughput only moves if the freed time is actively spent on flow.",
      options: [
        { id: "yes", label: "Yes, in real time", capture: "the team will work the board in real time", next: BRIEF },
        { id: "unsure", label: "Not consistently", capture: "working the board consistently is still open", next: BRIEF },
        { id: "no", label: "Honestly, no", capture: "no one will consistently work the board today", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── ED · Revenue Capture ─────────────────────────────────────────────────────
const edRevenue: DiscoveryScript = {
  entry: "frame",
  briefIntro: "You said revenue. In the ED that is either the acuity you code or the denials you prevent.",
  roles: ["Revenue cycle and coding", "The ED medical director", "A CDI lead"],
  caveat: "The note improving only turns into revenue if coding acts on it and it survives the audit.",
  questions: {
    frame: {
      eyebrow: "The play",
      prompt: "Which is it, acuity coding or preventable denials?",
      teach: "Two different plays. Acuity coding is how the visit levels; denials are what you write off.",
      options: [
        { id: "coding", label: "Get paid for the acuity you treat", capture: "coding for the acuity actually treated", reflect: "Acuity coding, so it is about how the visit levels. Why is it slipping?", lever: { driverId: "edEmLevel", label: "ED E/M Accuracy" }, next: "codingWhy" },
        { id: "denials", label: "Stop preventable denials", capture: "stopping preventable denials", reflect: "Denials, so it is what you write off. Let's find why.", lever: { driverId: "denialPrevention", label: "Medical-Necessity Denials" }, next: "denialsWhy" },
      ],
    },
    codingWhy: {
      eyebrow: "The honest part",
      prompt: "Why is the acuity under-coded?",
      teach: "We only count what a more complete note can defensibly support.",
      options: [
        { id: "note", label: "The note did not carry the workup", capture: "the note does not carry the workup that happened", next: BRIEF },
        { id: "lower", label: "Some is genuinely lower acuity", capture: "part is documentation and part was genuinely lower acuity", next: BRIEF },
        { id: "downstream", label: "Mostly downstream in coding", capture: "the miss is mostly downstream in coding", honest: true, next: BRIEF },
      ],
    },
    denialsWhy: {
      eyebrow: "The honest part",
      prompt: "Why are the denials happening?",
      teach: "Only medical-necessity denials are the note's to fix. Front-end ones are not.",
      options: [
        { id: "mednec", label: "Medical necessity not established in the note", capture: "medical necessity is not established in the note", next: BRIEF },
        { id: "eligibility", label: "Eligibility or registration", capture: "the denials are front-end eligibility, which the note cannot fix", honest: true, next: BRIEF },
        { id: "downstream", label: "Mostly downstream", capture: "the denials are mostly downstream", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── Inpatient · Capacity (discharge timing, proof-play) ──────────────────────
const inpatientCapacity: DiscoveryScript = {
  entry: "aim",
  briefIntro: "You said capacity. Inpatient, that is earlier discharges and faster bed turns, which we track as an operational win rather than book as a hard dollar.",
  proofLine: "earlier discharge orders and faster bed turns, tracked as an operational capacity gain.",
  roles: ["Hospital operations and capacity", "Case management", "The hospitalist medical director"],
  caveat: "Earlier orders only turn beds if case management can act on them. If placement is the real gate, documentation will not move it.",
  questions: {
    aim: {
      eyebrow: "The aim",
      prompt: "What are you trying to move?",
      teach: "Inpatient capacity is about getting the discharge work done earlier.",
      options: [
        { id: "beforenoon", label: "More discharges before noon", capture: "getting more discharges out before noon", next: "bottleneck" },
        { id: "notgate", label: "Find out whether the note is really what holds the discharge", capture: "testing whether documentation is what holds the discharge", next: "bottleneck" },
        { id: "rounding", label: "Give hospitalists rounding time back", capture: "giving hospitalists rounding time back", next: "bottleneck" },
      ],
    },
    bottleneck: {
      eyebrow: "The honest part",
      prompt: "What actually holds the discharge today?",
      teach: "Freed charting time only turns beds if the note is part of what holds the order.",
      options: [
        { id: "notelag", label: "The discharge-note lag holds the order", capture: "the discharge-note lag holds the order", reflect: "So the note lag is what holds the order, which is the part Abridge moves. Then it is whether case management can act.", next: "act" },
        { id: "partly", label: "Partly, alongside placement and consults", capture: "the note is part of it, alongside placement and consults", reflect: "So the note is part of it, alongside placement. We will keep that honest. Then it is whether case management can act.", next: "act" },
        { id: "placement", label: "No, it is placement, auth, or consults", capture: "the delay is placement and auth, which documentation does not fix", honest: true, next: BRIEF },
      ],
    },
    act: {
      eyebrow: "The fragile link",
      prompt: "Will case management act on earlier orders?",
      teach: "An earlier order only turns a bed if the next step moves too.",
      options: [
        { id: "yes", label: "Yes, they can move earlier", capture: "case management can act on earlier orders", next: BRIEF },
        { id: "unsure", label: "Not sure", capture: "whether case management can move earlier is open", next: BRIEF },
        { id: "no", label: "Honestly, not today", capture: "case management cannot act earlier today", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── Inpatient · Revenue Capture (DRG / CDI / OBS) ────────────────────────────
const inpatientRevenue: DiscoveryScript = {
  entry: "frame",
  briefIntro: "You said revenue. Inpatient, that forks into the DRG weight you earn, the CDI query load, and the inpatient status you defend.",
  roles: ["CDI leadership", "Revenue cycle and coding", "The hospitalist medical director"],
  caveat: "The note improving only turns into revenue if CDI and coding act on it and it survives the audit.",
  questions: {
    frame: {
      eyebrow: "The play",
      prompt: "Which part of inpatient revenue is this?",
      teach: "Three different plays, each with its own honesty test.",
      options: [
        { id: "drg", label: "Get the DRG weight the acuity earns", capture: "capturing the DRG weight the acuity earns", reflect: "DRG weight, so this is severity capture. Why is it slipping?", lever: { driverId: "drgAccuracy", label: "Case Mix (DRG Accuracy)" }, next: "drgWhy" },
        { id: "cdi", label: "Cut the CDI query pile", capture: "cutting the CDI query pile", reflect: "The query pile, a labor and throughput win. Let's find the cause.", proof: "a lighter, faster CDI query load: a labor and throughput win we track rather than book as DRG dollars.", next: "cdiWhy" },
        { id: "obs", label: "Defend inpatient status", capture: "defending inpatient status against downgrades", reflect: "Status defense. Let's find where the downgrades come from.", lever: { driverId: "obsDefense", label: "Status / Medical-Necessity Denials" }, next: "obsWhy" },
      ],
    },
    drgWhy: {
      eyebrow: "The honest part",
      prompt: "Why is the DRG weight slipping?",
      teach: "We only count severity a more complete note can defensibly establish.",
      options: [
        { id: "severity", label: "The note did not establish the severity", capture: "the note does not establish the severity up front", next: BRIEF },
        { id: "appropriate", label: "It is genuinely grouped correctly", capture: "part is genuinely grouped as it should be", next: BRIEF },
        { id: "downstream", label: "Mostly downstream in coding", capture: "the miss is mostly downstream in coding", honest: true, next: BRIEF },
      ],
    },
    cdiWhy: {
      eyebrow: "The honest part",
      prompt: "Why is the query pile so heavy?",
      teach: "The point is fewer, faster queries, not more.",
      options: [
        { id: "specificity", label: "Notes arrive without the specificity", capture: "notes arrive without the specificity CDI needs", next: BRIEF },
        { id: "timing", label: "The note lands too late for review", capture: "notes land too late for concurrent review", next: BRIEF },
        { id: "engagement", label: "It is really provider query engagement", capture: "the gap is provider engagement with queries, which a note alone will not fix", honest: true, next: BRIEF },
      ],
    },
    obsWhy: {
      eyebrow: "The honest part",
      prompt: "Why are stays getting downgraded?",
      teach: "Only downgrades a better note can defend are ours to claim.",
      options: [
        { id: "severity", label: "Severity not established at admission", capture: "severity is not established at admission", next: BRIEF },
        { id: "concurrent", label: "Concurrent-review gaps", capture: "concurrent-review gaps let downgrades through", next: BRIEF },
        { id: "payer", label: "Mostly payer pushback", capture: "the downgrades are mostly payer pushback, only partly documentation", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── Nursing · Capacity (overtime) ────────────────────────────────────────────
const nursingCapacity: DiscoveryScript = {
  entry: "drivers",
  briefIntro: "You said capacity. In nursing that is the documentation-driven overtime you can stop paying, and the time it puts back at the bedside.",
  roles: ["Nursing operations", "Unit managers", "Finance, for the overtime line"],
  caveat: "Freed minutes only cut overtime if they are protected, not absorbed by a heavier assignment.",
  // Posture: this is intake, not an argument. We gather the current picture and
  // the target; the honesty falls out of the picture (see foundation), not gates.
  questions: {
    // ── Where you are ──
    drivers: {
      eyebrow: "Where you are",
      prompt: "Where is the overtime coming from today?",
      teach: "Just the real picture. Overtime has a few sources, and the mix is the foundation everything else builds on.",
      options: [
        // Documentation-driven paths carry the overtime driver into the ROI. The
        // staffing/census paths honestly carry no counted lever (the bridge line
        // says so). This is metadata for the handoff, not an argument in the UX.
        { id: "postshift", label: "Nurses finishing charting after the shift ends", capture: "overtime shows up as post-shift charting", lever: { driverId: "nursingOvertime", label: "Overtime Spend" }, next: "scale" },
        { id: "batching", label: "Charting piles up during the day and spills over", capture: "charting batches up during the day and spills into overtime", lever: { driverId: "nursingOvertime", label: "Overtime Spend" }, next: "scale" },
        { id: "shortstaff", label: "Open positions and short-staffing", capture: "overtime is largely open positions and short-staffing", honest: true, next: "scale" },
        { id: "census", label: "Census and acuity spikes", capture: "overtime is largely census and acuity spikes", honest: true, next: "scale" },
      ],
    },
    scale: {
      eyebrow: "Where you are",
      prompt: "How big a problem is it right now?",
      teach: "Directional, not a number. It tells us how much weight this carries before the ROI puts a figure on it.",
      options: [
        { id: "watch", label: "A line item leadership keeps an eye on", capture: "overtime is a watched line item today", next: "target" },
        { id: "pressure", label: "A serious budget pressure this year", capture: "overtime is a serious budget pressure this year", next: "target" },
        { id: "top", label: "One of your top workforce costs", capture: "overtime is one of the top workforce costs", next: "target" },
      ],
    },
    // ── Where you want to go ──
    target: {
      eyebrow: "Where you want to go",
      prompt: "What does better look like?",
      teach: "In your words. This is the direction we steer toward.",
      options: [
        { id: "inshift", label: "Charting done in-shift, so nurses leave on time", capture: "the target is charting done in-shift so nurses leave on time", next: "horizon" },
        { id: "runrate", label: "Overtime down to a lower run-rate", capture: "the target is a lower overtime run-rate", next: "horizon" },
        { id: "agency", label: "Leaning off agency and travel", capture: "the target is leaning off agency and travel", next: "horizon" },
        { id: "bedside", label: "More of that time back at the bedside", capture: "the target is time back at the bedside", next: "horizon" },
      ],
    },
    horizon: {
      eyebrow: "Where you want to go",
      prompt: "On what timeframe?",
      teach: "When you want to see it move.",
      options: [
        { id: "year", label: "This budget year", capture: "on a this-budget-year timeframe", next: "success" },
        { id: "quarters", label: "The next two or three quarters", capture: "over the next two to three quarters", next: "success" },
        { id: "longer", label: "A longer, steadier horizon", capture: "on a longer, steadier horizon", next: "success" },
      ],
    },
    success: {
      eyebrow: "Where you want to go",
      prompt: "What would tell you it's working?",
      teach: "The signal you would trust. This becomes what the plan tracks.",
      options: [
        { id: "clockout", label: "Nurses clocking out on time", capture: "success looks like nurses clocking out on time", next: BRIEF },
        { id: "othours", label: "Overtime hours falling on the report", capture: "success looks like overtime hours falling on the report", next: BRIEF },
        { id: "agencyspend", label: "Less agency and travel spend", capture: "success looks like less agency and travel spend", next: BRIEF },
      ],
    },
  },
};

// ── Nursing · Revenue (supporting play) ──────────────────────────────────────
const nursingRevenue: DiscoveryScript = {
  entry: "what",
  briefIntro: "You said revenue. Nursing documentation supports charge capture and the acuity picture, but it is a supporting role, not a primary Abridge revenue lever.",
  proofLine: "more complete, timely nursing documentation that supports charge capture and acuity, tracked as a supporting signal rather than booked as a primary dollar.",
  roles: ["Revenue cycle and coding", "Nursing informatics", "Charge-capture owners"],
  caveat: "Charges only land if capture is reconciled to the documentation. The primary revenue levers live with the providers.",
  questions: {
    what: {
      eyebrow: "The play",
      prompt: "What part of revenue does nursing documentation touch here?",
      teach: "Be clear-eyed: nursing documentation supports capture, it rarely drives it.",
      options: [
        { id: "charges", label: "Charge capture for interventions and supplies", capture: "supporting charge capture for interventions and supplies", reflect: "Charge capture, a supporting role for nursing documentation. Is it really a documentation gap?", next: "honesty" },
        { id: "acuity", label: "The acuity and status picture coders rely on", capture: "supporting the acuity and status picture", reflect: "The acuity picture, supporting. Is it really a documentation gap?", next: "honesty" },
      ],
    },
    honesty: {
      eyebrow: "The honest part",
      prompt: "Is this really a nursing-documentation gap?",
      teach: "If the leakage is downstream in charge reconciliation, that is not documentation's to fix.",
      options: [
        { id: "docs", label: "Yes, the documentation is incomplete or late", capture: "the nursing documentation is incomplete or late", next: BRIEF },
        { id: "reconcile", label: "No, it is charge reconciliation downstream", capture: "the gap is downstream charge reconciliation, not documentation", honest: true, next: BRIEF },
      ],
    },
  },
};

// ── authored theses (answer-keyed synthesis) for the bespoke scripts ─────────
outpatientAccess.thesis = (t) => {
  const aim = { backlog: "burn down a backlog of patients already waiting", wait: "shorten the new-patient wait", noshow: "win back the slots you lose to no-shows", grow: "grow the panel you can carry" }[t.pick("aim") ?? ""] ?? "open real access";
  const gap = t.pick("gap");
  if (gap === "frontdesk") return `The honest read first: you told us the real blocker is front-desk and referral workflow, not charting. Ambient documentation will not move that, so access is the wrong ROI to build here. Better to name that now than over-promise.`;
  if (t.pick("reinvest") === "relief") return `You want to ${aim}, but you also told us the freed time is going to a lighter day, not new visits. That is real value; it just books as retention, not access. If access is the goal, the freed hours have to be pointed at the schedule first.`;
  const gapTxt = { charting: "the constraint is documentation time, which is exactly what Abridge frees", template: "the constraint is the schedule template, so the freed time only lands if you change the template to add slots", demand: "you are at capacity with demand waiting, so freed time converts straight into visits" }[gap ?? ""] ?? "capacity is the constraint";
  const absorb = { yes: "and there is demand and room to seat them", templates: "though it will take a template change to seat them", no: "though there is little room to absorb more today, which caps the near-term upside" }[t.pick("absorb") ?? ""] ?? "";
  return `This is a supply problem you can convert into booked visits. You want to ${aim}, ${gapTxt}, ${absorb}. The money is ${LEVER_LINE.patientAccess} The one decision that makes or breaks it: committing those freed hours to the schedule instead of letting them become a quieter day.`;
};

// The OPERATING playbook: the qualified thesis turned into how it actually runs
// on the floor, what they feel first, and where it stalls. Keyed to the
// operating-chapter answers; null when that chapter was not reached.
outpatientAccess.playbook = (t) => {
  const move = t.pick("operating");
  if (!move) return null;
  const aim = t.pick("aim");
  const gap = t.pick("gap");
  const absorb = t.pick("absorb");
  const lever =
    gap === "demand" ? "The lever is the freed clinician time, converted into booked visits. You are already at capacity with demand waiting, so nearly all of it can land as access."
    : gap === "template" ? "The lever is the freed clinician time, converted into booked visits, but the ceiling is capped by the schedule template until it is changed to open slots."
    : "The lever is the freed clinician time, converted into booked visits. The ceiling is only as big as the demand you can point it at.";
  const mechanism = "Freed documentation time becomes bookable slots, and the money is the margin on the net-new visits. Only the time you actually point at the schedule counts, so we size that share, not the gross.";
  const holds =
    move === "book" ? "The opened time has to be added to the template and actively booked, not absorbed into a lighter day."
    : move === "central" ? "Central scheduling has to fill the opened time by rule, so the capacity does not depend on each provider remembering to use it."
    : move === "sameday" ? "The freed time has to be protected as same-day and overflow capacity, so it lands as access the moment demand shows up."
    : (gap === "template" || absorb === "templates") ? "The schedule-template change has to actually get approved, or the slots never open and the time defaults to relief."
    : "The freed time has to be deliberately pointed at the schedule; left alone it becomes an easier day, not access.";
  const signal =
    aim === "backlog" ? "The wait-list getting visibly shorter and third-next-available dropping, weeks before any revenue moves."
    : aim === "wait" ? "The new-patient wait shrinking on the schedule, well before it shows up as revenue."
    : aim === "noshow" ? "Recovered slots getting rebooked instead of sitting empty, ahead of the dollars."
    : aim === "grow" ? "The panel absorbing new patients without the team feeling more underwater, before any revenue lands."
    : "Providers finishing their notes inside the workday, the leading sign the time was actually freed.";
  return { lever, mechanism, holds, signal };
};

outpatientRevenue.thesis = (t) => {
  const payer = t.pick("payer");
  const bothNote = payer === "both" ? " You also flagged risk contracts; the HCC recapture walk is a parallel next step we should run so the risk half is not left on the table." : "";
  if (payer === "risk") {
    const target = t.pick("riskWhat") === "new" ? "capture conditions that are documented but never coded" : "recapture the chronic conditions that reset every January";
    if (t.pick("riskCause") === "downstream") return `On the risk side you want to ${target}, but you told us the gap is mostly downstream in coding, not the visit. That is not the note's to fix, so we would track it, not book it.`;
    return `This is a risk-accuracy story. You want to ${target}, and the gap is at the visit, where a complete note can carry them. The money is ${LEVER_LINE.hccCapture} It only holds if coding acts on the fuller note and it survives a RADV audit.`;
  }
  const denials = t.pick("ffsWhat") === "denials";
  if (t.pick("ffsWhy") === "downstream") return `On the fee-for-service side you want to ${denials ? "stop preventable denials" : "get paid for the level you deliver"}, but you told us the miss is mostly downstream in coding, not the note. We would track that, not count it.${bothNote}`;
  const money = denials ? LEVER_LINE.denialPrevention : LEVER_LINE.wrvu;
  const lead = denials ? "You are writing off medical-necessity denials a more complete note would have prevented" : "Your visits are coding below the care delivered, because the note undersells the complexity that happened";
  return `This is a fee-for-service capture story. ${lead}. The money is ${money} It only becomes revenue if coding acts on the fuller note and it survives the audit.${bothNote}`;
};

edAccess.thesis = (t) => {
  const aim = { lwbs: "cut the patients who leave without being seen", door: "speed up door-to-provider", admissions: "capture the admissions you lose to diversion" }[t.pick("aim") ?? ""] ?? "move patients through faster";
  const bn = t.pick("bottleneck");
  if (bn === "boarding") return `The honest read first: you told us the real bottleneck is back-end boarding and disposition, not front-end charting. Freeing documentation time will not move a boarding problem, so this is the wrong lever to build an ROI on. Better to name it now.`;
  const bnTxt = { docload: "the charting load is part of what slows the front end, which is what Abridge frees", frontend: "the front end is part of the constraint, so documentation helps at the margin", provider: "provider availability at the front is the real limiter" }[bn ?? ""] ?? "the front end is constrained";
  const act = t.pick("act");
  const hinge = act === "no" ? "But no one consistently works the board today, which caps how much of this lands." : act === "unsure" ? "The open question is whether someone works the board in real time; that is what converts freed time into throughput." : "And the team will work the board in real time, which is what turns freed minutes into throughput.";
  return `This is a throughput story. You want to ${aim}, and ${bnTxt}. The money is ${t.lever ? LEVER_LINE[t.lever.driverId] : "in the visits you keep"} ${hinge}`;
};

edRevenue.thesis = (t) => {
  if (t.pick("frame") === "denials") {
    const w = t.pick("denialsWhy");
    if (w === "eligibility") return `You were honest that the denials are front-end eligibility and registration, which the note cannot fix. Better to fix that upstream than build a documentation ROI on it.`;
    if (w === "downstream") return `You told us the denials are mostly downstream, so we would track that rather than count it.`;
    return `You are writing off medical-necessity denials a more complete note would have prevented. The money is ${LEVER_LINE.denialPrevention} It only lands if the fix reaches the note at the point of care.`;
  }
  const w = t.pick("codingWhy");
  if (w === "downstream") return `You told us the acuity miss is mostly downstream in coding, not the note. We track that, not count it.`;
  const lead = w === "lower" ? "and you were honest that part of it is genuinely lower acuity, so we stay conservative" : "because the note did not carry the workup that happened";
  return `Your ED visits are coding below the acuity you actually treat, ${lead}. The money is ${LEVER_LINE.edEmLevel} It only becomes revenue if coding acts on the fuller note and it survives the audit.`;
};

inpatientCapacity.thesis = (t) => {
  const bn = t.pick("bottleneck");
  if (bn === "placement") return `The honest read first: you told us discharges slip on placement and authorization, not the note. Documentation will not move that, so this is an operational conversation, not an Abridge ROI.`;
  const act = t.pick("act");
  const hinge = act === "no" ? "But case management cannot act on earlier orders today, which is the real ceiling." : act === "unsure" ? "The open question is whether case management can move on earlier orders." : "And case management can act on the earlier orders, which is what actually turns the bed.";
  const mid = bn === "partly" ? "You were clear the note is only part of what holds the order, alongside placement and consults, so we keep it honest." : "You told us the discharge-note lag is what holds the order, which is the part Abridge moves.";
  return `This is a flow story, not a dollar. Getting the discharge work done earlier turns beds sooner, which we track as an operational capacity gain rather than book as a hard dollar. ${mid} ${hinge}`;
};

inpatientRevenue.thesis = (t) => {
  const f = t.pick("frame");
  if (f === "cdi") {
    if (t.pick("cdiWhy") === "engagement") return `On the CDI side, you told us the real gap is provider engagement with queries, which a note alone will not fix. So we would track a lighter query load, not book it as revenue.`;
    return `Cutting the CDI query pile is a labor and throughput win: fewer, faster queries because the note arrives with the specificity CDI needs. We track that rather than book it as DRG dollars, so no one over-claims.`;
  }
  if (f === "obs") {
    const w = t.pick("obsWhy");
    if (w === "payer") return `On status, you were honest that the downgrades are mostly payer pushback, only partly documentation. We would size only the share a stronger note can defend.`;
    const lead = w === "severity" ? "Severity is not established at admission" : "Concurrent-review gaps let downgrades through";
    return `This is a status-defense story. ${lead}, and a complete note is what defends the inpatient stay. The money is ${LEVER_LINE.obsDefense} It only holds if CDI and coding act on it and it survives the audit.`;
  }
  const w = t.pick("drgWhy");
  if (w === "downstream") return `On DRG weight, you told us the miss is mostly downstream in coding, not the note. That is not the note's to fix, so we track it rather than count it.`;
  const lead = w === "appropriate" ? "Part is genuinely grouped as it should be, so we stay conservative, but a complete note" : "The note does not establish the severity up front, and a complete note";
  return `This is a severity-capture story. ${lead} is what earns the DRG weight the acuity warrants. The money is ${LEVER_LINE.drgAccuracy} It only becomes revenue if CDI and coding act on it and it survives the audit.`;
};

// Nursing overtime, reshaped: Strategy is a foundation read, not a hypothesis.
// We mirror back where they are and where they want to go. The honesty falls
// out of the current-state picture (the bridge line), not a gate.
nursingCapacity.foundation = (t) => {
  const scope = { medsurg: "med-surg units", icu: "the ICUs and step-down", ed: "ED nursing", all: "house-wide" }[t.ground?.("scope") ?? ""];
  const drivers = t.pick("drivers");
  const driverTxt = { postshift: "post-shift charting", batching: "charting that batches up during the day", shortstaff: "open positions and short-staffing", census: "census and acuity spikes" }[drivers ?? ""] ?? "a mix of sources";
  const scale = { watch: "a watched line item", pressure: "a serious budget pressure this year", top: "one of your top workforce costs" }[t.pick("scale") ?? ""];
  const tried = { nothing: "nothing formal yet", program: "a CDI or coding program", scribes: "scribes", ambient: "another ambient tool", mix: "a mix of programs" }[t.ground?.("tried") ?? ""];
  const target = { inshift: "charting done in-shift, so nurses leave on time", runrate: "a lower overtime run-rate", agency: "leaning off agency and travel", bedside: "more time back at the bedside" }[t.pick("target") ?? ""] ?? "lower overtime";
  const horizon = { year: "this budget year", quarters: "the next two to three quarters", longer: "a longer, steadier horizon" }[t.pick("horizon") ?? ""];
  const success = { clockout: "nurses clocking out on time", othours: "overtime hours falling on the report", agencyspend: "less agency and travel spend" }[t.pick("success") ?? ""];

  const docLever = drivers === "postshift" || drivers === "batching";
  const current: FoundationItem[] = [
    scope ? { label: "Concentrated in", value: scope } : null,
    { label: "Mostly driven by", value: driverTxt },
    scale ? { label: "Today it is", value: scale } : null,
    tried ? { label: "Already tried", value: tried } : null,
  ].filter(Boolean) as FoundationItem[];
  const desired: FoundationItem[] = [
    { label: "The change you want", value: target },
    horizon ? { label: "On what timeframe", value: horizon } : null,
    success ? { label: "You'll know it's working when", value: success } : null,
  ].filter(Boolean) as FoundationItem[];
  const bridge = docLever
    ? "The gap between these is what the ROI sizes next, and the Plan closes. The piece Abridge moves is the charting, so the ceiling is the share of overtime that is documentation, not staffing or census."
    : "The gap between these is what the ROI sizes next. Straight talk: you told us the overtime is mostly staffing and census, which a better note does not fix, so the documentation-attributable piece here is modest.";
  return { current, desired, bridge, signalLabel: "You'll know it's working when" };
};

nursingRevenue.thesis = (t) => {
  if (t.pick("honesty") === "reconcile") return `You were honest that the gap is downstream in charge reconciliation, not the nursing documentation. That is not the note's to fix, so this is not where the ROI lives.`;
  return `Nursing documentation supports charge capture and the acuity picture, but it plays a supporting role here, not a primary revenue lever. We track it as a supporting signal rather than book it as a dollar; the primary revenue levers live with the providers.`;
};

nursingQuality.thesis = (t) => {
  if (t.pick("gate") === "little") return `You were honest that this largely happens despite good care, so we would not book a dollar against it. Worth naming before the ROI.`;
  const focus = { falls: "falls with injury", hapi: "pressure injuries", clabsi: "central-line infections", sepsis: "catching sepsis earlier" }[t.pick("outcome") ?? ""] ?? "the safety measures";
  const money = t.lever ? `The money is ${LEVER_LINE[t.lever.driverId]}` : t.proof ? `This one is ${t.proof}` : "";
  const act = t.pick("act");
  const hinge = act === "no" ? "But the freed time is unlikely to reach the bedside reliably, which caps how much lands." : act === "unsure" ? "The open question is whether the freed time actually reaches the bedside." : "And the freed time will go to rounding and the protocols, which is what converts it.";
  return `Nursing quality is the one place documentation time most directly supports the safety measures you can actually cost. You are focused on ${focus}. ${money} ${hinge}`;
};

// answer-derived additions to the table
outpatientAccess.extraRoles = (t) => (t.pick("gap") === "template" ? ["The scheduling-template owner"] : []);

export const DISCOVERY: Partial<Record<AttainSetting, Partial<Record<GoalId, DiscoveryScript>>>> = {
  outpatient: { access: outpatientAccess, revenue: outpatientRevenue, retention: outpatientRetention, quality: outpatientQuality },
  ed: { access: edAccess, retention: edRetention, revenue: edRevenue, quality: edQuality },
  inpatient: { capacity: inpatientCapacity, retention: inpatientRetention, revenue: inpatientRevenue, quality: inpatientQuality },
  nursing: { capacity: nursingCapacity, retention: nursingRetentionScript, revenue: nursingRevenue, quality: nursingQuality },
};

export function getScript(setting: AttainSetting, goal: GoalId): DiscoveryScript | null {
  return DISCOVERY[setting]?.[goal] ?? null;
}

// ── live answer state (persisted in the snapshot) ────────────────────────────
/** keyed by `${goal}:${questionId}` -> chosen optionId */
export type DiscoveryAnswers = Record<string, string>;

export interface DiscoveryResult {
  goal: GoalId;
  narrative: string[]; // the captured facts, in path order
  lever?: DiscoveryLever; // where the real money is, COUNTED (cleared if an honest-out is chosen)
  proof?: string; // if this resolved to a proof-play outcome (tracked, not counted)
  proofDriverId?: string; // an Explore driver to toggle ON in tracked mode (retention)
  honest: boolean; // did they pick an honest "not documentation's" answer
  complete: boolean; // did the path reach BRIEF (fully answered)
}

/** Replay a goal's answered path to build the brief inputs. */
export function resolveResult(setting: AttainSetting, goal: GoalId, answers: DiscoveryAnswers): DiscoveryResult | null {
  const script = getScript(setting, goal);
  if (!script) return null;
  const narrative: string[] = [];
  let lever: DiscoveryLever | undefined;
  let proof: string | undefined;
  let proofDriverId: string | undefined;
  let honest = false;
  let qid: string | typeof BRIEF = script.entry;
  const guard = new Set<string>();
  let complete = false;
  while (qid !== BRIEF) {
    if (guard.has(qid)) break; // never loop
    guard.add(qid);
    const q = script.questions[qid];
    if (!q) break;
    const chosen = answers[`${goal}:${qid}`];
    const opt = q.options.find((o) => o.id === chosen);
    if (!opt) break; // not answered yet
    if (opt.capture) narrative.push(opt.capture);
    if (opt.lever) lever = opt.lever;
    if (opt.proof) proof = opt.proof;
    if (opt.proofDriverId) proofDriverId = opt.proofDriverId;
    if (opt.honest) honest = true;
    qid = opt.next;
    if (qid === BRIEF) complete = true;
  }
  // An honest-out ("not documentation's to fix / mostly downstream / payer pushback")
  // reached later on the path must UNDO the counted lever pinned earlier — otherwise the
  // brief headlines it as counted money and the handoff pre-enables a driver the partner
  // just said is not the note's to fix. This is the whole honesty promise.
  if (honest) lever = undefined;
  return { goal, narrative, lever, proof, proofDriverId, honest, complete };
}

// ── brief synthesis (authored per goal, generic fallback) ────────────────────
const capfirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function joinC(c: string[]): string {
  if (c.length <= 1) return c[0] ?? "";
  if (c.length === 2) return `${c[0]} and ${c[1]}`;
  return `${c.slice(0, -1).join(", ")}, and ${c[c.length - 1]}`;
}
export function moneyClause(t: ThesisCtx): string {
  if (t.lever) return `The money is ${LEVER_LINE[t.lever.driverId] ?? "a real, conservatively modeled lever."}`;
  if (t.proof) return `This one is ${t.proof}`;
  if (t.honest) return "Honestly, ambient documentation is not your main lever here, which is worth knowing before anyone builds an ROI around it.";
  return "";
}
function genericThesis(t: ThesisCtx): string {
  const n = t.narrative;
  const lead = n.length ? `You are not just after ${t.goalLabel} in the abstract. You are working to ${n[0]}.` : `You are after ${t.goalLabel}.`;
  const mid = n.slice(1).length ? ` What has to be true: ${joinC(n.slice(1))}.` : "";
  const money = moneyClause(t);
  return `${lead}${mid}${money ? " " + money : ""}`;
}
function ctxFor(setting: AttainSetting, goal: GoalId, settingLabel: string, answers: DiscoveryAnswers): ThesisCtx {
  const res = resolveResult(setting, goal, answers);
  return {
    pick: (qid) => answers[`${goal}:${qid}`],
    ground: (gid) => answers[`_ground:${gid}`],
    narrative: res?.narrative ?? [],
    lever: res?.lever,
    proof: res?.proof,
    honest: !!res?.honest,
    goalLabel: categoryForGoal(setting, goal),
    settingLabel,
  };
}
/** The synthesized brief paragraph for a goal (authored thesis, else generic). */
export function briefThesis(setting: AttainSetting, goal: GoalId, settingLabel: string, answers: DiscoveryAnswers): string {
  const script = getScript(setting, goal);
  if (!script) return "";
  const ctx = ctxFor(setting, goal, settingLabel, answers);
  return script.thesis ? script.thesis(ctx) : genericThesis(ctx);
}
/** Who should be at the table, with any answer-derived additions. */
export function briefRoles(setting: AttainSetting, goal: GoalId, settingLabel: string, answers: DiscoveryAnswers): string[] {
  const script = getScript(setting, goal);
  if (!script) return [];
  const extra = script.extraRoles ? script.extraRoles(ctxFor(setting, goal, settingLabel, answers)) : [];
  return [...script.roles, ...extra.filter((r) => !script.roles.includes(r))];
}
/** The operating playbook for a goal (authored, keyed to the operating-chapter
 * answers). Null when the script has no operating layer, the path went honest,
 * or the operating chapter has not been answered yet. */
export function briefPlaybook(setting: AttainSetting, goal: GoalId, settingLabel: string, answers: DiscoveryAnswers): OperatingPlaybook | null {
  const script = getScript(setting, goal);
  if (!script?.playbook) return null;
  const ctx = ctxFor(setting, goal, settingLabel, answers);
  if (ctx.honest) return null;
  return script.playbook(ctx);
}
/** The foundation read (current-state / desired-state mirror), when the script
 * defines one and the path is complete enough to fill it. Null otherwise. */
export function briefFoundation(setting: AttainSetting, goal: GoalId, settingLabel: string, answers: DiscoveryAnswers): FoundationRead | null {
  const script = getScript(setting, goal);
  if (!script?.foundation) return null;
  return script.foundation(ctxFor(setting, goal, settingLabel, answers));
}
export { capfirst };

// ── Grounding: shared qualitative context asked once, before the goal walks ───
// No hard numbers. Scope is "which lines/units", not "how many".
export interface GroundingOption { id: string; label: string; capture: string }
export interface GroundingQuestion { id: string; eyebrow: string; prompt: string; teach: string; options: GroundingOption[] }

const SCOPE_BY_SETTING: Record<AttainSetting, GroundingOption[]> = {
  outpatient: [
    { id: "primary", label: "Primary care", capture: "focused on primary care" },
    { id: "specialty", label: "A few specialties", capture: "focused on a few specialties" },
    { id: "cardio", label: "Cardiology and higher-complexity lines", capture: "focused on cardiology and higher-complexity lines" },
    { id: "system", label: "The whole ambulatory footprint", capture: "across the whole ambulatory footprint" },
  ],
  ed: [
    { id: "main", label: "The main ED", capture: "focused on the main ED" },
    { id: "fasttrack", label: "Fast-track and lower-acuity", capture: "focused on fast-track and lower-acuity" },
    { id: "peak", label: "Peak and surge hours", capture: "focused on peak and surge hours" },
    { id: "all", label: "All zones and shifts", capture: "across all zones and shifts" },
  ],
  inpatient: [
    { id: "hospitalist", label: "Hospital medicine", capture: "focused on hospital medicine" },
    { id: "specialty", label: "A few high-census services", capture: "focused on a few high-census services" },
    { id: "icu", label: "Including the ICUs", capture: "including the ICUs" },
    { id: "all", label: "The whole inpatient footprint", capture: "across the whole inpatient footprint" },
  ],
  nursing: [
    { id: "medsurg", label: "Med-surg units", capture: "focused on med-surg units" },
    { id: "icu", label: "ICU and step-down", capture: "focused on ICU and step-down" },
    { id: "ed", label: "ED nursing", capture: "focused on ED nursing" },
    { id: "all", label: "House-wide", capture: "house-wide" },
  ],
};

export function groundingQuestions(setting: AttainSetting): GroundingQuestion[] {
  return [
    {
      id: "scope",
      eyebrow: "Grounding",
      prompt: "Where does this live?",
      teach: "Not a number, just the shape. It tells us where the value would show up and keeps the ROI honest to your world.",
      options: SCOPE_BY_SETTING[setting],
    },
    {
      id: "tried",
      eyebrow: "Grounding",
      prompt: "What have you already tried here?",
      teach: "What is already in place changes how much headroom is left, so we do not double-count work you have already done.",
      options: [
        { id: "nothing", label: "Nothing formal yet", capture: "nothing formal has been tried yet" },
        { id: "program", label: "A CDI or coding program", capture: "a CDI or coding program is already in place" },
        { id: "scribes", label: "Scribes", capture: "scribes are already in use" },
        { id: "ambient", label: "Another ambient tool", capture: "another ambient tool is already in use" },
        { id: "mix", label: "A mix of the above", capture: "a mix of programs are already in place" },
      ],
    },
  ];
}

export const WHY_NOW: GroundingQuestion = {
  id: "whynow",
  eyebrow: "Grounding",
  prompt: "Why now?",
  teach: "The reason this is live this year tells us how real the commitment is, and who has to be behind it.",
  options: [
    { id: "board", label: "A board or executive goal", capture: "driven by a board or executive goal" },
    { id: "budget", label: "A budget cycle or contract coming up", capture: "timed to a budget cycle or contract" },
    { id: "pain", label: "The pain finally boiled over", capture: "the pain finally boiled over" },
    { id: "compete", label: "A competing pilot or vendor", capture: "prompted by a competing pilot or vendor" },
    { id: "explore", label: "Just exploring for now", capture: "still in an exploring posture", },
  ],
};
