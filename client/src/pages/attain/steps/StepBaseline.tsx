import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { SettingGoalContent } from "@/lib/attain/attainTypes";

interface StepBaselineProps {
  content: SettingGoalContent | undefined;
  overrides: Record<number, string>;
  onChangeOverride: (index: number, value: string) => void;
  onNext: () => void;
}

export default function StepBaseline({ content, overrides, onChangeOverride, onNext }: StepBaselineProps) {
  if (!content) {
    return (
      <div>
        <p className="text-sm text-[#888888] italic mb-8">No baseline content available for this combination yet.</p>
        <Button onClick={onNext} className="h-12 px-6 font-semibold rounded-full bg-black hover:bg-black/90 text-white" data-testid="button-attain-baseline-continue">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 6 · Where you're starting from
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Confirm the baseline
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          {content.p1Lead}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {content.worldCards.map((card, i) => (
          <motion.div
            key={card.k}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="bg-[#F4F0EA] rounded-lg p-5"
          >
            <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] mb-2">{card.k}</p>
            <input
              type="text"
              value={overrides[i] ?? card.n}
              onChange={(e) => onChangeOverride(i, e.target.value)}
              className={`font-abridge text-2xl bg-transparent border-b border-dashed border-[#D8CFC4] focus:border-[#EA2C00] outline-none w-full ${card.coral ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}
              data-testid={`input-attain-baseline-${i}`}
            />
            <p className="text-[9px] text-[#8C8C8C] mt-2">{card.f}</p>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-[#8C8C8C] mb-8 max-w-[560px]">
        These prefill with typical benchmarks for this setting and goal. Edit any of them with your organization's
        real numbers, or leave them as illustrative defaults and skip ahead, either way the plan renders.
      </p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#F5F0EB] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-8 max-w-[620px]">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The opportunity, in one line</p>
        <p className="text-xs text-[#3A3A3A] leading-relaxed">{content.opportunity}</p>
      </motion.div>

      <Button onClick={onNext} className="h-12 px-6 font-semibold rounded-full bg-black hover:bg-black/90 text-white" data-testid="button-attain-baseline-continue">
        Continue to your plan
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
