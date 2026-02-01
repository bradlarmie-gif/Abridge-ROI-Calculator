import { useState } from "react";
import { ArrowRight, Users, Clock, Heart, Check, ChevronDown, ChevronUp, Calculator, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
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

interface EditableAssumptions {
  visitValue: number;
  locumHourlyCost: number;
  turnoverCost: number;
  atRiskRate: number;
  patientAccessRealization: number;
  locumRealization: number;
  wellbeingRealization: number;
}

const DEFAULT_ASSUMPTIONS: EditableAssumptions = {
  visitValue: 200,
  locumHourlyCost: 150,
  turnoverCost: 250000,
  atRiskRate: 15,
  patientAccessRealization: 20,
  locumRealization: 60,
  wellbeingRealization: 20,
};

function EditableValue({ 
  value, 
  onChange, 
  prefix = '', 
  suffix = '',
  min = 0,
  max = 999999,
  step = 1,
}: { 
  value: number; 
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleStartEdit = () => {
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(inputValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    } else {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1">
        {prefix}
        <input
          type="number"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          className="w-20 px-2 py-1 text-sm font-semibold text-[#EA2C00] bg-white border-2 border-[#EA2C00] rounded-lg focus:outline-none"
          autoFocus
          data-testid="input-editable-value"
        />
        {suffix}
      </span>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleStartEdit();
      }}
      className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA2C00] bg-[#EA2C00]/5 hover:bg-[#EA2C00]/15 px-2 py-1 rounded-lg transition-colors"
      data-testid="button-edit-value"
    >
      {prefix}{value.toLocaleString()}{suffix}
      <Pencil className="w-3 h-3" />
    </button>
  );
}

export default function ExploreTimeAllocation({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreTimeAllocationProps) {
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [includeLocums, setIncludeLocums] = useState(false);
  const [assumptions, setAssumptions] = useState<EditableAssumptions>(DEFAULT_ASSUMPTIONS);

  const updateAssumption = (key: keyof EditableAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

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
    
    switch (id) {
      case 'patientAccess': {
        const realizationRate = assumptions.patientAccessRealization / 100;
        const avgVisitLength = 0.5;
        const potentialVisits = hours / avgVisitLength;
        const realizedVisits = potentialVisits * realizationRate;
        const value = realizedVisits * assumptions.visitValue;
        return {
          value: Math.round(value),
          editableInputs: (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Hours allocated</span>
                <span className="font-semibold text-black">{hours.toLocaleString()} hrs</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Potential visits (30 min avg)</span>
                <span className="font-semibold text-black">{Math.round(potentialVisits).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#FFF5F2] -mx-3 px-3 rounded">
                <span className="font-medium text-[#EA2C00]">Realization rate</span>
                <EditableValue 
                  value={assumptions.patientAccessRealization} 
                  onChange={(v) => updateAssumption('patientAccessRealization', v)}
                  suffix="%"
                  min={10}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Revenue per visit</span>
                <EditableValue 
                  value={assumptions.visitValue} 
                  onChange={(v) => updateAssumption('visitValue', v)}
                  prefix="$"
                  min={50}
                  max={1000}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#EA2C00]/20 mt-1">
                <span className="font-bold text-black">Annual value</span>
                <span className="font-bold text-[#F07B5F]">${Math.round(value).toLocaleString()}</span>
              </div>
            </div>
          ),
        };
      }
      case 'reducingLocums': {
        const realizationRate = assumptions.locumRealization / 100;
        const realizedHours = hours * realizationRate;
        const value = realizedHours * assumptions.locumHourlyCost;
        return {
          value: Math.round(value),
          editableInputs: (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Hours allocated</span>
                <span className="font-semibold text-black">{hours.toLocaleString()} hrs</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#FFF5F2] -mx-3 px-3 rounded">
                <span className="font-medium text-[#EA2C00]">Realization rate</span>
                <EditableValue 
                  value={assumptions.locumRealization} 
                  onChange={(v) => updateAssumption('locumRealization', v)}
                  suffix="%"
                  min={10}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Locum hourly cost</span>
                <EditableValue 
                  value={assumptions.locumHourlyCost} 
                  onChange={(v) => updateAssumption('locumHourlyCost', v)}
                  prefix="$"
                  min={50}
                  max={500}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#EA2C00]/20 mt-1">
                <span className="font-bold text-black">Annual savings</span>
                <span className="font-bold text-[#F07B5F]">${Math.round(value).toLocaleString()}</span>
              </div>
            </div>
          ),
        };
      }
      case 'clinicianWellbeing': {
        const realizationRate = assumptions.wellbeingRealization / 100;
        const atRiskRate = assumptions.atRiskRate / 100;
        const providersAtRisk = state.numberOfProviders * atRiskRate;
        const retentionImprovement = (state.timeAllocation.clinicianWellbeing / 100) * realizationRate;
        const providersRetained = providersAtRisk * retentionImprovement;
        const value = providersRetained * assumptions.turnoverCost;
        return {
          value: Math.round(value),
          editableInputs: (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Providers at risk ({assumptions.atRiskRate}%)</span>
                <span className="font-semibold text-black">{Math.round(providersAtRisk).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#FFF5F2] -mx-3 px-3 rounded">
                <span className="font-medium text-[#EA2C00]">Realization rate</span>
                <EditableValue 
                  value={assumptions.wellbeingRealization} 
                  onChange={(v) => updateAssumption('wellbeingRealization', v)}
                  suffix="%"
                  min={5}
                  max={50}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Turnover cost per provider</span>
                <EditableValue 
                  value={assumptions.turnoverCost} 
                  onChange={(v) => updateAssumption('turnoverCost', v)}
                  prefix="$"
                  min={50000}
                  max={1000000}
                  step={10000}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#EA2C00]/20 mt-1">
                <span className="font-bold text-black">Annual value</span>
                <span className="font-bold text-[#F07B5F]">${Math.round(value).toLocaleString()}</span>
              </div>
            </div>
          ),
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
  const totalTimeValue = visibleOptions.reduce((sum, opt) => {
    const calc = calculateDriverValue(opt.id);
    return sum + (calc?.value || 0);
  }, 0);

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={7}
        stepName="Time Allocation"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
                Allocate Your Savings
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                How will you use this time?
              </h1>
              <p className="text-slate-600">
                You're unlocking <span className="font-bold text-[#EA2C00]">{totalHoursSaved.toLocaleString()} hours</span>. Model where the value lands.
              </p>
            </motion.div>

            {/* Controls Row */}
            <motion.div
              className="flex flex-wrap items-center gap-2 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              {/* Presets */}
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
                      px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-black text-white' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      }
                    `}
                    data-testid={`button-preset-${preset.label.toLowerCase().replace(' ', '-')}`}
                  >
                    {preset.label}
                    {isActive && <Check className="w-3.5 h-3.5 ml-1.5 inline" />}
                  </button>
                );
              })}

              {/* Locums Toggle */}
              <button
                onClick={handleToggleLocums}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${includeLocums 
                    ? 'bg-[#EA2C00] text-white' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                  }
                `}
                data-testid="button-toggle-locums"
              >
                {includeLocums ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {includeLocums ? 'Locums on' : '+ Locums'}
              </button>
            </motion.div>

            {/* Allocation Cards */}
            <div className="space-y-4">
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
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-[#EA2C00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-black">{option.label}</h3>
                            <span className="text-2xl font-bold text-black">{value}%</span>
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

                      {/* Value row */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">{hours.toLocaleString()} hours → Annual Value</p>
                          <p className="text-xl font-bold text-[#F07B5F]">${driverCalc?.value.toLocaleString() || 0}</p>
                        </div>
                        
                        <button
                          onClick={() => toggleExpand(option.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                          data-testid={`button-expand-${option.id}`}
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Hide' : 'See the math'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable math */}
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
                              {driverCalc.editableInputs}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Continue Button - Mobile */}
            <motion.div 
              className="lg:hidden pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Button
                onClick={onNext}
                disabled={totalAllocated !== 100}
                className={`
                  w-full h-12 font-semibold rounded-full transition-all duration-200
                  ${totalAllocated === 100
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

          {/* Time Savings Sidebar */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Time Savings</h3>
                        <p className="text-xs text-white/50">Value summary</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      totalAllocated === 100 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {totalAllocated}%
                    </span>
                  </div>
                </div>

                {/* Big Number */}
                <div className="px-6 py-5 border-b border-white/10">
                  <p className="text-sm text-white/50 mb-1">Annual Value</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#F07B5F]">
                      ${formatNumber(totalTimeValue)}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    From {formatNumber(totalHoursSaved)} hours saved
                  </p>
                </div>

                {/* Breakdown */}
                <div className="px-6 py-5 space-y-3">
                  {visibleOptions.map((option) => {
                    const Icon = option.icon;
                    const value = state.timeAllocation[option.id];
                    const hours = getHoursForCategory(option.id);
                    const driverCalc = calculateDriverValue(option.id);
                    
                    return (
                      <div key={option.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-white/50" />
                          <span className="text-sm text-white/70">{option.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">${formatNumber(driverCalc?.value || 0)}</span>
                          <span className="text-xs text-white/40 ml-1">({value}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Continue Button */}
                <div className="px-6 pb-6">
                  <Button
                    onClick={onNext}
                    disabled={totalAllocated !== 100}
                    className={`
                      w-full h-12 text-sm font-semibold rounded-full transition-all duration-200
                      ${totalAllocated === 100
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
