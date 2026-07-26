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

export default function EdInvestment({
  state,
  updateState,
  totalHoursSaved,
  efficiencyValue,
  documentationValue,
  onNext,
  onBack,
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

  const formatCurrency = (n: number) => (n < 0 ? "−$" + Math.abs(Math.round(n)).toLocaleString() : "$" + Math.round(n).toLocaleString());
  const formatNumber = (n: number) => Math.round(n).toLocaleString();

  return (
    <EditorialShell>
      <EditorialHeader stepName="Investment" stepIndex={8} onBack={onBack} />
      <div className="max-w-[1160px] mx-auto px-12 pt-[44px] pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#5E534A]">Explore · Step 8 of 9</div>
        <h1 className="font-abridge text-[38px] leading-[1.06] text-[#1A1A1A] mt-[10px]">What it costs, and what&apos;s left.</h1>
        <p className="text-[16px] text-[#5E534A] mt-[13px] max-w-[620px] leading-[1.5]">
          Enter your pricing. Everything the prior screens built, minus the cost, is what&apos;s left.
        </p>

        <div className="grid grid-cols-[1fr_1.08fr] gap-[22px] mt-8 items-start">
          {/* Investment card */}
          <div className="bg-[#FDFBF8] border border-[#E8E2DA] rounded-[20px] p-[24px_26px]">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-4">Your investment</div>

            <div className="inline-flex gap-[3px] bg-[#F1EBE3] border border-[#E4DACC] rounded-[12px] p-1 mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateState({ pricingModel: tab.id })}
                  data-testid={`ed-investment-tab-${tab.id}`}
                  className={`text-[13px] font-bold rounded-[8px] px-[18px] py-[9px] transition-colors ${
                    state.pricingModel === tab.id ? "bg-white text-[#EA2C00] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#5E534A]"
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
                    <div className="h-[44px] border border-[#E8E2DA] rounded-[11px] bg-white flex items-center px-[13px] text-[15px] font-bold text-[#1A1A1A]">
                      <FormattedNumberInput
                        value={isNursing ? state.nursingStaffedBeds : state.numberOfProviders}
                        onChange={(v) => updateState(isNursing ? { nursingStaffedBeds: v } : { numberOfProviders: v })}
                        onBlurValue={(v) => updateState(isNursing ? { nursingStaffedBeds: Math.max(v, 1) } : { numberOfProviders: Math.max(v, 1) })}
                        className="border-0 h-auto p-0 shadow-none text-[15px] font-bold focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-providers"
                      />
                    </div>
                    <div className="text-[11px] text-[#786C5E] mt-[6px]">from your practice</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">
                      Cost per {isNursing ? "bed" : "provider"} / month
                    </div>
                    <div className="h-[44px] border border-[#E8E2DA] rounded-[11px] bg-white flex items-center gap-[2px] px-[13px]">
                      <span className="text-[14px] font-semibold text-[#5E534A]">$</span>
                      <FormattedNumberInput
                        value={state.costPerProvider}
                        onChange={(v) => updateState({ costPerProvider: v })}
                        className="border-0 h-auto p-0 shadow-none text-[15px] font-bold focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-cost-per-provider"
                      />
                    </div>
                    <div className="text-[11px] text-[#786C5E] mt-[6px]">your contract rate</div>
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E8E2DA] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#5E534A]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#5E534A]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#786C5E] mt-[10px] leading-[1.5]">
                  {formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)} {isNursing ? "beds" : "providers"} × {formatCurrency(state.costPerProvider)} × 12 months. Switch pricing model above to match your contract.
                </div>
              </>
            ) : state.pricingModel === "perEncounter" ? (
              <>
                <div>
                  <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Cost per encounter</div>
                  <div className="h-[44px] border border-[#E8E2DA] rounded-[11px] bg-white flex items-center gap-[2px] px-[13px] max-w-[220px]">
                    <span className="text-[14px] font-semibold text-[#5E534A]">$</span>
                    <FormattedNumberInput
                      value={state.costPerEncounter}
                      onChange={(v) => updateState({ costPerEncounter: v })}
                      step={0.01}
                      className="border-0 h-auto p-0 shadow-none text-[15px] font-bold focus-visible:ring-0 w-full"
                      data-testid="ed-investment-input-cost-per-encounter"
                    />
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E8E2DA] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#5E534A]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#5E534A]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#786C5E] mt-[10px] leading-[1.5]">
                  {formatNumber(state.annualEncounters)} encounters × ${(state.costPerEncounter ?? 0).toFixed(2)}. Switch pricing model above to match your contract.
                </div>
              </>
            ) : state.pricingModel === "platform" ? (
              <>
                <div className="grid grid-cols-2 gap-[14px]">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Annual platform fee</div>
                    <div className="h-[44px] border border-[#E8E2DA] rounded-[11px] bg-white flex items-center gap-[2px] px-[13px]">
                      <span className="text-[14px] font-semibold text-[#5E534A]">$</span>
                      <FormattedNumberInput
                        value={state.annualLicenseFee}
                        onChange={(v) => updateState({ annualLicenseFee: v })}
                        className="border-0 h-auto p-0 shadow-none text-[15px] font-bold focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-platform-license"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Per-encounter rate</div>
                    <div className="h-[44px] border border-[#E8E2DA] rounded-[11px] bg-white flex items-center gap-[2px] px-[13px]">
                      <span className="text-[14px] font-semibold text-[#5E534A]">$</span>
                      <FormattedNumberInput
                        value={state.platformEncRate ?? 0}
                        onChange={(v) => updateState({ platformEncRate: v })}
                        step={0.01}
                        className="border-0 h-auto p-0 shadow-none text-[15px] font-bold focus-visible:ring-0 w-full"
                        data-testid="ed-investment-input-platform-enc-rate"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E8E2DA] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#5E534A]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#5E534A]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#786C5E] mt-[10px] leading-[1.5]">
                  {formatCurrency(state.annualLicenseFee)} platform + {formatNumber(state.annualEncounters)} enc × ${(state.platformEncRate ?? 0).toFixed(2)}.
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2">Annual license fee</div>
                  <div className="h-[44px] border border-[#E8E2DA] rounded-[11px] bg-white flex items-center gap-[2px] px-[13px] max-w-[220px]">
                    <span className="text-[14px] font-semibold text-[#5E534A]">$</span>
                    <FormattedNumberInput
                      value={state.annualLicenseFee}
                      onChange={(v) => updateState({ annualLicenseFee: v })}
                      className="border-0 h-auto p-0 shadow-none text-[15px] font-bold focus-visible:ring-0 w-full"
                      data-testid="ed-investment-input-annual-license"
                    />
                  </div>
                </div>
                <div className="mt-5 pt-[18px] border-t border-[#E8E2DA] flex justify-between items-baseline">
                  <span className="text-[13px] text-[#5E534A]">Annual investment</span>
                  <span className="font-abridge text-[26px] text-[#1A1A1A]">
                    {formatCurrency(annualInvestment)}
                    <span className="text-[13px] text-[#5E534A]"> / yr</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#786C5E] mt-[10px] leading-[1.5]">
                  Fixed annual fee. Switch pricing model above to match your contract.
                </div>
              </>
            )}
          </div>

          {/* Return stack */}
          <div className="bg-[#FDFBF8] border border-[#E8E2DA] rounded-[20px] p-[24px_26px]">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-4">What it returns</div>

            <div className="flex justify-between items-baseline py-[9px] border-b border-[#EDE5D8] text-[15px]">
              <span className="text-[#5E534A]">Capacity</span>
              <span className="font-abridge text-[17px] text-[#1A1A1A]">{formatCurrency(valueByQuadrant.Capacity)}</span>
            </div>
            <div className="flex justify-between items-baseline py-[9px] border-b border-[#EDE5D8] text-[15px]">
              <span className="text-[#5E534A]">Workforce</span>
              <span className="font-abridge text-[17px] text-[#1A1A1A]">{formatCurrency(valueByQuadrant.Workforce)}</span>
            </div>
            <div className="flex justify-between items-baseline py-[9px] border-b border-[#EDE5D8] text-[15px]">
              <span className="text-[#5E534A]">Revenue</span>
              <span className="font-abridge text-[17px] text-[#1A1A1A]">{formatCurrency(valueByQuadrant.Revenue)}</span>
            </div>
            <div className="flex justify-between items-baseline py-[9px] border-b border-[#EDE5D8] text-[15px]">
              <span className="text-[#786C5E]">Quality</span>
              <span className="text-[13px] text-[#786C5E] italic">proof, counted in Revenue</span>
            </div>
            <div className="flex justify-between items-baseline pt-[13px] text-[15px]">
              <span className="text-[#1A1A1A] font-bold">Total annual value</span>
              <span className="font-abridge text-[19px] text-[#1A1A1A]">{formatCurrency(totalValue)}</span>
            </div>
            <div className="flex justify-between items-baseline py-[9px] text-[15px]">
              <span className="text-[#5E534A]">Your investment</span>
              <span className="font-abridge text-[17px] text-[#5E534A]">{formatCurrency(-annualInvestment)}</span>
            </div>

            <div className="mt-[14px] pt-[18px] border-t-2 border-[#E8E2DA]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">Net annual value</div>
              <div className="font-abridge text-[46px] text-[#EA2C00] leading-none mt-[7px]">
                {formatCurrency(netAnnualValue)}
                <span className="text-[16px] text-[#5E534A]"> / yr</span>
              </div>
              <div className="inline-flex items-center gap-[9px] mt-[14px] bg-[#FFEDE7] border border-[#F5D3C8] rounded-full px-[15px] py-[8px]">
                <span className="font-abridge text-[19px] text-[#EA2C00]">{roi.toFixed(1)}×</span>
                <span className="text-[12.5px] font-bold text-[#B02200]">
                  ≈ ${netPerDollar.toFixed(2)} net back for every $1 spent
                </span>
              </div>
            </div>

            <p className="text-[12.5px] text-[#5E534A] leading-[1.55] mt-[18px]">
              <b className="text-[#1A1A1A] font-bold">Most of this builds over the first year</b> as adoption ramps. Time given back shows first, in weeks; revenue capture and recapture follow across the year.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-[26px]">
          <p className="text-[12px] text-[#786C5E] max-w-[560px] leading-[1.5]">
            An estimate built from the figures you entered, not a guarantee of financial results. Actual outcomes vary. You confirm the real numbers as you measure.
          </p>
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
    </EditorialShell>
  );
}
