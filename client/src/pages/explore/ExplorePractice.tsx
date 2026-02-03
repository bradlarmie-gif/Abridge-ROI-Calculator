import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "./ExploreFlow";

interface ExplorePracticeProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type EncounterPreset = 'lighter' | 'typical' | 'busy' | 'custom' | null;
type UtilizationPreset = 'conservative' | 'typical' | 'aggressive' | null;

export default function ExplorePractice({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: ExplorePracticeProps) {
  const providers = state.numberOfProviders || 0;

  const getEncounterPreset = (): EncounterPreset | null => {
    if (state.annualEncounters === 0) return null;
    const perProvider = providers > 0 ? state.annualEncounters / providers : 0;
    if (perProvider === 2000) return 'lighter';
    if (perProvider === 3000) return 'typical';
    if (perProvider === 4000) return 'busy';
    return 'custom';
  };

  const getUtilizationPreset = (): UtilizationPreset | null => {
    if (state.utilizationPercent === 0) return null;
    if (state.utilizationPercent === 50) return 'conservative';
    if (state.utilizationPercent === 70) return 'typical';
    if (state.utilizationPercent === 85) return 'aggressive';
    return null;
  };

  const selectedEncounterPreset = getEncounterPreset();
  const selectedUtilizationPreset = getUtilizationPreset();

  const eligibleEncounters = useMemo(() => {
    return Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  }, [state.annualEncounters, state.utilizationPercent]);

  const handleEncounterPreset = (preset: 'lighter' | 'typical' | 'busy' | 'custom') => {
    const multipliers = {
      lighter: 2000,
      typical: 3000,
      busy: 4000,
      custom: 3000,
    };
    updateState({ annualEncounters: providers * multipliers[preset] });
  };

  const handleUtilizationPreset = (preset: 'conservative' | 'typical' | 'aggressive') => {
    const values = {
      conservative: 50,
      typical: 70,
      aggressive: 85,
    };
    updateState({ utilizationPercent: values[preset] });
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const canContinue = state.numberOfProviders > 0 && state.annualEncounters > 0 && state.utilizationPercent > 0;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={2}
        totalSteps={7}
        stepName="Your Practice"
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
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
                Your Practice
              </h1>
              <p className="text-base text-[#888888]">
                Tell us about your starting point.
              </p>
            </motion.div>

            {/* Main Card */}
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Deployment Size */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                  Deployment Size
                </p>
                <div className="h-px bg-[#E5E5E5] mb-4" />

                <label className="block text-sm font-medium text-black mb-1">
                  Number of Providers
                </label>
                <p className="text-sm text-[#888888] mb-2">
                  Clinicians who would use Abridge
                </p>
                <FormattedNumberInput
                  value={state.numberOfProviders || ''}
                  onChange={(v: number) => {
                    const newProviders = v;
                    if (selectedEncounterPreset && selectedEncounterPreset !== 'custom') {
                      const multipliers = { lighter: 2000, typical: 3000, busy: 4000 };
                      updateState({ 
                        numberOfProviders: newProviders,
                        annualEncounters: newProviders * multipliers[selectedEncounterPreset]
                      });
                    } else {
                      updateState({ numberOfProviders: newProviders });
                    }
                  }}
                  className="h-11 text-base bg-white"
                  placeholder="Enter number of providers"
                  data-testid="input-providers"
                />
              </div>

              {/* Encounter Volume */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                  Encounter Volume
                </p>
                <div className="h-px bg-[#E5E5E5] mb-4" />

                <p className="text-sm font-medium text-black mb-3">
                  How busy is your practice?
                </p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(['lighter', 'typical', 'busy'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleEncounterPreset(preset)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedEncounterPreset === preset
                          ? "border-[#EA2C00] bg-white"
                          : "border-transparent bg-white hover:border-[#D1D5DB]"
                      }`}
                      data-testid={`button-encounter-${preset}`}
                    >
                      <p className="font-medium text-black capitalize">{preset}</p>
                      <p className="text-sm text-[#888888]">
                        {preset === 'lighter' && '2,000/prov'}
                        {preset === 'typical' && '3,000/prov'}
                        {preset === 'busy' && '4,000/prov'}
                      </p>
                    </button>
                  ))}
                </div>

                <p className="text-sm text-[#888888] mb-2">
                  Or enter your total practice volume:
                </p>
                <div className="relative">
                  <FormattedNumberInput
                    value={state.annualEncounters || ''}
                    onChange={(v: number) => updateState({ annualEncounters: v })}
                    className="h-11 text-base bg-white pr-16"
                    placeholder="Enter total volume"
                    data-testid="input-encounters"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">
                    /year
                  </span>
                </div>
              </div>

              {/* Expected Utilization */}
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                  Expected Utilization
                </p>
                <div className="h-px bg-[#E5E5E5] mb-4" />

                <p className="text-sm font-medium text-black mb-3">
                  What percentage of encounters will use Abridge?
                </p>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  {(['conservative', 'typical', 'aggressive'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleUtilizationPreset(preset)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedUtilizationPreset === preset
                          ? "border-[#EA2C00] bg-white"
                          : "border-transparent bg-white hover:border-[#D1D5DB]"
                      }`}
                      data-testid={`button-utilization-${preset}`}
                    >
                      <p className="font-medium text-black capitalize">{preset}</p>
                      <p className="text-sm text-[#888888]">
                        {preset === 'conservative' && '50%'}
                        {preset === 'typical' && '70%'}
                        {preset === 'aggressive' && '85%'}
                      </p>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#888888]">
                  Utilization typically starts at 50-60% and grows to 75-85% as workflows mature.
                </p>
              </div>
            </motion.div>

            {/* Continue Button - Mobile */}
            <motion.div 
              className="flex justify-center lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={onNext}
                disabled={!canContinue}
                className="h-11 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2 disabled:opacity-50"
                data-testid="button-continue"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel - Desktop Only */}
          <motion.div
            className="hidden lg:block w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 sticky top-24">
              {/* Header */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
                  Your Baseline
                </p>
                <p className="text-sm text-[#888888] mt-1">Practice summary</p>
              </div>

              {/* Stats with left border */}
              <div className="space-y-3 mb-4">
                <div className="border-l-4 border-[#EA2C00] pl-3">
                  <p className="text-lg font-bold text-white">
                    {providers > 0 ? formatNumber(providers) : '—'}
                  </p>
                  <p className="text-sm text-[#888888]">providers</p>
                </div>
                <div className="border-l-4 border-[#EA2C00] pl-3">
                  <p className="text-lg font-bold text-white">
                    {state.annualEncounters > 0 ? formatNumber(state.annualEncounters) : '—'}
                  </p>
                  <p className="text-sm text-[#888888]">encounters/year</p>
                </div>
                <div className="border-l-4 border-[#EA2C00] pl-3">
                  <p className="text-lg font-bold text-white">
                    {state.utilizationPercent > 0 ? `${state.utilizationPercent}%` : '—'}
                  </p>
                  <p className="text-sm text-[#888888]">utilization</p>
                </div>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Eligible Encounters */}
              <div className="text-center my-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px] mb-2">
                  Eligible Encounters
                </p>
                <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                  {canContinue ? formatNumber(eligibleEncounters) : '—'}
                </p>
                <p className="text-sm text-[#888888] mt-2">
                  This is your value multiplier—every calculation downstream uses this number.
                </p>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Continue Button */}
              <Button
                onClick={onNext}
                disabled={!canContinue}
                className={`w-full h-11 font-medium rounded-md gap-2 ${
                  !canContinue
                    ? "bg-[#333333] text-[#666666] cursor-not-allowed"
                    : "bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white"
                }`}
                data-testid="button-panel-continue"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
              {!canContinue && (
                <p className="text-xs text-[#666666] text-center mt-2">
                  Enter all values to continue
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
