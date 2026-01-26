import type { InpatientPDFData, DriverCalculation, JourneyData } from "./inpatient-pdf-generator";

interface ModelResults {
  totalBenefit: number;
  investment: number;
  implementationFee?: number;
  providers: number;
  encounters: number;
  utilizationRate: number;
  costPerMonth: number;
  timeSavedPerEncounter?: number;
  driverResults: Record<string, { name: string; value: number; inputs?: Record<string, any> }>;
}

interface JourneyInputs {
  pilotProviders: number;
  pilotEncounters: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleProviders: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: "measured" | "steady" | "aggressive";
  networkEffect: number;
}

const INPATIENT_DRIVER_CATEGORIES: Record<string, "labor" | "revenue"> = {
  inpatientRetention: "labor",
  inpatientCCMCC: "revenue",
  inpatientCDI: "labor",
  inpatientDenials: "revenue",
};

const INPATIENT_DRIVER_NAMES: Record<string, string> = {
  inpatientRetention: "Hospitalist Retention",
  inpatientCCMCC: "CC/MCC Capture (DRG Optimization)",
  inpatientCDI: "CDI Query Reduction",
  inpatientDenials: "Documentation-Related Denials",
};

const PACE_MONTHS: Record<string, number> = {
  measured: 36,
  steady: 24,
  aggressive: 18,
};

function calculateIntermediateValues(
  driverId: string,
  inputs: Record<string, any>,
  encounters: number,
  providers: number,
  utilizationRate: number,
  driverValue: number
): Record<string, any> {
  const eligibleAdmissions = Math.round(encounters * (utilizationRate / 100));
  
  switch (driverId) {
    case "inpatientRetention": {
      const turnoverRate = (inputs.turnoverRate as number) || 15;
      const burnoutPct = (inputs.burnoutPct as number) || 50;
      const abridgeImpact = (inputs.abridgeImpact as number) || 30;
      const replacementCost = (inputs.replacementCost as number) || 500000;
      
      const annualDepartures = providers * (turnoverRate / 100);
      const burnoutDepartures = annualDepartures * (burnoutPct / 100);
      const departuresAvoided = burnoutDepartures * (abridgeImpact / 100);
      
      return {
        ...inputs,
        providers,
        turnoverRate,
        annualDepartures,
        burnoutPct,
        burnoutDepartures,
        abridgeImpact,
        departuresAvoided,
        replacementCost,
      };
    }
    
    case "inpatientCCMCC": {
      const gapRate = (inputs.gapRate as number) || 40;
      const captureRate = (inputs.captureRate as number) || 15;
      const drgWeightIncrease = (inputs.drgWeightIncrease as number) || 0.4;
      const baseDrgPayment = (inputs.baseDrgPayment as number) || 6000;
      const realizationRate = (inputs.realizationRate as number) || 50;
      
      const admissionsWithGaps = Math.round(eligibleAdmissions * (gapRate / 100));
      const admissionsImproved = Math.round(admissionsWithGaps * (captureRate / 100));
      const grossImpact = admissionsImproved * drgWeightIncrease * baseDrgPayment;
      
      return {
        ...inputs,
        eligibleAdmissions,
        gapRate,
        admissionsWithGaps,
        captureRate,
        admissionsImproved,
        drgWeightIncrease,
        baseDrgPayment,
        grossImpact,
        realizationRate,
      };
    }
    
    case "inpatientCDI": {
      const queryRate = (inputs.queryRate as number) || 30;
      const reductionRate = (inputs.reductionRate as number) || 25;
      const costPerQuery = (inputs.costPerQuery as number) || 50;
      
      const annualQueries = Math.round(eligibleAdmissions * (queryRate / 100));
      const queriesAvoided = Math.round(annualQueries * (reductionRate / 100));
      
      return {
        ...inputs,
        eligibleAdmissions,
        queryRate,
        annualQueries,
        reductionRate,
        queriesAvoided,
        costPerQuery,
      };
    }
    
    case "inpatientDenials": {
      const denialRate = (inputs.denialRate as number) || 5;
      const docRelatedPct = (inputs.docRelatedPct as number) || 35;
      const writeOffPct = (inputs.writeOffPct as number) || 25;
      const captureRate = (inputs.captureRate as number) || 75;
      const avgClaimValue = (inputs.avgClaimValue as number) || 12000;
      
      const totalDenials = Math.round(eligibleAdmissions * (denialRate / 100));
      const docRelatedDenials = Math.round(totalDenials * (docRelatedPct / 100));
      const writtenOff = Math.round(docRelatedDenials * (writeOffPct / 100));
      const claimsRecovered = Math.round(writtenOff * (captureRate / 100));
      
      return {
        ...inputs,
        eligibleAdmissions,
        denialRate,
        totalDenials,
        docRelatedPct,
        docRelatedDenials,
        writeOffPct,
        writtenOff,
        captureRate,
        claimsRecovered,
        avgClaimValue,
      };
    }
    
    default:
      return inputs;
  }
}

export function transformToInpatientPDFData(
  modelResults: ModelResults,
  journeyInputs: JourneyInputs,
  organizationName?: string,
  clientName?: string,
  preparedBy?: string
): InpatientPDFData {
  const timeSavedPerEncounter = modelResults.timeSavedPerEncounter || 2.5;
  const eligibleEncounters = Math.round(modelResults.encounters * (modelResults.utilizationRate / 100));
  const hoursReturned = Math.round((eligibleEncounters * timeSavedPerEncounter) / 60);

  const drivers: DriverCalculation[] = Object.entries(modelResults.driverResults)
    .filter(([_, result]) => result && result.value > 0)
    .map(([id, result]) => {
      const enrichedInputs = calculateIntermediateValues(
        id,
        result.inputs || {},
        modelResults.encounters,
        modelResults.providers,
        modelResults.utilizationRate,
        result.value
      );
      
      return {
        id,
        name: result.name || INPATIENT_DRIVER_NAMES[id] || id,
        value: result.value,
        category: INPATIENT_DRIVER_CATEGORIES[id] || "revenue",
        inputs: enrichedInputs,
      };
    });

  const laborDrivers = drivers.filter((d) => d.category === "labor");
  const revenueDrivers = drivers.filter((d) => d.category === "revenue");
  const laborTotal = laborDrivers.reduce((sum, d) => sum + d.value, 0);
  const revenueTotal = revenueDrivers.reduce((sum, d) => sum + d.value, 0);
  const totalValue = laborTotal + revenueTotal;
  const laborPct = totalValue > 0 ? Math.round((laborTotal / totalValue) * 100) : 0;
  const revenuePct = 100 - laborPct;

  const year1Value = totalValue;
  const year2Value = Math.round(year1Value * 1.1);
  const year3Value = Math.round(year2Value * 1.1);
  const investment = modelResults.investment;
  const implementationFee = modelResults.implementationFee || 0;
  const year1Cost = investment + implementationFee;
  const year2Cost = investment;
  const year3Cost = investment;

  const journey: JourneyData = {
    pilotProviders: journeyInputs.pilotProviders,
    pilotEncounters: journeyInputs.pilotEncounters,
    pilotUtilization: journeyInputs.pilotUtilization,
    pilotValue: journeyInputs.pilotValue,
    fullScaleProviders: journeyInputs.fullScaleProviders,
    fullScaleUtilization: journeyInputs.fullScaleUtilization,
    fullScaleValue: journeyInputs.fullScaleValue,
    scalingPace: journeyInputs.scalingPace,
    scalingMonths: PACE_MONTHS[journeyInputs.scalingPace],
    networkEffect: journeyInputs.networkEffect,
  };

  return {
    clientName,
    preparedBy,
    organizationName,
    careSetting: "Inpatient",
    unitName: "hospitalist",
    unitNamePlural: "hospitalists",

    providers: modelResults.providers,
    encounters: modelResults.encounters,
    eligibleEncounters,
    utilization: modelResults.utilizationRate,
    timeSavedPerEncounter,
    hoursReturned,

    totalValue,
    investment,
    netGain: totalValue - investment,
    roi: investment > 0 ? totalValue / investment : 0,
    costPerProvider: modelResults.costPerMonth,

    drivers,
    laborTotal,
    revenueTotal,
    laborPct,
    revenuePct,

    year1Value,
    year2Value,
    year3Value,
    year1Cost,
    year2Cost,
    year3Cost,
    threeYearValue: year1Value + year2Value + year3Value,
    threeYearCost: year1Cost + year2Cost + year3Cost,
    threeYearNet: (year1Value + year2Value + year3Value) - (year1Cost + year2Cost + year3Cost),

    journey,
  };
}
