import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

const ABRIDGE_UTIL = 76;
const ABRIDGE_TIME = 3.0;
const INDUSTRY_UTIL = 45;
const INDUSTRY_TIME = 2.0;

function BenchmarkPill({
  value,
  label,
  variant,
  onClick,
  active,
  testId,
}: {
  value: string;
  label: string;
  variant: "neutral" | "abridge";
  onClick?: () => void;
  active?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId || `pill-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
        active
          ? variant === "abridge"
            ? "bg-[#EA2C00]/15 border-2 border-[#EA2C00]/50 text-[#EA2C00] font-semibold scale-105"
            : "bg-[#1A1A1A]/10 border-2 border-[#1A1A1A]/30 text-[#1A1A1A] font-semibold scale-105"
          : variant === "abridge"
            ? "bg-[#EA2C00]/8 border border-[#EA2C00]/25 text-[#EA2C00] font-semibold hover:bg-[#EA2C00]/15 hover:border-[#EA2C00]/40"
            : "bg-[#F0EFED] border border-[#E5E7EB] text-[#888888] font-medium hover:bg-[#E8E5E0] hover:border-[#D0D0D0]"
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
      <div className="text-center mb-6">
        <div className="inline-flex items-baseline gap-2">
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
            className="w-28 text-5xl font-bold text-[#1A1A1A] text-center bg-transparent border-b-2 border-[#EA2C00] outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-2xl text-[#888888] font-medium">{suffix}</span>
        </div>
      </div>
    );
  }

  if (!isSet) {
    return (
      <div className="text-center mb-6">
        <button
          type="button"
          onClick={handleStartEdit}
          className="group"
          data-testid={testId}
        >
          <span className="text-4xl font-bold text-[#CCCCCC] group-hover:text-[#999999] transition-colors">
            {placeholder}
          </span>
          <p className="text-xs text-[#BBBBBB] mt-1 group-hover:text-[#999999] transition-colors">
            Tap a benchmark below or click to type
          </p>
        </button>
      </div>
    );
  }

  return (
    <div className="text-center mb-6">
      <button
        type="button"
        onClick={handleStartEdit}
        className="group cursor-text"
        data-testid={testId}
        title="Click to type a value"
      >
        <span className="text-5xl font-bold text-[#1A1A1A] tabular-nums group-hover:text-[#EA2C00] transition-colors duration-200">
          {step < 1 ? value?.toFixed(1) : value}{suffix}
        </span>
      </button>
    </div>
  );
}

export default function Screen3Performance({ onNext, onBack }: Screen3Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

  const [utilization, setUtilization] = useState<number | null>(
    inputs.utilization > 0 ? inputs.utilization : null
  );
  const [timeSavings, setTimeSavings] = useState<number | null>(
    inputs.timeSavedPerEncounter > 0 ? inputs.timeSavedPerEncounter : null
  );
  const [utilSet, setUtilSet] = useState(inputs.utilization > 0);
  const [timeSet, setTimeSet] = useState(inputs.timeSavedPerEncounter > 0);
  const [unmeasuredChecked, setUnmeasuredChecked] = useState(false);

  const bothSet = utilSet && timeSet;

  const safeUtil = utilization ?? 0;
  const safeTime = timeSavings ?? 0;

  const theirEncounters = Math.round(inputs.annualEncounters * (safeUtil / 100));
  const abridgeEncounters = Math.round(inputs.annualEncounters * (ABRIDGE_UTIL / 100));
  const encounterGap = Math.max(0, abridgeEncounters - theirEncounters);

  const theirHours = Math.round((theirEncounters * safeTime) / 60);
  const abridgeHours = Math.round((abridgeEncounters * ABRIDGE_TIME) / 60);
  const hourGap = Math.max(0, abridgeHours - theirHours);

  const utilInsight = useMemo(() => {
    if (!utilSet || utilization == null) return null;
    if (utilization < 45) return `Below industry average \u2014 significant headroom to benchmark.`;
    if (utilization <= 60) return `Near industry average \u2014 ${encounterGap.toLocaleString()} encounter gap to Abridge benchmark.`;
    if (utilization <= 75) return `Above average \u2014 ${encounterGap.toLocaleString()} encounter gap to close.`;
    return "At or above Abridge benchmark \u2014 strong utilization.";
  }, [utilSet, utilization, encounterGap]);

  const timeInsight = useMemo(() => {
    if (!timeSet || timeSavings == null) return null;
    const hoursGapCalc = Math.round((theirEncounters * Math.max(0, ABRIDGE_TIME - timeSavings)) / 60);
    if (timeSavings < 1.5) return `Below typical range \u2014 ${hoursGapCalc.toLocaleString()} hour gap to Abridge benchmark.`;
    if (timeSavings < 2.5) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Within typical range \u2014 ${gap} min gap represents ${hoursGapCalc.toLocaleString()} hours.`;
    }
    if (timeSavings < 3.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Above average \u2014 ${gap} min to Abridge benchmark.`;
    }
    return "At or above Abridge benchmark.";
  }, [timeSet, timeSavings, theirEncounters]);

  const handleUtilChange = (val: number) => {
    setUtilization(val);
    if (!utilSet) setUtilSet(true);
  };

  const handleTimeChange = (val: number) => {
    setTimeSavings(val);
    if (!timeSet) setTimeSet(true);
    if (unmeasuredChecked) setUnmeasuredChecked(false);
  };

  const handleUnmeasuredToggle = (checked: boolean | "indeterminate") => {
    const next = checked === true;
    setUnmeasuredChecked(next);
    if (next) {
      setTimeSavings(INDUSTRY_TIME);
      setTimeSet(true);
    }
  };

  const handleNext = () => {
    if (utilization != null) dispatch(assessmentActions.updateInput('utilization', utilization));
    if (timeSavings != null) dispatch(assessmentActions.updateInput('timeSavedPerEncounter', timeSavings));
    onNext();
  };

  const utilGapPp = Math.max(0, ABRIDGE_UTIL - safeUtil);
  const timeGapMin = Math.max(0, Math.round((ABRIDGE_TIME - safeTime) * 10) / 10);

  return (
    <div className={`flex flex-col lg:flex-row gap-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <motion.div
        className="flex-1 max-w-[700px]"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-8" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-screen3-headline"
          >
            Current Performance
          </h1>
          <p className="text-base text-[#888888]">
            Two inputs. These determine your documentation intelligence score.
          </p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-6">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Utilization Rate
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />
            <p className="text-sm text-black mb-6">
              What % of eligible encounters are being documented?
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

            <div className={`transition-opacity duration-300 ${utilSet ? "opacity-100" : "opacity-40"}`}>
              <Slider
                min={10}
                max={95}
                step={5}
                value={[utilization ?? 50]}
                onValueChange={(v) => handleUtilChange(v[0])}
                className="w-full"
                data-testid="slider-utilization"
              />
            </div>

            <div className="flex items-center justify-center mt-5 gap-3 flex-wrap">
              <BenchmarkPill
                value="45%"
                label="Industry avg"
                variant="neutral"
                onClick={() => handleUtilChange(INDUSTRY_UTIL)}
                active={utilSet && utilization === INDUSTRY_UTIL}
                testId="pill-util-industry"
              />
              <BenchmarkPill
                value="76%"
                label="Abridge avg"
                variant="abridge"
                onClick={() => handleUtilChange(ABRIDGE_UTIL)}
                active={utilSet && utilization === ABRIDGE_UTIL}
                testId="pill-util-abridge"
              />
            </div>
            <p className="text-[10px] text-[#999] text-center mt-2">Based on published industry data and Abridge deployment experience.</p>

            <AnimatePresence>
              {utilInsight && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-5 text-sm text-[#888888] italic leading-relaxed"
                  data-testid="text-util-insight"
                >
                  {utilInsight}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div
            className={`bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-6 transition-opacity duration-300 ${
              utilSet ? "opacity-100" : "opacity-30 pointer-events-none"
            }`}
          >
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Time Returned / Encounter
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />
            <p className="text-sm text-black mb-6">
              Minutes saved per documented encounter
            </p>

            <EditableValue
              value={timeSavings}
              suffix=" min"
              isSet={timeSet}
              placeholder="— min"
              onCommit={handleTimeChange}
              min={0.5}
              max={6.0}
              step={0.25}
              testId="value-time-savings"
            />

            <div className={`transition-opacity duration-300 ${timeSet ? "opacity-100" : "opacity-40"}`}>
              <Slider
                min={0.5}
                max={6.0}
                step={0.25}
                value={[timeSavings ?? 2.0]}
                onValueChange={(v) => handleTimeChange(v[0])}
                className="w-full"
                data-testid="slider-time-savings"
              />
            </div>

            <div className="flex items-center justify-center mt-5 gap-3 flex-wrap">
              <BenchmarkPill
                value="1.5–2.5 min"
                label="Most tools"
                variant="neutral"
                onClick={() => handleTimeChange(INDUSTRY_TIME)}
                active={timeSet && timeSavings === INDUSTRY_TIME}
                testId="pill-time-industry"
              />
              <BenchmarkPill
                value="3.0 min"
                label="Abridge avg"
                variant="abridge"
                onClick={() => handleTimeChange(ABRIDGE_TIME)}
                active={timeSet && timeSavings === ABRIDGE_TIME}
                testId="pill-time-abridge"
              />
            </div>
            <p className="text-[10px] text-[#999] text-center mt-2">Based on published industry data and Abridge deployment experience.</p>

            <div className="flex items-center gap-2.5 mt-5">
              <Checkbox
                id="unmeasured"
                checked={unmeasuredChecked}
                onCheckedChange={handleUnmeasuredToggle}
                data-testid="checkbox-unmeasured"
              />
              <label htmlFor="unmeasured" className="text-sm text-[#525252] cursor-pointer select-none">
                I haven't measured this precisely
              </label>
            </div>
            <AnimatePresence>
              {unmeasuredChecked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-[#E8E0D8]/50 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]/60 flex-shrink-0" />
                    <p className="text-sm text-[#888888]">
                      Using conservative industry benchmark: {INDUSTRY_TIME.toFixed(1)} min
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {timeInsight && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-5 text-sm text-[#888888] italic leading-relaxed"
                  data-testid="text-time-insight"
                >
                  {timeInsight}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="max-w-[700px]">
          <StepFooter onBack={onBack} onNext={handleNext} nextLabel="See the Four Domains" nextDisabled={!bothSet} />
        </div>
      </motion.div>

      <div className="w-full lg:w-[320px] flex-shrink-0 hidden lg:block">
        <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
          <p className="text-[11px] font-medium text-white/60 uppercase tracking-[1.5px] mb-6">
            Your Inputs
          </p>

          <div className="mb-5">
            <p className="text-xs text-white/40 mb-1">Utilization Rate</p>
            {utilSet ? (
              <>
                <p className="text-3xl font-bold text-white leading-none" data-testid="panel-utilization">
                  {utilization}%
                </p>
                {utilGapPp > 0 && (
                  <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                    {utilGapPp}pp below Abridge avg
                  </p>
                )}
                {utilGapPp <= 0 && (
                  <p className="text-xs text-green-400 font-semibold mt-1">
                    At or above Abridge avg
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-bold text-white/20 leading-none">\u2014</p>
            )}
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <div className="mb-5">
            <p className="text-xs text-white/40 mb-1">Time Saved / Encounter</p>
            {timeSet ? (
              <>
                <p className="text-3xl font-bold text-white leading-none" data-testid="panel-time-savings">
                  {safeTime.toFixed(1)} min
                </p>
                {unmeasuredChecked && (
                  <p className="text-xs text-amber-400/80 font-medium mt-1">
                    Estimated (benchmark)
                  </p>
                )}
                {!unmeasuredChecked && timeGapMin > 0 && (
                  <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                    {timeGapMin.toFixed(1)} min below Abridge avg
                  </p>
                )}
                {!unmeasuredChecked && timeGapMin <= 0 && (
                  <p className="text-xs text-green-400 font-semibold mt-1">
                    At or above Abridge avg
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-bold text-white/20 leading-none">\u2014</p>
            )}
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <div className="mb-5">
            <p className="text-xs text-white/40 mb-1">Hours Returned Annually</p>
            {bothSet ? (
              <>
                <p className="text-2xl font-bold text-white leading-none" data-testid="panel-hours">
                  {theirHours.toLocaleString()}
                </p>
                {hourGap > 0 && (
                  <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                    +{hourGap.toLocaleString()} hrs available at Abridge avg
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-bold text-white/20 leading-none">\u2014</p>
            )}
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <div>
            <p className="text-xs text-white/40 mb-1">Encounters Documented</p>
            {bothSet ? (
              <>
                <p className="text-2xl font-bold text-white leading-none" data-testid="panel-encounters">
                  {theirEncounters.toLocaleString()}
                </p>
                {encounterGap > 0 && (
                  <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                    +{encounterGap.toLocaleString()} at Abridge avg
                  </p>
                )}
              </>
            ) : (
              <p className="text-2xl font-bold text-white/20 leading-none">\u2014</p>
            )}
          </div>

          {bothSet && (
            <>
              <div className="h-px bg-white/10 my-5" />
              <p className="text-xs text-white/30 italic leading-relaxed">
                Abridge benchmarks: 76% utilization, 3.0 min/encounter. Based on production deployment data.
              </p>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {bothSet && (
          <motion.div
            className="block lg:hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6" data-testid="card-live-summary-mobile">
              <p className="text-[11px] font-medium text-white/60 uppercase tracking-[1.5px] mb-4">Your Performance</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Utilization</p>
                  <p className="text-2xl font-bold text-white">{utilization}%</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Time Saved</p>
                  <p className="text-2xl font-bold text-white">{safeTime.toFixed(1)} min</p>
                  {unmeasuredChecked && (
                    <p className="text-[10px] text-amber-400/80 mt-0.5">Estimated</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Hours Returned</p>
                  <p className="text-xl font-bold text-white">{theirHours.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Gap to Benchmark</p>
                  <p className="text-xl font-bold text-[#EA2C00]">+{hourGap.toLocaleString()} hrs</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
