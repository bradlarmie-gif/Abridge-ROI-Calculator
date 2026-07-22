import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeAccessChain } from "@/lib/attain/attainAccess";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import {
  PLAN_PHASE_IDS,
  phaseBoundaries,
  phaseValueRamp,
  phaseOwner as resolvePhaseOwner,
  phaseSignalTarget as resolvePhaseSignalTarget,
  type AttainPlanning,
  type PlanPhaseId,
} from "@/lib/attain/attainPlanning";
import { CADENCE_OPTIONS, CADENCE_LABEL, type GoalOwner, type SignalCadence } from "./StepCommit";

function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmtHours(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}

interface StepPlanningProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  /** The access goal's own lever values (the D1-D5 chain inputs). */
  values: LeverValues;
  /** The combined engine result, used only for this priority's realization-
   * applied prize and realized-visit count (`byGoal.access`). Every other
   * rung comes straight off the raw access chain below. */
  combined: MultiGoalContributionsResult | null;
  goalOwner: GoalOwner;
  onChangeGoalOwner: (patch: Partial<GoalOwner>) => void;
  planning: AttainPlanning;
  onChangePhaseOwner: (phase: PlanPhaseId, name: string) => void;
  onChangePhaseSignalTarget: (phase: PlanPhaseId, target: string) => void;
  onChangePartnerRisk: (text: string) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  /** The plan horizon in months (outpatient access is 9). The target month
   * and the three phase boundaries are all derived from this. */
  totalMonths: number;
  stepNumber: number;
}

/** One rung on the step-down spine. A rung with no real value yet reads as a
 * clean "Not set yet" prompt, never a fabricated number. */
function SpineRung({
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

/** Small uppercase field label, matched to StepCommit's own `Field`. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{children}</p>;
}

/** The one rung on the spine that is NOT a multiplication: capacity meets
 * demand, and realized visits is the SMALLER of the two, never the sum. It
 * shows both facts side by side, then the slice that actually converts, so a
 * large capacity collapsing to a small realized count reads as a ceiling, not
 * a cliff or a lost multiplication. */
function CapacityDemandGate({
  capacityVisits,
  demandCeiling,
  realizedVisits,
  binding,
  bothSet,
  emptyHint,
}: {
  capacityVisits: number;
  demandCeiling: number;
  realizedVisits: number;
  binding: "capacity" | "demand" | "none";
  bothSet: boolean;
  emptyHint: string;
}) {
  const explain =
    binding === "demand"
      ? `Only ${fmtInt(realizedVisits)} of the ${fmtInt(capacityVisits)} capacity has demand behind it. Demand is the ceiling, so the rest books nothing yet.`
      : binding === "capacity"
        ? `Demand outruns the capacity you have, so every one of the ${fmtInt(realizedVisits)} visits you can staff converts. Capacity is the limiter here.`
        : "Set both capacity and demand to see how much actually converts.";

  return (
    <div className="rounded-lg border border-[#E7E0D6] bg-[#F4F0EA] p-4" data-testid="rung-planning-gate">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#1A1A1A] px-2 py-0.5 rounded-full">
          The gate
        </span>
        <p className="text-[12px] font-semibold text-[#1A1A1A]">Demand decides how much converts</p>
      </div>

      {bothSet ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Capacity you created</FieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-gate-capacity">
                {fmtInt(capacityVisits)} <span className="text-[11px] font-normal text-[#8C8C8C]">visits / yr</span>
              </p>
            </div>
            <div>
              <FieldLabel>Real demand waiting</FieldLabel>
              <p className="font-abridge text-2xl font-bold text-[#1A1A1A]" data-testid="text-planning-gate-demand">
                {fmtInt(demandCeiling)} <span className="text-[11px] font-normal text-[#8C8C8C]">visits</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E0D9CE]">
            <FieldLabel>Realized visits, the smaller of the two</FieldLabel>
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

const PHASE_META: Record<PlanPhaseId, { label: string; intent: string; signalLabel: string }> = {
  start: {
    label: "Start",
    intent: "Start small. One line first, and prove the minutes are real before anything scales.",
    signalLabel: "Minutes saved per note",
  },
  expand: {
    label: "Expand",
    intent: "The signal held. Widen the scope and watch the wait start to fall.",
    signalLabel: "Third-next-available dropping",
  },
  steady: {
    label: "Steady",
    intent: "Full scope. The goal is attained and the number is holding.",
    signalLabel: "Realized visits per year",
  },
};

export default function StepPlanning({
  setting,
  baseline,
  values,
  combined,
  goalOwner,
  onChangeGoalOwner,
  planning,
  onChangePhaseOwner,
  onChangePhaseSignalTarget,
  onChangePartnerRisk,
  planCadence,
  onChangePlanCadence,
  totalMonths,
  stepNumber,
}: StepPlanningProps) {
  const goalDef = GOAL_CATALOG.access;

  // Every operational rung comes off the raw access chain (a real, honest
  // capacity/demand number, never attribution-scaled). Only the prize and
  // the realized-visit COUNT read from the combined result, so they reflect
  // this priority's realization the same way every other surface does.
  const chain = computeAccessChain(baseline, values, 1);
  const access = combined?.byGoal.access;

  const providersInScope = chain.scope.providersInScope;
  const minutes = chain.capacity.minutesSavedPerNote;
  const visitLen = chain.capacity.visitLengthMinutes;
  const freedHrsPerProviderWk = providersInScope > 0 ? chain.capacity.freedHoursTotal / providersInScope / 52 : 0;
  // Capacity is ALREADY directed-share adjusted: computeAccessCapacity prices
  // capacity off freedHoursToAccess = freedHoursTotal * (share directed to
  // access), never gross freed hours. `directedSharePct` is that same D3 share
  // (after any cross-goal scaling), surfaced so the rung can name it out loud
  // and the number can never look like "all freed time converted".
  const capacityVisits = chain.capacity.capacityVisits;
  const directedSharePct = chain.capacity.effectiveSharePct;
  const demandCeiling = chain.demand.demandCeiling;
  const realizedVisits = access?.totalCount ?? chain.payoff.realizedVisits;
  // Which side of the ceiling actually limits the outcome, straight off the
  // chain, so the gate rung and the payoff can never disagree.
  const binding = chain.payoff.binding;
  const prize = access?.totalMargin ?? 0;
  const marginPerVisit = realizedVisits > 0 ? prize / realizedVisits : chain.payoff.blendedMarginUsed;

  const lines = !chain.scope.enterprise ? asLines(values.accessLines) : [];
  const targetMonth = totalMonths > 0 ? Math.round(totalMonths) : 9;

  const boundaries = phaseBoundaries(targetMonth);
  const ramp = phaseValueRamp(prize);
  const ownerName = goalOwner.name.trim();

  // Derived, editable default target per phase's leading signal — never a
  // fabricated figure: minutes/note is the committed anchor, realized visits
  // is the chain's own output, and the middle signal has no partner input to
  // derive from so it defaults to a benchmark the partner edits.
  const signalDefault: Record<PlanPhaseId, string> = {
    start: `${fmtInt(minutes)} min per note`,
    expand: "under 14 days",
    steady: realizedVisits > 0 ? `${fmtInt(realizedVisits)} per year` : "the full realized count",
  };

  const phaseScope: Record<PlanPhaseId, string> = {
    start:
      lines.length > 0
        ? `${lines[0]} first`
        : providersInScope > 0
          ? `A first cohort of the ${fmtInt(providersInScope)} providers`
          : "A first service line",
    expand:
      lines.length > 1
        ? `Add ${lines.slice(1).join(", ")}`
        : lines.length === 1
          ? `Widen beyond ${lines[0]}`
          : providersInScope > 0
            ? `Widen to more of the ${fmtInt(providersInScope)} providers`
            : "Widen the scope",
    steady:
      lines.length > 0
        ? `All lines: ${lines.join(", ")}`
        : providersInScope > 0
          ? `All ${fmtInt(providersInScope)} providers`
          : "Full scope",
  };

  const partnerRisk = planning.partnerRisk ?? "";

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · The plan to attain it
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Planning
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          One number does the work here: the minutes saved per note. It is the first domino. Freed hours, new capacity,
          realized visits, and the dollar prize are all multiplication on top of it. Below is the promise, the chain of
          logic under it, and the phased plan that gets there.
        </p>
      </motion.div>

      {/* 1 — The line of truth. The goal, the exec owner, the full prize, and
          the month it is due, read as one promise on the hook. */}
      <div className="rounded-2xl border border-[#E7E0D6] bg-[#F4F0EA] p-6 mb-8" data-testid="card-planning-promise">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
            style={{ background: goalDef.pillBg }}
          >
            {goalDef.pill}
          </span>
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">The promise</p>
        </div>
        <p className="text-lg md:text-[22px] leading-snug text-[#1A1A1A] font-semibold" data-testid="text-planning-promise-line">
          {goalDef.label}
          <span className="text-[#B4B4B4] font-normal"> · </span>
          Owned by {ownerName ? <span>{ownerName}</span> : <span className="text-[#EA2C00]">name the exec below</span>}
          <span className="text-[#B4B4B4] font-normal"> · </span>
          {prize > 0 ? (
            <span className="text-[#EA2C00]" data-testid="text-planning-promise-prize">{fmtMoneyCompact(prize)}</span>
          ) : (
            <span className="text-[#8C8C8C]">value pending</span>
          )}{" "}
          by month {targetMonth}
        </p>

        {/* Exec owner, editable right here. When no name is set the promise
            above points down to this prompt. */}
        <div className="mt-4 pt-4 border-t border-[#E0D9CE]">
          <FieldLabel>Exec owner (who answers for whether this lands)</FieldLabel>
          <div className="flex flex-wrap gap-3">
            <input
              value={goalOwner.name}
              onChange={(e) => onChangeGoalOwner({ name: e.target.value })}
              placeholder="Name, e.g. Dr. A. Rivera"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-planning-goal-owner-name"
            />
            <input
              value={goalOwner.title}
              onChange={(e) => onChangeGoalOwner({ title: e.target.value })}
              placeholder="Title / role, e.g. VP Ambulatory Ops"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-planning-goal-owner-title"
            />
          </div>
        </div>
      </div>

      {/* 2 — The step-down spine, rooted in minutes per note. Each rung is a
          derived number; the anchor at the top is the one we commit to and
          verify first. */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">How {fmtInt(minutes)} minutes per note becomes {prize > 0 ? fmtMoneyCompact(prize) : "the prize"}</h2>
        <p className="text-[12px] text-[#8C8C8C] mb-4 max-w-[560px] leading-relaxed">
          Read it top to bottom. The first rungs multiply: minutes saved become freed hours, and the freed hours you
          direct to access become new capacity. Then demand is the ceiling that decides how much of that capacity
          actually converts to visits, and those visits become dollars.
        </p>

        <div className="space-y-2" data-testid="section-planning-spine">
          <SpineRung
            anchor
            isSet
            value={fmtInt(minutes)}
            unit="min / note"
            label="Minutes saved per note"
            caption="The target we commit to and verify first. The partner does not know it yet, so this is the anchor we prove before scaling."
            emptyHint=""
          />
          <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
          <SpineRung
            isSet={freedHrsPerProviderWk > 0}
            value={fmtHours(freedHrsPerProviderWk)}
            unit="hrs / provider / wk"
            label="Freed time"
            caption="That time saved, added up across every note a provider writes in a week."
            emptyHint="Set your providers and encounters on Starting point to see the freed hours."
          />
          <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
          <SpineRung
            isSet={capacityVisits > 0}
            value={fmtInt(capacityVisits)}
            unit="visits / yr"
            label="New capacity"
            caption={`${fmtInt(directedSharePct)}% of the freed time is directed to access, the rest stays as relief, at about ${fmtInt(visitLen)} minutes a visit.`}
            emptyHint="Direct some freed time to access on Build the case to open capacity."
          />
          <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
          <CapacityDemandGate
            capacityVisits={capacityVisits}
            demandCeiling={demandCeiling}
            realizedVisits={realizedVisits}
            binding={binding}
            bothSet={capacityVisits > 0 && demandCeiling > 0}
            emptyHint={
              capacityVisits <= 0
                ? "Direct some freed time to access on Build the case to open capacity, then add your demand."
                : "Add your backlog and referral demand on Build the case to see how much of the capacity converts."
            }
          />
          <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-[#B4B4B4]" /></div>
          <SpineRung
            payoff
            isSet={prize > 0}
            value={fmtMoneyCompact(prize)}
            unit="contribution margin / yr"
            label="The prize"
            caption={prize > 0 ? `${fmtInt(realizedVisits)} realized visits at about $${fmtInt(marginPerVisit)} of margin each.` : "Finish the chain above and the prize appears here."}
            emptyHint="The prize appears once the chain above is complete."
          />
        </div>
      </div>

      {/* 3 — Three phases across the horizon. Each shows only scope, owner,
          the one leading signal and its target, and the value realized by the
          end of the phase (a derived ramp climbing to the full prize). */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">The phased plan, across {targetMonth} months</h2>
        <p className="text-[12px] text-[#8C8C8C] mb-4 max-w-[560px] leading-relaxed">
          Start small and prove the signal, widen once it holds, then run at full scope. The value climbs with the scope.
        </p>

        <div className="space-y-4" data-testid="section-planning-phases">
          {PLAN_PHASE_IDS.map((phaseId, i) => {
            const meta = PHASE_META[phaseId];
            const [from, to] = boundaries[phaseId];
            const owner = resolvePhaseOwner(planning, phaseId, ownerName);
            const target = resolvePhaseSignalTarget(planning, phaseId, signalDefault[phaseId]);
            const value = ramp[phaseId];
            return (
              <motion.div
                key={phaseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                className="rounded-xl border border-[#E7E0D6] bg-white p-5"
                data-testid={`card-planning-phase-${phaseId}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#1A1A1A] text-[10px] font-bold text-white font-abridge">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{meta.label}</p>
                      <p className="text-[10px] text-[#8C8C8C]">Months {from} to {to}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">Value by end of phase</p>
                    {prize > 0 ? (
                      <p className="font-abridge text-xl font-bold text-[#EA2C00]" data-testid={`text-planning-phase-value-${phaseId}`}>
                        {fmtMoneyCompact(value)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#B4B4B4] font-semibold">pending</p>
                    )}
                  </div>
                </div>

                <p className="text-[12px] text-[#3A3A3A] leading-relaxed mb-4">{meta.intent}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <FieldLabel>Scope</FieldLabel>
                    <p className="text-[13px] text-[#1A1A1A] font-medium" data-testid={`text-planning-phase-scope-${phaseId}`}>
                      {phaseScope[phaseId]}
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Owner</FieldLabel>
                    <input
                      value={owner}
                      onChange={(e) => onChangePhaseOwner(phaseId, e.target.value)}
                      placeholder={ownerName || "Name the owner"}
                      className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                      data-testid={`input-planning-phase-owner-${phaseId}`}
                    />
                  </div>
                </div>

                <div className="rounded-md bg-[#FFF6F3] border border-[#F3C9BE] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#EA2C00] px-2 py-0.5 rounded-full">
                      Leading signal
                    </span>
                    <p className="text-[12px] font-semibold text-[#1A1A1A]" data-testid={`text-planning-phase-signal-${phaseId}`}>
                      {meta.signalLabel}
                    </p>
                  </div>
                  <FieldLabel>Target</FieldLabel>
                  <input
                    value={target}
                    onChange={(e) => onChangePhaseSignalTarget(phaseId, e.target.value)}
                    placeholder={signalDefault[phaseId]}
                    className="h-9 w-full max-w-[280px] rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[12px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                    data-testid={`input-planning-phase-signal-target-${phaseId}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4 — The monthly checkpoint rhythm, one line, ending on attainment. */}
      <div className="rounded-xl border border-[#E7E0D6] bg-[#F4F0EA] p-5 mb-8" data-testid="card-planning-cadence">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">The checkpoint rhythm</p>
          <div className="flex items-center gap-2">
            <label htmlFor="select-planning-cadence" className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
              Reviewed
            </label>
            <Select value={planCadence} onValueChange={(v) => onChangePlanCadence(v as SignalCadence)}>
              <SelectTrigger id="select-planning-cadence" className="h-8 w-[122px] text-xs bg-white" data-testid="select-planning-cadence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap" data-testid="row-planning-cadence-months">
          {Array.from({ length: targetMonth }, (_, m) => m + 1).map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[#8C8C8C] whitespace-nowrap">Mo {m}</span>
              {m < targetMonth && <span className="text-[#D8CFC4]">·</span>}
            </div>
          ))}
          <span className="text-[#B4B4B4] mx-1">→</span>
          <span className="text-[11px] font-bold text-[#EA2C00] whitespace-nowrap" data-testid="text-planning-cadence-end">
            100% attained
          </span>
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-3 leading-relaxed">
          Checked {CADENCE_LABEL[planCadence]}. Each checkpoint asks the same thing: did the leading signal move, and is
          attainment where the plan expected it to be by now.
        </p>
      </div>

      {/* 5 — Optional partner-disclosed risk. Only becomes part of the plan
          once it is filled in; we never invent a weak link. */}
      <div className="rounded-xl border border-dashed border-[#D8CFC4] bg-white p-5 mb-4" data-testid="card-planning-risk">
        <FieldLabel>Anything the partner has flagged that could slow this down? (optional)</FieldLabel>
        <input
          value={partnerRisk}
          onChange={(e) => onChangePartnerRisk(e.target.value)}
          placeholder="e.g. new scheduling template is blocked until the EHR upgrade in Q3"
          className="h-10 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
          data-testid="input-planning-partner-risk"
        />
        {partnerRisk.trim() && (
          <div className="mt-3 bg-[#FFF6F3] border-l-[3px] border-[#EA2C00] rounded-r-md p-3" data-testid="callout-planning-risk">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Flagged by the partner</p>
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{partnerRisk.trim()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
