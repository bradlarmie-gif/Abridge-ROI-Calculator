import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ExploreCareSettings from "./ExploreCareSettings";
import ExploreOpportunity from "./ExploreOpportunity";
import ExploreTimeSavings from "./ExploreTimeSavings";
import ExploreTimeAllocation from "./ExploreTimeAllocation";
import ExploreValueDrivers from "./ExploreValueDrivers";
import ExploreDocQuality from "./ExploreDocQuality";
import ExploreCareQuality from "./ExploreCareQuality";
import ExploreInvestment from "./ExploreInvestment";
import ExploreModel from "./ExploreModel";

export type ExploreCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export type TimePathScenario = 'conservative' | 'typical' | 'aggressive' | null;

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
  capacityRealizationPercent: number;
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
  
  // ED-specific inputs
  edLwbsEnabled: boolean;
  edLwbsRate: number; // Current LWBS rate %
  edLwbsReduction: number; // Expected reduction %
  edRevenuePerVisit: number;
  edLwbsRealization: number; // Realization rate for LWBS recovery (not all patients return)
  edThroughputEnabled: boolean;
  edAdmissionRate: number; // % of recovered patients who get admitted
  edAdmissionRevenue: number; // Revenue per admission
  edAdmissionRealization: number; // Realization rate for admission capture
  
  // Inpatient-specific inputs
  ipRoundingEnabled: boolean;
  ipAnnualTurnoverRate: number; // Hospitalist turnover rate
  ipBurnoutRelatedTurnover: number; // % of turnover burnout-related
  ipReplacementCost: number; // Hospitalist replacement cost
  
  // Inpatient: CDI Capacity Extension
  ipCdiCapacityEnabled: boolean;
  ipCdiCapacityFtes: number;
  ipCdiCapacityQueryTimePct: number;
  ipCdiCapacityReductionPct: number;
  ipCdiCapacitySalary: number;
  ipCdiCapacityExpanded: boolean;
  
  // Outpatient time allocation
  opAllocCapacityPercent: number;
  opAllocDocQualityPercent: number;
  opAllocWellbeingPercent: number;
  
  // ED time allocation
  edAllocThroughputPercent: number;
  edAllocDocQualityPercent: number;
  edAllocWellbeingPercent: number;
  
  // Inpatient time allocation
  ipAllocQualityPercent: number;
  ipAllocCostPercent: number;
  ipAllocWellbeingPercent: number;
  
  // Nursing-specific inputs
  nursingOtEnabled: boolean;
  nursingOtExpanded: boolean;
  nursingOtHoursPerNurseWeek: number;
  nursingOtReductionPercent: number;
  nursingOtHourlyRate: number;
  nursingRetentionEnabled: boolean;
  nursingRetentionExpanded: boolean;
  nursingTurnoverRate: number;
  nursingReplacementCost: number;
  nursingCareTimeEnabled: boolean;
  nursingCareTimeExpanded: boolean;
  nursingCareTimePercent: number; // Direct patient care allocation percentage
  nursingShiftSustainabilityPercent: number; // Shift sustainability allocation percentage
  
  // Agency Cost Avoidance (Nursing)
  nursingAgencyEnabled: boolean;
  nursingAgencyExpanded: boolean;
  nursingAnnualAgencySpend: number; // USD/year (legacy)
  nursingAvgAgencyHourlyRate: number; // USD/hr (legacy)
  nursingAgencyWeeksPerVacancy: number; // Weeks of agency coverage per vacancy
  nursingAgencyWeeklyPremium: number; // Weekly agency premium (above base cost)
  
  // Care Quality (Nursing) - HAPI & Falls prevention
  nursingCareQualityEnabled: boolean;
  nursingCareQualityExpanded: boolean;
  nursingFallsRate: number; // per 1,000 patient days
  nursingFallsPreventablePct: number; // % preventable with Abridge
  nursingCostPerFall: number; // $ per fall
  nursingHapiRate: number; // per 1,000 patient days
  nursingHapiPreventablePct: number; // % preventable with Abridge
  nursingCostPerHapi: number; // $ per HAPI
  nursingCareQualityRealization: number; // % realization
  
  // Collapsible state for shared/other drivers
  costReductionExpanded: boolean;
  patientAccessExpanded: boolean;
  wellbeingExpanded: boolean;
  edLwbsExpanded: boolean;
  edThroughputExpanded: boolean;
  ipRoundingExpanded: boolean;
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
  
  // Inpatient: DRG Accuracy
  ipDrgEnabled: boolean;
  ipDrgScenario: 'conservative' | 'typical' | 'aggressive';
  ipDrgAtRiskRate: number; // % of admissions with documentation gaps
  ipDrgWeightIncrease: number; // Average DRG weight difference
  ipDrgBasePayment: number; // Base DRG payment
  ipDrgRealization: number; // Realization rate (audit adjustments)
  
  // Inpatient: Obs/IP Status Defense
  ipObsDefenseEnabled: boolean;
  ipObsDefenseDenialRate: number;
  ipObsDefenseClaimValue: number;
  ipObsDefenseDocContribution: number;
  ipObsDefenseRealization: number;
  ipObsDefenseExpanded: boolean;
  
  // Inpatient: CDI Query Reduction
  ipCdiEnabled: boolean;
  ipCdiScenario: 'conservative' | 'typical' | 'aggressive';
  ipCdiQueryRate: number; // % of admissions that generate queries
  ipCdiCostPerQuery: number; // Cost per query
  
  // Nursing: HAPI Prevention (potential value)
  nursingHapiEnabled: boolean;
  nursingHapiRate: number; // HAPIs per 1,000 patient days
  nursingHapiPreventionRate: number; // % prevented with better documentation
  nursingHapiCost: number; // Cost per HAPI
  
  // Nursing: Falls Prevention (potential value)
  nursingFallsEnabled: boolean;
  nursingFallsRate: number; // Falls per 1,000 patient days
  nursingFallsPreventionRate: number; // % prevented with better documentation
  nursingFallsCost: number; // Cost per fall
  
  // Nursing: HAC Penalty Avoidance (potential value)
  nursingHacEnabled: boolean;
  nursingHacBottomQuartile: boolean;
  nursingHacMedicareRevenue: number;
  nursingHacAbridgeAttribution: number;
  nursingHacRealization: number;

  // Nursing: Patient Experience (qualitative only)
  nursingHcahpsEnabled: boolean;
  
  // Expanded states for collapse/expand chevrons
  wrvuExpanded: boolean;
  hccExpanded: boolean;
  denialsExpanded: boolean;
  ipDrgExpanded: boolean;
  ipCdiExpanded: boolean;
  nursingHapiExpanded: boolean;
  nursingFallsExpanded: boolean;
  nursingHacExpanded: boolean;
  nursingHcahpsExpanded: boolean;
}

export interface ExploreState {
  careSetting: ExploreCareSetting | null;
  
  numberOfProviders: number;
  encountersPerProvider: number;
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
  encountersPerProvider: 0,
  annualEncounters: 0,
  utilizationPercent: 0,
  nursingStaffedBeds: 0,
  nursingOccupancyRate: 85,
  nursingShiftsPerNurseYear: 260,
  nursingMinutesPerShift: 30,
  timePathScenario: null,
  minutesSavedPerEncounter: 3,
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
    capacityRealizationPercent: 75,
    visitDuration: 30,
    revenuePerVisit: 200,
    costReductionEnabled: false,
    estimatedCostReduction: 0,
    wellbeingEnabled: false,
    calculateRetentionValue: false,
    annualTurnoverRate: 6,
    burnoutRelatedTurnover: 40,
    replacementCost: 400000,
    retentionImpactScenario: 'typical',
    // ED-specific defaults
    edLwbsEnabled: false,
    edLwbsRate: 3, // 3% baseline LWBS rate
    edLwbsReduction: 15, // 15% reduction in LWBS
    edRevenuePerVisit: 450, // Higher than outpatient
    edLwbsRealization: 75, // 75% realization (not all recovered patients complete visits)
    edThroughputEnabled: false,
    edAdmissionRate: 18, // 18% of recovered patients get admitted
    edAdmissionRevenue: 8000, // Average admission revenue
    edAdmissionRealization: 40, // 40% realization (bed availability, payer mix)
    // Inpatient-specific defaults
    ipRoundingEnabled: false,
    ipAnnualTurnoverRate: 8, // Hospitalist turnover: 8%
    ipBurnoutRelatedTurnover: 45, // 45% of turnover is burnout-related
    ipReplacementCost: 300000, // $300,000 replacement cost
    // Outpatient time allocation defaults
    opAllocCapacityPercent: 0,
    opAllocDocQualityPercent: 0,
    opAllocWellbeingPercent: 0,
    // ED time allocation defaults
    edAllocThroughputPercent: 0,
    edAllocDocQualityPercent: 0,
    edAllocWellbeingPercent: 0,
    // Inpatient time allocation defaults
    ipAllocQualityPercent: 0,
    ipAllocCostPercent: 0,
    ipAllocWellbeingPercent: 0,
    // Nursing-specific defaults
    nursingOtEnabled: false,
    nursingOtExpanded: true,
    nursingOtHoursPerNurseWeek: 4,
    nursingOtReductionPercent: 25,
    nursingOtHourlyRate: 75,
    nursingRetentionEnabled: false,
    nursingRetentionExpanded: true,
    nursingTurnoverRate: 18,
    nursingReplacementCost: 50000,
    nursingCareTimeEnabled: false,
    nursingCareTimeExpanded: true,
    nursingCareTimePercent: 40,
    nursingShiftSustainabilityPercent: 35,
    // Agency Cost Avoidance defaults
    nursingAgencyEnabled: false,
    nursingAgencyExpanded: true,
    nursingAnnualAgencySpend: 2000000, // $2M default (legacy)
    nursingAvgAgencyHourlyRate: 150, // $150/hr default (legacy)
    nursingAgencyWeeksPerVacancy: 12, // 12 weeks average time to fill
    nursingAgencyWeeklyPremium: 2500, // $2,500 weekly premium above base cost
    // Care Quality (HAPI & Falls) defaults
    nursingCareQualityEnabled: false,
    nursingCareQualityExpanded: true,
    nursingFallsRate: 3.5, // per 1,000 patient days
    nursingFallsPreventablePct: 10, // % where documentation timeliness gap was primary factor
    nursingCostPerFall: 6500, // $ per fall
    nursingHapiRate: 2.5, // per 1,000 patient days
    nursingHapiPreventablePct: 6.5, // % preventable with timely assessments
    nursingCostPerHapi: 25000, // $ per HAPI
    nursingCareQualityRealization: 85, // % realization rate
    // Collapsible state defaults
    costReductionExpanded: true,
    patientAccessExpanded: true,
    wellbeingExpanded: true,
    edLwbsExpanded: true,
    edThroughputExpanded: true,
    ipRoundingExpanded: true,
    // Inpatient: CDI Capacity Extension defaults
    ipCdiCapacityEnabled: false,
    ipCdiCapacityFtes: 5,
    ipCdiCapacityQueryTimePct: 30,
    ipCdiCapacityReductionPct: 20,
    ipCdiCapacitySalary: 85000,
    ipCdiCapacityExpanded: true,
  },
  // Documentation quality inputs
  docQualityInputs: {
    wrvuEnabled: false,
    wrvuScenario: 'typical',
    currentWrvu: 1.8,
    conversionFactor: 33,
    wrvuRealization: 75,
    hccEnabled: false,
    hccScenario: 'typical',
    panelSize: 1500,
    maPercent: 20,
    gapRate: 12,
    avgHccs: 0.7,
    rafImpact: 0.15,
    annualPayment: 10000,
    hccRealization: 40,
    denialsEnabled: false,
    denialsScenario: 'typical',
    denialRate: 8,
    unappealableRate: 30,
    avgClaimValue: 200,
    denialsRealization: 60,
    // Inpatient: DRG Accuracy defaults
    ipDrgEnabled: false,
    ipDrgScenario: 'typical',
    ipDrgAtRiskRate: 25, // 25% of admissions have documentation gaps
    ipDrgWeightIncrease: 0.4, // Average DRG weight difference
    ipDrgBasePayment: 6000, // $6,000 base DRG payment
    ipDrgRealization: 33, // 33% realization (RAC/PEPPER audits) - conservative
    // Inpatient: Obs/IP Status Defense defaults
    ipObsDefenseEnabled: false,
    ipObsDefenseDenialRate: 5,
    ipObsDefenseClaimValue: 10000,
    ipObsDefenseDocContribution: 40,
    ipObsDefenseRealization: 35,
    ipObsDefenseExpanded: true,
    // Inpatient: CDI Query Reduction defaults
    ipCdiEnabled: false,
    ipCdiScenario: 'typical',
    ipCdiQueryRate: 30, // 30% of admissions generate queries
    ipCdiCostPerQuery: 50, // $50 per query
    // Nursing: HAPI Prevention defaults
    nursingHapiEnabled: false,
    nursingHapiRate: 2.5, // 2.5 per 1,000 patient days
    nursingHapiPreventionRate: 6.5, // 6.5% - half of 13% observed in Dowding et al. (JAMIA 2012)
    nursingHapiCost: 25000, // $25,000 per HAPI
    // Nursing: Falls Prevention defaults
    nursingFallsEnabled: false,
    nursingFallsRate: 3.5, // 3.5 per 1,000 patient days
    nursingFallsPreventionRate: 10, // 10% documentation timeliness gap rate
    nursingFallsCost: 6500, // $6,500 per fall
    // Nursing: HAC Penalty Avoidance defaults
    nursingHacEnabled: false,
    nursingHacBottomQuartile: false,
    nursingHacMedicareRevenue: 50000000,
    nursingHacAbridgeAttribution: 25,
    nursingHacRealization: 50,
    // Nursing: Patient Experience defaults
    nursingHcahpsEnabled: false,
    // Expanded states (auto-expand when first toggled on)
    wrvuExpanded: true,
    hccExpanded: true,
    denialsExpanded: true,
    ipDrgExpanded: true,
    ipCdiExpanded: true,
    nursingHapiExpanded: true,
    nursingFallsExpanded: true,
    nursingHacExpanded: true,
    nursingHcahpsExpanded: true,
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
  | 'timeAllocation'
  | 'valueDrivers' 
  | 'careQuality'
  | 'docQuality'
  | 'investment'
  | 'model';

interface ExploreFlowProps {
  onBackToJourney?: () => void;
  onContinueToInvestment?: (state: ExploreState) => void;
  initialCareSetting?: ExploreCareSetting;
  initialPhase?: ExplorePhase;
  onAddToProforma?: (snapshot: import("@/pages/proforma/proformaTypes").ProformaSettingSnapshot) => void;
  disabledCareSettings?: ExploreCareSetting[];
}

export default function ExploreFlow({ onBackToJourney, initialCareSetting, initialPhase, onAddToProforma, disabledCareSettings = [] }: ExploreFlowProps) {
  const [phase, setPhase] = useState<ExplorePhase>(initialPhase || 'careSetting');
  const [state, setState] = useState<ExploreState>(() => ({
    ...DEFAULT_EXPLORE_STATE,
    careSetting: initialCareSetting || null,
  }));

  const updateState = useCallback((updates: Partial<ExploreState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const prevCareSettingRef = useRef(state.careSetting);
  useEffect(() => {
    if (state.careSetting && state.careSetting !== prevCareSettingRef.current) {
      const newCareSetting = state.careSetting;
      setState(() => {
        const fresh = { ...DEFAULT_EXPLORE_STATE, careSetting: newCareSetting };
        if (newCareSetting === 'ed') {
          fresh.minutesSavedPerEncounter = 2;
          fresh.docQualityInputs = {
            ...fresh.docQualityInputs,
            currentWrvu: 2.5,
            denialRate: 10,
            avgClaimValue: 300,
          };
        } else if (newCareSetting === 'inpatient') {
          fresh.minutesSavedPerEncounter = 3;
        }
        return fresh;
      });
    }
    prevCareSettingRef.current = state.careSetting;
  }, [state.careSetting]);

  // Scroll to top on every phase change (mobile fix)
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated before scrolling
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [phase]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view === 'explore' && event.state?.explorePhase) {
        setPhase(event.state.explorePhase);
        window.scrollTo({ top: 0, behavior: 'instant' });
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

  // Calculate time value based on care setting
  const timeValue = useMemo(() => {
    const { timeDriverInputs, careSetting, annualEncounters, numberOfProviders } = state;
    let total = 0;
    const isED = careSetting === 'ed';
    const isInpatient = careSetting === 'inpatient';
    const isNursing = careSetting === 'nursing';
    
    if (isED) {
      // ED: LWBS and Throughput (throughput allocation × 50% conversion factor)
      const throughputFactor = (timeDriverInputs.edAllocThroughputPercent / 100) * 0.5;
      if (timeDriverInputs.edLwbsEnabled) {
        const lwbsPatients = annualEncounters * (timeDriverInputs.edLwbsRate / 100);
        const recoveredPatients = lwbsPatients * (timeDriverInputs.edLwbsReduction / 100) * throughputFactor;
        const grossValue = recoveredPatients * timeDriverInputs.edRevenuePerVisit;
        total += grossValue * (timeDriverInputs.edLwbsRealization / 100);
      }
      if (timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled) {
        const lwbsPatients = annualEncounters * (timeDriverInputs.edLwbsRate / 100);
        const recoveredPatients = lwbsPatients * (timeDriverInputs.edLwbsReduction / 100) * throughputFactor;
        const admittedPatients = recoveredPatients * (timeDriverInputs.edAdmissionRate / 100);
        const grossValue = admittedPatients * timeDriverInputs.edAdmissionRevenue;
        total += grossValue * (timeDriverInputs.edAdmissionRealization / 100);
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
    } else if (isInpatient) {
      // Inpatient: Rounding is qualitative only (no dollar value)
      if (timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0) {
        total += timeDriverInputs.estimatedCostReduction;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.ipCdiCapacityEnabled) {
        total += Math.round(timeDriverInputs.ipCdiCapacityFtes * timeDriverInputs.ipCdiCapacitySalary * (timeDriverInputs.ipCdiCapacityQueryTimePct / 100) * (timeDriverInputs.ipCdiCapacityReductionPct / 100));
      }
    } else if (isNursing) {
      // Nursing: OT Reduction (time-to-OT conversion from total hours saved)
      if (timeDriverInputs.nursingOtEnabled) {
        const otHoursEliminated = totalHoursSaved * (timeDriverInputs.nursingOtReductionPercent / 100);
        total += Math.round(otHoursEliminated * timeDriverInputs.nursingOtHourlyRate);
      }
      // Nursing: Retention (40% burnout-related × impact scenario 10/15/25%)
      if (timeDriverInputs.nursingRetentionEnabled) {
        const retentionImpactRates: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25 };
        const leavingPerYear = numberOfProviders * (timeDriverInputs.nursingTurnoverRate / 100);
        const burnoutDepartures = leavingPerYear * 0.40;
        const impactRate = (retentionImpactRates[timeDriverInputs.retentionImpactScenario] || 15) / 100;
        const retained = burnoutDepartures * impactRate;
        total += Math.round(retained * timeDriverInputs.nursingReplacementCost);
        // Agency Cost Avoidance (depends on retention being enabled)
        if (timeDriverInputs.nursingAgencyEnabled) {
          const weeksOfCoverage = timeDriverInputs.nursingAgencyWeeksPerVacancy || 12;
          const weeklyPremium = timeDriverInputs.nursingAgencyWeeklyPremium || 2500;
          total += Math.round(retained * weeksOfCoverage * weeklyPremium);
        }
      }
    } else {
      // Outpatient: Patient Access and Wellbeing/Retention
      if (timeDriverInputs.patientAccessEnabled) {
        const hoursAllocatedToCapacity = totalHoursSaved * (timeDriverInputs.opAllocCapacityPercent / 100);
        const hoursConvertedToVisits = hoursAllocatedToCapacity * (timeDriverInputs.capacityRealizationPercent / 100);
        const potentialVisits = hoursConvertedToVisits * (60 / timeDriverInputs.visitDuration);
        total += potentialVisits * timeDriverInputs.revenuePerVisit;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
    }
    
    return Math.round(total);
  }, [totalHoursSaved, state.timeDriverInputs, state.careSetting, state.annualEncounters, state.numberOfProviders]);

  // Calculate doc value using state inputs
  const docValue = useMemo(() => {
    const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
    const { docQualityInputs } = state;
    let total = 0;
    
    const wrvuScenarios: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
    const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };
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

    // Denials (not for inpatient - included in DRG Accuracy)
    if (docQualityInputs.denialsEnabled && state.careSetting !== 'inpatient') {
      const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
      const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
      const unappealable = totalDenials * (docQualityInputs.unappealableRate / 100);
      const prevented = unappealable * (preventionPercent / 100);
      total += prevented * docQualityInputs.avgClaimValue * (docQualityInputs.denialsRealization / 100);
    }

    // Inpatient: DRG Accuracy
    if (state.careSetting === 'inpatient' && docQualityInputs.ipDrgEnabled) {
      const ipDrgProtectionScenarios: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
      const protectionPercent = ipDrgProtectionScenarios[docQualityInputs.ipDrgScenario];
      const admissionsAtRisk = eligibleEncounters * (docQualityInputs.ipDrgAtRiskRate / 100);
      const admissionsProtected = admissionsAtRisk * (protectionPercent / 100);
      const grossValue = admissionsProtected * docQualityInputs.ipDrgWeightIncrease * docQualityInputs.ipDrgBasePayment;
      total += grossValue * (docQualityInputs.ipDrgRealization / 100);
    }

    // Inpatient: CDI Query Reduction
    if (state.careSetting === 'inpatient' && docQualityInputs.ipCdiEnabled) {
      const ipCdiReductionScenarios: Record<string, number> = { conservative: 15, typical: 25, aggressive: 35 };
      const reductionPercent = ipCdiReductionScenarios[docQualityInputs.ipCdiScenario];
      const totalQueries = eligibleEncounters * (docQualityInputs.ipCdiQueryRate / 100);
      const queriesAvoided = totalQueries * (reductionPercent / 100);
      total += queriesAvoided * docQualityInputs.ipCdiCostPerQuery;
    }

    // Inpatient: Obs/IP Status Defense
    if (state.careSetting === 'inpatient' && docQualityInputs.ipObsDefenseEnabled) {
      const obsDefenseGross = eligibleEncounters * (docQualityInputs.ipObsDefenseDenialRate / 100) * docQualityInputs.ipObsDefenseClaimValue * (docQualityInputs.ipObsDefenseDocContribution / 100);
      total += obsDefenseGross * (docQualityInputs.ipObsDefenseRealization / 100);
    }

    return Math.round(total);
  }, [state.annualEncounters, state.utilizationPercent, state.numberOfProviders, state.docQualityInputs, state.careSetting]);

  // Calculate annual investment
  const annualInvestment = useMemo(() => {
    if (state.pricingModel === 'perProvider') {
      const units = state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders;
      return units * state.costPerProvider * 12;
    }
    return state.annualLicenseFee;
  }, [state.pricingModel, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee, state.careSetting]);

  const isNursing = state.careSetting === 'nursing';
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';

  switch (phase) {
    case 'careSetting':
      return (
        <ExploreCareSettings
          selectedSetting={disabledCareSettings.includes(state.careSetting as ExploreCareSetting) ? null : state.careSetting}
          onSelectSetting={(setting: ExploreCareSetting) => {
            if (disabledCareSettings.includes(setting)) return;
            updateState({ careSetting: setting });
          }}
          onNext={() => navigate('practice')}
          onBack={goHome}
          onHome={goHome}
          disabledSettings={disabledCareSettings}
        />
      );
    
    case 'practice':
      return (
        <ExploreOpportunity
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
          onNext={() => navigate('timeAllocation')}
          onBack={() => navigate('practice')}
          onHome={goHome}
        />
      );
    
    case 'timeAllocation':
      return (
        <ExploreTimeAllocation
          state={state}
          updateState={updateState}
          onNext={() => {
            const td = state.timeDriverInputs;
            if (isNursing) {
              updateState({
                timeDriverInputs: {
                  ...td,
                  nursingOtEnabled: td.nursingOtReductionPercent > 0,
                  nursingRetentionEnabled: td.nursingShiftSustainabilityPercent > 0,
                },
                docQualityInputs: {
                  ...state.docQualityInputs,
                  nursingHapiEnabled: td.nursingCareTimePercent > 0,
                  nursingFallsEnabled: td.nursingCareTimePercent > 0,
                },
              });
            } else if (isED) {
              updateState({
                timeDriverInputs: {
                  ...td,
                  edLwbsEnabled: td.edAllocThroughputPercent > 0,
                  edThroughputEnabled: td.edAllocThroughputPercent > 0,
                  wellbeingEnabled: td.edAllocWellbeingPercent > 0,
                },
              });
            } else if (isInpatient) {
              updateState({
                timeDriverInputs: {
                  ...td,
                  ipRoundingEnabled: td.ipAllocQualityPercent > 0,
                  ipCdiCapacityEnabled: td.ipAllocCostPercent > 0,
                  costReductionEnabled: td.ipAllocWellbeingPercent > 0,
                  wellbeingEnabled: td.ipAllocWellbeingPercent > 0,
                },
              });
            } else {
              updateState({
                timeDriverInputs: {
                  ...td,
                  patientAccessEnabled: td.opAllocCapacityPercent > 0,
                  wellbeingEnabled: td.opAllocWellbeingPercent > 0,
                },
              });
            }
            navigate('valueDrivers');
          }}
          onBack={() => navigate('timeSavings')}
          onHome={goHome}
        />
      );
    
    case 'valueDrivers':
      return (
        <ExploreValueDrivers
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          onNext={() => navigate(isNursing ? 'careQuality' : 'docQuality')}
          onBack={() => navigate('timeAllocation')}
          onHome={goHome}
        />
      );
    
    case 'careQuality':
      return (
        <ExploreCareQuality
          state={state}
          updateState={updateState}
          timeDriverInputs={state.timeDriverInputs}
          updateTimeDriverInputs={(updates) => updateState({ timeDriverInputs: { ...state.timeDriverInputs, ...updates } })}
          totalHoursSaved={totalHoursSaved}
          timeValue={timeValue}
          onNext={() => navigate('investment')}
          onBack={() => navigate('valueDrivers')}
          onHome={goHome}
          onEditAllocation={() => navigate('timeAllocation')}
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
          onBack={() => navigate(isNursing ? 'careQuality' : 'docQuality')}
          onHome={goHome}
        />
      );
    
    case 'model': {
      const stepPhaseMap: ExplorePhase[] = isNursing
        ? ['careSetting', 'practice', 'timeSavings', 'timeAllocation', 'valueDrivers', 'careQuality', 'investment', 'model']
        : ['careSetting', 'practice', 'timeSavings', 'timeAllocation', 'valueDrivers', 'docQuality', 'investment', 'model'];
      const stepLabels = isNursing
        ? ['Care Setting', 'Practice', 'Time Savings', 'Time Allocation', 'Value Drivers', 'Care Quality', 'Investment', 'Your Model']
        : ['Care Setting', 'Practice', 'Time Savings', 'Time Allocation', 'Value Drivers', 'Doc Quality', 'Investment', 'Your Model'];
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
          onAddToProforma={onAddToProforma}
          onStepClick={(step: number) => navigate(stepPhaseMap[step - 1])}
          stepLabels={stepLabels}
        />
      );
    }
    
    default:
      return null;
  }
}

export { ExploreFlow };
