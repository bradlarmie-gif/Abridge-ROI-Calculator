import { useState } from "react";
import { Info } from "lucide-react";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { computeAllDriverValues, wrvuScenariosFor } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";
import { NumberField } from "@/components/NumberField";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function WrvuCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs, careSetting, annualEncounters, utilizationPercent } = state;
  const isED = careSetting === 'ed';

  const [customMode, setCustomMode] = useState(docQualityInputs.wrvuScenario === 'custom');
  const [customDisplay, setCustomDisplay] = useState(String(docQualityInputs.wrvuCustomPercent ?? 5));

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("wrvu", state.careSetting ?? "")] ?? 0;
  const { ready, need } = driverScaleReadiness("wrvu", state, totalHoursSaved);

  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));
  const wrvuScenarios = wrvuScenariosFor(isED, docQualityInputs.wrvuCustomPercent);

  const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
  const wrvuLiftPerVisit = (docQualityInputs.currentWrvu * wrvuLiftPercent) / 100;
  const totalAdditionalWrvus = eligibleEncounters * wrvuLiftPerVisit;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-4">
        {isED
          ? "MDM-based E/M billing requires documenting problems addressed, data reviewed, and risk — but ED physicians reconstruct notes from memory between patients, and under-documentation tends to be worst when volume is highest. The physician did the work. The note didn't show it. Capturing that clinical context in real time supports coding that more accurately reflects the actual visit."
          : "MDM-based E/M billing requires three documented elements: problems addressed, data reviewed, and risk of management. In a rushed visit, a physician might touch four problems and review labs — but the note says 'HTN follow-up, refill meds.' The work happened. The note didn't show it. Capturing that clinical context in real time supports more accurate coding of the actual visit."
        }
      </p>

      <p className="text-sm font-medium text-black mb-2">Choose your scenario:</p>
      <div className="flex gap-2 mb-4">
        {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
          <button
            key={level}
            onClick={() => {
              setCustomMode(false);
              updateDocQualityInputs({ wrvuScenario: level });
            }}
            className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
              !customMode && docQualityInputs.wrvuScenario === level
                ? 'bg-[#EA2C00] text-white'
                : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
            }`}
            data-testid={`button-wrvu-${level}`}
          >
            <span className="font-medium">{SCENARIO_LABELS[level]}</span>
            <span className="block text-[10px] mt-0.5 opacity-80">{wrvuScenarios[level]}%</span>
          </button>
        ))}
        <button
          onClick={() => {
            setCustomMode(true);
            updateDocQualityInputs({ wrvuScenario: 'custom' });
          }}
          className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
            customMode ? 'bg-[#EA2C00] text-white' : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
          }`}
          data-testid="button-wrvu-custom"
        >
          <span className="font-medium">Custom</span>
        </button>
      </div>

      {customMode && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-[#666666] flex-shrink-0">E/M lift</label>
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={customDisplay}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                setCustomDisplay(raw);
                const n = parseFloat(raw);
                if (!isNaN(n) && n >= 0.1 && n <= 100) {
                  updateDocQualityInputs({ wrvuCustomPercent: n, wrvuScenario: 'custom' });
                }
              }}
              onBlur={() => {
                const n = parseFloat(customDisplay);
                if (isNaN(n) || n < 0.1) {
                  const defaultVal = isED ? 2.5 : 5;
                  updateDocQualityInputs({ wrvuCustomPercent: defaultVal, wrvuScenario: 'custom' });
                  setCustomDisplay(String(defaultVal));
                } else {
                  const clamped = Math.min(100, n);
                  updateDocQualityInputs({ wrvuCustomPercent: clamped, wrvuScenario: 'custom' });
                  setCustomDisplay(String(clamped));
                }
              }}
              className="w-full h-10 bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
              autoFocus
              data-testid="input-wrvu-custom"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
        </div>
      )}

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
              <NumberField
                value={docQualityInputs.currentWrvu}
                onValueChange={(v) => updateDocQualityInputs({ currentWrvu: v })}
                className="w-16 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-current-wrvu"
              />
              <span className="text-[#888888]">wRVU</span>
            </div>
          </div>
          <p className="text-xs text-[#888888] mt-1">
            {isED
              ? 'Post-2022 CMS E&M revision: typical ED range 1.6–2.2. Default updated to 1.8.'
              : 'Varies by specialty. MGMA data: 1.5–2.5 for primary care.'}
          </p>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Documentation improvement</span>
            <span className="font-semibold text-black">{wrvuLiftPercent}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= E/M lift per visit</span>
            <span className="font-semibold text-black">{wrvuLiftPerVisit.toFixed(3)} wRVU</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">= Total additional wRVUs</span>
            <span className="font-semibold text-black">{formatNumber(Math.round(totalAdditionalWrvus))}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#666666]">× Conversion factor</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateDocQualityInputs({ conversionFactor: 33 })}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  docQualityInputs.conversionFactor <= 35
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                }`}
                data-testid="button-cf-cms"
              >
                CMS $33
              </button>
              <button
                onClick={() => updateDocQualityInputs({ conversionFactor: 50 })}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  docQualityInputs.conversionFactor >= 45
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                }`}
                data-testid="button-cf-commercial"
              >
                Commercial $50
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[#888888]">$</span>
                <NumberField
                  value={docQualityInputs.conversionFactor}
                  onValueChange={(v) => updateDocQualityInputs({ conversionFactor: v })}
                  className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                  data-testid="input-wrvu-conversion"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-[#888888] text-right mt-1">
            CMS 2026 physician fee schedule: $33.40. Commercial blended rates: $45–55 depending on payer mix.
          </p>
          <div className="flex justify-between items-center">
            <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" /></span>
            <div className="flex items-center gap-1">
              <NumberField
                value={docQualityInputs.wrvuRealization}
                onValueChange={(v) => updateDocQualityInputs({ wrvuRealization: v })}
                className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-wrvu-realization"
              />
              <span className="text-[#888888]">%</span>
            </div>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-semibold text-black">Annual E/M Value</span>
            {ready
              ? <span className="font-bold text-[#EA2C00]" data-testid="text-wrvu-net">{formatCurrency(value)}</span>
              : <span className="text-sm font-medium text-[#8C7E6E]" data-testid="text-wrvu-net">Enter {need}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
