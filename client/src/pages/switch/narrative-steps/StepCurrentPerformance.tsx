import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface StepCurrentPerformanceProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

const ABRIDGE_UTIL = 76;
const ABRIDGE_TIME = 4.0;
const INDUSTRY_UTIL = 45;
const INDUSTRY_TIME = 2.0;

function SliderWithFill({
  value,
  min,
  max,
  step,
  onChange,
  testId,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  testId: string;
  disabled?: boolean;
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
      className={`w-full transition-opacity duration-200 ${disabled ? "opacity-40" : ""}`}
      data-testid={testId}
    />
  );
}

function BenchmarkChip({
  value,
  label,
  variant,
  onClick,
  active,
}: {
  value: string;
  label: string;
  variant: "neutral" | "abridge";
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`chip-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] transition-all duration-200 cursor-pointer ${
        active
          ? variant === "abridge"
            ? "bg-[#EA2C00]/15 border-2 border-[#EA2C00]/40 text-[#EA2C00] font-semibold"
            : "bg-[#1A1A1A]/10 border-2 border-[#1A1A1A]/25 text-[#1A1A1A] font-semibold"
          : variant === "abridge"
            ? "text-[#EA2C00] font-medium hover:bg-[#EA2C00]/10 border border-transparent hover:border-[#EA2C00]/20"
            : "text-[#9B9B9B] hover:text-[#666666] hover:bg-[#F0F0F0] border border-transparent hover:border-[#E0E0E0]"
      }`}
    >
      <span className="font-bold">{value}</span>
      <span>{label}</span>
    </button>
  );
}

function EditableValue({
  value,
  suffix,
  isSet,
  placeholder,
  onCommit,
  min,
  max,
  step,
  testId,
}: {
  value: number | null;
  suffix: string;
  isSet: boolean;
  placeholder: string;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step: number;
  testId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleStartEdit = () => {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  };

  const handleCommit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      const clamped = Math.round(Math.min(max, Math.max(min, parsed)) / step) * step;
      onCommit(Math.round(clamped * 100) / 100);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="text-center mb-4">
        <div className="inline-flex items-baseline gap-1">
          <input
            ref={inputRef}
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommit();
              if (e.key === "Escape") setEditing(false);
            }}
            min={min}
            max={max}
            step={step}
            className="w-24 text-[32px] font-bold text-[#1A1A1A] text-center bg-transparent border-b-2 border-[#EA2C00] outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-lg text-[#888] font-medium">{suffix}</span>
        </div>
      </div>
    );
  }

  if (!isSet) {
    return (
      <div className="text-center mb-4">
        <button
          type="button"
          onClick={handleStartEdit}
          className="group"
          data-testid={testId}
        >
          <span className="text-[28px] font-bold text-[#CCCCCC] group-hover:text-[#999999] transition-colors">
            {placeholder}
          </span>
          <p className="text-xs text-[#BBBBBB] mt-1 group-hover:text-[#999999] transition-colors">
            Tap a benchmark or click to type
          </p>
        </button>
      </div>
    );
  }

  return (
    <div className="text-center mb-4">
      <button
        type="button"
        onClick={handleStartEdit}
        className="group cursor-text"
        data-testid={testId}
        title="Click to type a value"
      >
        <span className="text-[32px] font-bold text-[#1A1A1A] tabular-nums group-hover:text-[#EA2C00] transition-colors duration-200">
          {step < 1 ? value?.toFixed(step < 0.5 ? 2 : 1) : value}{suffix}
        </span>
      </button>
    </div>
  );
}

export default function StepCurrentPerformance({
  inputs,
  updateInput,
  onNext,
  onBack,
}: StepCurrentPerformanceProps) {
  const [utilization, setUtilization] = useState<number | null>(inputs.utilization > 0 ? inputs.utilization : null);
  const [timeSaved, setTimeSaved] = useState<number | null>(inputs.timeSavedPerEncounter > 0 ? inputs.timeSavedPerEncounter : null);
  const [utilSet, setUtilSet] = useState(inputs.utilization > 0);
  const [timeSet, setTimeSet] = useState(inputs.timeSavedPerEncounter > 0);
  const [unmeasuredTime, setUnmeasuredTime] = useState(false);

  const bothSet = utilSet && timeSet;

  const safeUtil = utilization ?? 45;
  const safeTime = timeSaved ?? 2.0;

  const handleUtilChange = useCallback((v: number) => {
    setUtilization(v);
    updateInput("utilization", v);
    if (!utilSet) setUtilSet(true);
  }, [updateInput, utilSet]);

  const handleTimeChange = useCallback((v: number) => {
    setTimeSaved(v);
    updateInput("timeSavedPerEncounter", v);
    if (!timeSet) setTimeSet(true);
    if (unmeasuredTime) setUnmeasuredTime(false);
  }, [updateInput, timeSet, unmeasuredTime]);

  const handleUnmeasuredToggle = () => {
    const next = !unmeasuredTime;
    setUnmeasuredTime(next);
    if (next) {
      setTimeSaved(INDUSTRY_TIME);
      updateInput("timeSavedPerEncounter", INDUSTRY_TIME);
      setTimeSet(true);
    }
  };

  const documentedEncounters = Math.round(inputs.annualEncounters * (safeUtil / 100));

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

          <EditableValue
            value={utilization}
            suffix="%"
            isSet={utilSet}
            placeholder="— %"
            onCommit={handleUtilChange}
            min={10}
            max={95}
            step={5}
            testId="value-utilization"
          />

          <SliderWithFill
            value={safeUtil}
            min={10}
            max={95}
            step={5}
            onChange={handleUtilChange}
            testId="slider-utilization"
            disabled={!utilSet}
          />

          <div className="flex justify-between mt-3 gap-2">
            <BenchmarkChip
              value="45%"
              label="Industry average"
              variant="neutral"
              onClick={() => handleUtilChange(INDUSTRY_UTIL)}
              active={utilSet && utilization === INDUSTRY_UTIL}
            />
            <BenchmarkChip
              value="76%"
              label="Abridge average"
              variant="abridge"
              onClick={() => handleUtilChange(ABRIDGE_UTIL)}
              active={utilSet && utilization === ABRIDGE_UTIL}
            />
          </div>

          <AnimatePresence>
            {utilSet && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-[17px] text-[#4B4B4B] leading-[1.75] mt-4"
                data-testid="text-utilization-insight"
              >
                At {utilization}% utilization, you're documenting{" "}
                {documentedEncounters.toLocaleString()} encounters annually.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className={`transition-opacity duration-300 ${utilSet ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-2">
            How many minutes does your ambient tool save per documented encounter?
          </p>

          <EditableValue
            value={timeSaved}
            suffix=" min / encounter"
            isSet={timeSet}
            placeholder="— min"
            onCommit={handleTimeChange}
            min={0.5}
            max={6.0}
            step={0.25}
            testId="value-time-saved"
          />

          <SliderWithFill
            value={safeTime}
            min={0.5}
            max={6.0}
            step={0.25}
            onChange={handleTimeChange}
            testId="slider-time-saved"
            disabled={!timeSet}
          />

          <div className="flex justify-between mt-3 gap-2">
            <BenchmarkChip
              value="1.5\u20132.5 min"
              label="Most tools"
              variant="neutral"
              onClick={() => handleTimeChange(INDUSTRY_TIME)}
              active={timeSet && timeSaved === INDUSTRY_TIME}
            />
            <BenchmarkChip
              value="4.0 min"
              label="Abridge average"
              variant="abridge"
              onClick={() => handleTimeChange(ABRIDGE_TIME)}
              active={timeSet && timeSaved === ABRIDGE_TIME}
            />
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

          <AnimatePresence>
            {unmeasuredTime && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mt-1.5 ml-6.5 px-3 py-1.5 bg-[#F5F0EB] rounded-lg inline-flex">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 flex-shrink-0" />
                  <p className="text-[13px] text-[#9B9B9B]">
                    Using conservative industry benchmark: {INDUSTRY_TIME.toFixed(1)} min
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          disabled={!bothSet}
          className={`inline-flex items-center gap-1.5 px-8 py-3.5 text-[15px] font-semibold rounded-[10px] transition-all duration-200 ${
            bothSet
              ? "bg-[#EA2C00] text-white hover:bg-[#C72300]"
              : "bg-[#E8E8E8] text-[#BBBBBB] cursor-not-allowed"
          }`}
          data-testid="button-next"
        >
          See What These Numbers Mean
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
