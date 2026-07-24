import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";

type Props = ExploreCalcComponentProps;

export default function NursingHapiCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs } = state;

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("nursingHapi", state.careSetting ?? "")] ?? 0;

  const patientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const hapisPerYear = useMemo(() => {
    return (patientDays / 1000) * docQualityInputs.nursingHapiRate;
  }, [patientDays, docQualityInputs.nursingHapiRate]);

  const hapisPrevented = useMemo(() => {
    return hapisPerYear * (docQualityInputs.nursingHapiPreventionRate / 100);
  }, [hapisPerYear, docQualityInputs.nursingHapiPreventionRate]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
      <p className="text-sm text-black mb-6">
        HAPIs happen when assessments are missed or interventions are delayed. Real-time documentation
        captures skin assessments, turning schedules, and risk factors as they're observed, which can
        support earlier intervention.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current HAPI Volume</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Patient Days/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-hapi-patient-days">
            {formatNumber(Math.round(patientDays))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">HAPI Rate per 1,000</label>
          <FormattedNumberInput
            value={docQualityInputs.nursingHapiRate}
            onChange={(v: number) => updateDocQualityInputs({ nursingHapiRate: v })}
            step={0.1}
            className="h-12 bg-white"
            data-testid="input-hapi-rate"
          />
          <p className="text-xs text-[#888888]">National: 2-5%</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">HAPIs/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-hapis-per-year">
            {hapisPerYear.toFixed(1)}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Documentation-Preventable</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Prevention Rate %</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingHapiPreventionRate}
              onChange={(v: number) => updateDocQualityInputs({ nursingHapiPreventionRate: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-hapi-prevention-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">Dowding et al. (JAMIA 2012) found ~13% reduction with documentation tech; we model 6.5% as Abridge's attributable share.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Cost per HAPI</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={docQualityInputs.nursingHapiCost}
              onChange={(v: number) => updateDocQualityInputs({ nursingHapiCost: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-hapi-cost"
            />
          </div>
          <p className="text-xs text-[#888888]">CMS: $20K-$70K depending on stage. $25K is a conservative blended average.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">HAPIs/year</span>
            <span className="font-semibold text-black">{hapisPerYear.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Prevention rate</span>
            <span className="font-semibold text-black">{docQualityInputs.nursingHapiPreventionRate}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= HAPIs prevented</span>
            <span className="font-semibold text-black">{hapisPrevented.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Cost per HAPI</span>
            <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingHapiCost)}</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-medium text-black">Potential HAPI Value</span>
            <span className="font-bold text-[#EA2C00]" data-testid="text-nursing-hapi-value">{formatCurrency(value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
