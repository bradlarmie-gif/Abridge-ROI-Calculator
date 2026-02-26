import type { OutpatientPDFData, DriverCalculation, JourneyData } from "./outpatient-pdf-generator";

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
  timeAllocation?: {
    patientAccess: number;
    patientExperience: number;
    clinicianWellbeing: number;
    reducingLocums?: number;
  };
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

const DRIVER_CATEGORIES: Record<string, "labor" | "revenue"> = {
  // Time Returned drivers (from Time Allocation page)
  patientAccess: "labor",
  overtime: "labor",
  workforce: "labor",
  // Documentation Improved drivers (from Documentation Levers page)
  wrvu: "revenue",
  hcc: "revenue",
  denials: "revenue",
};

const DRIVER_NAMES: Record<string, string> = {
  patientAccess: "Patient Access",
  overtime: "Overtime Reduction",
  workforce: "Workforce Retention",
  wrvu: "wRVU / Level of Service",
  hcc: "HCC Capture",
  denials: "Denial Prevention",
};

const PACE_MONTHS: Record<string, number> = {
  measured: 36,
  steady: 24,
  aggressive: 18,
};

export function transformToOutpatientPDFData(
  modelResults: ModelResults,
  journeyInputs: JourneyInputs,
  careSetting: string = "Outpatient",
  clientName?: string,
  preparedBy?: string
): OutpatientPDFData {
  const organizationName = clientName;
  const timeSavedPerEncounter = modelResults.timeSavedPerEncounter || 3;
  const eligibleEncounters = Math.round(modelResults.encounters * (modelResults.utilizationRate / 100));
  const hoursReturned = Math.round((eligibleEncounters * timeSavedPerEncounter) / 60);

  const drivers: DriverCalculation[] = Object.entries(modelResults.driverResults)
    .filter(([_, result]) => result && result.value > 0)
    .map(([id, result]) => ({
      id,
      name: result.name || DRIVER_NAMES[id] || id,
      value: result.value,
      category: DRIVER_CATEGORIES[id] || "revenue",
      inputs: result.inputs || {},
    }));

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

  const unitName = careSetting === "Nursing" ? "bed" : "provider";
  const unitNamePlural = careSetting === "Nursing" ? "beds" : "providers";

  // Extract time allocation from driver inputs or use provided values
  const patientAccessDriver = modelResults.driverResults['patientAccess'];
  const overtimeDriver = modelResults.driverResults['overtime'];
  const workforceDriver = modelResults.driverResults['workforce'];
  
  const timeAllocation = modelResults.timeAllocation || {
    patientAccess: (patientAccessDriver?.inputs?.allocationPct as number) || 0,
    patientExperience: 0,
    clinicianWellbeing: (workforceDriver?.inputs?.wellbeingPct as number) || 0,
    reducingLocums: (overtimeDriver?.inputs?.allocationPct as number) || 0,
  };

  // Extract time values from driver results
  const timeValues = {
    patientAccess: patientAccessDriver?.value || 0,
    patientExperience: "Qualitative",
    clinicianWellbeing: workforceDriver?.value || 0,
    reducingLocums: overtimeDriver?.value || 0,
  };

  return {
    clientName,
    preparedBy,
    organizationName,
    careSetting,
    unitName,
    unitNamePlural,

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

    timeAllocation,
    timeValues,

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
