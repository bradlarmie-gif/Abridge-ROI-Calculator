export type LeverId =
  | "patientAccess"
  | "overtime"
  | "workforce"
  | "wrvu"
  | "denials"
  | "hcc"
  | "edThroughput"
  | "edLevelOfService"
  | "edDenialReduction"
  | "edRetention"
  | "rnDocTime"
  | "rnCommunication"
  | "rnSafetyReduction"
  | "rnDiagnosisSeverity";

export type LeverCategory = "time" | "documentation";

export interface Lever {
  id: LeverId;
  label: string;
  value: number;
  enabled: boolean;
  description: string;
  category: LeverCategory;
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
  minutesSavedPerEncounter: number;
  avgNetRevenuePerEncounter: number;
  baselineWrvuPerEncounter: number;
  totalMedicareAdvantagePatients: number;
  levers: Record<LeverId, boolean>;
  patientAccess: {
    pctTimeToNewVisits: number;
    avgVisitDurationMinutes: number;
    avgNetRevenuePerVisit: number;
  };
  overtime: {
    pctOvertimeReduced: number;
    blendedOvertimeRate: number;
    pctAfterHours: number;
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
    avgRevenuePerEncounter: number;
    baselineDenialRate: number;
    pctDenialsRecoveredAfterRework: number;
    pctDenialsFromDocumentation: number;
    pctDocDenialsRecovered: number;
  };
  hcc: {
    pctMedicareAdvantage: number;
    avgConditionsPerMember: number;
    pctConditionsMissed: number;
    pctMissedConditionsRecaptured: number;
    pctNewConditionsIdentified: number;
    rafGainPerCondition: number;
    rafRealizationHaircut: number;
    pmpmBenchmark: number;
  };
  ed?: EdInputs;
}

export interface EdInputs {
  totalClinicians: number;
  shiftsPerClinicianPerYear: number;
  baselineDocMinutesPerShift: number;
  minutesSavedPerShift: number;
  totalEdEncounters: number;
  baselineLwbsRate: number;
  lwbsImprovementPct: number;
  pctRecoveredTreatedAndReleased: number;
  pctRecoveredAdmitted: number;
  contributionMarginPerEncounter: number;
  contributionMarginPerAdmission: number;
  baselineWrvuPerVisit: number;
  wrvuConversionFactor: number;
  wrvuImprovementPct: number;
  netCollectibleRevenue: number;
  baselineDenialRate: number;
  pctDenialsFromDocumentation: number;
  pctDocDenialsRecovered: number;
  baselineAttritionRate: number;
  pctTurnoverFromBurnout: number;
  pctBurnoutReduction: number;
  costPerDeparture: number;
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
  enterpriseProviderCount: 0,
  monthlyCostPerProvider: 225,
  implementationCostYear1: 0,
  annualOutpatientEncounters: 100000,
  enterpriseAnnualEncounters: 0,
  abridgeUtilizationPct: 70,
  minutesSavedPerEncounter: 4,
  avgNetRevenuePerEncounter: 200,
  baselineWrvuPerEncounter: 2.1,
  totalMedicareAdvantagePatients: 10000,
  levers: {
    patientAccess: true,
    overtime: true,
    workforce: true,
    wrvu: true,
    denials: true,
    hcc: true,
    edThroughput: false,
    edLevelOfService: false,
    edDenialReduction: false,
    edRetention: false,
    rnDocTime: false,
    rnCommunication: false,
    rnSafetyReduction: false,
    rnDiagnosisSeverity: false,
  },
  patientAccess: {
    pctTimeToNewVisits: 10,
    avgVisitDurationMinutes: 30,
    avgNetRevenuePerVisit: 200,
  },
  overtime: {
    pctOvertimeReduced: 20,
    blendedOvertimeRate: 145,
    pctAfterHours: 25,
  },
  workforce: {
    providerCount: 100,
    baselineAttritionRate: 5,
    pctAttritionLinkedToBurnout: 40,
    pctBurnoutExitsAvoided: 40,
    costPerDeparture: 250000,
  },
  wrvu: {
    wrvuConversionFactor: 40,
    pctIncreaseWrvuPerEncounter: 5,
  },
  denials: {
    avgRevenuePerEncounter: 200,
    baselineDenialRate: 5,
    pctDenialsRecoveredAfterRework: 60,
    pctDenialsFromDocumentation: 30,
    pctDocDenialsRecovered: 66,
  },
  hcc: {
    pctMedicareAdvantage: 25,
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
  patientAccess:
    "Most outpatient access problems come from time lost to documentation, not lack of demand. Recovering that time stabilizes schedules, shortens third-next-available, and keeps referrals from backing up.",
  overtime:
    "Overtime commonly reflects workflow spillover rather than true staffing gaps. When documentation fits inside the workday, premium labor drops naturally and predictably.",
  workforce:
    "Burnout is driven less by clinical load and more by the administrative drag wrapped around it. Reducing that drag keeps clinicians in the organization and preserves experience.",
  wrvu: "Visit complexity is frequently understated because documentation leaves parts of the clinical story unsaid. Better narrative detail allows coding to reflect the work actually performed.",
  denials:
    "Many denials originate from thin documentation rather than clinical disagreement. Strengthening the narrative closes those gaps and reduces avoidable reimbursement friction.",
  hcc: "Care teams often know patients' chronic conditions, but documentation doesn't always carry those details forward. Capturing the full clinical picture leads to more accurate risk modeling and resource planning.",
  edThroughput: "Reduce LWBS rate and treat more patients by completing documentation faster during shift.",
  edLevelOfService: "Capture accurate E/M levels and wRVUs despite time-pressured environment.",
  edDenialReduction: "Prevent denials from incomplete ED documentation.",
  edRetention: "Reduce ED clinician burnout and turnover.",
  rnDocTime: "Reduce time spent documenting during and after shifts.",
  rnCommunication: "Reduce repetitive manual documentation across handoffs and care coordination.",
  rnSafetyReduction: "Improve documentation timeliness to surface clinical changes and reduce safety events.",
  rnDiagnosisSeverity: "Ensure nursing assessments capture clinical severity that supports CC/MCC documentation.",
};

export const leverLabels: Record<LeverId, string> = {
  patientAccess: "Patient Access",
  overtime: "Overtime & Locum Cost Savings",
  workforce: "Clinician Retention",
  wrvu: "Accurate Level of Service",
  denials: "Documentation Related Denials",
  hcc: "HCC & Chronic Condition Capture",
  edThroughput: "Patient Throughput (LWBS Reduction)",
  edLevelOfService: "wRVU & Level-of-Service Alignment",
  edDenialReduction: "Documentation-Related Denials",
  edRetention: "Workforce Retention",
  rnDocTime: "Documentation Time Reduction",
  rnCommunication: "Communication Efficiency",
  rnSafetyReduction: "Risk & Safety Event Reduction",
  rnDiagnosisSeverity: "Diagnosis Severity (CC/MCC Support)",
};
