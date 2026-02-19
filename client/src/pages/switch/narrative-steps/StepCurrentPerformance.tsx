import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface StepCurrentPerformanceProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

function SliderWithFill({
  value,
  min,
  max,
  step,
  onChange,
  testId,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  testId: string;
}) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const fillPercent = ((value - min) / (max - min)) * 100;

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.background = `linear-gradient(to right, #1A1A1A 0%, #1A1A1A ${fillPercent}%, #E8E8E8 ${fillPercent}%, #E8E8E8 100%)`;
    }
  }, [fillPercent]);

  return (
    <input
      ref={sliderRef}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full"
      data-testid={testId}
    />
  );
}

export default function StepCurrentPerformance({
  inputs,
  updateInput,
  onNext,
  onBack,
}: StepCurrentPerformanceProps) {
  const [utilizationMoved, setUtilizationMoved] = useState(inputs.utilization > 0);
  const [timeMoved, setTimeMoved] = useState(inputs.timeSavedPerEncounter > 0);
  const [unmeasuredTime, setUnmeasuredTime] = useState(false);

  const utilization = inputs.utilization || 45;
  const timeSaved = inputs.timeSavedPerEncounter || 2.0;

  const handleUtilizationChange = useCallback((v: number) => {
    updateInput("utilization", v);
    if (!utilizationMoved) setUtilizationMoved(true);
  }, [updateInput, utilizationMoved]);

  const handleTimeChange = useCallback((v: number) => {
    updateInput("timeSavedPerEncounter", v);
    if (!timeMoved) setTimeMoved(true);
  }, [updateInput, timeMoved]);

  const handleUnmeasuredToggle = () => {
    const next = !unmeasuredTime;
    setUnmeasuredTime(next);
    if (next) {
      updateInput("timeSavedPerEncounter", 2.0);
      setTimeMoved(true);
    }
  };

  useEffect(() => {
    if (inputs.utilization === 0) {
      updateInput("utilization", 45);
    }
    if (inputs.timeSavedPerEncounter === 0) {
      updateInput("timeSavedPerEncounter", 2.0);
    }
  }, []);

  const documentedEncounters = Math.round(inputs.annualEncounters * (utilization / 100));

  return (
    <div className="max-w-[560px] mx-auto py-20 md:py-20" style={{ fontFamily: "Manrope, sans-serif" }}>
      <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-3" data-testid="text-step3-eyebrow">
        Current Performance
      </p>

      <h1 className="text-[28px] font-semibold text-[#1A1A1A] leading-[1.3] mb-3" data-testid="text-step3-headline">
        How is your current ambient tool performing?
      </h1>

      <p className="text-[17px] text-[#4B4B4B] leading-[1.75] mb-12">
        Most organizations deploy ambient AI without
        systematically measuring what it returns.
        These two numbers tell the story.
      </p>

      <div className="space-y-12">
        <div>
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-2">
            What percentage of eligible encounters are being documented with ambient AI today?
          </p>

          <div className="text-center mb-4">
            <span className="text-[32px] font-bold text-[#1A1A1A] tabular-nums" data-testid="value-utilization">
              {utilization}%
            </span>
          </div>

          <SliderWithFill
            value={utilization}
            min={10}
            max={95}
            step={5}
            onChange={handleUtilizationChange}
            testId="slider-utilization"
          />

          <div className="flex justify-between mt-3 text-[13px] text-[#9B9B9B]">
            <span>Industry average: 45%</span>
            <span>Abridge average: 76%</span>
          </div>

          {utilizationMoved && (
            <p className="text-[17px] text-[#4B4B4B] leading-[1.75] mt-4 transition-opacity duration-300" data-testid="text-utilization-insight">
              At {utilization}% utilization, you're documenting{" "}
              {documentedEncounters.toLocaleString()} encounters annually.
            </p>
          )}
        </div>

        <div>
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-2">
            How many minutes does your ambient tool save per documented encounter?
          </p>

          <div className="text-center mb-4">
            <span className="text-[32px] font-bold text-[#1A1A1A] tabular-nums" data-testid="value-time-saved">
              {timeSaved.toFixed(timeSaved % 1 === 0 ? 1 : 2)} min / encounter
            </span>
          </div>

          <SliderWithFill
            value={timeSaved}
            min={0.5}
            max={6.0}
            step={0.25}
            onChange={handleTimeChange}
            testId="slider-time-saved"
          />

          <div className="flex justify-between mt-3 text-[13px] text-[#9B9B9B]">
            <span>Most ambient tools: 1.5\u20132.5 min</span>
            <span>Abridge average: 4.0 min</span>
          </div>

          <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={unmeasuredTime}
              onChange={handleUnmeasuredToggle}
              className="mt-0.5 w-4 h-4 rounded border-[#E8E8E8] text-[#1A1A1A] focus:ring-[#1A1A1A]"
              data-testid="checkbox-unmeasured"
            />
            <span className="text-[13px] text-[#4B4B4B]">
              I haven't measured this precisely
            </span>
          </label>
          {unmeasuredTime && (
            <p className="text-[13px] text-[#9B9B9B] mt-1.5 ml-6.5" data-testid="text-benchmark-note">
              Using industry benchmark: 2.0 min
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-12 pt-6">
        <button
          onClick={onBack}
          className="text-[14px] text-[#4B4B4B] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
          data-testid="button-back"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 px-8 py-3.5 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-[10px] hover:bg-[#C72300] transition-colors"
          data-testid="button-next"
        >
          See What These Numbers Mean
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
