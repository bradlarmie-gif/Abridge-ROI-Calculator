import type { LeverId } from "@/lib/roi-types";
import type { BaselineData } from "./expansion-types";
import { getVolumeDiscount } from "./expansion-calculations";

export interface CareSettingConfig {
  id: string;
  name: string;
  encountersPerProvider: number;
  avgWRVU?: number;
  primaryDrivers: LeverId[];
  typicalProviders: string;
  available: boolean;
}

export interface NewSettingConfig {
  type: "ed" | "nursing" | "inpatient";
  providers: number;
  encounters: number | null;
  customEncounters: boolean;
  utilization: number;
}

export interface CombinedDeploymentModel {
  baseline: {
    careSetting: string;
    providers: number;
    encounters: number;
    cost: number;
    benefit: number;
    netGain: number;
    roi: number;
    benefits: Record<string, number>;
  };
  newSetting: {
    type: string;
    name: string;
    providers: number;
    encounters: number;
    cost: number;
    totalBenefit: number;
    netGain: number;
    roi: number;
    benefits: Record<string, number>;
  };
  combined: {
    providers: number;
    encounters: number;
    cost: number;
    benefit: number;
    netGain: number;
    roi: number;
    benefitsByDriver: Record<string, number>;
    threeYearValue: number;
  };
  incremental: {
    providers: number;
    encounters: number;
    cost: number;
    benefit: number;
    netGain: number;
  };
  deltas: {
    providersIncrease: number;
    encountersIncrease: number;
    netGainIncrease: number;
    roiChange: number;
  };
  volumeDiscount: number;
  effectiveCostPerProvider: number;
  insight: string;
}

export const CARE_SETTING_DEFAULTS: Record<string, CareSettingConfig> = {
  ed: {
    id: "ed",
    name: "Emergency Department",
    encountersPerProvider: 5000,
    avgWRVU: 2.8,
    primaryDrivers: ["edThroughput", "edLevelOfService", "edDenialReduction"],
    typicalProviders: "15-30",
    available: true,
  },
  nursing: {
    id: "nursing",
    name: "Nursing",
    encountersPerProvider: 2000,
    primaryDrivers: ["rnDocTime", "rnCommunication", "rnSafetyReduction"],
    typicalProviders: "30-100",
    available: false,
  },
  inpatient: {
    id: "inpatient",
    name: "Inpatient",
    encountersPerProvider: 800,
    avgWRVU: 3.5,
    primaryDrivers: ["hcc", "wrvu", "denials"],
    typicalProviders: "20-50",
    available: false,
  },
};

const SETTING_NAMES: Record<string, string> = {
  ed: "ED",
  nursing: "Nursing",
  inpatient: "Inpatient",
  outpatient: "Outpatient",
};

function getDriverName(key: string): string {
  const names: Record<string, string> = {
    patientAccess: "Patient Access",
    throughput: "Patient Throughput",
    edThroughput: "Patient Throughput",
    workforce: "Clinician Retention",
    wrvu: "Level of Service",
    edLevelOfService: "Level of Service",
    overtime: "Overtime & Locum",
    denials: "Denial Reduction",
    edDenialReduction: "Denial Reduction",
    hcc: "HCC Capture",
    edRetention: "Clinician Retention",
    rnDocTime: "Documentation Time",
    rnCommunication: "Care Coordination",
    rnSafetyReduction: "Safety Events",
    rnDiagnosisSeverity: "Severity Capture",
  };
  return names[key] || key;
}

function calculateEDBenefits(
  providers: number,
  encounters: number,
  utilization: number,
  costPerProviderMonth: number
): Partial<Record<LeverId, number>> {
  const eligibleEncounters = encounters * utilization;
  const benefits: Record<string, number> = {};
  
  const lwbsImprovementPct = 0.5;
  const pctRecoveredTreatedAndReleased = 85;
  const pctRecoveredAdmitted = 15;
  const contributionMarginPerEncounter = 350;
  const contributionMarginPerAdmission = 8500;
  
  const additionalPatientsTreated = encounters * (lwbsImprovementPct / 100);
  const treatedAndReleased = additionalPatientsTreated * (pctRecoveredTreatedAndReleased / 100);
  const admitted = additionalPatientsTreated * (pctRecoveredAdmitted / 100);
  const throughputValue = (treatedAndReleased * contributionMarginPerEncounter) + 
                          (admitted * contributionMarginPerAdmission);
  benefits.edThroughput = throughputValue;

  const baselineWrvuPerVisit = 2.8;
  const wrvuImprovementPct = 3.5;
  const wrvuConversionFactor = 45;
  const wrvuChangePerVisit = baselineWrvuPerVisit * (wrvuImprovementPct / 100);
  const totalAddedWrvus = wrvuChangePerVisit * eligibleEncounters;
  benefits.edLevelOfService = totalAddedWrvus * wrvuConversionFactor;

  const avgRevenuePerEncounter = 450;
  const baselineDenialRate = 8;
  const pctDenialsFromDocumentation = 60;
  const pctDocDenialsRecovered = 35;
  const netCollectibleRevenue = encounters * avgRevenuePerEncounter;
  const baselineDeniedRevenue = netCollectibleRevenue * (baselineDenialRate / 100);
  const docRelatedDenials = baselineDeniedRevenue * (pctDenialsFromDocumentation / 100);
  benefits.edDenialReduction = docRelatedDenials * (pctDocDenialsRecovered / 100);

  return benefits as Record<LeverId, number>;
}

function calculateInpatientBenefits(
  providers: number,
  encounters: number,
  utilization: number
): Partial<Record<LeverId, number>> {
  const eligibleEncounters = encounters * utilization;
  const benefits: Record<string, number> = {};

  const pctMedicareAdvantage = 35;
  const maPatients = (eligibleEncounters / 2.5) * (pctMedicareAdvantage / 100);
  const hccPerPatient = 0.15;
  const revenuePerHcc = 2800;
  benefits.hcc = maPatients * hccPerPatient * revenuePerHcc;

  const baselineWrvu = 3.5;
  const wrvuImprovement = 4.0;
  const conversionFactor = 45;
  const addedWrvus = baselineWrvu * (wrvuImprovement / 100) * eligibleEncounters;
  benefits.wrvu = addedWrvus * conversionFactor;

  const avgRevenuePerEncounter = 1200;
  const baselineDenialRate = 10;
  const pctDenialsFromDoc = 55;
  const recoveryRate = 30;
  const totalRevenue = encounters * avgRevenuePerEncounter;
  const deniedRevenue = totalRevenue * (baselineDenialRate / 100);
  const docDenials = deniedRevenue * (pctDenialsFromDoc / 100);
  benefits.denials = docDenials * (recoveryRate / 100);

  return benefits as Record<LeverId, number>;
}

function generateInsight(
  baseline: BaselineData,
  newSettingType: string,
  model: CombinedDeploymentModel
): string {
  const name = SETTING_NAMES[newSettingType] || newSettingType;
  const baselineROI = baseline.roi;
  const combinedROI = model.combined.roi;
  const newROI = model.newSetting.roi;
  const gainIncrease = model.deltas.netGainIncrease;

  const benefitEntries = Object.entries(model.newSetting.benefits);
  const topDriver = benefitEntries.length > 0
    ? benefitEntries.sort(([, a], [, b]) => (b as number) - (a as number))[0]
    : null;
  const driverName = topDriver ? getDriverName(topDriver[0]) : "efficiency gains";

  let insight = `Adding ${name} `;

  if (newROI > baselineROI) {
    insight += `increases your combined ROI from ${baselineROI.toFixed(1)}x to ${combinedROI.toFixed(1)}x. `;
    insight += `${name}'s ${newROI.toFixed(1)}x ROI outperforms your current deployment`;

    if (newSettingType === "ed") {
      insight += `, driven by higher wRVU density (2.8 vs 2.1 per encounter). `;
    } else if (newSettingType === "inpatient") {
      insight += `, driven by complex encounters with high HCC capture potential. `;
    } else {
      insight += `. `;
    }

    insight += `${driverName} accounts for the largest value contribution.`;
  } else if (gainIncrease >= 50) {
    const additionalGain = model.incremental.netGain / 1000;
    insight += `nearly doubles your net gain (+${gainIncrease.toFixed(0)}%), `;
    insight += `generating an additional $${additionalGain.toFixed(0)}K annually `;
    insight += `while maintaining strong ${combinedROI.toFixed(1)}x combined ROI.`;
  } else {
    insight += `increases your net gain by ${gainIncrease.toFixed(0)}% `;
    insight += `with solid ${newROI.toFixed(1)}x ROI. `;
    insight += `Combined ROI of ${combinedROI.toFixed(1)}x demonstrates efficient scaling.`;
  }

  return insight;
}

export function calculateCombinedDeployment(
  baseline: BaselineData,
  newSetting: NewSettingConfig
): CombinedDeploymentModel {
  const settingDefaults = CARE_SETTING_DEFAULTS[newSetting.type];
  if (!settingDefaults) {
    throw new Error(`Unknown care setting type: ${newSetting.type}`);
  }

  const newProviders = newSetting.providers;
  const newEncounters = newSetting.encounters || 
    (newProviders * settingDefaults.encountersPerProvider);
  const newUtilization = newSetting.utilization;

  const totalProviders = baseline.providers + newProviders;
  const volumeDiscount = getVolumeDiscount(totalProviders);
  const effectiveCostPerProvider = baseline.costPerProviderMonth * (1 - volumeDiscount);
  const newCost = newProviders * effectiveCostPerProvider * 12;

  let newBenefits: Partial<Record<LeverId, number>> = {};
  
  if (newSetting.type === "ed") {
    newBenefits = calculateEDBenefits(
      newProviders,
      newEncounters,
      newUtilization,
      baseline.costPerProviderMonth
    );
  } else if (newSetting.type === "inpatient") {
    newBenefits = calculateInpatientBenefits(
      newProviders,
      newEncounters,
      newUtilization
    );
  }

  const newTotalBenefit = Object.values(newBenefits).reduce((sum, val) => sum + val, 0);
  const newNetGain = newTotalBenefit - newCost;
  const newROI = newCost > 0 ? newTotalBenefit / newCost : 0;

  const combinedProviders = baseline.providers + newProviders;
  const combinedEncounters = baseline.encounters + newEncounters;
  
  const baselineDiscountedCost = baseline.providers * effectiveCostPerProvider * 12;
  const combinedCost = baselineDiscountedCost + newCost;
  
  const combinedBenefit = baseline.totalBenefit + newTotalBenefit;
  const combinedNetGain = combinedBenefit - combinedCost;
  const combinedROI = combinedCost > 0 ? combinedBenefit / combinedCost : 0;

  const combinedBenefitsByDriver: Record<string, number> = {};
  
  if (baseline.benefits) {
    Object.entries(baseline.benefits).forEach(([driver, value]) => {
      combinedBenefitsByDriver[driver] = (combinedBenefitsByDriver[driver] || 0) + value;
    });
  }
  
  Object.entries(newBenefits).forEach(([driver, value]) => {
    combinedBenefitsByDriver[driver] = (combinedBenefitsByDriver[driver] || 0) + value;
  });

  const threeYearValue = combinedNetGain * 3;

  const model: CombinedDeploymentModel = {
    baseline: {
      careSetting: baseline.careSetting || "Outpatient",
      providers: baseline.providers,
      encounters: baseline.encounters,
      cost: baseline.annualCost,
      benefit: baseline.totalBenefit,
      netGain: baseline.netGain,
      roi: baseline.roi,
      benefits: baseline.benefits || {},
    },
    newSetting: {
      type: newSetting.type,
      name: settingDefaults.name,
      providers: newProviders,
      encounters: newEncounters,
      cost: newCost,
      totalBenefit: newTotalBenefit,
      netGain: newNetGain,
      roi: newROI,
      benefits: newBenefits,
    },
    combined: {
      providers: combinedProviders,
      encounters: combinedEncounters,
      cost: combinedCost,
      benefit: combinedBenefit,
      netGain: combinedNetGain,
      roi: combinedROI,
      benefitsByDriver: combinedBenefitsByDriver,
      threeYearValue,
    },
    incremental: {
      providers: newProviders,
      encounters: newEncounters,
      cost: newCost,
      benefit: newTotalBenefit,
      netGain: newNetGain,
    },
    deltas: {
      providersIncrease: baseline.providers > 0 
        ? Math.round((newProviders / baseline.providers) * 100) 
        : 100,
      encountersIncrease: baseline.encounters > 0 
        ? Math.round((newEncounters / baseline.encounters) * 100) 
        : 100,
      netGainIncrease: baseline.netGain > 0 
        ? Math.round((newNetGain / baseline.netGain) * 100) 
        : 100,
      roiChange: newROI - baseline.roi,
    },
    volumeDiscount,
    effectiveCostPerProvider,
    insight: "",
  };

  model.insight = generateInsight(baseline, newSetting.type, model);

  return model;
}

export function getDriverDisplayName(driverId: string): string {
  return getDriverName(driverId);
}

export function getSettingShortName(settingType: string): string {
  return SETTING_NAMES[settingType] || settingType;
}
