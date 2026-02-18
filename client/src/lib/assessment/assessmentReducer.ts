import type { AssessmentState } from "./assessmentTypes";
import { DEFAULT_ASSESSMENT_STATE } from "./assessmentTypes";
import type { AssessmentAction } from "./assessmentActions";

export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case "UPDATE_INPUT":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          [action.key]: action.value,
        },
      };

    case "SET_INPUTS":
      return {
        ...state,
        inputs: action.inputs,
      };

    case "SET_STEP":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          currentStep: action.step,
        },
      };

    case "COMPLETE_STEP": {
      const alreadyCompleted = state.navigation.completedSteps.includes(action.step);
      return {
        ...state,
        navigation: {
          ...state.navigation,
          completedSteps: alreadyCompleted
            ? state.navigation.completedSteps
            : [...state.navigation.completedSteps, action.step],
        },
      };
    }

    case "NAVIGATE_PHASE":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          flowPhase: action.phase,
        },
      };

    case "SHOW_LOADING":
      return {
        ...state,
        navigation: {
          ...state.navigation,
          showLoadingOverlay: action.show,
        },
      };

    case "RESET":
      return { ...DEFAULT_ASSESSMENT_STATE };

    default:
      return state;
  }
}
