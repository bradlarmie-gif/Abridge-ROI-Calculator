import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ExploreCareSettings from "./ExploreCareSettings";
import ExploreOpportunity from "./ExploreOpportunity";
import ExploreTimeSavings from "./ExploreTimeSavings";

import ExploreCapacity from "./ExploreCapacity";
import ExploreWorkforce from "./ExploreWorkforce";
import ExploreRevenue from "./ExploreRevenue";
import ExploreQuality from "./ExploreQuality";
import ExploreInvestment from "./ExploreInvestment";
import ExploreModel from "./ExploreModel";
import { ExploreProgressBar } from "@/components/ExploreProgressBar";
import {
  computeCapacityBreakdown,
  computeWorkforceBreakdown,
  computeRevenueBreakdown,
  type PriorQuadrantEntry,
} from "@/lib/exploreQuadrantValues";

export type ExploreCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export interface OtherFinancialBenefitItem {
  id: string;
  label: string;
  amount: number;
  type: 'annual' | 'oneTime';
  quadrant: 'Capacity' | 'Workforce' | 'Revenue' | 'Quality';
}

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
  additionalVisitsPerWeek: number;
  accessProviders: number;
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

  // Physician Locum/Agency Cost Avoidance (OP/ED/IP) — child of Provider Wellbeing
  physicianAgencyEnabled: boolean;
  physicianAgencyExpanded: boolean;
  physicianAgencyWeeksPerVacancy: number; // weeks of contracted coverage per vacancy
  physicianAgencyWeeklyPremium: number;   // dollar premium per week above base salary equivalent

  nursingAdditionalCostSavings: Array<{ id: string; label: string; amount: number }>;

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

  // OP qualitative Quality drivers
  opCdiQueryReductionEnabled: boolean;
  opCdiQueryReductionExpanded: boolean;
  opCognitiveLoadEnabled: boolean;
  opCognitiveLoadExpanded: boolean;
  opAuditComplianceEnabled: boolean;
  opAuditComplianceExpanded: boolean;
  opCareContinuityEnabled: boolean;
  opCareContinuityExpanded: boolean;
  opNoteStarRatingEnabled: boolean;
  opNoteStarRatingExpanded: boolean;
  opDiagnosisCaptureEnabled: boolean;
  opDiagnosisCaptureExpanded: boolean;
  opDiagnosisSpecificityEnabled: boolean;
  opDiagnosisSpecificityExpanded: boolean;
  // ED qualitative Quality drivers
  edNoteStarRatingEnabled: boolean;
  edNoteStarRatingExpanded: boolean;
  edPressGaneyEnabled: boolean;
  edPressGaneyExpanded: boolean;
  // IP qualitative Quality drivers
  ipNoteStarRatingEnabled: boolean;
  ipNoteStarRatingExpanded: boolean;
  ipHcahpsCompositeEnabled: boolean;
  ipHcahpsCompositeExpanded: boolean;
  ipReadmissionEnabled: boolean;
  ipReadmissionExpanded: boolean;
  // Nursing qualitative Quality (1 new — HCAHPS already exists in docQualityInputs)
  nursingMedErrorEnabled: boolean;
  nursingMedErrorExpanded: boolean;
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
  ipCdiRealization: number;
  // Inpatient: E/M Coding Accuracy
  ipEmCodingEnabled: boolean;
  ipEmCodingGapScenario: 'conservative' | 'typical' | 'optimistic';
  ipEmCodingAvgRevenueLift: number;
  ipEmCodingRealization: number;
  ipEmCodingConsultsPerAdmission: number;
  ipEmCodingExpanded: boolean;
  
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
  
  // Nursing: HAC Penalty Exposure (risk display — not modeled as ROI)
  nursingHacEnabled: boolean;
  nursingHacBottomQuartile: boolean;
  nursingHacMedicareRevenue: number;

  // Nursing: Patient Experience (qualitative only)
  nursingHcahpsEnabled: boolean;
  nursingCautiEnabled: boolean;
  nursingCautiUtilizationRatio: number;
  nursingCautiRate: number;
  nursingCautiPreventionRate: number;
  nursingCautiCost: number;
  nursingCautiExpanded: boolean;
  nursingClabsiEnabled: boolean;
  nursingClabsiUtilizationRatio: number;
  nursingClabsiRate: number;
  nursingClabsiPreventionRate: number;
  nursingClabsiCost: number;
  nursingClabsiExpanded: boolean;
  nursingSepsisEnabled: boolean;
  nursingSepsisRatePerThousand: number;
  nursingSepsisCurrentCompliance: number;
  nursingSepsisDocLagPercent: number;
  nursingSepsisExcessCostPerCase: number;
  nursingSepsisRealization: number;
  nursingSepsisExpanded: boolean;

  
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
  ipAvgLengthOfStay: number;
  
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
  pricingModel: 'perProvider' | 'perEncounter' | 'annual';
  costPerProvider: number;
  costPerEncounter: number;
  annualLicenseFee: number;
  implementationFee: number;
  includeImplementation: boolean;
  
  // Full scale projection
  fullScaleProviders: number;
  
  // Calculated values
  calculatedValues?: CalculatedValues;

  otherFinancialBenefits: OtherFinancialBenefitItem[];

  year2GrowthPercent: number;
  year3GrowthPercent: number;
}

export const DEFAULT_EXPLORE_STATE: ExploreState = {
  careSetting: null,
  numberOfProviders: 0,
  encountersPerProvider: 0,
  annualEncounters: 0,
  utilizationPercent: 0,
  nursingStaffedBeds: 0,
  nursingOccupancyRate: 85,
  nursingShiftsPerNurseYear: 156,
  nursingMinutesPerShift: 0,
  ipAvgLengthOfStay: 4.5,
  timePathScenario: null,
  minutesSavedPerEncounter: 0,
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
    additionalVisitsPerWeek: 1,
    accessProviders: 0,
    capacityRealizationPercent: 25,
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
    edLwbsReduction: 10, // 10% reduction in LWBS (conservative default)
    edRevenuePerVisit: 480, // Higher than outpatient
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
    // Outpatient time allocation defaults (auto-set, no longer user-facing)
    opAllocCapacityPercent: 33,
    opAllocDocQualityPercent: 34,
    opAllocWellbeingPercent: 33,
    // ED time allocation defaults (auto-set, no longer user-facing)
    edAllocThroughputPercent: 33,
    edAllocDocQualityPercent: 34,
    edAllocWellbeingPercent: 33,
    // Inpatient time allocation defaults (auto-set, no longer user-facing)
    ipAllocQualityPercent: 34,
    ipAllocCostPercent: 33,
    ipAllocWellbeingPercent: 33,
    // Nursing-specific defaults
    nursingOtEnabled: false,
    nursingOtExpanded: false,
    nursingOtHoursPerNurseWeek: 1.0,
    nursingOtReductionPercent: 40,
    nursingOtHourlyRate: 75,
    nursingRetentionEnabled: false,
    nursingRetentionExpanded: false,
    nursingTurnoverRate: 18,
    nursingReplacementCost: 56300,
    nursingCareTimeEnabled: false,
    nursingCareTimeExpanded: false,
    nursingCareTimePercent: 40,
    nursingShiftSustainabilityPercent: 35,
    // Agency Cost Avoidance defaults
    nursingAgencyEnabled: false,
    nursingAgencyExpanded: false,
    nursingAnnualAgencySpend: 2000000, // $2M default (legacy)
    nursingAvgAgencyHourlyRate: 150, // $150/hr default (legacy)
    nursingAgencyWeeksPerVacancy: 12, // 12 weeks average time to fill
    nursingAgencyWeeklyPremium: 2500, // $2,500 weekly premium above base cost
    // Physician Locum/Agency Cost Avoidance defaults
    physicianAgencyEnabled: false,
    physicianAgencyExpanded: false,
    physicianAgencyWeeksPerVacancy: 16, // 16 weeks average to fill a physician vacancy
    physicianAgencyWeeklyPremium: 5000, // $5K/week premium for locum coverage
    nursingAdditionalCostSavings: [],
    // Care Quality (HAPI & Falls) defaults
    nursingCareQualityEnabled: false,
    nursingCareQualityExpanded: false,
    nursingFallsRate: 3.5, // per 1,000 patient days
    nursingFallsPreventablePct: 10, // % where documentation timeliness gap was primary factor
    nursingCostPerFall: 6500, // $ per fall
    nursingHapiRate: 2.5, // per 1,000 patient days
    nursingHapiPreventablePct: 6.5, // % preventable with timely assessments
    nursingCostPerHapi: 25000, // $ per HAPI
    nursingCareQualityRealization: 85, // % realization rate
    // Collapsible state defaults
    costReductionExpanded: false,
    patientAccessExpanded: false,
    wellbeingExpanded: false,
    edLwbsExpanded: false,
    edThroughputExpanded: false,
    ipRoundingExpanded: false,
    // Quality qualitative driver defaults
    opCdiQueryReductionEnabled: false,
    opCdiQueryReductionExpanded: false,
    opCognitiveLoadEnabled: false,
    opCognitiveLoadExpanded: false,
    opAuditComplianceEnabled: false,
    opAuditComplianceExpanded: false,
    opCareContinuityEnabled: false,
    opCareContinuityExpanded: false,
    opNoteStarRatingEnabled: false,
    opNoteStarRatingExpanded: false,
    opDiagnosisCaptureEnabled: false,
    opDiagnosisCaptureExpanded: false,
    opDiagnosisSpecificityEnabled: false,
    opDiagnosisSpecificityExpanded: false,
    edNoteStarRatingEnabled: false,
    edNoteStarRatingExpanded: false,
    edPressGaneyEnabled: false,
    edPressGaneyExpanded: false,
    ipNoteStarRatingEnabled: false,
    ipNoteStarRatingExpanded: false,
    ipHcahpsCompositeEnabled: false,
    ipHcahpsCompositeExpanded: false,
    ipReadmissionEnabled: false,
    ipReadmissionExpanded: false,
    nursingMedErrorEnabled: false,
    nursingMedErrorExpanded: false,
  },
  otherFinancialBenefits: [],
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
    maPercent: 30,
    gapRate: 12,
    avgHccs: 0.5,
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
    ipDrgAtRiskRate: 18, // 18% of admissions have documentation gaps
    ipDrgWeightIncrease: 0.4, // Average DRG weight difference
    ipDrgBasePayment: 6000, // $6,000 base DRG payment
    ipDrgRealization: 65, // 65% realization (RAC/PEPPER audits)
    // Inpatient: Obs/IP Status Defense defaults
    ipObsDefenseEnabled: false,
    ipObsDefenseDenialRate: 5,
    ipObsDefenseClaimValue: 10000,
    ipObsDefenseDocContribution: 45,
    ipObsDefenseRealization: 25,
    ipObsDefenseExpanded: false,
    // Inpatient: CDI Query Reduction defaults
    ipCdiEnabled: false,
    ipCdiScenario: 'typical',
    ipCdiQueryRate: 30, // 30% of admissions generate queries
    ipCdiCostPerQuery: 150, // $150 per query
    ipCdiRealization: 75,
    // Inpatient: E/M Coding Accuracy defaults
    ipEmCodingEnabled: false,
    ipEmCodingGapScenario: 'typical',
    ipEmCodingAvgRevenueLift: 50,
    ipEmCodingRealization: 40,
    ipEmCodingConsultsPerAdmission: 1.0,
    ipEmCodingExpanded: false,
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
    // Nursing: Patient Experience defaults
    nursingHcahpsEnabled: false,
    nursingCautiEnabled: false,
    nursingCautiUtilizationRatio: 30,
    nursingCautiRate: 1.8,
    nursingCautiPreventionRate: 12,
    nursingCautiCost: 13000,
    nursingCautiExpanded: false,
    nursingClabsiEnabled: false,
    nursingClabsiUtilizationRatio: 20,
    nursingClabsiRate: 0.8,
    nursingClabsiPreventionRate: 8,
    nursingClabsiCost: 20000,
    nursingClabsiExpanded: false,
    nursingSepsisEnabled: false,
    nursingSepsisRatePerThousand: 2.0,
    nursingSepsisCurrentCompliance: 75,
    nursingSepsisDocLagPercent: 30,
    nursingSepsisExcessCostPerCase: 3500,
    nursingSepsisRealization: 60,
    nursingSepsisExpanded: false,
    // Expanded states (auto-expand when first toggled on)
    wrvuExpanded: false,
    hccExpanded: false,
    denialsExpanded: false,
    ipDrgExpanded: false,
    ipCdiExpanded: false,
    nursingHapiExpanded: false,
    nursingFallsExpanded: false,
    nursingHacExpanded: false,
    nursingHcahpsExpanded: false,
  },
  pricingModel: 'perProvider',
  costPerProvider: 0,
  costPerEncounter: 0,
  annualLicenseFee: 0,
  implementationFee: 25000,
  includeImplementation: false,
  fullScaleProviders: 500,
  year2GrowthPercent: 10,
  year3GrowthPercent: 10,
};

type ExplorePhase = 
  | 'careSetting' 
  | 'practice' 
  | 'timeSavings' 
  | 'capacity'
  | 'workforce'
  | 'revenue'
  | 'quality'
  | 'investment'
  | 'model';

interface ExploreFlowProps {
  onBackToJourney?: () => void;
  onContinueToInvestment?: (state: ExploreState) => void;
  initialCareSetting?: ExploreCareSetting;
  initialPhase?: ExplorePhase;
  initialExploreState?: ExploreState;
  onAddToProforma?: (snapshot: import("@/pages/proforma/proformaTypes").ProformaSettingSnapshot) => void;
  disabledCareSettings?: ExploreCareSetting[];
}

export default function ExploreFlow({ onBackToJourney, initialCareSetting, initialPhase, initialExploreState, onAddToProforma, disabledCareSettings = [] }: ExploreFlowProps) {
  const [phase, setPhase] = useState<ExplorePhase>(() => {
    const requested = initialPhase || (initialExploreState ? 'practice' : 'careSetting');
    const legacyMap: Record<string, ExplorePhase> = {
      valueDrivers: 'capacity',
      docQuality: 'revenue',
      careQuality: 'quality',
    };
    return (legacyMap[requested as string] ?? requested) as ExplorePhase;
  });
  const [state, setState] = useState<ExploreState>(() => {
    if (initialExploreState) {
      return { ...DEFAULT_EXPLORE_STATE, ...initialExploreState };
    }
    const fresh = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: initialCareSetting || null,
    };
    return fresh;
  });

  const updateState = useCallback((updates: Partial<ExploreState>) => {
    setState(prev => {
      const next = { ...prev, ...updates };
      if (updates.numberOfProviders !== undefined && next.timeDriverInputs.accessProviders > 0) {
        next.timeDriverInputs = {
          ...next.timeDriverInputs,
          accessProviders: Math.min(next.timeDriverInputs.accessProviders, updates.numberOfProviders),
        };
      }
      return next;
    });
  }, []);

  const prevCareSettingRef = useRef(state.careSetting);
  useEffect(() => {
    if (state.careSetting && state.careSetting !== prevCareSettingRef.current) {
      const newCareSetting = state.careSetting;
      setState(() => {
        const fresh = { ...DEFAULT_EXPLORE_STATE, careSetting: newCareSetting };
        if (newCareSetting === 'ed') {
          fresh.docQualityInputs = {
            ...fresh.docQualityInputs,
            currentWrvu: 1.6,
            denialRate: 10,
            avgClaimValue: 300,
          };
        }
        return fresh;
      });
    }
    prevCareSettingRef.current = state.careSetting;
  }, [state.careSetting]);

  const prevBaselineRef = useRef({ providers: state.numberOfProviders, beds: state.nursingStaffedBeds });
  useEffect(() => {
    const baselineCount = state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders;
    if (baselineCount > 0) {
      const target = baselineCount * 3;
      if (state.fullScaleProviders < target) {
        setState(prev => ({ ...prev, fullScaleProviders: target }));
      }
    }
    prevBaselineRef.current = { providers: state.numberOfProviders, beds: state.nursingStaffedBeds };
  }, [state.numberOfProviders, state.nursingStaffedBeds, state.careSetting]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view === 'explore' && event.state?.explorePhase) {
        const requested = event.state.explorePhase as string;
        const legacyMap: Record<string, ExplorePhase> = {
          valueDrivers: 'capacity',
          docQuality: 'revenue',
          careQuality: 'quality',
        };
        const resolved = (legacyMap[requested] ?? requested) as ExplorePhase;
        setPhase(resolved);
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
      const totalMinutes = eligibleShifts * state.minutesSavedPerEncounter;
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
      if (timeDriverInputs.edLwbsEnabled) {
        const lwbsPatients = annualEncounters * (timeDriverInputs.edLwbsRate / 100);
        const recoveredPatients = lwbsPatients * (timeDriverInputs.edLwbsReduction / 100);
        const grossValue = recoveredPatients * timeDriverInputs.edRevenuePerVisit;
        total += grossValue * (timeDriverInputs.edLwbsRealization / 100);
      }
      if (timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled) {
        const lwbsPatients = annualEncounters * (timeDriverInputs.edLwbsRate / 100);
        const recoveredPatients = lwbsPatients * (timeDriverInputs.edLwbsReduction / 100);
        const admittedPatients = recoveredPatients * (timeDriverInputs.edAdmissionRate / 100);
        const grossValue = admittedPatients * timeDriverInputs.edAdmissionRevenue;
        total += grossValue * (timeDriverInputs.edAdmissionRealization / 100);
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.physicianAgencyEnabled && timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        const weeksOfCoverage = timeDriverInputs.physicianAgencyWeeksPerVacancy || 16;
        const weeklyPremium = timeDriverInputs.physicianAgencyWeeklyPremium || 5000;
        total += Math.round(retained * weeksOfCoverage * weeklyPremium);
      }
    } else if (isInpatient) {
      // Inpatient: Rounding is qualitative only (no dollar value)
      if (timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0) {
        total += timeDriverInputs.estimatedCostReduction;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.physicianAgencyEnabled && timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        const weeksOfCoverage = timeDriverInputs.physicianAgencyWeeksPerVacancy || 16;
        const weeklyPremium = timeDriverInputs.physicianAgencyWeeklyPremium || 5000;
        total += Math.round(retained * weeksOfCoverage * weeklyPremium);
      }
    } else if (isNursing) {
      if (timeDriverInputs.nursingOtEnabled) {
        const otHoursEliminated = Math.round(
          timeDriverInputs.nursingOtHoursPerNurseWeek *
          (timeDriverInputs.nursingOtReductionPercent / 100) *
          numberOfProviders *
          52
        );
        total += otHoursEliminated * timeDriverInputs.nursingOtHourlyRate;
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
      if (timeDriverInputs.nursingAdditionalCostSavings.length > 0) {
        total += timeDriverInputs.nursingAdditionalCostSavings.filter(item => item.label.trim()).reduce((sum, item) => sum + (item.amount || 0), 0);
      }
    } else {
      // Outpatient: Patient Access and Wellbeing/Retention
      if (timeDriverInputs.patientAccessEnabled) {
        const effectiveAccessProviders = Math.min(timeDriverInputs.accessProviders || numberOfProviders, numberOfProviders);
        const hrsPerProvPerWeek = numberOfProviders > 0 ? totalHoursSaved / numberOfProviders / 48 : 0;
        const reinvestmentRate = (timeDriverInputs.capacityRealizationPercent ?? 25) / 100;
        const visitDurationHrs = (timeDriverInputs.visitDuration ?? 30) / 60;
        const derivedVisitsPerWeek = visitDurationHrs > 0 ? Math.round((hrsPerProvPerWeek * reinvestmentRate / visitDurationHrs) * 10) / 10 : 0;
        const annualVisits = derivedVisitsPerWeek * effectiveAccessProviders * 48;
        total += annualVisits * timeDriverInputs.revenuePerVisit;
      }
      if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.physicianAgencyEnabled && timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        const weeksOfCoverage = timeDriverInputs.physicianAgencyWeeksPerVacancy || 16;
        const weeklyPremium = timeDriverInputs.physicianAgencyWeeklyPremium || 5000;
        total += Math.round(retained * weeksOfCoverage * weeklyPremium);
      }
    }
    
    return Math.round(total);
  }, [totalHoursSaved, state.timeDriverInputs, state.careSetting, state.annualEncounters, state.numberOfProviders]);

  // Calculate doc value using state inputs
  const docValue = useMemo(() => {
    const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
    const { docQualityInputs } = state;
    const isEDLocal = state.careSetting === 'ed';
    let total = 0;
    
    const wrvuScenarios: Record<string, number> = isEDLocal
      ? { conservative: 1, typical: 2.5, aggressive: 4 }
      : { conservative: 2, typical: 5, aggressive: 7 };
    const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };
    const denialsScenarios: Record<string, number> = isEDLocal
      ? { conservative: 15, typical: 30, aggressive: 50 }
      : { conservative: 25, typical: 50, aggressive: 75 };

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
      total += queriesAvoided * docQualityInputs.ipCdiCostPerQuery * (docQualityInputs.ipCdiRealization / 100);
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
    if (state.pricingModel === 'perEncounter') {
      return state.annualEncounters * state.costPerEncounter;
    }
    return state.annualLicenseFee;
  }, [state.pricingModel, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee, state.careSetting, state.annualEncounters, state.costPerEncounter]);

  const isNursing = state.careSetting === 'nursing';
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';

  const phaseToStep: Record<ExplorePhase, number> = {
    careSetting: 1,
    practice: 2,
    timeSavings: 3,
    capacity: 4,
    workforce: 5,
    revenue: 6,
    quality: 7,
    investment: 8,
    model: 9,
  };

  const progressBar = (
    <div className="px-4 pt-4 max-w-2xl mx-auto w-full">
      <ExploreProgressBar currentStep={phaseToStep[phase]} totalSteps={9} />
    </div>
  );

  let content: React.ReactNode = null;

  switch (phase) {
    case 'careSetting':
      content = (
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
      break;
    
    case 'practice':
      content = (
        <ExploreOpportunity
          state={state}
          updateState={updateState}
          onNext={() => navigate('timeSavings')}
          onBack={() => navigate('careSetting')}
          onHome={goHome}
        />
      );
      break;
    
    case 'timeSavings':
      content = (
        <ExploreTimeSavings
          state={state}
          updateState={updateState}
          onNext={() => {
            navigate('capacity');
          }}
          onBack={() => navigate('practice')}
          onHome={goHome}
        />
      );
      break;
    
    case 'capacity': {
      const priorQuadrants: PriorQuadrantEntry[] = [];
      content = (
        <ExploreCapacity
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('workforce')}
          onBack={() => navigate('timeSavings')}
          onHome={goHome}
        />
      );
      break;
    }
    
    case 'workforce': {
      const capacity = computeCapacityBreakdown(state, totalHoursSaved);
      const priorQuadrants: PriorQuadrantEntry[] = [
        { key: 'capacity', label: 'Capacity', value: capacity.quadrantAnnualTotal },
      ];
      content = (
        <ExploreWorkforce
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('revenue')}
          onBack={() => navigate('capacity')}
          onHome={goHome}
        />
      );
      break;
    }
    
    case 'revenue': {
      const capacity = computeCapacityBreakdown(state, totalHoursSaved);
      const workforce = computeWorkforceBreakdown(state, totalHoursSaved);
      const priorQuadrants: PriorQuadrantEntry[] = [
        { key: 'capacity', label: 'Capacity', value: capacity.quadrantAnnualTotal },
        { key: 'workforce', label: 'Workforce', value: workforce.quadrantAnnualTotal },
      ];
      content = (
        <ExploreRevenue
          state={state}
          updateState={updateState}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('quality')}
          onBack={() => navigate('workforce')}
          onHome={goHome}
        />
      );
      break;
    }
    
    case 'quality': {
      const capacity = computeCapacityBreakdown(state, totalHoursSaved);
      const workforce = computeWorkforceBreakdown(state, totalHoursSaved);
      const revenue = computeRevenueBreakdown(state, totalHoursSaved);
      const priorQuadrants: PriorQuadrantEntry[] = [
        { key: 'capacity', label: 'Capacity', value: capacity.quadrantAnnualTotal },
        { key: 'workforce', label: 'Workforce', value: workforce.quadrantAnnualTotal },
        { key: 'revenue', label: 'Revenue', value: revenue.quadrantAnnualTotal },
      ];
      content = (
        <ExploreQuality
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('investment')}
          onBack={() => navigate('revenue')}
          onHome={goHome}
        />
      );
      break;
    }
    
    case 'investment':
      content = (
        <ExploreInvestment
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          timeValue={timeValue}
          docValue={docValue}
          onNext={() => navigate('model')}
          onBack={() => navigate('quality')}
          onHome={goHome}
        />
      );
      break;
    
    case 'model': {
      const stepPhaseMap: ExplorePhase[] = [
        'careSetting',
        'practice',
        'timeSavings',
        'capacity',
        'workforce',
        'revenue',
        'quality',
        'investment',
        'model',
      ];
      const stepLabels = [
        'Care Setting',
        'Practice',
        'Time Savings',
        'Capacity',
        'Workforce',
        'Revenue',
        'Quality',
        'Investment',
        'Your Model',
      ];
      content = (
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
      break;
    }
  }

  return (
    <>
      {progressBar}
      {content}
    </>
  );
}

export { ExploreFlow };
