import { type RoiInputs, type RoiResults, type Lever, leverDescriptions, leverLabels } from "./roi-types";

export function calculateRoi(inputs: RoiInputs): RoiResults {
  const encountersWithAbridge = 
    inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100);
  
  const annualAbridgeCost = 
    inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12 + 
    inputs.implementationCostYear1;

  const patientAccessValue = calculatePatientAccess(inputs);
  const overtimeSavings = calculateOvertime(inputs);
  const workforceSavings = calculateWorkforce(inputs);
  const wrvuRevenue = calculateWrvu(inputs, encountersWithAbridge);
  const denialResults = calculateDenials(inputs);
  const riskAdjRevenue = calculateRiskAdjustment(inputs);

  const postWrvuPerEncounter = 
    inputs.baselineWrvuPerEncounter * (1 + inputs.wrvu.pctIncreaseWrvuPerEncounter / 100);

  const levers: Lever[] = [
    {
      id: "patientAccess",
      label: leverLabels.patientAccess,
      value: patientAccessValue,
      enabled: inputs.levers.patientAccess,
      description: leverDescriptions.patientAccess,
      category: "time",
    },
    {
      id: "overtime",
      label: leverLabels.overtime,
      value: overtimeSavings,
      enabled: inputs.levers.overtime,
      description: leverDescriptions.overtime,
      category: "time",
    },
    {
      id: "workforce",
      label: leverLabels.workforce,
      value: workforceSavings,
      enabled: inputs.levers.workforce,
      description: leverDescriptions.workforce,
      category: "time",
    },
    {
      id: "hcc",
      label: leverLabels.hcc,
      value: riskAdjRevenue,
      enabled: inputs.levers.hcc,
      description: leverDescriptions.hcc,
      category: "documentation",
    },
    {
      id: "wrvu",
      label: leverLabels.wrvu,
      value: wrvuRevenue,
      enabled: inputs.levers.wrvu,
      description: leverDescriptions.wrvu,
      category: "documentation",
    },
    {
      id: "denials",
      label: leverLabels.denials,
      value: denialResults.revenueRecovered,
      enabled: inputs.levers.denials,
      description: leverDescriptions.denials,
      category: "documentation",
    },
  ];

  const totalAnnualBenefit = levers
    .filter((l) => l.enabled)
    .reduce((sum, l) => sum + l.value, 0);

  const roiMultiple = annualAbridgeCost > 0 ? totalAnnualBenefit / annualAbridgeCost : 0;
  const netValueCreated = totalAnnualBenefit - annualAbridgeCost;

  return {
    annualAbridgeCost,
    roiMultiple,
    totalAnnualBenefit,
    netValueCreated,
    totalProviderHoursReclaimed: inputs.totalProviderHoursReclaimed,
    postWrvuPerEncounter,
    newEffectiveDenialRate: denialResults.newEffectiveDenialRate,
    levers,
  };
}

function calculatePatientAccess(inputs: RoiInputs): number {
  const { pctTimeToNewVisits, avgVisitDurationMinutes, avgNetRevenuePerVisit } = 
    inputs.patientAccess;
  
  const visitDurationHours = avgVisitDurationMinutes / 60;
  const reinvestedHours = inputs.totalProviderHoursReclaimed * (pctTimeToNewVisits / 100);
  const addedVisits = reinvestedHours / visitDurationHours;
  
  return addedVisits * avgNetRevenuePerVisit;
}

function calculateOvertime(inputs: RoiInputs): number {
  const { pctOvertimeReduced, blendedOvertimeRate } = inputs.overtime;
  
  const overtimeHoursReduced = 
    inputs.totalProviderHoursReclaimed * (pctOvertimeReduced / 100);
  
  return overtimeHoursReduced * blendedOvertimeRate;
}

function calculateWorkforce(inputs: RoiInputs): number {
  const { 
    providerCount, 
    baselineAttritionRate, 
    pctAttritionLinkedToBurnout, 
    pctBurnoutExitsAvoided, 
    costPerDeparture 
  } = inputs.workforce;
  
  const baselineDepartures = providerCount * (baselineAttritionRate / 100);
  const burnoutDepartures = baselineDepartures * (pctAttritionLinkedToBurnout / 100);
  const departuresAvoided = burnoutDepartures * (pctBurnoutExitsAvoided / 100);
  
  return departuresAvoided * costPerDeparture;
}

function calculateWrvu(inputs: RoiInputs, encountersWithAbridge: number): number {
  const { wrvuConversionFactor, pctIncreaseWrvuPerEncounter } = inputs.wrvu;
  
  const postWrvuPerEncounter = 
    inputs.baselineWrvuPerEncounter * (1 + pctIncreaseWrvuPerEncounter / 100);
  const incrementalWrvuPerEncounter = postWrvuPerEncounter - inputs.baselineWrvuPerEncounter;
  const totalIncrementalWrvus = incrementalWrvuPerEncounter * encountersWithAbridge;
  
  return totalIncrementalWrvus * wrvuConversionFactor;
}

function calculateDenials(inputs: RoiInputs): { 
  revenueRecovered: number; 
  newEffectiveDenialRate: number 
} {
  const { 
    netCollectibleRevenue, 
    baselineDenialRate, 
    pctDenialsFromDocumentation, 
    pctDocDenialsRecovered 
  } = inputs.denials;
  
  const baselineDeniedRevenue = netCollectibleRevenue * (baselineDenialRate / 100);
  const documentationDeniedRevenue = 
    baselineDeniedRevenue * (pctDenialsFromDocumentation / 100);
  const denialRevenueRecovered = 
    documentationDeniedRevenue * (pctDocDenialsRecovered / 100);
  
  const newEffectiveDenialRate = 
    ((baselineDeniedRevenue - denialRevenueRecovered) / netCollectibleRevenue) * 100;

  return { revenueRecovered: denialRevenueRecovered, newEffectiveDenialRate };
}

function calculateRiskAdjustment(inputs: RoiInputs): number {
  const { 
    impactedMaPatients, 
    avgConditionsPerMember, 
    pctConditionsMissed, 
    pctMissedConditionsRecaptured, 
    pctNewConditionsIdentified, 
    rafGainPerCondition, 
    rafRealizationHaircut, 
    pmpmBenchmark 
  } = inputs.hcc;
  
  const totalConditions = impactedMaPatients * avgConditionsPerMember;
  const missedConditions = totalConditions * (pctConditionsMissed / 100);
  const recapturedConditions = missedConditions * (pctMissedConditionsRecaptured / 100);
  const newConditions = totalConditions * (pctNewConditionsIdentified / 100);
  const totalImprovedConditions = recapturedConditions + newConditions;
  
  const rawRafPointsGained = totalImprovedConditions * rafGainPerCondition;
  const rawRafChange = rawRafPointsGained / impactedMaPatients;
  const adjustedRafChange = rawRafChange * (1 - rafRealizationHaircut / 100);
  
  return impactedMaPatients * adjustedRafChange * pmpmBenchmark * 12;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
