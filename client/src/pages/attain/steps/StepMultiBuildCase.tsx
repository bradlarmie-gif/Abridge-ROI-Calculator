import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  defaultLeverValues,
  defaultRealizationPct,
  type AttainBaseline,
  type LeverValues,
  type MultiGoalContributionsResult,
  type RealizationByGoal,
} from "@/lib/attain/attainLevers";
import { fmtMoneyCompact } from "./accessLadder";
import AlignSurface from "./AlignSurface";
import { deriveMeasurementModelFor } from "./MeasurementPlanSurface";

/**
 * Multi-goal Align (the stacked "Build the case" surface).
 *
 * A plan with two or more selected goals renders the SAME config-driven Align
 * the single-goal Build-the-case page uses (see `AlignSurface` + `AlignStep`),
 * once per goal, stacked under one combined header, exactly the way
 * multi-goal Plan stacks one measurement block per priority (see
 * `StepMultiMeasurementPlan`). Each goal's block is its own full 5-question Align
 * (revenue's paths and quality's events stack per path/event WITHIN their own
 * block); nothing about a single goal's Align rendering is duplicated here.
 *
 * The combined header carries the plan-level truth once: the combined prize
 * (`combined.combinedMargin`, the exact sum of every goal's own
 * `byGoal[goal].totalMargin`, counted once and never double-booked). Access
 * and Retention are the one non-independent pair: at outpatient/ED they share
 * a single freed documentation hour, so the `freedTimeSplit` slider routes
 * that hour once here, and each block's Align is fed the matching
 * `crossGoalShareMultiplier` so the two goals' numbers reconcile to the same
 * combined prize the engine (`computeMultiGoalContributions`) already books.
 * Every other pairing is additive.
 */
interface StepMultiBuildCaseProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  goals: GoalId[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  /** The share of the one freed documentation hour routed to access (0-100);
   * only engages when both access and retention are selected at outpatient/ED.
   * Shown once as a slider below the combined header and threaded into each
   * block's `crossGoalShareMultiplier`. */
  freedTimeSplit: number;
  onChangeFreedTimeSplit: (split: number) => void;
  /** Per-goal attribution (0-100). Read with the same
   * `?? defaultRealizationPct(goal)` fallback every other surface uses, so a
   * goal never needs eager seeding. */
  realizationByGoal: RealizationByGoal;
  onChangeRealization: (goal: GoalId, pct: number) => void;
  onChangeLeverValue: (goal: GoalId, leverId: string, value: number | string[]) => void;
  stepNumber: number;
  totalSteps: number;
}

export default function StepMultiBuildCase({
  setting,
  baseline,
  goals,
  valuesByGoal,
  combined,
  freedTimeSplit,
  onChangeFreedTimeSplit,
  realizationByGoal,
  onChangeRealization,
  onChangeLeverValue,
  stepNumber,
  totalSteps,
}: StepMultiBuildCaseProps) {
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
  // documentation hour. When both are selected at outpatient/ED,
  // `freedTimeSplit` routes that hour and each goal's Align is credited only
  // its share, exactly as `computeMultiGoalContributions` books it, so the
  // blocks and the combined prize reconcile. Every other pairing is additive.
  const hasFreedTimeConflict =
    (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const multiplierFor = (goal: GoalId): number =>
    !hasFreedTimeConflict ? 1 : goal === "access" ? accessShare : goal === "retention" ? 1 - accessShare : 1;
  const accessSplitLabel = setting === "ed" ? "faster throughput" : "opening access on the schedule";

  return (
    <div data-testid="section-attain-multi-align">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} of {totalSteps} · Get aligned on what you mean
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Align
        </h1>
        <p className="text-[15px] text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-multi-align-teach">
          You picked {goals.length} priorities. Each one gets its own short, shared conversation below about what you
          actually mean, one question at a time. Your facts carry over from your starting point, so you only choose the
          meaning. The combined prize is the sum of each priority's own proof, counted once.
        </p>
      </motion.div>

      {/* Combined header: the plan-level truth, once. The combined prize is the
          exact sum of each priority's own Align proof below, counted once. The
          running curve/total also lives in the side panel, so this stays
          clean. */}
      <div className="rounded-2xl border border-[#1A1A1A] bg-[#1A1A1A] p-6 mb-8" data-testid="card-multi-align-header">
        <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">
          The combined prize · {goals.length} priorities
        </p>
        {hardContributionMargin > 0 ? (
          <p className="font-abridge text-3xl md:text-4xl font-bold text-[#EA2C00]" data-testid="text-multi-align-combined-prize">
            {fmtMoneyCompact(hardContributionMargin)}
            <span className="text-sm font-normal text-white/50"> contribution margin / yr</span>
          </p>
        ) : (
          <p className="font-abridge text-3xl font-bold text-white/40" data-testid="text-multi-align-combined-prize">
            value pending
          </p>
        )}
        <p className="text-[12px] text-white/60 mt-2 max-w-[520px]">
          {hasQuality
            ? "This is the sum of each financial priority's own proof below, counted once. Nursing quality's safety value is tracked separately below, never folded into this margin."
            : "This is the sum of each priority's own proof below, counted once. Choose the meaning in each block; the number is the proof of what you aligned on."}
        </p>

        {hasQuality && qualityHeaderModel && (
          <div className="mt-4 pt-4 border-t border-white/10" data-testid="text-multi-align-quality-soft">
            <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/40 mb-1.5">
              Nursing quality · safety value, not contribution margin
            </p>
            <p className="text-[15px] font-semibold text-white" data-testid="text-multi-align-quality-soft-count">
              {qualityHeaderModel.safetyHeadline?.heroValue ?? "count pending"}
            </p>
            <p className="text-[11px] text-white/55 mt-1 leading-relaxed max-w-[520px]" data-testid="text-multi-align-quality-soft-dollar">
              {qualityHeaderModel.safetyHeadline?.softDollarNote ?? "This plan leads with safety, not a dollar."}
            </p>
          </div>
        )}

        {hasFreedTimeConflict && (
          <p className="text-[11px] text-white/55 mt-4 leading-relaxed" data-testid="text-multi-align-split-note">
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
          data-testid="panel-attain-multi-freed-time-split"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">One hour, one split</p>
          <p className="text-[15px] text-[#3A3A3A] leading-relaxed mb-5 max-w-[620px]">
            Access and Retention both price the same freed documentation hour. This is the one decision that keeps it
            from being counted twice: how much of that hour routes to {accessSplitLabel}, versus how much stays as
            protected relief. Both blocks below already reflect this split.
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-multi-freed-time-split-access">
              {freedTimeSplit}% to {accessSplitLabel}
            </span>
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-multi-freed-time-split-retention">
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
            data-testid="slider-attain-multi-freed-time-split"
          />
        </motion.div>
      )}

      {/* Per priority: the SAME config-driven Align, once each, under a clear
          per-goal heading/pill so the blocks read as distinct premium sections
          rather than one wall. */}
      {goals.map((goal, i) => {
        const goalDef = GOAL_CATALOG[goal];
        const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);
        const realizationPct = realizationByGoal[goal] ?? defaultRealizationPct(goal);
        return (
          <div key={goal} className="mb-12" data-testid={`section-multi-align-priority-${goal}`}>
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
                <h2 className="text-lg font-bold text-[#1A1A1A]" data-testid={`text-multi-align-priority-title-${goal}`}>
                  {goalDef.label}
                </h2>
              </div>
            </div>

            {/* This priority's attribution, the share of its outcome credited
                to this plan. Kept quiet and inline (there is no single side-
                panel "active goal" on the stacked surface), only ever dialed
                DOWN from full credit. Threaded into the block's Align exactly
                as the side panel threads it on the single-goal page, so the
                block's proof and the combined prize stay reconciled. */}
            {combined && (
              <div className="rounded-xl border border-[#E7E0D6] bg-[#FBFAF7] px-5 py-4 mb-6" data-testid={`panel-multi-align-realization-${goal}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C]">
                    Attributed to this plan
                  </span>
                  <span className="text-xs font-semibold text-[#1A1A1A]" data-testid={`text-multi-align-realization-value-${goal}`}>
                    {realizationPct}%
                  </span>
                </div>
                <Slider
                  value={[realizationPct]}
                  onValueChange={(v) => onChangeRealization(goal, v[0])}
                  min={0}
                  max={100}
                  step={5}
                  accent="coral"
                  className="w-full"
                  data-testid={`slider-multi-align-realization-${goal}`}
                />
                <p className="text-[11px] text-[#8C8C8C] mt-2">
                  {goal === "quality"
                    ? "Abridge surfaces the risk earlier, the unit runs the bundle and prevents. Starts at 30%, the honestly attributable share."
                    : "Dial down when other efforts also move this number. It never adds credit, only removes it."}
                </p>
              </div>
            )}

            <AlignSurface
              goal={goal}
              setting={setting}
              baseline={baseline}
              values={values}
              onChangeValue={(leverId, value) => onChangeLeverValue(goal, leverId, value)}
              realizationPct={realizationPct}
              crossGoalShareMultiplier={multiplierFor(goal)}
            />
          </div>
        );
      })}
    </div>
  );
}
