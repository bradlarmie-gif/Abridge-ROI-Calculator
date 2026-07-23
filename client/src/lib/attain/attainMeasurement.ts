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
 *   - the outcome (Q1) names link 3 (reduce the backlog / shorten the wait /
 *     add capacity);
 *   - the scope (Q2) and their Starting-Point providers/encounters set the
 *     baselines on links 1, 2, and 4.
 *
 * Pure data/logic (no JSX) so the derivation is unit-testable in isolation.
 * `StepMeasurementPlan.tsx` renders it; `attainPlanning.ts` holds the partner's
 * editable layer (which metrics they picked, targets, owners, dates).
 */

import { computeAccessChain, type AccessChainResult } from "./attainAccess";
import { computeEdAccessChain } from "./attainEdAccess";
import { edAccessAlignToLeverValues } from "./edAccessAlign";
import { computeWorkforceChain } from "./attainWorkforce";
import { computeCapacityChain, NURSING_CAPACITY_NO_DOUBLE_COUNT } from "./attainCapacity";
import { capacityAlignToLeverValues } from "./capacityAlign";
import type { AttainBaseline, LeverValues } from "./attainLevers";
import type { AttainSetting } from "./attainTypes";
import { deriveAccessLadder, deriveEdAccessLadder, deriveRetentionLadder, deriveNursingCapacityLadder, retentionChartingTerm } from "@/pages/attain/steps/accessLadder";
import { firstSelected, selectedOptionIds, sharpenerNumber } from "./alignFramework";
import {
  deriveRevenueLadder,
  computeRevenueChain,
  type RevenuePathId,
  type RevenuePathLadder,
} from "./attainRevenue";
import {
  deriveIpRevenueLadder,
  computeIpRevenueChain,
  type IpRevenuePathId,
  type IpRevenuePathLadder,
} from "./attainInpatientRevenue";
import {
  deriveQualityLadder,
  QUALITY_EVENT_LABELS,
  type QualityEventId,
} from "./attainQuality";
import {
  qualityAlignToLeverValues,
  fmtEventCount,
  CLINICAL_EVENT_IDS,
  HCAHPS_ID,
  K_EVENTS,
  K_WHO,
  K_GATE,
  K_CHANGE,
  K_PROOF,
} from "./qualityAlign";

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
  utilizationPct: 70, // schedule fill fallback when Starting Point has none
  utilizationTargetGainPct: 10, // points added to the baseline for the target
  utilizationTargetCapPct: 95, // a realistic ceiling on schedule fill
} as const;

// ── Retention (WORKFORCE) labeled benchmarks, used ONLY when the partner has
// no measured figure. Surfaced with a "Benchmark" tag so they are never mistaken
// for the partner's own numbers. Deliberately typical, defensible starting
// points a partner replaces with their own pulse data. ─────────────────────
export const RETENTION_MEASURE_BENCH = {
  afterHoursMinutesPerDay: 60,
  afterHoursTargetMinutesPerDay: 30,
  burnoutPct: 50, // share of clinicians reporting burnout symptoms
  burnoutTargetPct: 35,
  intentToStayPct: 70, // share saying they are likely to stay a year out
  intentToStayTargetPct: 80,
  vacancyRatePct: 10, // share of budgeted roles sitting open
  vacancyRateTargetPct: 7,
  timeToFillDays: 60, // days a role sits open before it is filled
  timeToFillTargetDays: 45,
} as const;

// ── CAPACITY (nursing overtime) labeled benchmarks, used ONLY when the partner
// has no measured figure. Surfaced with a "Benchmark" tag so they are never
// mistaken for the partner's own numbers. Deliberately typical, defensible
// starting points a partner replaces with their own timed sample. ────────────
export const CAPACITY_MEASURE_BENCH = {
  minutesSavedPerNote: 2, // min/note the freed-time story assumes when unset
  postShiftChartingMinutesPerShift: 45,
  postShiftChartingTargetMinutesPerShift: 20,
  onTimeShiftCompletionPct: 60, // share of shifts closing on time today
  onTimeShiftCompletionTargetPct: 85,
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

/** The make-or-break commitment copy, per goal. The one thing the plan lives
 * or dies on: for access, directing freed time to the schedule; for retention,
 * protecting the freed relief so the day actually gets lighter. */
export interface MeasurementCommitment {
  title: string;
  teach: string;
  ownerLabel: string;
}

export interface MeasurementLink {
  /** Stable per-link id, the persistence key for the partner's chosen metrics.
   * A string (not a fixed union) so each goal names its own chain links. */
  id: string;
  /** The step number in the chain (1-based), for the ordered scorecard. */
  n: number;
  title: string;
  teach: string;
  /** Optional section label. A single-mechanism goal (access, workforce) leaves
   * this unset so its chain reads as one flat ladder. A MULTI-PATH goal
   * (revenue) sets it so the shared surface can group each path's links under a
   * clean section header, mirroring how the revenue Align stacks per path. */
  groupLabel?: string;
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
  /** The make-or-break commitment copy, per goal, so the UI surface is shared
   * across goals and only the derivation supplies the goal-specific words. */
  commitment: MeasurementCommitment;
  /** The monthly-check teaching line, naming this goal's first and last link so
   * the honest "early links turn first" order reads true for the chain shown. */
  monthlyCheckTeach: string;
  /** SAFETY-FIRST goals only (quality). When set, the shared promise header
   * leads with this COUNT (harm events prevented a year) instead of a coral
   * dollar, and shows the dollar as a soft, clearly-labeled footnote. The
   * financial goals leave it unset, so their header keeps the dollar hero. */
  safetyHeadline?: {
    /** The count phrase that leads the promise (e.g. "~12 harm events / yr"). */
    heroValue: string;
    /** The soft, labeled dollar footnote shown under the promise line. */
    softDollarNote: string;
  };
}

// ── Formatting (self-contained, same convention as accessLadder) ─────────────

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtHours1(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}
function fmtPp(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function fmtDepartures(n: number): string {
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
  utilization: "provider-utilization",
  lovestories: "love-stories",
};

/** Link 3's title + teach, named for the Align outcome (Q1). */
function waitLinkCopy(outcome: string | undefined): { title: string; teach: string } {
  switch (outcome) {
    case "backlog":
      return {
        title: "The referral backlog comes down",
        teach: "The new slots go to the patients already referred and waiting, so the count in the queue actually comes down.",
      };
    case "grow":
      return {
        title: "New capacity opens up",
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
    title: "The note takes less time",
    teach: "The first thing to prove: the note actually takes less time. Everything downstream builds on this one number.",
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
  // Provider utilization (schedule fill): the check that the new slots are
  // actually being used. Baseline is the partner's own Starting-Point rate when
  // set, else a labeled benchmark; target is a few points higher, capped at a
  // realistic ceiling. An optional pick, pre-selected only when named as proof.
  const utilizationIsData = (baseline.utilizationPct ?? 0) > 0;
  const utilizationBaselinePct = utilizationIsData ? Math.round(baseline.utilizationPct as number) : ACCESS_MEASURE_BENCH.utilizationPct;
  const utilizationTargetPct = Math.min(
    ACCESS_MEASURE_BENCH.utilizationTargetCapPct,
    utilizationBaselinePct + ACCESS_MEASURE_BENCH.utilizationTargetGainPct,
  );
  const utilizationFromProof = proofHas("provider-utilization");
  const scheduleLink: MeasurementLink = {
    id: "schedule",
    n: 2,
    title: "The freed time hits the schedule",
    teach: "Freed time only opens access if it is directed to the schedule as bookable slots. This is the link the plan depends on most.",
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
          {
            id: "provider-utilization",
            label: "Provider utilization",
            unit: "%",
            helper: "The share of bookable slots that actually get filled, the proof the new capacity is being used and not sitting empty.",
            baseline: `${utilizationBaselinePct}%`,
            baselineTag: utilizationIsData ? "inherited" : "benchmark",
            defaultTarget: `over ${utilizationTargetPct}%`,
            fromProof: utilizationFromProof,
          },
        ],
    defaultChosen: scheduleBlocked
      ? []
      : utilizationFromProof
        ? ["share-freed-time-scheduled", "provider-utilization"]
        : ["share-freed-time-scheduled"],
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
    title: "The visits are booked",
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
    commitment: {
      title: "The one thing this plan depends on",
      teach:
        "Freed documentation time only opens access if it is directed to the schedule as bookable slots. If it quietly refills with other work, the minutes are real but the visits never happen. Someone has to own protecting that freed time and directing it to the schedule.",
      ownerLabel: "Who owns directing the freed time",
    },
    monthlyCheckTeach:
      "Walk the chain in order. The minutes move first, the visits move last, so early links should turn before the later ones. Attainment is not a number you assert. It is whether each metric moved toward its target on the schedule you set.",
  };
}

// ── WORKFORCE (retention) measurement plan ──────────────────────────────────
//
// Retention moves in a different causal order than access, so the chain and its
// metric menus are its own, but the surface and the discipline are identical:
// every baseline is the partner's own figure or a labeled benchmark, every
// owner and date starts BLANK, targets default to the derived figure so the gap
// shows, and the whole thing is DYNAMIC to the workforce Align choices.
//
// The chain is the order retention actually moves in:
//   1. the after-hours charting falls   (the load that drives burnout comes off)
//   2. burnout eases                     (a short pulse catches it before anyone quits)
//   3. they intend to stay               (likelihood-to-stay is the earliest read)
//   4. voluntary turnover falls          (the outcome the prize is priced on)
//
// DYNAMIC to Align:
//   - the "what is driving departures" gate (Q3) names the burnout link as the
//     one the partner already said Abridge can reach, so it is badged;
//   - the "where the burden hurts" answer (Q4) pre-selects and badges the
//     after-hours-charting metric when the burden is after hours;
//   - the proof (Q5): "turnover number" badges the turnover/departures metrics,
//     "a burnout pulse" badges the burnout and intent-to-stay metrics, and
//     "Love Stories" adds the qualitative proof on link 4;
//   - scope + Starting-Point numbers (their turnover rate, replacement cost,
//     headcount) set the baselines and derived targets on link 4.

/** The Align proof/gate/burden option ids -> the retention metric id each maps
 * onto, so the answers a partner already gave pre-select the matching metric. */
const RETENTION_PROOF_TO_METRICS: Record<string, string[]> = {
  turnover: ["voluntary-turnover-rate", "departures-avoided"],
  vacancy: ["vacancy-rate", "time-to-fill"],
  pulse: ["burnout-score", "intent-to-stay"],
  lovestories: ["love-stories"],
};

/**
 * Derives the WORKFORCE (retention) measurement plan from the Align state.
 *
 * `opts.minutes`, `opts.departuresAvoided`, and `opts.prize` are passed in so
 * the caller supplies the same realization/split-applied figures every other
 * retention surface uses (off the combined engine result), exactly as
 * `deriveRetentionLadder` takes them, keeping link-4's targets reconciled with
 * Align and the promise header.
 */
export function deriveRetentionMeasurementPlan(
  baseline: AttainBaseline,
  setting: AttainSetting,
  values: LeverValues,
  crossGoalShareMultiplier: number,
  opts: { minutes: number; departuresAvoided: number; prize: number },
): MeasurementPlanModel {
  const chain = computeWorkforceChain(baseline, setting, values, crossGoalShareMultiplier);
  const ladder = deriveRetentionLadder(chain, setting, baseline, {
    minutes: opts.minutes,
    departuresAvoided: opts.departuresAvoided,
    prize: opts.prize,
  });
  const chartingTerm = retentionChartingTerm(setting);
  const unitPlural = setting === "nursing" ? "nurses" : "clinicians";

  const who = firstSelected(values, "retentionAlignWho");
  const gate = firstSelected(values, "retentionAlignGate");
  const outcome = firstSelected(values, "retentionAlignOutcome");
  const burden = firstSelected(values, "retentionAlignBurden");
  const proof = selectedOptionIds(values, "retentionAlignProof");

  const ready = Boolean(who) && Boolean(gate);
  const emptyHint = !who
    ? "Pick who this is for on the Align step, then the measurement chain builds itself from what you aligned on."
    : !gate
      ? "Say what is driving departures on the Align step, so the chain measures only what Abridge can honestly move."
      : "Set your Align choices and the chain builds itself here.";

  const proofHas = (metricId: string) =>
    proof.some((p) => (RETENTION_PROOF_TO_METRICS[p] ?? []).includes(metricId));
  // The gate says burnout is a real driver, so the burnout pulse is the metric
  // the partner already pointed at as within Abridge's reach.
  const gateNamesBurnout = gate === "burnout" || gate === "meaningful";
  const burdenIsAfterHours = burden === "afterhours" || burden === "both";

  // ── Link 1 — the after-hours charting falls ───────────────────────────────
  const minutesTarget = ladder.minutes > 0 ? ladder.minutes : opts.minutes;
  const chartingFromProof = burdenIsAfterHours;
  const chartingLink: MeasurementLink = {
    id: "charting",
    n: 1,
    title: `The ${chartingTerm} falls`,
    teach: `The first thing to prove: the note comes off the evening. ${chartingTerm[0].toUpperCase()}${chartingTerm.slice(1)} is the load that drives burnout, and everything downstream depends on it actually coming down.`,
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
        id: "after-hours-charting-minutes",
        label: `${chartingTerm[0].toUpperCase()}${chartingTerm.slice(1)} minutes per day`,
        unit: "min / day",
        helper: `The charting that happens outside the shift, the work outside of work that drives burnout. Benchmark until you drop in your own pulse figure.`,
        baseline: `${RETENTION_MEASURE_BENCH.afterHoursMinutesPerDay} min / day`,
        baselineTag: "benchmark",
        defaultTarget: `under ${RETENTION_MEASURE_BENCH.afterHoursTargetMinutesPerDay} min / day`,
        fromProof: chartingFromProof,
      },
    ],
    defaultChosen: chartingFromProof ? ["after-hours-charting-minutes"] : ["minutes-saved-per-note"],
  };

  // ── Link 2 — burnout eases ────────────────────────────────────────────────
  const burnoutFromProof = proofHas("burnout-score") || gateNamesBurnout;
  const burnoutLink: MeasurementLink = {
    id: "burnout",
    n: 2,
    title: "Burnout eases",
    teach:
      "As the after-hours load comes off, the day gets more livable. A short pulse catches whether burnout is actually easing, before it becomes a resignation.",
    blocked: false,
    metrics: [
      {
        id: "burnout-score",
        label: "Burnout assessment score",
        unit: "% reporting burnout",
        helper: "A standard burnout pulse (share reporting symptoms), trending down as the relief holds. Benchmark until you drop in your own.",
        baseline: `${RETENTION_MEASURE_BENCH.burnoutPct}%`,
        baselineTag: "benchmark",
        defaultTarget: `under ${RETENTION_MEASURE_BENCH.burnoutTargetPct}%`,
        fromProof: burnoutFromProof,
      },
    ],
    defaultChosen: ["burnout-score"],
  };

  // ── Link 3 — they intend to stay ──────────────────────────────────────────
  const stayFromProof = proofHas("intent-to-stay");
  const stayLink: MeasurementLink = {
    id: "stay",
    n: 3,
    title: "They intend to stay",
    teach:
      "Before a resignation shows up in the turnover number, it shows up as intent. Likelihood-to-stay is the earliest read that the relief is holding.",
    blocked: false,
    metrics: [
      {
        id: "intent-to-stay",
        label: "Likelihood-to-stay",
        unit: "% likely to stay",
        helper: `The share of ${unitPlural} who say they are likely to still be here a year from now. Benchmark until you drop in your own pulse.`,
        baseline: `${RETENTION_MEASURE_BENCH.intentToStayPct}%`,
        baselineTag: "benchmark",
        defaultTarget: `over ${RETENTION_MEASURE_BENCH.intentToStayTargetPct}%`,
        fromProof: stayFromProof,
      },
      {
        id: "intent-to-stay-index",
        label: "Intent-to-stay index",
        unit: "index",
        helper: "A rolled-up intent-to-stay score off your engagement survey, if you already run one, trending up.",
        baseline: "your current index",
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
    ],
    defaultChosen: ["intent-to-stay"],
  };

  // ── Link 4 — voluntary turnover falls (the outcome the prize is priced on) ─
  // The turnover-rate baseline is the partner's own figure when they entered one
  // on Starting Point, else this setting's labeled benchmark, exactly the way
  // the workforce scope resolves it. The target is that rate less the honest
  // points the plan removes, so the gap is real, never invented.
  const turnoverRaw = typeof values.retentionTurnoverRate === "number" ? values.retentionTurnoverRate : 0;
  const turnoverIsData = turnoverRaw > 0;
  const turnoverBaselinePct = ladder.turnoverRatePct;
  const turnoverTargetPct = Math.max(0, turnoverBaselinePct - chain.payoff.turnoverPointsReduced);
  const departuresSet = ladder.departuresAvoided > 0;
  const prizeSet = ladder.prize > 0;
  const turnoverFromProof = proofHas("voluntary-turnover-rate");
  const departuresFromProof = proofHas("departures-avoided");
  const turnoverLink: MeasurementLink = {
    id: "turnover",
    n: 4,
    title: "Voluntary turnover falls",
    teach: `The payoff: fewer of the ${unitPlural} you have today choosing to leave, and the replacement cost you avoid. This is the number the promise is priced on.`,
    blocked: false,
    metrics: [
      {
        id: "voluntary-turnover-rate",
        label: "Voluntary turnover rate",
        unit: "%",
        helper: "The share of your team choosing to leave in a year, trending down against this baseline.",
        baseline: `${fmtPp(turnoverBaselinePct)}%`,
        baselineTag: turnoverIsData ? "data" : "benchmark",
        defaultTarget: `under ${fmtPp(turnoverTargetPct)}%`,
        fromProof: turnoverFromProof,
      },
      {
        id: "departures-avoided",
        label: "Departures avoided",
        unit: `${unitPlural} / yr`,
        helper: "Clinicians who stay because the day got better, the smaller, honest count behind the dollar.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: departuresSet ? `${fmtDepartures(ladder.departuresAvoided)} / yr` : "finish the Align chain",
        fromProof: departuresFromProof,
      },
      {
        id: "replacement-cost-saved",
        label: "Replacement cost saved",
        unit: "$ / yr",
        helper: "The departures avoided priced at your replacement cost per departure. This is the CFO number.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: prizeSet ? `${fmtMoneyCompact(ladder.prize)} / yr` : "finish the Align chain",
        fromProof: false,
      },
      {
        id: "vacancy-rate",
        label: "Vacancy rate",
        unit: "%",
        helper: "The share of budgeted roles sitting open, the companion to turnover, coming down as fewer people leave. Benchmark until you drop in your own.",
        baseline: `${RETENTION_MEASURE_BENCH.vacancyRatePct}%`,
        baselineTag: "benchmark",
        defaultTarget: `under ${RETENTION_MEASURE_BENCH.vacancyRateTargetPct}%`,
        fromProof: proofHas("vacancy-rate"),
      },
      {
        id: "time-to-fill",
        label: "Time to fill a vacancy",
        unit: "days",
        helper: "The days a role sits open before it is filled, shortening as the team stabilizes and referrals rise. Benchmark until you drop in your own.",
        baseline: `${RETENTION_MEASURE_BENCH.timeToFillDays} days`,
        baselineTag: "benchmark",
        defaultTarget: `under ${RETENTION_MEASURE_BENCH.timeToFillTargetDays} days`,
        fromProof: proofHas("time-to-fill"),
      },
    ],
    defaultChosen: [],
  };
  const turnoverProofChosen = turnoverLink.metrics.filter((m) => m.fromProof).map((m) => m.id);
  turnoverLink.defaultChosen = turnoverProofChosen.length > 0 ? turnoverProofChosen : ["voluntary-turnover-rate"];
  // Love Stories is a qualitative proof the partner can carry alongside the
  // turnover number when they named it on Align.
  if (proofHas("love-stories")) {
    turnoverLink.metrics.push({
      id: "love-stories",
      label: "Love Stories",
      unit: "collected",
      helper: `${setting === "nursing" ? "Nurses" : "Clinicians"} telling you, in their own words, that the day got better.`,
      baseline: "none collected yet",
      baselineTag: "data",
      defaultTarget: "collected each quarter",
      fromProof: true,
    });
    turnoverLink.defaultChosen = [...turnoverLink.defaultChosen, "love-stories"];
  }

  return {
    ready,
    emptyHint,
    links: [chartingLink, burnoutLink, stayLink, turnoverLink],
    gate,
    outcome,
    realizedVisits: ladder.departuresAvoided,
    prize: ladder.prize,
    commitment: {
      title: "The one thing this plan depends on",
      teach: `Freed ${chartingTerm} time only holds people if it stays with the clinician as relief. If it quietly refills with other work, the minutes are real but the day never gets lighter and no one stays for it. Someone has to own protecting that freed time as relief.`,
      ownerLabel: "Who owns protecting the relief",
    },
    monthlyCheckTeach: `Walk the chain in order. The ${chartingTerm} falls first, voluntary turnover moves last, so early links should turn before the later ones. Attainment is not a number you assert. It is whether each metric moved toward its target on the schedule you set.`,
  };
}

// ── REVENUE (multi-path) measurement plan ───────────────────────────────────
//
// Revenue is not one mechanism. It is several genuinely distinct claim pools a
// partner chases (one or more), so the plan is not one chain but a set of
// chains that STACK PER CHOSEN PATH, exactly the way the revenue Align stacks
// its who/gate/where per path. The shape is:
//
//   SHARED ROOT: complete, specific documentation at the point of care. Every
//     path is built on this one lever being true.
//   PER CHOSEN PATH (only the ones they picked on Align):
//     - a CAPTURE link, whose metric menu is the path's real leading signals
//       (E/M level mix, HCC recapture rate, denial rate, and so on);
//     - an OUTCOME link, the captured revenue that path's slice of the prize is
//       priced on, plus the count behind that dollar.
//
// DYNAMIC to Align: only the picked paths appear; the per-path gate answer
// badges that path's honest ceiling metric and the proof choices pre-select and
// badge the matching signal ("From what you told us on Align"); scope and
// populations set the outcome baselines and targets straight off the ladder, so
// nothing is faked. Every rate baseline is the partner's own figure when they
// entered one, else a labeled benchmark; every captured-dollar baseline is "$0
// today"; every owner and date starts BLANK. The COMMITMENT is the make-or-
// break: the coders and providers actually acting on the better documentation,
// because complete documentation only becomes revenue if someone acts on it.

/** Short per-path section labels for the grouped scorecard. */
const REVENUE_PATH_GROUP: Record<RevenuePathId, string> = {
  em: "E/M level accuracy",
  hcc: "Risk adjustment",
  denials: "Medical-necessity denials",
};
const IP_REVENUE_PATH_GROUP: Record<IpRevenuePathId, string> = {
  drg: "Case mix and DRG accuracy",
  cdi: "CDI query efficiency",
  obs: "Observation status defense",
};

/** The Align proof option ids -> the capture metric each pre-selects, so a
 * proof the partner already named on Align badges the matching signal. */
const REVENUE_PROOF_TO_METRIC: Record<string, string> = {
  losmix: "em-level-mix",
  recapture: "hcc-recapture-rate",
  denialrate: "denials-mednec-rate",
  cmi: "drg-cmi",
  queryrate: "cdi-query-rate",
  obsrate: "obs-rate",
};

/** Rounds a percentage for display. */
function fmtPct(n: number): string {
  return Math.round(n).toString();
}

/**
 * Derives the multi-path REVENUE measurement plan from the Align state (all
 * settings). Reads the same ladder every other revenue surface reads, scaled by
 * the realization implied by the combined engine result, so the outcome targets
 * and the promise prize reconcile with Align exactly.
 */
export function deriveRevenueMeasurementPlan(
  baseline: AttainBaseline,
  setting: AttainSetting,
  values: LeverValues,
  opts: { realizationPct: number },
): MeasurementPlanModel {
  const isIp = setting === "inpatient";
  const ladder = isIp
    ? deriveIpRevenueLadder(baseline, values, opts.realizationPct)
    : deriveRevenueLadder(baseline, setting, values, opts.realizationPct);
  const chain = isIp
    ? computeIpRevenueChain(baseline, values)
    : computeRevenueChain(baseline, setting, values);

  const proof = selectedOptionIds(values, "revenueAlignProof");
  const proofHas = (metricId: string) =>
    proof.some((p) => REVENUE_PROOF_TO_METRIC[p] === metricId) ||
    (proof.includes("captured") && metricId.endsWith("-captured-revenue"));

  const ready = ladder.anyPathSelected && ladder.paths.length > 0;
  const emptyHint = ready
    ? "Set your Align choices and the chain builds itself here."
    : "Pick the revenue you are going after on the Align step, then the measurement chain builds itself per path from what you aligned on.";

  const links: MeasurementLink[] = [];
  let n = 0;
  const nextN = () => ++n;

  // ── SHARED ROOT — the one lever every path is built on ────────────────────
  links.push({
    id: "documentation",
    n: nextN(),
    title: "The documentation is complete",
    teach: "One lever starts every path: the note carries the full, specific picture of the care delivered. Everything each path captures downstream is built on this one thing being true, so it is the first thing to prove.",
    blocked: false,
    groupLabel: "The shared root",
    metrics: [
      {
        id: "doc-completeness",
        label: "Documentation completeness",
        unit: "% of encounters",
        helper: "The share of encounters where the note carries the specificity coding needs. Benchmark until you drop in your own.",
        baseline: "your current rate",
        baselineTag: "benchmark",
        defaultTarget: "rising against baseline",
        fromProof: false,
      },
      {
        id: "doc-problems-per-encounter",
        label: "Problems documented per encounter",
        unit: "problems / encounter",
        helper: "The complexity captured on each note, the raw material every downstream code is built from.",
        baseline: "your current average",
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
      {
        id: "doc-adoption",
        label: "Abridge adoption",
        unit: "% of notes",
        helper: "The share of notes written through Abridge. Nothing downstream moves on the notes it never touches.",
        baseline: "0% today",
        baselineTag: "data",
        defaultTarget: "most notes",
        fromProof: false,
      },
    ],
    defaultChosen: ["doc-completeness"],
  });

  // ── PER-PATH stacking ─────────────────────────────────────────────────────
  if (isIp) {
    for (const p of ladder.paths as IpRevenuePathLadder[]) {
      const group = IP_REVENUE_PATH_GROUP[p.id];
      const { capture, outcome } = ipPathLinks(p, chain as ReturnType<typeof computeIpRevenueChain>, values, proofHas, group, nextN);
      links.push(capture, outcome);
    }
  } else {
    for (const p of ladder.paths as RevenuePathLadder[]) {
      const group = REVENUE_PATH_GROUP[p.id];
      const { capture, outcome } = opPathLinks(p, chain as ReturnType<typeof computeRevenueChain>, values, proofHas, group, nextN);
      links.push(capture, outcome);
    }
  }

  return {
    ready,
    emptyHint,
    links,
    realizedVisits: 0,
    prize: ladder.convergedPrize,
    commitment: {
      title: "The one thing this plan depends on",
      teach:
        "Complete documentation only becomes revenue if the people who touch the claim act on it. The note can carry every condition and the full acuity, but if coders keep to prior-year patterns, queries age out, or the billing team never sees the fuller picture, the completeness never reaches the claim and none of this lands. Someone has to own the coders and providers actually acting on the better documentation.",
      ownerLabel: "Who owns the coders and providers acting on it",
    },
    monthlyCheckTeach:
      "Walk the chain in order. Complete documentation moves first; the captured revenue moves last and shows up on a lag in the claims data, so the early links should turn before the dollars do. Attainment is not a number you assert. It is whether each metric moved toward its target on the schedule you set.",
  };
}

/** Builds the capture + outcome links for one outpatient/ED revenue path. */
function opPathLinks(
  p: RevenuePathLadder,
  chain: ReturnType<typeof computeRevenueChain>,
  values: LeverValues,
  proofHas: (id: string) => boolean,
  group: string,
  nextN: () => number,
): { capture: MeasurementLink; outcome: MeasurementLink } {
  const capturedTarget = p.hasValue ? `${fmtInt(p.capturedCount)} ${p.capturedUnit}` : "finish the Align chain";
  const valueTarget = p.hasValue ? `${fmtMoneyCompact(p.value)} / yr` : "finish the Align chain";

  let captureMetrics: MeasurementMetricOption[] = [];
  let captureDefault: string[] = [];
  let captureTitle = "";
  let captureTeach = "";

  if (p.id === "em") {
    const c = chain.em!.chain;
    const docCaused = c.docCausedSharePct;
    const remaining = Math.max(0, docCaused - (docCaused * c.capturePct) / 100);
    const wrvuTyped = typeof values.revenueEmCurrentWrvu === "number" && values.revenueEmCurrentWrvu > 0;
    const gateAnswered = docCaused > 0;
    captureTitle = "The E/M level matches the care delivered";
    captureTeach = "The leak this path measures: claims that go out below the care the note supports. As the note carries the full picture, the coded level rises to match what actually happened in the room.";
    captureMetrics = [
      {
        id: "em-below-supported",
        label: "Share of visits coded below the supported level",
        unit: "%",
        helper: "The share of E/M claims where the claim goes out below the care you delivered because the note fell short. This is the leak Abridge can close.",
        baseline: `${fmtPct(docCaused)}% today`,
        baselineTag: "benchmark",
        defaultTarget: c.capturePct > 0 ? `under ${fmtPct(remaining)}%` : "lower than today",
        fromProof: gateAnswered,
      },
      {
        id: "em-level-mix",
        label: "Distribution of levels of service",
        unit: "level mix",
        helper: "The spread of coded E/M levels shifting toward the care actually delivered.",
        baseline: "your current mix",
        baselineTag: "benchmark",
        defaultTarget: "shifts toward the care delivered",
        fromProof: proofHas("em-level-mix"),
      },
      {
        id: "em-avg-los",
        label: "Average level of service",
        unit: "avg level",
        helper: "The mean coded E/M level across your visits, rising against this baseline.",
        baseline: "your current average",
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
      {
        id: "em-wrvu-per-provider",
        label: "wRVUs per provider",
        unit: "wRVU / provider",
        helper: `Work RVUs captured per provider, the productivity read on the lift${wrvuTyped ? "" : ", benchmark until you drop in your own"}.`,
        baseline: wrvuTyped ? `${c.currentWrvu} avg wRVU` : "your current wRVUs",
        baselineTag: wrvuTyped ? "data" : "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
    ];
  } else if (p.id === "hcc") {
    const r = chain.hcc!.recapture;
    const recaptureTyped = typeof values.revenueHccCurrentRecapture === "number" && values.revenueHccCurrentRecapture > 0;
    const targetRate = Math.min(90, r.currentRecaptureRate + r.effectiveUpliftPp);
    captureTitle = "The conditions reach the claim";
    captureTeach = "The leak this path measures: conditions your risk-based patients have that never make it onto the claim. As the note documents them specifically, more of them get coded.";
    captureMetrics = [
      {
        id: "hcc-recapture-rate",
        label: "Recapture rate",
        unit: "%",
        helper: "The share of documented conditions that make it back onto the claim, rising from your current recapture rate.",
        baseline: `${fmtPct(r.currentRecaptureRate)}%`,
        baselineTag: recaptureTyped ? "data" : "benchmark",
        defaultTarget: r.effectiveUpliftPp > 0 ? `over ${fmtPct(targetRate)}%` : "above baseline",
        fromProof: proofHas("hcc-recapture-rate") || r.effectiveUpliftPp > 0,
      },
      {
        id: "hcc-suspected-close",
        label: "Suspected-condition close rate",
        unit: "%",
        helper: "The share of conditions Abridge surfaces for the first time that get confirmed and coded, never invented, only documented where they are real.",
        baseline: "0% today",
        baselineTag: "data",
        defaultTarget: "rising against baseline",
        fromProof: false,
      },
      {
        id: "hcc-raf",
        label: "Average conditions per patient (RAF)",
        unit: "conditions / patient",
        helper: "The average risk-adjusting conditions captured per risk-based patient, the RAF read.",
        baseline: `${r.avgHccs} avg today`,
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
    ];
  } else {
    // denials
    const c = chain.denials!.chain;
    const rateTyped = typeof values.revenueDenialsRate === "number" && values.revenueDenialsRate > 0;
    const gateAnswered = c.preventablePct > 0;
    const remaining = Math.max(0, c.denialRate - (c.denialRate * c.preventablePct) / 100);
    captureTitle = "The note establishes medical necessity";
    captureTeach = "The leak this path measures: denials driven by a note that did not establish why the care was needed. As the note carries the necessity, fewer of those claims come back denied.";
    captureMetrics = [
      {
        id: "denials-mednec-rate",
        label: "Medical-necessity denial rate",
        unit: "%",
        helper: "The share of eligible claims denied for medical necessity, the denials a complete note can prevent, not payer rules or authorization.",
        baseline: `${fmtPct(c.denialRate)}%`,
        baselineTag: rateTyped ? "data" : "benchmark",
        defaultTarget: c.preventablePct > 0 ? `under ${fmtPct(remaining)}%` : "lower than today",
        fromProof: proofHas("denials-mednec-rate") || gateAnswered,
      },
      {
        id: "denials-appeal-overturn",
        label: "Appeal overturn rate",
        unit: "%",
        helper: "The share of appealed medical-necessity denials overturned once the documentation is complete.",
        baseline: "your current rate",
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
      {
        id: "denials-recovered",
        label: "Denied dollars recovered",
        unit: "$ / yr",
        helper: "Dollars on claims that were denied and are now paid, the claim the care already earned, not new margin.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: "rising against baseline",
        fromProof: false,
      },
    ];
  }

  const captureProofChosen = captureMetrics.filter((m) => m.fromProof).map((m) => m.id);
  captureDefault = captureProofChosen.length > 0 ? [captureProofChosen[0]] : captureMetrics.length > 0 ? [captureMetrics[0].id] : [];

  const capture: MeasurementLink = {
    id: `${p.id}-capture`,
    n: nextN(),
    title: captureTitle,
    teach: captureTeach,
    blocked: false,
    groupLabel: group,
    metrics: captureMetrics,
    defaultChosen: captureDefault,
  };

  const outcome: MeasurementLink = {
    id: `${p.id}-outcome`,
    n: nextN(),
    title: `The ${group.toLowerCase()} revenue is captured`,
    teach: "The payoff: the revenue this path actually captures, and the count behind it. This is the slice of the prize this path is priced on.",
    blocked: false,
    groupLabel: group,
    metrics: [
      {
        id: `${p.id}-captured-revenue`,
        label: "Captured revenue for this path",
        unit: "$ / yr",
        helper: "The captured claims priced at this path's own rate. This is the CFO number, counted once, not blended with the other paths.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: valueTarget,
        fromProof: proofHas(`${p.id}-captured-revenue`),
      },
      {
        id: `${p.id}-captured-count`,
        label: p.capturedLabel,
        unit: p.capturedUnit,
        helper: "The honest count behind the dollar, so the number is never just an assertion.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: capturedTarget,
        fromProof: false,
      },
    ],
    defaultChosen: [`${p.id}-captured-revenue`],
  };

  return { capture, outcome };
}

/** Builds the capture + outcome links for one inpatient revenue path. */
function ipPathLinks(
  p: IpRevenuePathLadder,
  chain: ReturnType<typeof computeIpRevenueChain>,
  values: LeverValues,
  proofHas: (id: string) => boolean,
  group: string,
  nextN: () => number,
): { capture: MeasurementLink; outcome: MeasurementLink } {
  const capturedTarget = p.hasValue ? `${fmtInt(p.capturedCount)} ${p.capturedUnit}` : "finish the Align chain";
  const valueTarget = p.hasValue ? `${fmtMoneyCompact(p.value)} / yr` : "finish the Align chain";

  let captureMetrics: MeasurementMetricOption[] = [];
  let captureTitle = "";
  let captureTeach = "";

  if (p.id === "drg") {
    const c = chain.drg!.chain;
    captureTitle = "The DRG reflects the acuity documented";
    captureTeach = "The leak this path measures: admissions grouped below the weight they earned, because a managed condition was under-documented. As the note carries the specificity, coding can assign the DRG the admission earned.";
    captureMetrics = [
      {
        id: "drg-capture-rate",
        label: "CC/MCC capture rate",
        unit: "%",
        helper: "The share of at-risk admissions where the CC or MCC reaches the code, rising against this baseline.",
        baseline: "your current rate",
        baselineTag: "benchmark",
        defaultTarget: c.capturePct > 0 ? "rising against baseline" : "above baseline",
        fromProof: c.capturePct > 0,
      },
      {
        id: "drg-cmi",
        label: "Case mix index",
        unit: "CMI",
        helper: "The documented case-mix index rising as the fuller picture reaches the code.",
        baseline: "your current CMI",
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: proofHas("drg-cmi"),
      },
      {
        id: "drg-query-turnaround",
        label: "Query turnaround time",
        unit: "days",
        helper: "Days to close the query that carries the weight, before discharge. The capture only lands if the query closes in time.",
        baseline: "your current turnaround",
        baselineTag: "benchmark",
        defaultTarget: "faster than today",
        fromProof: false,
      },
    ];
  } else if (p.id === "cdi") {
    const c = chain.cdi!.chain;
    const remaining = Math.max(0, c.queryRate - (c.queryRate * c.reductionPct) / 100);
    captureTitle = "The note carries the specificity up front";
    captureTeach = "The leak this path measures: queries the CDI team only has to write because the note lacked the detail up front. As the note carries it, fewer queries need to be written at all.";
    captureMetrics = [
      {
        id: "cdi-query-rate",
        label: "Queries per admission",
        unit: "%",
        helper: "The share of admissions that generate a CDI query, coming down as the note carries the specificity a query would otherwise chase.",
        baseline: `${fmtPct(c.queryRate)}%`,
        baselineTag: "benchmark",
        defaultTarget: c.reductionPct > 0 ? `under ${fmtPct(remaining)}%` : "lower than today",
        fromProof: proofHas("cdi-query-rate") || c.reductionPct > 0,
      },
      {
        id: "cdi-query-turnaround",
        label: "Query turnaround time",
        unit: "days",
        helper: "Days to close the queries that still need to be written, trending down as the note carries more up front.",
        baseline: "your current turnaround",
        baselineTag: "benchmark",
        defaultTarget: "faster than today",
        fromProof: false,
      },
    ];
  } else {
    // obs
    const c = chain.obs!.chain;
    const remaining = Math.max(0, c.denialRate - (c.denialRate * c.preventablePct) / 100);
    captureTitle = "The severity is documented to defend the stay";
    captureTeach = "The leak this path measures: stays downgraded to observation when the severity was real but under-documented. As the note carries the severity-of-illness detail, more inpatient stays hold.";
    captureMetrics = [
      {
        id: "obs-rate",
        label: "Observation downgrade rate",
        unit: "%",
        helper: "The share of stays downgraded to observation, coming down as the note defends the inpatient severity, not stays that were genuinely observation-appropriate.",
        baseline: `${fmtPct(c.denialRate)}%`,
        baselineTag: "benchmark",
        defaultTarget: c.preventablePct > 0 ? `under ${fmtPct(remaining)}%` : "lower than today",
        fromProof: proofHas("obs-rate") || c.preventablePct > 0,
      },
      {
        id: "obs-appeal-overturn",
        label: "Status appeal overturn rate",
        unit: "%",
        helper: "The share of status downgrades overturned on appeal once the severity is documented.",
        baseline: "your current rate",
        baselineTag: "benchmark",
        defaultTarget: "above baseline",
        fromProof: false,
      },
    ];
  }

  const captureProofChosen = captureMetrics.filter((m) => m.fromProof).map((m) => m.id);
  const captureDefault = captureProofChosen.length > 0 ? [captureProofChosen[0]] : captureMetrics.length > 0 ? [captureMetrics[0].id] : [];

  const capture: MeasurementLink = {
    id: `${p.id}-capture`,
    n: nextN(),
    title: captureTitle,
    teach: captureTeach,
    blocked: false,
    groupLabel: group,
    metrics: captureMetrics,
    defaultChosen: captureDefault,
  };

  const isCdi = p.id === "cdi";
  const outcome: MeasurementLink = {
    id: `${p.id}-outcome`,
    n: nextN(),
    title: isCdi ? "The CDI time is saved" : `The ${group.toLowerCase()} revenue is captured`,
    teach: isCdi
      ? "The payoff: CDI staff time no longer spent generating and chasing queries the note now carries. Priced on admin time only, so the DRG dollar is never double counted."
      : "The payoff: the revenue this path actually captures, and the count behind it. This is the slice of the prize this path is priced on.",
    blocked: false,
    groupLabel: group,
    metrics: [
      {
        id: `${p.id}-captured-revenue`,
        label: isCdi ? "CDI staff cost saved" : "Captured revenue for this path",
        unit: "$ / yr",
        helper: isCdi
          ? "The queries no longer needed priced at CDI-staff admin time only. This is the CFO number for this path, counted once."
          : "The captured claims priced at this path's own rate. This is the CFO number, counted once, not blended with the other paths.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: valueTarget,
        fromProof: proofHas(`${p.id}-captured-revenue`),
      },
      {
        id: `${p.id}-captured-count`,
        label: p.capturedLabel,
        unit: p.capturedUnit,
        helper: "The honest count behind the dollar, so the number is never just an assertion.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: capturedTarget,
        fromProof: false,
      },
    ],
    defaultChosen: [`${p.id}-captured-revenue`],
  };

  return { capture, outcome };
}

// ── QUALITY & SAFETY (nursing) measurement plan — THE HONEST EXCEPTION ───────
//
// Quality does not price like the financial goals, so this plan is shaped for
// safety and experience first. It is MULTI-EVENT: it STACKS PER EVENT the
// partner picked on Align, exactly the way the revenue plan stacks per path.
// The shape is:
//
//   SHARED ROOT: Abridge's two benefits made real, the earlier, more complete
//     risk note and the freed bedside time. Every event downstream is built on
//     these two being true.
//   PER CHOSEN EVENT (only the ones they picked on Align):
//     - a CONVERSIONS link, whose metric menu is bundle/intervention compliance
//       and near-miss catches (the changes the freed time and earlier note let
//       the unit run on top of its existing bundle);
//     - an OUTCOME link that LEADS WITH A COUNT (events prevented a year) and
//       the rate; the cost of harm avoided is a SOFT, clearly-labeled metric,
//       never the hero, and it is not selected by default.
//   For HCAHPS (patient experience): a PRESENCE link (protect the face-to-face
//     time the freed minutes buy) then an EXPERIENCE link (HCAHPS domain scores
//     rising). HCAHPS carries NO hard dollar.
//
// DYNAMIC to Align: only the picked events appear; the per-event honest gate
// badges that event's compliance metric ("From what you told us on Align") and
// the committed conversions badge the near-miss metric; the proof choices pre-
// select the matching signals; the beds/census scope sets the per-event rates
// and prevented counts straight off the shared quality ladder. The 30%
// attribution posture is kept (the caller passes the reconciled realizationPct,
// which scales only the soft dollar; the counts are attribution-independent).
// The COMMITMENT is the make-or-break: the unit actually running the Abridge-
// enabled conversions at the bedside, because Abridge frees the time and
// surfaces the risk, but only the unit prevents.

/** Section labels for the per-event scorecard (match the Align selector). */
const QUALITY_EVENT_GROUP: Record<string, string> = {
  falls: "Falls",
  hapi: "Pressure injuries (HAPI)",
  clabsi: "Central-line infections (CLABSI)",
  cauti: "Catheter infections (CAUTI)",
  sepsis: "Sepsis",
  [HCAHPS_ID]: "Patient experience (HCAHPS)",
};

/** The plain noun each event's outcome link counts down, so the title reads
 * "Fewer X happen" instead of an awkward "the falls rate falls". */
const QUALITY_EVENT_NOUN: Record<QualityEventId, string> = {
  falls: "falls",
  hapi: "pressure injuries",
  clabsi: "line infections",
  cauti: "catheter infections",
  sepsis: "sepsis cases",
};

/**
 * Derives the multi-event QUALITY measurement plan from the Align state.
 *
 * Merges the Align choices onto their engine levers the same way
 * `deriveQualityAlignProof` does, so the shared quality ladder produces the
 * same per-event grounds, ceilings, prevented counts, and soft dollars the
 * number was aligned on. `opts.realizationPct` is the reconciled attribution
 * the caller derives off the combined engine result; it scales ONLY the soft
 * dollar (the counts are attribution-independent), keeping the safety-first
 * posture honest.
 */
export function deriveQualityMeasurementPlan(
  baseline: AttainBaseline,
  values: LeverValues,
  opts: { realizationPct: number },
): MeasurementPlanModel {
  const ctx = { baseline, setting: "nursing" as AttainSetting, realizationPct: opts.realizationPct, crossGoalShareMultiplier: 1 };
  const engine = qualityAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };
  const ladder = deriveQualityLadder(baseline, merged, opts.realizationPct);

  const chosenEvents = selectedOptionIds(values, K_EVENTS);
  const clinicalChosen = CLINICAL_EVENT_IDS.filter((id) => chosenEvents.includes(id));
  const hcahpsChosen = chosenEvents.includes(HCAHPS_ID);
  const who = firstSelected(values, K_WHO);
  const proof = selectedOptionIds(values, K_PROOF);

  const prevented = ladder.events.reduce((s, e) => s + e.capturedCount, 0);
  const softDollar = ladder.convergedPrize; // already attributed at realizationPct

  const ready = chosenEvents.length > 0 && Boolean(who);
  const emptyHint =
    chosenEvents.length === 0
      ? "Pick the outcomes you are working to prevent on the Align step, then the measurement chain builds itself per event from what you aligned on."
      : !who
        ? "Say which beds this is for on the Align step, so each event is sized on real patient-days."
        : "Set your Align choices and the chain builds itself here.";

  const links: MeasurementLink[] = [];
  let n = 0;
  const nextN = () => ++n;

  // ── SHARED ROOT — Abridge's two benefits, the thing every event is built on ─
  links.push({
    id: "signal-and-time",
    n: nextN(),
    title: "The signal surfaces earlier and the time is freed",
    teach:
      "Two things start every event here: the note carries the risk earlier and more completely, and the minutes Abridge frees come back to the bedside. Everything each event prevents downstream is built on these two being real, so they are the first things to prove.",
    blocked: false,
    groupLabel: "The shared root",
    metrics: [
      {
        id: "quality-adoption",
        label: "Abridge adoption",
        unit: "% of notes",
        helper: "The share of notes written through Abridge. Nothing downstream moves on the notes it never touches.",
        baseline: "0% today",
        baselineTag: "data",
        defaultTarget: "most notes",
        fromProof: false,
      },
      {
        id: "quality-freed-time-redeployed",
        label: "Freed bedside time redeployed",
        unit: "%",
        helper: "The share of the minutes Abridge frees that goes back to rounding and presence at the bedside, not the next task. This is the commitment, made visible.",
        baseline: "0% today",
        baselineTag: "data",
        defaultTarget: "most of it",
        fromProof: false,
      },
      {
        id: "quality-risk-documented-earlier",
        label: "Risk documented earlier",
        unit: "% of high-risk patients",
        helper: "The share of high-risk patients whose risk is captured in the note in real time, early enough to act on. Benchmark until you drop in your own.",
        baseline: "your current rate",
        baselineTag: "benchmark",
        defaultTarget: "rising against baseline",
        fromProof: false,
      },
    ],
    defaultChosen: ["quality-adoption"],
  });

  // ── PER CLINICAL EVENT — only the ones picked, in the ladder's order ────────
  for (const e of ladder.events) {
    const group = QUALITY_EVENT_GROUP[e.id] ?? e.label;
    const noun = QUALITY_EVENT_NOUN[e.id] ?? "events";
    const countUnit = e.id === "sepsis" ? "cases / yr" : "events / yr";
    const gate = firstSelected(values, `${K_GATE}__${e.id}`);
    const gateAnswered = Boolean(gate) && gate !== "despite";
    const changes = selectedOptionIds(values, `${K_CHANGE}__${e.id}`);
    const committedConversion = changes.includes("signal") || changes.includes("handoff") || changes.includes("rounding");

    // Link A — the committed conversions actually happen at the bedside.
    const complianceFromProof = proof.includes("compliance") || gateAnswered;
    const nearMissFromProof = proof.includes("nearmiss") || committedConversion;
    const conversionMetrics: MeasurementMetricOption[] = [
      {
        id: `${e.id}-bundle-compliance`,
        label: "Bundle and intervention compliance",
        unit: "%",
        helper: "The share of at-risk patients getting every step the freed time and the earlier note let you add, on top of the care you already run. Benchmark until you drop in your own.",
        baseline: "your current rate",
        baselineTag: "benchmark",
        defaultTarget: "rising against baseline",
        fromProof: complianceFromProof,
      },
      {
        id: `${e.id}-near-miss`,
        label: "Near-miss catches",
        unit: "catches / month",
        helper: "Risks caught and acted on before they became an event, the earlier signal doing its job.",
        baseline: "0 tracked today",
        baselineTag: "data",
        defaultTarget: "tracked each month",
        fromProof: nearMissFromProof,
      },
    ];
    const convProofChosen = conversionMetrics.filter((m) => m.fromProof).map((m) => m.id);
    links.push({
      id: `${e.id}-conversions`,
      n: nextN(),
      title: "The changes you committed happen",
      teach:
        "The first thing to prove for this event: the changes you committed to on Align actually happen at the bedside. Abridge frees the time and surfaces the risk earlier; whether the change happens is on the unit.",
      blocked: false,
      groupLabel: group,
      metrics: conversionMetrics,
      defaultChosen: convProofChosen.length > 0 ? [convProofChosen[0]] : [`${e.id}-bundle-compliance`],
    });

    // Link B — the outcome, COUNT FIRST, dollar soft and clearly labeled.
    const preventedSet = e.capturedCount > 0;
    const preventedTarget = preventedSet
      ? `${fmtEventCount(e.capturedCount)} ${countUnit}`
      : gate === "despite"
        ? "an honest near-zero"
        : "finish the Align chain";
    const rateFromProof = proof.includes("rate");
    const outcomeMetrics: MeasurementMetricOption[] = [
      {
        id: `${e.id}-events-prevented`,
        label: "Events prevented per year",
        unit: countUnit,
        helper: "The count of harm events kept from happening a year. This is the honest hero for this event, the number you lead with, never a dollar.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: preventedTarget,
        fromProof: false,
      },
      {
        id: `${e.id}-rate`,
        label: "Event rate per 1,000 patient-days",
        unit: "per 1,000",
        helper: "The harm-event rate, trending down against your baseline. This is the standard safety measure the unit already tracks.",
        baseline: e.rate > 0 ? `${e.rate} per 1,000` : "your current rate",
        baselineTag: "benchmark",
        defaultTarget: "lower than today",
        fromProof: rateFromProof,
      },
      {
        id: `${e.id}-cost-harm-avoided`,
        label: "Cost of harm avoided (soft)",
        unit: "$ / yr",
        helper: "A soft, illustrative figure only: the events prevented priced at a typical cost of harm, attributed conservatively. It is a footnote, never the number you lead with.",
        baseline: "$0 today",
        baselineTag: "benchmark",
        defaultTarget: e.value > 0 ? `~${fmtMoneyCompact(e.value)} / yr (soft)` : "soft, not priced",
        fromProof: false,
      },
    ];
    const outcomeDefault = [`${e.id}-events-prevented`];
    if (rateFromProof) outcomeDefault.push(`${e.id}-rate`);
    links.push({
      id: `${e.id}-outcome`,
      n: nextN(),
      title: `Fewer ${noun} happen`,
      teach:
        "The payoff, and the honest exception: lead with the count of events kept from happening and the rate, not a dollar. Abridge enables the earlier signal and the freed time; your team converts it at the bedside; the outcome is both.",
      blocked: false,
      groupLabel: group,
      metrics: outcomeMetrics,
      defaultChosen: outcomeDefault,
    });
  }

  // ── HCAHPS (patient experience) — presence, then the domain scores. No hard
  //    dollar. The cleanest Abridge story: presence. ───────────────────────────
  if (hcahpsChosen) {
    const group = QUALITY_EVENT_GROUP[HCAHPS_ID];
    const presenceChosen = selectedOptionIds(values, `${K_CHANGE}__${HCAHPS_ID}`).includes("presence");
    links.push({
      id: "hcahps-presence",
      n: nextN(),
      title: "The presence is protected",
      teach:
        "The cleanest Abridge story for experience: the minutes Abridge frees are spent at the bedside, with the patient, instead of the keyboard.",
      blocked: false,
      groupLabel: group,
      metrics: [
        {
          id: "hcahps-presence-share",
          label: "Freed time spent at the bedside",
          unit: "%",
          helper: "The share of the freed minutes that becomes face-to-face time with patients, not the next task.",
          baseline: "0% today",
          baselineTag: "data",
          defaultTarget: "most of it",
          fromProof: presenceChosen,
        },
      ],
      defaultChosen: ["hcahps-presence-share"],
    });
    links.push({
      id: "hcahps-outcome",
      n: nextN(),
      title: "The experience scores rise",
      teach:
        "The payoff for experience: your HCAHPS domains move. This carries no hard dollar here; the score itself is the outcome.",
      blocked: false,
      groupLabel: group,
      metrics: [
        {
          id: "hcahps-domains",
          label: "HCAHPS domain scores",
          unit: "percentile",
          helper: "The patient-experience domains most tied to nurse presence, nurse communication and responsiveness, rising against your baseline. Benchmark until you drop in your own.",
          baseline: "your current percentile",
          baselineTag: "benchmark",
          defaultTarget: "rising against baseline",
          fromProof: proof.includes("hcahps"),
        },
        {
          id: "hcahps-overall",
          label: "Overall rating of care",
          unit: "% top-box",
          helper: "The share of patients giving the top rating of their care, trending up.",
          baseline: "your current top-box",
          baselineTag: "benchmark",
          defaultTarget: "above baseline",
          fromProof: false,
        },
      ],
      defaultChosen: ["hcahps-domains"],
    });
  }

  // Love Stories is a qualitative proof carried on the last link when named.
  if (proof.includes("lovestories") && links.length > 1) {
    const last = links[links.length - 1];
    last.metrics.push({
      id: "quality-love-stories",
      label: "Love Stories",
      unit: "collected",
      helper: "Nurses telling you, in their own words, about a patient the earlier signal or the freed time helped them catch.",
      baseline: "none collected yet",
      baselineTag: "data",
      defaultTarget: "collected each quarter",
      fromProof: true,
    });
    last.defaultChosen = [...last.defaultChosen, "quality-love-stories"];
  }

  // ── The safety-first header: a COUNT leads, the dollar is a soft footnote ───
  const heroValue =
    prevented > 0
      ? `~${fmtEventCount(prevented)} harm events / yr`
      : hcahpsChosen
        ? "patient experience"
        : "count pending";
  const softDollarNote =
    softDollar > 0
      ? `Cost of harm avoided prices to a soft ~${fmtMoneyCompact(softDollar)} a year, attributed at ${Math.round(
          opts.realizationPct,
        )}% to this plan. Lead with the events and the experience, not the dollar.`
      : "This plan leads with safety and experience. HCAHPS carries no hard dollar, so there is no figure to footnote here.";

  return {
    ready,
    emptyHint,
    links,
    realizedVisits: prevented,
    prize: softDollar,
    safetyHeadline: { heroValue, softDollarNote },
    commitment: {
      title: "The one thing this plan depends on",
      teach:
        "Abridge frees the time and surfaces the risk earlier, but it does not prevent anything on its own. The unit has to run the changes you committed to: redeploy the freed minutes into rounding and presence, act on the risk the note surfaces earlier, and tighten handoffs on the fuller notes. If the freed time quietly refills with other tasks, the signal is real but nothing downstream moves. Someone has to own making those conversions happen at the bedside.",
      ownerLabel: "Who owns making the conversions happen",
    },
    monthlyCheckTeach:
      "Walk the chain in order. The freed time and the earlier signal move first, then the changes at the bedside, then the compliance and the near-miss catches; the event rate and the count of events prevented move last, and on a lag. Lead your review with the counts and the experience scores, never the dollar. Attainment is not a number you assert. It is whether each metric moved toward its target on the schedule you set.",
  };
}

// ── CAPACITY (nursing overtime) measurement plan ─────────────────────────────
//
// Capacity for nurses is OVERTIME reduction, a SINGLE-GATED ladder like access
// and workforce: the rungs multiply, so no rung is independently "worth $X" and
// the whole realized dollar rides on one honest gate. The surface and the
// discipline are identical to every other plan: every baseline is the partner's
// own figure or a labeled benchmark, every owner and date starts BLANK, targets
// default to the derived figure so the gap shows, and the whole thing is
// DYNAMIC to the capacity Align choices.
//
// The chain is the order overtime actually comes down in:
//   1. the post-shift charting falls   (the load that turns into overtime comes off)
//   2. nurses finish on time           (the make-or-break: freed time becomes leaving on time)
//   3. overtime hours fall             (the outcome the prize is priced on)
//
// DYNAMIC to Align:
//   - the honest gate (Q3) closes link 2 when the overtime is short staffing or
//     census, because freeing documentation time cannot add nurses or flatten
//     census, so the shift never closes on time from this and the honest number
//     stays at zero (the same zero the Align number already reflects);
//   - the "where it shows up" answer (Q4) pre-selects and badges the post-shift
//     charting metric on link 1;
//   - the proof (Q5) pre-selects the matching signals on links 2 and 3 (on-time
//     completion, overtime per nurse, the overtime dollars), and Love Stories
//     adds the qualitative proof on link 3;
//   - the scope + Starting-Point numbers (nurses, OT hrs/wk, OT rate) set the
//     baselines and the derived targets straight off the shared capacity ladder.
//
// COMMITMENT (make-or-break): the freed time becomes leaving on time, not more
// tasks. It also states plainly there is NO double count with retention: the
// overtime avoided is wages you stop paying now, retention is the replacement
// cost of a nurse who would have quit, different dollars off the same root.

/** The capacity Align proof option ids -> the measurement metric each maps onto,
 * so the proof a partner already named on Align pre-selects the matching metric. */
const CAPACITY_PROOF_TO_METRIC: Record<string, string> = {
  othours: "ot-hours-per-nurse-week",
  ontime: "on-time-shift-completion",
  budget: "ot-dollars-saved",
};

/**
 * Derives the CAPACITY (nursing overtime) measurement plan from the Align state.
 *
 * Re-merges the Align choices onto the engine levers exactly as
 * `capacityAlignToLeverValues` does (idempotent, so it is correct whether the
 * caller passes the merged values the app persists or the raw choices), then
 * reads the SAME `computeCapacityChain` / `deriveNursingCapacityLadder` every
 * other capacity surface reads, which reconciles to Explore's own
 * `nursingOvertime` driver. `opts.realizedOtHoursAvoided` and `opts.prize` are
 * passed in so the caller supplies the same realization-applied figures off the
 * combined engine result, keeping link-3's targets and the promise prize
 * reconciled with Align exactly, as `deriveNursingCapacityLadder` takes them.
 */
export function deriveCapacityMeasurementPlan(
  baseline: AttainBaseline,
  values: LeverValues,
  opts: { realizedOtHoursAvoided: number; prize: number },
): MeasurementPlanModel {
  const merged: LeverValues = {
    ...values,
    ...capacityAlignToLeverValues(values, {
      baseline,
      setting: "nursing",
      realizationPct: 100,
      crossGoalShareMultiplier: 1,
    }),
  };
  const chain = computeCapacityChain(baseline, merged);
  const ladder = deriveNursingCapacityLadder(chain, {
    realizedOtHoursAvoided: opts.realizedOtHoursAvoided,
    prize: opts.prize,
  });

  const who = firstSelected(values, "capacityAlignWho");
  const gate = firstSelected(values, "capacityAlignGate");
  const where = firstSelected(values, "capacityAlignWhere");
  const outcome = firstSelected(values, "capacityAlignOutcome");
  const proof = selectedOptionIds(values, "capacityAlignProof");

  const ready = Boolean(who) && Boolean(gate);
  const emptyHint = !who
    ? "Pick who this is for on the Align step, then the measurement chain builds itself from what you aligned on."
    : !gate
      ? "Say why the overtime is there on the Align step, so the chain measures only what Abridge can honestly move."
      : "Set your Align choices and the chain builds itself here.";

  const proofHas = (metricId: string) => proof.some((p) => CAPACITY_PROOF_TO_METRIC[p] === metricId);

  // The honest gate: only documentation lets freed charting time become nurses
  // finishing on time. Short staffing or census surges cannot be solved by
  // freeing the record, so the make-or-break link (link 2) closes and the honest
  // number stays at zero, exactly the zero the Align number already reflects.
  const finishBlocked = gate === "staffing" || gate === "census";
  const gateWord = gate === "staffing" ? "short staffing" : "census surges";
  const gateVerb = gate === "staffing" ? "add nurses" : "flatten census";

  // ── Link 1 — the post-shift charting falls ────────────────────────────────
  // Baseline is "0 today" for minutes saved (nothing saved before Abridge); the
  // post-shift charting minutes is a labeled benchmark until the partner drops
  // in their own timed figure. The "where it shows up" answer pre-selects the
  // post-shift metric, the way the retention burden pre-selects after-hours.
  const whereChosen = Boolean(where);
  const chartingLink: MeasurementLink = {
    id: "charting",
    n: 1,
    title: "The post-shift charting falls",
    teach: "The first thing to prove: the note comes off the end of the shift. Post-shift charting is the load that turns into overtime, and everything downstream depends on it actually coming down.",
    blocked: false,
    metrics: [
      {
        id: "minutes-saved-per-note",
        label: "Minutes saved per note",
        unit: "min / note",
        helper: "Charting time that comes off each note, measured against a timed sample before go-live.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: `${fmtInt(CAPACITY_MEASURE_BENCH.minutesSavedPerNote)} min`,
        fromProof: false,
      },
      {
        id: "post-shift-charting-minutes",
        label: "Post-shift charting minutes per shift",
        unit: "min / shift",
        helper: "The charting that happens after the shift ends, the work that pushes into overtime. Benchmark until you drop in your own timed figure.",
        baseline: `${CAPACITY_MEASURE_BENCH.postShiftChartingMinutesPerShift} min / shift`,
        baselineTag: "benchmark",
        defaultTarget: `under ${CAPACITY_MEASURE_BENCH.postShiftChartingTargetMinutesPerShift} min / shift`,
        fromProof: whereChosen,
      },
    ],
    defaultChosen: whereChosen ? ["post-shift-charting-minutes"] : ["minutes-saved-per-note"],
  };

  // ── Link 2 — nurses finish on time (THE make-or-break, gated) ─────────────
  const onTimeFromProof = proofHas("on-time-shift-completion");
  const finishLink: MeasurementLink = {
    id: "finish",
    n: 2,
    title: "Nurses finish on time",
    teach: "Freed charting time only cuts overtime if the shift actually closes on time instead of running late. This is the link the plan depends on most.",
    blocked: finishBlocked,
    blockedReason: finishBlocked
      ? `You told us on Align the overtime is ${gateWord}. Freeing documentation time cannot ${gateVerb}, so the shift does not close on time from this and no overtime comes out. The honest number stays at zero until that limit changes.`
      : undefined,
    metrics: finishBlocked
      ? []
      : [
          {
            id: "on-time-shift-completion",
            label: "On-time shift completion",
            unit: "%",
            helper: "The share of shifts that close on time instead of running into overtime. Benchmark until you drop in your own.",
            baseline: `${CAPACITY_MEASURE_BENCH.onTimeShiftCompletionPct}%`,
            baselineTag: "benchmark",
            defaultTarget: `over ${CAPACITY_MEASURE_BENCH.onTimeShiftCompletionTargetPct}%`,
            fromProof: onTimeFromProof,
          },
          {
            id: "doc-attributable-share",
            label: "Documentation-attributable share of overtime",
            unit: "%",
            helper: "The share of your overtime that post-shift charting drives, the ceiling on what this plan can move, holding as you measure it.",
            baseline: chain.docAttributableSharePct > 0 ? `${fmtPct(chain.docAttributableSharePct)}%` : "set where it shows up on Align",
            baselineTag: "benchmark",
            defaultTarget: "holds against baseline",
            fromProof: false,
          },
        ],
    defaultChosen: finishBlocked ? [] : ["on-time-shift-completion"],
  };

  // ── Link 3 — overtime hours fall (the outcome the prize is priced on) ─────
  // The OT hours per nurse and rate are FACTS (labeled benchmarks, they are not
  // re-asked on capacity Align). The hours avoided and dollars are "0 today"
  // data baselines with the derived figures as targets, so the gap is real. When
  // the gate closed link 2, these read an honest zero, never a stray number.
  const avoidedSet = ladder.realizedOtHoursAvoided > 0;
  const prizeSet = ladder.prize > 0;
  const honestZero = finishBlocked;
  const otHoursPerNurseFromProof = proofHas("ot-hours-per-nurse-week");
  const dollarsFromProof = proofHas("ot-dollars-saved");
  const overtimeLink: MeasurementLink = {
    id: "overtime",
    n: 3,
    title: "Overtime hours fall",
    teach: "The payoff: fewer overtime hours on the schedule, and the loaded overtime dollars that come out of the nursing budget. This is the number the promise is priced on.",
    blocked: false,
    metrics: [
      {
        id: "ot-hours-per-nurse-week",
        label: "Overtime hours per nurse per week",
        unit: "hrs / nurse / wk",
        helper: "The overtime each nurse works in a week, trending down against this baseline.",
        baseline: `${fmtHours1(ladder.otHoursPerNurseWeek)} hrs / wk`,
        baselineTag: "benchmark",
        defaultTarget: "lower than today",
        fromProof: otHoursPerNurseFromProof,
      },
      {
        id: "ot-hours-avoided",
        label: "Overtime hours avoided",
        unit: "hrs / yr",
        helper: "Total overtime hours a year the freed charting time takes off the schedule, the honest count behind the dollar.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: honestZero ? "an honest zero here" : avoidedSet ? `${fmtInt(ladder.realizedOtHoursAvoided)} / yr` : "finish the Align chain",
        fromProof: false,
      },
      {
        id: "ot-dollars-saved",
        label: "Overtime dollars saved",
        unit: "$ / yr",
        helper: "The overtime hours avoided priced at your loaded overtime rate. This is the CFO number.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: honestZero ? "an honest zero here" : prizeSet ? `${fmtMoneyCompact(ladder.prize)} / yr` : "finish the Align chain",
        fromProof: dollarsFromProof,
      },
    ],
    defaultChosen: [],
  };
  const overtimeProofChosen = overtimeLink.metrics.filter((m) => m.fromProof).map((m) => m.id);
  overtimeLink.defaultChosen = overtimeProofChosen.length > 0 ? overtimeProofChosen : ["ot-hours-avoided"];
  // Love Stories is a qualitative proof carried alongside the overtime number
  // when the partner named it on Align.
  if (proof.includes("lovestories")) {
    overtimeLink.metrics.push({
      id: "love-stories",
      label: "Love Stories",
      unit: "collected",
      helper: "Nurses telling you, in their own words, that the shift got better and they left on time.",
      baseline: "none collected yet",
      baselineTag: "data",
      defaultTarget: "collected each quarter",
      fromProof: true,
    });
    overtimeLink.defaultChosen = [...overtimeLink.defaultChosen, "love-stories"];
  }

  return {
    ready,
    emptyHint,
    links: [chartingLink, finishLink, overtimeLink],
    gate,
    outcome,
    realizedVisits: ladder.realizedOtHoursAvoided,
    prize: ladder.prize,
    commitment: {
      title: "The one thing this plan depends on",
      teach: `Freed charting time only cuts overtime if it becomes leaving on time, not more tasks. If the minutes quietly refill with other work, the charting comes off but the shift still runs late and no overtime comes out. Someone has to own protecting that freed time as time back, so nurses actually leave on time. ${NURSING_CAPACITY_NO_DOUBLE_COUNT}`,
      ownerLabel: "Who owns protecting the freed time as leaving on time",
    },
    monthlyCheckTeach:
      "Walk the chain in order. The post-shift charting falls first, the overtime dollars move last, so early links should turn before the later ones. Attainment is not a number you assert. It is whether each metric moved toward its target on the schedule you set.",
  };
}

// ── ED ACCESS measurement plan ───────────────────────────────────────────────
//
// ED access is a SINGLE-GATED ladder like outpatient access and nursing
// overtime: the rungs multiply, so no rung is independently "worth $X" and the
// whole realized dollar rides on one honest gate (the documentation-caused
// share of the LWBS pool). The surface and the discipline are identical to
// every other plan: every baseline is the partner's own figure or a labeled
// benchmark, every owner and date starts BLANK, targets default to the derived
// figure so the gap shows, and the whole thing is DYNAMIC to the ED access
// Align choices, reconciling to the same ED access drivers.
//
// The chain is the order ED access actually moves in:
//   1. the minutes free the throughput   (freed charting time buys faster flow)
//   2. door-to-provider falls            (the make-or-break: the walk shortens)
//   3. LWBS falls                        (fewer patients leave before being seen)
//   4. recovered visits and captured admissions land (the prize is priced on it)
//
// DYNAMIC to Align:
//   - the honest gate (Q3) closes link 2 when the leak is short staffing or
//     beds, because freeing documentation time cannot add staff or open beds,
//     so the door does not shorten and the honest number stays at zero (the
//     same zero the Align number already reflects);
//   - the "where the loss shows up" answer (Q4) pre-selects and badges the
//     door-to-provider and LWBS-rate metrics;
//   - the outcome (Q1) badges the door metric and, when admissions are in play,
//     the captured-admissions metric;
//   - the proof (Q5) pre-selects the matching signals (LWBS rate, door-to-
//     provider time, recovered visits, captured admissions);
//   - the scope + Starting-Point numbers set the baselines and the derived
//     targets straight off the shared ED access ladder.
//
// COMMITMENT (make-or-break): the freed time actually shortens door-to-provider,
// which is ED operations' to hold (triage-to-provider flow), not Abridge's.

/** ED access labeled benchmarks, used ONLY when the partner has no measured
 * figure. Surfaced with a "Benchmark" tag so they are never mistaken for the
 * partner's own numbers. */
export const ED_ACCESS_MEASURE_BENCH = {
  minutesSavedPerNote: 9,
  doorToProviderMin: 45,
  doorToProviderTargetMin: 30,
  lwbsRatePct: 8,
  lwbsRateTargetPct: 4,
  boardingHours: 4, // hours an admitted patient holds in the ED before a bed
  boardingHoursTarget: 2,
} as const;

/** The ED access Align proof option ids -> the measurement metric each maps
 * onto, so the proof a partner already named on Align pre-selects the metric. */
const ED_ACCESS_PROOF_TO_METRIC: Record<string, string> = {
  lwbsrate: "lwbs-rate",
  doortime: "door-to-provider-time",
  boarding: "boarding-hours",
  recovered: "recovered-visits",
  admissions: "captured-admissions",
};

/**
 * Derives the ED ACCESS measurement plan from the Align state.
 *
 * Re-merges the Align choices onto the engine levers exactly as
 * `edAccessAlignToLeverValues` does (idempotent, so it is correct whether the
 * caller passes the merged values the app persists or the raw choices), then
 * reads the SAME `computeEdAccessChain` / `deriveEdAccessLadder` every other ED
 * access surface reads, which reconciles to Explore's edLwbs / admission-capture
 * primitives. `opts.realizedRecovered`, `opts.capturedAdmissions`, and
 * `opts.prize` are passed in so the caller supplies the same figures every
 * other ED access surface uses off the combined engine result, keeping link-4's
 * targets and the promise prize reconciled with Align exactly.
 */
export function deriveEdAccessMeasurementPlan(
  baseline: AttainBaseline,
  values: LeverValues,
  crossGoalShareMultiplier: number,
  opts: { realizedRecovered: number; capturedAdmissions: number; prize: number },
): MeasurementPlanModel {
  const merged: LeverValues = {
    ...values,
    ...edAccessAlignToLeverValues(values, {
      baseline,
      setting: "ed",
      realizationPct: 100,
      crossGoalShareMultiplier: 1,
    }),
  };
  const chain = computeEdAccessChain(baseline, merged, crossGoalShareMultiplier);
  const ladder = deriveEdAccessLadder(chain, {
    realizedRecovered: opts.realizedRecovered,
    capturedAdmissions: opts.capturedAdmissions,
    prize: opts.prize,
  });

  const who = firstSelected(values, "edAccessAlignWho");
  const gate = firstSelected(values, "edAccessAlignGate");
  const outcomes = selectedOptionIds(values, "edAccessAlignOutcome");
  const where = selectedOptionIds(values, "edAccessAlignWhere");
  const proof = selectedOptionIds(values, "edAccessAlignProof");

  const ready = Boolean(who) && Boolean(gate);
  const emptyHint = !who
    ? "Pick who this is for on the Align step, then the measurement chain builds itself from what you aligned on."
    : !gate
      ? "Say why patients leave without being seen on the Align step, so the chain measures only what Abridge can honestly move."
      : "Set your Align choices and the chain builds itself here.";

  const proofHas = (metricId: string) => proof.some((p) => ED_ACCESS_PROOF_TO_METRIC[p] === metricId);
  const wantsAdmissions = outcomes.includes("admissions");
  const lwbsTyped = sharpenerNumber(values, "edAccessAlignLwbsRate") > 0;

  // The honest gate: only documentation-choked throughput lets freed charting
  // time shorten the door-to-provider walk. Short staffing or no beds cannot be
  // solved by freeing the record, so the make-or-break link (link 2) closes and
  // the honest number stays at zero, exactly the zero the Align number reflects.
  const doorBlocked = gate === "staffing";
  const honestZero = doorBlocked;

  // ── Link 1 — the minutes free the throughput ──────────────────────────────
  const minutesTarget = ladder.minutes > 0 ? ladder.minutes : ED_ACCESS_MEASURE_BENCH.minutesSavedPerNote;
  const freedSet = ladder.freedHrsPerProviderWk > 0;
  const throughputLink: MeasurementLink = {
    id: "throughput",
    n: 1,
    title: "The minutes free the throughput",
    teach: "The first thing to prove: the note takes less time, and that freed time is the only thing that mechanically buys a faster door-to-provider. Everything downstream builds on this one number.",
    blocked: false,
    metrics: [
      {
        id: "minutes-saved-per-note",
        label: "Minutes saved per note",
        unit: "min / note",
        helper: "Charting time that comes off each ED note, measured against a timed sample before go-live.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: `${fmtInt(minutesTarget)} min`,
        fromProof: false,
      },
      {
        id: "freed-throughput-hours",
        label: "Freed hours committed to throughput",
        unit: "hrs / provider / wk",
        helper: "The freed minutes, added up across a week and directed to faster door-to-provider instead of staying as relief.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: freedSet ? `${fmtHours1(ladder.freedHrsPerProviderWk)} hrs / wk` : "set your providers on Align",
        fromProof: false,
      },
    ],
    defaultChosen: ["minutes-saved-per-note"],
  };

  // ── Link 2 — door-to-provider falls (THE make-or-break, gated) ────────────
  const doorFromProof = proofHas("door-to-provider-time") || where.includes("doortoprovider") || outcomes.includes("doortoprovider");
  const doorLink: MeasurementLink = {
    id: "door",
    n: 2,
    title: "Door-to-provider falls",
    teach: "Freed time only recovers a patient if it actually shortens the walk from the door to a provider. This is the link the plan depends on most.",
    blocked: doorBlocked,
    blockedReason: doorBlocked
      ? "You told us on Align the limit is staffing or beds. Freeing documentation time cannot add staff or open beds, so the door-to-provider walk does not shorten from this and no left-without-being-seen visit becomes recoverable. The honest number stays at zero until that limit changes."
      : undefined,
    metrics: doorBlocked
      ? []
      : [
          {
            id: "door-to-provider-time",
            label: "Door-to-provider time",
            unit: "min",
            helper: "The minutes from arrival to a provider, coming down as the freed time speeds the front end. Benchmark until you drop in your own.",
            baseline: `${ED_ACCESS_MEASURE_BENCH.doorToProviderMin} min`,
            baselineTag: "benchmark",
            defaultTarget: `under ${ED_ACCESS_MEASURE_BENCH.doorToProviderTargetMin} min`,
            fromProof: doorFromProof,
          },
          {
            id: "share-freed-time-throughput",
            label: "Share of freed time committed to throughput",
            unit: "%",
            helper: "The portion of freed hours directed to faster door-to-provider, rather than staying as relief. This is the commitment, made visible.",
            baseline: "0% today",
            baselineTag: "data",
            defaultTarget: ladder.throughputSharePct > 0 ? `${fmtInt(ladder.throughputSharePct)}%` : "set on Align",
            fromProof: false,
          },
        ],
    defaultChosen: doorBlocked ? [] : ["door-to-provider-time"],
  };

  // ── Link 3 — LWBS falls ───────────────────────────────────────────────────
  const lwbsFromProof = proofHas("lwbs-rate") || where.includes("triage") || outcomes.includes("lwbs");
  // Boarding / admit-hold hours: named on the "where the loss shows up" question,
  // now trackable. An optional pick, pre-selected only when named as proof or as
  // a place the loss shows up. A labeled benchmark until the partner enters their
  // own median boarding time; target lower.
  const boardingFromProof = proofHas("boarding-hours") || where.includes("boarding");
  const lwbsLink: MeasurementLink = {
    id: "lwbs",
    n: 3,
    title: "LWBS falls",
    teach: "As the door shortens, fewer patients give up and leave before being seen. Only the charting-caused share of that leak is Abridge's to move; the rest leaves for staffing or beds.",
    blocked: false,
    metrics: [
      {
        id: "lwbs-rate",
        label: "LWBS rate",
        unit: "%",
        helper: "The share of arrivals who leave before a provider sees them, trending down against this baseline.",
        baseline: lwbsTyped ? `${fmtInt(ladder.lwbsRatePct)}%` : `${ED_ACCESS_MEASURE_BENCH.lwbsRatePct}%`,
        baselineTag: lwbsTyped ? "data" : "benchmark",
        defaultTarget: `under ${ED_ACCESS_MEASURE_BENCH.lwbsRateTargetPct}%`,
        fromProof: lwbsFromProof,
      },
      {
        id: "recoverable-pool",
        label: "Recoverable LWBS pool",
        unit: "patients / yr",
        helper: "The patients who leave because charting chokes throughput, the honest ceiling on what this plan can reach. The rest leaves for staffing or beds and stays out.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: ladder.recoverablePool > 0 ? `${fmtInt(ladder.recoverablePool)} / yr` : "set the gate on Align",
        fromProof: false,
      },
      {
        id: "boarding-hours",
        label: "Boarding time",
        unit: "hrs / admit",
        helper: "The hours an admitted patient holds in the ED waiting for an inpatient bed, backing up the front end so more patients leave. Benchmark until you drop in your own median.",
        baseline: `${ED_ACCESS_MEASURE_BENCH.boardingHours} hrs`,
        baselineTag: "benchmark",
        defaultTarget: `under ${ED_ACCESS_MEASURE_BENCH.boardingHoursTarget} hrs`,
        fromProof: boardingFromProof,
      },
    ],
    defaultChosen: boardingFromProof ? ["lwbs-rate", "boarding-hours"] : ["lwbs-rate"],
  };

  // ── Link 4 — recovered visits and captured admissions land (the outcome) ──
  const recoveredSet = ladder.realizedRecovered > 0;
  const admissionsSet = ladder.capturedAdmissions > 0;
  const prizeSet = ladder.prize > 0;
  const recoveredFromProof = proofHas("recovered-visits");
  const admissionsFromProof = proofHas("captured-admissions") || wantsAdmissions;
  const recoveredLink: MeasurementLink = {
    id: "recovered",
    n: 4,
    title: "Recovered visits and admissions are captured",
    teach: "The payoff: patients who would have left but were seen instead, the admissions some of them become, and the contribution margin they carry. This is the number the promise is priced on.",
    blocked: false,
    metrics: [
      {
        id: "recovered-visits",
        label: "Recovered visits per year",
        unit: "visits / yr",
        helper: "Left-without-being-seen visits actually brought back, the smaller of the recoverable pool and what the freed time affords.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: honestZero ? "an honest zero here" : recoveredSet ? `${fmtInt(ladder.realizedRecovered)} / yr` : "finish the Align chain",
        fromProof: recoveredFromProof,
      },
      {
        id: "captured-admissions",
        label: "Captured admissions per year",
        unit: "admissions / yr",
        helper: "Recovered patients who needed admitting and were admitted, capped by bed and payer availability.",
        baseline: "0 today",
        baselineTag: "data",
        defaultTarget: honestZero
          ? "an honest zero here"
          : !wantsAdmissions
            ? "add admissions on Align"
            : admissionsSet
              ? `${fmtInt(ladder.capturedAdmissions)} / yr`
              : "finish the Align chain",
        fromProof: admissionsFromProof,
      },
      {
        id: "recovered-margin",
        label: "Recovered margin per year",
        unit: "contribution margin / yr",
        helper: "The recovered visits and captured admissions priced at contribution margin, never gross charges. This is the CFO number.",
        baseline: "$0 today",
        baselineTag: "data",
        defaultTarget: honestZero ? "an honest zero here" : prizeSet ? `${fmtMoneyCompact(ladder.prize)} / yr` : "finish the Align chain",
        fromProof: false,
      },
    ],
    defaultChosen: [],
  };
  const recoveredProofChosen = recoveredLink.metrics.filter((m) => m.fromProof).map((m) => m.id);
  recoveredLink.defaultChosen = recoveredProofChosen.length > 0 ? recoveredProofChosen : ["recovered-visits"];

  return {
    ready,
    emptyHint,
    links: [throughputLink, doorLink, lwbsLink, recoveredLink],
    gate,
    outcome: outcomes[0],
    realizedVisits: ladder.realizedRecovered,
    prize: ladder.prize,
    commitment: {
      title: "The one thing this plan depends on",
      teach:
        "Freed documentation time only recovers a patient if it actually shortens the walk from the door to a provider. If the minutes quietly refill with other work, the charting comes off but the door stays slow and no patient is recovered. Someone in ED operations has to own directing that freed time to faster triage-to-provider flow.",
      ownerLabel: "Who owns directing the freed time to faster throughput",
    },
    monthlyCheckTeach:
      "Walk the chain in order. The minutes free first, the recovered visits and captured admissions land last, so early links should turn before the later ones. Attainment is not a number you assert. It is whether each metric moved toward its target on the schedule you set.",
  };
}
