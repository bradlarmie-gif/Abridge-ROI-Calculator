import type { AttainSetting, GoalId } from "./attainTypes";
import { goalDisplayLabel } from "./attainGoals";

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
  /** When true, the partner can pick several answers (checkbox + Continue).
   * All options must share one `next` (a multi step has no per-option branch). */
  multi?: boolean;
}

/** What an authored thesis reads: the partner's answers + the resolved result. */
export interface ThesisCtx {
  pick: (qid: string) => string | undefined;
  /** read every option id chosen for a multi-select question, in authored order. */
  picks: (qid: string) => string[];
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
export interface FoundationItem { label: string; value: string | string[]; }
export interface FoundationRead {
  current: FoundationItem[];
  desired: FoundationItem[];
  bridge: string;
  /** the desired-state item that is the success signal (rendered as the accent). */
  signalLabel?: string;
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
   * nursing HAPI/CLABSI): the "where the value is" line, tracked not counted. */
  proofLine?: string;
  /** FOUNDATION read (current-state / desired-state mirror) — what the brief
   * renders. Every reachable script defines one. */
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

// ─────────────────────────────────────────────────────────────────────────────
// FOUNDATION POSTURE
// Strategy is intake, not an argument: gather where the partner is today and
// where they want to go. The honesty falls out of the current-state picture
// (the bridge line), not a gate. Owner/cadence + dollars are the Plan's / ROI's
// job. Every reachable script is built from one shared intake shape below, fed a
// per-domain spec so the copy is specific to that setting and problem.
// ─────────────────────────────────────────────────────────────────────────────

const HORIZON_Q_OPTIONS = [
  { id: "year", label: "This budget year", capture: "on a this-budget-year timeframe", value: "this budget year" },
  { id: "quarters", label: "The next two or three quarters", capture: "over the next two to three quarters", value: "the next two to three quarters" },
  { id: "longer", label: "A longer, steadier horizon", capture: "on a longer, steadier horizon", value: "a longer, steadier horizon" },
];
const TRIED_VALUE: Record<string, string> = {
  nothing: "nothing formal yet", program: "a CDI or coding program", scribes: "scribes",
  ambient: "another ambient tool", mix: "a mix of programs",
};

function scopeValueFor(setting: AttainSetting, scopeId?: string): string | undefined {
  return SCOPE_BY_SETTING[setting].find((o) => o.id === scopeId)?.label;
}

interface FDriver { id: string; label: string; capture: string; value: string; lever?: DiscoveryLever; proofDriverId?: string; proof?: string; honest?: boolean; }
interface FChoice { id: string; label: string; capture: string; value: string; }
interface FoundationSpec {
  setting: AttainSetting;
  briefIntro: string; roles: string[]; caveat: string; proofLine?: string;
  driversPrompt: string; driversTeach: string; drivers: FDriver[]; currentLabel: string;
  scaleLabel: string;
  targetPrompt: string; targetTeach: string; targets: FChoice[]; targetLabel: string;
  successPrompt: string; successTeach: string; successes: FChoice[];
  scopeLabel?: string;
  bridgeDoc: string; bridgeProof: string; bridgeHonest: string;
  // Comprehensive capture: let the partner name several answers where reality is plural.
  multiDrivers?: boolean; multiTargets?: boolean; multiSuccess?: boolean;
  // The optional "connect the dots" beat, inserted right after drivers: name the concrete
  // documentation moments behind the reasons they just gave. Always multi.
  connect?: { prompt: string; teach?: string; label: string; options: FDriver[]; };
}

function makeFoundation(spec: FoundationSpec): DiscoveryScript {
  const script: DiscoveryScript = {
    entry: "drivers",
    briefIntro: spec.briefIntro,
    roles: spec.roles,
    caveat: spec.caveat,
    proofLine: spec.proofLine,
    questions: {
      drivers: {
        eyebrow: "Where you are",
        prompt: spec.driversPrompt,
        teach: spec.driversTeach,
        multi: spec.multiDrivers,
        options: spec.drivers.map((d) => ({ id: d.id, label: d.label, capture: d.capture, lever: d.lever, proofDriverId: d.proofDriverId, proof: d.proof, honest: d.honest, next: spec.connect ? "connect" : "target" })),
      },
      target: {
        eyebrow: "Where you want to go",
        prompt: spec.targetPrompt,
        teach: spec.targetTeach,
        multi: spec.multiTargets,
        options: spec.targets.map((x) => ({ id: x.id, label: x.label, capture: x.capture, next: "horizon" })),
      },
      horizon: {
        eyebrow: "Where you want to go",
        prompt: "On what timeframe?",
        teach: "When you want to see it move.",
        options: HORIZON_Q_OPTIONS.map((o) => ({ id: o.id, label: o.label, capture: o.capture, next: "success" })),
      },
      success: {
        eyebrow: "Where you want to go",
        prompt: spec.successPrompt,
        teach: spec.successTeach,
        multi: spec.multiSuccess,
        options: spec.successes.map((x) => ({ id: x.id, label: x.label, capture: x.capture, next: BRIEF })),
      },
    },
  };
  // The optional connect-the-dots beat sits between drivers and target. drivers already
  // point to it (next: "connect") whenever spec.connect is set.
  if (spec.connect) {
    script.questions.connect = {
      eyebrow: "Where you are",
      prompt: spec.connect.prompt,
      teach: spec.connect.teach,
      multi: true,
      options: spec.connect.options.map((d) => ({ id: d.id, label: d.label, capture: d.capture, honest: d.honest, next: "target" })),
    };
  }
  script.foundation = (t) => {
    // One reader for single- and multi-select questions: a multi step returns every
    // chosen option, a single step the one pick. Values join into one plain clause.
    const chosenOf = <T extends { id: string }>(qid: string, pool: T[], multi?: boolean): T[] => {
      const ids = multi ? t.picks(qid) : [t.pick(qid)].filter(Boolean) as string[];
      return ids.map((id) => pool.find((x) => x.id === id)).filter(Boolean) as T[];
    };
    const join = (xs: { value: string }[]) => xs.map((x) => x.value).join(", ");
    const scope = scopeValueFor(spec.setting, t.ground?.("scope"));
    const tried = TRIED_VALUE[t.ground?.("tried") ?? ""];
    const ds = chosenOf("drivers", spec.drivers, spec.multiDrivers);
    const ts = chosenOf("target", spec.targets, spec.multiTargets);
    const horizon = HORIZON_Q_OPTIONS.find((o) => o.id === t.pick("horizon"))?.value;
    const ss = chosenOf("success", spec.successes, spec.multiSuccess);
    const cs = spec.connect ? chosenOf("connect", spec.connect.options, true) : [];
    // Left column: scope / driver. The brief adds the priority-rank row ("#N priority")
    // where scale used to sit, so multi-goal reads 3 x 3; single-goal reads scope /
    // driver. "Already tried" and the connect-the-dots context ride in the bridge.
    // Multi-select fields carry the list (each pick its own line in the brief); single
    // fields stay one string. The bridge still reads the joined prose form.
    const listOf = (xs: { value: string }[], isMulti?: boolean) => (isMulti ? xs.map((x) => x.value) : join(xs));
    const current: FoundationItem[] = [
      scope ? { label: spec.scopeLabel ?? "Concentrated in", value: scope } : null,
      ds.length ? { label: spec.currentLabel, value: listOf(ds, spec.multiDrivers) } : null,
    ].filter(Boolean) as FoundationItem[];
    const desired: FoundationItem[] = [
      ts.length ? { label: spec.targetLabel, value: listOf(ts, spec.multiTargets) } : null,
      horizon ? { label: "On what timeframe", value: horizon } : null,
      ss.length ? { label: "You'll know it's working when", value: listOf(ss, spec.multiSuccess) } : null,
    ].filter(Boolean) as FoundationItem[];
    const allHonest = ds.length > 0 && ds.every((x) => x.honest);
    const base = allHonest ? spec.bridgeHonest : ds.some((x) => x.lever) ? spec.bridgeDoc : spec.bridgeProof;
    const connectNote = cs.length && !allHonest ? ` Concretely, that shows up as ${join(cs)}.` : "";
    // Fold the double-count context in: if a program is already in place, say so.
    const triedNote = tried && t.ground?.("tried") !== "nothing" ? ` You already have ${tried} in place, so we size only the headroom left.` : "";
    return { current, desired, bridge: base + connectNote + triedNote, signalLabel: "You'll know it's working when" };
  };
  return script;
}

// ── Outpatient · Patient Access ──────────────────────────────────────────────
const outpatientAccess = makeFoundation({
  setting: "outpatient",
  briefIntro: "You said access. Here is your current picture and where you want to take it.",
  roles: ["Ambulatory operations", "Access and scheduling lead", "A service-line chief"],
  caveat: "Freed time only becomes visits if it is pointed at the schedule and there is demand to fill it.",
  driversPrompt: "Where is the access gap coming from? Often it's a few at once.",
  driversTeach: "Just the real picture. Where the pressure comes from changes where the freed time has to go.",
  currentLabel: "Where the access gap is",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "backlog", label: "A referral and new-patient backlog already waiting", capture: "a referral and new-patient backlog already waiting", value: "a referral and new-patient backlog", lever: { driverId: "patientAccess", label: "Net-new visit margin" } },
    { id: "wait", label: "Long waits for a new appointment", capture: "long new-patient waits", value: "long new-patient waits", lever: { driverId: "patientAccess", label: "Net-new visit margin" } },
    { id: "noshow", label: "Slots lost to no-shows", capture: "slots lost to no-shows, which a lighter note does not fix", value: "slots lost to no-shows", honest: true },
    { id: "template", label: "No room in the schedule template", capture: "no room in the schedule template", value: "no room in the schedule template", lever: { driverId: "patientAccess", label: "Net-new visit margin" } },
    { id: "frontdesk", label: "A front-desk or referral-workflow problem", capture: "front-desk and referral workflow", value: "front-desk and referral workflow", honest: true },
  ],
  connect: {
    prompt: "Where does documentation eat into schedulable time today?",
    teach: "The moments a lighter note frees back for the schedule. This is what the plan tracks.",
    label: "Where documentation eats the schedule",
    options: [
      { id: "afterclinic", label: "Notes finished after clinic instead of seeing patients", capture: "notes are finished after clinic", value: "notes finished after clinic" },
      { id: "betweenvisits", label: "Charting between visits slowing the schedule", capture: "charting between visits slows the schedule", value: "charting between visits" },
      { id: "inbox", label: "In-basket work crowding out slots", capture: "in-basket work crowds out slots", value: "in-basket crowding slots" },
      { id: "catchup", label: "Blocking time to catch up on documentation", capture: "time is blocked to catch up on documentation", value: "time blocked for documentation" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better access look like, and where do the freed slots go?",
  targetTeach: "In your words. This is where the recovered time lands.",
  targetLabel: "Where the freed slots go",
  targets: [
    { id: "backlog", label: "Opened slots for the backlog and new patients", capture: "opened slots go to the backlog and new patients", value: "the backlog and new patients" },
    { id: "sameday", label: "Same-day and next-day availability", capture: "opened slots go to same-day and next-day", value: "same-day and next-day availability" },
    { id: "panel", label: "A bigger panel you can carry", capture: "opened capacity grows the panel", value: "a bigger panel" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust. This becomes what the plan tracks.",
  successes: [
    { id: "thirdnext", label: "Third-next-available dropping", capture: "success looks like third-next-available dropping", value: "third-next-available dropping" },
    { id: "waitlist", label: "The wait-list getting shorter", capture: "success looks like the wait-list getting shorter", value: "the wait-list getting shorter" },
    { id: "fill", label: "Opened slots getting booked, not sitting empty", capture: "success looks like opened slots getting booked", value: "opened slots getting booked, not sitting empty" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. The lever is the freed clinician time turned into booked visits, so the ceiling is the demand you can point it at.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the real constraint is the front desk and referral workflow, which a better note does not fix, so documentation is not the main lever here.",
});

// ── Outpatient · Revenue Capture ─────────────────────────────────────────────
const outpatientRevenue = makeFoundation({
  setting: "outpatient",
  briefIntro: "You said revenue. Here is where it leaks today and where you want it to be.",
  roles: ["Revenue cycle and coding", "A CDI lead", "A service-line chief"],
  caveat: "The note improving only turns into revenue if coding acts on it and it survives the audit.",
  driversPrompt: "Where is the revenue leaking? It's rarely just one place.",
  driversTeach: "Naming each place sets what a better note can and cannot fix.",
  currentLabel: "Where the revenue is leaking",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "leveling", label: "Visits coding below the care delivered", capture: "visits coding below the care delivered", value: "visits coding below the care delivered", lever: { driverId: "wrvu", label: "wRVU and E/M Capture" } },
    { id: "denials", label: "Preventable medical-necessity denials", capture: "preventable medical-necessity denials", value: "preventable medical-necessity denials", lever: { driverId: "denialPrevention", label: "Medical-Necessity Denials" } },
    { id: "recapture", label: "Chronic conditions not recaptured each year (risk contracts)", capture: "chronic conditions not recaptured each year", value: "chronic conditions not recaptured", lever: { driverId: "hccCapture", label: "HCC Capture" } },
    { id: "downstream", label: "Mostly a downstream coding gap", capture: "a downstream coding gap, not the note", value: "a downstream coding gap", honest: true },
  ],
  connect: {
    prompt: "Where does the note actually fall short today?",
    teach: "The documentation gaps behind the leak. This is what a fuller note closes, and what the plan tracks.",
    label: "Where the note falls short",
    options: [
      { id: "complexity", label: "Visit complexity not fully reflected in the note", capture: "visit complexity is not fully reflected in the note", value: "under-documented visit complexity" },
      { id: "exam", label: "History and exam detail thin for the level", capture: "history and exam detail are thin for the level", value: "thin history and exam detail" },
      { id: "chronic", label: "Chronic conditions not addressed and documented each visit", capture: "chronic conditions are not re-documented each visit", value: "chronic conditions not re-documented" },
      { id: "mednec", label: "Medical necessity not clearly established", capture: "medical necessity is not clearly established", value: "medical necessity not established" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better look like?",
  targetTeach: "The direction you want to steer revenue.",
  targetLabel: "The change you want",
  targets: [
    { id: "level", label: "Visits coded at the level truly delivered", capture: "visits coded at the true level", value: "visits coded at the true level" },
    { id: "clean", label: "Fewer preventable denials", capture: "fewer preventable denials", value: "fewer preventable denials" },
    { id: "risk", label: "Chronic conditions captured accurately each year", capture: "accurate annual recapture", value: "accurate annual recapture" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust.",
  successes: [
    { id: "mix", label: "The E/M level mix shifting to match the work", capture: "success looks like the E/M mix matching the work", value: "the E/M mix matching the work" },
    { id: "denialrate", label: "The medical-necessity denial rate falling", capture: "success looks like the denial rate falling", value: "the denial rate falling" },
    { id: "recap", label: "The recapture rate climbing", capture: "success looks like the recapture rate climbing", value: "the recapture rate climbing" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. It only becomes revenue if coding acts on the fuller note and it survives the audit, so we size the share a complete note can defensibly support.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the miss is mostly downstream in coding, not the note, so we would track that rather than book it.",
});

// ── Retention (proof-first: tracked, not counted) ────────────────────────────
function retentionFoundation(opts: { setting: AttainSetting; who: string; driverId: string; briefIntro: string; roles: string[]; workloadLabel?: string; targets: FChoice[]; successes: FChoice[]; multi?: boolean; drivers?: FDriver[]; driversPrompt?: string; driversTeach?: string; connect?: FoundationSpec["connect"]; }): DiscoveryScript {
  return makeFoundation({
    setting: opts.setting,
    briefIntro: opts.briefIntro,
    roles: opts.roles,
    caveat: "Retention only moves if the recovered time is protected, not quietly refilled with more work.",
    proofLine: LEVER_LINE[opts.driverId],
    driversPrompt: opts.driversPrompt ?? `Why are ${opts.who} actually leaving today?`,
    driversTeach: opts.driversTeach ?? "Ambient documentation helps if the load is a real driver. If it is mostly pay or life elsewhere, a lighter day will not be the deciding factor, and we will say so.",
    currentLabel: "Why people are leaving",
    drivers: opts.drivers ?? [
      { id: "burden", label: "Burnout and documentation load", capture: "burnout and documentation load are driving turnover", value: "burnout and documentation load", proofDriverId: opts.driverId, proof: LEVER_LINE[opts.driverId] },
      { id: "workload", label: opts.workloadLabel ?? "Workload and pace", capture: "workload and pace are the driver", value: opts.workloadLabel ?? "workload and pace", proofDriverId: opts.driverId, proof: LEVER_LINE[opts.driverId] },
      { id: "paylife", label: "Mostly pay, or life elsewhere", capture: "the main driver is pay or life elsewhere, which documentation will not fix", value: "pay or life elsewhere", honest: true },
    ],
    multiDrivers: opts.multi, multiTargets: opts.multi, multiSuccess: opts.multi,
    connect: opts.connect,
    scaleLabel: "Today it is",
    targetPrompt: "What does better look like?",
    targetTeach: "The direction you want to steer retention.",
    targetLabel: "The change you want",
    targets: opts.targets,
    successPrompt: "What would tell you it's working?",
    successTeach: "The signal you would trust. This becomes what the plan tracks.",
    successes: opts.successes,
    bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes.",
    bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes. Retention shows up first as a proof signal: the replacement cost you avoid by keeping the people you have, counted only when you choose to. It only holds if the recovered time is protected, not refilled.",
    bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us people are leaving mostly for pay or life elsewhere, which a lighter day will not fix, so we would not build a retention case on documentation alone.",
  });
}

const outpatientRetention = retentionFoundation({
  setting: "outpatient", who: "providers", driverId: "providerWellbeing", multi: true,
  briefIntro: "You said retention. Here is what is driving people out today and where you want to be.",
  roles: ["Clinical leadership", "The medical group's people lead", "Department chiefs"],
  driversPrompt: "Why are providers actually leaving? Pick all that ring true.",
  driversTeach: "Ambient can move the documentation drivers; the rest we'll flag honestly and set aside.",
  drivers: [
    { id: "afterhours", label: "After-hours charting (pajama time)", capture: "after-hours charting is driving people out", value: "after-hours charting", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "inbox", label: "In-basket and inbox burden", capture: "the in-basket and inbox burden is a driver", value: "in-basket burden", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "pace", label: "Visit volume and pace", capture: "visit volume and pace are a driver", value: "visit volume and pace", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "newer", label: "Newer clinicians burning out early", capture: "newer clinicians are burning out early", value: "newer clinicians burning out early", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "paylife", label: "Pay, or life elsewhere", capture: "some leave for pay or life elsewhere, which documentation will not fix", value: "pay or life elsewhere", honest: true },
    { id: "culture", label: "Leadership, culture, or load beyond the note", capture: "leadership and culture are a driver documentation will not fix", value: "leadership and culture", honest: true },
  ],
  connect: {
    prompt: "Where does the documentation day show up for them?",
    teach: "The moments a lighter note would land. This is what we track once the plan is running.",
    label: "The documentation day",
    options: [
      { id: "athome", label: "Charting at home at night", capture: "they chart at home at night", value: "charting at home at night" },
      { id: "betweenpts", label: "Charting between patients instead of connecting", capture: "they chart between patients instead of connecting", value: "charting between patients" },
      { id: "inboxpile", label: "Inbox and results piling up", capture: "the inbox and results pile up", value: "inbox piling up" },
      { id: "weekend", label: "Catching up on notes over the weekend", capture: "they catch up on notes over the weekend", value: "weekend note catch-up" },
    ],
  },
  targets: [
    { id: "stay", label: "Keep the providers you have", capture: "keeping the providers you have", value: "keeping the providers you have" },
    { id: "lighter", label: "A sustainably lighter day", capture: "a sustainably lighter day", value: "a sustainably lighter day" },
    { id: "newer", label: "Hold onto newer clinicians", capture: "holding onto newer clinicians", value: "holding onto newer clinicians" },
  ],
  successes: [
    { id: "afterhours", label: "After-hours charting time falling", capture: "success looks like after-hours charting falling", value: "after-hours charting falling" },
    { id: "intent", label: "Fewer people signaling they're looking", capture: "success looks like fewer people looking to leave", value: "fewer people looking to leave" },
    { id: "turnover", label: "Turnover easing on the units you watch", capture: "success looks like turnover easing", value: "turnover easing" },
  ],
});

const edRetention = retentionFoundation({
  setting: "ed", who: "ED clinicians", driverId: "providerWellbeing", multi: true,
  briefIntro: "You said retention. In the ED the after-shift documentation tail is often the driver, but not always, so we gather the real picture.",
  roles: ["ED medical director", "Nursing and physician leadership", "The group's people lead"],
  driversPrompt: "Why are ED clinicians actually leaving? There's usually more than one.",
  driversTeach: "The after-shift tail is ours to move; boarding, nights and pay are not, and we'll say so.",
  drivers: [
    { id: "aftershift", label: "The after-shift charting tail", capture: "the after-shift charting tail is a driver", value: "the after-shift charting tail", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "pace", label: "Pace and patient volume per shift", capture: "pace and volume per shift are a driver", value: "pace and volume per shift", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "newer", label: "Newer attendings and APPs leaving early", capture: "newer attendings and APPs are leaving early", value: "newer attendings and APPs leaving early", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "boarding", label: "Boarding and moral injury", capture: "boarding and moral injury are a driver documentation will not fix", value: "boarding and moral injury", honest: true },
    { id: "nights", label: "Nights, weekends, and coverage burden", capture: "the schedule burden is a driver documentation will not fix", value: "nights and coverage burden", honest: true },
    { id: "paylife", label: "Pay, or life elsewhere", capture: "some leave for pay or life elsewhere, which documentation will not fix", value: "pay or life elsewhere", honest: true },
  ],
  connect: {
    prompt: "Where does the documentation day show up for them?",
    teach: "The moments a lighter note would land. This is what we track once the plan is running.",
    label: "The documentation day",
    options: [
      { id: "aftershiftcharts", label: "Finishing charts after the shift ends", capture: "they finish charts after the shift ends", value: "charts finished after the shift" },
      { id: "board", label: "Charting instead of managing the board", capture: "they chart instead of managing the board", value: "charting instead of the board" },
      { id: "disposition", label: "Disposition notes and discharge instructions piling up", capture: "disposition notes pile up", value: "disposition notes piling up" },
      { id: "signout", label: "Rushed sign-outs from the charting load", capture: "sign-outs are rushed by the charting load", value: "rushed sign-outs" },
    ],
  },
  targets: [
    { id: "stay", label: "Keep the attendings you have", capture: "keeping the attendings you have", value: "keeping the attendings you have" },
    { id: "lighter", label: "A lighter after-shift charting tail", capture: "a lighter after-shift tail", value: "a lighter after-shift tail" },
    { id: "coverage", label: "Hold coverage on nights and high-acuity", capture: "holding nights and high-acuity coverage", value: "holding nights and high-acuity coverage" },
  ],
  successes: [
    { id: "aftershift", label: "The after-shift charting tail shrinking", capture: "success looks like the after-shift tail shrinking", value: "the after-shift tail shrinking" },
    { id: "intent", label: "Fewer people signaling they're looking", capture: "success looks like fewer people looking to leave", value: "fewer people looking to leave" },
    { id: "turnover", label: "Turnover easing on the hardest rotations", capture: "success looks like turnover easing on the hardest rotations", value: "turnover easing on the hardest rotations" },
  ],
});

const inpatientRetention = retentionFoundation({
  setting: "inpatient", who: "hospitalists", driverId: "providerWellbeing", multi: true,
  briefIntro: "You said retention. For hospitalists the note load of the service is often the driver, but we gather the real picture first.",
  roles: ["Hospitalist group leadership", "The service medical director", "The people lead"],
  driversPrompt: "Why are hospitalists actually leaving? Mark each that fits.",
  driversTeach: "The note load is documentation's to lighten; census and the schedule are a different fix, honestly.",
  drivers: [
    { id: "noteload", label: "The note load of a full service", capture: "the note load of a full service is a driver", value: "the note load of a full service", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "rounding", label: "Documentation eating into rounding", capture: "documentation is eating into rounding", value: "documentation eating into rounding", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "newer", label: "Newer hospitalists leaving early", capture: "newer hospitalists are leaving early", value: "newer hospitalists leaving early", proofDriverId: "providerWellbeing", proof: LEVER_LINE["providerWellbeing"] },
    { id: "census", label: "High census and admissions volume", capture: "high census and volume are a driver documentation will not fully fix", value: "high census and volume", honest: true },
    { id: "schedule", label: "Nights, weekends, and the 7-on grind", capture: "the schedule grind is a driver documentation will not fix", value: "the schedule grind", honest: true },
    { id: "paylife", label: "Pay, or life elsewhere", capture: "some leave for pay or life elsewhere, which documentation will not fix", value: "pay or life elsewhere", honest: true },
  ],
  connect: {
    prompt: "Where does the documentation day show up for them?",
    teach: "The moments a lighter note would land. This is what we track once the plan is running.",
    label: "The documentation day",
    options: [
      { id: "afterrounds", label: "Notes finished long after rounds", capture: "notes are finished long after rounds", value: "notes finished after rounds" },
      { id: "duringrounds", label: "Charting during rounds instead of with patients", capture: "they chart during rounds instead of with patients", value: "charting during rounds" },
      { id: "admissions", label: "Admission and H&P documentation piling up", capture: "admission and H&P documentation piles up", value: "admission documentation piling up" },
      { id: "discharge", label: "Discharge summaries stacking up", capture: "discharge summaries stack up", value: "discharge summaries stacking up" },
    ],
  },
  targets: [
    { id: "stay", label: "Keep the hospitalists you have", capture: "keeping the hospitalists you have", value: "keeping the hospitalists you have" },
    { id: "lighter", label: "Note load that scales with a full census", capture: "a note load that fits a full census", value: "a note load that fits a full census" },
    { id: "newer", label: "Hold onto newer hospitalists", capture: "holding onto newer hospitalists", value: "holding onto newer hospitalists" },
  ],
  successes: [
    { id: "notetime", label: "Rounding time lost to notes falling", capture: "success looks like less rounding time lost to notes", value: "less rounding time lost to notes" },
    { id: "intent", label: "Fewer people signaling they're looking", capture: "success looks like fewer people looking to leave", value: "fewer people looking to leave" },
    { id: "turnover", label: "Turnover easing on high-census services", capture: "success looks like turnover easing on high-census services", value: "turnover easing on high-census services" },
  ],
});

const nursingRetentionScript = retentionFoundation({
  setting: "nursing", who: "nurses", driverId: "nursingRetention", multi: true,
  briefIntro: "You said retention. For nurses the charting that keeps them past the end of the shift is often the driver, but we gather the real picture first.",
  roles: ["Nursing leadership", "Unit managers", "The CNO's office"],
  // WHY they leave. Plural by nature, so name every one that is real.
  driversPrompt: "Why are nurses actually leaving? Name every one that's real.",
  driversTeach: "Some of it documentation can move, some it can't, and we'll sort which is which as you go.",
  drivers: [
    { id: "burden", label: "Charting that runs past the end of the shift", capture: "charting runs past the end of the shift", value: "charting past the shift", proofDriverId: "nursingRetention", proof: LEVER_LINE["nursingRetention"] },
    { id: "workload", label: "Workload and ratios", capture: "workload and ratios are a driver", value: "workload and ratios", proofDriverId: "nursingRetention", proof: LEVER_LINE["nursingRetention"] },
    { id: "cognitive", label: "Burnout and cognitive load", capture: "burnout and cognitive load are a driver", value: "burnout and cognitive load", proofDriverId: "nursingRetention", proof: LEVER_LINE["nursingRetention"] },
    { id: "firstyear", label: "New nurses overwhelmed early", capture: "new nurses are overwhelmed early", value: "new nurses overwhelmed early", proofDriverId: "nursingRetention", proof: LEVER_LINE["nursingRetention"] },
    { id: "paylife", label: "Pay, or life elsewhere", capture: "some leave for pay or life elsewhere, which documentation will not fix", value: "pay or life elsewhere", honest: true },
    { id: "schedule", label: "Scheduling and flexibility", capture: "scheduling and flexibility are a driver documentation will not fix", value: "scheduling and flexibility", honest: true },
  ],
  // CONNECT THE DOTS: the concrete documentation moments behind those reasons.
  connect: {
    prompt: "Where does the documentation day actually show up for them?",
    teach: "The moments a lighter note would land. This is what we track once the plan is running.",
    label: "The documentation day",
    options: [
      { id: "afterShift", label: "Charting after the shift ends", capture: "they chart after the shift ends", value: "charting after the shift" },
      { id: "duringCare", label: "Charting pulling them away from patients", capture: "charting pulls them from the bedside", value: "charting away from the bedside" },
      { id: "breaks", label: "Skipping breaks to catch up on notes", capture: "they skip breaks to catch up on notes", value: "skipped breaks to chart" },
      { id: "mentalLoad", label: "Carrying unfinished notes home in their head", capture: "they carry unfinished notes home", value: "unfinished notes on their mind" },
      { id: "handoff", label: "Rushed or incomplete handoffs", capture: "handoffs are rushed by the charting load", value: "rushed handoffs" },
    ],
  },
  // Retention is the PEOPLE story: who you keep. The hours/overtime outcomes live
  // in Capacity, so they are deliberately not repeated here.
  targets: [
    { id: "stay", label: "Keep the nurses you have", capture: "keeping the nurses you have", value: "keeping the nurses you have" },
    { id: "firstyear", label: "Hold onto first-year nurses", capture: "holding onto first-year nurses", value: "holding onto first-year nurses" },
    { id: "reputation", label: "Be a unit nurses want to stay on", capture: "becoming a unit nurses want to stay on", value: "a unit nurses want to stay on" },
    { id: "agencyoff", label: "Lean off travel and agency coverage", capture: "leaning off travel and agency as retention stabilizes", value: "leaning off travel and agency" },
  ],
  successes: [
    { id: "turnover", label: "Turnover easing on high-ratio units", capture: "success looks like turnover easing on high-ratio units", value: "turnover easing on high-ratio units" },
    { id: "intent", label: "Fewer nurses signaling they're looking", capture: "success looks like fewer nurses signaling they're looking", value: "fewer nurses signaling they're looking" },
    { id: "firstyearstay", label: "First-year nurses staying past year one", capture: "success looks like first-year nurses staying past year one", value: "first-year nurses staying past year one" },
    { id: "engagement", label: "Engagement scores rising", capture: "success looks like engagement scores rising", value: "engagement scores rising" },
    { id: "agency", label: "Less reliance on travel and agency", capture: "success looks like less reliance on travel and agency", value: "less reliance on travel and agency" },
  ],
});

// ── ED · Patient Access (throughput) ─────────────────────────────────────────
const edAccess = makeFoundation({
  setting: "ed",
  briefIntro: "You said access. In the ED that is throughput: getting patients seen before they leave. Here is your current picture and your target.",
  roles: ["ED operations", "Charge-nurse leadership", "The ED medical director"],
  caveat: "Freed charting time only becomes throughput if someone works the board and the back end can absorb a faster front end.",
  driversPrompt: "Where is the throughput bottleneck? Call out all that fit.",
  driversTeach: "Only the front-end charting load is Abridge's to move. Name the rest too, so we separate it honestly.",
  currentLabel: "The bottleneck today",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "docload", label: "The charting load on providers", capture: "the charting load is part of the bottleneck", value: "the front-end charting load", lever: { driverId: "lwbsRecovery", label: "LWBS Recovery" } },
    { id: "frontend", label: "Front-end intake and triage", capture: "front-end intake and triage, which documentation does not fix", value: "front-end intake and triage", honest: true },
    { id: "provider", label: "Not enough providers to cover the front", capture: "front-end provider staffing is short, which documentation does not fix", value: "short front-end provider staffing", honest: true },
    { id: "boarding", label: "Back-end boarding and disposition", capture: "the bottleneck is back-end boarding, which documentation does not fix", value: "back-end boarding and disposition", honest: true },
  ],
  connect: {
    prompt: "Where does the charting load slow the front end today?",
    teach: "The moments a lighter note frees back for the board. This is what the plan tracks.",
    label: "Where charting slows the board",
    options: [
      { id: "nextpt", label: "Charting instead of picking up the next patient", capture: "providers chart instead of picking up the next patient", value: "charting instead of the next patient" },
      { id: "board", label: "Time at the computer instead of working the board", capture: "time goes to the computer instead of the board", value: "time on the computer, not the board" },
      { id: "dispo", label: "Disposition notes slowing patient turnover", capture: "disposition notes slow turnover", value: "dispo notes slowing turnover" },
      { id: "endshift", label: "Charts finished at end of shift, not in the moment", capture: "charts are finished at end of shift, not in the moment", value: "charts finished at end of shift" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better throughput look like?",
  targetTeach: "The direction you want to steer flow.",
  targetLabel: "The change you want",
  targets: [
    { id: "lwbs", label: "Fewer patients leaving without being seen", capture: "fewer left-without-being-seen", value: "fewer left-without-being-seen" },
    { id: "door", label: "Faster door-to-provider", capture: "faster door-to-provider", value: "faster door-to-provider" },
    { id: "admissions", label: "Capture admissions you lose to diversion", capture: "capturing admissions lost to diversion", value: "capturing lost admissions" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust. This becomes what the plan tracks.",
  successes: [
    { id: "lwbsrate", label: "The LWBS rate falling", capture: "success looks like the LWBS rate falling", value: "the LWBS rate falling" },
    { id: "dtp", label: "Door-to-provider time dropping", capture: "success looks like door-to-provider dropping", value: "door-to-provider dropping" },
    { id: "board", label: "The front-end board moving faster", capture: "success looks like the front-end board moving faster", value: "the front-end board moving faster" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. Freed charting time only becomes throughput if someone works the board, so the ceiling is the share of the delay that is documentation.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the real bottleneck is back-end boarding, which freeing charting time does not fix.",
});

// ── ED · Revenue Capture ─────────────────────────────────────────────────────
const edRevenue = makeFoundation({
  setting: "ed",
  briefIntro: "You said revenue. In the ED that is the acuity you code or the denials you prevent. Here is where it leaks and where you want it.",
  roles: ["Revenue cycle and coding", "The ED medical director", "A CDI lead"],
  caveat: "The note improving only turns into revenue if coding acts on it and it survives the audit.",
  driversPrompt: "Where is the ED revenue leaking? Pick each that's real.",
  driversTeach: "Only what a more complete note can defensibly support is ours to size. Most EDs leak in more than one place.",
  currentLabel: "Where the revenue is leaking",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "coding", label: "Acuity coded below what you treat", capture: "acuity coded below what you treat", value: "acuity under-coded", lever: { driverId: "edEmLevel", label: "ED E/M Accuracy" } },
    { id: "denials", label: "Preventable medical-necessity denials", capture: "preventable medical-necessity denials", value: "preventable medical-necessity denials", lever: { driverId: "denialPrevention", label: "Medical-Necessity Denials" } },
    { id: "eligibility", label: "Front-end eligibility or registration denials", capture: "front-end eligibility denials, which the note cannot fix", value: "front-end eligibility denials", honest: true },
    { id: "downstream", label: "Mostly downstream in coding", capture: "the miss is mostly downstream in coding", value: "a downstream coding gap", honest: true },
  ],
  connect: {
    prompt: "Where does the note actually fall short today?",
    teach: "The documentation gaps behind the leak. This is what a fuller note closes, and what the plan tracks.",
    label: "Where the note falls short",
    options: [
      { id: "acuity", label: "Acuity and complexity under-documented for the level", capture: "acuity and complexity are under-documented for the level", value: "under-documented acuity" },
      { id: "mdm", label: "Medical decision-making not fully captured", capture: "medical decision-making is not fully captured", value: "thin medical decision-making" },
      { id: "procedures", label: "Procedures and critical-care time not captured", capture: "procedures and critical-care time are not captured", value: "uncaptured procedures and critical-care time" },
      { id: "mednec", label: "Medical necessity thin for the visit", capture: "medical necessity is thin for the visit", value: "thin medical necessity" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better look like?",
  targetTeach: "The direction you want to steer ED revenue.",
  targetLabel: "The change you want",
  targets: [
    { id: "level", label: "Visits coded for the acuity actually treated", capture: "visits coded for true acuity", value: "visits coded for true acuity" },
    { id: "clean", label: "Fewer preventable denials", capture: "fewer preventable denials", value: "fewer preventable denials" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust.",
  successes: [
    { id: "emmix", label: "The E/M level mix matching acuity", capture: "success looks like the E/M mix matching acuity", value: "the E/M mix matching acuity" },
    { id: "denialrate", label: "The denial rate falling", capture: "success looks like the denial rate falling", value: "the denial rate falling" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. It only becomes revenue if coding acts on the fuller note and it survives the audit, so we size the defensible share.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the miss is front-end or downstream, which a better note does not fix.",
});

// ── Inpatient · Capacity (discharge timing, proof-play) ──────────────────────
const inpatientCapacity = makeFoundation({
  setting: "inpatient",
  briefIntro: "You said capacity. Inpatient, that is earlier discharges and faster bed turns, tracked as an operational win. Here is your current picture and your target.",
  roles: ["Hospital operations and capacity", "Case management", "The hospitalist medical director"],
  caveat: "Earlier orders only turn beds if case management can act on them. If placement is the real gate, documentation will not move it.",
  proofLine: "earlier discharge orders and faster bed turns, tracked as an operational capacity gain.",
  driversPrompt: "What actually holds the discharge? Usually several are in play.",
  driversTeach: "Freed charting time only turns beds if the note is part of what holds the order. So we separate it from placement, honestly.",
  currentLabel: "What holds the discharge",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "notelag", label: "The discharge note or summary lags the decision", capture: "the discharge note lags the decision to discharge", value: "the discharge-note lag", proofDriverId: "ipLengthOfStay" },
    { id: "rounding", label: "Rounding and progress notes finished late in the day", capture: "rounding and progress notes are finished late", value: "late rounding notes", proofDriverId: "ipLengthOfStay" },
    { id: "placement", label: "Placement, auth, or consults", capture: "the delay is placement and auth, which documentation does not fix", value: "placement, auth, and consults", honest: true },
  ],
  connect: {
    prompt: "Where does the documentation actually hold things up?",
    teach: "The moments a faster note would land. This is what the plan tracks.",
    label: "Where the note holds the day",
    options: [
      { id: "summarylate", label: "Discharge summary written late in the day", capture: "discharge summaries are written late in the day", value: "late discharge summaries" },
      { id: "orderswait", label: "Orders waiting on the note to be finished", capture: "orders wait on the note to be finished", value: "orders waiting on the note" },
      { id: "afternoon", label: "Notes piling up until the afternoon", capture: "notes pile up until the afternoon", value: "an afternoon note backlog" },
      { id: "handoff", label: "Handoff and med rec slowed by documentation", capture: "handoff and med rec are slowed by documentation", value: "documentation-slowed handoffs" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better capacity look like?",
  targetTeach: "The direction you want to steer discharge timing.",
  targetLabel: "The change you want",
  targets: [
    { id: "beforenoon", label: "More discharges before noon", capture: "more discharges before noon", value: "more discharges before noon" },
    { id: "earlier", label: "Discharge orders written earlier in the day", capture: "earlier discharge orders", value: "earlier discharge orders" },
    { id: "rounding", label: "Rounding time back for hospitalists", capture: "rounding time back", value: "rounding time back" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust. This becomes what the plan tracks.",
  successes: [
    { id: "dbn", label: "Discharge-before-noon rate climbing", capture: "success looks like discharge-before-noon climbing", value: "discharge-before-noon climbing" },
    { id: "turnaround", label: "Discharge-summary turnaround shortening", capture: "success looks like faster discharge-summary turnaround", value: "faster discharge-summary turnaround" },
    { id: "bedturn", label: "Beds turning sooner", capture: "success looks like beds turning sooner", value: "beds turning sooner" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes. Inpatient capacity is tracked as an operational gain rather than booked as a hard dollar, and earlier orders only turn beds if case management can act on them.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the real gate is placement and auth, which documentation does not move.",
});

// ── Inpatient · Revenue Capture (DRG / OBS / CDI) ────────────────────────────
const inpatientRevenue = makeFoundation({
  setting: "inpatient",
  briefIntro: "You said revenue. Inpatient, that forks into the DRG weight you earn, the status you defend, and the CDI query load. Here is where it leaks and where you want it.",
  roles: ["CDI leadership", "Revenue cycle and coding", "The hospitalist medical director"],
  caveat: "The note improving only turns into revenue if CDI and coding act on it and it survives the audit.",
  driversPrompt: "Where is inpatient revenue leaking? Flag all that apply.",
  driversTeach: "Three different plays, each with its own honesty test. Most hospitals leak in more than one at once.",
  currentLabel: "Where the revenue is leaking",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "drg", label: "The DRG weight the acuity earns is slipping", capture: "the DRG weight the acuity earns is slipping", value: "DRG weight slipping", lever: { driverId: "drgAccuracy", label: "Case Mix (DRG Accuracy)" } },
    { id: "obs", label: "Inpatient status getting downgraded", capture: "inpatient status getting downgraded", value: "status downgrades", lever: { driverId: "obsDefense", label: "Status / Medical-Necessity Denials" } },
    { id: "cdi", label: "A heavy CDI query load", capture: "a heavy CDI query load", value: "a heavy CDI query load", proof: "a lighter, faster CDI query load: a labor and throughput win tracked rather than booked as DRG dollars." },
    { id: "downstream", label: "Mostly downstream or payer pushback", capture: "the gap is mostly downstream or payer pushback", value: "downstream or payer pushback", honest: true },
  ],
  // Connect the dots: the documentation gaps behind the leak — what a fuller note closes.
  connect: {
    prompt: "Where does the note actually fall short today?",
    teach: "The documentation gaps behind the leak. This is what a fuller note closes, and what the plan tracks.",
    label: "Where the note falls short",
    options: [
      { id: "specificity", label: "Comorbidities and complications under-specified", capture: "comorbidities and complications are under-specified", value: "under-specified comorbidities" },
      { id: "acuity", label: "Severity and acuity not captured at the point of care", capture: "severity and acuity are not captured at the point of care", value: "acuity not captured at the point of care" },
      { id: "status", label: "The rationale for inpatient status is thin", capture: "the rationale for inpatient status is thin", value: "thin status rationale" },
      { id: "queries", label: "CDI and coders chasing detail that should be in the note", capture: "CDI and coders chase detail that should be in the note", value: "queries chasing missing detail" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better look like?",
  targetTeach: "The direction you want to steer inpatient revenue.",
  targetLabel: "The change you want",
  targets: [
    { id: "severity", label: "DRG weight that reflects the acuity", capture: "DRG weight matching acuity", value: "DRG weight matching acuity" },
    { id: "defend", label: "Inpatient status you can defend", capture: "defensible inpatient status", value: "defensible inpatient status" },
    { id: "lighter", label: "A lighter, faster query load", capture: "a lighter query load", value: "a lighter query load" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust.",
  successes: [
    { id: "cmi", label: "Case-mix index matching acuity", capture: "success looks like CMI matching acuity", value: "CMI matching acuity" },
    { id: "ccmcc", label: "CC/MCC capture climbing", capture: "success looks like CC/MCC capture climbing", value: "CC/MCC capture climbing" },
    { id: "query", label: "Query turnaround shortening", capture: "success looks like faster query turnaround", value: "faster query turnaround" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. It only becomes revenue if CDI and coding act on the fuller note and it survives the audit, so we size the defensible share.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes. The query-load win is tracked as a labor and throughput gain rather than booked as DRG dollars.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the gap is downstream or payer pushback, which a better note does not fix.",
});

// ── Nursing · Capacity (overtime) ────────────────────────────────────────────
const nursingCapacity = makeFoundation({
  setting: "nursing",
  briefIntro: "You said capacity. In nursing that is the documentation-driven overtime you can stop paying, and the time it puts back at the bedside.",
  roles: ["Nursing operations", "Unit managers", "Finance, for the overtime line"],
  caveat: "Freed minutes only cut overtime if they are protected, not absorbed by a heavier assignment.",
  driversPrompt: "Where is the overtime coming from? Most name more than one.",
  driversTeach: "Overtime has a few sources, and Abridge only moves one: the charting. We'll size only the documentation share.",
  currentLabel: "Mostly driven by",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "postshift", label: "Nurses finishing charting after the shift ends", capture: "overtime shows up as post-shift charting", value: "post-shift charting", lever: { driverId: "nursingOvertime", label: "Overtime Spend" } },
    { id: "batching", label: "Charting piles up during the day and spills over", capture: "charting batches up during the day and spills into overtime", value: "charting that batches up during the day", lever: { driverId: "nursingOvertime", label: "Overtime Spend" } },
    { id: "shortstaff", label: "Open positions and short-staffing", capture: "overtime is largely open positions and short-staffing", value: "open positions and short-staffing", honest: true },
    { id: "census", label: "Census and acuity spikes", capture: "overtime is largely census and acuity spikes", value: "census and acuity spikes", honest: true },
  ],
  connect: {
    prompt: "Where do the overtime minutes actually go?",
    teach: "The mechanics behind the hours, not the reasons again. This is what the plan tracks.",
    label: "Where the minutes go",
    options: [
      { id: "interruptions", label: "Charting redone after interruptions", capture: "charting is redone after interruptions", value: "charting redone after interruptions" },
      { id: "flowsheets", label: "Flowsheets and repetitive documentation", capture: "flowsheets and repetitive documentation add up", value: "heavy flowsheet documentation" },
      { id: "doublecharting", label: "Double-charting the same thing across systems", capture: "the same thing is charted across systems", value: "double-charting across systems" },
      { id: "workstation", label: "Hunting for an open workstation to chart", capture: "time goes to hunting for a workstation", value: "hunting for a workstation" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better look like?",
  targetTeach: "The direction you want to steer overtime.",
  targetLabel: "The change you want",
  // Capacity is the HOURS/DOLLARS story: the paid overtime you stop buying and the
  // time it returns to the bedside. Agency/travel savings ride with Retention (the
  // ROI books them there), so they are not claimed here.
  targets: [
    { id: "inshift", label: "Charting done in-shift, so nurses leave on time", capture: "the target is charting done in-shift so nurses leave on time", value: "charting done in-shift, so nurses leave on time" },
    { id: "runrate", label: "Overtime down to a lower run-rate", capture: "the target is a lower overtime run-rate", value: "a lower overtime run-rate" },
    { id: "bedside", label: "More of that time back at the bedside", capture: "the target is time back at the bedside", value: "time back at the bedside" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust. This becomes what the plan tracks.",
  successes: [
    { id: "clockout", label: "Nurses clocking out on time", capture: "success looks like nurses clocking out on time", value: "nurses clocking out on time" },
    { id: "othours", label: "Overtime hours falling on the report", capture: "success looks like overtime hours falling on the report", value: "overtime hours falling on the report" },
    { id: "chartingtime", label: "Charting time per shift falling", capture: "success looks like charting time per shift falling", value: "charting time per shift falling" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. The piece Abridge moves is the charting, so the ceiling is the share of overtime that is documentation, not staffing or census.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the overtime is mostly staffing and census, which a better note does not fix, so the documentation-attributable piece here is modest.",
});

// ── Nursing · Revenue (supporting play, proof) ───────────────────────────────
const nursingRevenue = makeFoundation({
  setting: "nursing",
  briefIntro: "You said revenue. Nursing documentation supports charge capture and the acuity picture, a supporting role rather than a primary Abridge revenue lever.",
  roles: ["Nursing leadership", "Nursing informatics", "Revenue cycle and coding"],
  caveat: "Charges only land if capture is reconciled to the documentation. The primary revenue levers live with the providers.",
  proofLine: "more complete, timely nursing documentation that supports charge capture and acuity, tracked as a supporting signal rather than booked as a primary dollar.",
  driversPrompt: "Where does nursing documentation touch revenue? Choose any that matter here.",
  driversTeach: "Be clear-eyed: nursing documentation supports capture, it rarely drives it.",
  currentLabel: "Where documentation touches revenue",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "charges", label: "Charge capture for interventions and supplies", capture: "supporting charge capture for interventions and supplies", value: "charge capture for interventions and supplies", proof: "supporting charge capture, tracked as a signal rather than booked as a primary dollar." },
    { id: "acuity", label: "The acuity and status picture coders rely on", capture: "supporting the acuity and status picture", value: "the acuity and status picture", proof: "supporting the acuity picture, tracked as a signal rather than booked as a primary dollar." },
    { id: "reconcile", label: "Downstream charge reconciliation", capture: "the gap is downstream charge reconciliation, not the nursing documentation", value: "downstream charge reconciliation", honest: true },
  ],
  connect: {
    prompt: "Where does nursing documentation fall short today?",
    teach: "The documentation gaps behind the capture. This is what a fuller note supports, and what the plan tracks.",
    label: "Where the note falls short",
    options: [
      { id: "interventions", label: "Interventions and supplies not consistently documented", capture: "interventions and supplies are not consistently documented", value: "under-documented interventions" },
      { id: "timing", label: "Charting done late, after the charge window", capture: "charting is done late, after the charge window", value: "late charting past the charge window" },
      { id: "acuity", label: "Acuity and severity not captured for coders", capture: "acuity and severity are not captured for coders", value: "acuity not captured for coders" },
      { id: "flowsheet", label: "Flowsheet detail thin for what was done", capture: "flowsheet detail is thin for what was done", value: "thin flowsheet detail" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better look like?",
  targetTeach: "The direction you want to steer this supporting play.",
  targetLabel: "The change you want",
  targets: [
    { id: "capture", label: "More complete charge capture", capture: "more complete charge capture", value: "more complete charge capture" },
    { id: "picture", label: "A clearer acuity picture for coders", capture: "a clearer acuity picture for coders", value: "a clearer acuity picture for coders" },
    { id: "timely", label: "Charges captured in the right window", capture: "charges captured in the right window", value: "charges captured in the window" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust.",
  successes: [
    { id: "reconciled", label: "Charges reconciled to the documentation", capture: "success looks like charges reconciled to the documentation", value: "charges reconciled to the documentation" },
    { id: "fewer", label: "Fewer missed charges", capture: "success looks like fewer missed charges", value: "fewer missed charges" },
    { id: "window", label: "Fewer late or missed charge windows", capture: "success looks like fewer missed charge windows", value: "fewer missed charge windows" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes. Nursing documentation plays a supporting role here, tracked as a signal rather than booked as a primary dollar; the primary revenue levers live with the providers.",
  bridgeHonest: "The gap between these is what the ROI sizes next. Straight talk: you told us the gap is downstream charge reconciliation, not the nursing documentation.",
});

// ── Nursing · Quality & Safety (counted for falls/sepsis; proof for HAPI/CLABSI)
const nursingQuality = makeFoundation({
  setting: "nursing",
  briefIntro: "You said quality. In nursing this is the one place documentation time most directly supports the safety measures you can actually cost.",
  roles: ["Nursing quality", "Unit managers", "Infection prevention"],
  caveat: "A timely chart only helps if someone acts at the bedside. The freed time has to reach the room.",
  driversPrompt: "Which safety outcomes are you focused on? Pick all that hold true.",
  driversTeach: "Each carries different documentation leverage. A real-time note moves fall-risk and sepsis timing most, though sepsis is a whole-team bundle where nursing owns early recognition. Pressure injuries and central lines are more a turn-schedule and staffing story, so we track those rather than book them.",
  currentLabel: "The safety outcomes",
  multiDrivers: true, multiTargets: true, multiSuccess: true,
  drivers: [
    { id: "falls", label: "Falls with injury", capture: "reducing falls with injury", value: "falls with injury", lever: { driverId: "nursingFalls", label: "Patient Falls" } },
    { id: "sepsis", label: "Sepsis caught late", capture: "catching sepsis earlier", value: "late sepsis recognition", lever: { driverId: "nursingSepsis", label: "Sepsis Bundle (SEP-1)" } },
    { id: "hapi", label: "Pressure injuries", capture: "reducing pressure injuries", value: "pressure injuries", proof: "supporting pressure-injury documentation, mostly a turn-schedule and staffing story, tracked rather than booked." },
    { id: "clabsi", label: "Central-line infections", capture: "reducing central-line infections", value: "central-line infections", proof: "supporting central-line documentation, the smallest documentation lever of the four, tracked rather than booked." },
  ],
  connect: {
    prompt: "Where does documentation touch these outcomes today?",
    teach: "The documentation moments tied to the measure. This is what the plan tracks.",
    label: "Where documentation touches it",
    options: [
      { id: "assessment", label: "Risk assessments documented late or missed", capture: "risk assessments are documented late or missed", value: "late risk assessments" },
      { id: "response", label: "The response not documented in time", capture: "the response is not documented in time", value: "late response documentation" },
      { id: "handoff", label: "Risk not carried across the handoff", capture: "risk is not carried across the handoff", value: "risk lost at handoff" },
      { id: "reassessment", label: "Reassessments not captured on schedule", capture: "reassessments are not captured on schedule", value: "off-schedule reassessments" },
    ],
  },
  scaleLabel: "Today it is",
  targetPrompt: "What does better look like?",
  targetTeach: "The direction you want to steer safety.",
  targetLabel: "The change you want",
  targets: [
    { id: "fewer", label: "Fewer safety events", capture: "fewer safety events", value: "fewer safety events" },
    { id: "earlier", label: "Earlier recognition and response", capture: "earlier recognition and response", value: "earlier recognition and response" },
    { id: "protocols", label: "Tighter protocol adherence", capture: "tighter protocol adherence", value: "tighter protocol adherence" },
  ],
  successPrompt: "What would tell you it's working?",
  successTeach: "The signal you would trust. This becomes what the plan tracks.",
  successes: [
    { id: "rate", label: "The event rate falling", capture: "success looks like the event rate falling", value: "the event rate falling" },
    { id: "response", label: "Faster documented response times", capture: "success looks like faster documented response", value: "faster documented response times" },
    { id: "compliance", label: "Protocol compliance climbing", capture: "success looks like protocol compliance climbing", value: "protocol compliance climbing" },
  ],
  bridgeDoc: "The gap between these is what the ROI sizes next, and the Plan closes. Nursing quality is the one place documentation time most directly supports the safety measures you can cost, and it only moves if the freed time reaches the bedside.",
  bridgeProof: "The gap between these is what the ROI sizes next, and the Plan closes. This one is tracked as a safety measure rather than booked as a hard dollar, since it is mostly a staffing and protocol story.",
  bridgeHonest: "The gap between these is what the ROI sizes next, and the Plan closes.",
});

export const DISCOVERY: Partial<Record<AttainSetting, Partial<Record<GoalId, DiscoveryScript>>>> = {
  outpatient: { access: outpatientAccess, revenue: outpatientRevenue, retention: outpatientRetention },
  ed: { access: edAccess, retention: edRetention, revenue: edRevenue },
  inpatient: { capacity: inpatientCapacity, retention: inpatientRetention, revenue: inpatientRevenue },
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
  lever?: DiscoveryLever; // the PRIMARY counted lever (= levers[0]); kept for back-compat
  levers: DiscoveryLever[]; // EVERY counted lever picked (multi-select can name several, e.g. DRG + status)
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
  const leverMap = new Map<string, DiscoveryLever>(); // dedup counted levers by driverId, path order
  const addLever = (l: DiscoveryLever) => { if (!leverMap.has(l.driverId)) leverMap.set(l.driverId, l); };
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
    if (q.multi) {
      // A multi step: fold in every chosen option. All options share one next.
      const chosen = q.options.filter((o) => answers[`${goal}:${qid}:${o.id}`] === "1");
      if (chosen.length === 0) break; // not answered yet
      for (const o of chosen) {
        if (o.capture) narrative.push(o.capture);
        if (o.lever) addLever(o.lever);
        if (o.proof) proof = o.proof;
        if (o.proofDriverId) proofDriverId = o.proofDriverId;
        if (o.honest) honest = true;
      }
      qid = q.options[0].next;
      if (qid === BRIEF) complete = true;
      continue;
    }
    const chosen = answers[`${goal}:${qid}`];
    const opt = q.options.find((o) => o.id === chosen);
    if (!opt) break; // not answered yet
    if (opt.capture) narrative.push(opt.capture);
    if (opt.lever) addLever(opt.lever);
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
  // ...but only when the honest-out stands ALONE. On a multi step a partner can name a
  // documentation driver AND an honest-out ("some leave for pay too"); the documentation
  // case still holds, so a real lever/proof driver survives beside it. When it stands
  // alone (no lever, no proof) the levers map is already empty, so nothing to wipe.
  const levers = Array.from(leverMap.values());
  return { goal, narrative, lever: levers[0], levers, proof, proofDriverId, honest, complete };
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
    picks: (qid) => {
      const q = getScript(setting, goal)?.questions[qid];
      if (!q) return [];
      return q.options.filter((o) => answers[`${goal}:${qid}:${o.id}`] === "1").map((o) => o.id);
    },
    ground: (gid) => answers[`_ground:${gid}`],
    narrative: res?.narrative ?? [],
    lever: res?.lever,
    proof: res?.proof,
    honest: !!res?.honest,
    goalLabel: goalDisplayLabel(setting, goal),
    settingLabel,
  };
}
/** A generic synthesized paragraph for a goal. Kept as the coherence guard the
 * integrity suite asserts against (the brief itself renders the foundation). */
export function briefThesis(setting: AttainSetting, goal: GoalId, settingLabel: string, answers: DiscoveryAnswers): string {
  const script = getScript(setting, goal);
  if (!script) return "";
  return genericThesis(ctxFor(setting, goal, settingLabel, answers));
}
/** Who should be at the table. */
export function briefRoles(setting: AttainSetting, goal: GoalId): string[] {
  const script = getScript(setting, goal);
  if (!script) return [];
  return [...script.roles];
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
export interface GroundingQuestion { id: string; eyebrow: string; prompt: string; teach: string; options: GroundingOption[]; multi?: boolean }

// What's already in place, per setting. Kept SETTING-NATIVE (same discipline as
// goalDisplayLabel): a nursing leader has agency/float-pool and self-scheduling,
// not CDI and scribes, so the shelf must reflect that buyer's world or the step
// silently signals "this wasn't built for you". "nothing" stays a shared id so
// the UI can treat it as the exclusive "clear the rest" choice.
const PHYSICIAN_TRIED: GroundingOption[] = [
  { id: "cdi", label: "A CDI or coding program", capture: "a CDI or coding program is in place" },
  { id: "scribes", label: "Scribes", capture: "scribes are in use" },
  { id: "ambient", label: "Another ambient or voice tool", capture: "another ambient tool is in use" },
  { id: "templates", label: "Note templates and smart phrases", capture: "note templates and smart phrases are in use" },
  { id: "nothing", label: "Nothing formal yet", capture: "nothing formal is in place yet" },
];
const TRIED_BY_SETTING: Record<AttainSetting, GroundingOption[]> = {
  outpatient: PHYSICIAN_TRIED,
  ed: PHYSICIAN_TRIED,
  inpatient: PHYSICIAN_TRIED,
  nursing: [
    { id: "agency", label: "Agency or travel nurses and a float pool", capture: "agency/travel staff and a float pool are in use" },
    { id: "scheduling", label: "Self-scheduling or flexible shifts", capture: "self-scheduling or flexible shifts are in place" },
    { id: "flowsheet", label: "A flowsheet or charting-burden effort", capture: "a flowsheet/charting-burden effort is underway" },
    { id: "wellness", label: "A wellness or burnout program", capture: "a wellness or burnout program is in place" },
    { id: "ambient", label: "Another ambient or voice tool", capture: "another ambient tool is in use" },
    { id: "nothing", label: "Nothing formal yet", capture: "nothing formal is in place yet" },
  ],
};

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
      prompt: "What's already in place here?",
      teach: "What is already running changes how much headroom is left, so we do not double-count work you have already done. Pick any that apply.",
      options: TRIED_BY_SETTING[setting],
      multi: true,
    },
  ];
}

// ── free-text "add your own" notes (concepts to consider; never counted) ──────
// Stored as `_note:${goal}:${qid}` and `_note:_ground:${qid}`. These reflect in
// the brief, the ledger, and the PDF, but pin no lever, so they never enter the ROI.
export function goalNotes(setting: AttainSetting, goal: GoalId, answers: DiscoveryAnswers): string[] {
  const script = getScript(setting, goal);
  if (!script) return [];
  return Object.keys(script.questions)
    .map((qid) => answers[`_note:${goal}:${qid}`])
    .filter((v): v is string => !!v && !!v.trim())
    .map((v) => v.trim());
}
export function groundingNotes(setting: AttainSetting, answers: DiscoveryAnswers): string[] {
  return groundingQuestions(setting)
    .map((q) => answers[`_note:_ground:${q.id}`])
    .filter((v): v is string => !!v && !!v.trim())
    .map((v) => v.trim());
}

