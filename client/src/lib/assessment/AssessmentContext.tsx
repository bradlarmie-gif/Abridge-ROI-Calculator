import { createContext, useContext, useReducer, useMemo, type ReactNode } from "react";
import type { AssessmentState } from "./assessmentTypes";
import { DEFAULT_ASSESSMENT_STATE } from "./assessmentTypes";
import type { AssessmentAction } from "./assessmentActions";
import { assessmentReducer } from "./assessmentReducer";
import { calculateSwitchGap, type SwitchCalculations } from "@/lib/switchGapCalculator";

interface AssessmentContextValue {
  state: AssessmentState;
  dispatch: React.Dispatch<AssessmentAction>;
  calculations: SwitchCalculations;
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

interface AssessmentProviderProps {
  children: ReactNode;
  initialState?: Partial<AssessmentState>;
}

export function AssessmentProvider({ children, initialState }: AssessmentProviderProps) {
  const mergedInitial: AssessmentState = initialState
    ? {
        ...DEFAULT_ASSESSMENT_STATE,
        ...initialState,
        navigation: {
          ...DEFAULT_ASSESSMENT_STATE.navigation,
          ...(initialState.navigation || {}),
        },
        inputs: {
          ...DEFAULT_ASSESSMENT_STATE.inputs,
          ...(initialState.inputs || {}),
        },
        pillarsMeta: {
          ...DEFAULT_ASSESSMENT_STATE.pillarsMeta,
          ...(initialState.pillarsMeta || {}),
        },
      }
    : DEFAULT_ASSESSMENT_STATE;

  const [state, dispatch] = useReducer(assessmentReducer, mergedInitial);

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...state.inputs,
      providers: state.inputs.providers || 75,
      annualEncounters: state.inputs.annualEncounters || 150000,
      currentCostPerProvider: state.inputs.currentCostPerProvider || 200,
    });
  }, [state.inputs]);

  const value = useMemo(
    () => ({ state, dispatch, calculations }),
    [state, dispatch, calculations]
  );

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment(): AssessmentContextValue {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error("useAssessment must be used within an AssessmentProvider");
  }
  return context;
}
