import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/attain/attainGoals";
import { computeGoalTarget } from "@/lib/attain/attainCalc";
import { formatCurrency } from "@/lib/roi-calculator";
import type { AmbitionKey, AttainScope, AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const AMBITION_KEYS: AmbitionKey[] = ["conservative", "typical", "ambitious"];

interface StepAmbitionProps {
  setting: AttainSetting;
  goal: GoalId;
  scope: AttainScope;
  ambitionKey: AmbitionKey | null;
  onSelect: (key: AmbitionKey) => void;
  onNext: () => void;
}

export default function StepAmbition({ setting, goal, scope, ambitionKey, onSelect, onNext }: StepAmbitionProps) {
  const content = getContent(setting, goal);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 4 · How hard are you pushing?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Set the ambition
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          This sets how much of the freed capacity gets committed to the goal versus staying as relief elsewhere.
          Every figure below is computed live from your scope, using the same engine the rest of the calculator uses,
          so it always reconciles with your other numbers.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {AMBITION_KEYS.map((key, i) => {
          const target = computeGoalTarget(goal, setting, scope, key);
          const label = content?.ambition.find((a) => a.key === key)?.label ?? key;
          const isSelected = ambitionKey === key;
          return (
            <motion.button
              key={key}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(key)}
              className={`text-left rounded-xl p-5 border-2 transition-all ${
                isSelected ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white hover:border-[#D8CFC4]"
              }`}
              data-testid={`card-attain-ambition-${key}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8C8C8C]">{label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#EA2C00]" />}
              </div>
              <div className="font-abridge text-3xl text-[#EA2C00] mb-1" data-testid={`text-attain-ambition-margin-${key}`}>
                {formatCurrency(target.margin)}
              </div>
              <p className="text-xs text-[#3A3A3A] leading-relaxed">{target.label}</p>
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-[#8C8C8C] mb-8 max-w-[560px]">
        Typical is the middle of the road: it assumes the fragile middle of the chain converts about as well as an
        average deployment. Ambitious assumes it's actively steered every month.
      </p>

      <Button
        onClick={onNext}
        disabled={!ambitionKey}
        className={`h-12 px-6 font-semibold rounded-full transition-all ${
          ambitionKey ? "bg-black hover:bg-black/90 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
        data-testid="button-attain-ambition-continue"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
