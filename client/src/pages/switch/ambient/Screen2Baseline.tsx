import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Button } from "@/components/ui/button";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface Screen2Props {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Screen2Baseline({ inputs, updateInput, onNext, onBack }: Screen2Props) {
  const [showEstimator, setShowEstimator] = useState(false);

  const hasBothInputs = inputs.providers > 0 && inputs.annualEncounters > 0;
  const hasFirstInput = inputs.providers > 0;

  const estimatedEncounters = useMemo(() => inputs.providers * 2000, [inputs.providers]);
  const encountersPerDay = useMemo(() => {
    if (!inputs.providers || !inputs.annualEncounters) return 0;
    return Math.round((inputs.annualEncounters / inputs.providers) / 220);
  }, [inputs.providers, inputs.annualEncounters]);
  const showGuardrail = inputs.providers > 0 && inputs.annualEncounters > 0 && (inputs.annualEncounters / inputs.providers) > 3500;

  return (
    <div className={`flex flex-col lg:flex-row gap-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <motion.div
        className="flex-1 max-w-[700px]"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-8" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-screen2-headline"
          >
            Your Organization
          </h1>
          <p className="text-base text-[#888888]">
            Two inputs. Benchmarks handle the rest.
          </p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-screen2-label">
              Baseline Inputs
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Physicians and APPs using ambient documentation
                </label>
                <FormattedNumberInput
                  value={inputs.providers}
                  onChange={(v) => updateInput("providers", v || 0)}
                  placeholder="50"
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-providers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Annual encounters where ambient is available
                </label>
                <FormattedNumberInput
                  value={inputs.annualEncounters}
                  onChange={(v) => {
                    updateInput("annualEncounters", v || 0);
                    updateInput("encountersEstimated", false);
                  }}
                  placeholder="100,000"
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-encounters"
                />
                <button
                  type="button"
                  onClick={() => setShowEstimator(!showEstimator)}
                  className="mt-3 cursor-pointer border-none bg-transparent text-sm text-[#888888] underline underline-offset-2"
                  data-testid="button-help-estimate"
                >
                  Help me estimate
                </button>

                {showEstimator && inputs.providers > 0 && (
                  <div className="mt-3 bg-white/80 rounded-lg p-5">
                    <p className="mb-3 text-sm text-black leading-relaxed">
                      <span className="font-bold">{inputs.providers.toLocaleString()}</span> providers &times; 2,000 typical = <span className="font-bold">{estimatedEncounters.toLocaleString()}</span>
                    </p>
                    <Button
                      onClick={() => { updateInput("annualEncounters", estimatedEncounters); updateInput("encountersEstimated", true); setShowEstimator(false); }}
                      variant="outline"
                      className="rounded-full"
                      data-testid="button-use-estimate"
                    >
                      Use {estimatedEncounters.toLocaleString()}
                    </Button>
                  </div>
                )}

                {showGuardrail && (
                  <p className="mt-2 text-sm text-[#888888]" data-testid="text-guardrail">
                    That's ~{encountersPerDay} per provider per day — want to double-check?
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <StepFooter onBack={onBack} onNext={onNext} nextLabel="See My Utilization Reality" nextDisabled={!hasBothInputs} />
      </motion.div>

      {hasFirstInput && (
        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "tween", ease: [0.25, 0.1, 0.25, 1], duration: 0.4 }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
            <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px] mb-4">
              What We'll Model
            </p>

            <div className="flex flex-col gap-3">
              {["Capacity creation", "Revenue integrity", "Workforce stability", "Risk & compliance"].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check size={16} className="text-[#EA2C00]" />
                  <span className="text-sm text-white/80">{item}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Baseline
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Providers</span>
                <span className="text-white font-semibold" data-testid="text-rail-providers">{inputs.providers > 0 ? inputs.providers.toLocaleString() : "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Encounters</span>
                <span className="text-white font-semibold" data-testid="text-rail-encounters">{inputs.annualEncounters > 0 ? inputs.annualEncounters.toLocaleString() : "\u2014"}</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-sm text-white/60 leading-relaxed">
              Most organizations at your scale have never mapped what their documentation infrastructure is actually returning. You're about to.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
