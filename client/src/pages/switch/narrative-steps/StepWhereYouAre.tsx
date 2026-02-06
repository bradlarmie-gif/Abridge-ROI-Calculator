import { useState } from "react";
import { ArrowRight, ArrowLeft, Users, Clock, TrendingUp, Heart, Moon, Info, Pencil, AlertTriangle } from "lucide-react";
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
  tooltip: string;
  value: number;
  benchmark: number;
  unit: string;
  prefix?: string;
  maxValue: number;
  minValue: number;
  step: number;
  onChange: (value: number) => void;
  testId: string;
  benchmarkLabel?: string;
}

function MetricInput({ 
  icon, title, description, tooltip, value, benchmark, unit, prefix = "", 
  maxValue, minValue, step, onChange, testId, benchmarkLabel
}: MetricInputProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleInputChange = (inputValue: string) => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      const clampedValue = Math.min(maxValue, Math.max(minValue, num));
      onChange(clampedValue);
    } else if (inputValue === '') {
      onChange(minValue);
    }
  };

  const fillPercent = ((value - minValue) / (maxValue - minValue)) * 100;
  const benchmarkPercent = ((benchmark - minValue) / (maxValue - minValue)) * 100;
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#1A1A1A] text-sm">{title}</h3>
            <button
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              data-testid={`tooltip-${testId}`}
            >
              <Info className="w-3.5 h-3.5 text-[#999999]" />
              {showTooltip && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#1A1A1A] text-white text-xs rounded-lg shadow-lg">
                  {tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-[#1A1A1A] rotate-45 -mt-1" />
                </div>
              )}
            </button>
          </div>
          <p className="text-xs text-[#999999]">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 relative">
          <input
            type="range"
            min={minValue}
            max={maxValue}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${fillPercent}%, #E0E0E0 ${fillPercent}%, #E0E0E0 100%)`,
            }}
            data-testid={testId}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#999999] pointer-events-none"
            style={{ left: `${benchmarkPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-1 min-w-[90px] justify-end">
          {prefix && <span className="text-lg font-bold text-[#1A1A1A]">{prefix}</span>}
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="--"
            min={minValue}
            max={maxValue}
            step={step}
            className="w-14 text-lg font-bold text-center bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 focus:border-[#EA2C00] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-sm text-[#999999]">{unit}</span>
        </div>
      </div>
      
      <div className="text-xs text-[#999999] bg-[#F5F5F5] px-3 py-1.5 rounded-md inline-block">
        {benchmarkLabel || `Abridge Benchmark: ${prefix}${benchmark}${unit}`}
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
  const providers = inputs.providers || 0;
  const annualPajamaTime = afterHoursPerWeek * providers * 52;
  const benchmarkPajamaTime = ABRIDGE_BENCHMARKS.afterHoursPerWeek * providers * 52;

  const afterHoursFillPercent = (afterHoursPerWeek / 15) * 100;
  const editTime = inputs.editTimePerEncounter || 0;
  const showEditWarning = editTime > 0 && editTime >= inputs.timeSavedPerEncounter && inputs.timeSavedPerEncounter > 0;

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          Where You Are
        </h1>
        <p className="text-base text-[#666666]">
          Tell us about your current ambient AI experience.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-4">
          Your Organization
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
            <label className="block text-xs text-[#666666] mb-2">
              Providers using ambient AI
            </label>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              className="w-full text-lg font-semibold text-[#1A1A1A] bg-white border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
              placeholder="e.g. 50"
              data-testid="input-providers"
            />
            <p className="text-[11px] text-[#999999] mt-1">Physicians, APPs, or other clinicians with AI access</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
            <label className="block text-xs text-[#666666] mb-2">
              Annual encounters
            </label>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => updateInput("annualEncounters", v || 0)}
              className="w-full text-lg font-semibold text-[#1A1A1A] bg-white border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
              placeholder="e.g. 100,000"
              data-testid="input-encounters"
            />
            <p className="text-[11px] text-[#999999] mt-1">Total visits where AI could be used for documentation</p>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">
          Your Current Performance
        </p>
        <p className="text-sm text-[#666666] mb-6">
          The more accurate you are, the clearer the picture.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricInput
            icon={<Users className="w-5 h-5 text-[#EA2C00]" />}
            title="Utilization"
            description="% of encounters documented"
            tooltip="What percentage of eligible encounters are being documented with AI? Low utilization usually means workflow friction, not technology failure."
            value={inputs.utilization}
            benchmark={ABRIDGE_BENCHMARKS.utilization}
            unit="%"
            maxValue={100}
            minValue={0}
            step={5}
            onChange={(v) => updateInput("utilization", v)}
            testId="slider-utilization"
          />

          <MetricInput
            icon={<Clock className="w-5 h-5 text-[#EA2C00]" />}
            title="Time Saved"
            description="Minutes saved per encounter"
            tooltip="How many minutes of documentation time does AI save per encounter? This should be measured against pre-AI baseline, not against competitors."
            value={inputs.timeSavedPerEncounter}
            benchmark={ABRIDGE_BENCHMARKS.timeSavedAvg}
            unit=" min"
            maxValue={6}
            minValue={0}
            step={0.5}
            onChange={(v) => updateInput("timeSavedPerEncounter", v)}
            testId="slider-efficiency"
          />

          <MetricInput
            icon={<TrendingUp className="w-5 h-5 text-[#EA2C00]" />}
            title="Documentation Quality"
            description="wRVU lift from AI"
            tooltip="What wRVU lift are you seeing from improved documentation? Better notes capture complexity more accurately, leading to appropriate coding."
            value={inputs.wrvuLift}
            benchmark={ABRIDGE_BENCHMARKS.wrvuLift}
            unit="%"
            prefix="+"
            maxValue={12}
            minValue={0}
            step={0.5}
            onChange={(v) => updateInput("wrvuLift", v)}
            testId="slider-wrvu"
          />

          <MetricInput
            icon={<Heart className="w-5 h-5 text-[#EA2C00]" />}
            title="Provider Satisfaction"
            description="Would recommend AI?"
            tooltip="Would your providers recommend this AI to a colleague? Satisfaction below 70% correlates strongly with turnover intent."
            value={inputs.satisfaction}
            benchmark={ABRIDGE_BENCHMARKS.satisfaction}
            unit="%"
            maxValue={100}
            minValue={0}
            step={5}
            onChange={(v) => updateInput("satisfaction", v)}
            testId="slider-satisfaction"
          />
        </div>

        <div className="mt-4">
          <MetricInput
            icon={<Pencil className="w-5 h-5 text-[#EA2C00]" />}
            title="Edit Time"
            description="Minutes spent correcting AI output per encounter"
            tooltip="How long do providers spend reviewing and correcting AI-generated documentation before signing? This includes fixing errors, adding missing details, and reformatting. If this exceeds time saved, the AI is a net negative."
            value={editTime}
            benchmark={ABRIDGE_BENCHMARKS.editTime}
            unit=" min"
            maxValue={10}
            minValue={0}
            step={0.5}
            onChange={(v) => updateInput("editTimePerEncounter", v)}
            testId="slider-edit-time"
            benchmarkLabel="Abridge Benchmark: < 1 min"
          />

          {showEditWarning && (
            <div className="mt-3 bg-[#FFEBE6] rounded-lg p-4 flex items-start gap-3" data-testid="edit-time-warning">
              <AlertTriangle className="w-5 h-5 text-[#EA2C00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#EA2C00]">Edit time exceeds time saved.</p>
                <p className="text-sm text-[#EA2C00]">When edit time exceeds time saved, the net efficiency benefit becomes harder to realize. This is worth understanding.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#1A1A1A] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#333333] flex items-center justify-center">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">After-Hours Documentation</p>
            <p className="text-xs text-[#999999]">Hours per week charting at home</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={afterHoursPerWeek}
            onChange={(e) => updateInput('afterHoursPerWeek', parseFloat(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${afterHoursFillPercent}%, #333333 ${afterHoursFillPercent}%, #333333 100%)`,
            }}
            data-testid="slider-after-hours"
          />
          <div className="flex items-center gap-1 min-w-[90px] justify-end">
            <input
              type="number"
              value={afterHoursPerWeek || ''}
              onChange={(e) => updateInput('afterHoursPerWeek', parseFloat(e.target.value) || 0)}
              placeholder="--"
              min={0}
              max={15}
              className="w-12 text-lg font-bold text-center text-white bg-[#333333] border border-[#555555] rounded-lg px-2 py-1 focus:border-[#EA2C00] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="slider-after-hours-input"
            />
            <span className="text-sm text-[#999999]">hrs/wk</span>
          </div>
        </div>

        {afterHoursPerWeek > 0 && providers > 0 && (
          <div className="mt-4 space-y-2">
            <div className="h-px bg-[#333333]" />
            <p className="text-sm text-[#999999] mt-3">
              That's <span className="font-semibold text-white">{annualPajamaTime.toLocaleString()} hours/year</span> your team is spending outside the clinic.
            </p>
            <p className="text-xs text-[#666666]">
              Abridge average: {ABRIDGE_BENCHMARKS.afterHoursPerWeek} hrs/week ({benchmarkPajamaTime.toLocaleString()} hours/year for your team)
            </p>
          </div>
        )}
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
          className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11 disabled:opacity-50"
          data-testid="button-next"
        >
          See the Gap
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
