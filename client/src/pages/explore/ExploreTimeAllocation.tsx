import { useState } from "react";
import { ArrowRight, Users, Clock, Heart, Check, ChevronDown, ChevronUp, Calculator, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type TimeAllocation } from "./ExploreFlow";

interface ExploreTimeAllocationProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface AllocationOption {
  id: keyof TimeAllocation;
  label: string;
  description: string;
  icon: typeof Users;
  valueLabel: string;
  isOptional?: boolean;
}

const ALLOCATION_OPTIONS: AllocationOption[] = [
  {
    id: 'patientAccess',
    label: 'Patient Access',
    description: 'See more patients and reduce wait times',
    icon: Users,
    valueLabel: 'New visits enabled',
  },
  {
    id: 'reducingLocums',
    label: 'Reduce Locums & Overtime',
    description: 'Lower premium labor costs',
    icon: Clock,
    valueLabel: 'Premium hours avoided',
    isOptional: true,
  },
  {
    id: 'clinicianWellbeing',
    label: 'Clinician Wellbeing',
    description: 'Improve retention and reduce burnout',
    icon: Heart,
    valueLabel: 'Retention improvement',
  },
];

const getPresetsForLocums = (includeLocums: boolean) => {
  if (includeLocums) {
    return [
      { label: 'Balanced', allocation: { patientAccess: 40, reducingLocums: 30, clinicianWellbeing: 30 } },
      { label: 'Growth Focus', allocation: { patientAccess: 60, reducingLocums: 20, clinicianWellbeing: 20 } },
      { label: 'Cost Focus', allocation: { patientAccess: 20, reducingLocums: 50, clinicianWellbeing: 30 } },
      { label: 'Retention Focus', allocation: { patientAccess: 25, reducingLocums: 25, clinicianWellbeing: 50 } },
    ];
  } else {
    return [
      { label: 'Balanced', allocation: { patientAccess: 50, reducingLocums: 0, clinicianWellbeing: 50 } },
      { label: 'Growth Focus', allocation: { patientAccess: 70, reducingLocums: 0, clinicianWellbeing: 30 } },
      { label: 'Retention Focus', allocation: { patientAccess: 30, reducingLocums: 0, clinicianWellbeing: 70 } },
    ];
  }
};

const REALIZATION_RATES = {
  patientAccess: 0.35,
  reducingLocums: 0.60,
  clinicianWellbeing: 0.20,
};

const VALUE_PER_UNIT = {
  patientAccessVisitValue: 200,
  locumHourlyCost: 150,
  turnoverCostPerProvider: 250000,
  atRiskReduction: 0.15,
};

export default function ExploreTimeAllocation({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreTimeAllocationProps) {
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [includeLocums, setIncludeLocums] = useState(state.timeAllocation.reducingLocums > 0);

  const handleToggleLocums = () => {
    const newIncludeLocums = !includeLocums;
    setIncludeLocums(newIncludeLocums);
    
    if (!newIncludeLocums) {
      const currentLocums = state.timeAllocation.reducingLocums;
      const half = Math.round(currentLocums / 2);
      updateState({
        timeAllocation: {
          patientAccess: state.timeAllocation.patientAccess + half,
          reducingLocums: 0,
          clinicianWellbeing: state.timeAllocation.clinicianWellbeing + (currentLocums - half),
        }
      });
    } else {
      updateState({
        timeAllocation: {
          patientAccess: 40,
          reducingLocums: 30,
          clinicianWellbeing: 30,
        }
      });
    }
  };

  const handleSliderChange = (id: keyof TimeAllocation, newValue: number) => {
    const current = { ...state.timeAllocation };
    const oldValue = current[id];
    const diff = newValue - oldValue;
    
    const adjustableKeys = (Object.keys(current) as (keyof TimeAllocation)[])
      .filter(k => k !== id && (includeLocums || k !== 'reducingLocums'));
    const otherTotal = adjustableKeys.reduce((sum, k) => sum + current[k], 0);
    
    if (otherTotal > 0) {
      adjustableKeys.forEach(k => {
        const ratio = current[k] / otherTotal;
        current[k] = Math.max(0, Math.round(current[k] - diff * ratio));
      });
    }
    
    current[id] = newValue;
    
    const total = current.patientAccess + (includeLocums ? current.reducingLocums : 0) + current.clinicianWellbeing;
    if (total !== 100) {
      const adjustment = 100 - total;
      const adjustKey = adjustableKeys.find(k => current[k] > 0) || adjustableKeys[0];
      if (adjustKey) {
        current[adjustKey] = Math.max(0, current[adjustKey] + adjustment);
      }
    }
    
    updateState({ timeAllocation: current });
  };

  const handlePreset = (preset: { allocation: TimeAllocation }) => {
    updateState({ timeAllocation: preset.allocation });
  };

  const getHoursForCategory = (id: keyof TimeAllocation) => {
    return Math.round(totalHoursSaved * (state.timeAllocation[id] / 100));
  };

  const calculateDriverValue = (id: keyof TimeAllocation) => {
    const hours = getHoursForCategory(id);
    const realizationRate = REALIZATION_RATES[id];
    
    switch (id) {
      case 'patientAccess': {
        const avgVisitLength = 0.5;
        const potentialVisits = hours / avgVisitLength;
        const realizedVisits = potentialVisits * realizationRate;
        const value = realizedVisits * VALUE_PER_UNIT.patientAccessVisitValue;
        return {
          value: Math.round(value),
          steps: [
            { label: 'Hours allocated', value: hours.toLocaleString(), unit: 'hours' },
            { label: 'Avg visit length', value: '30', unit: 'min' },
            { label: 'Potential new visits', value: Math.round(potentialVisits).toLocaleString(), unit: 'visits' },
            { label: 'Realization rate', value: `${Math.round(realizationRate * 100)}%`, unit: '', highlight: true, explanation: 'Not all saved time converts to visits—scheduling, room availability, and demand limit realization' },
            { label: 'Realized new visits', value: Math.round(realizedVisits).toLocaleString(), unit: 'visits' },
            { label: 'Revenue per visit', value: `$${VALUE_PER_UNIT.patientAccessVisitValue}`, unit: '' },
            { label: 'Annual value', value: `$${Math.round(value).toLocaleString()}`, unit: '', isFinal: true },
          ],
        };
      }
      case 'reducingLocums': {
        const realizedHours = hours * realizationRate;
        const value = realizedHours * VALUE_PER_UNIT.locumHourlyCost;
        return {
          value: Math.round(value),
          steps: [
            { label: 'Hours allocated', value: hours.toLocaleString(), unit: 'hours' },
            { label: 'Realization rate', value: `${Math.round(realizationRate * 100)}%`, unit: '', highlight: true, explanation: 'Accounts for scheduling constraints and minimum shift requirements' },
            { label: 'Locum hours avoided', value: Math.round(realizedHours).toLocaleString(), unit: 'hours' },
            { label: 'Locum hourly cost', value: `$${VALUE_PER_UNIT.locumHourlyCost}`, unit: '' },
            { label: 'Annual savings', value: `$${Math.round(value).toLocaleString()}`, unit: '', isFinal: true },
          ],
        };
      }
      case 'clinicianWellbeing': {
        const providersAtRisk = state.numberOfProviders * VALUE_PER_UNIT.atRiskReduction;
        const retentionImprovement = (state.timeAllocation.clinicianWellbeing / 100) * realizationRate;
        const providersRetained = providersAtRisk * retentionImprovement;
        const value = providersRetained * VALUE_PER_UNIT.turnoverCostPerProvider;
        return {
          value: Math.round(value),
          steps: [
            { label: 'Total providers', value: state.numberOfProviders.toLocaleString(), unit: 'providers' },
            { label: 'At-risk rate (industry avg)', value: '15%', unit: '' },
            { label: 'Providers at risk', value: Math.round(providersAtRisk).toLocaleString(), unit: 'providers' },
            { label: 'Wellbeing allocation', value: `${state.timeAllocation.clinicianWellbeing}%`, unit: '' },
            { label: 'Realization rate', value: `${Math.round(realizationRate * 100)}%`, unit: '', highlight: true, explanation: 'Conservative estimate of burnout reduction translating to retention' },
            { label: 'Providers retained', value: providersRetained.toFixed(1), unit: 'providers' },
            { label: 'Turnover cost avoided', value: `$${VALUE_PER_UNIT.turnoverCostPerProvider.toLocaleString()}`, unit: '/provider' },
            { label: 'Annual value', value: `$${Math.round(value).toLocaleString()}`, unit: '', isFinal: true },
          ],
        };
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedDriver(expandedDriver === id ? null : id);
  };

  const presets = getPresetsForLocums(includeLocums);
  const visibleOptions = ALLOCATION_OPTIONS.filter(opt => !opt.isOptional || includeLocums);

  const totalAllocated = visibleOptions.reduce((sum, opt) => sum + state.timeAllocation[opt.id], 0);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={7}
        stepName="Time Allocation"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Allocate Your Savings
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            How Will Your Organization Use This Time?
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            You're unlocking <span className="font-bold text-[#EA2C00]">{totalHoursSaved.toLocaleString()} hours</span> of clinician capacity. 
            How would you like to model its impact?
          </p>
        </motion.div>

        {/* Locums Toggle */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <button
            onClick={handleToggleLocums}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${includeLocums 
                ? 'bg-[#EA2C00] text-white' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }
            `}
            data-testid="button-toggle-locums"
          >
            {includeLocums ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            {includeLocums ? 'Locums included' : 'Add locum/overtime savings'}
          </button>
        </motion.div>

        {/* Presets */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {presets.map((preset) => {
            const isActive = 
              state.timeAllocation.patientAccess === preset.allocation.patientAccess &&
              state.timeAllocation.reducingLocums === preset.allocation.reducingLocums &&
              state.timeAllocation.clinicianWellbeing === preset.allocation.clinicianWellbeing;
            
            return (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-black text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
                data-testid={`button-preset-${preset.label.toLowerCase().replace(' ', '-')}`}
              >
                {preset.label}
                {isActive && <Check className="w-3.5 h-3.5 ml-1.5 inline" />}
              </button>
            );
          })}
        </motion.div>

        <div className="space-y-4 max-w-2xl mx-auto mb-8">
          {visibleOptions.map((option, index) => {
            const Icon = option.icon;
            const value = state.timeAllocation[option.id];
            const hours = getHoursForCategory(option.id);
            const driverCalc = calculateDriverValue(option.id);
            const isExpanded = expandedDriver === option.id;
            
            return (
              <motion.div
                key={option.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05, duration: 0.4 }}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#EA2C00]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-black">{option.label}</h3>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-black">{value}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{option.description}</p>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={value}
                    onChange={(e) => handleSliderChange(option.id, Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                    data-testid={`slider-${option.id}`}
                  />

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{option.valueLabel}</span>
                      <span className="text-sm font-semibold text-[#EA2C00]">{hours.toLocaleString()} hours</span>
                    </div>
                    
                    {/* Expandable math button */}
                    <button
                      onClick={() => toggleExpand(option.id)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#EA2C00] transition-colors"
                      data-testid={`button-expand-${option.id}`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>See the math</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expandable math breakdown */}
                <AnimatePresence>
                  {isExpanded && driverCalc && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center gap-2 mb-4">
                            <Calculator className="w-4 h-4 text-[#EA2C00]" />
                            <h4 className="text-sm font-bold text-black">How We Calculate This</h4>
                          </div>
                          
                          <div className="space-y-2">
                            {driverCalc.steps.map((step, stepIndex) => (
                              <div key={stepIndex}>
                                <div 
                                  className={`
                                    flex items-center justify-between py-2
                                    ${step.isFinal ? 'border-t-2 border-[#EA2C00]/20 pt-3 mt-2' : ''}
                                  `}
                                >
                                  <span className={`text-sm ${step.isFinal ? 'font-bold text-black' : step.highlight ? 'font-medium text-[#EA2C00]' : 'text-slate-600'}`}>
                                    {step.label}
                                  </span>
                                  <span className={`text-sm font-semibold ${step.isFinal ? 'text-[#EA2C00] text-lg' : step.highlight ? 'text-[#EA2C00]' : 'text-black'}`}>
                                    {step.value} {step.unit}
                                  </span>
                                </div>
                                {step.explanation && (
                                  <p className="text-xs text-slate-500 italic pl-2 pb-2 border-l-2 border-[#EA2C00]/20 ml-1">
                                    {step.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Total summary */}
        <motion.div
          className="bg-black rounded-2xl p-6 text-white text-center max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <p className="text-sm text-white/60 mb-2">Total Allocation</p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 text-right">
              <span className="text-4xl font-bold">{totalHoursSaved.toLocaleString()}</span>
              <span className="text-white/60 ml-2">hours</span>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="flex-1 text-left">
              <span className={`text-4xl font-bold ${totalAllocated === 100 ? 'text-[#F07B5F]' : 'text-yellow-400'}`}>
                {totalAllocated}%
              </span>
              <span className="text-white/60 ml-2">allocated</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button
            onClick={onNext}
            disabled={totalAllocated !== 100}
            className={`
              h-12 px-8 font-semibold rounded-full transition-all duration-200
              ${totalAllocated === 100
                ? 'bg-black hover:bg-black/90 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
            data-testid="button-continue"
          >
            Continue to Documentation Quality
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
