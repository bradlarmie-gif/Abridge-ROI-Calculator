import { motion } from "framer-motion";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { defaultLeverValues } from "@/lib/attain/attainLevers";
import {
  planningLayerFor,
  type AttainPlanning,
  type PlanPhaseId,
} from "@/lib/attain/attainPlanning";
import type { GoalOwner, SignalCadence } from "./StepCommit";
import { fmtMoneyCompact } from "./accessLadder";
import {
  PlanningPriorityBlock,
  PlanningCadenceCard,
  PlanningRiskCard,
  riskPlaceholderFor,
  type PlanningGoal,
} from "./StepPlanning";

/**
 * Multi-priority Planning.
 *
 * A plan with two or more selected priorities renders the SAME phased
 * step-down block the single-goal Planning page uses (see
 * `PlanningPriorityBlock` in StepPlanning.tsx), once per priority, so a
 * multi-goal plan tells the identical clean step-down story per priority
 * instead of falling back to the old dense Commit form.
 *
 * The combined header carries the plan-level truth once: the combined prize
 * (the engine's `combinedMargin`, which is the exact sum of every priority's
 * own `byGoal[goal].totalMargin`, counted once and never double-booked), one
 * accountable exec owner for the whole plan, and the horizon/target month. The
 * running combined curve already lives in the side panel, so the header stays
 * clean. The plan-wide checkpoint cadence and the one optional partner risk sit
 * once at the foot, never per priority.
 */
interface StepMultiPlanningProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  goals: GoalId[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  planning: AttainPlanning;
  onChangePhaseOwner: (goal: GoalId, phase: PlanPhaseId, name: string) => void;
  onChangePhaseSignalTarget: (goal: GoalId, phase: PlanPhaseId, target: string) => void;
  onChangePhaseSignalLabel: (goal: GoalId, phase: PlanPhaseId, label: string) => void;
  /** One accountable exec owner for the whole plan (planning.planExecOwner). */
  onChangePlanExecOwner: (patch: Partial<GoalOwner>) => void;
  onChangePartnerRisk: (text: string) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  /** The share of the one freed documentation hour routed to access (0-100);
   * only engages when both access and retention are selected at outpatient/ED.
   * Threaded into each block so its ladder reflects the same split the combined
   * result already applied, and surfaced once as a note below. */
  freedTimeSplit: number;
  totalMonths: number;
  stepNumber: number;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{children}</p>;
}

export default function StepMultiPlanning({
  setting,
  baseline,
  goals,
  valuesByGoal,
  combined,
  planning,
  onChangePhaseOwner,
  onChangePhaseSignalTarget,
  onChangePhaseSignalLabel,
  onChangePlanExecOwner,
  onChangePartnerRisk,
  planCadence,
  onChangePlanCadence,
  freedTimeSplit,
  totalMonths,
  stepNumber,
}: StepMultiPlanningProps) {
  const targetMonth = totalMonths > 0 ? Math.round(totalMonths) : 9;
  const execOwner = planning.planExecOwner ?? { name: "", title: "" };
  const execOwnerName = execOwner.name.trim();
  const combinedPrize = combined?.combinedMargin ?? 0;

  // The one non-independent pair: access + retention share a single freed
  // documentation hour. When both are selected at outpatient/ED, `freedTimeSplit`
  // routes that hour, and each priority's chain is credited only its share,
  // exactly as `computeMultiGoalContributions` already books it, so the block
  // ladders and the combined prize reconcile. Every other pairing is additive.
  const hasFreedTimeConflict =
    (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const multiplierFor = (goal: GoalId): number =>
    !hasFreedTimeConflict ? 1 : goal === "access" ? accessShare : goal === "retention" ? 1 - accessShare : 1;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · The plan to attain it
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Planning
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-multi-planning-teach">
          You picked {goals.length} priorities. Each one gets the same phased plan below: the promise, the chain of
          logic under it, and the three phases that get there. One accountable owner answers for the whole plan, and
          the combined prize is the sum of each priority's own number, counted once.
        </p>
      </motion.div>

      {/* Combined header: the plan-level truth, once. The combined prize, the
          one exec owner, and the month it is due. The running curve is in the
          side panel, so this stays clean. */}
      <div className="rounded-2xl border border-[#1A1A1A] bg-[#1A1A1A] p-6 mb-10" data-testid="card-multi-planning-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">
              The combined prize · {goals.length} priorities
            </p>
            {combinedPrize > 0 ? (
              <p className="font-abridge text-3xl md:text-4xl font-bold text-[#EA2C00]" data-testid="text-multi-planning-combined-prize">
                {fmtMoneyCompact(combinedPrize)}
                <span className="text-sm font-normal text-white/50"> contribution margin / yr</span>
              </p>
            ) : (
              <p className="font-abridge text-3xl font-bold text-white/40" data-testid="text-multi-planning-combined-prize">
                value pending
              </p>
            )}
            <p className="text-[12px] text-white/60 mt-2">
              Due by month {targetMonth}. This is the sum of each priority's own prize below, counted once.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-white/15">
          <FieldLabel>
            <span className="text-white/50">Plan owner (one exec who answers for the whole plan)</span>
          </FieldLabel>
          <div className="flex flex-wrap gap-3">
            <input
              value={execOwner.name}
              onChange={(e) => onChangePlanExecOwner({ name: e.target.value })}
              placeholder="Name, e.g. Dr. A. Rivera"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-white/20 bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#EA2C00]"
              data-testid="input-multi-planning-exec-owner-name"
            />
            <input
              value={execOwner.title}
              onChange={(e) => onChangePlanExecOwner({ title: e.target.value })}
              placeholder="Title / role, e.g. Chief Operating Officer"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-white/20 bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#EA2C00]"
              data-testid="input-multi-planning-exec-owner-title"
            />
          </div>
        </div>

        {hasFreedTimeConflict && (
          <p className="text-[11px] text-white/55 mt-4 leading-relaxed" data-testid="text-multi-planning-split-note">
            Patient Access and Provider Retention draw on the same freed documentation hour. You routed {Math.round(accessShare * 100)}% of it to
            opening access and {Math.round((1 - accessShare) * 100)}% to protecting relief on the Align step, so the one hour is split, never
            counted twice. Each ladder below reflects its share.
          </p>
        )}
      </div>

      {/* Per priority: the SAME phased block, once each, with that priority's
          own promise line, read-only ladder, and three phases. */}
      {goals.map((goal, i) => {
        const goalDef = GOAL_CATALOG[goal];
        const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);
        return (
          <div key={goal} className="mb-12" data-testid={`section-multi-planning-priority-${goal}`}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E7E0D6]">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold text-white font-abridge"
                style={{ background: goalDef.pillBg }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
                  Priority {i + 1} of {goals.length}
                </p>
                <h2 className="text-base font-bold text-[#1A1A1A]" data-testid={`text-multi-planning-priority-title-${goal}`}>
                  {goalDef.label}
                </h2>
              </div>
            </div>

            <PlanningPriorityBlock
              setting={setting}
              baseline={baseline}
              goal={goal as PlanningGoal}
              values={values}
              combined={combined}
              crossGoalShareMultiplier={multiplierFor(goal)}
              planningLayer={planningLayerFor(planning, goal)}
              ownerName={execOwnerName}
              onChangePhaseOwner={(phase, name) => onChangePhaseOwner(goal, phase, name)}
              onChangePhaseSignalTarget={(phase, target) => onChangePhaseSignalTarget(goal, phase, target)}
              onChangePhaseSignalLabel={(phase, label) => onChangePhaseSignalLabel(goal, phase, label)}
              totalMonths={totalMonths}
              showTeach={false}
              showOwnerInputs={false}
              testIdSuffix={`-${goal}`}
            />
          </div>
        );
      })}

      <PlanningCadenceCard totalMonths={totalMonths} planCadence={planCadence} onChangePlanCadence={onChangePlanCadence} />

      <PlanningRiskCard
        partnerRisk={planning.partnerRisk ?? ""}
        onChangePartnerRisk={onChangePartnerRisk}
        placeholder={riskPlaceholderFor(null, setting)}
      />
    </div>
  );
}
