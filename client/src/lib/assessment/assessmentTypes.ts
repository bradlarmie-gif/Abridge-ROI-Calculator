import type { SwitchInputs, SwitchCalculations, SolutionType } from "@/lib/switchGapCalculator";
import type { PillarId } from "@/lib/pillars/computePillars";

export type AssessmentFlowPhase = "path-selection" | "ambient-flow" | "scribe-assessment" | "scribe-analysis";

export type PressureLevel = "high" | "medium" | "low";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface PillarMeta {
  pressure: PressureLevel;
  confidence: ConfidenceLevel;
}

export type PillarMetaMap = Record<PillarId, PillarMeta>;

export interface AssessmentNavigation {
  flowPhase: AssessmentFlowPhase;
  currentStep: number;
  completedSteps: number[];
  showLoadingOverlay: boolean;
}

export type PrimaryPressure = "access" | "revenue" | "retention" | "compliance" | "none";

export interface AssessmentState {
  navigation: AssessmentNavigation;
  inputs: SwitchInputs;
  pillarsMeta: PillarMetaMap;
  primaryPressure: PrimaryPressure;
}

export const DEFAULT_PILLAR_META: PillarMeta = {
  pressure: "medium",
  confidence: "medium",
};

export const DEFAULT_PILLARS_META: PillarMetaMap = {
  capacity: { ...DEFAULT_PILLAR_META },
  yield: { ...DEFAULT_PILLAR_META },
  workforce: { ...DEFAULT_PILLAR_META },
  risk: { ...DEFAULT_PILLAR_META },
};

export const DEFAULT_SWITCH_INPUTS: SwitchInputs = {
  solution: "ambient-ai" as SolutionType,
  providers: 0,
  annualEncounters: 0,
  currentCostPerProvider: 200,
  specialtyMix: "balanced",
  careSetting: "outpatient",
  dataMode: "benchmark",
  currentVendor: "none",
  encountersEstimated: false,
  confidenceBaseline: 0.55,
  utilization: 0,
  timeSavedPerEncounter: 0,
  editTimePerEncounter: 0,
  docCompleteness: 0,
  wrvuLift: 0,
  satisfaction: 0,
  afterHoursPerWeek: 0,
  deployIntent: "not-sure",
  yieldUpliftPercent: 0,
  ffsSharePercent: 70,
  afterHoursCharting: 2,
  turnoverRisk: "medium" as const,
  overtimeSensitivity: "some" as const,
  scribeReliance: "none" as const,
  docDefensibility: "medium" as const,
  qualityReportingFriction: "manageable" as const,
  structuredDataUsability: "some" as const,
};

export const DEFAULT_ASSESSMENT_STATE: AssessmentState = {
  navigation: {
    flowPhase: "path-selection",
    currentStep: 1,
    completedSteps: [],
    showLoadingOverlay: false,
  },
  inputs: { ...DEFAULT_SWITCH_INPUTS },
  pillarsMeta: { ...DEFAULT_PILLARS_META },
  primaryPressure: "none" as PrimaryPressure,
};

export type { SwitchInputs, SwitchCalculations };
