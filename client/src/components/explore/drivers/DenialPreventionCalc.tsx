import { Info } from "lucide-react";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { denialsScenariosFor } from "@/lib/exploreDriverCalcs";
import { NumberField } from "@/components/NumberField";

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
  const denialsScenarios = denialsScenariosFor(isED, docQualityInputs.denialsCustomPercent);

  const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
  const medNecessityDenials = eligibleEncounters * (docQualityInputs.medNecessityDenialRate / 100);
  const preventedDenials = medNecessityDenials * (preventionPercent / 100);
  const denialsRevenueGross = preventedDenials * docQualityInputs.avgClaimValue;
  const denialsRevenueNet = denialsRevenueGross * (docQualityInputs.denialsRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-4">
        {isED
          ? "This is separate from E&M leveling — leveling captures the complexity of what you did, this captures why the ED was the right setting. When documentation doesn't articulate clinical urgency, acuity, or the reasoning behind the visit, payers argue the patient could have been seen at a lower-acuity site and deny the claim outright. These are filed claims that come back as write-offs. The denial rate is already tracked by most revenue cycle teams as a percentage of total ED encounters."
          : "Medical necessity denials occur when documentation doesn't show why the service was clinically warranted — the physician reasoned correctly, but the note didn't capture it. This is already tracked by most revenue cycle teams as a percentage of total encounters. Capturing clinical reasoning in real time may help reduce denials before they're filed."
        }
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <p className="text-sm font-medium text-black mb-3">Prevention target:</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
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
            <p className="text-sm font-semibold">{denialsScenarios[level]}%</p>
          </button>
        ))}
        <button
          onClick={() => updateDocQualityInputs({ denialsScenario: 'custom' })}
          className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
            docQualityInputs.denialsScenario === 'custom'
              ? "bg-[#EA2C00] border-[#EA2C00] text-white"
              : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
          }`}
          data-testid="button-denials-custom"
        >
          <p className={`text-xs mb-1 ${docQualityInputs.denialsScenario === 'custom' ? 'text-white/80' : ''}`}>Custom</p>
          <p className="text-sm font-semibold">{docQualityInputs.denialsScenario === 'custom' ? `${docQualityInputs.denialsCustomPercent ?? 15}%` : 'set %'}</p>
        </button>
      </div>

      {docQualityInputs.denialsScenario === 'custom' && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-[#666666] flex-shrink-0">Prevention %</label>
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={docQualityInputs.denialsCustomPercent ?? 15}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                const n = parseFloat(raw);
                if (raw === '') { updateDocQualityInputs({ denialsCustomPercent: 0 }); }
                else if (!isNaN(n) && n >= 0 && n <= 100) { updateDocQualityInputs({ denialsCustomPercent: n }); }
              }}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-[#E5E5E5] text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
              data-testid="input-denials-custom"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
          </div>
        </div>
      )}

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
            <span className="text-[#666666]">× Medical necessity denial rate</span>
            <div className="flex items-center gap-1">
              <NumberField
                value={docQualityInputs.medNecessityDenialRate}
                onValueChange={(v) => updateDocQualityInputs({ medNecessityDenialRate: v })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-med-necessity-denial-rate"
              />
              <span className="text-[#888888]">%</span>
            </div>
          </div>
          <div className="h-px bg-[#D1D5DB] my-1" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Medical necessity denials</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(medNecessityDenials))} claims</span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× Your prevention target</span>
            <span className="text-black">{preventionPercent}%</span>
          </div>
          <div className="h-px bg-[#D1D5DB] my-1" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Denials targeted for reduction</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(preventedDenials))} claims</span>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <span className="text-[#666666]">× Avg denied claim value</span>
              <p className="text-xs text-[#999999] mt-0.5">{isED ? 'Typical ED: $1,000–$1,500' : 'Typical: $300–$800'}</p>
            </div>
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
              <NumberField
                value={docQualityInputs.denialsRealization}
                onValueChange={(v) => updateDocQualityInputs({ denialsRealization: v })}
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
