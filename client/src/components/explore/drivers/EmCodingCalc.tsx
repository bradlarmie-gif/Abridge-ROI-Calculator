import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  optimistic: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function EmCodingCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, annualEncounters, utilizationPercent } = state;
  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));

  const losVal = state.ipAvgLengthOfStay ?? 4.5;
  const progressPerAdmission = Math.max(losVal - 2, 1);
  const totalCharges = eligibleEncounters * (1 + progressPerAdmission + docQualityInputs.ipEmCodingConsultsPerAdmission);

  const gapMap: Record<string, number> = { conservative: 8, typical: 12, optimistic: 18 };
  const gapPct = gapMap[docQualityInputs.ipEmCodingGapScenario] ?? 12;
  const upcoded = totalCharges * (gapPct / 100);
  const ipEmCodingGross = upcoded * docQualityInputs.ipEmCodingAvgRevenueLift;
  const ipEmCodingNet = ipEmCodingGross * (docQualityInputs.ipEmCodingRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
        Hospitalists bill E/M codes for admissions, daily rounding, and consults. Documentation gaps cause downcoding {"—"} the wrong level for the work performed. Abridge captures the medical decision-making that supports the right level.
      </p>

      {/* STEP 1: ENCOUNTER VOLUME */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 1: Hospitalist Encounter Volume</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#666666]">Admissions/year (1 H&P each)</span>
            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#666666]">Avg length of stay</span>
            <span className="font-semibold text-black">{losVal.toFixed(1)} days</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#666666]">Progress notes per admission</span>
            <span className="font-semibold text-black">{progressPerAdmission.toFixed(1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#666666]">Consults per admission</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={docQualityInputs.ipEmCodingConsultsPerAdmission}
                onChange={(e) => updateDocQualityInputs({ ipEmCodingConsultsPerAdmission: parseFloat(e.target.value) || 0 })}
                className="w-16 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                data-testid="input-em-consults"
              />
            </div>
          </div>
          <div className="border-t border-[#D1D5DB] pt-3 flex justify-between items-center">
            <span className="text-[13px] font-medium text-black">Total billable encounters/year</span>
            <span className="font-bold text-black">{formatNumber(Math.round(totalCharges))}</span>
          </div>
        </div>
      </div>

      {/* STEP 2: GAP SCENARIO */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 2: Documentation Gap</p>
        <p className="text-[13px] text-[#666666] mb-3">
          What share of encounters are downcoded due to documentation gaps?
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          {(['conservative', 'typical', 'optimistic'] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateDocQualityInputs({ ipEmCodingGapScenario: level })}
              className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
                docQualityInputs.ipEmCodingGapScenario === level
                  ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                  : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
              }`}
              data-testid={`button-em-${level}`}
            >
              <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipEmCodingGapScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                {SCENARIO_LABELS[level]}
              </p>
              <p className="font-semibold text-lg">{gapMap[level]}%</p>
            </button>
          ))}
        </div>
        <div className="bg-[#F5F0EB] rounded-lg p-4 text-center">
          <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(totalCharges))} × {gapPct}% = </span>
          <span className="font-semibold text-black">{formatNumber(Math.round(upcoded))} encounters with revenue opportunity</span>
        </div>
      </div>

      {/* STEP 3: REVENUE LIFT */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 3: Revenue Per Captured Encounter</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Encounters Captured</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatNumber(Math.round(upcoded))}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Avg Revenue Lift / Encounter</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888]">$</span>
                <input
                  type="number"
                  step="1"
                  value={docQualityInputs.ipEmCodingAvgRevenueLift}
                  onChange={(e) => updateDocQualityInputs({ ipEmCodingAvgRevenueLift: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                  data-testid="input-em-revenue-lift"
                />
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(ipEmCodingGross))} gross value</span>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            Typical hospitalist E/M downcoding loss is $25{"–"}$50 per encounter. $35 is a balanced default.
          </p>
        </div>
      </div>

      {/* STEP 4: REALIZATION */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Step 4: What You Can Count On</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Gross Value</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatCurrency(Math.round(ipEmCodingGross))}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Realization Rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  value={docQualityInputs.ipEmCodingRealization}
                  onChange={(e) => updateDocQualityInputs({ ipEmCodingRealization: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-em-realization"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(ipEmCodingNet))} net</span>
          </div>
        </div>
      </div>

      {/* Final Value */}
      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-black">Annual E/M Coding Value</span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-em-net">{formatCurrency(Math.round(ipEmCodingNet))}</span>
        </div>
      </div>
    </div>
  );
}
