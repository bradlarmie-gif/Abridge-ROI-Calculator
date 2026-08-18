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
  LensToggle,
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
import { physicianRetentionRates, nursingRetentionRates } from "@/lib/retentionScenarios";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";
import { type ExploreState } from "../ExploreFlow";
import { SignalWatch } from "./SignalWatch";
import { watchDomainFor } from "@/lib/exploreWatchSignals";
import ValueRail from "./ValueRail";
import DriverLedger, { type LedgerRow } from "./DriverLedger";
import { buildInpatientLedger, buildDriverLedger } from "./driverLedgerData";
import { MathCascade } from "./MathCascade";

interface EdWorkforceProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  priorQuadrants?: PriorQuadrantEntry[];
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

const TEAM_TIER2: { label: string; note: string } = {
  label: "The team it can build",
  note: "When these signals move, a steadier team is within reach. They are the early signs of the same retention we value above, so we keep them as signals and never count them twice.",
};

// Nursing resolves its Workforce signals through SignalWatch (WATCH_SIGNALS),
// so only the non-nursing settings need a TIER2 outcomes block here.
const TIER2: Partial<Record<ExploreSetting, { signals: OutcomeSignal[]; outcomes: string[] }>> = {
  outpatient: {
    signals: [
      { label: "After-hours EHR time", ex: "ex. 4 → 1.5 hrs/wk" },
      { label: "Burnout score (MBI)", ex: "ex. 31 → 24" },
      { label: "Likelihood to stay", ex: "ex. +8 pts" },
    ],
    outcomes: ["Fewer providers reach burnout", "More choose to stay", "Recruiting and backfill ease"],
  },
  ed: {
    signals: [
      { label: "After-hours EHR time", ex: "ex. 3 → 1 hrs/wk" },
      { label: "End-of-shift note completion", ex: "ex. 70 → 92%" },
      { label: "Likelihood to stay", ex: "ex. +8 pts" },
    ],
    outcomes: ["Fewer providers reach burnout", "More choose to stay", "Recruiting and backfill ease"],
  },
  inpatient: {
    signals: [
      { label: "After-hours EHR time", ex: "ex. 5 → 2 hrs/wk" },
      { label: "Progress note completion, same shift", ex: "ex. 75 → 96%" },
      { label: "Likelihood to stay", ex: "ex. +8 pts" },
    ],
    outcomes: ["Fewer providers reach burnout", "More choose to stay", "Recruiting and backfill ease"],
  },
};

function ModePicker({ mode, onChange }: { mode: "position" | "hourly"; onChange: (m: "position" | "hourly") => void }) {
  return (
    <div className="flex items-center gap-[3px] bg-white border border-[#E7E3DD] rounded-full p-[3px] w-fit mb-4">
      {(["position", "hourly"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-[14px] py-[6px] rounded-full text-[12px] font-bold transition-colors ${
            mode === m ? "bg-[#EA2C00] text-white" : "text-[#565250]"
          }`}
        >
          {m === "position" ? "Per position" : "Hourly"}
        </button>
      ))}
    </div>
  );
}

export default function EdWorkforce({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: EdWorkforceProps) {
  const setting = state.careSetting;
  const td = state.timeDriverInputs;
  const isIP = setting === "inpatient";
  const retentionCounted = state.retentionMode === "counted";
  const setRetentionMode = (counted: boolean) => updateState({ retentionMode: counted ? "counted" : "tracked" });

  const drivers = (setting ? getDriversForPage("Workforce", setting) : [])
    // Scribe Spend is not part of the Outpatient Workforce design (mockup omits it).
    .filter((d) => !(setting === "outpatient" && d.id === "scribeCostReduction"));
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

  const toggleEnabled = (driver: ExploreDriver) => {
    const current = isEnabled(driver);
    const updates: any = { [driver.enabledStateKey]: !current };
    if (!current && driver.expandedStateKey) updates[driver.expandedStateKey] = true;
    // A single coral switch = "counts when it's on": provider/RN retention math is gated by
    // a second calculateRetentionValue flag in the engine, so fold it into the same toggle
    // rather than exposing a second control the mockup doesn't have.
    if (driver.id === "providerWellbeing") updates.calculateRetentionValue = !current;
    updateTimeDriverInputs(updates);
  };

  const engineValues = useMemo(() => computeAllDriverValues(state, totalHoursSaved), [state, totalHoursSaved]);
  const valueFor = (driverId: string) => engineValues[engineKeyForDriver(driverId, setting ?? "")] ?? 0;

  const totalOn = flatFinancial.filter(isEnabled).length;
  const totalValue = flatFinancial.reduce((sum, d) => sum + (isEnabled(d) ? valueFor(d.id) : 0), 0);

  const renderDriver = (driver: ExploreDriver) => {
    const enabled = isEnabled(driver);

    if (driver.id === "providerWellbeing") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on to value the departures documentation relief can prevent."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const turnoverValue = isIP ? td.ipAnnualTurnoverRate : td.annualTurnoverRate;
      const burnoutValue = isIP ? td.ipBurnoutRelatedTurnover : td.burnoutRelatedTurnover;
      const replacementValue = isIP ? td.ipReplacementCost : td.replacementCost;
      const retentionScenarios = physicianRetentionRates(td.retentionCustomPercent ?? 10);
      const impactPct = retentionScenarios[td.retentionImpactScenario] ?? 0;
      const providersLeavingPerYear = state.numberOfProviders * (turnoverValue / 100);
      const burnoutRelatedDepartures = providersLeavingPerYear * (burnoutValue / 100);
      const providersRetained = burnoutRelatedDepartures * (impactPct / 100);
      const value = valueFor(driver.id);

      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle="Abridge only touches the departures tied to documentation burden and burnout, not retirements, moves, or pay. This values just that slice, conservatively."
          enabled
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={
            retentionCounted ? (
              <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live. Only the burnout-tied slice is valued; retirements, moves, and pay stay out.</>
            ) : undefined
          }
        >
          <div className="mb-4">
            <LensToggle counted={retentionCounted} onChange={setRetentionMode} testId={`ed-retention-lens-${driver.id}`} />
          </div>
          {retentionCounted ? (
            <EquationRow>
              <EqCarried cap="providers">{formatNum(state.numberOfProviders)}</EqCarried>
              <EqOp>×</EqOp>
              <EqNum
                cap="turnover"
                value={turnoverValue}
                suffix="%"
                onChange={(v) => updateTimeDriverInputs(isIP ? { ipAnnualTurnoverRate: v } : { annualTurnoverRate: v })}
                width={40}
              />
              <EqOp>×</EqOp>
              <EqNum
                cap="tied to burnout"
                value={burnoutValue}
                suffix="%"
                onChange={(v) => updateTimeDriverInputs(isIP ? { ipBurnoutRelatedTurnover: v } : { burnoutRelatedTurnover: v })}
                width={40}
              />
              <EqOp>×</EqOp>
              <EqNum
                cap="Abridge impact"
                value={impactPct}
                suffix="%"
                onChange={(v) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v })}
                width={40}
              />
              <EqOp>×</EqOp>
              <EqNum
                cap="to replace"
                value={replacementValue}
                prefix="$"
                onChange={(v) => updateTimeDriverInputs(isIP ? { ipReplacementCost: v } : { replacementCost: v })}
                width={72}
              />
              <EqResult value={value} />
            </EquationRow>
          ) : (
            <>
              <EquationRow>
                <EqCarried cap="providers">{formatNum(state.numberOfProviders)}</EqCarried>
                <EqOp>×</EqOp>
                <EqNum cap="turnover" value={turnoverValue} suffix="%" onChange={(v) => updateTimeDriverInputs(isIP ? { ipAnnualTurnoverRate: v } : { annualTurnoverRate: v })} width={40} />
                <EqOp>×</EqOp>
                <EqNum cap="tied to burnout" value={burnoutValue} suffix="%" onChange={(v) => updateTimeDriverInputs(isIP ? { ipBurnoutRelatedTurnover: v } : { burnoutRelatedTurnover: v })} width={40} />
                <EqOp>×</EqOp>
                <EqNum cap="Abridge impact" value={impactPct} suffix="%" onChange={(v) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v })} width={40} />
                <div className="basis-full w-full flex items-baseline gap-2.5 pt-3 mt-1 border-t border-[#F3E9E1]">
                  <span className="font-abridge text-[19px] text-[#B9AA97] leading-none">=</span>
                  <span className="leading-none whitespace-nowrap">
                    <span className="font-abridge text-[28px] text-[#EA2C00]">≈ {formatNum1(providersRetained)}</span>
                    <span className="text-[12px] text-[#7C766F]"> providers a year kept</span>
                  </span>
                </div>
              </EquationRow>
              <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">
                Tracked as the leading signal, not a dollar. Switch to Dollar to put the replacement-cost value in the ROI.
              </div>
            </>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "physicianLocumAgency") {
      const turnoverValue = isIP ? td.ipAnnualTurnoverRate : td.annualTurnoverRate;
      const burnoutValue = isIP ? td.ipBurnoutRelatedTurnover : td.burnoutRelatedTurnover;
      const retentionScenarios = physicianRetentionRates(td.retentionCustomPercent ?? 10);
      const impactPct = retentionScenarios[td.retentionImpactScenario] ?? 0;
      const retained = state.numberOfProviders * (turnoverValue / 100) * (burnoutValue / 100) * (impactPct / 100);
      const blocked = !td.wellbeingEnabled || !td.calculateRetentionValue;

      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle="Avoided locum coverage spend for the providers Provider Retention keeps from leaving."
            hint="Turn on if you use locum or agency coverage during physician vacancies."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const value = valueFor(driver.id);
      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle="Avoided locum coverage spend for the providers Provider Retention keeps from leaving, priced at weeks of coverage avoided times the weekly premium."
          enabled
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          editHint={retentionCounted && !blocked}
          mathLabel={retentionCounted ? "The math" : "What we track"}
          note={
            blocked || !retentionCounted ? undefined : (
              <>Grey figures carry from Provider Retention above. Change the coral figures to match your locum contracts. This is the coverage spend you stop paying when a provider stays, a separate dollar from the retention value above, so nothing is counted twice.</>
            )
          }
        >
          {blocked ? (
            <div className="px-3.5 py-2.5 bg-[#FFF7F4] border border-[#FFDDD6] rounded-[10px] text-[12.5px] text-[#B23100] leading-[1.4]">
              Turn on Provider Retention above to see this driver's value. Locum &amp; agency savings are derived from the
              providers it retains.
            </div>
          ) : !retentionCounted ? (
            <div className="text-[12.5px] text-[#7C766F] leading-[1.5] italic">
              This spend is priced on the providers retention keeps. While Provider Retention is tracked as a signal, the
              savings stay tracked too, so nothing counts twice. Switch Provider Retention to Dollar to put both in the ROI.
            </div>
          ) : (
            <EquationRow>
              {/* Full raw chain (mirrors Provider Retention above) so the factors multiply exactly to the value. */}
              <EqCarried cap="providers">{formatNum(state.numberOfProviders)}</EqCarried>
              <EqOp>×</EqOp>
              <EqCarried cap="turnover">{turnoverValue}%</EqCarried>
              <EqOp>×</EqOp>
              <EqCarried cap="tied to burnout">{burnoutValue}%</EqCarried>
              <EqOp>×</EqOp>
              <EqCarried cap="Abridge impact">{impactPct}%</EqCarried>
              <EqOp>×</EqOp>
              <EqNum
                cap="wks locum avoided"
                value={td.physicianAgencyWeeksPerVacancy}
                suffix="wks"
                onChange={(v) => updateTimeDriverInputs({ physicianAgencyWeeksPerVacancy: v })}
                width={44}
              />
              <EqOp>×</EqOp>
              <EqNum
                cap="per week"
                value={td.physicianAgencyWeeklyPremium}
                prefix="$"
                onChange={(v) => updateTimeDriverInputs({ physicianAgencyWeeklyPremium: v })}
                width={72}
              />
              <EqResult value={value} />
            </EquationRow>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "scribeCostReduction") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on if your organization currently pays for in-person or virtual scribes."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const mode = td.scribeBillingMode ?? "position";
      const value = valueFor(driver.id);
      const isPosition = mode === "position";
      const eliminated = Math.min(td.scribePositionsEliminated || 0, td.scribeHeadcount || 0);
      const costPerVisit = (td.scribeHourlyRate || 0) * ((td.scribeMinutesPerNote || 0) / 60);
      const scribedVisits = state.annualEncounters * ((td.scribeCoveragePercent || 0) / 100);
      const scribedVisitsReplaced = Math.round(scribedVisits * ((td.scribeVisitPercentEliminated || 0) / 100));

      const scribeReady = driverScaleReadiness(driver.id, state, totalHoursSaved);
      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          enabled
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={isPosition
            ? <>Change any coral figure and this reprices live. We value only the positions you can actually cut, held at your current headcount.</>
            : <>The two figures above are derived from the knobs below. Change any coral figure and this reprices live.</>}
        >
          <div className="mb-4">
            <ModePicker mode={isPosition ? "position" : "hourly"} onChange={(m) => updateTimeDriverInputs({ scribeBillingMode: m })} />
          </div>
          {!scribeReady.ready ? (
            <EqAwaiting need={scribeReady.need} />
          ) : isPosition ? (
            <>
              <EquationRow>
                <EqNum
                  cap="positions cut"
                  value={td.scribePositionsEliminated}
                  onChange={(v) => updateTimeDriverInputs({ scribePositionsEliminated: td.scribeHeadcount > 0 ? Math.min(v, td.scribeHeadcount) : v })}
                  width={44}
                />
                <EqOp>×</EqOp>
                <EqNum
                  cap="cost / position"
                  value={td.scribeCostPerPosition}
                  prefix="$"
                  onChange={(v) => updateTimeDriverInputs({ scribeCostPerPosition: v })}
                  width={80}
                />
                <EqResult value={value} />
              </EquationRow>
              <div className="mt-4 pt-3.5 border-t border-[#F1E4DC]">
                <div className="text-[10px] font-bold tracking-[0.05em] uppercase text-[#7C766F] mb-2.5">Held at your headcount</div>
                <EquationRow>
                  <EqNum
                    cap="current scribe headcount"
                    value={td.scribeHeadcount}
                    onChange={(v) => updateTimeDriverInputs({ scribeHeadcount: v })}
                    width={44}
                  />
                </EquationRow>
              </div>
            </>
          ) : (
            <>
              <EquationRow>
                <EqCarried cap="scribed visits replaced">{formatNum(scribedVisitsReplaced)}</EqCarried>
                <EqOp>×</EqOp>
                <EqCarried cap="cost / visit">{`$${costPerVisit.toFixed(2)}`}</EqCarried>
                <EqResult value={value} />
              </EquationRow>
              <div className="mt-4 pt-3.5 border-t border-[#F1E4DC]">
                <div className="text-[10px] font-bold tracking-[0.05em] uppercase text-[#7C766F] mb-2.5">How it's priced</div>
                <EquationRow>
                  <EqNum cap="visits scribed" value={td.scribeCoveragePercent} suffix="%" onChange={(v) => updateTimeDriverInputs({ scribeCoveragePercent: Math.min(v, 100) })} width={40} />
                  <EqOp>×</EqOp>
                  <EqNum cap="replaced by Abridge" value={td.scribeVisitPercentEliminated} suffix="%" onChange={(v) => updateTimeDriverInputs({ scribeVisitPercentEliminated: Math.min(v, 100) })} width={40} />
                  <EqOp>·</EqOp>
                  <EqNum cap="hourly rate" value={td.scribeHourlyRate} prefix="$" onChange={(v) => updateTimeDriverInputs({ scribeHourlyRate: v })} width={56} />
                  <EqOp>×</EqOp>
                  <EqNum cap="min / note" value={td.scribeMinutesPerNote} suffix="min" onChange={(v) => updateTimeDriverInputs({ scribeMinutesPerNote: v })} width={44} />
                </EquationRow>
              </div>
            </>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "nursingRetention") {
      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle={driver.shortDescription}
            hint="Turn on to value the RN departures documentation relief can prevent."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const nursingScenarios = nursingRetentionRates(td.retentionCustomPercent ?? 10);
      const impactPct = nursingScenarios[td.retentionImpactScenario] ?? 0;
      const leavingPerYear = state.numberOfProviders * (td.nursingTurnoverRate / 100);
      const burnoutDepartures = leavingPerYear * 0.4;
      const retained = burnoutDepartures * (impactPct / 100);
      const value = valueFor(driver.id);

      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          enabled
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          note={
            retentionCounted ? (
              <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live. Only the burnout-tied slice (40% of departures) is valued.</>
            ) : undefined
          }
        >
          <div className="mb-4">
            <LensToggle counted={retentionCounted} onChange={setRetentionMode} testId={`ed-retention-lens-${driver.id}`} />
          </div>
          {retentionCounted ? (
            <EquationRow>
              <EqCarried cap="nurses">{formatNum(state.numberOfProviders)}</EqCarried>
              <EqOp>×</EqOp>
              <EqNum
                cap="turnover"
                value={td.nursingTurnoverRate}
                suffix="%"
                onChange={(v) => updateTimeDriverInputs({ nursingTurnoverRate: v })}
                width={40}
              />
              <EqOp>×</EqOp>
              <EqCarried cap="tied to burnout">40%</EqCarried>
              <EqOp>×</EqOp>
              <EqNum
                cap="Abridge impact"
                value={impactPct}
                suffix="%"
                onChange={(v) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v })}
                width={40}
              />
              <EqOp>×</EqOp>
              <EqNum
                cap="to replace"
                value={td.nursingReplacementCost}
                prefix="$"
                onChange={(v) => updateTimeDriverInputs({ nursingReplacementCost: v })}
                width={72}
              />
              <EqResult value={value} />
            </EquationRow>
          ) : (
            <>
              <EquationRow>
                <EqCarried cap="nurses">{formatNum(state.numberOfProviders)}</EqCarried>
                <EqOp>×</EqOp>
                <EqNum cap="turnover" value={td.nursingTurnoverRate} suffix="%" onChange={(v) => updateTimeDriverInputs({ nursingTurnoverRate: v })} width={40} />
                <EqOp>×</EqOp>
                <EqCarried cap="tied to burnout">40%</EqCarried>
                <EqOp>×</EqOp>
                <EqNum cap="Abridge impact" value={impactPct} suffix="%" onChange={(v) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v })} width={40} />
                <div className="basis-full w-full flex items-baseline gap-2.5 pt-3 mt-1 border-t border-[#F3E9E1]">
                  <span className="font-abridge text-[19px] text-[#B9AA97] leading-none">=</span>
                  <span className="leading-none whitespace-nowrap">
                    <span className="font-abridge text-[28px] text-[#EA2C00]">≈ {formatNum1(retained)}</span>
                    <span className="text-[12px] text-[#7C766F]"> nurses a year kept</span>
                  </span>
                </div>
              </EquationRow>
              <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">
                Tracked as the leading signal, not a dollar. Switch to Dollar to put the replacement-cost value in the ROI.
              </div>
            </>
          )}
        </InlineDriverCard>
      );
    }

    if (driver.id === "nursingAgency") {
      const nursingScenarios = nursingRetentionRates(td.retentionCustomPercent ?? 10);
      const impactPct = nursingScenarios[td.retentionImpactScenario] ?? 0;
      const leavingPerYear = state.numberOfProviders * (td.nursingTurnoverRate / 100);
      const burnoutDepartures = leavingPerYear * 0.4;
      const retained = burnoutDepartures * (impactPct / 100);
      const blocked = !td.nursingRetentionEnabled;

      if (!enabled) {
        return (
          <OffCard
            key={driver.id}
            title={driver.label}
            subtitle="Avoided agency coverage spend for the nurses RN Retention keeps from leaving."
            hint="Turn on if you use travel or agency nurses during vacancies."
            onToggle={() => toggleEnabled(driver)}
            testId={`ed-toggle-${driver.id}`}
          />
        );
      }
      const value = valueFor(driver.id);
      return (
        <InlineDriverCard
          key={driver.id}
          title={driver.label}
          subtitle="Avoided agency coverage spend for the nurses RN Retention keeps from leaving, priced at weeks of coverage avoided times the weekly premium."
          enabled
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          editHint={retentionCounted && !blocked}
          mathLabel={retentionCounted ? "The math" : "What we track"}
          note={
            blocked || !retentionCounted ? undefined : (
              <>Grey figures carry from RN Retention above. Change the coral figures to match your agency contracts. This is the coverage spend you stop paying when a nurse stays, a separate dollar from the retention value above, so nothing is counted twice.</>
            )
          }
        >
          {blocked ? (
            <div className="px-3.5 py-2.5 bg-[#FFF7F4] border border-[#FFDDD6] rounded-[10px] text-[12.5px] text-[#B23100] leading-[1.4]">
              Turn on RN Retention above to see this driver's value. Travel &amp; agency savings are derived from the nurses
              it retains.
            </div>
          ) : !retentionCounted ? (
            <div className="text-[12.5px] text-[#7C766F] leading-[1.5] italic">
              This spend is priced on the nurses retention keeps. While RN Retention is tracked as a signal, the savings
              stay tracked too, so nothing counts twice. Switch RN Retention to Dollar to put both in the ROI.
            </div>
          ) : (
            <EquationRow>
              {/* Full raw chain (mirrors RN Retention above) so the factors multiply exactly to the value. */}
              <EqCarried cap="nurses">{formatNum(state.numberOfProviders)}</EqCarried>
              <EqOp>×</EqOp>
              <EqCarried cap="turnover">{td.nursingTurnoverRate}%</EqCarried>
              <EqOp>×</EqOp>
              <EqCarried cap="tied to burnout">40%</EqCarried>
              <EqOp>×</EqOp>
              <EqCarried cap="Abridge impact">{impactPct}%</EqCarried>
              <EqOp>×</EqOp>
              <EqNum
                cap="wks agency avoided"
                value={td.nursingAgencyWeeksPerVacancy}
                suffix="wks"
                onChange={(v) => updateTimeDriverInputs({ nursingAgencyWeeksPerVacancy: v })}
                width={44}
              />
              <EqOp>×</EqOp>
              <EqNum
                cap="per week"
                value={td.nursingAgencyWeeklyPremium}
                prefix="$"
                onChange={(v) => updateTimeDriverInputs({ nursingAgencyWeeklyPremium: v })}
                width={72}
              />
              <EqResult value={value} />
            </EquationRow>
          )}
        </InlineDriverCard>
      );
    }

    return (
      <EmptyValueCard key={driver.id}>
        <b className="text-[#565250] font-bold">{driver.label}.</b> {driver.shortDescription}
      </EmptyValueCard>
    );
  };

  const tier2 = setting ? TIER2[setting] : null;

  // ─── Inpatient V2 driver ledger ───
  if (setting === "inpatient") {
    const gate = (driverId: string) => {
      const r = driverScaleReadiness(driverId, state, totalHoursSaved);
      return r.ready ? undefined : r.need;
    };

    const retentionValue = valueFor("providerWellbeing");
    const retentionScenarios = physicianRetentionRates(td.retentionCustomPercent ?? 10);
    const retentionImpactPct = retentionScenarios[td.retentionImpactScenario] ?? 0;
    const providersLeavingPerYear = state.numberOfProviders * (td.ipAnnualTurnoverRate / 100);
    const burnoutRelatedDepartures = providersLeavingPerYear * (td.ipBurnoutRelatedTurnover / 100);
    const providersRetained = burnoutRelatedDepartures * (retentionImpactPct / 100);

    const retentionRows = [
      { label: "Providers", running: formatNum(state.numberOfProviders) },
      { label: "Annual turnover", factor: { value: td.ipAnnualTurnoverRate, onChange: (v: number) => updateTimeDriverInputs({ ipAnnualTurnoverRate: v }), suffix: "%" }, running: formatNum1(providersLeavingPerYear) },
      { label: "Tied to burnout", factor: { value: td.ipBurnoutRelatedTurnover, onChange: (v: number) => updateTimeDriverInputs({ ipBurnoutRelatedTurnover: v }), suffix: "%" }, running: formatNum1(burnoutRelatedDepartures) },
      { label: "Abridge impact", factor: { value: retentionImpactPct, onChange: (v: number) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v }), suffix: "%" }, running: `${formatNum1(providersRetained)} kept` },
    ];
    const retentionLevers = (
      <>
        <div className="mb-4">
          <LensToggle counted={retentionCounted} onChange={setRetentionMode} testId="ed-retention-lens-providerWellbeing" />
        </div>
        {retentionCounted ? (
          <MathCascade
            steps={[
              ...retentionRows,
              { label: "Replacement cost", factor: { value: td.ipReplacementCost, onChange: (v: number) => updateTimeDriverInputs({ ipReplacementCost: v }), prefix: "$" }, running: formatCurrency(Math.round(retentionValue / 1000) * 1000), final: true },
            ]}
          />
        ) : (
          <>
            <MathCascade steps={retentionRows} />
            <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">
              Tracked as the leading signal, not a dollar. Switch to Dollar to put the replacement-cost value in the ROI.
            </div>
          </>
        )}
      </>
    );

    const staffingValue = valueFor("incrementalStaffing");
    const staffingLevers = (
      <MathCascade
        steps={[
          { label: "Current incremental-staffing spend", factor: { value: td.ipStaffingCurrentSpend, onChange: (v: number) => updateTimeDriverInputs({ ipStaffingCurrentSpend: v }), prefix: "$" }, running: "—" },
          { label: "Abridge reduces", factor: { value: td.ipStaffingReductionPct, onChange: (v: number) => updateTimeDriverInputs({ ipStaffingReductionPct: v }), suffix: "%" }, running: formatCurrency(Math.round(staffingValue / 1000) * 1000), final: true },
        ]}
      />
    );

    const rows: LedgerRow[] = [
      {
        id: "providerWellbeing",
        label: "Provider Retention",
        kind: "counted",
        mechanism:
          "Abridge only touches the departures tied to documentation burden and burnout, not retirements, moves, or pay. This values just that slice, conservatively.",
        enabled: Boolean(td.wellbeingEnabled),
        onToggle: () => {
          const current = Boolean(td.wellbeingEnabled);
          updateTimeDriverInputs({ wellbeingEnabled: !current, calculateRetentionValue: !current });
        },
        amount: retentionCounted ? retentionValue : undefined,
        awaiting: gate("providerWellbeing"),
        expanded: Boolean(td.wellbeingExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ wellbeingExpanded: !td.wellbeingExpanded }),
        levers: retentionLevers,
      },
      {
        id: "incrementalStaffing",
        label: "Incremental Staffing Avoided",
        kind: "counted",
        mechanism:
          "Locum, moonlighting, overtime, and extra shifts are the premium coverage bought to absorb a documentation-heavy load. As the after-hours burden comes down, some of it is avoidable.",
        enabled: Boolean(td.ipIncrementalStaffingEnabled),
        onToggle: () => {
          const current = Boolean(td.ipIncrementalStaffingEnabled);
          updateTimeDriverInputs({ ipIncrementalStaffingEnabled: !current, ipIncrementalStaffingExpanded: true });
        },
        // The spend IS this driver's scale input, and it lives inside the levers.
        // So never gate the levers behind an awaiting message (that would hide the
        // only place to enter it); just withhold the header dollar until it's set.
        amount: staffingValue > 0 ? staffingValue : undefined,
        expanded: Boolean(td.ipIncrementalStaffingExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ ipIncrementalStaffingExpanded: !td.ipIncrementalStaffingExpanded }),
        levers: staffingLevers,
      },
      {
        id: "adminEfficiency",
        label: "Administrative Efficiency",
        kind: "tracked",
        mechanism: "Fewer clarifications and queries to chase. We track these as proof; the dollars they touch are counted once, in Revenue.",
        children: [
          {
            id: "umClarification",
            label: "UM Clarification Reduction",
            kind: "tracked",
            mechanism: "Complete admission documentation means Utilization Management sends fewer clarification requests back to physicians.",
            signals: ["UM clarification volume falls", "Physician time on UM back-and-forth drops"],
          },
          {
            id: "cdiQuery",
            label: "CDI Query / Physician Clarification Reduction",
            kind: "tracked",
            mechanism: "When the note carries the acuity up front, the CDI team raises fewer queries to close the same gaps.",
            signals: ["CDI queries per 100 admissions fall", "Query response burden drops"],
          },
        ],
      },
    ];

    const ledger = buildInpatientLedger(state, totalHoursSaved, "Workforce");

    return (
      <DriverLedger
        eyebrow="Value Model · Step 5 of 9 · Workforce"
        title="What is Abridge worth to your workforce?"
        intro="Documentation burden is a leading reason providers leave. Turn on only what you can stand behind; it adds to the ledger as you go."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Workforce"
        stepIndex={5}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Nursing V2 driver ledger ───
  // Mirrors the inpatient retention block: RN Retention (lens-gated) + Travel &
  // Agency Spend (priced on the same retained count). All cascade intermediates
  // are computed inline from `td` so the running chain foots to the engine value.
  if (setting === "nursing") {
    const gate = (driverId: string) => {
      const r = driverScaleReadiness(driverId, state, totalHoursSaved);
      return r.ready ? undefined : r.need;
    };

    const impactPct = nursingRetentionRates(td.retentionCustomPercent ?? 10)[td.retentionImpactScenario] ?? 0;
    const leaving = state.numberOfProviders * (td.nursingTurnoverRate / 100);
    const burnoutDep = leaving * (td.nursingBurnoutRelatedTurnover / 100);
    const retained = burnoutDep * (impactPct / 100);
    const retentionValue = valueFor("nursingRetention");
    const agencyValue = valueFor("nursingAgency");

    const retentionRows = [
      { label: "Nurses", running: formatNum(state.numberOfProviders) },
      { label: "Annual turnover", factor: { value: td.nursingTurnoverRate, onChange: (v: number) => updateTimeDriverInputs({ nursingTurnoverRate: v }), suffix: "%" }, running: formatNum1(leaving) },
      { label: "Tied to burnout", factor: { value: td.nursingBurnoutRelatedTurnover, onChange: (v: number) => updateTimeDriverInputs({ nursingBurnoutRelatedTurnover: v }), suffix: "%" }, running: formatNum1(burnoutDep) },
      { label: "Abridge impact", factor: { value: impactPct, onChange: (v: number) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v }), suffix: "%" }, running: `${formatNum1(retained)} kept` },
    ];

    const retentionLevers = (
      <>
        <div className="mb-4">
          <LensToggle counted={retentionCounted} onChange={setRetentionMode} testId="ed-retention-lens-nursingRetention" />
        </div>
        {retentionCounted ? (
          <MathCascade
            steps={[
              ...retentionRows,
              { label: "Replacement cost", factor: { value: td.nursingReplacementCost, onChange: (v: number) => updateTimeDriverInputs({ nursingReplacementCost: v }), prefix: "$" }, running: formatCurrency(retentionValue), final: true },
            ]}
          />
        ) : (
          <>
            <MathCascade steps={retentionRows} />
            <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">
              Tracked as the leading signal, not a dollar. Switch to Dollar to put the replacement-cost value in the ROI.
            </div>
          </>
        )}
      </>
    );

    const agencyLevers = (
      <MathCascade
        steps={[
          { label: "Nurses kept", running: `${formatNum1(retained)} kept` },
          { label: "Weeks of agency per vacancy", factor: { value: td.nursingAgencyWeeksPerVacancy, onChange: (v: number) => updateTimeDriverInputs({ nursingAgencyWeeksPerVacancy: v }), suffix: "wks" }, running: `${formatNum1(retained * td.nursingAgencyWeeksPerVacancy)} wks` },
          { label: "Agency premium", factor: { value: td.nursingAgencyWeeklyPremium, onChange: (v: number) => updateTimeDriverInputs({ nursingAgencyWeeklyPremium: v }), prefix: "$", suffix: "/wk" }, running: formatCurrency(agencyValue), final: true },
        ]}
      />
    );

    const rows: LedgerRow[] = [
      {
        id: "nursingRetention",
        label: "RN Retention",
        kind: "counted",
        mechanism:
          "Documentation burden is a real contributor to nurse burnout and turnover. Abridge only touches the departures tied to that, not pay or life events. This values just that slice.",
        enabled: Boolean(td.nursingRetentionEnabled),
        onToggle: () => {
          const current = Boolean(td.nursingRetentionEnabled);
          updateTimeDriverInputs(current ? { nursingRetentionEnabled: false } : { nursingRetentionEnabled: true, nursingRetentionExpanded: true });
        },
        amount: retentionCounted ? retentionValue : undefined,
        awaiting: gate("nursingRetention"),
        expanded: Boolean(td.nursingRetentionExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ nursingRetentionExpanded: !td.nursingRetentionExpanded }),
        levers: retentionLevers,
      },
      {
        id: "nursingAgency",
        label: "Travel & Agency Spend",
        kind: "counted",
        mechanism:
          "Travel and agency coverage is bought to fill the vacancies turnover creates. Keep more nurses and you lean on it less.",
        enabled: Boolean(td.nursingAgencyEnabled),
        onToggle: () => {
          const current = Boolean(td.nursingAgencyEnabled);
          updateTimeDriverInputs(current ? { nursingAgencyEnabled: false } : { nursingAgencyEnabled: true, nursingAgencyExpanded: true });
        },
        amount: retentionCounted ? agencyValue : undefined,
        awaiting: gate("nursingAgency"),
        expanded: Boolean(td.nursingAgencyExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ nursingAgencyExpanded: !td.nursingAgencyExpanded }),
        levers: agencyLevers,
      },
    ];

    const ledger = buildDriverLedger(state, totalHoursSaved, "Workforce", "nursing");

    return (
      <DriverLedger
        eyebrow="Value Model · Step 5 of 9 · Workforce"
        title="What is Abridge worth to your workforce?"
        intro="Documentation burden is a leading reason nurses burn out and leave the bedside. Turn on only what you can stand behind; it adds to the ledger as you go."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Workforce"
        stepIndex={5}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Outpatient V2 driver ledger ───
  // Mirrors the nursing/inpatient retention block with the PHYSICIAN fields:
  // Provider Retention (lens-gated) + Locum & Agency Spend (priced on the same
  // retained count) + Scribe Spend (independent displacement, not lens-gated).
  if (setting === "outpatient") {
    const gate = (driverId: string) => {
      const r = driverScaleReadiness(driverId, state, totalHoursSaved);
      return r.ready ? undefined : r.need;
    };

    const impactPct = physicianRetentionRates(td.retentionCustomPercent ?? 10)[td.retentionImpactScenario] ?? 0;
    const leaving = state.numberOfProviders * (td.annualTurnoverRate / 100);
    const burnoutDep = leaving * (td.burnoutRelatedTurnover / 100);
    const retained = burnoutDep * (impactPct / 100);
    const retentionValue = valueFor("providerWellbeing");
    const agencyValue = valueFor("physicianLocumAgency");

    const retentionRows = [
      { label: "Providers", running: formatNum(state.numberOfProviders) },
      { label: "Annual turnover", factor: { value: td.annualTurnoverRate, onChange: (v: number) => updateTimeDriverInputs({ annualTurnoverRate: v }), suffix: "%" }, running: formatNum1(leaving) },
      { label: "Tied to burnout", factor: { value: td.burnoutRelatedTurnover, onChange: (v: number) => updateTimeDriverInputs({ burnoutRelatedTurnover: v }), suffix: "%" }, running: formatNum1(burnoutDep) },
      { label: "Abridge impact", factor: { value: impactPct, onChange: (v: number) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v }), suffix: "%" }, running: `${formatNum1(retained)} kept` },
    ];

    const retentionLevers = (
      <>
        <div className="mb-4">
          <LensToggle counted={retentionCounted} onChange={setRetentionMode} testId="ed-retention-lens-providerWellbeing" />
        </div>
        {retentionCounted ? (
          <MathCascade
            steps={[
              ...retentionRows,
              { label: "Replacement cost", factor: { value: td.replacementCost, onChange: (v: number) => updateTimeDriverInputs({ replacementCost: v }), prefix: "$" }, running: formatCurrency(retentionValue), final: true },
            ]}
          />
        ) : (
          <>
            <MathCascade steps={retentionRows} />
            <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">
              Tracked as the leading signal, not a dollar. Switch to Dollar to put the replacement-cost value in the ROI.
            </div>
          </>
        )}
      </>
    );

    const agencyLevers = (
      <MathCascade
        steps={[
          { label: "Providers kept", running: `${formatNum1(retained)} kept` },
          { label: "Weeks of coverage per vacancy", factor: { value: td.physicianAgencyWeeksPerVacancy, onChange: (v: number) => updateTimeDriverInputs({ physicianAgencyWeeksPerVacancy: v }), suffix: "wks" }, running: `${formatNum1(retained * td.physicianAgencyWeeksPerVacancy)} wks` },
          { label: "Weekly premium", factor: { value: td.physicianAgencyWeeklyPremium, onChange: (v: number) => updateTimeDriverInputs({ physicianAgencyWeeklyPremium: v }), prefix: "$", suffix: "/wk" }, running: formatCurrency(agencyValue), final: true },
        ]}
      />
    );

    const scribeMode: "position" | "hourly" = td.scribeBillingMode === "hourly" ? "hourly" : "position";
    const scribeValue = valueFor("scribeCostReduction");
    const eliminated = Math.min(td.scribePositionsEliminated || 0, td.scribeHeadcount || 0);
    const costPerVisit = (td.scribeHourlyRate || 0) * ((td.scribeMinutesPerNote || 0) / 60);
    const scribedVisits = state.annualEncounters * ((td.scribeCoveragePercent || 0) / 100);
    const scribeLevers = (
      <>
        <ModePicker mode={scribeMode} onChange={(m) => updateTimeDriverInputs({ scribeBillingMode: m })} />
        {scribeMode === "hourly" ? (
          <MathCascade
            steps={[
              { label: "Documented visits scribed", running: formatNum(scribedVisits) },
              { label: "Scribe minutes per note", factor: { value: td.scribeMinutesPerNote, onChange: (v: number) => updateTimeDriverInputs({ scribeMinutesPerNote: v }), suffix: "min" }, running: `${formatNum1((td.scribeMinutesPerNote || 0) / 60)} hr/note` },
              { label: "Scribe hourly rate", factor: { value: td.scribeHourlyRate, onChange: (v: number) => updateTimeDriverInputs({ scribeHourlyRate: v }), prefix: "$" }, running: `${formatCurrency(costPerVisit)}/visit` },
              { label: "Share Abridge replaces", factor: { value: td.scribeVisitPercentEliminated, onChange: (v: number) => updateTimeDriverInputs({ scribeVisitPercentEliminated: Math.min(v, 100) }), suffix: "%" }, running: formatCurrency(scribeValue), final: true },
            ]}
          />
        ) : (
          <MathCascade
            steps={[
              { label: "Scribe positions today", factor: { value: td.scribeHeadcount, onChange: (v: number) => updateTimeDriverInputs({ scribeHeadcount: v }) }, running: `${formatNum(td.scribeHeadcount || 0)} positions` },
              { label: "Positions Abridge retires", factor: { value: td.scribePositionsEliminated, onChange: (v: number) => updateTimeDriverInputs({ scribePositionsEliminated: td.scribeHeadcount > 0 ? Math.min(v, td.scribeHeadcount) : v }) }, running: `${formatNum(eliminated)} retired` },
              { label: "Cost per position", factor: { value: td.scribeCostPerPosition, onChange: (v: number) => updateTimeDriverInputs({ scribeCostPerPosition: v }), prefix: "$" }, running: formatCurrency(scribeValue), final: true },
            ]}
          />
        )}
      </>
    );

    const rows: LedgerRow[] = [
      {
        id: "providerWellbeing",
        label: "Provider Retention",
        kind: "counted",
        mechanism:
          "A heavy documentation load is a leading reason clinicians burn out and leave. Abridge only touches the departures tied to that, not pay or life events.",
        enabled: Boolean(td.wellbeingEnabled),
        onToggle: () => {
          const current = Boolean(td.wellbeingEnabled);
          updateTimeDriverInputs(
            current
              ? { wellbeingEnabled: false, calculateRetentionValue: false }
              : { wellbeingEnabled: true, calculateRetentionValue: true, wellbeingExpanded: true },
          );
        },
        amount: retentionCounted ? retentionValue : undefined,
        awaiting: gate("providerWellbeing"),
        expanded: Boolean(td.wellbeingExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ wellbeingExpanded: !td.wellbeingExpanded }),
        levers: retentionLevers,
      },
      {
        id: "physicianLocumAgency",
        label: "Locum & Agency Spend",
        kind: "counted",
        mechanism:
          "Contract coverage bought to fill the vacancies turnover creates. Keep more people and you lean on it less.",
        enabled: Boolean(td.physicianAgencyEnabled),
        onToggle: () => {
          const current = Boolean(td.physicianAgencyEnabled);
          updateTimeDriverInputs(current ? { physicianAgencyEnabled: false } : { physicianAgencyEnabled: true, physicianAgencyExpanded: true });
        },
        amount: retentionCounted ? agencyValue : undefined,
        awaiting: gate("physicianLocumAgency"),
        expanded: Boolean(td.physicianAgencyExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ physicianAgencyExpanded: !td.physicianAgencyExpanded }),
        levers: agencyLevers,
      },
      {
        id: "scribeCostReduction",
        label: "Scribe Spend",
        kind: "counted",
        mechanism:
          "Abridge covers the documentation role a scribe was hired for, so the scribe cost can be retired.",
        enabled: Boolean(td.scribeCostReductionEnabled),
        onToggle: () => {
          const current = Boolean(td.scribeCostReductionEnabled);
          updateTimeDriverInputs(current ? { scribeCostReductionEnabled: false } : { scribeCostReductionEnabled: true, scribeCostReductionExpanded: true });
        },
        // The scale (headcount / encounters) is entered inside the levers, so we
        // never gate them behind an awaiting message; we just withhold the header
        // dollar until it computes. Not lens-gated: shows regardless of retention mode.
        amount: scribeValue > 0 ? scribeValue : undefined,
        expanded: Boolean(td.scribeCostReductionExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ scribeCostReductionExpanded: !td.scribeCostReductionExpanded }),
        levers: scribeLevers,
      },
    ];

    const ledger = buildDriverLedger(state, totalHoursSaved, "Workforce", "outpatient");

    return (
      <DriverLedger
        eyebrow="Value Model · Step 5 of 9 · Workforce"
        title="What is Abridge worth to your workforce?"
        intro="Documentation burden is a leading reason providers burn out and leave. Turn on only what you can stand behind; it adds to the ledger as you go."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Workforce"
        stepIndex={5}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── ED V2 driver ledger ───
  // ED Workforce uses the SAME physician fields and engine keys as outpatient:
  // Provider Retention (lens-gated) + Locum & Agency Spend (priced on the same
  // retained count) + Scribe Spend (independent displacement, not lens-gated).
  // Only the mechanism copy is ED-voiced. Cascade intermediates are computed
  // inline from `td` so each running chain foots to the engine value.
  if (setting === "ed") {
    const gate = (driverId: string) => {
      const r = driverScaleReadiness(driverId, state, totalHoursSaved);
      return r.ready ? undefined : r.need;
    };

    const impactPct = physicianRetentionRates(td.retentionCustomPercent ?? 10)[td.retentionImpactScenario] ?? 0;
    const leaving = state.numberOfProviders * (td.annualTurnoverRate / 100);
    const burnoutDep = leaving * (td.burnoutRelatedTurnover / 100);
    const retained = burnoutDep * (impactPct / 100);
    const retentionValue = valueFor("providerWellbeing");
    const agencyValue = valueFor("physicianLocumAgency");

    const retentionRows = [
      { label: "Providers", running: formatNum(state.numberOfProviders) },
      { label: "Annual turnover", factor: { value: td.annualTurnoverRate, onChange: (v: number) => updateTimeDriverInputs({ annualTurnoverRate: v }), suffix: "%" }, running: formatNum1(leaving) },
      { label: "Tied to burnout", factor: { value: td.burnoutRelatedTurnover, onChange: (v: number) => updateTimeDriverInputs({ burnoutRelatedTurnover: v }), suffix: "%" }, running: formatNum1(burnoutDep) },
      { label: "Abridge impact", factor: { value: impactPct, onChange: (v: number) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v }), suffix: "%" }, running: `${formatNum1(retained)} kept` },
    ];

    const retentionLevers = (
      <>
        <div className="mb-4">
          <LensToggle counted={retentionCounted} onChange={setRetentionMode} testId="ed-retention-lens-providerWellbeing" />
        </div>
        {retentionCounted ? (
          <MathCascade
            steps={[
              ...retentionRows,
              { label: "Replacement cost", factor: { value: td.replacementCost, onChange: (v: number) => updateTimeDriverInputs({ replacementCost: v }), prefix: "$" }, running: formatCurrency(retentionValue), final: true },
            ]}
          />
        ) : (
          <>
            <MathCascade steps={retentionRows} />
            <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">
              Tracked as the leading signal, not a dollar. Switch to Dollar to put the replacement-cost value in the ROI.
            </div>
          </>
        )}
      </>
    );

    const agencyLevers = (
      <MathCascade
        steps={[
          { label: "Providers kept", running: `${formatNum1(retained)} kept` },
          { label: "Weeks of coverage per vacancy", factor: { value: td.physicianAgencyWeeksPerVacancy, onChange: (v: number) => updateTimeDriverInputs({ physicianAgencyWeeksPerVacancy: v }), suffix: "wks" }, running: `${formatNum1(retained * td.physicianAgencyWeeksPerVacancy)} wks` },
          { label: "Weekly premium", factor: { value: td.physicianAgencyWeeklyPremium, onChange: (v: number) => updateTimeDriverInputs({ physicianAgencyWeeklyPremium: v }), prefix: "$", suffix: "/wk" }, running: formatCurrency(agencyValue), final: true },
        ]}
      />
    );

    const scribeMode: "position" | "hourly" = td.scribeBillingMode === "hourly" ? "hourly" : "position";
    const scribeValue = valueFor("scribeCostReduction");
    const eliminated = Math.min(td.scribePositionsEliminated || 0, td.scribeHeadcount || 0);
    const costPerVisit = (td.scribeHourlyRate || 0) * ((td.scribeMinutesPerNote || 0) / 60);
    const scribedVisits = state.annualEncounters * ((td.scribeCoveragePercent || 0) / 100);
    const scribeLevers = (
      <>
        <ModePicker mode={scribeMode} onChange={(m) => updateTimeDriverInputs({ scribeBillingMode: m })} />
        {scribeMode === "hourly" ? (
          <MathCascade
            steps={[
              { label: "Documented visits scribed", running: formatNum(scribedVisits) },
              { label: "Scribe minutes per note", factor: { value: td.scribeMinutesPerNote, onChange: (v: number) => updateTimeDriverInputs({ scribeMinutesPerNote: v }), suffix: "min" }, running: `${formatNum1((td.scribeMinutesPerNote || 0) / 60)} hr/note` },
              { label: "Scribe hourly rate", factor: { value: td.scribeHourlyRate, onChange: (v: number) => updateTimeDriverInputs({ scribeHourlyRate: v }), prefix: "$" }, running: `${formatCurrency(costPerVisit)}/visit` },
              { label: "Share Abridge replaces", factor: { value: td.scribeVisitPercentEliminated, onChange: (v: number) => updateTimeDriverInputs({ scribeVisitPercentEliminated: Math.min(v, 100) }), suffix: "%" }, running: formatCurrency(scribeValue), final: true },
            ]}
          />
        ) : (
          <MathCascade
            steps={[
              { label: "Scribe positions today", factor: { value: td.scribeHeadcount, onChange: (v: number) => updateTimeDriverInputs({ scribeHeadcount: v }) }, running: `${formatNum(td.scribeHeadcount || 0)} positions` },
              { label: "Positions Abridge retires", factor: { value: td.scribePositionsEliminated, onChange: (v: number) => updateTimeDriverInputs({ scribePositionsEliminated: td.scribeHeadcount > 0 ? Math.min(v, td.scribeHeadcount) : v }) }, running: `${formatNum(eliminated)} retired` },
              { label: "Cost per position", factor: { value: td.scribeCostPerPosition, onChange: (v: number) => updateTimeDriverInputs({ scribeCostPerPosition: v }), prefix: "$" }, running: formatCurrency(scribeValue), final: true },
            ]}
          />
        )}
      </>
    );

    const rows: LedgerRow[] = [
      {
        id: "providerWellbeing",
        label: "Provider Retention",
        kind: "counted",
        mechanism:
          "A heavy documentation load is a leading reason emergency physicians burn out and leave. Abridge only touches the departures tied to that, not pay or life events.",
        enabled: Boolean(td.wellbeingEnabled),
        onToggle: () => {
          const current = Boolean(td.wellbeingEnabled);
          updateTimeDriverInputs(
            current
              ? { wellbeingEnabled: false, calculateRetentionValue: false }
              : { wellbeingEnabled: true, calculateRetentionValue: true, wellbeingExpanded: true },
          );
        },
        amount: retentionCounted ? retentionValue : undefined,
        awaiting: gate("providerWellbeing"),
        expanded: Boolean(td.wellbeingExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ wellbeingExpanded: !td.wellbeingExpanded }),
        levers: retentionLevers,
      },
      {
        id: "physicianLocumAgency",
        label: "Locum & Agency Spend",
        kind: "counted",
        mechanism:
          "Contract coverage bought to fill the vacancies turnover creates. Keep more people and you lean on it less.",
        enabled: Boolean(td.physicianAgencyEnabled),
        onToggle: () => {
          const current = Boolean(td.physicianAgencyEnabled);
          updateTimeDriverInputs(current ? { physicianAgencyEnabled: false } : { physicianAgencyEnabled: true, physicianAgencyExpanded: true });
        },
        amount: retentionCounted ? agencyValue : undefined,
        awaiting: gate("physicianLocumAgency"),
        expanded: Boolean(td.physicianAgencyExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ physicianAgencyExpanded: !td.physicianAgencyExpanded }),
        levers: agencyLevers,
      },
      {
        id: "scribeCostReduction",
        label: "Scribe Spend",
        kind: "counted",
        mechanism:
          "Abridge covers the documentation role a scribe was hired for, so the scribe cost can be retired.",
        enabled: Boolean(td.scribeCostReductionEnabled),
        onToggle: () => {
          const current = Boolean(td.scribeCostReductionEnabled);
          updateTimeDriverInputs(current ? { scribeCostReductionEnabled: false } : { scribeCostReductionEnabled: true, scribeCostReductionExpanded: true });
        },
        amount: scribeValue > 0 ? scribeValue : undefined,
        expanded: Boolean(td.scribeCostReductionExpanded),
        onToggleExpand: () => updateTimeDriverInputs({ scribeCostReductionExpanded: !td.scribeCostReductionExpanded }),
        levers: scribeLevers,
      },
    ];

    const ledger = buildDriverLedger(state, totalHoursSaved, "Workforce", "ed");

    return (
      <DriverLedger
        eyebrow="Value Model · Step 5 of 9 · Workforce"
        title="What is Abridge worth to your workforce?"
        intro="Documentation load is a leading reason emergency physicians burn out and lean on locum coverage. Turn on only what you can stand behind; it adds to the ledger as you go."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Workforce"
        stepIndex={5}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  return (
    <EditorialShell>
      <EditorialHeader stepName="Workforce" stepIndex={5} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 5 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">What is Abridge worth to your workforce?</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[680px] leading-[1.5]">
          <>Documentation burden is a leading reason providers burn out and leave. As the after-hours load comes down, fewer walk out the door. Turn on only what you can stand behind, and nothing counts until you switch it on.</>
        </p>

        <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-x-10 gap-y-8 items-start">
        <div className="min-w-0">
        <SectionLabel
          tag="counts when it's on"
          subtotal={
            flatFinancial.length > 1 &&
            (totalValue > 0 ? (
              <>
                Counted on this screen&nbsp; <b className="font-abridge text-[#1A1A1A] text-[15px]">{formatCurrency(totalValue)}</b>{" "}
                / yr &nbsp;·&nbsp;{" "}
                <span className="text-[#7C766F] font-bold">
                  {totalOn} of {flatFinancial.length} drivers on
                </span>
              </>
            ) : totalOn > 0 ? (
              // Drivers on but tracked (retention default): don't show a broken "$0/yr · N on".
              <>
                Tracked as signals&nbsp;·&nbsp;{" "}
                <span className="text-[#7C766F] font-bold">{totalOn} of {flatFinancial.length} on</span>
                &nbsp;·&nbsp; switch to Dollar to count
              </>
            ) : (
              <span className="text-[#7C766F] font-bold">{totalOn} of {flatFinancial.length} drivers on</span>
            ))
          }
        >
          The value
        </SectionLabel>

        {flatFinancial.length > 0 ? (
          flatFinancial.map(renderDriver)
        ) : (
          <EmptyValueCard>No financial workforce driver applies to this care setting yet in Explore.</EmptyValueCard>
        )}

        {watchDomainFor(setting, "Workforce") ? (
          <SignalWatch domain={watchDomainFor(setting, "Workforce")!} />
        ) : (
          tier2 && (
            <>
              <SectionLabel tag="not counted · examples only" tagMuted>
                {TEAM_TIER2.label}
              </SectionLabel>
              <OutcomesBlock heading={TEAM_TIER2.label} signals={tier2.signals} outcomes={tier2.outcomes} note={TEAM_TIER2.note} />
            </>
          )
        )}
        </div>
        <div className="flex flex-col gap-5">
          <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Workforce" />
          <Foot onNext={onNext} />
        </div>
        </div>
      </div>
    </EditorialShell>
  );
}
