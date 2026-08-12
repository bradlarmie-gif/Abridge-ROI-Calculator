import { useMemo } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import {
  ValueCard,
  OffCard,
  EmptyValueCard,
  SectionLabel,
  Field,
  NumBox,
  QuickPicks,
  OutcomesBlock,
  Foot,
  formatCurrency,
  formatNum,
  formatNum1,
  type OutcomeSignal,
} from "./EdValueScreenKit";
import { getDriversForPage, type ExploreDriver, type ExploreSetting } from "@/lib/exploreDrivers";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
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

  const totalOn = flatFinancial.filter(isEnabled).length;
  const totalValue = flatFinancial.reduce((sum, d) => sum + (isEnabled(d) ? valueFor(d.id) : 0), 0);

  const renderDriver = (driver: ExploreDriver) => {
    const enabled = isEnabled(driver);

    if (driver.id === "patientAccess") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on if some of the freed time should convert into additional visits."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const effectiveAccessProviders = Math.min(td.accessProviders || state.numberOfProviders, state.numberOfProviders);
      const hrsPerProvPerWeek = state.numberOfProviders > 0 ? totalHoursSaved / state.numberOfProviders / 48 : 0;
      const reinvest = (td.capacityRealizationPercent ?? 25) / 100;
      const visitHrs = (td.visitDuration ?? 30) / 60;
      const visitsPerWeek = visitHrs > 0 ? Math.round((hrsPerProvPerWeek * reinvest / visitHrs) * 10) / 10 : 0;
      const annualVisits = Math.round(visitsPerWeek * effectiveAccessProviders * 48);
      const value = valueFor(driver.id);

      return (
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle="If some of the freed hours get reinvested into seeing more patients, at your margin per visit."
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum1(visitsPerWeek)}</b> more visits a week, for
              each provider who has room
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          buildStruct={{
            factors: [
              { value: formatNum(annualVisits), label: "added visits / yr" },
              { value: formatCurrency(td.revenuePerVisit), label: "margin / visit" },
            ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <Field label="Providers who can see more">
            <NumBox
              value={effectiveAccessProviders}
              suffix={`of ${state.numberOfProviders}`}
              onChange={(v) => updateTimeDriverInputs({ accessProviders: Math.max(0, Math.min(v, state.numberOfProviders)) })}
              testId={`ed-input-${driver.id}-providers`}
            />
            <QuickPicks
              value={effectiveAccessProviders}
              options={[
                { label: "A third", value: Math.round(state.numberOfProviders / 3) },
                { label: "Half", value: Math.round(state.numberOfProviders / 2) },
                { label: "Most", value: Math.round(state.numberOfProviders * 0.75) },
              ]}
              onPick={(v) => updateTimeDriverInputs({ accessProviders: v })}
            />
          </Field>
          <Field label="Freed time they reinvest">
            <NumBox
              value={td.capacityRealizationPercent ?? 25}
              suffix="%"
              onChange={(v) => updateTimeDriverInputs({ capacityRealizationPercent: v })}
              testId={`ed-input-${driver.id}-reinvest`}
            />
            <QuickPicks
              value={td.capacityRealizationPercent ?? 25}
              options={[
                { label: "Conservative", value: 15 },
                { label: "Moderate", value: 25 },
                { label: "Optimistic", value: 35 },
              ]}
              onPick={(v) => updateTimeDriverInputs({ capacityRealizationPercent: v })}
            />
          </Field>
          <Field label="Revenue per visit">
            <NumBox value={td.revenuePerVisit} prefix="$" onChange={(v) => updateTimeDriverInputs({ revenuePerVisit: v })} testId={`ed-input-${driver.id}-revenue`} />
          </Field>
          <Field label="Visit length">
            <NumBox value={td.visitDuration} suffix="min" onChange={(v) => updateTimeDriverInputs({ visitDuration: v })} testId={`ed-input-${driver.id}-duration`} />
          </Field>
        </ValueCard>
      );
    }

    if (driver.id === "lwbsRecovery") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on if faster documentation frees up physician time to see waiting patients sooner."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const lwbsPatients = state.annualEncounters * (td.edLwbsRate / 100);
      const recovered = lwbsPatients * (td.edLwbsReduction / 100);
      const value = valueFor(driver.id);

      return (
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum(Math.round(recovered))}</b> patients recovered a year
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          buildStruct={{
            factors: [
              { value: formatNum(state.annualEncounters), label: "encounters" },
              { value: `${td.edLwbsRate}%`, label: "LWBS rate" },
              { value: `${td.edLwbsReduction}%`, label: "recovered" },
              { value: formatCurrency(td.edRevenuePerVisit), label: "per visit" },
            ],
            grossLabel: "Recovered visit value, before who completes a visit",
            gross: td.edLwbsRealization > 0 ? value / (td.edLwbsRealization / 100) : value,
            net: value,
            haircutLabel: <>{td.edLwbsRealization}% complete a visit</>,
          }}
        >
          <Field label="Current LWBS rate">
            <NumBox value={td.edLwbsRate} suffix="%" onChange={(v) => updateTimeDriverInputs({ edLwbsRate: v })} testId={`ed-input-${driver.id}-rate`} />
          </Field>
          <Field label="Expected reduction">
            <NumBox value={td.edLwbsReduction} suffix="%" onChange={(v) => updateTimeDriverInputs({ edLwbsReduction: v })} testId={`ed-input-${driver.id}-reduction`} />
            <QuickPicks
              value={td.edLwbsReduction}
              options={[
                { label: "Conservative", value: 10 },
                { label: "Typical", value: 20 },
                { label: "Optimistic", value: 30 },
              ]}
              onPick={(v) => updateTimeDriverInputs({ edLwbsReduction: v })}
            />
          </Field>
          <Field label="Revenue per ED visit">
            <NumBox value={td.edRevenuePerVisit} prefix="$" onChange={(v) => updateTimeDriverInputs({ edRevenuePerVisit: v })} testId={`ed-input-${driver.id}-revenue`} />
          </Field>
          <Field label="Realization" note="Not all recovered patients complete a visit.">
            <NumBox value={td.edLwbsRealization} suffix="%" onChange={(v) => updateTimeDriverInputs({ edLwbsRealization: v })} testId={`ed-input-${driver.id}-realization`} />
          </Field>
        </ValueCard>
      );
    }

    if (driver.id === "admissionCapture") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on if some LWBS-recovered patients require inpatient admission."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const lwbsPatients = state.annualEncounters * (td.edLwbsRate / 100);
      const recovered = lwbsPatients * (td.edLwbsReduction / 100);
      const potentialAdmissions = recovered * (td.edAdmissionRate / 100);
      const value = valueFor(driver.id);

      return (
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum1(potentialAdmissions)}</b> admissions captured a year
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          warning={
            !td.edLwbsEnabled &&
            "Admission Capture uses LWBS-recovered patients as its base. Turn on LWBS Recovery above to see this value."
          }
          buildStruct={{
            factors: [
              { value: formatNum(Math.round(recovered)), label: "recovered patients" },
              { value: `${td.edAdmissionRate}%`, label: "admit rate" },
              { value: formatCurrency(td.edAdmissionRevenue), label: "margin / admission" },
            ],
            grossLabel: "Admission margin, before beds & conversion",
            gross: td.edAdmissionRealization > 0 ? value / (td.edAdmissionRealization / 100) : value,
            net: value,
            haircutLabel: <>{td.edAdmissionRealization}% bed & conversion</>,
          }}
        >
          <Field label="Admission rate">
            <NumBox value={td.edAdmissionRate} suffix="%" onChange={(v) => updateTimeDriverInputs({ edAdmissionRate: v })} testId={`ed-input-${driver.id}-rate`} />
          </Field>
          <Field label="Margin per admission" note="Net of the cost of care, not gross charges.">
            <NumBox value={td.edAdmissionRevenue} prefix="$" onChange={(v) => updateTimeDriverInputs({ edAdmissionRevenue: v })} testId={`ed-input-${driver.id}-revenue`} />
          </Field>
          <Field label="Realization" note="Bed availability and conversion.">
            <NumBox value={td.edAdmissionRealization} suffix="%" onChange={(v) => updateTimeDriverInputs({ edAdmissionRealization: v })} testId={`ed-input-${driver.id}-realization`} />
          </Field>
        </ValueCard>
      );
    }

    if (driver.id === "nursingOvertime") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on if faster charting reduces the documentation-driven overtime you pay."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const otHoursEliminated = Math.round(
        td.nursingOtHoursPerNurseWeek * (td.nursingOtReductionPercent / 100) * state.numberOfProviders * 52,
      );
      const value = valueFor(driver.id);

      return (
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum(otHoursEliminated)}</b> OT hours eliminated a year
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          buildStruct={{
            factors: [
              { value: formatNum(state.numberOfProviders), label: "nurses" },
              { value: `${td.nursingOtHoursPerNurseWeek}`, label: "OT hrs / wk" },
              { value: `${td.nursingOtReductionPercent}%`, label: "Abridge reduces" },
              { value: "52", label: "weeks" },
              { value: formatCurrency(td.nursingOtHourlyRate), label: "per hour" },
            ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <Field label="Post-shift OT hrs / nurse / week">
            <NumBox value={td.nursingOtHoursPerNurseWeek} suffix="hrs" onChange={(v) => updateTimeDriverInputs({ nursingOtHoursPerNurseWeek: v })} testId={`ed-input-${driver.id}-hours`} />
          </Field>
          <Field label="How much Abridge can impact">
            <NumBox value={td.nursingOtReductionPercent} suffix="%" onChange={(v) => updateTimeDriverInputs({ nursingOtReductionPercent: v })} testId={`ed-input-${driver.id}-reduction`} />
            <QuickPicks
              value={td.nursingOtReductionPercent}
              options={[
                { label: "Conservative", value: 30 },
                { label: "Moderate", value: 40 },
                { label: "Optimistic", value: 50 },
              ]}
              onPick={(v) => updateTimeDriverInputs({ nursingOtReductionPercent: v })}
            />
          </Field>
          <Field label="Average OT hourly rate">
            <NumBox value={td.nursingOtHourlyRate} prefix="$" onChange={(v) => updateTimeDriverInputs({ nursingOtHourlyRate: v })} testId={`ed-input-${driver.id}-rate`} />
          </Field>
        </ValueCard>
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
