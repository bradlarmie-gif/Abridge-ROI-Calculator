import { Info } from "lucide-react";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function DenialPreventionCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, careSetting, annualEncounters, utilizationPercent } = state;
  const isED = careSetting === 'ed';

  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));
  const denialsScenarios: Record<string, number> = isED
    ? { conservative: 15, typical: 30, aggressive: 50 }
    : { conservative: 25, typical: 50, aggressive: 75 };

  const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
  const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
  const unappealableDenials = totalDenials * (docQualityInputs.unappealableRate / 100);
  const preventedDenials = unappealableDenials * (preventionPercent / 100);
  const denialsRevenueGross = preventedDenials * docQualityInputs.avgClaimValue;
  const denialsRevenueNet = denialsRevenueGross * (docQualityInputs.denialsRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-4">
        Documentation gaps drive 30-40% of denials that cannot be appealed—permanent revenue loss.
        Abridge captures clinical reasoning and medical necessity in real-time, preventing denials before they occur.
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <p className="text-sm font-medium text-black mb-3">Prevention target:</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
          <button
            key={level}
            onClick={() => updateDocQualityInputs({ denialsScenario: level })}
            className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
              docQualityInputs.denialsScenario === level
                ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
            }`}
            data-testid={`button-denials-${level}`}
          >
            <p className={`text-xs mb-1 ${docQualityInputs.denialsScenario === level ? 'text-white/80' : ''}`}>
              {SCENARIO_LABELS[level]}
            </p>
            <p className="font-semibold">{denialsScenarios[level]}%</p>
          </button>
        ))}
      </div>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
          <span className="text-xs text-[#888888]">Click values to edit</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Eligible encounters</span>
            <span className="text-black">{formatNumber(eligibleEncounters)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#666666]">× Baseline denial rate</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={docQualityInputs.denialRate}
                onChange={(e) => updateDocQualityInputs({ denialRate: parseFloat(e.target.value) || 0 })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-denial-rate"
              />
              <span className="text-[#888888]">%</span>
            </div>
          </div>
          <div className="h-px bg-[#D1D5DB] my-1" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Total denials</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(totalDenials))} claims</span>
          </div>

          <div className="bg-white/50 rounded p-3 my-2 overflow-hidden">
            <p className="text-xs font-medium text-[#666666] mb-2">Denial breakdown:</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-[#888888] flex-shrink-0">├─</span>
                <span className="text-[#666666]">Appealable ({100 - docQualityInputs.unappealableRate}%):</span>
                <span className="text-black flex-shrink-0">{formatNumber(Math.round(totalDenials - unappealableDenials))}</span>
                <span className="text-[#888888] hidden sm:inline">— Recovered through appeals</span>
              </div>
              <div className="flex items-start gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-[#888888] flex-shrink-0">└─</span>
                <span className="text-[#666666]">Unappealable ({docQualityInputs.unappealableRate}%):</span>
                <span className="font-semibold text-black flex-shrink-0">{formatNumber(Math.round(unappealableDenials))}</span>
                <span className="text-[#888888] hidden sm:inline">— Abridge targeted impact</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#666666]">Unappealable rate</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={docQualityInputs.unappealableRate}
                onChange={(e) => updateDocQualityInputs({ unappealableRate: parseFloat(e.target.value) || 0 })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-unappealable-rate"
              />
              <span className="text-[#888888]">%</span>
            </div>
          </div>
          <div className="h-px bg-[#D1D5DB] my-1" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Unrecoverable denials</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(unappealableDenials))} claims</span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× Your prevention target</span>
            <span className="text-black">{preventionPercent}%</span>
          </div>
          <div className="h-px bg-[#D1D5DB] my-1" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Denials prevented</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(preventedDenials))} claims</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#666666]">× Avg denied claim value</span>
            <div className="flex items-center gap-1">
              <span className="text-[#888888]">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={docQualityInputs.avgClaimValue ? docQualityInputs.avgClaimValue.toLocaleString("en-US") : ""}
                onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ avgClaimValue: v }); }}
                className="w-20 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-claim-value"
              />
            </div>
          </div>
          <div className="h-px bg-[#D1D5DB] my-1" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Gross value</span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(denialsRevenueGross))}</span>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" /></span>
              <p className="text-xs text-[#888888]">(collection timing, adjustments)</p>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={docQualityInputs.denialsRealization}
                onChange={(e) => updateDocQualityInputs({ denialsRealization: parseFloat(e.target.value) || 0 })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-denials-realization"
              />
              <span className="text-[#888888]">%</span>
            </div>
          </div>
          <div className="h-px bg-[#888888] my-2" />
          <div className="flex justify-between font-semibold">
            <span className="text-black">Annual Denial Prevention Value</span>
            <span className="text-[#EA2C00]" data-testid="text-denials-net">{formatCurrency(Math.round(denialsRevenueNet))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
