import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

export default function ObsDefenseCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, annualEncounters, utilizationPercent } = state;
  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));

  const ipObsDefenseGross =
    eligibleEncounters *
    (docQualityInputs.ipObsDefenseDenialRate / 100) *
    docQualityInputs.ipObsDefenseClaimValue *
    (docQualityInputs.ipObsDefenseDocContribution / 100);
  const ipObsDefenseNet = ipObsDefenseGross * (docQualityInputs.ipObsDefenseRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-4">
        IP status denials hinge on medical necessity {"—"} and medical necessity lives in the attending{"'"}s clinical reasoning, not just the final diagnosis codes. Abridge captures that reasoning at the time of admission, so when payers review the claim, the record already shows why the IP level of care was warranted.
      </p>
      <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg px-4 py-3 mb-6 flex items-start gap-2">
        <span className="text-[#EA2C00] text-sm mt-0.5 shrink-0">{"ⓘ"}</span>
        <p className="text-xs text-[#666666]">
          <strong>What this models:</strong> The share of medical necessity denials where better real-time documentation {"—"} captured at admission {"—"} would have prevented the denial or substantially strengthened the appeal.
        </p>
      </div>

      {/* STEP 1 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 1: Denial Exposure</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Denial Rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min={3}
                  max={7}
                  value={docQualityInputs.ipObsDefenseDenialRate}
                  onChange={(e) => updateDocQualityInputs({ ipObsDefenseDenialRate: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-obs-denial-rate"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            Medical necessity denial rates typically range 3–7%. 5% is average for status-related denials.
          </p>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 2: Average Contested Claim Value</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex-1">
            <label className="text-[13px] text-[#666666] mb-1.5 block">Avg Contested Claim Value</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] z-10">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={docQualityInputs.ipObsDefenseClaimValue ? docQualityInputs.ipObsDefenseClaimValue.toLocaleString("en-US") : ""}
                onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ ipObsDefenseClaimValue: v }); }}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                data-testid="input-obs-claim-value"
              />
            </div>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            $10,000 is a conservative benchmark for the average inpatient claim subject to status denials.
          </p>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 3: Documentation-Preventable Denials</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex-1">
            <label className="text-[13px] text-[#666666] mb-1.5 block">Documentation Contribution %</label>
            <div className="relative">
              <input
                type="number"
                step="5"
                min={25}
                max={55}
                value={docQualityInputs.ipObsDefenseDocContribution}
                onChange={(e) => updateDocQualityInputs({ ipObsDefenseDocContribution: parseFloat(e.target.value) || 0 })}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                data-testid="input-obs-doc-contribution"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
            </div>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            Of your medical necessity denials, what % are driven by inadequate clinical reasoning in the record {"—"} not payer policy? This is the share where better admission documentation would change the outcome. 35{"–"}55% is a typical benchmark.
          </p>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Step 4: What You Can Count On</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Gross Value</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatCurrency(Math.round(ipObsDefenseGross))}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Realization</label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  value={docQualityInputs.ipObsDefenseRealization}
                  onChange={(e) => updateDocQualityInputs({ ipObsDefenseRealization: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-obs-realization"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(ipObsDefenseNet))} net</span>
          </div>
        </div>
      </div>

      {/* Final Value */}
      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-black">Annual Obs/IP Defense Value</span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-obs-net">{formatCurrency(Math.round(ipObsDefenseNet))}</span>
        </div>
      </div>
    </div>
  );
}
