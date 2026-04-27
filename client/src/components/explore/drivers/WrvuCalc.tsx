import { Info } from "lucide-react";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function WrvuCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, careSetting, annualEncounters, utilizationPercent } = state;
  const isED = careSetting === 'ed';

  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));
  const wrvuScenarios: Record<string, number> = isED
    ? { conservative: 1, typical: 2.5, aggressive: 4 }
    : { conservative: 2, typical: 5, aggressive: 7 };

  const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
  const wrvuLiftPerVisit = (docQualityInputs.currentWrvu * wrvuLiftPercent) / 100;
  const totalAdditionalWrvus = eligibleEncounters * wrvuLiftPerVisit;
  const wrvuRevenueGross = totalAdditionalWrvus * docQualityInputs.conversionFactor;
  const wrvuRevenueNet = wrvuRevenueGross * (docQualityInputs.wrvuRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-black mb-4">
        When notes fully reflect visit complexity, E/M levels often code higher.
        Industry data shows {isED ? '1-4%' : '2-7%'} {isED ? 'E&M' : 'wRVU'} lift from better documentation.
      </p>

      <p className="text-sm font-medium text-black mb-2">Choose your scenario:</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
          <button
            key={level}
            onClick={() => updateDocQualityInputs({ wrvuScenario: level })}
            className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
              docQualityInputs.wrvuScenario === level
                ? "border-[#EA2C00] bg-white"
                : "border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]"
            }`}
            data-testid={`button-wrvu-${level}`}
          >
            <p className="font-medium text-black">{SCENARIO_LABELS[level]}</p>
            <p className="text-sm text-[#888888]">{wrvuScenarios[level]}%</p>
          </button>
        ))}
      </div>

      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
          <span className="text-xs text-[#888888]">Click values to edit</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Eligible encounters</span>
            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#666666]">Current avg wRVU/visit</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={docQualityInputs.currentWrvu}
                onChange={(e) => updateDocQualityInputs({ currentWrvu: parseFloat(e.target.value) || 0 })}
                className="w-16 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-current-wrvu"
              />
              <span className="text-[#888888]">wRVU</span>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Documentation improvement</span>
            <span className="font-semibold text-black">{wrvuLiftPercent}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= wRVU lift per visit</span>
            <span className="font-semibold text-black">{wrvuLiftPerVisit.toFixed(3)} wRVU</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Total additional wRVUs</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(totalAdditionalWrvus))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#666666]">× Conversion factor</span>
            <div className="flex items-center gap-1">
              <span className="text-[#888888]">$</span>
              <input
                type="number"
                value={docQualityInputs.conversionFactor}
                onChange={(e) => updateDocQualityInputs({ conversionFactor: parseFloat(e.target.value) || 0 })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-wrvu-conversion"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" /></span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={docQualityInputs.wrvuRealization}
                onChange={(e) => updateDocQualityInputs({ wrvuRealization: parseFloat(e.target.value) || 0 })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-wrvu-realization"
              />
              <span className="text-[#888888]">%</span>
            </div>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-semibold text-black">Annual {isED ? 'E&M' : 'wRVU'} Value</span>
            <span className="font-bold text-[#EA2C00]" data-testid="text-wrvu-net">{formatCurrency(wrvuRevenueNet)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
