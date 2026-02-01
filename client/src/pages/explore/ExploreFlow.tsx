import { useState, useCallback } from "react";
import ExploreCareSettings from "./ExploreCareSettings";
import ExploreOpportunity from "./ExploreOpportunity";
import ExploreTimePath from "./ExploreTimePath";
import ExploreTimeAllocation from "./ExploreTimeAllocation";
import ExploreDocPath from "./ExploreDocPath";
import ExploreDocDrivers from "./ExploreDocDrivers";
import ExploreReview from "./ExploreReview";

export type ExploreCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export type TimePathScenario = 'conservative' | 'typical' | 'aggressive';

export type TimeAllocationFocus = 'patientAccess' | 'reducingLocums' | 'clinicianWellbeing';

export type DocPathFocus = 'wrvu' | 'hcc' | 'denials';

export interface TimeAllocation {
  patientAccess: number;
  reducingLocums: number;
  clinicianWellbeing: number;
}

export interface ExploreState {
  careSetting: ExploreCareSetting | null;
  
  numberOfProviders: number;
  annualEncounters: number;
  utilizationPercent: number;
  
  timePathScenario: TimePathScenario;
  minutesSavedPerEncounter: number;
  
  timeAllocation: TimeAllocation;
  
  docPathFocus: DocPathFocus | null;
  
  wrvuPctIncrease: number;
  hccPctRecaptured: number;
  denialsPctReduced: number;
}

export const DEFAULT_EXPLORE_STATE: ExploreState = {
  careSetting: null,
  numberOfProviders: 0,
  annualEncounters: 0,
  utilizationPercent: 75,
  timePathScenario: 'typical',
  minutesSavedPerEncounter: 3,
  timeAllocation: {
    patientAccess: 50,
    reducingLocums: 0,
    clinicianWellbeing: 50,
  },
  docPathFocus: null,
  wrvuPctIncrease: 2,
  hccPctRecaptured: 15,
  denialsPctReduced: 25,
};

type ExplorePhase = 
  | 'careSetting' 
  | 'opportunity' 
  | 'timePath' 
  | 'timeAllocation' 
  | 'docPath' 
  | 'docDrivers' 
  | 'review';

interface ExploreFlowProps {
  onBackToJourney?: () => void;
  onContinueToInvestment?: (state: ExploreState) => void;
}

export default function ExploreFlow({ onBackToJourney, onContinueToInvestment }: ExploreFlowProps) {
  const [phase, setPhase] = useState<ExplorePhase>('careSetting');
  const [state, setState] = useState<ExploreState>(DEFAULT_EXPLORE_STATE);

  const updateState = useCallback((updates: Partial<ExploreState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goHome = useCallback(() => {
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToJourney]);

  const navigate = useCallback((nextPhase: ExplorePhase) => {
    setPhase(nextPhase);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const calculateTotalHoursSaved = useCallback(() => {
    const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
    const totalMinutes = eligibleEncounters * state.minutesSavedPerEncounter;
    return Math.round(totalMinutes / 60);
  }, [state.annualEncounters, state.utilizationPercent, state.minutesSavedPerEncounter]);

  const handleContinueToInvestment = useCallback(() => {
    if (onContinueToInvestment) {
      onContinueToInvestment(state);
    }
  }, [state, onContinueToInvestment]);

  switch (phase) {
    case 'careSetting':
      return (
        <ExploreCareSettings
          selectedSetting={state.careSetting}
          onSelectSetting={(setting: ExploreCareSetting) => updateState({ careSetting: setting })}
          onNext={() => navigate('opportunity')}
          onBack={goHome}
          onHome={goHome}
        />
      );
    
    case 'opportunity':
      return (
        <ExploreOpportunity
          state={state}
          updateState={updateState}
          onNext={() => navigate('timePath')}
          onBack={() => navigate('careSetting')}
          onHome={goHome}
        />
      );
    
    case 'timePath':
      return (
        <ExploreTimePath
          state={state}
          updateState={updateState}
          onNext={() => navigate('timeAllocation')}
          onBack={() => navigate('opportunity')}
          onHome={goHome}
        />
      );
    
    case 'timeAllocation':
      return (
        <ExploreTimeAllocation
          state={state}
          updateState={updateState}
          totalHoursSaved={calculateTotalHoursSaved()}
          onNext={() => navigate('docPath')}
          onBack={() => navigate('timePath')}
          onHome={goHome}
        />
      );
    
    case 'docPath':
      return (
        <ExploreDocPath
          state={state}
          updateState={updateState}
          onNext={() => navigate('docDrivers')}
          onBack={() => navigate('timeAllocation')}
          onHome={goHome}
        />
      );
    
    case 'docDrivers':
      return (
        <ExploreDocDrivers
          state={state}
          updateState={updateState}
          totalHoursSaved={calculateTotalHoursSaved()}
          onNext={() => navigate('review')}
          onBack={() => navigate('docPath')}
          onHome={goHome}
        />
      );
    
    case 'review':
      return (
        <ExploreReview
          state={state}
          totalHoursSaved={calculateTotalHoursSaved()}
          onContinueToInvestment={handleContinueToInvestment}
          onBack={() => navigate('docDrivers')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}

export { ExploreFlow };
