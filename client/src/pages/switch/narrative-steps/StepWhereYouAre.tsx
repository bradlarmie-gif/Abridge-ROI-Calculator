import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Users, Clock, TrendingUp, Heart, Moon } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-black text-sm">{title}</h3>
          <p className="text-xs text-[#888888]">{description}</p>
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
          className="flex-1 h-2 bg-[#F5F0EB] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          data-testid={testId}
        />
        <div className="flex items-center gap-1 min-w-[90px] justify-end">
          {prefix && <span className="text-lg font-bold text-black">{prefix}</span>}
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="--"
            min={minValue}
            max={maxValue}
            step={step}
            className="w-12 text-lg font-bold text-center bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 focus:border-[#E85A2C] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-sm text-[#888888]">{unit}</span>
        </div>
      </div>
      
      <div className="text-xs text-[#888888]">
        Benchmark: {prefix}{benchmark}{unit}
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2" data-testid="text-page-title">
          Where You Are
        </h1>
        <p className="text-base text-[#6B7280]">
          You did the hard part. Let's see what you're getting back.
        </p>
      </div>

      {/* Organization Inputs */}
      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
          Your Organization
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
            <label className="block text-xs text-[#888888] mb-2">
              Providers using ambient AI
            </label>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              className="w-full text-right text-lg font-semibold text-black bg-transparent border-none focus:outline-none focus:ring-0"
              data-testid="input-providers"
            />
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
            <label className="block text-xs text-[#888888] mb-2">
              Annual encounters
            </label>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => updateInput("annualEncounters", v || 0)}
              className="w-full text-right text-lg font-semibold text-black bg-transparent border-none focus:outline-none focus:ring-0"
              data-testid="input-encounters"
            />
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          Your Current Performance
        </p>
        <p className="text-sm text-[#6B7280] mb-6">
          The more accurate you are, the clearer the picture.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricInput
            icon={<Users className="w-5 h-5 text-[#E85A2C]" />}
            title="Utilization"
            description="% of encounters documented"
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
            icon={<Clock className="w-5 h-5 text-[#E85A2C]" />}
            title="Time Saved"
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
            icon={<TrendingUp className="w-5 h-5 text-[#E85A2C]" />}
            title="Quality"
            description="wRVU lift from documentation"
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
            icon={<Heart className="w-5 h-5 text-[#E85A2C]" />}
            title="Satisfaction"
            description="Would providers recommend?"
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
      </section>

      {/* After-Hours Section */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#F5F0EB] flex items-center justify-center">
            <Moon className="w-5 h-5 text-[#888888]" />
          </div>
          <div>
            <p className="font-semibold text-black text-sm">After-Hours Documentation</p>
            <p className="text-xs text-[#888888]">Hours per week charting at home</p>
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
            className="flex-1 h-2 bg-[#F5F0EB] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            data-testid="slider-after-hours"
          />
          <div className="flex items-center gap-1 min-w-[90px] justify-end">
            <span className={`text-lg font-bold ${afterHoursPerWeek > 0 ? 'text-black' : 'text-[#888888]'}`}>
              {afterHoursPerWeek > 0 ? afterHoursPerWeek : '--'}
            </span>
            <span className="text-sm text-[#888888]">hrs/week</span>
          </div>
        </div>
        
        {afterHoursPerWeek > 0 && inputs.providers > 0 && (
          <p className="text-sm text-[#6B7280] mt-4">
            That's <span className="font-semibold text-black">{(Math.round(afterHoursPerWeek * 52) * inputs.providers).toLocaleString()} hours/year</span> across your providers.
          </p>
        )}
      </section>

      {/* Navigation */}
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
          className="bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white gap-2 rounded-full px-6 h-11 disabled:opacity-50"
          data-testid="button-next"
        >
          See the Gap
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
