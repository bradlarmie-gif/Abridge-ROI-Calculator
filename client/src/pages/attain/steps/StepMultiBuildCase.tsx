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
          You picked {goals.length} priorities. Each gets its own set of questions below: one at a time, you choose what
          you mean. Your facts carry over from Starting Point. The combined prize is the sum of each priority's proof,
          counted once.
        </p>
      </motion.div>

      {/* Combined prize as a SLIM editorial line, not a black hero, so it does
          not duplicate each priority's own black proof box below. The running
          total also lives in the side panel. */}
      <div className="mb-8" data-testid="card-multi-align-header">
        <p className="text-[10px] font-semibold uppercase tracking-[1.8px] text-[#8C8C8C] mb-2">
          The combined prize · {goals.length} priorities
        </p>
        {hardContributionMargin > 0 ? (
          <p className="flex items-baseline gap-2.5 flex-wrap" data-testid="text-multi-align-combined-prize">
            <span className="font-abridge text-3xl md:text-4xl text-[#EA2C00] leading-none">
              {fmtMoneyCompact(hardContributionMargin)}
            </span>
            <span className="text-[14px] text-[#6B6B6B]">
              contribution margin a year, the sum of each priority's proof below, counted once
            </span>
          </p>
        ) : (
          <p className="text-[15px] text-[#8C8C8C]" data-testid="text-multi-align-combined-prize">
            The combined number builds here as you align each priority below.
          </p>
        )}
        {hasQuality && qualityHeaderModel && (
          <p className="text-[13px] text-[#8C8C8C] leading-relaxed mt-2.5 max-w-[560px]" data-testid="text-multi-align-quality-soft">
            <b className="text-[#3A3A3A]">Nursing quality, safety value, not contribution margin:</b>{" "}
            <span data-testid="text-multi-align-quality-soft-count">{qualityHeaderModel.safetyHeadline?.heroValue ?? "count pending"}</span>.{" "}
            <span data-testid="text-multi-align-quality-soft-dollar">{qualityHeaderModel.safetyHeadline?.softDollarNote ?? "This plan leads with safety, not a dollar."}</span>
          </p>
        )}
      </div>

      {/* One split decision, once, when access + retention are both in play.
          A quiet control on a hairline, never a filled coral box. */}
      {hasFreedTimeConflict && (
        <div className="mb-10 pt-6 border-t border-[#EFEAE1]" data-testid="panel-attain-multi-freed-time-split">
          <p className="text-[10px] font-semibold uppercase tracking-[1.8px] text-[#8C8C8C] mb-1.5">One shared hour</p>
          <p className="text-[13.5px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">
            Access and Retention price the same freed hour. Split it once here so it is never counted twice; both blocks
            below already reflect it.
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
        </div>
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
              <div className="mb-6 max-w-[420px]" data-testid={`panel-multi-align-realization-${goal}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[1.6px] text-[#8C8C8C]">
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
                <p className="text-[11px] text-[#8C8C8C] mt-2 leading-relaxed">
                  {goal === "quality"
                    ? "Abridge surfaces the risk earlier, the unit runs the bundle that prevents the event. Starts at 30%, the honestly attributable share."
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
