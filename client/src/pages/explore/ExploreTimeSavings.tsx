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
    ? { conservative: 1, typical: 2, aggressive: 3 }
    : isInpatient
      ? { conservative: 15, typical: 30, aggressive: 40 }  // Per admission for hospitalists
      : isNursing
        ? { conservative: 15, typical: 20, aggressive: 30 }  // Per shift for nursing
        : { conservative: 2, typical: 4, aggressive: 6 };

  // Nursing: Shift-based calculation - use nursingShiftsPerNurseYear to match ExploreFlow
  const nursingShiftsPerYear = useMemo(() => {
    return state.numberOfProviders * state.nursingShiftsPerNurseYear;
  }, [state.numberOfProviders, state.nursingShiftsPerNurseYear]);

  const nursingEligibleShifts = useMemo(() => {
    return Math.round(nursingShiftsPerYear * (state.utilizationPercent / 100));
  }, [nursingShiftsPerYear, state.utilizationPercent]);

  const hoursSaved = useMemo(() => {
    if (isNursing) {
      // Nursing: use nursingMinutesPerShift to match ExploreFlow calculation
      return Math.round((state.nursingMinutesPerShift * nursingEligibleShifts) / 60);
    }
    return Math.round((state.minutesSavedPerEncounter * eligibleEncounters) / 60);
  }, [isNursing, state.nursingMinutesPerShift, state.minutesSavedPerEncounter, eligibleEncounters, nursingEligibleShifts]);

  const hoursPerProvider = useMemo(() => {
    return state.numberOfProviders > 0 ? Math.round(hoursSaved / state.numberOfProviders) : 0;
  }, [hoursSaved, state.numberOfProviders]);

  const hoursPerWeek = useMemo(() => {
    return state.numberOfProviders > 0 ? (hoursSaved / state.numberOfProviders / 52).toFixed(1) : '0';
  }, [hoursSaved, state.numberOfProviders]);

  const handleScenarioSelect = (scenario: 'conservative' | 'typical' | 'aggressive') => {
    if (isNursing) {
      updateState({
        timePathScenario: scenario,
        nursingMinutesPerShift: scenarioMinutes[scenario],
      });
    } else {
      updateState({
        timePathScenario: scenario,
        minutesSavedPerEncounter: scenarioMinutes[scenario],
      });
    }
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const scenarioLabels: Record<string, string> = {
    conservative: 'Conservative',
    typical: 'Typical',
    aggressive: 'Optimistic',
  };

  const scenarios: { key: 'conservative' | 'typical' | 'aggressive'; label: string; description: string; recommended?: boolean }[] = [
    {
      key: 'conservative',
      label: 'Conservative',
      description: isNursing
        ? 'Minimal adoption, limited flowsheet coverage.'
        : isInpatient
          ? 'Per admission (combined across all notes). For skeptical stakeholders.'
          : 'For skeptical stakeholders. Under-promise to over-deliver.',
    },
    {
      key: 'typical',
      label: 'Typical',
      description: isNursing
        ? 'Standard adoption across key flowsheets.'
        : isED 
          ? 'Based on average outcomes across similar ED implementations.'
          : isInpatient
            ? 'Based on average outcomes across similar hospitalist implementations.'
            : 'Based on average outcomes across similar implementations.',
      recommended: true,
    },
    {
      key: 'aggressive',
      label: 'Optimistic',
      description: isNursing
        ? 'Full adoption with strong change management.'
        : isED 
          ? 'For high-adoption EDs with strong change management.'
          : isInpatient
            ? 'For high-adoption programs with strong workflows.'
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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">
            {/* Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
                Time Savings
              </h1>
              <p className="text-base text-[#888888]">
                {isNursing
                  ? "How much documentation time could your nurses get back each shift?"
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
              className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                WHAT THE DATA SHOWS
              </p>
              <div className="h-px bg-[#D1D5DB] mb-6" />
              <p className="text-sm text-black leading-relaxed">
                {isNursing
                  ? "Nurses spend 25-35% of their shift on documentation. Ambient documentation can reduce time spent on flowsheets, assessments, and handoff documentation by 15-30 minutes per shift."
                  : isED 
                    ? "ED documentation is faster-paced than outpatient, with more templated workflows. Across ED implementations, providers typically save 1-3 minutes per encounter. The range depends on acuity mix, EHR configuration, and workflow adoption."
                    : isInpatient
                      ? "Hospitalists document across the patient stay—H&Ps, progress notes, discharge summaries. Abridge reduces documentation time across all of these. Across inpatient implementations, hospitalists typically save 15-40 minutes per admission on total documentation time."
                      : "Across implementations, providers typically save 2-6 minutes per encounter on documentation. The range depends on specialty, workflow, and how providers use the time."
                }
              </p>
              <p className="text-xs text-[#888888] mt-2 italic">
                Source: Abridge customer data, 2024-2025
              </p>
            </motion.div>

            {/* Choose Your Scenario */}
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
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
                      className={`w-full py-4 px-5 rounded-lg text-left transition-all ${
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
                              <span className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-wide">
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
              <div className="flex items-center gap-4 pt-5 border-t border-[#D1D5DB]">
                <span className="text-sm text-[#888888]">Or enter a custom value:</span>
                <div className="relative w-24">
                  <FormattedNumberInput
                    value={isNursing ? state.nursingMinutesPerShift : state.minutesSavedPerEncounter}
                    onChange={(v: number) => isNursing 
                      ? updateState({ nursingMinutesPerShift: v, timePathScenario: 'custom' as TimePathScenario })
                      : updateState({ minutesSavedPerEncounter: v, timePathScenario: 'custom' as TimePathScenario })
                    }
                    placeholder="e.g., 5"
                    className="h-12 text-center bg-white border-[#E5E5E5]"
                    data-testid="input-custom-minutes"
                  />
                </div>
                <span className="text-sm text-[#888888]">{isNursing ? 'min/shift' : 'min/encounter'}</span>
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
            className="hidden lg:block w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 sticky top-24">
              {/* Header */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px]">
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

              <p className="text-xs text-white/40 text-center mb-4">
                {isNursing 
                  ? `${state.nursingMinutesPerShift} min × ${formatNumber(nursingEligibleShifts)} shifts`
                  : `${state.minutesSavedPerEncounter} min × ${formatNumber(eligibleEncounters)} encounters`
                }
              </p>

              <div className="h-px bg-white/10 my-4" />

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Scenario</span>
                  <span className="text-white font-medium">{state.timePathScenario ? scenarioLabels[state.timePathScenario] || 'Custom' : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Time Saved</span>
                  <span className="text-white">{isNursing ? state.nursingMinutesPerShift : state.minutesSavedPerEncounter} {isNursing ? 'min/shift' : 'min/encounter'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">{isNursing ? 'Eligible Shifts' : 'Eligible Encounters'}</span>
                  <span className="text-white">{formatNumber(isNursing ? nursingEligibleShifts : eligibleEncounters)}</span>
                </div>
              </div>

              <div className="h-px bg-white/10 my-4" />

              {/* Per Provider/Nurse */}
              <div className="mb-4">
                <p className="text-xs text-white/50 mb-2">{isNursing ? 'Per nurse:' : 'Per provider:'}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Hours/year</span>
                    <span className="text-white font-semibold">{formatNumber(hoursPerProvider)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Hours/week</span>
                    <span className="text-[#EA2C00] font-semibold">{hoursPerWeek}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/10 my-4" />

              {/* Continue Button */}
              <Button
                onClick={onNext}
                className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                data-testid="button-panel-continue"
              >
                Continue to Value Drivers
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
