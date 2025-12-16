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
  patientAccess: "Revenue from additional patient visits enabled by reclaimed provider time",
  overtime: "Cost savings from reduced overtime and locum coverage requirements",
  workforce: "Savings from reduced burnout-driven provider turnover",
  wrvu: "Additional revenue from improved documentation and coding accuracy",
  denials: "Revenue recovered by reducing documentation-related claim denials",
  riskAdjustment: "Additional MA revenue from improved HCC condition capture",
};
