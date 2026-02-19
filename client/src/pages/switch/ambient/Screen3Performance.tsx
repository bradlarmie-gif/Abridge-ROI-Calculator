import { useState, useMemo } from "react";
import { motion } from "framer-motion";
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

function BenchmarkPill({ value, label, variant }: { value: string; label: string; variant: "neutral" | "abridge" }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs ${
      variant === "abridge"
        ? "bg-[#EA2C00]/8 border border-[#EA2C00]/25 text-[#EA2C00] font-semibold"
        : "bg-[#F0EFED] border border-[#E5E7EB] text-[#888888] font-medium"
    }`}>
      <span className="font-bold">{value}</span>
      <span>{label}</span>
    </div>
  );
}

export default function Screen3Performance({ onNext, onBack }: Screen3Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

  const [utilization, setUtilization] = useState(inputs.utilization || 50);
  const [timeSavings, setTimeSavings] = useState(inputs.timeSavedPerEncounter || 2.0);
  const [utilMoved, setUtilMoved] = useState(false);
  const [timeMoved, setTimeMoved] = useState(false);
  const [unmeasuredChecked, setUnmeasuredChecked] = useState(false);

  const bothMoved = utilMoved && timeMoved;

  const theirEncounters = Math.round(inputs.annualEncounters * (utilization / 100));
  const abridgeEncounters = Math.round(inputs.annualEncounters * (ABRIDGE_UTIL / 100));
  const encounterGap = Math.max(0, abridgeEncounters - theirEncounters);

  const theirHours = Math.round((theirEncounters * timeSavings) / 60);
  const abridgeHours = Math.round((abridgeEncounters * ABRIDGE_TIME) / 60);
  const hourGap = Math.max(0, abridgeHours - theirHours);

  const utilInsight = useMemo(() => {
    if (!utilMoved) return null;
    if (utilization < 45) return `Below industry average \u2014 significant headroom to benchmark.`;
    if (utilization <= 60) return `Near industry average \u2014 ${encounterGap.toLocaleString()} encounter gap to Abridge benchmark.`;
    if (utilization <= 75) return `Above average \u2014 ${encounterGap.toLocaleString()} encounter gap to close.`;
    return "At or above Abridge benchmark \u2014 strong utilization.";
  }, [utilMoved, utilization, encounterGap]);

  const timeInsight = useMemo(() => {
    if (!timeMoved) return null;
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
  }, [timeMoved, timeSavings, theirEncounters]);

  const handleUtilChange = (val: number) => {
    setUtilization(val);
    if (!utilMoved) setUtilMoved(true);
  };

  const handleTimeChange = (val: number) => {
    setTimeSavings(val);
    if (!timeMoved) setTimeMoved(true);
    if (unmeasuredChecked) setUnmeasuredChecked(false);
  };

  const handleUnmeasuredToggle = () => {
    const next = !unmeasuredChecked;
    setUnmeasuredChecked(next);
    if (next) {
      setTimeSavings(2.0);
      if (!timeMoved) setTimeMoved(true);
    }
  };

  const handleNext = () => {
    dispatch(assessmentActions.updateInput('utilization', utilization));
    dispatch(assessmentActions.updateInput('timeSavedPerEncounter', timeSavings));
    onNext();
  };

  const utilGapPp = Math.max(0, ABRIDGE_UTIL - utilization);
  const timeGapMin = Math.max(0, Math.round((ABRIDGE_TIME - timeSavings) * 10) / 10);

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

            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-black" data-testid="value-utilization">
                {utilization}%
              </span>
            </div>

            <Slider
              min={10}
              max={95}
              step={5}
              value={[utilization]}
              onValueChange={(v) => handleUtilChange(v[0])}
              className="w-full"
              data-testid="slider-utilization"
            />

            <div className="flex items-center justify-center mt-5 gap-3 flex-wrap">
              <BenchmarkPill value="45%" label="Industry avg" variant="neutral" />
              <BenchmarkPill value="76%" label="Abridge avg" variant="abridge" />
            </div>

            {utilInsight && (
              <p className="mt-5 text-sm text-[#888888] italic leading-relaxed" data-testid="text-util-insight">
                {utilInsight}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div
            className={`bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-6 transition-opacity duration-300 ${
              utilMoved ? "opacity-100" : "opacity-30 pointer-events-none"
            }`}
          >
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Time Returned / Encounter
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />
            <p className="text-sm text-black mb-6">
              Minutes saved per documented encounter
            </p>

            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-black" data-testid="value-time-savings">
                {timeSavings.toFixed(1)} min
              </span>
            </div>

            <Slider
              min={0.5}
              max={6.0}
              step={0.25}
              value={[timeSavings]}
              onValueChange={(v) => handleTimeChange(v[0])}
              className="w-full"
              data-testid="slider-time-savings"
            />

            <div className="flex items-center justify-center mt-5 gap-3 flex-wrap">
              <BenchmarkPill value="1.5\u20132.5 min" label="Most tools" variant="neutral" />
              <BenchmarkPill value="3.0 min" label="Abridge avg" variant="abridge" />
            </div>

            <div className="flex items-center gap-2.5 mt-5" data-testid="checkbox-unmeasured">
              <Checkbox
                id="unmeasured"
                checked={unmeasuredChecked}
                onCheckedChange={() => handleUnmeasuredToggle()}
              />
              <label htmlFor="unmeasured" className="text-sm text-[#525252] cursor-pointer select-none">
                I haven't measured this precisely
              </label>
            </div>
            {unmeasuredChecked && (
              <p className="mt-2 text-sm text-[#888888]">
                Using industry benchmark: 2.0 min
              </p>
            )}

            {timeInsight && (
              <p className="mt-5 text-sm text-[#888888] italic leading-relaxed" data-testid="text-time-insight">
                {timeInsight}
              </p>
            )}
          </div>
        </motion.div>

        <div className="max-w-[700px]">
          <StepFooter onBack={onBack} onNext={handleNext} nextLabel="See the Four Domains" nextDisabled={!bothMoved} />
        </div>
      </motion.div>

      <div className="w-full lg:w-[320px] flex-shrink-0 hidden lg:block">
        <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
          <p className="text-[11px] font-medium text-white/60 uppercase tracking-[1.5px] mb-6">
            Your Inputs
          </p>

          <div className="mb-5">
            <p className="text-xs text-white/40 mb-1">Utilization Rate</p>
            <p className="text-3xl font-bold text-white leading-none" data-testid="panel-utilization">
              {utilization}%
            </p>
            {utilMoved && utilGapPp > 0 && (
              <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                {utilGapPp}pp below Abridge avg
              </p>
            )}
            {utilMoved && utilGapPp <= 0 && (
              <p className="text-xs text-green-400 font-semibold mt-1">
                At or above Abridge avg
              </p>
            )}
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <div className="mb-5">
            <p className="text-xs text-white/40 mb-1">Time Saved / Encounter</p>
            <p className="text-3xl font-bold text-white leading-none" data-testid="panel-time-savings">
              {timeSavings.toFixed(1)} min
            </p>
            {timeMoved && timeGapMin > 0 && (
              <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                {timeGapMin.toFixed(1)} min below Abridge avg
              </p>
            )}
            {timeMoved && timeGapMin <= 0 && (
              <p className="text-xs text-green-400 font-semibold mt-1">
                At or above Abridge avg
              </p>
            )}
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <div className="mb-5">
            <p className="text-xs text-white/40 mb-1">Hours Returned Annually</p>
            <p className="text-2xl font-bold text-white leading-none" data-testid="panel-hours">
              {theirHours.toLocaleString()}
            </p>
            {bothMoved && hourGap > 0 && (
              <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                +{hourGap.toLocaleString()} hrs available at Abridge avg
              </p>
            )}
          </div>

          <div className="h-px bg-white/10 mb-5" />

          <div>
            <p className="text-xs text-white/40 mb-1">Encounters Documented</p>
            <p className="text-2xl font-bold text-white leading-none" data-testid="panel-encounters">
              {theirEncounters.toLocaleString()}
            </p>
            {bothMoved && encounterGap > 0 && (
              <p className="text-xs text-[#EA2C00] font-semibold mt-1">
                +{encounterGap.toLocaleString()} at Abridge avg
              </p>
            )}
          </div>

          {bothMoved && (
            <>
              <div className="h-px bg-white/10 my-5" />
              <p className="text-xs text-white/30 italic leading-relaxed">
                Abridge benchmarks: 76% utilization, 3.0 min/encounter. Based on production deployment data.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Mobile summary - only after both inputs */}
      {bothMoved && (
        <motion.div
          className="block lg:hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
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
                <p className="text-2xl font-bold text-white">{timeSavings.toFixed(1)} min</p>
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
    </div>
  );
}
