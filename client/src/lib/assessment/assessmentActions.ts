import type { SwitchInputs } from "@/lib/switchGapCalculator";
import type { AssessmentFlowPhase } from "./assessmentTypes";

export type AssessmentAction =
  | { type: "UPDATE_INPUT"; key: keyof SwitchInputs; value: SwitchInputs[keyof SwitchInputs] }
  | { type: "SET_INPUTS"; inputs: SwitchInputs }
  | { type: "SET_STEP"; step: number }
  | { type: "COMPLETE_STEP"; step: number }
  | { type: "NAVIGATE_PHASE"; phase: AssessmentFlowPhase }
  | { type: "SHOW_LOADING"; show: boolean }
  | { type: "RESET" };

export const assessmentActions = {
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]): AssessmentAction => ({
    type: "UPDATE_INPUT",
    key,
    value,
  }),

  setInputs: (inputs: SwitchInputs): AssessmentAction => ({
    type: "SET_INPUTS",
    inputs,
  }),

  setStep: (step: number): AssessmentAction => ({
    type: "SET_STEP",
    step,
  }),

  completeStep: (step: number): AssessmentAction => ({
    type: "COMPLETE_STEP",
    step,
  }),

  navigatePhase: (phase: AssessmentFlowPhase): AssessmentAction => ({
    type: "NAVIGATE_PHASE",
    phase,
  }),

  showLoading: (show: boolean): AssessmentAction => ({
    type: "SHOW_LOADING",
    show,
  }),

  reset: (): AssessmentAction => ({
    type: "RESET",
  }),
};
