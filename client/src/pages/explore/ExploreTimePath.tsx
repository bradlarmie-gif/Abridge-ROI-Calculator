import { ArrowRight, Clock, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type TimePathScenario } from "./ExploreFlow";

interface ExploreTimePathProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface ScenarioOption {
  id: TimePathScenario;
  label: string;
  description: string;
  minutes: number;
  icon: typeof TrendingDown;
  detail: string;
}

const SCENARIOS: ScenarioOption[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'A careful, low-risk estimate',
    minutes: 1.5,
    icon: TrendingDown,
    detail: 'Best for skeptical stakeholders',
  },
  {
    id: 'typical',
    label: 'Typical',
    description: 'Based on average customer outcomes',
    minutes: 3,
    icon: Minus,
    detail: 'Recommended starting point',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Optimistic but achievable',
    minutes: 4.5,
    icon: TrendingUp,
    detail: 'For high-adoption organizations',
  },
];

export default function ExploreTimePath({ state, updateState, onNext, onBack, onHome }: ExploreTimePathProps) {
  
  const handleSelectScenario = (scenario: ScenarioOption) => {
    updateState({ 
      timePathScenario: scenario.id,
      minutesSavedPerEncounter: scenario.minutes,
    });
  };

  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  const totalMinutesSaved = eligibleEncounters * state.minutesSavedPerEncounter;
  const totalHoursSaved = Math.round(totalMinutesSaved / 60);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={3}
        totalSteps={7}
        stepName="Time Path"
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
            Choose Your Path
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            How Would You Like to Model Time Savings?
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Select the scenario that best reflects how you want to present this to stakeholders.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {SCENARIOS.map((scenario, index) => {
            const Icon = scenario.icon;
            const isSelected = state.timePathScenario === scenario.id;
            
            return (
              <motion.button
                key={scenario.id}
                onClick={() => handleSelectScenario(scenario)}
                className={`
                  relative flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-200
                  ${isSelected 
                    ? 'bg-black text-white shadow-lg' 
                    : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                data-testid={`card-scenario-${scenario.id}`}
              >
                {isSelected && (
                  <motion.div 
                    className="absolute top-3 right-3 w-6 h-6 bg-[#EA2C00] rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.div>
                )}

                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center mb-4
                  ${isSelected ? 'bg-white/10' : 'bg-[#FFF5F2]'}
                `}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#EA2C00]'}`} />
                </div>

                <h3 className={`text-lg font-bold mb-1 ${isSelected ? 'text-white' : 'text-black'}`}>
                  {scenario.label}
                </h3>
                
                <p className={`text-sm mb-3 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                  {scenario.description}
                </p>

                <div className={`
                  text-3xl font-bold mb-1
                  ${isSelected ? 'text-[#F07B5F]' : 'text-[#EA2C00]'}
                `}>
                  {scenario.minutes} min
                </div>
                
                <p className={`text-xs ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                  saved per encounter
                </p>

                <div className={`
                  mt-4 pt-4 border-t w-full text-xs
                  ${isSelected ? 'border-white/20 text-white/60' : 'border-slate-100 text-slate-400'}
                `}>
                  {scenario.detail}
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          className="bg-black rounded-2xl p-6 md:p-8 text-white mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Projected Time Savings</h2>
              <p className="text-sm text-white/70">Based on your scenario</p>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-[#F07B5F]">{totalHoursSaved.toLocaleString()}</span>
            <span className="text-xl text-white/70">hours / year</span>
          </div>

          <p className="text-sm text-white/60 mt-2">
            That's {state.minutesSavedPerEncounter} minutes × {Math.round(eligibleEncounters).toLocaleString()} eligible encounters
          </p>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button
            onClick={onNext}
            className="h-12 px-8 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
            data-testid="button-continue"
          >
            Continue to Time Allocation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
