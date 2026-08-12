import { useMemo } from "react";
import type { ExploreState } from "@/pages/explore";
import { computeExploreTotals } from "@/lib/exploreDriverCalcs";
import { PROOF_LAYER, QUADRANT_ORDER, type ProofDomain } from "@/lib/proofLayer";
import { AnimatedValue } from "@/components/explore/AnimatedValue";

/**
 * The persistent "your model so far" rail. Lives in the right column of every
 * value step + the investment page and GROWS as drivers turn on, so the flow
 * reads as one model assembling — not nine isolated resetting boxes.
 *
 * Pure presentation of the engine: it reads `computeExploreTotals` (the same
 * rollup the model screen + PDF use) so a number shown here IS the number in
 * the PDF by construction. Money is coral (tints by domain); the domains that
 * are tracked-not-counted for this setting (PROOF_LAYER) render as a tracked
 * row, never a $0 bar.
 */

const fmtMoney = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

// coral-tint progression, deepest → lightest by QUADRANT_ORDER (money = coral family)
const DOMAIN_TINT: Record<ProofDomain, string> = {
  Capacity: "#EA2C00",
  Workforce: "#F26A45",
  Revenue: "#F7A488",
  Quality: "#F9B79D",
};
const DOMAIN_STEP: Record<ProofDomain, string> = {
  Capacity: "step 4",
  Workforce: "step 5",
  Revenue: "step 6",
  Quality: "step 7",
};

export interface ValueRailProps {
  state: ExploreState;
  totalHoursSaved: number;
  /** The domain of the screen the rail is currently on ("building now"). Omit on the investment page. */
  activeDomain?: ProofDomain;
  /** Investment page: pass the annual investment to turn the rail into the payoff (net + ROI). */
  investment?: number;
}

export default function ValueRail({ state, totalHoursSaved, activeDomain, investment }: ValueRailProps) {
  const setting = state.careSetting ?? "outpatient";
  const proof = PROOF_LAYER[setting] ?? {};
  const totals = useMemo(() => computeExploreTotals(state, totalHoursSaved), [state, totalHoursSaved]);
  const vbq = totals.valueByQuadrant;

  // counted = a domain with a dollar for this setting (not in the proof layer); tracked = proof.
  const counted = QUADRANT_ORDER.filter((q) => !proof[q]) as ProofDomain[];
  const tracked = QUADRANT_ORDER.filter((q) => proof[q]) as ProofDomain[];
  const domainTotal = counted.reduce((s, q) => s + (vbq[q] || 0), 0);

  const onInvestment = investment != null;
  const net = domainTotal - (investment ?? 0);
  const roi = investment && investment > 0 ? domainTotal / investment : 0;
  const seg = (v: number) => (domainTotal > 0 ? `${(v / domainTotal) * 100}%` : "0%");

  return (
    <div className="lg:sticky lg:top-6">
      <div className="bg-white border border-[#E7E3DD] rounded-[22px] p-8 sm:p-9 shadow-[0_1px_3px_rgba(40,30,20,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#7C766F]">
            {onInvestment ? "Your model" : "Your model so far"}
          </span>
          {!onInvestment && (
            <span className="text-[11px] font-bold text-[#EA2C00] bg-[#FFEDE7] rounded-full px-[10px] py-[4px]">building</span>
          )}
        </div>

        {/* headline: the assembled total (count-up) */}
        <div>
          <AnimatedValue value={domainTotal} format={fmtMoney} duration={450} className="font-abridge text-[46px] sm:text-[52px] leading-none text-[#EA2C00]" />
          <span className="text-[15px] text-[#7C766F]"> / yr</span>
        </div>
        {onInvestment ? (
          <div className="text-[13.5px] text-[#565250] mt-3 leading-[1.55]">
            net of a <b className="text-[#1A1A1A]">{fmtMoney(investment!)}</b> investment,{" "}
            <b className="text-[#EA2C00]">{fmtMoney(net)}</b> / yr comes back{roi > 0 ? <> ≈ <b className="text-[#EA2C00]">{roi.toFixed(1)}×</b></> : null}.
          </div>
        ) : (
          <div className="text-[13.5px] text-[#565250] mt-3 leading-[1.55]">
            Built from your own numbers, across the four areas we model.
          </div>
        )}

        {/* the growing stacked bar over the counted domains */}
        {domainTotal > 0 && (
          <div className="flex h-[16px] rounded-[8px] overflow-hidden mt-8 bg-[#F3EEE7]">
            {counted.map((q) =>
              (vbq[q] || 0) > 0 ? <div key={q} style={{ width: seg(vbq[q]), background: DOMAIN_TINT[q] }} /> : null,
            )}
          </div>
        )}

        {/* domain rows: dollar for counted, "tracked, not counted" for proof domains */}
        <div className="mt-7 flex flex-col">
          {counted.map((q) => {
            const active = q === activeDomain;
            return (
              <div key={q} className="flex items-center justify-between py-[13px] border-b border-[#F1ECE4] last:border-b-0">
                <div className="flex items-center gap-[11px]">
                  <span className="w-[11px] h-[11px] rounded-[3px] flex-shrink-0" style={{ background: DOMAIN_TINT[q] }} />
                  <span className={`text-[15px] text-[#1A1A1A] ${active ? "font-bold" : "font-medium"}`}>{q}</span>
                  <span className={`text-[11.5px] ${active ? "text-[#EA2C00]" : "text-[#7C766F] italic"}`}>
                    {active ? "building now" : `from ${DOMAIN_STEP[q]}`}
                  </span>
                </div>
                <span className="font-abridge text-[18px] text-[#1A1A1A] tabular-nums">{fmtMoney(vbq[q] || 0)}</span>
              </div>
            );
          })}
          {tracked.map((q, i) => (
            <div
              key={q}
              className={`flex items-center justify-between py-[13px] ${i === 0 ? "border-t border-[#E7E3DD] mt-[6px] pt-[16px]" : ""}`}
            >
              <span className="text-[13.5px] text-[#565250]">{q}</span>
              <span className="text-[12.5px] italic text-[#7C766F]">tracked, not counted</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12.5px] text-[#7C766F] mt-[16px] leading-[1.55] text-center max-w-[360px] mx-auto">
        {onInvestment
          ? "Everything the prior steps built, against the cost. This is what's left."
          : "This stays with you across every step. Each driver you turn on lands here, so the model is already built by the time you reach the end."}
      </p>
    </div>
  );
}
