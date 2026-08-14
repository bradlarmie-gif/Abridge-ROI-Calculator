import { useMemo } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { computeExploreTotals } from "@/lib/exploreDriverCalcs";
import { type ExploreState } from "../ExploreFlow";

/**
 * Drop-in editorial replacement for ExploreInvestment.tsx — same props, same
 * underlying math. The quadrant breakdown on the right comes from
 * `computeExploreTotals`, the single canonical engine also used by
 * ExploreModel/PDF/proforma, so this screen's numbers can never drift from
 * theirs. `efficiencyValue`/`documentationValue` (props) sum to the same
 * total by construction — see exploreDriverCalcs.ts's own guarantee.
 */
interface Props {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  efficiencyValue: number;
  documentationValue: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type Tab = "perProvider" | "perEncounter" | "annual" | "platform";

// The governing four-domain rule: every setting has Capacity / Workforce /
// Revenue / Quality, and in each setting a specific domain is the NON-FINANCIAL
// The proof layer (tracked, never dollarized) lives in ONE canonical place now
// so no surface can silently disagree; imported for use here and re-exported
// for the other existing importers (EdModel, EdCareSetting, ExploreEditorialPdf).
import { PROOF_LAYER, QUADRANT_ORDER } from "@/lib/proofLayer";
import { DOMAIN_COLORS } from "@/lib/domainColors";
export { PROOF_LAYER, QUADRANT_ORDER };

export default function EdInvestment({
  state,
  updateState,
  totalHoursSaved,
  efficiencyValue,
  documentationValue,
  onNext,
  onBack,
  onHome,
}: Props) {
  const isNursing = state.careSetting === "nursing";

  // Same headline total both this screen and Your Model use — see the
  // comment on ExploreInvestment.tsx's identical line.
  const totalValue = efficiencyValue + documentationValue;

  // Quadrant-level split for the "what it returns" stack. Pulled from the
  // same canonical engine as the coarser efficiency/documentation props, so
  // Capacity+Workforce === efficiencyValue and Revenue+Quality ===
  // documentationValue always — no separate math to drift.
  const valueByQuadrant = useMemo(
    () => computeExploreTotals(state, totalHoursSaved).valueByQuadrant,
    [state, totalHoursSaved],
  );

  const annualInvestment = useMemo(() => {
    if (isNursing && state.pricingModel === "perProvider") {
      return state.nursingStaffedBeds * state.costPerProvider * 12;
    }
    if (state.pricingModel === "perProvider") {
      return state.numberOfProviders * state.costPerProvider * 12;
    }
    if (state.pricingModel === "perEncounter") {
      return state.annualEncounters * state.costPerEncounter;
    }
    if (state.pricingModel === "platform") {
      return state.annualLicenseFee + state.annualEncounters * (state.platformEncRate ?? 0);
    }
    return state.annualLicenseFee;
  }, [
    isNursing,
    state.pricingModel,
    state.numberOfProviders,
    state.nursingStaffedBeds,
    state.costPerProvider,
    state.annualLicenseFee,
    state.annualEncounters,
    state.costPerEncounter,
    state.platformEncRate,
  ]);

  const netAnnualValue = totalValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;
  const netPerDollar = annualInvestment > 0 ? netAnnualValue / annualInvestment : 0;

  // Mock shows 3 segments (Per provider / Per encounter / Platform); for
  // nursing only "Per bed" applies. The 4th "Annual" tab only appears when
  // the state was already in that mode (e.g. editing a proforma setting
  // built on the classic screen) so a normal fresh flow never sees it, but
  // this stays a true drop-in for every ExploreState shape.
  const showAnnualTab = state.pricingModel === "annual";
  const tabs: { id: Tab; label: string }[] = isNursing
    ? [{ id: "perProvider", label: "Per bed" }]
    : [
        { id: "perProvider", label: "Per provider" },
        { id: "perEncounter", label: "Per encounter" },
        ...(showAnnualTab ? [{ id: "annual" as Tab, label: "Annual" }] : []),
        { id: "platform", label: "Platform" },
      ];

  const formatCurrency = (n: number) => {
    const r = Math.round(n);
    if (r === 0) return "$0"; // never render a signed zero ("−$0") in the empty state
    return r < 0 ? "−$" + Math.abs(r).toLocaleString() : "$" + r.toLocaleString();
  };
  const formatNumber = (n: number) => Math.round(n).toLocaleString();
  // Two decimals plus a real minus sign — a raw `$${n.toFixed(2)}` printed the
  // malformed "$-0.16" when the net went negative.
  const formatPerDollar = (n: number) => (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);

  return (
    <EditorialShell>
      <EditorialHeader stepName="Investment" stepIndex={8} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-[44px] pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 8 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">What it costs, and what&apos;s left.</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[620px] leading-[1.5]">
          Enter your pricing. Everything the prior screens built, minus the cost, is what&apos;s left.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.08fr] gap-[22px] mt-8 items-start">
          {/* Investment card */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[24px_26px]">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-4">Your investment</div>

            <div className="inline-flex gap-[3px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-[12px] p-1 mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateState({ pricingModel: tab.id })}
                  data-testid={`ed-investment-tab-${tab.id}`}
                  className={`text-[13px] font-bold rounded-[8px] px-[18px] py-[9px] transition-colors ${
                    state.pricingModel === tab.id ? "bg-white text-[#EA2C00] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#565250]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {state.pricingModel === "perProvider" ? (
              <>
                <div className="grid grid-cols-2 gap-[14px]">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">
                      {isNursing ? "Staffed beds" : "Providers"}
                    </div>
                    {/* Read-only: the scale (providers/beds) is set in the opportunity setup, where it
                        drives BOTH the value and the investment together. Editing it here would only
                        rescale the cost, not the value, so it's locked to keep the ROI coherent. */}
                    <div className="h-[54px] border-[1.5px] border-[#EDE8E1] rounded-[14px] bg-[#F7F2EC] flex items-center px-[14px] text-[16px] font-medium text-[#1A1A1A] tabular-nums" data-testid="ed-investment-input-providers">
                      {formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)}
                    </div>
                    <div className="text-[11px] text-[#7C766F] mt-[6px]">From your setup, so the value stays in sync</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">
                      Cost per {isNursing ? "bed" : "provider"} / month
                    </div>
                    <div className="h-[54px] border-[1.5px] border-[#E4DED6] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[14px] transition-colors focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE]">
                      <span className="text-[16px] font-bold text-[#1A1A1A] mr-[1px]">$</span>
                      <FormattedNumberInput
                        value={state.costPerProvider}
                        onChange={(v) => updateState({ costPerProvider: v })}
                        className="border-0 h-auto p-0 shadow-none text-[16px] font-medium text-[#1A1A1A] tabular-nums focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-cost-per-provider"
                      />
                    </div>
                    <div className="text-[11px] text-[#7C766F] mt-[6px]">your contract rate</div>
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E7E3DD] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#565250]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#565250]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#7C766F] mt-[10px] leading-[1.5]">
                  {formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)} {isNursing ? "beds" : "providers"} × {formatCurrency(state.costPerProvider)} × 12 months. Switch pricing model above to match your contract.
                </div>
              </>
            ) : state.pricingModel === "perEncounter" ? (
              <>
                <div>
                  <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Cost per encounter</div>
                  <div className="h-[54px] border-[1.5px] border-[#E4DED6] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[14px] transition-colors focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE] max-w-[220px]">
                    <span className="text-[16px] font-bold text-[#1A1A1A] mr-[1px]">$</span>
                    <FormattedNumberInput
                      value={state.costPerEncounter}
                      onChange={(v) => updateState({ costPerEncounter: v })}
                      step={0.01}
                      className="border-0 h-auto p-0 shadow-none text-[16px] font-medium text-[#1A1A1A] tabular-nums focus-visible:ring-0 w-full"
                      data-testid="ed-investment-input-cost-per-encounter"
                    />
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E7E3DD] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#565250]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#565250]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#7C766F] mt-[10px] leading-[1.5]">
                  {formatNumber(state.annualEncounters)} encounters × ${(state.costPerEncounter ?? 0).toFixed(2)}. Switch pricing model above to match your contract.
                </div>
              </>
            ) : state.pricingModel === "platform" ? (
              <>
                <div className="grid grid-cols-2 gap-[14px]">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Annual platform fee</div>
                    <div className="h-[54px] border-[1.5px] border-[#E4DED6] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[14px] transition-colors focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE]">
                      <span className="text-[16px] font-bold text-[#1A1A1A] mr-[1px]">$</span>
                      <FormattedNumberInput
                        value={state.annualLicenseFee}
                        onChange={(v) => updateState({ annualLicenseFee: v })}
                        className="border-0 h-auto p-0 shadow-none text-[16px] font-medium text-[#1A1A1A] tabular-nums focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-platform-license"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Per-encounter rate</div>
                    <div className="h-[54px] border-[1.5px] border-[#E4DED6] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[14px] transition-colors focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE]">
                      <span className="text-[16px] font-bold text-[#1A1A1A] mr-[1px]">$</span>
                      <FormattedNumberInput
                        value={state.platformEncRate ?? 0}
                        onChange={(v) => updateState({ platformEncRate: v })}
                        step={0.01}
                        className="border-0 h-auto p-0 shadow-none text-[16px] font-medium text-[#1A1A1A] tabular-nums focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-platform-enc-rate"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E7E3DD] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#565250]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#565250]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#7C766F] mt-[10px] leading-[1.5]">
                  {formatCurrency(state.annualLicenseFee)} platform + {formatNumber(state.annualEncounters)} enc × ${(state.platformEncRate ?? 0).toFixed(2)}.
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Annual license fee</div>
                  <div className="h-[54px] border-[1.5px] border-[#E4DED6] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[14px] transition-colors focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE] max-w-[220px]">
                    <span className="text-[16px] font-bold text-[#1A1A1A] mr-[1px]">$</span>
                    <FormattedNumberInput
                      value={state.annualLicenseFee}
                      onChange={(v) => updateState({ annualLicenseFee: v })}
                      className="border-0 h-auto p-0 shadow-none text-[16px] font-medium text-[#1A1A1A] tabular-nums focus-visible:ring-0 w-full"
                      data-testid="ed-investment-input-annual-license"
                    />
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E7E3DD] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#565250]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#565250]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#7C766F] mt-[10px] leading-[1.5]">
                  Fixed annual fee. Switch pricing model above to match your contract.
                </div>
              </>
            )}
          </div>

          {/* Return stack + continue, anchored to the right column */}
          <div className="flex flex-col gap-5 h-full">
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[24px_26px] flex-1">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-4">What it returns</div>

            {totalValue > 0 && (
              <div className="flex h-[14px] rounded-[7px] overflow-hidden bg-[#F3EEE7] mb-[18px]">
                {QUADRANT_ORDER.map((q) => {
                  const proofNote = (PROOF_LAYER[state.careSetting ?? ""] ?? {})[q];
                  const v = valueByQuadrant[q] || 0;
                  return !proofNote && v > 0 ? (
                    <div key={q} style={{ width: `${(v / totalValue) * 100}%`, background: DOMAIN_COLORS[q] }} />
                  ) : null;
                })}
              </div>
            )}

            {QUADRANT_ORDER.map((q) => {
              const proofNote = (PROOF_LAYER[state.careSetting ?? ""] ?? {})[q];
              return (
                <div key={q} className="flex justify-between items-baseline py-[9px] border-b border-[#EDE5D8] text-[15px]">
                  <span className={`flex items-center gap-[10px] ${proofNote ? "text-[#7C766F]" : "text-[#565250]"}`}>
                    <span className="w-[10px] h-[10px] rounded-[3px] flex-shrink-0" style={{ background: DOMAIN_COLORS[q] }} />
                    {q}
                  </span>
                  {proofNote ? (
                    <span className="text-[13px] text-[#7C766F] italic">{proofNote}</span>
                  ) : (
                    <span className="font-abridge text-[17px] text-[#1A1A1A]">{formatCurrency(valueByQuadrant[q])}</span>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between items-baseline pt-[13px] text-[15px]">
              <span className="text-[#1A1A1A] font-bold">Total annual value</span>
              <span className="font-abridge text-[19px] text-[#1A1A1A]">{formatCurrency(totalValue)}</span>
            </div>
            <div className="flex justify-between items-baseline py-[9px] text-[15px]">
              <span className="text-[#565250]">Your investment</span>
              <span className="font-abridge text-[17px] text-[#565250]">{formatCurrency(-annualInvestment)}</span>
            </div>

            <div className="mt-[14px] pt-[18px] border-t-2 border-[#E7E3DD]">
              {/* Before pricing is entered, investment is $0 and "net" would be the
                  gross wearing a net label (net of nothing). Label it honestly as
                  value-before-cost and hold the celebratory coral until a real
                  return exists. */}
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">
                {annualInvestment > 0 ? "Net annual value" : "Value before cost"}
              </div>
              {/* Coral is reserved for a real gain (pricing entered, net positive); before that,
                  and for a loss, the number reads in neutral ink, never celebratory. */}
              <div className={`font-abridge text-[34px] sm:text-[46px] leading-none mt-[7px] ${annualInvestment > 0 && netAnnualValue >= 0 ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {formatCurrency(netAnnualValue)}
                <span className="text-[16px] text-[#565250]"> / yr</span>
              </div>
              {annualInvestment <= 0 ? (
                <div className="inline-flex items-center gap-[9px] mt-[14px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-full px-[15px] py-[8px]">
                  <span className="text-[12.5px] font-bold text-[#565250]">Add your pricing to see the return</span>
                </div>
              ) : netAnnualValue > 0 ? (
                <div className="inline-flex items-center gap-[9px] mt-[14px] bg-[#FFEDE7] border border-[#F5D3C8] rounded-full px-[15px] py-[8px]">
                  <span className="font-abridge text-[19px] text-[#EA2C00]">{roi.toFixed(1)}×</span>
                  <span className="text-[12.5px] font-bold text-[#B02200]">
                    ≈ {formatPerDollar(netPerDollar)} net back for every $1 spent
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-[9px] mt-[14px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-full px-[15px] py-[8px]">
                  <span className="font-abridge text-[19px] text-[#565250]">{roi.toFixed(1)}×</span>
                  <span className="text-[12.5px] font-bold text-[#565250]">
                    the modeled value doesn&apos;t cover the cost at this scope
                  </span>
                </div>
              )}
            </div>

            <p className="text-[12.5px] text-[#565250] leading-[1.55] mt-[18px]">
              <b className="text-[#1A1A1A] font-bold">Most of this builds over the first year</b> as adoption ramps. Time given back shows first, in weeks; revenue capture and recapture follow across the year.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onNext}
              data-testid="ed-investment-continue"
              className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] flex-shrink-0"
            >
              See your model →
            </button>
          </div>
          </div>
        </div>

        <p className="text-[12px] text-[#7C766F] max-w-[560px] leading-[1.5] mt-6">
          An estimate built from the figures you entered, not a guarantee of financial results. Actual outcomes vary. You confirm the real numbers as you measure.
        </p>
      </div>
    </EditorialShell>
  );
}
