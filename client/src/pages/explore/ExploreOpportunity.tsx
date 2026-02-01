import { useCallback, useState } from "react";
import { ArrowRight, Users, Calendar, Percent, FileText } from "lucide-react";
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

const ENCOUNTERS_PER_PROVIDER_OUTPATIENT = 2800;
const ENCOUNTERS_PER_PROVIDER_SPECIALTY = 2100;

const UTILIZATION_OPTIONS = [
  { label: "Conservative", value: 50, description: "Cautious rollout" },
  { label: "Typical", value: 70, description: "Standard adoption" },
  { label: "Aggressive", value: 80, description: "High adoption" },
];

export default function ExploreOpportunity({ state, updateState, onNext, onBack, onHome }: ExploreOpportunityProps) {
  const [providerInputValue, setProviderInputValue] = useState(state.numberOfProviders.toString());
  const [encounterInputValue, setEncounterInputValue] = useState(state.annualEncounters.toString());

  const handleProvidersChange = useCallback((value: number) => {
    const clampedValue = Math.max(1, Math.min(1000, value));
    const annualEncounters = clampedValue * ENCOUNTERS_PER_PROVIDER_OUTPATIENT;
    setProviderInputValue(clampedValue.toString());
    setEncounterInputValue(annualEncounters.toString());
    updateState({ 
      numberOfProviders: clampedValue,
      annualEncounters,
    });
  }, [updateState]);

  const handleProviderInputChange = useCallback((inputVal: string) => {
    setProviderInputValue(inputVal);
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(1000, numValue));
      const annualEncounters = clampedValue * ENCOUNTERS_PER_PROVIDER_OUTPATIENT;
      setEncounterInputValue(annualEncounters.toString());
      updateState({ 
        numberOfProviders: clampedValue,
        annualEncounters,
      });
    }
  }, [updateState]);

  const handleProviderInputBlur = useCallback(() => {
    const numValue = parseInt(providerInputValue, 10);
    if (isNaN(numValue) || numValue < 1) {
      setProviderInputValue(state.numberOfProviders.toString());
    } else {
      const clampedValue = Math.max(1, Math.min(1000, numValue));
      setProviderInputValue(clampedValue.toString());
    }
  }, [providerInputValue, state.numberOfProviders]);

  const handleEncountersChange = useCallback((value: number) => {
    const clampedValue = Math.max(1000, Math.min(5000000, value));
    setEncounterInputValue(clampedValue.toString());
    updateState({ annualEncounters: clampedValue });
  }, [updateState]);

  const handleEncounterInputChange = useCallback((inputVal: string) => {
    const cleanedValue = inputVal.replace(/,/g, '');
    setEncounterInputValue(cleanedValue);
    const numValue = parseInt(cleanedValue, 10);
    if (!isNaN(numValue) && numValue > 0) {
      updateState({ annualEncounters: numValue });
    }
  }, [updateState]);

  const handleEncounterInputBlur = useCallback(() => {
    const numValue = parseInt(encounterInputValue.replace(/,/g, ''), 10);
    if (isNaN(numValue) || numValue < 1000) {
      setEncounterInputValue(state.annualEncounters.toString());
    }
  }, [encounterInputValue, state.annualEncounters]);

  const handleUtilizationChange = useCallback((value: number) => {
    updateState({ utilizationPercent: value });
  }, [updateState]);

  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

  const formatNumber = (n: number) => n.toLocaleString();

  const isValid = state.numberOfProviders > 0 && state.annualEncounters > 0 && state.utilizationPercent > 0;

  const getSelectedUtilization = () => {
    return UTILIZATION_OPTIONS.find(opt => opt.value === state.utilizationPercent) || null;
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={2}
        totalSteps={7}
        stepName="Opportunity Size"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Size Your Opportunity
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            How Big Is Your Deployment?
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Tell us about your organization's scale and expected adoption.
          </p>
        </motion.div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Number of Providers */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Number of Providers</h2>
                <p className="text-sm text-slate-500">How many clinicians will use Abridge?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={Math.min(500, state.numberOfProviders)}
                  onChange={(e) => handleProvidersChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-providers"
                />
                <div className="relative group">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={providerInputValue}
                    onChange={(e) => handleProviderInputChange(e.target.value)}
                    onBlur={handleProviderInputBlur}
                    className="w-24 text-right text-2xl font-bold text-black bg-slate-50 hover:bg-slate-100 focus:bg-white px-3 py-1 rounded-lg border-2 border-slate-200 hover:border-slate-300 focus:border-[#EA2C00] focus:outline-none transition-all cursor-text"
                    data-testid="input-providers"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-60 group-focus-within:opacity-0 transition-opacity">
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>10</span>
                <span>500+</span>
              </div>
            </div>
          </motion.div>

          {/* Annual Encounters */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Annual Encounters</h2>
                <p className="text-sm text-slate-500">Total patient encounters per year</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10000"
                  max="2000000"
                  step="10000"
                  value={Math.min(2000000, state.annualEncounters)}
                  onChange={(e) => handleEncountersChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-encounters"
                />
                <div className="relative group">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(state.annualEncounters)}
                    onChange={(e) => handleEncounterInputChange(e.target.value)}
                    onBlur={handleEncounterInputBlur}
                    className="w-32 text-right text-2xl font-bold text-black bg-slate-50 hover:bg-slate-100 focus:bg-white px-3 py-1 rounded-lg border-2 border-slate-200 hover:border-slate-300 focus:border-[#EA2C00] focus:outline-none transition-all cursor-text"
                    data-testid="input-encounters"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-60 group-focus-within:opacity-0 transition-opacity">
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>10K</span>
                <span>2M+</span>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Typical benchmarks:</span>{" "}
                  ~{formatNumber(ENCOUNTERS_PER_PROVIDER_OUTPATIENT)} encounters/provider/year (primary care) • 
                  ~{formatNumber(ENCOUNTERS_PER_PROVIDER_SPECIALTY)} encounters/provider/year (specialty)
                </p>
              </div>
            </div>
          </motion.div>

          {/* Expected Utilization */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                <Percent className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Expected Utilization</h2>
                <p className="text-sm text-slate-500">What percentage of encounters will use Abridge?</p>
              </div>
            </div>

            {/* Utilization Quick Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {UTILIZATION_OPTIONS.map((option) => {
                const isSelected = state.utilizationPercent === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleUtilizationChange(option.value)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${isSelected 
                        ? 'bg-black border-black text-white' 
                        : 'bg-white border-slate-200 text-black hover:border-slate-300'
                      }
                    `}
                    data-testid={`button-utilization-${option.label.toLowerCase()}`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#EA2C00] flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <p className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-black'}`}>
                      {option.value}%
                    </p>
                    <p className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                      {option.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom slider for fine-tuning */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={state.utilizationPercent}
                  onChange={(e) => handleUtilizationChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                  style={{ accentColor: '#EA2C00' }}
                  data-testid="slider-utilization"
                />
                <div className="w-16 text-right">
                  <span className="text-lg font-bold text-[#EA2C00]">{state.utilizationPercent}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>25%</span>
                <span>100%</span>
              </div>
            </div>
          </motion.div>

          {/* Your Baseline Summary */}
          <motion.div
            className="bg-black rounded-2xl p-6 md:p-8 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Your Baseline</h2>
                <p className="text-sm text-white/70">Based on your inputs</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-white/60 mb-1">Providers</p>
                <p className="text-2xl md:text-3xl font-bold">{formatNumber(state.numberOfProviders)}</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Annual Encounters</p>
                <p className="text-2xl md:text-3xl font-bold">{formatNumber(state.annualEncounters)}</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Eligible Encounters</p>
                <p className="text-2xl md:text-3xl font-bold text-[#F07B5F]">{formatNumber(eligibleEncounters)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="flex flex-col items-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button
            onClick={onNext}
            disabled={!isValid}
            className={`
              h-12 px-8 font-semibold rounded-full transition-all duration-200
              ${isValid 
                ? 'bg-black hover:bg-black/90 text-white' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
            data-testid="button-continue"
          >
            Continue to Time Savings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
