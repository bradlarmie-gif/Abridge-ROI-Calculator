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
  monthlyCostPerProvider: number;
  implementationCostYear1: number;
  annualOutpatientEncounters: number;
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
  monthlyCostPerProvider: 225,
  implementationCostYear1: 0,
  annualOutpatientEncounters: 100000,
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
  patientAccess: "Abridge reduces documentation time, enabling clinicians to redirect a portion of their day toward direct patient care. This creates the potential for additional visit capacity without extending schedules.",
  overtime: "By decreasing after-hours and end-of-day documentation, Abridge supports lower reliance on overtime and premium-rate labor needed to complete charting.",
  workforce: "Reducing administrative load can help decrease burnout-related attrition, lowering the operational and financial burden associated with clinician turnover.",
  wrvu: "Enhanced documentation quality provides clearer clinical detail, helping coding teams assign the most appropriate E/M level based on medical decision-making.",
  denials: "Improved clarity and completeness of documentation reduce common causes of documentation-related denials, supporting higher first-pass claim acceptance.",
  riskAdjustment: "More complete and structured clinical documentation helps ensure chronic conditions are consistently captured, supporting accurate risk adjustment under value-based programs.",
};

export const leverLabels: Record<LeverId, string> = {
  patientAccess: "Patient Capacity Enablement",
  overtime: "Overtime & Premium Labor Avoidance",
  workforce: "Clinician Retention Support",
  wrvu: "E/M Level Appropriateness",
  denials: "Denial Risk Reduction",
  riskAdjustment: "Risk Adjustment Completeness",
};
