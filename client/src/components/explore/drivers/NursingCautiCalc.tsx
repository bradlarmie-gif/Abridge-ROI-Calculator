import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

export default function NursingCautiCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs } = state;

  const patientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const catheterDays = useMemo(() => {
    return patientDays * (docQualityInputs.nursingCautiUtilizationRatio / 100);
  }, [patientDays, docQualityInputs.nursingCautiUtilizationRatio]);

  const cautisPerYear = useMemo(() => {
    return (catheterDays / 1000) * docQualityInputs.nursingCautiRate;
  }, [catheterDays, docQualityInputs.nursingCautiRate]);

  const cautisPrevented = useMemo(() => {
    return cautisPerYear * (docQualityInputs.nursingCautiPreventionRate / 100);
  }, [cautisPerYear, docQualityInputs.nursingCautiPreventionRate]);

  const cautiValue = useMemo(() => {
    return cautisPrevented * docQualityInputs.nursingCautiCost;
  }, [cautisPrevented, docQualityInputs.nursingCautiCost]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
      <p className="text-sm text-black mb-6">
        Catheter-associated UTIs are largely preventable when catheter necessity is documented daily and
        bundle compliance is consistent. Real-time documentation supports earlier removal and prevention
        bundle adherence.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current CAUTI Volume</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Catheter Utilization (% of patient days)</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingCautiUtilizationRatio}
              onChange={(v: number) => updateDocQualityInputs({ nursingCautiUtilizationRatio: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-cauti-utilization"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">National: ~20-30% of patient days.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">CAUTI Rate per 1,000 catheter days</label>
          <FormattedNumberInput
            value={docQualityInputs.nursingCautiRate}
            onChange={(v: number) => updateDocQualityInputs({ nursingCautiRate: v })}
            step={0.1}
            className="h-12 bg-white"
            data-testid="input-cauti-rate"
          />
          <p className="text-xs text-[#888888]">National benchmark: 1-2 per 1,000.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Catheter Days/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-catheter-days">
            {formatNumber(Math.round(catheterDays))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">CAUTIs/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-cautis-per-year">
            {cautisPerYear.toFixed(1)}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Documentation-Preventable</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Prevention Rate %</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingCautiPreventionRate}
              onChange={(v: number) => updateDocQualityInputs({ nursingCautiPreventionRate: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-cauti-prevention-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">Share of CAUTIs where documentation timeliness contributes.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Cost per CAUTI</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={docQualityInputs.nursingCautiCost}
              onChange={(v: number) => updateDocQualityInputs({ nursingCautiCost: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-cauti-cost"
            />
          </div>
          <p className="text-xs text-[#888888]">CDC: $13K average added cost per CAUTI.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">CAUTIs/year</span>
            <span className="font-semibold text-black">{cautisPerYear.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Prevention rate</span>
            <span className="font-semibold text-black">{docQualityInputs.nursingCautiPreventionRate}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= CAUTIs prevented</span>
            <span className="font-semibold text-black">{cautisPrevented.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Cost per CAUTI</span>
            <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingCautiCost)}</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-medium text-black">Potential CAUTI Value</span>
            <span className="font-bold text-[#EA2C00]" data-testid="text-nursing-cauti-value">{formatCurrency(cautiValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
