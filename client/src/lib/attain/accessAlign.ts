/**
 * Attain — ACCESS (outpatient) Align config.
 *
 * Five "choose your meaning" questions that map onto the EXISTING access
 * decision chain (`computeAccessChain` in attainAccess.ts), so the derived
 * number still reconciles to Explore's `patientAccess` driver exactly as the
 * D1-D5 ladder did. No engine/dollar-math changes: the choices simply feed the
 * same `LeverValues` the chain always read (`accessProviders`,
 * `accessEnterprise`, `accessFreedShare`, and the four demand sources), and the
 * demand gate MIN(capacity, demand) still governs the realized visits.
 *
 *   Q1 Outcome  (reduce the backlog / shorten the wait / add capacity) —
 *      FRAMING. All three are the same freed-time-to-capacity mechanism here,
 *      so Q1 aligns the story, not the number.
 *   Q2 Who      — the population cut. The PROVIDER COUNT is inherited from
 *      Starting Point (never re-asked); they pick "all lines and providers" or
 *      "a focused set", with an OPTIONAL provider number that sharpens the cut.
 *      Maps to accessEnterprise + accessProviders.
 *   Q3 Gate (NEW, the honest gate access lacked) — why can't you see more
 *      patients today. ONLY the documentation-bound answer lets Abridge move
 *      it: it frees the documentation time that becomes capacity, so it maps to
 *      a conservative directed share (accessFreedShare). "Not enough providers,
 *      rooms, staff" maps the share to 0 — Abridge cannot add bodies or space,
 *      so no capacity opens and the honest number is zero. "Not enough demand"
 *      still frees the time, but there is nothing to fill: the demand benchmark
 *      collapses to 0, so unless the partner points to real waiting patients the
 *      number stays at zero. Either way the value reflects the limit out loud.
 *   Q4 Where the demand comes from (referral backlog / new referrals / same-day
 *      urgent / no-shows to recover) — MULTI-SELECT, the demand ceiling. NUMBERS
 *      OPTIONAL: each selected source carries an optional count that sharpens
 *      the ceiling; a blank source falls back to a clearly labeled conservative
 *      benchmark (a small share of the in-scope encounter volume), never a
 *      fabricated-precise figure. Maps to the four countable demand levers.
 *   Q5 Proof    (wait time / third-next-available / backlog shrinking / more
 *      visits / Love Stories) — the evidence that would convince them; becomes
 *      the Plan's signals. FRAMING here.
 *
 * The "direct the freed time to the schedule as bookable slots" COMMITMENT
 * (owner, protected relief) belongs to the Plan, not Align — so Align sets a
 * sensible, conservative directed share from the honest gate and leaves the
 * commitment to the Plan step, unchanged for now.
 *
 * Minutes saved per note, average visit length, and contribution margin per
 * visit are FACTS, not meaning-choices: they are NOT re-asked here. They fall
 * back to this chain's own conservative benchmarks (2 min/note, ~20 min/visit,
 * $200 blended margin), shown with a visible "Benchmark" tag in the proof so
 * they are never mistaken for the partner's own numbers.
 */

import {
  computeAccessChain,
  bindingPlainPhrase,
  DEFAULT_BLENDED_MARGIN_PER_VISIT,
} from "./attainAccess";
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

/** Q3 honest gate -> the share of freed documentation time directed to the
 * schedule (accessFreedShare, 0-100). ONLY the documentation-bound answer lets
 * Abridge open capacity; "bodies/space" cannot be solved by freeing time, so
 * its share is 0. "No demand" still frees the time (a real share), but the
 * demand benchmark below collapses to 0, so the ceiling limits it instead. */
export const ACCESS_GATE_FREED_SHARE_PCT: Record<string, number> = {
  documentation: 50,
  bodies: 0,
  demand: 50,
};

/** Q3 honest gate -> multiplier on the blank-source demand BENCHMARK. When the
 * partner says demand is the limit, a blank demand source benchmarks to 0 (not
 * a conservative typical) so the honest zero holds until they point to real
 * waiting patients. Documentation/bodies keep the normal benchmark. */
export const ACCESS_GATE_DEMAND_BENCH_MULT: Record<string, number> = {
  documentation: 1,
  bodies: 1,
  demand: 0,
};

/** Conservative blank-source demand benchmarks, as a share of the in-scope
 * annual encounter volume. Deliberately small: a labeled starting point a
 * partner replaces with their own count, never a headline figure. Backlog is a
 * one-time count; new referrals is annualized then divided to a monthly rate;
 * same-day and no-show are annual counts. No-show uses the same 12% x 30%
 * (rate x recoverable) logic the chain's own no-show helper documents. */
export const ACCESS_DEMAND_BENCH_FRAC: Record<string, number> = {
  backlog: 0.02,
  referrals: 0.03,
  sameday: 0.02,
  noshow: 0.036,
};

// ── Local formatting (kept self-contained, same convention as attainAccess) ─

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function totalProvidersFor(baseline: AttainBaseline): number {
  return Math.max(0, Math.round(baseline.providers ?? 0));
}

/** The in-scope annual encounter volume the blank-source demand benchmarks are
 * a small share of — mirrors `computeAccessDemand`'s own `encountersInScope`
 * (providersInScope x per-provider encounters x utilization) so the benchmark
 * scales with the same fact base the engine prices demand against. */
function encountersInScopeFor(baseline: AttainBaseline, providersInScope: number): number {
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  const perProvider = providers > 0 && encounters > 0 ? encounters / providers : 3_500;
  const util = Math.min(1, Math.max(0, (baseline.utilizationPct ?? 70) / 100));
  return providersInScope * perProvider * util;
}

// ── Store keys (extra LeverValues keys, ignored by the engine, round-trip
//    through the existing per-goal persistence) ─────────────────────────────

const K_OUTCOME = "accessAlignOutcome";
const K_WHO = "accessAlignWho";
const K_WHO_COUNT = "accessAlignWhoCount";
const K_GATE = "accessAlignGate";
const K_DEMAND = "accessAlignDemand";
const K_PROOF = "accessAlignProof";

/** Q4 demand option id -> (engine lever it feeds, its optional sharpener key).
 * Exported so the tests and the demand mapping share one source of truth. */
export const ACCESS_DEMAND_SOURCES: {
  id: string;
  engineKey: string;
  sharpenerKey: string;
  /** New referrals is a per-MONTH rate the engine annualizes (x12); the others
   * are direct annual (or one-time) counts. */
  monthly?: boolean;
}[] = [
  { id: "backlog", engineKey: "accessDemandBacklog", sharpenerKey: "accessAlignBacklogCount" },
  { id: "referrals", engineKey: "accessDemandNewReferrals", sharpenerKey: "accessAlignReferralsCount", monthly: true },
  { id: "sameday", engineKey: "accessDemandSameDayCount", sharpenerKey: "accessAlignSameDayCount" },
  { id: "noshow", engineKey: "accessDemandNoShowCount", sharpenerKey: "accessAlignNoShowCount" },
];

// ── The choice -> engine mapping (the one source of truth for the number) ───

/** Resolves the provider count in scope from Q2, inheriting the Starting-point
 * headcount and never fabricating one. */
function providersFromWho(values: LeverValues, baseline: AttainBaseline): { providers: number; enterprise: boolean; who?: string } {
  const total = totalProvidersFor(baseline);
  const who = firstSelected(values, K_WHO);
  if (who === "all") {
    return { providers: total, enterprise: true, who };
  }
  if (who === "focused") {
    const whoCount = sharpenerNumber(values, K_WHO_COUNT);
    if (whoCount > 0) {
      return { providers: total > 0 ? Math.min(whoCount, total) : whoCount, enterprise: false, who };
    }
    // Blank -> a clearly labeled benchmark: about half the team.
    return { providers: total > 0 ? Math.round(total / 2) : 0, enterprise: false, who };
  }
  return { providers: 0, enterprise: false, who };
}

export function accessAlignToLeverValues(values: LeverValues, ctx: AlignContext): LeverValues {
  const { baseline } = ctx;
  const { providers, enterprise } = providersFromWho(values, baseline);

  const gate = firstSelected(values, K_GATE);
  const accessFreedShare = gate ? (ACCESS_GATE_FREED_SHARE_PCT[gate] ?? 0) : 0;
  const benchMult = gate ? (ACCESS_GATE_DEMAND_BENCH_MULT[gate] ?? 1) : 1;

  const encountersInScope = encountersInScopeFor(baseline, providers);
  const selectedDemand = selectedOptionIds(values, K_DEMAND);

  const demandLevers: LeverValues = {};
  for (const source of ACCESS_DEMAND_SOURCES) {
    if (!selectedDemand.includes(source.id)) {
      demandLevers[source.engineKey] = 0;
      continue;
    }
    const typed = sharpenerNumber(values, source.sharpenerKey);
    if (typed > 0) {
      demandLevers[source.engineKey] = typed;
      continue;
    }
    // Blank -> a clearly labeled conservative benchmark, scaled by the gate.
    const annualBench = encountersInScope * (ACCESS_DEMAND_BENCH_FRAC[source.id] ?? 0) * benchMult;
    demandLevers[source.engineKey] = source.monthly ? Math.round(annualBench / 12) : Math.round(annualBench);
  }

  return {
    accessEnterprise: enterprise ? 1 : 0,
    // Align does not split access by service line; it prices at the one blended
    // benchmark margin (a fact, not a meaning-choice), so lines stay empty.
    accessLines: [],
    accessProviders: providers,
    accessFreedShare,
    ...demandLevers,
  };
}

// ── The derived proof ───────────────────────────────────────────────────────

export function deriveAccessAlignProof(values: LeverValues, ctx: AlignContext): AlignProof {
  const { baseline, realizationPct, crossGoalShareMultiplier } = ctx;
  const engine = accessAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };
  const chain = computeAccessChain(baseline, merged, crossGoalShareMultiplier);
  const { scope, capacity, demand, payoff } = chain;

  const who = firstSelected(values, K_WHO);
  const whoCount = sharpenerNumber(values, K_WHO_COUNT);
  const gate = firstSelected(values, K_GATE);
  const selectedDemand = selectedOptionIds(values, K_DEMAND);

  const realized = realizedValue(payoff.value, realizationPct);
  const ready = payoff.value > 0;

  // Providers tag: inherited when "all", a labeled benchmark when a focused cut
  // was chosen without a number, otherwise the partner's own sharpened number.
  const providersTag: AlignProofFigure["tag"] =
    who === "all" ? "inherited" : who === "focused" && whoCount <= 0 ? "benchmark" : undefined;

  // The demand ceiling is a benchmark whenever a selected source fell back to
  // the blank benchmark (documentation gate; a real typed count is not one).
  const anyDemandBenchmarked =
    gate === "documentation" &&
    ACCESS_DEMAND_SOURCES.some((s) => selectedDemand.includes(s.id) && sharpenerNumber(values, s.sharpenerKey) <= 0);
  const demandTag: AlignProofFigure["tag"] = anyDemandBenchmarked ? "benchmark" : undefined;

  const figures: AlignProofFigure[] = [
    {
      label: "In scope",
      value: `${fmtInt(scope.providersInScope)} providers`,
      tag: providersTag,
    },
    {
      label: "Margin / visit",
      value: `$${fmtInt(payoff.blendedMarginUsed || DEFAULT_BLENDED_MARGIN_PER_VISIT)}`,
      tag: "benchmark",
    },
    {
      label: "New capacity",
      value: `${fmtInt(capacity.capacityVisits)} / yr`,
    },
    {
      label: "Demand ceiling",
      value: `${fmtInt(demand.demandCeiling)} / yr`,
      tag: demandTag,
    },
  ];

  const math = ready
    ? formulaWithRealization(chain.formulas.payoff, realizationPct, realized)
    : "The number appears once you set who this is for, the honest limit, and where the demand comes from.";

  const emptyHint = !who
    ? "Pick who this is for to start the number."
    : !gate
      ? "Say why you cannot see more patients today, so we size only what Abridge can honestly move."
      : gate === "bodies"
        ? "You told us the limit is people, rooms, or staff. Abridge frees documentation time, but it cannot add bodies or space, so no new capacity opens. The honest number here is zero."
        : gate === "demand" && demand.demandCeiling <= 0
          ? "You told us demand is the limit. Abridge can free the time, but there is nothing to fill unless real patients are waiting. Add a demand source above with a real count and the number follows."
          : selectedDemand.length === 0
            ? "Add where the demand comes from above, so the freed capacity has real patients to fill."
            : "Set your choices above and the number appears here.";

  const headlineSub = ready
    ? `about ${fmtInt(payoff.realizedVisits)} more visits a year. ${bindingPlainPhrase(payoff.binding)}`
    : "the proof of what you just aligned on";

  return {
    ready,
    headlineLabel: "What opening the schedule is worth",
    headlineValue: realized,
    headlineSub,
    emptyHint,
    figures,
    math,
  };
}

// ── The config the AlignStep renders ────────────────────────────────────────

export const accessAlignConfig: AlignConfig = {
  goal: "access",
  eyebrow: "Align on what you mean",
  // Framing lives once in the step header; this surface goes straight to the questions.
  intro: "",
  questions: [
    {
      id: "outcome",
      storeKey: K_OUTCOME,
      prompt: "What are you trying to accomplish?",
      helper: "All three run on the same freed time. This shapes how you describe it, not the number.",
      mode: "single",
      options: [
        { id: "backlog", label: "Reduce the referral backlog", helper: "Work through the patients already referred and waiting to be seen." },
        { id: "wait", label: "Shorten the wait for a new appointment", helper: "Get a new patient in sooner, so the time to the next open slot drops." },
        { id: "grow", label: "Add capacity to see more patients", helper: "Create durable new capacity to take on more patients over time." },
      ],
    },
    {
      id: "who",
      storeKey: K_WHO,
      prompt: "Who is this for?",
      helper: "Your provider count carries over from Starting Point. Pick the cut.",
      mode: "single",
      options: [
        {
          id: "all",
          label: "All lines and providers",
          helper: "Everyone on your starting-point count, not broken out by a specific line.",
          dynamicHelper: (ctx) => {
            const total = totalProvidersFor(ctx.baseline);
            return total > 0
              ? `All ${fmtInt(total)} providers on your starting-point count, not broken out by a specific line.`
              : "Everyone on your starting-point count, not broken out by a specific line.";
          },
        },
        {
          id: "focused",
          label: "A focused set",
          helper: "Specific lines or providers you want to open access for first.",
          sharpener: {
            storeKey: K_WHO_COUNT,
            label: "Roughly how many providers? (optional)",
            unit: "providers",
            placeholder: "e.g., 12",
            benchmarkNote: "Leave this blank and we use a conservative benchmark: about half your providers.",
            decimal: false,
          },
        },
      ],
    },
    {
      id: "gate",
      storeKey: K_GATE,
      prompt: "Why can't you see more patients today?",
      helper: "The honest gate. Abridge frees documentation time, so it moves the first case, not the rest. It cannot add people or space, or create demand that is not there.",
      mode: "single",
      options: [
        {
          id: "documentation",
          label: "Providers are maxed and buried in documentation",
          helper: "The people are here, but the day is full of charting. This is the load Abridge frees.",
        },
        {
          id: "bodies",
          label: "Not enough providers, rooms, or staff",
          helper: "The limit is physical capacity. Freeing time cannot add bodies or space.",
        },
        {
          id: "demand",
          label: "Not enough demand",
          helper: "Slots would sit empty. Abridge can free the time, but there has to be a patient to fill it.",
        },
      ],
    },
    {
      id: "demand",
      storeKey: K_DEMAND,
      prompt: "Where does the demand come from?",
      helper: "Pick the sources you actually have. A number sharpens each one; leave it blank and we use a conservative labeled benchmark instead.",
      mode: "multi",
      options: [
        {
          id: "backlog",
          label: "Referral backlog",
          helper: "Patients already referred and waiting to be scheduled right now.",
          sharpener: {
            storeKey: "accessAlignBacklogCount",
            label: "How many are waiting now? (optional)",
            unit: "patients",
            placeholder: "e.g., 500",
            benchmarkNote: "Blank uses a conservative benchmark: a small share of your in-scope volume, waiting now.",
            decimal: false,
          },
        },
        {
          id: "referrals",
          label: "New referrals",
          helper: "New referrals arriving each month, annualized into the ceiling.",
          sharpener: {
            storeKey: "accessAlignReferralsCount",
            label: "How many per month? (optional)",
            unit: "/ mo",
            placeholder: "e.g., 50",
            benchmarkNote: "Blank uses a conservative benchmark share of your in-scope volume, per month.",
            decimal: false,
          },
        },
        {
          id: "sameday",
          label: "Same-day and urgent",
          helper: "Patients per year who would book same-day or urgent if a slot existed.",
          sharpener: {
            storeKey: "accessAlignSameDayCount",
            label: "How many per year? (optional)",
            unit: "/ yr",
            placeholder: "e.g., 300",
            benchmarkNote: "Blank uses a conservative benchmark share of your in-scope volume, per year.",
            decimal: false,
          },
        },
        {
          id: "noshow",
          label: "No-shows to recover",
          helper: "Patients per year you could recover by filling a no-show slot with someone waiting.",
          sharpener: {
            storeKey: "accessAlignNoShowCount",
            label: "How many per year? (optional)",
            unit: "/ yr",
            placeholder: "e.g., 200",
            benchmarkNote: "Blank uses a conservative benchmark: a typical no-show rate times a recoverable share.",
            decimal: false,
          },
        },
      ],
    },
    {
      id: "proof",
      storeKey: K_PROOF,
      prompt: "What would tell you it's working?",
      helper: "Pick any that matter. These become the signals your plan tracks.",
      mode: "multi",
      options: [
        { id: "waittime", label: "Wait time dropping", helper: "The time a new patient waits for an appointment trending down." },
        { id: "tna", label: "Third-next-available dropping", helper: "The standard access measure improving against this baseline." },
        { id: "backlog", label: "Backlog shrinking", helper: "The count of patients waiting to be scheduled coming down." },
        { id: "visits", label: "More visits happening", helper: "Additional visits actually landing on the schedule." },
        { id: "utilization", label: "Provider utilization rising", helper: "The share of bookable slots that actually get filled climbing against your starting-point rate." },
        { id: "lovestories", label: "Love Stories", helper: "Patients and staff telling you access got better in their own words." },
      ],
    },
  ],
  toLeverValues: accessAlignToLeverValues,
  deriveProof: deriveAccessAlignProof,
};
