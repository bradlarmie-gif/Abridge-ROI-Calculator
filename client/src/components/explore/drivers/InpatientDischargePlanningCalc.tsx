import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

const LAG_SCENARIOS = [
  { label: "Conservative", value: 20, hint: "Only clearest bottleneck cases" },
  { label: "Typical", value: 30, hint: "Most hospitalist services" },
  { label: "Aggressive", value: 40, hint: "High-volume, resource-constrained" },
];

const FILL_SCENARIOS = [
  { label: "Conservative", value: 15, hint: "Rarely at capacity" },
  { label: "Moderate", value: 25, hint: "Typical community hospital" },
  { label: "High Demand", value: 40, hint: "Routinely capacity-constrained" },
];

export default function InpatientDischargePlanningCalc({ state, updateTimeDriverInputs }: Props) {
  const td = state.timeDriverInputs;

  const annualDischarges = useMemo(() => {
    if (td.ipStaffedBeds > 0 && td.ipAlos > 0) {
      return Math.round(td.ipStaffedBeds * (td.ipOccupancyRate / 100) * 365 / td.ipAlos);
    }
    return state.annualEncounters;
  }, [td.ipStaffedBeds, td.ipOccupancyRate, td.ipAlos, state.annualEncounters]);

  const affected = Math.round(annualDischarges * (td.ipDischargeLagAffectedRate / 100));
  const dbnUplift = Math.round(affected * (td.ipDbnCrossNoonRate / 100));
  const incrementalAdmissions = Math.round(dbnUplift * (td.ipBedFillRate / 100));
  const annualValue = Math.round(incrementalAdmissions * td.ipNetRevenuePerAdmission);

  const fmt = (n: number) => '$' + n.toLocaleString();
  const fmtN = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-5">
        When Abridge captures discharge-readiness language in the morning progress note, case management can start SNF placement, transport coordination, and home health orders hours earlier. The result: more discharges happen before noon — freeing beds for afternoon admissions instead of sitting idle until the next morning.
      </p>

      {/* Foundation inputs */}
      <div className="bg-[#F5F0EB] rounded-lg p-4 mb-5">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Hospital Baseline</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#666666]">Staffed beds</label>
            <FormattedNumberInput
              value={td.ipStaffedBeds}
              onChange={(v) => updateTimeDriverInputs({ ipStaffedBeds: v })}
              className="h-8 text-sm bg-white border-[#E5E5E5]"
              data-testid="input-ip-beds-calc"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#666666]">Occupancy rate</label>
            <div className="relative">
              <FormattedNumberInput
                value={td.ipOccupancyRate}
                onChange={(v) => updateTimeDriverInputs({ ipOccupancyRate: Math.max(50, Math.min(100, v)) })}
                className="h-8 text-sm bg-white border-[#E5E5E5] pr-8"
                data-testid="input-ip-occupancy-calc"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#888888]">%</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#666666]">Avg length of stay</label>
            <div className="relative">
              <FormattedNumberInput
                value={td.ipAlos}
                onChange={(v) => updateTimeDriverInputs({ ipAlos: v })}
                className="h-8 text-sm bg-white border-[#E5E5E5] pr-12"
                data-testid="input-ip-alos-calc"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#888888]">days</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#666666]">Net revenue / admission</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#888888]">$</span>
              <FormattedNumberInput
                value={td.ipNetRevenuePerAdmission}
                onChange={(v) => updateTimeDriverInputs({ ipNetRevenuePerAdmission: v })}
                className="h-8 text-sm pl-6 bg-white border-[#E5E5E5]"
                data-testid="input-ip-net-revenue-calc"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#D1D5DB] flex justify-between items-center">
          <span className="text-xs text-[#888888]">Estimated annual discharges</span>
          <span className="text-sm font-semibold text-[#EA2C00]">{fmtN(annualDischarges)}</span>
        </div>
      </div>

      {/* % affected by documentation lag */}
      <div className="mb-5">
        <p className="text-sm font-medium text-black mb-1">Discharges where documentation lag bottlenecks planning</p>
        <p className="text-xs text-[#888888] mb-3">Cases where the attending note containing discharge intent wasn't available when case management needed it.</p>
        <div className="flex gap-2 mb-2">
          {LAG_SCENARIOS.map((s) => (
            <button
              key={s.label}
              onClick={() => updateTimeDriverInputs({ ipDischargeLagAffectedRate: s.value })}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs transition-all ${
                td.ipDischargeLagAffectedRate === s.value
                  ? 'bg-[#EA2C00] text-white'
                  : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
              }`}
              data-testid={`button-lag-${s.label.toLowerCase()}`}
            >
              <span className="block font-semibold">{s.label}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">{s.value}%</span>
            </button>
          ))}
          <div className="flex-1">
            <div className="relative h-full">
              <FormattedNumberInput
                value={td.ipDischargeLagAffectedRate}
                onChange={(v) => updateTimeDriverInputs({ ipDischargeLagAffectedRate: Math.max(0, Math.min(100, v)) })}
                className="h-full py-2.5 text-xs bg-[#F5F0EB] border-[#D1D5DB] pr-6"
                data-testid="input-lag-custom"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#888888]">%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#888888]">{fmtN(affected)} discharges affected</p>
      </div>

      {/* % that cross the noon threshold */}
      <div className="mb-5">
        <p className="text-sm font-medium text-black mb-1">Of those — % where earlier planning shifts discharge before noon</p>
        <p className="text-xs text-[#888888] mb-3">Not every earlier-start translates to a morning discharge. This captures the portion where the delay was the binding constraint.</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={70}
            value={td.ipDbnCrossNoonRate}
            onChange={(e) => updateTimeDriverInputs({ ipDbnCrossNoonRate: Number(e.target.value) })}
            className="flex-1 h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
            data-testid="slider-dbn-rate"
          />
          <div className="flex items-center gap-1 bg-[#F5F0EB] rounded-lg px-3 py-1.5 border border-[#D1D5DB]">
            <span className="text-sm font-bold text-[#EA2C00]">{td.ipDbnCrossNoonRate}%</span>
          </div>
        </div>
        <p className="text-xs text-[#888888] mt-1">{fmtN(dbnUplift)} additional before-noon discharges</p>
      </div>

      {/* Bed fill rate */}
      <div className="mb-5">
        <p className="text-sm font-medium text-black mb-1">Bed fill rate — % of freed beds filled with new admissions</p>
        <p className="text-xs text-[#888888] mb-3">How capacity-constrained is this facility? A hospital boarding ED patients can fill every afternoon bed; a lower-occupancy system may not.</p>
        <div className="flex gap-2">
          {FILL_SCENARIOS.map((s) => (
            <button
              key={s.label}
              onClick={() => updateTimeDriverInputs({ ipBedFillRate: s.value })}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs transition-all ${
                td.ipBedFillRate === s.value
                  ? 'bg-[#EA2C00] text-white'
                  : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
              }`}
              data-testid={`button-fill-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="block font-semibold">{s.label}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">{s.value}%</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[#888888] mt-2">{fmtN(incrementalAdmissions)} incremental admissions captured</p>
      </div>

      {/* Calculation breakdown */}
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">How This Calculates</p>
        <div className="space-y-1.5 text-xs text-[#666666]">
          <div className="flex justify-between gap-2">
            <span>Annual discharges</span>
            <span className="font-medium text-black">{fmtN(annualDischarges)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Documentation lag affected ({td.ipDischargeLagAffectedRate}%)</span>
            <span className="font-medium text-black">{fmtN(affected)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Discharge before noon conversion ({td.ipDbnCrossNoonRate}%)</span>
            <span className="font-medium text-black">{fmtN(dbnUplift)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Bed fill rate ({td.ipBedFillRate}%)</span>
            <span className="font-medium text-black">{fmtN(incrementalAdmissions)} admissions</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Net revenue per admission</span>
            <span className="font-medium text-black">{fmt(td.ipNetRevenuePerAdmission)}</span>
          </div>
          <div className="h-px bg-[#D1D5DB] my-2" />
          <div className="flex justify-between gap-2 text-sm">
            <span className="font-semibold text-black">Annual capacity value</span>
            <span className="font-bold text-[#EA2C00]">{fmt(annualValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
