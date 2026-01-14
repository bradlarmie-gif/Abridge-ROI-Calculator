import {
  type RoiInputs,
  type RoiResults,
  type Lever,
  type LeverId,
  leverDescriptions,
  leverLabels,
} from "./roi-types";

export type CareSettingCalculationType = "outpatient" | "ed" | "nursing";

function calculateEdRoi(inputs: RoiInputs): {
  levers: Array<{ id: LeverId; label: string; value: number; enabled: boolean }>;
  totalAnnualBenefit: number;
} {
  if (!inputs.ed) throw new Error("ED inputs required for ED calculation");

  const ed = inputs.ed;
  const eligibleEncounters = ed.totalEdEncounters * (inputs.abridgeUtilizationPct / 100);
  const levers: Array<{ id: LeverId; label: string; value: number; enabled: boolean }> = [];

  let throughputValue = 0;
  if (inputs.levers.edThroughput) {
    const lwbsImprovement = ed.baselineLwbsRate * (ed.lwbsImprovementPct / 100);
    const additionalPatientsTreated = eligibleEncounters * (lwbsImprovement / 100);
    const treatedAndReleased = additionalPatientsTreated * (ed.pctRecoveredTreatedAndReleased / 100);
    const admitted = additionalPatientsTreated * (ed.pctRecoveredAdmitted / 100);
    const regularContribution = treatedAndReleased * ed.contributionMarginPerEncounter;
    const admissionContribution = admitted * ed.contributionMarginPerAdmission;
    throughputValue = regularContribution + admissionContribution;
    levers.push({
      id: "edThroughput",
      label: leverLabels.edThroughput,
      value: throughputValue,
      enabled: true,
    });
  }

  let wrvuValue = 0;
  if (inputs.levers.edLevelOfService) {
    const wrvuChangePerVisit = ed.baselineWrvuPerVisit * (ed.wrvuImprovementPct / 100);
    const totalAddedWrvus = wrvuChangePerVisit * eligibleEncounters;
    wrvuValue = totalAddedWrvus * ed.wrvuConversionFactor;
    levers.push({
      id: "edLevelOfService",
      label: leverLabels.edLevelOfService,
      value: wrvuValue,
      enabled: true,
    });
  }

  let denialsValue = 0;
  if (inputs.levers.edDenialReduction) {
    const baselineDeniedRevenue = ed.netCollectibleRevenue * (ed.baselineDenialRate / 100);
    const docRelatedDenials = baselineDeniedRevenue * (ed.pctDenialsFromDocumentation / 100);
    denialsValue = docRelatedDenials * (ed.pctDocDenialsRecovered / 100);
    levers.push({
      id: "edDenialReduction",
      label: leverLabels.edDenialReduction,
      value: denialsValue,
      enabled: true,
    });
  }

  let retentionValue = 0;
  if (inputs.levers.edRetention) {
    const totalDepartures = ed.totalClinicians * (ed.baselineAttritionRate / 100);
    const burnoutDepartures = totalDepartures * (ed.pctTurnoverFromBurnout / 100);
    const departuresAvoided = burnoutDepartures * (ed.pctBurnoutReduction / 100);
    retentionValue = departuresAvoided * ed.costPerDeparture;
    levers.push({
      id: "edRetention",
      label: leverLabels.edRetention,
      value: retentionValue,
      enabled: true,
    });
  }

  const totalAnnualBenefit = levers.reduce((sum, lever) => sum + lever.value, 0);
  return { levers, totalAnnualBenefit };
}

export function calculateRoi(
  inputs: RoiInputs,
  careSetting: CareSettingCalculationType = "outpatient"
): RoiResults {
  if (careSetting === "ed" && inputs.ed) {
    const edResults = calculateEdRoi(inputs);
    const annualCost = inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12;
    const edLevers: Lever[] = edResults.levers.map((lever) => ({
      ...lever,
      description: leverDescriptions[lever.id],
      category: lever.id === "edThroughput" || lever.id === "edRetention" ? "time" : "documentation",
    }));

    return {
      levers: edLevers,
      totalAnnualBenefit: edResults.totalAnnualBenefit,
      annualAbridgeCost: annualCost,
      netValueCreated: edResults.totalAnnualBenefit - annualCost,
      roiMultiple: annualCost > 0 ? edResults.totalAnnualBenefit / annualCost : 0,
      totalProviderHoursReclaimed: 0,
      postWrvuPerEncounter: 0,
      newEffectiveDenialRate: 0,
    };
  }

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
  const denialResults = calculateDenials(inputs, encountersWithAbridge);
  const riskAdjRevenue = calculateRiskAdjustment(inputs, encountersWithAbridge);

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
  const { pctOvertimeReduced, blendedOvertimeRate, pctAfterHours } = inputs.overtime;

  // Only after-hours time contributes to overtime savings
  const afterHoursReclaimed = hoursReclaimed * (pctAfterHours / 100);
  const overtimeHoursReduced = afterHoursReclaimed * (pctOvertimeReduced / 100);
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

function calculateDenials(inputs: RoiInputs, encountersWithAbridge: number): {
  revenueRecovered: number;
  newEffectiveDenialRate: number;
} {
  const {
    avgRevenuePerEncounter,
    baselineDenialRate,
    pctDenialsFromDocumentation,
    pctDocDenialsRecovered,
  } = inputs.denials;

  // Compute revenue from eligible encounters
  const netCollectibleRevenue = encountersWithAbridge * avgRevenuePerEncounter;
  
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

function calculateRiskAdjustment(inputs: RoiInputs, encountersWithAbridge: number): number {
  const {
    pctMedicareAdvantage,
    avgConditionsPerMember,
    pctConditionsMissed,
    pctMissedConditionsRecaptured,
    pctNewConditionsIdentified,
    rafGainPerCondition,
    rafRealizationHaircut,
    pmpmBenchmark,
  } = inputs.hcc;

  // Derive unique MA patients from eligible encounters
  // Eligible encounters / 2.5 = unique patients, then apply MA %
  const uniquePatients = encountersWithAbridge / 2.5;
  const impactedMaPatients = uniquePatients * (pctMedicareAdvantage / 100);

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
