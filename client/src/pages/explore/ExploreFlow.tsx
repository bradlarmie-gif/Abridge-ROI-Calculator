import { useState, useCallback } from "react";
import ExploreCareSettings from "./ExploreCareSettings";
import ExploreOpportunity from "./ExploreOpportunity";
import ExploreTimePath from "./ExploreTimePath";
import ExploreTimeAllocation from "./ExploreTimeAllocation";
import ExploreDocDrivers from "./ExploreDocDrivers";

export type ExploreCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export type TimePathScenario = 'conservative' | 'typical' | 'aggressive';

export type TimeAllocationFocus = 'patientAccess' | 'reducingLocums' | 'clinicianWellbeing';

// ED-specific time allocation types
export type EDTimeAllocationFocus = 'throughput' | 'retention' | 'clinicianWellbeing';

export type DocPathFocus = 'wrvu' | 'hcc' | 'denials';

export interface TimeAllocation {
  patientAccess: number;
  reducingLocums: number;
  clinicianWellbeing: number;
}

// ED-specific time allocation
export interface EDTimeAllocation {
  throughput: number;  // LWBS reduction / patient throughput
  retention: number;   // Physician retention
  clinicianWellbeing: number;
}

export interface DocDriverSettings {
  enabled: boolean;
  value: number;
}

export interface DocDriversState {
  wrvu: DocDriverSettings;
  hcc: DocDriverSettings;
  denials: DocDriverSettings;
}

export interface ExploreState {
  careSetting: ExploreCareSetting | null;
  
  numberOfProviders: number;
  annualEncounters: number;
  utilizationPercent: number;
  
  timePathScenario: TimePathScenario;
  minutesSavedPerEncounter: number;
  
  // Outpatient time allocation
  timeAllocation: TimeAllocation;
  
  // ED-specific time allocation
  edTimeAllocation: EDTimeAllocation;
  
  docPathFocus: DocPathFocus | null; // Keep for backwards compat
  docDrivers: DocDriversState;
  
  wrvuPctIncrease: number;
  hccPctRecaptured: number;
  denialsPctReduced: number;
}

export const DEFAULT_EXPLORE_STATE: ExploreState = {
  careSetting: null,
  numberOfProviders: 0,
  annualEncounters: 0,
  utilizationPercent: 70,
  timePathScenario: 'typical',
  minutesSavedPerEncounter: 3,
  timeAllocation: {
    patientAccess: 50,
    reducingLocums: 0,
    clinicianWellbeing: 50,
  },
  edTimeAllocation: {
    throughput: 50,
    retention: 25,
    clinicianWellbeing: 25,
  },
  docPathFocus: null,
  docDrivers: {
    wrvu: { enabled: false, value: 2 },
    hcc: { enabled: false, value: 15 },
    denials: { enabled: false, value: 25 },
  },
  wrvuPctIncrease: 2,
  hccPctRecaptured: 15,
  denialsPctReduced: 25,
};

type ExplorePhase = 
  | 'careSetting' 
  | 'opportunity' 
  | 'timePath' 
  | 'timeAllocation' 
  | 'docDrivers';

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
          onNext={() => navigate('docDrivers')}
          onBack={() => navigate('timePath')}
          onHome={goHome}
        />
      );
    
    case 'docDrivers':
      return (
        <ExploreDocDrivers
          state={state}
          updateState={updateState}
          totalHoursSaved={calculateTotalHoursSaved()}
          onNext={handleContinueToInvestment}
          onBack={() => navigate('timeAllocation')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}

export { ExploreFlow };
