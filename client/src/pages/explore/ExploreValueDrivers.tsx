import { useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "./ExploreFlow";

type RetentionScenario = 'conservative' | 'typical' | 'optimistic';

interface ExploreValueDriversProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreValueDrivers({
  state,
  updateState,
  totalHoursSaved,
  onNext,
  onBack,
  onHome,
}: ExploreValueDriversProps) {
  const { timeDriverInputs } = state;
  
  const [expandedSections, setExpandedSections] = useState<{
    patientAccess: boolean;
    costReduction: boolean;
    wellbeing: boolean;
    rounding: boolean;
  }>({
    patientAccess: true,
    costReduction: true,
    wellbeing: true,
    rounding: true,
  });

  const toggleExpanded = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const updateTimeDriverInputs = (updates: Partial<typeof timeDriverInputs>) => {
    updateState({
      timeDriverInputs: { ...timeDriverInputs, ...updates }
    });
  };

  // Calculations
  const hoursTowardCapacity = useMemo(() => {
    return Math.round(totalHoursSaved * (timeDriverInputs.capacityPercent / 100));
  }, [totalHoursSaved, timeDriverInputs.capacityPercent]);

  const potentialVisits = useMemo(() => {
    return Math.round(hoursTowardCapacity * (60 / timeDriverInputs.visitDuration));
  }, [hoursTowardCapacity, timeDriverInputs.visitDuration]);

  const potentialRevenue = useMemo(() => {
    return potentialVisits * timeDriverInputs.revenuePerVisit;
  }, [potentialVisits, timeDriverInputs.revenuePerVisit]);

  const hoursPerProviderPerWeek = useMemo(() => {
    return state.numberOfProviders > 0 
      ? (totalHoursSaved / state.numberOfProviders / 52).toFixed(1)
      : '0';
  }, [totalHoursSaved, state.numberOfProviders]);

  // Retention value calculations
  const retentionScenarios: Record<RetentionScenario, number> = {
    conservative: 20,
    typical: 30,
    optimistic: 40,
  };

  const retentionCalcs = useMemo(() => {
    const providers = state.numberOfProviders;
    const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
    const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
    const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
    const replacementCost = timeDriverInputs.replacementCost;

    const providersLeavingPerYear = providers * turnoverRate;
    const burnoutRelatedDepartures = providersLeavingPerYear * burnoutRate;
    const providersRetained = burnoutRelatedDepartures * impactRate;
    const retentionValue = providersRetained * replacementCost;

    return {
      providersLeavingPerYear,
      burnoutRelatedDepartures,
      providersRetained,
      retentionValue: Math.round(retentionValue),
    };
  }, [state.numberOfProviders, timeDriverInputs.annualTurnoverRate, timeDriverInputs.burnoutRelatedTurnover, timeDriverInputs.retentionImpactScenario, timeDriverInputs.replacementCost]);

  // ED-specific calculations
  // Calculate recovered patients first (used by both LWBS and Admission Capture)
  const edRecoveredPatients = useMemo(() => {
    const annualPatients = state.annualEncounters;
    const lwbsPatients = annualPatients * (timeDriverInputs.edLwbsRate / 100);
    return lwbsPatients * (timeDriverInputs.edLwbsReduction / 100);
  }, [state.annualEncounters, timeDriverInputs.edLwbsRate, timeDriverInputs.edLwbsReduction]);

  const edLwbsValue = useMemo(() => {
    if (!timeDriverInputs.edLwbsEnabled) return 0;
    const grossValue = edRecoveredPatients * timeDriverInputs.edRevenuePerVisit;
    return Math.round(grossValue * (timeDriverInputs.edLwbsRealization / 100));
  }, [edRecoveredPatients, timeDriverInputs.edLwbsEnabled, timeDriverInputs.edRevenuePerVisit, timeDriverInputs.edLwbsRealization]);

  // Admission Capture uses LWBS recovered patients as base
  const edAdmissionCaptureValue = useMemo(() => {
    if (!timeDriverInputs.edThroughputEnabled || !timeDriverInputs.edLwbsEnabled) return 0;
    const admittedPatients = edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100);
    const grossValue = admittedPatients * timeDriverInputs.edAdmissionRevenue;
    return Math.round(grossValue * (timeDriverInputs.edAdmissionRealization / 100));
  }, [edRecoveredPatients, timeDriverInputs.edThroughputEnabled, timeDriverInputs.edLwbsEnabled, timeDriverInputs.edAdmissionRate, timeDriverInputs.edAdmissionRevenue, timeDriverInputs.edAdmissionRealization]);

  // Inpatient-specific: Rounding Efficiency is qualitative only (no dollar value)
  // Value comes from Clinician Wellbeing driver only

  // Nursing-specific calculations
  const nursingOtValue = useMemo(() => {
    if (!timeDriverInputs.nursingOtEnabled) return 0;
    const nurses = state.numberOfProviders;
    const weeksPerYear = 52;
    const totalOtHoursYear = nurses * timeDriverInputs.nursingOtHoursPerNurseWeek * weeksPerYear;
    const reducedOtHours = totalOtHoursYear * (timeDriverInputs.nursingOtReductionPercent / 100);
    return Math.round(reducedOtHours * timeDriverInputs.nursingOtHourlyRate * 1.5); // 1.5x for OT
  }, [state.numberOfProviders, timeDriverInputs.nursingOtEnabled, timeDriverInputs.nursingOtHoursPerNurseWeek, timeDriverInputs.nursingOtReductionPercent, timeDriverInputs.nursingOtHourlyRate]);

  const nursingRetentionValue = useMemo(() => {
    if (!timeDriverInputs.nursingRetentionEnabled) return 0;
    const nurses = state.numberOfProviders;
    const leavingPerYear = nurses * (timeDriverInputs.nursingTurnoverRate / 100);
    const retained = leavingPerYear * 0.15; // Conservative 15% impact
    return Math.round(retained * timeDriverInputs.nursingReplacementCost);
  }, [state.numberOfProviders, timeDriverInputs.nursingRetentionEnabled, timeDriverInputs.nursingTurnoverRate, timeDriverInputs.nursingReplacementCost]);

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  // Care setting-specific labels
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';

  const driverConfig = {
    outpatient: {
      pageTitle: 'What Could That Time Be Worth?',
      pageSubtitle: `Your providers could reclaim ${formatNumber(totalHoursSaved)} hours. Different organizations use that time in different ways.`,
      driver1Title: 'Patient Access',
      driver1Subtitle: 'If providers use time to see more patients',
      driver2Title: 'Cost Reduction',
      driver2Subtitle: 'If time reduces overtime, locums, or other costs',
      driver3Title: 'Clinician Wellbeing',
      driver3Subtitle: 'If time improves work-life balance and retention',
    },
    ed: {
      pageTitle: 'What Could That Time Be Worth?',
      pageSubtitle: `Your ED providers could reclaim ${formatNumber(totalHoursSaved)} hours. In the ED, faster documentation means faster throughput and fewer patients leaving without being seen.`,
      driver1Title: 'LWBS Recovery',
      driver1Subtitle: 'Recover patients who leave without being seen',
      driver2Title: 'Admission Capture',
      driver2Subtitle: 'Recover revenue when ED admits become inpatient',
      driver3Title: 'Clinician Wellbeing',
      driver3Subtitle: 'If time improves work-life balance and retention',
    },
    inpatient: {
      pageTitle: 'What Could That Time Be Worth?',
      pageSubtitle: `Your hospitalists could reclaim ${formatNumber(totalHoursSaved)} hours. More time for patient care and rounding.`,
      driver1Title: 'Rounding Efficiency',
      driver1Subtitle: 'More time at bedside, less time charting',
      driver2Title: 'Clinician Wellbeing',
      driver2Subtitle: 'If time improves work-life balance and retention',
      driver3Title: '',
      driver3Subtitle: '',
    },
    nursing: {
      pageTitle: 'What Could That Time Be Worth?',
      pageSubtitle: `Your nurses could reclaim ${formatNumber(totalHoursSaved)} hours. More time at the bedside.`,
      driver1Title: 'OT Reduction',
      driver1Subtitle: 'Less documentation overtime means lower labor costs',
      driver2Title: 'Retention Savings',
      driver2Subtitle: 'Reduced burden helps retain experienced nurses',
      driver3Title: 'Care Time',
      driver3Subtitle: 'More time for direct patient care activities',
    },
  };

  const config = driverConfig[state.careSetting || 'outpatient'];

  // Calculate total time value based on care setting
  const totalTimeValue = useMemo(() => {
    let total = 0;
    
    if (isED) {
      // ED uses LWBS and Admission Capture
      total += edLwbsValue + edAdmissionCaptureValue;
      if (timeDriverInputs.costReductionEnabled) {
        total += timeDriverInputs.estimatedCostReduction;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        total += retentionCalcs.retentionValue;
      }
    } else if (isInpatient) {
      // Inpatient: Rounding is qualitative (no dollar value), only Wellbeing has $ value
      if (timeDriverInputs.costReductionEnabled) {
        total += timeDriverInputs.estimatedCostReduction;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        total += retentionCalcs.retentionValue;
      }
    } else if (isNursing) {
      // Nursing uses OT Reduction, Retention, and Care Time
      total += nursingOtValue + nursingRetentionValue;
      if (timeDriverInputs.costReductionEnabled) {
        total += timeDriverInputs.estimatedCostReduction;
      }
      // Care time is qualitative, not added to monetary value
    } else {
      // Outpatient uses Patient Access and Cost Reduction
      if (timeDriverInputs.patientAccessEnabled) {
        total += potentialRevenue;
      }
      if (timeDriverInputs.costReductionEnabled) {
        total += timeDriverInputs.estimatedCostReduction;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        total += retentionCalcs.retentionValue;
      }
    }
    return total;
  }, [isED, isInpatient, isNursing, potentialRevenue, timeDriverInputs, retentionCalcs.retentionValue, edLwbsValue, edAdmissionCaptureValue, nursingOtValue, nursingRetentionValue]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={7}
        stepName="Value Drivers"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">

        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            {config.pageTitle}
          </h1>
          <p className="text-base text-[#888888]">
            {config.pageSubtitle.split(formatNumber(totalHoursSaved))[0]}
            <strong className="text-black">{formatNumber(totalHoursSaved)}</strong>
            {config.pageSubtitle.split(formatNumber(totalHoursSaved))[1] || ''}
          </p>
        </motion.div>

        {/* How to Use This Section */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            How to Use This Section
          </p>
          <p className="text-sm text-black leading-relaxed">
            {isED 
              ? "ED time savings create value differently than outpatient. Faster documentation reduces wait times and LWBS rates—the primary way time converts to value in emergency settings."
              : "We can't tell you exactly how your organization will use reclaimed time. But we can help you model different scenarios."
            }
          </p>
          <p className="text-sm text-[#888888] mt-2">
            Engage with the drivers that {isED ? "match your situation." : "are relevant to your situation. Skip the ones that aren't."}
          </p>
        </motion.div>

        {/* VALUE DRIVERS - Wrapped in beige card */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              VALUE DRIVERS
            </p>
            <div className="h-px bg-[#D1D5DB] mb-6" />
          </div>
        
        {/* ED: LWBS Reduction */}
        {isED && (
        <div className="space-y-0">
          <div
            className={`w-full p-4 rounded-t-lg text-left transition-all ${
              timeDriverInputs.edLwbsEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTimeDriverInputs({ edLwbsEnabled: !timeDriverInputs.edLwbsEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.edLwbsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-lwbs"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.edLwbsEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.edLwbsEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-black mb-4">
                    Faster documentation reduces door-to-doc time and overall wait times. When patients wait less, fewer leave without being seen.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your ED</p>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Current LWBS rate</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.edLwbsRate}
                          placeholder="e.g., 3"
                          onChange={(v: number) => updateTimeDriverInputs({ edLwbsRate: v })}
                          className="h-12 bg-white pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Expected LWBS reduction</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.edLwbsReduction}
                          placeholder="e.g., 20"
                          onChange={(v: number) => updateTimeDriverInputs({ edLwbsReduction: v })}
                          className="h-12 bg-white pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-4">
                    <label className="text-sm text-[#888888]">Revenue per ED visit</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                      <FormattedNumberInput
                        value={timeDriverInputs.edRevenuePerVisit}
                        placeholder="e.g., 350"
                        onChange={(v: number) => updateTimeDriverInputs({ edRevenuePerVisit: v })}
                        className="h-12 bg-white pl-7"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Annual LWBS patients</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(state.annualEncounters * (timeDriverInputs.edLwbsRate / 100)))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× LWBS reduction</span>
                        <span className="font-semibold text-black">{timeDriverInputs.edLwbsReduction}%</span>
                      </div>
                      
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Patients recovered</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Revenue per visit</span>
                        <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.edRevenuePerVisit)}</span>
                      </div>
                      
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Gross value</span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(edRecoveredPatients * timeDriverInputs.edRevenuePerVisit))}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[#666666]">× Realization rate</span>
                          <p className="text-xs text-[#888888]">(Not all recovered patients complete visits)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FormattedNumberInput
                            value={timeDriverInputs.edLwbsRealization}
                            onChange={(v: number) => updateTimeDriverInputs({ edLwbsRealization: v })}
                            className="h-7 w-16 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                          />
                          <span className="text-sm text-[#888888]">%</span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-[#333333] my-2" />
                      
                      <div className="flex justify-between">
                        <span className="font-semibold text-black">Net LWBS Value</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(edLwbsValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Inpatient: Rounding Efficiency - Qualitative Only */}
        {isInpatient && (
        <div className="space-y-0">
          <div
            className={`w-full p-4 rounded-t-lg text-left transition-all ${
              timeDriverInputs.ipRoundingEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.ipRoundingEnabled && (
                  <button
                    onClick={() => toggleExpanded('rounding')}
                    className="p-1.5 rounded-md hover:bg-[#F5F0EB] transition-colors"
                    data-testid="collapse-rounding"
                  >
                    {expandedSections.rounding ? (
                      <ChevronUp className="w-5 h-5 text-[#888888]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#888888]" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ ipRoundingEnabled: !timeDriverInputs.ipRoundingEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.ipRoundingEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-rounding"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.ipRoundingEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.ipRoundingEnabled && expandedSections.rounding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    When documentation happens automatically, hospitalists spend less time charting during and after rounds. This time returns to patient care, teaching, or work-life balance.
                  </p>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  {/* Hours Summary */}
                  <div className="bg-[#F5F0EB] rounded-lg p-6 mb-6 text-center">
                    <p className="text-sm text-[#666666] mb-2">Your hospitalists would get back:</p>
                    <p className="text-3xl font-bold text-black mb-1">{formatNumber(Math.round(totalHoursSaved))} hours / year</p>
                    <p className="text-sm text-[#888888]">
                      ~{state.numberOfProviders > 0 ? formatNumber(Math.round(totalHoursSaved / state.numberOfProviders)) : 0} hours per hospitalist · ~{state.numberOfProviders > 0 ? (totalHoursSaved / state.numberOfProviders / 52).toFixed(1) : '0'} hours per week
                    </p>
                  </div>

                  {/* Where Time Goes */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-3">WHERE THAT TIME GOES</p>
                    <p className="text-sm text-[#666666] mb-3">Different programs use this time differently:</p>
                    <ul className="text-sm text-[#666666] space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-[#EA2C00] mt-1">•</span>
                        <span>More time with complex patients</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#EA2C00] mt-1">•</span>
                        <span>Better teaching for residents</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#EA2C00] mt-1">•</span>
                        <span>Earlier completion of rounds</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#EA2C00] mt-1">•</span>
                        <span>Reduced after-hours documentation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#EA2C00] mt-1">•</span>
                        <span>Ability to manage larger census</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4">
                    <p className="text-xs text-[#888888] italic">
                      We don't assign a dollar value because it varies by organization. The value shows up in wellbeing, capacity, or quality—depending on how your program chooses to use it.
                    </p>
                  </div>

                  <div className="mt-4 text-right">
                    <span className="text-xs font-medium text-[#888888] uppercase tracking-wide">Qualitative benefit</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Nursing: OT Reduction */}
        {isNursing && (
        <div className="space-y-0">
          <div
            className={`w-full p-4 rounded-t-lg text-left transition-all ${
              timeDriverInputs.nursingOtEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTimeDriverInputs({ nursingOtEnabled: !timeDriverInputs.nursingOtEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.nursingOtEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-ot"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.nursingOtEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.nursingOtEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
                  <p className="text-sm text-black mb-6">
                    When nurses spend less time documenting, they're more likely to finish their shift on time. 
                    Not all time saved converts to OT reduction—some goes to care, some to efficiency—but a portion does.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Current OT hours/nurse/week</label>
                      <FormattedNumberInput
                        value={timeDriverInputs.nursingOtHoursPerNurseWeek}
                        onChange={(v: number) => updateTimeDriverInputs({ nursingOtHoursPerNurseWeek: v })}
                        className="h-12 bg-white"
                      />
                      <p className="text-xs text-[#888888]">Industry average: 3-6 hrs/week</p>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Average OT hourly rate</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={timeDriverInputs.nursingOtHourlyRate}
                          onChange={(v: number) => updateTimeDriverInputs({ nursingOtHourlyRate: v })}
                          className="h-12 bg-white pl-7"
                        />
                      </div>
                      <p className="text-xs text-[#888888]">1.5x base rate applied automatically</p>
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Time-to-OT Conversion</p>
                  <p className="text-sm text-[#888888] mb-3">What percentage of time saved could realistically reduce OT?</p>
                  <div className="space-y-2.5 mb-4">
                    <div className="relative">
                      <FormattedNumberInput
                        value={timeDriverInputs.nursingOtReductionPercent}
                        onChange={(v: number) => updateTimeDriverInputs({ nursingOtReductionPercent: v })}
                        className="h-12 bg-white pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                    </div>
                    <p className="text-xs text-[#888888]">Most organizations see 15-30% of documentation time savings convert to OT reduction.</p>
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Nurse FTEs × OT hours/week × 52 weeks</span>
                        <span className="font-semibold text-black">{formatNumber(state.numberOfProviders * timeDriverInputs.nursingOtHoursPerNurseWeek * 52)} hrs/yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× OT reduction rate</span>
                        <span className="font-semibold text-black">{timeDriverInputs.nursingOtReductionPercent}%</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Hours reduced</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(state.numberOfProviders * timeDriverInputs.nursingOtHoursPerNurseWeek * 52 * (timeDriverInputs.nursingOtReductionPercent / 100)))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× OT rate (${timeDriverInputs.nursingOtHourlyRate} × 1.5)</span>
                        <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingOtHourlyRate * 1.5)}/hr</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#666666] font-medium">Annual OT Savings</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(nursingOtValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Outpatient: Patient Access Toggle */}
        {!isED && !isInpatient && !isNursing && (
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.patientAccessEnabled 
                ? "bg-white" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.patientAccessEnabled && (
                  <button
                    onClick={() => toggleExpanded('patientAccess')}
                    className="p-1.5 rounded-md hover:bg-[#F5F0EB] transition-colors"
                    data-testid="collapse-patient-access"
                  >
                    {expandedSections.patientAccess ? (
                      <ChevronUp className="w-5 h-5 text-[#888888]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#888888]" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ patientAccessEnabled: !timeDriverInputs.patientAccessEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.patientAccessEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-patient-access"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.patientAccessEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.patientAccessEnabled && expandedSections.patientAccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-black mb-4">
                    What percentage of reclaimed time could realistically become additional patient visits?
                  </p>

                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={timeDriverInputs.capacityPercent}
                      onChange={(e) => updateTimeDriverInputs({ capacityPercent: Number(e.target.value) })}
                      className="w-full accent-[#EA2C00] h-2"
                      data-testid="slider-capacity"
                    />
                    <div className="flex justify-between text-xs text-[#888888] mt-1">
                      <span>0%</span>
                      <span className="text-base font-semibold text-black">{timeDriverInputs.capacityPercent}%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Average visit duration</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.visitDuration}
                          onChange={(v: number) => updateTimeDriverInputs({ visitDuration: v })}
                          className="h-12 bg-white pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">min</span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Revenue per visit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={timeDriverInputs.revenuePerVisit}
                          onChange={(v: number) => updateTimeDriverInputs({ revenuePerVisit: v })}
                          className="h-12 bg-white pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <p className="text-sm text-[#888888] mb-2">At {timeDriverInputs.capacityPercent}% conversion to visits:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Hours available for visits:</span>
                        <span className="font-semibold text-black">{formatNumber(hoursTowardCapacity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Potential additional visits:</span>
                        <span className="font-semibold text-black">{formatNumber(potentialVisits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Potential revenue:</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(potentialRevenue)}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mt-3 text-xs text-[#888888]">
                      <AlertTriangle className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
                      <span>This accounts for provider behavior, scheduling constraints, and patient demand. Most organizations see 5-15% of reclaimed time convert to actual visits.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* DRIVER 2 - Care Setting Specific */}
        
        {/* ED: Admission Capture */}
        {isED && (
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.edThroughputEnabled 
                ? "bg-white" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver2Title}</p>
                <p className="text-sm text-[#888888]">{config.driver2Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTimeDriverInputs({ edThroughputEnabled: !timeDriverInputs.edThroughputEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.edThroughputEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-admission-capture"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.edThroughputEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.edThroughputEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  {!timeDriverInputs.edLwbsEnabled ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-amber-800">
                        Enable LWBS Recovery first to calculate admission value
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-black mb-4">
                        Some recovered LWBS patients require admission. Better documentation supports DRG capture for these admissions.
                      </p>

                      <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>

                      <div className="bg-[#F5F0EB] rounded-lg p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Recovered ED patients</span>
                            <span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients))}</span>
                          </div>
                          <div className="text-xs text-[#888888]">(from LWBS Recovery)</div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-[#666666]">× Admission rate</span>
                            <div className="flex items-center gap-2">
                              <FormattedNumberInput
                                value={timeDriverInputs.edAdmissionRate}
                                onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRate: v })}
                                className="h-7 w-16 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                              />
                              <span className="text-sm text-[#888888]">%</span>
                            </div>
                          </div>
                          
                          <div className="h-px bg-[#E5E5E5] my-2" />
                          
                          <div className="flex justify-between">
                            <span className="text-[#666666]">= Potential admissions</span>
                            <span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100)))}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-[#666666]">× Avg admission revenue</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={timeDriverInputs.edAdmissionRevenue}
                                onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRevenue: v })}
                                className="h-7 w-20 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                              />
                            </div>
                          </div>
                          
                          <div className="h-px bg-[#E5E5E5] my-2" />
                          
                          <div className="flex justify-between">
                            <span className="text-[#666666]">= Gross value</span>
                            <span className="font-semibold text-black">{formatCurrency(Math.round(edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100) * timeDriverInputs.edAdmissionRevenue))}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[#666666]">× Realization rate</span>
                              <p className="text-xs text-[#888888]">(Bed availability, payer mix)</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <FormattedNumberInput
                                value={timeDriverInputs.edAdmissionRealization}
                                onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRealization: v })}
                                className="h-7 w-16 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                              />
                              <span className="text-sm text-[#888888]">%</span>
                            </div>
                          </div>
                          
                          <div className="h-px bg-[#333333] my-2" />
                          
                          <div className="flex justify-between">
                            <span className="font-semibold text-black">Annual Admission Capture Value</span>
                            <span className="font-bold text-[#EA2C00]">{formatCurrency(edAdmissionCaptureValue)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        
        {/* Nursing: Retention */}
        {isNursing && (
        <div className="space-y-0">
          <div
            className={`w-full p-4 rounded-t-lg text-left transition-all ${
              timeDriverInputs.nursingRetentionEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver2Title}</p>
                <p className="text-sm text-[#888888]">{config.driver2Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTimeDriverInputs({ nursingRetentionEnabled: !timeDriverInputs.nursingRetentionEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.nursingRetentionEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-nursing-retention"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.nursingRetentionEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.nursingRetentionEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
                  <p className="text-sm text-black mb-6">
                    Documentation burden is a leading contributor to nurse burnout and turnover. 
                    When you reduce charting time, nurses are more likely to stay.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Annual turnover rate</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.nursingTurnoverRate}
                          onChange={(v: number) => updateTimeDriverInputs({ nursingTurnoverRate: v })}
                          className="h-12 bg-white pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                      <p className="text-xs text-[#888888]">National average: 18-22%</p>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Replacement cost per nurse</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={timeDriverInputs.nursingReplacementCost}
                          onChange={(v: number) => updateTimeDriverInputs({ nursingReplacementCost: v })}
                          className="h-12 bg-white pl-7"
                        />
                      </div>
                      <p className="text-xs text-[#888888]">Includes recruiting, training, onboarding</p>
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Nurse FTEs × Turnover rate</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(state.numberOfProviders * (timeDriverInputs.nursingTurnoverRate / 100)))} leaving/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Burnout-related (40%)</span>
                        <span className="font-semibold text-black">{(state.numberOfProviders * (timeDriverInputs.nursingTurnoverRate / 100) * 0.40).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Abridge impact (15%)</span>
                        <span className="font-semibold text-black">{(state.numberOfProviders * (timeDriverInputs.nursingTurnoverRate / 100) * 0.40 * 0.15).toFixed(2)} nurses retained</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Replacement cost</span>
                        <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingReplacementCost)}</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#666666] font-medium">Annual Retention Savings</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(nursingRetentionValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Cost Reduction Toggle - Available for all care settings */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.costReductionEnabled 
                ? "bg-white" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Cost Reduction</p>
                <p className="text-sm text-[#888888]">If time reduces overtime, locums, or other costs</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.costReductionEnabled && (
                  <button
                    onClick={() => toggleExpanded('costReduction')}
                    className="p-1.5 rounded-md hover:bg-[#F5F0EB] transition-colors"
                    data-testid="collapse-cost-reduction"
                  >
                    {expandedSections.costReduction ? (
                      <ChevronUp className="w-5 h-5 text-[#888888]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#888888]" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ costReductionEnabled: !timeDriverInputs.costReductionEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.costReductionEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-cost-reduction"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.costReductionEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.costReductionEnabled && expandedSections.costReduction && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-black mb-3">
                    We can't calculate your cost reduction — every organization is different. 
                    But if you have an estimate, enter it here.
                  </p>

                  <div className="space-y-2.5 mb-3">
                    <label className="text-sm text-[#888888]">Estimated annual cost reduction from reclaimed time:</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                      <FormattedNumberInput
                        value={timeDriverInputs.estimatedCostReduction}
                        onChange={(v: number) => updateTimeDriverInputs({ estimatedCostReduction: v })}
                        className="h-11 bg-white pl-7"
                        data-testid="input-cost-reduction"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-[#888888]">
                    Common sources: Reduced overtime, fewer locums, deferred hiring
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Clinician Wellbeing Toggle - Not shown for Nursing (has own retention driver) */}
        {!isNursing && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.wellbeingEnabled 
                ? "bg-white" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{isInpatient ? config.driver2Title : config.driver3Title}</p>
                <p className="text-sm text-[#888888]">{isInpatient ? config.driver2Subtitle : config.driver3Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.wellbeingEnabled && (
                  <button
                    onClick={() => toggleExpanded('wellbeing')}
                    className="p-1.5 rounded-md hover:bg-[#F5F0EB] transition-colors"
                    data-testid="collapse-wellbeing"
                  >
                    {expandedSections.wellbeing ? (
                      <ChevronUp className="w-5 h-5 text-[#888888]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#888888]" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ wellbeingEnabled: !timeDriverInputs.wellbeingEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.wellbeingEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-wellbeing"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.wellbeingEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.wellbeingEnabled && expandedSections.wellbeing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-[#888888] mb-3">Your providers would get back:</p>

                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-[#EA2C00]">{hoursPerProviderPerWeek} hours per week</p>
                    <p className="text-sm text-[#888888]">per provider</p>
                  </div>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                    The Retention Case
                  </p>

                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    Documentation burden is the #1 driver of burnout. Burnout is the #1 reason physicians leave. 
                    Reducing documentation time can help retain providers who would otherwise leave.
                  </p>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  {/* Calculate retention checkbox */}
                  <button
                    onClick={() => updateTimeDriverInputs({ calculateRetentionValue: !timeDriverInputs.calculateRetentionValue })}
                    className="flex items-center gap-3 text-sm text-black hover:text-[#EA2C00] transition-colors mb-4"
                    data-testid="checkbox-calculate-retention"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      timeDriverInputs.calculateRetentionValue 
                        ? 'bg-[#EA2C00] border-[#EA2C00]' 
                        : 'border-[#D1D5DB] bg-white'
                    }`}>
                      {timeDriverInputs.calculateRetentionValue && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    Calculate retention value
                  </button>

                  <AnimatePresence>
                    {timeDriverInputs.calculateRetentionValue && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="h-px bg-[#E5E5E5] mb-6" />

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                          Your Organization
                        </p>

                        {/* Turnover Rate */}
                        <div className="mb-4">
                          <label className="text-sm text-black mb-1.5 block">Annual provider turnover rate</label>
                          <div className="relative">
                            <FormattedNumberInput
                              value={timeDriverInputs.annualTurnoverRate}
                              onChange={(v: number) => updateTimeDriverInputs({ annualTurnoverRate: v })}
                              className="h-12 bg-white pr-8"
                              data-testid="input-turnover-rate"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                          </div>
                          <p className="text-xs text-[#888888] italic mt-1">Industry average: 6-7%</p>
                        </div>

                        {/* Burnout Related */}
                        <div className="mb-4">
                          <label className="text-sm text-black mb-1.5 block">Turnover related to burnout</label>
                          <div className="relative">
                            <FormattedNumberInput
                              value={timeDriverInputs.burnoutRelatedTurnover}
                              onChange={(v: number) => updateTimeDriverInputs({ burnoutRelatedTurnover: v })}
                              className="h-12 bg-white pr-8"
                              data-testid="input-burnout-turnover"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                          </div>
                          <p className="text-xs text-[#888888] italic mt-1">Research suggests 30-50% of physician turnover is burnout-related</p>
                        </div>

                        {/* Replacement Cost */}
                        <div className="mb-4">
                          <label className="text-sm text-black mb-1.5 block">Cost to replace one provider</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                            <FormattedNumberInput
                              value={timeDriverInputs.replacementCost}
                              onChange={(v: number) => updateTimeDriverInputs({ replacementCost: v })}
                              className="h-12 bg-white pl-7"
                              data-testid="input-replacement-cost"
                            />
                          </div>
                          <p className="text-xs text-[#888888] italic mt-1">Includes recruitment, onboarding, and lost revenue during transition</p>
                        </div>

                        <div className="h-px bg-[#E5E5E5] my-4" />

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                          Abridge Impact
                        </p>

                        <p className="text-sm text-black mb-3">
                          What percentage of burnout-related turnover could Abridge help prevent?
                        </p>

                        {/* Scenario Buttons */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {(['conservative', 'typical', 'optimistic'] as RetentionScenario[]).map((scenario) => (
                            <button
                              key={scenario}
                              onClick={() => updateTimeDriverInputs({ retentionImpactScenario: scenario })}
                              className={`p-3 rounded-lg border text-center transition-all ${
                                timeDriverInputs.retentionImpactScenario === scenario
                                  ? 'bg-[#EA2C00] border-[#EA2C00] text-white'
                                  : 'bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]'
                              }`}
                              data-testid={`button-scenario-${scenario}`}
                            >
                              <p className="text-xs capitalize mb-2">{scenario}</p>
                              <p className="font-semibold">{retentionScenarios[scenario]}%</p>
                            </button>
                          ))}
                        </div>

                        <div className="h-px bg-[#E5E5E5] my-4" />

                        {/* Calculation Card */}
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                            Calculation
                          </p>

                          <div className="space-y-2 text-sm font-mono">
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Providers</span>
                              <span className="text-black">{formatNumber(state.numberOfProviders)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">× Annual turnover rate</span>
                              <span className="text-black">{timeDriverInputs.annualTurnoverRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">= Providers leaving per year</span>
                              <span className="text-black">{retentionCalcs.providersLeavingPerYear.toFixed(1)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between">
                              <span className="text-[#666666]">× Burnout-related turnover</span>
                              <span className="text-black">{timeDriverInputs.burnoutRelatedTurnover}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">= Burnout-related departures</span>
                              <span className="text-black">{retentionCalcs.burnoutRelatedDepartures.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between">
                              <span className="text-[#666666]">× Abridge retention impact</span>
                              <span className="text-black">{retentionScenarios[timeDriverInputs.retentionImpactScenario]}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">= Providers retained</span>
                              <span className="text-black">{retentionCalcs.providersRetained.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between">
                              <span className="text-[#666666]">× Replacement cost</span>
                              <span className="text-black">{formatCurrency(timeDriverInputs.replacementCost)}</span>
                            </div>
                            <div className="h-px bg-[#888888] my-2" />
                            <div className="flex justify-between font-semibold">
                              <span className="text-black">= Retention value</span>
                              <span className="text-[#EA2C00]">{formatCurrency(retentionCalcs.retentionValue)}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 mt-4 text-xs text-[#888888] italic">
                            <AlertTriangle className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
                            <span>This assumes Abridge meaningfully reduces documentation burden for providers at risk of leaving due to burnout.</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Nursing: Care Time - Qualitative Driver */}
        {isNursing && (
        <div className="space-y-0">
          <div
            className={`w-full p-4 rounded-t-lg text-left transition-all ${
              timeDriverInputs.nursingCareTimeEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-black">{config.driver3Title}</p>
                  <span className="text-xs font-medium text-[#888888] uppercase tracking-wide bg-[#F5F0EB] px-2 py-0.5 rounded">Qualitative</span>
                </div>
                <p className="text-sm text-[#888888]">{config.driver3Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateTimeDriverInputs({ nursingCareTimeEnabled: !timeDriverInputs.nursingCareTimeEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    timeDriverInputs.nursingCareTimeEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-care-time"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    timeDriverInputs.nursingCareTimeEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {timeDriverInputs.nursingCareTimeEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Connection</p>
                  <p className="text-sm text-black mb-6">
                    After accounting for OT reduction, this time is returned to direct patient care. 
                    More time at the bedside improves patient outcomes and satisfaction.
                  </p>

                  {/* Interactive Care Time Selection */}
                  <div className="bg-[#F5F0EB] rounded-lg p-4 mb-6">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                      How Much Time Goes to Direct Care?
                    </p>
                    <p className="text-sm text-[#666666] mb-4">
                      Of the time saved, how much do you expect nurses to dedicate to patient care activities? The remainder is absorbed into baseline productivity.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-black font-medium">Time to care:</span>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={timeDriverInputs.nursingCareTimePercent}
                            onChange={(e) => updateTimeDriverInputs({ nursingCareTimePercent: parseInt(e.target.value) })}
                            className="w-32 h-2 bg-[#D1D5DB] rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                            data-testid="slider-care-time"
                          />
                          <div className="flex items-center gap-1">
                            <FormattedNumberInput
                              value={timeDriverInputs.nursingCareTimePercent}
                              onChange={(v: number) => updateTimeDriverInputs({ nursingCareTimePercent: Math.min(100, Math.max(0, v)) })}
                              className="h-9 w-16 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                              data-testid="input-care-time"
                            />
                            <span className="text-sm text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-[#888888]">
                        <span>0% = all absorbed</span>
                        <span>100% = all to care</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Where Does This Time Go?</p>
                    <div className="space-y-2 text-sm text-[#666666]">
                      <div className="flex items-start gap-2">
                        <span className="text-[#EA2C00]">•</span>
                        <span>Reduced falls through increased visibility</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[#EA2C00]">•</span>
                        <span>Fewer pressure injuries (HAPIs) with timely assessments</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[#EA2C00]">•</span>
                        <span>Higher patient satisfaction (HCAHPS)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[#EA2C00]">•</span>
                        <span>Better clinical outcomes overall</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-[#F9F9F9] rounded-lg border border-[#E5E5E5]">
                    <p className="text-sm text-[#666666] italic text-center">
                      We don't calculate a dollar value for care time because the link to outcomes is indirect. 
                      But we DO explore the potential quality impact in the next section.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex flex-col items-center gap-2 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Documentation Quality
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-[#888888]">
            You can skip documentation drivers if not relevant
          </p>
        </motion.div>
        </motion.div>
        </div>

          {/* Right Panel - Desktop Only */}
          <motion.div
            className="hidden lg:block w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 sticky top-24">
              {/* Time Allocation Breakdown - Nursing Only */}
              {isNursing && timeDriverInputs.nursingCareTimeEnabled && (
                <>
                  {(() => {
                    const carePct = timeDriverInputs.nursingCareTimePercent / 100;
                    const otPct = timeDriverInputs.nursingOtEnabled ? (timeDriverInputs.nursingOtReductionPercent / 100) : 0;
                    const absorbedPct = Math.max(0, 1 - carePct - otPct);
                    const careHours = Math.round(totalHoursSaved * carePct);
                    const otHours = Math.round(totalHoursSaved * otPct);
                    const absorbedHours = Math.round(totalHoursSaved * absorbedPct);
                    const carePerNurseWeek = state.numberOfProviders > 0 
                      ? (careHours / state.numberOfProviders / 52).toFixed(1)
                      : '0';
                    
                    return (
                      <div className="mb-5">
                        <div className="mb-3">
                          <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
                            Time Allocation
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          {/* Total Hours */}
                          <div className="flex justify-between items-center pb-2 border-b border-[#333333]">
                            <span className="text-xs text-[#888888]">Total Saved</span>
                            <span className="text-sm font-semibold text-white">{formatNumber(totalHoursSaved)} hrs</span>
                          </div>
                          
                          {/* Direct Care */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                              <span className="text-xs text-[#888888]">Direct Care</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-[#EA2C00]">{formatNumber(careHours)} hrs</span>
                              <span className="text-xs text-[#666666] ml-1">({timeDriverInputs.nursingCareTimePercent}%)</span>
                            </div>
                          </div>
                          
                          {/* OT Reduction */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${timeDriverInputs.nursingOtEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                              <span className="text-xs text-[#888888]">OT Reduction</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${timeDriverInputs.nursingOtEnabled ? 'text-white' : 'text-[#666666]'}`}>
                                {formatNumber(otHours)} hrs
                              </span>
                              <span className="text-xs text-[#666666] ml-1">({timeDriverInputs.nursingOtEnabled ? timeDriverInputs.nursingOtReductionPercent : 0}%)</span>
                            </div>
                          </div>
                          
                          {/* Absorbed */}
                          <div className="flex justify-between items-center pt-2 border-t border-[#333333]">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#666666]" />
                              <span className="text-xs text-[#888888]">Absorbed</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-[#888888]">{formatNumber(absorbedHours)} hrs</span>
                              <span className="text-xs text-[#666666] ml-1 italic">({Math.round(absorbedPct * 100)}% auto)</span>
                            </div>
                          </div>
                          
                          {/* Per Nurse */}
                          <div className="flex justify-between items-center pt-2 mt-1 border-t border-[#333333]">
                            <span className="text-xs text-[#888888]">Per nurse/week</span>
                            <span className="text-lg font-bold text-[#EA2C00]">{carePerNurseWeek} hrs</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="h-px bg-[#333333] mb-4" />
                </>
              )}
              
              {/* Header */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
                  Time Value
                </p>
                <p className="text-sm text-[#888888] mt-1">Value summary</p>
              </div>

              {/* Hero Value */}
              <div className="text-center my-4">
                <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                  {formatCurrency(totalTimeValue)}
                </p>
                <p className="text-sm text-[#888888] mt-1">
                  From {formatNumber(totalHoursSaved)} hours saved
                </p>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Line Items - Care Setting Specific */}
              <div className="space-y-3">
                {isED ? (
                  <>
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.edLwbsEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">LWBS Recovery</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.edLwbsEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.edLwbsEnabled ? formatCurrency(edLwbsValue) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.edLwbsEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">({timeDriverInputs.edLwbsReduction}% reduction)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Admission Capture</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled ? formatCurrency(edAdmissionCaptureValue) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">({timeDriverInputs.edAdmissionRate}% admission rate)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Cost Reduction</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? formatCurrency(timeDriverInputs.estimatedCostReduction) : '—'}
                        </span>
                      </div>
                      {!timeDriverInputs.costReductionEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(your estimate)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.wellbeingEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Clinician Wellbeing</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.wellbeingEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.wellbeingEnabled 
                            ? (timeDriverInputs.calculateRetentionValue 
                                ? formatCurrency(retentionCalcs.retentionValue)
                                : '—')
                            : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.wellbeingEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">
                          {timeDriverInputs.calculateRetentionValue ? '(retention value)' : `${hoursPerProviderPerWeek} hrs/wk back`}
                        </p>
                      )}
                    </div>
                  </>
                ) : isInpatient ? (
                  <>
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.ipRoundingEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Rounding Efficiency</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.ipRoundingEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.ipRoundingEnabled ? '—' : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.ipRoundingEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(qualitative)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Cost Reduction</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? formatCurrency(timeDriverInputs.estimatedCostReduction) : '—'}
                        </span>
                      </div>
                      {!timeDriverInputs.costReductionEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(your estimate)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.wellbeingEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Clinician Wellbeing</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.wellbeingEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.wellbeingEnabled 
                            ? (timeDriverInputs.calculateRetentionValue 
                                ? formatCurrency(retentionCalcs.retentionValue)
                                : '—')
                            : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.wellbeingEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">
                          {timeDriverInputs.calculateRetentionValue ? '(retention value)' : `${hoursPerProviderPerWeek} hrs/wk back`}
                        </p>
                      )}
                    </div>
                  </>
                ) : isNursing ? (
                  <>
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.nursingOtEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">OT Reduction</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.nursingOtEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.nursingOtEnabled ? formatCurrency(nursingOtValue) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.nursingOtEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">({timeDriverInputs.nursingOtReductionPercent}% reduction)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.nursingRetentionEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Retention Savings</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.nursingRetentionEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.nursingRetentionEnabled ? formatCurrency(nursingRetentionValue) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.nursingRetentionEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(turnover reduction)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Cost Reduction</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? formatCurrency(timeDriverInputs.estimatedCostReduction) : '—'}
                        </span>
                      </div>
                      {!timeDriverInputs.costReductionEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(your estimate)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.nursingCareTimeEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Care Time</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.nursingCareTimeEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          —
                        </span>
                      </div>
                      {timeDriverInputs.nursingCareTimeEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(qualitative)</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.patientAccessEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Patient Access</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.patientAccessEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.patientAccessEnabled ? formatCurrency(potentialRevenue) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.patientAccessEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">({timeDriverInputs.capacityPercent}% to capacity)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Cost Reduction</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? formatCurrency(timeDriverInputs.estimatedCostReduction) : '—'}
                        </span>
                      </div>
                      {!timeDriverInputs.costReductionEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">(your estimate)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.wellbeingEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Clinician Wellbeing</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.wellbeingEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.wellbeingEnabled 
                            ? (timeDriverInputs.calculateRetentionValue 
                                ? formatCurrency(retentionCalcs.retentionValue)
                                : '—')
                            : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.wellbeingEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">
                          {timeDriverInputs.calculateRetentionValue ? '(retention value)' : `${hoursPerProviderPerWeek} hrs/wk back`}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Continue Button */}
              <Button
                onClick={onNext}
                className="w-full h-11 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
                data-testid="button-panel-continue"
              >
                Continue to Documentation
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
