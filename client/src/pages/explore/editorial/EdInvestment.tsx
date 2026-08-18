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
  "inline-flex items-baseline gap-[2px] border-b-2 border-[#EA2C00] pb-[2px] mt-[10px] whitespace-nowrap";
const MONEY_ENTRY_INPUT =
  "min-w-[36px] max-w-[150px] [field-sizing:content] bg-transparent border-0 p-0 shadow-none font-abridge text-[30px] md:text-[30px] text-[#1A1A1A] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none";

// Module scope keeps a stable identity across renders — a nested component
// remounts on every keystroke and drops input focus.
function MoneyEntry({ value, onChange, step, testId }: { value: number; onChange: (v: number) => void; step?: number; testId: string }) {
  return (
    <span className={MONEY_ENTRY_WRAP}>
      <span className="font-abridge text-[30px] text-[#1A1A1A] leading-none">$</span>
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

  const sectLabel = "text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]";
  const fieldLabel = "text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#8C8073]";
  const chip = (active: boolean) =>
    `text-[12px] font-bold px-[14px] py-[7px] rounded-full transition-colors ${active ? "bg-[#2E2822] text-white" : "bg-[#F2ECE3] text-[#565250]"}`;
  const carriedFigure = "font-abridge text-[30px] text-[#A79E92] tabular-nums mt-[10px] pb-[2px] border-b-2 border-transparent inline-block";

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
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 8 of 9</div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">What it costs, and what&apos;s left.</h1>
        <p className="text-[16px] text-[#565250] mt-[12px] max-w-[600px] leading-[1.55]">
          Enter your pricing. Everything the prior screens built, minus the cost, is what&apos;s left.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1.06fr] gap-x-[56px] gap-y-10 mt-[46px]">
          {/* LEFT — your investment */}
          <div>
            <div className={sectLabel}>Your investment</div>

            <div className="flex flex-wrap gap-[7px] mt-4">
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

            <div className="flex flex-wrap gap-x-[48px] gap-y-6 mt-7">
              {state.pricingModel === "perProvider" && (
                <>
                  <div>
                    <div className={fieldLabel}>{isNursing ? "Staffed beds" : "Providers"}</div>
                    {/* Read-only: scale is set in the opportunity setup where it drives BOTH value
                        and investment; editing here would only rescale cost, breaking the ROI. */}
                    <div className={carriedFigure} data-testid="ed-investment-input-providers">{formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)}</div>
                    <div className="text-[11px] text-[#8C8073] mt-[6px]">From your setup, so the value stays in sync</div>
                  </div>
                  <div>
                    <div className={fieldLabel}>Cost per {isNursing ? "bed" : "provider"} / month</div>
                    <MoneyEntry value={state.costPerProvider} onChange={(v) => updateState({ costPerProvider: v })} testId="ed-investment-input-cost-per-provider" />
                    <div className="text-[11px] text-[#8C8073] mt-[6px]">your contract rate</div>
                  </div>
                </>
              )}
              {state.pricingModel === "perEncounter" && (
                <div>
                  <div className={fieldLabel}>Cost per encounter</div>
                  <MoneyEntry value={state.costPerEncounter} onChange={(v) => updateState({ costPerEncounter: v })} step={0.01} testId="ed-investment-input-cost-per-encounter" />
                  <div className="text-[11px] text-[#8C8073] mt-[6px]">your contract rate</div>
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

            <div className="mt-9 pt-5 border-t border-[#EDE8E1]">
              <div className="flex justify-between items-baseline">
                <span className="text-[15px] text-[#3A342E]">Annual investment</span>
                <span className="font-abridge text-[28px] text-[#1A1A1A]">
                  {formatCurrency(annualInvestment)}
                  <span className="text-[13px] text-[#8C8073]"> / yr</span>
                </span>
              </div>
              <div className="text-[12.5px] text-[#8C8073] mt-[9px] leading-[1.5]">{breakdown}</div>
            </div>
          </div>

          {/* vertical hairline */}
          <div className="hidden lg:block bg-[#E8E2DA]" />

          {/* RIGHT — what it returns */}
          <div>
            <div className={sectLabel}>What it returns</div>

            {totalValue > 0 && (
              <div className="flex h-[12px] rounded-full overflow-hidden bg-[#F3EEE7] mt-[18px] mb-[22px] gap-[2px]">
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
              return (
                <div key={q} className="flex justify-between items-baseline py-[11px] border-b border-[#EDE8E1] text-[15px]">
                  <span className={`flex items-center gap-[10px] ${proofNote ? "text-[#7C766F]" : "text-[#3A342E]"}`}>
                    <span className="w-[10px] h-[10px] rounded-[3px] flex-shrink-0" style={{ background: DOMAIN_COLORS[q] }} />
                    {q}
                  </span>
                  {proofNote ? (
                    <span className="text-[13px] text-[#8C8073] italic">{proofNote}</span>
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

            <div className="mt-4 pt-5 border-t-2 border-[#1A1A1A]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]">
                {annualInvestment > 0 ? "Net annual value" : "Value before cost"}
              </div>
              <div className={`font-abridge text-[40px] sm:text-[52px] leading-[0.95] mt-[8px] ${annualInvestment > 0 && netAnnualValue >= 0 ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {formatCurrency(netAnnualValue)}
                <span className="text-[16px] text-[#8C8073]"> / yr</span>
              </div>
              {annualInvestment <= 0 ? (
                <div className="text-[13px] text-[#8C8073] mt-[12px]">Add your pricing to see the return.</div>
              ) : netAnnualValue > 0 ? (
                <div className="mt-[14px] text-[15px] text-[#3A342E]">
                  <b className="font-abridge text-[20px] text-[#EA2C00]">{roi.toFixed(1)}×</b>{" "}
                  return · ≈ <b className="font-bold text-[#1A1A1A]">{formatPerDollar(netPerDollar)}</b> net back for every $1 spent
                </div>
              ) : (
                <div className="mt-[14px] text-[15px] text-[#565250]">
                  <b className="font-abridge text-[20px] text-[#565250]">{roi.toFixed(1)}×</b> · the modeled value doesn&apos;t cover the cost at this scope
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-14">
          <button
            type="button"
            onClick={onNext}
            data-testid="ed-investment-continue"
            className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)]"
          >
            See your model →
          </button>
        </div>

        <p className="text-[12px] text-[#8C8073] max-w-[560px] leading-[1.5] mt-10">
          An estimate built from the figures you entered, not a guarantee of financial results. Actual outcomes vary. You confirm the real numbers as you measure.
        </p>
      </div>
    </EditorialShell>
  );
}
