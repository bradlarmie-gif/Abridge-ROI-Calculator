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
import { getDriversForPage } from "@/lib/exploreDrivers";
import { type ExploreState, type HccPlan } from "../ExploreFlow";
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

export default function EdRevenue({ state, updateState, totalHoursSaved, onNext, onBack }: EdRevenueProps) {
  const setting = state.careSetting;
  const dq = state.docQualityInputs;
  const td = state.timeDriverInputs;
  const isED = setting === "ed";
  const isIP = setting === "inpatient";
  const isOP = setting === "outpatient";
  const isNursing = setting === "nursing";

  const engine = computeAllDriverValues(state, totalHoursSaved);
  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

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

  const wrvuCard = (
    <MoneyCard
      key="wrvu"
      title={isED ? "E&M level accuracy" : "wRVU capture"}
      tag={isOP ? "Fee-for-service" : undefined}
      subtitle={
        isED
          ? "A fuller ED note lets the E/M level match the visit complexity. Capture, not upcoding."
          : "A fuller note lets the E/M level match the visit. Capture, not upcoding."
      }
      enabled={dq.wrvuEnabled}
      onToggle={() => updateDq({ wrvuEnabled: !dq.wrvuEnabled, wrvuExpanded: !dq.wrvuEnabled ? true : dq.wrvuExpanded })}
      value={wrvuValue}
      secondary={
        <>
          ≈ <b className="text-[#1A1A1A]">{fmtN(additionalWrvus)}</b> more wRVUs captured, a {wrvuLiftPct}% lift
        </>
      }
      testId="toggle-wrvu"
      buildLine={
        <>
          <b className="text-[#1A1A1A]">{fmtN(eligibleEncounters)}</b> {isED ? "ED encounters" : "visits"} ×{" "}
          <b className="text-[#1A1A1A]">{dq.currentWrvu} wRVU</b> baseline × <b className="text-[#1A1A1A]">{wrvuLiftPct}%</b>{" "}
          more × <b className="text-[#1A1A1A]">${dq.conversionFactor.toFixed(2)}</b> × {dq.wrvuRealization}% realization ={" "}
          <b className="text-[#1A1A1A]">{fmt$(wrvuValue)}</b> a year
        </>
      }
    >
      <FieldGrid>
        <FieldTile label={isED ? "ED encounters" : "Fee-for-service visits"} note="at your utilization rate">
          <FiReadout>{fmtN(eligibleEncounters)}</FiReadout>
        </FieldTile>
        <FieldTile label="Avg wRVU per visit" note="your baseline">
          <Fi value={dq.currentWrvu} onValueChange={(v) => updateDq({ currentWrvu: v })} decimal testId="input-ed-current-wrvu" />
        </FieldTile>
        <FieldTile label="Increase">
          <FiReadout suffix="%">{wrvuLiftPct}</FiReadout>
          <QuickFill
            options={(["conservative", "typical", "aggressive"] as const).map((k) => ({ key: k, label: `${wrvuScenarios[k]}%` }))}
            activeKey={dq.wrvuScenario}
            onSelect={(k) => updateDq({ wrvuScenario: k as typeof dq.wrvuScenario })}
          />
        </FieldTile>
        <FieldTile label="Per wRVU">
          <Fi
            value={dq.conversionFactor}
            onValueChange={(v) => updateDq({ conversionFactor: v })}
            prefix="$"
            decimal
            testId="input-ed-conversion-factor"
          />
          <QuickFill
            options={[
              { key: "medicare", label: "Medicare" },
              { key: "blended", label: "Blended · 50" },
            ]}
            activeKey={dq.conversionFactor >= 45 ? "blended" : "medicare"}
            onSelect={(k) => updateDq({ conversionFactor: k === "blended" ? 50 : 33.4 })}
          />
        </FieldTile>
      </FieldGrid>
    </MoneyCard>
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
      panelSize: 100,
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
    const effectiveUplift = Math.min(pUpliftPts, Math.max(0, 90 - p.currentRecaptureRate));
    const gapPts = (state.numberOfProviders * p.panelSize * p.gapRate) / 100;
    let gross = gapPts * (effectiveUplift / 100) * dq.avgHccs * p.valuePerHcc;
    if (p.netNewEnabled) {
      const netNewPts = (state.numberOfProviders * p.panelSize * p.netNewDiscoveryRate) / 100;
      gross += netNewPts * p.netNewAvgConditions * p.valuePerHcc;
    }
    return { name: p.name, gross: Math.round(gross * (dq.hccRealization / 100)) };
  });

  const hccCard = (
    <MoneyCard
      key="hcc"
      title="HCC capture"
      tag="Risk-based"
      subtitle="Chronic conditions that lapse and must be recaptured each year, plus new ones Abridge surfaces in the room. Each plan is valued on its own economics."
      enabled={dq.hccEnabled}
      onToggle={() => updateDq({ hccEnabled: !dq.hccEnabled, hccExpanded: !dq.hccEnabled ? true : dq.hccExpanded })}
      value={hccValue}
      secondary={
        <>
          ≈ <b className="text-[#1A1A1A]">{upliftPts}pp</b> recapture lift per plan, plus newly identified conditions
        </>
      }
      testId="toggle-hcc"
      buildLine={
        <>
          Each plan: panel × ({dq.avgHccs} known × {upliftPts}pp recaptured + newly identified) × its $/HCC
          {planBreakdown.length > 1 ? (
            <>
              .{" "}
              {planBreakdown.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && " + "}
                  {p.name} <b className="text-[#1A1A1A]">{fmt$(p.gross)}</b>
                </span>
              ))}{" "}
              = <b className="text-[#1A1A1A]">{fmt$(hccValue)}</b> a year
            </>
          ) : (
            <> = <b className="text-[#1A1A1A]">{fmt$(hccValue)}</b> a year</>
          )}
        </>
      }
    >
      <PlansRepeater totalLabel={<><b className="text-[#1A1A1A] font-abridge text-[14px]">{fmtN(totalPanel)}</b> members total</>} onAdd={addPlan}>
        {plans.map((p) => (
          <PlanRow
            key={p.id}
            planType={p.planType}
            members={p.panelSize * state.numberOfProviders}
            valuePerHcc={p.valuePerHcc}
            onPlanTypeChange={(v) =>
              updateDq({ hccPlans: plans.map((pl) => (pl.id === p.id ? { ...pl, planType: v as HccPlan["planType"] } : pl)) })
            }
            onMembersChange={(v) =>
              updateDq({
                hccPlans: plans.map((pl) =>
                  pl.id === p.id
                    ? { ...pl, panelSize: state.numberOfProviders > 0 ? Math.round(v / state.numberOfProviders) : v }
                    : pl,
                ),
              })
            }
            onValuePerHccChange={(v) =>
              updateDq({ hccPlans: plans.map((pl) => (pl.id === p.id ? { ...pl, valuePerHcc: v } : pl)) })
            }
            onRemove={() => removePlan(p.id)}
            removable={plans.length > 1}
          />
        ))}
      </PlansRepeater>

      <FieldGrid>
        <FieldTile label="Known HCCs per member" note="chronic, on file each year">
          <Fi value={dq.avgHccs} onValueChange={(v) => updateDq({ avgHccs: v })} decimal testId="input-ed-avg-hccs" />
        </FieldTile>
        <FieldTile label="Recapture rate today" note="of those, re-documented now">
          <Fi
            value={recaptureRateToday}
            onValueChange={(v) => setAllPlans({ currentRecaptureRate: v })}
            suffix="%"
            testId="input-ed-recapture-today"
          />
        </FieldTile>
        <FieldTile label="With Abridge" note={`+${upliftPts} pts recaptured`} hot>
          <Fi
            value={withAbridge}
            onValueChange={(v) => setAllPlans({ uplift: "custom", upliftCustomPp: Math.max(0, v - recaptureRateToday) })}
            suffix="%"
            highlighted
            testId="input-ed-with-abridge"
          />
        </FieldTile>
        <FieldTile label="Newly identified / member" note="net-new, in the visit">
          <Fi
            value={sharedPlan?.netNewAvgConditions ?? 0}
            onValueChange={(v) => setAllPlans({ netNewEnabled: v > 0, netNewAvgConditions: v })}
            suffix="HCC"
            decimal
            testId="input-ed-newly-identified"
          />
        </FieldTile>
      </FieldGrid>
    </MoneyCard>
  );

  // ── Denials card (outpatient + ED) ──
  const denialsScenarios = denialsScenariosFor(isED, dq.denialsCustomPercent);
  const denialsPreventedPct = denialsScenarios[dq.denialsScenario] ?? 0;
  const rateAfter = dq.medNecessityDenialRate * (1 - denialsPreventedPct / 100);
  const deniedClaims = Math.round(eligibleEncounters * (dq.medNecessityDenialRate / 100));
  const fewerDenied = Math.round(deniedClaims * (denialsPreventedPct / 100));
  const denialsValue = engine.denialPrevention ?? 0;

  const denialsCard = (
    <MoneyCard
      key="denials"
      title="Medical necessity denials"
      tag={isOP || isED ? "Fee-for-service & risk" : undefined}
      subtitle="Claims you earned but lose to documentation gaps. Fewer denied, less rework."
      enabled={dq.denialsEnabled}
      onToggle={() => updateDq({ denialsEnabled: !dq.denialsEnabled, denialsExpanded: !dq.denialsEnabled ? true : dq.denialsExpanded })}
      value={denialsValue}
      secondary={
        <>
          ≈ <b className="text-[#1A1A1A]">{fmtN(fewerDenied)}</b> fewer denied claims a year
        </>
      }
      testId="toggle-denials"
      buildLine={
        <>
          <b className="text-[#1A1A1A]">{fmtN(eligibleEncounters)}</b> claims × <b className="text-[#1A1A1A]">{dq.medNecessityDenialRate}%</b>{" "}
          denial rate × <b className="text-[#1A1A1A]">{denialsPreventedPct}%</b> prevented ({fmtN(fewerDenied)}) ×{" "}
          <b className="text-[#1A1A1A]">${dq.avgClaimValue}</b> × {dq.denialsRealization}% net of appeals ={" "}
          <b className="text-[#1A1A1A]">{fmt$(denialsValue)}</b> a year
        </>
      }
    >
      <FieldGrid>
        <FieldTile label="Annual claims" note="encounters × utilization">
          <FiReadout>{fmtN(eligibleEncounters)}</FiReadout>
        </FieldTile>
        <FieldTile label="Fewer denials" note={<>{dq.medNecessityDenialRate}% → {fmtNd(rateAfter)}% = {fmtN(fewerDenied)}</>}>
          <Fi
            value={dq.medNecessityDenialRate}
            onValueChange={(v) => updateDq({ medNecessityDenialRate: v })}
            suffix="%"
            decimal
            testId="input-ed-denial-rate"
          />
          <QuickFill
            options={(["conservative", "typical", "aggressive"] as const).map((k) => ({ key: k, label: `${denialsScenarios[k]}%` }))}
            activeKey={dq.denialsScenario}
            onSelect={(k) => updateDq({ denialsScenario: k as typeof dq.denialsScenario })}
          />
        </FieldTile>
        <FieldTile label="Avg claim value">
          <Fi value={dq.avgClaimValue} onValueChange={(v) => updateDq({ avgClaimValue: v })} prefix="$" testId="input-ed-claim-value" />
        </FieldTile>
        <FieldTile label="Net of appeals" note="kept, not won back anyway">
          <Fi value={dq.denialsRealization} onValueChange={(v) => updateDq({ denialsRealization: v })} suffix="%" testId="input-ed-net-appeals" />
        </FieldTile>
      </FieldGrid>
    </MoneyCard>
  );

  // ── Inpatient: DRG/CMI + Obs Defense ──
  const drgProtectPct = dq.ipDrgScenario === "custom" ? dq.ipDrgCustomPercent ?? 20 : IP_DRG_PROTECT_SCENARIOS[dq.ipDrgScenario] ?? 20;
  const drgValue = engine.drgAccuracy ?? 0;
  const drgCard = (
    <MoneyCard
      key="drg"
      title="Case Mix Index"
      subtitle="When clinical reasoning is captured in real time, comorbidities and complications are documented as spoken, preserving the CC/MCC assignments that raise DRG weight."
      enabled={dq.ipDrgEnabled}
      onToggle={() => updateDq({ ipDrgEnabled: !dq.ipDrgEnabled, ipDrgExpanded: !dq.ipDrgEnabled ? true : dq.ipDrgExpanded })}
      value={drgValue}
      secondary={<>≈ <b className="text-[#1A1A1A]">{drgProtectPct}%</b> of at-risk discharges protected</>}
      testId="toggle-drg"
      buildLine={
        <>
          <b className="text-[#1A1A1A]">{fmtN(eligibleEncounters)}</b> discharges × <b className="text-[#1A1A1A]">{dq.ipDrgAtRiskRate}%</b>{" "}
          at-risk × <b className="text-[#1A1A1A]">{drgProtectPct}%</b> protected × <b className="text-[#1A1A1A]">{dq.ipDrgWeightIncrease}</b> weight ×{" "}
          <b className="text-[#1A1A1A]">${fmtN(dq.ipDrgBasePayment)}</b>/case × {dq.ipDrgRealization}% realization ={" "}
          <b className="text-[#1A1A1A]">{fmt$(drgValue)}</b> a year
        </>
      }
    >
      <FieldGrid>
        <FieldTile label="Annual discharges" note="at your utilization rate">
          <FiReadout>{fmtN(eligibleEncounters)}</FiReadout>
        </FieldTile>
        <FieldTile label="At-risk rate" note="admissions with doc gaps">
          <Fi value={dq.ipDrgAtRiskRate} onValueChange={(v) => updateDq({ ipDrgAtRiskRate: v })} suffix="%" testId="input-ed-drg-at-risk" />
        </FieldTile>
        <FieldTile label="Protected">
          <FiReadout suffix="%">{drgProtectPct}</FiReadout>
          <QuickFill
            options={(["conservative", "typical", "aggressive"] as const).map((k) => ({ key: k, label: `${IP_DRG_PROTECT_SCENARIOS[k]}%` }))}
            activeKey={dq.ipDrgScenario}
            onSelect={(k) => updateDq({ ipDrgScenario: k as typeof dq.ipDrgScenario })}
          />
        </FieldTile>
        <FieldTile label="Weight increase" note="avg DRG weight delta">
          <Fi value={dq.ipDrgWeightIncrease} onValueChange={(v) => updateDq({ ipDrgWeightIncrease: v })} decimal testId="input-ed-drg-weight" />
        </FieldTile>
      </FieldGrid>
      <FieldGrid cols={3}>
        <FieldTile label="Base payment / discharge">
          <Fi value={dq.ipDrgBasePayment} onValueChange={(v) => updateDq({ ipDrgBasePayment: v })} prefix="$" testId="input-ed-drg-base" />
        </FieldTile>
        <FieldTile label="Realization" note="audit adjustments">
          <Fi value={dq.ipDrgRealization} onValueChange={(v) => updateDq({ ipDrgRealization: v })} suffix="%" testId="input-ed-drg-realization" />
        </FieldTile>
        <div />
      </FieldGrid>
    </MoneyCard>
  );

  const obsPreventablePct =
    dq.ipObsDefensePreventableScenario === "custom"
      ? dq.ipObsDefenseCustomPercent ?? 40
      : IP_OBS_PREVENTABLE_SCENARIOS[dq.ipObsDefensePreventableScenario] ?? 40;
  const obsValue = engine.obsDefense ?? 0;
  const obsCard = (
    <MoneyCard
      key="obs"
      title="Observation / IP status defense"
      subtitle="The revenue delta when a payer downgrades an inpatient stay to observation for lack of clear medical necessity documentation."
      enabled={dq.ipObsDefenseEnabled}
      onToggle={() =>
        updateDq({ ipObsDefenseEnabled: !dq.ipObsDefenseEnabled, ipObsDefenseExpanded: !dq.ipObsDefenseEnabled ? true : dq.ipObsDefenseExpanded })
      }
      value={obsValue}
      secondary={<>≈ <b className="text-[#1A1A1A]">{obsPreventablePct}%</b> of downgrades doc-preventable</>}
      testId="toggle-obs"
      buildLine={
        <>
          <b className="text-[#1A1A1A]">{fmtN(eligibleEncounters)}</b> admissions × <b className="text-[#1A1A1A]">{dq.ipObsDefenseDenialRate}%</b>{" "}
          downgrade rate × <b className="text-[#1A1A1A]">${fmtN(dq.ipObsDefenseRevenueDelta)}</b>/case × <b className="text-[#1A1A1A]">{obsPreventablePct}%</b>{" "}
          doc-preventable × {dq.ipObsDefenseRealization}% realization = <b className="text-[#1A1A1A]">{fmt$(obsValue)}</b> a year
        </>
      }
    >
      <FieldGrid>
        <FieldTile label="Annual admissions" note="at your utilization rate">
          <FiReadout>{fmtN(eligibleEncounters)}</FiReadout>
        </FieldTile>
        <FieldTile label="Downgrade rate">
          <Fi value={dq.ipObsDefenseDenialRate} onValueChange={(v) => updateDq({ ipObsDefenseDenialRate: v })} suffix="%" testId="input-ed-obs-rate" />
        </FieldTile>
        <FieldTile label="Revenue delta / case">
          <Fi value={dq.ipObsDefenseRevenueDelta} onValueChange={(v) => updateDq({ ipObsDefenseRevenueDelta: v })} prefix="$" testId="input-ed-obs-delta" />
        </FieldTile>
        <FieldTile label="Doc-preventable">
          <FiReadout suffix="%">{obsPreventablePct}</FiReadout>
          <QuickFill
            options={(["conservative", "typical", "aggressive"] as const).map((k) => ({ key: k, label: `${IP_OBS_PREVENTABLE_SCENARIOS[k]}%` }))}
            activeKey={dq.ipObsDefensePreventableScenario}
            onSelect={(k) => updateDq({ ipObsDefensePreventableScenario: k as typeof dq.ipObsDefensePreventableScenario })}
          />
        </FieldTile>
      </FieldGrid>
      <FieldGrid cols={3}>
        <FieldTile label="Realization" note="audit adjustments">
          <Fi value={dq.ipObsDefenseRealization} onValueChange={(v) => updateDq({ ipObsDefenseRealization: v })} suffix="%" testId="input-ed-obs-realization" />
        </FieldTile>
        <div />
        <div />
      </FieldGrid>
    </MoneyCard>
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
      <EditorialHeader stepName="Revenue" stepIndex={6} onBack={onBack} />
      <div className="max-w-[1160px] mx-auto px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#5E534A]">Explore · Step 6 of 9</div>
        <h1 className="font-abridge text-[38px] leading-[1.06] text-[#1A1A1A] mt-[10px] max-w-[680px]">{heading}</h1>
        <p className="text-[16px] text-[#5E534A] mt-[13px] max-w-[640px] leading-[1.5]">{sub}</p>

        {isOP && (
          <>
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mt-[26px] mb-3">How are you paid?</div>
            <div className="inline-flex gap-[3px] bg-[#F1EBE3] border border-[#E4DACC] rounded-[13px] p-1">
              {PAY_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updatePaymentModel(key)}
                  data-testid={`button-payment-model-${key}`}
                  className={`text-[14px] font-bold rounded-[9px] px-7 py-[11px] transition-colors ${
                    state.paymentModel === key ? "bg-white text-[#EA2C00] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#5E534A]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-[#786C5E] mt-[11px] leading-[1.5] max-w-[640px]">
              <b className="text-[#5E534A]">{PAY_LABELS.find((p) => p.key === state.paymentModel)?.label}.</b>{" "}
              {state.paymentModel === "ffs"
                ? "Modeling fee-for-service visits only. Switch to Risk-based or Both to add HCC capture."
                : state.paymentModel === "risk"
                ? "Modeling risk-based lives only. Switch to Fee-for-service or Both to add wRVU capture."
                : "Fee-for-service visits and risk lives are kept separate, so no patient is counted twice."}
            </p>
          </>
        )}

        {!isNursing && (
          <SectionLabel
            tag="counts when it's on"
            right={
              <>
                Counted on this screen&nbsp; <b className="font-abridge text-[15px] text-[#1A1A1A]">{fmt$(countedTotal)}</b> / yr &nbsp;·&nbsp;{" "}
                <span className="text-[#786C5E]">{onCount} of {visibleCards.length} on</span>
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

        {signalDrivers.length > 0 && (
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
        )}

        {isNursing && (
          <div className="border border-dashed border-[#D8CFC0] rounded-[18px] bg-[#FAF7F2] px-6 py-5 mt-8">
            <div className="flex gap-3">
              <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00] flex-shrink-0 mt-[5px]" />
              <div className="text-[13.5px] text-[#5E534A] leading-[1.5]">
                <b className="text-[#1A1A1A]">$0 counted here, on purpose.</b> Nursing documentation corroborates CDI queries and
                clears the documentation-completion backlog that holds claims in DNFB, but the dollars land on the physician
                side of the record. Nothing here is double-counted against Revenue.
              </div>
            </div>
          </div>
        )}

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
