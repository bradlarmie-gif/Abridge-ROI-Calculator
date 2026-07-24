import { motion } from "framer-motion";
import type { GoalId } from "@/lib/attain/attainTypes";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import type { AttainPlanning, MeasurementMetricEntry } from "@/lib/attain/attainPlanning";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import type { GoalOwner, SignalCadence } from "./StepCommit";
import MeasurementPlanSurface from "./MeasurementPlanSurface";
import { PlanningRiskCard, riskPlaceholderFor } from "./planningRiskCard";

/**
 * StepMeasurementPlan — the SINGLE-goal Plan step: the measurement plan the
 * partner will track. After Align settles WHERE they are going and derives the
 * number, this is where they build WHAT THEY WILL MEASURE to get there.
 *
 * It is a thin shell: the step eyebrow/title/teach up top, the shared
 * per-goal `MeasurementPlanSurface` in the middle (the promise, the causal
 * measurement chain from their own Align choices, the make-or-break commitment,
 * the honest monthly check), and the one optional partner-risk line at the
 * foot. The stacked multi-goal Plan (StepMultiMeasurementPlan) renders the same
 * surface once per goal, so single- and multi-goal can never diverge.
 */
interface StepMeasurementPlanProps {
  goal: Extract<GoalId, "access" | "retention" | "revenue" | "quality" | "capacity">;
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  combined: MultiGoalContributionsResult | null;
  goalOwner: GoalOwner;
  onChangeGoalOwner: (patch: Partial<GoalOwner>) => void;
  planning: AttainPlanning;
  onSetChosenMetrics: (linkId: string, metricIds: string[]) => void;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  onAddCustomMetric: (linkId: string) => void;
  onRemoveCustomMetric: (linkId: string, id: string) => void;
  onChangeCustomMetricLabel: (linkId: string, id: string, label: string) => void;
  onChangePromiseByWhen: (value: string) => void;
  onChangeCommitment: (patch: { commitmentOwner?: string; commitmentByWhen?: string }) => void;
  onChangePartnerRisk: (text: string) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  stepNumber: number;
}

export default function StepMeasurementPlan({
  goal,
  setting,
  baseline,
  values,
  combined,
  goalOwner,
  onChangeGoalOwner,
  planning,
  onSetChosenMetrics,
  onChangeMetricField,
  onAddCustomMetric,
  onRemoveCustomMetric,
  onChangeCustomMetricLabel,
  onChangePromiseByWhen,
  onChangeCommitment,
  onChangePartnerRisk,
  planCadence,
  onChangePlanCadence,
  stepNumber,
}: StepMeasurementPlanProps) {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · Build your measurement plan
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Measurement plan
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-measure-teach">
          You aligned on where you are going and the number came from that. This is where you decide what you will
          measure to get there, and how you will know you are getting closer. Whatever you pick here becomes your
          scorecard.
        </p>
      </motion.div>

      <MeasurementPlanSurface
        goal={goal}
        setting={setting}
        baseline={baseline}
        values={values}
        combined={combined}
        crossGoalShareMultiplier={1}
        goalOwner={goalOwner}
        onChangeGoalOwner={onChangeGoalOwner}
        planning={planning}
        onSetChosenMetrics={onSetChosenMetrics}
        onChangeMetricField={onChangeMetricField}
        onAddCustomMetric={onAddCustomMetric}
        onRemoveCustomMetric={onRemoveCustomMetric}
        onChangeCustomMetricLabel={onChangeCustomMetricLabel}
        onChangePromiseByWhen={onChangePromiseByWhen}
        onChangeCommitment={onChangeCommitment}
        planCadence={planCadence}
        onChangePlanCadence={onChangePlanCadence}
      />

      {/* Optional partner-disclosed risk, once. */}
      <div className="mt-10">
        <PlanningRiskCard
          partnerRisk={planning.partnerRisk ?? ""}
          onChangePartnerRisk={onChangePartnerRisk}
          placeholder={riskPlaceholderFor(goal, setting)}
        />
      </div>
    </div>
  );
}
