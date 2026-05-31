import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

export default function NursingOvertimeCalc({ state, updateTimeDriverInputs }: Props) {
  const { timeDriverInputs } = state;

  const otHoursEliminated = useMemo(() => {
    return Math.round(
      timeDriverInputs.nursingOtHoursPerNurseWeek *
      (timeDriverInputs.nursingOtReductionPercent / 100) *
      state.numberOfProviders *
      52
    );
  }, [
    timeDriverInputs.nursingOtHoursPerNurseWeek,
    timeDriverInputs.nursingOtReductionPercent,
    state.numberOfProviders,
  ]);

  const otValue = useMemo(() => {
    return Math.round(otHoursEliminated * timeDriverInputs.nursingOtHourlyRate);
  }, [otHoursEliminated, timeDriverInputs.nursingOtHourlyRate]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
      <p className="text-sm text-[#666666] leading-relaxed mb-6">
        Nurses are doing direct patient care all shift — documentation is supposed to happen in the gaps, but those gaps shrink when acuity rises and ratios tighten. Documentation debt accumulates through the shift and gets paid off on overtime at the end. Abridge moves charting into the patient interaction itself, so the debt doesn't build and nurses leave when their shift ends.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
      <div className="space-y-4 mb-6">
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Post-shift charting hours per nurse per week</label>
          <FormattedNumberInput
            value={timeDriverInputs.nursingOtHoursPerNurseWeek}
            onChange={(v: number) => updateTimeDriverInputs({ nursingOtHoursPerNurseWeek: v })}
            className="h-12 bg-white"
            data-testid="input-nursing-ot-hours-per-week"
          />
          <p className="text-xs text-[#888888]">How many hours per week does a typical nurse stay after their shift specifically to finish charting? On a 3-shift week, 20–30 min/shift = roughly 1–1.5 hrs/week.</p>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">How much can Abridge impact those post-shift hours?</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={70}
              step={5}
              value={timeDriverInputs.nursingOtReductionPercent}
              onChange={(e) => updateTimeDriverInputs({ nursingOtReductionPercent: Number(e.target.value) })}
              className="flex-1 accent-[#EA2C00]"
              data-testid="slider-nursing-ot-reduction"
            />
            <span className="text-sm font-semibold text-black w-12 text-right">{timeDriverInputs.nursingOtReductionPercent}%</span>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {[
              { label: 'Conservative', value: 30 },
              { label: 'Moderate', value: 40 },
              { label: 'Optimistic', value: 50 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => updateTimeDriverInputs({ nursingOtReductionPercent: preset.value })}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  timeDriverInputs.nursingOtReductionPercent === preset.value
                    ? 'bg-[#EA2C00] text-white border-[#EA2C00]'
                    : 'border-[#E5E5E5] text-[#888888] hover:border-[#D1D5DB]'
                }`}
                data-testid={`preset-nursing-ot-${preset.label.toLowerCase()}`}
              >
                {preset.label} ({preset.value}%)
              </button>
            ))}
          </div>
          <p className="text-xs text-[#888888]">Not all post-shift OT is charting-related — some is handoffs, patient events, or admin. This is your estimate of what Abridge can realistically impact.</p>
        </div>

        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Average OT hourly rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={timeDriverInputs.nursingOtHourlyRate}
              onChange={(v: number) => updateTimeDriverInputs({ nursingOtHourlyRate: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-nursing-ot-hourly-rate"
            />
          </div>
          <p className="text-xs text-[#888888]">1.5x base rate is typical. Adjust based on your blended OT rate.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">{state.numberOfProviders} nurses × {timeDriverInputs.nursingOtHoursPerNurseWeek} post-shift hrs/week × 52 weeks</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(state.numberOfProviders * timeDriverInputs.nursingOtHoursPerNurseWeek * 52))} hrs/yr</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">× {timeDriverInputs.nursingOtReductionPercent}% Abridge can impact</span>
            <span className="font-semibold text-black">{formatNumber(otHoursEliminated)} hrs/yr eliminated</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">× ${timeDriverInputs.nursingOtHourlyRate}/hr OT rate</span>
            <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingOtHourlyRate)}</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] font-medium">Annual OT Savings</span>
            <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-nursing-overtime-value">{formatCurrency(otValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
