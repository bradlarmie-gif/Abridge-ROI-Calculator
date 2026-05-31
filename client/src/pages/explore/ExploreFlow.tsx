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

export interface CostDisplacementItem {
  id: string;
  label: string;
  annualSpend: number;
  displacementPct: number;
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
  retentionImpactScenario: 'conservative' | 'typical' | 'optimistic' | 'custom';
  retentionCustomPercent: number;
  
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

  // OP qualitative Quality drivers (3 — methodology-aligned: Care Gap Closure / HEDIS / STARS)
  opCdiQueryTrendEnabled: boolean;
  opCdiQueryTrendExpanded: boolean;
  opCareGapClosureRateEnabled: boolean;
  opCareGapClosureRateExpanded: boolean;
  opHedisCompositeScoreEnabled: boolean;
  opHedisCompositeScoreExpanded: boolean;
  opMaStarsPerformanceEnabled: boolean;
  opMaStarsPerformanceExpanded: boolean;
  // ED qualitative Quality (3)
  edCoreMeasureDocRateEnabled: boolean;
  edCoreMeasureDocRateExpanded: boolean;
  edDocDeficiencyRateEnabled: boolean;
  edDocDeficiencyRateExpanded: boolean;
  // IP qualitative Quality drivers (legacy state vars retained for compatibility)
  ipHcahpsCompositeEnabled: boolean;
  ipHcahpsCompositeExpanded: boolean;
  ipReadmissionEnabled: boolean;
  ipReadmissionExpanded: boolean;
  // IP Capacity (4)
  ipHnpCompletion24hEnabled: boolean;
  ipHnpCompletion24hExpanded: boolean;
  ipConsultThroughputEnabled: boolean;
  ipConsultThroughputExpanded: boolean;
  // IP Quality (4)
  ipCdiQueryRateEnabled: boolean;
  ipCdiQueryRateExpanded: boolean;
  ipSoiClassificationEnabled: boolean;
  ipSoiClassificationExpanded: boolean;
  ipHcahpsDoctorEnabled: boolean;
  ipHcahpsDoctorExpanded: boolean;
  ipReadmissionRateEnabled: boolean;
  ipReadmissionRateExpanded: boolean;
  // ED qualitative Quality (patient experience addition)
  edPatientExperienceEnabled: boolean;
  edPatientExperienceExpanded: boolean;
  // Nursing qualitative Quality
  nursingEarlyDeteriorationEnabled: boolean;
  nursingEarlyDeteriorationExpanded: boolean;
  nursingBundleComplianceEnabled: boolean;
  nursingBundleComplianceExpanded: boolean;
  // Nursing qualitative Revenue
  nursingCdiResponseEnabled: boolean;
  nursingCdiResponseExpanded: boolean;
  nursingDocCompletionEnabled: boolean;
  nursingDocCompletionExpanded: boolean;

  // ───── R-IA-2 / R-IA-3 curated qualitative drivers ─────
  // OP Capacity qualitative (3 — trimmed by R-IA-3)
  opThirdNextAvailableEnabled: boolean;
  opThirdNextAvailableExpanded: boolean;
  opSameDayAccessEnabled: boolean;
  opSameDayAccessExpanded: boolean;
  opPanelSizePerProviderEnabled: boolean;
  opPanelSizePerProviderExpanded: boolean;
  // OP Workforce qualitative (3 — trimmed by R-IA-3)
  opAfterHoursDocEnabled: boolean;
  opAfterHoursDocExpanded: boolean;
  opNotesBeforeLeavingEnabled: boolean;
  opNotesBeforeLeavingExpanded: boolean;
  opBurnoutTrackingEnabled: boolean;
  opBurnoutTrackingExpanded: boolean;
  // OP Revenue qualitative (3 — trimmed by R-IA-3)
  opEmLevelDistributionEnabled: boolean;
  opEmLevelDistributionExpanded: boolean;
  opCodingSpecificityEnabled: boolean;
  opCodingSpecificityExpanded: boolean;
  opFirstPassClaimRateEnabled: boolean;
  opFirstPassClaimRateExpanded: boolean;
  opCgCahpsEnabled: boolean;
  opCgCahpsExpanded: boolean;
  // ED Capacity qualitative (3)
  edDoorToProviderEnabled: boolean;
  edDoorToProviderExpanded: boolean;
  edEncountersPerShiftEnabled: boolean;
  edEncountersPerShiftExpanded: boolean;
  edLwbsRateEnabled: boolean;
  edLwbsRateExpanded: boolean;
  // ED Workforce qualitative (4)
  edAfterHoursDocEnabled: boolean;
  edAfterHoursDocExpanded: boolean;
  edEndOfShiftCompletionEnabled: boolean;
  edEndOfShiftCompletionExpanded: boolean;
  edBurnoutTrackingEnabled: boolean;
  edBurnoutTrackingExpanded: boolean;
  edLikelihoodToStayEnabled: boolean;
  edLikelihoodToStayExpanded: boolean;
  // ED Revenue qualitative (3)
  edEmLevelDistributionEnabled: boolean;
  edEmLevelDistributionExpanded: boolean;
  edCdiQueryAdmissionsEnabled: boolean;
  edCdiQueryAdmissionsExpanded: boolean;
  edDowncodingRateEnabled: boolean;
  edDowncodingRateExpanded: boolean;
  // IP Capacity qualitative (3 — restructured by R-IA-5; ALOS removed)
  // IP Capacity qualitative (4)
  ipDocumentationLagEnabled: boolean;
  ipDocumentationLagExpanded: boolean;
  ipDischargeGoalDocEnabled: boolean;
  ipDischargeGoalDocExpanded: boolean;
  // IP Workforce qualitative (4)
  ipAfterHoursDocEnabled: boolean;
  ipAfterHoursDocExpanded: boolean;
  ipProgressNoteCompletionEnabled: boolean;
  ipProgressNoteCompletionExpanded: boolean;
  ipBurnoutTrackingEnabled: boolean;
  ipBurnoutTrackingExpanded: boolean;
  ipLikelihoodToStayEnabled: boolean;
  ipLikelihoodToStayExpanded: boolean;
  // IP Revenue qualitative (3 — expanded by R-IA-5)
  ipCmiTrackingEnabled: boolean;
  ipCmiTrackingExpanded: boolean;
  ipCcMccCaptureEnabled: boolean;
  ipCcMccCaptureExpanded: boolean;
  ipCdiQueryTrendEnabled: boolean;
  ipCdiQueryTrendExpanded: boolean;
  // Nursing Capacity qualitative (3 — expanded by R-IA-6)
  nursingDocumentationLagEnabled: boolean;
  nursingDocumentationLagExpanded: boolean;
  nursingPointOfCareDocEnabled: boolean;
  nursingPointOfCareDocExpanded: boolean;
  // Nursing Workforce qualitative (3 — expanded by R-IA-6)
  nursingLikelihoodToStayEnabled: boolean;
  nursingLikelihoodToStayExpanded: boolean;
  nursingBurnoutEnabled: boolean;
  nursingBurnoutExpanded: boolean;
  nursingChartingAfterShiftEnabled: boolean;
  nursingChartingAfterShiftExpanded: boolean;
  // Doc time per note (all care settings)
  opDocTimePerNoteEnabled: boolean;
  opDocTimePerNoteExpanded: boolean;
  edDocTimePerEncounterEnabled: boolean;
  edDocTimePerEncounterExpanded: boolean;
  ipDocTimeHnpEnabled: boolean;
  ipDocTimeHnpExpanded: boolean;
  ipDocTimeProgressNoteEnabled: boolean;
  ipDocTimeProgressNoteExpanded: boolean;
  ipDocTimeConsultNoteEnabled: boolean;
  ipDocTimeConsultNoteExpanded: boolean;
  ipDocTimeDischargeEnabled: boolean;
  ipDocTimeDischargeExpanded: boolean;
  nursingDocTimePerEventEnabled: boolean;
  nursingDocTimePerEventExpanded: boolean;
  // Scribe cost reduction (Workforce, quantified — OP + ED)
  scribeCostReductionEnabled: boolean;
  scribeCostReductionExpanded: boolean;
  // OP Revenue qualitative
  opPriorAuthP2PEnabled: boolean;
  opPriorAuthP2PExpanded: boolean;
  opClaimsReworkTimeEnabled: boolean;
  opClaimsReworkTimeExpanded: boolean;
  // OP Quality qualitative
  opNoteCompletenessEnabled: boolean;
  opNoteCompletenessExpanded: boolean;
  opReferralDocQualityEnabled: boolean;
  opReferralDocQualityExpanded: boolean;
  // ED Capacity qualitative
  edDoorToDispositionEnabled: boolean;
  edDoorToDispositionExpanded: boolean;
  // ED Revenue qualitative
  edClaimsReworkTimeEnabled: boolean;
  edClaimsReworkTimeExpanded: boolean;
  // ED Quality qualitative
  edNoteCompletenessEnabled: boolean;
  edNoteCompletenessExpanded: boolean;
  edSepsisBundleEnabled: boolean;
  edSepsisBundleExpanded: boolean;
  // IP Capacity qualitative
  ipLengthOfStayEnabled: boolean;
  ipLengthOfStayExpanded: boolean;
  ipDischargeSummaryTimelinessEnabled: boolean;
  ipDischargeSummaryTimelinessExpanded: boolean;
  // IP Revenue qualitative
  ipClaimsReworkTimeEnabled: boolean;
  ipClaimsReworkTimeExpanded: boolean;
  // IP Quality qualitative
  ipPoaDocRateEnabled: boolean;
  ipPoaDocRateExpanded: boolean;
  ipNoteCompletenessEnabled: boolean;
  ipNoteCompletenessExpanded: boolean;
}

export interface HccPlan {
  id: string;
  planType: 'medicare_advantage' | 'aca_marketplace' | 'medicaid_mco' | 'custom';
  name: string;
  panelSize: number;              // patients on this plan per provider
  valuePerHcc: number;            // $ per captured HCC condition (RAF impact × annual payment collapsed)
  // Recapture
  gapRate: number;                // % of plan patients with known conditions needing recode annually
  currentRecaptureRate: number;   // % they currently capture (0–100)
  uplift: 'conservative' | 'typical' | 'optimistic';
  // Net new
  netNewEnabled: boolean;
  netNewDiscoveryRate: number;    // % of plan patients where ambient surfaces a never-coded condition
  netNewAvgConditions: number;    // avg new HCC conditions per discovered patient
}

// Documentation Quality inputs
export interface DocQualityInputs {
  // wRVU
  wrvuEnabled: boolean;
  wrvuScenario: 'conservative' | 'typical' | 'aggressive' | 'custom';
  wrvuCustomPercent: number;
  currentWrvu: number;
  conversionFactor: number;
  wrvuRealization: number;

  // HCC
  hccEnabled: boolean;
  hccPlans: HccPlan[];
  avgHccs: number;
  hccRealization: number;
  
  // Denials
  denialsEnabled: boolean;
  denialsScenario: 'conservative' | 'typical' | 'aggressive';
  medNecessityDenialRate: number;
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
  costDisplacementItems: CostDisplacementItem[];
  costDisplacementY1Override?: number;
  costDisplacementY2Override?: number;
  costDisplacementY3Override?: number;

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
    retentionCustomPercent: 10,
    // ED-specific defaults
    edLwbsEnabled: false,
    edLwbsRate: 3, // 3% baseline LWBS rate
    edLwbsReduction: 10, // 10% reduction in LWBS (conservative default)
    edRevenuePerVisit: 480, // Higher than outpatient
    edLwbsRealization: 80, // 80% realization (not all recovered patients complete visits)
    edThroughputEnabled: false,
    edAdmissionRate: 18, // 18% of recovered patients get admitted
    edAdmissionRevenue: 8000, // Average admission revenue
    edAdmissionRealization: 60, // 60% realization (bed availability, payer mix)
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
    // OP Quality qualitative driver defaults (methodology-aligned)
    opCdiQueryTrendEnabled: false,
    opCdiQueryTrendExpanded: false,
    opCareGapClosureRateEnabled: false,
    opCareGapClosureRateExpanded: false,
    opHedisCompositeScoreEnabled: false,
    opHedisCompositeScoreExpanded: false,
    opMaStarsPerformanceEnabled: false,
    opMaStarsPerformanceExpanded: false,
    edCoreMeasureDocRateEnabled: false,
    edCoreMeasureDocRateExpanded: false,
    edDocDeficiencyRateEnabled: false,
    edDocDeficiencyRateExpanded: false,
    ipHcahpsCompositeEnabled: false,
    ipHcahpsCompositeExpanded: false,
    ipReadmissionEnabled: false,
    ipReadmissionExpanded: false,
    // IP Capacity (4)
    ipHnpCompletion24hEnabled: false,
    ipHnpCompletion24hExpanded: false,
    ipConsultThroughputEnabled: false,
    ipConsultThroughputExpanded: false,
    // IP Quality (4)
    ipCdiQueryRateEnabled: false,
    ipCdiQueryRateExpanded: false,
    ipSoiClassificationEnabled: false,
    ipSoiClassificationExpanded: false,
    ipHcahpsDoctorEnabled: false,
    ipHcahpsDoctorExpanded: false,
    ipReadmissionRateEnabled: false,
    ipReadmissionRateExpanded: false,
    // ED Quality (patient experience)
    edPatientExperienceEnabled: false,
    edPatientExperienceExpanded: false,
    nursingEarlyDeteriorationEnabled: false,
    nursingEarlyDeteriorationExpanded: false,
    nursingBundleComplianceEnabled: false,
    nursingBundleComplianceExpanded: false,
    nursingCdiResponseEnabled: false,
    nursingCdiResponseExpanded: false,
    nursingDocCompletionEnabled: false,
    nursingDocCompletionExpanded: false,
    // R-IA-2 / R-IA-3 curated qualitative driver defaults
    opThirdNextAvailableEnabled: false,
    opThirdNextAvailableExpanded: false,
    opSameDayAccessEnabled: false,
    opSameDayAccessExpanded: false,
    opPanelSizePerProviderEnabled: false,
    opPanelSizePerProviderExpanded: false,
    opAfterHoursDocEnabled: false,
    opAfterHoursDocExpanded: false,
    opNotesBeforeLeavingEnabled: false,
    opNotesBeforeLeavingExpanded: false,
    opBurnoutTrackingEnabled: false,
    opBurnoutTrackingExpanded: false,
    opEmLevelDistributionEnabled: false,
    opEmLevelDistributionExpanded: false,
    opCodingSpecificityEnabled: false,
    opCodingSpecificityExpanded: false,
    opFirstPassClaimRateEnabled: false,
    opFirstPassClaimRateExpanded: false,
    opCgCahpsEnabled: false,
    opCgCahpsExpanded: false,
    edDoorToProviderEnabled: false,
    edDoorToProviderExpanded: false,
    edEncountersPerShiftEnabled: false,
    edEncountersPerShiftExpanded: false,
    edLwbsRateEnabled: false,
    edLwbsRateExpanded: false,
    edAfterHoursDocEnabled: false,
    edAfterHoursDocExpanded: false,
    edEndOfShiftCompletionEnabled: false,
    edEndOfShiftCompletionExpanded: false,
    edBurnoutTrackingEnabled: false,
    edBurnoutTrackingExpanded: false,
    edLikelihoodToStayEnabled: false,
    edLikelihoodToStayExpanded: false,
    edEmLevelDistributionEnabled: false,
    edEmLevelDistributionExpanded: false,
    edCdiQueryAdmissionsEnabled: false,
    edCdiQueryAdmissionsExpanded: false,
    edDowncodingRateEnabled: false,
    edDowncodingRateExpanded: false,
    ipDocumentationLagEnabled: false,
    ipDocumentationLagExpanded: false,
    ipDischargeGoalDocEnabled: false,
    ipDischargeGoalDocExpanded: false,
    ipAfterHoursDocEnabled: false,
    ipAfterHoursDocExpanded: false,
    ipProgressNoteCompletionEnabled: false,
    ipProgressNoteCompletionExpanded: false,
    ipBurnoutTrackingEnabled: false,
    ipBurnoutTrackingExpanded: false,
    ipLikelihoodToStayEnabled: false,
    ipLikelihoodToStayExpanded: false,
    ipCmiTrackingEnabled: false,
    ipCmiTrackingExpanded: false,
    ipCcMccCaptureEnabled: false,
    ipCcMccCaptureExpanded: false,
    ipCdiQueryTrendEnabled: false,
    ipCdiQueryTrendExpanded: false,
    nursingDocumentationLagEnabled: false,
    nursingDocumentationLagExpanded: false,
    nursingPointOfCareDocEnabled: false,
    nursingPointOfCareDocExpanded: false,
    nursingLikelihoodToStayEnabled: false,
    nursingLikelihoodToStayExpanded: false,
    nursingBurnoutEnabled: false,
    nursingBurnoutExpanded: false,
    nursingChartingAfterShiftEnabled: false,
    nursingChartingAfterShiftExpanded: false,
    opDocTimePerNoteEnabled: false,
    opDocTimePerNoteExpanded: false,
    edDocTimePerEncounterEnabled: false,
    edDocTimePerEncounterExpanded: false,
    ipDocTimeHnpEnabled: false,
    ipDocTimeHnpExpanded: false,
    ipDocTimeProgressNoteEnabled: false,
    ipDocTimeProgressNoteExpanded: false,
    ipDocTimeConsultNoteEnabled: false,
    ipDocTimeConsultNoteExpanded: false,
    ipDocTimeDischargeEnabled: false,
    ipDocTimeDischargeExpanded: false,
    nursingDocTimePerEventEnabled: false,
    nursingDocTimePerEventExpanded: false,
    scribeCostReductionEnabled: false,
    scribeCostReductionExpanded: false,
    opPriorAuthP2PEnabled: false,
    opPriorAuthP2PExpanded: false,
    opClaimsReworkTimeEnabled: false,
    opClaimsReworkTimeExpanded: false,
    opNoteCompletenessEnabled: false,
    opNoteCompletenessExpanded: false,
    opReferralDocQualityEnabled: false,
    opReferralDocQualityExpanded: false,
    edDoorToDispositionEnabled: false,
    edDoorToDispositionExpanded: false,
    edClaimsReworkTimeEnabled: false,
    edClaimsReworkTimeExpanded: false,
    edNoteCompletenessEnabled: false,
    edNoteCompletenessExpanded: false,
    edSepsisBundleEnabled: false,
    edSepsisBundleExpanded: false,
    ipLengthOfStayEnabled: false,
    ipLengthOfStayExpanded: false,
    ipDischargeSummaryTimelinessEnabled: false,
    ipDischargeSummaryTimelinessExpanded: false,
    ipClaimsReworkTimeEnabled: false,
    ipClaimsReworkTimeExpanded: false,
    ipPoaDocRateEnabled: false,
    ipPoaDocRateExpanded: false,
    ipNoteCompletenessEnabled: false,
    ipNoteCompletenessExpanded: false,
  },
  otherFinancialBenefits: [],
  costDisplacementItems: [],
  // Documentation quality inputs
  docQualityInputs: {
    wrvuEnabled: false,
    wrvuScenario: 'typical',
    wrvuCustomPercent: 5,
    currentWrvu: 1.8,
    conversionFactor: 33,
    wrvuRealization: 75,
    hccEnabled: false,
    hccPlans: [{
      id: 'plan-ma',
      planType: 'medicare_advantage' as const,
      name: 'Medicare Advantage',
      panelSize: 300,
      valuePerHcc: 1500,
      gapRate: 65,
      currentRecaptureRate: 65,
      uplift: 'typical' as const,
      netNewEnabled: false,
      netNewDiscoveryRate: 3,
      netNewAvgConditions: 1.2,
    }],
    avgHccs: 0.5,
    hccRealization: 50,
    denialsEnabled: false,
    denialsScenario: 'typical',
    medNecessityDenialRate: 3,
    avgClaimValue: 200,
    denialsRealization: 60,
    // Inpatient: DRG Accuracy defaults
    ipDrgEnabled: false,
    ipDrgScenario: 'typical',
    ipDrgAtRiskRate: 18, // 18% of admissions have documentation gaps
    ipDrgWeightIncrease: 0.3, // Average DRG weight difference
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
    ipCdiCostPerQuery: 50, // $50 per query
    ipCdiRealization: 75,
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
  onBackToProforma?: () => void;
  onContinueToInvestment?: (state: ExploreState) => void;
  initialCareSetting?: ExploreCareSetting;
  initialPhase?: ExplorePhase;
  initialExploreState?: ExploreState;
  onAddToProforma?: (snapshot: import("@/pages/proforma/proformaTypes").ProformaSettingSnapshot) => void;
  disabledCareSettings?: ExploreCareSetting[];
}

export default function ExploreFlow({ onBackToJourney, onBackToProforma, initialCareSetting, initialPhase, initialExploreState, onAddToProforma, disabledCareSettings = [] }: ExploreFlowProps) {
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

  const fullScaleManualRef = useRef(false);

  const updateState = useCallback((updates: Partial<ExploreState>) => {
    if ('fullScaleProviders' in updates) {
      fullScaleManualRef.current = true;
    }
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
            currentWrvu: 1.8,
            medNecessityDenialRate: 5,
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
    if (fullScaleManualRef.current) return;
    const baselineCount = state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders;
    if (baselineCount > 0) {
      setState(prev => ({ ...prev, fullScaleProviders: baselineCount * 2 }));
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
        if (onBackToProforma) {
          onBackToProforma();
        } else if (onBackToJourney) {
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
  }, [onBackToJourney, onBackToProforma]);

  const goHome = useCallback(() => {
    if (onBackToProforma) {
      onBackToProforma();
    } else if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToProforma, onBackToJourney]);

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
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.physicianAgencyEnabled && timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
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
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.physicianAgencyEnabled && timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
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
        const retentionImpactRates: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
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
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
        const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
        const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
        const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
        const providersLeaving = numberOfProviders * turnoverRate;
        const burnoutRelated = providersLeaving * burnoutRate;
        const retained = burnoutRelated * impactRate;
        total += retained * timeDriverInputs.replacementCost;
      }
      if (timeDriverInputs.physicianAgencyEnabled && timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue) {
        const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: timeDriverInputs.retentionCustomPercent ?? 10 };
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
      ? { conservative: 2, typical: 5, aggressive: 9, custom: docQualityInputs.wrvuCustomPercent ?? 5 }
      : { conservative: 2, typical: 5, aggressive: 9, custom: docQualityInputs.wrvuCustomPercent ?? 5 };
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
      const upliftMap: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
      let totalGross = 0;
      for (const plan of docQualityInputs.hccPlans) {
        const upliftPp = upliftMap[plan.uplift] ?? 10;
        const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - plan.currentRecaptureRate));
        const gapPatients = state.numberOfProviders * plan.panelSize * plan.gapRate / 100;
        totalGross += gapPatients * (effectiveUplift / 100) * docQualityInputs.avgHccs * plan.valuePerHcc;
        if (plan.netNewEnabled) {
          const netNewPts = state.numberOfProviders * plan.panelSize * plan.netNewDiscoveryRate / 100;
          totalGross += netNewPts * plan.netNewAvgConditions * plan.valuePerHcc;
        }
      }
      total += totalGross * (docQualityInputs.hccRealization / 100);
    }

    // Denials (not for inpatient - included in DRG Accuracy)
    if (docQualityInputs.denialsEnabled && state.careSetting !== 'inpatient') {
      const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
      const medNecessityDenials = eligibleEncounters * (docQualityInputs.medNecessityDenialRate / 100);
      const prevented = medNecessityDenials * (preventionPercent / 100);
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
      const ipCdiReductionScenarios: Record<string, number> = { conservative: 15, typical: 30, aggressive: 50 };
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
          totalHoursSaved={totalHoursSaved}
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
