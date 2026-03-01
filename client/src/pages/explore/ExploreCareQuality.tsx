import { useState, useMemo } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimeDriverInputs } from "./ExploreFlow";

interface ExploreCareQualityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  timeDriverInputs: TimeDriverInputs;
  updateTimeDriverInputs: (updates: Partial<TimeDriverInputs>) => void;
  totalHoursSaved: number;
  timeValue: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreCareQuality({
  state,
  updateState,
  timeDriverInputs,
  updateTimeDriverInputs,
  totalHoursSaved,
  timeValue,
  onNext,
  onBack,
  onHome,
}: ExploreCareQualityProps) {
  const { docQualityInputs } = state;

  const updateDocQualityInputs = (updates: Partial<typeof docQualityInputs>) => {
    updateState({
      docQualityInputs: { ...docQualityInputs, ...updates },
    });
  };

  const [hapiExpanded, setHapiExpanded] = useState(true);
  const [fallsExpanded, setFallsExpanded] = useState(true);
  const [hcahpsExpanded, setHcahpsExpanded] = useState(true);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  const patientDaysPerYear = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const careTimeEffectiveness = useMemo(() => {
    const carePercent = timeDriverInputs.nursingCareTimePercent / 100;
    return 0.30 + (carePercent * 0.70);
  }, [timeDriverInputs.nursingCareTimePercent]);

  const hapisPerYear = useMemo(() => {
    return (patientDaysPerYear / 1000) * docQualityInputs.nursingHapiRate;
  }, [patientDaysPerYear, docQualityInputs.nursingHapiRate]);

  const hapisPrevented = useMemo(() => {
    return hapisPerYear * (docQualityInputs.nursingHapiPreventionRate / 100) * careTimeEffectiveness;
  }, [hapisPerYear, docQualityInputs.nursingHapiPreventionRate, careTimeEffectiveness]);

  const hapiValue = useMemo(() => {
    return hapisPrevented * docQualityInputs.nursingHapiCost;
  }, [hapisPrevented, docQualityInputs.nursingHapiCost]);

  const fallsPerYear = useMemo(() => {
    return (patientDaysPerYear / 1000) * docQualityInputs.nursingFallsRate;
  }, [patientDaysPerYear, docQualityInputs.nursingFallsRate]);

  const fallsPrevented = useMemo(() => {
    return fallsPerYear * (docQualityInputs.nursingFallsPreventionRate / 100) * careTimeEffectiveness;
  }, [fallsPerYear, docQualityInputs.nursingFallsPreventionRate, careTimeEffectiveness]);

  const fallsValue = useMemo(() => {
    return fallsPrevented * docQualityInputs.nursingFallsCost;
  }, [fallsPrevented, docQualityInputs.nursingFallsCost]);

  const totalPotentialValue = useMemo(() => {
    return (docQualityInputs.nursingHapiEnabled ? hapiValue : 0) +
           (docQualityInputs.nursingFallsEnabled ? fallsValue : 0);
  }, [docQualityInputs.nursingHapiEnabled, hapiValue, docQualityInputs.nursingFallsEnabled, fallsValue]);

  const carePerNurseWeek = useMemo(() => {
    const careTimePercent = timeDriverInputs.nursingCareTimePercent / 100;
    const careTimeHours = totalHoursSaved * careTimePercent;
    if (state.numberOfProviders <= 0) return 0;
    return careTimeHours / state.numberOfProviders / 52;
  }, [totalHoursSaved, timeDriverInputs.nursingCareTimePercent, state.numberOfProviders]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={7}
        stepName="Care Quality"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 max-w-[700px]">
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
                Care Quality
              </h1>
              <p className="text-base text-[#888888]">
                Complete nursing documentation supports better outcomes and reduces adverse events.
              </p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                HOW TO USE THIS SECTION
              </p>
              <p className="text-sm text-black mb-2">
                The link between documentation and outcomes is indirect—we don't cause fewer falls, we enable the visibility that helps prevent them.
              </p>
              <p className="text-sm text-[#888888]">
                We show these as potential value because clinical practice matters more than documentation alone. This value is real, just harder to attribute directly to Abridge.
              </p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  CARE QUALITY POTENTIAL
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />
              </div>

              {/* Driver 1: HAPI Prevention */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingHapiEnabled
                      ? (hapiExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">HAPI Prevention</p>
                        <span className="text-[10px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Real-time documentation enables earlier intervention</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingHapiEnabled && (
                        <button
                          onClick={() => setHapiExpanded(!hapiExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {hapiExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#888888]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#888888]" />
                          )}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingHapiEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingHapiEnabled: checked });
                          if (checked) setHapiExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-hapi"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingHapiEnabled && hapiExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          HAPIs happen when assessments are missed or interventions are delayed. Real-time documentation ensures skin assessments, turning schedules, and risk factors are captured as they're observed—enabling earlier intervention.
                        </p>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: CURRENT HAPI VOLUME</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Patient Days/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {formatNumber(Math.round(patientDaysPerYear))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">HAPI Rate per 1,000</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingHapiRate}
                              onChange={(v: number) => updateDocQualityInputs({ nursingHapiRate: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-hapi-rate"
                            />
                            <p className="text-xs text-[#888888]">National: 2-5%</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">HAPIs/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {hapisPerYear.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Prevention Rate %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingHapiPreventionRate}
                                onChange={(v: number) => updateDocQualityInputs({ nursingHapiPreventionRate: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-hapi-prevention-rate"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">5% is conservative—represents cases where real-time documentation would have triggered earlier intervention.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Cost per HAPI $</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={docQualityInputs.nursingHapiCost}
                                onChange={(v: number) => updateDocQualityInputs({ nursingHapiCost: v })}
                                className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                data-testid="input-hapi-cost"
                              />
                            </div>
                            <p className="text-xs text-[#888888]">CMS: $20k-$70k depending on stage. We use $25K as a conservative blended average.</p>
                          </div>
                        </div>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">HAPIs/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{hapisPerYear.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Prevention rate</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingHapiPreventionRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Care time effectiveness</span>
                              <span className="font-semibold text-black flex-shrink-0">{(careTimeEffectiveness * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= HAPIs prevented</span>
                              <span className="font-semibold text-black flex-shrink-0">{hapisPrevented.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Cost per HAPI</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingHapiCost)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential HAPI Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(hapiValue)}</span>
                            </div>
                          </div>

                          <div className="mt-4 bg-white/60 rounded-lg p-3">
                            <p className="text-xs text-[#888888]">
                              Care time effectiveness ({(careTimeEffectiveness * 100).toFixed(0)}%) reflects how care time allocation from the Value Drivers page amplifies prevention. More bedside time = better assessment and intervention.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver 2: Falls Prevention */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingFallsEnabled
                      ? (fallsExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">Falls Prevention</p>
                        <span className="text-[10px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Comprehensive documentation supports fall risk assessment</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingFallsEnabled && (
                        <button
                          onClick={() => setFallsExpanded(!fallsExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {fallsExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#888888]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#888888]" />
                          )}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingFallsEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingFallsEnabled: checked });
                          if (checked) setFallsExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-falls"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingFallsEnabled && fallsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          Falls happen when risk factors aren't properly assessed or communicated. Real-time documentation ensures fall risk assessments, mobility status, and interventions are captured as they're observed—enabling better prevention protocols.
                        </p>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: CURRENT FALLS VOLUME</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Patient Days/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {formatNumber(Math.round(patientDaysPerYear))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Falls Rate per 1,000</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingFallsRate}
                              onChange={(v: number) => updateDocQualityInputs({ nursingFallsRate: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-falls-rate"
                            />
                            <p className="text-xs text-[#888888]">National: 3-5 per 1,000 patient days</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Falls/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {fallsPerYear.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Prevention Rate %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingFallsPreventionRate}
                                onChange={(v: number) => updateDocQualityInputs({ nursingFallsPreventionRate: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-falls-prevention-rate"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">5% is conservative—represents cases where real-time documentation would have triggered earlier intervention.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Cost per Fall $</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={docQualityInputs.nursingFallsCost}
                                onChange={(v: number) => updateDocQualityInputs({ nursingFallsCost: v })}
                                className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                data-testid="input-falls-cost"
                              />
                            </div>
                            <p className="text-xs text-[#888888]">Blended average across severity. No injury: $3-5K, Minor: $5-8K, Major: $15-30K</p>
                          </div>
                        </div>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">Falls/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{fallsPerYear.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Prevention rate</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingFallsPreventionRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Care time effectiveness</span>
                              <span className="font-semibold text-black flex-shrink-0">{(careTimeEffectiveness * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Falls prevented</span>
                              <span className="font-semibold text-black flex-shrink-0">{fallsPrevented.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Cost per fall</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingFallsCost)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential Falls Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(fallsValue)}</span>
                            </div>
                          </div>

                          <div className="mt-4 bg-white/60 rounded-lg p-3">
                            <p className="text-xs text-[#888888]">
                              Care time effectiveness ({(careTimeEffectiveness * 100).toFixed(0)}%) reflects how care time allocation from the Value Drivers page amplifies prevention. More bedside time = better assessment and intervention.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver 3: Patient Experience (HCAHPS) */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingHcahpsEnabled
                      ? (hcahpsExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">Patient Experience (HCAHPS)</p>
                        <span className="text-[10px] font-medium text-[#888888] bg-[#F0F0F0] px-2 py-0.5 rounded uppercase">
                          QUALITATIVE
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">More bedside time correlates with better satisfaction</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingHcahpsEnabled && (
                        <button
                          onClick={() => setHcahpsExpanded(!hcahpsExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {hcahpsExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#888888]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#888888]" />
                          )}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingHcahpsEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingHcahpsEnabled: checked });
                          if (checked) setHcahpsExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-hcahps"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingHcahpsEnabled && hcahpsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE CONNECTION</p>
                        <p className="text-sm text-black mb-6">
                          When nurses spend less time on documentation, they spend more time with patients. Research consistently shows bedside time correlates with patient satisfaction.
                        </p>

                        <div className="bg-[#F5F0EB] rounded-lg p-6 text-center mb-6">
                          <p className="text-3xl font-bold text-[#EA2C00]">
                            {carePerNurseWeek.toFixed(1)}
                          </p>
                          <p className="text-sm text-[#888888] mt-1">
                            hours at bedside per nurse per week
                          </p>
                        </div>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">WE DON'T CALCULATE THIS</p>
                        <p className="text-sm text-black mb-4">
                          HCAHPS scores are influenced by dozens of factors—wait times, pain management, communication, environment, and more. We can't credibly attribute HCAHPS improvement to documentation alone.
                        </p>

                        <div className="bg-[#F5F0EB]/60 rounded-lg p-4 mb-4">
                          <p className="text-sm text-[#666666]">
                            But consider: Hospitals in the top quartile of HCAHPS receive ~2% higher reimbursement through Value-Based Purchasing. Even small improvements matter.
                          </p>
                        </div>

                        <p className="text-xs text-[#888888]">
                          Track HCAHPS as a leading indicator after implementation.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-2 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                className="w-full bg-[#EA2C00] hover:bg-[#D02800] text-white"
                onClick={onNext}
                data-testid="button-continue-investment-mobile"
              >
                Continue to Investment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel */}
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-lg p-6 lg:sticky lg:top-[100px]">
              <div className="mb-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
                  YOUR MODEL SO FAR
                </p>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              <div className="mb-4">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                  CARE QUALITY POTENTIAL
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingHapiEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">HAPI Prevention</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingHapiEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingHapiEnabled ? formatCurrency(hapiValue) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingFallsEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">Falls Prevention</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingFallsEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingFallsEnabled ? formatCurrency(fallsValue) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#444444]" />
                        <span className="text-sm text-[#888888]">HCAHPS</span>
                      </div>
                      <span className="text-sm font-semibold text-[#666666]">—</span>
                    </div>
                    <p className="text-xs text-[#666666] ml-4 mt-0.5">(qualitative)</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              <div className="mb-4">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  TIME SAVINGS VALUE
                </p>
                <p className="text-2xl font-bold text-[#EA2C00]">
                  {formatCurrency(timeValue)}
                </p>
                <p className="text-xs text-[#666666] mt-1">Hard value from efficiency gains</p>
              </div>

              <div className="bg-[#2A2A2A] rounded-lg p-4 mb-4">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  + POTENTIAL VALUE
                </p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(totalPotentialValue)}
                </p>
                <p className="text-xs text-[#666666] mt-1">Harder to attribute to documentation</p>
              </div>

              <div className="hidden lg:block">
              <div className="h-px bg-[#333333] my-4" />

              <p className="text-xs text-[#666666] mb-4">
                Time savings are conservative. Potential value requires clinical practice changes.
              </p>

              <Button
                className="w-full bg-[#EA2C00] hover:bg-[#D02800] text-white"
                onClick={onNext}
                data-testid="button-continue-investment"
              >
                Continue to Investment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
