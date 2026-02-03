import { useState, useCallback, useEffect } from "react";
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
  patientExperience: number;
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

// Pre-calculated values from wizard steps to pass to Investment page
export interface CalculatedValues {
  timeValue: number;
  docValue: number;
  driverBreakdown: {
    patientAccess: number;
    locums: number;
    retention: number;
    wrvu: number;
    hcc: number;
    denials: number;
  };
}

// Nursing-specific types
// NursingUnitType removed - no longer used in setup

export interface ExploreState {
  careSetting: ExploreCareSetting | null;
  
  numberOfProviders: number;
  annualEncounters: number;
  utilizationPercent: number;
  
  // Nursing-specific fields (per-shift model)
  nursingStaffedBeds: number;
  nursingOccupancyRate: number; // Bed occupancy rate (default 85%)
  nursingShiftsPerNurseYear: number; // Default 156 (3 shifts/week × 52 weeks)
  nursingMinutesPerShift: number; // Time saved per shift (15/30/45)
  
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
  
  // Pre-calculated values from wizard (set by ExploreDocDrivers before continuing)
  calculatedValues?: CalculatedValues;
}

export const DEFAULT_EXPLORE_STATE: ExploreState = {
  careSetting: null,
  numberOfProviders: 0,
  annualEncounters: 0,
  utilizationPercent: 70,
  // Nursing-specific defaults
  nursingStaffedBeds: 0,
  nursingOccupancyRate: 85, // Most hospitals run 75-90%
  nursingShiftsPerNurseYear: 156, // 3 shifts/week × 52 weeks
  nursingMinutesPerShift: 30, // Typical: 30 min/shift
  timePathScenario: 'typical',
  minutesSavedPerEncounter: 5,
  timeAllocation: {
    patientAccess: 40,
    patientExperience: 30,
    reducingLocums: 0,
    clinicianWellbeing: 30,
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

  // Handle browser back button within explore flow
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Only handle explore phase if we're still in explore view
      if (event.state?.view === 'explore' && event.state?.explorePhase) {
        setPhase(event.state.explorePhase);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Initialize with current phase (preserve view state)
    const currentState = window.history.state || {};
    if (!currentState.explorePhase || currentState.view !== 'explore') {
      window.history.replaceState({ 
        ...currentState, 
        view: 'explore',
        explorePhase: phase 
      }, '');
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Register once

  const goHome = useCallback(() => {
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToJourney]);

  const navigate = useCallback((nextPhase: ExplorePhase) => {
    setPhase(nextPhase);
    // Push browser history with both view and phase for consistent state
    window.history.pushState({ 
      view: 'explore', 
      explorePhase: nextPhase 
    }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const calculateTotalHoursSaved = useCallback(() => {
    const isNursing = state.careSetting === 'nursing';
    
    if (isNursing) {
      // Nursing uses per-shift model
      const totalShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
      const eligibleShifts = totalShiftsPerYear * (state.utilizationPercent / 100);
      const totalMinutes = eligibleShifts * state.nursingMinutesPerShift;
      return Math.round(totalMinutes / 60);
    } else {
      // Other care settings use per-encounter model
      const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
      const totalMinutes = eligibleEncounters * state.minutesSavedPerEncounter;
      return Math.round(totalMinutes / 60);
    }
  }, [state.careSetting, state.annualEncounters, state.utilizationPercent, state.minutesSavedPerEncounter, state.numberOfProviders, state.nursingShiftsPerNurseYear, state.nursingMinutesPerShift]);

  const handleContinueToInvestment = useCallback((calculatedValues?: CalculatedValues) => {
    if (onContinueToInvestment) {
      // Pass state with calculated values merged in synchronously
      const stateWithValues: ExploreState = {
        ...state,
        calculatedValues: calculatedValues || state.calculatedValues,
      };
      onContinueToInvestment(stateWithValues);
    }
  }, [state, onContinueToInvestment]);

  switch (phase) {
    case 'careSetting':
      return (
        <ExploreCareSettings
          selectedSetting={state.careSetting}
          onSelectSetting={(setting: ExploreCareSetting) => {
            // When switching to ED, disable HCC since it's not applicable
            // For inpatient, reset drivers to inpatient defaults
            if (setting === 'ed') {
              updateState({ 
                careSetting: setting,
                docDrivers: {
                  ...state.docDrivers,
                  hcc: { enabled: false, value: state.docDrivers.hcc.value }
                }
              });
            } else if (setting === 'inpatient') {
              // Inpatient uses CC/MCC (wrvu slot), CDI (hcc slot), and denials
              updateState({ 
                careSetting: setting,
                // Set inpatient-appropriate default values
                minutesSavedPerEncounter: 10, // Higher per-admission savings
                timeAllocation: {
                  patientAccess: 30,
                  patientExperience: 0, // Not used in inpatient
                  reducingLocums: 40,
                  clinicianWellbeing: 30,
                },
                docDrivers: {
                  wrvu: { enabled: false, value: 5 }, // CC/MCC capture
                  hcc: { enabled: false, value: 30 },  // CDI query reduction
                  denials: { enabled: false, value: 25 }
                }
              });
            } else if (setting === 'nursing') {
              // Nursing uses Care Plan Compliance (wrvu slot), Care Coordination (hcc slot), and Regulatory Compliance
              updateState({ 
                careSetting: setting,
                // Set nursing-appropriate default values
                minutesSavedPerEncounter: 20, // Higher per-patient savings for nursing
                timeAllocation: {
                  patientAccess: 35, // Direct Patient Care
                  patientExperience: 0, // Not used in nursing
                  reducingLocums: 35, // Nurse Retention
                  clinicianWellbeing: 30, // Wellbeing
                },
                docDrivers: {
                  wrvu: { enabled: false, value: 20 }, // Care Plan Compliance
                  hcc: { enabled: false, value: 25 },  // Care Coordination
                  denials: { enabled: false, value: 30 } // Regulatory Compliance
                }
              });
            } else {
              updateState({ careSetting: setting });
            }
          }}
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
          onNext={() => {
            // Nursing skips Documentation Quality and goes directly to Investment
            if (state.careSetting === 'nursing') {
              handleContinueToInvestment();
            } else {
              navigate('docDrivers');
            }
          }}
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
