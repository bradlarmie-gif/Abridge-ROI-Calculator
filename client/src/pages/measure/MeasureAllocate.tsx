import { useMemo, useCallback } from "react";
import { ArrowRight, ArrowLeft, DollarSign, TrendingUp, Heart, Lightbulb, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { 
  type MeasureState,
  type TimeAllocation,
  calculateMeasureResults,
  formatCurrency,
  formatNumber,
  MEASURE_CONSTANTS,
} from "@/lib/measureCalculator";

interface MeasureAllocateProps {
  state: MeasureState;
  updateTimeAllocation: (allocation: TimeAllocation) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface AllocationSliderProps {
  icon: React.ReactNode;
  iconBg: string;
  gradient: string;
  borderColor: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  resultText: string;
  subText?: string;
  color: string;
  trackColor: string;
}

function AllocationSlider({ 
  icon, iconBg, gradient, borderColor, label, description, value, onChange, resultText, subText, color, trackColor
}: AllocationSliderProps) {
  return (
    <motion.div 
      className={`bg-gradient-to-br ${gradient} rounded-2xl border ${borderColor} p-5 md:p-6 shadow-sm`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{label}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          <span className="text-lg font-medium text-slate-500">%</span>
        </div>
      </div>
      
      <div className="mb-5 relative">
        <div className="h-3 bg-white/80 rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full ${trackColor} rounded-full transition-all duration-200`}
            style={{ width: `${value}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          data-testid={`slider-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">{resultText}</p>
        {subText && <p className="text-xs text-slate-500 mt-1">{subText}</p>}
      </div>
    </motion.div>
  );
}

export default function MeasureAllocate({ 
  state, 
  updateTimeAllocation, 
  onNext, 
  onBack,
  onHome 
}: MeasureAllocateProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const totalHours = results.timeAllocation.totalHoursSaved;
  
  const { hardSavings, capacityUnlocked, qualityOfLife } = state.timeAllocation;
  const totalAllocation = hardSavings + capacityUnlocked + qualityOfLife;
  const isValid = totalAllocation === 100;

  const adjustSliders = useCallback((key: keyof TimeAllocation, newValue: number) => {
    const current = { ...state.timeAllocation };
    const oldValue = current[key];
    const delta = newValue - oldValue;
    
    current[key] = newValue;
    
    const otherKeys = (Object.keys(current) as (keyof TimeAllocation)[]).filter(k => k !== key);
    const otherTotal = otherKeys.reduce((sum, k) => sum + current[k], 0);
    
    if (otherTotal + newValue !== 100 && otherTotal > 0) {
      const adjustment = 100 - newValue;
      const ratio = adjustment / otherTotal;
      
      otherKeys.forEach(k => {
        current[k] = Math.round(current[k] * ratio);
      });
      
      const newTotal = Object.values(current).reduce((a, b) => a + b, 0);
      if (newTotal !== 100) {
        const diff = 100 - newTotal;
        current[otherKeys[0]] += diff;
      }
    }
    
    updateTimeAllocation(current);
  }, [state.timeAllocation, updateTimeAllocation]);

  const hardSavingsHours = totalHours * (hardSavings / 100);
  const capacityHours = totalHours * (capacityUnlocked / 100);
  const qolHours = totalHours * (qualityOfLife / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-100/20 via-transparent to-transparent pointer-events-none" />
      
      <UnifiedHeader 
        pathType="measure"
        currentStep={4} 
        totalSteps={5}
        stepName="Allocate"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <PageTransition pageKey="measure-allocate">
        <main className="relative z-10 max-w-xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200/50 rounded-full text-sm text-blue-700 shadow-sm mb-4">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">Time Allocation</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight" data-testid="text-allocate-title">
              Where Did the Time Go?
            </h1>
          </motion.div>

          {/* Hero Hours Card */}
          <motion.div 
            className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 mb-8 text-center text-white relative overflow-hidden shadow-xl shadow-blue-500/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative z-10">
              <p className="text-5xl md:text-6xl font-bold mb-2">
                {formatNumber(Math.round(totalHours))}
              </p>
              <p className="text-xl text-blue-100 font-medium">hours reclaimed</p>
              <p className="text-sm text-blue-200 mt-3 max-w-sm mx-auto">
                Your providers got this time back. Help us understand where it landed.
              </p>
            </div>
          </motion.div>

          <div className="space-y-4 mb-6">
            <AllocationSlider
              icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
              iconBg="bg-emerald-100"
              gradient="from-emerald-50 to-teal-50"
              borderColor="border-emerald-200/60"
              label="Hard Savings"
              description="Overtime reduced, locum costs avoided"
              value={hardSavings}
              onChange={(v) => adjustSliders('hardSavings', v)}
              resultText={`${formatNumber(Math.round(hardSavingsHours))} hours → ${formatCurrency(hardSavingsHours * MEASURE_CONSTANTS.OVERTIME_HOURLY_RATE)}`}
              subText={`at $${MEASURE_CONSTANTS.OVERTIME_HOURLY_RATE}/hr blended OT rate`}
              color="#10b981"
              trackColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
            />

            <AllocationSlider
              icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
              iconBg="bg-blue-100"
              gradient="from-blue-50 to-indigo-50"
              borderColor="border-blue-200/60"
              label="Capacity Unlocked"
              description="More patients seen, panels expanded"
              value={capacityUnlocked}
              onChange={(v) => adjustSliders('capacityUnlocked', v)}
              resultText={`${formatNumber(Math.round(capacityHours))} hours → ${formatNumber(Math.round(capacityHours * 60 / MEASURE_CONSTANTS.MINUTES_PER_VISIT))} additional visits`}
              subText={`at ${MEASURE_CONSTANTS.MINUTES_PER_VISIT} min/visit average`}
              color="#3b82f6"
              trackColor="bg-gradient-to-r from-blue-400 to-blue-500"
            />

            <AllocationSlider
              icon={<Heart className="w-6 h-6 text-orange-600" />}
              iconBg="bg-orange-100"
              gradient="from-orange-50 to-amber-50"
              borderColor="border-orange-200/60"
              label="Quality of Life"
              description="Providers going home on time, less burnout"
              value={qualityOfLife}
              onChange={(v) => adjustSliders('qualityOfLife', v)}
              resultText={`${formatNumber(Math.round(qolHours))} hours returned to your providers`}
              subText={state.deployment.providers > 0 
                ? `That's ${(qolHours / state.deployment.providers / MEASURE_CONSTANTS.WEEKS_PER_YEAR).toFixed(1)} hours/week per provider`
                : undefined}
              color="#f97316"
              trackColor="bg-gradient-to-r from-orange-400 to-orange-500"
            />
          </div>

          {/* Total Progress Bar */}
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 mb-6 shadow-lg shadow-slate-200/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">Total allocated</span>
              <span className={`text-lg font-bold ${isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalAllocation}%
              </span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" 
                style={{ width: `${hardSavings}%` }} 
              />
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all" 
                style={{ width: `${capacityUnlocked}%` }} 
              />
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all" 
                style={{ width: `${qualityOfLife}%` }} 
              />
            </div>
            {!isValid && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Adjust sliders so they sum to 100%
              </p>
            )}
          </motion.div>

          {/* Tip Card */}
          <motion.div 
            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">
                Most organizations tell us the majority lands in <span className="font-semibold">Quality of Life</span> — and that's still real value. It's retention. It's satisfaction. It's providers who stay.
              </p>
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium border-2 hover:bg-slate-50"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={onNext}
              disabled={!isValid}
              className="flex-1 bg-gradient-to-r from-[#EA2C00] to-[#d12700] hover:from-[#d12700] hover:to-[#b82300] text-white h-12 text-base font-semibold shadow-lg shadow-[#EA2C00]/20 disabled:opacity-50 disabled:shadow-none"
              data-testid="button-see-story"
            >
              See Your Story
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </main>
      </PageTransition>
    </div>
  );
}
