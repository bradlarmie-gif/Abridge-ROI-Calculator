import { Info } from "lucide-react";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function DrgAccuracyCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, annualEncounters, utilizationPercent } = state;
  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));

  const ipDrgProtectionScenarios: Record<string, number> = { conservative: 25, typical: 40, aggressive: 60 };
  const ipDrgProtectionPercent = ipDrgProtectionScenarios[docQualityInputs.ipDrgScenario];
  const ipAdmissionsAtRisk = eligibleEncounters * (docQualityInputs.ipDrgAtRiskRate / 100);
  const ipAdmissionsProtected = ipAdmissionsAtRisk * (ipDrgProtectionPercent / 100);
  const ipDrgGrossValue = ipAdmissionsProtected * docQualityInputs.ipDrgWeightIncrease * docQualityInputs.ipDrgBasePayment;
  const ipDrgNetValue = ipDrgGrossValue * (docQualityInputs.ipDrgRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
        Documentation gaps cost you twice—first at coding, then at audit. Abridge captures the clinical conversations that close these gaps.
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
                <input
                  type="number"
                  step="1"
                  value={docQualityInputs.ipDrgAtRiskRate}
                  onChange={(e) => updateDocQualityInputs({ ipDrgAtRiskRate: parseFloat(e.target.value) || 0 })}
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
          Step 2: The Gap Abridge Closes
        </p>
        <p className="text-[13px] text-[#666666] mb-2">
          Not all gaps are the same. Abridge specifically captures "discussed but not documented"—clinical reasoning that happened verbally but didn't make the note.
        </p>
        <p className="text-[13px] text-[#666666] mb-4">What portion of your documentation gaps are verbal-to-written gaps?</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
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
              <p className="font-semibold text-lg">{ipDrgProtectionScenarios[level]}%</p>
            </button>
          ))}
        </div>
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
              <input
                type="number"
                step="0.1"
                value={docQualityInputs.ipDrgWeightIncrease}
                onChange={(e) => updateDocQualityInputs({ ipDrgWeightIncrease: parseFloat(e.target.value) || 0 })}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 text-black font-semibold text-base"
                data-testid="input-drg-weight"
              />
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Base DRG Payment</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888]">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={docQualityInputs.ipDrgBasePayment ? docQualityInputs.ipDrgBasePayment.toLocaleString("en-US") : ""}
                  onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ ipDrgBasePayment: v }); }}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                  data-testid="input-drg-base"
                />
              </div>
            </div>
          </div>
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
                <input
                  type="number"
                  step="5"
                  value={docQualityInputs.ipDrgRealization}
                  onChange={(e) => updateDocQualityInputs({ ipDrgRealization: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-drg-realization"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgNetValue))} net</span>
          </div>
        </div>
      </div>

      {/* Final Value */}
      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-black">Annual DRG Value</span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-drg-net">{formatCurrency(Math.round(ipDrgNetValue))}</span>
        </div>
      </div>
    </div>
  );
}
