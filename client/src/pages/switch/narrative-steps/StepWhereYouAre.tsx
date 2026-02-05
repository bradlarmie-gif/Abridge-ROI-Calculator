import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Users, Clock, TrendingUp, Heart, Moon, AlertTriangle } from "lucide-react";
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

type SeverityLevel = 'critical' | 'warning' | 'good';

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
  invertComparison?: boolean;
}

function getSeverityLevel(value: number, benchmark: number, invertComparison = false): SeverityLevel {
  const ratio = invertComparison ? benchmark / value : value / benchmark;
  if (ratio >= 0.75) return 'good';
  if (ratio >= 0.50) return 'warning';
  return 'critical';
}

function getSeverityStyles(severity: SeverityLevel) {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-red-400',
        bg: 'bg-red-50',
        accent: 'bg-red-500',
        text: 'text-red-600',
      };
    case 'warning':
      return {
        border: 'border-orange-400',
        bg: 'bg-orange-50',
        accent: 'bg-orange-500',
        text: 'text-orange-600',
      };
    case 'good':
      return {
        border: 'border-green-400',
        bg: 'bg-green-50',
        accent: 'bg-green-500',
        text: 'text-green-600',
      };
  }
}

function MetricInput({ 
  icon, title, description, value, benchmark, unit, prefix = "", 
  maxValue, minValue, step, onChange, testId, invertComparison = false
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
  
  const severity = getSeverityLevel(value, benchmark, invertComparison);
  const styles = getSeverityStyles(severity);
  const ratio = invertComparison ? benchmark / value : value / benchmark;
  const percentOfBenchmark = Math.round(ratio * 100);
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 transition-all relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`} />
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-black text-sm">{title}</h3>
          <p className="text-xs text-[#888888]">{description}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${styles.accent} flex-shrink-0`} />
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
            className="w-12 text-lg font-bold text-center bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 focus:border-[#EA2C00] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-sm text-[#888888]">{unit}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-semibold ${styles.text}`}>You: {prefix}{value}{unit}</span>
          <span className="text-[#888888]">|</span>
          <span className="text-[#666666]">Top performers: {prefix}{benchmark}{unit}</span>
        </div>
        {severity !== 'good' && (
          <span className={`text-xs font-medium ${styles.text}`}>
            {percentOfBenchmark}% of benchmark
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
  
  const performanceScore = useMemo(() => {
    const utilizationScore = Math.min(100, (inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100);
    const timeScore = Math.min(100, (inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100);
    const wrvuScore = Math.min(100, (inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100);
    const satScore = Math.min(100, (inputs.satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100);
    return Math.round((utilizationScore + timeScore + wrvuScore + satScore) / 4);
  }, [inputs]);

  const capturedPercentage = Math.round(calculations.realizationScore);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2" data-testid="text-page-title">
          Your Baseline
        </h1>
        <p className="text-base text-[#6B7280]">
          How your current ambient AI is performing
        </p>
      </div>

      {/* After-Hours Section - EMOTIONAL HOOK AT TOP */}
      <section className="bg-[#1A1A1A] rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Moon className="w-6 h-6 text-[#EA2C00]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-white/60 uppercase tracking-[1.5px] mb-1">
              THE REALITY CHECK
            </p>
            <p className="font-semibold text-white text-lg mb-1">After-Hours Documentation</p>
            <p className="text-sm text-white/70">Hours per week your providers are charting at home</p>
          </div>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={afterHoursPerWeek}
            onChange={(e) => updateInput('afterHoursPerWeek', parseFloat(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#EA2C00] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#EA2C00] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            data-testid="slider-after-hours"
          />
          <div className="flex items-center gap-2 min-w-[100px] justify-end">
            <span className={`text-2xl font-bold ${afterHoursPerWeek > 0 ? 'text-[#EA2C00]' : 'text-white/40'}`}>
              {afterHoursPerWeek > 0 ? afterHoursPerWeek : '--'}
            </span>
            <span className="text-sm text-white/60">hrs/week</span>
          </div>
        </div>
        
        {afterHoursPerWeek > 0 && inputs.providers > 0 && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-white/80">
              That's <span className="font-bold text-[#EA2C00]">{(Math.round(afterHoursPerWeek * 52) * inputs.providers).toLocaleString()} hours/year</span> of unpaid work across your providers
            </p>
            {afterHoursPerWeek >= 5 && (
              <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                This is above the acceptable threshold for sustainable practice
              </p>
            )}
          </div>
        )}
      </section>

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
            icon={<Users className="w-5 h-5 text-[#EA2C00]" />}
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
            icon={<Clock className="w-5 h-5 text-[#EA2C00]" />}
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
            icon={<TrendingUp className="w-5 h-5 text-[#EA2C00]" />}
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
            icon={<Heart className="w-5 h-5 text-[#EA2C00]" />}
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

      {/* Performance Summary Callout */}
      <section className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
              OVERALL PERFORMANCE
            </p>
            <p className="text-sm text-[#6B7280] mb-1">
              Overall performance score: <span className="font-bold text-black">{performanceScore}/100</span>
            </p>
            <p className="text-sm text-[#6B7280]">
              You're capturing <span className="font-bold text-black">{capturedPercentage}%</span> of possible value
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-12 rounded-full ${
              performanceScore >= 75 ? 'bg-green-500' : 
              performanceScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
            }`} />
          </div>
        </div>
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
          className="bg-[#EA2C00] text-white gap-2 rounded-full px-6 h-11 disabled:opacity-50"
          data-testid="button-next"
        >
          See the Gap
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
