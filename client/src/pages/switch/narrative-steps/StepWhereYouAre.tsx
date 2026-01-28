import { useMemo } from "react";
import { ArrowRight, ArrowLeft, BarChart3, Clock, DollarSign, Smile, Moon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
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

interface DimensionSliderProps {
  icon: React.ReactNode;
  iconBg: string;
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

function DimensionSlider({ 
  icon, iconBg, title, description, value, benchmark, unit, prefix = "", 
  maxValue, minValue, step, onChange, testId 
}: DimensionSliderProps) {
  const percentage = Math.min(100, Math.round((value / benchmark) * 100));
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#111827] text-sm">{title}</h3>
          <p className="text-xs text-[#6B7280]">{description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-bold ${value > 0 ? 'text-[#111827]' : 'text-slate-400'}`}>
            {value > 0 ? `${prefix}${value}${unit}` : '--'}
          </div>
          <div className="text-xs text-[#6B7280]">
            Benchmark: {prefix}{benchmark}{unit}
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
          data-testid={testId}
        />
        {value > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className={percentage >= 80 ? 'text-emerald-600 font-medium' : 'text-slate-500'}>
              {percentage}% of benchmark
            </span>
            {percentage < 80 && (
              <span className="text-amber-600">
                Room for improvement
              </span>
            )}
          </div>
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
  onNavigateToExplore,
}: StepWhereYouAreProps) {
  const afterHoursPerWeek = inputs.afterHoursPerWeek || 0;
  
  const hasAnyDimensionValue = 
    inputs.utilization > 0 || 
    inputs.timeSavedPerEncounter > 0 || 
    inputs.wrvuLift > 0 || 
    inputs.satisfaction > 0;

  const realizationData = useMemo(() => {
    const scores = [];
    if (inputs.utilization > 0) scores.push((inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100);
    if (inputs.timeSavedPerEncounter > 0) scores.push((inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100);
    if (inputs.wrvuLift > 0) scores.push((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100);
    if (inputs.satisfaction > 0) scores.push((inputs.satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100);
    
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const filledDimensions = scores.length;
    
    const maturity = avgScore >= 80 ? { label: "Optimized", color: "text-emerald-600", bg: "bg-emerald-500" }
      : avgScore >= 60 ? { label: "Developing", color: "text-amber-600", bg: "bg-amber-500" }
      : avgScore >= 40 ? { label: "Early Stage", color: "text-orange-600", bg: "bg-orange-500" }
      : { label: "Emerging", color: "text-slate-500", bg: "bg-slate-400" };
    
    return { avgScore, filledDimensions, maturity };
  }, [inputs]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          Where You Are Today
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          You did the hard part — got buy-in, trained providers, changed workflows. 
          <br className="hidden md:block" />
          Let's see what you're actually getting back.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
        <h2 className="text-lg font-bold text-[#111827] mb-4">Your Organization</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Providers using ambient AI <span className="text-[#EA2C00]">*</span>
            </label>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              placeholder="e.g. 75"
              className={`w-full h-11 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors ${
                inputs.providers > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
              }`}
              data-testid="input-providers"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">
              Annual encounters <span className="text-[#EA2C00]">*</span>
            </label>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => updateInput("annualEncounters", v || 0)}
              placeholder="e.g. 150,000"
              className={`w-full h-11 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors ${
                inputs.annualEncounters > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
              }`}
              data-testid="input-encounters"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#111827] mb-2">What You're Getting</h2>
            <p className="text-sm text-[#6B7280] mb-6">
              Be honest — this isn't a test. The more accurate you are, the clearer the picture.
            </p>

            {!hasAnyDimensionValue && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  Move the sliders to reflect your current experience. Don't know exactly? 
                  <span className="font-medium"> Estimates work.</span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DimensionSlider
                icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
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

              <DimensionSlider
                icon={<Clock className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
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

              <DimensionSlider
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-100"
                title="Quality"
                description="wRVU lift from more accurate documentation capture"
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

              <DimensionSlider
                icon={<Smile className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
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

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#111827] text-sm">After-Hours Documentation</h3>
                  <p className="text-xs text-[#6B7280]">How many hours per week are providers still charting at home?</p>
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
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  data-testid="slider-after-hours"
                />
                <div className="flex items-center gap-1 min-w-[80px]">
                  <span className={`text-lg font-semibold ${afterHoursPerWeek > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {afterHoursPerWeek > 0 ? afterHoursPerWeek : '--'}
                  </span>
                  <span className="text-xs text-[#6B7280]">hrs/week</span>
                </div>
              </div>
              {afterHoursPerWeek > 0 && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-sm text-indigo-800">
                    That's <span className="font-semibold">{Math.round(afterHoursPerWeek * 52)} hours/year</span> per provider 
                    spent charting instead of living their lives.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-64 mt-6 lg:mt-0" data-testid="realization-indicator">
            <div className="lg:sticky lg:top-24">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Value Realization</span>
                </div>
                
                <div className="text-center mb-4">
                  <div className={`text-4xl font-bold mb-1 transition-all duration-300 ${
                    realizationData.avgScore > 0 ? 'text-white' : 'text-slate-500'
                  }`}>
                    {realizationData.avgScore > 0 ? `${realizationData.avgScore}%` : '--'}
                  </div>
                  <div className={`text-sm font-medium ${realizationData.maturity.color}`}>
                    {realizationData.avgScore > 0 ? realizationData.maturity.label : 'Awaiting data'}
                  </div>
                </div>

                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full ${realizationData.maturity.bg} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, realizationData.avgScore)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>100%</span>
                </div>

                {realizationData.filledDimensions > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-slate-400">
                      Based on {realizationData.filledDimensions} of 4 dimensions
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

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
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
          data-testid="button-next"
        >
          See What You're Missing
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
