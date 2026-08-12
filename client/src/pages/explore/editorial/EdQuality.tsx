import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { MoneyCard, SectionLabel, FieldGrid, FieldTile, Fi, FiReadout, OutcomesTier, fmtN } from "./EdMoneyCard";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";
import { calcHapi, calcFalls, calcCauti, calcClabsi, calcSepsis } from "@/lib/nursingQualityCalcs";
import { getDriversForPage, type ExploreDriver } from "@/lib/exploreDrivers";
import { type ExploreState } from "../ExploreFlow";
import { SignalWatch } from "./SignalWatch";
import { watchDomainFor } from "@/lib/exploreWatchSignals";
import ValueRail from "./ValueRail";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";

interface EdQualityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  priorQuadrants?: PriorQuadrantEntry[];
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

// Hand-authored chain copy, keyed by the real EXPLORE_DRIVERS id for that
// setting's Quality qualitative drivers — timing is pulled live from each
// driver's registered `valueArc` (never invented), only the metric/sub
// phrasing is written here so it stays accuracy-not-achievement and never
// ties Abridge to a STARS/CMS bonus outcome.
const CHAIN_COPY: Record<string, { metric: string; sub: string }> = {
  opCdiQueryTrend: { metric: "CDI queries fall", sub: "Chronic conditions get the specificity they need the first time." },
  opCareGapClosureRate: { metric: "Care gaps recorded closed", sub: "Preventive care that actually happened in the visit is recorded as done." },
  opHedisCompositeScore: { metric: "HEDIS reflects the care", sub: "The year-end measure reflects what the chart now accurately shows." },
  opMaStarsPerformance: { metric: "MA STARS reflects it too", sub: "STARS runs on the same documented care, one measurement year later." },
  edNoteCompleteness: { metric: "Notes reach full completeness", sub: "HPI, MDM, and disposition rationale captured while the encounter is still open." },
  edDocDeficiencyRate: { metric: "Deficiency queue empties", sub: "Fewer notes come back for follow-up after the shift ends." },
  edCoreMeasureDocRate: { metric: "Core measures document clean", sub: "Stroke, STEMI, and chest-pain pathway elements captured as they happen." },
  edSepsisBundle: { metric: "SEP-1 bundle closes in time", sub: "Time-sensitive sepsis elements land inside the CMS window." },
  edPatientExperience: { metric: "Doctor communication scores move", sub: "Attention shifts from the screen back to the patient in the room." },
  ipCdiQueryRate: { metric: "CDI queries fall", sub: "Severity, laterality, and comorbidity relationships captured the first time." },
  ipHcahpsDoctor: { metric: "Doctor communication scores move", sub: "Rounding without the keyboard between the hospitalist and the patient." },
  ipReadmissionRate: { metric: "30-day readmissions trend down", sub: "The H&P, progress notes, and consult notes care coordination depends on are complete." },
};

function stageTiming(d: ExploreDriver): string {
  return d.valueArc?.proof?.timing ?? d.valueArc?.trend?.timing ?? d.valueArc?.signal?.timing ?? "—";
}

const HEADING_COPY: Record<"outpatient" | "ed" | "inpatient", { h1: string; sub: string; root: string }> = {
  outpatient: {
    h1: "Where does the quality show up?",
    sub: "Better notes make sure the care you deliver is reflected in the quality measures you already report. Abridge does not change the score. It keeps real care from being lost to an incomplete note.",
    root: "It starts in the visit. The note captures the preventive care and chronic conditions as they happen, so what you actually did is what gets scored, not what someone remembered to add later.",
  },
  ed: {
    h1: "Where does the quality show up?",
    sub: "Better ED notes make sure the care delivered is reflected in the measures you already report. Abridge does not change the score. It keeps a busy shift's care from being lost to an incomplete note.",
    root: "It starts in the encounter. The note captures protocol adherence and clinical complexity as they happen, so the care given is the care that gets documented, not reconstructed between patients.",
  },
  inpatient: {
    h1: "Where does the quality show up?",
    sub: "Better inpatient notes make sure the acuity and care coordination you delivered are reflected in the measures you already report. Abridge does not change the score. It keeps real care from being lost to an incomplete note.",
    root: "It starts at the bedside. The H&P and daily progress notes capture severity and comorbidities as they're assessed, so the chart keeps pace with the patient instead of trailing behind rounds.",
  },
};

function ProofChainScreen({ state, totalHoursSaved, onNext, onBack, onHome, setting }: { state: ExploreState; totalHoursSaved: number; onNext: () => void; onBack: () => void; onHome: () => void; setting: "outpatient" | "ed" | "inpatient" }) {
  // The proof chain is the CURATED set from the locked mockup (not every
  // qualitative driver), in this exact order. Matching the mockups screen-for-screen.
  const allDrivers = getDriversForPage("Quality", setting).filter((d) => !d.childOfDriverId);
  const CHAIN_IDS: Record<"outpatient" | "ed" | "inpatient", string[]> = {
    outpatient: ["opCdiQueryTrend", "opCareGapClosureRate", "opHedisCompositeScore", "opMaStarsPerformance"],
    ed: ["edCoreMeasureDocRate", "edNoteCompleteness", "edSepsisBundle", "edPatientExperience"],
    inpatient: ["ipCdiQueryRate", "ipHcahpsDoctor", "ipReadmissionRate"],
  };
  const drivers = (CHAIN_IDS[setting] ?? [])
    .map((id) => allDrivers.find((d) => d.id === id))
    .filter((d): d is ExploreDriver => Boolean(d));
  const copy = HEADING_COPY[setting];
  const stepIndex = 7;

  return (
    <EditorialShell>
      <EditorialHeader stepName="Quality" stepIndex={stepIndex} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 7 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[700px]">{copy.h1}</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[660px] leading-[1.5]">{copy.sub}</p>

        <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-x-10 gap-y-8 items-start">
        <div className="min-w-0">
        <SectionLabel
          tag="no dollar counted here"
          tagVariant="grey"
          right={
            <>
              Any dollars tied to quality are already counted in <b className="text-[#1A1A1A]">Revenue</b>
            </>
          }
        >
          The proof
        </SectionLabel>

        <div className="border border-[#E7E3DD] rounded-[14px] bg-[#FAF7F2] px-[18px] py-[15px] mb-[18px] flex gap-3">
          <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00] flex-shrink-0 mt-[5px]" />
          <div className="text-[13.5px] text-[#565250] leading-[1.5]">
            <b className="text-[#1A1A1A]">{copy.root.split(".")[0]}.</b> {copy.root.split(".").slice(1).join(".").trim()}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F] mb-2.5">
          How the proof builds <span className="flex-1 h-px bg-gradient-to-r from-[#E7E3DD] to-[#EDE7DD]" /> weeks → next year
        </div>

        <div className="flex items-stretch flex-wrap gap-y-4" data-testid="proof-chain">
          {drivers.map((d, i) => {
            const copyEntry = CHAIN_COPY[d.id] ?? { metric: d.label, sub: d.tagline ?? "" };
            const isLast = i === drivers.length - 1;
            return (
              <div key={d.id} className="flex items-stretch" style={{ flex: "1 1 200px", minWidth: 200 }}>
                <div
                  className={`flex-1 rounded-[16px] p-[18px_17px] flex flex-col gap-2.5 ${
                    isLast ? "bg-[#FFFBFA] border border-[#F0D3C9]" : "bg-[#FDFBF8] border border-[#E7E3DD]"
                  }`}
                >
                  <span
                    className={`self-start text-[10px] font-extrabold tracking-[0.05em] uppercase rounded-full px-[9px] py-[3px] ${
                      isLast ? "text-[#B02200] bg-[#FFEDE7]" : "text-[#7C766F] bg-[#F2EFEA]"
                    }`}
                  >
                    {stageTiming(d)}
                  </span>
                  <div className="font-abridge text-[17px] text-[#1A1A1A] leading-[1.15]">{copyEntry.metric}</div>
                  <div className="text-[11.5px] text-[#7C766F] leading-[1.4]">{copyEntry.sub}</div>
                </div>
                {!isLast && (
                  <div className="flex items-center justify-center text-[19px] text-[#CBBEAB] w-10 flex-shrink-0">→</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border border-dashed border-[#D8CFC0] rounded-[14px] bg-[#FAF7F2] px-5 py-[17px] mt-[22px] text-[13px] text-[#565250] leading-[1.55]">
          <b className="text-[#1A1A1A]">We don't put a dollar on this screen, on purpose.</b> Abridge doesn't change your
          scores or earn a bonus. It makes sure the care you actually delivered is reflected in the measures you're already
          judged by. Any dollars tied to those measures are counted once, in Revenue, so nothing here is double-counted or
          promised.
        </div>
        </div>
        <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Quality" />
        </div>

        <div className="flex justify-end mt-[30px]">
          <button
            type="button"
            onClick={onNext}
            data-testid="button-ed-quality-continue"
            className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)]"
          >
            Continue →
          </button>
        </div>
      </div>
    </EditorialShell>
  );
}

function NursingQualityScreen({
  state,
  updateState,
  totalHoursSaved,
  onNext,
  onBack,
  onHome,
}: {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}) {
  const dq = state.docQualityInputs;
  const engine = computeAllDriverValues(state, totalHoursSaved);
  const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  const updateDq = (updates: Partial<ExploreState["docQualityInputs"]>) => updateState({ docQualityInputs: { ...dq, ...updates } });
  const gate = (driverId: string) => {
    const r = driverScaleReadiness(driverId, state, totalHoursSaved);
    return r.ready ? undefined : { need: r.need };
  };

  const hapi = calcHapi({ patientDays, rate: dq.nursingHapiRate, preventionPct: dq.nursingHapiPreventionRate, cost: dq.nursingHapiCost });
  const falls = calcFalls({ patientDays, rate: dq.nursingFallsRate, preventionPct: dq.nursingFallsPreventionRate, cost: dq.nursingFallsCost });
  const cauti = calcCauti({
    patientDays,
    utilizationPct: dq.nursingCautiUtilizationRatio,
    rate: dq.nursingCautiRate,
    preventionPct: dq.nursingCautiPreventionRate,
    cost: dq.nursingCautiCost,
  });
  const clabsi = calcClabsi({
    patientDays,
    utilizationPct: dq.nursingClabsiUtilizationRatio,
    rate: dq.nursingClabsiRate,
    preventionPct: dq.nursingClabsiPreventionRate,
    cost: dq.nursingClabsiCost,
  });
  const sepsis = calcSepsis({
    patientDays,
    ratePerThousand: dq.nursingSepsisRatePerThousand,
    currentCompliancePct: dq.nursingSepsisCurrentCompliance,
    docLagPct: dq.nursingSepsisDocLagPercent,
    excessCostPerCase: dq.nursingSepsisExcessCostPerCase,
    realizationPct: dq.nursingSepsisRealization,
  });

  const anyEnabled = dq.nursingHapiEnabled || dq.nursingFallsEnabled || dq.nursingCautiEnabled || dq.nursingClabsiEnabled || dq.nursingSepsisEnabled;
  const needsBeds = state.nursingStaffedBeds <= 0 || state.nursingOccupancyRate <= 0;

  const signalDrivers = getDriversForPage("Quality", "nursing").filter((d) => !d.childOfDriverId && d.visibility === "qualitative");

  const countedTotal =
    (dq.nursingHapiEnabled ? engine.nursingHapi ?? 0 : 0) +
    (dq.nursingFallsEnabled ? engine.nursingFalls ?? 0 : 0) +
    (dq.nursingCautiEnabled ? engine.nursingCauti ?? 0 : 0) +
    (dq.nursingClabsiEnabled ? engine.nursingClabsi ?? 0 : 0) +
    (dq.nursingSepsisEnabled ? engine.nursingSepsis ?? 0 : 0);
  const onCount = [dq.nursingHapiEnabled, dq.nursingFallsEnabled, dq.nursingCautiEnabled, dq.nursingClabsiEnabled, dq.nursingSepsisEnabled].filter(Boolean).length;

  return (
    <EditorialShell>
      <EditorialHeader stepName="Quality" stepIndex={7} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 7 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[700px]">
          Where does nursing documentation prevent harm?
        </h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[660px] leading-[1.5]">
          Five harm events scored on timestamps. Undocumented care looks non-compliant even when every element was
          performed. Real-time flowsheet entries are the difference.
        </p>

        {needsBeds && anyEnabled && (
          <div className="border border-[#E7E3DD] rounded-[14px] bg-[#FAF7F2] px-[18px] py-[15px] mt-6 text-[13px] text-[#565250] leading-[1.5]">
            Enter <b className="text-[#1A1A1A]">staffed beds</b> and <b className="text-[#1A1A1A]">occupancy</b> on the first
            step to see these values. Without them, patient-days are zero, so the dollar figures stay at $0.
          </div>
        )}

        <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-x-10 gap-y-8 items-start">
        <div className="min-w-0">
        <SectionLabel
          tag="counts when it's on"
          right={
            <>
              Counted on this screen&nbsp; <b className="font-abridge text-[15px] text-[#1A1A1A]">${Math.round(countedTotal).toLocaleString()}</b> / yr
              &nbsp;·&nbsp; <span className="text-[#7C766F]">{onCount} of 5 on</span>
            </>
          }
        >
          The value
        </SectionLabel>

        <div className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase text-[#7C766F] mb-2">Harm events</div>
        <MoneyCard
          title="HAPI prevention"
          subtitle="Real-time Braden scores and turning events documented at the bedside, not batched after Stage 1 has already progressed."
          enabled={dq.nursingHapiEnabled}
          onToggle={() => updateDq({ nursingHapiEnabled: !dq.nursingHapiEnabled })}
          value={hapi.value}
          secondary={<>≈ <b className="text-[#1A1A1A]">{fmtN(hapi.prevented)}</b> HAPIs prevented a year</>}
          testId="toggle-nursing-hapi"
          awaitingScale={gate("nursingHapi")}
          build={{
            factors: [
              { value: fmtN(patientDays), label: "patient-days" },
              { value: `${dq.nursingHapiRate}`, label: "/1k HAPI rate" },
              { value: `${dq.nursingHapiPreventionRate}%`, label: "earlier docs prevent" },
              { value: `$${dq.nursingHapiCost.toLocaleString()}`, label: "per case" },
            ],
            grossLabel: "",
            gross: hapi.value,
            net: hapi.value,
            haircutLabel: "",
          }}
        >
          <FieldGrid cols={3}>
            <FieldTile label="Patient days" note="staffed beds × occupancy × 365">
              <FiReadout>{fmtN(patientDays)}</FiReadout>
            </FieldTile>
            <FieldTile label="HAPI rate" note="per 1,000 patient-days">
              <Fi value={dq.nursingHapiRate} onValueChange={(v) => updateDq({ nursingHapiRate: v })} decimal testId="input-eq-hapi-rate" />
            </FieldTile>
            <FieldTile label="Prevention rate">
              <Fi value={dq.nursingHapiPreventionRate} onValueChange={(v) => updateDq({ nursingHapiPreventionRate: v })} suffix="%" testId="input-eq-hapi-prevention" />
            </FieldTile>
          </FieldGrid>
          <FieldGrid cols={3}>
            <FieldTile label="Cost per HAPI">
              <Fi value={dq.nursingHapiCost} onValueChange={(v) => updateDq({ nursingHapiCost: v })} prefix="$" testId="input-eq-hapi-cost" />
            </FieldTile>
            <div />
            <div />
          </FieldGrid>
        </MoneyCard>

        <MoneyCard
          title="Falls prevention"
          subtitle="Protocols act on the documented Morse score. Point-of-care reassessment keeps the chart current, not frozen at the score from eight hours ago."
          enabled={dq.nursingFallsEnabled}
          onToggle={() => updateDq({ nursingFallsEnabled: !dq.nursingFallsEnabled })}
          value={falls.value}
          secondary={<>≈ <b className="text-[#1A1A1A]">{fmtN(falls.prevented)}</b> falls prevented a year</>}
          testId="toggle-nursing-falls"
          awaitingScale={gate("nursingFalls")}
          build={{
            factors: [
              { value: fmtN(patientDays), label: "patient-days" },
              { value: `${dq.nursingFallsRate}`, label: "/1k fall rate" },
              { value: `${dq.nursingFallsPreventionRate}%`, label: "earlier docs prevent" },
              { value: `$${dq.nursingFallsCost.toLocaleString()}`, label: "per case" },
            ],
            grossLabel: "",
            gross: falls.value,
            net: falls.value,
            haircutLabel: "",
          }}
        >
          <FieldGrid cols={3}>
            <FieldTile label="Patient days" note="staffed beds × occupancy × 365">
              <FiReadout>{fmtN(patientDays)}</FiReadout>
            </FieldTile>
            <FieldTile label="Fall rate" note="per 1,000 patient-days">
              <Fi value={dq.nursingFallsRate} onValueChange={(v) => updateDq({ nursingFallsRate: v })} decimal testId="input-eq-falls-rate" />
            </FieldTile>
            <FieldTile label="Prevention rate">
              <Fi value={dq.nursingFallsPreventionRate} onValueChange={(v) => updateDq({ nursingFallsPreventionRate: v })} suffix="%" testId="input-eq-falls-prevention" />
            </FieldTile>
          </FieldGrid>
          <FieldGrid cols={3}>
            <FieldTile label="Cost per fall">
              <Fi value={dq.nursingFallsCost} onValueChange={(v) => updateDq({ nursingFallsCost: v })} prefix="$" testId="input-eq-falls-cost" />
            </FieldTile>
            <div />
            <div />
          </FieldGrid>
        </MoneyCard>

        <div className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase text-[#7C766F] mt-6 mb-2">Bundle compliance</div>
        <MoneyCard
          title="CAUTI prevention"
          subtitle="Each point-of-care necessity review is the timestamped prompt for removal. Every catheter day avoided is one fewer chance for a CAUTI."
          enabled={dq.nursingCautiEnabled}
          onToggle={() => updateDq({ nursingCautiEnabled: !dq.nursingCautiEnabled })}
          value={cauti.value}
          secondary={<>≈ <b className="text-[#1A1A1A]">{fmtN(cauti.prevented)}</b> CAUTIs prevented a year</>}
          testId="toggle-nursing-cauti"
          awaitingScale={gate("nursingCauti")}
          build={{
            factors: [
              { value: fmtN(cauti.catheterDays), label: "catheter-days" },
              { value: `${dq.nursingCautiRate}`, label: "/1k CAUTI rate" },
              { value: `${dq.nursingCautiPreventionRate}%`, label: "earlier docs prevent" },
              { value: `$${dq.nursingCautiCost.toLocaleString()}`, label: "per case" },
            ],
            grossLabel: "",
            gross: cauti.value,
            net: cauti.value,
            haircutLabel: "",
          }}
        >
          <FieldGrid cols={4}>
            <FieldTile label="Catheter utilization" note="% of patient-days">
              <Fi value={dq.nursingCautiUtilizationRatio} onValueChange={(v) => updateDq({ nursingCautiUtilizationRatio: v })} suffix="%" testId="input-eq-cauti-util" />
            </FieldTile>
            <FieldTile label="CAUTI rate" note="per 1,000 catheter-days">
              <Fi value={dq.nursingCautiRate} onValueChange={(v) => updateDq({ nursingCautiRate: v })} decimal testId="input-eq-cauti-rate" />
            </FieldTile>
            <FieldTile label="Prevention rate">
              <Fi value={dq.nursingCautiPreventionRate} onValueChange={(v) => updateDq({ nursingCautiPreventionRate: v })} suffix="%" testId="input-eq-cauti-prevention" />
            </FieldTile>
            <FieldTile label="Cost per CAUTI">
              <Fi value={dq.nursingCautiCost} onValueChange={(v) => updateDq({ nursingCautiCost: v })} prefix="$" testId="input-eq-cauti-cost" />
            </FieldTile>
          </FieldGrid>
        </MoneyCard>

        <MoneyCard
          title="CLABSI prevention"
          subtitle="Bundle compliance is scored from timestamps. Undocumented care looks non-compliant even when every element was performed."
          enabled={dq.nursingClabsiEnabled}
          onToggle={() => updateDq({ nursingClabsiEnabled: !dq.nursingClabsiEnabled })}
          value={clabsi.value}
          secondary={<>≈ <b className="text-[#1A1A1A]">{fmtN(clabsi.prevented)}</b> CLABSIs prevented a year</>}
          testId="toggle-nursing-clabsi"
          awaitingScale={gate("nursingClabsi")}
          build={{
            factors: [
              { value: fmtN(clabsi.lineDays), label: "line-days" },
              { value: `${dq.nursingClabsiRate}`, label: "/1k CLABSI rate" },
              { value: `${dq.nursingClabsiPreventionRate}%`, label: "earlier docs prevent" },
              { value: `$${dq.nursingClabsiCost.toLocaleString()}`, label: "per case" },
            ],
            grossLabel: "",
            gross: clabsi.value,
            net: clabsi.value,
            haircutLabel: "",
          }}
        >
          <FieldGrid cols={4}>
            <FieldTile label="Line utilization" note="% of patient-days">
              <Fi value={dq.nursingClabsiUtilizationRatio} onValueChange={(v) => updateDq({ nursingClabsiUtilizationRatio: v })} suffix="%" testId="input-eq-clabsi-util" />
            </FieldTile>
            <FieldTile label="CLABSI rate" note="per 1,000 line-days">
              <Fi value={dq.nursingClabsiRate} onValueChange={(v) => updateDq({ nursingClabsiRate: v })} decimal testId="input-eq-clabsi-rate" />
            </FieldTile>
            <FieldTile label="Prevention rate">
              <Fi value={dq.nursingClabsiPreventionRate} onValueChange={(v) => updateDq({ nursingClabsiPreventionRate: v })} suffix="%" testId="input-eq-clabsi-prevention" />
            </FieldTile>
            <FieldTile label="Cost per CLABSI">
              <Fi value={dq.nursingClabsiCost} onValueChange={(v) => updateDq({ nursingClabsiCost: v })} prefix="$" testId="input-eq-clabsi-cost" />
            </FieldTile>
          </FieldGrid>
        </MoneyCard>

        <MoneyCard
          title="Sepsis bundle compliance"
          subtitle="SEP-1 is scored on timestamps. A 45-minute documentation lag can flip a compliant case to non-compliant."
          enabled={dq.nursingSepsisEnabled}
          onToggle={() => updateDq({ nursingSepsisEnabled: !dq.nursingSepsisEnabled })}
          value={sepsis.value}
          secondary={<>≈ <b className="text-[#1A1A1A]">{fmtN(sepsis.prevented)}</b> cases moved into compliance a year</>}
          testId="toggle-nursing-sepsis"
          awaitingScale={gate("nursingSepsis")}
          build={{
            factors: [
              { value: fmtN(sepsis.prevented), label: "cases into compliance" },
              { value: `$${dq.nursingSepsisExcessCostPerCase.toLocaleString()}`, label: "excess / case" },
            ],
            grossLabel: "",
            gross: sepsis.value,
            net: sepsis.value,
            haircutLabel: "",
          }}
        >
          <FieldGrid cols={4}>
            <FieldTile label="Sepsis rate" note="per 1,000 patient-days">
              <Fi value={dq.nursingSepsisRatePerThousand} onValueChange={(v) => updateDq({ nursingSepsisRatePerThousand: v })} decimal testId="input-eq-sepsis-rate" />
            </FieldTile>
            <FieldTile label="Current compliance">
              <Fi value={dq.nursingSepsisCurrentCompliance} onValueChange={(v) => updateDq({ nursingSepsisCurrentCompliance: v })} suffix="%" testId="input-eq-sepsis-compliance" />
            </FieldTile>
            <FieldTile label="Doc-lag share" note="of non-compliant cases">
              <Fi value={dq.nursingSepsisDocLagPercent} onValueChange={(v) => updateDq({ nursingSepsisDocLagPercent: v })} suffix="%" testId="input-eq-sepsis-doclag" />
            </FieldTile>
            <FieldTile label="Excess cost / case">
              <Fi value={dq.nursingSepsisExcessCostPerCase} onValueChange={(v) => updateDq({ nursingSepsisExcessCostPerCase: v })} prefix="$" testId="input-eq-sepsis-cost" />
            </FieldTile>
          </FieldGrid>
          <FieldGrid cols={3}>
            <FieldTile label="Realization" note="haircut on captured value">
              <Fi value={dq.nursingSepsisRealization} onValueChange={(v) => updateDq({ nursingSepsisRealization: v })} suffix="%" testId="input-eq-sepsis-realization" />
            </FieldTile>
            <div />
            <div />
          </FieldGrid>
        </MoneyCard>

        {watchDomainFor(state.careSetting, "Quality") ? (
          <SignalWatch domain={watchDomainFor(state.careSetting, "Quality")!} title="The bedside signals it protects" />
        ) : (
          signalDrivers.length > 0 && (
            <OutcomesTier
              title="The bedside signals it protects"
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
        </div>
        <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Quality" />
        </div>

        <div className="flex justify-end mt-[30px]">
          <button
            type="button"
            onClick={onNext}
            data-testid="button-ed-quality-continue"
            className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)]"
          >
            Continue →
          </button>
        </div>
      </div>
    </EditorialShell>
  );
}

export default function EdQuality({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: EdQualityProps) {
  const setting = state.careSetting;

  if (setting === "nursing") {
    return <NursingQualityScreen state={state} updateState={updateState} totalHoursSaved={totalHoursSaved} onNext={onNext} onBack={onBack} onHome={onHome} />;
  }

  if (setting === "outpatient" || setting === "ed" || setting === "inpatient") {
    return <ProofChainScreen state={state} totalHoursSaved={totalHoursSaved} onNext={onNext} onBack={onBack} onHome={onHome} setting={setting} />;
  }

  return (
    <EditorialShell>
      <EditorialHeader stepName="Quality" stepIndex={7} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-11 pb-[60px]">
        <p className="text-[15px] text-[#565250]">Pick a care setting first.</p>
      </div>
    </EditorialShell>
  );
}
