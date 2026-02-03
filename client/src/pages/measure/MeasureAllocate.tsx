import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, DollarSign, TrendingUp, Heart, Sparkles, Check, ChevronDown, ChevronUp } from "lucide-react";
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
        stepName="What It Means"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === 4 ? "bg-[#E85A2C] scale-125" : step < 4 ? "bg-[#E85A2C]/40" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
            WHERE THE TIME WENT
          </h1>
          <p className="text-base text-[#6B7280]">
            Your providers reclaimed <span className="font-semibold text-black">{formatNumber(Math.round(results.totalHoursSaved))} hours</span>. Here's what that means for your organization.
          </p>
        </motion.div>

        {/* Story Selector */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
            TELL YOUR STORY
          </p>
          <h2 className="text-sm font-semibold text-black mb-5">
            What best describes how your organization experienced this change?
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
                      ? 'bg-white border-l-4 border-l-[#E85A2C] border-t border-r border-b border-[#E5E7EB] shadow-sm' 
                      : 'bg-white border border-[#E5E7EB] hover:border-[#E85A2C]/30'
                    }
                  `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  data-testid={`button-preset-${preset.id}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#E85A2C] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                  
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#FFF5F2]">
                    <Icon className="w-5 h-5 text-[#E85A2C]" />
                  </div>
                  
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-black">
                      {preset.label}
                    </p>
                    <p className="text-xs mt-0.5 text-[#888888]">
                      {preset.subtext}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Impact Summary - shows after selection */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 mb-6"
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] text-center">
                THE IMPACT
              </p>

              {/* Value Cards */}
              <div className="space-y-3">
                {/* Capacity Card */}
                {capacityPercent > 0 && (
                  <motion.div 
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-[#E85A2C]" />
                        </div>
                        <div>
                          <p className="font-semibold text-black text-sm">Capacity</p>
                          <p className="text-xs text-[#6B7280]">
                            {formatNumber(Math.round(results.capacityVisits))} more visits possible
                          </p>
                        </div>
                      </div>
                      <div className="text-right border-l-4 border-[#E85A2C] pl-3">
                        <p className="text-xl font-bold text-[#E85A2C]">{formatCurrency(results.capacityValue)}</p>
                        <p className="text-[10px] text-[#888888] uppercase tracking-[1.5px]">revenue opportunity</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Hard Savings Card */}
                {hardSavingsPercent > 0 && (
                  <motion.div 
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F5F0EB] flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="font-semibold text-black text-sm">Savings</p>
                          <p className="text-xs text-[#6B7280]">
                            {formatNumber(Math.round(results.hardSavingsHours))} hours of overtime avoided
                          </p>
                        </div>
                      </div>
                      <div className="text-right border-l-4 border-black pl-3">
                        <p className="text-xl font-bold text-black">{formatCurrency(results.hardSavingsValue)}</p>
                        <p className="text-[10px] text-[#888888] uppercase tracking-[1.5px]">direct savings</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quality of Life Card */}
                {qualityOfLifePercent > 0 && (
                  <motion.div 
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F5F0EB] flex items-center justify-center">
                          <Heart className="w-5 h-5 text-[#888888]" />
                        </div>
                        <div>
                          <p className="font-semibold text-black text-sm">Wellbeing</p>
                          <p className="text-xs text-[#6B7280]">
                            {results.qualityHoursPerWeek.toFixed(1)} hrs/week back per provider
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-3">
                        <p className="text-sm font-semibold text-[#6B7280]">Retention value</p>
                        <p className="text-xs text-[#888888]">1 kept = $300-500K saved</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Adjust assumptions toggle */}
              <button
                onClick={() => setShowFineTune(!showFineTune)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-[#888888] hover:text-[#6B7280] transition-colors"
                data-testid="button-toggle-fine-tune"
              >
                <span>Adjust assumptions →</span>
                {showFineTune ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showFineTune && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#E85A2C]"></span>
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
                        <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
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
                        <label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#888888]"></span>
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
                      <p className="text-xs font-medium text-center text-[#E85A2C]">
                        Total must equal 100% (currently {totalAllocation}%)
                      </p>
                    )}
                    
                    {/* Calibration settings */}
                    <div className="border-t border-[#E5E7EB] pt-4">
                      <p className="text-xs text-[#888888] mb-3">Value assumptions:</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#888888]">OT Rate ($/hr)</label>
                          <FormattedNumberInput
                            value={state.calibration.otHourlyRate}
                            onChange={(v: number) => updateCalibration('otHourlyRate', v)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#888888]">Min/Visit</label>
                          <FormattedNumberInput
                            value={state.calibration.minutesPerVisit}
                            onChange={(v: number) => updateCalibration('minutesPerVisit', v)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#888888]">$/Visit</label>
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

        {/* Navigation */}
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!isValid}
            className={`
              h-11 px-6 font-semibold rounded-full transition-all duration-200 gap-2
              ${isValid 
                ? 'bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white' 
                : 'bg-[#E5E7EB] text-[#888888] cursor-not-allowed'
              }
            `}
            data-testid="button-see-story"
          >
            {!hasStarted ? 'Select a story to continue' : isValid ? 'See Your Value Story' : `Allocate remaining ${100 - totalAllocation}%`}
            {isValid && <ArrowRight className="w-4 h-4" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
