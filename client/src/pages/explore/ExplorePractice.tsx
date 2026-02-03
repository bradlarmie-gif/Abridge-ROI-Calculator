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
  const providers = state.numberOfProviders || 80;

  const getEncounterPreset = (): EncounterPreset | null => {
    if (state.annualEncounters === 0) return null;
    const perProvider = providers > 0 ? state.annualEncounters / providers : 0;
    if (perProvider === 2000) return 'lighter';
    if (perProvider === 3000) return 'typical';
    if (perProvider === 4000) return 'busy';
    return 'custom';
  };

  const getUtilizationPreset = (): UtilizationPreset | null => {
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

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
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
                // If using a preset, recalculate encounters
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
                      ? "border-[#E85A2C] bg-white"
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
                      ? "border-[#E85A2C] bg-white"
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

        {/* Your Baseline Summary */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Your Baseline
          </p>

          <div className="space-y-2 mb-4">
            <p className="text-base text-black">{formatNumber(providers)} providers</p>
            <p className="text-base text-black">{formatNumber(state.annualEncounters)} annual encounters</p>
            <p className="text-base text-black">{state.utilizationPercent}% utilization</p>
          </div>

          <div className="h-px bg-[#E5E5E5] my-4" />

          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            Eligible Encounters
          </p>
          <p className="text-3xl font-bold text-[#E85A2C] mb-2">
            {formatNumber(eligibleEncounters)}
          </p>
          <p className="text-sm text-[#888888]">
            This is your value multiplier. Every calculation downstream uses this number.
          </p>
        </motion.div>

        {/* Continue Button */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={onNext}
            disabled={!canContinue}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2 disabled:opacity-50"
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
