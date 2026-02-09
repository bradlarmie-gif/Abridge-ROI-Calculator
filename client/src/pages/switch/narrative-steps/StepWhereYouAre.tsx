import { useState } from "react";
import { ArrowRight, ArrowLeft, Users, Clock, TrendingUp, Heart, Moon, Info, Pencil, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}: StepWhereYouAreProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleMetricChange = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    updateInput(key, value);
  };

  const allMetricsTouched = 
    touched.utilization && 
    touched.timeSavedPerEncounter && 
    touched.editTimePerEncounter && 
    touched.docCompleteness && 
    touched.satisfaction && 
    touched.wrvuLift &&
    touched.afterHoursPerWeek;

  const afterHoursPerWeek = inputs.afterHoursPerWeek || 0;
  const providers = inputs.providers || 0;
  const annualPajamaTime = afterHoursPerWeek * providers * 52;

  const afterHoursFillPercent = (afterHoursPerWeek / 15) * 100;

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          Where You Are
        </h1>
        <p className="text-base text-[#666666]">
          The more accurate you are, the clearer the picture.
        </p>
      </div>

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
            description="% of encounters documented with AI"
            tooltip="Utilization is the single strongest predictor of ambient AI ROI. Low utilization usually isn't a technology problem — it's a workflow, training, or trust issue."
            value={inputs.utilization}
            benchmark={ABRIDGE_BENCHMARKS.utilization}
            unit="%"
            maxValue={100}
            minValue={0}
            step={5}
            onChange={(v) => handleMetricChange("utilization", v)}
            testId="slider-utilization"
            benchmarkLabel="What we typically see: 70-80%"
          />

          <MetricInput
            icon={<Clock className="w-5 h-5 text-[#EA2C00]" />}
            title="Time Saved"
            description="Minutes saved per encounter (before any edits)"
            tooltip="This is gross time savings — before accounting for time spent reviewing or correcting AI output. We'll calculate the net impact on the next screen."
            value={inputs.timeSavedPerEncounter}
            benchmark={ABRIDGE_BENCHMARKS.timeSavedAvg}
            unit=" min"
            maxValue={6}
            minValue={0}
            step={0.5}
            onChange={(v) => handleMetricChange("timeSavedPerEncounter", v)}
            testId="slider-efficiency"
            benchmarkLabel="What we typically see: 3-5 min"
          />

          <MetricInput
            icon={<Pencil className="w-5 h-5 text-[#EA2C00]" />}
            title="Edit Time"
            description="Minutes spent correcting AI output per encounter"
            tooltip="Edit time is the hidden tax on ambient AI. Every minute spent correcting output erodes the time savings the tool was supposed to deliver. This reveals the true quality of AI output."
            value={inputs.editTimePerEncounter || 0}
            benchmark={ABRIDGE_BENCHMARKS.editTime}
            unit=" min"
            maxValue={10}
            minValue={0}
            step={0.5}
            onChange={(v) => handleMetricChange("editTimePerEncounter", v)}
            testId="slider-edit-time"
            benchmarkLabel="What we typically see: < 1 min"
          />

          <MetricInput
            icon={<ClipboardList className="w-5 h-5 text-[#EA2C00]" />}
            title="Note Acceptance"
            description="How often do providers use the AI note without significant edits?"
            tooltip="When providers consistently use the AI-generated note without major edits, it signals strong output quality. Low acceptance usually means the AI is missing clinical details, using the wrong structure, or not matching provider style. This metric is the clearest signal of whether the AI is truly saving time or just shifting the work."
            value={inputs.docCompleteness}
            benchmark={ABRIDGE_BENCHMARKS.docCompleteness}
            unit="%"
            maxValue={100}
            minValue={0}
            step={5}
            onChange={(v) => handleMetricChange("docCompleteness", v)}
            testId="slider-doc-completeness"
            benchmarkLabel="What we typically see: 75-85%"
          />

          <MetricInput
            icon={<Heart className="w-5 h-5 text-[#EA2C00]" />}
            title="Provider Satisfaction"
            description="Would recommend current AI to a colleague?"
            tooltip="Satisfaction below 65% is a leading indicator of declining utilization. Providers who wouldn't recommend the tool are often already using it less — or have stopped entirely."
            value={inputs.satisfaction}
            benchmark={ABRIDGE_BENCHMARKS.satisfaction}
            unit="%"
            maxValue={100}
            minValue={0}
            step={5}
            onChange={(v) => handleMetricChange("satisfaction", v)}
            testId="slider-satisfaction"
            benchmarkLabel="What we typically see: 80-90%"
          />

          <MetricInput
            icon={<TrendingUp className="w-5 h-5 text-[#EA2C00]" />}
            title="Coding Impact"
            description="Observed wRVU change since AI implementation"
            tooltip="wRVU lift reflects whether documentation is capturing the complexity of care delivered. This isn't about upcoding — it's about accurate coding. The correlation is strongest when utilization exceeds 70% and documentation completeness exceeds 85%."
            value={inputs.wrvuLift}
            benchmark={ABRIDGE_BENCHMARKS.wrvuLift}
            unit="%"
            prefix="+"
            maxValue={12}
            minValue={0}
            step={0.5}
            onChange={(v) => handleMetricChange("wrvuLift", v)}
            testId="slider-wrvu"
            benchmarkLabel="What we typically see: +4-7%"
          />
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
            onChange={(e) => handleMetricChange('afterHoursPerWeek', parseFloat(e.target.value))}
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
              onChange={(e) => handleMetricChange('afterHoursPerWeek', parseFloat(e.target.value) || 0)}
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
              Before ambient AI, the industry average was 5-8 hrs/week (AMA, 2023).
            </p>
          </div>
        )}
      </section>

      {!allMetricsTouched && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Complete all metrics to continue</p>
            <p className="text-xs text-amber-600 mt-1">
              Adjust each slider above to reflect your current performance. All 7 metrics are required for an accurate realization score.
            </p>
          </div>
        </div>
      )}

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
          disabled={!allMetricsTouched}
          className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-next"
        >
          See the Gap
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
