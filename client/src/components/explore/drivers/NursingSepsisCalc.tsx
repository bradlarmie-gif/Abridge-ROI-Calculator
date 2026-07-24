import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";

type Props = ExploreCalcComponentProps;

export default function NursingSepsisCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs } = state;

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("nursingSepsis", state.careSetting ?? "")] ?? 0;

  const patientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  const sepsisPerYear = useMemo(() => {
    return (patientDays / 1000) * docQualityInputs.nursingSepsisRatePerThousand;
  }, [patientDays, docQualityInputs.nursingSepsisRatePerThousand]);

  const nonCompliant = useMemo(() => {
    return sepsisPerYear * ((100 - docQualityInputs.nursingSepsisCurrentCompliance) / 100);
  }, [sepsisPerYear, docQualityInputs.nursingSepsisCurrentCompliance]);

  const docLagCases = useMemo(() => {
    return nonCompliant * (docQualityInputs.nursingSepsisDocLagPercent / 100);
  }, [nonCompliant, docQualityInputs.nursingSepsisDocLagPercent]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
      <p className="text-sm text-black mb-6">
        SEP-1 bundle compliance hinges on time-stamped documentation of vitals, labs, and antibiotics.
        Real-time documentation reduces the documentation lag that often drives bundle non-compliance —
        and the excess cost that follows.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current Sepsis Volume</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Patient Days/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-sepsis-patient-days">
            {formatNumber(Math.round(patientDays))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Sepsis Rate per 1,000</label>
          <FormattedNumberInput
            value={docQualityInputs.nursingSepsisRatePerThousand}
            onChange={(v: number) => updateDocQualityInputs({ nursingSepsisRatePerThousand: v })}
            step={0.1}
            className="h-12 bg-white"
            data-testid="input-sepsis-rate"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Sepsis Cases/Year</label>
          <div className="h-12 bg-white rounded-md flex items-center px-3 text-sm font-semibold text-black" data-testid="display-sepsis-per-year">
            {sepsisPerYear.toFixed(1)}
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Bundle Compliance & Documentation Lag</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Current Bundle Compliance %</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingSepsisCurrentCompliance}
              onChange={(v: number) => updateDocQualityInputs({ nursingSepsisCurrentCompliance: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-sepsis-compliance"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">SEP-1 national avg: ~70-80%.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">% of Non-Compliant from Doc Lag</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingSepsisDocLagPercent}
              onChange={(v: number) => updateDocQualityInputs({ nursingSepsisDocLagPercent: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-sepsis-doc-lag"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">Share of misses where documentation timeliness was the contributing factor.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Excess Cost per Non-Compliant Case</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={docQualityInputs.nursingSepsisExcessCostPerCase}
              onChange={(v: number) => updateDocQualityInputs({ nursingSepsisExcessCostPerCase: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-sepsis-excess-cost"
            />
          </div>
          <p className="text-xs text-[#888888]">Excess LOS + ICU + readmission cost per non-compliant case.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#888888]">Realization %</label>
          <div className="relative">
            <FormattedNumberInput
              value={docQualityInputs.nursingSepsisRealization}
              onChange={(v: number) => updateDocQualityInputs({ nursingSepsisRealization: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-sepsis-realization"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">Conservative haircut on attributable savings.</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Sepsis cases/year</span>
            <span className="font-semibold text-black">{sepsisPerYear.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Non-compliance rate</span>
            <span className="font-semibold text-black">{(100 - docQualityInputs.nursingSepsisCurrentCompliance)}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Doc-lag share</span>
            <span className="font-semibold text-black">{docQualityInputs.nursingSepsisDocLagPercent}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Doc-lag cases</span>
            <span className="font-semibold text-black">{docLagCases.toFixed(1)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Excess cost / case</span>
            <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingSepsisExcessCostPerCase)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">x Realization</span>
            <span className="font-semibold text-black">{docQualityInputs.nursingSepsisRealization}%</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-medium text-black">Potential Sepsis Value</span>
            <span className="font-bold text-[#EA2C00]" data-testid="text-nursing-sepsis-value">{formatCurrency(value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
