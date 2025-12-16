export type LeverId = 
  | "patientAccess" 
  | "overtime" 
  | "workforce" 
  | "wrvu" 
  | "denials" 
  | "riskAdjustment";

export interface Lever {
  id: LeverId;
  label: string;
  value: number;
  enabled: boolean;
  description: string;
}

export interface RoiInputs {
  contractLengthYears: number;
  numberOfProviders: number;
  enterpriseProviderCount: number;
  monthlyCostPerProvider: number;
  implementationCostYear1: number;
  annualOutpatientEncounters: number;
  enterpriseAnnualEncounters: number;
  abridgeUtilizationPct: number;
  avgNetRevenuePerEncounter: number;
  baselineWrvuPerEncounter: number;
  totalMedicareAdvantagePatients: number;
  totalProviderHoursReclaimed: number;
  levers: Record<LeverId, boolean>;
  patientAccess: {
    pctTimeToNewVisits: number;
    avgVisitDurationMinutes: number;
    avgNetRevenuePerVisit: number;
  };
  overtime: {
    pctOvertimeReduced: number;
    blendedOvertimeRate: number;
  };
  workforce: {
    providerCount: number;
    baselineAttritionRate: number;
    pctAttritionLinkedToBurnout: number;
    pctBurnoutExitsAvoided: number;
    costPerDeparture: number;
  };
  wrvu: {
    wrvuConversionFactor: number;
    pctIncreaseWrvuPerEncounter: number;
  };
  denials: {
    netCollectibleRevenue: number;
    baselineDenialRate: number;
    pctDenialsRecoveredAfterRework: number;
    pctDenialsFromDocumentation: number;
    pctDocDenialsRecovered: number;
  };
  riskAdjustment: {
    impactedMaPatients: number;
    avgConditionsPerMember: number;
    pctConditionsMissed: number;
    pctMissedConditionsRecaptured: number;
    pctNewConditionsIdentified: number;
    rafGainPerCondition: number;
    rafRealizationHaircut: number;
    pmpmBenchmark: number;
  };
}

export interface RoiResults {
  annualAbridgeCost: number;
  roiMultiple: number;
  totalAnnualBenefit: number;
  netValueCreated: number;
  totalProviderHoursReclaimed: number;
  postWrvuPerEncounter: number;
  newEffectiveDenialRate: number;
  levers: Lever[];
}

export const defaultInputs: RoiInputs = {
  contractLengthYears: 3,
  numberOfProviders: 100,
  enterpriseProviderCount: 500,
  monthlyCostPerProvider: 225,
  implementationCostYear1: 0,
  annualOutpatientEncounters: 100000,
  enterpriseAnnualEncounters: 500000,
  abridgeUtilizationPct: 70,
  avgNetRevenuePerEncounter: 200,
  baselineWrvuPerEncounter: 2.1,
  totalMedicareAdvantagePatients: 10000,
  totalProviderHoursReclaimed: 6400,
  levers: {
    patientAccess: true,
    overtime: true,
    workforce: true,
    wrvu: true,
    denials: true,
    riskAdjustment: true,
  },
  patientAccess: {
    pctTimeToNewVisits: 10,
    avgVisitDurationMinutes: 30,
    avgNetRevenuePerVisit: 200,
  },
  overtime: {
    pctOvertimeReduced: 20,
    blendedOvertimeRate: 145,
  },
  workforce: {
    providerCount: 100,
    baselineAttritionRate: 4,
    pctAttritionLinkedToBurnout: 40,
    pctBurnoutExitsAvoided: 50,
    costPerDeparture: 250000,
  },
  wrvu: {
    wrvuConversionFactor: 34,
    pctIncreaseWrvuPerEncounter: 5,
  },
  denials: {
    netCollectibleRevenue: 14000000,
    baselineDenialRate: 5,
    pctDenialsRecoveredAfterRework: 60,
    pctDenialsFromDocumentation: 30,
    pctDocDenialsRecovered: 75,
  },
  riskAdjustment: {
    impactedMaPatients: 7000,
    avgConditionsPerMember: 1.5,
    pctConditionsMissed: 33,
    pctMissedConditionsRecaptured: 60,
    pctNewConditionsIdentified: 5,
    rafGainPerCondition: 0.015,
    rafRealizationHaircut: 70,
    pmpmBenchmark: 750,
  },
};

export const leverDescriptions: Record<LeverId, string> = {
  patientAccess: "Most outpatient access problems come from time lost to documentation, not lack of demand. Recovering that time stabilizes schedules, shortens third-next-available, and keeps referrals from backing up.",
  overtime: "Overtime commonly reflects workflow spillover rather than true staffing gaps. When documentation fits inside the workday, premium labor drops naturally and predictably.",
  workforce: "Burnout is driven less by clinical load and more by the administrative drag wrapped around it. Reducing that drag keeps clinicians in the organization and preserves experience.",
  wrvu: "Visit complexity is frequently understated because documentation leaves parts of the clinical story unsaid. Better narrative detail allows coding to reflect the work actually performed.",
  denials: "Many denials originate from thin documentation rather than clinical disagreement. Strengthening the narrative closes those gaps and reduces avoidable reimbursement friction.",
  riskAdjustment: "Care teams often know patients' chronic conditions, but documentation doesn't always carry those details forward. Capturing the full clinical picture leads to more accurate risk modeling and resource planning.",
};

export const leverLabels: Record<LeverId, string> = {
  patientAccess: "Clinical Time Recovered",
  overtime: "Overtime Reduction",
  workforce: "Clinician Retention",
  wrvu: "Visit Complexity Documentation",
  denials: "Documentation-Related Denials",
  riskAdjustment: "Condition Documentation Completeness",
};
