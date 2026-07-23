/**
 * Attain — QUALITY & SAFETY (nursing) Align config: THE HONEST EXCEPTION.
 *
 * Quality does not produce a clean ROI like the financial drivers, so this
 * config is deliberately shaped differently from Revenue / Access / Workforce:
 * SAFETY and EXPERIENCE lead, and the dollar (cost of harm avoided) is a SOFT,
 * clearly-labeled footnote, never the hero number. The hero is HARM EVENTS
 * PREVENTED, a count, not a big coral dollar.
 *
 * Same MULTI-EVENT stacking scaffold Revenue uses: Q1 selects the harm events
 * (plus HCAHPS, patient experience), and the per-event gate + "what will you
 * change" questions stack into one clean section each.
 *
 * THE ENGINE UNDERNEATH IS UNCHANGED. Every choice maps onto the exact same
 * `LeverValues` the quality chain already reads — `qualityEventTypes` (the
 * selected clinical events), `qualityBeds` / `qualityLines` (scope), and each
 * event's own named intervention 0/1 keys — so the derived number still runs
 * through `deriveQualityLadder` and reconciles to `computeAllDriverValues`.
 * Quality keeps its honest per-event ceilings and its 30% attribution default
 * (`defaultRealizationPct("quality")`, applied in the side panel and threaded
 * in here as `realizationPct`). Nothing about the dollar math changes.
 *
 * THE CRITICAL RULE (contract Q4). Every "what will you change" option is a
 * CONVERSION OF ONE OF ABRIDGE'S TWO BENEFITS, never a generic clinical bundle:
 *   (a) freed bedside time (TIME) — redeploy the minutes Abridge frees into
 *       more rounding / more eyes on high-risk patients, and (for HCAHPS)
 *       protect the face-to-face presence that time buys;
 *   (b) earlier + more complete risk documentation (DOCUMENTATION) — act on a
 *       risk the note surfaces sooner (a dizziness note, a skin note, an early
 *       deterioration sign), and tighten shift handoffs on the fuller real-time
 *       notes.
 * There is NO equipment purchase and NO standalone bundle item on the Align
 * surface (the moves with no Abridge in them, which let a skeptic ask "how is
 * Abridge impacting this"). Each conversion the partner commits to maps to the
 * SUBSET of
 * that event's engine interventions the freed time and earlier signal actually
 * enable (never the equipment-only ones), so the prevention the engine credits
 * is only ever what Abridge's role legitimately unlocks ON TOP of the unit's
 * existing bundle. A skeptic can trace every credited event back to freed time
 * or an earlier note.
 *
 * The honest gate (Q3) is a genuine precondition, not decoration: it asks how
 * much of each event is preventable by catching the risk EARLIER (Abridge's
 * part) versus happens despite good care, and it SCALES how much of the
 * committed conversions the engine credits. "Mostly happens despite good care"
 * commits nothing (an honest near-zero for that event); "a meaningful share"
 * commits about half of the enabled changes; "mostly preventable by catching it
 * earlier" commits them fully. The per-event literature ceiling and the 30%
 * attribution still cap it on top of that, so the number stays defensible.
 *
 * HCAHPS is NEW and has no engine harm-event: its value is primarily the
 * patient-experience improvement, which does not price. It never contributes a
 * hard dollar here (any VBP tie stays soft and is only mentioned in copy), so
 * it cannot inflate the reconciled number. It is the cleanest Abridge story:
 * presence.
 */

import type { AttainSetting } from "./attainTypes";
import type { AttainBaseline, LeverValues } from "./attainLevers";
import {
  deriveQualityLadder,
  QUALITY_EVENT_LABELS,
  QUALITY_INTERVENTIONS,
  type QualityEventId,
} from "./attainQuality";
import {
  firstSelected,
  selectedOptionIds,
  sharpenerNumber,
  type AlignConfig,
  type AlignContext,
  type AlignOption,
  type AlignProof,
  type AlignProofFigure,
  type AlignQuestion,
} from "./alignFramework";

// ── Local formatting (self-contained, same convention as the chain modules) ─

function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}
/** Whole numbers for large pools, one decimal for the small fractional counts a
 * single unit produces, so a real 0.6 prevented never collapses to a fake 0. */
export function fmtEventCount(n: number): string {
  if (n > 0 && n < 10) return (Math.round(n * 10) / 10).toLocaleString();
  return Math.round(n).toLocaleString();
}

// ── Store keys (new Align-only keys; never collide with the engine levers,
//    round-trip through the existing per-goal persistence) ────────────────────

export const K_EVENTS = "qualityAlignEvents";
export const K_WHO = "qualityAlignWho";
const K_WHO_BEDS = "qualityAlignWhoBeds";
export const K_GATE = "qualityAlignGate";
export const K_CHANGE = "qualityAlignChange";
export const K_PROOF = "qualityAlignProof";

/** Reads a stacked per-event single selection (`storeKey__eventId`). */
function eventChoice(values: LeverValues, storeKey: string, eventId: string): string | undefined {
  return firstSelected(values, `${storeKey}__${eventId}`);
}
/** Reads a stacked per-event multi selection (`storeKey__eventId`). */
function eventChoices(values: LeverValues, storeKey: string, eventId: string): string[] {
  return selectedOptionIds(values, `${storeKey}__${eventId}`);
}

// ── Event identity on the Align surface ─────────────────────────────────────
// The five clinical events carry over from the engine; HCAHPS is Align-only
// (no engine harm-event), so it is NOT written into `qualityEventTypes`.

export const HCAHPS_ID = "hcahps";
export type QualityAlignEventId = QualityEventId | typeof HCAHPS_ID;

/** The selector's option order (clinical events, then HCAHPS last). */
export const QUALITY_ALIGN_EVENT_IDS: QualityAlignEventId[] = [
  "falls",
  "hapi",
  "clabsi",
  "cauti",
  "sepsis",
  HCAHPS_ID,
];
export const CLINICAL_EVENT_IDS: QualityEventId[] = ["falls", "hapi", "clabsi", "cauti", "sepsis"];

function isClinical(id: string): id is QualityEventId {
  return (CLINICAL_EVENT_IDS as string[]).includes(id);
}

/** Every engine intervention key for a clinical event (used to reset the keys
 * this config does not commit, so re-deriving is idempotent). */
function allEngineKeysFor(id: QualityEventId): string[] {
  return QUALITY_INTERVENTIONS[id].map((iv) => iv.id);
}

// ── THE CRITICAL MAP: each "what will you change" CONVERSION -> the SUBSET of
//    the event's engine interventions the freed time / earlier signal enable.
//    Only ever the eyes-and-documentation interventions; never the equipment-
//    only ones (the equipment-purchase interventions), which have no Abridge
//    in them. Ordered strongest-Abridge-tie first, so the
//    honest gate commits the most legible changes first. Exported so the tests
//    can assert every key exists in the engine and none is an equipment item.
// ────────────────────────────────────────────────────────────────────────────

export interface QualityConversion {
  id: string;
  label: string;
  helper: string;
  /** "time" = freed bedside time; "doc" = earlier + complete documentation. */
  benefit: "time" | "doc";
  /** The engine intervention ids this conversion commits when the gate credits
   * it. NEVER an equipment-only intervention. */
  engineKeys: string[];
}

export const QUALITY_CONVERSIONS: Record<QualityAlignEventId, QualityConversion[]> = {
  falls: [
    {
      id: "rounding",
      label: "Redeploy freed charting time into more rounding",
      helper: "Put the minutes Abridge frees back into more eyes on your high-risk patients, not the keyboard.",
      benefit: "time",
      engineKeys: ["qualityFallsRounding", "qualityFallsToileting"],
    },
    {
      id: "signal",
      label: "Act on the risk the note surfaces earlier",
      helper: "When a dizziness or sedating-medication note lands sooner, review those medications and get mobility orders in before a fall.",
      benefit: "doc",
      engineKeys: ["qualityFallsMedReview", "qualityFallsMobility"],
    },
    {
      id: "handoff",
      label: "Tighten shift handoffs on the fuller notes",
      helper: "Hand off high-risk patients on the more complete real-time note, so the next shift knows exactly who to watch.",
      benefit: "doc",
      engineKeys: ["qualityFallsHazards"],
    },
  ],
  hapi: [
    {
      id: "rounding",
      label: "Redeploy freed time into keeping the turn schedule",
      helper: "Spend the minutes Abridge frees on repositioning at the bedside, on schedule, instead of catching up on notes.",
      benefit: "time",
      engineKeys: ["qualityHapiReposition"],
    },
    {
      id: "signal",
      label: "Act on the skin note that surfaces earlier",
      helper: "An earlier, fuller skin note means a Braden check every shift and a nutrition consult before an injury forms.",
      benefit: "doc",
      engineKeys: ["qualityHapiSkinAssessment", "qualityHapiNutrition"],
    },
  ],
  clabsi: [
    {
      id: "rounding",
      label: "Redeploy freed time into daily line-necessity review",
      helper: "Use the minutes Abridge frees to check every central line for necessity, every day.",
      benefit: "time",
      engineKeys: ["qualityClabsiDailyReview"],
    },
    {
      id: "signal",
      label: "Act on the line documentation that surfaces earlier",
      helper: "A complete, real-time line note keeps insertion practice and site care honest day to day.",
      benefit: "doc",
      engineKeys: ["qualityClabsiInsertionBundle", "qualityClabsiSiteCare"],
    },
  ],
  cauti: [
    {
      id: "rounding",
      label: "Redeploy freed time into daily catheter review and care",
      helper: "Use the freed minutes to review indwelling catheters for necessity and keep up routine perineal care.",
      benefit: "time",
      engineKeys: ["qualityCautiNecessity", "qualityCautiPerinealCare"],
    },
    {
      id: "signal",
      label: "Act on the catheter note that surfaces earlier",
      helper: "Remove the catheter as soon as the note shows it is no longer needed, and keep insertion aseptic.",
      benefit: "doc",
      engineKeys: ["qualityCautiEarlyRemoval", "qualityCautiAsepticInsertion"],
    },
  ],
  sepsis: [
    {
      id: "signal",
      label: "Act on the early deterioration sign surfaced earlier",
      helper: "An earlier warning sign in the record means screening and antibiotics start sooner.",
      benefit: "doc",
      engineKeys: ["qualitySepsisScreening", "qualitySepsisTimeToAbx"],
    },
    {
      id: "handoff",
      label: "Tighten handoffs on the fuller notes",
      helper: "Hand off the deteriorating patient on a complete real-time note, so the time-sensitive steps do not slip between shifts.",
      benefit: "doc",
      engineKeys: ["qualitySepsisBundle"],
    },
  ],
  [HCAHPS_ID]: [
    {
      id: "presence",
      label: "Protect the face-to-face presence the freed time buys",
      helper: "Spend the minutes Abridge frees at the bedside, with the patient, instead of the keyboard. This is the cleanest Abridge story: presence.",
      benefit: "time",
      engineKeys: [], // Experience, not a harm event: no engine dollar.
    },
  ],
};

/** Q3 honest gate -> the fraction of the enabled conversions the engine
 * credits. "Despite" commits nothing (honest near-zero); "meaningful" about
 * half; "earlier" the full enabled set. The per-event ceiling and the 30%
 * attribution still cap it on top. Exported so the tests assert it. */
export const QUALITY_GATE_COMMIT_FRACTION: Record<string, number> = {
  earlier: 1,
  meaningful: 0.5,
  despite: 0,
};

// ── The choice -> engine mapping (the one source of truth for the number) ────

/** For one clinical event, the engine intervention keys this plan commits:
 * the enabled conversions the partner picked, scaled by the honest gate. */
export function committedKeysFor(id: QualityEventId, values: LeverValues): string[] {
  const gate = eventChoice(values, K_GATE, id);
  const factor = gate ? (QUALITY_GATE_COMMIT_FRACTION[gate] ?? 0) : 0;
  if (factor <= 0) return [];
  const chosen = eventChoices(values, K_CHANGE, id);
  const convs = QUALITY_CONVERSIONS[id];
  // Candidate keys in the config's own order (strongest-Abridge-tie first),
  // restricted to the conversions the partner actually committed to.
  const candidate: string[] = [];
  for (const c of convs) {
    if (chosen.includes(c.id)) candidate.push(...c.engineKeys);
  }
  const nCommit = Math.round(factor * candidate.length);
  return candidate.slice(0, nCommit);
}

export function qualityAlignToLeverValues(values: LeverValues, ctx: AlignContext): LeverValues {
  const { baseline } = ctx;
  const chosen = selectedOptionIds(values, K_EVENTS);
  const clinical = CLINICAL_EVENT_IDS.filter((id) => chosen.includes(id));

  const out: LeverValues = {
    // Only the clinical events reach the engine; HCAHPS is Align-only.
    qualityEventTypes: clinical.map((id) => QUALITY_EVENT_LABELS[id]),
  };

  // Q2 scope: which beds. "all" inherits the Starting-point staffed-bed count;
  // "focused" takes an optional bed count, blank -> a labeled benchmark.
  const totalBeds = Math.max(0, Math.round(baseline.staffedBeds ?? 0));
  const who = firstSelected(values, K_WHO);
  let beds = 0;
  if (who === "all") {
    beds = totalBeds;
  } else if (who === "focused") {
    const typed = sharpenerNumber(values, K_WHO_BEDS);
    if (typed > 0) beds = totalBeds > 0 ? Math.min(typed, totalBeds) : typed;
    else beds = totalBeds > 0 ? Math.round(totalBeds / 2) : 0; // labeled benchmark
  }
  out.qualityBeds = beds;
  // Units stay narrative-only (the number rides beds x occupancy); the whole
  // in-scope unit is the default when they take all beds.
  out.qualityLines = who === "all" ? ["All in-scope units"] : [];

  // Per clinical event, commit exactly the enabled-conversion engine keys the
  // honest gate credits, and reset every other key so re-deriving is stable.
  for (const id of CLINICAL_EVENT_IDS) {
    const committed = clinical.includes(id) ? committedKeysFor(id, values) : [];
    for (const key of allEngineKeysFor(id)) {
      out[key] = committed.includes(key) ? 1 : 0;
    }
  }

  return out;
}

// ── The derived proof — SAFETY FIRST, the dollar soft and labeled ────────────

/** A count formatter for the safety-first hero (events prevented). */
function fmtCountHead(n: number): string {
  return fmtEventCount(n);
}

export function deriveQualityAlignProof(values: LeverValues, ctx: AlignContext): AlignProof {
  const { baseline, realizationPct } = ctx;
  const engine = qualityAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };
  const ladder = deriveQualityLadder(baseline, merged, realizationPct);

  const chosen = selectedOptionIds(values, K_EVENTS);
  const clinicalChosen = CLINICAL_EVENT_IDS.filter((id) => chosen.includes(id));
  const hcahpsChosen = chosen.includes(HCAHPS_ID);
  const hcahpsCommitted = hcahpsChosen && eventChoices(values, K_CHANGE, HCAHPS_ID).length > 0;

  const groundEvents = ladder.events.reduce((s, e) => s + e.groundEvents, 0);
  const ceilingEvents = ladder.events.reduce((s, e) => s + e.ceilingCount, 0);
  const prevented = ladder.events.reduce((s, e) => s + e.capturedCount, 0);
  const softDollar = ladder.convergedPrize; // already attributed at realizationPct

  const ready = prevented > 0 || hcahpsCommitted;
  const who = firstSelected(values, K_WHO);

  const figures: AlignProofFigure[] = [
    {
      label: "Events a year at your rate",
      value: groundEvents > 0 ? `${fmtEventCount(groundEvents)} / yr` : "not set yet",
      tag: "benchmark",
    },
    {
      label: "Preventable ceiling",
      value: ceilingEvents > 0 ? `${fmtEventCount(ceilingEvents)} / yr` : "not set yet",
    },
    {
      label: "Events prevented",
      value: prevented > 0 ? `${fmtEventCount(prevented)} / yr` : "not set yet",
    },
    {
      // The dollar is a SOFT footnote, never the hero, and it is labeled so.
      label: "Cost of harm avoided (soft)",
      value: softDollar > 0 ? `~${fmtMoneyCompact(softDollar)} / yr` : "soft, not set",
    },
  ];
  if (hcahpsChosen) {
    figures.push({
      label: "HCAHPS",
      value: hcahpsCommitted ? "presence protected" : "pick the change",
    });
  }

  const attributionLine =
    "Abridge enables the earlier signal and the freed time; your team converts it at the bedside; the outcome is both.";

  const headlineLabel =
    prevented > 0 ? "Harm events prevented a year" : hcahpsCommitted ? "Patient experience" : "Harm events prevented a year";

  const headlineSub = !ready
    ? "the proof of what you just aligned on"
    : prevented > 0
      ? `about ${fmtEventCount(prevented)} harm events kept from happening. ${attributionLine}`
      : `a patient-experience commitment: its value shows up in your HCAHPS domain scores, not a harm-events count. ${attributionLine}`;

  const dollarNote =
    softDollar > 0
      ? ` Cost of harm avoided prices to a soft ~${fmtMoneyCompact(softDollar)} a year, attributed at ${Math.round(
          realizationPct,
        )}% to this plan; lead with the events and the experience, not the dollar.`
      : "";

  const math = ready
    ? prevented > 0
      ? `${clinicalChosen
          .map((id) => QUALITY_EVENT_LABELS[id])
          .join(", ")}: ~${fmtEventCount(prevented)} events prevented a year out of a ${fmtEventCount(
          ceilingEvents,
        )}-event preventable ceiling.${dollarNote}`
      : `HCAHPS is patient experience, not a priced harm event, so it carries no hard dollar here. Any value-based-purchasing tie stays soft. ${attributionLine}`
    : "The number appears once you pick the events, say how much is preventable by catching it earlier, and choose what you will change.";

  const emptyHint =
    chosen.length === 0
      ? "Pick the outcomes you are working to prevent up top to start."
      : !who
        ? "Say which beds this is for, so the events are sized on real patient-days."
        : "For each event, say how much is preventable by catching it earlier, then pick the change you will make with the freed time or the earlier note.";

  return {
    ready,
    headlineLabel,
    headlineValue: prevented,
    headlineFormatter: fmtCountHead,
    headlineSub,
    emptyHint,
    figures,
    math,
  };
}

// ── Question builders ────────────────────────────────────────────────────────

/** Q1, the event SELECTOR (multi). Safety and experience first; the dollar is
 * never named here. Its option ids drive the per-event stacking and map, in
 * `toLeverValues`, onto `qualityEventTypes` (clinical only). */
const eventSelectorQuestion: AlignQuestion = {
  id: "outcome",
  storeKey: K_EVENTS,
  dimension: 1,
  prompt: "What are you working to prevent?",
  helper:
    "Pick one or more. Each harm event is its own distinct pool, so they add rather than compete. HCAHPS is patient experience, the cleanest Abridge story. Only the outcomes you pick open their own questions below.",
  mode: "multi",
  options: [
    { id: "falls", label: "Falls", helper: "Patient falls, with and without injury, on the unit." },
    { id: "hapi", label: "Pressure injuries (HAPI)", helper: "Hospital-acquired pressure injuries." },
    { id: "clabsi", label: "Central-line infections (CLABSI)", helper: "Central-line-associated bloodstream infections." },
    { id: "cauti", label: "Catheter infections (CAUTI)", helper: "Catheter-associated urinary tract infections." },
    { id: "sepsis", label: "Sepsis", helper: "Sepsis cases where earlier recognition changes the course." },
    {
      id: HCAHPS_ID,
      label: "Patient experience (HCAHPS)",
      helper: "The experience your patients report. Its value is the score itself, not a harm-events dollar.",
    },
  ],
};

/** Q2, WHO / which beds (flat lead). Beds inherit from Starting Point. */
const whoQuestion: AlignQuestion = {
  id: "who",
  storeKey: K_WHO,
  dimension: 2,
  prompt: "Which beds is this for?",
  helper: "We carry your staffed-bed count over from your starting point, so you only pick the cut. The bed count sizes the patient-days every event is measured against.",
  mode: "single",
  options: [
    {
      id: "all",
      label: "All the beds in scope",
      helper: "Every staffed bed on your starting-point count.",
      dynamicHelper: (ctx) => {
        const beds = Math.max(0, Math.round(ctx.baseline.staffedBeds ?? 0));
        return beds > 0 ? `All ${beds.toLocaleString()} staffed beds on your starting-point count.` : "Every staffed bed on your starting-point count.";
      },
    },
    {
      id: "focused",
      label: "A focused unit",
      helper: "A specific unit you want to start with.",
      sharpener: {
        storeKey: K_WHO_BEDS,
        label: "Roughly how many beds? (optional)",
        unit: "beds",
        placeholder: "e.g., 30",
        benchmarkNote: "Leave this blank and we use a conservative benchmark: about half your staffed beds.",
        decimal: false,
      },
    },
  ],
};

/** Q3, the honest gate (stacks, clinical events only). One shared question. */
const gateQuestion: AlignQuestion = {
  id: "gate",
  storeKey: K_GATE,
  dimension: 3,
  stacksOnQuestionId: "outcome",
  appliesToChoices: [...CLINICAL_EVENT_IDS],
  prompt: "How much of this can you catch earlier?",
  helper:
    "This is the honest gate. Some harm happens despite good care. Abridge helps by surfacing the risk sooner, so only the share you can catch earlier is really yours to move.",
  mode: "single",
  options: [
    { id: "earlier", label: "Mostly preventable by catching it earlier", helper: "An earlier, fuller risk signal would let the team step in before it happens." },
    { id: "meaningful", label: "A meaningful share", helper: "Some is catchable earlier, a lot happens despite good care." },
    { id: "despite", label: "Mostly happens despite good care", helper: "Even with an earlier signal, most of these would still occur, so we keep this honest and small." },
  ],
};

/** Q4, "what will you change" — ONE question per event, each scoped to its own
 * section, each option a CONVERSION of Abridge's freed time or earlier note. */
function changeQuestionFor(id: QualityAlignEventId): AlignQuestion {
  const options: AlignOption[] = QUALITY_CONVERSIONS[id].map((c) => ({
    id: c.id,
    label: c.label,
    helper: c.helper,
  }));
  const isExperience = id === HCAHPS_ID;
  return {
    id: `change-${id}`,
    storeKey: K_CHANGE,
    dimension: 4,
    stacksOnQuestionId: "outcome",
    appliesToChoices: [id],
    prompt: isExperience ? "What will you protect with the freed time?" : "What will you change with what Abridge frees?",
    helper: isExperience
      ? "This is a conversion of the time Abridge frees. Presence is the whole story."
      : "Pick the changes you will actually make. Each one is something the freed time or the earlier note lets you do on top of your existing bundle, never a new standalone purchase.",
    mode: "multi",
    options,
  };
}

/** Q5, the shared PROOF question (framing -> Plan signals). */
const proofQuestion: AlignQuestion = {
  id: "proof",
  storeKey: K_PROOF,
  dimension: 5,
  prompt: "What proof would convince you it worked?",
  helper: "Pick any that matter. These become the signals your plan tracks.",
  mode: "multi",
  options: [
    { id: "rate", label: "Event rate per 1,000 dropping", helper: "The harm-event rate trending down against this baseline." },
    { id: "compliance", label: "Bundle compliance climbing", helper: "The share of patients getting every step of the bundle rising." },
    { id: "nearmiss", label: "Near-miss catches", helper: "Risks caught and acted on before they became an event." },
    { id: "hcahps", label: "HCAHPS domain scores", helper: "The patient-experience domains moving in your surveys." },
    { id: "lovestories", label: "Love Stories of a patient caught earlier", helper: "Nurses telling you about a patient the earlier signal helped them save." },
  ],
};

// ── The config factory the AlignStep renders ─────────────────────────────────

export function qualityAlignConfigFor(_setting: AttainSetting): AlignConfig {
  const questions: AlignQuestion[] = [
    eventSelectorQuestion,
    whoQuestion,
    gateQuestion,
    ...QUALITY_ALIGN_EVENT_IDS.map((id) => changeQuestionFor(id)),
    proofQuestion,
  ];
  return {
    goal: "quality",
    eyebrow: "Align on what you mean",
    intro:
      "One thing starts every event here: earlier, more complete risk documentation, and the bedside time Abridge frees. Pick what you are working to prevent, agree on how much you can honestly catch earlier, and commit the change you will make with the time and the signal. This driver leads with safety and experience; the dollar is a soft footnote, never the point.",
    dimensionTotal: 5,
    questions,
    toLeverValues: qualityAlignToLeverValues,
    deriveProof: deriveQualityAlignProof,
  };
}
