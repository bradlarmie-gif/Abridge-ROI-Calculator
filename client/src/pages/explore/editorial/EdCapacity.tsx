import { useMemo } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import {
  EmptyValueCard,
  SectionLabel,
  OutcomesBlock,
  Foot,
  formatCurrency,
  formatNum,
  formatNum1,
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
import DriverLedger, { type LedgerRow } from "./DriverLedger";
import { buildInpatientLedger, buildDriverLedger } from "./driverLedgerData";
import { MathCascade } from "./MathCascade";

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
            <>Grey figures carry from your earlier steps; change any coral figure and this reprices live. Not every recovered patient completes a billable visit, so we count only the <b className="text-[#B02200] not-italic">{td.edLwbsRealization}%</b> that convert and leave the rest out.</>
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
              <EqNum cap="conversion" value={td.edLwbsRealization} onChange={(v) => updateTimeDriverInputs({ edLwbsRealization: v })} suffix="%" />
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
            <>Grey figures carry from LWBS Recovery above; change any coral figure and this reprices live. Not every recovered patient is admitted, so we count only the <b className="text-[#B02200] not-italic">{td.edAdmissionRealization}%</b> that convert and leave the rest out.</>
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
              <EqNum cap="conversion" value={td.edAdmissionRealization} onChange={(v) => updateTimeDriverInputs({ edAdmissionRealization: v })} suffix="%" />
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

  // ─── Inpatient V2 driver ledger ───
  // Capacity is a non-financial proof layer for inpatient: three tracked signals,
  // no dollar. The running model on the right reflects the counted domains.
  if (setting === "inpatient") {
    const ledger = buildInpatientLedger(state, totalHoursSaved, "Capacity");
    const rows: LedgerRow[] = [
      {
        id: "ipCensusCapacity",
        label: "Census Capacity",
        kind: "tracked",
        mechanism: "The hours documentation gives back are clinical capacity. As volume grows, the existing team absorbs more census without adding providers. We track that headroom as proof, not a dollar.",
        signals: ["Census grows without adding FTEs", "More admissions carried per provider"],
      },
      {
        id: "ipConsultCapacity",
        label: "Consult Capacity",
        kind: "tracked",
        mechanism: "Freed time lets the service take on more consult volume with the same team, and consults land the same day instead of waiting on a note.",
        signals: ["More consults absorbed per day", "Consult turnaround tightens"],
      },
      {
        id: "ipDischargeTimeliness",
        label: "Discharge Timeliness",
        kind: "coming-soon",
        mechanism: "The discharge summary lands on time, so the next site of care has what it needs. More capacity back once it ships, not counted today.",
      },
    ];
    return (
      <DriverLedger
        eyebrow="Value Estimator · Step 4 of 9 · Capacity"
        title="What does the freed time become?"
        intro="Freed documentation time is clinical capacity: room for the existing team to carry more census and consult volume as you grow. We hold it as proof, not a dollar; we do not put a number on capacity we do not control."
        sectionLabel="The proof · tracked, not counted"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Capacity"
        stepIndex={4}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Nursing V2 driver ledger ───
  // Capacity carries one counted driver (documentation-driven overtime) and one
  // tracked proof row (time at the bedside). Cascade intermediates are computed
  // inline from `td` so the running chain foots to the engine value exactly.
  if (setting === "nursing") {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Capacity", "nursing");
    const nurses = state.numberOfProviders;
    const hrsWk = td.nursingOtHoursPerNurseWeek;
    const red = td.nursingOtReductionPercent / 100;
    const otHrs = hrsWk * red * nurses * 52;
    const otValue = valueFor("nursingOvertime");
    const otAwait = gate("nursingOvertime");

    const rows: LedgerRow[] = [
      {
        id: "nursingOvertime",
        label: "Overtime Spend",
        kind: "counted",
        mechanism:
          "When documentation happens at the bedside instead of piling up for end of shift, the charting that used to spill into paid overtime falls away.",
        enabled: Boolean(td.nursingOtEnabled),
        onToggle: () => {
          const current = Boolean(td.nursingOtEnabled);
          updateTimeDriverInputs(current ? { nursingOtEnabled: false } : { nursingOtEnabled: true, nursingOtExpanded: true });
        },
        amount: otValue > 0 ? otValue : undefined,
        awaiting: otAwait?.need,
        expanded: Boolean(td.nursingOtExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ nursingOtExpanded: !td.nursingOtExpanded }),
        levers: (
          <MathCascade
            steps={[
              { label: "Nurses on the unit", running: formatNum(nurses) },
              { label: "Overtime hours per nurse each week", factor: { value: td.nursingOtHoursPerNurseWeek, onChange: (v: number) => updateTimeDriverInputs({ nursingOtHoursPerNurseWeek: v }), suffix: "hrs", decimal: true }, running: `${formatNum1(nurses * hrsWk)} /wk` },
              { label: "Share Abridge takes back", factor: { value: td.nursingOtReductionPercent, onChange: (v: number) => updateTimeDriverInputs({ nursingOtReductionPercent: v }), suffix: "%" }, running: `${formatNum1(nurses * hrsWk * red)} /wk` },
              { label: "Across the year", running: `${formatNum(otHrs)} hrs`, note: "× 52 weeks" },
              { label: "Overtime rate", factor: { value: td.nursingOtHourlyRate, onChange: (v: number) => updateTimeDriverInputs({ nursingOtHourlyRate: v }), prefix: "$" }, running: formatCurrency(otValue), final: true },
            ]}
          />
        ),
      },
      {
        id: "bedsideTime",
        label: "Time at the Bedside",
        kind: "tracked",
        mechanism:
          "The time documentation gives back is time at the bedside. We track that as proof; we do not put a dollar on capacity we do not control.",
        signals: ["Point-of-care documentation rises", "Post-shift charting queue shrinks"],
      },
    ];

    return (
      <DriverLedger
        eyebrow="Value Estimator · Step 4 of 9 · Capacity"
        title="What is Abridge worth to your unit's capacity?"
        intro="Charting that used to spill past the shift gets done at the bedside. Turn on only what you can stand behind; it adds to the ledger as you go."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Capacity"
        stepIndex={4}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Outpatient V2 driver ledger ───
  // One counted driver: Patient Access. Freed documentation time is reinvested as
  // added visits, each earning your margin per visit. Cascade intermediates are
  // computed inline from `td` so the running chain foots to the engine value.
  if (setting === "outpatient") {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Capacity", "outpatient");
    const eff = Math.min(td.accessProviders || state.numberOfProviders, state.numberOfProviders);
    const hrsPerProvWk = state.numberOfProviders > 0 ? totalHoursSaved / state.numberOfProviders / 48 : 0;
    const reinvest = (td.capacityRealizationPercent ?? 25) / 100;
    const visitHrs = (td.visitDuration ?? 30) / 60;
    const visitsPerWk =
      td.patientAccessVisitsPerProvWk && td.patientAccessVisitsPerProvWk > 0
        ? td.patientAccessVisitsPerProvWk
        : visitHrs > 0
          ? Math.round((hrsPerProvWk * reinvest / visitHrs) * 10) / 10
          : 0;
    const paValue = valueFor("patientAccess");
    const paAwait = gate("patientAccess");

    const rows: LedgerRow[] = [
      {
        id: "patientAccess",
        label: "Patient Access",
        kind: "counted",
        mechanism:
          "Charting used to happen after the visit. Done in the room, that reclaimed time goes back into the schedule as room for more patients, without adding cost.",
        enabled: Boolean(td.patientAccessEnabled),
        onToggle: () => {
          const current = Boolean(td.patientAccessEnabled);
          updateTimeDriverInputs(current ? { patientAccessEnabled: false } : { patientAccessEnabled: true, patientAccessExpanded: true });
        },
        amount: paValue > 0 ? paValue : undefined,
        awaiting: paAwait?.need,
        expanded: Boolean(td.patientAccessExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ patientAccessExpanded: !td.patientAccessExpanded }),
        levers: (
          <MathCascade
            steps={[
              { label: "Providers", running: formatNum(eff) },
              { label: "Freed time they reinvest", factor: { value: td.capacityRealizationPercent ?? 25, onChange: (v: number) => updateTimeDriverInputs({ capacityRealizationPercent: v }), suffix: "%" }, running: `${formatNum1(hrsPerProvWk * reinvest)} hrs/wk` },
              { label: "At this visit length", factor: { value: td.visitDuration ?? 30, onChange: (v: number) => updateTimeDriverInputs({ visitDuration: v }), suffix: "min" }, running: `${formatNum1(visitsPerWk)} visits/wk` },
              { label: "Across the year", running: `${formatNum(visitsPerWk * eff * 48)} visits`, note: "× 48 weeks" },
              { label: "Margin per visit", factor: { value: td.revenuePerVisit, onChange: (v: number) => updateTimeDriverInputs({ revenuePerVisit: v }), prefix: "$" }, running: formatCurrency(paValue), final: true },
            ]}
          />
        ),
      },
    ];

    return (
      <DriverLedger
        eyebrow="Value Estimator · Step 4 of 9 · Capacity"
        title="What does the freed time become?"
        intro="Charting that used to happen after the visit gets done in the room, and the time it gives back becomes room on the schedule. Turn on only what you can stand behind; it adds to the ledger as you go."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Capacity"
        stepIndex={4}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  return (
    <EditorialShell>
      <EditorialHeader stepName="Capacity" stepIndex={4} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Estimator · Step 4 of 9</div>
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
                  Dollars are counted in <b className="text-[#1A1A1A]">Revenue</b>
                </>
              }
            >
              The proof
            </SectionLabel>

            <div className="border border-[#E7E3DD] rounded-[14px] bg-[#FAF7F2] px-[18px] py-[16px] flex gap-3">
              <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00] flex-shrink-0 mt-[7px]" />
              <div className="text-[14px] text-[#565250] leading-[1.55]">
                <b className="text-[#1A1A1A]">Complete notes let discharge planning and consults start sooner.</b>{" "}
                But length of stay depends on beds, staffing, and placement Abridge doesn&apos;t touch, so we track the
                signals that move first and never put a dollar on the days themselves.
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
        <div className="flex flex-col gap-5">
          <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Capacity" />
          <Foot onNext={onNext} />
        </div>
        </div>
      </div>
    </EditorialShell>
  );
}
