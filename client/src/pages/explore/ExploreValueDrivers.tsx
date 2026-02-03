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
  }>({
    patientAccess: true,
    costReduction: true,
    wellbeing: true,
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

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  // Calculate total time value
  const totalTimeValue = useMemo(() => {
    let total = 0;
    if (timeDriverInputs.patientAccessEnabled) {
      total += potentialRevenue;
    }
    if (timeDriverInputs.costReductionEnabled) {
      total += timeDriverInputs.estimatedCostReduction;
    }
    if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
      total += retentionCalcs.retentionValue;
    }
    return total;
  }, [potentialRevenue, timeDriverInputs, retentionCalcs.retentionValue]);

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
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">

        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            What Could That Time Be Worth?
          </h1>
          <p className="text-base text-[#888888]">
            Your providers could reclaim <strong className="text-black">{formatNumber(totalHoursSaved)} hours</strong>. 
            Different organizations use that time in different ways.
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
            We can't tell you exactly how your organization will use reclaimed time. 
            But we can help you model different scenarios.
          </p>
          <p className="text-sm text-[#888888] mt-2">
            Engage with the drivers that are relevant to your situation. Skip the ones that aren't.
          </p>
        </motion.div>

        {/* Patient Access Toggle */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.patientAccessEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Patient Access</p>
                <p className="text-sm text-[#888888]">If providers use time to see more patients</p>
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
                    timeDriverInputs.patientAccessEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
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
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-black mb-4">
                    What percentage of reclaimed time could go toward patient care?
                  </p>

                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={timeDriverInputs.capacityPercent}
                      onChange={(e) => updateTimeDriverInputs({ capacityPercent: Number(e.target.value) })}
                      className="w-full accent-[#E85A2C] h-2"
                      data-testid="slider-capacity"
                    />
                    <div className="flex justify-between text-xs text-[#888888] mt-1">
                      <span>0%</span>
                      <span className="text-base font-semibold text-black">{timeDriverInputs.capacityPercent}%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-sm text-[#888888]">Average visit duration</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.visitDuration}
                          onChange={(v: number) => updateTimeDriverInputs({ visitDuration: v })}
                          className="h-10 bg-white pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">min</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-[#888888]">Revenue per visit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={timeDriverInputs.revenuePerVisit}
                          onChange={(v: number) => updateTimeDriverInputs({ revenuePerVisit: v })}
                          className="h-10 bg-white pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <p className="text-sm text-[#888888] mb-2">At {timeDriverInputs.capacityPercent}% of time toward capacity:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Hours toward patient care:</span>
                        <span className="font-semibold text-black">{formatNumber(hoursTowardCapacity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Potential additional visits:</span>
                        <span className="font-semibold text-black">{formatNumber(potentialVisits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Potential revenue:</span>
                        <span className="font-bold text-[#E85A2C]">{formatCurrency(potentialRevenue)}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mt-3 text-xs text-[#888888]">
                      <AlertTriangle className="w-4 h-4 text-[#E85A2C] flex-shrink-0 mt-0.5" />
                      <span>This assumes available demand and schedulable time.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cost Reduction Toggle */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.costReductionEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
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
                    timeDriverInputs.costReductionEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
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
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-black mb-3">
                    We can't calculate your cost reduction — every organization is different. 
                    But if you have an estimate, enter it here.
                  </p>

                  <div className="space-y-1.5 mb-3">
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

        {/* Clinician Wellbeing Toggle */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.wellbeingEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Clinician Wellbeing</p>
                <p className="text-sm text-[#888888]">If time improves work-life balance and retention</p>
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
                    timeDriverInputs.wellbeingEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
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
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-[#888888] mb-3">Your providers would get back:</p>

                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-[#E85A2C]">{hoursPerProviderPerWeek} hours per week</p>
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
                    className="flex items-center gap-3 text-sm text-black hover:text-[#E85A2C] transition-colors mb-4"
                    data-testid="checkbox-calculate-retention"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      timeDriverInputs.calculateRetentionValue 
                        ? 'bg-[#E85A2C] border-[#E85A2C]' 
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
                        <div className="h-px bg-[#E5E5E5] mb-4" />

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
                              className="h-10 bg-white pr-8"
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
                              className="h-10 bg-white pr-8"
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
                              className="h-10 bg-white pl-7"
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
                                  ? 'bg-[#E85A2C] border-[#E85A2C] text-white'
                                  : 'bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]'
                              }`}
                              data-testid={`button-scenario-${scenario}`}
                            >
                              <p className="text-xs capitalize mb-1">{scenario}</p>
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
                              <span className="text-[#E85A2C]">{formatCurrency(retentionCalcs.retentionValue)}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 mt-4 text-xs text-[#888888] italic">
                            <AlertTriangle className="w-4 h-4 text-[#E85A2C] flex-shrink-0 mt-0.5" />
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

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex flex-col items-center gap-2 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Documentation Quality
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-[#888888]">
            You can skip documentation drivers if not relevant
          </p>
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
              {/* Header */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
                  Time Value
                </p>
                <p className="text-sm text-[#888888] mt-1">Value summary</p>
              </div>

              {/* Hero Value */}
              <div className="text-center my-4">
                <p className="text-3xl md:text-4xl font-bold text-[#E85A2C]">
                  {formatCurrency(totalTimeValue)}
                </p>
                <p className="text-sm text-[#888888] mt-1">
                  From {formatNumber(totalHoursSaved)} hours saved
                </p>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Line Items */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${timeDriverInputs.patientAccessEnabled ? 'bg-[#E85A2C]' : 'bg-[#444444]'}`} />
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
                      <span className={`w-2 h-2 rounded-full ${timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? 'bg-[#E85A2C]' : 'bg-[#444444]'}`} />
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
                      <span className={`w-2 h-2 rounded-full ${timeDriverInputs.wellbeingEnabled ? 'bg-[#E85A2C]' : 'bg-[#444444]'}`} />
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
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Continue Button */}
              <Button
                onClick={onNext}
                className="w-full h-11 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
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
