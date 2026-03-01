import { useState } from "react";
import { Users, Clock, TrendingUp, Heart, Moon, Info, Pencil, ClipboardList } from "lucide-react";
import {
  ABRIDGE_BENCHMARKS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface StepWhereYouAreProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

interface PresetOption {
  label: string;
  value: number;
}

interface PresetMetricConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  tooltip: string;
  presets: PresetOption[];
  unit: string;
  prefix?: string;
  maxValue: number;
  minValue: number;
  step: number;
  inputKey: keyof SwitchInputs;
  testId: string;
  benchmarkLabel?: string;
  benchmark: number;
}

const METRIC_CONFIGS: PresetMetricConfig[] = [
  {
    icon: <Users className="w-5 h-5 text-[#EA2C00]" />,
    title: "Utilization",
    description: "% of encounters documented with AI",
    tooltip: "Utilization is the single strongest predictor of ambient AI ROI. Low utilization usually isn't a technology problem — it's a workflow, training, or trust issue.",
    presets: [
      { label: "30%", value: 30 },
      { label: "50%", value: 50 },
      { label: "60%", value: 60 },
      { label: "75%", value: 75 },
    ],
    unit: "%",
    maxValue: 100,
    minValue: 0,
    step: 5,
    inputKey: "utilization",
    testId: "slider-utilization",
    benchmarkLabel: "What we typically see: 70-80%",
    benchmark: ABRIDGE_BENCHMARKS.utilization,
  },
  {
    icon: <Clock className="w-5 h-5 text-[#EA2C00]" />,
    title: "Time Saved",
    description: "Minutes saved per encounter (before any edits)",
    tooltip: "This is gross time savings — before accounting for time spent reviewing or correcting AI output. We'll calculate the net impact on the next screen.",
    presets: [
      { label: "1 min", value: 1 },
      { label: "3 min", value: 3 },
      { label: "4.5 min", value: 4.5 },
    ],
    unit: " min",
    maxValue: 6,
    minValue: 0,
    step: 0.5,
    inputKey: "timeSavedPerEncounter",
    testId: "slider-efficiency",
    benchmarkLabel: "What we typically see: 2-4.5 min",
    benchmark: ABRIDGE_BENCHMARKS.timeSavedAvg,
  },
  {
    icon: <Pencil className="w-5 h-5 text-[#EA2C00]" />,
    title: "Edit Time",
    description: "Minutes spent correcting AI output per encounter",
    tooltip: "Edit time is the hidden tax on ambient AI. Every minute spent correcting output erodes the time savings the tool was supposed to deliver. This reveals the true quality of AI output.",
    presets: [
      { label: "0.5 min", value: 0.5 },
      { label: "1 min", value: 1 },
      { label: "2 min", value: 2 },
    ],
    unit: " min",
    maxValue: 10,
    minValue: 0,
    step: 0.5,
    inputKey: "editTimePerEncounter",
    testId: "slider-edit-time",
    benchmarkLabel: "What we typically see: < 1 min",
    benchmark: ABRIDGE_BENCHMARKS.editTime,
  },
  {
    icon: <ClipboardList className="w-5 h-5 text-[#EA2C00]" />,
    title: "Note Acceptance",
    description: "How often do providers use the AI note without significant edits?",
    tooltip: "When providers consistently use the AI-generated note without major edits, it signals strong output quality. Low acceptance usually means the AI is missing clinical details, using the wrong structure, or not matching provider style. This metric is the clearest signal of whether the AI is truly saving time or just shifting the work.",
    presets: [
      { label: "50%", value: 50 },
      { label: "65%", value: 65 },
      { label: "80%", value: 80 },
    ],
    unit: "%",
    maxValue: 100,
    minValue: 0,
    step: 5,
    inputKey: "docCompleteness",
    testId: "slider-doc-completeness",
    benchmarkLabel: "What we typically see: 75-85%",
    benchmark: ABRIDGE_BENCHMARKS.docCompleteness,
  },
  {
    icon: <Heart className="w-5 h-5 text-[#EA2C00]" />,
    title: "Provider Satisfaction",
    description: "Would recommend current AI to a colleague?",
    tooltip: "Satisfaction below 65% is a leading indicator of declining utilization. Providers who wouldn't recommend the tool are often already using it less — or have stopped entirely.",
    presets: [
      { label: "50%", value: 50 },
      { label: "65%", value: 65 },
      { label: "80%", value: 80 },
    ],
    unit: "%",
    maxValue: 100,
    minValue: 0,
    step: 5,
    inputKey: "satisfaction",
    testId: "slider-satisfaction",
    benchmarkLabel: "What we typically see: 80-90%",
    benchmark: ABRIDGE_BENCHMARKS.satisfaction,
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-[#EA2C00]" />,
    title: "Coding Impact",
    description: "Observed wRVU change since AI implementation",
    tooltip: "wRVU lift reflects whether documentation is capturing the complexity of care delivered. This isn't about upcoding — it's about accurate coding. The correlation is strongest when utilization exceeds 70% and documentation completeness exceeds 85%.",
    presets: [
      { label: "+1%", value: 1 },
      { label: "+3%", value: 3 },
      { label: "+5%", value: 5 },
    ],
    unit: "%",
    prefix: "+",
    maxValue: 12,
    minValue: 0,
    step: 0.5,
    inputKey: "wrvuLift",
    testId: "slider-wrvu",
    benchmarkLabel: "What we typically see: +4-7%",
    benchmark: ABRIDGE_BENCHMARKS.wrvuLift,
  },
];

const AFTER_HOURS_PRESETS: PresetOption[] = [
  { label: "1 hr", value: 1 },
  { label: "3 hrs", value: 3 },
  { label: "5 hrs", value: 5 },
];

function PresetMetricInput({
  config,
  value,
  showCustom,
  onPresetSelect,
  onCustomToggle,
  onSliderChange,
  onInputChange,
}: {
  config: PresetMetricConfig;
  value: number;
  showCustom: boolean;
  onPresetSelect: (val: number) => void;
  onCustomToggle: () => void;
  onSliderChange: (val: number) => void;
  onInputChange: (val: string) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const fillPercent = ((value - config.minValue) / (config.maxValue - config.minValue)) * 100;

  const handleInputChange = (inputValue: string) => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      const clampedValue = Math.min(config.maxValue, Math.max(config.minValue, num));
      onInputChange(String(clampedValue));
    } else if (inputValue === '') {
      onInputChange(String(config.minValue));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#1A1A1A] text-sm">{config.title}</h3>
            <button
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              data-testid={`tooltip-${config.testId}`}
            >
              <Info className="w-3.5 h-3.5 text-[#999999]" />
              {showTooltip && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#1A1A1A] text-white text-xs rounded-lg shadow-lg">
                  {config.tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-[#1A1A1A] rotate-45 -mt-1" />
                </div>
              )}
            </button>
          </div>
          <p className="text-xs text-[#999999]">{config.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {config.presets.map((p) => {
          const isActive = !showCustom && value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onPresetSelect(p.value)}
              data-testid={`preset-${config.testId.replace('slider-', '')}-${p.value}`}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#EA2C00] text-white shadow-sm"
                  : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCustomToggle}
          data-testid={`preset-${config.testId.replace('slider-', '')}-custom`}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            showCustom
              ? "bg-[#EA2C00] text-white shadow-sm"
              : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="bg-white rounded-lg p-4 border border-[#E5E7EB] mb-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min={config.minValue}
                max={config.maxValue}
                step={config.step}
                value={value}
                onChange={(e) => onSliderChange(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${fillPercent}%, #E0E0E0 ${fillPercent}%, #E0E0E0 100%)`,
                }}
                data-testid={config.testId}
              />
            </div>
            <div className="flex items-center gap-1 min-w-[90px] justify-end">
              {config.prefix && <span className="text-lg font-bold text-[#1A1A1A]">{config.prefix}</span>}
              <input
                type="number"
                value={value || ''}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="--"
                min={config.minValue}
                max={config.maxValue}
                step={config.step}
                className="w-14 text-lg font-bold text-center bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 focus:border-[#EA2C00] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-testid={`${config.testId}-input`}
              />
              <span className="text-sm text-[#999999]">{config.unit}</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-[#999999] bg-[#F5F0EB] px-3 py-1.5 rounded-md inline-block">
        {config.benchmarkLabel || `Abridge Benchmark: ${config.prefix || ""}${config.benchmark}${config.unit}`}
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
  const [customStates, setCustomStates] = useState<Record<string, boolean>>({});
  const [showCustomAfterHours, setShowCustomAfterHours] = useState(false);

  const handleMetricChange = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    updateInput(key, value);
  };

  const handlePresetSelect = (key: keyof SwitchInputs, value: number) => {
    setCustomStates(prev => ({ ...prev, [key]: false }));
    handleMetricChange(key, value as SwitchInputs[typeof key]);
  };

  const handleCustomToggle = (key: keyof SwitchInputs) => {
    setCustomStates(prev => ({ ...prev, [key]: true }));
    const currentValue = inputs[key] as number;
    if (currentValue === 0) {
      const config = METRIC_CONFIGS.find(c => c.inputKey === key);
      if (config && config.presets.length > 0) {
        handleMetricChange(key, config.presets[1]?.value as SwitchInputs[typeof key] ?? config.presets[0].value as SwitchInputs[typeof key]);
      }
    } else {
      setTouched(prev => ({ ...prev, [key]: true }));
    }
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

  const handleAfterHoursPreset = (value: number) => {
    setShowCustomAfterHours(false);
    handleMetricChange('afterHoursPerWeek', value);
  };

  const handleAfterHoursCustomToggle = () => {
    setShowCustomAfterHours(true);
    if (afterHoursPerWeek === 0) {
      handleMetricChange('afterHoursPerWeek', 3);
    } else {
      setTouched(prev => ({ ...prev, afterHoursPerWeek: true }));
    }
  };

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          Where You Are
        </h1>
        <p className="text-base text-[#888888] leading-relaxed">
          The more accurate you are, the clearer the picture.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-6 border border-[#E8E0D8]">
        <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-2">
          Your Current Performance
        </p>
        <p className="text-sm text-[#666666] mb-6">
          The more accurate you are, the clearer the picture.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METRIC_CONFIGS.map((config) => (
            <PresetMetricInput
              key={config.inputKey}
              config={config}
              value={inputs[config.inputKey] as number}
              showCustom={!!customStates[config.inputKey]}
              onPresetSelect={(val) => handlePresetSelect(config.inputKey, val)}
              onCustomToggle={() => handleCustomToggle(config.inputKey)}
              onSliderChange={(val) => handleMetricChange(config.inputKey, val as SwitchInputs[typeof config.inputKey])}
              onInputChange={(val) => handleMetricChange(config.inputKey, parseFloat(val) as SwitchInputs[typeof config.inputKey])}
            />
          ))}
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

        <div className="flex flex-wrap gap-2 mb-3">
          {AFTER_HOURS_PRESETS.map((p) => {
            const isActive = !showCustomAfterHours && afterHoursPerWeek === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => handleAfterHoursPreset(p.value)}
                data-testid={`preset-after-hours-${p.value}`}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#EA2C00] text-white shadow-sm"
                    : "bg-[#333333] text-[#999999] border border-[#555555] hover:border-[#EA2C00]/30 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleAfterHoursCustomToggle}
            data-testid="preset-after-hours-custom"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              showCustomAfterHours
                ? "bg-[#EA2C00] text-white shadow-sm"
                : "bg-[#333333] text-[#999999] border border-[#555555] hover:border-[#EA2C00]/30 hover:text-white"
            }`}
          >
            Custom
          </button>
        </div>

        {showCustomAfterHours && (
          <div className="bg-[#262626] rounded-lg p-4 border border-[#444444] mb-3">
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
          </div>
        )}

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

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel="See the Gap"
        nextDisabled={!allMetricsTouched}
        nextTestId="button-next"
      />
    </div>
  );
}
