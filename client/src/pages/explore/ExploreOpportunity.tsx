import { useCallback, useState } from "react";
import { ArrowRight, Users, Activity, Percent, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState } from "./ExploreFlow";

interface ExploreOpportunityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface BusynessPreset {
  label: string;
  value: number;
  description: string;
}

const BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 1500, description: "More time per patient" },
  { label: "Typical", value: 2100, description: "Standard volume" },
  { label: "Busy", value: 2500, description: "High throughput" },
];

const UTILIZATION_PRESETS = [
  { label: "Conservative", value: 50, description: "Cautious rollout" },
  { label: "Typical", value: 70, description: "Standard adoption" },
  { label: "Aggressive", value: 85, description: "Full commitment" },
];

export default function ExploreOpportunity({ state, updateState, onNext, onBack, onHome }: ExploreOpportunityProps) {
  const [providerInputValue, setProviderInputValue] = useState(state.numberOfProviders > 0 ? state.numberOfProviders.toString() : '');
  const [encountersPerProvider, setEncountersPerProvider] = useState(
    state.numberOfProviders > 0 && state.annualEncounters > 0 
      ? Math.round(state.annualEncounters / state.numberOfProviders) 
      : 2100
  );
  const [customEncountersInput, setCustomEncountersInput] = useState('');

  const handleProvidersChange = useCallback((inputVal: string) => {
    setProviderInputValue(inputVal);
    if (inputVal === '') {
      updateState({ numberOfProviders: 0, annualEncounters: 0 });
      return;
    }
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(10000, numValue));
      const annualEncounters = clampedValue * encountersPerProvider;
      updateState({ 
        numberOfProviders: clampedValue,
        annualEncounters,
      });
    }
  }, [updateState, encountersPerProvider]);

  const handleProviderInputBlur = useCallback(() => {
    const numValue = parseInt(providerInputValue, 10);
    if (isNaN(numValue) || numValue < 1) {
      if (state.numberOfProviders > 0) {
        setProviderInputValue(state.numberOfProviders.toString());
      } else {
        setProviderInputValue('');
      }
    } else {
      const clampedValue = Math.max(1, Math.min(10000, numValue));
      setProviderInputValue(clampedValue.toString());
    }
  }, [providerInputValue, state.numberOfProviders]);

  const handleBusynessChange = useCallback((value: number) => {
    setEncountersPerProvider(value);
    setCustomEncountersInput('');
    if (state.numberOfProviders > 0) {
      const annualEncounters = state.numberOfProviders * value;
      updateState({ annualEncounters });
    }
  }, [updateState, state.numberOfProviders]);

  const handleCustomEncountersChange = useCallback((inputVal: string) => {
    setCustomEncountersInput(inputVal);
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue >= 1000 && numValue <= 4000) {
      setEncountersPerProvider(numValue);
      if (state.numberOfProviders > 0) {
        const annualEncounters = state.numberOfProviders * numValue;
        updateState({ annualEncounters });
      }
    }
  }, [updateState, state.numberOfProviders]);

  const handleUtilizationChange = useCallback((value: number) => {
    updateState({ utilizationPercent: value });
  }, [updateState]);

  const handleCustomUtilizationChange = useCallback((inputVal: string) => {
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue >= 10 && numValue <= 100) {
      updateState({ utilizationPercent: numValue });
    }
  }, [updateState]);

  const annualEncounters = state.numberOfProviders * encountersPerProvider;
  const eligibleEncounters = Math.round(annualEncounters * (state.utilizationPercent / 100));

  const formatNumber = (n: number) => n.toLocaleString();

  const isValid = state.numberOfProviders > 0 && state.utilizationPercent > 0;

  const isPresetSelected = (presetValue: number) => {
    return encountersPerProvider === presetValue && customEncountersInput === '';
  };

  const isUtilizationPresetSelected = (presetValue: number) => {
    return state.utilizationPercent === presetValue;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="explore"
        currentStep={2}
        totalSteps={7}
        stepName="Opportunity Size"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 lg:max-w-2xl">
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
                Size Your Opportunity
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                Tell us about your practice
              </h1>
              <p className="text-slate-600">
                We'll calculate your baseline to show potential value.
              </p>
            </motion.div>

            <div className="space-y-6">
              {/* Number of Providers */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black">Number of Providers</h2>
                    <p className="text-sm text-slate-500">How many clinicians will use Abridge?</p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter number"
                    value={providerInputValue}
                    onChange={(e) => handleProvidersChange(e.target.value)}
                    onBlur={handleProviderInputBlur}
                    className="w-40 py-3 px-4 text-center text-2xl font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 transition-all"
                    data-testid="input-providers"
                  />
                </div>
              </motion.div>

              {/* Clinic Busyness */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black">Clinic Busyness</h2>
                    <p className="text-sm text-slate-500">Annual encounters per provider</p>
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="flex items-center gap-2 mb-4">
                  {BUSYNESS_PRESETS.map((preset) => {
                    const isSelected = isPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleBusynessChange(preset.value)}
                        className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                        data-testid={`preset-busyness-${preset.label.toLowerCase()}`}
                      >
                        <div className="text-center">
                          <span className="block font-semibold">{preset.label}</span>
                          <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {preset.value.toLocaleString()}/yr
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom value input */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-slate-500">or enter custom:</span>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1000}
                      max={4000}
                      placeholder={encountersPerProvider.toString()}
                      value={customEncountersInput}
                      onChange={(e) => handleCustomEncountersChange(e.target.value)}
                      className="w-24 py-2 px-3 text-center text-lg font-semibold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 transition-all"
                      data-testid="input-encounters-per-provider"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      /yr
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Expected Utilization */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Percent className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black">Expected Utilization</h2>
                    <p className="text-sm text-slate-500">What percentage of encounters will use Abridge?</p>
                  </div>
                </div>

                {/* Preset buttons */}
                <div className="flex items-center gap-2 mb-4">
                  {UTILIZATION_PRESETS.map((preset) => {
                    const isSelected = isUtilizationPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleUtilizationChange(preset.value)}
                        className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                        data-testid={`preset-utilization-${preset.label.toLowerCase()}`}
                      >
                        <div className="text-center">
                          <span className="block font-semibold">{preset.label}</span>
                          <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {preset.value}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom value input */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-slate-500">or enter custom:</span>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={10}
                      max={100}
                      value={state.utilizationPercent}
                      onChange={(e) => handleCustomUtilizationChange(e.target.value)}
                      className="w-20 py-2 px-3 text-center text-lg font-semibold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 transition-all"
                      data-testid="input-utilization"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Continue Button - Mobile */}
              <motion.div 
                className="lg:hidden pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Button
                  onClick={onNext}
                  disabled={!isValid}
                  className={`
                    w-full h-12 font-semibold rounded-full transition-all duration-200
                    ${isValid 
                      ? 'bg-black hover:bg-black/90 text-white' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue-mobile"
                >
                  Continue to Time Savings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Live Receipt Sidebar */}
          <motion.div
            className="hidden lg:block lg:w-80"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="sticky top-24">
              <div className="bg-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-white/90">Your Baseline</h3>
                </div>

                <div className="space-y-4">
                  {/* Providers */}
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-white/60">Providers</span>
                    <span className="text-lg font-bold">
                      {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                    </span>
                  </div>

                  {/* Encounters per Provider */}
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-white/60">Encounters/Provider</span>
                    <span className="text-lg font-bold">
                      {formatNumber(encountersPerProvider)}
                    </span>
                  </div>

                  {/* Total Annual Encounters */}
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-white/60">Annual Encounters</span>
                    <span className="text-lg font-bold">
                      {state.numberOfProviders > 0 ? formatNumber(annualEncounters) : '—'}
                    </span>
                  </div>

                  {/* Utilization */}
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-white/60">Utilization</span>
                    <span className="text-lg font-bold">
                      {state.utilizationPercent}%
                    </span>
                  </div>

                  {/* Eligible Encounters - Highlighted */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white/80">Eligible Encounters</span>
                      <span className="text-2xl font-bold text-[#F07B5F]">
                        {state.numberOfProviders > 0 ? formatNumber(eligibleEncounters) : '—'}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">
                      Encounters that will use Abridge
                    </p>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <Button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`
                      w-full h-11 font-semibold rounded-full transition-all duration-200
                      ${isValid 
                        ? 'bg-white hover:bg-white/90 text-black' 
                        : 'bg-white/20 text-white/40 cursor-not-allowed'
                      }
                    `}
                    data-testid="button-continue"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
