import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";

type Props = ExploreCalcComponentProps;

export default function AdmissionCaptureCalc({ state, updateTimeDriverInputs, totalHoursSaved }: Props) {
  const { timeDriverInputs } = state;

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("admissionCapture", state.careSetting ?? "")] ?? 0;

  const edRecoveredPatients = useMemo(() => {
    const lwbsPatients = state.annualEncounters * (timeDriverInputs.edLwbsRate / 100);
    return lwbsPatients * (timeDriverInputs.edLwbsReduction / 100);
  }, [state.annualEncounters, timeDriverInputs.edLwbsRate, timeDriverInputs.edLwbsReduction]);

  const potentialAdmissions = edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100);
  const grossValue = potentialAdmissions * timeDriverInputs.edAdmissionRevenue;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      {!timeDriverInputs.edLwbsEnabled && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800" data-testid="warning-lwbs-disabled">
          Admission Capture uses LWBS recovered patients as its base. Enable LWBS Recovery above to see this value.
        </div>
      )}

      <p className="text-sm text-black mb-4">
        Of the {formatNumber(Math.round(edRecoveredPatients))} recovered ED patients, some will require inpatient admission — generating additional DRG-based revenue.
      </p>

      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Recovered ED patients</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(edRecoveredPatients))}</span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-[#666666]">× Admission rate</span>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={timeDriverInputs.edAdmissionRate}
                onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRate: v })}
                className="h-7 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                data-testid="input-ed-admission-rate"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
          </div>

          <div className="h-px bg-[#E5E5E5] my-2" />

          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Potential admissions</span>
            <span className="font-semibold text-black">{potentialAdmissions.toFixed(1)}</span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-[#666666]">× Avg admission revenue</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={timeDriverInputs.edAdmissionRevenue}
                onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRevenue: v })}
                className="h-7 w-20 text-center text-base bg-white border border-[#E5E5E5] rounded"
                data-testid="input-ed-admission-revenue"
              />
            </div>
          </div>

          <div className="h-px bg-[#E5E5E5] my-2" />

          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Gross value</span>
            <span className="font-semibold text-black">{formatCurrency(grossValue)}</span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div>
              <span className="text-[#666666]">× Realization rate</span>
              <p className="text-xs text-[#888888]">(Bed availability, payer mix)</p>
            </div>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={timeDriverInputs.edAdmissionRealization}
                onChange={(v: number) => updateTimeDriverInputs({ edAdmissionRealization: v })}
                className="h-7 w-16 text-center text-base bg-white border border-[#E5E5E5] rounded"
                data-testid="input-ed-admission-realization"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
          </div>

          <div className="h-px bg-[#333333] my-2" />

          <div className="flex justify-between gap-2">
            <span className="font-semibold text-black">Net Admission Value</span>
            <span className="font-bold text-[#EA2C00] flex-shrink-0">{formatCurrency(value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
