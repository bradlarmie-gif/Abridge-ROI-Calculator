import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import {
  MoneyCard,
  SectionLabel,
  DividerLabel,
  FieldGrid,
  FieldTile,
  Fi,
  FiReadout,
  QuickFill,
  PlansRepeater,
  PlanRow,
  OutcomesTier,
  fmt$,
  fmtN,
} from "./EdMoneyCard";
import {
  computeAllDriverValues,
  wrvuScenariosFor,
  denialsScenariosFor,
  IP_DRG_PROTECT_SCENARIOS,
  IP_OBS_PREVENTABLE_SCENARIOS,
} from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";
import { getDriversForPage } from "@/lib/exploreDrivers";
import { type ExploreState, type HccPlan } from "../ExploreFlow";
import { hccValueFor, HCC_VALUE_GENERIC } from "@/lib/hccPayers";
import { SignalWatch } from "./SignalWatch";
import { watchDomainFor } from "@/lib/exploreWatchSignals";
import ValueRail from "./ValueRail";
import { InlineDriverCard, EqNum, EqCarried, EqOp, EqResult, EquationRow, EqAwaiting } from "./InlineEquation";
import { X, Plus } from "lucide-react";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";
import DriverLedger, { type LedgerRow } from "./DriverLedger";
import { buildInpatientLedger, buildDriverLedger } from "./driverLedgerData";
import { MathCascade } from "./MathCascade";

interface EdRevenueProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  priorQuadrants?: PriorQuadrantEntry[];
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

const PAY_LABELS: { key: ExploreState["paymentModel"]; label: string }[] = [
  { key: "ffs", label: "Fee-for-service" },
  { key: "risk", label: "Risk-based" },
  { key: "both", label: "Both" },
];

export default function EdRevenue({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: EdRevenueProps) {
  const setting = state.careSetting;
  const dq = state.docQualityInputs;
  const td = state.timeDriverInputs;
  const isED = setting === "ed";
  const isIP = setting === "inpatient";
  const isOP = setting === "outpatient";
  const isNursing = setting === "nursing";

  const engine = computeAllDriverValues(state, totalHoursSaved);
  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

  // Scale-gating: no dollar until the driver's scale input(s) are entered.
  const gate = (driverId: string) => {
    const r = driverScaleReadiness(driverId, state, totalHoursSaved);
    return r.ready ? undefined : { need: r.need };
  };

  const updateDq = (updates: Partial<ExploreState["docQualityInputs"]>) =>
    updateState({ docQualityInputs: { ...dq, ...updates } });
  const updatePaymentModel = (paymentModel: ExploreState["paymentModel"]) => updateState({ paymentModel });

  const drivers = setting ? getDriversForPage("Revenue", setting) : [];
  const signalDrivers = drivers.filter((d) => !d.childOfDriverId && d.visibility === "qualitative");

  // ── wRVU / E&M card (outpatient + ED) ──
  const wrvuScenarios = wrvuScenariosFor(isED, dq.wrvuCustomPercent);
  const wrvuLiftPct = wrvuScenarios[dq.wrvuScenario] ?? 0;
  const wrvuKey = engineKeyForDriver("wrvu", setting ?? "");
  const wrvuValue = engine[wrvuKey] ?? 0;
  const wrvuLiftPerVisit = (dq.currentWrvu * wrvuLiftPct) / 100;
  const additionalWrvus = Math.round(eligibleEncounters * wrvuLiftPerVisit);

  const wrvuAwait = gate("wrvu");
  const wrvuCard = (
    <InlineDriverCard
      key="wrvu"
      title={isED ? "E&M level accuracy" : "wRVU capture"}
      tag={isOP ? "Fee-for-service" : undefined}
      subtitle={
        isED
          ? "When an ED note understates the acuity, the E/M level codes down and you bill below the work you did. A complete note lets the level match the visit, so you capture what you already earned."
          : "When a note understates the visit, the E/M level codes down and you bill below the work you did. A complete note lets the level match the visit, so you capture what you already earned."
      }
      enabled={dq.wrvuEnabled}
      onToggle={() => updateDq({ wrvuEnabled: !dq.wrvuEnabled, wrvuExpanded: !dq.wrvuEnabled ? true : dq.wrvuExpanded })}
      testId="toggle-wrvu"
      note={
        <>Grey figures carry from your earlier steps; change any coral figure and this reprices live. Coding education and CDI programs also move this lift, so we attribute only <b className="text-[#B02200] not-italic">{dq.wrvuRealization}%</b> to the note and leave the rest out of the number.</>
      }
    >
      {wrvuAwait ? (
        <EqAwaiting need={wrvuAwait.need} />
      ) : (
        <EquationRow>
          {/* eligibleEncounters is the DOCUMENTED subset (× utilization), not the full
              ED-encounter total shown on Capacity; label it so the two never collide. */}
          <EqCarried cap={isED ? "Documented ED visits" : "Documented visits"}>{fmtN(eligibleEncounters)}</EqCarried>
          <EqOp>×</EqOp>
          <EqNum cap="wRVU / visit" value={dq.currentWrvu} onChange={(v) => updateDq({ currentWrvu: v })} decimal width={50} />
          <EqOp>×</EqOp>
          <EqNum cap="lift captured" value={wrvuLiftPct} onChange={(v) => updateDq({ wrvuScenario: "custom", wrvuCustomPercent: v })} suffix="%" width={40} />
          <EqOp>×</EqOp>
          <EqNum cap="per wRVU" value={dq.conversionFactor} onChange={(v) => updateDq({ conversionFactor: v })} prefix="$" decimal width={66} />
          <EqOp>×</EqOp>
          <EqNum cap="attribution" value={dq.wrvuRealization} onChange={(v) => updateDq({ wrvuRealization: v })} suffix="%" width={40} />
          <EqResult value={wrvuValue} />
        </EquationRow>
      )}
    </InlineDriverCard>
  );

  // ── HCC card (outpatient only) ──
  const plans = dq.hccPlans;
  const sharedPlan = plans[0];
  const recaptureRateToday = sharedPlan?.currentRecaptureRate ?? 65;
  const HCC_UPLIFT_SCENARIOS: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };
  const upliftPts =
    sharedPlan?.uplift === "custom"
      ? sharedPlan?.upliftCustomPp ?? 5
      : HCC_UPLIFT_SCENARIOS[sharedPlan?.uplift ?? "typical"] ?? 5;
  const withAbridge = recaptureRateToday + upliftPts;
  const totalPanel = plans.reduce((s, p) => s + p.panelSize * state.numberOfProviders, 0);
  const hccValue = engine.hccCapture ?? 0;

  const setAllPlans = (updates: Partial<HccPlan>) =>
    updateDq({ hccPlans: plans.map((p) => ({ ...p, ...updates })) });

  const addPlan = () => {
    const newPlan: HccPlan = {
      id: `plan-${Date.now()}`,
      planType: "custom",
      name: "Custom plan",
      panelSize: 0, // SCALE — blank until the partner enters this plan's panel
      valuePerHcc: HCC_VALUE_GENERIC,
      gapRate: sharedPlan?.gapRate ?? 65,
      currentRecaptureRate: recaptureRateToday,
      uplift: sharedPlan?.uplift ?? "typical",
      upliftCustomPp: sharedPlan?.upliftCustomPp,
      netNewEnabled: sharedPlan?.netNewEnabled ?? false,
      netNewDiscoveryRate: sharedPlan?.netNewDiscoveryRate ?? 3,
      netNewAvgConditions: sharedPlan?.netNewAvgConditions ?? 1.2,
    };
    updateDq({ hccPlans: [...plans, newPlan] });
  };

  const removePlan = (id: string) => {
    if (plans.length <= 1) return;
    updateDq({ hccPlans: plans.filter((p) => p.id !== id) });
  };

  // Mirrors the per-plan loop in computeAllDriverValues purely to print the
  // "build" formula text below — the headline dollar figure above always
  // comes straight from the engine (`engine.hccCapture`), never this.
  const planBreakdown = plans.map((p) => {
    const pUpliftPts = p.uplift === "custom" ? p.upliftCustomPp ?? 5 : HCC_UPLIFT_SCENARIOS[p.uplift] ?? 5;
    const effectiveUplift = Math.min(pUpliftPts, Math.max(0, 100 - p.currentRecaptureRate));
    const members = state.numberOfProviders * p.panelSize;
    const perMember = dq.avgHccs * (effectiveUplift / 100) + (p.netNewAvgConditions ?? 0);
    const gross = members * perMember * p.valuePerHcc;
    return { name: p.name, gross: Math.round(gross * (dq.hccRealization / 100)) };
  });

  // Aggregate build across plans: total members × blended value/member = gross
  // recaptured, then one realization (RADV survival). Per-plan economics stay
  // visible in the repeater below.
  const hccGross = dq.hccRealization > 0 ? hccValue / (dq.hccRealization / 100) : hccValue;
  const hccPerMember = totalPanel > 0 ? hccGross / totalPanel : 0;

  // Per-plan economics, computed from the plan's own figures so each card's +$ foots and the plans
  // sum to the engine's hccValue. Realization (RADV survival) applied per plan, shared rate below.
  const HCC_SC: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };
  const upliftPtsOf = (p: HccPlan) => (p.uplift === "custom" ? p.upliftCustomPp ?? 5 : HCC_SC[p.uplift] ?? 5);
  const effUpliftOf = (p: HccPlan) => Math.min(upliftPtsOf(p), Math.max(0, 100 - p.currentRecaptureRate));
  const membersOf = (p: HccPlan) => p.panelSize * state.numberOfProviders;
  const recapturePartOf = (p: HccPlan) => Math.round(membersOf(p) * dq.avgHccs * (effUpliftOf(p) / 100) * p.valuePerHcc * (dq.hccRealization / 100));
  const netNewPartOf = (p: HccPlan) => Math.round(membersOf(p) * (p.netNewEnabled ? p.netNewAvgConditions ?? 0 : 0) * p.valuePerHcc * (dq.hccRealization / 100));
  const planNetOf = (p: HccPlan) => recapturePartOf(p) + netNewPartOf(p);
  const patchPlan = (id: string, u: Partial<HccPlan>) => updateDq({ hccPlans: plans.map((pl) => (pl.id === id ? { ...pl, ...u } : pl)) });
  const hccAwait = gate("hccCapture");

  const hccCard = (
    <InlineDriverCard
      key="hcc"
      title="HCC capture"
      tag="Risk-based"
      subtitle="Chronic conditions a fuller note surfaces during the visit, each plan on its own economics."
      enabled={dq.hccEnabled}
      onToggle={() => updateDq({ hccEnabled: !dq.hccEnabled, hccExpanded: !dq.hccEnabled ? true : dq.hccExpanded })}
      testId="toggle-hcc"
      note={<>Enter each plan's lives to see its number. Change any coral figure and this reprices live, then updates the model on the right.</>}
    >
      {(
        <div>
          {plans.map((p) => (
            <div key={p.id} className="rounded-[14px] border border-[#E7E3DD] bg-white px-4 py-[15px] mb-2.5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <select
                  value={p.planType}
                  onChange={(e) => { const t = e.target.value as HccPlan["planType"]; patchPlan(p.id, { planType: t, valuePerHcc: hccValueFor(t) }); }}
                  className="font-abridge text-[17px] text-[#1A1A1A] bg-transparent border-0 outline-none cursor-pointer -ml-1"
                >
                  {[["medicare_advantage", "Medicare Advantage"], ["aca_marketplace", "ACA / Exchange"], ["medicaid_mco", "Medicaid managed care"], ["custom", "Custom plan"]].map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  {/* No lives yet: show a muted dash, not a "+$0" that reads broken. */}
                  {membersOf(p) > 0 ? (
                    <span className="font-abridge text-[19px] text-[#EA2C00] whitespace-nowrap">+{fmt$(planNetOf(p))}<span className="text-[11px] text-[#7C766F] font-sans"> / yr</span></span>
                  ) : (
                    <span className="font-abridge text-[19px] text-[#C9BDAD] whitespace-nowrap">&ndash;<span className="text-[11px] text-[#7C766F] font-sans"> / yr</span></span>
                  )}
                  {plans.length > 1 && (
                    <button type="button" onClick={() => removePlan(p.id)} className="w-[24px] h-[24px] rounded-[7px] border border-[#E7E3DD] bg-white text-[#7C766F] flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              <div className="flex items-end flex-wrap gap-x-[22px] gap-y-3">
                <EqNum cap="Lives" value={membersOf(p)} onChange={(v) => patchPlan(p.id, { panelSize: state.numberOfProviders > 0 ? Math.round(v / state.numberOfProviders) : v })} width={72} />
                <EqNum cap="HCCs / patient" value={dq.avgHccs} onChange={(v) => updateDq({ avgHccs: v })} decimal width={44} />
                <EqNum cap="Realized / HCC" value={p.valuePerHcc} onChange={(v) => patchPlan(p.id, { valuePerHcc: v })} prefix="$" width={72} />
                <div className="flex flex-col justify-end">
                  <div className="text-[9.5px] font-bold tracking-[0.04em] uppercase text-[#7C766F] mb-[6px]">Recapture rate</div>
                  <div className="inline-flex items-end gap-2">
                    <EqNum cap="" value={p.currentRecaptureRate} onChange={(v) => patchPlan(p.id, { currentRecaptureRate: v })} suffix="%" width={38} />
                    <span className="text-[#C4BCB0] pb-[3px]">→</span>
                    <EqNum cap="" value={p.currentRecaptureRate + upliftPtsOf(p)} onChange={(v) => patchPlan(p.id, { uplift: "custom", upliftCustomPp: Math.max(0, v - p.currentRecaptureRate) })} suffix="%" width={38} />
                  </div>
                </div>
              </div>
              <div className="mt-[13px] pt-3 border-t border-[#F4EEE7]">
                {p.netNewEnabled ? (
                  <div className="flex items-end justify-between gap-3 flex-wrap">
                    <EqNum cap="Net-new HCCs / patient · surfaced at the visit" value={p.netNewAvgConditions ?? 0} onChange={(v) => patchPlan(p.id, { netNewAvgConditions: v })} decimal width={44} />
                    <div className="text-[12px] text-[#7C766F]">
                      recapture <b className="font-abridge text-[#1A1A1A] text-[14px]">+{fmt$(recapturePartOf(p))}</b> <span className="text-[#C4BCB0]">+</span> net-new <b className="font-abridge text-[#1A1A1A] text-[14px]">+{fmt$(netNewPartOf(p))}</b>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => patchPlan(p.id, { netNewEnabled: true, netNewAvgConditions: p.netNewAvgConditions || 0.1 })} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#EA2C00]">
                    <Plus className="w-3.5 h-3.5" /> Include net-new HCCs a fuller note surfaces
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addPlan} className="mt-1 mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#EA2C00]"><Plus className="w-3.5 h-3.5" /> Add a risk plan</button>
          <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-[#E7E3DD] flex-wrap">
            <div className="flex items-end gap-2">
              <EqNum cap="kept after audit and attribution" value={dq.hccRealization} onChange={(v) => updateDq({ hccRealization: v })} suffix="%" width={40} />
            </div>
            <div className="text-[13px] text-[#565250]">Across {plans.length} {plans.length === 1 ? "plan" : "plans"}&nbsp; {totalPanel > 0 ? <b className="font-abridge text-[19px] text-[#EA2C00]">+{fmt$(hccValue)}</b> : <b className="font-abridge text-[19px] text-[#C9BDAD]">&ndash;</b>} / yr</div>
          </div>
        </div>
      )}
    </InlineDriverCard>
  );

  // ── Denials card (outpatient + ED) ──
  const denialsScenarios = denialsScenariosFor(isED, dq.denialsCustomPercent);
  const denialsPreventedPct = denialsScenarios[dq.denialsScenario] ?? 0;
  const rateAfter = dq.medNecessityDenialRate * (1 - denialsPreventedPct / 100);
  // Annual claims is user-entered (claims are not the same as encounters). It
  // shows the Abridge-enabled encounters as a starting default until overridden.
  const claimsBase = dq.denialsAnnualClaims > 0 ? dq.denialsAnnualClaims : eligibleEncounters;
  const deniedClaims = Math.round(claimsBase * (dq.medNecessityDenialRate / 100));
  const fewerDenied = Math.round(deniedClaims * (denialsPreventedPct / 100));
  const denialsValue = engine.denialPrevention ?? 0;

  const denialsAwait = gate("denialPrevention");
  const denialsCard = (
    <InlineDriverCard
      key="denials"
      title="Medical necessity denials"
      tag={isOP || isED ? "Fee-for-service & risk" : undefined}
      subtitle="Payers deny claims when the note does not clearly support medical necessity, so work you already did gets written off or sent back for rework. A complete note documents the necessity up front, so fewer of those claims are denied."
      enabled={dq.denialsEnabled}
      onToggle={() => updateDq({ denialsEnabled: !dq.denialsEnabled, denialsExpanded: !dq.denialsEnabled ? true : dq.denialsExpanded })}
      testId="toggle-denials"
      note={
        <>Annual claims defaults to your enabled encounters until you enter your own; change any coral figure and this reprices live. Some denied claims would be won back on appeal anyway, so we count only the <b className="text-[#B02200] not-italic">{dq.denialsRealization}%</b> you expect to keep off the denial list up front and leave the rest out.</>
      }
    >
      {denialsAwait ? (
        <EqAwaiting need={denialsAwait.need} />
      ) : (
        <EquationRow>
          <EqNum cap="claims / yr" value={claimsBase} onChange={(v) => updateDq({ denialsAnnualClaims: v })} />
          <EqOp>×</EqOp>
          <EqNum cap="denied today" value={dq.medNecessityDenialRate} onChange={(v) => updateDq({ medNecessityDenialRate: v })} suffix="%" decimal />
          <EqOp>×</EqOp>
          <EqNum cap="prevented" value={denialsPreventedPct} onChange={(v) => updateDq({ denialsScenario: "custom", denialsCustomPercent: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="per claim" value={dq.avgClaimValue} onChange={(v) => updateDq({ avgClaimValue: v })} prefix="$" />
          <EqOp>×</EqOp>
          <EqNum cap="realization" value={dq.denialsRealization} onChange={(v) => updateDq({ denialsRealization: v })} suffix="%" />
          <EqResult value={denialsValue} />
        </EquationRow>
      )}
    </InlineDriverCard>
  );

  // ── Inpatient: DRG accuracy (the query funnel) + Obs Defense ──
  const drgValue = engine.drgAccuracy ?? 0;
  const drgAwait = gate("drgAccuracy");
  const drgReviewed = eligibleEncounters * (dq.ipDrgCdiReviewRate / 100);
  const drgQueried = drgReviewed * (dq.ipDrgQueryRate / 100);
  const drgResponds = drgQueried * (dq.ipDrgResponseRate / 100);
  const drgChanged = drgResponds * (dq.ipDrgChangeRate / 100);
  const drgLost = Math.max(0, drgQueried - drgChanged);
  const drgCaptured = drgLost * (dq.ipDrgUpfrontCapture / 100);
  const drgWeightAdded = drgCaptured * dq.ipDrgWeightGain;
  const drgCard = (
    <InlineDriverCard
      key="drg"
      title="DRG accuracy · the query funnel"
      subtitle="DRG revenue moves through the CDI query funnel, and that funnel is your CDI team's work, with or without Abridge. A query is proof the record had a gap; Abridge's value is the gaps your team flags but loses."
      enabled={dq.ipDrgEnabled}
      onToggle={() => updateDq({ ipDrgEnabled: !dq.ipDrgEnabled, ipDrgExpanded: !dq.ipDrgEnabled ? true : dq.ipDrgExpanded })}
      testId="toggle-drg"
      note={
        <>Every rate carries from your CDI reports. The one judgment lever is the <b className="text-[#B02200] not-italic">{dq.ipDrgUpfrontCapture}%</b> durable share Abridge captures, what it lands up front and what holds up under audit, folded into a single number. No stacked haircuts.</>
      }
    >
      {drgAwait ? (
        <EqAwaiting need={drgAwait.need} />
      ) : (
        <>
          <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#A79B8B] mb-3">What the CDI funnel catches today</div>
          <EquationRow>
            <EqCarried cap="discharges">{fmtN(eligibleEncounters)}</EqCarried>
            <EqOp>×</EqOp>
            <EqNum cap="reviewed" value={dq.ipDrgCdiReviewRate} onChange={(v) => updateDq({ ipDrgCdiReviewRate: v })} suffix="%" />
            <EqOp>×</EqOp>
            <EqNum cap="query" value={dq.ipDrgQueryRate} onChange={(v) => updateDq({ ipDrgQueryRate: v })} suffix="%" />
            <EqOp>×</EqOp>
            <EqNum cap="responds" value={dq.ipDrgResponseRate} onChange={(v) => updateDq({ ipDrgResponseRate: v })} suffix="%" />
            <EqOp>×</EqOp>
            <EqNum cap="changes DRG" value={dq.ipDrgChangeRate} onChange={(v) => updateDq({ ipDrgChangeRate: v })} suffix="%" />
            <div className="basis-full w-full flex items-baseline gap-2.5 pt-3 mt-1 border-t border-[#F3E9E1]">
              <span className="font-abridge text-[19px] text-[#B9AA97] leading-none">=</span>
              <span className="font-abridge text-[24px] text-[#5E534A] leading-none">{fmtN(drgChanged)}</span>
              <span className="text-[12px] text-[#7C766F]">corrected today · your CDI team's, not Abridge's</span>
            </div>
          </EquationRow>
          <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#A79B8B] mt-6 mb-3">What Abridge adds, on top</div>
          <EquationRow>
            <EqCarried cap="flagged but lost">{fmtN(drgLost)}</EqCarried>
            <EqOp>×</EqOp>
            <EqNum cap="Abridge captures" value={dq.ipDrgUpfrontCapture} onChange={(v) => updateDq({ ipDrgUpfrontCapture: v })} suffix="%" />
            <EqOp>×</EqOp>
            <EqNum cap="weight gain" value={dq.ipDrgWeightGain} onChange={(v) => updateDq({ ipDrgWeightGain: v })} decimal />
            <EqOp>×</EqOp>
            <EqNum cap="per weight" value={dq.ipDrgBaseRate} onChange={(v) => updateDq({ ipDrgBaseRate: v })} prefix="$" />
            <EqResult value={drgValue} />
          </EquationRow>
        </>
      )}
    </InlineDriverCard>
  );

  const obsValue = engine.obsDefense ?? 0;
  const obsAwait = gate("obsDefense");
  // Split the seven-factor denials chain into three readable steps (<=3 factors
  // each) with neutral intermediates, so no row wraps and each keeps one baseline.
  const obsAtStake = Math.round(state.annualEncounters * (dq.ipObsDenialRate / 100) * dq.ipObsAllowedPerCase);
  const obsDenied = Math.round(state.annualEncounters * (dq.ipObsDenialRate / 100));
  const obsAfterNotRec = Math.round(obsAtStake * (dq.ipObsNotRecoveredPct / 100));
  const obsDocDriven = Math.round(obsAtStake * (dq.ipObsNotRecoveredPct / 100) * (dq.ipObsDocMaterialPct / 100));
  const obsAfterOpp = Math.round(obsDocDriven * (dq.ipObsAbridgeOpportunityPct / 100));
  const obsCard = (
    <InlineDriverCard
      key="obs"
      title="Status / Medical Necessity Denials"
      subtitle="A share of admissions draw a status or medical-necessity denial. The chain narrows from every admission to the durable dollar: what is never recovered, where documentation is the material factor, and where Abridge is in position to move it."
      enabled={dq.ipObsDefenseEnabled}
      onToggle={() =>
        updateDq({ ipObsDefenseEnabled: !dq.ipObsDefenseEnabled, ipObsDefenseExpanded: !dq.ipObsDefenseEnabled ? true : dq.ipObsDefenseExpanded })
      }
      testId="toggle-obs"
      note={
        <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live. Based on total admissions, not just the documented share.</>
      }
    >
      {obsAwait ? (
        <EqAwaiting need={obsAwait.need} />
      ) : (
        <EquationRow>
          <EqCarried cap="admissions">{fmtN(state.annualEncounters)}</EqCarried>
          <EqOp>×</EqOp>
          <EqNum cap="denied" value={dq.ipObsDenialRate} onChange={(v) => updateDq({ ipObsDenialRate: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="allowed / case" value={dq.ipObsAllowedPerCase} onChange={(v) => updateDq({ ipObsAllowedPerCase: v })} prefix="$" />
          <EqOp>×</EqOp>
          <EqNum cap="not recovered" value={dq.ipObsNotRecoveredPct} onChange={(v) => updateDq({ ipObsNotRecoveredPct: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="doc is material" value={dq.ipObsDocMaterialPct} onChange={(v) => updateDq({ ipObsDocMaterialPct: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="Abridge opportunity" value={dq.ipObsAbridgeOpportunityPct} onChange={(v) => updateDq({ ipObsAbridgeOpportunityPct: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="Abridge impact" value={dq.ipObsAbridgeImpactPct} onChange={(v) => updateDq({ ipObsAbridgeImpactPct: v })} suffix="%" />
          <EqResult value={obsValue} />
        </EquationRow>
      )}
    </InlineDriverCard>
  );

  // ─── Inpatient V2 driver ledger ───
  // Revenue is where inpatient's two counted drivers live: Case Mix Index (the
  // CDI query funnel) and Status / Medical Necessity Denials. Both lift their
  // equations verbatim from the cards above so the math never drifts.
  if (isIP) {
    const ledger = buildInpatientLedger(state, totalHoursSaved, "Revenue");
    const rows: LedgerRow[] = [
      {
        id: "drgAccuracy",
        label: "Case Mix Index",
        kind: "counted",
        mechanism:
          "DRG revenue moves through the CDI query funnel, and that funnel is your CDI team's work, with or without Abridge. A query is proof the record had a gap; Abridge's value is the gaps your team flags but loses.",
        enabled: dq.ipDrgEnabled,
        onToggle: () => updateDq({ ipDrgEnabled: !dq.ipDrgEnabled, ipDrgExpanded: !dq.ipDrgEnabled ? true : dq.ipDrgExpanded }),
        expanded: dq.ipDrgExpanded,
        onToggleExpand: () => updateDq({ ipDrgExpanded: !dq.ipDrgExpanded }),
        amount: drgValue,
        awaiting: drgAwait?.need,
        levers: (
          <MathCascade
            steps={[
              { label: "Discharges", running: fmtN(eligibleEncounters) },
              { label: "Reviewed by CDI", factor: { value: dq.ipDrgCdiReviewRate, onChange: (v) => updateDq({ ipDrgCdiReviewRate: v }), suffix: "%" }, running: fmtN(drgReviewed) },
              { label: "Get a query", factor: { value: dq.ipDrgQueryRate, onChange: (v) => updateDq({ ipDrgQueryRate: v }), suffix: "%" }, running: fmtN(drgQueried) },
              { label: "Physician responds", factor: { value: dq.ipDrgResponseRate, onChange: (v) => updateDq({ ipDrgResponseRate: v }), suffix: "%" }, running: fmtN(drgResponds) },
              { label: "Changes the DRG", factor: { value: dq.ipDrgChangeRate, onChange: (v) => updateDq({ ipDrgChangeRate: v }), suffix: "%" }, running: fmtN(drgChanged), note: "corrected by your CDI team" },
              { label: "Flagged but lost", running: fmtN(drgLost), note: `${fmtN(drgQueried)} queried − ${fmtN(drgChanged)} corrected · Abridge's opportunity`, pivot: true },
              { label: "Captured by Abridge", factor: { value: dq.ipDrgUpfrontCapture, onChange: (v) => updateDq({ ipDrgUpfrontCapture: v }), suffix: "%" }, running: fmtN(drgCaptured) },
              { label: "DRG weight gained per case", factor: { value: dq.ipDrgWeightGain, onChange: (v) => updateDq({ ipDrgWeightGain: v }), decimal: true }, running: `${Math.round(drgWeightAdded)} weight` },
              { label: "Paid per weight", factor: { value: dq.ipDrgBaseRate, onChange: (v) => updateDq({ ipDrgBaseRate: v }), prefix: "$" }, running: fmt$(Math.round(drgValue / 1000) * 1000), final: true },
            ]}
          />
        ),
      },
      {
        id: "obsDefense",
        label: "Status / Medical Necessity Denials",
        kind: "counted",
        mechanism:
          "A share of admissions draw a status or medical-necessity denial. The chain narrows from every admission to the durable dollar: what is never recovered, where documentation is the material factor, and where Abridge is in position to move it.",
        enabled: dq.ipObsDefenseEnabled,
        onToggle: () =>
          updateDq({ ipObsDefenseEnabled: !dq.ipObsDefenseEnabled, ipObsDefenseExpanded: !dq.ipObsDefenseEnabled ? true : dq.ipObsDefenseExpanded }),
        expanded: dq.ipObsDefenseExpanded,
        onToggleExpand: () => updateDq({ ipObsDefenseExpanded: !dq.ipObsDefenseExpanded }),
        amount: obsValue,
        awaiting: obsAwait?.need,
        levers: (
          <MathCascade
            steps={[
              { label: "Admissions", running: fmtN(state.annualEncounters) },
              { label: "Denied by payer", factor: { value: dq.ipObsDenialRate, onChange: (v) => updateDq({ ipObsDenialRate: v }), suffix: "%" }, running: fmtN(obsDenied) },
              { label: "Allowed per case", factor: { value: dq.ipObsAllowedPerCase, onChange: (v) => updateDq({ ipObsAllowedPerCase: v }), prefix: "$" }, running: fmt$(obsAtStake) },
              { label: "Never recovered", factor: { value: dq.ipObsNotRecoveredPct, onChange: (v) => updateDq({ ipObsNotRecoveredPct: v }), suffix: "%" }, running: fmt$(obsAfterNotRec) },
              { label: "Documentation is the material factor", factor: { value: dq.ipObsDocMaterialPct, onChange: (v) => updateDq({ ipObsDocMaterialPct: v }), suffix: "%" }, running: fmt$(obsDocDriven) },
              { label: "Abridge is in the workflow", factor: { value: dq.ipObsAbridgeOpportunityPct, onChange: (v) => updateDq({ ipObsAbridgeOpportunityPct: v }), suffix: "%" }, running: fmt$(obsAfterOpp) },
              { label: "Abridge moves it", factor: { value: dq.ipObsAbridgeImpactPct, onChange: (v) => updateDq({ ipObsAbridgeImpactPct: v }), suffix: "%" }, running: fmt$(obsValue), final: true },
            ]}
          />
        ),
      },
    ];
    return (
      <DriverLedger
        eyebrow="Value Model · Step 6 of 9 · Revenue"
        title="How does documentation protect what you're already owed?"
        intro="Turn on the drivers that apply. Each one models against your numbers and adds to the ledger."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Revenue"
        stepIndex={6}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Nursing V2 driver ledger ───
  // Revenue is a proof-only layer for nursing: the dollars nursing documentation
  // touches are claimed once, on the physician side, so nothing is counted here.
  if (isNursing) {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Revenue", "nursing");
    const rows: LedgerRow[] = [
      {
        id: "nursingCdiResponse",
        label: "CDI Query Response",
        kind: "tracked",
        mechanism:
          "Strong nursing documentation corroborates the physician record CDI depends on to close queries. The dollar is claimed on the physician side, so here it is tracked as a metric.",
        signals: ["CDI queries close faster", "Nursing record corroborates the clinical picture"],
      },
      {
        id: "nursingDocCompletion",
        label: "Documentation Completion",
        kind: "tracked",
        mechanism: "Flowsheet entries complete and on time.",
        signals: ["Flowsheet completion rises", "Charting stays current through the shift"],
      },
    ];
    return (
      <DriverLedger
        eyebrow="Value Model · Step 6 of 9 · Revenue"
        title="Where does nursing documentation show up in revenue?"
        intro="Nursing documentation supports the revenue cycle rather than driving it directly. The dollars it touches are claimed once, on the physician side, so nothing is counted here. We track the proof instead."
        sectionLabel="The proof · tracked, not counted"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Revenue"
        stepIndex={6}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Outpatient V2 driver ledger ───
  // Payment-model fork (FFS / Risk / Both) gates the row set exactly as the
  // engine does: wRVU when paymentModel !== "risk", HCC when !== "ffs", denials
  // always. Cascade intermediates are computed inline from `dq` so each final
  // running foots to the engine value; the HCC row is the per-plan repeater
  // (not a cascade), lifted verbatim from the legacy card.
  if (isOP) {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Revenue", "outpatient");

    // wRVU cascade intermediates (foot to engine wrvuValue).
    const wrvuCurrentTotal = eligibleEncounters * dq.currentWrvu;
    const wrvuAddedWrvus = eligibleEncounters * dq.currentWrvu * (wrvuLiftPct / 100);
    const wrvuGross = wrvuAddedWrvus * dq.conversionFactor;
    const wrvuRow: LedgerRow = {
      id: "wrvu",
      label: "wRVU Capture",
      kind: "counted",
      mechanism:
        "When a note understates the visit, the E/M level codes down and you bill below the work you did. A complete note lets the level match the visit, so you capture what you already earned.",
      enabled: dq.wrvuEnabled,
      onToggle: () => updateDq({ wrvuEnabled: !dq.wrvuEnabled, wrvuExpanded: !dq.wrvuEnabled ? true : dq.wrvuExpanded }),
      expanded: dq.wrvuExpanded,
      onToggleExpand: () => updateDq({ wrvuExpanded: !dq.wrvuExpanded }),
      amount: wrvuValue > 0 ? wrvuValue : undefined,
      awaiting: wrvuAwait?.need,
      levers: (
        <MathCascade
          steps={[
            { label: "Documented visits", running: fmtN(eligibleEncounters) },
            { label: "Current wRVU per visit", factor: { value: dq.currentWrvu, onChange: (v) => updateDq({ currentWrvu: v }), decimal: true }, running: `${fmtNd(wrvuCurrentTotal)} wRVUs` },
            { label: "Lift Abridge documents", factor: { value: wrvuLiftPct, onChange: (v) => updateDq({ wrvuScenario: "custom", wrvuCustomPercent: v }), suffix: "%" }, running: `${fmtNd(wrvuAddedWrvus)} wRVUs` },
            { label: "Conversion factor", factor: { value: dq.conversionFactor, onChange: (v) => updateDq({ conversionFactor: v }), prefix: "$", decimal: true }, running: fmt$(wrvuGross) },
            { label: "Attribution", factor: { value: dq.wrvuRealization, onChange: (v) => updateDq({ wrvuRealization: v }), suffix: "%" }, running: fmt$(wrvuValue), final: true },
          ]}
        />
      ),
    };

    // HCC row — the per-plan repeater lifted verbatim from the legacy card (NOT
    // a cascade). The panel (Lives) input lives inside it, so we never gate the
    // levers behind an awaiting message (that would hide the only place to enter
    // it); we withhold the header dollar until a panel is set.
    const hccRow: LedgerRow = {
      id: "hccCapture",
      label: "HCC Capture",
      kind: "counted",
      mechanism: "Chronic conditions a fuller note surfaces during the visit, each plan on its own economics.",
      enabled: dq.hccEnabled,
      onToggle: () => updateDq({ hccEnabled: !dq.hccEnabled, hccExpanded: !dq.hccEnabled ? true : dq.hccExpanded }),
      expanded: dq.hccExpanded,
      onToggleExpand: () => updateDq({ hccExpanded: !dq.hccExpanded }),
      amount: hccValue > 0 ? hccValue : undefined,
      levers: (
        <div>
          {plans.map((p) => (
            <div key={p.id} className="rounded-[14px] border border-[#E7E3DD] bg-white px-4 py-[15px] mb-2.5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <select
                  value={p.planType}
                  onChange={(e) => { const t = e.target.value as HccPlan["planType"]; patchPlan(p.id, { planType: t, valuePerHcc: hccValueFor(t) }); }}
                  className="font-abridge text-[17px] text-[#1A1A1A] bg-transparent border-0 outline-none cursor-pointer -ml-1"
                >
                  {[["medicare_advantage", "Medicare Advantage"], ["aca_marketplace", "ACA / Exchange"], ["medicaid_mco", "Medicaid managed care"], ["custom", "Custom plan"]].map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  {membersOf(p) > 0 ? (
                    <span className="font-abridge text-[19px] text-[#EA2C00] whitespace-nowrap">+{fmt$(planNetOf(p))}<span className="text-[11px] text-[#7C766F] font-sans"> / yr</span></span>
                  ) : (
                    <span className="font-abridge text-[19px] text-[#C9BDAD] whitespace-nowrap">&ndash;<span className="text-[11px] text-[#7C766F] font-sans"> / yr</span></span>
                  )}
                  {plans.length > 1 && (
                    <button type="button" onClick={() => removePlan(p.id)} className="w-[24px] h-[24px] rounded-[7px] border border-[#E7E3DD] bg-white text-[#7C766F] flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              <div className="flex items-end flex-wrap gap-x-[22px] gap-y-3">
                <EqNum cap="Lives" value={membersOf(p)} onChange={(v) => patchPlan(p.id, { panelSize: state.numberOfProviders > 0 ? Math.round(v / state.numberOfProviders) : v })} width={72} />
                <EqNum cap="HCCs / patient" value={dq.avgHccs} onChange={(v) => updateDq({ avgHccs: v })} decimal width={44} />
                <EqNum cap="Realized / HCC" value={p.valuePerHcc} onChange={(v) => patchPlan(p.id, { valuePerHcc: v })} prefix="$" width={72} />
                <div className="flex flex-col justify-end">
                  <div className="text-[9.5px] font-bold tracking-[0.04em] uppercase text-[#7C766F] mb-[6px]">Recapture rate</div>
                  <div className="inline-flex items-end gap-2">
                    <EqNum cap="" value={p.currentRecaptureRate} onChange={(v) => patchPlan(p.id, { currentRecaptureRate: v })} suffix="%" width={38} />
                    <span className="text-[#C4BCB0] pb-[3px]">→</span>
                    <EqNum cap="" value={p.currentRecaptureRate + upliftPtsOf(p)} onChange={(v) => patchPlan(p.id, { uplift: "custom", upliftCustomPp: Math.max(0, v - p.currentRecaptureRate) })} suffix="%" width={38} />
                  </div>
                </div>
              </div>
              <div className="mt-[13px] pt-3 border-t border-[#F4EEE7]">
                {p.netNewEnabled ? (
                  <div className="flex items-end justify-between gap-3 flex-wrap">
                    <EqNum cap="Net-new HCCs / patient · surfaced at the visit" value={p.netNewAvgConditions ?? 0} onChange={(v) => patchPlan(p.id, { netNewAvgConditions: v })} decimal width={44} />
                    <div className="text-[12px] text-[#7C766F]">
                      recapture <b className="font-abridge text-[#1A1A1A] text-[14px]">+{fmt$(recapturePartOf(p))}</b> <span className="text-[#C4BCB0]">+</span> net-new <b className="font-abridge text-[#1A1A1A] text-[14px]">+{fmt$(netNewPartOf(p))}</b>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => patchPlan(p.id, { netNewEnabled: true, netNewAvgConditions: p.netNewAvgConditions || 0.1 })} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#EA2C00]">
                    <Plus className="w-3.5 h-3.5" /> Include net-new HCCs a fuller note surfaces
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addPlan} className="mt-1 mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#EA2C00]"><Plus className="w-3.5 h-3.5" /> Add a risk plan</button>
          <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-[#E7E3DD] flex-wrap">
            <div className="flex items-end gap-2">
              <EqNum cap="kept after audit and attribution" value={dq.hccRealization} onChange={(v) => updateDq({ hccRealization: v })} suffix="%" width={40} />
            </div>
            <div className="text-[13px] text-[#565250]">Across {plans.length} {plans.length === 1 ? "plan" : "plans"}&nbsp; {totalPanel > 0 ? <b className="font-abridge text-[19px] text-[#EA2C00]">+{fmt$(hccValue)}</b> : <b className="font-abridge text-[19px] text-[#C9BDAD]">&ndash;</b>} / yr</div>
          </div>
        </div>
      ),
    };

    // Denials cascade intermediates (foot to engine denialsValue).
    const denialsDenied = claimsBase * (dq.medNecessityDenialRate / 100);
    const denialsFewer = denialsDenied * (denialsPreventedPct / 100);
    const denialsGross = denialsFewer * dq.avgClaimValue;
    const denialsRow: LedgerRow = {
      id: "denialPrevention",
      label: "Medical Necessity Denials",
      kind: "counted",
      mechanism:
        "Payers deny claims when the note does not clearly support medical necessity, so work you already did gets written off or sent back. A complete note documents the necessity up front, so fewer of those claims are denied.",
      enabled: dq.denialsEnabled,
      onToggle: () => updateDq({ denialsEnabled: !dq.denialsEnabled, denialsExpanded: !dq.denialsEnabled ? true : dq.denialsExpanded }),
      expanded: dq.denialsExpanded,
      onToggleExpand: () => updateDq({ denialsExpanded: !dq.denialsExpanded }),
      amount: denialsValue > 0 ? denialsValue : undefined,
      awaiting: denialsAwait?.need,
      levers: (
        <MathCascade
          steps={[
            { label: "Claims a year", factor: { value: claimsBase, onChange: (v) => updateDq({ denialsAnnualClaims: v }) }, running: fmtN(claimsBase) },
            { label: "Medical-necessity denial rate", factor: { value: dq.medNecessityDenialRate, onChange: (v) => updateDq({ medNecessityDenialRate: v }), suffix: "%", decimal: true }, running: `${fmtN(denialsDenied)} denials` },
            { label: "Abridge reduces", factor: { value: denialsPreventedPct, onChange: (v) => updateDq({ denialsScenario: "custom", denialsCustomPercent: v }), suffix: "%" }, running: `${fmtN(denialsFewer)} fewer` },
            { label: "Allowed per claim", factor: { value: dq.avgClaimValue, onChange: (v) => updateDq({ avgClaimValue: v }), prefix: "$" }, running: fmt$(denialsGross) },
            { label: "Realization", factor: { value: dq.denialsRealization, onChange: (v) => updateDq({ denialsRealization: v }), suffix: "%" }, running: fmt$(denialsValue), final: true },
          ]}
        />
      ),
    };

    const rows: LedgerRow[] = [];
    if (state.paymentModel !== "risk") rows.push(wrvuRow);
    if (state.paymentModel !== "ffs") rows.push(hccRow);
    rows.push(denialsRow);

    const paymentControl = (
      <div>
        <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-3">How are you paid?</div>
        <div className="flex w-full sm:inline-flex sm:w-auto gap-[3px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-[13px] p-1">
          {PAY_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updatePaymentModel(key)}
              data-testid={`button-payment-model-${key}`}
              className={`flex-1 sm:flex-none whitespace-nowrap text-[12.5px] sm:text-[14px] font-bold rounded-[9px] px-2 sm:px-7 py-[11px] transition-colors ${
                state.paymentModel === key ? "bg-white text-[#EA2C00] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#565250]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-[#7C766F] mt-[11px] leading-[1.5] max-w-[640px]">
          <b className="text-[#565250]">{PAY_LABELS.find((p) => p.key === state.paymentModel)?.label}.</b>{" "}
          {state.paymentModel === "ffs"
            ? "Modeling fee-for-service visits only. Switch to Risk-based or Both to add HCC capture."
            : state.paymentModel === "risk"
            ? "Modeling risk-based lives only. Switch to Fee-for-service or Both to add wRVU capture."
            : "Fee-for-service visits and risk lives are kept separate, so no patient is counted twice."}
        </p>
      </div>
    );

    return (
      <DriverLedger
        eyebrow="Value Model · Step 6 of 9 · Revenue"
        title="How does documentation turn into revenue?"
        intro="The same complete note earns money differently depending on how you're paid. Turn on the drivers that apply; each models against your numbers and adds to the ledger."
        sectionLabel="The drivers · turn on what applies"
        headerControl={paymentControl}
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Revenue"
        stepIndex={6}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── ED V2 driver ledger ───
  // Two counted drivers, no payment fork: E&M Level Accuracy (engine key
  // `edEmLevel`) and Medical Necessity Denials. Cascade intermediates are
  // computed inline from `dq` so each final running foots to the engine value.
  if (isED) {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Revenue", "ed");

    // E&M cascade intermediates (foot to engine edEmLevel / wrvuValue).
    const emCurrentTotal = eligibleEncounters * dq.currentWrvu;
    const emAddedWrvus = eligibleEncounters * dq.currentWrvu * (wrvuLiftPct / 100);
    const emGross = emAddedWrvus * dq.conversionFactor;
    const emRow: LedgerRow = {
      id: "edEmLevel",
      label: "E&M Level Accuracy",
      kind: "counted",
      mechanism:
        "The ED note is the source document for the level of service. When it captures the full complexity, the E/M level holds up instead of coding down.",
      enabled: dq.wrvuEnabled,
      onToggle: () => updateDq({ wrvuEnabled: !dq.wrvuEnabled, wrvuExpanded: !dq.wrvuEnabled ? true : dq.wrvuExpanded }),
      expanded: dq.wrvuExpanded,
      onToggleExpand: () => updateDq({ wrvuExpanded: !dq.wrvuExpanded }),
      amount: wrvuValue > 0 ? wrvuValue : undefined,
      awaiting: wrvuAwait?.need,
      levers: (
        <MathCascade
          steps={[
            { label: "Documented ED visits", running: fmtN(eligibleEncounters) },
            { label: "Current wRVU per visit", factor: { value: dq.currentWrvu, onChange: (v) => updateDq({ currentWrvu: v }), decimal: true }, running: `${fmtNd(emCurrentTotal)} wRVUs` },
            { label: "Lift Abridge documents", factor: { value: wrvuLiftPct, onChange: (v) => updateDq({ wrvuScenario: "custom", wrvuCustomPercent: v }), suffix: "%" }, running: `${fmtNd(emAddedWrvus)} wRVUs` },
            { label: "Conversion factor", factor: { value: dq.conversionFactor, onChange: (v) => updateDq({ conversionFactor: v }), prefix: "$", decimal: true }, running: fmt$(emGross) },
            { label: "Attribution", factor: { value: dq.wrvuRealization, onChange: (v) => updateDq({ wrvuRealization: v }), suffix: "%" }, running: fmt$(wrvuValue), final: true },
          ]}
        />
      ),
    };

    // Denials cascade intermediates (foot to engine denialsValue).
    const denialsDenied = claimsBase * (dq.medNecessityDenialRate / 100);
    const denialsFewer = denialsDenied * (denialsPreventedPct / 100);
    const denialsGross = denialsFewer * dq.avgClaimValue;
    const denialsRow: LedgerRow = {
      id: "denialPrevention",
      label: "Medical Necessity Denials",
      kind: "counted",
      mechanism:
        "Payers deny claims when the note does not clearly support medical necessity, so work you already did gets written off or sent back. A complete note documents the necessity up front, so fewer of those claims are denied.",
      enabled: dq.denialsEnabled,
      onToggle: () => updateDq({ denialsEnabled: !dq.denialsEnabled, denialsExpanded: !dq.denialsEnabled ? true : dq.denialsExpanded }),
      expanded: dq.denialsExpanded,
      onToggleExpand: () => updateDq({ denialsExpanded: !dq.denialsExpanded }),
      amount: denialsValue > 0 ? denialsValue : undefined,
      awaiting: denialsAwait?.need,
      levers: (
        <MathCascade
          steps={[
            { label: "Claims a year", factor: { value: claimsBase, onChange: (v) => updateDq({ denialsAnnualClaims: v }) }, running: fmtN(claimsBase) },
            { label: "Medical-necessity denial rate", factor: { value: dq.medNecessityDenialRate, onChange: (v) => updateDq({ medNecessityDenialRate: v }), suffix: "%", decimal: true }, running: `${fmtN(denialsDenied)} denials` },
            { label: "Abridge reduces", factor: { value: denialsPreventedPct, onChange: (v) => updateDq({ denialsScenario: "custom", denialsCustomPercent: v }), suffix: "%" }, running: `${fmtN(denialsFewer)} fewer` },
            { label: "Allowed per claim", factor: { value: dq.avgClaimValue, onChange: (v) => updateDq({ avgClaimValue: v }), prefix: "$" }, running: fmt$(denialsGross) },
            { label: "Realization", factor: { value: dq.denialsRealization, onChange: (v) => updateDq({ denialsRealization: v }), suffix: "%" }, running: fmt$(denialsValue), final: true },
          ]}
        />
      ),
    };

    const rows: LedgerRow[] = [emRow, denialsRow];

    return (
      <DriverLedger
        eyebrow="Value Model · Step 6 of 9 · Revenue"
        title="How does documentation turn into revenue?"
        intro="The same complete note supports accurate E/M coding and fewer denied claims. Turn on the drivers that apply; each models against your numbers and adds to the ledger."
        sectionLabel="The drivers · turn on what applies"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Revenue"
        stepIndex={6}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ── Which financial cards are visible on screen, for the section subtotal ──
  let visibleCards: { id: string; enabled: boolean; value: number; node: React.ReactNode }[] = [];
  if (isOP) {
    if (state.paymentModel !== "risk") visibleCards.push({ id: "wrvu", enabled: dq.wrvuEnabled, value: wrvuValue, node: wrvuCard });
    if (state.paymentModel !== "ffs") visibleCards.push({ id: "hcc", enabled: dq.hccEnabled, value: hccValue, node: hccCard });
  } else if (isED) {
    visibleCards.push({ id: "wrvu", enabled: dq.wrvuEnabled, value: wrvuValue, node: wrvuCard });
  } else if (isIP) {
    visibleCards.push({ id: "drg", enabled: dq.ipDrgEnabled, value: drgValue, node: drgCard });
    visibleCards.push({ id: "obs", enabled: dq.ipObsDefenseEnabled, value: obsValue, node: obsCard });
  }
  const hasDenials = isOP || isED;
  if (hasDenials) visibleCards.push({ id: "denials", enabled: dq.denialsEnabled, value: denialsValue, node: denialsCard });

  const countedTotal = visibleCards.filter((c) => c.enabled).reduce((s, c) => s + c.value, 0);
  const onCount = visibleCards.filter((c) => c.enabled).length;

  const heading =
    isED
      ? "How does documentation turn into revenue?"
      : isIP
      ? "How does documentation protect what you're already owed?"
      : isNursing
      ? "Where does nursing documentation show up in revenue?"
      : "How does documentation turn into revenue?";
  const sub =
    isED
      ? "The same complete note supports accurate E/M coding and fewer denied claims."
      : isIP
      ? "The same complete note preserves DRG weight and defends the admission status you billed."
      : isNursing
      ? "Nursing documentation supports the revenue cycle rather than driving it directly. No dollar is counted on this screen."
      : "The same complete note earns money differently depending on how you're paid.";

  return (
    <EditorialShell>
      <EditorialHeader stepName="Revenue" stepIndex={6} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 6 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[680px]">{heading}</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[640px] leading-[1.5]">{sub}</p>

        {isOP && (
          <>
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mt-[26px] mb-3">How are you paid?</div>
            <div className="flex w-full sm:inline-flex sm:w-auto gap-[3px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-[13px] p-1">
              {PAY_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updatePaymentModel(key)}
                  data-testid={`button-payment-model-${key}`}
                  className={`flex-1 sm:flex-none whitespace-nowrap text-[12.5px] sm:text-[14px] font-bold rounded-[9px] px-2 sm:px-7 py-[11px] transition-colors ${
                    state.paymentModel === key ? "bg-white text-[#EA2C00] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#565250]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-[#7C766F] mt-[11px] leading-[1.5] max-w-[640px]">
              <b className="text-[#565250]">{PAY_LABELS.find((p) => p.key === state.paymentModel)?.label}.</b>{" "}
              {state.paymentModel === "ffs"
                ? "Modeling fee-for-service visits only. Switch to Risk-based or Both to add HCC capture."
                : state.paymentModel === "risk"
                ? "Modeling risk-based lives only. Switch to Fee-for-service or Both to add wRVU capture."
                : "Fee-for-service visits and risk lives are kept separate, so no patient is counted twice."}
            </p>
          </>
        )}

        <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-x-10 gap-y-8 items-start">
        <div className="min-w-0">
        {!isNursing && (
          <SectionLabel
            tag="counts when it's on"
            right={
              <>
                Counted on this screen&nbsp; <b className="font-abridge text-[15px] text-[#1A1A1A]">{fmt$(countedTotal)}</b> / yr &nbsp;·&nbsp;{" "}
                <span className="text-[#7C766F]">{onCount} of {visibleCards.length} on</span>
              </>
            }
          >
            The value
          </SectionLabel>
        )}

        {isOP && state.paymentModel !== "risk" && wrvuCard}
        {isOP && state.paymentModel !== "ffs" && hccCard}
        {isED && wrvuCard}
        {isIP && drgCard}
        {isIP && obsCard}

        {hasDenials && isOP && <DividerLabel tag="always relevant">Regardless of how you're paid</DividerLabel>}
        {hasDenials && denialsCard}

        {watchDomainFor(setting, "Revenue") ? (
          <SignalWatch domain={watchDomainFor(setting, "Revenue")!} />
        ) : (
          signalDrivers.length > 0 && (
            <OutcomesTier
              title={isOP ? "The clean revenue it protects" : isIP ? "The revenue it protects" : "What this protects"}
              items={signalDrivers.map((d) => ({ label: d.label, example: d.tagline }))}
              note={
                <>
                  <b className="text-[#1A1A1A]">These signals lead the dollars above.</b> We keep them as signals so nothing is
                  counted twice.
                </>
              }
            />
          )
        )}

        {isNursing && (
          <div className="border border-dashed border-[#D8CFC0] rounded-[18px] bg-[#FAF7F2] px-6 py-5 mt-8">
            <div className="flex gap-3">
              <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00] flex-shrink-0 mt-[5px]" />
              <div className="text-[13.5px] text-[#565250] leading-[1.5]">
                <b className="text-[#1A1A1A]">$0 counted here, on purpose.</b> Nursing documentation corroborates CDI queries and
                clears the documentation-completion backlog that holds claims in DNFB, but the dollars land on the physician
                side of the record. Nothing here is double-counted against Revenue.
              </div>
            </div>
          </div>
        )}
        </div>
        <div className="flex flex-col gap-5">
          <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Revenue" />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onNext}
              data-testid="button-ed-revenue-continue"
              className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)]"
            >
              Continue →
            </button>
          </div>
        </div>
        </div>
      </div>
    </EditorialShell>
  );
}

function fmtNd(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}
