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

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="explore"
        currentStep={3}
        totalSteps={7}
        stepName="Time Path"
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
                Choose Your Path
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                How would you like to model time savings?
              </h1>
              <p className="text-slate-600">
                Select the scenario that best reflects how you want to present this to stakeholders.
              </p>
            </motion.div>

            {/* Scenario Cards - Larger */}
            <div className="space-y-4">
              {SCENARIOS.map((scenario, index) => {
                const Icon = scenario.icon;
                const isSelected = state.timePathScenario === scenario.id;
                
                return (
                  <motion.button
                    key={scenario.id}
                    onClick={() => handleSelectScenario(scenario)}
                    className={`
                      relative w-full flex items-center gap-5 p-5 rounded-2xl transition-all duration-200 text-left
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
                    {/* Icon */}
                    <div className={`
                      w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-white/10' : 'bg-[#FFF5F2]'}
                    `}>
                      <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-[#EA2C00]'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-bold mb-1 ${isSelected ? 'text-white' : 'text-black'}`}>
                        {scenario.label}
                      </h3>
                      <p className={`text-sm mb-1 ${isSelected ? 'text-white/70' : 'text-slate-600'}`}>
                        {scenario.description}
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                        {scenario.detail}
                      </p>
                    </div>

                    {/* Time Value */}
                    <div className="text-right flex-shrink-0 pr-2">
                      <div className={`
                        text-3xl font-bold
                        ${isSelected ? 'text-[#F07B5F]' : 'text-[#EA2C00]'}
                      `}>
                        {scenario.minutes} min
                      </div>
                      <p className={`text-xs ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                        saved per encounter
                      </p>
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <motion.div 
                        className="absolute top-4 right-4 w-7 h-7 bg-[#EA2C00] rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Continue Button - Mobile */}
            <motion.div 
              className="lg:hidden pt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Button
                onClick={onNext}
                className="w-full h-12 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
                data-testid="button-continue-mobile"
              >
                Continue to Time Allocation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* Time Savings Sidebar - Larger */}
          <motion.div
            className="hidden lg:block lg:w-80"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="sticky top-24">
              <div className="bg-slate-900 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Projected Time Savings</h3>
                      <p className="text-xs text-white/50">Based on your scenario</p>
                    </div>
                  </div>
                </div>

                {/* Big Number */}
                <div className="px-6 py-6 border-b border-white/10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-[#F07B5F]">
                      {formatNumber(totalHoursSaved)}
                    </span>
                    <span className="text-lg text-white/70">hours / year</span>
                  </div>
                  <p className="text-sm text-white/40 mt-2">
                    {state.minutesSavedPerEncounter} min × {formatNumber(Math.round(eligibleEncounters))} encounters
                  </p>
                </div>

                {/* Details */}
                <div className="px-6 py-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Scenario</span>
                    <span className="text-sm font-semibold text-white capitalize">
                      {state.timePathScenario}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Time Saved</span>
                    <span className="text-sm font-semibold text-white">
                      {state.minutesSavedPerEncounter} min/encounter
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/50">Eligible Encounters</span>
                    <span className="text-sm font-semibold text-white">
                      {formatNumber(Math.round(eligibleEncounters))}
                    </span>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="px-6 pb-6">
                  <Button
                    onClick={onNext}
                    className="w-full h-12 text-sm font-semibold rounded-full bg-white hover:bg-white/90 text-black"
                    data-testid="button-continue"
                  >
                    Continue to Time Allocation
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
