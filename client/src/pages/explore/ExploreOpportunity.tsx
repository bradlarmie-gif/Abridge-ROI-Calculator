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

const OUTPATIENT_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 1500 },
  { label: "Typical", value: 2100 },
  { label: "Busy", value: 2500 },
];

const ED_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 1400 },
  { label: "Typical", value: 1800 },
  { label: "Busy", value: 2200 },
];

const UTILIZATION_PRESETS = [
  { label: "Conservative", value: 50 },
  { label: "Typical", value: 70 },
  { label: "Aggressive", value: 85 },
];

export default function ExploreOpportunity({ state, updateState, onNext, onBack, onHome }: ExploreOpportunityProps) {
  const isED = state.careSetting === 'ed';
  const BUSYNESS_PRESETS = isED ? ED_BUSYNESS_PRESETS : OUTPATIENT_BUSYNESS_PRESETS;
  const defaultEncountersPerProvider = isED ? 1800 : 2100;
  
  const [providerInputValue, setProviderInputValue] = useState(state.numberOfProviders > 0 ? state.numberOfProviders.toString() : '');
  const [encountersPerProvider, setEncountersPerProvider] = useState(
    state.numberOfProviders > 0 && state.annualEncounters > 0 
      ? Math.round(state.annualEncounters / state.numberOfProviders) 
      : defaultEncountersPerProvider
  );
  const [totalEncountersInput, setTotalEncountersInput] = useState('');
  const [usingTotalInput, setUsingTotalInput] = useState(false);

  const handleProvidersChange = useCallback((inputVal: string) => {
    setProviderInputValue(inputVal);
    if (inputVal === '') {
      updateState({ numberOfProviders: 0, annualEncounters: 0 });
      return;
    }
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(10000, numValue));
      // If using total input, recalculate per-provider based on total
      if (usingTotalInput && state.annualEncounters > 0) {
        const newPerProvider = Math.round(state.annualEncounters / clampedValue);
        setEncountersPerProvider(newPerProvider);
        updateState({ numberOfProviders: clampedValue });
      } else {
        const annualEncounters = clampedValue * encountersPerProvider;
        updateState({ 
          numberOfProviders: clampedValue,
          annualEncounters,
        });
      }
    }
  }, [updateState, encountersPerProvider, usingTotalInput, state.annualEncounters]);

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
    setTotalEncountersInput('');
    setUsingTotalInput(false);
    if (state.numberOfProviders > 0) {
      const annualEncounters = state.numberOfProviders * value;
      updateState({ annualEncounters });
    }
  }, [updateState, state.numberOfProviders]);

  const handleTotalEncountersChange = useCallback((inputVal: string) => {
    setTotalEncountersInput(inputVal);
    const numValue = parseInt(inputVal.replace(/,/g, ''), 10);
    if (!isNaN(numValue) && numValue >= 1000) {
      setUsingTotalInput(true);
      updateState({ annualEncounters: numValue });
      // Update per-provider calculation for display
      if (state.numberOfProviders > 0) {
        setEncountersPerProvider(Math.round(numValue / state.numberOfProviders));
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
    return encountersPerProvider === presetValue && !usingTotalInput;
  };

  const isUtilizationPresetSelected = (presetValue: number) => {
    return state.utilizationPercent === presetValue;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="explore"
        currentStep={2}
        totalSteps={6}
        stepName="Opportunity Size"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
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
                {isED ? "Let's understand your ED" : "Let's understand your practice"}
              </h1>
              <p className="text-slate-600 mb-4">
                {isED 
                  ? "These inputs establish the baseline for your value model. Every ED physician and encounter contributes to the opportunity."
                  : "These inputs establish the baseline for your value model. Every calculation downstream builds on these numbers."
                }
              </p>
              <div className="bg-slate-100 rounded-lg p-3">
                <p className="text-slate-500 text-xs">
                  <span className="font-semibold text-slate-700">Why we ask:</span> {isED 
                    ? "ED value scales with volume and complexity. More providers and higher utilization mean more eligible encounters—and more opportunity for throughput, retention, and documentation quality."
                    : "Value scales with volume. More providers and higher utilization mean more eligible encounters—and more opportunity for both time savings and documentation improvement."
                  }
                </p>
              </div>
            </motion.div>

            <div className="space-y-5">
              {/* Number of Providers */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#EA2C00]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-black">{isED ? "ED Physicians" : "Number of Providers"}</h2>
                      <p className="text-sm text-slate-500">{isED ? "Physicians using Abridge in the ED" : "Clinicians using Abridge"}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={providerInputValue}
                    onChange={(e) => handleProvidersChange(e.target.value)}
                    onBlur={handleProviderInputBlur}
                    className="w-28 py-3 px-4 text-right text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:bg-white focus:ring-2 focus:ring-[#EA2C00]/10 transition-all placeholder:text-slate-300"
                    data-testid="input-providers"
                  />
                </div>
              </motion.div>

              {/* Annual Encounters */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-black">Annual Encounters</h2>
                    <p className="text-sm text-slate-500">How busy is your practice?</p>
                  </div>
                </div>

                {/* Preset buttons - quick select by clinic type */}
                <div className="flex items-center gap-3 mb-4">
                  {BUSYNESS_PRESETS.map((preset) => {
                    const isSelected = isPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleBusynessChange(preset.value)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        data-testid={`preset-busyness-${preset.label.toLowerCase()}`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {preset.value.toLocaleString()}/provider
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Total encounters input */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 font-medium">Or enter your total practice volume</p>
                      <p className="text-xs text-slate-400">Total encounters your practice sees per year</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={annualEncounters > 0 ? annualEncounters.toLocaleString() : "e.g. 150,000"}
                        value={totalEncountersInput}
                        onChange={(e) => handleTotalEncountersChange(e.target.value)}
                        className="w-32 py-2 px-3 text-right font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA2C00] transition-all placeholder:text-slate-300"
                        data-testid="input-total-encounters"
                      />
                      <span className="text-sm text-slate-400">/yr</span>
                    </div>
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
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Percent className="w-6 h-6 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-black">Expected Utilization</h2>
                    <p className="text-sm text-slate-500">Percentage of encounters using Abridge</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4 ml-16">
                  Utilization often starts at 50-60% and grows to 75-85% as workflows mature. Start conservatively—you can always adjust.
                </p>

                {/* Preset buttons */}
                <div className="flex items-center gap-3 mb-4">
                  {UTILIZATION_PRESETS.map((preset) => {
                    const isSelected = isUtilizationPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleUtilizationChange(preset.value)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        data-testid={`preset-utilization-${preset.label.toLowerCase()}`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {preset.value}%
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">or enter custom:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={100}
                    value={state.utilizationPercent}
                    onChange={(e) => handleCustomUtilizationChange(e.target.value)}
                    className="w-20 py-2 px-3 text-center font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA2C00] transition-all"
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
                    w-full h-12 font-semibold rounded-full transition-all duration-200
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

          {/* Live Receipt Sidebar - Larger */}
          <motion.div
            className="hidden lg:block lg:w-80"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="sticky top-24">
              <div className="bg-black rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Your Baseline</h3>
                      <p className="text-xs text-white/50">Practice summary</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Providers</span>
                    <span className="text-base font-semibold text-white">
                      {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Encounters/Provider</span>
                    <span className="text-base font-semibold text-white">
                      {formatNumber(encountersPerProvider)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-sm text-white/50">Annual Encounters</span>
                    <span className="text-base font-semibold text-white">
                      {state.numberOfProviders > 0 ? formatNumber(annualEncounters) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Utilization</span>
                    <span className="text-base font-semibold text-white">
                      {state.utilizationPercent}%
                    </span>
                  </div>
                </div>

                {/* Eligible Encounters - Highlighted */}
                <div className="px-6 py-5 border-t border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white/70">Eligible Encounters</span>
                    <span className="text-2xl font-bold text-[#F07B5F]">
                      {state.numberOfProviders > 0 ? formatNumber(eligibleEncounters) : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-white/30">
                    This is your value multiplier—every driver calculation uses this number
                  </p>
                </div>

                {/* Continue Button */}
                <div className="px-6 pb-6">
                  <Button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`
                      w-full h-12 text-sm font-semibold rounded-full transition-all duration-200
                      ${isValid 
                        ? 'bg-white hover:bg-white/90 text-black' 
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
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
