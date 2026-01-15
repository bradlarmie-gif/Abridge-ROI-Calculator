import type { LeverId } from "@/lib/roi-types";
import type {
  BaselineData,
  ExpansionInputs,
  ExpansionResults,
  MaturityPoint,
} from "./expansion-types";

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

  const year2Encounters = scenarioEncounters * matureUtilization;
  const year2Benefit = year2Encounters * benefitPerEncounter;
  const year2Cost = expansionCost;
  const year2NetGain = year2Benefit - year2Cost;
  const year2Roi = year2Cost > 0 ? year2Benefit / year2Cost : 0;

  const year3Encounters = scenarioEncounters * matureUtilization;
  const year3Benefit = year3Encounters * benefitPerEncounter;
  const year3Cost = expansionCost;
  const year3NetGain = year3Benefit - year3Cost;
  const year3Roi = year3Cost > 0 ? year3Benefit / year3Cost : 0;

  const totalYear1Cost = baseline.annualCost + year1Cost;
  const totalYear1Benefit = baseline.totalBenefit + year1Benefit;

  const threeYearCost = totalYear1Cost + year2Cost + year3Cost;
  const threeYearBenefit = totalYear1Benefit + year2Benefit + year3Benefit;
  const threeYearNetGain = threeYearBenefit - threeYearCost;
  const threeYearRoi = threeYearCost > 0 ? threeYearBenefit / threeYearCost : 0;

  const incrementalCost = expansionCost - baseline.annualCost;
  const incrementalBenefit =
    year2Benefit + year3Benefit - baseline.totalBenefit * 2;
  const incrementalNetGain = incrementalBenefit - incrementalCost;
  const incrementalRoi =
    incrementalCost > 0 ? incrementalBenefit / incrementalCost : 0;

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
      totalEncounters: year2Encounters,
      totalCost: year2Cost,
      totalBenefit: year2Benefit,
      netGain: year2NetGain,
      roi: year2Roi,
    },
    year3: {
      totalProviders: targetProviders,
      totalEncounters: year3Encounters,
      totalCost: year3Cost,
      totalBenefit: year3Benefit,
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
      cost: incrementalCost,
      benefit: incrementalBenefit,
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
