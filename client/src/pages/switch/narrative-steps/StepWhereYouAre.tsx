import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Users, Clock, TrendingUp, Heart, Moon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ABRIDGE_BENCHMARKS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";

interface StepWhereYouAreProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

interface MetricInputProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: number;
  benchmark: number;
  unit: string;
  prefix?: string;
  maxValue: number;
  minValue: number;
  step: number;
  onChange: (value: number) => void;
  testId: string;
}

function MetricInput({ 
  icon, title, description, value, benchmark, unit, prefix = "", 
  maxValue, minValue, step, onChange, testId 
}: MetricInputProps) {
  const percentage = value > 0 ? Math.min(100, Math.round((value / benchmark) * 100)) : 0;
  const isAtBenchmark = percentage >= 100;
  
  const handleInputChange = (inputValue: string) => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      const clampedValue = Math.min(maxValue, Math.max(minValue, num));
      onChange(clampedValue);
    } else if (inputValue === '') {
      onChange(minValue);
    }
  };
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-black">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-3">
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          data-testid={testId}
        />
        <div className="flex items-center gap-1 min-w-[100px] justify-end">
          {prefix && <span className="text-xl font-bold text-black">{prefix}</span>}
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="--"
            min={minValue}
            max={maxValue}
            step={step}
            className="w-14 text-xl font-bold text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 hover:border-slate-300 focus:border-[#EA2C00] focus:outline-none focus:ring-1 focus:ring-[#EA2C00] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-xl font-bold text-black">{unit}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Benchmark: {prefix}{benchmark}{unit}</span>
        {value > 0 && (
          <span className={isAtBenchmark ? 'text-black font-medium' : 'text-[#EA2C00] font-medium'}>
            {isAtBenchmark ? 'At benchmark' : `${percentage}% of benchmark`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function StepWhereYouAre({
  inputs,
  updateInput,
  calculations,
  onNext,
  onBack,
  canProceed,
}: StepWhereYouAreProps) {
  const afterHoursPerWeek = inputs.afterHoursPerWeek || 0;
  
  const hasAnyDimensionValue = 
    inputs.utilization > 0 || 
    inputs.timeSavedPerEncounter > 0 || 
    inputs.wrvuLift > 0 || 
    inputs.satisfaction > 0;

  const realizationScore = useMemo(() => {
    const scores = [];
    if (inputs.utilization > 0) scores.push((inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100);
    if (inputs.timeSavedPerEncounter > 0) scores.push((inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100);
    if (inputs.wrvuLift > 0) scores.push((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100);
    if (inputs.satisfaction > 0) scores.push((inputs.satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [inputs]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Current State</p>
        <h1 className="font-abridge uppercase text-3xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
          Where You Are
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          You did the hard part — got buy-in, trained providers, changed workflows.
          <span className="block text-slate-500 mt-1">Let's see what you're actually getting back.</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Your Organization</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Providers using ambient AI <span className="text-[#EA2C00]">*</span>
              </label>
              <FormattedNumberInput
                value={inputs.providers}
                onChange={(v) => updateInput("providers", v || 0)}
                className={`w-full h-12 px-4 border rounded-xl focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors text-lg ${
                  inputs.providers > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                }`}
                data-testid="input-providers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Annual encounters <span className="text-[#EA2C00]">*</span>
              </label>
              <FormattedNumberInput
                value={inputs.annualEncounters}
                onChange={(v) => updateInput("annualEncounters", v || 0)}
                className={`w-full h-12 px-4 border rounded-xl focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors text-lg ${
                  inputs.annualEncounters > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                }`}
                data-testid="input-encounters"
              />
            </div>
          </div>
        </div>
        
        {hasAnyDimensionValue && (
          <div className="px-6 md:px-8 py-4 bg-[#FFF5F2]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-black">Ambient Assessment Score</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      This score measures how much value you're capturing from your ambient AI investment compared to top-performing organizations. Based on utilization, efficiency, wRVU lift, and satisfaction benchmarks.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, realizationScore)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-[#EA2C00]">{realizationScore}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Performance Metrics</p>
          <h2 className="text-xl font-bold text-black mb-2">What You're Getting</h2>
          <p className="text-sm text-slate-600 mb-6">
            Be honest — this isn't a test. The more accurate you are, the clearer the picture.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricInput
              icon={<Users className="w-5 h-5 text-[#EA2C00]" />}
              title="Utilization"
              description="% of encounters being documented"
              value={inputs.utilization}
              benchmark={ABRIDGE_BENCHMARKS.utilization}
              unit="%"
              maxValue={90}
              minValue={10}
              step={5}
              onChange={(v) => updateInput("utilization", v)}
              testId="slider-utilization"
            />

            <MetricInput
              icon={<Clock className="w-5 h-5 text-[#EA2C00]" />}
              title="Efficiency"
              description="Minutes saved per encounter"
              value={inputs.timeSavedPerEncounter}
              benchmark={ABRIDGE_BENCHMARKS.timeSavedAvg}
              unit=" min"
              maxValue={5}
              minValue={0}
              step={0.5}
              onChange={(v) => updateInput("timeSavedPerEncounter", v)}
              testId="slider-efficiency"
            />

            <MetricInput
              icon={<TrendingUp className="w-5 h-5 text-[#EA2C00]" />}
              title="Quality"
              description="wRVU lift from accurate documentation"
              value={inputs.wrvuLift}
              benchmark={ABRIDGE_BENCHMARKS.wrvuLift}
              unit="%"
              prefix="+"
              maxValue={8}
              minValue={0}
              step={0.5}
              onChange={(v) => updateInput("wrvuLift", v)}
              testId="slider-wrvu"
            />

            <MetricInput
              icon={<Heart className="w-5 h-5 text-[#EA2C00]" />}
              title="Satisfaction"
              description="Would providers recommend this?"
              value={inputs.satisfaction}
              benchmark={ABRIDGE_BENCHMARKS.satisfaction}
              unit="%"
              maxValue={100}
              minValue={20}
              step={5}
              onChange={(v) => updateInput("satisfaction", v)}
              testId="slider-satisfaction"
            />
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-black">After-Hours Documentation</h3>
              <p className="text-sm text-slate-500">Hours per week providers spend charting at home</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={afterHoursPerWeek}
              onChange={(e) => updateInput('afterHoursPerWeek', parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              data-testid="slider-after-hours"
            />
            <div className="flex items-center gap-1 min-w-[100px] justify-end">
              <span className={`text-xl font-bold ${afterHoursPerWeek > 0 ? 'text-black' : 'text-slate-400'}`}>
                {afterHoursPerWeek > 0 ? afterHoursPerWeek : '--'}
              </span>
              <span className="text-sm text-slate-500">hrs/week</span>
            </div>
          </div>
          
          {afterHoursPerWeek > 0 && inputs.providers > 0 && (
            <div className="mt-4 p-4 bg-[#F07B5F] rounded-xl">
              <p className="text-sm text-white">
                That's <span className="font-bold">{(Math.round(afterHoursPerWeek * 52) * inputs.providers).toLocaleString()} hours/year</span> across your {inputs.providers} providers 
                spent charting instead of living their lives.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
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
          disabled={!canProceed}
          className="bg-black hover:bg-black/90 text-white gap-2 rounded-full px-6 disabled:opacity-50"
          data-testid="button-next"
        >
          See What You're Missing
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
