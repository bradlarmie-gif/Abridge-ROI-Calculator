import type { NursingPDFData, DriverCalculation, JourneyData } from "./nursing-pdf-generator";

interface ModelResults {
  totalBenefit: number;
  investment: number;
  implementationFee?: number;
  staffedBeds: number;
  nurseFTEs: number;
  documentationEvents: number;
  utilizationRate: number;
  costPerMonth: number;
  timeSavedPerEvent?: number;
  driverResults: Record<string, { name: string; value: number; inputs?: Record<string, any> }>;
}

interface JourneyInputs {
  pilotBeds: number;
  pilotEvents: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleBeds: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: "measured" | "steady" | "aggressive";
  networkEffect: number;
}

const NURSING_DRIVER_CATEGORIES: Record<string, "labor" | "quality" | "qualitative"> = {
  nursingOvertime: "labor",
  nursingAgency: "labor",
  nursingRetention: "labor",
  nursingHAPI: "quality",
  nursingFalls: "quality",
  nursingSurvey: "qualitative",
  nursingCareCoordination: "qualitative",
  nursingPatientExperience: "qualitative",
};

const NURSING_DRIVER_NAMES: Record<string, string> = {
  nursingOvertime: "Overtime Reduction",
  nursingAgency: "Agency & Travel Nurse Reduction",
  nursingRetention: "Nurse Retention",
  nursingHAPI: "Pressure Injuries (HAPI)",
  nursingFalls: "Patient Falls",
  nursingSurvey: "Survey & Compliance Readiness",
  nursingCareCoordination: "Care Coordination",
  nursingPatientExperience: "Patient Experience (HCAHPS)",
};

const NURSING_POTENTIAL_VALUE_DRIVERS = ["nursingHAPI", "nursingFalls"];

const PACE_MONTHS: Record<string, number> = {
  measured: 36,
  steady: 24,
  aggressive: 18,
};

function calculateIntermediateValues(
  driverId: string,
  inputs: Record<string, any>,
  staffedBeds: number,
  nurseFTEs: number,
  utilizationRate: number,
  driverValue: number
): Record<string, any> {
  const eligibleEvents = Math.round(staffedBeds * 365 * (utilizationRate / 100));
  
  switch (driverId) {
    case "nursingOvertime": {
      const otMinutesPerShift = (inputs.otMinutesPerShift as number) || 15;
      const shiftsPerYear = (inputs.shiftsPerYear as number) || 260;
      const otRate = (inputs.otRate as number) || 60;
      
      const hoursReduced = nurseFTEs * otMinutesPerShift * shiftsPerYear / 60;
      
      return {
        ...inputs,
        nurseFTEs,
        otMinutesPerShift,
        shiftsPerYear,
        otRate,
        hoursReduced,
      };
    }
    
    case "nursingAgency": {
      const agencyFTEs = (inputs.agencyFTEs as number) || 5;
      const reductionPct = (inputs.reductionPct as number) || 20;
      const premiumPerFTE = (inputs.premiumPerFTE as number) || 75000;
      
      const ftesReplaced = agencyFTEs * (reductionPct / 100);
      
      return {
        ...inputs,
        agencyFTEs,
        reductionPct,
        premiumPerFTE,
        ftesReplaced,
      };
    }
    
    case "nursingRetention": {
      const turnoverRate = (inputs.turnoverRate as number) || 20;
      const burnoutPct = (inputs.burnoutPct as number) || 40;
      const abridgeImpact = (inputs.abridgeImpact as number) || 25;
      const replacementCost = (inputs.replacementCost as number) || 50000;
      
      const annualDepartures = nurseFTEs * (turnoverRate / 100);
      const burnoutDepartures = annualDepartures * (burnoutPct / 100);
      const nursesRetained = burnoutDepartures * (abridgeImpact / 100);
      
      return {
        ...inputs,
        nurseFTEs,
        turnoverRate,
        annualDepartures,
        burnoutPct,
        burnoutDepartures,
        abridgeImpact,
        nursesRetained,
        replacementCost,
      };
    }
    
    case "nursingHAPI": {
      const hapiRate = (inputs.hapiRate as number) || 2;
      const preventionRate = (inputs.preventionRate as number) || 10;
      const hapiCost = (inputs.hapiCost as number) || 20000;
      
      const annualAdmissions = staffedBeds * 12; // Rough estimate: 12 admissions per bed per year
      const baselineHapis = annualAdmissions * (hapiRate / 100);
      const hapisAvoided = baselineHapis * (preventionRate / 100);
      
      return {
        ...inputs,
        staffedBeds,
        annualAdmissions,
        hapiRate,
        baselineHapis,
        preventionRate,
        hapisAvoided,
        hapiCost,
      };
    }
    
    case "nursingFalls": {
      const fallRate = (inputs.fallRate as number) || 3;
      const preventionRate = (inputs.preventionRate as number) || 10;
      const fallCost = (inputs.fallCost as number) || 6500;
      
      const annualAdmissions = staffedBeds * 12;
      const baselineFalls = annualAdmissions * (fallRate / 100);
      const fallsAvoided = baselineFalls * (preventionRate / 100);
      
      return {
        ...inputs,
        staffedBeds,
        annualAdmissions,
        fallRate,
        baselineFalls,
        preventionRate,
        fallsAvoided,
        fallCost,
      };
    }
    
    default:
      return inputs;
  }
}

export function transformToNursingPDFData(
  modelResults: ModelResults,
  journeyInputs: JourneyInputs,
  organizationName?: string,
  clientName?: string,
  preparedBy?: string
): NursingPDFData {
  const staffedBeds = modelResults.staffedBeds;
  const nurseFTEs = modelResults.nurseFTEs || Math.round(staffedBeds * 1.5); // Default: 1.5 FTE per bed
  const documentationEvents = modelResults.documentationEvents || staffedBeds * 365 * 8; // ~8 events per bed per day
  const utilizationRate = modelResults.utilizationRate;
  const eligibleEvents = Math.round(documentationEvents * (utilizationRate / 100));
  const costPerBed = modelResults.costPerMonth;
  const timeSavedPerEvent = modelResults.timeSavedPerEvent || 5;
  
  // Calculate hours returned
  const hoursReturned = Math.round((eligibleEvents * timeSavedPerEvent) / 60);
  
  // Process drivers
  const drivers: DriverCalculation[] = [];
  let laborTotal = 0;
  let qualityTotal = 0;
  
  for (const [driverId, driverData] of Object.entries(modelResults.driverResults)) {
    const category = NURSING_DRIVER_CATEGORIES[driverId];
    if (!category) continue;
    
    const enrichedInputs = calculateIntermediateValues(
      driverId,
      driverData.inputs || {},
      staffedBeds,
      nurseFTEs,
      utilizationRate,
      driverData.value
    );
    
    const isPotentialValue = NURSING_POTENTIAL_VALUE_DRIVERS.includes(driverId);
    
    drivers.push({
      id: driverId,
      name: NURSING_DRIVER_NAMES[driverId] || driverData.name,
      value: driverData.value,
      category,
      inputs: enrichedInputs,
      isPotentialValue,
    });
    
    if (category === "labor") {
      laborTotal += driverData.value;
    } else if (category === "quality") {
      qualityTotal += driverData.value;
    }
  }
  
  // Always include qualitative drivers (even if not in driverResults)
  const qualitativeDriverIds = ["nursingSurvey", "nursingCareCoordination", "nursingPatientExperience"];
  for (const driverId of qualitativeDriverIds) {
    if (!drivers.find(d => d.id === driverId)) {
      drivers.push({
        id: driverId,
        name: NURSING_DRIVER_NAMES[driverId],
        value: 0,
        category: "qualitative",
        inputs: {},
      });
    }
  }
  
  // Sort drivers by category order (labor first, then quality, then qualitative)
  const categoryOrder = { labor: 0, quality: 1, qualitative: 2 };
  drivers.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  
  const totalValue = laborTotal; // Only labor goes into main ROI
  const potentialValue = qualityTotal;
  const investment = modelResults.investment;
  const netGain = totalValue - investment;
  const roi = investment > 0 ? totalValue / investment : 0;
  
  // Calculate percentages
  const laborPct = totalValue > 0 ? Math.round((laborTotal / totalValue) * 100) : 0;
  const qualityPct = potentialValue > 0 ? 100 : 0;
  
  // Multi-year projections (using adoption curve)
  const year1Adoption = 0.6;
  const year2Adoption = 0.85;
  const year3Adoption = 1.0;
  
  const year1Value = Math.round(totalValue * year1Adoption);
  const year2Value = Math.round(totalValue * year2Adoption);
  const year3Value = Math.round(totalValue * year3Adoption);
  
  const year1Cost = investment;
  const year2Cost = Math.round(investment * 1.03); // 3% increase
  const year3Cost = Math.round(investment * 1.06);
  
  const threeYearValue = year1Value + year2Value + year3Value;
  const threeYearCost = year1Cost + year2Cost + year3Cost;
  const threeYearNet = threeYearValue - threeYearCost;
  
  // Journey data
  const scalingMonths = PACE_MONTHS[journeyInputs.scalingPace] || 24;
  
  const journey: JourneyData = {
    pilotBeds: journeyInputs.pilotBeds,
    pilotEvents: journeyInputs.pilotEvents,
    pilotUtilization: journeyInputs.pilotUtilization,
    pilotValue: journeyInputs.pilotValue,
    fullScaleBeds: journeyInputs.fullScaleBeds,
    fullScaleUtilization: journeyInputs.fullScaleUtilization,
    fullScaleValue: journeyInputs.fullScaleValue,
    scalingPace: journeyInputs.scalingPace,
    scalingMonths,
    networkEffect: journeyInputs.networkEffect,
  };
  
  return {
    clientName,
    preparedBy,
    organizationName,
    careSetting: "Nursing",
    unitName: "staffed bed",
    unitNamePlural: "staffed beds",
    
    staffedBeds,
    nurseFTEs,
    documentationEvents,
    eligibleEvents,
    utilization: utilizationRate,
    timeSavedPerEvent,
    hoursReturned,
    
    totalValue,
    potentialValue,
    investment,
    netGain,
    roi,
    costPerBed,
    
    drivers,
    laborTotal,
    qualityTotal,
    laborPct,
    qualityPct,
    
    year1Value,
    year2Value,
    year3Value,
    year1Cost,
    year2Cost,
    year3Cost,
    threeYearValue,
    threeYearCost,
    threeYearNet,
    
    journey,
  };
}

export function createNursingPDFDataFromState(
  careSetting: string,
  baselineInputs: Record<string, any>,
  driverResults: Record<string, { name: string; value: number; inputs?: Record<string, any> }>,
  investmentDetails: Record<string, any>,
  journeySettings: Record<string, any>,
  organizationName?: string
): NursingPDFData {
  const staffedBeds = baselineInputs.staffedBeds || 200;
  const nurseFTEs = baselineInputs.nurseFTEs || Math.round(staffedBeds * 1.5);
  const documentationEvents = baselineInputs.documentationEvents || staffedBeds * 365 * 8;
  const utilizationRate = baselineInputs.utilizationRate || 60;
  
  // Calculate totals from driver results
  let totalBenefit = 0;
  for (const [driverId, data] of Object.entries(driverResults)) {
    const category = NURSING_DRIVER_CATEGORIES[driverId];
    // Only include labor drivers in main benefit (not potential value)
    if (category === "labor") {
      totalBenefit += data.value;
    }
  }
  
  const costPerBed = investmentDetails.costPerMonth || 100;
  const investment = staffedBeds * costPerBed * 12;
  
  const modelResults: ModelResults = {
    totalBenefit,
    investment,
    implementationFee: investmentDetails.implementationFee,
    staffedBeds,
    nurseFTEs,
    documentationEvents,
    utilizationRate,
    costPerMonth: costPerBed,
    timeSavedPerEvent: baselineInputs.timeSavedPerEvent || 5,
    driverResults,
  };
  
  // Build journey inputs
  const pilotBeds = journeySettings.pilotBeds || Math.round(staffedBeds * 0.2);
  const pilotEvents = Math.round(pilotBeds * 365 * 8 * (utilizationRate / 100));
  const pilotValue = Math.round(totalBenefit * (pilotBeds / staffedBeds));
  
  const fullScaleBeds = journeySettings.fullScaleBeds || staffedBeds;
  const fullScaleUtilization = journeySettings.fullScaleUtilization || 85;
  const fullScaleValue = Math.round(totalBenefit * (fullScaleUtilization / utilizationRate));
  
  const networkEffectMultiplier = 0.15;
  const networkEffect = Math.round(fullScaleValue * networkEffectMultiplier);
  
  const journeyInputs: JourneyInputs = {
    pilotBeds,
    pilotEvents,
    pilotUtilization: utilizationRate,
    pilotValue,
    fullScaleBeds,
    fullScaleUtilization,
    fullScaleValue,
    scalingPace: journeySettings.scalingPace || "steady",
    networkEffect,
  };
  
  return transformToNursingPDFData(modelResults, journeyInputs, organizationName);
}
