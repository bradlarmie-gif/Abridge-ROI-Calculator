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
  const eligibleEncounters = useMemo(() => {
    return Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  }, [state.annualEncounters, state.utilizationPercent]);

  const scenarioMinutes: Record<TimePathScenario, number> = {
    conservative: 2,
    typical: 4,
    aggressive: 6,
  };

  const hoursSaved = useMemo(() => {
    return Math.round((state.minutesSavedPerEncounter * eligibleEncounters) / 60);
  }, [state.minutesSavedPerEncounter, eligibleEncounters]);

  const hoursPerProvider = useMemo(() => {
    return state.numberOfProviders > 0 ? Math.round(hoursSaved / state.numberOfProviders) : 0;
  }, [hoursSaved, state.numberOfProviders]);

  const hoursPerWeek = useMemo(() => {
    return state.numberOfProviders > 0 ? (hoursSaved / state.numberOfProviders / 52).toFixed(1) : '0';
  }, [hoursSaved, state.numberOfProviders]);

  const handleScenarioSelect = (scenario: TimePathScenario) => {
    updateState({
      timePathScenario: scenario,
      minutesSavedPerEncounter: scenarioMinutes[scenario],
    });
  };

  const formatNumber = (n: number) => n.toLocaleString();

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

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= 3 ? "bg-[#E85A2C]" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

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
            How much time could your providers get back?
          </p>
        </motion.div>

        {/* What the Data Shows */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            What the Data Shows
          </p>
          <p className="text-sm text-black leading-relaxed">
            Across implementations, providers typically save 2-6 minutes per encounter on documentation. 
            The range depends on specialty, workflow, and how providers use the time.
          </p>
          <p className="text-xs text-[#888888] mt-2 italic">
            Source: Abridge customer data, 2023-2024
          </p>
        </motion.div>

        {/* Choose Your Scenario */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Choose Your Scenario
          </p>

          <div className="space-y-3 mb-5">
            {/* Conservative */}
            <button
              onClick={() => handleScenarioSelect('conservative')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.timePathScenario === 'conservative'
                  ? "bg-white border-l-4 border-[#E85A2C]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-scenario-conservative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    state.timePathScenario === 'conservative' ? 'border-[#E85A2C]' : 'border-[#D1D5DB]'
                  }`}>
                    {state.timePathScenario === 'conservative' && (
                      <div className="w-2 h-2 rounded-full bg-[#E85A2C]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-black">Conservative</p>
                    <p className="text-sm text-[#888888]">For skeptical stakeholders. Under-promise to over-deliver.</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-black">2 min</span>
              </div>
            </button>

            {/* Typical */}
            <button
              onClick={() => handleScenarioSelect('typical')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.timePathScenario === 'typical'
                  ? "bg-white border-l-4 border-[#E85A2C]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-scenario-typical"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    state.timePathScenario === 'typical' ? 'border-[#E85A2C]' : 'border-[#D1D5DB]'
                  }`}>
                    {state.timePathScenario === 'typical' && (
                      <div className="w-2 h-2 rounded-full bg-[#E85A2C]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-black">Typical <span className="text-xs text-[#E85A2C] font-normal ml-2">RECOMMENDED</span></p>
                    <p className="text-sm text-[#888888]">Based on average outcomes across similar implementations.</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-black">4 min</span>
              </div>
            </button>

            {/* Optimistic */}
            <button
              onClick={() => handleScenarioSelect('aggressive')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.timePathScenario === 'aggressive'
                  ? "bg-white border-l-4 border-[#E85A2C]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-scenario-aggressive"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    state.timePathScenario === 'aggressive' ? 'border-[#E85A2C]' : 'border-[#D1D5DB]'
                  }`}>
                    {state.timePathScenario === 'aggressive' && (
                      <div className="w-2 h-2 rounded-full bg-[#E85A2C]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-black">Optimistic</p>
                    <p className="text-sm text-[#888888]">For high-adoption organizations with strong change management.</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-black">6 min</span>
              </div>
            </button>
          </div>

          {/* Custom Value */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#888888]">Or enter a custom value:</span>
            <div className="relative w-24">
              <FormattedNumberInput
                value={state.minutesSavedPerEncounter}
                onChange={(v: number) => updateState({ minutesSavedPerEncounter: v })}
                className="h-10 text-center bg-white"
                data-testid="input-custom-minutes"
              />
            </div>
            <span className="text-sm text-[#888888]">min/encounter</span>
          </div>
        </motion.div>

        {/* Projected Time Savings */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Projected Time Savings
          </p>

          <div className="text-center mb-4">
            <p className="text-5xl md:text-6xl font-bold text-[#E85A2C] mb-1">
              {formatNumber(hoursSaved)}
            </p>
            <p className="text-base text-[#888888]">hours / year</p>
          </div>

          <p className="text-sm text-[#888888] text-center mb-4">
            {state.minutesSavedPerEncounter} min × {formatNumber(eligibleEncounters)} encounters ÷ 60
          </p>

          <div className="h-px bg-[#E5E5E5] my-4" />

          <p className="text-sm text-black text-center">
            That's <strong>{formatNumber(hoursPerProvider)} hours per provider per year</strong>.
            <br />
            Or about <strong>{hoursPerWeek} hours per week</strong>.
          </p>
        </motion.div>

        {/* Continue Button */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Value Drivers
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
