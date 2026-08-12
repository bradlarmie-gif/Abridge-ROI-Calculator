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
import { driverScaleReadiness } from "@/lib/exploreScaleGate";
import { physicianRetentionRates, nursingRetentionRates, PHYSICIAN_RETENTION_SCENARIOS, NURSING_RETENTION_SCENARIOS } from "@/lib/retentionScenarios";
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

function ScenarioPicks({
  value,
  onPick,
  rates,
}: {
  value: string;
  onPick: (v: "conservative" | "typical" | "optimistic") => void;
  rates: Record<string, number>;
}) {
  const opts: { key: "conservative" | "typical" | "optimistic"; label: string }[] = [
    { key: "conservative", label: "Conservative" },
    { key: "typical", label: "Typical" },
    { key: "optimistic", label: "Optimistic" },
  ];
  return (
    <div className="flex gap-[6px] mt-2 flex-wrap">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          className={`text-[11.5px] font-bold rounded-[8px] border px-[9px] py-[5px] transition-colors ${
            value === o.key ? "border-[#EA2C00] text-[#EA2C00] bg-[#FFF7F4]" : "border-[#E7E3DD] text-[#565250] bg-white hover:border-[#1A1A1A]"
          }`}
        >
          {o.label} · {rates[o.key]}%
        </button>
      ))}
    </div>
  );
}

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
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle="Abridge only touches the departures tied to documentation burden and burnout, not retirements, moves, or pay. This values just that slice, conservatively."
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum1(providersRetained)}</b> provider a year who'd otherwise
              have burned out and left
            </>
          }
          lens={{ counted: retentionCounted, onChange: setRetentionMode, testId: `ed-retention-lens-${driver.id}` }}
          trackedHeadline={
            <>
              <div className="flex flex-wrap items-end gap-x-[26px] gap-y-[10px]">
                {[
                  { v: `${turnoverValue}%`, l: "turnover" },
                  { v: `${burnoutValue}%`, l: "tied to burnout" },
                  { v: `${impactPct}%`, l: "Abridge keeps" },
                  { v: `≈ ${formatNum1(providersRetained)}`, l: "providers/yr kept" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-abridge text-[30px] sm:text-[32px] leading-none text-[#2E2822]">{s.v}</div>
                    <div className="text-[12px] text-[#7C766F] mt-[4px]">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="text-[12.5px] text-[#7C766F] mt-[13px] leading-[1.45] max-w-[460px]">
                Tracked as the leading signal, not a dollar. When these move, a steadier team is within reach; the
                replacement-cost value stays out of the ROI unless you switch to Dollar.
              </div>
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          buildStruct={{
            factors: [
              { value: formatNum(state.numberOfProviders), label: "providers" },
              { value: `${turnoverValue}%`, label: "turnover" },
              { value: `${burnoutValue}%`, label: "tied to burnout" },
              { value: `${impactPct}%`, label: "Abridge keeps" },
              { value: formatCurrency(replacementValue), label: "to replace" },
            ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <Field label={isIP ? "Inpatient provider turnover" : "Annual turnover rate"}>
            <NumBox
              value={turnoverValue}
              suffix="%"
              onChange={(v) => updateTimeDriverInputs(isIP ? { ipAnnualTurnoverRate: v } : { annualTurnoverRate: v })}
              testId={`ed-input-${driver.id}-turnover`}
            />
          </Field>
          <Field
            label="Tied to burnout & documentation"
            note={
              <>
                ≈ <b className="font-abridge text-[#565250]">{formatNum1(burnoutRelatedDepartures)}</b> of the{" "}
                <b className="font-abridge text-[#565250]">{formatNum1(providersLeavingPerYear)}</b> leaving each year are
                addressable
              </>
            }
          >
            <NumBox
              value={burnoutValue}
              suffix="%"
              onChange={(v) => updateTimeDriverInputs(isIP ? { ipBurnoutRelatedTurnover: v } : { burnoutRelatedTurnover: v })}
              testId={`ed-input-${driver.id}-burnout`}
            />
          </Field>
          <Field label="Of those, Abridge keeps">
            <NumBox
              value={impactPct}
              suffix="%"
              onChange={(v) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v })}
              testId={`ed-input-${driver.id}-impact`}
            />
            <ScenarioPicks
              value={td.retentionImpactScenario}
              onPick={(v) => updateTimeDriverInputs({ retentionImpactScenario: v })}
              rates={PHYSICIAN_RETENTION_SCENARIOS}
            />
          </Field>
          <Field label="Cost to replace each">
            <NumBox
              value={replacementValue}
              prefix="$"
              onChange={(v) => updateTimeDriverInputs(isIP ? { ipReplacementCost: v } : { replacementCost: v })}
              testId={`ed-input-${driver.id}-replacement`}
            />
          </Field>
        </ValueCard>
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
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle="Avoided locum coverage spend for the providers Provider Retention keeps from leaving, priced at weeks of coverage avoided times the weekly premium."
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum1(retained)}</b> provider's worth of vacancy coverage
              avoided
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          warning={blocked && "Turn on Provider Retention above to see this driver's value. Locum & agency savings are derived from the providers it retains."}
          buildStruct={{
            // Full raw chain (mirrors the Provider Retention card and the PDF
            // calcSummary) so the printed factors multiply exactly to the value;
            // the rounded `retained` used as a hard multiplicand didn't reconcile.
            factors: [
              { value: formatNum(state.numberOfProviders), label: "providers" },
              { value: `${turnoverValue}%`, label: "turnover" },
              { value: `${burnoutValue}%`, label: "tied to burnout" },
              { value: `${impactPct}%`, label: "Abridge keeps" },
              { value: `${td.physicianAgencyWeeksPerVacancy}`, label: "wks locum avoided" },
              { value: formatCurrency(td.physicianAgencyWeeklyPremium), label: "per week" },
            ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <Field label="Weeks of locum coverage per vacancy">
            <NumBox
              value={td.physicianAgencyWeeksPerVacancy}
              suffix="wks"
              onChange={(v) => updateTimeDriverInputs({ physicianAgencyWeeksPerVacancy: v })}
              testId={`ed-input-${driver.id}-weeks`}
            />
          </Field>
          <Field label="Weekly premium above base salary">
            <NumBox
              value={td.physicianAgencyWeeklyPremium}
              prefix="$"
              onChange={(v) => updateTimeDriverInputs({ physicianAgencyWeeklyPremium: v })}
              testId={`ed-input-${driver.id}-premium`}
            />
          </Field>
        </ValueCard>
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

      return (
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          value={value}
          secondary={isPosition ? <>≈ <b className="font-abridge text-[#1A1A1A]">{eliminated}</b> scribe position{eliminated !== 1 ? "s" : ""} eliminated</> : <>≈ <b className="font-abridge text-[#1A1A1A]">{formatNum(scribedVisitsReplaced)}</b> scribed visits/yr replaced</>}
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          awaitingScale={(() => { const r = driverScaleReadiness(driver.id, state, totalHoursSaved); return r.ready ? undefined : { need: r.need }; })()}
          buildStruct={{
            factors: isPosition
              ? [
                  { value: `${eliminated}`, label: eliminated === 1 ? "position cut" : "positions cut" },
                  { value: formatCurrency(td.scribeCostPerPosition), label: "per position" },
                ]
              : [
                  { value: formatNum(scribedVisitsReplaced), label: "scribed visits replaced" },
                  { value: `$${costPerVisit.toFixed(2)}`, label: "per visit" },
                ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <div className="sm:col-span-2">
            <ModePicker mode={isPosition ? "position" : "hourly"} onChange={(m) => updateTimeDriverInputs({ scribeBillingMode: m })} />
          </div>
          {isPosition ? (
            <>
              <Field label="Current scribe headcount">
                <NumBox value={td.scribeHeadcount} onChange={(v) => updateTimeDriverInputs({ scribeHeadcount: v })} testId={`ed-input-${driver.id}-headcount`} />
              </Field>
              <Field label="Annual cost per position">
                <NumBox value={td.scribeCostPerPosition} prefix="$" onChange={(v) => updateTimeDriverInputs({ scribeCostPerPosition: v })} testId={`ed-input-${driver.id}-costperposition`} />
              </Field>
              <Field label="Positions eliminated with Abridge">
                <NumBox
                  value={td.scribePositionsEliminated}
                  onChange={(v) => updateTimeDriverInputs({ scribePositionsEliminated: td.scribeHeadcount > 0 ? Math.min(v, td.scribeHeadcount) : v })}
                  testId={`ed-input-${driver.id}-eliminated`}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Hourly billing rate">
                <NumBox value={td.scribeHourlyRate} prefix="$" onChange={(v) => updateTimeDriverInputs({ scribeHourlyRate: v })} testId={`ed-input-${driver.id}-hourlyrate`} />
              </Field>
              <Field label="Avg minutes per note">
                <NumBox value={td.scribeMinutesPerNote} suffix="min" onChange={(v) => updateTimeDriverInputs({ scribeMinutesPerNote: v })} testId={`ed-input-${driver.id}-minutes`} />
              </Field>
              <Field label="% of visits currently scribed">
                <NumBox value={td.scribeCoveragePercent} suffix="%" onChange={(v) => updateTimeDriverInputs({ scribeCoveragePercent: Math.min(v, 100) })} testId={`ed-input-${driver.id}-coverage`} />
              </Field>
              <Field label="% of those replaced by Abridge">
                <NumBox value={td.scribeVisitPercentEliminated} suffix="%" onChange={(v) => updateTimeDriverInputs({ scribeVisitPercentEliminated: Math.min(v, 100) })} testId={`ed-input-${driver.id}-visitpct`} />
              </Field>
            </>
          )}
        </ValueCard>
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
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle={driver.shortDescription}
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum1(retained)}</b> nurse a year who'd otherwise have left
            </>
          }
          lens={{ counted: retentionCounted, onChange: setRetentionMode, testId: `ed-retention-lens-${driver.id}` }}
          trackedHeadline={
            <>
              <div className="flex flex-wrap items-end gap-x-[26px] gap-y-[10px]">
                {[
                  { v: `${td.nursingTurnoverRate}%`, l: "turnover" },
                  { v: "40%", l: "tied to burnout" },
                  { v: `${impactPct}%`, l: "Abridge keeps" },
                  { v: `≈ ${formatNum1(retained)}`, l: "nurses/yr kept" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-abridge text-[30px] sm:text-[32px] leading-none text-[#2E2822]">{s.v}</div>
                    <div className="text-[12px] text-[#7C766F] mt-[4px]">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="text-[12.5px] text-[#7C766F] mt-[13px] leading-[1.45] max-w-[460px]">
                Tracked as the leading signal, not a dollar. When these move, a steadier team is within reach; the
                replacement-cost value stays out of the ROI unless you switch to Dollar.
              </div>
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          buildStruct={{
            factors: [
              { value: formatNum(state.numberOfProviders), label: "nurses" },
              { value: `${td.nursingTurnoverRate}%`, label: "turnover" },
              { value: "40%", label: "tied to burnout" },
              { value: `${impactPct}%`, label: "Abridge keeps" },
              { value: formatCurrency(td.nursingReplacementCost), label: "to replace" },
            ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <Field label="Annual turnover rate">
            <NumBox value={td.nursingTurnoverRate} suffix="%" onChange={(v) => updateTimeDriverInputs({ nursingTurnoverRate: v })} testId={`ed-input-${driver.id}-turnover`} />
          </Field>
          <Field label="Of those, Abridge keeps" note="Applied to the 40% of departures that are burnout-related.">
            <NumBox
              value={impactPct}
              suffix="%"
              onChange={(v) => updateTimeDriverInputs({ retentionImpactScenario: "custom", retentionCustomPercent: v })}
              testId={`ed-input-${driver.id}-impact`}
            />
            <ScenarioPicks
              value={td.retentionImpactScenario}
              onPick={(v) => updateTimeDriverInputs({ retentionImpactScenario: v })}
              rates={NURSING_RETENTION_SCENARIOS}
            />
          </Field>
          <Field label="Replacement cost per nurse">
            <NumBox value={td.nursingReplacementCost} prefix="$" onChange={(v) => updateTimeDriverInputs({ nursingReplacementCost: v })} testId={`ed-input-${driver.id}-replacement`} />
          </Field>
        </ValueCard>
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
        <ValueCard
          key={driver.id}
          title={driver.label}
          subtitle="Avoided agency coverage spend for the nurses RN Retention keeps from leaving, priced at weeks of coverage avoided times the weekly premium."
          value={value}
          secondary={
            <>
              ≈ <b className="font-abridge text-[#1A1A1A]">{formatNum1(retained)}</b> nurse's worth of vacancy coverage avoided
            </>
          }
          onToggle={() => toggleEnabled(driver)}
          testId={`ed-toggle-${driver.id}`}
          warning={blocked && "Turn on RN Retention above to see this driver's value. Travel & agency savings are derived from the nurses it retains."}
          buildStruct={{
            // Full raw chain (mirrors the RN Retention card and the PDF
            // calcSummary) so the printed factors multiply exactly to the value.
            // Using the rounded `retained` (0.2) as a hard multiplicand made the
            // chain fail to reconcile (0.2 × 12 × $2,500 ≠ $5,184).
            factors: [
              { value: formatNum(state.numberOfProviders), label: "nurses" },
              { value: `${td.nursingTurnoverRate}%`, label: "turnover" },
              { value: "40%", label: "tied to burnout" },
              { value: `${impactPct}%`, label: "Abridge keeps" },
              { value: `${td.nursingAgencyWeeksPerVacancy}`, label: "wks agency avoided" },
              { value: formatCurrency(td.nursingAgencyWeeklyPremium), label: "per week" },
            ],
            grossLabel: "",
            gross: value,
            net: value,
            haircutLabel: "",
          }}
        >
          <Field label="Weeks of agency coverage per vacancy">
            <NumBox value={td.nursingAgencyWeeksPerVacancy} suffix="wks" onChange={(v) => updateTimeDriverInputs({ nursingAgencyWeeksPerVacancy: v })} testId={`ed-input-${driver.id}-weeks`} />
          </Field>
          <Field label="Weekly agency premium">
            <NumBox value={td.nursingAgencyWeeklyPremium} prefix="$" onChange={(v) => updateTimeDriverInputs({ nursingAgencyWeeklyPremium: v })} testId={`ed-input-${driver.id}-premium`} />
          </Field>
        </ValueCard>
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
        <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Workforce" />
        </div>

        <Foot onNext={onNext} />
      </div>
    </EditorialShell>
  );
}
