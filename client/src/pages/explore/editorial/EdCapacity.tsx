import { useMemo } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import {
  EmptyValueCard,
  SectionLabel,
  OutcomesBlock,
  Foot,
  formatCurrency,
  formatNum,
  type OutcomeSignal,
} from "./EdValueScreenKit";
import { InlineDriverCard, EqNum, EqCarried, EqOp, EqResult, EquationRow, EqAwaiting } from "./InlineEquation";
import { getDriversForPage, type ExploreDriver, type ExploreSetting } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";
import { type ExploreState } from "../ExploreFlow";
import { SignalWatch } from "./SignalWatch";
import { watchDomainFor } from "@/lib/exploreWatchSignals";
import ValueRail from "./ValueRail";

interface EdCapacityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  priorQuadrants?: PriorQuadrantEntry[];
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

// Nursing resolves its Capacity/Workforce signals through SignalWatch (WATCH_SIGNALS),
// so only the non-nursing settings need a TIER2 outcomes block here.
const TIER2: Partial<
  Record<
    ExploreSetting,
    { sectionLabel: string; heading: string; signals: OutcomeSignal[]; outcomes: string[]; note: string }
  >
> = {
  outpatient: {
    sectionLabel: "The access it opens",
    heading: "The access it can open",
    signals: [
      { label: "Time in note", ex: "ex. 6 → 2 min" },
      { label: "Same-day note closure", ex: "ex. 92 → 98%" },
      { label: "Notes closed in the visit", ex: "ex. +30 pts" },
    ],
    outcomes: ["Third-next-available comes down", "New-patient wait shortens", "Referral backlog clears"],
    note: "When these signals move, better access comes within reach. We track the signals so it's earned, not assumed, and never put a dollar on it here.",
  },
  ed: {
    sectionLabel: "The throughput it opens",
    heading: "The throughput it can open",
    signals: [
      { label: "Documentation time per encounter", ex: "ex. 8 → 3 min" },
      { label: "Door-to-provider time", ex: "ex. 32 → 21 min" },
      { label: "Encounters per provider per shift", ex: "ex. +1.2" },
    ],
    outcomes: ["Door-to-disposition time comes down", "LWBS keeps falling as throughput improves", "Boarding pressure eases"],
    note: "When these signals move, faster throughput comes within reach. We track the signals so it's earned, not assumed, and never put a dollar on it here.",
  },
  inpatient: {
    sectionLabel: "The flow it opens",
    heading: "The flow it can open",
    signals: [
      { label: "Documentation time per note", ex: "ex. 12 → 5 min" },
      { label: "H&P completion within 24 hours", ex: "ex. 78 → 95%" },
      { label: "Documentation lag", ex: "ex. 6 → 2 hrs" },
    ],
    outcomes: ["Discharge planning starts earlier", "Length of stay trends down", "Consult turnaround tightens"],
    note: "When these signals move, better flow comes within reach. We track the signals so it's earned, not assumed, and never put a dollar on it here.",
  },
};

export default function EdCapacity({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: EdCapacityProps) {
  const setting = state.careSetting;
  const td = state.timeDriverInputs;

  const drivers = setting ? getDriversForPage("Capacity", setting) : [];
  const topLevelDrivers = drivers.filter((d) => !d.childOfDriverId);
  const financialTopLevel = topLevelDrivers.filter((d) => d.visibility === "quantified");
  const flatFinancial = financialTopLevel.flatMap((d) => [
    d,
    ...drivers.filter((c) => c.childOfDriverId === d.id && c.visibility === "quantified"),
  ]);

  const updateTimeDriverInputs = (updates: Partial<typeof state.timeDriverInputs>) => {
    updateState({ timeDriverInputs: { ...state.timeDriverInputs, ...updates } });
  };

  const isEnabled = (driver: ExploreDriver): boolean => Boolean((td as any)[driver.enabledStateKey]);
  const isExpanded = (driver: ExploreDriver): boolean =>
    driver.expandedStateKey ? Boolean((td as any)[driver.expandedStateKey]) : false;

  const toggleEnabled = (driver: ExploreDriver) => {
    const current = isEnabled(driver);
    const updates: any = { [driver.enabledStateKey]: !current };
    if (!current && driver.expandedStateKey) updates[driver.expandedStateKey] = true;
    updateTimeDriverInputs(updates);
  };

  const engineValues = useMemo(() => computeAllDriverValues(state, totalHoursSaved), [state, totalHoursSaved]);
  const valueFor = (driverId: string) => engineValues[engineKeyForDriver(driverId, setting ?? "")] ?? 0;

  // Scale-gating: no dollar until the driver's scale input(s) are entered.
  const gate = (driverId: string) => {
    const r = driverScaleReadiness(driverId, state, totalHoursSaved);
    return r.ready ? undefined : { need: r.need };
  };

  const totalOn = flatFinancial.filter(isEnabled).length;
  const totalValue = flatFinancial.reduce((sum, d) => sum + (isEnabled(d) ? valueFor(d.id) : 0), 0);

  const renderDriver = (driver: ExploreDriver) => {
    const enabled = isEnabled(driver);

    if (driver.id === "patientAccess") {
      const effectiveAccessProviders = Math.min(td.accessProviders || state.numberOfProviders, state.numberOfProviders);
      const hrsPerProvPerWeek = state.numberOfProviders > 0 ? totalHoursSaved / state.numberOfProviders / 48 : 0;
      const reinvest = (td.capacityRealizationPercent ?? 25) / 100;
      const visitHrs = (td.visitDuration ?? 30) / 60;
      const visitsPerWeek = visitHrs > 0 ? Math.round((hrsPerProvPerWeek * reinvest / visitHrs) * 10) / 10 : 0;
      const annualVisits = Math.round(visitsPerWeek * effectiveAccessProviders * 48);
      const value = valueFor(driver.id);
      const awaiting = gate(driver.id);

      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle="Faster documentation gives providers time back. If some of those freed hours go to seeing more patients, each added visit earns your margin per visit."
          enabled={enabled}
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={
            <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live, then updates the model on the right. The visits are freed from your documentation time saved, reinvested at the rate you set below.</>
          }
        >
          {awaiting ? (
            <EqAwaiting need={awaiting.need} />
          ) : (
            <>
              <EquationRow>
                <EqCarried cap="added visits / yr">{formatNum(annualVisits)}</EqCarried>
                <EqOp>×</EqOp>
                <EqNum cap="margin / visit" value={td.revenuePerVisit} onChange={(v) => updateTimeDriverInputs({ revenuePerVisit: v })} prefix="$" />
                <EqResult value={value} />
              </EquationRow>
              <div className="mt-4 pt-4 border-t border-[#F1E4DC]">
                <div className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#7C766F] mb-3">How the visits are freed</div>
                <EquationRow>
                  <EqNum
                    cap="providers who can see more"
                    value={effectiveAccessProviders}
                    onChange={(v) => updateTimeDriverInputs({ accessProviders: Math.max(0, Math.min(v, state.numberOfProviders)) })}
                    suffix={`of ${state.numberOfProviders}`}
                  />
                  <EqNum cap="freed time they reinvest" value={td.capacityRealizationPercent ?? 25} onChange={(v) => updateTimeDriverInputs({ capacityRealizationPercent: v })} suffix="%" />
                  <EqNum cap="visit length" value={td.visitDuration} onChange={(v) => updateTimeDriverInputs({ visitDuration: v })} suffix="min" />
                </EquationRow>
              </div>
            </>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "lwbsRecovery") {
      const value = valueFor(driver.id);
      const awaiting = gate(driver.id);

      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          enabled={enabled}
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={
            <>Grey figures carry from your earlier steps; change any coral figure and this reprices live. Whether a recovered patient actually completes a visit also depends on beds, staffing, and throughput, so we attribute only <b className="text-[#B02200] not-italic">{td.edLwbsRealization}%</b> to faster documentation and leave the rest out.</>
          }
        >
          {awaiting ? (
            <EqAwaiting need={awaiting.need} />
          ) : (
            <EquationRow>
              <EqCarried cap="ED encounters">{formatNum(state.annualEncounters)}</EqCarried>
              <EqOp>×</EqOp>
              <EqNum cap="LWBS rate" value={td.edLwbsRate} onChange={(v) => updateTimeDriverInputs({ edLwbsRate: v })} suffix="%" />
              <EqOp>×</EqOp>
              <EqNum cap="recovered" value={td.edLwbsReduction} onChange={(v) => updateTimeDriverInputs({ edLwbsReduction: v })} suffix="%" />
              <EqOp>×</EqOp>
              <EqNum cap="per ED visit" value={td.edRevenuePerVisit} onChange={(v) => updateTimeDriverInputs({ edRevenuePerVisit: v })} prefix="$" />
              <EqOp>×</EqOp>
              <EqNum cap="attribution" value={td.edLwbsRealization} onChange={(v) => updateTimeDriverInputs({ edLwbsRealization: v })} suffix="%" />
              <EqResult value={value} />
            </EquationRow>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "admissionCapture") {
      const lwbsPatients = state.annualEncounters * (td.edLwbsRate / 100);
      const recovered = lwbsPatients * (td.edLwbsReduction / 100);
      const value = valueFor(driver.id);
      const awaiting = gate(driver.id);

      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          enabled={enabled}
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={
            <>Grey figures carry from LWBS Recovery above; change any coral figure and this reprices live. Whether a recovered patient is admitted depends on bed availability and clinical conversion, not the note, so we attribute only <b className="text-[#B02200] not-italic">{td.edAdmissionRealization}%</b> and leave the rest out.</>
          }
        >
          {!td.edLwbsEnabled && (
            <div className="mb-3 px-3.5 py-2.5 bg-[#FFF7F4] border border-[#FFDDD6] rounded-[10px] text-[12.5px] text-[#B23100] leading-[1.4]">
              Admission Capture uses LWBS-recovered patients as its base. Turn on LWBS Recovery above to see this value.
            </div>
          )}
          {awaiting ? (
            <EqAwaiting need={awaiting.need} />
          ) : (
            <EquationRow>
              <EqCarried cap="recovered patients">{formatNum(Math.round(recovered))}</EqCarried>
              <EqOp>×</EqOp>
              <EqNum cap="admit rate" value={td.edAdmissionRate} onChange={(v) => updateTimeDriverInputs({ edAdmissionRate: v })} suffix="%" />
              <EqOp>×</EqOp>
              <EqNum cap="margin / admission" value={td.edAdmissionRevenue} onChange={(v) => updateTimeDriverInputs({ edAdmissionRevenue: v })} prefix="$" />
              <EqOp>×</EqOp>
              <EqNum cap="attribution" value={td.edAdmissionRealization} onChange={(v) => updateTimeDriverInputs({ edAdmissionRealization: v })} suffix="%" />
              <EqResult value={value} />
            </EquationRow>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "nursingOvertime") {
      const value = valueFor(driver.id);
      const awaiting = gate(driver.id);

      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          enabled={enabled}
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={
            <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live. This counts documentation-driven overtime only, at your blended OT rate.</>
          }
        >
          {awaiting ? (
            <EqAwaiting need={awaiting.need} />
          ) : (
            <EquationRow>
              <EqCarried cap="nurses">{formatNum(state.numberOfProviders)}</EqCarried>
              <EqOp>×</EqOp>
              <EqNum cap="OT hrs / wk" value={td.nursingOtHoursPerNurseWeek} onChange={(v) => updateTimeDriverInputs({ nursingOtHoursPerNurseWeek: v })} suffix="hrs" />
              <EqOp>×</EqOp>
              <EqNum cap="Abridge reduces" value={td.nursingOtReductionPercent} onChange={(v) => updateTimeDriverInputs({ nursingOtReductionPercent: v })} suffix="%" />
              <EqOp>×</EqOp>
              <EqCarried cap="weeks">52</EqCarried>
              <EqOp>×</EqOp>
              <EqNum cap="per hour" value={td.nursingOtHourlyRate} onChange={(v) => updateTimeDriverInputs({ nursingOtHourlyRate: v })} prefix="$" />
              <EqResult value={value} />
            </EquationRow>
          )}
        </InlineDriverCard>
      );
    }

    // Fallback for any future Capacity quantified driver not yet wired here.
    return (
      <EmptyValueCard key={driver.id}>
        <b className="text-[#565250] font-bold">{driver.label}.</b> {driver.shortDescription}
      </EmptyValueCard>
    );
  };

  const tier2 = setting ? TIER2[setting] : null;

  // Inpatient is the one setting where Capacity is a NON-FINANCIAL proof layer:
  // we're only in the documentation, so we can show the signals move but we
  // won't put a dollar on throughput or length of stay we don't control. Present
  // it deliberately as proof (like Quality), never as an empty/unfinished dollar slot.
  const capacityIsProofLayer = setting === "inpatient";

  return (
    <EditorialShell>
      <EditorialHeader stepName="Capacity" stepIndex={4} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 4 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">What does the freed time become?</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[660px] leading-[1.5]">
          {capacityIsProofLayer ? (
            <>
              Those <b className="text-[#EA2C00] font-bold">{formatNum(totalHoursSaved)}</b> hours give the team room to move
              earlier in the day. In inpatient we hold capacity as proof, not a dollar: the signals below are ones we can
              show move, and we leave the throughput itself uncounted.
            </>
          ) : (
            <>
              Those <b className="text-[#EA2C00] font-bold">{formatNum(totalHoursSaved)}</b> hours can open real capacity. Turn on
              only what fits, every driver here is optional, and nothing counts until you switch it on.
            </>
          )}
        </p>

        <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-x-10 gap-y-8 items-start">
        <div className="min-w-0">
        {capacityIsProofLayer ? (
          <>
            <SectionLabel
              tag="no dollar counted here"
              tagMuted
              subtotal={
                <>
                  Where documentation turns into dollars, it&apos;s counted in{" "}
                  <b className="text-[#1A1A1A]">Revenue</b>
                </>
              }
            >
              The proof
            </SectionLabel>

            <div className="border border-[#E7E3DD] rounded-[14px] bg-[#FAF7F2] px-[18px] py-[15px] flex gap-3">
              <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00] flex-shrink-0 mt-[5px]" />
              <div className="text-[13.5px] text-[#565250] leading-[1.5]">
                <b className="text-[#1A1A1A]">We&apos;re only in the documentation, so capacity stays proof here on purpose.</b>{" "}
                Earlier, complete notes can let discharge planning and consults start sooner, but the days themselves depend
                on beds, staffing, and placement we don&apos;t touch. So we track the documentation signals that have to move
                first, and never put a dollar on the throughput.
              </div>
            </div>
          </>
        ) : (
          <>
            <SectionLabel
              tag="counts when it's on"
              subtotal={
                flatFinancial.length > 1 && (
                  <>
                    Counted on this screen&nbsp; <b className="font-abridge text-[#1A1A1A] text-[15px]">{formatCurrency(totalValue)}</b>{" "}
                    / yr &nbsp;·&nbsp;{" "}
                    <span className="text-[#7C766F] font-bold">
                      {totalOn} of {flatFinancial.length} drivers on
                    </span>
                  </>
                )
              }
            >
              The value
            </SectionLabel>

            {flatFinancial.length > 0 ? (
              flatFinancial.map(renderDriver)
            ) : (
              <EmptyValueCard>
                No financial capacity driver applies to this care setting in Explore. What&apos;s happening here shows up
                in the signals below instead.
              </EmptyValueCard>
            )}
          </>
        )}

        {watchDomainFor(setting, "Capacity") ? (
          <SignalWatch domain={watchDomainFor(setting, "Capacity")!} />
        ) : (
          tier2 && (
            <>
              <SectionLabel tag="not counted · examples only" tagMuted>
                {tier2.sectionLabel}
              </SectionLabel>
              <OutcomesBlock heading={tier2.heading} signals={tier2.signals} outcomes={tier2.outcomes} note={tier2.note} />
            </>
          )
        )}
        </div>
        <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Capacity" />
        </div>

        <Foot onNext={onNext} />
      </div>
    </EditorialShell>
  );
}
