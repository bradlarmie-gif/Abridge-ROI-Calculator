import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";

type Props = ExploreCalcComponentProps;

export default function NursingClabsiCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs } = state;

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("nursingClabsi", state.careSetting ?? "")] ?? 0;

  const patientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const lineDays = useMemo(() => {
    return patientDays * (docQualityInputs.nursingClabsiUtilizationRatio / 100);
  }, [patientDays, docQualityInputs.nursingClabsiUtilizationRatio]);

  const clabsiPerYear = useMemo(() => {
    return (lineDays / 1000) * docQualityInputs.nursingClabsiRate;
  }, [lineDays, docQualityInputs.nursingClabsiRate]);

  const clabsiPrevented = useMemo(() => {
    return clabsiPerYear * (docQualityInputs.nursingClabsiPreventionRate / 100);
  }, [clabsiPerYear, docQualityInputs.nursingClabsiPreventionRate]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
      <p className="text-sm text-black mb-6">
        Central line-associated bloodstream infections are largely preventable through bundle compliance.
        Daily documentation of line necessity and dressing changes drives earlier removal and bundle adherence.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current CLABSI Volume</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Central Line Utilization (% of patient days)</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingClabsiUtilizationRatio}
              onChange={(v: number) => updateDocQualityInputs({ nursingClabsiUtilizationRatio: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-clabsi-utilization"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">National: ~15-25% of patient days.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">CLABSI Rate per 1,000 line days</label>
          <FormattedNumberInput
            value={docQualityInputs.nursingClabsiRate}
            onChange={(v: number) => updateDocQualityInputs({ nursingClabsiRate: v })}
            step={0.1}
            className="h-12 bg-white"
            data-testid="input-clabsi-rate"
          />
          <p className="text-xs text-[#888888]">NHSN national benchmark: 0.5–1.0 per 1,000 line days. 8% prevention rate reflects estimated improvement from timely line-care bundle documentation and adherence tracking.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Line Days/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-line-days">
            {formatNumber(Math.round(lineDays))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">CLABSIs/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-clabsi-per-year">
            {clabsiPerYear.toFixed(1)}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Documentation-Preventable</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Prevention Rate %</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingClabsiPreventionRate}
              onChange={(v: number) => updateDocQualityInputs({ nursingClabsiPreventionRate: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-clabsi-prevention-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">Share where documentation timeliness contributes.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Cost per CLABSI</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={docQualityInputs.nursingClabsiCost}
              onChange={(v: number) => updateDocQualityInputs({ nursingClabsiCost: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-clabsi-cost"
            />
          </div>
          <p className="text-xs text-[#888888]">CDC: $20K-$45K average added cost per CLABSI.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">CLABSIs/year</span>
            <span className="font-semibold text-black">{clabsiPerYear.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Prevention rate</span>
            <span className="font-semibold text-black">{docQualityInputs.nursingClabsiPreventionRate}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= CLABSIs prevented</span>
            <span className="font-semibold text-black">{clabsiPrevented.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Cost per CLABSI</span>
            <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingClabsiCost)}</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-medium text-black">Potential CLABSI Value</span>
            <span className="font-bold text-[#EA2C00]" data-testid="text-nursing-clabsi-value">{formatCurrency(value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
