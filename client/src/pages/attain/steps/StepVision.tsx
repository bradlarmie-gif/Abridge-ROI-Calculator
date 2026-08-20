import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { goalsForSetting, getContent } from "@/lib/attain/attainGoals";
import { getTrace } from "@/lib/attain/valueStrategy";
import type { GoalDef } from "@/lib/attain/attainTypes";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

interface StepVisionProps {
  setting: AttainSetting;
  selectedGoals: GoalId[];
  onToggle: (goal: GoalId) => void;
  /** The goals to offer. Defaults to every goal the setting matrix defines. The
   * older CONTENT-driven consult flow (AttainFlow) passes a filtered subset —
   * only goals it has full SettingGoalContent for — so it never offers a goal
   * (e.g. Inpatient Capacity) that only the cell-driven v2 funnel can render. */
  goals?: GoalDef[];
  /** Value Attainment Strategy: describe each goal by its backward-trace outcome
   * (the strategy framing) rather than the dollar thesis. */
  preferOutcome?: boolean;
}

export default function StepVision({ setting, selectedGoals, onToggle, goals: goalsOverride, preferOutcome }: StepVisionProps) {
  const goals = goalsOverride ?? goalsForSetting(setting);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 3 · What are you actually chasing?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge tracking-tight" data-testid="text-step-title">
          Pick the goals
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          A health system rarely wants just one thing. Pick every outcome that matters this year, one or more. Each
          becomes its own thread through the strategy, traced back to what has to be true for it to happen.
        </p>
      </motion.div>

      {/* Editorial rows, pill as an eyebrow, checkbox on the right, coral bar on
          a selected row. Same affordance language as the Align/Plan option rows. */}
      <div className="border-t border-[#E8E2DA] divide-y divide-[#E8E2DA] mb-8 max-w-[720px]" data-testid="list-attain-vision-goals">
        {goals.map((g, i) => {
          const content = getContent(setting, g.id);
          const outcome = preferOutcome ? getTrace(setting, g.id)?.outcome : undefined;
          const isSelected = selectedGoals.includes(g.id);
          return (
            <motion.button
              key={g.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onToggle(g.id)}
              aria-pressed={isSelected}
              className="group relative w-full text-left flex items-start justify-between gap-4 pl-4 pr-3 py-4 hover:bg-[#FBF9F5] hover:pl-5 transition-all"
              data-testid={`card-attain-goal-${g.id}`}
            >
              {isSelected && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" aria-hidden />}
              <div className="min-w-0">
                {/* Strategy flow uses one restrained neutral pill so coral stays
                    reserved for money/actions; the dollar flow keeps its domain color. */}
                <span
                  className={`inline-block text-[9px] font-bold uppercase tracking-[1.5px] px-2.5 py-0.5 rounded-full ${preferOutcome ? "text-[#8C8073] bg-[#F2EFEA]" : "text-white"}`}
                  style={preferOutcome ? undefined : { background: g.pillBg }}
                >
                  {g.pill}
                </span>
                <h3 className={`text-[17px] leading-snug mt-2 ${isSelected ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>
                  {g.label}
                </h3>
                {outcome ? (
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[520px]">{outcome}</p>
                ) : content ? (
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[520px]">
                    {content.thesis1} {content.thesis2}
                  </p>
                ) : null}
              </div>
              <span
                className={`mt-1 flex-shrink-0 grid place-items-center w-[18px] h-[18px] rounded-[5px] border-[1.5px] transition-colors ${
                  isSelected ? "bg-[#EA2C00] border-[#EA2C00]" : "border-[#CFC6B8] bg-white group-hover:border-[#B4A896]"
                }`}
                data-testid={`checkbox-attain-goal-${g.id}`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
            </motion.button>
          );
        })}
      </div>

    </div>
  );
}
