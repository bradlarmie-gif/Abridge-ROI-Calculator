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

  return (
    <EditorialShell>
      <EditorialHeader stepName="Workforce" stepIndex={5} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 5 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">What is Abridge worth to your workforce?</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[680px] leading-[1.5]">
          {setting === "nursing" ? (
            <>Documentation burden is a leading reason RNs burn out and leave the bedside. As the after-hours charting load comes down, fewer walk out the door. Turn on only what you can stand behind, and nothing counts until you switch it on.</>
          ) : (
            <>Documentation burden is a leading reason providers burn out and leave. As the after-hours load comes down, fewer walk out the door. Turn on only what you can stand behind, and nothing counts until you switch it on.</>
          )}
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
