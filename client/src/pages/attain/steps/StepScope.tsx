import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import type { AttainScope, AttainSetting } from "@/lib/attain/attainTypes";

const UNIT_LABEL: Record<AttainSetting, string> = {
  outpatient: "Providers",
  ed: "Providers",
  inpatient: "Hospitalists",
  nursing: "Staffed beds",
};

const SERVICE_LINE_PRESETS: Record<AttainSetting, string[]> = {
  outpatient: ["Cardiology", "Orthopedics", "Primary Care", "Endocrinology", "Gastroenterology", "Dermatology"],
  ed: ["Adult ED", "Pediatric ED", "Fast Track", "Observation Unit"],
  inpatient: ["Med-Surg", "ICU", "Cardiology", "Oncology", "General Medicine"],
  nursing: ["Med-Surg", "ICU", "Telemetry", "Oncology", "Step-down"],
};

interface StepScopeProps {
  setting: AttainSetting;
  scope: AttainScope;
  onChange: (scope: AttainScope) => void;
  onNext: () => void;
}

export default function StepScope({ setting, scope, onChange, onNext }: StepScopeProps) {
  const unitLabel = UNIT_LABEL[setting];
  const presets = SERVICE_LINE_PRESETS[setting];

  const toggleLine = (line: string) => {
    const has = scope.serviceLines.includes(line);
    onChange({
      ...scope,
      serviceLines: has ? scope.serviceLines.filter((l) => l !== line) : [...scope.serviceLines, line],
    });
  };

  const isValid = scope.unitCount > 0;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 3 · How big is this plan?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Set the scope
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          Scope is the one number that turns a generic goal into your goal: how many {unitLabel.toLowerCase()} this
          plan covers. Everything the plan targets, the visits, the margin, the departures avoided, scales off this.
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

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
        <label className="text-sm font-medium text-black block mb-2">Service lines / units (optional)</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((line) => {
            const active = scope.serviceLines.includes(line);
            return (
              <button
                key={line}
                type="button"
                onClick={() => toggleLine(line)}
                className={`px-3 py-2 rounded-md text-sm border transition-all ${
                  active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                }`}
                data-testid={`chip-service-line-${line.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {line}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[#8C8C8C] mt-2">
          Naming the specific service lines makes the plan concrete for the people who own it. Skip this if the plan
          spans the whole department.
        </p>
      </motion.div>

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
