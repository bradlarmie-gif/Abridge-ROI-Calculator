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

// Editorial money entry. `md:text-[30px]` defeats the shared Input's default
// `md:text-sm`, which otherwise shrinks the typed figure on wide screens.
const MONEY_ENTRY_WRAP =
  "mt-2.5 flex items-baseline gap-1.5 w-[200px] rounded-[12px] border border-[#E2D8CB] bg-white pl-4 pr-5 py-2.5 shadow-[inset_0_1px_2px_rgba(26,26,26,0.04)] focus-within:border-[#EA2C00] focus-within:ring-2 focus-within:ring-[#EA2C00]/15 transition-colors";
const MONEY_ENTRY_INPUT =
  "w-full min-w-0 bg-transparent border-0 p-0 h-auto shadow-none text-[19px] md:text-[19px] font-bold text-[#1A1A1A] tabular-nums text-right focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none placeholder:not-italic placeholder:text-[15px] placeholder:text-[#B5AA9B]";

// Module scope keeps a stable identity across renders — a nested component
// remounts on every keystroke and drops input focus.
function MoneyEntry({ value, onChange, step, testId }: { value: number; onChange: (v: number) => void; step?: number; testId: string }) {
  return (
    <span className={MONEY_ENTRY_WRAP}>
      <span className="text-[15px] text-[#6B6259] leading-none">$</span>
      <FormattedNumberInput value={value} onChange={onChange} step={step} className={MONEY_ENTRY_INPUT} data-testid={testId} />
    </span>
  );
}

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

  const sectLabel = "text-[10.5px] font-extrabold tracking-[0.12em] uppercase text-[#443A32]";
  const fieldLabel = "text-[14px] font-semibold text-[#1A1A1A]";
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-all ${active ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(26,26,26,0.10),0_2px_6px_-2px_rgba(26,26,26,0.12)]" : "text-[#7A6F63] hover:text-[#1A1A1A]"}`;
  const carriedFigure = "mt-2.5 w-[200px] rounded-[12px] border border-[#E9E0D4] bg-[#F1ECE5] pl-4 pr-5 py-2.5 text-right text-[19px] font-bold text-[#6B6259] tabular-nums";

  const breakdown =
    state.pricingModel === "perProvider"
      ? `${formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)} ${isNursing ? "beds" : "providers"} × ${formatCurrency(state.costPerProvider)} × 12 months`
      : state.pricingModel === "perEncounter"
        ? `${formatNumber(state.annualEncounters)} encounters × $${(state.costPerEncounter ?? 0).toFixed(2)}`
        : state.pricingModel === "platform"
          ? `${formatCurrency(state.annualLicenseFee)} platform + ${formatNumber(state.annualEncounters)} enc × $${(state.platformEncRate ?? 0).toFixed(2)}`
          : "Fixed annual fee";

  return (
    <EditorialShell>
      <EditorialHeader stepName="Investment" stepIndex={8} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 8 of 9</div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">What it costs, and what&apos;s left.</h1>
        <p className="text-[16px] text-[#565250] mt-[12px] max-w-[600px] leading-[1.55]">
          Everything the model built, minus the price.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 lg:gap-8 items-start mt-9">
          {/* LEFT — your investment */}
          <div className="rounded-[20px] border border-[#E9E0D4] bg-[#F6F1EA]/90 px-5 sm:px-6 py-5">
            <div className={sectLabel}>The price</div>

            <div className="inline-flex flex-wrap rounded-full bg-[#EBE2D6] p-1 mt-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateState({ pricingModel: tab.id })}
                  data-testid={`ed-investment-tab-${tab.id}`}
                  className={chip(state.pricingModel === tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-5 mt-6">
              {state.pricingModel === "perProvider" && (
                <>
                  <div>
                    <div className={fieldLabel}>{isNursing ? "Staffed beds" : "Providers"}</div>
                    {/* Read-only: scale is set in the opportunity setup where it drives BOTH value
                        and investment; editing here would only rescale cost, breaking the ROI. */}
                    <div className={carriedFigure} data-testid="ed-investment-input-providers">{formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)}</div>
                    <div className="text-[12px] text-[#6B6259] mt-1.5">From step 2</div>
                  </div>
                  <div>
                    <div className={fieldLabel}>Cost per {isNursing ? "bed" : "provider"} / month</div>
                    <MoneyEntry value={state.costPerProvider} onChange={(v) => updateState({ costPerProvider: v })} testId="ed-investment-input-cost-per-provider" />
                    <div className="text-[12px] text-[#6B6259] mt-1.5">Contract rate</div>
                  </div>
                </>
              )}
              {state.pricingModel === "perEncounter" && (
                <div>
                  <div className={fieldLabel}>Cost per encounter</div>
                  <MoneyEntry value={state.costPerEncounter} onChange={(v) => updateState({ costPerEncounter: v })} step={0.01} testId="ed-investment-input-cost-per-encounter" />
                  <div className="text-[12px] text-[#6B6259] mt-1.5">Contract rate</div>
                </div>
              )}
              {state.pricingModel === "platform" && (
                <>
                  <div>
                    <div className={fieldLabel}>Annual platform fee</div>
                    <MoneyEntry value={state.annualLicenseFee} onChange={(v) => updateState({ annualLicenseFee: v })} testId="ed-investment-input-platform-license" />
                  </div>
                  <div>
                    <div className={fieldLabel}>Per-encounter rate</div>
                    <MoneyEntry value={state.platformEncRate ?? 0} onChange={(v) => updateState({ platformEncRate: v })} step={0.01} testId="ed-investment-input-platform-enc-rate" />
                  </div>
                </>
              )}
              {state.pricingModel === "annual" && (
                <div>
                  <div className={fieldLabel}>Annual license fee</div>
                  <MoneyEntry value={state.annualLicenseFee} onChange={(v) => updateState({ annualLicenseFee: v })} testId="ed-investment-input-annual-license" />
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#E6DCCF]">
              <div className="flex justify-between items-baseline">
                <span className="text-[15px] font-semibold text-[#1A1A1A]">Annual investment</span>
                <span className="font-abridge text-[26px] text-[#1A1A1A] tabular-nums">
                  {formatCurrency(annualInvestment)}
                  <span className="text-[13px] text-[#6B6259]"> / yr</span>
                </span>
              </div>
              <div className="text-[12.5px] text-[#565250] mt-[6px] leading-[1.5]">{breakdown}</div>
            </div>
          </div>

          {/* RIGHT — what it returns, Continue directly under it */}
          <div className="space-y-4">
          <div className="rounded-[22px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.24)] overflow-hidden">
            <div className="px-6 pt-5 pb-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF] text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">What it returns</div>
            <div className="p-6">

            {totalValue > 0 && (
              <div className="flex h-[12px] rounded-full overflow-hidden bg-[#F3EEE7] mb-4 gap-[2px]">
                {QUADRANT_ORDER.map((q) => {
                  const proofNote = (PROOF_LAYER[state.careSetting ?? ""] ?? {})[q];
                  const v = valueByQuadrant[q] || 0;
                  return !proofNote && v > 0 ? (
                    <div key={q} className="rounded-[3px]" style={{ width: `${(v / totalValue) * 100}%`, background: DOMAIN_COLORS[q] }} />
                  ) : null;
                })}
              </div>
            )}

            {QUADRANT_ORDER.map((q) => {
              const proofNote = (PROOF_LAYER[state.careSetting ?? ""] ?? {})[q];
              // Same rule as Step 9 (EdModel): Workforce with no counted dollars
              // because retention is booked as a signal is TRACKED, not a bare $0.
              const workforceTracked = q === "Workforce" && (valueByQuadrant[q] || 0) === 0 && state.retentionMode === "tracked";
              const isTracked = !!proofNote || workforceTracked;
              return (
                <div key={q} className="flex justify-between items-baseline py-[10px] border-b border-[#EFE8DE] text-[14.5px]">
                  <span className={`flex items-center gap-[10px] ${isTracked ? "text-[#6B6259]" : "text-[#1A1A1A]"}`}>
                    <span className="w-[10px] h-[10px] rounded-[3px] flex-shrink-0" style={{ background: DOMAIN_COLORS[q] }} />
                    {q}
                  </span>
                  {isTracked ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6B6259] bg-white border border-[#E2D8CB] rounded-full px-2.5 py-0.5">Tracked</span>
                  ) : (
                    <span className="font-abridge text-[18px] text-[#1A1A1A]">{formatCurrency(valueByQuadrant[q])}</span>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between items-baseline pt-[14px] text-[15px]">
              <span className="text-[#1A1A1A] font-bold">Total annual value</span>
              <span className="font-abridge text-[20px] text-[#1A1A1A]">{formatCurrency(totalValue)}</span>
            </div>
            <div className="flex justify-between items-baseline py-[10px] text-[15px]">
              <span className="text-[#565250]">Your investment</span>
              <span className="font-abridge text-[18px] text-[#565250]">{formatCurrency(-annualInvestment)}</span>
            </div>

            <div className="mt-4 rounded-[16px] bg-[#F6F1EA] border border-[#E9E0D4] px-5 py-4">
              <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#443A32]">
                {annualInvestment > 0 ? "Net annual value" : "Value before cost"}
              </div>
              <div className={`font-abridge text-[40px] sm:text-[46px] leading-[0.95] mt-1.5 tabular-nums ${annualInvestment > 0 && netAnnualValue >= 0 ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {formatCurrency(netAnnualValue)}
                <span className="text-[16px] text-[#8C8073]"> / yr</span>
              </div>
              {annualInvestment <= 0 ? (
                <div className="text-[13px] text-[#565250] mt-2">Add the price to see the return.</div>
              ) : netAnnualValue > 0 ? (
                <div className="mt-2.5 text-[14px] text-[#1A1A1A]">
                  <b className="font-abridge text-[20px] text-[#EA2C00]">{roi.toFixed(1)}×</b>{" "}
                  return · ≈ <b className="font-bold text-[#1A1A1A]">{formatPerDollar(netPerDollar)}</b> net back for every $1 spent
                </div>
              ) : (
                <div className="mt-2.5 text-[14px] text-[#565250]">
                  <b className="font-abridge text-[20px] text-[#565250]">{roi.toFixed(1)}×</b> · the modeled value doesn&apos;t cover the cost at this scope
                </div>
              )}
            </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onNext}
            data-testid="ed-investment-continue"
            className="w-full bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[15px] rounded-full hover:bg-[#d12800] transition-colors shadow-[0_10px_24px_-12px_rgba(234,44,0,0.6)]"
          >
            See your model →
          </button>
          </div>
        </div>

        <p className="text-[12px] text-[#6B6259] max-w-[560px] leading-[1.5] mt-10">
          An estimate built from the figures you entered, not a guarantee of financial results. Actual outcomes vary. You confirm the real numbers as you measure.
        </p>
      </div>
    </EditorialShell>
  );
}
