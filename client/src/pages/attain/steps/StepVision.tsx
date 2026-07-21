import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { goalsForSetting, getContent } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

interface StepVisionProps {
  setting: AttainSetting;
  selectedGoals: GoalId[];
  onToggle: (goal: GoalId) => void;
  onNext: () => void;
}

export default function StepVision({ setting, selectedGoals, onToggle, onNext }: StepVisionProps) {
  const goals = goalsForSetting(setting);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 2 · What are you actually chasing?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Pick the goals
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          A health system rarely wants just one thing. Pick every outcome that matters this year, one or more. Most
          priorities add cleanly. The one exception: Access and Retention both draw on the same freed documentation
          hour, so if you pick both, the next page has you split that hour once instead of counting it twice.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 mb-8" data-testid="list-attain-vision-goals">
        {goals.map((g, i) => {
          const content = getContent(setting, g.id);
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
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-[#EA2C00] bg-[#EA2C00]" : "border-[#D8CFC4] bg-white"
                  }`}
                  data-testid={`checkbox-attain-goal-${g.id}`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
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

      {selectedGoals.includes("access") && selectedGoals.includes("retention") && (
        <div
          className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-8 max-w-[620px]"
          data-testid="text-attain-vision-freed-time-note"
        >
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Access + Retention, together</p>
          <p className="text-xs text-[#3A3A3A] leading-relaxed">
            Both goals price the same freed documentation hour: Access books it as new visits, Retention books it as
            protected relief. On the next pages you will set one split for that hour so it is counted once, not
            twice.
          </p>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={selectedGoals.length === 0}
        className={`h-12 px-6 font-semibold rounded-full transition-all ${
          selectedGoals.length > 0 ? "bg-black hover:bg-black/90 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
        data-testid="button-attain-vision-continue"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
