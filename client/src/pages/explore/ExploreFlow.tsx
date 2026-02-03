import { useState, useCallback, useEffect, useMemo } from "react";
import ExploreCareSettings from "./ExploreCareSettings";
import ExplorePractice from "./ExplorePractice";
import ExploreTimeSavings from "./ExploreTimeSavings";
import ExploreValueDrivers from "./ExploreValueDrivers";
import ExploreDocQuality from "./ExploreDocQuality";
import ExploreInvestment from "./ExploreInvestment";
import ExploreModel from "./ExploreModel";

export type ExploreCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export type TimePathScenario = 'conservative' | 'typical' | 'aggressive';

export type TimeAllocationFocus = 'patientAccess' | 'reducingLocums' | 'clinicianWellbeing';

export type EDTimeAllocationFocus = 'throughput' | 'retention' | 'clinicianWellbeing';

export type DocPathFocus = 'wrvu' | 'hcc' | 'denials';

export interface TimeAllocation {
  patientAccess: number;
  patientExperience: number;
  reducingLocums: number;
  clinicianWellbeing: number;
}

export interface EDTimeAllocation {
  throughput: number;
  retention: number;
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

// Value Drivers - Time inputs
export interface TimeDriverInputs {
  patientAccessEnabled: boolean;
  capacityPercent: number;
  visitDuration: number;
  revenuePerVisit: number;
  
  costReductionEnabled: boolean;
  estimatedCostReduction: number;
  
  wellbeingEnabled: boolean;
  calculateRetentionValue: boolean;
  annualTurnoverRate: number;
  burnoutRelatedTurnover: number;
  replacementCost: number;
  retentionImpactScenario: 'conservative' | 'typical' | 'optimistic';
}

// Documentation Quality inputs
export interface DocQualityInputs {
  // wRVU
  wrvuEnabled: boolean;
  wrvuScenario: 'conservative' | 'typical' | 'aggressive';
  currentWrvu: number;
  conversionFactor: number;
  wrvuRealization: number;
  
  // HCC
  hccEnabled: boolean;
  hccScenario: 'conservative' | 'typical' | 'aggressive';
  panelSize: number;
  maPercent: number;
  gapRate: number;
  avgHccs: number;
  rafImpact: number;
  annualPayment: number;
  hccRealization: number;
  
  // Denials
  denialsEnabled: boolean;
  denialsScenario: 'conservative' | 'typical' | 'aggressive';
  denialRate: number;
  unappealableRate: number;
  avgClaimValue: number;
  denialsRealization: number;
}

export interface ExploreState {
  careSetting: ExploreCareSetting | null;
  
  numberOfProviders: number;
  annualEncounters: number;
  utilizationPercent: number;
  
  nursingStaffedBeds: number;
  nursingOccupancyRate: number;
  nursingShiftsPerNurseYear: number;
  nursingMinutesPerShift: number;
  
  timePathScenario: TimePathScenario;
  minutesSavedPerEncounter: number;
  
  timeAllocation: TimeAllocation;
  edTimeAllocation: EDTimeAllocation;
  
  docPathFocus: DocPathFocus | null;
  docDrivers: DocDriversState;
  
  wrvuPctIncrease: number;
  hccPctRecaptured: number;
  denialsPctReduced: number;
  
  // Time value driver inputs
  timeDriverInputs: TimeDriverInputs;
  
  // Documentation quality inputs
  docQualityInputs: DocQualityInputs;
  
  // Investment values
  pricingModel: 'perProvider' | 'annual';
  costPerProvider: number;
  annualLicenseFee: number;
  implementationFee: number;
  includeImplementation: boolean;
  
  // Full scale projection
  fullScaleProviders: number;
  
  // Calculated values
  calculatedValues?: CalculatedValues;
}

export const DEFAULT_EXPLORE_STATE: ExploreState = {
  careSetting: null,
  numberOfProviders: 0,
  annualEncounters: 0,
  utilizationPercent: 0,
  nursingStaffedBeds: 0,
  nursingOccupancyRate: 85,
  nursingShiftsPerNurseYear: 156,
  nursingMinutesPerShift: 30,
  timePathScenario: 'typical',
  minutesSavedPerEncounter: 4,
  timeAllocation: {
    patientAccess: 15,
    patientExperience: 0,
    reducingLocums: 0,
    clinicianWellbeing: 100,
  },
  edTimeAllocation: {
    throughput: 50,
    retention: 25,
    clinicianWellbeing: 25,
  },
  docPathFocus: null,
  docDrivers: {
    wrvu: { enabled: false, value: 5 },
    hcc: { enabled: false, value: 15 },
    denials: { enabled: false, value: 50 },
  },
  wrvuPctIncrease: 5,
  hccPctRecaptured: 15,
  denialsPctReduced: 50,
  // Time value driver inputs
  timeDriverInputs: {
    patientAccessEnabled: false,
    capacityPercent: 10,
    visitDuration: 30,
    revenuePerVisit: 200,
    costReductionEnabled: false,
    estimatedCostReduction: 0,
    wellbeingEnabled: false,
    calculateRetentionValue: false,
    annualTurnoverRate: 6,
    burnoutRelatedTurnover: 40,
    replacementCost: 350000,
    retentionImpactScenario: 'typical',
  },
  // Documentation quality inputs
  docQualityInputs: {
    wrvuEnabled: false,
    wrvuScenario: 'typical',
    currentWrvu: 1.5,
    conversionFactor: 33,
    wrvuRealization: 75,
    hccEnabled: false,
    hccScenario: 'typical',
    panelSize: 1500,
    maPercent: 30,
    gapRate: 40,
    avgHccs: 1.5,
    rafImpact: 0.4,
    annualPayment: 12000,
    hccRealization: 60,
    denialsEnabled: false,
    denialsScenario: 'typical',
    denialRate: 8,
    unappealableRate: 40,
    avgClaimValue: 250,
    denialsRealization: 85,
  },
  pricingModel: 'perProvider',
  costPerProvider: 0,
  annualLicenseFee: 0,
  implementationFee: 25000,
  includeImplementation: false,
  fullScaleProviders: 500,
};

type ExplorePhase = 
  | 'careSetting' 
  | 'practice' 
  | 'timeSavings' 
  | 'valueDrivers' 
  | 'docQuality'
  | 'investment'
  | 'model';

interface ExploreFlowProps {
  onBackToJourney?: () => void;
  onContinueToInvestment?: (state: ExploreState) => void;
}

export default function ExploreFlow({ onBackToJourney }: ExploreFlowProps) {
  const [phase, setPhase] = useState<ExplorePhase>('careSetting');
  const [state, setState] = useState<ExploreState>(DEFAULT_EXPLORE_STATE);

  const updateState = useCallback((updates: Partial<ExploreState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view === 'explore' && event.state?.explorePhase) {
        setPhase(event.state.explorePhase);
      } else if (event.state?.view === 'journey' || !event.state?.view) {
        if (onBackToJourney) {
          onBackToJourney();
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    const currentState = window.history.state || {};
    if (!currentState.explorePhase || currentState.view !== 'explore') {
      window.history.replaceState({ 
        ...currentState, 
        view: 'explore',
        explorePhase: phase 
      }, '');
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBackToJourney]);

  const goHome = useCallback(() => {
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToJourney]);

  const navigate = useCallback((nextPhase: ExplorePhase) => {
    setPhase(nextPhase);
    window.history.pushState({ 
      view: 'explore', 
      explorePhase: nextPhase 
    }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Calculate total hours saved
  const totalHoursSaved = useMemo(() => {
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

  // Calculate time value (from patient access and cost reduction)
  const timeValue = useMemo(() => {
    const { timeDriverInputs } = state;
    let total = 0;
    
    // Patient Access value
    if (timeDriverInputs.patientAccessEnabled) {
      const hoursTowardCapacity = totalHoursSaved * (timeDriverInputs.capacityPercent / 100);
      const potentialVisits = hoursTowardCapacity * (60 / timeDriverInputs.visitDuration);
      total += potentialVisits * timeDriverInputs.revenuePerVisit;
    }
    
    // Cost Reduction value (user's direct estimate)
    if (timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0) {
      total += timeDriverInputs.estimatedCostReduction;
    }
    
    return Math.round(total);
  }, [totalHoursSaved, state.timeDriverInputs]);

  // Calculate doc value using state inputs
  const docValue = useMemo(() => {
    const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
    const { docQualityInputs } = state;
    let total = 0;
    
    const wrvuScenarios: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
    const hccScenarios: Record<string, number> = { conservative: 10, typical: 15, aggressive: 25 };
    const denialsScenarios: Record<string, number> = { conservative: 25, typical: 50, aggressive: 75 };

    // wRVU
    if (docQualityInputs.wrvuEnabled) {
      const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
      const wrvuLift = docQualityInputs.currentWrvu * (wrvuLiftPercent / 100);
      const totalWrvus = eligibleEncounters * wrvuLift;
      const grossValue = totalWrvus * docQualityInputs.conversionFactor;
      total += grossValue * (docQualityInputs.wrvuRealization / 100);
    }

    // HCC
    if (docQualityInputs.hccEnabled) {
      const recapturePercent = hccScenarios[docQualityInputs.hccScenario];
      const maPatients = state.numberOfProviders * docQualityInputs.panelSize * (docQualityInputs.maPercent / 100);
      const gapPatients = maPatients * (docQualityInputs.gapRate / 100);
      const recaptured = gapPatients * (recapturePercent / 100);
      const hccsRecaptured = recaptured * docQualityInputs.avgHccs;
      const rafValue = hccsRecaptured * docQualityInputs.rafImpact * docQualityInputs.annualPayment;
      total += rafValue * (docQualityInputs.hccRealization / 100);
    }

    // Denials
    if (docQualityInputs.denialsEnabled) {
      const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
      const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
      const unappealable = totalDenials * (docQualityInputs.unappealableRate / 100);
      const prevented = unappealable * (preventionPercent / 100);
      total += prevented * docQualityInputs.avgClaimValue * (docQualityInputs.denialsRealization / 100);
    }

    return Math.round(total);
  }, [state.annualEncounters, state.utilizationPercent, state.numberOfProviders, state.docQualityInputs]);

  // Calculate annual investment
  const annualInvestment = useMemo(() => {
    if (state.pricingModel === 'perProvider') {
      return state.numberOfProviders * state.costPerProvider * 12;
    }
    return state.annualLicenseFee;
  }, [state.pricingModel, state.numberOfProviders, state.costPerProvider, state.annualLicenseFee]);

  switch (phase) {
    case 'careSetting':
      return (
        <ExploreCareSettings
          selectedSetting={state.careSetting}
          onSelectSetting={(setting: ExploreCareSetting) => {
            updateState({ careSetting: setting });
          }}
          onNext={() => navigate('practice')}
          onBack={goHome}
          onHome={goHome}
        />
      );
    
    case 'practice':
      return (
        <ExplorePractice
          state={state}
          updateState={updateState}
          onNext={() => navigate('timeSavings')}
          onBack={() => navigate('careSetting')}
          onHome={goHome}
        />
      );
    
    case 'timeSavings':
      return (
        <ExploreTimeSavings
          state={state}
          updateState={updateState}
          onNext={() => navigate('valueDrivers')}
          onBack={() => navigate('practice')}
          onHome={goHome}
        />
      );
    
    case 'valueDrivers':
      return (
        <ExploreValueDrivers
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          onNext={() => navigate('docQuality')}
          onBack={() => navigate('timeSavings')}
          onHome={goHome}
        />
      );
    
    case 'docQuality':
      return (
        <ExploreDocQuality
          state={state}
          updateState={updateState}
          timeValue={timeValue}
          onNext={() => navigate('investment')}
          onBack={() => navigate('valueDrivers')}
          onHome={goHome}
        />
      );
    
    case 'investment':
      return (
        <ExploreInvestment
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          timeValue={timeValue}
          docValue={docValue}
          onNext={() => navigate('model')}
          onBack={() => navigate('docQuality')}
          onHome={goHome}
        />
      );
    
    case 'model':
      return (
        <ExploreModel
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          timeValue={timeValue}
          docValue={docValue}
          annualInvestment={annualInvestment}
          onEdit={() => navigate('practice')}
          onBack={() => navigate('investment')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}

export { ExploreFlow };
