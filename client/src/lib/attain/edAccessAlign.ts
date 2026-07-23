/**
 * Attain — ED ACCESS Align config.
 *
 * Five "choose your meaning" questions that map onto the EXISTING ED access
 * decision chain (`computeEdAccessChain` in attainEdAccess.ts), so the derived
 * number still reconciles to Explore's `edLwbs` / admission-capture primitives
 * exactly as the bespoke D1-D5 ladder did. No engine/dollar-math changes: the
 * choices simply feed the same `LeverValues` the chain always read
 * (`edAccessProviders`, `edAccessThroughputShare`, `edAccessDocCausedShare`,
 * `edAccessLwbsRate`, `edAccessAdmissionRate`), and the recoverable-pool gate
 * MIN(recoverable pool, freed-time capacity) still governs realized recovery.
 *
 *   Q1 Outcome (multi) — what are you after: cut left-without-being-seen /
 *      faster door-to-provider / capture more admissions. The first two are the
 *      SAME recovered-visit mechanism (framing), so they align the story, not
 *      the number. "Capture more admissions" additionally turns on the
 *      admission leg (a conservative `edAccessAdmissionRate`, benchmarked, an
 *      OPTIONAL number sharpens it); unpicked leaves that leg at zero.
 *   Q2 Who — the population cut. The PROVIDER COUNT is inherited from Starting
 *      Point (never re-asked); they pick "all providers" or "a focused set",
 *      with an OPTIONAL provider number that sharpens the cut. Maps to
 *      `edAccessProviders` (capped to the baseline by the engine).
 *   Q3 Gate (THE HONEST GATE) — why do patients leave without being seen. ONLY
 *      the documentation-bound answer lets Abridge move it: freeing charting
 *      time speeds door-to-provider throughput, so it maps to a real
 *      documentation-caused share of the LWBS pool (`edAccessDocCausedShare`)
 *      plus a conservative directed throughput share (`edAccessThroughputShare`).
 *      "Short-staffed or out of beds" maps the doc-caused share to 0 — Abridge
 *      cannot add staff or open beds, so nothing is recoverable and the honest
 *      number is zero. "Low demand" still frees the time, but few patients are
 *      leaving to recover: the blank LWBS-rate benchmark collapses to a small
 *      value, so unless the partner points to a real LWBS rate the number
 *      stays near zero. Either way the value reflects the limit out loud.
 *   Q4 Where the loss shows up (multi) — LWBS at triage / long door-to-provider
 *      / boarding. FRAMING that shapes the story and the Plan's signals. The
 *      "LWBS at triage" option carries the OPTIONAL current-LWBS-rate number
 *      that sizes the pool; blank falls back to a clearly labeled, gate-scaled
 *      benchmark (never a fabricated-precise figure).
 *   Q5 Proof (multi) — LWBS rate / door-to-provider time / recovered visits /
 *      captured admissions. The evidence that would convince them; becomes the
 *      Plan's signals. FRAMING here.
 *
 * The "direct the freed time to faster door-to-provider throughput" COMMITMENT
 * (owner, protected relief) belongs to the Plan, not Align — so Align sets a
 * sensible, conservative directed share from the honest gate and leaves the
 * commitment to the Plan step.
 *
 * Minutes saved per note, hours of throughput time per recovered patient,
 * contribution margin per recovered visit and per admission, and the
 * bed/payer admission-realization cap are FACTS, not meaning-choices: they are
 * NOT re-asked here. They fall back to this chain's own conservative
 * benchmarks (9 min/note, 1.5 hrs/recovery, $380/visit, $8,000/admission, 60%
 * admission realization), shown with a visible "Benchmark" tag in the proof so
 * they are never mistaken for the partner's own numbers.
 */

import {
  computeEdAccessChain,
  edAccessBindingPlainPhrase,
  DEFAULT_ED_ACCESS_LWBS_RATE,
  DEFAULT_ED_ACCESS_ADMISSION_RATE,
} from "./attainEdAccess";
import { realizedValue, formulaWithRealization, type AttainBaseline, type LeverValues } from "./attainLevers";
import {
  firstSelected,
  selectedOptionIds,
  sharpenerNumber,
  type AlignConfig,
  type AlignContext,
  type AlignProof,
  type AlignProofFigure,
} from "./alignFramework";

// ── Conservative choice -> value maps (exported so the tests assert them) ───

/** Q3 honest gate -> the documentation-caused SHARE of the LWBS pool
 * (`edAccessDocCausedShare`, 0-100), the diagnosis that decides how much of the
 * leak is Abridge's to recover. ONLY the documentation-bound answer makes any
 * of the leak recoverable; "short staffing / beds" cannot be solved by freeing
 * time, so its share is 0 and nothing is recoverable. "Low demand" keeps a real
 * share ONLY once a real LWBS rate is named (see `edAccessAlignToLeverValues`):
 * on a blank rate the pool collapses to zero, so the honest near-zero holds
 * until the partner points to real patients leaving. */
export const ED_ACCESS_GATE_DOC_CAUSED_SHARE_PCT: Record<string, number> = {
  documentation: 60,
  staffing: 0,
  lowdemand: 60,
};

/** Q3 honest gate -> the share of freed documentation time directed to faster
 * door-to-provider throughput (`edAccessThroughputShare`, 0-100). A sensible,
 * conservative directed share; the actual protect-the-relief commitment is the
 * Plan's. Zero for short staffing / beds (freeing time buys no throughput when
 * the limit is people or physical capacity). */
export const ED_ACCESS_GATE_THROUGHPUT_SHARE_PCT: Record<string, number> = {
  documentation: 50,
  staffing: 0,
  lowdemand: 50,
};

// ── Store keys (extra LeverValues keys, ignored by the engine, round-trip
//    through the existing per-goal persistence) ─────────────────────────────

const K_OUTCOME = "edAccessAlignOutcome";
const K_WHO = "edAccessAlignWho";
const K_WHO_COUNT = "edAccessAlignWhoCount";
const K_GATE = "edAccessAlignGate";
const K_WHERE = "edAccessAlignWhere";
const K_PROOF = "edAccessAlignProof";
const K_LWBS_RATE = "edAccessAlignLwbsRate";
const K_ADMISSION_RATE = "edAccessAlignAdmissionRate";

// ── Local formatting (kept self-contained, same convention as attainEdAccess) ─

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function totalProvidersFor(baseline: AttainBaseline): number {
  return Math.max(0, Math.round(baseline.providers ?? 0));
}

// ── The choice -> engine mapping (the one source of truth for the number) ───

/** Resolves the provider count in scope from Q2, inheriting the Starting-point
 * headcount and never fabricating one — mirrors accessAlign's `providersFromWho`. */
function providersFromWho(values: LeverValues, baseline: AttainBaseline): { providers: number; who?: string } {
  const total = totalProvidersFor(baseline);
  const who = firstSelected(values, K_WHO);
  if (who === "all") {
    return { providers: total, who };
  }
  if (who === "focused") {
    const whoCount = sharpenerNumber(values, K_WHO_COUNT);
    if (whoCount > 0) {
      return { providers: total > 0 ? Math.min(whoCount, total) : whoCount, who };
    }
    // Blank -> a clearly labeled benchmark: about half the team.
    return { providers: total > 0 ? Math.round(total / 2) : 0, who };
  }
  return { providers: 0, who };
}

export function edAccessAlignToLeverValues(values: LeverValues, _ctx: AlignContext): LeverValues {
  const { baseline } = _ctx;
  const { providers } = providersFromWho(values, baseline);

  const gate = firstSelected(values, K_GATE);
  const typedLwbs = sharpenerNumber(values, K_LWBS_RATE);

  let docCausedShare = gate ? (ED_ACCESS_GATE_DOC_CAUSED_SHARE_PCT[gate] ?? 0) : 0;
  // Low demand, like outpatient's "no demand": the LWBS pool collapses to zero
  // on a blank rate (few patients are leaving to recover), and only a real,
  // named LWBS rate revives it. Zeroing the diagnosis share is the honest way
  // to say so, since the engine floors a written 0% LWBS rate back to its
  // benchmark. Documentation/staffing keep their share as-is.
  if (gate === "lowdemand" && typedLwbs <= 0) docCausedShare = 0;
  const throughputShare = gate ? (ED_ACCESS_GATE_THROUGHPUT_SHARE_PCT[gate] ?? 0) : 0;

  // The current LWBS rate is the partner's own fact: a typed number sizes the
  // pool exactly; blank falls back to the chain's own labeled benchmark. Only
  // written once a gate is chosen, so an untouched Align stays honestly unready.
  const lwbsLevers: LeverValues = {};
  if (gate) {
    lwbsLevers.edAccessLwbsRate = typedLwbs > 0 ? typedLwbs : DEFAULT_ED_ACCESS_LWBS_RATE;
  }

  // The admission leg is only in play when the partner is after admissions
  // (Q1). Unpicked -> a genuine 0 admission share, so no admission margin is
  // ever silently credited. A typed number sharpens the benchmark share.
  const outcomes = selectedOptionIds(values, K_OUTCOME);
  const wantsAdmissions = outcomes.includes("admissions");
  const typedAdmission = sharpenerNumber(values, K_ADMISSION_RATE);
  const admissionRate = wantsAdmissions
    ? (typedAdmission > 0 ? typedAdmission : DEFAULT_ED_ACCESS_ADMISSION_RATE)
    : 0;

  return {
    edAccessProviders: providers,
    edAccessDocCausedShare: docCausedShare,
    edAccessThroughputShare: throughputShare,
    edAccessAdmissionRate: admissionRate,
    ...lwbsLevers,
  };
}

// ── The derived proof ───────────────────────────────────────────────────────

export function deriveEdAccessAlignProof(values: LeverValues, ctx: AlignContext): AlignProof {
  const { baseline, realizationPct, crossGoalShareMultiplier } = ctx;
  const engine = edAccessAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };
  const chain = computeEdAccessChain(baseline, merged, crossGoalShareMultiplier);
  const { scope, mechanism, pool, recovery, payoff } = chain;

  const who = firstSelected(values, K_WHO);
  const whoCount = sharpenerNumber(values, K_WHO_COUNT);
  const gate = firstSelected(values, K_GATE);

  const realized = realizedValue(payoff.value, realizationPct);
  const ready = payoff.value > 0;

  // Providers tag: inherited when "all", a labeled benchmark when a focused cut
  // was chosen without a number, otherwise the partner's own sharpened number.
  const providersTag: AlignProofFigure["tag"] =
    who === "all" ? "inherited" : who === "focused" && whoCount <= 0 ? "benchmark" : undefined;

  const figures: AlignProofFigure[] = [
    {
      label: "In scope",
      value: `${fmtInt(scope.providersInScope)} providers`,
      tag: providersTag,
    },
    {
      label: "Margin / visit",
      value: `$${fmtInt(payoff.marginPerVisit)}`,
      tag: "benchmark",
    },
    {
      label: "Recoverable pool",
      value: `${fmtInt(pool.recoverablePool)} / yr`,
    },
    {
      label: "Freed-time capacity",
      value: `${fmtInt(mechanism.mechanicallyEnabledRecovered)} / yr`,
    },
  ];

  const math = ready
    ? formulaWithRealization(chain.formulas.payoff, realizationPct, realized)
    : "The number appears once you set who this is for, why patients leave, and where the loss shows up.";

  const emptyHint = !who
    ? "Pick who this is for to start the number."
    : !gate
      ? "Say why patients leave without being seen, so we size only what Abridge can honestly move."
      : gate === "staffing"
        ? "You told us the limit is staffing or beds. Abridge frees documentation time, but it cannot add staff or open beds, so no left-without-being-seen visit becomes recoverable. The honest number here is zero."
        : gate === "lowdemand" && pool.recoverablePool <= 0
          ? "You told us demand is low. Abridge can free the time, but few patients are leaving to recover. Add your real LWBS rate under where the loss shows up and the number follows."
          : "Set your choices above and the number falls out here.";

  const headlineSub = ready
    ? `about ${fmtInt(recovery.realizedRecovered)} recovered visits a year${
        recovery.capturedAdmissions > 0 ? ` and ${fmtInt(recovery.capturedAdmissions)} captured admissions` : ""
      }. ${edAccessBindingPlainPhrase(recovery.binding)}`
    : "the proof of what you just aligned on";

  return {
    ready,
    headlineLabel: "What recovering these visits is worth",
    headlineValue: realized,
    headlineSub,
    emptyHint,
    figures,
    math,
  };
}

// ── The config the AlignStep renders ────────────────────────────────────────

export const edAccessAlignConfig: AlignConfig = {
  goal: "access",
  eyebrow: "Align on what you mean",
  // Framing lives once in the step header; this surface goes straight to the questions.
  intro: "",
  questions: [
    {
      id: "outcome",
      storeKey: K_OUTCOME,
      prompt: "What are you really after?",
      helper: "The first two run on the same freed time; this sets the framing. Capturing admissions adds a second, separately priced leg.",
      mode: "multi",
      options: [
        { id: "lwbs", label: "Cut left-without-being-seen", helper: "Bring back patients who show up but leave the waiting room before a provider sees them." },
        { id: "doortoprovider", label: "Faster door-to-provider", helper: "Shorten the walk from arrival to a provider, so fewer patients give up and leave." },
        {
          id: "admissions",
          label: "Capture more admissions",
          helper: "Some recovered patients turn out to need admitting. This adds that downstream margin, priced separately.",
          sharpener: {
            storeKey: K_ADMISSION_RATE,
            label: "Roughly what share of recovered patients get admitted? (optional)",
            unit: "%",
            placeholder: "e.g., 18",
            benchmarkNote: "Leave this blank and we use a conservative benchmark admission share, capped by bed and payer availability.",
            max: 100,
            decimal: false,
          },
        },
      ],
    },
    {
      id: "who",
      storeKey: K_WHO,
      prompt: "Who is this for?",
      helper: "Your ED provider count carries over from Starting Point. Pick the cut.",
      mode: "single",
      options: [
        {
          id: "all",
          label: "All ED providers",
          helper: "Everyone on your starting-point ED count.",
          dynamicHelper: (ctx) => {
            const total = totalProvidersFor(ctx.baseline);
            return total > 0
              ? `All ${fmtInt(total)} ED providers on your starting-point count.`
              : "Everyone on your starting-point ED count.";
          },
        },
        {
          id: "focused",
          label: "A focused set",
          helper: "A specific group of ED providers or shifts you want to start with.",
          sharpener: {
            storeKey: K_WHO_COUNT,
            label: "Roughly how many providers? (optional)",
            unit: "providers",
            placeholder: "e.g., 20",
            benchmarkNote: "Leave this blank and we use a conservative benchmark: about half your ED providers.",
            decimal: false,
          },
        },
      ],
    },
    {
      id: "gate",
      storeKey: K_GATE,
      prompt: "Why do patients leave without being seen?",
      helper: "The honest gate. Abridge frees documentation time, so it moves the throughput charting chokes, nothing more. It cannot add staff or open beds, or create demand that is not there.",
      mode: "single",
      options: [
        {
          id: "documentation",
          label: "Throughput is choked by charting",
          helper: "Providers are here, but the day is full of charting, so the door-to-provider walk drags and patients give up. This is the load Abridge frees.",
        },
        {
          id: "staffing",
          label: "Short-staffed or out of beds",
          helper: "The limit is people or physical capacity. Freeing time cannot add staff or open beds.",
        },
        {
          id: "lowdemand",
          label: "Low demand, few patients leaving",
          helper: "Not many patients are leaving without being seen. Abridge can free the time, but there has to be a real leak to recover.",
        },
      ],
    },
    {
      id: "where",
      storeKey: K_WHERE,
      prompt: "Where does the loss show up?",
      helper: "Pick the places you actually see it. These become the signals your plan tracks. A number sharpens the LWBS rate; leave it blank and we use a conservative labeled benchmark.",
      mode: "multi",
      options: [
        {
          id: "triage",
          label: "LWBS at triage",
          helper: "Patients who check in, wait, and leave before a provider sees them.",
          sharpener: {
            storeKey: K_LWBS_RATE,
            label: "Roughly what is your current LWBS rate? (optional)",
            unit: "%",
            placeholder: "e.g., 8",
            benchmarkNote: "Blank uses a conservative benchmark LWBS rate. If you told us demand is low, the number stays at zero until you name a real rate here.",
            max: 50,
            decimal: false,
          },
        },
        {
          id: "doortoprovider",
          label: "Long door-to-provider time",
          helper: "The wait from arrival to a provider running long, the drag that pushes patients to leave.",
        },
        {
          id: "boarding",
          label: "Boarding and admitted holds",
          helper: "Admitted patients holding in the ED, backing up the front end so more patients leave.",
        },
      ],
    },
    {
      id: "proof",
      storeKey: K_PROOF,
      prompt: "What proof would convince you it worked?",
      helper: "Pick any that matter. These become the signals your plan tracks.",
      mode: "multi",
      options: [
        { id: "lwbsrate", label: "LWBS rate dropping", helper: "The share of arrivals who leave before being seen trending down against this baseline." },
        { id: "doortime", label: "Door-to-provider time dropping", helper: "The minutes from arrival to a provider coming down." },
        { id: "recovered", label: "Recovered visits", helper: "Patients who would have left but were seen instead, actually landing on the schedule." },
        { id: "admissions", label: "Captured admissions", helper: "Recovered patients who needed admitting and were admitted, showing up in the census." },
      ],
    },
  ],
  toLeverValues: edAccessAlignToLeverValues,
  deriveProof: deriveEdAccessAlignProof,
};
