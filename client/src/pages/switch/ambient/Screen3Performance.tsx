import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

const ABRIDGE_UTIL = 76;
const ABRIDGE_TIME = 4.0;

function GapBadge({ value, suffix }: { value: number; suffix: string }) {
  if (value <= 0) return null;
  return (
    <span
      className="inline-flex items-center bg-[#EA2C00]/10 rounded-full px-2 py-0.5 text-[11px] font-bold text-[#EA2C00] ml-1.5 whitespace-nowrap"
      data-testid="badge-gap"
    >
      +{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
    </span>
  );
}

function BenchmarkPill({ value, label, isRed }: { value: string; label: string; isRed?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
      isRed
        ? "bg-white border-[#EA2C00] text-[#EA2C00]"
        : "bg-white border-[#E5E7EB] text-[#888888]"
    }`}>
      <span className={`font-bold text-sm ${isRed ? "text-[#EA2C00]" : "text-[#888888]"}`}>{value}</span>
      <span className={`text-xs ${isRed ? "text-[#EA2C00]" : "text-[#888888]"}`}>{label}</span>
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
    if (utilization < 45) return `Below industry average — significant headroom to benchmark.`;
    if (utilization <= 60) return `Near industry average — ${encounterGap.toLocaleString()} encounter gap to Abridge benchmark.`;
    if (utilization <= 75) return `Above average — ${encounterGap.toLocaleString()} encounter gap to close.`;
    return "At or above Abridge benchmark — strong utilization.";
  }, [utilMoved, utilization, encounterGap]);

  const timeInsight = useMemo(() => {
    if (!timeMoved) return null;
    const hoursGapCalc = Math.round((theirEncounters * Math.max(0, ABRIDGE_TIME - timeSavings)) / 60);
    if (timeSavings < 2.0) return `Below typical range — ${hoursGapCalc.toLocaleString()} hour gap to Abridge benchmark.`;
    if (timeSavings <= 3.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Within typical range — ${gap} min gap represents ${hoursGapCalc.toLocaleString()} hours.`;
    }
    if (timeSavings < 4.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Above average — ${gap} min to Abridge benchmark.`;
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

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-screen3-headline">
          Current Performance
        </h1>
        <p className="text-base text-[#888888]">
          Two inputs. These determine your documentation intelligence score.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">
          <motion.div
            className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Utilization Rate
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />
            <p className="text-sm text-black mb-6">
              What % of eligible encounters are being documented?
            </p>

            <div className="text-center mb-4">
              <span className="text-5xl font-bold text-black" data-testid="value-utilization">
                {utilization}%
              </span>
            </div>

            <input
              type="range"
              min={10}
              max={95}
              step={5}
              value={utilization}
              onChange={(e) => handleUtilChange(parseInt(e.target.value))}
              className="w-full accent-[#1A1A1A] h-1"
              data-testid="slider-utilization"
            />

            <div className="flex items-center justify-center mt-4 gap-3 flex-wrap">
              <BenchmarkPill value="45%" label="Industry avg" />
              <BenchmarkPill value="76%" label="Abridge avg" isRed />
            </div>

            {utilInsight && (
              <p className="mt-5 text-sm text-[#888888] italic leading-relaxed" data-testid="text-util-insight">
                {utilInsight}
              </p>
            )}
          </motion.div>

          <motion.div
            className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8"
            animate={{
              opacity: utilMoved ? 1 : 0.3,
              y: utilMoved ? 0 : 8,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            initial={{ opacity: 0.3, y: 8 }}
          >
            <div className={utilMoved ? "pointer-events-auto" : "pointer-events-none"}>
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Time Returned / Encounter
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />
              <p className="text-sm text-black mb-6">
                Minutes saved per documented encounter
              </p>

              <div className="text-center mb-4">
                <span className="text-5xl font-bold text-black" data-testid="value-time-savings">
                  {timeSavings.toFixed(1)} min
                </span>
              </div>

              <input
                type="range"
                min={0.5}
                max={6.0}
                step={0.25}
                value={timeSavings}
                onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
                className="w-full accent-[#1A1A1A] h-1"
                data-testid="slider-time-savings"
              />

              <div className="flex items-center justify-center mt-4 gap-3 flex-wrap">
                <BenchmarkPill value="1.5–2.5 min" label="Most tools" />
                <BenchmarkPill value="4.0 min" label="Abridge avg" isRed />
              </div>

              <label className="flex items-center gap-2.5 mt-4 cursor-pointer" data-testid="checkbox-unmeasured">
                <input
                  type="checkbox"
                  checked={unmeasuredChecked}
                  onChange={handleUnmeasuredToggle}
                  className="accent-[#1A1A1A] w-4 h-4"
                />
                <span className="text-sm text-[#888888]">
                  I haven't measured this precisely
                </span>
              </label>
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
        </div>

        {bothMoved && (
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px] mb-4">
                At Your Current Performance
              </p>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-white/50">Encounters documented</span>
                  <span className="text-white font-semibold" data-testid="value-their-encounters">
                    {theirEncounters.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Hours returned annually</span>
                  <span className="text-white font-semibold" data-testid="value-their-hours">
                    {theirHours.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/10 my-4" />

              <div className="flex justify-between text-sm">
                <span className="text-white/50">Gap to Abridge benchmark</span>
                <span className="text-[#EA2C00] font-bold" data-testid="value-hour-gap">
                  +{hourGap.toLocaleString()} hrs
                </span>
              </div>

              <p className="mt-4 text-xs text-white/40 italic">
                Gap vs Abridge avg: 76% utilization, 4.0 min/encounter
              </p>

              <div className="h-px bg-white/10 my-5" />

              <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
                How Your Tool Compares
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">Your Tool</p>
                  <p className="text-2xl font-bold text-white leading-none mb-1">{utilization}%</p>
                  <p className="text-xs text-white/40 mb-3">utilization</p>
                  <p className="text-2xl font-bold text-white leading-none mb-1">{timeSavings.toFixed(1)} min</p>
                  <p className="text-xs text-white/40 mb-3">per encounter</p>
                  <p className="text-lg font-bold text-white leading-none">{theirHours.toLocaleString()} hrs</p>
                  <p className="text-xs text-white/40">returned / yr</p>
                </div>

                <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                  <p className="text-[10px] font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-3">Abridge Avg</p>
                  <div className="flex items-center flex-wrap gap-1">
                    <p className="text-2xl font-bold text-white leading-none">76%</p>
                    <GapBadge value={ABRIDGE_UTIL - utilization} suffix="pp" />
                  </div>
                  <p className="text-xs text-white/40 mb-3 mt-1">utilization</p>
                  <div className="flex items-center flex-wrap gap-1">
                    <p className="text-2xl font-bold text-white leading-none">4.0 min</p>
                    <GapBadge value={Math.round((ABRIDGE_TIME - timeSavings) * 10) / 10} suffix=" min" />
                  </div>
                  <p className="text-xs text-white/40 mb-3 mt-1">per encounter</p>
                  <div className="flex items-center flex-wrap gap-1">
                    <p className="text-lg font-bold text-white leading-none">{abridgeHours.toLocaleString()} hrs</p>
                    <GapBadge value={hourGap} suffix=" hrs" />
                  </div>
                  <p className="text-xs text-white/40 mt-1">returned / yr</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {bothMoved && (
          <motion.div
            className="block lg:hidden mt-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6" data-testid="card-live-summary-mobile">
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px] mb-4">At Your Current Performance</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Encounters documented</span>
                  <span className="text-white font-semibold">{theirEncounters.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Hours returned</span>
                  <span className="text-white font-semibold">{theirHours.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-px bg-white/10 my-3" />
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Gap to benchmark</span>
                <span className="text-[#EA2C00] font-bold">+{hourGap.toLocaleString()} hrs / yr</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="max-w-[700px]">
        <StepFooter onBack={onBack} onNext={handleNext} nextLabel="See the Four Domains" nextDisabled={!bothMoved} />
      </div>
    </div>
  );
}
