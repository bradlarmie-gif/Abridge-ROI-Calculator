import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const ABRIDGE_UTIL = 76;
const INDUSTRY_UTIL = 45;

export default function Screen2Baseline({ inputs, updateInput, onNext, onBack }: Screen2Props) {
  const [showEstimator, setShowEstimator] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [utilSet, setUtilSet] = useState(inputs.utilization > 0);

  const hasBothInputs = inputs.providers > 0 && inputs.annualEncounters > 0;
  const hasFirstInput = inputs.providers > 0;
  const canProceed = hasBothInputs && utilSet;

  const utilization = inputs.utilization || 0;
  const revenuePerVisit = inputs.revenuePerVisit || 200;
  const providerRate = inputs.providerRate || 150;

  const estimatedEncounters = useMemo(() => inputs.providers * 2000, [inputs.providers]);
  const encountersPerDay = useMemo(() => {
    if (!inputs.providers || !inputs.annualEncounters) return 0;
    return Math.round((inputs.annualEncounters / inputs.providers) / 220);
  }, [inputs.providers, inputs.annualEncounters]);
  const showGuardrail = inputs.providers > 0 && inputs.annualEncounters > 0 && (inputs.annualEncounters / inputs.providers) > 3500;

  const documentedEncounters = useMemo(() =>
    Math.round(inputs.annualEncounters * (utilization / 100)),
    [inputs.annualEncounters, utilization]
  );

  const abridgeDocEncounters = useMemo(() =>
    Math.round(inputs.annualEncounters * (ABRIDGE_UTIL / 100)),
    [inputs.annualEncounters]
  );

  const encounterGap = Math.max(0, abridgeDocEncounters - documentedEncounters);

  const encountersPerProviderPerDay = useMemo(() => {
    if (!inputs.providers || !inputs.annualEncounters) return 0;
    return Math.round(inputs.annualEncounters / inputs.providers / 250);
  }, [inputs.providers, inputs.annualEncounters]);

  const handleUtilChange = (val: number) => {
    updateInput("utilization", val);
    if (!utilSet) setUtilSet(true);
  };

  const utilInsight = useMemo(() => {
    if (!utilSet) return null;
    if (utilization < 45) return "Below industry average — significant headroom to benchmark.";
    if (utilization <= 75) return "At or above industry average. Room to reach Abridge benchmark.";
    return "At or above Abridge average utilization.";
  }, [utilSet, utilization]);

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
              Standard Inputs
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

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  What % of encounters use ambient documentation?
                </label>

                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={utilSet ? utilization : 0}
                    onChange={(v) => handleUtilChange(Math.min(100, Math.max(0, v)))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-utilization"
                  />
                  <span className="text-sm text-[#888888]">%</span>
                </div>

                <div className="flex items-center justify-center mt-4 gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleUtilChange(INDUSTRY_UTIL)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                      utilSet && utilization === INDUSTRY_UTIL
                        ? "bg-[#1A1A1A]/10 border-2 border-[#1A1A1A]/30 text-[#1A1A1A] font-semibold"
                        : "bg-[#F0EFED] border border-[#E5E7EB] text-[#888888] font-medium hover:bg-[#E8E5E0]"
                    }`}
                    data-testid="pill-util-industry"
                  >
                    <span className="font-bold">~45%</span>
                    <span>Industry avg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUtilChange(ABRIDGE_UTIL)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                      utilSet && utilization === ABRIDGE_UTIL
                        ? "bg-[#EA2C00]/15 border-2 border-[#EA2C00]/50 text-[#EA2C00] font-semibold"
                        : "bg-[#EA2C00]/8 border border-[#EA2C00]/25 text-[#EA2C00] font-semibold hover:bg-[#EA2C00]/15"
                    }`}
                    data-testid="pill-util-abridge"
                  >
                    <span className="font-bold">76%</span>
                    <span>Abridge avg</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#999] text-center mt-2">Based on published industry data and Abridge deployment experience.</p>

                <AnimatePresence>
                  {utilInsight && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mt-4 text-sm text-[#888888] italic leading-relaxed"
                      data-testid="text-util-insight"
                    >
                      {utilInsight}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 cursor-pointer bg-transparent border-none text-sm font-medium text-[#888888] hover:text-black transition-colors"
                data-testid="button-advanced-toggle"
              >
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200"
                  style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)' }}
                />
                Advanced inputs
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-5 mt-4 pt-4 border-t border-[#E5E7EB]">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Average revenue per visit
                        </label>
                        <p className="text-xs text-[#888888] mb-2">Average visit revenue ($). Used in capacity and revenue calculations.</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#888888]">$</span>
                          <FormattedNumberInput
                            value={revenuePerVisit}
                            onChange={(v) => updateInput("revenuePerVisit", v || 200)}
                            placeholder="200"
                            className="w-full h-12 bg-white border-[#E5E7EB]"
                            data-testid="input-revenue-per-visit"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Blended provider hourly rate
                        </label>
                        <p className="text-xs text-[#888888] mb-2">Blended hourly rate for provider time. Used in workforce calculations.</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#888888]">$</span>
                          <FormattedNumberInput
                            value={providerRate}
                            onChange={(v) => updateInput("providerRate", v || 150)}
                            placeholder="150"
                            className="w-full h-12 bg-white border-[#E5E7EB]"
                            data-testid="input-provider-rate"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <StepFooter onBack={onBack} onNext={onNext} nextLabel="See Capacity Reality →" nextDisabled={!canProceed} />
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
              Your Baseline
            </p>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Providers</span>
                <span className="text-white font-semibold" data-testid="text-rail-providers">
                  {inputs.providers > 0 ? inputs.providers.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Encounters</span>
                <span className="text-white font-semibold" data-testid="text-rail-encounters">
                  {inputs.annualEncounters > 0 ? inputs.annualEncounters.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Utilization</span>
                <span className="text-white font-semibold" data-testid="text-rail-utilization">
                  {utilSet ? `${utilization}%` : "—"}
                </span>
              </div>
            </div>

            {hasBothInputs && utilSet && (
              <>
                <div className="h-px bg-white/10 my-5" />

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Documented Encounters</p>
                    <p className="text-xl font-bold text-white leading-none" data-testid="text-rail-documented">
                      {documentedEncounters.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/30 italic mt-1">
                      {inputs.annualEncounters.toLocaleString()} × {utilization}%
                    </p>
                    {utilization < ABRIDGE_UTIL && (
                      <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                        +{encounterGap.toLocaleString()} at Abridge avg
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-white/40 mb-1">Encounters per Provider per Day</p>
                    <p className="text-lg font-bold text-white leading-none" data-testid="text-rail-epd">
                      {encountersPerProviderPerDay}
                    </p>
                    <p className="text-xs text-white/30 italic mt-1">
                      {inputs.annualEncounters.toLocaleString()} / {inputs.providers} / 250
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-5" />
                <p className="text-xs text-white/30 italic leading-relaxed">
                  Benchmarks used: Abridge avg 76% utilization. Based on production deployment data.
                </p>
              </>
            )}

            {(!hasBothInputs || !utilSet) && (
              <>
                <div className="h-px bg-white/10 my-5" />
                <p className="text-sm text-white/40 leading-relaxed">
                  {!utilSet ? "Set your utilization rate to see baseline calculations." : "Enter providers and encounters to continue."}
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
