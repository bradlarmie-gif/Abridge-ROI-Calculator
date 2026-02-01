import { useMemo, useState } from "react";
import { ArrowRight, DollarSign, TrendingUp, Sunset, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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
}

interface AllocationPreset {
  id: string;
  label: string;
  subtext: string;
  hardSavings: number;
  capacity: number;
  qualityOfLife: number;
  icon: React.ReactNode;
  gradient: string;
}

const PRESETS: AllocationPreset[] = [
  {
    id: 'efficiency',
    label: 'We saw more patients',
    subtext: 'Capacity was the big win',
    hardSavings: 15,
    capacity: 60,
    qualityOfLife: 25,
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-[#EA2C00] to-[#F07B5F]',
  },
  {
    id: 'savings',
    label: 'We cut real costs',
    subtext: 'Overtime and locums down',
    hardSavings: 55,
    capacity: 20,
    qualityOfLife: 25,
    icon: <DollarSign className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-emerald-400',
  },
  {
    id: 'wellbeing',
    label: 'Our people got their lives back',
    subtext: 'This is why they stay',
    hardSavings: 10,
    capacity: 20,
    qualityOfLife: 70,
    icon: <Sunset className="w-5 h-5" />,
    gradient: 'from-amber-500 to-amber-400',
  },
  {
    id: 'balanced',
    label: 'A bit of everything',
    subtext: 'Balanced across all three',
    hardSavings: 33,
    capacity: 34,
    qualityOfLife: 33,
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-violet-500 to-purple-400',
  },
];

export default function MeasureAllocate({ 
  state, 
  updateState,
  onNext, 
  onBack,
}: MeasureAllocateProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const { hardSavingsPercent, capacityPercent, qualityOfLifePercent } = state.allocation;
  const totalAllocation = hardSavingsPercent + capacityPercent + qualityOfLifePercent;
  const remaining = 100 - totalAllocation;
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
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={4}
        stepName="The Impact"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-xl mx-auto px-4 md:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" data-testid="text-allocate-title">
            WHERE DID THE TIME GO?
          </h1>
          <p className="text-slate-600">
            Your providers reclaimed precious hours.
            <br />
            <span className="text-slate-500">Help us understand where that time landed.</span>
          </p>
        </motion.div>

        {/* The Time Pool */}
        <motion.div 
          className="bg-white rounded-2xl border-2 border-slate-200 p-6 mb-8 text-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-4xl md:text-5xl font-bold text-slate-900">
                {formatNumber(Math.round(results.totalHoursSaved))}
              </p>
              <p className="text-sm text-slate-500 font-medium">hours saved</p>
            </div>
            
            <div className="text-3xl text-slate-300 font-light">/</div>
            
            <div>
              <motion.p 
                className={`text-4xl md:text-5xl font-bold ${remaining === 0 ? 'text-emerald-600' : remaining < 0 ? 'text-red-500' : 'text-amber-500'}`}
                key={remaining}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
              >
                {remaining}%
              </motion.p>
              <p className="text-sm text-slate-500 font-medium">
                {remaining === 0 ? 'fully allocated' : remaining < 0 ? 'over-allocated' : 'remaining'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Preset Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <p className="text-sm font-medium text-slate-700 mb-3 text-center">
            {hasStarted ? 'Selected pattern:' : 'What best describes your experience?'}
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset, index) => (
              <motion.button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  selectedPreset === preset.id 
                    ? 'border-[#EA2C00] bg-[#EA2C00]/5 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                data-testid={`button-preset-${preset.id}`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.gradient} flex items-center justify-center text-white mb-2`}>
                  {preset.icon}
                </div>
                <p className="font-semibold text-slate-900 text-sm leading-tight">{preset.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{preset.subtext}</p>
                
                {selectedPreset === preset.id && (
                  <motion.div 
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EA2C00]"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Gentle Framing */}
        <AnimatePresence>
          {hasStarted && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-slate-500 text-center mb-4 italic"
            >
              Here's what that choice means for your organization:
            </motion.p>
          )}
        </AnimatePresence>

        {/* Visual Allocation Breakdown - The Math */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 space-y-3"
            >
              {/* Hard Savings Card */}
              {hardSavingsPercent > 0 && (
                <motion.div 
                  className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">Hard Savings</h3>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{hardSavingsPercent}%</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-semibold">{formatNumber(Math.round(results.hardSavingsHours))} hours</span> of overtime avoided or locum costs eliminated
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {formatNumber(Math.round(results.hardSavingsHours))}h × ${state.calibration.otHourlyRate}/hr
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(results.hardSavingsValue)}</p>
                      <p className="text-xs text-slate-500">direct savings</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Capacity Card */}
              {capacityPercent > 0 && (
                <motion.div 
                  className="bg-white rounded-xl border border-[#EA2C00]/30 p-4 shadow-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#EA2C00]/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">Capacity Unlocked</h3>
                          <span className="text-xs font-semibold text-[#EA2C00] bg-[#EA2C00]/10 px-2 py-0.5 rounded-full">{capacityPercent}%</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-semibold">{formatNumber(Math.round(results.capacityVisits))} additional visits</span> your providers can now see
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {formatNumber(Math.round(results.capacityHours))}h ÷ {state.calibration.minutesPerVisit}min × ${state.calibration.revenuePerVisit}/visit
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(results.capacityValue)}</p>
                      <p className="text-xs text-slate-500">revenue opportunity</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quality of Life Card */}
              {qualityOfLifePercent > 0 && (
                <motion.div 
                  className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Sunset className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">Quality of Life</h3>
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{qualityOfLifePercent}%</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-semibold">{results.qualityHoursPerWeek.toFixed(1)} hours/week</span> back per provider
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          That's {formatNumber(Math.round(results.qualityHours))} hours total going back to your people
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">Retention</p>
                      <p className="text-xs text-slate-500 max-w-[120px]">If this prevents 1 departure: $300-500K saved</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Stacked summary bar */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="h-4 bg-slate-200 rounded-full overflow-hidden flex">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" 
                    animate={{ width: `${hardSavingsPercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#EA2C00] to-[#F07B5F]" 
                    animate={{ width: `${capacityPercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                  <motion.div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400" 
                    animate={{ width: `${qualityOfLifePercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fine-tune Section */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <button
                onClick={() => setShowFineTune(!showFineTune)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                data-testid="button-toggle-fine-tune"
              >
                <span>{showFineTune ? 'Hide' : 'Fine-tune'} exact percentages</span>
                {showFineTune ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showFineTune && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-xl border border-slate-200 p-4 space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Hard Savings %
                        </label>
                        <FormattedNumberInput
                          value={hardSavingsPercent}
                          onChange={(v: number) => updateAllocation('hardSavingsPercent', v)}
                          className="h-10 text-center font-semibold"
                          data-testid="input-hard-savings"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#EA2C00] flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
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
                        <label className="text-xs font-medium text-amber-700 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Quality of Life %
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
                      <p className={`text-xs font-medium text-center ${remaining < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                        {remaining < 0 ? `Over by ${Math.abs(remaining)}%` : `${remaining}% remaining to allocate`}
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

        {/* Insight callout - only when Quality of Life is dominant */}
        <AnimatePresence>
          {hasStarted && qualityOfLifePercent >= 50 && (
            <motion.div 
              className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-amber-900">
                <span className="font-semibold">This is the story most organizations tell us.</span> The biggest impact isn't always in the spreadsheet—it's in providers going home on time, staying in the profession, and showing up energized for patients.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state prompt */}
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-8"
          >
            <p className="text-slate-400 text-sm">
              Select a pattern above to begin
            </p>
          </motion.div>
        )}

        {/* Continue Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onNext}
            disabled={!isValid}
            className="w-full bg-[#EA2C00] hover:bg-[#d42800] text-white h-12 text-base font-semibold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-see-story"
          >
            {!hasStarted ? 'Select a pattern to continue' : isValid ? 'See Your Story' : `Allocate remaining ${remaining}%`}
            {isValid && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
