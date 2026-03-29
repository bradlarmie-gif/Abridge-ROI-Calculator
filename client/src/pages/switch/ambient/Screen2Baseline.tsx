import { useState, useMemo } from "react";
import { ChevronDown, Building2, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [showOrgProfile, setShowOrgProfile] = useState(false);
  const [utilSet, setUtilSet] = useState(inputs.utilization > 0);

  const hasBothInputs = inputs.providers > 0 && inputs.annualEncounters > 0;
  const hasFirstInput = inputs.providers > 0;
  const canProceed = hasBothInputs && utilSet && !!inputs.deploymentTenure;

  const utilization = inputs.utilization || 0;
  const revenuePerVisit = inputs.revenuePerVisit || 200;
  const conversionFactor = inputs.conversionFactor || 33;

  const estimatedEncounters = useMemo(() => inputs.providers * 2000, [inputs.providers]);
  const encountersPerDay = useMemo(() => {
    if (!inputs.providers || !inputs.annualEncounters) return 0;
    return Math.round((inputs.annualEncounters / inputs.providers) / 230);
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
    return Math.round(inputs.annualEncounters / inputs.providers / 230);
  }, [inputs.providers, inputs.annualEncounters]);

  const handleUtilChange = (val: number) => {
    updateInput("utilization", val);
    if (!utilSet) setUtilSet(true);
  };

  const utilInsight = useMemo(() => {
    if (!utilSet) return null;
    if (utilization < 45) return "Below industry average — significant headroom to benchmark.";
    if (utilization <= 75) return "At or above industry average. Room to reach observed deployment benchmark.";
    return "At or above observed deployment average.";
  }, [utilSet, utilization]);

  return (
    <div className={`flex flex-col md:flex-row gap-6 md:gap-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <motion.div
        className="flex-1 min-w-0"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-8" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-screen2-headline"
          >
            Let's build your deployment profile.
          </h1>
          <p className="text-base text-[#888888]">
            A few inputs. Everything that follows is built on what you tell us here.
          </p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-screen2-label">
              Your Deployment Profile
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <p className="text-xs text-[#888888] italic mb-5">
              All calculations use 230 clinical working days per year (accounting for PTO, CME, holidays, and non-clinical time).
            </p>

            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  How many providers are on ambient today?
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
                  How many total encounters does your practice handle per year?
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
                  What percentage of those encounters use ambient?
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

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  How long has your organization been using ambient documentation?
                </label>
                <p className="text-xs text-[#888888] italic mb-2">
                  This changes how we interpret your score and calculate what may already be sitting on the table.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: '0-6', label: 'Less than 6 months' },
                    { value: '6-12', label: '6–12 months' },
                    { value: '12-24', label: '1–2 years' },
                    { value: '24+', label: '2+ years' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateInput('deploymentTenure', value)}
                      className={`h-11 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                        inputs.deploymentTenure === value
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-white text-black border-[#E5E7EB] hover:border-[#999]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 cursor-pointer bg-transparent border-none text-sm font-medium text-[#888888] hover:text-black transition-colors"
                data-testid="button-advanced-toggle"
              >
                <Calculator size={14} />
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200"
                  style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)' }}
                />
                Financial Assumptions
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
                      <p className="text-xs text-[#888888] italic leading-relaxed -mt-1 mb-1">These defaults reflect published benchmarks. Adjust only if you have organization-specific data.</p>
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
                          CMS wRVU conversion factor
                        </label>
                        <p className="text-xs text-[#888888] mb-2">Medicare conversion factor applied to wRVU calculations. Default $33.</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#888888]">$</span>
                          <FormattedNumberInput
                            value={conversionFactor}
                            onChange={(v) => updateInput("conversionFactor", v || 33)}
                            placeholder="33"
                            className="w-full h-12 bg-white border-[#E5E7EB]"
                            data-testid="input-conversion-factor"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowOrgProfile(!showOrgProfile)}
                className="flex items-center gap-2 cursor-pointer bg-transparent border-none text-sm font-medium text-[#888888] hover:text-black transition-colors"
                data-testid="button-org-profile-toggle"
              >
                <Building2 size={14} />
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200"
                  style={{ transform: showOrgProfile ? 'rotate(180deg)' : 'rotate(0)' }}
                />
                Organization Profile
                <span className="text-xs font-normal text-[#AAAAAA] ml-1">(optional)</span>
              </button>

              <AnimatePresence>
                {showOrgProfile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-5 mt-4 pt-4 border-t border-[#E5E7EB]">
                      <p className="text-xs text-[#888888] italic leading-relaxed -mt-1 mb-1">
                        Providing organizational context helps us tailor recommendations to your specific environment.
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Number of facilities
                        </label>
                        <p className="text-xs text-[#888888] mb-2">How many hospitals or clinics in your system?</p>
                        <FormattedNumberInput
                          value={inputs.systemSize || 0}
                          onChange={(v) => updateInput("systemSize", v || 0)}
                          placeholder="e.g. 12"
                          className="w-full h-12 bg-white border-[#E5E7EB]"
                          data-testid="input-system-size"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Organization type
                        </label>
                        <p className="text-xs text-[#888888] mb-2">This helps us contextualize benchmarks for your setting.</p>
                        <Select
                          value={inputs.orgType || ""}
                          onValueChange={(v) => updateInput("orgType", v as SwitchInputs["orgType"])}
                        >
                          <SelectTrigger className="w-full h-12 bg-white border-[#E5E7EB]" data-testid="select-org-type">
                            <SelectValue placeholder="Select organization type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amc">Academic Medical Center</SelectItem>
                            <SelectItem value="community">Community Health System</SelectItem>
                            <SelectItem value="idn">Integrated Delivery Network</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          Approximate payer mix
                        </label>
                        <p className="text-xs text-[#888888] mb-3">Rough percentages — doesn't need to total exactly 100%.</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className="w-full sm:w-24 flex-shrink-0 text-sm text-[#888888]">Medicare</span>
                            <div className="flex items-center gap-3 flex-1">
                              <FormattedNumberInput
                                value={inputs.payerMixMedicare || 0}
                                onChange={(v) => updateInput("payerMixMedicare", Math.min(100, Math.max(0, v || 0)))}
                                placeholder="40"
                                className="flex-1 h-10 bg-white border-[#E5E7EB]"
                                data-testid="input-payer-medicare"
                              />
                              <span className="text-sm text-[#888888]">%</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className="w-full sm:w-24 flex-shrink-0 text-sm text-[#888888]">Medicaid</span>
                            <div className="flex items-center gap-3 flex-1">
                              <FormattedNumberInput
                                value={inputs.payerMixMedicaid || 0}
                                onChange={(v) => updateInput("payerMixMedicaid", Math.min(100, Math.max(0, v || 0)))}
                                placeholder="15"
                                className="flex-1 h-10 bg-white border-[#E5E7EB]"
                                data-testid="input-payer-medicaid"
                              />
                              <span className="text-sm text-[#888888]">%</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className="w-full sm:w-24 flex-shrink-0 text-sm text-[#888888]">Commercial</span>
                            <div className="flex items-center gap-3 flex-1">
                              <FormattedNumberInput
                                value={inputs.payerMixCommercial || 0}
                                onChange={(v) => updateInput("payerMixCommercial", Math.min(100, Math.max(0, v || 0)))}
                                placeholder="45"
                                className="flex-1 h-10 bg-white border-[#E5E7EB]"
                                data-testid="input-payer-commercial"
                              />
                              <span className="text-sm text-[#888888]">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <StepFooter onBack={onBack} onNext={onNext} nextLabel="Show Me the Domains →" nextDisabled={!canProceed} showBack={false} />
      </motion.div>

      {hasFirstInput && (
        <motion.div
          className="w-full md:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "tween", ease: [0.25, 0.1, 0.25, 1], duration: 0.4 }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 md:sticky md:top-20">
            <p className="text-xs font-medium text-white/70 uppercase tracking-[1.5px] mb-2">
              Emerging Picture
            </p>
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              This is what your deployment looks like on paper.
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
                {inputs.deploymentTenure && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Deployment</span>
                    <span className="text-white font-semibold text-xs">
                      {inputs.deploymentTenure === '0-6' ? '<6 mo' :
                       inputs.deploymentTenure === '6-12' ? '6–12 mo' :
                       inputs.deploymentTenure === '12-24' ? '1–2 yr' : '2+ yr'}
                    </span>
                  </div>
                )}
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
                        +{encounterGap.toLocaleString()} at observed avg
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-white/40 mb-1">Encounters per Provider per Day</p>
                    <p className="text-lg font-bold text-white leading-none" data-testid="text-rail-epd">
                      {encountersPerProviderPerDay}
                    </p>
                    <p className="text-xs text-white/30 italic mt-1">
                      {inputs.annualEncounters.toLocaleString()} / {inputs.providers} / 230
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-5" />
                <p className="text-xs text-white/40 italic leading-relaxed">
                  That's {documentedEncounters.toLocaleString()} documented encounters generating data. The question is what you're doing with it.
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
