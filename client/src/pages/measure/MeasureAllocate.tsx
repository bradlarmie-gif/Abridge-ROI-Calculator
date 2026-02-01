import { useMemo, useState } from "react";
import { ArrowRight, DollarSign, TrendingUp, Heart, Sparkles, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatCurrency, 
  formatNumber,
} from "@/lib/measureCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface MeasureAllocateProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface AllocationPreset {
  id: string;
  label: string;
  subtext: string;
  hardSavings: number;
  capacity: number;
  qualityOfLife: number;
  icon: typeof TrendingUp;
}

const PRESETS: AllocationPreset[] = [
  {
    id: 'efficiency',
    label: 'We saw more patients',
    subtext: 'Capacity was the big win',
    hardSavings: 15,
    capacity: 60,
    qualityOfLife: 25,
    icon: TrendingUp,
  },
  {
    id: 'savings',
    label: 'We cut real costs',
    subtext: 'Overtime and locums down',
    hardSavings: 55,
    capacity: 20,
    qualityOfLife: 25,
    icon: DollarSign,
  },
  {
    id: 'wellbeing',
    label: 'Our people got their lives back',
    subtext: 'This is why they stay',
    hardSavings: 10,
    capacity: 20,
    qualityOfLife: 70,
    icon: Heart,
  },
  {
    id: 'balanced',
    label: 'A bit of everything',
    subtext: 'Balanced across all three',
    hardSavings: 33,
    capacity: 34,
    qualityOfLife: 33,
    icon: Sparkles,
  },
];

export default function MeasureAllocate({ 
  state, 
  updateState,
  onNext,
  onHome, 
  onBack,
}: MeasureAllocateProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const { hardSavingsPercent, capacityPercent, qualityOfLifePercent } = state.allocation;
  const totalAllocation = hardSavingsPercent + capacityPercent + qualityOfLifePercent;
  const isValid = totalAllocation === 100;
  const hasStarted = totalAllocation > 0;
  
  const [showFineTune, setShowFineTune] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const applyPreset = (preset: AllocationPreset) => {
    setSelectedPreset(preset.id);
    updateState({
      allocation: {
        hardSavingsPercent: preset.hardSavings,
        capacityPercent: preset.capacity,
        qualityOfLifePercent: preset.qualityOfLife,
      }
    });
  };

  const updateAllocation = (key: keyof typeof state.allocation, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setSelectedPreset(null);
    updateState({
      allocation: {
        ...state.allocation,
        [key]: clamped,
      }
    });
  };

  const updateCalibration = <K extends keyof typeof state.calibration>(key: K, value: number) => {
    updateState({ calibration: { ...state.calibration, [key]: value } });
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={5}
        stepName="The Impact"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
            Understanding Impact
          </p>

          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3">
            Where Did the Time Go?
          </h1>

          <p className="text-slate-600">
            Your providers reclaimed <span className="font-semibold text-black">{formatNumber(Math.round(results.totalHoursSaved))} hours</span>. What happened with it?
          </p>
        </motion.div>

        {/* Preset Selection Card */}
        <motion.div
          className="bg-white rounded-2xl border border-slate-200 p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Select Your Story
          </p>
          <h2 className="text-base font-bold text-black mb-5">
            What best describes your experience?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESETS.map((preset, index) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.id;
              
              return (
                <motion.button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`
                    relative flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200
                    ${isSelected 
                      ? 'bg-black text-white' 
                      : 'bg-white border border-slate-200 hover:border-slate-300'
                    }
                  `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  data-testid={`button-preset-${preset.id}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#EA2C00] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                  
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-white/10' : 'bg-[#FFF5F2]'}
                  `}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#EA2C00]'}`} />
                  </div>
                  
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-black'}`}>
                      {preset.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                      {preset.subtext}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Results Breakdown - shows after selection */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 mb-6"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">
                Here's What That Means
              </p>

              {/* Stacked allocation bar */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex mb-3">
                  <motion.div 
                    className="h-full bg-[#EA2C00]" 
                    animate={{ width: `${capacityPercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                  <motion.div 
                    className="h-full bg-black" 
                    animate={{ width: `${hardSavingsPercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                  <motion.div 
                    className="h-full bg-slate-400" 
                    animate={{ width: `${qualityOfLifePercent}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex items-center justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]"></span>
                    <span className="text-slate-600">Capacity {capacityPercent}%</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <span className="text-slate-600">Savings {hardSavingsPercent}%</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span className="text-slate-600">Wellbeing {qualityOfLifePercent}%</span>
                  </span>
                </div>
              </div>

              {/* Value Cards */}
              <div className="grid gap-3">
                {/* Capacity Card */}
                {capacityPercent > 0 && (
                  <motion.div 
                    className="bg-[#FFF5F2] rounded-xl p-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#EA2C00] flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-black">Additional Capacity</p>
                          <p className="text-sm text-slate-600">
                            {formatNumber(Math.round(results.capacityVisits))} more visits possible
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(results.capacityValue)}</p>
                        <p className="text-xs text-slate-500">revenue opportunity</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Hard Savings Card */}
                {hardSavingsPercent > 0 && (
                  <motion.div 
                    className="bg-slate-100 rounded-xl p-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-black">Hard Savings</p>
                          <p className="text-sm text-slate-600">
                            {formatNumber(Math.round(results.hardSavingsHours))} hours of overtime avoided
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-black">{formatCurrency(results.hardSavingsValue)}</p>
                        <p className="text-xs text-slate-500">direct savings</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quality of Life Card */}
                {qualityOfLifePercent > 0 && (
                  <motion.div 
                    className="bg-white border border-slate-200 rounded-xl p-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-black">Quality of Life</p>
                          <p className="text-sm text-slate-600">
                            {results.qualityHoursPerWeek.toFixed(1)} hrs/week back per provider
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-600">Retention Value</p>
                        <p className="text-xs text-slate-500">1 kept = $300-500K saved</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Fine-tune toggle */}
              <button
                onClick={() => setShowFineTune(!showFineTune)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="button-toggle-fine-tune"
              >
                <span>{showFineTune ? 'Hide' : 'Fine-tune'} percentages</span>
                {showFineTune ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showFineTune && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#EA2C00]"></span>
                          Capacity %
                        </label>
                        <FormattedNumberInput
                          value={capacityPercent}
                          onChange={(v: number) => updateAllocation('capacityPercent', v)}
                          className="h-10 text-center font-semibold"
                          data-testid="input-capacity"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-black"></span>
                          Savings %
                        </label>
                        <FormattedNumberInput
                          value={hardSavingsPercent}
                          onChange={(v: number) => updateAllocation('hardSavingsPercent', v)}
                          className="h-10 text-center font-semibold"
                          data-testid="input-hard-savings"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          Wellbeing %
                        </label>
                        <FormattedNumberInput
                          value={qualityOfLifePercent}
                          onChange={(v: number) => updateAllocation('qualityOfLifePercent', v)}
                          className="h-10 text-center font-semibold"
                          data-testid="input-quality-of-life"
                        />
                      </div>
                    </div>
                    
                    {!isValid && (
                      <p className="text-xs font-medium text-center text-[#EA2C00]">
                        Total must equal 100% (currently {totalAllocation}%)
                      </p>
                    )}
                    
                    {/* Calibration settings */}
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-500 mb-3">Value assumptions:</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">OT Rate ($/hr)</label>
                          <FormattedNumberInput
                            value={state.calibration.otHourlyRate}
                            onChange={(v: number) => updateCalibration('otHourlyRate', v)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Min/Visit</label>
                          <FormattedNumberInput
                            value={state.calibration.minutesPerVisit}
                            onChange={(v: number) => updateCalibration('minutesPerVisit', v)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">$/Visit</label>
                          <FormattedNumberInput
                            value={state.calibration.revenuePerVisit}
                            onChange={(v: number) => updateCalibration('revenuePerVisit', v)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
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
            data-testid="button-see-story"
          >
            {!hasStarted ? 'Select a story to continue' : isValid ? 'See Your Value Story' : `Allocate remaining ${100 - totalAllocation}%`}
            {isValid && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
