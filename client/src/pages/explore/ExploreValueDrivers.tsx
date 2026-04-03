import { useMemo } from "react";
import { ArrowRight, AlertTriangle, ChevronDown, Check, Plus, Trash2, Info } from "lucide-react";
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
  const isOutpatientSetting = state.careSetting === 'outpatient';
  const isED = state.careSetting === 'ed';

  const effectiveAccessProviders = Math.min(timeDriverInputs.accessProviders || state.numberOfProviders, state.numberOfProviders);

  const derivedVisitsPerWeek = useMemo(() => {
    if (state.numberOfProviders <= 0 || totalHoursSaved <= 0) return 0;
    const hrsPerProvPerWeek = totalHoursSaved / state.numberOfProviders / 48;
    const reinvestmentRate = (timeDriverInputs.capacityRealizationPercent || 30) / 100;
    const visitDurationHrs = (timeDriverInputs.visitDuration || 30) / 60;
    if (visitDurationHrs <= 0) return 0;
    return Math.round((hrsPerProvPerWeek * reinvestmentRate / visitDurationHrs) * 10) / 10;
  }, [totalHoursSaved, state.numberOfProviders, timeDriverInputs.capacityRealizationPercent, timeDriverInputs.visitDuration]);

  const potentialVisits = useMemo(() => {
    return derivedVisitsPerWeek * effectiveAccessProviders * 48;
  }, [derivedVisitsPerWeek, effectiveAccessProviders]);

  const potentialRevenue = useMemo(() => {
    return potentialVisits * timeDriverInputs.revenuePerVisit;
  }, [potentialVisits, timeDriverInputs.revenuePerVisit]);

  const hoursPerProviderPerWeek = useMemo(() => {
    if (state.numberOfProviders <= 0) return '0';
    return (totalHoursSaved / state.numberOfProviders / 48).toFixed(1);
  }, [totalHoursSaved, state.numberOfProviders]);

  // Retention value calculations
  const retentionScenarios: Record<RetentionScenario, number> = {
    conservative: 5,
    typical: 10,
    optimistic: 15,
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
    const lwbsPatients = state.annualEncounters * (timeDriverInputs.edLwbsRate / 100);
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
  // OT Reduction: Grounded in actual OT hours per nurse
  const nursingCurrentOtHoursPerYear = useMemo(() => {
    return state.numberOfProviders * timeDriverInputs.nursingOtHoursPerNurseWeek * 52;
  }, [state.numberOfProviders, timeDriverInputs.nursingOtHoursPerNurseWeek]);

  const nursingOtHoursEliminated = useMemo(() => {
    if (!timeDriverInputs.nursingOtEnabled) return 0;
    return Math.round(nursingCurrentOtHoursPerYear * (timeDriverInputs.nursingOtReductionPercent / 100));
  }, [nursingCurrentOtHoursPerYear, timeDriverInputs.nursingOtEnabled, timeDriverInputs.nursingOtReductionPercent]);

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
    if (state.careSetting !== 'nursing') {
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
    
    // Falls prevention calculation (rate is per 1,000 patient days)
    const fallsPerYear = (patientDaysPerYear / 1000) * timeDriverInputs.nursingFallsRate;
    const preventableFalls = fallsPerYear * (timeDriverInputs.nursingFallsPreventablePct / 100);
    const grossFallsValue = preventableFalls * timeDriverInputs.nursingCostPerFall;
    
    // HAPI prevention calculation (rate is per 1,000 patient days)
    const hapisPerYear = (patientDaysPerYear / 1000) * timeDriverInputs.nursingHapiRate;
    const preventableHapis = hapisPerYear * (timeDriverInputs.nursingHapiPreventablePct / 100);
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
    };
  }, [
    state.careSetting,
    state.nursingStaffedBeds,
    state.nursingOccupancyRate,
    totalHoursSaved,
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
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';

  const driverConfig = {
    outpatient: {
      pageTitle: 'What Could That Time Be Worth?',
      pageSubtitle: `Your providers could reclaim ${formatNumber(totalHoursSaved)} hours. Different organizations use that time in different ways.`,
      driver1Title: 'Patient Access',
      driver1Subtitle: 'If providers use time to see more patients',
      driver2Title: 'Clinician Sustainability',
      driver2Subtitle: 'If time improves work-life balance and retention',
      driver3Title: '',
      driver3Subtitle: '',
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
      driver3Title: 'Real-Time Care Visibility',
      driver3Subtitle: 'Time saved becomes real-time documentation — the visibility layer that enables earlier intervention',
    },
  };

  const config = driverConfig[state.careSetting || 'outpatient'];

  // Calculate total time value based on care setting
  const totalTimeValue = useMemo(() => {
    let total = 0;
    
    if (isED) {
      // ED uses LWBS and Admission Capture
      total += edLwbsValue + edAdmissionCaptureValue;
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        total += retentionCalcs.retentionValue;
      }
    } else if (isInpatient) {
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
      if (timeDriverInputs.nursingAdditionalCostSavings.length > 0) {
        total += timeDriverInputs.nursingAdditionalCostSavings.filter(item => item.label.trim()).reduce((sum, item) => sum + (item.amount || 0), 0);
      }
    } else {
      // Outpatient uses Patient Access and Wellbeing/Retention
      if (timeDriverInputs.patientAccessEnabled) {
        total += potentialRevenue;
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
          <div className="flex-1 min-w-0 max-w-[700px]">

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
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
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
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
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

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your ED</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Current LWBS rate</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.edLwbsRate}
                          placeholder="e.g., 3"
                          onChange={(v: number) => updateTimeDriverInputs({ edLwbsRate: v })}
                          className="h-12 bg-white pr-8"
                          data-testid="input-lwbs-rate"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                      <p className="text-xs text-[#888888]">National average: 2-5%. High-volume urban EDs may exceed 5%.</p>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Revenue per ED visit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={timeDriverInputs.edRevenuePerVisit}
                          placeholder="e.g., 350"
                          onChange={(v: number) => updateTimeDriverInputs({ edRevenuePerVisit: v })}
                          className="h-12 bg-white pl-7"
                          data-testid="input-ed-revenue-per-visit"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-[#888888]">Expected LWBS reduction from faster documentation</label>
                      <span className="text-sm font-semibold text-black">{timeDriverInputs.edLwbsReduction}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={40}
                      step={1}
                      value={timeDriverInputs.edLwbsReduction}
                      onChange={(e) => updateTimeDriverInputs({ edLwbsReduction: Number(e.target.value) })}
                      className="w-full accent-[#EA2C00]"
                      data-testid="slider-lwbs-reduction"
                    />
                    <div className="flex gap-2">
                      {[
                        { label: 'Conservative', value: 10, desc: 'Modest wait-time improvement' },
                        { label: 'Moderate', value: 20, desc: 'Consistent with published data' },
                        { label: 'Aggressive', value: 30, desc: 'Strong adoption + workflow redesign' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => updateTimeDriverInputs({ edLwbsReduction: preset.value })}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
                            timeDriverInputs.edLwbsReduction === preset.value
                              ? 'bg-[#EA2C00] text-white'
                              : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                          }`}
                          data-testid={`button-lwbs-preset-${preset.label.toLowerCase()}`}
                        >
                          <span className="font-medium">{preset.label}</span>
                          <span className="block text-[10px] mt-0.5 opacity-80">{preset.value}%</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#888888]">
                      Door-to-doc time is the strongest predictor of LWBS rates (Welch et al., Annals of Emergency Medicine). Faster documentation directly reduces door-to-doc time, lowering the probability that patients leave before being seen.
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-3">
                      <p className="text-xs text-[#666666]">
                        Your ED currently sees ~<span className="font-semibold text-black">{formatNumber(Math.round(state.annualEncounters * (timeDriverInputs.edLwbsRate / 100)))}</span> LWBS patients/year. At {timeDriverInputs.edLwbsReduction}% reduction, Abridge would recover ~<span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients))}</span> patients.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">Annual LWBS patients</span>
                        <span className="font-semibold text-black flex-shrink-0">{formatNumber(Math.round(state.annualEncounters * (timeDriverInputs.edLwbsRate / 100)))}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">× LWBS reduction</span>
                        <span className="font-semibold text-black flex-shrink-0">{timeDriverInputs.edLwbsReduction}%</span>
                      </div>
                      
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= Patients recovered</span>
                        <span className="font-semibold text-black flex-shrink-0">{formatNumber(Math.round(edRecoveredPatients))}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">× Revenue per visit</span>
                        <span className="font-semibold text-black flex-shrink-0">{formatCurrency(timeDriverInputs.edRevenuePerVisit)}</span>
                      </div>
                      
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= Gross value</span>
                        <span className="font-semibold text-black flex-shrink-0">{formatCurrency(Math.round(edRecoveredPatients * timeDriverInputs.edRevenuePerVisit))}</span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-2">
                        <div>
                          <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" title="Realization rate accounts for the fact that not all gross opportunity converts to captured value — due to workflow variation, payer mix, coder judgment, or partial adoption. 75% means you capture 75 cents of every dollar the gross calculation shows." /></span>
                          <p className="text-xs text-[#888888]">(Not all recovered patients complete visits)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FormattedNumberInput
                            value={timeDriverInputs.edLwbsRealization}
                            onChange={(v: number) => updateTimeDriverInputs({ edLwbsRealization: v })}
                            className="h-7 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                          />
                          <span className="text-sm text-[#888888]">%</span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-[#333333] my-2" />
                      
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-black">Net LWBS Value</span>
                        <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(edLwbsValue)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border border-[#E5E5E5] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-semibold text-black">Include Admission Capture</p>
                        <p className="text-xs text-[#888888]">Some recovered patients require admission</p>
                      </div>
                      <button
                        onClick={() => updateTimeDriverInputs({ edThroughputEnabled: !timeDriverInputs.edThroughputEnabled })}
                        className={`w-10 h-5 rounded-full relative transition-all ${
                          timeDriverInputs.edThroughputEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                        }`}
                        data-testid="toggle-admission-capture"
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
                          timeDriverInputs.edThroughputEnabled ? 'right-0.5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>

                    {timeDriverInputs.edThroughputEnabled && !timeDriverInputs.edLwbsEnabled && (
                      <div className="mx-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        Admission Capture uses LWBS recovered patients as its base.
                        Enable LWBS Recovery above to see this value.
                      </div>
                    )}

                    {timeDriverInputs.edThroughputEnabled && (
                      <div className="px-4 pb-4">
                        <p className="text-xs text-[#666666] mb-3">
                          Of the {formatNumber(Math.round(edRecoveredPatients))} recovered patients, some will require inpatient admission — generating additional DRG-based revenue.
                        </p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">Recovered ED patients</span>
                              <span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients))}</span>
                            </div>
                            
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[#666666]">× Admission rate</span>
                              <div className="flex items-center gap-2">
                                <FormattedNumberInput
                                  value={timeDriverInputs.edAdmissionRate}
                                  onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRate: v })}
                                  className="h-7 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                                  data-testid="input-admission-rate"
                                />
                                <span className="text-sm text-[#888888]">%</span>
                              </div>
                            </div>
                            
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Potential admissions</span>
                              <span className="font-semibold text-black">{(edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100)).toFixed(1)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[#666666]">× Avg admission revenue</span>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-[#888888]">$</span>
                                <FormattedNumberInput
                                  value={timeDriverInputs.edAdmissionRevenue}
                                  onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRevenue: v })}
                                  className="h-7 w-20 text-center text-base bg-white border border-[#E5E5E5] rounded"
                                  data-testid="input-admission-revenue"
                                />
                              </div>
                            </div>
                            
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Gross value</span>
                              <span className="font-semibold text-black">{formatCurrency(Math.round(edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100) * timeDriverInputs.edAdmissionRevenue))}</span>
                            </div>
                            
                            <div className="flex justify-between items-center gap-2">
                              <div>
                                <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" title="Realization rate accounts for the fact that not all gross opportunity converts to captured value — due to workflow variation, payer mix, coder judgment, or partial adoption. 75% means you capture 75 cents of every dollar the gross calculation shows." /></span>
                                <p className="text-xs text-[#888888]">(Bed availability, payer mix)</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <FormattedNumberInput
                                  value={timeDriverInputs.edAdmissionRealization}
                                  onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRealization: v })}
                                  className="h-7 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                                  data-testid="input-admission-realization"
                                />
                                <span className="text-sm text-[#888888]">%</span>
                              </div>
                            </div>
                            
                            <div className="h-px bg-[#333333] my-2" />
                            
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-black">Admission Capture Value</span>
                              <span className="font-bold text-[#EA2C00]">{formatCurrency(edAdmissionCaptureValue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                      ~{state.numberOfProviders > 0 ? formatNumber(Math.round(totalHoursSaved / state.numberOfProviders)) : 0} hours per hospitalist · ~{state.numberOfProviders > 0 ? (totalHoursSaved / state.numberOfProviders / 48).toFixed(1) : '0'} hours per week
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
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
                  <p className="text-sm text-black mb-6">
                    When nurses spend less time documenting, they're more likely to finish their shift on time. 
                    This driver is grounded in your actual overtime situation — how much OT your nurses work today and how much you believe better documentation can reduce it.
                  </p>

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">YOUR ORGANIZATION</p>
                  <div className="space-y-4 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Current OT hours per nurse per week</label>
                      <FormattedNumberInput
                        value={timeDriverInputs.nursingOtHoursPerNurseWeek}
                        onChange={(v: number) => updateTimeDriverInputs({ nursingOtHoursPerNurseWeek: v })}
                        className="h-12 bg-white"
                        data-testid="input-nursing-ot-hours-per-week"
                      />
                      <p className="text-xs text-[#888888]">National average is 3-5 hrs/week. Enter your organization's average.</p>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Expected OT reduction from better documentation</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={75}
                          step={5}
                          value={timeDriverInputs.nursingOtReductionPercent}
                          onChange={(e) => updateTimeDriverInputs({ nursingOtReductionPercent: Number(e.target.value) })}
                          className="flex-1 accent-[#EA2C00]"
                          data-testid="slider-nursing-ot-reduction"
                        />
                        <span className="text-sm font-semibold text-black w-12 text-right">{timeDriverInputs.nursingOtReductionPercent}%</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {[
                          { label: 'Conservative', value: 15 },
                          { label: 'Moderate', value: 25 },
                          { label: 'Aggressive', value: 40 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => updateTimeDriverInputs({ nursingOtReductionPercent: preset.value })}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              timeDriverInputs.nursingOtReductionPercent === preset.value
                                ? 'bg-[#EA2C00] text-white border-[#EA2C00]'
                                : 'border-[#E5E5E5] text-[#888888] hover:border-[#D1D5DB]'
                            }`}
                            data-testid={`button-ot-preset-${preset.label.toLowerCase()}`}
                          >
                            {preset.label} ({preset.value}%)
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[#888888]">Not all OT is documentation-related. This is the share you believe Abridge can impact.</p>
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
                      <p className="text-xs text-[#888888]">1.5x base rate is typical. Adjust based on your blended OT rate.</p>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">CALCULATION</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">{state.numberOfProviders} nurses × {timeDriverInputs.nursingOtHoursPerNurseWeek} OT hrs/wk × 52 weeks</span>
                        <span className="font-semibold text-black">{formatNumber(nursingCurrentOtHoursPerYear)} hrs/yr</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">× {timeDriverInputs.nursingOtReductionPercent}% expected reduction</span>
                        <span className="font-semibold text-black">{formatNumber(nursingOtHoursEliminated)} hrs</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">× ${timeDriverInputs.nursingOtHourlyRate}/hr OT rate</span>
                        <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingOtHourlyRate)}</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] font-medium">Annual OT Savings</span>
                        <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(nursingOtValue)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
                    <p className="text-xs text-[#888888]">
                      <span className="font-medium">Validation tip:</span> Your current annual OT spend is ~{formatCurrency(nursingCurrentOtHoursPerYear * timeDriverInputs.nursingOtHourlyRate)}. This model saves {formatCurrency(nursingOtValue)} ({timeDriverInputs.nursingOtReductionPercent}% of that).
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
                    What percentage of recovered documentation time could realistically be reinvested into seeing additional patients?
                  </p>

                  <div className="space-y-3 mb-6">
                    <label className="text-sm text-[#888888]">Time reinvestment rate</label>
                    <div className="flex gap-2">
                      {[
                        { label: 'Conservative', value: 20, desc: 'Minimal scheduling changes' },
                        { label: 'Moderate', value: 30, desc: 'Intentional template adjustments' },
                        { label: 'Aggressive', value: 40, desc: 'Active capacity expansion' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => updateTimeDriverInputs({ capacityRealizationPercent: preset.value })}
                          className={`flex-1 py-2.5 px-2 rounded-lg text-xs transition-all ${
                            timeDriverInputs.capacityRealizationPercent === preset.value
                              ? 'bg-[#EA2C00] text-white'
                              : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                          }`}
                          data-testid={`button-reinvestment-preset-${preset.label.toLowerCase()}`}
                        >
                          <span className="font-medium">{preset.label}</span>
                          <span className="block text-[10px] mt-0.5 opacity-80">{preset.value}%</span>
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#F5F0EB] rounded-lg px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-[#666666]">Derived visits per provider per week</span>
                      <span className="text-2xl font-bold text-black" data-testid="text-visits-per-week">{derivedVisitsPerWeek}</span>
                    </div>

                    <p className="text-xs text-[#888888]">
                      Most recovered documentation time is absorbed into quality of life, inbox, and longer patient conversations — not additional visits. Only a fraction converts to schedulable capacity.
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Providers with scheduling capacity</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={state.numberOfProviders}
                          value={effectiveAccessProviders}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(state.numberOfProviders, parseInt(e.target.value) || 1));
                            updateTimeDriverInputs({ accessProviders: v });
                          }}
                          className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 text-black font-semibold text-base"
                          data-testid="input-access-providers"
                        />
                      </div>
                      <p className="text-xs text-[#888888]">
                        How many of your {state.numberOfProviders} providers have the scheduling flexibility to see additional patients?
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="space-y-2.5">
                      <label className="text-sm text-[#888888]">Average visit duration</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.visitDuration}
                          onChange={(v: number) => updateTimeDriverInputs({ visitDuration: v })}
                          className="h-12 bg-white pr-12"
                          data-testid="input-visit-duration"
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
                          data-testid="input-revenue-per-visit"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">How we got here</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">Time saved per provider</span>
                        <span className="font-semibold text-black flex-shrink-0">{hoursPerProviderPerWeek} hrs/wk</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">× {timeDriverInputs.capacityRealizationPercent}% reinvested ÷ {timeDriverInputs.visitDuration} min/visit</span>
                        <span className="font-semibold text-black flex-shrink-0">= {derivedVisitsPerWeek} visits/wk</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">{derivedVisitsPerWeek} visits/wk × {effectiveAccessProviders} providers × 48 wks</span>
                        <span className="font-semibold text-black flex-shrink-0">= {formatNumber(potentialVisits)} visits/yr</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">× {formatCurrency(timeDriverInputs.revenuePerVisit)} per visit</span>
                        <span className="font-bold text-[#EA2C00] flex-shrink-0">= {formatCurrency(potentialRevenue)}/yr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* DRIVER 2 - Care Setting Specific */}
        
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
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
                  <p className="text-sm text-black mb-3">
                    Documentation burden is a leading contributor to nurse burnout and turnover. 
                    Of nurses who leave, roughly 40% cite burnout-related reasons. Reducing charting time directly addresses this driver.
                  </p>
                  <p className="text-sm text-[#666666] mb-6">
                    Reclaimed documentation time reduces end-of-shift pressure — the primary mechanism behind burnout reduction. Less charting burden means less burnout-driven turnover.
                  </p>

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">YOUR ORGANIZATION</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
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

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">ABRIDGE IMPACT ON RETENTION</p>
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

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">CALCULATION</p>
                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">{state.numberOfProviders} nurses × {timeDriverInputs.nursingTurnoverRate}% turnover</span>
                        <span className="font-semibold text-black">{nursingRetentionCalcs.leavingPerYear.toFixed(1)} leaving/year</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">× 40% burnout-related</span>
                        <span className="font-semibold text-black">{nursingRetentionCalcs.burnoutDepartures.toFixed(1)} burnout departures</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">× {nursingRetentionImpactRates[timeDriverInputs.retentionImpactScenario]}% Abridge impact</span>
                        <span className="font-semibold text-black">{nursingRetentionCalcs.retained.toFixed(2)} nurses retained</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] min-w-0">× Replacement cost</span>
                        <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingReplacementCost)}</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666] font-medium">Annual Retention Savings</span>
                        <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(nursingRetentionValue)}</span>
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
                <p className="font-semibold text-black">{(isInpatient || isOutpatientSetting) ? config.driver2Title : config.driver3Title}</p>
                <p className="text-sm text-[#888888]">{(isInpatient || isOutpatientSetting) ? config.driver2Subtitle : config.driver3Subtitle}</p>
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

                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
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
                          <p className="text-xs text-[#888888] italic mt-1">Estimated cost to replace a departing provider. Industry estimates range from $300K–$1M depending on specialty. Default is $400K (conservative midpoint).</p>
                        </div>

                        <div className="h-px bg-[#E5E5E5] my-4" />

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
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

                        <div className="text-[13px] text-[#666666] leading-relaxed space-y-2 mt-4">
                          <p><strong>Conservative (5%):</strong> Documentation burden is one of several burnout factors. Modest impact on departure decisions.</p>
                          <p><strong>Typical (10%):</strong> Documentation relief is a meaningful contributor in an org with high admin burden and strong Abridge adoption.</p>
                          <p><strong>Optimistic (15%):</strong> High documentation burden is a primary stated reason for departures. Validate with exit interview data.</p>
                          <p className="text-xs text-[#AAAAAA] mt-2 italic">These rates represent Abridge{"'"}s estimated contribution to burnout-related departure prevention {"—"} not total retention program impact.</p>
                        </div>

                        <div className="h-px bg-[#E5E5E5] my-4" />

                        {/* Calculation Card */}
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                            Calculation
                          </p>

                          <div className="space-y-2 text-sm font-mono">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">Providers</span>
                              <span className="text-black">{formatNumber(state.numberOfProviders)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">× Annual turnover rate</span>
                              <span className="text-black">{timeDriverInputs.annualTurnoverRate}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Providers leaving per year</span>
                              <span className="text-black">{retentionCalcs.providersLeavingPerYear.toFixed(1)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">× Burnout-related turnover</span>
                              <span className="text-black">{timeDriverInputs.burnoutRelatedTurnover}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Burnout-related departures</span>
                              <span className="text-black">{retentionCalcs.burnoutRelatedDepartures.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">× Abridge retention impact</span>
                              <span className="text-black">{retentionScenarios[timeDriverInputs.retentionImpactScenario]}%</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">= Providers retained</span>
                              <span className="text-black">{retentionCalcs.providersRetained.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">× Replacement cost</span>
                              <span className="text-black">{formatCurrency(timeDriverInputs.replacementCost)}</span>
                            </div>
                            <div className="h-px bg-[#888888] my-2" />
                            <div className="flex justify-between gap-2 font-semibold">
                              <span className="text-black">= Retention value</span>
                              <span className="text-[#EA2C00] flex-shrink-0">{formatCurrency(retentionCalcs.retentionValue)}</span>
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



        {/* Optional Section - Cost Reduction (inpatient only) */}
        {isInpatient && (
        <motion.div
          className="mt-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#D1D5DB]" />
            <span className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Optional</span>
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
        )}

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
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">THE LOGIC</p>
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
                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">YOUR ORGANIZATION</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
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

                        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">CALCULATION</p>
                        <div className="bg-[#F5F0EB] rounded-lg p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">Nurses retained (from Retention)</span>
                              <span className="font-semibold text-black">{nursingRetentionCalcs.retained.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">× Weeks of agency coverage avoided</span>
                              <span className="font-semibold text-black">{timeDriverInputs.nursingAgencyWeeksPerVacancy} weeks</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-[#666666]">× Weekly agency premium</span>
                              <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingAgencyWeeklyPremium)}</span>
                            </div>
                            <div className="h-px bg-[#E5E5E5] my-2" />
                            <div className="flex justify-between gap-2">
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

        {/* Additional Cost Savings - Nursing Only */}
        {isNursing && (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-white rounded-lg border border-dashed border-[#D1D5DB] hover:border-[#EA2C00]/40 transition-colors">
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-semibold text-black">Additional Cost Savings</p>
                  <p className="text-sm text-[#888888]">Capture other savings you expect from Abridge</p>
                </div>
                <button
                  onClick={() => {
                    const newItem = { id: `acs-${Date.now()}`, label: '', amount: 0 };
                    updateTimeDriverInputs({
                      nursingAdditionalCostSavings: [...timeDriverInputs.nursingAdditionalCostSavings, newItem]
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#EA2C00] bg-[#FFF8F6] hover:bg-[#FFDDD6]/60 rounded-md transition-colors"
                  data-testid="button-add-cost-saving"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                {timeDriverInputs.nursingAdditionalCostSavings.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-6 text-center"
                  >
                    <p className="text-sm text-[#AAAAAA]">
                      Think there's more savings? Add them here.
                    </p>
                    <p className="text-xs text-[#CCCCCC] mt-1">
                      e.g., Reduced supply waste, Fewer chart corrections, Staffing flexibility
                    </p>
                  </motion.div>
                ) : (
                  <motion.div layout className="space-y-3 mt-4">
                    {timeDriverInputs.nursingAdditionalCostSavings.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-3 group"
                        data-testid={`additional-cost-saving-${index}`}
                      >
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...timeDriverInputs.nursingAdditionalCostSavings];
                              updated[index] = { ...updated[index], label: e.target.value };
                              updateTimeDriverInputs({ nursingAdditionalCostSavings: updated });
                            }}
                            placeholder="e.g., Reduced supply waste"
                            className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00]/50 placeholder:text-[#CCCCCC]"
                            autoFocus={!item.label}
                            data-testid={`input-cost-saving-label-${index}`}
                          />
                        </div>
                        <div className="w-[140px] flex-shrink-0 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                          <FormattedNumberInput
                            value={item.amount}
                            onChange={(v: number) => {
                              const updated = [...timeDriverInputs.nursingAdditionalCostSavings];
                              updated[index] = { ...updated[index], amount: v };
                              updateTimeDriverInputs({ nursingAdditionalCostSavings: updated });
                            }}
                            className="h-10 bg-[#FAFAFA] pl-7"
                            data-testid={`input-cost-saving-amount-${index}`}
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = timeDriverInputs.nursingAdditionalCostSavings.filter((_, i) => i !== index);
                            updateTimeDriverInputs({ nursingAdditionalCostSavings: updated });
                          }}
                          className="p-2 text-[#CCCCCC] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                          data-testid={`button-remove-cost-saving-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {timeDriverInputs.nursingAdditionalCostSavings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 pt-3 border-t border-[#E5E5E5]"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#666666]">Total Additional Savings</span>
                    <span className="text-sm font-bold text-[#EA2C00]" data-testid="text-additional-savings-total">
                      {formatCurrency(timeDriverInputs.nursingAdditionalCostSavings.filter(item => item.label.trim()).reduce((sum, item) => sum + (item.amount || 0), 0))}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
        )}

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex flex-col items-center gap-2 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
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
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              {/* Header */}
              <div className="mb-4">
                <p className="text-xs font-medium text-white uppercase tracking-[1.5px]">
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
                      <div className="flex justify-between items-center gap-2">
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
                      {timeDriverInputs.edLwbsEnabled && timeDriverInputs.edThroughputEnabled && (
                        <div className="ml-4 mt-1.5">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs text-[#888888]">+ Admission Capture</span>
                            <span className="text-xs font-semibold text-white">{formatCurrency(edAdmissionCaptureValue)}</span>
                          </div>
                          <p className="text-xs text-[#666666] mt-0.5">({timeDriverInputs.edAdmissionRate}% admission rate)</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center gap-2">
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
                      <div className="flex justify-between items-center gap-2">
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
                      <div className="flex justify-between items-center gap-2">
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
                      <div className="flex justify-between items-center gap-2">
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
                      <div className="flex justify-between items-center gap-2">
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
                      <div className="flex justify-between items-center gap-2">
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
                      <div className="flex justify-between items-center gap-2">
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

                    {timeDriverInputs.nursingAdditionalCostSavings.filter(item => item.amount > 0 && item.label.trim()).map((item) => (
                      <div key={item.id}>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                            <span className="text-sm text-[#888888] truncate max-w-[120px]">{item.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))}

                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.patientAccessEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Patient Access</span>
                        </div>
                        <span className={`text-sm font-semibold ${timeDriverInputs.patientAccessEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {timeDriverInputs.patientAccessEnabled ? formatCurrency(potentialRevenue) : '—'}
                        </span>
                      </div>
                      {timeDriverInputs.patientAccessEnabled && (
                        <p className="text-xs text-[#666666] ml-4 mt-0.5">({derivedVisitsPerWeek} visit{derivedVisitsPerWeek !== 1 ? 's' : ''}/wk × {effectiveAccessProviders}{effectiveAccessProviders < state.numberOfProviders ? ` of ${state.numberOfProviders}` : ''} providers)</p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${timeDriverInputs.wellbeingEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Clinician Sustainability</span>
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
