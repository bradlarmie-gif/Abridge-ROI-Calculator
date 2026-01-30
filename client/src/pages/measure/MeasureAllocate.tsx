import { useMemo, useCallback, useState } from "react";
import { ArrowRight, ArrowLeft, DollarSign, TrendingUp, Sunset, Lightbulb, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatCurrency, 
  formatNumber,
} from "@/lib/measureCalculator";

interface MeasureAllocateProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface AllocationCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  percent: number;
  onPercentChange: (value: number) => void;
  hours: number;
  primaryValue: string;
  secondaryLine?: string;
  extraText?: string;
  sliderColor: string;
  calibrationLabel?: string;
  calibrationValue?: number;
  onCalibrationChange?: (value: number) => void;
}

function AllocationCard({
  icon,
  iconBg,
  title,
  description,
  percent,
  onPercentChange,
  hours,
  primaryValue,
  secondaryLine,
  extraText,
  sliderColor,
  calibrationLabel,
  calibrationValue,
  onCalibrationChange,
}: AllocationCardProps) {
  const [showCalibration, setShowCalibration] = useState(false);
  
  return (
    <motion.div 
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-slate-900">{percent}</span>
          <span className="text-lg text-slate-500">%</span>
        </div>
      </div>
      
      <div className="mb-4 relative">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${sliderColor} rounded-full`}
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(e) => onPercentChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          data-testid={`slider-${title.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
      
      <div className="bg-slate-50 rounded-xl p-4 mb-3">
        <p className="text-lg font-bold text-slate-900">{formatNumber(Math.round(hours))} hours</p>
        <p className="text-sm text-slate-600">{primaryValue}</p>
        {secondaryLine && <p className="text-xs text-slate-500 mt-1">{secondaryLine}</p>}
        {extraText && <p className="text-xs text-slate-500 italic mt-2">{extraText}</p>}
      </div>
      
      {calibrationLabel && onCalibrationChange && (
        <div>
          <button
            onClick={() => setShowCalibration(!showCalibration)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <Settings className="w-3 h-3" />
            {showCalibration ? 'Hide' : 'Adjust'} {calibrationLabel}
          </button>
          {showCalibration && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                value={calibrationValue}
                onChange={(e) => onCalibrationChange(Number(e.target.value))}
                className="w-24 h-8 text-sm"
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function MeasureAllocate({ 
  state, 
  updateState,
  onNext, 
  onBack,
}: MeasureAllocateProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const { hardSavingsPercent, capacityPercent, qualityOfLifePercent } = state.allocation;
  const totalAllocation = hardSavingsPercent + capacityPercent + qualityOfLifePercent;
  const isValid = totalAllocation === 100;

  const adjustSliders = useCallback((key: keyof typeof state.allocation, newValue: number) => {
    const current = { ...state.allocation };
    const oldValue = current[key];
    current[key] = newValue;
    
    const otherKeys = (Object.keys(current) as (keyof typeof state.allocation)[]).filter(k => k !== key);
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
    
    updateState({ allocation: current });
  }, [state.allocation, updateState]);

  const updateCalibration = <K extends keyof typeof state.calibration>(key: K, value: number) => {
    updateState({ calibration: { ...state.calibration, [key]: value } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 transition-colors text-sm flex items-center gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-sm text-slate-500">Step 3 of 4</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2" data-testid="text-allocate-title">
            WHERE DID THE TIME GO?
          </h1>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 md:p-8 mb-6 text-center text-white relative overflow-hidden shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative z-10">
            <motion.p 
              className="text-5xl md:text-6xl font-bold mb-2"
              key={results.totalHoursSaved}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {formatNumber(Math.round(results.totalHoursSaved))}
            </motion.p>
            <p className="text-xl text-indigo-100 font-medium mb-2">hours</p>
            <p className="text-sm text-indigo-200 max-w-sm mx-auto">
              Your providers reclaimed this much documentation time. Where did it land?
            </p>
          </div>
        </motion.div>

        <p className="text-sm text-slate-600 text-center mb-6">
          Help us understand how your organization experienced this time savings.
          <br />
          <span className="text-slate-500">Drag the sliders to allocate.</span>
        </p>

        <div className="space-y-4 mb-6">
          <AllocationCard
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-100"
            title="HARD SAVINGS"
            description="Overtime reduced, locum costs avoided"
            percent={hardSavingsPercent}
            onPercentChange={(v) => adjustSliders('hardSavingsPercent', v)}
            hours={results.hardSavingsHours}
            primaryValue={`≈ ${formatCurrency(results.hardSavingsValue)} at $${state.calibration.otHourlyRate}/hr`}
            sliderColor="bg-gradient-to-r from-emerald-400 to-emerald-500"
            calibrationLabel="rate"
            calibrationValue={state.calibration.otHourlyRate}
            onCalibrationChange={(v) => updateCalibration('otHourlyRate', v)}
          />

          <AllocationCard
            icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
            iconBg="bg-indigo-100"
            title="CAPACITY UNLOCKED"
            description="More patients seen, shorter wait times"
            percent={capacityPercent}
            onPercentChange={(v) => adjustSliders('capacityPercent', v)}
            hours={results.capacityHours}
            primaryValue={`≈ ${formatNumber(Math.round(results.capacityVisits))} additional visits at ${state.calibration.minutesPerVisit} min/visit`}
            secondaryLine={`≈ ${formatCurrency(results.capacityValue)} at $${state.calibration.revenuePerVisit}/visit`}
            sliderColor="bg-gradient-to-r from-indigo-400 to-indigo-500"
            calibrationLabel="visit settings"
            calibrationValue={state.calibration.revenuePerVisit}
            onCalibrationChange={(v) => updateCalibration('revenuePerVisit', v)}
          />

          <AllocationCard
            icon={<Sunset className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-100"
            title="QUALITY OF LIFE"
            description="Providers going home on time, less burnout"
            percent={qualityOfLifePercent}
            onPercentChange={(v) => adjustSliders('qualityOfLifePercent', v)}
            hours={results.qualityHours}
            primaryValue={`≈ ${results.qualityHoursPerWeek.toFixed(1)} hours/week back per provider`}
            extraText="This is retention. This is satisfaction. This is why your providers stay."
            sliderColor="bg-gradient-to-r from-amber-400 to-amber-500"
          />
        </div>

        <motion.div 
          className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Total allocated</span>
            <span className={`text-lg font-bold ${isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
              {totalAllocation}%
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" 
              animate={{ width: `${hardSavingsPercent}%` }}
              transition={{ duration: 0.2 }}
            />
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500" 
              animate={{ width: `${capacityPercent}%` }}
              transition={{ duration: 0.2 }}
            />
            <motion.div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500" 
              animate={{ width: `${qualityOfLifePercent}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          {!isValid && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              Adjust sliders so they sum to 100%
            </p>
          )}
        </motion.div>

        <motion.div 
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Most organizations tell us the majority lands in <strong>Quality of Life</strong>—and that's still real value. It's retention. It's satisfaction. It's providers who stay instead of burning out.
          </p>
        </motion.div>

        <motion.div 
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium border-2"
            data-testid="button-back-bottom"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!isValid}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white h-12 text-base font-semibold shadow-lg disabled:opacity-50"
            data-testid="button-see-story"
          >
            See Your Story
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
