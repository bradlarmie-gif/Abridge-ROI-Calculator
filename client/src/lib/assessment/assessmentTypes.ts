import type { SwitchInputs, SwitchCalculations, SolutionType } from "@/lib/switchGapCalculator";

export type AssessmentFlowPhase = "path-selection" | "ambient-flow" | "scribe-assessment" | "scribe-analysis";

export interface AssessmentNavigation {
  flowPhase: AssessmentFlowPhase;
  currentStep: number;
  completedSteps: number[];
  showLoadingOverlay: boolean;
}

export interface AssessmentState {
  navigation: AssessmentNavigation;
  inputs: SwitchInputs;
  pillarInputs: {
    // Future 4-pillar inputs will be added here
    // Each pillar will have its own typed sub-object
  };
}

export const DEFAULT_SWITCH_INPUTS: SwitchInputs = {
  solution: "ambient-ai" as SolutionType,
  providers: 0,
  annualEncounters: 0,
  currentCostPerProvider: 200,
  specialtyMix: "balanced",
  utilization: 0,
  timeSavedPerEncounter: 0,
  editTimePerEncounter: 0,
  docCompleteness: 0,
  wrvuLift: 0,
  satisfaction: 0,
  afterHoursPerWeek: 0,
};

export const DEFAULT_ASSESSMENT_STATE: AssessmentState = {
  navigation: {
    flowPhase: "path-selection",
    currentStep: 1,
    completedSteps: [],
    showLoadingOverlay: false,
  },
  inputs: { ...DEFAULT_SWITCH_INPUTS },
  pillarInputs: {},
};

export type { SwitchInputs, SwitchCalculations };
