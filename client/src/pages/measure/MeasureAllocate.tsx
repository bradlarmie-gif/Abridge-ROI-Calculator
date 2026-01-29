import { useMemo, useCallback } from "react";
import { ArrowRight, ArrowLeft, DollarSign, TrendingUp, Heart, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
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
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  resultText: string;
  subText?: string;
  color: string;
}

function AllocationSlider({ 
  icon, iconBg, label, description, value, onChange, resultText, subText, color 
}: AllocationSliderProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-[#111827]">{label}</h3>
            <p className="text-sm text-[#6B7280]">{description}</p>
          </div>
        </div>
        <span className="text-2xl font-bold text-[#111827]">{value}%</span>
      </div>
      
      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full"
          style={{
            accentColor: color,
          }}
          data-testid={`slider-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
      
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-sm font-medium text-[#111827]">{resultText}</p>
        {subText && <p className="text-xs text-[#6B7280] mt-0.5">{subText}</p>}
      </div>
    </div>
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
    <div className="min-h-screen bg-[#f8fafc]">
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
        <main className="max-w-xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-allocate-title">
              Where Did the Time Go?
            </h1>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 text-center">
            <p className="text-4xl md:text-5xl font-bold text-blue-900 mb-2">
              {formatNumber(Math.round(totalHours))} hours
            </p>
            <p className="text-base text-blue-700">
              Your providers reclaimed this much documentation time.
              <br className="hidden md:block" />
              Where did it land?
            </p>
          </div>

          <p className="text-center text-[#6B7280] mb-6">
            Help us understand how your organization experienced this time savings. Drag the sliders to allocate.
          </p>

          <div className="space-y-4 mb-6">
            <AllocationSlider
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="Hard Savings"
              description="Overtime reduced, locum costs avoided"
              value={hardSavings}
              onChange={(v) => adjustSliders('hardSavings', v)}
              resultText={`${formatNumber(Math.round(hardSavingsHours))} hours → ${formatCurrency(hardSavingsHours * MEASURE_CONSTANTS.OVERTIME_HOURLY_RATE)}`}
              subText={`at $${MEASURE_CONSTANTS.OVERTIME_HOURLY_RATE}/hr blended OT rate`}
              color="#10b981"
            />

            <AllocationSlider
              icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Capacity Unlocked"
              description="More patients seen, panels expanded"
              value={capacityUnlocked}
              onChange={(v) => adjustSliders('capacityUnlocked', v)}
              resultText={`${formatNumber(Math.round(capacityHours))} hours → ${formatNumber(Math.round(capacityHours * 60 / MEASURE_CONSTANTS.MINUTES_PER_VISIT))} additional visits`}
              subText={`at ${MEASURE_CONSTANTS.MINUTES_PER_VISIT} min/visit average`}
              color="#3b82f6"
            />

            <AllocationSlider
              icon={<Heart className="w-5 h-5 text-orange-600" />}
              iconBg="bg-orange-100"
              label="Quality of Life"
              description="Providers going home on time, less burnout"
              value={qualityOfLife}
              onChange={(v) => adjustSliders('qualityOfLife', v)}
              resultText={`${formatNumber(Math.round(qolHours))} hours returned to your providers`}
              subText={state.deployment.providers > 0 
                ? `That's ${(qolHours / state.deployment.providers / MEASURE_CONSTANTS.WEEKS_PER_YEAR).toFixed(1)} hours/week per provider`
                : undefined}
              color="#f97316"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#374151]">Total allocated</span>
              <span className={`text-sm font-bold ${isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalAllocation}%
              </span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500 transition-all" 
                style={{ width: `${hardSavings}%` }} 
              />
              <div 
                className="h-full bg-blue-500 transition-all" 
                style={{ width: `${capacityUnlocked}%` }} 
              />
              <div 
                className="h-full bg-orange-500 transition-all" 
                style={{ width: `${qualityOfLife}%` }} 
              />
            </div>
            {!isValid && (
              <p className="text-xs text-amber-600 mt-2">
                Adjust sliders so they sum to 100%
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Most organizations tell us the majority lands in Quality of Life — and that's still real value. It's retention. It's satisfaction. It's providers who stay.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={onNext}
              disabled={!isValid}
              className="flex-1 bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 text-base font-semibold disabled:opacity-50"
              data-testid="button-see-story"
            >
              See Your Story
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
