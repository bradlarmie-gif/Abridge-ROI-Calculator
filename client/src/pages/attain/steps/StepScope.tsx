import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import type { AttainScope, AttainSetting, SettingGoalContent } from "@/lib/attain/attainTypes";

const UNIT_LABEL: Record<AttainSetting, string> = {
  outpatient: "Providers",
  ed: "Providers",
  inpatient: "Hospitalists",
  nursing: "Staffed beds",
};

interface StepScopeProps {
  setting: AttainSetting;
  scope: AttainScope;
  onChange: (scope: AttainScope) => void;
  content: SettingGoalContent | undefined;
  overrides: Record<number, string>;
  onChangeOverride: (index: number, value: string) => void;
  onNext: () => void;
}

/**
 * "Your starting point" — the scope of the plan (how many units it covers)
 * plus a light snapshot of current reality, folded in from what used to be
 * a separate "confirm the baseline" step. Which specific service lines are
 * in scope is now a decision made on the Build the Case step (a "lines"
 * lever), not collected twice here.
 */
export default function StepScope({ setting, scope, onChange, content, overrides, onChangeOverride, onNext }: StepScopeProps) {
  const unitLabel = UNIT_LABEL[setting];
  const isValid = scope.unitCount > 0;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 3 · Where are you starting from?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Your starting point
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          Every decision on the next page is measured as a move away from where you already are. Set how many{" "}
          {unitLabel.toLowerCase()} this plan covers, and confirm the handful of numbers that describe today, so
          "adds ~$X" always means added on top of reality, not invented from nothing.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-[#F5F0EB] rounded-xl p-6 mb-6">
        <label className="text-sm font-medium text-black block mb-2" htmlFor="attain-unit-count">
          {unitLabel} in scope
        </label>
        <NumberField
          id="attain-unit-count"
          value={scope.unitCount}
          onValueChange={(v) => onChange({ ...scope, unitCount: v })}
          min={0}
          decimal={false}
          className="h-12 w-full max-w-[220px] rounded-md border border-[#E5E5E5] bg-white px-3 text-base"
          placeholder="e.g., 40"
          data-testid="input-attain-unit-count"
        />
        <p className="text-xs text-[#8C8C8C] mt-2">
          {setting === "nursing"
            ? "Staffed beds across the units in scope."
            : `Full-time equivalent ${unitLabel.toLowerCase()} whose documentation this plan covers.`}
        </p>
      </motion.div>

      {content && content.worldCards.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <label className="text-sm font-medium text-black block mb-2">Where things stand today</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.worldCards.map((card, i) => (
              <div key={card.k} className="bg-[#F4F0EA] rounded-lg p-5" data-testid={`card-attain-scope-world-${i}`}>
                <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] mb-2">{card.k}</p>
                <input
                  type="text"
                  value={overrides[i] ?? card.n}
                  onChange={(e) => onChangeOverride(i, e.target.value)}
                  className={`font-abridge text-2xl bg-transparent border-b border-dashed border-[#D8CFC4] focus:border-[#EA2C00] outline-none w-full ${card.coral ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}
                  data-testid={`input-attain-scope-baseline-${i}`}
                />
                <p className="text-[9px] text-[#8C8C8C] mt-2">{card.f}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8C8C8C] mt-2 max-w-[560px]">
            These prefill with typical benchmarks for this setting and goal. Edit any of them with your organization's
            real numbers, or leave them as illustrative defaults and move on, either way the plan renders.
          </p>
        </motion.div>
      )}

      <Button
        onClick={onNext}
        disabled={!isValid}
        className={`h-12 px-6 font-semibold rounded-full transition-all ${
          isValid ? "bg-black hover:bg-black/90 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
        data-testid="button-attain-scope-continue"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
