import { ArrowRight, Users, Clock, Heart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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
  },
  {
    id: 'clinicianWellbeing',
    label: 'Clinician Wellbeing',
    description: 'Improve retention and reduce burnout',
    icon: Heart,
    valueLabel: 'Retention improvement',
  },
];

const PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 40, reducingLocums: 30, clinicianWellbeing: 30 } },
  { label: 'Growth Focus', allocation: { patientAccess: 60, reducingLocums: 20, clinicianWellbeing: 20 } },
  { label: 'Cost Focus', allocation: { patientAccess: 20, reducingLocums: 50, clinicianWellbeing: 30 } },
  { label: 'Retention Focus', allocation: { patientAccess: 25, reducingLocums: 25, clinicianWellbeing: 50 } },
];

export default function ExploreTimeAllocation({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreTimeAllocationProps) {
  
  const handleSliderChange = (id: keyof TimeAllocation, newValue: number) => {
    const current = { ...state.timeAllocation };
    const oldValue = current[id];
    const diff = newValue - oldValue;
    
    const otherKeys = (Object.keys(current) as (keyof TimeAllocation)[]).filter(k => k !== id);
    const otherTotal = otherKeys.reduce((sum, k) => sum + current[k], 0);
    
    if (otherTotal > 0) {
      otherKeys.forEach(k => {
        const ratio = current[k] / otherTotal;
        current[k] = Math.max(0, Math.round(current[k] - diff * ratio));
      });
    }
    
    current[id] = newValue;
    
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      const adjustment = 100 - total;
      const adjustKey = otherKeys.find(k => current[k] > 0) || otherKeys[0];
      current[adjustKey] = Math.max(0, current[adjustKey] + adjustment);
    }
    
    updateState({ timeAllocation: current });
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    updateState({ timeAllocation: preset.allocation });
  };

  const getHoursForCategory = (id: keyof TimeAllocation) => {
    return Math.round(totalHoursSaved * (state.timeAllocation[id] / 100));
  };

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

        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {PRESETS.map((preset) => {
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
          {ALLOCATION_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const value = state.timeAllocation[option.id];
            const hours = getHoursForCategory(option.id);
            
            return (
              <motion.div
                key={option.id}
                className="bg-white rounded-2xl border border-slate-200 p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05, duration: 0.4 }}
              >
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

                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-slate-400">{option.valueLabel}</span>
                  <span className="font-semibold text-[#EA2C00]">{hours.toLocaleString()} hours</span>
                </div>
              </motion.div>
            );
          })}
        </div>

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
              <span className="text-4xl font-bold text-[#F07B5F]">100%</span>
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
            className="h-12 px-8 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
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
