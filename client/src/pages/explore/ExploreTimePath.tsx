import { ArrowRight, Clock, Check, Shield, Target, Zap } from "lucide-react";
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
  tagline: string;
  description: string;
  minutes: number;
  icon: typeof Shield;
  recommended?: boolean;
}

const OUTPATIENT_SCENARIOS: ScenarioOption[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    tagline: 'Play it safe',
    description: 'A careful estimate for skeptical stakeholders. Under-promise to over-deliver.',
    minutes: 1.5,
    icon: Shield,
  },
  {
    id: 'typical',
    label: 'Typical',
    tagline: 'Most customers start here',
    description: 'Based on real outcomes from similar implementations. The balanced approach.',
    minutes: 3,
    icon: Target,
    recommended: true,
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    tagline: 'Maximize potential',
    description: 'For high-adoption organizations ready to fully embrace documentation AI.',
    minutes: 4.5,
    icon: Zap,
  },
];

const ED_SCENARIOS: ScenarioOption[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    tagline: 'Play it safe',
    description: 'Accounts for ED workflow complexity. Start here for skeptical stakeholders.',
    minutes: 2,
    icon: Shield,
  },
  {
    id: 'typical',
    label: 'Typical',
    tagline: 'Most EDs start here',
    description: 'Based on real ED implementations. Balances throughput improvement with adoption reality.',
    minutes: 4,
    icon: Target,
    recommended: true,
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    tagline: 'Maximize throughput',
    description: 'For high-volume EDs with strong physician buy-in and optimized workflows.',
    minutes: 6,
    icon: Zap,
  },
];

const INPATIENT_SCENARIOS: ScenarioOption[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    tagline: 'Play it safe',
    description: 'Accounts for inpatient workflow complexity. Hospitalists document multiple patients per day with detailed notes.',
    minutes: 5,
    icon: Shield,
  },
  {
    id: 'typical',
    label: 'Typical',
    tagline: 'Most hospitalist programs start here',
    description: 'Based on real inpatient implementations. Balances documentation efficiency with adoption reality.',
    minutes: 10,
    icon: Target,
    recommended: true,
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    tagline: 'Maximize efficiency',
    description: 'For programs with strong hospitalist buy-in and optimized rounding workflows.',
    minutes: 15,
    icon: Zap,
  },
];

export default function ExploreTimePath({ state, updateState, onNext, onBack, onHome }: ExploreTimePathProps) {
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const SCENARIOS = isInpatient ? INPATIENT_SCENARIOS : isED ? ED_SCENARIOS : OUTPATIENT_SCENARIOS;
  
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
        totalSteps={6}
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
                {isInpatient ? "Model Documentation Efficiency" : isED ? "Model ED Efficiency" : "Model Time Savings"}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                {isInpatient ? "How much time per admission?" : isED ? "How much time per encounter?" : "Choose your modeling approach"}
              </h1>
              <p className="text-slate-600 mb-4">
                {isInpatient
                  ? "Inpatient documentation is extensive—H&Ps, progress notes, discharge summaries. Pick the scenario that matches your expectations for per-admission time savings."
                  : isED 
                    ? "ED documentation is fast-paced but still time-consuming. Pick the scenario that matches your expectations for per-encounter time savings."
                    : "Time savings vary by specialty, EHR, and workflow. Pick the scenario that matches your organization's expectations."
                }
              </p>
              <div className="bg-slate-100 rounded-lg p-3">
                <p className="text-slate-500 text-xs">
                  <span className="font-semibold text-slate-700">How to choose:</span> {isInpatient
                    ? "Use \"Conservative\" for CFO presentations. \"Typical\" reflects average hospitalist implementations. \"Aggressive\" suits programs with strong physician buy-in and optimized rounding. All assumptions can be adjusted later."
                    : isED 
                      ? "Use \"Conservative\" for CFO presentations. \"Typical\" reflects average ED implementations. \"Aggressive\" suits high-volume EDs ready to fully embrace ambient documentation. All assumptions can be adjusted later."
                      : "Use \"Conservative\" for CFO presentations or skeptical stakeholders. \"Typical\" reflects average outcomes. \"Aggressive\" suits high-adoption organizations with strong change management. All assumptions can be adjusted later."
                  }
                </p>
              </div>
            </motion.div>

            {/* Scenario Cards */}
            <div className="space-y-4">
              {SCENARIOS.map((scenario, index) => {
                const Icon = scenario.icon;
                const isSelected = state.timePathScenario === scenario.id;
                
                return (
                  <motion.button
                    key={scenario.id}
                    onClick={() => handleSelectScenario(scenario)}
                    className={`
                      relative w-full text-left rounded-2xl transition-all duration-200 overflow-hidden
                      ${isSelected 
                        ? 'ring-2 ring-[#EA2C00] shadow-lg' 
                        : 'hover:shadow-md'
                      }
                    `}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                    data-testid={`card-scenario-${scenario.id}`}
                  >
                    <div className={`
                      p-6 
                      ${isSelected ? 'bg-white' : 'bg-white border border-slate-200'}
                      ${scenario.recommended && !isSelected ? 'border-[#EA2C00]/30' : ''}
                    `}>
                      <div className="flex items-start gap-5">
                        {/* Icon with selection indicator */}
                        <div className="relative flex-shrink-0">
                          <div className={`
                            w-14 h-14 rounded-xl flex items-center justify-center transition-colors
                            ${isSelected ? 'bg-[#EA2C00]' : 'bg-[#FFF5F2]'}
                          `}>
                            <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-[#EA2C00]'}`} />
                          </div>
                          {isSelected && (
                            <motion.div 
                              className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-bold text-black">
                              {scenario.label}
                            </h3>
                            {scenario.recommended && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[#EA2C00]/10 text-[#EA2C00] rounded">
                                Recommended
                              </span>
                            )}
                            <span className="text-sm text-slate-400">
                              {scenario.tagline}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {scenario.description}
                          </p>
                        </div>

                        {/* Time Value */}
                        <div className="text-right flex-shrink-0 pt-1">
                          <div className="text-3xl font-bold text-[#EA2C00]">
                            {scenario.minutes}
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            min saved
                          </p>
                        </div>
                      </div>
                    </div>
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

          {/* Time Savings Sidebar */}
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
                    {state.minutesSavedPerEncounter} min × {formatNumber(Math.round(eligibleEncounters))} {isInpatient ? 'admissions' : 'encounters'}
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
                    <span className="text-sm text-white/50">{isInpatient ? 'Eligible Admissions' : 'Eligible Encounters'}</span>
                    <span className="text-sm font-semibold text-white">
                      {formatNumber(Math.round(eligibleEncounters))}
                    </span>
                  </div>
                </div>

                {/* Context */}
                <div className="px-6 pb-4">
                  <p className="text-xs text-white/30">
                    Raw time savings don't equal cash. Next, you'll decide how this time converts to value.
                  </p>
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
