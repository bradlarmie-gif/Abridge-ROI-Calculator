/**
 * Attain — REVENUE Align config (all three settings), the MULTI-PATH driver.
 *
 * Revenue is not one mechanism, it is several genuinely distinct claim pools a
 * partner chases (one or more). So it exercises the framework's MULTI-SELECT
 * STACKING scaffold: Q1 selects the paths, and the per-path who/gate/where
 * questions repeat once per chosen path, grouped into one clean section each.
 *
 * The step-down ENGINE underneath is UNCHANGED. Every choice maps onto the
 * exact same `LeverValues` the revenue chains already read
 * (`revenuePaths` / `ipRevenuePaths`, `revenueHccPopulations`,
 * `revenueEmLift`, `revenueDenialsPreventable`, `ipDrgCapture`, ...), so the
 * derived number still runs through `deriveRevenueLadder` /
 * `deriveIpRevenueLadder` and reconciles to `computeAllDriverValues`. The
 * picked paths CONVERGE into one prize (per-path dollars, distinct claim
 * pools, summed once, no double-count), exactly the current revenue ladder.
 *
 * THE HONEST GATE per path limits the value the way the contract requires:
 * the leak Abridge can move is the share the NOTE failed to capture; the
 * shares it cannot touch (genuinely lower acuity, conditions a patient does
 * not have, payer rules, clinically necessary queries) map to a near-zero
 * ceiling, so "mostly payer rules" keeps that path's value honest and small.
 *
 * The COMMITMENT ("coders / providers / the billing team ACT on the better
 * documentation") does NOT live here; it belongs to the Plan. Align sets a
 * sensible, conservative CAPTURE STARTER on each path's commitment lever so a
 * number derives (same pattern Workforce uses for its "hold" knobs), and the
 * Plan is where the partner commits to the specific action and owner.
 *
 * Pricing facts (value per HCC, conversion factor, average claim value, DRG
 * weight, base payment, admin cost per query, revenue delta) and today's rates
 * (gap rate, denial rate, at-risk rate, query rate) are FACTS, not meaning-
 * choices: they are NOT re-asked here and fall back to each chain's own
 * conservative benchmarks. Denials and CDI stay honest by construction: a
 * prevented denial is priced on the claim already earned (not a new margin),
 * and CDI is priced on admin/labor time only (the DRG reimbursement dollar is
 * booked once, in the DRG path).
 */

import type { AttainSetting } from "./attainTypes";
import type { AttainBaseline, LeverValues } from "./attainLevers";
import {
  deriveRevenueLadder,
  pathsAvailableFor,
  REVENUE_PATH_LABELS,
  type RevenuePathId,
} from "./attainRevenue";
import {
  deriveIpRevenueLadder,
  IP_REVENUE_PATH_LABELS,
  IP_REVENUE_PATH_IDS,
  type IpRevenuePathId,
} from "./attainInpatientRevenue";
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

// ── Store keys (new Align-only keys; never collide with the engine levers,
//    round-trip through the existing per-goal persistence) ────────────────────

export const K_PATHS = "revenueAlignPaths";
const K_WHO_EM = "revenueAlignWhoEm";
const K_EM_VISIT_COUNT = "revenueAlignEmVisitCount";
const K_WHO_HCC = "revenueAlignWhoHcc";
const K_WHO_DENIALS = "revenueAlignWhoDenials";
const K_GATE_EM = "revenueAlignGateEm";
const K_GATE_HCC = "revenueAlignGateHcc";
const K_GATE_DENIALS = "revenueAlignGateDenials";
const K_GATE_DRG = "revenueAlignGateDrg";
const K_GATE_CDI = "revenueAlignGateCdi";
const K_GATE_OBS = "revenueAlignGateObs";
const K_WHERE = "revenueAlignWhere";
const K_PROOF = "revenueAlignProof";

/** Reads a stacked per-path single selection (`storeKey__pathId`). */
function pathChoice(values: LeverValues, storeKey: string, pathId: string): string | undefined {
  return firstSelected(values, `${storeKey}__${pathId}`);
}
/** Reads a stacked per-path multi selection (`storeKey__pathId`). */
function pathChoices(values: LeverValues, storeKey: string, pathId: string): string[] {
  return selectedOptionIds(values, `${storeKey}__${pathId}`);
}

// ── Conservative choice -> value maps (exported so the tests assert them) ────

/** Outpatient E/M "who": share of providers on productivity / wRVU pay. A
 * captured wRVU only becomes revenue where the provider is paid on it. */
export const EM_EMPLOYED_SHARE_PCT: Record<string, number> = {
  most: 95,
  half: 50,
  few: 15,
};

/** ED E/M "who": share of ED visits that carry a billable E/M level (there is
 * no productivity-pay gate for ED providers, so the engine fixes employed at
 * 100 and this choice scopes the visit volume instead). */
export const EM_ED_VISIT_SHARE_PCT: Record<string, number> = {
  most: 90,
  half: 55,
  few: 25,
};

/** E/M honest gate -> the documentation-caused ceiling (`revenueEmDocCausedShare`):
 * the share of E/M claims that go out below the care delivered because the note
 * fell short. "Genuinely lower acuity" is not Abridge's to move, so it collapses
 * the ceiling to a small residual. */
export const EM_GATE_DOC_CAUSED_PCT: Record<string, number> = {
  note: 25,
  some: 12,
  acuity: 3,
};

/** HCC honest gate -> recapture uplift starter (`revenueHccRecapture`, pp).
 * "Conditions patients do not have" is not Abridge's to move. */
export const HCC_GATE_UPLIFT_PP: Record<string, number> = {
  gap: 10,
  some: 5,
  nothave: 1,
};
/** HCC honest gate -> first-time discovery starter (`revenueHccNetNew`, %). */
export const HCC_GATE_NETNEW_PCT: Record<string, number> = {
  gap: 6,
  some: 3,
  nothave: 1,
};

/** Denials honest gate -> preventable share (`revenueDenialsPreventable`, %).
 * "Mostly payer rules or authorization" is not Abridge's to move, so its value
 * is honest and small: we do not promise the denial win. */
export const DENIALS_GATE_PREVENTABLE_PCT: Record<string, number> = {
  note: 40,
  some: 20,
  payer: 5,
};

/** Inpatient DRG honest gate -> capture starter (`ipDrgCapture`, % of at-risk). */
export const IP_DRG_GATE_CAPTURE_PCT: Record<string, number> = {
  note: 15,
  some: 8,
  notpresent: 2,
};
/** Inpatient CDI honest gate -> query-volume reduction starter (`ipCdiReduction`, %). */
export const IP_CDI_GATE_REDUCTION_PCT: Record<string, number> = {
  note: 25,
  some: 12,
  necessary: 3,
};
/** Inpatient Obs honest gate -> preventable share starter (`ipObsPreventable`, %). */
export const IP_OBS_GATE_PREVENTABLE_PCT: Record<string, number> = {
  note: 30,
  some: 15,
  appropriate: 5,
};

/** Conservative capture STARTER on the E/M commitment lever once its gate is
 * set (the real commitment + owner belong to the Plan). */
export const EM_CAPTURE_STARTER_PCT = 40;

/** HCC population option id -> the exact engine population label the HCC chain
 * reads out of `revenueHccPopulations`. */
export const HCC_POPULATION_LABEL: Record<string, string> = {
  ma: "Medicare Advantage",
  medicaid: "Medicaid MCO",
  aca: "ACA / Exchange",
};

// ── The base-eligible volume (mirrors computeEmChain's own scope math) so an
//    optional typed E/M visit count can sharpen the visit share ──────────────

function emBaseEligible(baseline: AttainBaseline, setting: AttainSetting): number {
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const enc = baseline.annualEncounters ?? 0;
  const perUnit = providers > 0 && enc > 0 ? enc / providers : setting === "ed" ? 1_800 : 3_500;
  const util = Math.min(1, Math.max(0, (baseline.utilizationPct ?? 70) / 100));
  return Math.round(providers * perUnit * util);
}

// ── The choice -> engine mapping (the one source of truth for the number) ────

/** Outpatient / ED: writes the exact `attainRevenue` levers the three-path
 * chain reads, so `deriveRevenueLadder` / `computeAllDriverValues` reconcile. */
export function revenueAlignToLeverValues(values: LeverValues, ctx: AlignContext): LeverValues {
  const { baseline, setting } = ctx;
  if (setting === "inpatient") return ipRevenueAlignToLeverValues(values);

  const available = pathsAvailableFor(setting);
  const chosen = (selectedOptionIds(values, K_PATHS) as RevenuePathId[]).filter((id) => available.includes(id));
  const out: LeverValues = { revenuePaths: chosen.map((id) => REVENUE_PATH_LABELS[id]) };

  if (chosen.includes("em")) {
    const who = pathChoice(values, K_WHO_EM, "em");
    if (setting === "ed") {
      // ED has no productivity-pay gate; the "who" choice scopes visit volume.
      out.revenueEmVisitShare = who ? (EM_ED_VISIT_SHARE_PCT[who] ?? 0) : 0;
    } else {
      out.revenueEmEmployedShare = who ? (EM_EMPLOYED_SHARE_PCT[who] ?? 0) : 0;
      // Optional typed E/M visit count sharpens the visit share; blank keeps
      // the engine's own 100% benchmark (all in-scope visits are E/M visits).
      const typed = sharpenerNumber(values, K_EM_VISIT_COUNT);
      const base = emBaseEligible(baseline, setting);
      out.revenueEmVisitShare = typed > 0 && base > 0 ? Math.min(100, Math.round((typed / base) * 100)) : 0;
    }
    const gate = pathChoice(values, K_GATE_EM, "em");
    out.revenueEmDocCausedShare = gate ? (EM_GATE_DOC_CAUSED_PCT[gate] ?? 0) : 0;
    // The commitment gate: a conservative starter once the honest gate is set,
    // 0 (and therefore no number) until then. The real commitment -> Plan.
    out.revenueEmLift = gate ? EM_CAPTURE_STARTER_PCT : 0;
  }

  if (chosen.includes("hcc")) {
    const pops = pathChoices(values, K_WHO_HCC, "hcc");
    out.revenueHccPopulations = pops.map((id) => HCC_POPULATION_LABEL[id]).filter(Boolean);
    const gate = pathChoice(values, K_GATE_HCC, "hcc");
    out.revenueHccRecapture = gate ? (HCC_GATE_UPLIFT_PP[gate] ?? 0) : 0;
    out.revenueHccNetNew = gate ? (HCC_GATE_NETNEW_PCT[gate] ?? 0) : 0;
  }

  if (chosen.includes("denials")) {
    const gate = pathChoice(values, K_GATE_DENIALS, "denials");
    out.revenueDenialsPreventable = gate ? (DENIALS_GATE_PREVENTABLE_PCT[gate] ?? 0) : 0;
  }

  return out;
}

/** Inpatient: writes the exact `attainInpatientRevenue` levers the DRG / CDI /
 * Obs chain reads. CDI stays priced on admin/labor only (its cost-per-query
 * lever is left at the benchmark, which the engine clamps), so the DRG
 * reimbursement dollar is never double-counted. */
function ipRevenueAlignToLeverValues(values: LeverValues): LeverValues {
  const chosen = (selectedOptionIds(values, K_PATHS) as IpRevenuePathId[]).filter((id) =>
    IP_REVENUE_PATH_IDS.includes(id),
  );
  const out: LeverValues = { ipRevenuePaths: chosen.map((id) => IP_REVENUE_PATH_LABELS[id]) };

  if (chosen.includes("drg")) {
    const gate = pathChoice(values, K_GATE_DRG, "drg");
    out.ipDrgCapture = gate ? (IP_DRG_GATE_CAPTURE_PCT[gate] ?? 0) : 0;
  }
  if (chosen.includes("cdi")) {
    const gate = pathChoice(values, K_GATE_CDI, "cdi");
    out.ipCdiReduction = gate ? (IP_CDI_GATE_REDUCTION_PCT[gate] ?? 0) : 0;
  }
  if (chosen.includes("obs")) {
    const gate = pathChoice(values, K_GATE_OBS, "obs");
    out.ipObsPreventable = gate ? (IP_OBS_GATE_PREVENTABLE_PCT[gate] ?? 0) : 0;
  }
  return out;
}

// ── The derived proof (the one converged prize) ──────────────────────────────

const PATH_SHORT_LABEL: Record<string, string> = {
  hcc: "Risk adjustment",
  em: "E/M level",
  denials: "Denials",
  drg: "DRG capture",
  cdi: "CDI queries",
  obs: "Obs defense",
};

export function deriveRevenueAlignProof(values: LeverValues, ctx: AlignContext): AlignProof {
  const { baseline, setting, realizationPct } = ctx;
  const engine = revenueAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };

  const ladder =
    setting === "inpatient"
      ? deriveIpRevenueLadder(baseline, merged, realizationPct)
      : deriveRevenueLadder(baseline, setting, merged, realizationPct);

  const converged = ladder.convergedPrize;
  const ready = converged > 0;
  const chosenCount = selectedOptionIds(values, K_PATHS).length;

  const figures: AlignProofFigure[] = ladder.paths.map((p) => ({
    label: PATH_SHORT_LABEL[p.id] ?? p.label,
    value: p.hasValue ? `${fmtMoneyCompact(p.value)} / yr` : "not set yet",
  }));

  const withValue = ladder.paths.filter((p) => p.hasValue);
  const math = ready
    ? `${withValue
        .map((p) => `${PATH_SHORT_LABEL[p.id] ?? p.label} ~${fmtMoneyCompact(p.value)}`)
        .join("  +  ")} = ~${fmtMoneyCompact(converged)} captured a year${
        realizationPct < 100 ? `, attributed at ${Math.round(realizationPct)}% to this plan` : ""
      }. Each path is a distinct claim pool, counted once.`
    : "The number appears once you pick the revenue you are going after and say what is behind each leak.";

  const emptyHint =
    chosenCount === 0
      ? "Pick the revenue you are going after up top to start the number."
      : "For each path, say what is behind the leak. We only size the share the documentation can move, so mostly payer rules or conditions your patients do not have keeps that path near zero.";

  const headlineSub = ready
    ? `${withValue.length} ${withValue.length === 1 ? "path" : "paths"} converging into one prize, each counted once`
    : "the proof of what you just aligned on";

  return {
    ready,
    headlineLabel: "What capturing the revenue is worth",
    headlineValue: converged,
    headlineSub,
    emptyHint,
    figures,
    math,
  };
}

// ── Question builders ────────────────────────────────────────────────────────

/** Q1, the path SELECTOR (multi). Its option ids drive the per-path stacking
 * and map, in `toLeverValues`, onto `revenuePaths` / `ipRevenuePaths`. */
function pathSelectorQuestion(setting: AttainSetting): AlignQuestion {
  const options: AlignOption[] =
    setting === "inpatient"
      ? [
          { id: "drg", label: "Case mix and DRG accuracy", helper: "Admissions grouped below the weight they earned, because a managed condition was under-documented." },
          { id: "cdi", label: "CDI query efficiency", helper: "Queries your CDI team only has to write because the note lacked the specificity up front." },
          { id: "obs", label: "Observation status defense", helper: "Stays downgraded to observation when the severity was real but under-documented." },
        ]
      : [
          ...(setting === "outpatient"
            ? [{ id: "hcc", label: "Risk adjustment (HCC)", helper: "Conditions your risk-based patients have that never reach the claim." } as AlignOption]
            : []),
          { id: "em", label: "E/M level accuracy", helper: "Claims that go out below the care actually delivered, because the note fell short." },
          { id: "denials", label: "Medical-necessity denials", helper: "Denials driven by a note that did not establish why the care was needed." },
        ];
  return {
    id: "outcome",
    storeKey: K_PATHS,
    dimension: 1,
    prompt: "What revenue are you going after?",
    helper:
      "Pick one or more. Each is a genuinely different claim, so they add rather than compete. Only the paths you pick open their own questions below.",
    mode: "multi",
    options,
  };
}

/** The generic WHERE question (framing), stacked once per chosen path. */
function whereQuestion(setting: AttainSetting): AlignQuestion {
  const options: AlignOption[] =
    setting === "inpatient"
      ? [
          { id: "medicine", label: "Medicine and hospitalist", helper: "The general medicine service where most admissions land." },
          { id: "surgical", label: "Surgical and procedural", helper: "Surgical admissions and their comorbidity picture." },
          { id: "cardiac", label: "Cardiac and critical care", helper: "High-acuity units where severity is easy to under-document." },
          { id: "unsure", label: "Not sure yet", helper: "We can size it across the board for now and narrow it later." },
        ]
      : [
          { id: "primary", label: "Primary care", helper: "Where visit volume and chronic conditions concentrate." },
          { id: "specialty", label: "Specialty clinics", helper: "Higher-complexity visits where the note carries more weight." },
          { id: "behavioral", label: "Behavioral and other", helper: "Time-based and other visit types with their own coding picture." },
          { id: "unsure", label: "Not sure yet", helper: "We can size it across the board for now and narrow it later." },
        ];
  return {
    id: "where",
    storeKey: K_WHERE,
    dimension: setting === "inpatient" ? 3 : 4,
    stacksOnQuestionId: "outcome",
    prompt: "Where does the most revenue leak?",
    helper: "Pick where you see it most. This shapes the story, not the number, and it tells your plan where to look first.",
    mode: "multi",
    options,
  };
}

/** The shared PROOF question (framing -> Plan signals). */
const proofQuestion = (setting: AttainSetting): AlignQuestion => ({
  id: "proof",
  storeKey: K_PROOF,
  dimension: setting === "inpatient" ? 4 : 5,
  prompt: "What proof would convince you it worked?",
  helper: "Pick any that matter. These become the signals your plan tracks.",
  mode: "multi",
  options:
    setting === "inpatient"
      ? [
          { id: "cmi", label: "Case mix index moving", helper: "The documented case-mix index rising against this baseline." },
          { id: "queryrate", label: "Fewer CDI queries", helper: "The query volume per admission coming down." },
          { id: "obsrate", label: "Fewer status downgrades", helper: "Observation downgrades and their appeals trending down." },
          { id: "captured", label: "Captured dollars showing up", helper: "The reimbursement actually landing, tracked in finance." },
          { id: "team", label: "The CDI and coding team see it", helper: "The people closest to the claim telling you it changed." },
        ]
      : [
          { id: "losmix", label: "Level-of-service mix moving", helper: "The distribution of coded levels rising toward the care delivered." },
          { id: "recapture", label: "Recapture rate rising", helper: "More documented conditions making it onto the claim." },
          { id: "denialrate", label: "Denial rate dropping", helper: "Fewer medical-necessity denials against this baseline." },
          { id: "captured", label: "Captured dollars showing up", helper: "The revenue actually landing, tracked in finance." },
          { id: "team", label: "The revenue-cycle team sees it", helper: "The people closest to the claim telling you it changed." },
        ],
});

// Per-path WHO questions (dimension 2). Only rendered inside their own path's
// section via `appliesToChoices`.

function whoEmQuestion(setting: AttainSetting): AlignQuestion {
  if (setting === "ed") {
    return {
      id: "whoEm",
      storeKey: K_WHO_EM,
      dimension: 2,
      stacksOnQuestionId: "outcome",
      appliesToChoices: ["em"],
      prompt: "How many ED visits carry an E/M level?",
      helper: "Only billable E/M visits carry a level, so that share scopes the volume this path is measured against. Your ED provider count carries over from your starting point.",
      mode: "single",
      options: [
        { id: "most", label: "Most of them", helper: "Nearly all your ED visits are billable E/M visits." },
        { id: "half", label: "About half", helper: "A meaningful mix of E/M and other visit types." },
        { id: "few", label: "A smaller share", helper: "Mostly procedural or non-billable visits, fewer E/M levels." },
      ],
    };
  }
  return {
    id: "whoEm",
    storeKey: K_WHO_EM,
    dimension: 2,
    stacksOnQuestionId: "outcome",
    appliesToChoices: ["em"],
    prompt: "Which of your providers are on productivity pay?",
    helper:
      "A captured wRVU only turns into revenue where the provider is paid on productivity. Your provider count carries over from your starting point, so you only pick the cut.",
    mode: "single",
    options: [
      {
        id: "most",
        label: "Most or all of them",
        helper: "The group is largely employed or on wRVU-based pay.",
        sharpener: {
          storeKey: K_EM_VISIT_COUNT,
          label: "Roughly how many E&M visits a year? (optional)",
          unit: "/ yr",
          placeholder: "e.g., 90,000",
          benchmarkNote: "Leave this blank and we treat every in-scope visit as an E&M visit, a conservative benchmark.",
          decimal: false,
        },
      },
      { id: "half", label: "About half", helper: "A real mix of productivity-paid and salaried providers." },
      { id: "few", label: "A smaller share", helper: "Mostly hospital-based or salaried, so wRVU gains barely land." },
    ],
  };
}

const whoHccQuestion: AlignQuestion = {
  id: "whoHcc",
  storeKey: K_WHO_HCC,
  dimension: 2,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["hcc"],
  prompt: "Which risk-based populations is this for?",
  helper: "Value only accrues where reimbursement is risk-adjusted. Pick the plans you carry; the panel sizes carry over as a benchmark.",
  mode: "multi",
  options: [
    { id: "ma", label: "Medicare Advantage", helper: "The richest risk-adjustment population for most groups." },
    { id: "medicaid", label: "Medicaid managed care", helper: "Managed Medicaid lives, risk-adjusted by the plan." },
    { id: "aca", label: "ACA / Exchange", helper: "Marketplace lives with their own risk model." },
  ],
};

const whoDenialsQuestion: AlignQuestion = {
  id: "whoDenials",
  storeKey: K_WHO_DENIALS,
  dimension: 2,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["denials"],
  prompt: "Which lines see the most denials?",
  helper: "Pick where medical-necessity denials concentrate. This frames the story; the pool is measured across your eligible encounters either way.",
  mode: "multi",
  options: [
    { id: "imaging", label: "Imaging and diagnostics", helper: "High-cost studies that draw medical-necessity scrutiny." },
    { id: "procedures", label: "Procedures", helper: "Procedural claims where necessity has to be established in the note." },
    { id: "office", label: "Office and E/M", helper: "Everyday visits denied for insufficient documentation." },
    { id: "unsure", label: "Not sure yet", helper: "We can size it across the board for now and narrow it later." },
  ],
};

// Per-path HONEST GATE questions (dimension 2 for inpatient, 3 otherwise).

function gateEmQuestion(setting: AttainSetting): AlignQuestion {
  const isED = setting === "ed";
  return {
    id: "gateEm",
    storeKey: K_GATE_EM,
    dimension: 3,
    stacksOnQuestionId: "outcome",
    appliesToChoices: ["em"],
    prompt: isED ? "Why do ED claims go out below the acuity delivered?" : "Why do claims go out below the care delivered?",
    helper:
      "This is the honest gate. Abridge moves the part where the note did not carry the full picture. It cannot raise a visit that was genuinely lower acuity, so we only size what the documentation can move.",
    mode: "single",
    options: [
      { id: "note", label: "The note did not capture it", helper: "The care was there, but the claim went out low because the note fell short." },
      { id: "some", label: "A meaningful share is the note", helper: "Some of the gap is documentation, some is genuinely lower acuity." },
      { id: "acuity", label: "Mostly genuinely lower acuity", helper: "The claims reflect the care, so there is little for the note to move." },
    ],
  };
}

const gateHccQuestion: AlignQuestion = {
  id: "gateHcc",
  storeKey: K_GATE_HCC,
  dimension: 3,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["hcc"],
  prompt: "Why do conditions never reach the claim?",
  helper:
    "This is the honest gate. Abridge surfaces conditions your patients have that the note missed. It never adds conditions a patient does not have, so we only size the documentation gap.",
  mode: "single",
  options: [
    { id: "gap", label: "The note missed them", helper: "Real conditions your patients have that were not documented specifically enough to code." },
    { id: "some", label: "A meaningful share is the note", helper: "Some is a documentation gap, some is already captured today." },
    { id: "nothave", label: "Mostly already captured", helper: "Your recapture is already strong, so there is little gap for the note to close." },
  ],
};

const gateDenialsQuestion: AlignQuestion = {
  id: "gateDenials",
  storeKey: K_GATE_DENIALS,
  dimension: 3,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["denials"],
  prompt: "Why do these denials happen?",
  helper:
    "This is the honest gate. Abridge moves the denials driven by a note that did not establish medical necessity. It cannot document its way out of payer rules or authorization, so if it is mostly payer rules this path stays small, and we do not promise it.",
  mode: "single",
  options: [
    { id: "note", label: "The note did not establish necessity", helper: "The care was needed, but the note did not show why, so the claim was denied." },
    { id: "some", label: "A meaningful share is the note", helper: "Some is documentation, some is payer rules and authorization." },
    { id: "payer", label: "Mostly payer rules", helper: "Authorization and payer policy drive it, which no note can fix." },
  ],
};

const gateDrgQuestion: AlignQuestion = {
  id: "gateDrg",
  storeKey: K_GATE_DRG,
  dimension: 2,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["drg"],
  prompt: "Why do admissions group below the weight they earned?",
  helper:
    "This is the honest gate. Abridge carries the specificity a managed comorbidity needs so coding can assign the DRG the admission earned. It cannot add a condition that is not there.",
  mode: "single",
  options: [
    { id: "note", label: "A CC or MCC was under-documented", helper: "The condition was managed, but the note did not carry it specifically enough to code." },
    { id: "some", label: "A meaningful share is the note", helper: "Some is documentation, some is genuinely lower acuity." },
    { id: "notpresent", label: "Coding already captures it", helper: "Specificity is already strong, so there is little for the note to move." },
  ],
};

const gateCdiQuestion: AlignQuestion = {
  id: "gateCdi",
  storeKey: K_GATE_CDI,
  dimension: 2,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["cdi"],
  prompt: "Why does your CDI team write these queries?",
  helper:
    "This is the honest gate, and this path is labor only: it prices the CDI-staff time saved when a complete note means a query never has to be written, not the reimbursement itself.",
  mode: "single",
  options: [
    { id: "note", label: "The note lacked specificity", helper: "The query only exists because the note did not carry the detail up front." },
    { id: "some", label: "A meaningful share is the note", helper: "Some queries are documentation gaps, some are genuinely clinical." },
    { id: "necessary", label: "They are clinically necessary", helper: "The queries reflect real clinical questions a better note would not remove." },
  ],
};

const gateObsQuestion: AlignQuestion = {
  id: "gateObs",
  storeKey: K_GATE_OBS,
  dimension: 2,
  stacksOnQuestionId: "outcome",
  appliesToChoices: ["obs"],
  prompt: "Why do these stays get downgraded to observation?",
  helper:
    "This is the honest gate. Abridge carries the severity-of-illness detail that defends an inpatient stay. It cannot defend a stay that was genuinely observation-appropriate, or overturn a payer rule.",
  mode: "single",
  options: [
    { id: "note", label: "Severity was under-documented", helper: "The stay was inpatient-appropriate, but the note did not carry the severity." },
    { id: "some", label: "A meaningful share is the note", helper: "Some is documentation, some is genuinely observation-appropriate." },
    { id: "appropriate", label: "Genuinely observation-level", helper: "The downgrades reflect the care, so there is little for the note to defend." },
  ],
};

// ── The config factory the AlignStep renders (one per setting) ───────────────

export function revenueAlignConfigFor(setting: AttainSetting): AlignConfig {
  const questions: AlignQuestion[] =
    setting === "inpatient"
      ? [
          pathSelectorQuestion(setting),
          gateDrgQuestion,
          gateCdiQuestion,
          gateObsQuestion,
          whereQuestion(setting),
          proofQuestion(setting),
        ]
      : [
          pathSelectorQuestion(setting),
          ...(setting === "outpatient" ? [whoHccQuestion] : []),
          whoEmQuestion(setting),
          whoDenialsQuestion,
          ...(setting === "outpatient" ? [gateHccQuestion] : []),
          gateEmQuestion(setting),
          gateDenialsQuestion,
          whereQuestion(setting),
          proofQuestion(setting),
        ];

  return {
    goal: "revenue",
    eyebrow: "Align on what you mean",
    intro:
      "One lever starts every path here: complete, specific documentation at the point of care. Pick the revenue you are going after, and for each path we agree on what is really behind the leak. The figure at the end is the proof of what you aligned on, not the goal.",
    dimensionTotal: setting === "inpatient" ? 4 : 5,
    questions,
    toLeverValues: revenueAlignToLeverValues,
    deriveProof: deriveRevenueAlignProof,
  };
}
