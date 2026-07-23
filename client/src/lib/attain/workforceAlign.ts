/**
 * Attain — WORKFORCE (retention) Align config: the exemplar.
 *
 * Five "choose your meaning" questions that map onto the EXISTING workforce
 * step-down engine (`computeWorkforceChain`), so the derived number still
 * reconciles to `computeAllDriverValues` exactly as the old ladder did. No
 * engine/dollar-math changes: the choices simply feed the same `LeverValues`
 * the chain always read.
 *
 *   Q1 Outcome  (keep our people / a better day / both) — FRAMING. Both of
 *      Abridge's retention benefits share one dollar in this engine (departures
 *      avoided x replacement cost), so Q1 aligns the story, not the number.
 *   Q2 Who      — the population cut. The HEADCOUNT is inherited from Starting
 *      Point (never re-asked); they pick "all of them" or "a focused group",
 *      with an OPTIONAL number that sharpens the cut. Maps to retentionProviders.
 *   Q3 Gate     (mostly burnout / a meaningful share / mostly pay or life) — the
 *      honest ceiling on what Abridge can move. Maps CONSERVATIVELY to the share
 *      of freed relief that converts to retention (retentionProtect). Mostly-pay-
 *      or-life converts the least; even mostly-burnout tops out well under 100%.
 *   Q4 Where it hurts (in the visit / after hours / both) — after-hours charting
 *      is the burden Abridge most directly relieves, so it earns a more durable,
 *      pulse-backed plan. Maps to the "make the relief hold" knobs
 *      (retentionSurveyCadence + retentionSustain).
 *   Q5 Proof    (turnover number / Love Stories / burnout pulse) — the evidence
 *      that would convince them; becomes the Plan's signals. FRAMING here.
 *
 * The "protect the relief" COMMITMENT (owner, sustained cadence) belongs to the
 * Plan, not Align — so Align sets a sensible, conservative starter for the hold
 * knobs and leaves the commitment to the Plan step, unchanged for now.
 *
 * Turnover rate and replacement cost are NOT re-asked here (Starting Point does
 * not collect them yet); they fall back to this setting's benchmark, shown with
 * a visible "Benchmark" tag in the proof so they are never mistaken for the
 * partner's own numbers.
 */

import {
  computeWorkforceChain,
  WORKFORCE_TURNOVER_DEFAULT_PCT,
  WORKFORCE_REPLACEMENT_COST_DEFAULT,
  WORKFORCE_IMPACT_CEILING_PP,
} from "./attainWorkforce";
import { realizedValue, formulaWithRealization, type AttainBaseline, type LeverValues } from "./attainLevers";
import type { AttainSetting } from "./attainTypes";
import {
  firstSelected,
  sharpenerNumber,
  type AlignConfig,
  type AlignContext,
  type AlignProof,
  type AlignProofFigure,
} from "./alignFramework";

// ── Conservative choice -> value maps (exported so the tests assert them) ───

/** Q3 gate -> share of freed relief that converts to retention. Conservative:
 * even "mostly burnout" stays at 75%, never a full 100% claim. */
export const WORKFORCE_GATE_PROTECT_PCT: Record<string, number> = {
  burnout: 75,
  meaningful: 50,
  paylife: 25,
};

/** Q4 where-it-hurts -> pulse cadence level (0 none / 1 quarterly / 2 monthly). */
export const WORKFORCE_BURDEN_SURVEY_LEVEL: Record<string, number> = {
  visit: 0,
  afterhours: 1,
  both: 2,
};

/** Q4 where-it-hurts -> months the relief is assumed to hold (of 12).
 * After-hours charting is the burden Abridge most directly relieves, so it
 * earns a more durable hold than in-the-visit screen time. */
export const WORKFORCE_BURDEN_SUSTAIN_MONTHS: Record<string, number> = {
  visit: 6,
  afterhours: 9,
  both: 12,
};

// ── Local formatting (kept self-contained, same convention as attainWorkforce) ─

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtPp(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function unitNounFor(setting: AttainSetting): { plural: string; singular: string } {
  return setting === "nursing" ? { plural: "nurses", singular: "nurse" } : { plural: "providers", singular: "provider" };
}
function totalUnitsFor(setting: AttainSetting, baseline: AttainBaseline): number {
  const n = setting === "nursing" ? baseline.nursingFtes : baseline.providers;
  return Math.max(0, Math.round(n ?? 0));
}

// ── Store keys (extra LeverValues keys, ignored by the engine, round-trip
//    through the existing per-goal persistence) ─────────────────────────────

const K_OUTCOME = "retentionAlignOutcome";
const K_WHO = "retentionAlignWho";
const K_WHO_COUNT = "retentionAlignWhoCount";
const K_GATE = "retentionAlignGate";
const K_BURDEN = "retentionAlignBurden";
const K_PROOF = "retentionAlignProof";

// ── The choice -> engine mapping (the one source of truth for the number) ───

export function workforceAlignToLeverValues(values: LeverValues, ctx: AlignContext): LeverValues {
  const { baseline, setting } = ctx;
  const totalUnits = totalUnitsFor(setting, baseline);

  const who = firstSelected(values, K_WHO);
  const whoCount = sharpenerNumber(values, K_WHO_COUNT);
  let providers = 0;
  if (who === "all") {
    providers = totalUnits;
  } else if (who === "focused") {
    if (whoCount > 0) {
      providers = totalUnits > 0 ? Math.min(whoCount, totalUnits) : whoCount;
    } else {
      // Blank -> a clearly labeled benchmark: about half the team.
      providers = totalUnits > 0 ? Math.round(totalUnits / 2) : 0;
    }
  }

  const gate = firstSelected(values, K_GATE);
  const retentionProtect = gate ? (WORKFORCE_GATE_PROTECT_PCT[gate] ?? 0) : 0;

  const burden = firstSelected(values, K_BURDEN);
  const retentionSurveyCadence = burden ? (WORKFORCE_BURDEN_SURVEY_LEVEL[burden] ?? 0) : 0;
  const retentionSustain = burden ? (WORKFORCE_BURDEN_SUSTAIN_MONTHS[burden] ?? 0) : 0;

  return {
    retentionProviders: providers,
    retentionProtect,
    retentionSurveyCadence,
    // Backfill is a Plan-side coverage commitment, not an Align meaning-choice.
    retentionBackfill: 0,
    retentionSustain,
  };
}

// ── The derived proof ───────────────────────────────────────────────────────

export function deriveWorkforceAlignProof(values: LeverValues, ctx: AlignContext): AlignProof {
  const { setting, baseline, realizationPct, crossGoalShareMultiplier } = ctx;
  const engine = workforceAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };
  const chain = computeWorkforceChain(baseline, setting, merged, crossGoalShareMultiplier);
  const { scope, payoff } = chain;
  const units = unitNounFor(setting);

  const who = firstSelected(values, K_WHO);
  const whoCount = sharpenerNumber(values, K_WHO_COUNT);
  const gate = firstSelected(values, K_GATE);
  const burden = firstSelected(values, K_BURDEN);

  const realized = realizedValue(payoff.value, realizationPct);
  const ready = payoff.value > 0;

  // Providers tag: inherited when "all", a labeled benchmark when a focused cut
  // was chosen without a number, otherwise the partner's own sharpened number.
  const providersTag: AlignProofFigure["tag"] =
    who === "all" ? "inherited" : who === "focused" && whoCount <= 0 ? "benchmark" : undefined;

  const figures: AlignProofFigure[] = [
    {
      label: `In scope`,
      value: `${fmtInt(scope.providersInScope)} ${units.plural}`,
      tag: providersTag,
    },
    {
      label: "Voluntary turnover",
      value: `${fmtPp(scope.turnoverRatePct)}%`,
      tag: "benchmark",
    },
    {
      label: "Replacement cost",
      value: `$${fmtInt(scope.replacementCost)}`,
      tag: "benchmark",
    },
    {
      label: "Departures avoided",
      value: `${payoff.departuresAvoided.toFixed(1)} / yr`,
    },
  ];

  const math = ready
    ? formulaWithRealization(chain.formulas.payoff, realizationPct, realized)
    : chain.formulas.payoff;

  const emptyHint = !who
    ? "Pick who this is for to start the number."
    : !gate
      ? "Say what is driving departures, so we size only what Abridge can honestly move."
      : !burden
        ? "Say where the burden hurts, so the relief that follows is real."
        : "Set your choices above and the number appears here.";

  const headlineSub = ready
    ? `about ${fmtPp(payoff.turnoverPointsReduced)} points off your ${fmtPp(scope.turnoverRatePct)}% turnover rate, at a ${WORKFORCE_IMPACT_CEILING_PP[setting]}% reachable ceiling`
    : "the proof of what you just aligned on";

  return {
    ready,
    headlineLabel: "What keeping them is worth",
    headlineValue: realized,
    headlineSub,
    emptyHint,
    figures,
    math,
  };
}

// ── The config the AlignStep renders ────────────────────────────────────────

export const workforceAlignConfig: AlignConfig = {
  goal: "retention",
  eyebrow: "Align on what you mean",
  // Framing lives once in the step header; this surface goes straight to the questions.
  intro: "",
  questions: [
    {
      id: "outcome",
      storeKey: K_OUTCOME,
      prompt: "What are you trying to accomplish?",
      helper: "Same dollar either way. This shapes how you describe it, not the number.",
      mode: "single",
      options: [
        { id: "keep", label: "Keep our people", helper: "Fewer of the clinicians you have today choosing to leave." },
        { id: "betterday", label: "A better day", helper: "The same team, with a lighter, more livable day." },
        { id: "both", label: "Both", helper: "Lower voluntary turnover and a better clinician experience together." },
      ],
    },
    {
      id: "who",
      storeKey: K_WHO,
      prompt: "Who is this for?",
      helper: "Your headcount carries over from Starting Point. Pick the cut.",
      mode: "single",
      options: [
        {
          id: "all",
          label: "All of them",
          helper: "Everyone on your starting-point count.",
          dynamicHelper: (ctx) => {
            const total = totalUnitsFor(ctx.setting, ctx.baseline);
            const units = unitNounFor(ctx.setting);
            return total > 0
              ? `All ${fmtInt(total)} ${units.plural} on your starting-point count.`
              : `Everyone on your starting-point count.`;
          },
        },
        {
          id: "focused",
          label: "A focused group",
          helper: "A specific team or cohort you want to hold onto first.",
          sharpener: {
            storeKey: K_WHO_COUNT,
            label: "Roughly how many? (optional)",
            unit: "people",
            placeholder: "e.g., 20",
            benchmarkNote: "Leave this blank and we use a conservative benchmark: about half your team.",
            decimal: false,
          },
        },
      ],
    },
    {
      id: "gate",
      storeKey: K_GATE,
      prompt: "What is driving your departures?",
      helper: "The honest gate. Abridge moves the burnout-and-workload share, not pay or life decisions. Only that share counts.",
      mode: "single",
      options: [
        { id: "burnout", label: "Mostly burnout and workload", helper: "The day itself is the problem, and the documentation load is a big part of it." },
        { id: "meaningful", label: "A meaningful share", helper: "Burnout is one real driver among several." },
        { id: "paylife", label: "Mostly pay or life", helper: "Compensation or life moves lead, so even a great plan moves this a little." },
      ],
    },
    {
      id: "burden",
      storeKey: K_BURDEN,
      prompt: "Where does the burden hurt most?",
      helper: "This shapes how durable the relief is. After-hours charting is the load Abridge most directly frees.",
      mode: "single",
      options: [
        { id: "visit", label: "In the visit", helper: "Screen instead of patient, so the presence in the room suffers." },
        { id: "afterhours", label: "After hours", helper: "Charting at night, the work outside of work that drives burnout." },
        { id: "both", label: "Both", helper: "The load shows up in the room and after the shift." },
      ],
    },
    {
      id: "proof",
      storeKey: K_PROOF,
      prompt: "What would tell you it's working?",
      helper: "Pick any that matter. These become the signals your plan tracks.",
      mode: "multi",
      options: [
        { id: "turnover", label: "The turnover number moving", helper: "Voluntary departures trending down against this baseline." },
        { id: "vacancy", label: "Open roles filling faster", helper: "Fewer open positions and a shorter time to fill them, the companion to the turnover number." },
        { id: "lovestories", label: "Love Stories from clinicians", helper: "Clinicians telling you the day got better in their own words." },
        { id: "pulse", label: "A burnout pulse", helper: "A short likelihood-to-stay and burnout pulse improving over time." },
      ],
    },
  ],
  toLeverValues: workforceAlignToLeverValues,
  deriveProof: deriveWorkforceAlignProof,
};
