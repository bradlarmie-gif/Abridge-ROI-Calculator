import {
  type RoiInputs,
  type RoiResults,
  type Lever,
  leverDescriptions,
  leverLabels,
} from "./roi-types";

export function calculateRoi(inputs: RoiInputs): RoiResults {
  // Encounters covered by Abridge (utilization must move the model)
  const encountersWithAbridge =
    inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100);

  // Core time engine: minutes saved per encounter -> total hours recovered
  const totalProviderHoursReclaimed =
    (encountersWithAbridge * inputs.minutesSavedPerEncounter) / 60;

  // Program cost (Year 1)
  const annualAbridgeCost =
    inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12 +
    inputs.implementationCostYear1;

  // Lever values
  const patientAccessValue = calculatePatientAccess(
    inputs,
    totalProviderHoursReclaimed,
  );
  const overtimeSavings = calculateOvertime(
    inputs,
    totalProviderHoursReclaimed,
  );
  const workforceSavings = calculateWorkforce(inputs);
  const wrvuRevenue = calculateWrvu(inputs, encountersWithAbridge);
  const denialResults = calculateDenials(inputs);
  const riskAdjRevenue = calculateRiskAdjustment(inputs);

  // KPI: projected wRVU/visit
  const postWrvuPerEncounter =
    inputs.baselineWrvuPerEncounter *
    (1 + inputs.wrvu.pctIncreaseWrvuPerEncounter / 100);

  // Levers list (used by dashboard waterfall/table)
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

  const roiMultiple =
    annualAbridgeCost > 0 ? totalAnnualBenefit / annualAbridgeCost : 0;
  const netValueCreated = totalAnnualBenefit - annualAbridgeCost;

  return {
    annualAbridgeCost,
    roiMultiple,
    totalAnnualBenefit,
    netValueCreated,
    totalProviderHoursReclaimed,
    postWrvuPerEncounter,
    newEffectiveDenialRate: denialResults.newEffectiveDenialRate,
    levers,
  };
}

function calculatePatientAccess(
  inputs: RoiInputs,
  hoursReclaimed: number,
): number {
  const { pctTimeToNewVisits, avgVisitDurationMinutes, avgNetRevenuePerVisit } =
    inputs.patientAccess;

  const visitDurationHours = avgVisitDurationMinutes / 60;

  // Only a portion of recovered time becomes incremental visits
  const reinvestedHours = hoursReclaimed * (pctTimeToNewVisits / 100);
  const addedVisits =
    visitDurationHours > 0 ? reinvestedHours / visitDurationHours : 0;

  return addedVisits * avgNetRevenuePerVisit;
}

function calculateOvertime(inputs: RoiInputs, hoursReclaimed: number): number {
  const { pctOvertimeReduced, blendedOvertimeRate } = inputs.overtime;

  const overtimeHoursReduced = hoursReclaimed * (pctOvertimeReduced / 100);
  return overtimeHoursReduced * blendedOvertimeRate;
}

function calculateWorkforce(inputs: RoiInputs): number {
  const {
    providerCount,
    baselineAttritionRate,
    pctAttritionLinkedToBurnout,
    pctBurnoutExitsAvoided,
    costPerDeparture,
  } = inputs.workforce;

  const baselineDepartures = providerCount * (baselineAttritionRate / 100);
  const burnoutDepartures =
    baselineDepartures * (pctAttritionLinkedToBurnout / 100);
  const departuresAvoided = burnoutDepartures * (pctBurnoutExitsAvoided / 100);

  return departuresAvoided * costPerDeparture;
}

function calculateWrvu(
  inputs: RoiInputs,
  encountersWithAbridge: number,
): number {
  const { wrvuConversionFactor, pctIncreaseWrvuPerEncounter } = inputs.wrvu;

  const postWrvuPerEncounter =
    inputs.baselineWrvuPerEncounter * (1 + pctIncreaseWrvuPerEncounter / 100);

  const incrementalWrvuPerEncounter =
    postWrvuPerEncounter - inputs.baselineWrvuPerEncounter;
  const totalIncrementalWrvus =
    incrementalWrvuPerEncounter * encountersWithAbridge;

  return totalIncrementalWrvus * wrvuConversionFactor;
}

function calculateDenials(inputs: RoiInputs): {
  revenueRecovered: number;
  newEffectiveDenialRate: number;
} {
  const {
    netCollectibleRevenue,
    baselineDenialRate,
    pctDenialsFromDocumentation,
    pctDocDenialsRecovered,
  } = inputs.denials;

  const baselineDeniedRevenue =
    netCollectibleRevenue * (baselineDenialRate / 100);
  const documentationDeniedRevenue =
    baselineDeniedRevenue * (pctDenialsFromDocumentation / 100);
  const denialRevenueRecovered =
    documentationDeniedRevenue * (pctDocDenialsRecovered / 100);

  const newEffectiveDenialRate =
    netCollectibleRevenue > 0
      ? ((baselineDeniedRevenue - denialRevenueRecovered) /
          netCollectibleRevenue) *
        100
      : 0;

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
    pmpmBenchmark,
  } = inputs.hcc;

  const totalConditions = impactedMaPatients * avgConditionsPerMember;
  const missedConditions = totalConditions * (pctConditionsMissed / 100);
  const recapturedConditions =
    missedConditions * (pctMissedConditionsRecaptured / 100);
  const newConditions = totalConditions * (pctNewConditionsIdentified / 100);
  const totalImprovedConditions = recapturedConditions + newConditions;

  const rawRafPointsGained = totalImprovedConditions * rafGainPerCondition;
  const rawRafChange =
    impactedMaPatients > 0 ? rawRafPointsGained / impactedMaPatients : 0;
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

export function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
