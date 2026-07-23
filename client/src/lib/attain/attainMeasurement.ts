/**
 * Attain — the MEASUREMENT PLAN for OUTPATIENT ACCESS (data layer).
 *
 * After Align settles WHERE the partner is going and derives the number, the
 * Plan step is where they build WHAT THEY WILL MEASURE to get there. This
 * module derives that scorecard from the SAME Align state the number came from,
 * so a different Align produces a different chain, different metric menus, and
 * different baselines. Nothing here invents a partner number: every baseline is
 * either their own figure (from Align / Starting Point) or a clearly-labeled
 * benchmark; every owner and date is left BLANK for the partner to set.
 *
 * The chain is the causal order access actually moves in:
 *   1. the minutes land            (freed documentation time is real)
 *   2. the freed time hits the schedule  (new bookable capacity opens)
 *   3. the wait falls              (the access measure the partner cares about)
 *   4. the visits land             (realized visits and the margin they carry)
 *
 * It is DYNAMIC to the Align choices:
 *   - the honest gate (Q3): "not enough providers, rooms, staff" closes link 2,
 *     because freeing documentation time cannot add capacity there;
 *   - the demand sources (Q4) and the proof (Q5) shape link 3's metric menu and
 *     pre-select the metrics the partner already said would convince them;
 *   - the outcome (Q1) names link 3 (burn down the backlog / cut the wait /
 *     open room to grow);
 *   - the scope (Q2) and their Starting-Point providers/encounters set the
 *     baselines on links 1, 2, and 4.
 *
 * Pure data/logic (no JSX) so the derivation is unit-testable in isolation.
 * `StepMeasurementPlan.tsx` renders it; `attainPlanning.ts` holds the partner's
 * editable layer (which metrics they picked, targets, owners, dates).
 */

import { computeAccessChain, type AccessChainResult } from "./attainAccess";
import type { AttainBaseline, LeverValues } from "./attainLevers";
import { deriveAccessLadder } from "@/pages/attain/steps/accessLadder";
import { firstSelected, selectedOptionIds, sharpenerNumber } from "./alignFramework";

// ── Labeled benchmarks, used ONLY when the partner has no measured figure ────
// Every one of these is surfaced with a "Benchmark" tag in the UI, so it is
// never mistaken for the partner's own number. They are deliberately typical,
// defensible starting points a partner replaces with their own.
export const ACCESS_MEASURE_BENCH = {
  minutesSavedPerNote: 2, // min/note the freed-time chain assumes when unset
  thirdNextAvailableDays: 18,
  thirdNextAvailableTargetDays: 14,
  newPatientWaitDays: 24,
  newPatientWaitTargetDays: 14,
  noShowRatePct: 12,
  noShowRateTargetPct: 8,
} as const;

export type MeasurementBaselineTag = "data" | "inherited" | "benchmark";

export interface MeasurementMetricOption {
  /** Globally-unique metric id (stable across renders, used as the persistence
   * key for the partner's target/owner/by-when). */
  id: string;
  label: string;
  unit: string;
  /** A short line on what moving this metric proves. */
  helper: string;
  /** Their baseline, formatted for display. Read-only in the UI. */
  baseline: string;
  /** Whether the baseline is their own measured figure, a Starting-Point
   * inherited fact, or a labeled benchmark. */
  baselineTag: MeasurementBaselineTag;
  /** The default target (derived or benchmark). Editable downstream. */
  defaultTarget: string;
  /** True when this metric is one the partner already named as proof on Align,
   * so the UI pre-selects it and shows a "from what you told us" note. */
  fromProof: boolean;
}

export interface MeasurementLink {
  id: "minutes" | "schedule" | "wait" | "visits";
  /** The step number in the chain (1-based), for the ordered scorecard. */
  n: number;
  title: string;
  teach: string;
  metrics: MeasurementMetricOption[];
  /** The metric ids selected by default (the ones the partner named as proof,
   * else the link's primary metric so the scorecard is never empty). */
  defaultChosen: string[];
  /** True when the honest gate closes this link (freeing documentation time
   * cannot open capacity when the limit is people/rooms/space), so the UI
   * shows why it cannot move rather than a menu of metrics that can't budge. */
  blocked: boolean;
  blockedReason?: string;
}

export interface MeasurementPlanModel {
  /** True once the Align choices produce a real chain (who + gate are set). */
  ready: boolean;
  emptyHint: string;
  links: MeasurementLink[];
  /** The Align gate id, so the UI can teach the honest limit. */
  gate?: string;
  /** The Align outcome id, so link 3 names the outcome. */
  outcome?: string;
  realizedVisits: number;
  prize: number;
}

// ── Formatting (self-contained, same convention as accessLadder) ─────────────

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtHours1(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** The Align proof option ids -> the measurement metric id each maps onto, so
 * the proof a partner already gave pre-selects the matching metric. */
const PROOF_TO_METRIC: Record<string, string> = {
  waittime: "new-patient-wait",
  tna: "third-next-available",
  backlog: "referral-backlog",
  visits: "realized-visits",
  lovestories: "love-stories",
};

/** Link 3's title + teach, named for the Align outcome (Q1). */
function waitLinkCopy(outcome: string | undefined): { title: string; teach: string } {
  switch (outcome) {
    case "backlog":
      return {
        title: "The backlog burns down",
        teach: "The new slots go to the patients already referred and waiting, so the count in the queue actually comes down.",
      };
    case "grow":
      return {
        title: "The room to grow opens",
        teach: "The new slots absorb more patients over time, so the access measure holds even as volume climbs.",
      };
    case "wait":
    default:
      return {
        title: "The wait falls",
        teach: "New patients reach the schedule sooner, so the standard access measures start to drop against this baseline.",
      };
  }
}

/**
 * Derives the outpatient-access measurement plan from the Align state.
 *
 * `opts.realizedVisits` and `opts.prize` are passed in so the caller supplies
 * the same realization/attribution-applied figures every other access surface
 * uses (off the combined engine result), exactly as `deriveAccessLadder` takes
 * them, keeping link-4's targets reconciled with Align and the promise header.
 */
export function deriveAccessMeasurementPlan(
  baseline: AttainBaseline,
  values: LeverValues,
  crossGoalShareMultiplier: number,
  opts: { realizedVisits: number; prize: number },
): MeasurementPlanModel {
  const chain: AccessChainResult = computeAccessChain(baseline, values, crossGoalShareMultiplier);
  const ladder = deriveAccessLadder(chain, { realizedVisits: opts.realizedVisits, prize: opts.prize });

  const who = firstSelected(values, "accessAlignWho");
  const gate = firstSelected(values, "accessAlignGate");
  const outcome = firstSelected(values, "accessAlignOutcome");
  const demand = selectedOptionIds(values, "accessAlignDemand");
  const proof = selectedOptionIds(values, "accessAlignProof");

  const ready = Boolean(who) && Boolean(gate);
  const emptyHint = !who
    ? "Pick who this is for on the Align step, then the measurement chain builds itself from what you aligned on."
    : !gate
      ? "Say why you cannot see more patients today on the Align step, so the chain measures only what Abridge can honestly move."
      : "Set your Align choices and the chain builds itself here.";

  const proofHas = (metricId: string) => proof.some((p) => PROOF_TO_METRIC[p] === metricId);

  // ── Link 1 — the minutes land ─────────────────────────────────────────────
  // Baseline is "0 today" (nothing saved before Abridge); the target is the
  // freed-time figure the chain runs on. Minutes-saved is a benchmark fact
  // (never re-asked of the partner); freed hours is derived from THEIR
  // Starting-Point providers and encounters, so it is inherited, not invented.
  const minutesTarget = ladder.minutes > 0 ? ladder.minutes : ACCESS_MEASURE_BENCH.minutesSavedPerNote;
  const freedSet = ladder.freedHrsPerProviderWk > 0;
  const minutesLink: MeasurementLink = {
    id: "minutes",
    n: 1,
    title: "The minutes land",
    teach: "The first thing to prove: the note actually takes less time. Everything downstream is multiplication on top of this one number.",
    blocked: false,
    metrics: [
      {
        id: "minutes-saved-per-note",
        label: "Minutes saved per note",
        unit: "min / note",
        helper: "Charting time that comes off each note, measured against a timed sample before go-live.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: `${fmtInt(minutesTarget)} min`,
        fromProof: false,
      },
      {
        id: "freed-hours-per-provider",
        label: "Freed hours per provider per week",
        unit: "hrs / provider / wk",
        helper: "Those minutes, added up across every note a provider writes in a week.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: freedSet ? `${fmtHours1(ladder.freedHrsPerProviderWk)} hrs / wk` : "set your providers on Align",
        fromProof: false,
      },
    ],
    defaultChosen: ["minutes-saved-per-note"],
  };

  // ── Link 2 — the freed time hits the schedule ─────────────────────────────
  // THE make-or-break: freed time only helps access if it is directed to the
  // schedule as bookable slots. Closed entirely when the honest gate is
  // people/rooms/space, because freeing documentation time cannot add capacity
  // there (the honest zero the Align number already reflects).
  const scheduleBlocked = gate === "bodies";
  const capacitySet = ladder.capacityVisits > 0;
  const scheduleLink: MeasurementLink = {
    id: "schedule",
    n: 2,
    title: "The freed time hits the schedule",
    teach: "Freed time only opens access if it is directed to the schedule as bookable slots. This is the link the plan lives or dies on.",
    blocked: scheduleBlocked,
    blockedReason: scheduleBlocked
      ? "You told us on Align the limit is people, rooms, or staff. Freeing documentation time cannot add capacity here, so there are no new slots to measure. The honest number stays at zero until that limit changes."
      : undefined,
    metrics: scheduleBlocked
      ? []
      : [
          {
            id: "share-freed-time-scheduled",
            label: "Share of freed time directed to the schedule",
            unit: "%",
            helper: "The portion of freed hours that becomes bookable slots, rather than staying as relief. This is the commitment, made visible.",
            baseline: "0% today",
            baselineTag: "data",
            defaultTarget: ladder.directedSharePct > 0 ? `${fmtInt(ladder.directedSharePct)}%` : "set on Align",
            fromProof: false,
          },
          {
            id: "new-capacity-visits",
            label: "New bookable capacity",
            unit: "visits / yr",
            helper: "The visits a year the directed freed time can seat, before demand is applied.",
            baseline: "0 today",
            baselineTag: "data",
            defaultTarget: capacitySet ? `${fmtInt(ladder.capacityVisits)} / yr` : "set on Align",
            fromProof: false,
          },
        ],
    defaultChosen: scheduleBlocked ? [] : ["share-freed-time-scheduled"],
  };

  // ── Link 3 — the wait falls / backlog burns / room to grow ────────────────
  // The metric menu is DYNAMIC to the demand sources (Q4) and the proof (Q5):
  // a partner who named a referral backlog measures the backlog; one who cares
  // about the wait measures third-next-available and the new-patient wait; one
  // recovering no-shows measures the no-show rate. Whatever they named as proof
  // is pre-selected so they see themselves in the scorecard.
  const waitCopy = waitLinkCopy(outcome);
  const waitMetrics: MeasurementMetricOption[] = [];
  const wantsBacklog = demand.includes("backlog") || proofHas("referral-backlog") || outcome === "backlog";
  const wantsWaitMeasures =
    demand.includes("referrals") || demand.includes("sameday") || proofHas("third-next-available") || proofHas("new-patient-wait") || outcome === "wait" || outcome === "grow";
  const backlogTyped = sharpenerNumber(values, "accessAlignBacklogCount");

  if (wantsBacklog) {
    waitMetrics.push({
      id: "referral-backlog",
      label: "Referral backlog",
      unit: "patients waiting",
      helper: "The count of patients already referred and waiting to be scheduled, trending down as the slots open.",
      baseline: backlogTyped > 0 ? `${fmtInt(backlogTyped)} waiting` : `${fmtInt(Math.max(0, ladder.demandCeiling))} waiting`,
      baselineTag: backlogTyped > 0 ? "data" : "benchmark",
      defaultTarget: outcome === "backlog" ? "cleared" : "half the queue",
      fromProof: proofHas("referral-backlog"),
    });
  }
  if (wantsWaitMeasures || waitMetrics.length === 0) {
    waitMetrics.push({
      id: "third-next-available",
      label: "Third-next-available",
      unit: "days",
      helper: "The standard access measure: days to the third open new-patient slot. Benchmark until you drop in your own.",
      baseline: `${ACCESS_MEASURE_BENCH.thirdNextAvailableDays} days`,
      baselineTag: "benchmark",
      defaultTarget: `under ${ACCESS_MEASURE_BENCH.thirdNextAvailableTargetDays} days`,
      fromProof: proofHas("third-next-available"),
    });
    waitMetrics.push({
      id: "new-patient-wait",
      label: "New-patient wait",
      unit: "days",
      helper: "Days a new patient waits for a first appointment. Benchmark until you drop in your own.",
      baseline: `${ACCESS_MEASURE_BENCH.newPatientWaitDays} days`,
      baselineTag: "benchmark",
      defaultTarget: `under ${ACCESS_MEASURE_BENCH.newPatientWaitTargetDays} days`,
      fromProof: proofHas("new-patient-wait"),
    });
  }
  if (demand.includes("noshow")) {
    waitMetrics.push({
      id: "no-show-rate",
      label: "No-show rate",
      unit: "%",
      helper: "The share of booked slots that go unfilled, which recovering no-shows brings down. Benchmark until you drop in your own.",
      baseline: `${ACCESS_MEASURE_BENCH.noShowRatePct}%`,
      baselineTag: "benchmark",
      defaultTarget: `under ${ACCESS_MEASURE_BENCH.noShowRateTargetPct}%`,
      fromProof: false,
    });
  }
  const waitProofChosen = waitMetrics.filter((m) => m.fromProof).map((m) => m.id);
  const waitLink: MeasurementLink = {
    id: "wait",
    n: 3,
    title: waitCopy.title,
    teach: waitCopy.teach,
    blocked: false,
    metrics: waitMetrics,
    defaultChosen: waitProofChosen.length > 0 ? waitProofChosen : waitMetrics.length > 0 ? [waitMetrics[0].id] : [],
  };

  // ── Link 4 — the visits land ──────────────────────────────────────────────
  // The outcome: realized visits (MIN of capacity and demand) and the margin
  // they carry. Targets are the derived figures the promise header prices.
  const realizedSet = ladder.realizedVisits > 0;
  const prizeSet = ladder.prize > 0;
  const visitsLink: MeasurementLink = {
    id: "visits",
    n: 4,
    title: "The visits land",
    teach: "The payoff: visits that actually book, and the contribution margin they carry. This is the number the promise is priced on.",
    blocked: false,
    metrics: [
      {
        id: "realized-visits",
        label: "Realized visits per year",
        unit: "visits / yr",
        helper: "Net-new visits that actually land on the schedule, the smaller of the capacity you opened and the demand waiting.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: realizedSet ? `${fmtInt(ladder.realizedVisits)} / yr` : "finish the Align chain",
        fromProof: proofHas("realized-visits"),
      },
      {
        id: "captured-margin",
        label: "Captured margin per year",
        unit: "contribution margin / yr",
        helper: "The realized visits priced at contribution margin, never gross charges. This is the CFO number.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: prizeSet ? `${fmtMoneyCompact(ladder.prize)} / yr` : "finish the Align chain",
        fromProof: false,
      },
    ],
    defaultChosen: proofHas("realized-visits") ? ["realized-visits"] : ["realized-visits"],
  };
  // Love Stories is a qualitative proof the partner can carry alongside the
  // realized number when they named it on Align.
  if (proofHas("love-stories")) {
    visitsLink.metrics.push({
      id: "love-stories",
      label: "Love Stories",
      unit: "collected",
      helper: "Patients and staff telling you, in their own words, that access got better.",
      baseline: "none collected yet",
      baselineTag: "data",
      defaultTarget: "collected each quarter",
      fromProof: true,
    });
    visitsLink.defaultChosen = ["realized-visits", "love-stories"];
  }

  return {
    ready,
    emptyHint,
    links: [minutesLink, scheduleLink, waitLink, visitsLink],
    gate,
    outcome,
    realizedVisits: ladder.realizedVisits,
    prize: ladder.prize,
  };
}
