import { useCallback } from "react";
import { ArrowRight, Users, Calendar, Percent } from "lucide-react";
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

const ENCOUNTERS_PER_PROVIDER_PER_YEAR = 3500;

export default function ExploreOpportunity({ state, updateState, onNext, onBack, onHome }: ExploreOpportunityProps) {
  
  const handleProvidersChange = useCallback((value: number) => {
    const annualEncounters = value * ENCOUNTERS_PER_PROVIDER_PER_YEAR;
    updateState({ 
      numberOfProviders: value,
      annualEncounters,
    });
  }, [updateState]);

  const handleUtilizationChange = useCallback((value: number) => {
    updateState({ utilizationPercent: value });
  }, [updateState]);

  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

  const formatNumber = (n: number) => n.toLocaleString();

  const isValid = state.numberOfProviders > 0 && state.utilizationPercent > 0;

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
                  value={state.numberOfProviders}
                  onChange={(e) => handleProvidersChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-providers"
                />
                <div className="w-20 text-right">
                  <span className="text-2xl font-bold text-black">{state.numberOfProviders}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>10</span>
                <span>500+</span>
              </div>
            </div>
          </motion.div>

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

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={state.utilizationPercent}
                  onChange={(e) => handleUtilizationChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-utilization"
                />
                <div className="w-20 text-right">
                  <span className="text-2xl font-bold text-black">{state.utilizationPercent}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>25%</span>
                <span>100%</span>
              </div>
            </div>
          </motion.div>

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

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-white/60 mb-1">Annual Encounters</p>
                <p className="text-3xl font-bold">{formatNumber(state.annualEncounters)}</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Eligible Encounters</p>
                <p className="text-3xl font-bold text-[#F07B5F]">{formatNumber(eligibleEncounters)}</p>
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
