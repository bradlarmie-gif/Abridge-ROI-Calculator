import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  defaultLeverValues,
  type AttainBaseline,
  type LeverValues,
  type MultiGoalContributionsResult,
} from "@/lib/attain/attainLevers";
import {
  measurementPlanningFor,
  type AttainPlanning,
  type MeasurementMetricEntry,
} from "@/lib/attain/attainPlanning";
import { fmtMoneyCompact } from "./accessLadder";
import MeasurementPlanSurface, { deriveMeasurementModelFor } from "./MeasurementPlanSurface";
import { PlanningRiskCard, riskPlaceholderFor } from "./planningRiskCard";
import type { GoalOwner, SignalCadence } from "./StepCommit";

/** The goals that render through the shared measurement surface. Every goal a
 * multi-goal plan can hold has one, ED access included (deriveEdAccessMeasurementPlan)
 * — see `allGoalsHaveMeasurementSurface` in AttainFlow. */
export type MeasurementGoal = Extract<GoalId, "access" | "retention" | "revenue" | "quality" | "capacity">;

/**
 * Multi-goal Plan (the stacked MEASUREMENT PLAN surface).
 *
 * A plan with two or more selected goals renders the SAME per-goal
 * `MeasurementPlanSurface` the single-goal Plan page uses, once per goal,
 * stacked under one combined header, exactly the way multi-goal Align
 * (StepMultiBuildCase) stacks one Align block per goal via `AlignSurface`.
 * Each goal's block is its full measurement chain: its own promise, its metric
 * menus with THEIR baselines, blank owners/dates, its make-or-break commitment,
 * and its honest monthly check. Nothing about a single goal's Plan rendering is
 * duplicated here.
 *
 * The combined header carries the plan-level truth once: the combined prize
 * (`combined.combinedMargin`, the exact sum of every goal's own
 * `byGoal[goal].totalMargin`, counted once). Access and Retention are the one
 * non-independent pair: at outpatient/ED they share a single freed
 * documentation hour, so the `freedTimeSplit` slider routes that hour once
 * here, and each block's surface is fed the matching `crossGoalShareMultiplier`
 * so the two goals' baselines/targets reconcile to the same combined prize the
 * engine (`computeMultiGoalContributions`) already books, never double-counting
 * the hour. Every other pairing is additive.
 *
 * Each goal's metric picks/targets/owners/dates persist on
 * `planning.measurementByGoal[goal]` (per goal, so two goals never collide),
 * read via `measurementPlanningFor`. The one optional partner-risk line sits
 * once at the foot, never per goal.
 */
interface StepMultiMeasurementPlanProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  goals: MeasurementGoal[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  /** The share of the one freed documentation hour routed to access (0-100);
   * only engages when both access and retention are selected at outpatient/ED. */
  freedTimeSplit: number;
  onChangeFreedTimeSplit: (split: number) => void;
  planning: AttainPlanning;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
  onChangeGoalOwner: (goal: GoalId, patch: Partial<GoalOwner>) => void;
  onSetChosenMetrics: (goal: GoalId, linkId: string, metricIds: string[]) => void;
  onChangeMetricField: (goal: GoalId, metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  onChangePromiseByWhen: (goal: GoalId, value: string) => void;
  onChangeCommitment: (goal: GoalId, patch: { commitmentOwner?: string; commitmentByWhen?: string }) => void;
  onChangePartnerRisk: (text: string) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  stepNumber: number;
}

export default function StepMultiMeasurementPlan({
  setting,
  baseline,
  goals,
  valuesByGoal,
  combined,
  freedTimeSplit,
  onChangeFreedTimeSplit,
  planning,
  goalOwnerByPriority,
  onChangeGoalOwner,
  onSetChosenMetrics,
  onChangeMetricField,
  onChangePromiseByWhen,
  onChangeCommitment,
  onChangePartnerRisk,
  planCadence,
  onChangePlanCadence,
  stepNumber,
}: StepMultiMeasurementPlanProps) {
  const combinedPrize = combined?.combinedMargin ?? 0;

  // ── Honesty: quality's soft dollar never sums into "contribution margin" ──
  // Nursing quality's dollar is a cost-of-harm-avoided figure, attributed at a
  // partial share (attainLevers.ts's `defaultRealizationPct`) — a SOFT safety
  // number, not hard contribution margin. `combined.combinedMargin` sums every
  // selected goal's own dollar, so a plan that pairs quality with a financial
  // goal would otherwise fold the soft dollar into the header's one number
  // labeled "contribution margin". Only the DISPLAY below is adjusted; the
  // engine's `combinedMargin` is untouched.
  const hasQuality = goals.includes("quality");
  const qualityMargin = combined?.byGoal.quality?.totalMargin ?? 0;
  const hardContributionMargin = combinedPrize - qualityMargin;
  const qualityValuesForHeader = valuesByGoal.quality ?? defaultLeverValues("quality", setting);
  const qualityHeaderModel = hasQuality
    ? deriveMeasurementModelFor("quality", setting, baseline, qualityValuesForHeader, combined, 1)
    : null;

  // The one non-independent pair: access + retention share a single freed
  // documentation hour. When both are selected at outpatient/ED, `freedTimeSplit`
  // routes that hour and each block's surface is credited only its share, exactly
  // as `computeMultiGoalContributions` books it, so the blocks and the combined
  // prize reconcile. Every other pairing is additive.
  const hasFreedTimeConflict =
    (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const multiplierFor = (goal: GoalId): number =>
    !hasFreedTimeConflict ? 1 : goal === "access" ? accessShare : goal === "retention" ? 1 - accessShare : 1;
  const accessSplitLabel = setting === "ed" ? "faster throughput" : "opening access on the schedule";

  return (
    <div data-testid="section-attain-multi-plan">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · Build your measurement plan
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Measurement plan
        </h1>
        <p className="text-[15px] text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-multi-plan-teach">
          You picked {goals.length} priorities. Each one gets its own measurement plan below, built from what you
          aligned on: the metrics you will own, your baseline, and the target you set. Whatever you pick becomes your
          scorecard. The combined prize is the sum of each priority's own number, counted once.
        </p>
      </motion.div>

      {/* Combined header: the plan-level truth, once. The combined prize is the
          exact sum of each priority's own measurement plan below, counted once. */}
      <div className="rounded-2xl border border-[#1A1A1A] bg-[#1A1A1A] p-6 mb-8" data-testid="card-multi-plan-header">
        <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">
          The combined prize · {goals.length} priorities
        </p>
        {hardContributionMargin > 0 ? (
          <p className="font-abridge text-3xl md:text-4xl font-bold text-[#EA2C00]" data-testid="text-multi-plan-combined-prize">
            {fmtMoneyCompact(hardContributionMargin)}
            <span className="text-sm font-normal text-white/50"> contribution margin / yr</span>
          </p>
        ) : (
          <p className="font-abridge text-3xl font-bold text-white/40" data-testid="text-multi-plan-combined-prize">
            value pending
          </p>
        )}
        <p className="text-[12px] text-white/60 mt-2 max-w-[520px]">
          {hasQuality
            ? "This is the sum of each financial priority's own measurement plan below, counted once. Nursing quality's safety value is tracked separately below, never folded into this margin."
            : "This is the sum of each priority's own measurement plan below, counted once. Build the scorecard in each block; the number is the proof of what you will measure."}
        </p>

        {hasQuality && qualityHeaderModel && (
          <div className="mt-4 pt-4 border-t border-white/10" data-testid="text-multi-plan-quality-soft">
            <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/40 mb-1.5">
              Nursing quality · safety value, not contribution margin
            </p>
            <p className="text-[15px] font-semibold text-white" data-testid="text-multi-plan-quality-soft-count">
              {qualityHeaderModel.safetyHeadline?.heroValue ?? "count pending"}
            </p>
            <p className="text-[11px] text-white/55 mt-1 leading-relaxed max-w-[520px]" data-testid="text-multi-plan-quality-soft-dollar">
              {qualityHeaderModel.safetyHeadline?.softDollarNote ?? "This plan leads with safety, not a dollar."}
            </p>
          </div>
        )}

        {hasFreedTimeConflict && (
          <p className="text-[11px] text-white/55 mt-4 leading-relaxed" data-testid="text-multi-plan-split-note">
            Patient Access and Provider Retention draw on the same freed documentation hour. You routed {Math.round(accessShare * 100)}% of it to
            {" "}{accessSplitLabel} and {Math.round((1 - accessShare) * 100)}% to protecting relief, so the one hour is split, never counted twice.
            Each block below reflects its share.
          </p>
        )}
      </div>

      {/* One split decision, once, when access + retention are both in play.
          The slider that keeps the shared freed hour from being counted twice
          across the two blocks. */}
      {hasFreedTimeConflict && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-[#EA2C00] bg-[#FFF6F3] p-6 mb-10"
          data-testid="panel-attain-multi-plan-freed-time-split"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">One shared hour</p>
          <p className="text-[15px] text-[#3A3A3A] leading-relaxed mb-5 max-w-[620px]">
            Access and Retention both price the same freed documentation hour. This is the one decision that keeps it
            from being counted twice: how much of that hour routes to {accessSplitLabel}, versus how much stays as
            protected relief. Both blocks below already reflect this split.
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-multi-plan-freed-time-split-access">
              {freedTimeSplit}% to {accessSplitLabel}
            </span>
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-multi-plan-freed-time-split-retention">
              {100 - freedTimeSplit}% to protecting relief
            </span>
          </div>
          <Slider
            value={[freedTimeSplit]}
            onValueChange={(v) => onChangeFreedTimeSplit(v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-attain-multi-plan-freed-time-split"
          />
        </motion.div>
      )}

      {/* Per priority: the SAME per-goal measurement surface, once each, under a
          clear per-goal heading/pill so the blocks read as distinct premium
          sections rather than one wall. */}
      {goals.map((goal, i) => {
        const goalDef = GOAL_CATALOG[goal];
        const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);
        const goalOwner = goalOwnerByPriority[goal] ?? { name: "", title: "" };
        return (
          <div key={goal} className="mb-12" data-testid={`section-multi-plan-priority-${goal}`}>
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#E7E0D6]">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold text-white font-abridge flex-shrink-0"
                style={{ background: goalDef.pillBg }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
                  Priority {i + 1} of {goals.length} · {goalDef.pill}
                </p>
                <h2 className="text-lg font-bold text-[#1A1A1A]" data-testid={`text-multi-plan-priority-title-${goal}`}>
                  {goalDef.label}
                </h2>
              </div>
            </div>

            <MeasurementPlanSurface
              goal={goal}
              setting={setting}
              baseline={baseline}
              values={values}
              combined={combined}
              crossGoalShareMultiplier={multiplierFor(goal)}
              goalOwner={goalOwner}
              onChangeGoalOwner={(patch) => onChangeGoalOwner(goal, patch)}
              planning={measurementPlanningFor(planning, goal)}
              onSetChosenMetrics={(linkId, ids) => onSetChosenMetrics(goal, linkId, ids)}
              onChangeMetricField={(metricId, patch) => onChangeMetricField(goal, metricId, patch)}
              onChangePromiseByWhen={(value) => onChangePromiseByWhen(goal, value)}
              onChangeCommitment={(patch) => onChangeCommitment(goal, patch)}
              planCadence={planCadence}
              onChangePlanCadence={onChangePlanCadence}
              showPromiseEyebrow={false}
            />
          </div>
        );
      })}

      <PlanningRiskCard
        partnerRisk={planning.partnerRisk ?? ""}
        onChangePartnerRisk={onChangePartnerRisk}
        placeholder={riskPlaceholderFor(null, setting)}
      />
    </div>
  );
}
