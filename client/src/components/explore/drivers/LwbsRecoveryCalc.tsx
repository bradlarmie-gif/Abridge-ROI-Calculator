import { useMemo } from "react";
import { Info } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "@/pages/explore/ExploreFlow";

interface Props {
  state: ExploreState;
  updateTimeDriverInputs: (updates: Partial<ExploreState['timeDriverInputs']>) => void;
}

export default function LwbsRecoveryCalc({ state, updateTimeDriverInputs }: Props) {
  const { timeDriverInputs } = state;

  const edRecoveredPatients = useMemo(() => {
    const lwbsPatients = state.annualEncounters * (timeDriverInputs.edLwbsRate / 100);
    return lwbsPatients * (timeDriverInputs.edLwbsReduction / 100);
  }, [state.annualEncounters, timeDriverInputs.edLwbsRate, timeDriverInputs.edLwbsReduction]);

  const edLwbsValue = useMemo(() => {
    const grossValue = edRecoveredPatients * timeDriverInputs.edRevenuePerVisit;
    return Math.round(grossValue * (timeDriverInputs.edLwbsRealization / 100));
  }, [edRecoveredPatients, timeDriverInputs.edRevenuePerVisit, timeDriverInputs.edLwbsRealization]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-black mb-4">
        Faster documentation reduces door-to-doc time and overall wait times. When patients wait less, fewer leave without being seen.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your ED</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Current LWBS rate</label>
          <div className="relative">
            <FormattedNumberInput
              value={timeDriverInputs.edLwbsRate}
              placeholder="e.g., 3"
              onChange={(v: number) => updateTimeDriverInputs({ edLwbsRate: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-ed-lwbs-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">National average: 2-5%. High-volume urban EDs may exceed 5%.</p>
        </div>
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Revenue per ED visit</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={timeDriverInputs.edRevenuePerVisit}
              placeholder="e.g., 350"
              onChange={(v: number) => updateTimeDriverInputs({ edRevenuePerVisit: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-ed-revenue-per-visit"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <label className="text-sm text-[#888888]">Expected LWBS reduction from faster documentation</label>
          <span className="text-sm font-semibold text-black">{timeDriverInputs.edLwbsReduction}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={40}
          step={1}
          value={timeDriverInputs.edLwbsReduction}
          onChange={(e) => updateTimeDriverInputs({ edLwbsReduction: Number(e.target.value) })}
          className="w-full accent-[#EA2C00]"
          data-testid="input-ed-lwbs-reduction"
        />
        <div className="flex gap-2">
          {[
            { label: 'Conservative', value: 10 },
            { label: 'Moderate', value: 20 },
            { label: 'Optimistic', value: 30 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => updateTimeDriverInputs({ edLwbsReduction: preset.value })}
              className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
                timeDriverInputs.edLwbsReduction === preset.value
                  ? 'bg-[#EA2C00] text-white'
                  : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
              }`}
              data-testid={`button-lwbs-preset-${preset.label.toLowerCase()}`}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">{preset.value}%</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[#888888]">
          Door-to-doc time is the strongest predictor of LWBS rates (Welch et al., Annals of Emergency Medicine). Faster documentation directly reduces door-to-doc time, lowering the probability that patients leave before being seen.
        </p>
        <div className="bg-[#F5F0EB] rounded-lg p-3">
          <p className="text-xs text-[#666666]">
            Your ED currently sees ~<span className="font-semibold text-black">{formatNumber(Math.round(state.annualEncounters * (timeDriverInputs.edLwbsRate / 100)))}</span> LWBS patients/year. At {timeDriverInputs.edLwbsReduction}% reduction, Abridge would recover ~<span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients))}</span> patients.
          </p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>

      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Annual LWBS patients</span>
            <span className="font-semibold text-black flex-shrink-0">{formatNumber(Math.round(state.annualEncounters * (timeDriverInputs.edLwbsRate / 100)))}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× LWBS reduction</span>
            <span className="font-semibold text-black flex-shrink-0">{timeDriverInputs.edLwbsReduction}%</span>
          </div>

          <div className="h-px bg-[#E5E5E5] my-2" />

          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Patients recovered</span>
            <span className="font-semibold text-black flex-shrink-0">{formatNumber(Math.round(edRecoveredPatients))}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× Revenue per visit</span>
            <span className="font-semibold text-black flex-shrink-0">{formatCurrency(timeDriverInputs.edRevenuePerVisit)}</span>
          </div>

          <div className="h-px bg-[#E5E5E5] my-2" />

          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Gross value</span>
            <span className="font-semibold text-black flex-shrink-0">{formatCurrency(Math.round(edRecoveredPatients * timeDriverInputs.edRevenuePerVisit))}</span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div>
              <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" /></span>
              <p className="text-xs text-[#888888]">(Not all recovered patients complete visits)</p>
            </div>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={timeDriverInputs.edLwbsRealization}
                onChange={(v: number) => updateTimeDriverInputs({ edLwbsRealization: v })}
                className="h-7 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                data-testid="input-ed-lwbs-realization"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
          </div>

          <div className="h-px bg-[#333333] my-2" />

          <div className="flex justify-between gap-2">
            <span className="font-semibold text-black">Net LWBS Value</span>
            <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(edLwbsValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
