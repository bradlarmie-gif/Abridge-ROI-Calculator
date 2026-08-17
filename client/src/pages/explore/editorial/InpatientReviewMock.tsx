import ExploreFlow, { DEFAULT_EXPLORE_STATE, type ExploreState } from "../ExploreFlow";

/**
 * THROWAWAY (?inpatientmock=1). Drops you into the REAL inpatient Explore path,
 * pre-filled with sample numbers, so every screen is populated and walkable for
 * review/comment (no data entry, no half-empty screens). Starts at Practice;
 * hit Back to see the care-setting step. Delete after the redesign.
 */
const SAMPLE: ExploreState = {
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
  // Pre-enable the counted drivers so the driver screens render populated for review.
  docQualityInputs: {
    ...DEFAULT_EXPLORE_STATE.docQualityInputs,
    ipDrgEnabled: true,
    ipDrgExpanded: true,
    ipObsDefenseEnabled: true,
    ipObsDefenseExpanded: true,
  },
  retentionMode: "counted",
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

export default function InpatientReviewMock() {
  // ?inpatientmock=1&step=timeSavings jumps straight to a given phase for review.
  const step = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("step") || undefined
    : undefined;
  return (
    <ExploreFlow
      editorial
      initialExploreState={SAMPLE}
      initialCareSetting="inpatient"
      initialPhase={step as any}
      onBackToJourney={() => { if (typeof window !== "undefined") window.location.href = "/?hub=1"; }}
    />
  );
}
