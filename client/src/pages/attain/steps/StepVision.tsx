import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { goalsForSetting, getContent } from "@/lib/attain/attainGoals";
import { getTrace } from "@/lib/attain/valueStrategy";
import type { GoalDef } from "@/lib/attain/attainTypes";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  AccessGoalArt,
  CapacityGoalArt,
  ExperienceGoalArt,
  QualityGoalArt,
  RetentionGoalArt,
  RevenueGoalArt,
} from "@/pages/hub/hubArt";

// One drawing per goal, in the hub's line-art language.
const GOAL_ART: Record<GoalId, JSX.Element> = {
  access: <AccessGoalArt />,
  retention: <RetentionGoalArt />,
  revenue: <RevenueGoalArt />,
  quality: <QualityGoalArt />,
  capacity: <CapacityGoalArt />,
  experience: <ExperienceGoalArt />,
};

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
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3" data-testid="text-step-eyebrow">
          Step 3 · What are you actually chasing?
        </p>
        <h1 className="font-abridge text-[32px] md:text-[42px] text-[#1A1A1A] leading-[1.1] mb-4" data-testid="text-step-title">
          Pick the goals
        </h1>
        <p className="text-[16px] text-[#565250] leading-relaxed max-w-[640px]" data-testid="text-step-teach">
          Pick every outcome that matters this year. Each becomes its own thread in the plan.
        </p>
      </motion.div>

      {/* Drawn tan tiles, multi-select. A chosen tile keeps a coral outline, a
          coral check in the drawing's corner, and its drawing coral (the art's
          group-aria-pressed state). The domain word is the coral line above the
          name, like the hub tiles. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="list-attain-vision-goals">
        {goals.map((g, i) => {
          const content = getContent(setting, g.id);
          const outcome = preferOutcome ? getTrace(setting, g.id)?.outcome : undefined;
          const desc = outcome ?? (content ? `${content.thesis1} ${content.thesis2}` : "");
          const isSelected = selectedGoals.includes(g.id);
          return (
            <motion.button
              key={g.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 * i }}
              onClick={() => onToggle(g.id)}
              aria-pressed={isSelected}
              className={`group relative h-full text-left flex flex-col rounded-[22px] border p-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2 ${
                isSelected
                  ? "bg-[#FDF6F2] border-[#EA2C00] ring-1 ring-[#EA2C00] shadow-[0_18px_40px_-24px_rgba(234,44,0,0.35)]"
                  : "bg-[#F6F1EA]/90 border-[#E9E0D4] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_8px_24px_-16px_rgba(26,26,26,0.10)] hover:-translate-y-1 hover:border-[#DDD2C4] hover:shadow-[0_20px_44px_-22px_rgba(26,26,26,0.24)]"
              }`}
              data-testid={`card-attain-goal-${g.id}`}
            >
              <span className={`relative block h-[118px] rounded-[15px] border px-2.5 py-2 transition-colors ${isSelected ? "bg-[#FBEDE6] border-[#F4D3C6]" : "bg-[#EFE7DC]/70 border-[#E6DCCE]"}`}>
                {GOAL_ART[g.id] ?? null}
                <span
                  className={`absolute right-2.5 top-2.5 grid place-items-center w-6 h-6 rounded-full border-[1.5px] transition-colors ${
                    isSelected ? "bg-[#EA2C00] border-[#EA2C00]" : "bg-white/80 border-[#D6CABA] group-hover:border-[#B4A896]"
                  }`}
                  data-testid={`checkbox-attain-goal-${g.id}`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </span>
              </span>
              <span className="flex flex-col flex-1 px-3 pt-4 pb-3">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#EA2C00]">{g.pill}</span>
                <span className="mt-1 text-[19px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#1A1A1A]">{g.label}</span>
                {desc && <span className="mt-3 pt-3 border-t border-[#E6DCCF] text-[13px] leading-[1.55] text-[#565250] text-pretty">{desc}</span>}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
