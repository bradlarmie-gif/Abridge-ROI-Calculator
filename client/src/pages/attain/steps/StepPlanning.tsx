import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeAccessChain } from "@/lib/attain/attainAccess";
import { computeWorkforceChain } from "@/lib/attain/attainWorkforce";
import { DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
import {
  computeRevenueChain,
  deriveRevenueLadder,
  selectedPaths,
  type RevenuePathId,
  type RevenuePathLadder,
} from "@/lib/attain/attainRevenue";
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
  SpineRung,
  CapacityDemandGate,
  BurnoutPoolGate,
  RevenuePathGate,
} from "./accessLadder";

/** The two goals Planning renders as the shared step-down ladder on the hook.
 * Outpatient access is the locked exemplar; outpatient retention is the
 * second, built from the same abstraction so the two cannot diverge. Every
 * other setting/goal still renders the original StepCommit. */
export type PlanningGoal = "access" | "retention" | "revenue";

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

const PHASE_META_RETENTION: Record<PlanPhaseId, PhaseMeta> = {
  start: {
    label: "Start",
    intent: "Start with one department. Prove the minutes are real and after-hours charting actually falls before anything scales.",
    signalLabel: "After-hours charting time, falling",
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
  const revenueRaw = isRevenue ? computeRevenueChain(baseline, setting, values).totalValue : 0;
  const revenueRealized = combined?.byGoal.revenue?.totalMargin ?? revenueRaw;
  const revenueRealizationPct = revenueRaw > 0 ? (revenueRealized / revenueRaw) * 100 : 100;
  const revenueLadder = deriveRevenueLadder(baseline, setting, values, revenueRealizationPct);
  const revenuePathsSel = selectedPaths(values).filter((p) => setting !== "ed" || p !== "hcc");

  // The prize + the first-domino minutes are shared framing across the
  // minutes-based goals (access and retention both open on minutes saved per
  // note). Revenue opens on the documentation lever instead.
  const prize = isRevenue ? revenueLadder.convergedPrize : isRetention ? retentionLadder.prize : accessLadder.prize;
  const firstDominoMinutes = isRetention ? retentionLadder.minutes : accessLadder.minutes;

  const boundaries = phaseBoundaries(targetMonth);
  const ramp = phaseValueRamp(prize);

  // Revenue paths ordered most-documentation-caused first, so the phased plan
  // starts on the path whose leak is clearest (E/M), then widens.
  const orderedRevenuePaths = REVENUE_DOC_CAUSED_ORDER.filter((p) => revenuePathsSel.includes(p));
  const primaryRevenuePath: RevenuePathId = orderedRevenuePaths[0] ?? "em";
  const revenuePhaseSignals = REVENUE_PATH_PHASE_SIGNALS[primaryRevenuePath];
  const PHASE_META_REVENUE: Record<PlanPhaseId, PhaseMeta> = {
    start: {
      label: "Start",
      intent: `Start with ${REVENUE_PATH_SHORT[primaryRevenuePath]}, the path whose leak is most clearly the documentation. Prove complete notes actually move the coding before anything widens.`,
      signalLabel: revenuePhaseSignals[0],
    },
    expand: {
      label: "Expand",
      intent:
        orderedRevenuePaths.length > 1
          ? "The first path held. Widen to the other revenue paths you picked and watch the capture rate rise."
          : "The signal held. Widen the scope across more providers and watch the capture rate rise.",
      signalLabel: revenuePhaseSignals[1],
    },
    steady: {
      label: "Steady",
      intent: "Full scope across every path. The captured revenue is landing on the claim and holding.",
      signalLabel: revenuePhaseSignals[2],
    },
  };

  // Derived, editable default target per phase's leading signal.
  const accessLines = !accessChain.scope.enterprise ? asLines(values.accessLines) : [];
  const retentionLines = asLines(values.retentionLines);
  const retentionProviders = retentionLadder.providersInScope;

  const signalDefault: Record<PlanPhaseId, string> = isRevenue
    ? {
        start: "improving vs baseline",
        expand: "improving vs baseline",
        steady: prize > 0 ? `${fmtMoneyCompact(prize)} captured per year` : "the full captured amount",
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

  const revenuePathLabel = (p: RevenuePathId) => REVENUE_PATH_SHORT[p];
  const phaseScope: Record<PlanPhaseId, string> = isRevenue
    ? {
        start: orderedRevenuePaths.length > 0 ? `${revenuePathLabel(primaryRevenuePath)} first` : "A first revenue path",
        expand:
          orderedRevenuePaths.length > 1
            ? `Add ${orderedRevenuePaths.slice(1).map(revenuePathLabel).join(", ")}`
            : "Widen to more providers",
        steady:
          orderedRevenuePaths.length > 0
            ? `All paths: ${orderedRevenuePaths.map(revenuePathLabel).join(", ")}`
            : "Full scope",
      }
    : isRetention
    ? {
        start:
          retentionLines.length > 0
            ? `${retentionLines[0]} first`
            : retentionProviders > 0
              ? `A first cohort of the ${fmtInt(retentionProviders)} providers`
              : "A first department",
        expand:
          retentionLines.length > 1
            ? `Add ${retentionLines.slice(1).join(", ")}`
            : retentionLines.length === 1
              ? `Widen beyond ${retentionLines[0]}`
              : retentionProviders > 0
                ? `Widen to more of the ${fmtInt(retentionProviders)} providers`
                : "Widen the scope",
        steady:
          retentionLines.length > 0
            ? `All departments: ${retentionLines.join(", ")}`
            : retentionProviders > 0
              ? `All ${fmtInt(retentionProviders)} providers`
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

  const PHASE_META = isRevenue ? PHASE_META_REVENUE : isRetention ? PHASE_META_RETENTION : PHASE_META_ACCESS;

  const teach = isRevenue
    ? "One lever does the work here: complete, specific documentation at the point of care. It feeds several revenue paths, and for each one the documentation is the ceiling on what you can capture. Below is the promise, the paths that converge under it, and the phased plan that gets there."
    : isRetention
    ? "You want lower voluntary turnover and a better clinician experience. It starts on one number: the minutes saved per note. That freed time, kept as relief, comes off after-hours charting, and each rung below multiplies on top of it toward the departures you avoid and the dollar that saves. Below is the promise, the chain of logic under it, and the phased plan that gets there."
    : "One number does the work here: the minutes saved per note. It is the first domino. Freed hours, new capacity, realized visits, and the dollar prize are all multiplication on top of it. Below is the promise, the chain of logic under it, and the phased plan that gets there.";

  const spineIntro = isRevenue
    ? "Read it top to bottom. Complete documentation is the one lever every path shares. For each path, the documentation-caused leak is the ceiling that decides how much you can capture, and what converts becomes dollars. The paths add into one prize."
    : isRetention
    ? "Read it top to bottom. The first rungs multiply: minutes saved become freed hours, and the hours you keep as relief come off after-hours charting. Then burnout is the ceiling that decides how many of your departures you can actually avoid, and those avoided departures become dollars."
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
          {isRetention ? "Lower voluntary turnover, better clinician experience" : goalDef.label}
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
            : `How ${fmtInt(firstDominoMinutes)} minutes per note becomes ${prize > 0 ? fmtMoneyCompact(prize) : "the prize"}`}
        </h2>
        <p className="text-[12px] text-[#8C8C8C] mb-4 max-w-[560px] leading-relaxed">{spineIntro}</p>

        <div className="space-y-2" data-testid="section-planning-spine">
          {isRevenue ? (
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
              {revenueLadder.paths.map((p: RevenuePathLadder) => (
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
                    ? `${revenueLadder.paths.filter((p) => p.hasValue).length} paths, each its own claim pool, summed once and never double-counted.`
                    : "Finish a path above and the converged prize appears here."
                }
                emptyHint="The prize appears once at least one path's chain is complete."
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
                caption="The target we commit to and verify first. The share you keep as relief comes off after-hours charting, the work outside of work that drives burnout."
                emptyHint=""
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={retentionLadder.freedHrsPerProviderWk > 0}
                value={fmtHoursShort(retentionLadder.freedHrsPerProviderWk)}
                unit="hrs / provider / wk"
                label="Freed time"
                caption="That time saved, added up across every note a provider writes in a week."
                emptyHint="Set your providers on Build the case to see the freed hours."
              />
              <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
              <SpineRung
                isSet={retentionLadder.protectedHrsPerProviderWk > 0}
                value={fmtHoursShort(retentionLadder.protectedHrsPerProviderWk)}
                unit="hrs / provider / wk"
                label="Protected relief"
                caption={`${fmtInt(retentionLadder.protectedSharePct)}% of the freed time stays with the clinician, off after-hours charting. The rest is free to go to the schedule.`}
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
              : isRetention
              ? "e.g. a covering-shift policy refills the freed time until the Q3 staffing review"
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
