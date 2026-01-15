import type { LeverId } from "@/lib/roi-types";
import type {
  BaselineData,
  ExpansionInputs,
  ExpansionResults,
  MaturityPoint,
  AccessValidation,
  LosValidation,
} from "./expansion-types";

export interface DriverMaturityCurve {
  year1: number;
  year2: number;
  year3: number;
}

export const DRIVER_MATURITY_CURVES: Record<string, DriverMaturityCurve> = {
  patientAccess: { year1: 0.50, year2: 0.80, year3: 1.00 },
  workforce: { year1: 0.20, year2: 0.70, year3: 1.00 },
  wrvu: { year1: 0.50, year2: 0.80, year3: 1.00 },
  overtime: { year1: 0.50, year2: 0.80, year3: 0.95 },
  denials: { year1: 0.50, year2: 0.80, year3: 1.00 },
  hcc: { year1: 0.50, year2: 0.80, year3: 1.00 },
  edThroughput: { year1: 0.50, year2: 0.80, year3: 1.00 },
  edLevelOfService: { year1: 0.50, year2: 0.80, year3: 1.00 },
  edDenialReduction: { year1: 0.50, year2: 0.80, year3: 1.00 },
  edRetention: { year1: 0.20, year2: 0.70, year3: 1.00 },
  rnDocTime: { year1: 0.50, year2: 0.80, year3: 1.00 },
  rnCommunication: { year1: 0.50, year2: 0.80, year3: 1.00 },
  rnSafetyReduction: { year1: 0.50, year2: 0.80, year3: 1.00 },
  rnDiagnosisSeverity: { year1: 0.50, year2: 0.80, year3: 1.00 },
};

export function getDriverMaturityFactor(driverId: LeverId, year: 1 | 2 | 3): number {
  const curve = DRIVER_MATURITY_CURVES[driverId] || { year1: 0.5, year2: 0.8, year3: 1.0 };
  return curve[`year${year}` as keyof DriverMaturityCurve];
}

export function getVolumeDiscount(providers: number): number {
  if (providers >= 250) return 0.3;
  if (providers >= 150) return 0.25;
  if (providers >= 100) return 0.2;
  if (providers >= 75) return 0.15;
  if (providers >= 50) return 0.1;
  return 0;
}

export function getMaturityUtilization(monthsSinceLaunch: number): number {
  if (monthsSinceLaunch <= 0) return 0;
  if (monthsSinceLaunch <= 3) return 0.45;
  if (monthsSinceLaunch <= 6) return 0.55;
  if (monthsSinceLaunch <= 12) return 0.7;
  if (monthsSinceLaunch <= 18) return 0.8;
  return 0.85;
}

export function getScalingFactor(
  driverId: LeverId,
  providerRatio: number,
  encounterRatio: number
): number {
  const scalingLogic: Record<LeverId, number> = {
    patientAccess: encounterRatio,
    workforce: providerRatio,
    wrvu: encounterRatio,
    overtime: providerRatio * 0.9,
    denials: encounterRatio,
    hcc: encounterRatio,
    edThroughput: encounterRatio,
    edLevelOfService: encounterRatio,
    edDenialReduction: encounterRatio,
    edRetention: providerRatio,
    rnDocTime: providerRatio,
    rnCommunication: providerRatio,
    rnSafetyReduction: providerRatio,
    rnDiagnosisSeverity: providerRatio,
  };
  return scalingLogic[driverId] || providerRatio;
}

export function calculateExpansionCost(
  targetProviders: number,
  baseline: BaselineData,
  inputs: ExpansionInputs
): number {
  if (inputs.pricingModel === "per-provider") {
    return targetProviders * baseline.costPerProviderMonth * 12;
  }
  if (inputs.enterpriseCost && inputs.enterpriseCost > 0) {
    return inputs.enterpriseCost;
  }
  const discount = getVolumeDiscount(targetProviders);
  return targetProviders * baseline.costPerProviderMonth * 12 * (1 - discount);
}

export function calculateExpansionResults(
  baseline: BaselineData,
  inputs: ExpansionInputs
): ExpansionResults {
  const targetProviders = inputs.targetProviders;
  const baselineProviders = baseline.providers;
  const newProviders = targetProviders - baselineProviders;

  if (newProviders <= 0) {
    return {
      year1: {
        totalProviders: baselineProviders,
        totalEncounters: baseline.encounters,
        totalCost: baseline.annualCost,
        totalBenefit: baseline.totalBenefit,
        netGain: baseline.netGain,
        roi: baseline.roi,
      },
      year2: {
        totalProviders: baselineProviders,
        totalEncounters: baseline.encounters,
        totalCost: baseline.annualCost,
        totalBenefit: baseline.totalBenefit,
        netGain: baseline.netGain,
        roi: baseline.roi,
      },
      year3: {
        totalProviders: baselineProviders,
        totalEncounters: baseline.encounters,
        totalCost: baseline.annualCost,
        totalBenefit: baseline.totalBenefit,
        netGain: baseline.netGain,
        roi: baseline.roi,
      },
      threeYearTotal: {
        totalCost: baseline.annualCost * 3,
        totalBenefit: baseline.totalBenefit * 3,
        netGain: baseline.netGain * 3,
        roi: baseline.roi,
      },
      maturityCurve: [],
      incremental: {
        providers: 0,
        encounters: 0,
        cost: 0,
        benefit: 0,
        netGain: 0,
        roi: 0,
      },
    };
  }

  const encountersPerProvider = baseline.encounters / baselineProviders;
  const benefitPerEncounter = baseline.totalBenefit / baseline.encounters;

  const maturityCurve: MaturityPoint[] = [];

  let year1ActiveProviders = 0;
  let year1Cost = 0;
  let year1Benefit = 0;

  if (inputs.rolloutType === "phased") {
    const { wave1, wave2, wave3 } = inputs.phasedPlan;

    for (let month = 1; month <= 12; month++) {
      let activeNewProviders = 0;
      let weightedUtilization = 0;

      if (month >= wave1.month) {
        const monthsSinceLaunch = month - wave1.month;
        const util = getMaturityUtilization(monthsSinceLaunch);
        activeNewProviders += wave1.providers;
        weightedUtilization += wave1.providers * util;
      }
      if (month >= wave2.month) {
        const monthsSinceLaunch = month - wave2.month;
        const util = getMaturityUtilization(monthsSinceLaunch);
        activeNewProviders += wave2.providers;
        weightedUtilization += wave2.providers * util;
      }
      if (month >= wave3.month) {
        const monthsSinceLaunch = month - wave3.month;
        const util = getMaturityUtilization(monthsSinceLaunch);
        activeNewProviders += wave3.providers;
        weightedUtilization += wave3.providers * util;
      }

      const avgUtilization =
        activeNewProviders > 0 ? weightedUtilization / activeNewProviders : 0;
      const monthlyEncounters =
        activeNewProviders * encountersPerProvider * avgUtilization * (1 / 12);
      const monthlyBenefit = monthlyEncounters * benefitPerEncounter;
      const monthlyCost =
        activeNewProviders * baseline.costPerProviderMonth * (1 / 12);

      year1ActiveProviders = Math.max(year1ActiveProviders, activeNewProviders);
      year1Cost += monthlyCost * 12;
      year1Benefit += monthlyBenefit;

      maturityCurve.push({
        month,
        providers: baselineProviders + activeNewProviders,
        utilization: avgUtilization,
        benefit: monthlyBenefit,
        cost: monthlyCost,
        netGain: monthlyBenefit - monthlyCost,
        roi: monthlyCost > 0 ? monthlyBenefit / monthlyCost : 0,
      });
    }
  } else {
    for (let month = 1; month <= 12; month++) {
      const util = getMaturityUtilization(month);
      const monthlyEncounters =
        newProviders * encountersPerProvider * util * (1 / 12);
      const monthlyBenefit = monthlyEncounters * benefitPerEncounter;
      const monthlyCost = newProviders * baseline.costPerProviderMonth;

      year1Cost = newProviders * baseline.costPerProviderMonth * 12;
      year1Benefit += monthlyBenefit;
      year1ActiveProviders = newProviders;

      maturityCurve.push({
        month,
        providers: targetProviders,
        utilization: util,
        benefit: monthlyBenefit,
        cost: monthlyCost,
        netGain: monthlyBenefit - monthlyCost,
        roi: monthlyCost > 0 ? monthlyBenefit / monthlyCost : 0,
      });
    }
  }

  const expansionCost = calculateExpansionCost(targetProviders, baseline, inputs);
  const scenarioEncounters = targetProviders * encountersPerProvider;
  const matureUtilization = 0.85;

  const newProviderEncounters = newProviders * encountersPerProvider;
  
  const year2IncrementalEncounters = newProviderEncounters * matureUtilization;
  const year2IncrementalBenefit = year2IncrementalEncounters * benefitPerEncounter;
  const year2IncrementalCost = expansionCost - baseline.annualCost;
  
  const year3IncrementalEncounters = newProviderEncounters * matureUtilization;
  const year3IncrementalBenefit = year3IncrementalEncounters * benefitPerEncounter;
  const year3IncrementalCost = expansionCost - baseline.annualCost;

  const totalYear1Cost = baseline.annualCost + year1Cost;
  const totalYear1Benefit = baseline.totalBenefit + year1Benefit;

  const totalYear2Cost = baseline.annualCost + year2IncrementalCost;
  const totalYear2Benefit = baseline.totalBenefit + year2IncrementalBenefit;
  const year2NetGain = totalYear2Benefit - totalYear2Cost;
  const year2Roi = totalYear2Cost > 0 ? totalYear2Benefit / totalYear2Cost : 0;
  
  const totalYear3Cost = baseline.annualCost + year3IncrementalCost;
  const totalYear3Benefit = baseline.totalBenefit + year3IncrementalBenefit;
  const year3NetGain = totalYear3Benefit - totalYear3Cost;
  const year3Roi = totalYear3Cost > 0 ? totalYear3Benefit / totalYear3Cost : 0;

  const threeYearCost = totalYear1Cost + totalYear2Cost + totalYear3Cost;
  const threeYearBenefit = totalYear1Benefit + totalYear2Benefit + totalYear3Benefit;
  const threeYearNetGain = threeYearBenefit - threeYearCost;
  const threeYearRoi = threeYearCost > 0 ? threeYearBenefit / threeYearCost : 0;

  const threeYearIncrementalCost = year1Cost + year2IncrementalCost + year3IncrementalCost;
  const threeYearIncrementalBenefit = year1Benefit + year2IncrementalBenefit + year3IncrementalBenefit;
  const incrementalNetGain = threeYearIncrementalBenefit - threeYearIncrementalCost;
  const incrementalRoi = threeYearIncrementalCost > 0 
    ? threeYearIncrementalBenefit / threeYearIncrementalCost 
    : 0;

  return {
    year1: {
      totalProviders: baselineProviders + year1ActiveProviders,
      totalEncounters: baseline.encounters + year1Benefit / benefitPerEncounter,
      totalCost: totalYear1Cost,
      totalBenefit: totalYear1Benefit,
      netGain: totalYear1Benefit - totalYear1Cost,
      roi: totalYear1Cost > 0 ? totalYear1Benefit / totalYear1Cost : 0,
    },
    year2: {
      totalProviders: targetProviders,
      totalEncounters: baseline.encounters + year2IncrementalEncounters,
      totalCost: totalYear2Cost,
      totalBenefit: totalYear2Benefit,
      netGain: year2NetGain,
      roi: year2Roi,
    },
    year3: {
      totalProviders: targetProviders,
      totalEncounters: baseline.encounters + year3IncrementalEncounters,
      totalCost: totalYear3Cost,
      totalBenefit: totalYear3Benefit,
      netGain: year3NetGain,
      roi: year3Roi,
    },
    threeYearTotal: {
      totalCost: threeYearCost,
      totalBenefit: threeYearBenefit,
      netGain: threeYearNetGain,
      roi: threeYearRoi,
    },
    maturityCurve,
    incremental: {
      providers: newProviders,
      encounters: scenarioEncounters - baseline.encounters,
      cost: threeYearIncrementalCost,
      benefit: threeYearIncrementalBenefit,
      netGain: incrementalNetGain,
      roi: incrementalRoi,
    },
  };
}

export function formatCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }
  return `${(value * 100).toFixed(0)}%`;
}

export function formatROI(value: number): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return "0.0x";
  }
  return `${value.toFixed(1)}x`;
}

export interface YearBenefits {
  benefitsByDriver: Record<string, number>;
  totalBenefit: number;
}

export interface ExpandedModel {
  baseline: {
    providers: number;
    cost: number;
    benefit: number;
    netGain: number;
    roi: number;
  };
  year1: {
    avgUtilization: number;
    totalCost: number;
    incrementalCost: number;
    benefitsByDriver: Record<string, number>;
    totalBenefit: number;
    incrementalBenefit: number;
    totalNetGain: number;
    incrementalNetGain: number;
    totalROI: number;
    incrementalROI: number;
  };
  year2: {
    avgUtilization: number;
    totalCost: number;
    incrementalCost: number;
    benefitsByDriver: Record<string, number>;
    totalBenefit: number;
    incrementalBenefit: number;
    totalNetGain: number;
    incrementalNetGain: number;
    totalROI: number;
    incrementalROI: number;
  };
  year3: {
    avgUtilization: number;
    totalCost: number;
    incrementalCost: number;
    benefitsByDriver: Record<string, number>;
    totalBenefit: number;
    incrementalBenefit: number;
    totalNetGain: number;
    incrementalNetGain: number;
    totalROI: number;
    incrementalROI: number;
  };
  threeYear: {
    totalIncrementalCost: number;
    totalIncrementalBenefit: number;
    totalIncrementalNetGain: number;
    blendedROI: number;
  };
  incremental: {
    providers: number;
  };
  hasRetention: boolean;
  hasAccess: boolean;
}

function applyDriverValidation(
  driver: LeverId,
  valuePerProvider: number,
  newProviders: number,
  maturityFactor: number,
  validation: AccessValidation | LosValidation | undefined,
  baseline: BaselineData
): number {
  let adjustedValue = valuePerProvider * newProviders * maturityFactor;

  if (validation) {
    if (driver === "patientAccess" && "hasCapacity" in validation) {
      const accessVal = validation as AccessValidation;
      if (!accessVal.hasCapacity) {
        adjustedValue *= 0.5;
      }
      if (!accessVal.sameDemand && accessVal.additionalVisitsPerWeek > 0) {
        const baselineVisitsPerProvider = (baseline.benefits?.patientAccess || 0) / baseline.providers / 48;
        if (baselineVisitsPerProvider > 0) {
          const ratio = accessVal.additionalVisitsPerWeek / baselineVisitsPerProvider;
          adjustedValue *= Math.min(ratio, 1.5);
        }
      }
    }

    if (driver === "wrvu" && "sameCaseMix" in validation) {
      const losVal = validation as LosValidation;
      if (!losVal.sameCaseMix && losVal.wrvuUplift > 0) {
        const baselineWRVU = (baseline.benefits?.wrvu || 0) / baseline.providers;
        if (baselineWRVU > 0) {
          const ratio = losVal.wrvuUplift / baselineWRVU;
          adjustedValue *= Math.min(ratio, 1.5);
        }
      }
    }
  }

  return Math.round(adjustedValue);
}

export function calculateExpandedModel(
  baseline: BaselineData,
  inputs: ExpansionInputs
): ExpandedModel {
  const newProviders = inputs.targetProviders - baseline.providers;
  const baselineCost = baseline.annualCost;
  const scenarioCost = calculateExpansionCost(inputs.targetProviders, baseline, inputs);
  const incrementalCost = scenarioCost - baselineCost;

  const calculateYearBenefits = (year: 1 | 2 | 3): YearBenefits => {
    const benefitsByDriver: Record<string, number> = {};
    let totalBenefit = 0;

    Object.entries(baseline.benefits || {}).forEach(([driver, baseValue]) => {
      if (baseValue && baseValue > 0) {
        const valuePerProvider = baseValue / baseline.providers;
        const maturityFactor = getDriverMaturityFactor(driver as LeverId, year);
        
        const adjustedValue = applyDriverValidation(
          driver as LeverId,
          valuePerProvider,
          newProviders,
          maturityFactor,
          inputs.driverValidations?.[driver as LeverId] as AccessValidation | LosValidation | undefined,
          baseline
        );

        benefitsByDriver[driver] = adjustedValue;
        totalBenefit += adjustedValue;
      }
    });

    return { benefitsByDriver, totalBenefit };
  };

  const year1Benefits = calculateYearBenefits(1);
  const year2Benefits = calculateYearBenefits(2);
  const year3Benefits = calculateYearBenefits(3);

  const avgUtilization1 = 0.50;
  const avgUtilization2 = 0.80;
  const avgUtilization3 = 0.90;

  return {
    baseline: {
      providers: baseline.providers,
      cost: baselineCost,
      benefit: baseline.totalBenefit,
      netGain: baseline.totalBenefit - baselineCost,
      roi: baselineCost > 0 ? baseline.totalBenefit / baselineCost : 0,
    },
    year1: {
      avgUtilization: avgUtilization1,
      totalCost: scenarioCost,
      incrementalCost,
      benefitsByDriver: year1Benefits.benefitsByDriver,
      totalBenefit: baseline.totalBenefit + year1Benefits.totalBenefit,
      incrementalBenefit: year1Benefits.totalBenefit,
      totalNetGain: (baseline.totalBenefit + year1Benefits.totalBenefit) - scenarioCost,
      incrementalNetGain: year1Benefits.totalBenefit - incrementalCost,
      totalROI: scenarioCost > 0 ? (baseline.totalBenefit + year1Benefits.totalBenefit) / scenarioCost : 0,
      incrementalROI: incrementalCost > 0 ? year1Benefits.totalBenefit / incrementalCost : 0,
    },
    year2: {
      avgUtilization: avgUtilization2,
      totalCost: scenarioCost,
      incrementalCost,
      benefitsByDriver: year2Benefits.benefitsByDriver,
      totalBenefit: baseline.totalBenefit + year2Benefits.totalBenefit,
      incrementalBenefit: year2Benefits.totalBenefit,
      totalNetGain: (baseline.totalBenefit + year2Benefits.totalBenefit) - scenarioCost,
      incrementalNetGain: year2Benefits.totalBenefit - incrementalCost,
      totalROI: scenarioCost > 0 ? (baseline.totalBenefit + year2Benefits.totalBenefit) / scenarioCost : 0,
      incrementalROI: incrementalCost > 0 ? year2Benefits.totalBenefit / incrementalCost : 0,
    },
    year3: {
      avgUtilization: avgUtilization3,
      totalCost: scenarioCost,
      incrementalCost,
      benefitsByDriver: year3Benefits.benefitsByDriver,
      totalBenefit: baseline.totalBenefit + year3Benefits.totalBenefit,
      incrementalBenefit: year3Benefits.totalBenefit,
      totalNetGain: (baseline.totalBenefit + year3Benefits.totalBenefit) - scenarioCost,
      incrementalNetGain: year3Benefits.totalBenefit - incrementalCost,
      totalROI: scenarioCost > 0 ? (baseline.totalBenefit + year3Benefits.totalBenefit) / scenarioCost : 0,
      incrementalROI: incrementalCost > 0 ? year3Benefits.totalBenefit / incrementalCost : 0,
    },
    threeYear: {
      totalIncrementalCost: incrementalCost * 3,
      totalIncrementalBenefit: year1Benefits.totalBenefit + year2Benefits.totalBenefit + year3Benefits.totalBenefit,
      totalIncrementalNetGain: (year1Benefits.totalBenefit + year2Benefits.totalBenefit + year3Benefits.totalBenefit) - (incrementalCost * 3),
      blendedROI: (incrementalCost * 3) > 0 
        ? (year1Benefits.totalBenefit + year2Benefits.totalBenefit + year3Benefits.totalBenefit) / (incrementalCost * 3) 
        : 0,
    },
    incremental: {
      providers: newProviders,
    },
    hasRetention: (baseline.benefits?.workforce || 0) > 0,
    hasAccess: (baseline.benefits?.patientAccess || 0) > 0,
  };
}
