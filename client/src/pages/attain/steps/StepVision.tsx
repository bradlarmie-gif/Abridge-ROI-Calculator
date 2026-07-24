import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { goalsForSetting, getContent } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

interface StepVisionProps {
  setting: AttainSetting;
  selectedGoals: GoalId[];
  onToggle: (goal: GoalId) => void;
}

export default function StepVision({ setting, selectedGoals, onToggle }: StepVisionProps) {
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

      {/* Editorial rows, pill as an eyebrow, checkbox on the right, coral bar on
          a selected row. Same affordance language as the Align/Plan option rows. */}
      <div className="border-t border-[#EFEAE1] mb-8 max-w-[720px]" data-testid="list-attain-vision-goals">
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
              className="group relative w-full text-left flex items-start justify-between gap-4 pl-4 pr-3 py-4 border-b border-[#EFEAE1] hover:bg-[#F2EDE5] transition-colors"
              data-testid={`card-attain-goal-${g.id}`}
            >
              {isSelected && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" aria-hidden />}
              <div className="min-w-0">
                <span
                  className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-2.5 py-0.5 rounded-full"
                  style={{ background: g.pillBg }}
                >
                  {g.pill}
                </span>
                <h3 className={`text-[17px] leading-snug mt-2 ${isSelected ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>
                  {g.label}
                </h3>
                {content && (
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[520px]">
                    {content.thesis1} {content.thesis2}
                  </p>
                )}
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
    </div>
  );
}
