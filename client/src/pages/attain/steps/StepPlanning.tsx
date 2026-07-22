import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeAccessChain } from "@/lib/attain/attainAccess";
import { computeEdAccessChain } from "@/lib/attain/attainEdAccess";
import { computeWorkforceChain } from "@/lib/attain/attainWorkforce";
import { DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
import {
  computeRevenueChain,
  deriveRevenueLadder,
  selectedPaths,
  type RevenuePathId,
} from "@/lib/attain/attainRevenue";
import {
  computeIpRevenueChain,
  deriveIpRevenueLadder,
  selectedIpRevenuePaths,
  type IpRevenuePathId,
} from "@/lib/attain/attainInpatientRevenue";
import {
  computeQualityChain,
  deriveQualityLadder,
  selectedEventTypes,
  QUALITY_EVENT_LABELS,
  type QualityEventId,
  type QualityEventLadder,
} from "@/lib/attain/attainQuality";
import { computeCapacityChain } from "@/lib/attain/attainCapacity";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  PLAN_PHASE_IDS,
  phaseBoundaries,
  phaseValueRamp,
  phaseOwner as resolvePhaseOwner,
  phaseSignalTarget as resolvePhaseSignalTarget,
  type AttainPlanning,
  type PlanPhaseId,
} from "@/lib/attain/attainPlanning";
import { CADENCE_OPTIONS, CADENCE_LABEL, type GoalOwner, type SignalCadence } from "./StepCommit";
import {
  fmtInt,
  fmtHours,
  fmtHoursShort,
  fmtDepartures,
  fmtMoneyCompact,
  fmtRevenueCount,
  deriveAccessLadder,
  deriveRetentionLadder,
  deriveEdAccessLadder,
  SpineRung,
  CapacityDemandGate,
  BurnoutPoolGate,
  RevenuePathGate,
  EdAccessDiagnosisGate,
  QualityEventGate,
  NursingCapacityGate,
  deriveNursingCapacityLadder,
  ED_ACCESS_WHO_ACTS,
  retentionUnitNoun,
  retentionChartingTerm,
} from "./accessLadder";
import { NURSING_CAPACITY_WHO_ACTS } from "@/lib/attain/attainCapacity";

/** The two goals Planning renders as the shared step-down ladder on the hook.
 * Outpatient access is the locked exemplar; outpatient retention is the
 * second, built from the same abstraction so the two cannot diverge. Every
 * other setting/goal still renders the original StepCommit. */
export type PlanningGoal = "access" | "retention" | "revenue" | "quality" | "capacity";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

interface StepPlanningProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  /** Which goal is on the hook. Access is the exemplar; retention reuses the
   * same shell via the shared retention ladder. */
  goal: PlanningGoal;
  /** This goal's own lever values. */
  values: LeverValues;
  /** The combined engine result, used only for this priority's realization-
   * applied prize and realized COUNT (`byGoal[goal]`). Every other rung comes
   * straight off the raw chain below. */
  combined: MultiGoalContributionsResult | null;
  goalOwner: GoalOwner;
  onChangeGoalOwner: (patch: Partial<GoalOwner>) => void;
  planning: AttainPlanning;
  onChangePhaseOwner: (phase: PlanPhaseId, name: string) => void;
  onChangePhaseSignalTarget: (phase: PlanPhaseId, target: string) => void;
  onChangePartnerRisk: (text: string) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  /** The plan horizon in months. The target month and the three phase
   * boundaries are all derived from this. */
  totalMonths: number;
  stepNumber: number;
}

/** Small uppercase field label, matched to StepCommit's own `Field`. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{children}</p>;
}

interface PhaseMeta {
  label: string;
  intent: string;
  signalLabel: string;
}

const PHASE_META_ACCESS: Record<PlanPhaseId, PhaseMeta> = {
  start: {
    label: "Start",
    intent: "Start small. One line first, and prove the minutes are real before anything scales.",
    signalLabel: "Minutes saved per note",
  },
  expand: {
    label: "Expand",
    intent: "The signal held. Widen the scope and watch the wait start to fall.",
    signalLabel: "Third-next-available dropping",
  },
  steady: {
    label: "Steady",
    intent: "Full scope. The goal is attained and the number is holding.",
    signalLabel: "Realized visits per year",
  },
};

/** Retention phase metadata, built per setting so the phase-1 leading signal
 * and intent name the right charting lever (nurses: post-shift; providers:
 * after-hours). The later phases are the same in every setting. */
function phaseMetaRetention(chartingTerm: string): Record<PlanPhaseId, PhaseMeta> {
  const Charting = chartingTerm.charAt(0).toUpperCase() + chartingTerm.slice(1);
  return {
    start: {
      label: "Start",
      intent: `Start with one department. Prove the minutes are real and ${chartingTerm} actually falls before anything scales.`,
      signalLabel: `${Charting} time, falling`,
    },
    expand: {
      label: "Expand",
      intent: "The relief held. Widen the scope, and watch the burnout assessment improve and likelihood-to-stay rise.",
      signalLabel: "Burnout assessment score, improving",
    },
    steady: {
      label: "Steady",
      intent: "Full scope. The relief is protected, and voluntary turnover is holding lower.",
      signalLabel: "Voluntary turnover, falling",
    },
  };
}

const PHASE_META_ED_ACCESS: Record<PlanPhaseId, PhaseMeta> = {
  start: {
    label: "Start",
    intent: "Start on one shift pattern. Prove the minutes are real and door-to-provider actually drops before anything scales.",
    signalLabel: "Door-to-provider time, falling",
  },
  expand: {
    label: "Expand",
    intent: "The freed time held and throughput moved. Widen the coverage, and watch the LWBS rate start to fall.",
    signalLabel: "LWBS rate, falling",
  },
  steady: {
    label: "Steady",
    intent: "Full coverage. The recovered visits and the admissions they become are landing and holding.",
    signalLabel: "Recovered visits per year",
  },
};

/** Nursing capacity (overtime) phases. Phase 1 opens on the first domino
 * (after-shift charting / overtime hours per nurse falling); later phases move
 * down toward on-time shift completion, the outcome the freed minute is
 * supposed to buy. The metric menu is the spec's: overtime hours per nurse,
 * share of overtime that is documentation-attributable, on-time shift
 * completion, missed-lunch rate. */
const PHASE_META_CAPACITY: Record<PlanPhaseId, PhaseMeta> = {
  start: {
    label: "Start",
    intent: "Start on one unit. Prove after-shift charting is falling and overtime per nurse is coming down before anything scales.",
    signalLabel: "Overtime hours per nurse per week, falling",
  },
  expand: {
    label: "Expand",
    intent: "The overtime moved. Widen to more units, and hold the documentation-attributable share separate from staffing and census.",
    signalLabel: "Share of overtime that is documentation-attributable, falling",
  },
  steady: {
    label: "Steady",
    intent: "Full scope. The freed minute is closing the shift on time and the overtime is holding lower.",
    signalLabel: "On-time shift completion %, rising",
  },
};

/** Real, trackable leading signals per revenue path (the spec's metric
 * menu). Phase 1 opens on the documentation-completeness signal (closest to
 * the first domino); later phases move down toward the outcome metric. */
const REVENUE_PATH_PHASE_SIGNALS: Record<RevenuePathId, [string, string, string]> = {
  em: [
    "% of visits coded below the supported level, falling",
    "Average level of service, rising",
    "wRVUs per provider vs baseline",
  ],
  hcc: [
    "Suspected-condition close rate, rising",
    "Recapture rate on the risk gap, rising",
    "Average conditions per patient (RAF), rising",
  ],
  denials: [
    "Documentation-related denial share, falling",
    "Medical-necessity denial rate, falling",
    "Appeal overturn rate, holding",
  ],
};

/** Paths ranked by how clearly their leak is documentation-caused, so the
 * phased plan can start with the most defensible one (E/M, where the claim
 * plainly goes out below the care delivered), then denials, then risk
 * adjustment. */
const REVENUE_DOC_CAUSED_ORDER: RevenuePathId[] = ["em", "denials", "hcc"];

const REVENUE_PATH_SHORT: Record<RevenuePathId, string> = {
  em: "E/M level accuracy",
  hcc: "risk adjustment",
  denials: "medical-necessity denials",
};

/** Real, trackable leading signals per INPATIENT revenue path (the spec's
 * metric menu). Phase 1 opens on the signal closest to the documentation lever;
 * later phases move down toward the outcome metric. */
const IP_REVENUE_PATH_PHASE_SIGNALS: Record<IpRevenuePathId, [string, string, string]> = {
  drg: [
    "Query turnaround before discharge, falling",
    "CC/MCC capture rate, rising",
    "Case mix index vs baseline, rising",
  ],
  cdi: [
    "Share of queries that were avoidable, falling",
    "CDI query volume per 100 admissions, falling",
    "CDI review hours per case, falling",
  ],
  obs: [
    "Observation rate, falling",
    "Status-denial overturn rate, rising",
    "Inpatient status upheld on audit, holding",
  ],
};

/** Inpatient revenue paths ranked by how clearly their leak is
 * documentation-caused, so the phased plan starts with the most defensible one:
 * DRG capture (a CC/MCC clinically present but not documented specifically
 * enough is plainly the note), then CDI efficiency, then observation defense. */
const IP_REVENUE_DOC_CAUSED_ORDER: IpRevenuePathId[] = ["drg", "cdi", "obs"];

const IP_REVENUE_PATH_SHORT: Record<IpRevenuePathId, string> = {
  drg: "DRG capture",
  cdi: "CDI efficiency",
  obs: "observation-status defense",
};

/** Real, trackable leading signals per harm event (the spec's metric menu:
 * event rate per 1,000, bundle/intervention compliance %, real-time gap
 * closure %). Phase 1 opens on the process signal closest to the first
 * domino (risk documentation driving bundle compliance); later phases move
 * down toward the event-rate outcome. */
const QUALITY_EVENT_PHASE_SIGNALS: Record<QualityEventId, [string, string, string]> = {
  falls: [
    "Rounding compliance %, rising",
    "Real-time fall-risk gap closure %, rising",
    "Fall rate per 1,000 patient-days, falling",
  ],
  hapi: [
    "Repositioning compliance %, rising",
    "Shift skin-assessment completion %, rising",
    "HAPI rate per 1,000 patient-days, falling",
  ],
  clabsi: [
    "Share of lines reviewed daily for necessity, rising",
    "Insertion-bundle compliance %, rising",
    "CLABSI per 1,000 line-days, falling",
  ],
  cauti: [
    "Share of catheters reviewed daily, rising",
    "Aseptic-insertion compliance %, rising",
    "CAUTI per 1,000 catheter-days, falling",
  ],
  sepsis: [
    "SEP-1 bundle compliance %, rising",
    "Early-warning screening rate %, rising",
    "Median time-to-antibiotics, falling",
  ],
};

/** Harm events ranked by how defensibly their prevention is
 * documentation-attributable, so the phased plan starts on the event where
 * earlier risk surfacing most clearly drives prevention (Sepsis and CLABSI,
 * pure timeliness / bundle-compliance mechanisms), then the bedside-routine
 * events. */
const QUALITY_DOC_CAUSED_ORDER: QualityEventId[] = ["sepsis", "clabsi", "cauti", "hapi", "falls"];

const QUALITY_EVENT_SHORT: Record<QualityEventId, string> = {
  falls: "falls",
  hapi: "pressure injury (HAPI)",
  clabsi: "line infection (CLABSI)",
  cauti: "catheter infection (CAUTI)",
  sepsis: "sepsis",
};

export default function StepPlanning({
  setting,
  baseline,
  goal,
  values,
  combined,
  goalOwner,
  onChangeGoalOwner,
  planning,
  onChangePhaseOwner,
  onChangePhaseSignalTarget,
  onChangePartnerRisk,
  planCadence,
  onChangePlanCadence,
  totalMonths,
  stepNumber,
}: StepPlanningProps) {
  const goalDef = GOAL_CATALOG[goal as GoalId];
  const isRetention = goal === "retention";
  const isRevenue = goal === "revenue";
  // Inpatient revenue rides the same converging revenue ladder shape as
  // outpatient/ED revenue, on its own genuinely different mechanisms (DRG
  // capture, CDI query efficiency, observation-status defense). Everything the
  // revenue branch below reads is normalized so the one block serves both.
  const isIpRevenue = isRevenue && setting === "inpatient";
  const isQuality = goal === "quality";
  const isCapacity = goal === "capacity";
  // ED access is a variant of the access goal at the ED setting: a genuinely
  // different LWBS-recovery + diagnosis mechanism, so it reads from its own
  // shared ladder (deriveEdAccessLadder) rather than the outpatient scheduling
  // ladder. Every other access plan stays on the outpatient exemplar below.
  const isEdAccess = goal === "access" && setting === "ed";
  // Retention is setting-aware: nursing counts NURSES/FTEs, physician settings
  // count PROVIDERS, and the concrete lever is worded for who does the charting
  // (nurses: post-shift; providers/hospitalists: after-hours). Shared with
  // Build the case so the two surfaces never disagree on the unit word.
  const retentionUnits = retentionUnitNoun(setting);
  const retentionCharting = retentionChartingTerm(setting);

  const targetMonth = totalMonths > 0 ? Math.round(totalMonths) : 9;
  const ownerName = goalOwner.name.trim();
  const partnerRisk = planning.partnerRisk ?? "";

  // ── ACCESS ladder (the exemplar) ──────────────────────────────────────
  // Every operational rung comes off the raw access chain (a real, honest
  // capacity/demand number); only the realized COUNT and the dollar PRIZE
  // read from the combined result, so they reflect this priority's
  // realization the same way every other surface does.
  const accessChain = computeAccessChain(baseline, values, 1);
  const accessResult = combined?.byGoal.access;
  const accessLadder = deriveAccessLadder(accessChain, {
    realizedVisits: accessResult?.totalCount ?? accessChain.payoff.realizedVisits,
    prize: accessResult?.totalMargin ?? 0,
  });

  // ── ED ACCESS ladder ──────────────────────────────────────────────────
  // Same discipline: operational rungs off the raw ED chain (mechanical
  // freed-time capacity, the LWBS pool, the diagnosis, the recoverable pool),
  // with the realized COUNTS read off the raw chain (so Planning matches Build
  // exactly, avoiding the whole-number rounding collapse the combined result
  // would introduce at a single-department scale) and only the dollar PRIZE
  // off the combined result, to pick up this priority's realization exactly as
  // Build does.
  const edAccessChain = isEdAccess ? computeEdAccessChain(baseline, values, 1) : null;
  const edAccessLadder = edAccessChain
    ? deriveEdAccessLadder(edAccessChain, {
        realizedRecovered: edAccessChain.recovery.realizedRecovered,
        capturedAdmissions: edAccessChain.recovery.capturedAdmissions,
        prize: accessResult?.totalMargin ?? edAccessChain.payoff.value,
      })
    : null;

  // ── RETENTION ladder ──────────────────────────────────────────────────
  // Same discipline: operational rungs off the raw workforce chain, the
  // departures-avoided COUNT and the dollar PRIZE off the combined result.
  // Retention-only, so no cross-goal split (multiplier 1).
  const minutes = asNum(values.retentionMinutesSaved) > 0 ? asNum(values.retentionMinutesSaved) : DEFAULT_MINUTES_SAVED_PER_NOTE;
  const workforceChain = computeWorkforceChain(baseline, setting, values, 1);
  const retentionResult = combined?.byGoal.retention;
  const retentionLadder = deriveRetentionLadder(workforceChain, setting, baseline, {
    minutes,
    // The COUNT reads off the raw chain, not the combined result, so it stays
    // identical to Build the case (whose live chain shows the same unrounded
    // figure). The combined totalCount is rounded to a whole person, which at a
    // single-department scale collapses a real 0.1 departures/yr to 0 and would
    // make Planning disagree with Build. Retention Planning is always a single
    // goal, so no cross-goal split applies (multiplier 1); only the PRIZE reads
    // from combined, to pick up this priority's realization exactly as Build does.
    departuresAvoided: workforceChain.payoff.departuresAvoided,
    prize: retentionResult?.totalMargin ?? workforceChain.payoff.value,
  });

  // ── REVENUE ladder ────────────────────────────────────────────────────
  // Revenue has a different SHAPE: one lever (complete documentation) feeding
  // several parallel paths that converge into one prize. The per-path dollars
  // are scaled by the realization factor implied by the combined engine result
  // (revenueRealized / revenueRaw), so Planning's per-path dollars and the
  // converged prize match Build the case exactly.
  const revenueRaw = !isRevenue
    ? 0
    : isIpRevenue
    ? computeIpRevenueChain(baseline, values).totalValue
    : computeRevenueChain(baseline, setting, values).totalValue;
  const revenueRealized = combined?.byGoal.revenue?.totalMargin ?? revenueRaw;
  const revenueRealizationPct = revenueRaw > 0 ? (revenueRealized / revenueRaw) * 100 : 100;
  const revenueLadder = isIpRevenue
    ? deriveIpRevenueLadder(baseline, values, revenueRealizationPct)
    : deriveRevenueLadder(baseline, setting, values, revenueRealizationPct);
  const revenuePathsSel = isIpRevenue ? [] : selectedPaths(values).filter((p) => setting !== "ed" || p !== "hcc");
  const ipRevenuePathsSel = isIpRevenue ? selectedIpRevenuePaths(values) : [];

  // ── QUALITY ladder ──────────────────────────────────────────────────────
  // Same SHAPE as revenue: one shared lever (earlier risk documentation)
  // feeding several parallel per-event sub-ladders that converge into one
  // prevented-harm prize. The per-event dollars are scaled by the realization
  // factor implied by the combined engine result (qualityRealized /
  // qualityRaw), so Planning's per-event dollars and the converged prize match
  // Build the case exactly.
  const qualityRaw = isQuality ? computeQualityChain(baseline, values).payoff.totalValue : 0;
  const qualityRealized = combined?.byGoal.quality?.totalMargin ?? qualityRaw;
  const qualityRealizationPct = qualityRaw > 0 ? (qualityRealized / qualityRaw) * 100 : 100;
  const qualityLadder = deriveQualityLadder(baseline, values, qualityRealizationPct);
  const qualityEventsSel = selectedEventTypes(values);

  // ── CAPACITY ladder (nursing overtime) ────────────────────────────────
  // A single gated ladder like access: operational rungs off the raw capacity
  // chain (the overtime pool, the documentation-attributable ceiling, the
  // realized hours avoided), with the realized COUNT read off the raw chain so
  // Planning matches Build exactly, and only the dollar PRIZE off the combined
  // result to pick up this priority's realization.
  const capacityChain = isCapacity ? computeCapacityChain(baseline, values) : null;
  const capacityResult = combined?.byGoal.capacity;
  const capacityLadder = capacityChain
    ? deriveNursingCapacityLadder(capacityChain, {
        realizedOtHoursAvoided: capacityChain.realizedOtHoursAvoided,
        prize: capacityResult?.totalMargin ?? capacityChain.prize,
      })
    : null;
  const orderedQualityEvents = QUALITY_DOC_CAUSED_ORDER.filter((e) => qualityEventsSel.includes(e));
  const primaryQualityEvent: QualityEventId = orderedQualityEvents[0] ?? "clabsi";
  const qualityPhaseSignals = QUALITY_EVENT_PHASE_SIGNALS[primaryQualityEvent];

  // The prize + the first-domino minutes are shared framing across the
  // minutes-based goals (access and retention both open on minutes saved per
  // note). Revenue opens on the documentation lever instead.
  const prize = isEdAccess
    ? edAccessLadder!.prize
    : isRevenue
    ? revenueLadder.convergedPrize
    : isQuality
    ? qualityLadder.convergedPrize
    : isCapacity
    ? capacityLadder!.prize
    : isRetention
    ? retentionLadder.prize
    : accessLadder.prize;
  const firstDominoMinutes = isEdAccess ? edAccessLadder!.minutes : isRetention ? retentionLadder.minutes : accessLadder.minutes;

  const boundaries = phaseBoundaries(targetMonth);
  const ramp = phaseValueRamp(prize);

  // Revenue paths ordered most-documentation-caused first, so the phased plan
  // starts on the path whose leak is clearest (E/M), then widens.
  const orderedRevenuePaths = REVENUE_DOC_CAUSED_ORDER.filter((p) => revenuePathsSel.includes(p));
  const orderedIpRevenuePaths = IP_REVENUE_DOC_CAUSED_ORDER.filter((p) => ipRevenuePathsSel.includes(p));
  const primaryRevenuePath: RevenuePathId = orderedRevenuePaths[0] ?? "em";
  const primaryIpRevenuePath: IpRevenuePathId = orderedIpRevenuePaths[0] ?? "drg";
  // Normalized, setting-agnostic scaffolding so the one revenue phase block
  // reads the same whether the paths are outpatient/ED or inpatient.
  const orderedRevenueShort: string[] = isIpRevenue
    ? orderedIpRevenuePaths.map((p) => IP_REVENUE_PATH_SHORT[p])
    : orderedRevenuePaths.map((p) => REVENUE_PATH_SHORT[p]);
  const primaryRevenueShort = isIpRevenue ? IP_REVENUE_PATH_SHORT[primaryIpRevenuePath] : REVENUE_PATH_SHORT[primaryRevenuePath];
  const revenuePhaseSignals = isIpRevenue
    ? IP_REVENUE_PATH_PHASE_SIGNALS[primaryIpRevenuePath]
    : REVENUE_PATH_PHASE_SIGNALS[primaryRevenuePath];
  const PHASE_META_REVENUE: Record<PlanPhaseId, PhaseMeta> = {
    start: {
      label: "Start",
      intent: `Start with ${primaryRevenueShort}, the path whose leak is most clearly the documentation. Prove complete notes actually move the capture before anything widens.`,
      signalLabel: revenuePhaseSignals[0],
    },
    expand: {
      label: "Expand",
      intent:
        orderedRevenueShort.length > 1
          ? "The first path held. Widen to the other revenue paths you picked and watch the capture rate rise."
          : "The signal held. Widen the scope across more of the service and watch the capture rate rise.",
      signalLabel: revenuePhaseSignals[1],
    },
    steady: {
      label: "Steady",
      intent: "Full scope across every path. The captured revenue is landing on the claim and holding.",
      signalLabel: revenuePhaseSignals[2],
    },
  };

  const PHASE_META_QUALITY: Record<PlanPhaseId, PhaseMeta> = {
    start: {
      label: "Start",
      intent: `Start with ${QUALITY_EVENT_SHORT[primaryQualityEvent]}, the event whose prevention is most defensibly the documentation. Prove earlier risk surfacing actually moves the bundle compliance before anything widens.`,
      signalLabel: qualityPhaseSignals[0],
    },
    expand: {
      label: "Expand",
      intent:
        orderedQualityEvents.length > 1
          ? "The first event held. Widen to the other harm events you picked and watch their rates start to fall."
          : "The signal held. Widen across more units and watch the rate start to fall.",
      signalLabel: qualityPhaseSignals[1],
    },
    steady: {
      label: "Steady",
      intent: "Full scope across every event. The prevented harm is holding and the rates are lower.",
      signalLabel: qualityPhaseSignals[2],
    },
  };

  // Derived, editable default target per phase's leading signal.
  const accessLines = !accessChain.scope.enterprise ? asLines(values.accessLines) : [];
  const retentionLines = asLines(values.retentionLines);
  const retentionProviders = retentionLadder.providersInScope;
  const capacityLines = asLines(values.capacityLines);

  const signalDefault: Record<PlanPhaseId, string> = isEdAccess
    ? {
        start: `${fmtInt(edAccessLadder!.minutes)} min per note`,
        expand: "under 35 min",
        steady:
          edAccessLadder!.realizedRecovered > 0
            ? `${fmtInt(edAccessLadder!.realizedRecovered)} recovered per year`
            : "the full recovered count",
      }
    : isRevenue
    ? {
        start: "improving vs baseline",
        expand: "improving vs baseline",
        steady: prize > 0 ? `${fmtMoneyCompact(prize)} captured per year` : "the full captured amount",
      }
    : isQuality
    ? {
        start: "improving vs baseline",
        expand: "improving vs baseline",
        steady: prize > 0 ? `${fmtMoneyCompact(prize)} of harm avoided per year` : "the full prevented amount",
      }
    : isCapacity
    ? {
        start:
          capacityLadder!.otHoursPerNurseWeek > 0
            ? `under ${fmtHoursShort(capacityLadder!.otHoursPerNurseWeek)} OT hrs/nurse/wk`
            : "overtime per nurse falling",
        expand: "improving vs baseline",
        steady:
          capacityLadder!.realizedOtHoursAvoided > 0
            ? `${fmtInt(capacityLadder!.realizedOtHoursAvoided)} overtime hrs avoided per year`
            : "overtime holding lower",
      }
    : isRetention
    ? {
        start: `${fmtInt(minutes)} min saved per note`,
        expand: "improving vs baseline",
        steady:
          retentionLadder.departuresAvoided > 0
            ? `${fmtDepartures(retentionLadder.departuresAvoided)} avoided per year`
            : "voluntary turnover holding lower",
      }
    : {
        start: `${fmtInt(accessLadder.minutes)} min per note`,
        expand: "under 14 days",
        steady: accessLadder.realizedVisits > 0 ? `${fmtInt(accessLadder.realizedVisits)} per year` : "the full realized count",
      };

  const edAccessProviders = edAccessLadder?.providersInScope ?? 0;
  const phaseScope: Record<PlanPhaseId, string> = isEdAccess
    ? {
        start: "One shift pattern first",
        expand:
          edAccessProviders > 0 ? `Widen across the ${fmtInt(edAccessProviders)} ED providers` : "Widen the ED coverage",
        steady: edAccessProviders > 0 ? `All ${fmtInt(edAccessProviders)} ED providers` : "Full ED coverage",
      }
    : isRevenue
    ? {
        start: orderedRevenueShort.length > 0 ? `${primaryRevenueShort} first` : "A first revenue path",
        expand:
          orderedRevenueShort.length > 1
            ? `Add ${orderedRevenueShort.slice(1).join(", ")}`
            : "Widen to more of the service",
        steady:
          orderedRevenueShort.length > 0
            ? `All paths: ${orderedRevenueShort.join(", ")}`
            : "Full scope",
      }
    : isQuality
    ? {
        start: orderedQualityEvents.length > 0 ? `${QUALITY_EVENT_SHORT[primaryQualityEvent]} first` : "A first harm event",
        expand:
          orderedQualityEvents.length > 1
            ? `Add ${orderedQualityEvents.slice(1).map((e) => QUALITY_EVENT_SHORT[e]).join(", ")}`
            : "Widen to more units",
        steady:
          orderedQualityEvents.length > 0
            ? `All events: ${orderedQualityEvents.map((e) => QUALITY_EVENT_SHORT[e]).join(", ")}`
            : "Full scope",
      }
    : isCapacity
    ? {
        start:
          capacityLines.length > 0
            ? `${capacityLines[0]} first`
            : capacityLadder!.nursesInScope > 0
              ? `A first cohort of the ${fmtInt(capacityLadder!.nursesInScope)} nurses`
              : "A first unit",
        expand:
          capacityLines.length > 1
            ? `Add ${capacityLines.slice(1).join(", ")}`
            : capacityLines.length === 1
              ? `Widen beyond ${capacityLines[0]}`
              : capacityLadder!.nursesInScope > 0
                ? `Widen to more of the ${fmtInt(capacityLadder!.nursesInScope)} nurses`
                : "Widen the scope",
        steady:
          capacityLines.length > 0
            ? `All units: ${capacityLines.join(", ")}`
            : capacityLadder!.nursesInScope > 0
              ? `All ${fmtInt(capacityLadder!.nursesInScope)} nurses`
              : "Full scope",
      }
    : isRetention
    ? {
        start:
          retentionLines.length > 0
            ? `${retentionLines[0]} first`
            : retentionProviders > 0
              ? `A first cohort of the ${fmtInt(retentionProviders)} ${retentionUnits.plural}`
              : "A first department",
        expand:
          retentionLines.length > 1
            ? `Add ${retentionLines.slice(1).join(", ")}`
            : retentionLines.length === 1
              ? `Widen beyond ${retentionLines[0]}`
              : retentionProviders > 0
                ? `Widen to more of the ${fmtInt(retentionProviders)} ${retentionUnits.plural}`
                : "Widen the scope",
        steady:
          retentionLines.length > 0
            ? `All departments: ${retentionLines.join(", ")}`
            : retentionProviders > 0
              ? `All ${fmtInt(retentionProviders)} ${retentionUnits.plural}`
              : "Full scope",
      }
    : {
        start:
          accessLines.length > 0
            ? `${accessLines[0]} first`
            : accessLadder.providersInScope > 0
              ? `A first cohort of the ${fmtInt(accessLadder.providersInScope)} providers`
              : "A first service line",
        expand:
          accessLines.length > 1
            ? `Add ${accessLines.slice(1).join(", ")}`
            : accessLines.length === 1
              ? `Widen beyond ${accessLines[0]}`
              : accessLadder.providersInScope > 0
                ? `Widen to more of the ${fmtInt(accessLadder.providersInScope)} providers`
                : "Widen the scope",
        steady:
          accessLines.length > 0
            ? `All lines: ${accessLines.join(", ")}`
            : accessLadder.providersInScope > 0
              ? `All ${fmtInt(accessLadder.providersInScope)} providers`
              : "Full scope",
      };

  const PHASE_META = isEdAccess
    ? PHASE_META_ED_ACCESS
    : isRevenue
    ? PHASE_META_REVENUE
    : isQuality
    ? PHASE_META_QUALITY
    : isCapacity
    ? PHASE_META_CAPACITY
    : isRetention
    ? phaseMetaRetention(retentionCharting)
    : PHASE_META_ACCESS;

  const teach = isEdAccess
    ? "One number does the work here: the minutes saved per note. Freed charting time buys a faster door-to-provider, and only the LWBS your charting delays cause is yours to recover. Below is the promise, the chain of logic under it, and the phased plan that gets there."
    : isRevenue
    ? "One lever does the work here: complete, specific documentation at the point of care. It feeds several revenue paths, and for each one the documentation is the ceiling on what you can capture. Below is the promise, the paths that converge under it, and the phased plan that gets there."
    : isQuality
    ? "One lever does the work here: earlier, more complete risk documentation at the point of care. Abridge surfaces the risk, the unit runs the bundle and prevents. It feeds several harm events, and for each one only a defensible share is preventable. Below is the promise, the events that converge under it, and the phased plan that gets there."
    : isCapacity
    ? "One number does the work here: the minutes saved per note, so nurses chart in the moment instead of after the shift. That closes the shift on time and takes out the overtime charting caused. Only the documentation-driven share is yours to cut. Below is the promise, the chain of logic under it, and the phased plan that gets there."
    : isRetention
    ? `You want lower voluntary turnover and a better clinician experience. It starts on one number: the minutes saved per note. That freed time, kept as relief, comes off ${retentionCharting}, and each rung below multiplies on top of it toward the departures you avoid and the dollar that saves. Below is the promise, the chain of logic under it, and the phased plan that gets there.`
    : "One number does the work here: the minutes saved per note. It is the first domino. Freed hours, new capacity, realized visits, and the dollar prize are all multiplication on top of it. Below is the promise, the chain of logic under it, and the phased plan that gets there.";

  const spineIntro = isEdAccess
    ? "Read it top to bottom. The first rungs multiply: minutes saved become freed hours, and the hours you commit to throughput become recovery capacity. Then the diagnosis is the ceiling, only the LWBS your charting delays cause is yours to recover, and what converts becomes recovered visits, admissions, and dollars."
    : isRevenue
    ? "Read it top to bottom. Complete documentation is the one lever every path shares. For each path, the documentation-caused leak is the ceiling that decides how much you can capture, and what converts becomes dollars. The paths add into one prize."
    : isQuality
    ? "Read it top to bottom. Earlier risk documentation is the one lever every event shares. For each event, only a defensible share is preventable, the honest ceiling, and the bundle you commit to earns a slice of it. The events add into one prize; part of the value is the safety itself, which does not price."
    : isCapacity
    ? "Read it top to bottom. Charting in the moment closes the shift on time. Your overtime now is the pool, then the documentation-attributable share is the ceiling on what charting can move, and the share you remove becomes overtime hours avoided and dollars. Overtime from staffing or census stays out of the number."
    : isRetention
    ? `Read it top to bottom. The first rungs multiply: minutes saved become freed hours, and the hours you keep as relief come off ${retentionCharting}. Then burnout is the ceiling that decides how many of your departures you can actually avoid, and those avoided departures become dollars.`
    : "Read it top to bottom. The first rungs multiply: minutes saved become freed hours, and the freed hours you direct to access become new capacity. Then demand is the ceiling that decides how much of that capacity actually converts to visits, and those visits become dollars.";

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · The plan to attain it
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Planning
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          {teach}
        </p>
      </motion.div>

      {/* 1 — The line of truth. The goal, the exec owner, the full prize, and
          the month it is due, read as one promise on the hook. */}
      <div className="rounded-2xl border border-[#E7E0D6] bg-[#F4F0EA] p-6 mb-8" data-testid="card-planning-promise">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
            style={{ background: goalDef.pillBg }}
          >
            {goalDef.pill}
          </span>
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">The promise</p>
        </div>
        <p className="text-lg md:text-[22px] leading-snug text-[#1A1A1A] font-semibold" data-testid="text-planning-promise-line">
          {isRetention ? "Lower voluntary turnover, better clinician experience" : isEdAccess ? "ED Access" : goalDef.label}
          <span className="text-[#B4B4B4] font-normal"> · </span>
          Owned by {ownerName ? <span>{ownerName}</span> : <span className="text-[#EA2C00]">name the exec below</span>}
          <span className="text-[#B4B4B4] font-normal"> · </span>
          {prize > 0 ? (
            <span className="text-[#EA2C00]" data-testid="text-planning-promise-prize">{fmtMoneyCompact(prize)}</span>
          ) : (
            <span className="text-[#8C8C8C]">value pending</span>
          )}{" "}
          by month {targetMonth}
        </p>

        <div className="mt-4 pt-4 border-t border-[#E0D9CE]">
          <FieldLabel>Exec owner (who answers for whether this lands)</FieldLabel>
          <div className="flex flex-wrap gap-3">
            <input
              value={goalOwner.name}
              onChange={(e) => onChangeGoalOwner({ name: e.target.value })}
              placeholder="Name, e.g. Dr. A. Rivera"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-planning-goal-owner-name"
            />
            <input
              value={goalOwner.title}
              onChange={(e) => onChangeGoalOwner({ title: e.target.value })}
              placeholder="Title / role, e.g. VP Ambulatory Ops"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-planning-goal-owner-title"
            />
          </div>
        </div>
      </div>

      {/* 2 — The step-down spine, rooted in minutes per note. Each rung is a
          derived number; the anchor at the top is the one we commit to and
          verify first. */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">
          {isRevenue
            ? `How complete documentation becomes ${prize > 0 ? fmtMoneyCompact(prize) : "the prize"}`
            : isQuality
            ? `How earlier risk documentation becomes ${prize > 0 ? fmtMoneyCompact(prize) : "the prize"}`
            : isCapacity
            ? `How charting in the moment becomes ${prize > 0 ? fmtMoneyCompact(prize) : "the prize"}`
            : `How ${fmtInt(firstDominoMinutes)} minutes per note becomes ${prize > 0 ? fmtMoneyCompact(prize) : "the prize"}`}
        </h2>
        <p className="text-[12px] text-[#8C8C8C] mb-4 max-w-[560px] leading-relaxed">{spineIntro}</p>

        <div className="space-y-2" data-testid="section-planning-spine">
          {isEdAccess ? (
            <>
              <SpineRung
                anchor
                isSet
                value={fmtInt(edAccessLadder!.minutes)}
                unit="min / note"
                label="Minutes saved per note"
                caption="The target we commit to and verify first. Freed charting time is the only thing that mechanically buys a faster door-to-provider here."
                emptyHint=""
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={edAccessLadder!.freedHrsPerProviderWk > 0}
                value={fmtHoursShort(edAccessLadder!.freedHrsPerProviderWk)}
                unit="hrs / provider / wk"
                label="Freed time"
                caption="That time saved, added up across every note a provider writes in a week."
                emptyHint="Set your ED providers on Build the case to see the freed hours."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={edAccessLadder!.mechanicalCapacity > 0}
                value={fmtInt(edAccessLadder!.mechanicalCapacity)}
                unit="patients / yr"
                label="Freed-time capacity"
                caption={`${fmtInt(edAccessLadder!.throughputSharePct)}% of the freed time is committed to throughput, the rest stays as relief, at about ${fmtHoursShort(edAccessLadder!.hoursPerRecovery)} hours of expedited attention per recovered patient.`}
                emptyHint="Commit some freed time to throughput on Build the case to open recovery capacity."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <EdAccessDiagnosisGate
                fullPool={edAccessLadder!.fullPool}
                docCausedSharePct={edAccessLadder!.docCausedSharePct}
                recoverablePool={edAccessLadder!.recoverablePool}
                mechanicalCapacity={edAccessLadder!.mechanicalCapacity}
                realizedRecovered={edAccessLadder!.realizedRecovered}
                binding={edAccessLadder!.binding}
                whoActs={ED_ACCESS_WHO_ACTS}
                bothSet={edAccessLadder!.recoverablePool > 0 && edAccessLadder!.mechanicalCapacity > 0}
                emptyHint={
                  edAccessLadder!.recoverablePool <= 0
                    ? "Diagnose the charting-caused share of your LWBS on Build the case to size the recoverable pool, then commit freed time to throughput."
                    : "Commit some freed time to throughput on Build the case to see how much of the recoverable pool converts."
                }
              />
              {edAccessLadder!.capturedAdmissions > 0 && (
                <>
                  <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
                  <div className="rounded-lg border border-[#E7E0D6] bg-white px-4 py-2.5 flex items-baseline justify-between gap-3">
                    <span className="text-[12px] font-semibold text-[#3A3A3A]">Downstream admissions captured</span>
                    <span className="font-abridge text-xl font-bold text-[#1A1A1A]">
                      {fmtInt(edAccessLadder!.capturedAdmissions)} <span className="text-[11px] font-normal text-[#8C8C8C]">admissions / yr</span>
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                payoff
                isSet={prize > 0}
                value={fmtMoneyCompact(prize)}
                unit="contribution margin / yr"
                label="The prize"
                caption={
                  prize > 0
                    ? `${fmtInt(edAccessLadder!.realizedRecovered)} recovered visits at about $${fmtInt(edAccessLadder!.marginPerVisit)} of margin each, plus ${fmtInt(edAccessLadder!.capturedAdmissions)} captured admissions at about $${fmtInt(edAccessLadder!.admissionMargin)} each. Both legs on margin, never gross revenue.`
                    : "Finish the chain above and the prize appears here."
                }
                emptyHint="The prize appears once the chain above is complete."
              />
            </>
          ) : isRevenue ? (
            <>
              <SpineRung
                anchor
                isSet
                value="1"
                unit="lever, shared by every path"
                label="Complete, specific documentation at the point of care"
                caption="The one thing Abridge moves, and where every revenue path converges. When the note carries the full picture, the claim can reflect the care that was actually delivered."
                emptyHint=""
              />
              {revenueLadder.paths.map((p) => (
                <div key={p.id}>
                  <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
                  <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-2 mt-1">{p.label}</p>
                  <RevenuePathGate
                    ceilingLabel={p.ceilingLabel}
                    ceilingCount={p.ceilingCount}
                    ceilingUnit={p.ceilingUnit}
                    capturedLabel={p.capturedLabel}
                    capturedCount={p.capturedCount}
                    capturedUnit={p.capturedUnit}
                    whoActs={p.whoActs}
                    bothSet={p.ceilingCount > 0 && p.capturedCount > 0}
                    emptyHint="Set this path's ground and diagnosis on Build the case to size the leak, then commit to a share of it."
                  />
                  <div className="mt-2 rounded-lg border border-[#E7E0D6] bg-white px-4 py-2.5 flex items-baseline justify-between gap-3">
                    <span className="text-[12px] font-semibold text-[#3A3A3A]">{p.label} captures</span>
                    {p.hasValue ? (
                      <span className="font-abridge text-xl font-bold text-[#EA2C00]">{fmtMoneyCompact(p.value)} <span className="text-[11px] font-normal text-[#8C8C8C]">/ yr</span></span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#B4B4B4]">Not set yet</span>
                    )}
                  </div>
                </div>
              ))}
              {revenueLadder.paths.length === 0 && (
                <>
                  <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
                  <div className="rounded-lg border border-[#E7E0D6] bg-white p-4">
                    <p className="text-[11px] text-[#8C8C8C] leading-relaxed">Pick at least one revenue path on Build the case to see the ladder.</p>
                  </div>
                </>
              )}
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                payoff
                isSet={prize > 0}
                value={fmtMoneyCompact(prize)}
                unit="captured / yr, all paths"
                label="The converged prize"
                caption={
                  prize > 0
                    ? isIpRevenue
                      ? `${revenueLadder.paths.filter((p) => p.hasValue).length} paths: DRG reimbursement, CDI labor, and status margin are three distinct dollars, summed once and never double-counted.`
                      : `${revenueLadder.paths.filter((p) => p.hasValue).length} paths, each its own claim pool, summed once and never double-counted.`
                    : "Finish a path above and the converged prize appears here."
                }
                emptyHint="The prize appears once at least one path's chain is complete."
              />
            </>
          ) : isQuality ? (
            <>
              <SpineRung
                anchor
                isSet
                value="1"
                unit="lever, shared by every event"
                label="Earlier, more complete risk documentation at the point of care"
                caption="The one thing Abridge moves, and where every harm event converges. Abridge surfaces the risk earlier; the unit runs the bundle and prevents."
                emptyHint=""
              />
              {qualityLadder.events.map((e: QualityEventLadder) => (
                <div key={e.id}>
                  <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
                  <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-2 mt-1">{e.label}</p>
                  <QualityEventGate
                    ceilingLabel={e.ceilingLabel}
                    ceilingCount={e.ceilingCount}
                    ceilingUnit={e.ceilingUnit}
                    capturedLabel={e.capturedLabel}
                    capturedCount={e.capturedCount}
                    capturedUnit={e.capturedUnit}
                    whoActs={e.whoActs}
                    bothSet={e.ceilingCount > 0 && e.capturedCount > 0}
                    emptyHint="Set this event's rate and commit its bundle on Build the case to size the preventable pool and see how much converts."
                  />
                  <div className="mt-2 rounded-lg border border-[#E7E0D6] bg-white px-4 py-2.5 flex items-baseline justify-between gap-3">
                    <span className="text-[12px] font-semibold text-[#3A3A3A]">{e.label}, cost of harm avoided</span>
                    {e.hasValue ? (
                      <span className="font-abridge text-xl font-bold text-[#EA2C00]">{fmtMoneyCompact(e.value)} <span className="text-[11px] font-normal text-[#8C8C8C]">/ yr</span></span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#B4B4B4]">Not set yet</span>
                    )}
                  </div>
                </div>
              ))}
              {qualityLadder.events.length === 0 && (
                <>
                  <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
                  <div className="rounded-lg border border-[#E7E0D6] bg-white p-4">
                    <p className="text-[11px] text-[#8C8C8C] leading-relaxed">Pick at least one harm event on Build the case to see the ladder.</p>
                  </div>
                </>
              )}
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                payoff
                isSet={prize > 0}
                value={fmtMoneyCompact(prize)}
                unit="cost of harm avoided / yr"
                label="The converged prize"
                caption={
                  prize > 0
                    ? `${qualityLadder.events.filter((e) => e.hasValue).length} events, each its own harm pool, summed once and never double-counted. Part of the value is the safety itself, which does not price.`
                    : "Finish an event above and the converged prize appears here."
                }
                emptyHint="The prize appears once at least one event's bundle is committed."
              />
            </>
          ) : isCapacity ? (
            <>
              <SpineRung
                anchor
                isSet
                value="In the moment"
                unit="not after the shift"
                label="Nurses chart in the moment"
                caption="The first domino. Ambient documentation lets the record get done at the point of care, so the shift can close on time and the overtime charting caused does not accrue."
                emptyHint=""
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={capacityLadder!.totalOtHoursYr > 0}
                value={fmtInt(capacityLadder!.totalOtHoursYr)}
                unit="overtime hrs / yr"
                label="The overtime you run now"
                caption={`${fmtInt(capacityLadder!.nursesInScope)} nurses at about ${fmtHoursShort(capacityLadder!.otHoursPerNurseWeek)} overtime hours a week each, across the year. This is the pool, before the diagnosis.`}
                emptyHint="Set your nurses in scope and overtime per nurse on Build the case to size the pool."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <NursingCapacityGate
                totalOtHoursYr={capacityLadder!.totalOtHoursYr}
                docAttributableSharePct={capacityLadder!.docAttributableSharePct}
                docAttributableOtHoursYr={capacityLadder!.docAttributableOtHoursYr}
                realizedOtHoursAvoided={capacityLadder!.realizedOtHoursAvoided}
                whoActs={NURSING_CAPACITY_WHO_ACTS}
                bothSet={capacityLadder!.docAttributableOtHoursYr > 0 && capacityLadder!.realizedOtHoursAvoided > 0}
                emptyHint={
                  capacityLadder!.docAttributableOtHoursYr <= 0
                    ? "Diagnose the documentation-driven share of your overtime on Build the case to size the ceiling, then commit to the share you will remove."
                    : "Commit to the share of that overtime you will remove on Build the case to see how much converts."
                }
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                payoff
                isSet={prize > 0}
                value={fmtMoneyCompact(prize)}
                unit="overtime wages avoided / yr"
                label="The prize"
                caption={
                  prize > 0
                    ? `${fmtInt(capacityLadder!.realizedOtHoursAvoided)} overtime hours avoided at about $${fmtInt(capacityLadder!.otHourlyRate)} each. Wages you stop paying now, counted once, separate from the replacement cost retention books.`
                    : "Finish the chain above and the prize appears here."
                }
                emptyHint="The prize appears once the chain above is complete."
              />
            </>
          ) : isRetention ? (
            <>
              <SpineRung
                anchor
                isSet
                value={fmtInt(retentionLadder.minutes)}
                unit="min / note"
                label="Minutes saved per note"
                caption={`The target we commit to and verify first. The share you keep as relief comes off ${retentionCharting}, the work outside of work that drives burnout.`}
                emptyHint=""
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={retentionLadder.freedHrsPerProviderWk > 0}
                value={fmtHoursShort(retentionLadder.freedHrsPerProviderWk)}
                unit={`hrs / ${retentionUnits.singular} / wk`}
                label="Freed time"
                caption={`That time saved, added up across every note a ${retentionUnits.singular} writes in a week.`}
                emptyHint={`Set your ${retentionUnits.plural} on Build the case to see the freed hours.`}
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={retentionLadder.protectedHrsPerProviderWk > 0}
                value={fmtHoursShort(retentionLadder.protectedHrsPerProviderWk)}
                unit={`hrs / ${retentionUnits.singular} / wk`}
                label="Protected relief"
                caption={`${fmtInt(retentionLadder.protectedSharePct)}% of the freed time stays with the clinician, off ${retentionCharting}. The rest is free to go to the schedule.`}
                emptyHint="Protect some freed time as relief on Build the case."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={retentionLadder.compositeImpactPct > 0}
                value={fmtHoursShort(retentionLadder.compositeImpactPct)}
                unit="% of burnout departures"
                label="Burnout comes down"
                caption={`The protected relief lowers burnout, capped at a reachable ${retentionLadder.impactCeilingPct}% of the burnout-related departures in your pool.`}
                emptyHint="Protect relief and make it hold on Build the case to bring burnout down."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <BurnoutPoolGate
                burnoutPool={retentionLadder.burnoutPool}
                compositeImpactPct={retentionLadder.compositeImpactPct}
                departuresAvoided={retentionLadder.departuresAvoided}
                turnoverRatePct={retentionLadder.turnoverRatePct}
                burnoutSharePct={retentionLadder.burnoutSharePct}
                bothSet={retentionLadder.burnoutPool > 0 && retentionLadder.compositeImpactPct > 0}
                emptyHint={
                  retentionLadder.burnoutPool <= 0
                    ? "Set your scope, turnover, and burnout share on Build the case to size the departure pool, then protect some relief."
                    : "Protect some relief and make it hold on Build the case to capture a slice of this pool."
                }
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                payoff
                isSet={prize > 0}
                value={fmtMoneyCompact(prize)}
                unit="replacement cost saved / yr"
                label="The prize"
                caption={
                  prize > 0
                    ? `${fmtDepartures(retentionLadder.departuresAvoided)} departures avoided at about $${fmtInt(retentionLadder.replacementCost)} each.`
                    : "Finish the chain above and the prize appears here."
                }
                emptyHint="The prize appears once the chain above is complete."
              />
            </>
          ) : (
            <>
              <SpineRung
                anchor
                isSet
                value={fmtInt(accessLadder.minutes)}
                unit="min / note"
                label="Minutes saved per note"
                caption="The target we commit to and verify first. The partner does not know it yet, so this is the anchor we prove before scaling."
                emptyHint=""
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={accessLadder.freedHrsPerProviderWk > 0}
                value={fmtHours(accessLadder.freedHrsPerProviderWk)}
                unit="hrs / provider / wk"
                label="Freed time"
                caption="That time saved, added up across every note a provider writes in a week."
                emptyHint="Set your providers and encounters on Starting point to see the freed hours."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={accessLadder.capacityVisits > 0}
                value={fmtInt(accessLadder.capacityVisits)}
                unit="visits / yr"
                label="New capacity"
                caption={`${fmtInt(accessLadder.directedSharePct)}% of the freed time is directed to access, the rest stays as relief, at about ${fmtInt(accessLadder.visitLen)} minutes a visit.`}
                emptyHint="Direct some freed time to access on Build the case to open capacity."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <CapacityDemandGate
                capacityVisits={accessLadder.capacityVisits}
                demandCeiling={accessLadder.demandCeiling}
                realizedVisits={accessLadder.realizedVisits}
                binding={accessLadder.binding}
                bothSet={accessLadder.capacityVisits > 0 && accessLadder.demandCeiling > 0}
                emptyHint={
                  accessLadder.capacityVisits <= 0
                    ? "Direct some freed time to access on Build the case to open capacity, then add your demand."
                    : "Add your backlog and referral demand on Build the case to see how much of the capacity converts."
                }
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                payoff
                isSet={prize > 0}
                value={fmtMoneyCompact(prize)}
                unit="contribution margin / yr"
                label="The prize"
                caption={prize > 0 ? `${fmtInt(accessLadder.realizedVisits)} realized visits at about $${fmtInt(accessLadder.marginPerVisit)} of margin each.` : "Finish the chain above and the prize appears here."}
                emptyHint="The prize appears once the chain above is complete."
              />
            </>
          )}
        </div>
      </div>

      {/* 3 — Three phases across the horizon. */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">The phased plan, across {targetMonth} months</h2>
        <p className="text-[12px] text-[#8C8C8C] mb-4 max-w-[560px] leading-relaxed">
          {isRevenue
            ? "Start with the path whose leak is clearest, prove complete notes move the coding, then widen to the other paths. The value climbs as the paths converge."
            : isQuality
            ? "Start with the event whose prevention is most defensibly the documentation, prove earlier risk surfacing moves the bundle, then widen to the other events. The value climbs as the events converge."
            : isCapacity
            ? "Start on one unit and prove after-shift charting and overtime are falling, widen once it holds, then run at full scope. The value climbs with the scope."
            : isRetention
            ? "Start with one department and prove the relief is real, widen once it holds, then run at full scope. The value climbs with the scope."
            : "Start small and prove the signal, widen once it holds, then run at full scope. The value climbs with the scope."}
        </p>

        <div className="space-y-4" data-testid="section-planning-phases">
          {PLAN_PHASE_IDS.map((phaseId, i) => {
            const meta = PHASE_META[phaseId];
            const [from, to] = boundaries[phaseId];
            const owner = resolvePhaseOwner(planning, phaseId, ownerName);
            const target = resolvePhaseSignalTarget(planning, phaseId, signalDefault[phaseId]);
            const value = ramp[phaseId];
            return (
              <motion.div
                key={phaseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                className="rounded-xl border border-[#E7E0D6] bg-white p-5"
                data-testid={`card-planning-phase-${phaseId}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#1A1A1A] text-[10px] font-bold text-white font-abridge">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{meta.label}</p>
                      <p className="text-[10px] text-[#8C8C8C]">Months {from} to {to}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">Value by end of phase</p>
                    {prize > 0 ? (
                      <p className="font-abridge text-xl font-bold text-[#EA2C00]" data-testid={`text-planning-phase-value-${phaseId}`}>
                        {fmtMoneyCompact(value)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#B4B4B4] font-semibold">pending</p>
                    )}
                  </div>
                </div>

                <p className="text-[12px] text-[#3A3A3A] leading-relaxed mb-4">{meta.intent}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <FieldLabel>Scope</FieldLabel>
                    <p className="text-[13px] text-[#1A1A1A] font-medium" data-testid={`text-planning-phase-scope-${phaseId}`}>
                      {phaseScope[phaseId]}
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Owner</FieldLabel>
                    <input
                      value={owner}
                      onChange={(e) => onChangePhaseOwner(phaseId, e.target.value)}
                      placeholder={ownerName || "Name the owner"}
                      className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                      data-testid={`input-planning-phase-owner-${phaseId}`}
                    />
                  </div>
                </div>

                <div className="rounded-md bg-[#FFF6F3] border border-[#F3C9BE] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#EA2C00] px-2 py-0.5 rounded-full">
                      Leading signal
                    </span>
                    <p className="text-[12px] font-semibold text-[#1A1A1A]" data-testid={`text-planning-phase-signal-${phaseId}`}>
                      {meta.signalLabel}
                    </p>
                  </div>
                  <FieldLabel>Target</FieldLabel>
                  <input
                    value={target}
                    onChange={(e) => onChangePhaseSignalTarget(phaseId, e.target.value)}
                    placeholder={signalDefault[phaseId]}
                    className="h-9 w-full max-w-[280px] rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[12px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                    data-testid={`input-planning-phase-signal-target-${phaseId}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4 — The monthly checkpoint rhythm, one line, ending on attainment. */}
      <div className="rounded-xl border border-[#E7E0D6] bg-[#F4F0EA] p-5 mb-8" data-testid="card-planning-cadence">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">The checkpoint rhythm</p>
          <div className="flex items-center gap-2">
            <label htmlFor="select-planning-cadence" className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
              Reviewed
            </label>
            <Select value={planCadence} onValueChange={(v) => onChangePlanCadence(v as SignalCadence)}>
              <SelectTrigger id="select-planning-cadence" className="h-8 w-[122px] text-xs bg-white" data-testid="select-planning-cadence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap" data-testid="row-planning-cadence-months">
          {Array.from({ length: targetMonth }, (_, m) => m + 1).map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C8C8C] whitespace-nowrap">Mo {m}</span>
              {m < targetMonth && <span className="text-[#D8CFC4]">·</span>}
            </div>
          ))}
          <span className="text-[#B4B4B4] mx-1">→</span>
          <span className="text-[11px] font-bold text-[#EA2C00] whitespace-nowrap" data-testid="text-planning-cadence-end">
            100% attained
          </span>
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-3 leading-relaxed">
          Checked {CADENCE_LABEL[planCadence]}. Each checkpoint asks the same thing: did the leading signal move, and is
          attainment where the plan expected it to be by now.
        </p>
      </div>

      {/* 5 — Optional partner-disclosed risk. Only becomes part of the plan
          once it is filled in; we never invent a weak link. */}
      <div className="rounded-xl border border-dashed border-[#D8CFC4] bg-white p-5 mb-4" data-testid="card-planning-risk">
        <FieldLabel>Anything the partner has flagged that could slow this down? (optional)</FieldLabel>
        <input
          value={partnerRisk}
          onChange={(e) => onChangePartnerRisk(e.target.value)}
          placeholder={
            isRevenue
              ? "e.g. the coding team is mid-transition to a new vendor until Q3"
              : isQuality
              ? "e.g. the wound-care nurse is out on leave until the Q3 backfill"
              : isCapacity
              ? "e.g. a census surge is driving overtime that charting cannot touch until the Q3 hiring class fills"
              : isRetention
              ? "e.g. a covering-shift policy refills the freed time until the Q3 staffing review"
              : isEdAccess
              ? "e.g. triage staffing is short until the Q3 hiring class fills"
              : "e.g. new scheduling template is blocked until the EHR upgrade in Q3"
          }
          className="h-10 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
          data-testid="input-planning-partner-risk"
        />
        {partnerRisk.trim() && (
          <div className="mt-3 bg-[#FFF6F3] border-l-[3px] border-[#EA2C00] rounded-r-md p-3" data-testid="callout-planning-risk">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Flagged by the partner</p>
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{partnerRisk.trim()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
