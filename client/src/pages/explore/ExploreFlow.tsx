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
import {
  computeCapacityBreakdown,
  computeWorkforceBreakdown,
  computeRevenueBreakdown,
  type PriorQuadrantEntry,
} from "@/lib/exploreQuadrantValues";
import { computeExploreTotals } from "@/lib/exploreDriverCalcs";

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

// DocPathFocus is retained as an exported type; the per-path doc-driver state
// it once gated is dead and was removed.
export type DocPathFocus = 'wrvu' | 'hcc' | 'denials';

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
  // Discharge Planning Initiation driver (qualitative — no calc inputs needed)
  ipDischargePlanningEnabled: boolean;
  ipDischargePlanningExpanded: boolean;
  
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

  // Scribe Cost Reduction (OP/ED)
  scribeBillingMode: 'position' | 'hourly';
  scribeHeadcount: number;
  scribeCostPerPosition: number;
  scribePositionsEliminated: number;
  scribeHourlyRate: number;
  scribeMinutesPerNote: number;
  scribeCoveragePercent: number;
  scribeVisitPercentEliminated: number;

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
  opFirstPassClaimRateEnabled: boolean;
  opFirstPassClaimRateExpanded: boolean;
  opCgCahpsEnabled: boolean;
  opCgCahpsExpanded: boolean;
  // ED Capacity qualitative (3)
  edDoorToProviderEnabled: boolean;
  edDoorToProviderExpanded: boolean;
  edEncountersPerShiftEnabled: boolean;
  edEncountersPerShiftExpanded: boolean;
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
  // IP Revenue qualitative (expanded by R-IA-5)
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
  uplift: 'conservative' | 'typical' | 'optimistic' | 'custom';
  upliftCustomPp?: number;
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
  denialsScenario: 'conservative' | 'typical' | 'aggressive' | 'custom';
  denialsCustomPercent: number;
  medNecessityDenialRate: number;
  avgClaimValue: number;
  denialsRealization: number;
  
  // Inpatient: DRG Accuracy
  ipDrgEnabled: boolean;
  ipDrgScenario: 'conservative' | 'typical' | 'aggressive' | 'custom';
  ipDrgCustomPercent: number;
  ipDrgAtRiskRate: number; // % of admissions with documentation gaps
  ipDrgWeightIncrease: number; // Average DRG weight difference
  ipDrgBasePayment: number; // Base DRG payment
  ipDrgRealization: number; // Realization rate (audit adjustments)
  
  // Inpatient: Obs/IP Status Defense
  ipObsDefenseEnabled: boolean;
  ipObsDefenseDenialRate: number;
  ipObsDefenseRevenueDelta: number;         // IP-to-Obs revenue delta per downgraded case
  ipObsDefensePreventableScenario: 'conservative' | 'typical' | 'aggressive' | 'custom';
  ipObsDefenseCustomPercent: number;
  ipObsDefenseRealization: number;
  ipObsDefenseExpanded: boolean;
  
  // Inpatient: CDI Query Reduction
  ipCdiEnabled: boolean;
  ipCdiScenario: 'conservative' | 'typical' | 'aggressive' | 'custom';
  ipCdiCustomPercent: number;
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

  wrvuPctIncrease: number;
  hccPctRecaptured: number;
  denialsPctReduced: number;
  
  // Time value driver inputs
  timeDriverInputs: TimeDriverInputs;
  
  // Documentation quality inputs
  docQualityInputs: DocQualityInputs;
  
  // Investment values
  pricingModel: 'perProvider' | 'perEncounter' | 'annual' | 'platform';
  costPerProvider: number;
  costPerEncounter: number;
  annualLicenseFee: number;
  platformEncRate: number;
  implementationFee: number;
  includeImplementation: boolean;
  
  // Full scale projection
  fullScaleProviders: number;
  
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
    ipDischargePlanningEnabled: false,
    ipDischargePlanningExpanded: false,
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
    scribeBillingMode: 'position',
    scribeHeadcount: 0,
    scribeCostPerPosition: 0,
    scribePositionsEliminated: 0,
    scribeHourlyRate: 0,
    scribeMinutesPerNote: 20,
    scribeCoveragePercent: 100,
    scribeVisitPercentEliminated: 100,
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
    opFirstPassClaimRateEnabled: false,
    opFirstPassClaimRateExpanded: false,
    opCgCahpsEnabled: false,
    opCgCahpsExpanded: false,
    edDoorToProviderEnabled: false,
    edDoorToProviderExpanded: false,
    edEncountersPerShiftEnabled: false,
    edEncountersPerShiftExpanded: false,
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
    denialsCustomPercent: 15,
    medNecessityDenialRate: 3,
    avgClaimValue: 200,
    denialsRealization: 60,
    // Inpatient: DRG Accuracy defaults
    ipDrgEnabled: false,
    ipDrgScenario: 'typical',
    ipDrgCustomPercent: 20,
    ipDrgAtRiskRate: 18, // 18% of admissions have documentation gaps
    ipDrgWeightIncrease: 0.3, // Average DRG weight difference
    ipDrgBasePayment: 6000, // $6,000 base DRG payment
    ipDrgRealization: 65, // 65% realization (RAC/PEPPER audits)
    // Inpatient: Obs/IP Status Defense defaults
    ipObsDefenseEnabled: false,
    ipObsDefenseDenialRate: 5,
    ipObsDefenseRevenueDelta: 5000,
    ipObsDefensePreventableScenario: 'typical',
    ipObsDefenseCustomPercent: 40,
    ipObsDefenseRealization: 50,
    ipObsDefenseExpanded: false,
    // Inpatient: CDI Query Reduction defaults
    ipCdiEnabled: false,
    ipCdiScenario: 'typical',
    ipCdiCustomPercent: 25,
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
  platformEncRate: 0,
  implementationFee: 25000,
  includeImplementation: false,
  fullScaleProviders: 500,
  year2GrowthPercent: 10,
  year3GrowthPercent: 10,
};

export type ExplorePhase =
  | 'careSetting'
  | 'practice' 
  | 'timeSavings' 
  | 'capacity'
  | 'workforce'
  | 'revenue'
  | 'quality'
  | 'investment'
  | 'model';

const LEGACY_PHASE_MAP: Record<string, ExplorePhase> = {
  valueDrivers: 'capacity',
  docQuality: 'revenue',
  careQuality: 'quality',
};

/**
 * Single source of truth for turning a requested phase (from navigate, the
 * browser popstate handler, or the initial-phase prop) into the phase we
 * actually show. Applies the legacy alias map AND, when editing an existing
 * proforma setting, hides the expansion ('investment') page — the proforma
 * owns deployment, so that page is irrelevant on an edit and its output is
 * discarded on merge. Every setPhase path funnels through here so the page
 * can't sneak back via Next, a breadcrumb step, OR browser back/forward.
 */
export function resolveExplorePhase(requested: string, editing: boolean): ExplorePhase {
  const mapped = (LEGACY_PHASE_MAP[requested] ?? requested) as ExplorePhase;
  return (editing && mapped === 'investment') ? 'model' : mapped;
}

interface ExploreFlowProps {
  onBackToJourney?: () => void;
  onBackToProforma?: () => void;
  initialCareSetting?: ExploreCareSetting;
  initialPhase?: ExplorePhase;
  initialExploreState?: ExploreState;
  onAddToProforma?: (snapshot: import("@/pages/proforma/proformaTypes").ProformaSettingSnapshot) => void;
  disabledCareSettings?: ExploreCareSetting[];
  onDataRequest?: () => void;
}

export default function ExploreFlow({ onBackToJourney, onBackToProforma, initialCareSetting, initialPhase, initialExploreState, onAddToProforma, disabledCareSettings = [], onDataRequest }: ExploreFlowProps) {
  const [phase, setPhase] = useState<ExplorePhase>(() => {
    const requested = initialPhase || (initialExploreState ? 'practice' : 'careSetting');
    return resolveExplorePhase(requested, !!initialExploreState && !!onAddToProforma);
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
            avgClaimValue: 1200,
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
        const resolved = resolveExplorePhase(requested, !!initialExploreState && !!onAddToProforma);
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
  }, [onBackToJourney, onBackToProforma, initialExploreState, onAddToProforma]);

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
    // When editing an existing proforma setting, the proforma owns deployment/
    // expansion — the Explore "investment" (expansion) page is irrelevant and its
    // output is discarded on merge. Make it unreachable so users can't land on it
    // and think a ramp change there will stick. Redirect to the model summary.
    const target = resolveExplorePhase(nextPhase, !!initialExploreState && !!onAddToProforma);
    setPhase(target);
    window.history.pushState({
      view: 'explore',
      explorePhase: target
    }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialExploreState, onAddToProforma]);

  // Fast-exit: when editing an existing proforma setting's drivers, let the user
  // commit from any driver screen and jump straight back to the Business Case,
  // skipping the investment + model pages. Routes THROUGH ExploreModel's existing
  // handleAddToProforma (via autoCommitToProforma) so the numbers match the normal flow.
  const isEditingProforma = !!initialExploreState && !!onAddToProforma;
  // "Back to Business Case" should appear whenever we arrived from the proforma —
  // editing an existing setting OR adding a new one — for a consistent escape
  // hatch on every screen. (Expansion-page hiding stays edit-only below.)
  const cameFromProforma = !!onBackToProforma && !!onAddToProforma;
  const [fastExitCommit, setFastExitCommit] = useState(false);
  const fastExitToProforma = useCallback(() => {
    setFastExitCommit(true);
    navigate('model');
  }, [navigate]);

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

  // Canonical headline totals — same driver engine the Your Model screen, PDF,
  // and proforma use. The Investment screen consumes these so its Total Value
  // and ROI can never diverge from the Model screen (see exploreTotals.test.ts).
  //
  // timeValue/docValue (passed down to ExploreModel) used to be independent
  // re-derivations of this same math — a parallel computation that could
  // (and did) drift from the engine, e.g. the nursing-quality drivers
  // (HAPI/Falls/CAUTI/CLABSI/Sepsis) were never included in the old docValue
  // calc at all. They are now just this total's efficiency/documentation
  // split, so they can't drift (see exploreSnapshotParity.test.ts).
  const exploreTotals = useMemo(
    () => computeExploreTotals(state, totalHoursSaved),
    [state, totalHoursSaved],
  );
  const timeValue = exploreTotals.efficiencyValue;
  const docValue = exploreTotals.documentationValue;

  // Calculate annual investment
  const annualInvestment = useMemo(() => {
    if (state.pricingModel === 'perProvider') {
      const units = state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders;
      return units * state.costPerProvider * 12;
    }
    if (state.pricingModel === 'perEncounter') {
      return state.annualEncounters * state.costPerEncounter;
    }
    if (state.pricingModel === 'platform') {
      return state.annualLicenseFee + state.annualEncounters * state.platformEncRate;
    }
    return state.annualLicenseFee;
  }, [state.pricingModel, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee, state.careSetting, state.annualEncounters, state.costPerEncounter, state.platformEncRate]);

  const isNursing = state.careSetting === 'nursing';
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';

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
          onDataRequest={onDataRequest}
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
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
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
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
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
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
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
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
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
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
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
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
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
          efficiencyValue={exploreTotals.efficiencyValue}
          documentationValue={exploreTotals.documentationValue}
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
          onBack={() => navigate(isEditingProforma ? 'quality' : 'investment')}
          onHome={goHome}
          onAddToProforma={onAddToProforma}
          onStepClick={(step: number) => navigate(stepPhaseMap[step - 1])}
          stepLabels={stepLabels}
          autoCommitToProforma={fastExitCommit}
        />
      );
      break;
    }
  }

  return <>{content}</>;
}

export { ExploreFlow };
