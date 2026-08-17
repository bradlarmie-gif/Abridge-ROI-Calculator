import ExploreFlow, { DEFAULT_EXPLORE_STATE, type ExploreState, type ExploreCareSetting } from "../ExploreFlow";

/**
 * THROWAWAY review harness. Drops you into a REAL Explore path pre-filled with
 * sample numbers so every driver screen renders populated and walkable for
 * review/comment (no data entry, no half-empty screens). Delete after the redesign.
 *
 *   ?inpatientmock=1   → inpatient (original entry point, still works)
 *   ?mock=inpatient    → inpatient
 *   ?mock=nursing      → nursing
 *   &step=<phase>      → jump straight to a phase (e.g. capacity, workforce)
 */
const INPATIENT_SAMPLE: ExploreState = {
  ...DEFAULT_EXPLORE_STATE,
  careSetting: "inpatient",
  numberOfProviders: 60,
  encountersPerProvider: 400,
  annualEncounters: 24000,
  utilizationPercent: 70,
  inpatientHpMinutes: 12,
  inpatientProgressMinutes: 3,
  inpatientConsultsEnabled: true,
  inpatientConsultMinutes: 3,
  inpatientAlos: 4.5,
  minutesSavedPerEncounter: 25.5,
  timePathScenario: "typical",
  docQualityInputs: {
    ...DEFAULT_EXPLORE_STATE.docQualityInputs,
    ipDrgEnabled: true,
    ipDrgExpanded: true,
    ipObsDefenseEnabled: true,
    ipObsDefenseExpanded: true,
  },
  retentionMode: "counted",
  costPerProvider: 500,
  timeDriverInputs: {
    ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
    ipIncrementalStaffingEnabled: true,
    ipIncrementalStaffingExpanded: true,
    ipStaffingCurrentSpend: 500000,
    wellbeingEnabled: true,
    wellbeingExpanded: true,
    calculateRetentionValue: true,
  },
};

const NURSING_SAMPLE: ExploreState = {
  ...DEFAULT_EXPLORE_STATE,
  careSetting: "nursing",
  numberOfProviders: 200, // nurses
  nursingStaffedBeds: 300,
  nursingOccupancyRate: 85,
  retentionMode: "counted",
  timeDriverInputs: {
    ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
    nursingOtEnabled: true,
    nursingOtExpanded: true,
    nursingRetentionEnabled: true,
    nursingRetentionExpanded: true,
    calculateRetentionValue: true,
    nursingAgencyEnabled: true,
    nursingAgencyExpanded: true,
    nursingCareTimeEnabled: true,
    nursingCdiResponseEnabled: true,
    nursingDocCompletionEnabled: true,
  },
  docQualityInputs: {
    ...DEFAULT_EXPLORE_STATE.docQualityInputs,
    nursingHapiEnabled: true,
    nursingHapiExpanded: true,
    nursingFallsEnabled: true,
    nursingFallsExpanded: true,
    nursingCautiEnabled: true,
    nursingCautiExpanded: true,
    nursingClabsiEnabled: true,
    nursingClabsiExpanded: true,
    nursingSepsisEnabled: true,
    nursingSepsisExpanded: true,
  },
};

const OUTPATIENT_SAMPLE: ExploreState = {
  ...DEFAULT_EXPLORE_STATE,
  careSetting: "outpatient",
  numberOfProviders: 100,
  annualEncounters: 240000,
  utilizationPercent: 70,
  minutesSavedPerEncounter: 3, // so Patient Access (needs documentation time saved) computes
  timePathScenario: "typical",
  paymentModel: "both",
  retentionMode: "counted",
  timeDriverInputs: {
    ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
    patientAccessEnabled: true,
    patientAccessExpanded: true,
    wellbeingEnabled: true,
    wellbeingExpanded: true,
    calculateRetentionValue: true,
    physicianAgencyEnabled: true,
    physicianAgencyExpanded: true,
    scribeCostReductionEnabled: true,
    scribeCostReductionExpanded: true,
    scribeHeadcount: 8,
    scribePositionsEliminated: 6,
    scribeCostPerPosition: 45000,
    opCdiQueryTrendEnabled: true,
    opCareGapClosureRateEnabled: true,
    opHedisCompositeScoreEnabled: true,
    opMaStarsPerformanceEnabled: true,
  },
  docQualityInputs: {
    ...DEFAULT_EXPLORE_STATE.docQualityInputs,
    wrvuEnabled: true,
    wrvuExpanded: true,
    hccEnabled: true,
    hccExpanded: true,
    denialsEnabled: true,
    denialsExpanded: true,
    hccPlans: [{ ...DEFAULT_EXPLORE_STATE.docQualityInputs.hccPlans[0], panelSize: 300 }],
  },
};

export default function InpatientReviewMock() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const step = params.get("step") || undefined;
  // ?mock=<setting> wins; ?inpatientmock=1 keeps the original inpatient entry.
  const requested = (params.get("mock") || "inpatient") as ExploreCareSetting;
  const setting: ExploreCareSetting =
    requested === "nursing" ? "nursing" : requested === "outpatient" ? "outpatient" : "inpatient";
  const sample = setting === "nursing" ? NURSING_SAMPLE : setting === "outpatient" ? OUTPATIENT_SAMPLE : INPATIENT_SAMPLE;

  return (
    <ExploreFlow
      editorial
      initialExploreState={sample}
      initialCareSetting={setting}
      initialPhase={step as any}
      onBackToJourney={() => { if (typeof window !== "undefined") window.location.href = "/?hub=1"; }}
    />
  );
}
