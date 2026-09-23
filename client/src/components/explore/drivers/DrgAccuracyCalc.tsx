import { Info } from "lucide-react";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { NumberField } from "@/components/NumberField";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function DrgAccuracyCalc({ state, updateDocQualityInputs, totalHoursSaved }: Props) {
  const { docQualityInputs, annualEncounters, utilizationPercent } = state;
  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("drgAccuracy", state.careSetting ?? "")] ?? 0;
  const { ready, need } = driverScaleReadiness("drgAccuracy", state, totalHoursSaved);

  const ipDrgProtectionScenarios: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25, custom: docQualityInputs.ipDrgCustomPercent ?? 20 };
  const ipDrgProtectionPercent = ipDrgProtectionScenarios[docQualityInputs.ipDrgScenario];
  const ipAdmissionsAtRisk = eligibleEncounters * (docQualityInputs.ipDrgAtRiskRate / 100);
  const ipAdmissionsProtected = ipAdmissionsAtRisk * (ipDrgProtectionPercent / 100);
  const ipDrgGrossValue = ipAdmissionsProtected * docQualityInputs.ipDrgWeightIncrease * docQualityInputs.ipDrgBasePayment;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
        CCs and MCCs shift DRG weight: a patient with acute kidney injury may move from DRG 470 to DRG 469, typically worth $2,000–$4,000 more per stay. The physician mentioned it at the bedside. It never made it into the note. Capturing those conditions at the point of care supports coding that more accurately reflects the actual case complexity.
      </p>

      {/* STEP 1 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          Step 1: Your Documentation Opportunity
        </p>
        <p className="text-[13px] text-[#666666] mb-4">How often does CDI identify documentation opportunities?</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Eligible Admissions</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">CDI Opportunity Rate</label>
              <div className="relative">
                <NumberField
                  value={docQualityInputs.ipDrgAtRiskRate}
                  onValueChange={(v) => updateDocQualityInputs({ ipDrgAtRiskRate: v })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-drg-at-risk"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsAtRisk))} admissions with documentation opportunities</span>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            CDI programs typically identify gaps in 15{"–"}25% of admissions. 18% reflects a conservative starting point {"—"} your CDI team can tell you your actual query rate.
          </p>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          Step 2: The Gap Abridge Addresses
        </p>
        <p className="text-[13px] text-[#666666] mb-2">
          Not all gaps are the same. Abridge specifically captures "discussed but not documented": clinical reasoning that happened verbally but didn't make the note.
        </p>
        <p className="text-[13px] text-[#666666] mb-4">What portion of your documentation gaps are verbal-to-written gaps?</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
          {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateDocQualityInputs({ ipDrgScenario: level })}
              className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
                docQualityInputs.ipDrgScenario === level
                  ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                  : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
              }`}
              data-testid={`button-drg-${level}`}
            >
              <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipDrgScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                {SCENARIO_LABELS[level]}
              </p>
              <p className="text-sm font-semibold">{ipDrgProtectionScenarios[level]}%</p>
            </button>
          ))}
          <button
            onClick={() => updateDocQualityInputs({ ipDrgScenario: 'custom' })}
            className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
              docQualityInputs.ipDrgScenario === 'custom'
                ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
            }`}
            data-testid="button-ipdrg-custom"
          >
            <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipDrgScenario === 'custom' ? 'text-white/80' : 'text-[#888888]'}`}>
              Custom
            </p>
            <p className="text-sm font-semibold">{docQualityInputs.ipDrgScenario === 'custom' ? `${docQualityInputs.ipDrgCustomPercent ?? 20}%` : 'set %'}</p>
          </button>
        </div>

        {docQualityInputs.ipDrgScenario === 'custom' && (
          <div className="flex items-center gap-3 mb-3">
            <label className="text-[13px] text-[#666666] flex-shrink-0">Verbal-to-written gap %</label>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={docQualityInputs.ipDrgCustomPercent ?? 20}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  const n = parseFloat(raw);
                  if (raw === '') { updateDocQualityInputs({ ipDrgCustomPercent: 0 }); }
                  else if (!isNaN(n) && n >= 0 && n <= 100) { updateDocQualityInputs({ ipDrgCustomPercent: n }); }
                }}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                data-testid="input-ipdrg-custom"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
            </div>
          </div>
        )}
        <div className="bg-[#F5F0EB] rounded-lg p-4 text-center mb-4">
          <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(ipAdmissionsAtRisk))} × {ipDrgProtectionPercent}% = </span>
          <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsProtected))} admissions where Abridge captures what was missed</span>
        </div>
        <div className="text-[13px] text-[#888888] space-y-1">
          <p><strong>Conservative:</strong> Only conditions explicitly named in conversation that are absent from the note</p>
          <p><strong>Typical:</strong> Includes clinical reasoning and specificity that supports CC/MCC assignment</p>
          <p><strong>Optimistic:</strong> Strong provider adoption; coders actively using ambient-captured note content</p>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          Step 3: Revenue Impact
        </p>
        <p className="text-[13px] text-[#666666] mb-4">When a missed CC/MCC is captured, DRG weight increases.</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions Captured</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsProtected))}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Avg DRG Weight Lift</label>
              <NumberField
                value={docQualityInputs.ipDrgWeightIncrease}
                onValueChange={(v) => updateDocQualityInputs({ ipDrgWeightIncrease: v })}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 text-black font-semibold text-base"
                data-testid="input-drg-weight"
              />
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Base DRG Payment</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888]">$</span>
                <NumberField
                  value={docQualityInputs.ipDrgBasePayment}
                  onValueChange={(v) => updateDocQualityInputs({ ipDrgBasePayment: v })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                  data-testid="input-drg-base"
                />
              </div>
            </div>
          </div>
          <p className="text-[13px] text-[#888888] mb-3">
            Typical CC/MCC capture shifts DRG weight 0.2–0.4. 0.3 is a defensible midpoint; adjust based on your case mix complexity.
          </p>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgGrossValue))} gross value</span>
          </div>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          Step 4: What You Can Count On
        </p>
        <p className="text-[13px] text-[#666666] mb-4">Not all captured documentation changes the final code.</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Gross Value</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgGrossValue))}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Realization Rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" /></label>
              <div className="relative">
                <NumberField
                  value={docQualityInputs.ipDrgRealization}
                  onValueChange={(v) => updateDocQualityInputs({ ipDrgRealization: v })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-drg-realization"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(value)} net</span>
          </div>
        </div>
      </div>

      {/* Final Value */}
      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-black">Annual DRG Value</span>
          {ready
            ? <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-drg-net">{formatCurrency(value)}</span>
            : <span className="text-sm font-medium text-[#8C7E6E]" data-testid="text-drg-net">Enter {need}</span>}
        </div>
      </div>
    </div>
  );
}
