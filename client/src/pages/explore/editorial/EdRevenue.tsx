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
import { SignalWatch } from "./SignalWatch";
import { watchDomainFor } from "@/lib/exploreWatchSignals";
import ValueRail from "./ValueRail";
import { InlineDriverCard, EqNum, EqCarried, EqOp, EqResult, EquationRow, EqAwaiting } from "./InlineEquation";
import { X, Plus } from "lucide-react";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";

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
          <EqCarried cap={isED ? "ED encounters" : "FFS visits"}>{fmtN(eligibleEncounters)}</EqCarried>
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
      valuePerHcc: 1000,
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
                  onChange={(e) => patchPlan(p.id, { planType: e.target.value as HccPlan["planType"] })}
                  className="font-abridge text-[17px] text-[#1A1A1A] bg-transparent border-0 outline-none cursor-pointer -ml-1"
                >
                  {[["medicare_advantage", "Medicare Advantage"], ["aca_marketplace", "ACA / Exchange"], ["medicaid_mco", "Medicaid managed care"], ["custom", "Custom plan"]].map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
                <div className="flex items-center gap-3">
                  <span className="font-abridge text-[19px] text-[#EA2C00] whitespace-nowrap">+{fmt$(planNetOf(p))}<span className="text-[11px] text-[#7C766F] font-sans"> / yr</span></span>
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
              <EqNum cap="share that survives RADV / audit" value={dq.hccRealization} onChange={(v) => updateDq({ hccRealization: v })} suffix="%" width={40} />
            </div>
            <div className="text-[13px] text-[#565250]">Across {plans.length} {plans.length === 1 ? "plan" : "plans"}&nbsp; <b className="font-abridge text-[19px] text-[#EA2C00]">+{fmt$(hccValue)}</b> / yr</div>
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

  // ── Inpatient: DRG/CMI + Obs Defense ──
  const drgValue = engine.drgAccuracy ?? 0;
  const projectedCmi = dq.ipDrgCurrentCmi + dq.ipDrgWeightIncrease;
  const drgAwait = gate("drgAccuracy");
  const drgCard = (
    <InlineDriverCard
      key="drg"
      title="Case Mix Index"
      subtitle="Complete documentation at the point of care justifies the CC/MCC and severity that set the DRG weight. Your CDI team also moves CMI, so this counts only the share attributed to Abridge, and only what survives audit."
      enabled={dq.ipDrgEnabled}
      onToggle={() => updateDq({ ipDrgEnabled: !dq.ipDrgEnabled, ipDrgExpanded: !dq.ipDrgEnabled ? true : dq.ipDrgExpanded })}
      testId="toggle-drg"
      note={
        <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live, then updates the model on the right. We count only the <b className="text-[#B02200] not-italic">{dq.ipDrgAttribution}%</b> your point-of-care notes drive, and the <b className="text-[#B02200] not-italic">{dq.ipDrgRealization}%</b> that survives audit.</>
      }
    >
      {drgAwait ? (
        <EqAwaiting need={drgAwait.need} />
      ) : (
        <EquationRow>
          <EqCarried cap="discharges">{fmtN(eligibleEncounters)}</EqCarried>
          <EqOp>×</EqOp>
          <EqNum cap="CMI lift" value={dq.ipDrgWeightIncrease} onChange={(v) => updateDq({ ipDrgWeightIncrease: v })} decimal />
          <EqOp>×</EqOp>
          <EqNum cap="per case" value={dq.ipDrgBasePayment} onChange={(v) => updateDq({ ipDrgBasePayment: v })} prefix="$" />
          <EqOp>×</EqOp>
          <EqNum cap="attributed" value={dq.ipDrgAttribution} onChange={(v) => updateDq({ ipDrgAttribution: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="survives audit" value={dq.ipDrgRealization} onChange={(v) => updateDq({ ipDrgRealization: v })} suffix="%" />
          <EqResult value={drgValue} />
        </EquationRow>
      )}
    </InlineDriverCard>
  );

  const obsPreventablePct =
    dq.ipObsDefensePreventableScenario === "custom"
      ? dq.ipObsDefenseCustomPercent ?? 40
      : IP_OBS_PREVENTABLE_SCENARIOS[dq.ipObsDefensePreventableScenario] ?? 40;
  const obsValue = engine.obsDefense ?? 0;
  const obsAwait = gate("obsDefense");
  const obsCard = (
    <InlineDriverCard
      key="obs"
      title="Observation / IP status defense"
      subtitle="The revenue delta when a payer downgrades an inpatient stay to observation for want of clear medical-necessity documentation. Two separate questions: which downgrades the note itself can defend, and how many of those survive appeal."
      enabled={dq.ipObsDefenseEnabled}
      onToggle={() =>
        updateDq({ ipObsDefenseEnabled: !dq.ipObsDefenseEnabled, ipObsDefenseExpanded: !dq.ipObsDefenseEnabled ? true : dq.ipObsDefenseExpanded })
      }
      testId="toggle-obs"
      note={
        <>Grey figures carry from your earlier steps. Change any coral figure and this reprices live. We keep only the <b className="text-[#B02200] not-italic">{obsPreventablePct}%</b> the note can defend, and the <b className="text-[#B02200] not-italic">{dq.ipObsDefenseRealization}%</b> that survives appeal.</>
      }
    >
      {obsAwait ? (
        <EqAwaiting need={obsAwait.need} />
      ) : (
        <EquationRow>
          <EqCarried cap="admissions">{fmtN(eligibleEncounters)}</EqCarried>
          <EqOp>×</EqOp>
          <EqNum cap="downgraded" value={dq.ipObsDefenseDenialRate} onChange={(v) => updateDq({ ipObsDefenseDenialRate: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="per case delta" value={dq.ipObsDefenseRevenueDelta} onChange={(v) => updateDq({ ipObsDefenseRevenueDelta: v })} prefix="$" />
          <EqOp>×</EqOp>
          <EqNum cap="note defends" value={obsPreventablePct} onChange={(v) => updateDq({ ipObsDefensePreventableScenario: "custom", ipObsDefenseCustomPercent: v })} suffix="%" />
          <EqOp>×</EqOp>
          <EqNum cap="survives appeal" value={dq.ipObsDefenseRealization} onChange={(v) => updateDq({ ipObsDefenseRealization: v })} suffix="%" />
          <EqResult value={obsValue} />
        </EquationRow>
      )}
    </InlineDriverCard>
  );

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
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 6 of 9</div>
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
        <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Revenue" />
        </div>

        <div className="flex justify-end mt-[30px]">
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
    </EditorialShell>
  );
}

function fmtNd(n: number) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}
