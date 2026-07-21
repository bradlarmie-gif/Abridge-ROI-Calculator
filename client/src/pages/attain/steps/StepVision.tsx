import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { goalsForSetting, getContent } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

interface StepVisionProps {
  setting: AttainSetting;
  selectedGoal: GoalId | null;
  onSelect: (goal: GoalId) => void;
  onNext: () => void;
}

export default function StepVision({ setting, selectedGoal, onSelect, onNext }: StepVisionProps) {
  const goals = goalsForSetting(setting);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 2 · What are you actually chasing?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Pick the goal
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          A plan built around one goal is a plan someone can actually steer. Pick the outcome that matters most this
          year. Everything downstream, the chain, the owners, the curve, is built around this choice.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {goals.map((g, i) => {
          const content = getContent(setting, g.id);
          const isSelected = selectedGoal === g.id;
          return (
            <motion.button
              key={g.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(g.id)}
              className={`text-left rounded-xl p-5 border-2 transition-all ${
                isSelected ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white hover:border-[#D8CFC4]"
              }`}
              data-testid={`card-attain-goal-${g.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
                  style={{ background: g.pillBg }}
                >
                  {g.pill}
                </span>
                {isSelected && <Check className="w-5 h-5 text-[#EA2C00]" />}
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{g.label}</h3>
              <p className="text-xs text-[#8C8C8C] mb-2">{g.domainSub}</p>
              {content && (
                <p className="text-sm text-[#3A3A3A] leading-relaxed">
                  {content.thesis1} {content.thesis2}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      <Button
        onClick={onNext}
        disabled={!selectedGoal}
        className={`h-12 px-6 font-semibold rounded-full transition-all ${
          selectedGoal ? "bg-black hover:bg-black/90 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
        data-testid="button-attain-vision-continue"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
