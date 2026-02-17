import { useMemo } from "react";
import { ArrowRight, AlertTriangle, ChevronDown, Check } from "lucide-react";
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
  // OT Reduction: Time-to-OT conversion approach
  const nursingOtHoursEliminated = useMemo(() => {
    if (!timeDriverInputs.nursingOtEnabled) return 0;
    return Math.round(totalHoursSaved * (timeDriverInputs.nursingOtReductionPercent / 100));
  }, [totalHoursSaved, timeDriverInputs.nursingOtEnabled, timeDriverInputs.nursingOtReductionPercent]);

  const nursingOtValue = useMemo(() => {
    if (!timeDriverInputs.nursingOtEnabled) return 0;
    return Math.round(nursingOtHoursEliminated * timeDriverInputs.nursingOtHourlyRate);
  }, [nursingOtHoursEliminated, timeDriverInputs.nursingOtEnabled, timeDriverInputs.nursingOtHourlyRate]);

  const nursingRetentionImpactRates: Record<RetentionScenario, number> = {
    conservative: 10,
    typical: 15,
    optimistic: 25,
  };

  const nursingRetentionCalcs = useMemo(() => {
    const nurses = state.numberOfProviders;
    const leavingPerYear = nurses * (timeDriverInputs.nursingTurnoverRate / 100);
    const burnoutDepartures = leavingPerYear * 0.40; // 40% burnout-related
    const impactRate = nursingRetentionImpactRates[timeDriverInputs.retentionImpactScenario] / 100;
    const retained = burnoutDepartures * impactRate;
    const value = Math.round(retained * timeDriverInputs.nursingReplacementCost);
    return {
      leavingPerYear,
      burnoutDepartures,
      retained,
      value: timeDriverInputs.nursingRetentionEnabled ? value : 0,
    };
  }, [state.numberOfProviders, timeDriverInputs.nursingRetentionEnabled, timeDriverInputs.nursingTurnoverRate, timeDriverInputs.nursingReplacementCost, timeDriverInputs.retentionImpactScenario]);

  const nursingRetentionValue = nursingRetentionCalcs.value;

  // Agency Cost Avoidance calculation (Nursing only)
  // New approach: nursesRetained × weeksOfCoverage × weeklyAgencyPremium
  const nursingAgencyCalcs = useMemo(() => {
    if (!timeDriverInputs.nursingAgencyEnabled || !timeDriverInputs.nursingRetentionEnabled) {
      return {
        nursesRetained: 0,
        weeksOfCoverage: timeDriverInputs.nursingAgencyWeeksPerVacancy || 12,
        weeklyPremium: timeDriverInputs.nursingAgencyWeeklyPremium || 2500,
        agencySavings: 0,
      };
    }
    
    const nursesRetained = nursingRetentionCalcs.retained;
    const weeksOfCoverage = timeDriverInputs.nursingAgencyWeeksPerVacancy || 12;
    const weeklyPremium = timeDriverInputs.nursingAgencyWeeklyPremium || 2500;
    const agencySavings = Math.round(nursesRetained * weeksOfCoverage * weeklyPremium);
    
    return {
      nursesRetained,
      weeksOfCoverage,
      weeklyPremium,
      agencySavings,
    };
  }, [
    timeDriverInputs.nursingAgencyEnabled,
    timeDriverInputs.nursingRetentionEnabled,
    timeDriverInputs.nursingAgencyWeeksPerVacancy,
    timeDriverInputs.nursingAgencyWeeklyPremium,
    nursingRetentionCalcs.retained,
  ]);

  // Nursing Care Quality (HAPI & Falls) calculation
  const nursingCareQualityCalcs = useMemo(() => {
    // Only calculate for nursing when care time is enabled
    if (state.careSetting !== 'nursing' || !timeDriverInputs.nursingCareTimeEnabled) {
      return {
        patientDaysPerYear: 0,
        fallsPerYear: 0,
        preventableFalls: 0,
        fallsValue: 0,
        hapisPerYear: 0,
        preventableHapis: 0,
        hapiValue: 0,
        totalPreventionValue: 0,
        careTimeHours: 0,
      };
    }
    
    // Calculate patient days from state
    const patientDaysPerYear = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    
    // Care time hours based on allocation percentage
    const careTimeHours = totalHoursSaved * (timeDriverInputs.nursingCareTimePercent / 100);

    // Care time effectiveness: more bedside time = better prevention
    // At 0% care time, documentation alone provides 30% effectiveness
    // At 100% care time, full effectiveness
    const careTimeEffectiveness = 0.30 + ((timeDriverInputs.nursingCareTimePercent / 100) * 0.70);
    
    // Falls prevention calculation (rate is per 1,000 patient days)
    const fallsPerYear = (patientDaysPerYear / 1000) * timeDriverInputs.nursingFallsRate;
    const preventableFalls = fallsPerYear * (timeDriverInputs.nursingFallsPreventablePct / 100) * careTimeEffectiveness;
    const grossFallsValue = preventableFalls * timeDriverInputs.nursingCostPerFall;
    
    // HAPI prevention calculation (rate is per 1,000 patient days)
    const hapisPerYear = (patientDaysPerYear / 1000) * timeDriverInputs.nursingHapiRate;
    const preventableHapis = hapisPerYear * (timeDriverInputs.nursingHapiPreventablePct / 100) * careTimeEffectiveness;
    const grossHapiValue = preventableHapis * timeDriverInputs.nursingCostPerHapi;
    
    // Apply realization rate
    const realizationRate = timeDriverInputs.nursingCareQualityRealization / 100;
    const fallsValue = grossFallsValue * realizationRate;
    const hapiValue = grossHapiValue * realizationRate;
    const totalPreventionValue = fallsValue + hapiValue;
    
    return {
      patientDaysPerYear: Math.round(patientDaysPerYear),
      fallsPerYear: Math.round(fallsPerYear),
      preventableFalls: Math.round(preventableFalls * 10) / 10, // 1 decimal
      fallsValue: Math.round(fallsValue),
      hapisPerYear: Math.round(hapisPerYear),
      preventableHapis: Math.round(preventableHapis * 10) / 10, // 1 decimal
      hapiValue: Math.round(hapiValue),
      totalPreventionValue: Math.round(totalPreventionValue),
      careTimeHours: Math.round(careTimeHours),
    };
  }, [
    state.careSetting,
    state.nursingStaffedBeds,
    state.nursingOccupancyRate,
    totalHoursSaved,
    timeDriverInputs.nursingCareTimeEnabled,
    timeDriverInputs.nursingCareTimePercent,
    timeDriverInputs.nursingFallsRate,
    timeDriverInputs.nursingFallsPreventablePct,
    timeDriverInputs.nursingCostPerFall,
    timeDriverInputs.nursingHapiRate,
    timeDriverInputs.nursingHapiPreventablePct,
    timeDriverInputs.nursingCostPerHapi,
    timeDriverInputs.nursingCareQualityRealization,
  ]);

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
      pageSubtitle: `Your nurses could reclaim ${formatNumber(totalHoursSaved)} hours. Here's how that creates value.`,
      driver1Title: 'OT Reduction',
      driver1Subtitle: 'When nurses finish charting faster, they leave on time',
      driver2Title: 'Retention Savings',
      driver2Subtitle: 'Reduced documentation burden helps retain experienced nurses',
      driver3Title: 'Care Time',
      driver3Subtitle: 'Time returned to direct patient care',
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
      // Nursing: OT Reduction + Retention + Agency Cost Avoidance
      // Care Quality (HAPI, Falls) is shown separately as "potential" value on Care Quality page
      total += nursingOtValue + nursingRetentionValue;
      if (timeDriverInputs.nursingAgencyEnabled) {
        total += nursingAgencyCalcs.agencySavings;
      }
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
  }, [isED, isInpatient, isNursing, potentialRevenue, timeDriverInputs, retentionCalcs.retentionValue, edLwbsValue, edAdmissionCaptureValue, nursingOtValue, nursingRetentionValue, nursingAgencyCalcs.agencySavings, nursingCareQualityCalcs.totalPreventionValue]);

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
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.edLwbsEnabled 
                ? (timeDriverInputs.edLwbsExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white/70 hover:bg-white rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.edLwbsEnabled && (
                  <button
                    onClick={() => updateTimeDriverInputs({ edLwbsExpanded: !timeDriverInputs.edLwbsExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-lwbs-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.edLwbsExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ edLwbsEnabled: !timeDriverInputs.edLwbsEnabled, edLwbsExpanded: !timeDriverInputs.edLwbsEnabled ? true : timeDriverInputs.edLwbsExpanded })}
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
            {timeDriverInputs.edLwbsEnabled && timeDriverInputs.edLwbsExpanded && (
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.ipRoundingEnabled 
                ? (timeDriverInputs.ipRoundingExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white/70 hover:bg-white rounded-lg"
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
                    onClick={() => updateTimeDriverInputs({ ipRoundingExpanded: !timeDriverInputs.ipRoundingExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-rounding-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.ipRoundingExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ ipRoundingEnabled: !timeDriverInputs.ipRoundingEnabled, ipRoundingExpanded: !timeDriverInputs.ipRoundingEnabled ? true : timeDriverInputs.ipRoundingExpanded })}
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
            {timeDriverInputs.ipRoundingEnabled && timeDriverInputs.ipRoundingExpanded && (
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.nursingOtEnabled 
                ? (timeDriverInputs.nursingOtExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white/70 hover:bg-white rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Chevron - only show when enabled */}
                {timeDriverInputs.nursingOtEnabled && (
                  <button
                    onClick={() => updateTimeDriverInputs({ nursingOtExpanded: !timeDriverInputs.nursingOtExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-ot-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.nursingOtExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ nursingOtEnabled: !timeDriverInputs.nursingOtEnabled, nursingOtExpanded: !timeDriverInputs.nursingOtEnabled ? true : timeDriverInputs.nursingOtExpanded })}
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
            {timeDriverInputs.nursingOtEnabled && timeDriverInputs.nursingOtExpanded && (
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

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">TIME-TO-OT CONVERSION</p>
                  <p className="text-sm text-[#888888] mb-3">What percentage of time saved could realistically reduce overtime?</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: 'Conservative', value: 15 },
                      { label: 'Typical', value: 25 },
                      { label: 'Aggressive', value: 40 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => updateTimeDriverInputs({ nursingOtReductionPercent: preset.value })}
                        className={`py-3 px-2 rounded-lg border-2 text-center transition-all ${
                          timeDriverInputs.nursingOtReductionPercent === preset.value
                            ? 'border-[#EA2C00] bg-[#F5F0EB]'
                            : 'border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]'
                        }`}
                        data-testid={`preset-ot-${preset.label.toLowerCase()}`}
                      >
                        <span className="block text-xs font-semibold text-black">{preset.label}</span>
                        <span className="block text-xs text-[#888888]">{preset.value}%</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#888888] mb-6">
                    Most organizations see 15-30% of documentation time savings convert to OT reduction. The rest goes to care time or operational efficiency.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">YOUR ORGANIZATION</p>
                  <div className="space-y-2.5 mb-6">
                    <label className="text-sm text-[#888888]">Average OT hourly rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                      <FormattedNumberInput
                        value={timeDriverInputs.nursingOtHourlyRate}
                        onChange={(v: number) => updateTimeDriverInputs({ nursingOtHourlyRate: v })}
                        className="h-12 bg-white pl-7"
                      />
                    </div>
                    <p className="text-xs text-[#888888]">1.5x base rate is typical. Adjust based on your blended OT rate.</p>
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">CALCULATION</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Time saved (from previous step)</span>
                        <span className="font-semibold text-black">{formatNumber(totalHoursSaved)} hrs/yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Time-to-OT conversion</span>
                        <span className="font-semibold text-black">{timeDriverInputs.nursingOtReductionPercent}%</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= OT hours eliminated</span>
                        <span className="font-semibold text-black">{formatNumber(nursingOtHoursEliminated)} hrs/yr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× OT hourly rate</span>
                        <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingOtHourlyRate)}</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#666666] font-medium">Annual OT Savings</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(nursingOtValue)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
                    <p className="text-xs text-[#888888]">
                      <span className="font-medium">Validation tip:</span> Check this against your current OT spend. If this exceeds your total nursing OT budget, lower the conversion rate.
                    </p>
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.patientAccessEnabled 
                ? (timeDriverInputs.patientAccessExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
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
                    onClick={() => updateTimeDriverInputs({ patientAccessExpanded: !timeDriverInputs.patientAccessExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-patient-access-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.patientAccessExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ patientAccessEnabled: !timeDriverInputs.patientAccessEnabled, patientAccessExpanded: !timeDriverInputs.patientAccessEnabled ? true : timeDriverInputs.patientAccessExpanded })}
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
            {timeDriverInputs.patientAccessEnabled && timeDriverInputs.patientAccessExpanded && (
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.edThroughputEnabled 
                ? (timeDriverInputs.edThroughputExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver2Title}</p>
                <p className="text-sm text-[#888888]">{config.driver2Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.edThroughputEnabled && (
                  <button
                    onClick={() => updateTimeDriverInputs({ edThroughputExpanded: !timeDriverInputs.edThroughputExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-throughput-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.edThroughputExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ edThroughputEnabled: !timeDriverInputs.edThroughputEnabled, edThroughputExpanded: !timeDriverInputs.edThroughputEnabled ? true : timeDriverInputs.edThroughputExpanded })}
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
            {timeDriverInputs.edThroughputEnabled && timeDriverInputs.edThroughputExpanded && (
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.nursingRetentionEnabled 
                ? (timeDriverInputs.nursingRetentionExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white/70 hover:bg-white rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver2Title}</p>
                <p className="text-sm text-[#888888]">{config.driver2Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {timeDriverInputs.nursingRetentionEnabled && (
                  <button
                    onClick={() => updateTimeDriverInputs({ nursingRetentionExpanded: !timeDriverInputs.nursingRetentionExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-nursing-retention-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.nursingRetentionExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ nursingRetentionEnabled: !timeDriverInputs.nursingRetentionEnabled, nursingRetentionExpanded: !timeDriverInputs.nursingRetentionEnabled ? true : timeDriverInputs.nursingRetentionExpanded })}
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
            {timeDriverInputs.nursingRetentionEnabled && timeDriverInputs.nursingRetentionExpanded && (
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
                    Of nurses who leave, roughly 40% cite burnout-related reasons. Reducing charting time directly addresses this driver.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">YOUR ORGANIZATION</p>
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

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">ABRIDGE IMPACT ON RETENTION</p>
                  <p className="text-sm text-[#888888] mb-3">How much could reducing documentation burden impact burnout-driven departures?</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: 'Conservative', value: 'conservative' as RetentionScenario, pct: 10 },
                      { label: 'Typical', value: 'typical' as RetentionScenario, pct: 15 },
                      { label: 'Optimistic', value: 'optimistic' as RetentionScenario, pct: 25 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => updateTimeDriverInputs({ retentionImpactScenario: preset.value })}
                        className={`py-3 px-2 rounded-lg border-2 text-center transition-all ${
                          timeDriverInputs.retentionImpactScenario === preset.value
                            ? 'border-[#EA2C00] bg-[#F5F0EB]'
                            : 'border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]'
                        }`}
                        data-testid={`preset-retention-${preset.label.toLowerCase()}`}
                      >
                        <span className="block text-xs font-semibold text-black">{preset.label}</span>
                        <span className="block text-xs text-[#888888]">{preset.pct}% impact</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#888888] mb-6">
                    Applied to the 40% of departures that are burnout-related.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">CALCULATION</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">{state.numberOfProviders} nurses × {timeDriverInputs.nursingTurnoverRate}% turnover</span>
                        <span className="font-semibold text-black">{nursingRetentionCalcs.leavingPerYear.toFixed(1)} leaving/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× 40% burnout-related</span>
                        <span className="font-semibold text-black">{nursingRetentionCalcs.burnoutDepartures.toFixed(1)} burnout departures</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× {nursingRetentionImpactRates[timeDriverInputs.retentionImpactScenario]}% Abridge impact</span>
                        <span className="font-semibold text-black">{nursingRetentionCalcs.retained.toFixed(2)} nurses retained</span>
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

        {/* Clinician Wellbeing Toggle - Not shown for Nursing (has own retention driver) */}
        {!isNursing && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.wellbeingEnabled 
                ? (timeDriverInputs.wellbeingExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
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
                    onClick={() => updateTimeDriverInputs({ wellbeingExpanded: !timeDriverInputs.wellbeingExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-wellbeing-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.wellbeingExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ wellbeingEnabled: !timeDriverInputs.wellbeingEnabled, wellbeingExpanded: !timeDriverInputs.wellbeingEnabled ? true : timeDriverInputs.wellbeingExpanded })}
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
            {timeDriverInputs.wellbeingEnabled && timeDriverInputs.wellbeingExpanded && (
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
            className={`w-full p-4 text-left transition-all ${
              timeDriverInputs.nursingCareTimeEnabled 
                ? (timeDriverInputs.nursingCareTimeExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white/70 hover:bg-white rounded-lg"
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
                {timeDriverInputs.nursingCareTimeEnabled && (
                  <button
                    onClick={() => updateTimeDriverInputs({ nursingCareTimeExpanded: !timeDriverInputs.nursingCareTimeExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-care-time-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.nursingCareTimeExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateTimeDriverInputs({ nursingCareTimeEnabled: !timeDriverInputs.nursingCareTimeEnabled, nursingCareTimeExpanded: !timeDriverInputs.nursingCareTimeEnabled ? true : timeDriverInputs.nursingCareTimeExpanded })}
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
            {timeDriverInputs.nursingCareTimeEnabled && timeDriverInputs.nursingCareTimeExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE CONNECTION</p>
                  <p className="text-sm text-black mb-6">
                    After accounting for OT reduction, the remaining time is returned to direct patient care. 
                    More time at the bedside improves patient outcomes and satisfaction.
                  </p>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">HOW MUCH TIME GOES TO DIRECT CARE?</p>
                  <p className="text-sm text-[#666666] mb-4">
                    Of the time saved (after OT reduction), how much do you expect nurses to dedicate to patient care activities? The remainder is absorbed into operational efficiency.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-black font-medium">Time to care:</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#888888]">0% = all absorbed</span>
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
                        <span className="text-xs text-[#888888]">100% = all to care</span>
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
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">TIME ALLOCATION</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    {(() => {
                      const timeAfterOT = Math.max(0, totalHoursSaved - nursingOtHoursEliminated);
                      const careHours = Math.round(timeAfterOT * (timeDriverInputs.nursingCareTimePercent / 100));
                      const absorbedHours = timeAfterOT - careHours;
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Time saved after OT</span>
                            <span className="font-semibold text-black">{formatNumber(timeAfterOT)} hrs</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[#888888]">({formatNumber(totalHoursSaved)} total - {formatNumber(nursingOtHoursEliminated)} to OT)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">× Time to care</span>
                            <span className="font-semibold text-black">{timeDriverInputs.nursingCareTimePercent}%</span>
                          </div>
                          <div className="h-px bg-[#E5E5E5] my-2" />
                          <div className="flex justify-between">
                            <span className="text-[#666666]">= Time returned to bedside</span>
                            <span className="font-semibold text-[#EA2C00]">{formatNumber(careHours)} hrs/yr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Absorbed into efficiency</span>
                            <span className="font-semibold text-[#888888]">{formatNumber(absorbedHours)} hrs/yr</span>
                          </div>
                          <div className="text-xs text-[#888888] italic">(no dollar value calculated)</div>
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mt-6 mb-3">WHERE DOES CARE TIME GO?</p>
                  <ul className="space-y-2 text-sm text-[#333333] list-disc pl-5 mb-6">
                    <li>Reduced falls through more frequent rounding</li>
                    <li>Fewer pressure injuries with timely assessments</li>
                    <li>Higher patient satisfaction (HCAHPS)</li>
                    <li>Better clinical outcomes overall</li>
                  </ul>

                  <div className="bg-[#F5F0EB]/60 rounded-lg p-3">
                    <p className="text-xs text-[#888888]">
                      We don't calculate a dollar value for care time because the link to outcomes is indirect. But we DO explore the potential quality impact in the next section.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Optional Section */}
        <motion.div
          className="mt-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#D1D5DB]" />
            <span className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px]">Optional</span>
            <div className="h-px flex-1 bg-[#D1D5DB]" />
          </div>

          {/* Cost Reduction Toggle */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 text-left transition-all ${
                timeDriverInputs.costReductionEnabled 
                  ? (timeDriverInputs.costReductionExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                  : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-black">Cost Reduction</p>
                  <p className="text-sm text-[#888888]">If reclaimed time reduces locums, deferred hiring, or other costs</p>
                </div>
                <div className="flex items-center gap-3">
                  {timeDriverInputs.costReductionEnabled && (
                    <button
                      onClick={() => updateTimeDriverInputs({ costReductionExpanded: !timeDriverInputs.costReductionExpanded })}
                      className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                      data-testid="button-cost-reduction-expand"
                    >
                      <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.costReductionExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                  )}
                  <button
                    onClick={() => updateTimeDriverInputs({ costReductionEnabled: !timeDriverInputs.costReductionEnabled, costReductionExpanded: !timeDriverInputs.costReductionEnabled ? true : timeDriverInputs.costReductionExpanded })}
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
              {timeDriverInputs.costReductionEnabled && timeDriverInputs.costReductionExpanded && (
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
                      Common sources: Fewer locums, deferred hiring
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Agency Cost Avoidance - Nursing Only */}
        {isNursing && (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="space-y-0">
            <div
              className={`w-full p-4 text-left transition-all ${
                timeDriverInputs.nursingAgencyEnabled 
                  ? (timeDriverInputs.nursingAgencyExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                  : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-black">Agency Labor Reduction</p>
                  <p className="text-sm text-[#888888]">If better retention reduces your need for travel nurses</p>
                </div>
                <div className="flex items-center gap-3">
                  {timeDriverInputs.nursingAgencyEnabled && (
                    <button
                      onClick={() => updateTimeDriverInputs({ nursingAgencyExpanded: !timeDriverInputs.nursingAgencyExpanded })}
                      className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                      data-testid="button-agency-expand"
                    >
                      <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${timeDriverInputs.nursingAgencyExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                  )}
                  <button
                    onClick={() => updateTimeDriverInputs({ nursingAgencyEnabled: !timeDriverInputs.nursingAgencyEnabled, nursingAgencyExpanded: !timeDriverInputs.nursingAgencyEnabled ? true : timeDriverInputs.nursingAgencyExpanded })}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      timeDriverInputs.nursingAgencyEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                    }`}
                    data-testid="toggle-agency-cost"
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      timeDriverInputs.nursingAgencyEnabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {timeDriverInputs.nursingAgencyEnabled && timeDriverInputs.nursingAgencyExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE LOGIC</p>
                    <p className="text-sm text-black mb-6">
                      When nurses leave, hospitals fill gaps with agency or travel nurses at 2-3x the cost. 
                      Better retention directly reduces this premium labor spend.
                    </p>

                    {!timeDriverInputs.nursingRetentionEnabled ? (
                      <div className="bg-[#FFF8F6] border border-[#FFDDD6] rounded-lg p-4 mb-4">
                        <p className="text-sm text-[#EA2C00]">
                          Enable Retention Savings above to calculate agency cost avoidance. 
                          Agency savings are derived from the number of nurses retained.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">YOUR ORGANIZATION</p>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="space-y-2.5">
                            <label className="text-sm text-[#888888]">Weeks of agency coverage per vacancy</label>
                            <FormattedNumberInput
                              value={timeDriverInputs.nursingAgencyWeeksPerVacancy}
                              onChange={(v: number) => updateTimeDriverInputs({ nursingAgencyWeeksPerVacancy: v })}
                              className="h-12 bg-white"
                              data-testid="input-agency-weeks"
                            />
                            <p className="text-xs text-[#888888]">Average time to fill a nursing vacancy</p>
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-sm text-[#888888]">Weekly agency premium (above base cost)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={timeDriverInputs.nursingAgencyWeeklyPremium}
                                onChange={(v: number) => updateTimeDriverInputs({ nursingAgencyWeeklyPremium: v })}
                                className="h-12 bg-white pl-7"
                                data-testid="input-agency-premium"
                              />
                            </div>
                            <p className="text-xs text-[#888888]">Additional cost per week for agency vs. permanent staff</p>
                          </div>
                        </div>

                        <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">CALCULATION</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Nurses retained (from Retention)</span>
                              <span className="font-semibold text-black">{nursingRetentionCalcs.retained.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">× Weeks of agency coverage avoided</span>
                              <span className="font-semibold text-black">{timeDriverInputs.nursingAgencyWeeksPerVacancy} weeks</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">× Weekly agency premium</span>
                              <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingAgencyWeeklyPremium)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between">
                              <span className="text-[#666666] font-medium">Annual Agency Savings</span>
                              <span className="font-bold text-[#EA2C00]">{formatCurrency(nursingAgencyCalcs.agencySavings)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
                          <p className="text-xs text-[#888888]">
                            This is separate from Retention Value. Retention captures replacement cost. Agency captures the premium labor cost during the vacancy period.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        )}

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex flex-col items-center gap-2 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
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
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
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
                          
                          {/* Direct Care */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                              <span className="text-xs text-[#888888]">Direct Care</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-white">{formatNumber(careHours)} hrs</span>
                              <span className="text-xs text-[#666666] ml-1">({timeDriverInputs.nursingCareTimePercent}%)</span>
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
                            <span className="text-lg font-bold text-white">{carePerNurseWeek} hrs</span>
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
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.nursingAgencyEnabled && nursingAgencyCalcs.agencySavings > 0 ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Agency Reduction</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.nursingAgencyEnabled && nursingAgencyCalcs.agencySavings > 0 ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.nursingAgencyEnabled && nursingAgencyCalcs.agencySavings > 0 ? formatCurrency(nursingAgencyCalcs.agencySavings) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.nursingAgencyEnabled && nursingAgencyCalcs.agencySavings > 0 && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">({timeDriverInputs.nursingAgencyWeeksPerVacancy} weeks × {formatCurrency(timeDriverInputs.nursingAgencyWeeklyPremium)})</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.nursingCareTimeEnabled ? 'bg-[#444444]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Care Time</span>
                        </div>
                        <span className="text-sm font-semibold text-[#666666]">—</span>
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

              <div className="hidden lg:block">
              <div className="h-px bg-[#333333] my-4" />

              <Button
                onClick={onNext}
                className="w-full h-11 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
                data-testid="button-panel-continue"
              >
                Continue to Documentation
                <ArrowRight className="w-4 h-4" />
              </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
