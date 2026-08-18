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
import { InlineDriverCard, EqNum, EqCarried, EqOp, EqResult, EquationRow, EqAwaiting } from "./InlineEquation";
import { formatCurrency, formatNum, formatNum1 } from "./EdValueScreenKit";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";
import DriverLedger, { type LedgerRow } from "./DriverLedger";
import { buildInpatientLedger, buildDriverLedger } from "./driverLedgerData";
import { MathCascade } from "./MathCascade";

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
    ed: ["edNoteCompleteness", "edCoreMeasureDocRate", "edSepsisBundle", "edPatientExperience"],
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
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 7 of 9</div>
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

        <p className="text-[14px] text-[#565250] leading-[1.55] mb-[20px] max-w-[640px]">
          <b className="text-[#1A1A1A]">{copy.root.split(".")[0]}.</b> {copy.root.split(".").slice(1).join(".").trim()}
        </p>

        <div className="flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F] mb-2.5">
          How the proof builds <span className="flex-1 h-px bg-gradient-to-r from-[#E7E3DD] to-[#EDE7DD]" /> months → next year
        </div>

        <div className="flex items-stretch flex-wrap gap-x-3 gap-y-4" data-testid="proof-chain">
          {drivers.map((d, i) => {
            const copyEntry = CHAIN_COPY[d.id] ?? { metric: d.label, sub: d.tagline ?? "" };
            const isLast = i === drivers.length - 1;
            return (
              // No connector arrows: they dangle into empty space when cards wrap
              // to a new row. The ascending timing badges carry the sequence.
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
              </div>
            );
          })}
        </div>

        <p className="text-[12.5px] text-[#7C766F] leading-[1.5] mt-5 max-w-[640px] italic">
          No dollar here, on purpose. Abridge doesn&apos;t change your scores; anything financial is counted once, in Revenue.
        </p>
        </div>
        <div className="flex flex-col gap-5">
          <ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Quality" />
          <div className="flex justify-end">
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
  const valueFor = (key: string) => engine[key] ?? 0;
  const gate = (driverId: string) => {
    const r = driverScaleReadiness(driverId, state, totalHoursSaved);
    return r.ready ? undefined : r.need;
  };

  const ledger = buildDriverLedger(state, totalHoursSaved, "Quality", "nursing");

  // HAPI
  const hapiEvents = (patientDays / 1000) * dq.nursingHapiRate;
  const hapiPrevented = hapiEvents * (dq.nursingHapiPreventionRate / 100);
  // Falls
  const fallsEvents = (patientDays / 1000) * dq.nursingFallsRate;
  const fallsPrevented = fallsEvents * (dq.nursingFallsPreventionRate / 100);
  // CAUTI
  const cautiCathDays = patientDays * (dq.nursingCautiUtilizationRatio / 100);
  const cautiEvents = (cautiCathDays / 1000) * dq.nursingCautiRate;
  const cautiPrevented = cautiEvents * (dq.nursingCautiPreventionRate / 100);
  // CLABSI
  const clabsiLineDays = patientDays * (dq.nursingClabsiUtilizationRatio / 100);
  const clabsiEvents = (clabsiLineDays / 1000) * dq.nursingClabsiRate;
  const clabsiPrevented = clabsiEvents * (dq.nursingClabsiPreventionRate / 100);
  // Sepsis
  const sepsisEvents = (patientDays / 1000) * dq.nursingSepsisRatePerThousand;
  const sepsisGap = Math.max(0, 100 - dq.nursingSepsisCurrentCompliance);
  const sepsisNonComp = sepsisEvents * (sepsisGap / 100);
  const sepsisDocLag = sepsisNonComp * (dq.nursingSepsisDocLagPercent / 100);
  const sepsisPrevented = sepsisDocLag * (dq.nursingSepsisRealization / 100);

  const rows: LedgerRow[] = [
    {
      id: "nursingHapi",
      label: "HAPI Prevention",
      kind: "counted",
      mechanism:
        "Real-time Braden scores and turning events documented at the point of care let protocols act before a pressure injury progresses.",
      enabled: Boolean(dq.nursingHapiEnabled),
      onToggle: () => {
        const current = Boolean(dq.nursingHapiEnabled);
        updateDq(current ? { nursingHapiEnabled: false } : { nursingHapiEnabled: true, nursingHapiExpanded: true });
      },
      amount: valueFor("nursingHapi") > 0 ? valueFor("nursingHapi") : undefined,
      awaiting: gate("nursingHapi"),
      expanded: Boolean(dq.nursingHapiExpanded),
      onToggleExpand: () => updateDq({ nursingHapiExpanded: !dq.nursingHapiExpanded }),
      levers: (
        <MathCascade
          steps={[
            { label: "Patient days a year", running: formatNum(patientDays) },
            { label: "HAPIs per 1,000 patient days", factor: { value: dq.nursingHapiRate, onChange: (v: number) => updateDq({ nursingHapiRate: v }), suffix: "/1k", decimal: true }, running: `${formatNum1(hapiEvents)} events` },
            { label: "Prevented with complete documentation", factor: { value: dq.nursingHapiPreventionRate, onChange: (v: number) => updateDq({ nursingHapiPreventionRate: v }), suffix: "%", decimal: true }, running: `${formatNum1(hapiPrevented)} prevented` },
            { label: "Cost per HAPI", factor: { value: dq.nursingHapiCost, onChange: (v: number) => updateDq({ nursingHapiCost: v }), prefix: "$" }, running: formatCurrency(valueFor("nursingHapi")), final: true },
          ]}
        />
      ),
    },
    {
      id: "nursingFalls",
      label: "Falls Prevention",
      kind: "counted",
      mechanism: "Protocols act on a current Morse score instead of a stale one.",
      enabled: Boolean(dq.nursingFallsEnabled),
      onToggle: () => {
        const current = Boolean(dq.nursingFallsEnabled);
        updateDq(current ? { nursingFallsEnabled: false } : { nursingFallsEnabled: true, nursingFallsExpanded: true });
      },
      amount: valueFor("nursingFalls") > 0 ? valueFor("nursingFalls") : undefined,
      awaiting: gate("nursingFalls"),
      expanded: Boolean(dq.nursingFallsExpanded),
      onToggleExpand: () => updateDq({ nursingFallsExpanded: !dq.nursingFallsExpanded }),
      levers: (
        <MathCascade
          steps={[
            { label: "Patient days a year", running: formatNum(patientDays) },
            { label: "Falls per 1,000 patient days", factor: { value: dq.nursingFallsRate, onChange: (v: number) => updateDq({ nursingFallsRate: v }), suffix: "/1k", decimal: true }, running: `${formatNum1(fallsEvents)} events` },
            { label: "Prevented with complete documentation", factor: { value: dq.nursingFallsPreventionRate, onChange: (v: number) => updateDq({ nursingFallsPreventionRate: v }), suffix: "%", decimal: true }, running: `${formatNum1(fallsPrevented)} prevented` },
            { label: "Cost per fall", factor: { value: dq.nursingFallsCost, onChange: (v: number) => updateDq({ nursingFallsCost: v }), prefix: "$" }, running: formatCurrency(valueFor("nursingFalls")), final: true },
          ]}
        />
      ),
    },
    {
      id: "nursingCauti",
      label: "CAUTI Prevention",
      kind: "counted",
      mechanism:
        "Each point-of-care necessity review is the timestamped prompt to pull the catheter. Every catheter day avoided is one fewer chance for a CAUTI.",
      enabled: Boolean(dq.nursingCautiEnabled),
      onToggle: () => {
        const current = Boolean(dq.nursingCautiEnabled);
        updateDq(current ? { nursingCautiEnabled: false } : { nursingCautiEnabled: true, nursingCautiExpanded: true });
      },
      amount: valueFor("nursingCauti") > 0 ? valueFor("nursingCauti") : undefined,
      awaiting: gate("nursingCauti"),
      expanded: Boolean(dq.nursingCautiExpanded),
      onToggleExpand: () => updateDq({ nursingCautiExpanded: !dq.nursingCautiExpanded }),
      levers: (
        <MathCascade
          steps={[
            { label: "Patient days a year", running: formatNum(patientDays) },
            { label: "On a urinary catheter", factor: { value: dq.nursingCautiUtilizationRatio, onChange: (v: number) => updateDq({ nursingCautiUtilizationRatio: v }), suffix: "%" }, running: `${formatNum(cautiCathDays)} cath-days` },
            { label: "CAUTIs per 1,000 catheter days", factor: { value: dq.nursingCautiRate, onChange: (v: number) => updateDq({ nursingCautiRate: v }), suffix: "/1k", decimal: true }, running: `${formatNum1(cautiEvents)} events` },
            { label: "Prevented via each necessity review", factor: { value: dq.nursingCautiPreventionRate, onChange: (v: number) => updateDq({ nursingCautiPreventionRate: v }), suffix: "%", decimal: true }, running: `${formatNum1(cautiPrevented)} prevented` },
            { label: "Cost per CAUTI", factor: { value: dq.nursingCautiCost, onChange: (v: number) => updateDq({ nursingCautiCost: v }), prefix: "$" }, running: formatCurrency(valueFor("nursingCauti")), final: true },
          ]}
        />
      ),
    },
    {
      id: "nursingClabsi",
      label: "CLABSI Prevention",
      kind: "counted",
      mechanism:
        "Bundle compliance is scored from timestamps. A central line reviewed and documented at the point of care is one fewer chance for a CLABSI.",
      enabled: Boolean(dq.nursingClabsiEnabled),
      onToggle: () => {
        const current = Boolean(dq.nursingClabsiEnabled);
        updateDq(current ? { nursingClabsiEnabled: false } : { nursingClabsiEnabled: true, nursingClabsiExpanded: true });
      },
      amount: valueFor("nursingClabsi") > 0 ? valueFor("nursingClabsi") : undefined,
      awaiting: gate("nursingClabsi"),
      expanded: Boolean(dq.nursingClabsiExpanded),
      onToggleExpand: () => updateDq({ nursingClabsiExpanded: !dq.nursingClabsiExpanded }),
      levers: (
        <MathCascade
          steps={[
            { label: "Patient days a year", running: formatNum(patientDays) },
            { label: "On a central line", factor: { value: dq.nursingClabsiUtilizationRatio, onChange: (v: number) => updateDq({ nursingClabsiUtilizationRatio: v }), suffix: "%" }, running: `${formatNum(clabsiLineDays)} line-days` },
            { label: "CLABSIs per 1,000 line days", factor: { value: dq.nursingClabsiRate, onChange: (v: number) => updateDq({ nursingClabsiRate: v }), suffix: "/1k", decimal: true }, running: `${formatNum1(clabsiEvents)} events` },
            { label: "Prevented with complete documentation", factor: { value: dq.nursingClabsiPreventionRate, onChange: (v: number) => updateDq({ nursingClabsiPreventionRate: v }), suffix: "%", decimal: true }, running: `${formatNum1(clabsiPrevented)} prevented` },
            { label: "Cost per CLABSI", factor: { value: dq.nursingClabsiCost, onChange: (v: number) => updateDq({ nursingClabsiCost: v }), prefix: "$" }, running: formatCurrency(valueFor("nursingClabsi")), final: true },
          ]}
        />
      ),
    },
    {
      id: "nursingSepsis",
      label: "Sepsis Bundle Compliance",
      kind: "counted",
      mechanism:
        "SEP-1 is scored on timestamps. When bundle elements are documented as they happen, cases that would read non-compliant on a documentation lag stay in compliance.",
      enabled: Boolean(dq.nursingSepsisEnabled),
      onToggle: () => {
        const current = Boolean(dq.nursingSepsisEnabled);
        updateDq(current ? { nursingSepsisEnabled: false } : { nursingSepsisEnabled: true, nursingSepsisExpanded: true });
      },
      amount: valueFor("nursingSepsis") > 0 ? valueFor("nursingSepsis") : undefined,
      awaiting: gate("nursingSepsis"),
      expanded: Boolean(dq.nursingSepsisExpanded),
      onToggleExpand: () => updateDq({ nursingSepsisExpanded: !dq.nursingSepsisExpanded }),
      levers: (
        <MathCascade
          steps={[
            { label: "Patient days a year", running: formatNum(patientDays) },
            { label: "Sepsis cases per 1,000", factor: { value: dq.nursingSepsisRatePerThousand, onChange: (v: number) => updateDq({ nursingSepsisRatePerThousand: v }), suffix: "/1k", decimal: true }, running: `${formatNum1(sepsisEvents)} cases` },
            { label: "Current bundle compliance", factor: { value: dq.nursingSepsisCurrentCompliance, onChange: (v: number) => updateDq({ nursingSepsisCurrentCompliance: v }), suffix: "%" }, running: `${formatNum1(sepsisNonComp)} out of bundle`, note: "gap = 100 − compliance", pivot: true },
            { label: "Where documentation is the lag", factor: { value: dq.nursingSepsisDocLagPercent, onChange: (v: number) => updateDq({ nursingSepsisDocLagPercent: v }), suffix: "%" }, running: `${formatNum1(sepsisDocLag)} cases` },
            { label: "Realization", factor: { value: dq.nursingSepsisRealization, onChange: (v: number) => updateDq({ nursingSepsisRealization: v }), suffix: "%" }, running: `${formatNum1(sepsisPrevented)} prevented` },
            { label: "Excess cost per case", factor: { value: dq.nursingSepsisExcessCostPerCase, onChange: (v: number) => updateDq({ nursingSepsisExcessCostPerCase: v }), prefix: "$" }, running: formatCurrency(valueFor("nursingSepsis")), final: true },
          ]}
        />
      ),
    },
    {
      id: "nursingHcahps",
      label: "HCAHPS Nurse Communication",
      kind: "tracked",
      mechanism:
        "Time back at the bedside shows up in how patients rate their nursing care. We track it as proof, not a dollar.",
      signals: ["Nurse communication scores move", "More time with the patient, less with the keyboard"],
    },
    {
      id: "nursingEarlyDeterioration",
      label: "Early Deterioration Recognition",
      kind: "tracked",
      mechanism:
        "Current vitals and assessments documented in real time let escalation protocols act on the patient in front of you, not a stale chart.",
      signals: ["Rapid-response triggers fire on current data", "Rescue happens earlier"],
    },
  ];

  return (
    <DriverLedger
      eyebrow="Value Model · Step 7 of 9 · Quality"
      title="Where does nursing documentation prevent harm?"
      intro="Harm events are scored on timestamps. Documented in real time at the bedside, the same care that was delivered is the care that counts. Turn on only what you can stand behind; it adds to the ledger as you go."
      sectionLabel="The drivers · turn on what applies"
      rows={rows}
      ledgerGroups={ledger.groups}
      grandLabel="Model so far"
      grandValue={ledger.grandValue}
      grandCaption={ledger.grandCaption}
      stepName="Quality"
      stepIndex={7}
      isValid={true}
      onNext={onNext}
      onBack={onBack}
      onHome={onHome}
    />
  );
}

export default function EdQuality({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: EdQualityProps) {
  const setting = state.careSetting;

  if (setting === "nursing") {
    return <NursingQualityScreen state={state} updateState={updateState} totalHoursSaved={totalHoursSaved} onNext={onNext} onBack={onBack} onHome={onHome} />;
  }

  // ─── Inpatient V2 driver ledger ───
  // Quality is a non-financial proof layer: two tracked drivers, no dollar.
  if (setting === "inpatient") {
    const ledger = buildInpatientLedger(state, totalHoursSaved, "Quality");
    const rows: LedgerRow[] = [
      {
        id: "ipQualityFidelity",
        label: "Quality Reporting Accuracy",
        kind: "tracked",
        mechanism: "Acuity and comorbidities captured as they are assessed, so the risk-adjusted and quality measures you already report reflect the care you delivered. The dollar depends on your specific quality and payment program, so we track it, not price it here.",
        signals: ["Risk-adjusted performance is more accurate", "Quality reporting reflects true acuity"],
      },
      {
        id: "ipCareGaps",
        label: "Clinical Quality / Care Gaps",
        kind: "tracked",
        mechanism: "Abridge surfaces clinically important findings that an incomplete note can bury, so gaps get seen and acted on before they are missed.",
        signals: ["Care gaps surfaced at the point of care", "Documented findings lead to action"],
      },
    ];
    return (
      <DriverLedger
        eyebrow="Value Model · Step 7 of 9 · Quality"
        title="Where does the quality show up?"
        intro="Better inpatient notes make sure the acuity and care you delivered are reflected in the measures you already report. Abridge does not change the score; it keeps real care from being lost to an incomplete note."
        sectionLabel="The proof · tracked, not counted"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Quality"
        stepIndex={7}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── Outpatient V2 driver ledger ───
  // Quality is a non-financial proof layer: four tracked measures, no dollar.
  // The dollar quality touches is counted once, in Revenue (HCC / denials).
  if (setting === "outpatient") {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Quality", "outpatient");
    const rows: LedgerRow[] = [
      {
        id: "opCdiQueryTrend",
        label: "CDI Query Volume Trend",
        kind: "tracked",
        mechanism:
          "CDI queries go out when chronic-condition documentation lacks the specificity risk coding needs. Captured at the point of care, the specificity is there the first time, so fewer queries come back.",
        signals: ["CDI query volume falls", "Chronic conditions documented to specificity the first time"],
      },
      {
        id: "opCareGapClosureRate",
        label: "Care Gap Closure Rate",
        kind: "tracked",
        mechanism:
          "Preventive care that actually happened in the visit is recorded as done, so a gap that looked open is captured as closed.",
        signals: ["Care gaps recorded closed", "Documented preventive care matches what was delivered"],
      },
      {
        id: "opHedisCompositeScore",
        label: "HEDIS Composite Score",
        kind: "tracked",
        mechanism:
          "HEDIS is scored from claims and chart data. When the note reflects the care delivered, the year-end measure reflects it too.",
        signals: ["HEDIS reflects the care delivered", "Fewer visits lost to an incomplete note"],
      },
      {
        id: "opMaStarsPerformance",
        label: "MA STARS Performance",
        kind: "tracked",
        mechanism:
          "STARS runs on the same documented care, one measurement year later, so the accuracy you build today shows up in next year's rating.",
        signals: ["MA STARS reflects the documented care", "This year's documentation carries into next year's rating"],
      },
    ];
    return (
      <DriverLedger
        eyebrow="Value Model · Step 7 of 9 · Quality"
        title="Where does the quality show up?"
        intro="Quality scores are built from documentation. Capture the visit accurately and the scores reflect the care you delivered. We track these as proof, not a dollar; anything financial is counted once, in Revenue, through HCC and denials."
        sectionLabel="The proof · tracked, not counted"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Quality"
        stepIndex={7}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
  }

  // ─── ED V2 driver ledger ───
  // Quality is a non-financial proof layer: five tracked measures, no dollar.
  // Anything financial quality touches is counted once, in Revenue (E&M + denials).
  if (setting === "ed") {
    const ledger = buildDriverLedger(state, totalHoursSaved, "Quality", "ed");
    const rows: LedgerRow[] = [
      {
        id: "edCoreMeasureDocRate",
        label: "Core Measure Documentation Rate",
        kind: "tracked",
        mechanism:
          "Quality measures depend on the clinical action being documented with the required specificity. Captured as it happens, stroke, STEMI, and chest-pain pathway elements land on the chart instead of being reconstructed after the shift.",
        signals: ["Core measures document clean at the point of care", "Protocol adherence captured as it happens"],
      },
      {
        id: "edDocDeficiencyRate",
        label: "Documentation Deficiency Rate",
        kind: "tracked",
        mechanism:
          "Every deficiency is rework: the quality team finds it, routes it back, and the provider closes it days later. Completed at the point of care, fewer notes come back after the shift ends.",
        signals: ["Deficiency queue empties", "Fewer notes return for post-shift follow-up"],
      },
      {
        id: "edPatientExperience",
        label: "HCAHPS Physician Communication",
        kind: "tracked",
        mechanism:
          "The physician communication survey reflects whether the provider was present in the encounter or focused on the screen. Ambient capture shifts attention from the keyboard back to the patient in the room.",
        signals: ["Doctor communication scores move", "Attention shifts from the screen back to the patient"],
      },
      {
        id: "edNoteCompleteness",
        label: "Note Completeness Score",
        kind: "tracked",
        mechanism:
          "The ED note is the source document for coding, CDI queries on admission, and handoff. When HPI, MDM, and disposition rationale are captured while the encounter is open, the downstream metrics have something to stand on.",
        signals: ["Notes reach full completeness", "HPI, MDM, and disposition captured in the encounter"],
      },
      {
        id: "edSepsisBundle",
        label: "Sepsis Bundle Doc Rate (SEP-1)",
        kind: "tracked",
        mechanism:
          "SEP-1 requires each bundle element documented inside a strict time window. Missing one field reads as non-compliance even when the care was delivered. Real-time capture closes those gaps as they happen.",
        signals: ["SEP-1 bundle closes in time", "Time-sensitive elements land inside the CMS window"],
      },
    ];
    return (
      <DriverLedger
        eyebrow="Value Model · Step 7 of 9 · Quality"
        title="Where does the quality show up?"
        intro="Better ED notes make sure the care delivered is reflected in the measures you already report. Abridge does not change the score; it keeps a busy shift's care from being lost to an incomplete note. We track these as proof, not a dollar; anything financial is counted once, in Revenue."
        sectionLabel="The proof · tracked, not counted"
        rows={rows}
        ledgerGroups={ledger.groups}
        grandLabel="Model so far"
        grandValue={ledger.grandValue}
        grandCaption={ledger.grandCaption}
        stepName="Quality"
        stepIndex={7}
        isValid={true}
        onNext={onNext}
        onBack={onBack}
        onHome={onHome}
      />
    );
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
