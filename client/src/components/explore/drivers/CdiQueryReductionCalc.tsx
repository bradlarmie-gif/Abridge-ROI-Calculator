import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function CdiQueryReductionCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, annualEncounters, utilizationPercent } = state;
  const eligibleEncounters = Math.round(annualEncounters * (utilizationPercent / 100));

  const ipCdiReductionScenarios: Record<string, number> = { conservative: 15, typical: 30, aggressive: 50 };
  const ipCdiReductionPercent = ipCdiReductionScenarios[docQualityInputs.ipCdiScenario];
  const ipTotalQueries = eligibleEncounters * (docQualityInputs.ipCdiQueryRate / 100);
  const ipQueriesAvoided = ipTotalQueries * (ipCdiReductionPercent / 100);
  const ipCdiSavingsValue = ipQueriesAvoided * docQualityInputs.ipCdiCostPerQuery;
  const ipCdiNet = ipCdiSavingsValue * (docQualityInputs.ipCdiRealization / 100);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
        CDI queries exist because the physician mentioned a condition at the bedside — sepsis, acute kidney injury, respiratory failure — but the note said "elevated BMP" or "shortness of breath." CDI has to send a query to get the physician to codify it. Abridge closes that loop at the point of care, so the diagnosis is in the note before CDI ever opens the chart.
      </p>

      {/* STEP 1 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 1: Current Query Volume</p>
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
              <label className="text-[13px] text-[#666666] mb-1.5 block">Query Rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  value={docQualityInputs.ipCdiQueryRate}
                  onChange={(e) => updateDocQualityInputs({ ipCdiQueryRate: parseFloat(e.target.value) || 0 })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-cdi-query-rate"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatNumber(Math.round(ipTotalQueries))} queries/year</span>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">CDI query rates typically range 20-40%. 30% is average.</p>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 2: Queries Avoided</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateDocQualityInputs({ ipCdiScenario: level })}
              className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
                docQualityInputs.ipCdiScenario === level
                  ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                  : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
              }`}
              data-testid={`button-cdi-${level}`}
            >
              <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipCdiScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                {SCENARIO_LABELS[level]}
              </p>
              <p className="font-semibold text-lg">{ipCdiReductionScenarios[level]}%</p>
            </button>
          ))}
        </div>
        <div className="bg-[#F5F0EB] rounded-lg p-4 text-center">
          <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(ipTotalQueries))} × {ipCdiReductionPercent}% = </span>
          <span className="font-semibold text-black">{formatNumber(Math.round(ipQueriesAvoided))} queries avoided</span>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 3: Savings</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Queries Avoided</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{formatNumber(Math.round(ipQueriesAvoided))}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Cost per Query</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] z-10">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={docQualityInputs.ipCdiCostPerQuery ? docQualityInputs.ipCdiCostPerQuery.toLocaleString("en-US") : ""}
                  onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ ipCdiCostPerQuery: v }); }}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                  data-testid="input-cdi-cost"
                />
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{formatCurrency(Math.round(ipCdiSavingsValue))}</span>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">Fully loaded cost per CDI query: $50–$100 (CDI specialist time + overhead). $50 is conservative; adjust up if your program runs closer to $75–$100.</p>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 4: Realization Rate</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex-1">
            <label className="text-[13px] text-[#666666] mb-1.5 block">Realization Rate</label>
            <div className="relative">
              <input
                type="number"
                step="5"
                min={50}
                max={100}
                value={docQualityInputs.ipCdiRealization}
                onChange={(e) => updateDocQualityInputs({ ipCdiRealization: parseFloat(e.target.value) || 0 })}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                data-testid="input-cdi-realization"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
            </div>
            <p className="text-[13px] text-[#888888] mt-3">75% is a conservative default.</p>
          </div>
        </div>
      </div>

      {/* Final Value */}
      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-black">Annual CDI Savings</span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-cdi-net">{formatCurrency(Math.round(ipCdiNet))}</span>
        </div>
      </div>
    </div>
  );
}
