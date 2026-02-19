import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DS } from "./designTokens";
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
        : "bg-[#F5F0EB] border-[#E8E0D8] text-[#9B9B9B]"
    }`}>
      <span className={`font-bold text-[13px] ${isRed ? "text-[#EA2C00]" : "text-[#9B9B9B]"}`}>{value}</span>
      <span className={`text-[12px] ${isRed ? "text-[#EA2C00]" : "text-[#9B9B9B]"}`}>{label}</span>
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
    <div className="pt-18 pb-20 font-[Manrope,sans-serif]">
      <motion.div
        className="max-w-2xl mx-auto mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-3" data-testid="text-screen3-label">
          Current Performance
        </p>
        <h1 className="text-[#1A1A1A] font-bold text-4xl md:text-[44px] leading-[1.15] mb-4 hidden md:block" data-testid="text-screen3-headline">
          How is your ambient tool performing today?
        </h1>
        <h1 className="text-[#1A1A1A] font-bold text-[32px] leading-[1.15] mb-4 block md:hidden">
          How is your ambient tool performing today?
        </h1>
        <p className="text-[#4B4B4B] text-[17px] leading-[1.75]">
          Two inputs. These determine your documentation intelligence score.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 max-w-2xl">
          <div className="mb-10">
            <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-2">
              Utilization Rate
            </p>
            <p className="text-[15px] text-[#4B4B4B] mb-6">
              What % of eligible encounters are being documented?
            </p>

            <div className="text-center mb-4">
              <span className="text-[#1A1A1A] font-bold text-[56px] leading-none" data-testid="value-utilization">
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
              <p className="mt-5 text-[13px] text-[#4B4B4B] italic leading-[1.6]" data-testid="text-util-insight">
                {utilInsight}
              </p>
            )}
          </div>

          <motion.div
            className="mb-10"
            animate={{
              opacity: utilMoved ? 1 : 0,
              y: utilMoved ? 0 : 8,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            initial={{ opacity: 0, y: 8 }}
          >
            <div className={utilMoved ? "pointer-events-auto" : "pointer-events-none"}>
              <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-2">
                Time Returned / Encounter
              </p>
              <p className="text-[15px] text-[#4B4B4B] mb-6">
                Minutes saved per documented encounter
              </p>

              <div className="text-center mb-4">
                <span className="text-[#1A1A1A] font-bold text-[56px] leading-none" data-testid="value-time-savings">
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
                <span className="text-[13px] text-[#4B4B4B]">
                  I haven't measured this precisely
                </span>
              </label>
              {unmeasuredChecked && (
                <p className="mt-2 text-[13px] text-[#9B9B9B]">
                  Using industry benchmark: 2.0 min
                </p>
              )}

              {timeInsight && (
                <p className="mt-5 text-[13px] text-[#4B4B4B] italic leading-[1.6]" data-testid="text-time-insight">
                  {timeInsight}
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {bothMoved && (
          <motion.div
            className="hidden lg:block w-[320px] shrink-0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="sticky top-24 flex flex-col gap-4">
              <div className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6" data-testid="card-live-summary">
                <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-5">
                  At Your Current Performance
                </p>

                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="text-[13px] text-[#9B9B9B]">Encounters documented annually</span>
                  <span className="text-[15px] font-bold text-[#1A1A1A]" data-testid="value-their-encounters">
                    {theirEncounters.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-[13px] text-[#9B9B9B]">Hours returned annually</span>
                  <span className="text-[15px] font-bold text-[#1A1A1A]" data-testid="value-their-hours">
                    {theirHours.toLocaleString()}
                  </span>
                </div>

                <div className="h-px bg-[#E8E0D8] mb-4" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[13px] text-[#9B9B9B]">Gap to Abridge benchmark</span>
                  <span className="text-[15px] font-bold text-[#EA2C00]" data-testid="value-hour-gap">
                    +{hourGap.toLocaleString()} hrs / yr
                  </span>
                </div>

                <p className="mt-4 text-[12px] text-[#9B9B9B] italic">
                  Gap vs Abridge avg: 76% utilization, 4.0 min/encounter
                </p>
              </div>

              <div className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6" data-testid="card-comparison">
                <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-5 text-center">
                  How Your Tool Compares
                </p>

                <div className="grid grid-cols-2">
                  <div className="pr-4">
                    <p className="font-abridge text-[10px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-4">Your Current Tool</p>

                    <p className="font-bold text-[24px] text-[#1A1A1A] leading-none mb-1">
                      {utilization}%
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] mb-3">utilization rate</p>
                    <div className="h-px bg-[#E8E0D8] mb-3" />

                    <p className="font-bold text-[24px] text-[#1A1A1A] leading-none mb-1">
                      {timeSavings.toFixed(1)} min
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] mb-3">per encounter</p>
                    <div className="h-px bg-[#E8E0D8] mb-3" />

                    <p className="font-bold text-[20px] text-[#1A1A1A] leading-none mb-1">
                      {theirHours.toLocaleString()} hrs
                    </p>
                    <p className="text-[11px] text-[#9B9B9B]">returned annually</p>
                  </div>

                  <div className="pl-4 border-l-[3px] border-l-[#EA2C00]">
                    <p className="font-abridge text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">Abridge Average</p>

                    <div className="flex items-center flex-wrap gap-1">
                      <p className="font-bold text-[24px] text-[#1A1A1A] leading-none">76%</p>
                      <GapBadge value={ABRIDGE_UTIL - utilization} suffix="pp" />
                    </div>
                    <p className="text-[11px] text-[#9B9B9B] mb-3 mt-1">utilization rate</p>
                    <div className="h-px bg-[#E8E0D8] mb-3" />

                    <div className="flex items-center flex-wrap gap-1">
                      <p className="font-bold text-[24px] text-[#1A1A1A] leading-none">4.0 min</p>
                      <GapBadge value={Math.round((ABRIDGE_TIME - timeSavings) * 10) / 10} suffix=" min" />
                    </div>
                    <p className="text-[11px] text-[#9B9B9B] mb-3 mt-1">per encounter</p>
                    <div className="h-px bg-[#E8E0D8] mb-3" />

                    <div className="flex items-center flex-wrap gap-1">
                      <p className="font-bold text-[20px] text-[#1A1A1A] leading-none">
                        {abridgeHours.toLocaleString()} hrs
                      </p>
                      <GapBadge value={hourGap} suffix=" hrs" />
                    </div>
                    <p className="text-[11px] text-[#9B9B9B] mt-1">returned annually</p>
                  </div>
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
            <div className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6" data-testid="card-live-summary-mobile">
              <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-5">At Your Current Performance</p>
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-[13px] text-[#9B9B9B]">Encounters documented</span>
                <span className="text-[15px] font-bold text-[#1A1A1A]">{theirEncounters.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-[13px] text-[#9B9B9B]">Hours returned</span>
                <span className="text-[15px] font-bold text-[#1A1A1A]">{theirHours.toLocaleString()}</span>
              </div>
              <div className="h-px bg-[#E8E0D8] mb-3" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-[#9B9B9B]">Gap to benchmark</span>
                <span className="text-[15px] font-bold text-[#EA2C00]">+{hourGap.toLocaleString()} hrs / yr</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className={`max-w-2xl mx-auto ${STEP_FOOTER_SPACER_CLASS}`}>
        <StepFooter onBack={onBack} onNext={handleNext} nextLabel="See the Four Domains" nextDisabled={!bothMoved} />
      </div>
    </div>
  );
}
