import type { EDPDFData, DriverCalculation, JourneyData } from "./ed-pdf-generator";

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

const ED_DRIVER_CATEGORIES: Record<string, "labor" | "revenue"> = {
  edThroughput: "revenue",
  edRetention: "labor",
  edLevelOfService: "revenue",
  edDenials: "revenue",
  edDenialReduction: "revenue",
  edScribe: "labor",
};

const ED_DRIVER_NAMES: Record<string, string> = {
  edThroughput: "Patient Throughput (LWBS)",
  edRetention: "Physician Retention",
  edLevelOfService: "Level-of-Service Accuracy",
  edDenials: "Denial Prevention",
  edDenialReduction: "Denial Prevention",
  edScribe: "Scribe Cost Reduction",
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
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));
  
  switch (driverId) {
    case "edThroughput": {
      const lwbsRate = (inputs.lwbsRate as number) || 4;
      const docAttributablePct = (inputs.docAttributablePct as number) || 40;
      const abridgeReductionPct = (inputs.abridgeReductionPct as number) || 50;
      const avgEdRevenue = (inputs.avgEdRevenue as number) || (inputs.revenuePerVisit as number) || 350;
      
      const lwbsPatients = Math.round(eligibleEncounters * (lwbsRate / 100));
      const docAttributableLwbs = Math.round(lwbsPatients * (docAttributablePct / 100));
      const patientsRecovered = Math.round(docAttributableLwbs * (abridgeReductionPct / 100));
      
      return {
        ...inputs,
        eligibleEncounters,
        lwbsRate,
        lwbsPatients,
        docAttributablePct,
        docAttributableLwbs,
        abridgeReductionPct,
        patientsRecovered,
        recovered: patientsRecovered,
        avgEdRevenue,
        revenuePerVisit: avgEdRevenue,
      };
    }
    
    case "edRetention": {
      const turnoverRate = (inputs.turnoverRate as number) || 10;
      const burnoutAttribution = (inputs.burnoutAttribution as number) || 50;
      const abridgeImpact = (inputs.abridgeImpact as number) || 30;
      const replacementCost = (inputs.replacementCost as number) || 500000;
      
      const annualDepartures = providers * (turnoverRate / 100);
      const burnoutDepartures = annualDepartures * (burnoutAttribution / 100);
      const departuresAvoided = burnoutDepartures * (abridgeImpact / 100);
      
      return {
        ...inputs,
        providers,
        turnoverRate,
        annualDepartures,
        burnoutAttribution,
        burnoutDepartures,
        abridgeImpact,
        departuresAvoided,
        replacementCost,
      };
    }
    
    case "edLevelOfService": {
      const avgWrvuPerEncounter = (inputs.avgWrvuPerEncounter as number) || 2.2;
      const wrvuImprovementRate = (inputs.wrvuImprovementRate as number) || (inputs.wrvuImprovement as number) || 5;
      const conversionFactor = (inputs.conversionFactor as number) || 33;
      
      const baselineWrvus = Math.round(eligibleEncounters * avgWrvuPerEncounter);
      const wrvuGain = Math.round(baselineWrvus * (wrvuImprovementRate / 100));
      
      return {
        ...inputs,
        eligibleEncounters,
        avgWrvuPerEncounter,
        baselineWrvus,
        wrvuImprovementRate,
        wrvuImprovement: wrvuImprovementRate,
        wrvuGain,
        conversionFactor,
      };
    }
    
    case "edDenials":
    case "edDenialReduction": {
      const denialRate = (inputs.denialRate as number) || 10;
      const docRelatedPercent = (inputs.docRelatedPercent as number) || (inputs.docRelatedPct as number) || 35;
      const writtenOffPercent = (inputs.writtenOffPercent as number) || (inputs.writeOffPct as number) || 60;
      const abridgeCaptureRate = (inputs.abridgeCaptureRate as number) || (inputs.recoveryRate as number) || 75;
      const avgClaimValue = (inputs.avgClaimValue as number) || 350;
      
      const totalDenials = Math.round(eligibleEncounters * (denialRate / 100));
      const docRelatedDenials = Math.round(totalDenials * (docRelatedPercent / 100));
      const writtenOffDenials = Math.round(docRelatedDenials * (writtenOffPercent / 100));
      const claimsRecovered = Math.round(writtenOffDenials * (abridgeCaptureRate / 100));
      
      return {
        ...inputs,
        eligibleEncounters,
        denialRate,
        totalDenials,
        docRelatedPercent,
        docRelatedDenials,
        writtenOffPercent,
        writtenOffDenials,
        abridgeCaptureRate,
        claimsRecovered,
        avgClaimValue,
      };
    }
    
    case "edScribe": {
      const scribeCount = (inputs.scribeCount as number) || 5;
      const costPerHour = (inputs.costPerHour as number) || 25;
      const hoursPerWeek = (inputs.hoursPerWeek as number) || 40;
      const weeksPerYear = (inputs.weeksPerYear as number) || 50;
      const scribeReductionRate = (inputs.scribeReductionRate as number) || (inputs.reductionPct as number) || 100;
      
      const annualScribeCost = scribeCount * costPerHour * hoursPerWeek * weeksPerYear;
      const costSaved = Math.round(annualScribeCost * (scribeReductionRate / 100));
      
      return {
        ...inputs,
        scribeCount,
        costPerHour,
        hoursPerWeek,
        weeksPerYear,
        annualScribeCost,
        scribeReductionRate,
        reductionPct: scribeReductionRate,
        costSaved,
      };
    }
    
    default:
      return inputs;
  }
}

export function transformToEDPDFData(
  modelResults: ModelResults,
  journeyInputs: JourneyInputs,
  organizationName?: string
): EDPDFData {
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
        name: result.name || ED_DRIVER_NAMES[id] || id,
        value: result.value,
        category: ED_DRIVER_CATEGORIES[id] || "revenue",
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
    organizationName,
    careSetting: "Emergency Department",
    unitName: "ED provider",
    unitNamePlural: "ED providers",

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
