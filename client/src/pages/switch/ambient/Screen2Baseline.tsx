import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { DS } from "./designTokens";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
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
    <div className={`flex flex-col lg:flex-row gap-8 font-[Manrope,sans-serif] ${STEP_FOOTER_SPACER_CLASS}`}>
      <motion.div
        className="flex-1 max-w-[380px] pt-[72px] pb-20"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.p
          variants={staggerItem}
          className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-3"
          data-testid="text-screen2-label"
        >
          Your Organization
        </motion.p>
        <motion.h1
          variants={staggerItem}
          className="mb-4 hidden md:block text-[44px] font-bold leading-[1.15] text-[#1A1A1A]"
          data-testid="text-screen2-headline"
        >
          Let's establish your baseline.
        </motion.h1>
        <motion.h1
          variants={staggerItem}
          className="mb-4 block md:hidden text-[32px] font-bold leading-[1.15] text-[#1A1A1A]"
        >
          Let's establish your baseline.
        </motion.h1>
        <motion.p variants={staggerItem} className="mb-10 text-[15px] leading-relaxed text-[#4B4B4B]">
          Two inputs. Benchmarks handle the rest.
        </motion.p>

        <motion.div variants={staggerItem} className="flex flex-col gap-7">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#4B4B4B]">
              Physicians and APPs using ambient documentation
            </p>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              placeholder="50"
              className="w-full rounded-lg border border-[#E8E0D8] bg-white px-4 py-3.5 text-lg font-semibold text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00]"
              data-testid="input-providers"
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#4B4B4B]">
              Annual encounters where ambient is available
            </p>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => {
                updateInput("annualEncounters", v || 0);
                updateInput("encountersEstimated", false);
              }}
              placeholder="100,000"
              className="w-full rounded-lg border border-[#E8E0D8] bg-white px-4 py-3.5 text-lg font-semibold text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00]"
              data-testid="input-encounters"
            />
            <button
              type="button"
              onClick={() => setShowEstimator(!showEstimator)}
              className="mt-3 cursor-pointer border-none bg-transparent text-[13px] font-medium text-[#9B9B9B] underline underline-offset-2"
              data-testid="button-help-estimate"
            >
              Help me estimate
            </button>
            {showEstimator && inputs.providers > 0 && (
              <div className="mt-3 rounded-xl border border-[#E8E0D8] bg-[#F5F0EB] p-5">
                <p className="mb-3 text-[15px] leading-relaxed text-[#4B4B4B]">
                  <span className="font-bold text-[#1A1A1A]">{inputs.providers.toLocaleString()}</span> providers &times; 2,000 typical = <span className="font-bold text-[#1A1A1A]">{estimatedEncounters.toLocaleString()}</span>
                </p>
                <button
                  type="button"
                  onClick={() => { updateInput("annualEncounters", estimatedEncounters); updateInput("encountersEstimated", true); setShowEstimator(false); }}
                  className="rounded-full border border-[#1A1A1A] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A]"
                  data-testid="button-use-estimate"
                >
                  Use {estimatedEncounters.toLocaleString()}
                </button>
              </div>
            )}
            {showGuardrail && (
              <p className="mt-2 text-[13px] text-[#9B9B9B]" data-testid="text-guardrail">
                That's ~{encountersPerDay} per provider per day — want to double-check?
              </p>
            )}
          </div>
        </motion.div>

        <StepFooter onBack={onBack} onNext={onNext} nextLabel="See My Utilization Reality" nextDisabled={!hasBothInputs} />
      </motion.div>

      {hasFirstInput && (
        <motion.div
          className="hidden lg:block w-[300px] shrink-0 pt-[72px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "tween", ease: [0.25, 0.1, 0.25, 1], duration: 0.4 }}
        >
          <div className="sticky top-24 flex flex-col gap-4">
            <div className="rounded-xl border border-[#E8E0D8] bg-[#F5F0EB] p-6">
              <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-4">
                What We'll Model
              </p>
              <div className="flex flex-col gap-3">
                {["Capacity creation", "Revenue integrity", "Workforce stability", "Risk & compliance"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check size={16} className="text-[#EA2C00]" />
                    <span className="text-[15px] text-[#4B4B4B]">{item}</span>
                  </div>
                ))}
              </div>
              <div className="my-5 h-px bg-[#E8E0D8]" />
              <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-3">
                Baseline
              </p>
              <div className="flex flex-col gap-2 text-[15px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[13px] text-[#9B9B9B]">Providers</span>
                  <span className="text-[15px] font-bold text-[#1A1A1A]" data-testid="text-rail-providers">{inputs.providers > 0 ? inputs.providers.toLocaleString() : "\u2014"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[13px] text-[#9B9B9B]">Encounters</span>
                  <span className="text-[15px] font-bold text-[#1A1A1A]" data-testid="text-rail-encounters">{inputs.annualEncounters > 0 ? inputs.annualEncounters.toLocaleString() : "\u2014"}</span>
                </div>
              </div>

              <div className="mt-5">
                <div className="bg-[#1A1A1A] rounded-xl p-5">
                  <p className="text-[15px] leading-[1.7] text-white">
                    Most organizations at your scale have never mapped what their documentation infrastructure is actually returning. You're about to.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
