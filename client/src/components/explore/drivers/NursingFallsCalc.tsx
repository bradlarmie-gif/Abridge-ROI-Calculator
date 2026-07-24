import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";

type Props = ExploreCalcComponentProps;

export default function NursingFallsCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs } = state;

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("nursingFalls", state.careSetting ?? "")] ?? 0;

  const patientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const fallsPerYear = useMemo(() => {
    return (patientDays / 1000) * docQualityInputs.nursingFallsRate;
  }, [patientDays, docQualityInputs.nursingFallsRate]);

  const fallsPrevented = useMemo(() => {
    return fallsPerYear * (docQualityInputs.nursingFallsPreventionRate / 100);
  }, [fallsPerYear, docQualityInputs.nursingFallsPreventionRate]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
      <p className="text-sm text-black mb-6">
        Falls happen when risk status, mobility, and Morse score updates lag behind the patient's actual
        condition. Real-time documentation keeps the chart current so the team can intervene before a fall.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current Falls Volume</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Patient Days/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-falls-patient-days">
            {formatNumber(Math.round(patientDays))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Falls Rate per 1,000</label>
          <FormattedNumberInput
            value={docQualityInputs.nursingFallsRate}
            onChange={(v: number) => updateDocQualityInputs({ nursingFallsRate: v })}
            step={0.1}
            className="h-12 bg-white"
            data-testid="input-falls-rate"
          />
          <p className="text-xs text-[#888888]">National: 3-5 per 1,000</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Falls/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-falls-per-year">
            {fallsPerYear.toFixed(1)}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Documentation-Preventable</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Prevention Rate %</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingFallsPreventionRate}
              onChange={(v: number) => updateDocQualityInputs({ nursingFallsPreventionRate: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-falls-prevention-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">Estimate of falls where documentation timeliness was a contributing factor.</p>
          <p className="text-xs text-[#888888] mt-2">10% reflects a conservative estimate of falls attributable to documentation-timeliness gaps (delayed Morse score updates, missed reassessments). Adjust based on your unit's audit data.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Cost per Fall</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={docQualityInputs.nursingFallsCost}
              onChange={(v: number) => updateDocQualityInputs({ nursingFallsCost: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-falls-cost"
            />
          </div>
          <p className="text-xs text-[#888888]">AHRQ: $6,500 average added cost per inpatient fall.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Falls/year</span>
            <span className="font-semibold text-black">{fallsPerYear.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Prevention rate</span>
            <span className="font-semibold text-black">{docQualityInputs.nursingFallsPreventionRate}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Falls prevented</span>
            <span className="font-semibold text-black">{fallsPrevented.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Cost per fall</span>
            <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingFallsCost)}</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-medium text-black">Potential Falls Value</span>
            <span className="font-bold text-[#EA2C00]" data-testid="text-nursing-falls-value">{formatCurrency(value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
