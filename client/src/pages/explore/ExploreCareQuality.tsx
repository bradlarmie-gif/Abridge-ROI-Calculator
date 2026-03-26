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
  const [hacExpanded, setHacExpanded] = useState(true);
  const [hcahpsExpanded, setHcahpsExpanded] = useState(true);
  const [cautiExpanded, setCautiExpanded] = useState(true);
  const [clabsiExpanded, setClabsiExpanded] = useState(true);
  const [sepsisExpanded, setSepsisExpanded] = useState(true);
  const [vapExpanded, setVapExpanded] = useState(true);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  const patientDaysPerYear = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const hapisPerYear = useMemo(() => {
    return (patientDaysPerYear / 1000) * docQualityInputs.nursingHapiRate;
  }, [patientDaysPerYear, docQualityInputs.nursingHapiRate]);

  const hapisPrevented = useMemo(() => {
    return hapisPerYear * (docQualityInputs.nursingHapiPreventionRate / 100);
  }, [hapisPerYear, docQualityInputs.nursingHapiPreventionRate]);

  const hapiValue = useMemo(() => {
    return hapisPrevented * docQualityInputs.nursingHapiCost;
  }, [hapisPrevented, docQualityInputs.nursingHapiCost]);

  const fallsPerYear = useMemo(() => {
    return (patientDaysPerYear / 1000) * docQualityInputs.nursingFallsRate;
  }, [patientDaysPerYear, docQualityInputs.nursingFallsRate]);

  const fallsPrevented = useMemo(() => {
    return fallsPerYear * (docQualityInputs.nursingFallsPreventionRate / 100);
  }, [fallsPerYear, docQualityInputs.nursingFallsPreventionRate]);

  const fallsValue = useMemo(() => {
    return fallsPrevented * docQualityInputs.nursingFallsCost;
  }, [fallsPrevented, docQualityInputs.nursingFallsCost]);

  const hacPenalty = useMemo(() => {
    if (!docQualityInputs.nursingHacBottomQuartile) return 0;
    return docQualityInputs.nursingHacMedicareRevenue * 0.01;
  }, [docQualityInputs.nursingHacBottomQuartile, docQualityInputs.nursingHacMedicareRevenue]);

  const hacValue = useMemo(() => {
    return hacPenalty * (docQualityInputs.nursingHacAbridgeAttribution / 100) * (docQualityInputs.nursingHacRealization / 100);
  }, [hacPenalty, docQualityInputs.nursingHacAbridgeAttribution, docQualityInputs.nursingHacRealization]);

  const catheterDays = useMemo(() => {
    return patientDaysPerYear * (docQualityInputs.nursingCautiUtilizationRatio / 100);
  }, [patientDaysPerYear, docQualityInputs.nursingCautiUtilizationRatio]);

  const cautiPerYear = useMemo(() => {
    return (catheterDays / 1000) * docQualityInputs.nursingCautiRate;
  }, [catheterDays, docQualityInputs.nursingCautiRate]);

  const cautiPrevented = useMemo(() => {
    return cautiPerYear * (docQualityInputs.nursingCautiPreventionRate / 100);
  }, [cautiPerYear, docQualityInputs.nursingCautiPreventionRate]);

  const cautiValue = useMemo(() => {
    return cautiPrevented * docQualityInputs.nursingCautiCost;
  }, [cautiPrevented, docQualityInputs.nursingCautiCost]);

  const centralLineDays = useMemo(() => {
    return patientDaysPerYear * (docQualityInputs.nursingClabsiUtilizationRatio / 100);
  }, [patientDaysPerYear, docQualityInputs.nursingClabsiUtilizationRatio]);

  const clabsiPerYear = useMemo(() => {
    return (centralLineDays / 1000) * docQualityInputs.nursingClabsiRate;
  }, [centralLineDays, docQualityInputs.nursingClabsiRate]);

  const clabsiPrevented = useMemo(() => {
    return clabsiPerYear * (docQualityInputs.nursingClabsiPreventionRate / 100);
  }, [clabsiPerYear, docQualityInputs.nursingClabsiPreventionRate]);

  const clabsiValue = useMemo(() => {
    return clabsiPrevented * docQualityInputs.nursingClabsiCost;
  }, [clabsiPrevented, docQualityInputs.nursingClabsiCost]);

  const sepsisVolume = useMemo(() => {
    return (patientDaysPerYear / 1000) * docQualityInputs.nursingSepsisRatePerThousand;
  }, [patientDaysPerYear, docQualityInputs.nursingSepsisRatePerThousand]);

  const sepsisValue = useMemo(() => {
    return sepsisVolume * (docQualityInputs.nursingSepsisComplianceImprovement / 100) * docQualityInputs.nursingSepsisLosReduction * docQualityInputs.nursingSepsisDailyCost * (docQualityInputs.nursingSepsisRealization / 100);
  }, [sepsisVolume, docQualityInputs.nursingSepsisComplianceImprovement, docQualityInputs.nursingSepsisLosReduction, docQualityInputs.nursingSepsisDailyCost, docQualityInputs.nursingSepsisRealization]);

  const ventDays = useMemo(() => {
    return patientDaysPerYear * (docQualityInputs.nursingVapVentUtilization / 100);
  }, [patientDaysPerYear, docQualityInputs.nursingVapVentUtilization]);

  const vapPerYear = useMemo(() => {
    return (ventDays / 1000) * docQualityInputs.nursingVapRate;
  }, [ventDays, docQualityInputs.nursingVapRate]);

  const vapPrevented = useMemo(() => {
    return vapPerYear * (docQualityInputs.nursingVapPreventionRate / 100);
  }, [vapPerYear, docQualityInputs.nursingVapPreventionRate]);

  const vapValue = useMemo(() => {
    return vapPrevented * docQualityInputs.nursingVapCost;
  }, [vapPrevented, docQualityInputs.nursingVapCost]);

  const totalPotentialValue = useMemo(() => {
    return (docQualityInputs.nursingHapiEnabled ? hapiValue : 0) +
           (docQualityInputs.nursingFallsEnabled ? fallsValue : 0) +
           (docQualityInputs.nursingHacEnabled ? hacValue : 0) +
           (docQualityInputs.nursingCautiEnabled ? cautiValue : 0) +
           (docQualityInputs.nursingClabsiEnabled ? clabsiValue : 0) +
           (docQualityInputs.nursingSepsisEnabled ? sepsisValue : 0) +
           (docQualityInputs.nursingVapEnabled ? vapValue : 0);
  }, [docQualityInputs.nursingHapiEnabled, hapiValue, docQualityInputs.nursingFallsEnabled, fallsValue, docQualityInputs.nursingHacEnabled, hacValue, docQualityInputs.nursingCautiEnabled, cautiValue, docQualityInputs.nursingClabsiEnabled, clabsiValue, docQualityInputs.nursingSepsisEnabled, sepsisValue, docQualityInputs.nursingVapEnabled, vapValue]);

  const carePerNurseWeek = useMemo(() => {
    if (state.numberOfProviders <= 0) return 0;
    return totalHoursSaved / state.numberOfProviders / 52;
  }, [totalHoursSaved, state.numberOfProviders]);

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
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
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
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  HARM EVENTS
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
                        <p className="font-semibold text-black">HAPI Risk: Documentation Impact</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Real-time skin assessment and risk score capture creates the clinical visibility that enables earlier intervention</p>
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
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          HAPIs happen when assessments are missed or interventions are delayed. Real-time documentation ensures skin assessments, turning schedules, and risk factors are captured as they're observed—enabling earlier intervention.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: CURRENT HAPI VOLUME</p>
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
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
                            <p className="text-xs text-[#888888]">A 2012 multi-site study of 29 hospitals found nursing documentation technology associated with a 13% reduction in HAPU rates (Dowding et al., Journal of the American Medical Informatics Association, 2012). We model 6.5% as Abridge's attributable share — exactly half the observed effect — to reflect that Abridge improves documentation timeliness and completeness within a broader care system.</p>
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
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
                        <p className="font-semibold text-black">Fall Risk Visibility Gap</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Real-time Morse score and mobility documentation ensures fall risk status reflects the patient's current condition — not end-of-shift catch-up charting</p>
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
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          Falls happen when risk factors aren't properly assessed or communicated. Real-time documentation ensures fall risk assessments, mobility status, and interventions are captured as they're observed—enabling better prevention protocols.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: CURRENT FALLS VOLUME</p>
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Documentation Gap Rate %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingFallsPreventionRate}
                                onChange={(v: number) => updateDocQualityInputs({ nursingFallsPreventionRate: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-falls-prevention-rate"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">10% represents falls where a documentation timeliness gap — risk status not updated to reflect a change in patient condition — was a primary contributing factor. Joint Commission sentinel event data identifies communication and assessment failures as contributing factors in the majority of inpatient falls; we model a conservative 10% where documentation timing was the primary gap.</p>
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">Falls/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{fallsPerYear.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Documentation gap rate</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingFallsPreventionRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Falls addressed</span>
                              <span className="font-semibold text-black flex-shrink-0">{fallsPrevented.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Cost per fall</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingFallsCost)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential Fall Risk Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(fallsValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bundle Compliance Section */}
              <div className="pt-4">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  BUNDLE COMPLIANCE
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />
              </div>

              {/* Driver: CAUTI Bundle Compliance */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingCautiEnabled
                      ? (cautiExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">CAUTI Bundle Compliance</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Timely catheter-day documentation and nurse-driven removal protocols reduce catheter-associated urinary tract infections</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingCautiEnabled && (
                        <button
                          onClick={() => setCautiExpanded(!cautiExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {cautiExpanded ? <ChevronUp className="w-5 h-5 text-[#888888]" /> : <ChevronDown className="w-5 h-5 text-[#888888]" />}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingCautiEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingCautiEnabled: checked });
                          if (checked) setCautiExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-cauti"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingCautiEnabled && cautiExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          Nurse-driven stop orders and daily catheter necessity assessments reduce CAUTI rates by up to 54% (Meddings et al., 2014 JAMA IM). We model 12% as the documentation-timing contribution — roughly 1/5 of the full bundle effect.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: CATHETER DAYS & CAUTI VOLUME</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Catheter Utilization Ratio %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingCautiUtilizationRatio}
                                onChange={(v: number) => updateDocQualityInputs({ nursingCautiUtilizationRatio: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-cauti-util"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">% of patient days with indwelling catheter</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">CAUTI Rate per 1,000 catheter days</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingCautiRate}
                              onChange={(v: number) => updateDocQualityInputs({ nursingCautiRate: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-cauti-rate"
                            />
                            <p className="text-xs text-[#888888]">NHSN benchmark: 1.2–2.5</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">CAUTIs/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {cautiPerYear.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Prevention Rate %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingCautiPreventionRate}
                                onChange={(v: number) => updateDocQualityInputs({ nursingCautiPreventionRate: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-cauti-prevention"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">Meddings et al. 2014: 54% reduction with nurse-driven stop orders; we take ~1/5 as doc-timing contribution.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Cost per CAUTI $</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={docQualityInputs.nursingCautiCost}
                                onChange={(v: number) => updateDocQualityInputs({ nursingCautiCost: v })}
                                className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                data-testid="input-cauti-cost"
                              />
                            </div>
                            <p className="text-xs text-[#888888]">CDC estimate: $7K–$30K. We use $13K as blended average.</p>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">CAUTIs/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{cautiPerYear.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Prevention rate</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingCautiPreventionRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= CAUTIs prevented</span>
                              <span className="font-semibold text-black flex-shrink-0">{cautiPrevented.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Cost per CAUTI</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingCautiCost)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential CAUTI Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(cautiValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver: CLABSI Bundle Compliance */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingClabsiEnabled
                      ? (clabsiExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">CLABSI Bundle Compliance</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Central line insertion and maintenance documentation supports bundle adherence and reduces bloodstream infections</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingClabsiEnabled && (
                        <button
                          onClick={() => setClabsiExpanded(!clabsiExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {clabsiExpanded ? <ChevronUp className="w-5 h-5 text-[#888888]" /> : <ChevronDown className="w-5 h-5 text-[#888888]" />}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingClabsiEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingClabsiEnabled: checked });
                          if (checked) setClabsiExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-clabsi"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingClabsiEnabled && clabsiExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          IHI bundle compliance literature shows 30–66% CLABSI reduction with full bundle adherence. We model 8% as the documentation-timing contribution — roughly 1/8 of the full bundle effect — reflecting that timely documentation of insertion practices and daily necessity assessments supports compliance.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: CENTRAL LINE DAYS & CLABSI VOLUME</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Central Line Utilization %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingClabsiUtilizationRatio}
                                onChange={(v: number) => updateDocQualityInputs({ nursingClabsiUtilizationRatio: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-clabsi-util"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">% of patient days with central line</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">CLABSI Rate per 1,000 line days</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingClabsiRate}
                              onChange={(v: number) => updateDocQualityInputs({ nursingClabsiRate: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-clabsi-rate"
                            />
                            <p className="text-xs text-[#888888]">NHSN benchmark: 0.5–1.5</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">CLABSIs/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {clabsiPerYear.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Prevention Rate %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingClabsiPreventionRate}
                                onChange={(v: number) => updateDocQualityInputs({ nursingClabsiPreventionRate: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-clabsi-prevention"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">IHI bundle compliance: 30–66% with full adherence; we take ~1/8 as doc-timing share.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Cost per CLABSI $</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={docQualityInputs.nursingClabsiCost}
                                onChange={(v: number) => updateDocQualityInputs({ nursingClabsiCost: v })}
                                className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                data-testid="input-clabsi-cost"
                              />
                            </div>
                            <p className="text-xs text-[#888888]">CDC estimate: $16K–$48K. We use $20K as blended average.</p>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">CLABSIs/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{clabsiPerYear.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Prevention rate</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingClabsiPreventionRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= CLABSIs prevented</span>
                              <span className="font-semibold text-black flex-shrink-0">{clabsiPrevented.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Cost per CLABSI</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingClabsiCost)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential CLABSI Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(clabsiValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver: Sepsis SEP-1 */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingSepsisEnabled
                      ? (sepsisExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">Sepsis SEP-1 Bundle Compliance</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Earlier documentation of sepsis screening triggers faster bundle initiation, reducing length of stay</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingSepsisEnabled && (
                        <button
                          onClick={() => setSepsisExpanded(!sepsisExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {sepsisExpanded ? <ChevronUp className="w-5 h-5 text-[#888888]" /> : <ChevronDown className="w-5 h-5 text-[#888888]" />}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingSepsisEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingSepsisEnabled: checked });
                          if (checked) setSepsisExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-sepsis"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingSepsisEnabled && sepsisExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          We model sepsis value as LOS reduction from earlier bundle initiation — not mortality reduction. This is less contested and more quantifiable. Earlier documentation of sepsis screening criteria triggers faster 3-hour and 6-hour bundle completion.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: SEPSIS VOLUME</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Sepsis Cases per 1,000 Patient Days</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingSepsisRatePerThousand}
                              onChange={(v: number) => updateDocQualityInputs({ nursingSepsisRatePerThousand: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-sepsis-rate"
                            />
                            <p className="text-xs text-[#888888]">Typical: 1.5–3.0 per 1,000 patient days</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Sepsis Cases/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {sepsisVolume.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: LOS REDUCTION MODEL</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Compliance Improvement %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingSepsisComplianceImprovement}
                                onChange={(v: number) => updateDocQualityInputs({ nursingSepsisComplianceImprovement: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-sepsis-compliance"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">% of sepsis cases where earlier screening documentation improves bundle initiation timing</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">LOS Reduction (days)</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingSepsisLosReduction}
                              onChange={(v: number) => updateDocQualityInputs({ nursingSepsisLosReduction: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-sepsis-los"
                            />
                            <p className="text-xs text-[#888888]">Average LOS days saved per improved-compliance case</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Daily Hospitalization Cost $</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={docQualityInputs.nursingSepsisDailyCost}
                                onChange={(v: number) => updateDocQualityInputs({ nursingSepsisDailyCost: v })}
                                className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                data-testid="input-sepsis-daily-cost"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Realization %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingSepsisRealization}
                                onChange={(v: number) => updateDocQualityInputs({ nursingSepsisRealization: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-sepsis-realization"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">Reflects that not all LOS savings translate to cost avoidance</p>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">Sepsis cases/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{sepsisVolume.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Compliance improvement</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingSepsisComplianceImprovement}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x LOS reduction</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingSepsisLosReduction} days</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Daily cost</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingSepsisDailyCost)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Realization</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingSepsisRealization}%</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential Sepsis Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(sepsisValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver: VAP Bundle Compliance (ICU) */}
              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingVapEnabled
                      ? (vapExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">VAP Bundle Compliance</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                        <span className="text-[11px] font-medium text-[#EA2C00] border border-[#EA2C00]/30 px-2 py-0.5 rounded uppercase">
                          ICU ONLY
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Ventilator-associated pneumonia prevention through documented bundle compliance — applies only to ICU ventilator days</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingVapEnabled && (
                        <button
                          onClick={() => setVapExpanded(!vapExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {vapExpanded ? <ChevronUp className="w-5 h-5 text-[#888888]" /> : <ChevronDown className="w-5 h-5 text-[#888888]" />}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingVapEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingVapEnabled: checked });
                          if (checked) setVapExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-vap"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingVapEnabled && vapExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <div className="bg-[#FFF8F6] border border-[#EA2C00]/20 rounded-lg p-3 mb-4">
                          <p className="text-xs text-[#EA2C00] font-medium">This driver applies only to ICU ventilator days. If your facility does not have an ICU, leave this toggled off.</p>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          IHI/SHEA evidence shows 50–70% VAP reduction with full bundle compliance. We model 10% as the documentation-timing contribution — roughly 1/6 of the full bundle effect — reflecting that timely HOB elevation, oral care, and sedation vacation documentation supports compliance verification.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: VENTILATOR DAYS & VAP VOLUME</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Ventilator Utilization %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingVapVentUtilization}
                                onChange={(v: number) => updateDocQualityInputs({ nursingVapVentUtilization: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-vap-util"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">% of patient days on mechanical ventilation (ICU only)</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">VAP Rate per 1,000 vent days</label>
                            <FormattedNumberInput
                              value={docQualityInputs.nursingVapRate}
                              onChange={(v: number) => updateDocQualityInputs({ nursingVapRate: v })}
                              step={0.1}
                              className="h-12 bg-[#F5F0EB] text-base"
                              data-testid="input-vap-rate"
                            />
                            <p className="text-xs text-[#888888]">NHSN benchmark: 1.0–3.0</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">VAPs/Year</label>
                            <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                              {vapPerYear.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: DOCUMENTATION-PREVENTABLE</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Prevention Rate %</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={docQualityInputs.nursingVapPreventionRate}
                                onChange={(v: number) => updateDocQualityInputs({ nursingVapPreventionRate: v })}
                                className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                data-testid="input-vap-prevention"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                            </div>
                            <p className="text-xs text-[#888888]">IHI/SHEA: 50–70% with full compliance; we take ~1/6 as doc-timing share.</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-[#888888]">Cost per VAP $</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={docQualityInputs.nursingVapCost}
                                onChange={(v: number) => updateDocQualityInputs({ nursingVapCost: v })}
                                className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                data-testid="input-vap-cost"
                              />
                            </div>
                            <p className="text-xs text-[#888888]">CDC estimate: $15K–$40K. We use $20K as blended average.</p>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: POTENTIAL VALUE</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">VAPs/year</span>
                              <span className="font-semibold text-black flex-shrink-0">{vapPerYear.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Prevention rate</span>
                              <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingVapPreventionRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= VAPs prevented</span>
                              <span className="font-semibold text-black flex-shrink-0">{vapPrevented.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">x Cost per VAP</span>
                              <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingVapCost)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="font-medium text-black">Potential VAP Value</span>
                              <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(vapValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Existing: HAC Penalty Avoidance */}
              <div className="pt-4">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  REGULATORY & EXPERIENCE
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />
              </div>

              <div className="space-y-0">
                <div
                  className={`w-full p-4 text-left transition-all ${
                    docQualityInputs.nursingHacEnabled
                      ? (hacExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                      : "bg-white/70 hover:bg-white rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-black">HAC Penalty Avoidance</p>
                        <span className="text-[12px] font-medium text-[#EA2C00] bg-[#FFF8F6] px-2 py-0.5 rounded uppercase">
                          POTENTIAL
                        </span>
                      </div>
                      <p className="text-sm text-[#888888]">Avoid CMS penalties for hospital-acquired conditions</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {docQualityInputs.nursingHacEnabled && (
                        <button
                          onClick={() => setHacExpanded(!hacExpanded)}
                          className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                        >
                          {hacExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#888888]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#888888]" />
                          )}
                        </button>
                      )}
                      <Switch
                        checked={docQualityInputs.nursingHacEnabled}
                        onCheckedChange={(checked) => {
                          updateDocQualityInputs({ nursingHacEnabled: checked });
                          if (checked) setHacExpanded(true);
                        }}
                        className="data-[state=checked]:bg-[#EA2C00]"
                        data-testid="toggle-hac"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {docQualityInputs.nursingHacEnabled && hacExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white rounded-b-lg p-5 pt-0">
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE THEORY</p>
                        <p className="text-sm text-black mb-6">
                          The CMS HAC Reduction Program penalizes hospitals in the bottom quartile of HAC scores by reducing Medicare payments by 1%. HAC scores are measured annually, and quartile rankings shift slowly—exiting the bottom quartile is a multi-year trajectory, not a switch. Documentation is one contributing factor alongside clinical protocols, staffing, and infection control. Better documentation supports earlier intervention and more accurate reporting, which over time can improve HAC performance.
                        </p>

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 1: QUARTILE STATUS</p>
                        <div className="mb-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={docQualityInputs.nursingHacBottomQuartile}
                              onChange={(e) => updateDocQualityInputs({ nursingHacBottomQuartile: e.target.checked })}
                              className="w-5 h-5 rounded border-[#D1D5DB] text-[#EA2C00] focus:ring-[#EA2C00] cursor-pointer"
                              data-testid="checkbox-hac-bottom-quartile"
                            />
                            <span className="text-sm text-black font-medium">We are currently in the bottom quartile of HAC scores</span>
                          </label>
                          <p className="text-xs text-[#888888] mt-2 ml-8">~25% of hospitals are penalized each year</p>
                        </div>

                        {docQualityInputs.nursingHacBottomQuartile && (
                          <>
                            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 2: MEDICARE REVENUE</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                              <div className="space-y-2">
                                <label className="text-sm text-[#888888]">Annual Medicare Inpatient Revenue</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                                  <FormattedNumberInput
                                    value={docQualityInputs.nursingHacMedicareRevenue}
                                    onChange={(v: number) => updateDocQualityInputs({ nursingHacMedicareRevenue: v })}
                                    className="h-12 bg-[#F5F0EB] pl-7 text-base"
                                    data-testid="input-hac-medicare-revenue"
                                  />
                                </div>
                                <p className="text-xs text-[#888888]">Typical range: $20M–$200M</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm text-[#888888]">1% CMS Penalty</label>
                                <div className="h-12 bg-[#F5F0EB] rounded-md flex items-center px-3 text-sm font-semibold text-black">
                                  {formatCurrency(hacPenalty)}
                                </div>
                                <p className="text-xs text-[#888888]">Automatic—1% of Medicare revenue</p>
                              </div>
                            </div>

                            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 3: ATTRIBUTION & REALIZATION</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                              <div className="space-y-2">
                                <label className="text-sm text-[#888888]">Attribution to Documentation %</label>
                                <div className="relative">
                                  <FormattedNumberInput
                                    value={docQualityInputs.nursingHacAbridgeAttribution}
                                    onChange={(v: number) => updateDocQualityInputs({ nursingHacAbridgeAttribution: v })}
                                    className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                    data-testid="input-hac-attribution"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                                </div>
                                <p className="text-xs text-[#888888]">Documentation is one of several contributing factors. 15–30% is a defensible range.</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm text-[#888888]">Year 1 Realization %</label>
                                <div className="relative">
                                  <FormattedNumberInput
                                    value={docQualityInputs.nursingHacRealization}
                                    onChange={(v: number) => updateDocQualityInputs({ nursingHacRealization: v })}
                                    className="h-12 bg-[#F5F0EB] pr-8 text-base"
                                    data-testid="input-hac-realization"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                                </div>
                                <p className="text-xs text-[#888888]">HAC scores shift slowly—25–75% reflects phased improvement over time</p>
                              </div>
                            </div>

                            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">STEP 4: POTENTIAL VALUE</p>
                            <div className="bg-[#F5F0EB] rounded-lg p-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between gap-2">
                                  <span className="text-[#666666]">Medicare Revenue</span>
                                  <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingHacMedicareRevenue)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[#666666]">x 1% CMS penalty</span>
                                  <span className="font-semibold text-black flex-shrink-0">{formatCurrency(hacPenalty)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[#666666]">x Attribution to documentation</span>
                                  <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingHacAbridgeAttribution}%</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[#666666]">x Year 1 realization</span>
                                  <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingHacRealization}%</span>
                                </div>
                                <div className="h-px bg-[#E5E5E5] my-2" />
                                <div className="flex justify-between gap-2">
                                  <span className="font-medium text-black">Potential HAC Value</span>
                                  <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(hacValue)}</span>
                                </div>
                              </div>

                              <div className="mt-4 bg-white/60 rounded-lg p-3">
                                <p className="text-xs text-[#888888]">
                                  This is a long-term metric. HAC scores are measured annually and quartile rankings shift slowly. The realization factor reflects that improvement builds over time—not overnight. Actual results depend on clinical practice, staffing, and multiple operational factors beyond documentation.
                                </p>
                              </div>
                            </div>
                          </>
                        )}

                        {!docQualityInputs.nursingHacBottomQuartile && (
                          <div className="bg-[#F5F0EB]/60 rounded-lg p-4">
                            <p className="text-sm text-[#666666]">
                              If your hospital isn't in the bottom quartile, this penalty doesn't apply today—but improved documentation helps maintain your standing and supports HAC measure performance.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver: Patient Experience (HCAHPS) */}
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
                        <span className="text-[12px] font-medium text-[#888888] bg-[#F0F0F0] px-2 py-0.5 rounded uppercase">
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
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE CONNECTION</p>
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">WE DON'T CALCULATE THIS</p>
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
                <p className="text-xs font-medium text-white uppercase tracking-[1.5px]">
                  YOUR MODEL SO FAR
                </p>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              <div className="mb-4">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                  HARM EVENTS
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
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                  BUNDLE COMPLIANCE
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingCautiEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">CAUTI</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingCautiEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingCautiEnabled ? formatCurrency(cautiValue) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingClabsiEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">CLABSI</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingClabsiEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingClabsiEnabled ? formatCurrency(clabsiValue) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingSepsisEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">Sepsis SEP-1</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingSepsisEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingSepsisEnabled ? formatCurrency(sepsisValue) : '—'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingVapEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">VAP (ICU)</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingVapEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingVapEnabled ? formatCurrency(vapValue) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                  REGULATORY & EXPERIENCE
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingHacEnabled && hacValue > 0 ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">HAC Penalty</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.nursingHacEnabled && hacValue > 0 ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.nursingHacEnabled && hacValue > 0 ? formatCurrency(hacValue) : '—'}
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
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  TIME SAVINGS VALUE
                </p>
                <p className="text-2xl font-bold text-[#EA2C00]">
                  {formatCurrency(timeValue)}
                </p>
                <p className="text-xs text-[#666666] mt-1">Hard value from efficiency gains</p>
              </div>

              <div className="bg-[#2A2A2A] rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
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
