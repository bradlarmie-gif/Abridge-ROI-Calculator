import type { AccessChainResult } from "@/lib/attain/attainAccess";
import { computeAccessCapacity, DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
import type { WorkforceChainResult } from "@/lib/attain/attainWorkforce";
import { WORKFORCE_IMPACT_CEILING_PP } from "@/lib/attain/attainWorkforce";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { AttainSetting } from "@/lib/attain/attainTypes";

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

/**
 * THE SHARED RETENTION (WORKFORCE) LADDER, built beside the access one so the
 * two goals tell the SAME step-down story from one abstraction.
 *
 * Retention starts on the identical first domino as access, minutes saved per
 * note, but reads them the other way: the freed time that is NOT handed to the
 * schedule stays with the clinician and comes off the evening's after-hours
 * charting. Less work outside of work is a better experience, which lowers
 * burnout, which raises likelihood-to-stay, which avoids voluntary departures,
 * whose replacement cost is the CFO dollar. The step-down:
 *
 *   minutes saved / note  (first domino, same as access)
 *     -> freed hours per provider per week          (same computation as access)
 *     -> protected relief (the share that stays with the clinician)
 *     -> burnout comes down (the composite impact, capped at the ceiling)
 *   THE GATE: burnout-related departures = providers x turnover x burnout share
 *     -> departures avoided = pool x the impact captured
 *   THE PRIZE: departures avoided x replacement cost.
 *
 * Every number reconciles to `computeWorkforceChain` (attainWorkforce.ts): the
 * burnout pool is `providers x turnover% x burnoutShare%`, the impact captured
 * is the chain's own composite `sustain.compositeImpactPct`, and their product
 * is exactly `payoff.departuresAvoided`. The freed-hours rung reuses access's
 * own `computeAccessCapacity` primitive so "freed hours" means the same thing
 * on both goals' ladders. The prize and departures-avoided COUNT are passed in
 * (so each surface supplies its own realization/split-applied figures, exactly
 * like `deriveAccessLadder`), never recomputed differently.
 */
export interface RetentionLadderModel {
  /** The first domino: minutes saved per note, shared with access. */
  minutes: number;
  providersInScope: number;
  /** Freed hours per provider per week, the same computation as access. */
  freedHrsPerProviderWk: number;
  /** The share of that freed time the plan keeps as protected relief. */
  protectedSharePct: number;
  /** Freed hours per provider per week that stay with the clinician. */
  protectedHrsPerProviderWk: number;
  /** Burnout comes down: the composite impact, a share of burnout-related
   * departures avoided, capped at the reachable ceiling. */
  compositeImpactPct: number;
  /** The reachable ceiling for this setting (15% outpatient). */
  impactCeilingPct: number;
  turnoverRatePct: number;
  burnoutSharePct: number;
  /** THE GATE: burnout-related departures a year = the ceiling on how many
   * departures this plan could ever avoid. */
  burnoutPool: number;
  /** Realized: departures avoided = pool x compositeImpact. */
  departuresAvoided: number;
  replacementCost: number;
  /** The derived dollar prize. */
  prize: number;
}

/** Derives the shared retention ladder model. Operational rungs (freed hours,
 * protected relief, composite impact, the burnout pool) come off the raw
 * workforce chain; the departures-avoided COUNT and the dollar PRIZE are
 * passed in so each surface can supply its own realization/split-applied
 * figures, exactly as `deriveAccessLadder` does. */
export function deriveRetentionLadder(
  chain: WorkforceChainResult,
  setting: AttainSetting,
  baseline: AttainBaseline,
  opts: { minutes: number; departuresAvoided: number; prize: number },
): RetentionLadderModel {
  const providersInScope = chain.scope.providersInScope;
  const minutes = opts.minutes > 0 ? opts.minutes : DEFAULT_MINUTES_SAVED_PER_NOTE;

  // Reuse access's own freed-time primitive so "freed hours" is the identical
  // number on both ladders. Effective share is irrelevant to freedHoursTotal
  // (100 here), and visit length never enters the freed-hours figure.
  const freedHoursTotal =
    providersInScope > 0
      ? computeAccessCapacity(baseline, { providersInScope, lines: [], enterprise: false }, minutes, 100).freedHoursTotal
      : 0;
  const freedHrsPerProviderWk = providersInScope > 0 ? freedHoursTotal / providersInScope / 52 : 0;

  const protectedSharePct = chain.protect.effectiveSharePct;
  const protectedHrsPerProviderWk = freedHrsPerProviderWk * (protectedSharePct / 100);

  const burnoutPool =
    providersInScope * (chain.scope.turnoverRatePct / 100) * (chain.scope.burnoutSharePct / 100);

  return {
    minutes,
    providersInScope,
    freedHrsPerProviderWk,
    protectedSharePct,
    protectedHrsPerProviderWk,
    compositeImpactPct: chain.sustain.compositeImpactPct,
    impactCeilingPct: WORKFORCE_IMPACT_CEILING_PP[setting],
    turnoverRatePct: chain.scope.turnoverRatePct,
    burnoutSharePct: chain.scope.burnoutSharePct,
    burnoutPool,
    departuresAvoided: opts.departuresAvoided,
    replacementCost: chain.scope.replacementCost,
    prize: opts.prize,
  };
}

/** Format a small hours figure (one decimal). */
export function fmtHoursShort(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

/** Format a revenue count: whole numbers for large pools, one decimal for
 * the small fractional condition counts a single department can produce, so
 * a real 0.6 conditions never collapses to a fabricated 0 or 1. */
export function fmtRevenueCount(n: number): string {
  if (n > 0 && n < 10) return (Math.round(n * 10) / 10).toLocaleString();
  return Math.round(n).toLocaleString();
}

/**
 * THE REVENUE DIAGNOSIS GATE, the documentation-caused-share analog of
 * `CapacityDemandGate` / `BurnoutPoolGate`, shared verbatim between Build the
 * case and Planning for one revenue path. This is the load-bearing rung of
 * the revenue conversation: it separates the leak Abridge can actually move
 * (claims going out below the care delivered, undocumented conditions, denials
 * the note can prevent) from what Abridge cannot touch (payer rules,
 * authorization, care that genuinely was not delivered). The
 * documentation-caused pool is the ceiling; what converts is a slice of it,
 * never more.
 */
export function RevenuePathGate({
  ceilingLabel,
  ceilingCount,
  ceilingUnit,
  capturedLabel,
  capturedCount,
  capturedUnit,
  whoActs,
  bothSet,
  emptyHint,
  showHeader = true,
}: {
  ceilingLabel: string;
  ceilingCount: number;
  ceilingUnit: string;
  capturedLabel: string;
  capturedCount: number;
  capturedUnit: string;
  whoActs: string;
  bothSet: boolean;
  emptyHint: string;
  showHeader?: boolean;
}) {
  const explain =
    capturedCount > 0
      ? `Of the ${fmtRevenueCount(ceilingCount)} the note can move, this plan converts ${fmtRevenueCount(capturedCount)}. The rest is the leak Abridge cannot touch, payer rules and authorization, so it stays out of the number.`
      : "Abridge can only move the leak the documentation causes. Set the ceiling and commit to a share of it to see how much converts.";

  return (
    <div className="rounded-lg border border-[#E7E0D6] bg-[#F4F0EA] p-4" data-testid="rung-planning-revenue-gate">
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#1A1A1A] px-2 py-0.5 rounded-full">
            The gate
          </span>
          <p className="text-[12px] font-semibold text-[#1A1A1A]">The documentation sets the ceiling on what you capture</p>
        </div>
      )}

      {bothSet ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <LadderFieldLabel>{ceilingLabel}</LadderFieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-revenue-gate-ceiling">
                {fmtRevenueCount(ceilingCount)} <span className="text-[11px] font-normal text-[#8C8C8C]">{ceilingUnit}</span>
              </p>
            </div>
            <div>
              <LadderFieldLabel>Who has to act</LadderFieldLabel>
              <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug" data-testid="text-planning-revenue-gate-owner">{whoActs}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E0D9CE]">
            <LadderFieldLabel>{capturedLabel}</LadderFieldLabel>
            <p className="font-abridge text-2xl font-bold text-[#EA2C00]" data-testid="text-planning-revenue-gate-captured">
              {fmtRevenueCount(capturedCount)} <span className="text-[11px] font-normal text-[#8C8C8C]">{capturedUnit}</span>
            </p>
            <p className="text-[11px] text-[#8C8C8C] mt-1 leading-relaxed" data-testid="text-planning-revenue-gate-explain">{explain}</p>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-[#8C8C8C] leading-relaxed">{emptyHint}</p>
      )}
    </div>
  );
}

/** Format a departures-avoided count (one decimal, since it is usually a
 * fraction of a person per year at a single-department scale). */
export function fmtDepartures(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

/**
 * THE RETENTION GATE, the burnout-pool analog of `CapacityDemandGate`, shared
 * verbatim between Build the case and Planning. You can only avoid the
 * departures burnout actually causes, so the pool (providers x turnover x
 * burnout share) is the ceiling, and the composite impact captures a slice of
 * it. It shows the pool and the captured share side by side, then the realized
 * departures avoided, so a large pool collapsing to a small realized count
 * reads as a ceiling, not a cliff.
 */
export function BurnoutPoolGate({
  burnoutPool,
  compositeImpactPct,
  departuresAvoided,
  turnoverRatePct,
  burnoutSharePct,
  bothSet,
  emptyHint,
  showHeader = true,
}: {
  burnoutPool: number;
  compositeImpactPct: number;
  departuresAvoided: number;
  turnoverRatePct: number;
  burnoutSharePct: number;
  bothSet: boolean;
  emptyHint: string;
  showHeader?: boolean;
}) {
  const explain =
    departuresAvoided > 0
      ? `Of the ${fmtDepartures(burnoutPool)} burnout-related departures a year, this plan avoids ${fmtDepartures(departuresAvoided)}. The pool is the ceiling, so the rest are departures burnout still causes.`
      : "You can only avoid departures burnout actually causes. Set your scope and protect some relief to capture a slice of this pool.";

  return (
    <div className="rounded-lg border border-[#E7E0D6] bg-[#F4F0EA] p-4" data-testid="rung-planning-gate">
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#1A1A1A] px-2 py-0.5 rounded-full">
            The gate
          </span>
          <p className="text-[12px] font-semibold text-[#1A1A1A]">Burnout sets the ceiling on what you can avoid</p>
        </div>
      )}

      {bothSet ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <LadderFieldLabel>Burnout-related departures / yr</LadderFieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-gate-pool">
                {fmtDepartures(burnoutPool)} <span className="text-[11px] font-normal text-[#8C8C8C]">of a departure pool</span>
              </p>
            </div>
            <div>
              <LadderFieldLabel>Share this plan captures</LadderFieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-gate-impact">
                {fmtHoursShort(compositeImpactPct)}% <span className="text-[11px] font-normal text-[#8C8C8C]">of that pool</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E0D9CE]">
            <LadderFieldLabel>Departures avoided, the slice you capture</LadderFieldLabel>
            <p className="font-abridge text-2xl font-bold text-[#EA2C00]" data-testid="text-planning-gate-realized">
              {fmtDepartures(departuresAvoided)} <span className="text-[11px] font-normal text-[#8C8C8C]">departures avoided / yr</span>
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
