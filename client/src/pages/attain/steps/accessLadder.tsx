import type { AccessChainResult } from "@/lib/attain/attainAccess";

/**
 * THE SHARED ACCESS LADDER.
 *
 * Build the case (editable) and Planning (read-only) tell ONE continuous
 * step-down story: minutes saved per note is the first domino, freed hours
 * and directed share multiply it into new capacity, demand is THE GATE that
 * decides how much of that capacity actually converts, and the realized
 * visits become the dollar prize. This module is the single source of that
 * story's ORDER, its first-domino framing, its gate framing, and its derived
 * NUMBERS, so the two pages can never drift apart.
 *
 * Every number here comes straight off `computeAccessChain` (see
 * attainAccess.ts). Nothing is invented; a rung with no real value yet reads
 * as a clean "Not set yet" prompt, never a fabricated figure.
 */

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function fmtHours(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

export function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** The whole ladder's derived numbers, computed once off the raw access
 * chain. Both surfaces read from this, so a rung shows the identical figure
 * whether it is being built (Build the case) or read back on the hook
 * (Planning). */
export interface AccessLadderModel {
  /** The first domino: minutes saved per note, the target we prove first. */
  minutes: number;
  /** Average visit length capacity is priced against. */
  visitLen: number;
  providersInScope: number;
  /** Freed hours per provider per week, the multiplied first rung. */
  freedHrsPerProviderWk: number;
  /** New visit capacity per year (already directed-share adjusted). */
  capacityVisits: number;
  /** The share of freed time directed to access (the rest stays as relief). */
  directedSharePct: number;
  /** The gate: real countable demand, the ceiling on how much converts. */
  demandCeiling: number;
  /** MIN(capacity, demand), the visits that actually convert. */
  realizedVisits: number;
  /** Which side of the gate is binding, so the gate and the prize agree. */
  binding: AccessChainResult["payoff"]["binding"];
  /** The derived dollar prize. */
  prize: number;
  /** Blended contribution margin realized per visit. */
  marginPerVisit: number;
}

/**
 * Derives the shared ladder model. Operational rungs (freed hours, capacity,
 * demand) come off the raw chain; the realized-visit COUNT and the dollar
 * PRIZE are passed in so each surface can supply its own
 * realization/attribution-applied figures (Build the case reads them off its
 * live chain, Planning reads them off the combined engine result) without the
 * two ever computing the ladder's shape differently.
 */
export function deriveAccessLadder(
  chain: AccessChainResult,
  opts: { realizedVisits: number; prize: number },
): AccessLadderModel {
  const providersInScope = chain.scope.providersInScope;
  const freedHrsPerProviderWk =
    providersInScope > 0 ? chain.capacity.freedHoursTotal / providersInScope / 52 : 0;
  const realizedVisits = opts.realizedVisits;
  const prize = opts.prize;
  return {
    minutes: chain.capacity.minutesSavedPerNote,
    visitLen: chain.capacity.visitLengthMinutes,
    providersInScope,
    freedHrsPerProviderWk,
    capacityVisits: chain.capacity.capacityVisits,
    directedSharePct: chain.capacity.effectiveSharePct,
    demandCeiling: chain.demand.demandCeiling,
    realizedVisits,
    binding: chain.payoff.binding,
    prize,
    marginPerVisit: realizedVisits > 0 ? prize / realizedVisits : chain.payoff.blendedMarginUsed,
  };
}

/** Small uppercase field label, shared so the gate reads the same on both
 * surfaces. */
export function LadderFieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{children}</p>;
}

/** One rung on the read-only step-down spine (Planning). A rung with no real
 * value yet reads as a clean "Not set yet" prompt, never a fabricated
 * number. */
export function SpineRung({
  value,
  unit,
  label,
  caption,
  isSet,
  emptyHint,
  anchor,
  payoff,
}: {
  value: string;
  unit: string;
  label: string;
  caption: string;
  isSet: boolean;
  emptyHint: string;
  anchor?: boolean;
  payoff?: boolean;
}) {
  if (payoff) {
    return (
      <div className="rounded-xl bg-[#1A1A1A] p-5" data-testid="rung-planning-payoff">
        <p className="text-[9px] font-bold uppercase tracking-[2px] text-white/40 mb-1">{label}</p>
        {isSet ? (
          <p className="font-abridge text-3xl md:text-4xl text-[#EA2C00] font-bold" data-testid="text-planning-prize">
            {value} <span className="text-sm font-normal text-white/50">{unit}</span>
          </p>
        ) : (
          <p className="text-sm text-white/60" data-testid="text-planning-prize-empty">{emptyHint}</p>
        )}
        <p className="text-[11px] text-white/50 mt-2 leading-relaxed">{caption}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-4 border ${anchor ? "bg-[#FFF6F3] border-[#EA2C00]" : "bg-white border-[#E7E0D6]"}`}
      data-testid={anchor ? "rung-planning-anchor" : undefined}
    >
      {anchor && (
        <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#EA2C00] px-2 py-0.5 rounded-full mb-2">
          The first domino
        </span>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-semibold text-[#3A3A3A]">{label}</p>
        {isSet ? (
          <p className={`font-abridge text-2xl font-bold ${anchor ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
            {value} <span className="text-[11px] font-normal text-[#8C8C8C]">{unit}</span>
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-[#B4B4B4]">Not set yet</p>
        )}
      </div>
      <p className="text-[11px] text-[#8C8C8C] mt-1 leading-relaxed">{isSet ? caption : emptyHint}</p>
    </div>
  );
}

/** THE GATE, shared verbatim between Build the case and Planning. Capacity
 * meets demand, and realized visits is the SMALLER of the two, never the sum.
 * It shows both facts side by side, then the slice that actually converts, so
 * a large capacity collapsing to a small realized count reads as a ceiling,
 * not a cliff or a lost multiplication.
 *
 * `showHeader` carries the "The gate / Demand decides how much converts"
 * banner (Planning uses it inline on its spine; Build the case supplies its
 * own rung eyebrow above the demand inputs and turns it off), but the framing
 * copy and the triad itself are identical on both. */
export function CapacityDemandGate({
  capacityVisits,
  demandCeiling,
  realizedVisits,
  binding,
  bothSet,
  emptyHint,
  showHeader = true,
}: {
  capacityVisits: number;
  demandCeiling: number;
  realizedVisits: number;
  binding: "capacity" | "demand" | "none";
  bothSet: boolean;
  emptyHint: string;
  showHeader?: boolean;
}) {
  const explain =
    binding === "demand"
      ? `Only ${fmtInt(realizedVisits)} of the ${fmtInt(capacityVisits)} capacity has demand behind it. Demand is the ceiling, so the rest books nothing yet.`
      : binding === "capacity"
        ? `Demand outruns the capacity you have, so every one of the ${fmtInt(realizedVisits)} visits you can staff converts. Capacity is the limiter here.`
        : "Set both capacity and demand to see how much actually converts.";

  return (
    <div className="rounded-lg border border-[#E7E0D6] bg-[#F4F0EA] p-4" data-testid="rung-planning-gate">
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#1A1A1A] px-2 py-0.5 rounded-full">
            The gate
          </span>
          <p className="text-[12px] font-semibold text-[#1A1A1A]">Demand decides how much converts</p>
        </div>
      )}

      {bothSet ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <LadderFieldLabel>Capacity you created</LadderFieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-gate-capacity">
                {fmtInt(capacityVisits)} <span className="text-[11px] font-normal text-[#8C8C8C]">visits / yr</span>
              </p>
            </div>
            <div>
              <LadderFieldLabel>Real demand waiting</LadderFieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-gate-demand">
                {fmtInt(demandCeiling)} <span className="text-[11px] font-normal text-[#8C8C8C]">visits</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E0D9CE]">
            <LadderFieldLabel>Realized visits, the smaller of the two</LadderFieldLabel>
            <p className="font-abridge text-2xl font-bold text-[#EA2C00]" data-testid="text-planning-gate-realized">
              {fmtInt(realizedVisits)} <span className="text-[11px] font-normal text-[#8C8C8C]">realized visits / yr</span>
            </p>
            <p className="text-[11px] text-[#8C8C8C] mt-1 leading-relaxed" data-testid="text-planning-gate-explain">{explain}</p>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-[#8C8C8C] leading-relaxed">{emptyHint}</p>
      )}
    </div>
  );
}
