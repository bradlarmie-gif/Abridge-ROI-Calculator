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
}

const BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 1500 },
  { label: "Typical", value: 2100 },
  { label: "Busy", value: 2500 },
];

const UTILIZATION_PRESETS = [
  { label: "Conservative", value: 50 },
  { label: "Typical", value: 70 },
  { label: "Aggressive", value: 85 },
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
          <div className="flex-1 lg:max-w-xl">
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
              <p className="text-slate-600 text-sm">
                We'll calculate your baseline to show potential value.
              </p>
            </motion.div>

            <div className="space-y-4">
              {/* Number of Providers - Compact */}
              <motion.div
                className="bg-white rounded-xl border border-slate-200 p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#EA2C00]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-black">Providers</h2>
                      <p className="text-xs text-slate-400">Clinicians using Abridge</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={providerInputValue}
                    onChange={(e) => handleProvidersChange(e.target.value)}
                    onBlur={handleProviderInputBlur}
                    className="w-24 py-2 px-3 text-right text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA2C00] focus:bg-white focus:ring-1 focus:ring-[#EA2C00]/20 transition-all placeholder:text-slate-300"
                    data-testid="input-providers"
                  />
                </div>
              </motion.div>

              {/* Clinic Busyness - Compact */}
              <motion.div
                className="bg-white rounded-xl border border-slate-200 p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-black">Clinic Busyness</h2>
                    <p className="text-xs text-slate-400">Annual encounters per provider</p>
                  </div>
                </div>

                {/* Preset buttons - Smaller */}
                <div className="flex items-center gap-2 mb-3">
                  {BUSYNESS_PRESETS.map((preset) => {
                    const isSelected = isPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleBusynessChange(preset.value)}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        data-testid={`preset-busyness-${preset.label.toLowerCase()}`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className={`block text-[10px] ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {preset.value.toLocaleString()}/yr
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom input - Inline */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">or custom:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1000}
                    max={4000}
                    placeholder={encountersPerProvider.toString()}
                    value={customEncountersInput}
                    onChange={(e) => handleCustomEncountersChange(e.target.value)}
                    className="w-16 py-1 px-2 text-center text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#EA2C00] transition-all"
                    data-testid="input-encounters-per-provider"
                  />
                  <span className="text-slate-400">/yr</span>
                </div>
              </motion.div>

              {/* Expected Utilization - Compact */}
              <motion.div
                className="bg-white rounded-xl border border-slate-200 p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
                    <Percent className="w-4 h-4 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-black">Expected Utilization</h2>
                    <p className="text-xs text-slate-400">% of encounters using Abridge</p>
                  </div>
                </div>

                {/* Preset buttons - Smaller */}
                <div className="flex items-center gap-2 mb-3">
                  {UTILIZATION_PRESETS.map((preset) => {
                    const isSelected = isUtilizationPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleUtilizationChange(preset.value)}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        data-testid={`preset-utilization-${preset.label.toLowerCase()}`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className={`block text-[10px] ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {preset.value}%
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom input - Inline */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">or custom:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={100}
                    value={state.utilizationPercent}
                    onChange={(e) => handleCustomUtilizationChange(e.target.value)}
                    className="w-14 py-1 px-2 text-center text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#EA2C00] transition-all"
                    data-testid="input-utilization"
                  />
                  <span className="text-slate-400">%</span>
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
                    w-full h-11 font-semibold rounded-full transition-all duration-200
                    ${isValid 
                      ? 'bg-black hover:bg-black/90 text-white' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue-mobile"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Live Receipt Sidebar */}
          <motion.div
            className="hidden lg:block lg:w-72"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="sticky top-24">
              <div className="bg-slate-900 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-white/60" />
                    <h3 className="text-sm font-semibold text-white">Your Baseline</h3>
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Providers</span>
                    <span className="text-sm font-semibold text-white">
                      {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Encounters/Provider</span>
                    <span className="text-sm font-semibold text-white">
                      {formatNumber(encountersPerProvider)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-xs text-white/50">Annual Encounters</span>
                    <span className="text-sm font-semibold text-white">
                      {state.numberOfProviders > 0 ? formatNumber(annualEncounters) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Utilization</span>
                    <span className="text-sm font-semibold text-white">
                      {state.utilizationPercent}%
                    </span>
                  </div>

                  {/* Eligible Encounters - Highlighted */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-white/70">Eligible Encounters</span>
                      <span className="text-lg font-bold text-[#F07B5F]">
                        {state.numberOfProviders > 0 ? formatNumber(eligibleEncounters) : '—'}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">
                      Encounters that will use Abridge
                    </p>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="px-5 pb-5">
                  <Button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`
                      w-full h-10 text-sm font-semibold rounded-full transition-all duration-200
                      ${isValid 
                        ? 'bg-white hover:bg-white/90 text-black' 
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }
                    `}
                    data-testid="button-continue"
                  >
                    Continue
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
