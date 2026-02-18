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

    case "UPDATE_PILLAR_META":
      return {
        ...state,
        pillarsMeta: {
          ...state.pillarsMeta,
          [action.pillarId]: {
            ...state.pillarsMeta[action.pillarId],
            [action.field]: action.value,
          },
        },
      };

    case "SET_PRIMARY_PRESSURE": {
      const pressureRanks: Record<string, Record<string, "high" | "medium" | "low">> = {
        access:     { capacity: "high", workforce: "high", yield: "medium", risk: "low" },
        revenue:    { yield: "high", capacity: "high", risk: "medium", workforce: "low" },
        retention:  { workforce: "high", capacity: "medium", risk: "medium", yield: "low" },
        compliance: { risk: "high", yield: "medium", workforce: "medium", capacity: "low" },
        none:       { capacity: "medium", yield: "medium", workforce: "medium", risk: "medium" },
      };
      const ranks = pressureRanks[action.pressure] || pressureRanks.none;
      return {
        ...state,
        primaryPressure: action.pressure,
        pillarsMeta: {
          capacity:  { ...state.pillarsMeta.capacity,  pressure: ranks.capacity },
          yield:     { ...state.pillarsMeta.yield,     pressure: ranks.yield },
          workforce: { ...state.pillarsMeta.workforce, pressure: ranks.workforce },
          risk:      { ...state.pillarsMeta.risk,      pressure: ranks.risk },
        },
      };
    }

    case "RESET":
      return { ...DEFAULT_ASSESSMENT_STATE };

    default:
      return state;
  }
}
