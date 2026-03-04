import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimePathScenario } from "./ExploreFlow";

interface ExploreTimeSavingsProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreTimeSavings({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: ExploreTimeSavingsProps) {
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';

  const eligibleEncounters = useMemo(() => {
    return Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  }, [state.annualEncounters, state.utilizationPercent]);

  const scenarioMinutes: Record<string, number> = isED 
    ? { conservative: 2, typical: 3, aggressive: 4 }
    : isInpatient
      ? { conservative: 15, typical: 30, aggressive: 40 }  // Per admission for hospitalists
      : isNursing
        ? { conservative: 15, typical: 20, aggressive: 30 }  // Per shift for nursing
        : { conservative: 2, typical: 3, aggressive: 4 };

  // Nursing: Shift-based calculation (260 shifts/year per nurse FTE)
  const nursingShiftsPerYear = useMemo(() => {
    return state.numberOfProviders * state.nursingShiftsPerNurseYear;
  }, [state.numberOfProviders, state.nursingShiftsPerNurseYear]);

  const nursingEligibleShifts = useMemo(() => {
    return Math.round(nursingShiftsPerYear * (state.utilizationPercent / 100));
  }, [nursingShiftsPerYear, state.utilizationPercent]);

  const hoursSaved = useMemo(() => {
    if (isNursing) {
      // Nursing: time per shift × eligible shifts
      return Math.round((state.minutesSavedPerEncounter * nursingEligibleShifts) / 60);
    }
    return Math.round((state.minutesSavedPerEncounter * eligibleEncounters) / 60);
  }, [isNursing, state.minutesSavedPerEncounter, eligibleEncounters, nursingEligibleShifts]);

  const hoursPerProvider = useMemo(() => {
    return state.numberOfProviders > 0 ? Math.round(hoursSaved / state.numberOfProviders) : 0;
  }, [hoursSaved, state.numberOfProviders]);

  const hoursPerWeek = useMemo(() => {
    return state.numberOfProviders > 0 ? (hoursSaved / state.numberOfProviders / 48).toFixed(1) : '0';
  }, [hoursSaved, state.numberOfProviders]);

  const handleScenarioSelect = (scenario: 'conservative' | 'typical' | 'aggressive') => {
    updateState({
      timePathScenario: scenario,
      minutesSavedPerEncounter: scenarioMinutes[scenario],
    });
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const { timeDriverInputs } = state;
  const updateTimeDriverInputs = (updates: Partial<typeof timeDriverInputs>) => {
    updateState({
      timeDriverInputs: { ...timeDriverInputs, ...updates }
    });
  };

  const handleTimeAllocationChange = (field: 'nursingOtReductionPercent' | 'nursingShiftSustainabilityPercent' | 'nursingCareTimePercent', newValue: number) => {
    const clamped = Math.max(0, Math.min(100, newValue));
    const fields = ['nursingOtReductionPercent', 'nursingShiftSustainabilityPercent', 'nursingCareTimePercent'] as const;
    const otherFields = fields.filter(f => f !== field);
    const remaining = 100 - clamped;
    const otherSum = otherFields.reduce((s, f) => s + timeDriverInputs[f], 0);

    const updates: Partial<typeof timeDriverInputs> = { [field]: clamped };
    if (otherSum === 0) {
      updates[otherFields[0]] = Math.round(remaining / 2);
      updates[otherFields[1]] = remaining - Math.round(remaining / 2);
    } else {
      const ratio0 = timeDriverInputs[otherFields[0]] / otherSum;
      updates[otherFields[0]] = Math.round(remaining * ratio0);
      updates[otherFields[1]] = remaining - Math.round(remaining * ratio0);
    }
    updateTimeDriverInputs(updates);
  };

  const scenarioLabels: Record<string, string> = {
    conservative: 'Conservative',
    typical: 'Typical',
    aggressive: 'Optimistic',
  };

  const scenarios: { key: 'conservative' | 'typical' | 'aggressive'; label: string; description: string; recommended?: boolean }[] = [
    {
      key: 'conservative',
      label: 'Conservative',
      description: 'A conservative starting point. Under-promise to over-deliver.',
    },
    {
      key: 'typical',
      label: 'Typical',
      description: isNursing
        ? 'Based on observed outcomes across nursing implementations.'
        : isED 
          ? 'Based on observed outcomes across ED implementations.'
          : isInpatient
            ? 'Based on observed outcomes across inpatient implementations.'
            : 'Based on observed outcomes across outpatient implementations.',
      recommended: true,
    },
    {
      key: 'aggressive',
      label: 'Optimistic',
      description: isNursing
        ? 'For high-adoption units with strong change management.'
        : isED 
          ? 'For high-adoption EDs with strong change management.'
          : isInpatient
            ? 'For high-adoption programs with strong change management.'
            : 'For high-adoption organizations with strong change management.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={3}
        totalSteps={7}
        stepName="Time Savings"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-full lg:max-w-[700px]">
            {/* Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
                Time Savings
              </h1>
              <p className="text-base text-[#888888]">
                {isNursing
                  ? "How much time could your nurses get back?"
                  : isED 
                    ? "How much time could your ED providers get back?"
                    : isInpatient
                      ? "How much time could your hospitalists get back?"
                      : "How much time could your providers get back?"
                }
              </p>
            </motion.div>

            {/* What the Data Shows */}
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                WHAT THE DATA SHOWS
              </p>
              <div className="h-px bg-[#D1D5DB] mb-6" />
              <p className="text-sm text-black leading-relaxed">
                {isNursing
                  ? "Across nursing implementations, nurses typically save 15\u201330 minutes per shift on documentation. The range depends on unit type, documentation scope, and workflow adoption."
                  : isED 
                    ? "Across ED implementations, providers typically save 2\u20134 minutes per encounter on documentation. The range depends on acuity mix, EHR configuration, and workflow adoption."
                    : isInpatient
                      ? "Across inpatient implementations, hospitalists typically save 15\u201340 minutes per admission on documentation. The range depends on note complexity, EHR configuration, and workflow adoption."
                      : "Across outpatient implementations, providers typically save 2\u20134 minutes per encounter on documentation. The range depends on specialty, EHR configuration, and workflow adoption."
                }
              </p>
              <p className="text-xs text-[#888888] mt-2 italic">
                Source: Abridge customer data, 2024-2025
              </p>
            </motion.div>

            {/* Where Does Reclaimed Time Go? - Nursing Only */}
            {isNursing && (
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                WHERE DOES RECLAIMED TIME GO?
              </p>
              <div className="h-px bg-[#D1D5DB] mb-6" />

              <div className="space-y-5">
                {[
                  { field: 'nursingOtReductionPercent' as const, label: 'Overtime reduction', description: 'Time that directly reduces end-of-shift overtime' },
                  { field: 'nursingShiftSustainabilityPercent' as const, label: 'Shift sustainability', description: 'Time absorbed into shift breathing room; reduces documentation stress and supports retention' },
                  { field: 'nursingCareTimePercent' as const, label: 'Direct patient care', description: 'Time returned to the bedside for assessments, interventions, and presence' },
                ].map((item) => (
                  <div key={item.field}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-semibold text-black">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FormattedNumberInput
                          value={timeDriverInputs[item.field]}
                          onChange={(v: number) => handleTimeAllocationChange(item.field, v)}
                          className="h-9 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                          data-testid={`input-allocation-${item.field}`}
                        />
                        <span className="text-sm text-[#888888]">%</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#888888] mb-2">{item.description}</p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={timeDriverInputs[item.field]}
                      onChange={(e) => handleTimeAllocationChange(item.field, parseInt(e.target.value))}
                      className="w-full h-2 bg-[#D1D5DB] rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                      data-testid={`slider-allocation-${item.field}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className={`font-medium ${timeDriverInputs.nursingOtReductionPercent + timeDriverInputs.nursingShiftSustainabilityPercent + timeDriverInputs.nursingCareTimePercent === 100 ? 'text-[#888888]' : 'text-[#EA2C00]'}`}>
                  Total: {timeDriverInputs.nursingOtReductionPercent + timeDriverInputs.nursingShiftSustainabilityPercent + timeDriverInputs.nursingCareTimePercent}%
                </span>
              </div>

              <p className="text-xs text-[#888888] italic mt-4">
                Not all reclaimed time creates direct dollar value — some makes shifts more sustainable. That's real value too, just harder to count.
              </p>
            </motion.div>
            )}

            {/* Choose Your Scenario */}
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isNursing ? 0.2 : 0.15 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                CHOOSE YOUR SCENARIO
              </p>
              <div className="h-px bg-[#D1D5DB] mb-6" />

              {/* Clean Radio Options */}
              <div className="space-y-3 mb-6">
                {scenarios.map((scenario) => {
                  const isSelected = state.timePathScenario === scenario.key;
                  return (
                    <button
                      key={scenario.key}
                      onClick={() => handleScenarioSelect(scenario.key)}
                      className={`w-full py-3 sm:py-4 px-3 sm:px-5 rounded-lg text-left transition-all ${
                        isSelected
                          ? "bg-white/80"
                          : "bg-transparent hover:bg-white/50"
                      }`}
                      data-testid={`button-scenario-${scenario.key}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Radio Circle */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                        }`}>
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold ${isSelected ? 'text-black' : 'text-black/80'}`}>
                              {scenario.label}
                            </span>
                            <span className={`text-lg font-bold ${isSelected ? 'text-[#EA2C00]' : 'text-black/70'}`}>
                              {scenarioMinutes[scenario.key]} min{isNursing ? '/shift' : ''}
                            </span>
                            {scenario.recommended && (
                              <span className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-wide">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#888888] mt-0.5">
                            {scenario.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Value */}
              <div className="flex items-center flex-wrap gap-3 sm:gap-4 pt-5 border-t border-[#D1D5DB]">
                <span className="text-sm text-[#888888]">Or enter a custom value:</span>
                <div className="flex items-center gap-3">
                  <div className="relative w-24">
                    <FormattedNumberInput
                      value={state.minutesSavedPerEncounter}
                      onChange={(v: number) => updateState({ minutesSavedPerEncounter: v, timePathScenario: 'custom' as TimePathScenario })}
                      placeholder="e.g., 5"
                      className="h-12 text-center bg-white border-[#E5E5E5]"
                      data-testid="input-custom-minutes"
                    />
                  </div>
                  <span className="text-sm text-[#888888]">{isNursing ? 'min/shift' : 'min/encounter'}</span>
                </div>
              </div>
            </motion.div>

            {/* Continue Button - Mobile */}
            <motion.div 
              className="flex justify-center lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-continue"
              >
                Continue to Value Drivers
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel - Desktop Only */}
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-5 sm:p-6 lg:sticky lg:top-24">
              {/* Header */}
              <div className="mb-4">
                <p className="text-xs font-medium text-white/70 uppercase tracking-[1.5px]">
                  PROJECTED TIME SAVINGS
                </p>
                <p className="text-sm text-white/50 mt-1">Based on your scenario</p>
              </div>

              {/* Hero Value */}
              <div className="text-center my-5">
                <p className="text-5xl font-bold text-[#EA2C00]">
                  {formatNumber(hoursSaved)}
                </p>
                <p className="text-sm text-white/50 mt-1">hours / year</p>
              </div>

              <div className="h-px bg-white/10 my-4" />

              {/* THE MATH */}
              <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">
                THE MATH
              </p>
              <p className="text-xs text-white/40 mb-4">
                {isNursing 
                  ? `${state.minutesSavedPerEncounter} min × ${formatNumber(nursingEligibleShifts)} shifts ÷ 60`
                  : `${state.minutesSavedPerEncounter} min × ${formatNumber(eligibleEncounters)} encounters ÷ 60`
                }
              </p>

              <div className="h-px bg-white/10 my-4" />

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">Scenario</span>
                  <span className="text-white font-medium text-right">{state.timePathScenario ? scenarioLabels[state.timePathScenario] || 'Custom' : '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">Time Saved</span>
                  <span className="text-white text-right">{state.minutesSavedPerEncounter} {isNursing ? 'min/shift' : 'min/encounter'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/50 min-w-0">{isNursing ? 'Abridge-Enabled Shifts' : 'Eligible Encounters'}</span>
                  <span className="text-white flex-shrink-0">{formatNumber(isNursing ? nursingEligibleShifts : eligibleEncounters)}</span>
                </div>
              </div>

              <div className="h-px bg-white/10 my-4" />

              {/* Per Nurse / Per Provider */}
              <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">
                {isNursing ? 'PER NURSE' : 'PER PROVIDER'}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">Hours/year</span>
                  <span className="text-white font-semibold">{formatNumber(hoursPerProvider)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">Hours/week</span>
                  <span className="text-white font-semibold">{hoursPerWeek}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/50">Daily impact</span>
                  <span className="text-white font-semibold">~{Math.round(hoursPerProvider * 60 / 220)}min/day per provider</span>
                </div>
              </div>

              <div className="h-px bg-white/10 my-4" />

              {/* Continue Button */}
              <div className="hidden lg:block">
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-panel-continue"
                >
                  Continue to Value Drivers
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
