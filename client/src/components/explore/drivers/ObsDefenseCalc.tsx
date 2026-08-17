import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { NumberField } from "@/components/NumberField";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";

type Props = ExploreCalcComponentProps;

export default function ObsDefenseCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs, annualEncounters } = state;
  const dq = docQualityInputs;

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("obsDefense", state.careSetting ?? "")] ?? 0;
  const { ready, need } = driverScaleReadiness("obsDefense", state, totalHoursSaved);

  const denials = Math.round(annualEncounters * (dq.ipObsDenialRate / 100));
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const fmtN = (n: number) => n.toLocaleString();

  const Row = ({ label, field, suffix, prefix }: { label: string; field: keyof typeof dq; suffix?: string; prefix?: string }) => (
    <div className="flex items-center gap-3">
      <label className="text-[13px] text-[#666666] flex-1">{label}</label>
      <div className="relative w-32">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] z-10">{prefix}</span>}
        <NumberField
          value={dq[field] as number}
          onValueChange={(v) => updateDocQualityInputs({ [field]: v } as any)}
          className={`w-full h-11 bg-white border border-[#E5E5E5] rounded-lg ${prefix ? "pl-7" : "px-4"} pr-7 text-black font-semibold text-base`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888]">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-4">
        A share of admissions draw a status or medical-necessity denial from payers. The chain starts at total admissions and narrows to the durable dollar Abridge is in position to move: what is never recovered, where documentation is the material factor, and the share of workflows Abridge is in.
      </p>

      <div className="bg-[#F5F0EB] rounded-lg p-5 space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-[13px] text-[#666666] flex-1">Total admissions</label>
          <div className="w-32 h-11 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center font-semibold text-black">{fmtN(annualEncounters)}</div>
        </div>
        <Row label="Receive a status / medical-necessity denial" field="ipObsDenialRate" suffix="%" />
        <Row label="Expected allowed reimbursement per case" field="ipObsAllowedPerCase" prefix="$" />
        <Row label="Traditionally not recovered" field="ipObsNotRecoveredPct" suffix="%" />
        <Row label="Documentation is a material factor" field="ipObsDocMaterialPct" suffix="%" />
        <Row label="Abridge opportunity (in the workflow)" field="ipObsAbridgeOpportunityPct" suffix="%" />
        <Row label="Abridge impact" field="ipObsAbridgeImpactPct" suffix="%" />
        <div className="text-center pt-2 text-[13px] text-[#666666]">
          {fmtN(annualEncounters)} admissions × {dq.ipObsDenialRate}% = <span className="font-semibold text-black">{fmtN(denials)} denied cases</span>
        </div>
      </div>

      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-black">Annual value defended</span>
          {ready
            ? <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-obs-net">{fmt(value)}</span>
            : <span className="text-sm font-medium text-[#8C7E6E]" data-testid="text-obs-net">Enter {need}</span>}
        </div>
      </div>
    </div>
  );
}
