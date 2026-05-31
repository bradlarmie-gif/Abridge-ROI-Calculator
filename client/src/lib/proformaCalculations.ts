import type {
  ProformaSettingSnapshot,
  ProformaConfig,
  ProformaCashFlowRow,
  ProformaSummary,
  DriverOnset,
  QuarterlyProviders,
  QuarterlyPricing,
  QuarterlyUtilization,
  YearlyProviders,
  YearlyPricing,
  YearlyUtilization,
} from "@/pages/proforma/proformaTypes";
import { ONSET_DELAY_MONTHS } from "@/pages/proforma/proformaTypes";

const QUARTERLY_KEYS: (keyof QuarterlyProviders)[] = [
  "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12",
];

export function annualToQuarterlyProviders(yp: YearlyProviders): QuarterlyProviders {
  const y1 = yp.year1;
  const y2 = yp.year2;
  const y3 = yp.year3;
  return {
    q1: Math.round(y1 * 0.7),
    q2: Math.round(y1 * 0.85),
    q3: Math.round(y1 * 0.95),
    q4: y1,
    q5: Math.round(y1 + (y2 - y1) * 0.25),
    q6: Math.round(y1 + (y2 - y1) * 0.5),
    q7: Math.round(y1 + (y2 - y1) * 0.75),
    q8: y2,
    q9: Math.round(y2 + (y3 - y2) * 0.25),
    q10: Math.round(y2 + (y3 - y2) * 0.5),
    q11: Math.round(y2 + (y3 - y2) * 0.75),
    q12: y3,
  };
}

export function quarterlyToAnnualProviders(qp: QuarterlyProviders): YearlyProviders {
  return { year1: qp.q4, year2: qp.q8, year3: qp.q12 };
}

export function annualToQuarterlyPricing(yp: YearlyPricing): QuarterlyPricing {
  return {
    q1: yp.year1, q2: yp.year1, q3: yp.year1, q4: yp.year1,
    q5: yp.year2, q6: yp.year2, q7: yp.year2, q8: yp.year2,
    q9: yp.year3, q10: yp.year3, q11: yp.year3, q12: yp.year3,
  };
}

export function quarterlyToAnnualPricing(qp: QuarterlyPricing): YearlyPricing {
  return { year1: qp.q4, year2: qp.q8, year3: qp.q12 };
}

export function annualToQuarterlyUtilization(yu: YearlyUtilization): QuarterlyUtilization {
  const y1 = yu.year1;
  const y2 = yu.year2;
  const y3 = yu.year3;
  return {
    q1: y1,
    q2: y1,
    q3: y1,
    q4: y1,
    q5: Math.round(y1 + (y2 - y1) * 0.25),
    q6: Math.round(y1 + (y2 - y1) * 0.5),
    q7: Math.round(y1 + (y2 - y1) * 0.75),
    q8: y2,
    q9: Math.round(y2 + (y3 - y2) * 0.25),
    q10: Math.round(y2 + (y3 - y2) * 0.5),
    q11: Math.round(y2 + (y3 - y2) * 0.75),
    q12: y3,
  };
}

export function quarterlyToAnnualUtilization(qu: QuarterlyUtilization): YearlyUtilization {
  return { year1: qu.q4, year2: qu.q8, year3: qu.q12 };
}

function getQuarterlyValue<T extends QuarterlyProviders | QuarterlyPricing | QuarterlyUtilization>(
  qData: T,
  monthsSinceGoLive: number
): number {
  const qIdx = Math.min(Math.floor(monthsSinceGoLive / 3), 11);
  const key = QUARTERLY_KEYS[qIdx];
  return qData[key] as number;
}

function getRetentionPhasingMultiplier(
  month: number,
  goLiveMonth: number,
  phasing: ProformaConfig["retentionPhasing"]
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;

  if (monthsSinceGoLive < 12) return phasing.year1Pct / 100;
  if (monthsSinceGoLive < 24) return phasing.year2Pct / 100;
  if (monthsSinceGoLive < 36) return phasing.year3Pct / 100;
  if (monthsSinceGoLive < 48) return (phasing.year4Pct ?? phasing.year3Pct) / 100;
  if (monthsSinceGoLive < 60) return (phasing.year5Pct ?? phasing.year3Pct) / 100;
  return (phasing.year6Pct ?? phasing.year3Pct) / 100;
}

function sigmoidRamp(progress: number): number {
  const k = 10;
  const raw = 1 / (1 + Math.exp(-k * (progress - 0.5)));
  const low = 1 / (1 + Math.exp(k * 0.5));
  const high = 1 / (1 + Math.exp(-k * 0.5));
  return (raw - low) / (high - low);
}

function getAdoptionRamp(monthsSinceOnset: number, rampMonths: number): number {
  if (monthsSinceOnset < 0) return 0;
  if (rampMonths <= 0) return 1;
  const progress = Math.min((monthsSinceOnset + 1) / rampMonths, 1);
  return sigmoidRamp(progress);
}

function getOnsetMultiplier(
  monthsSinceGoLive: number,
  onset: DriverOnset,
  phasing: ProformaConfig["retentionPhasing"],
  careSetting?: string
): number {
  if (monthsSinceGoLive < 0) return 0;

  const delayMonths = ONSET_DELAY_MONTHS[onset] || 0;

  if (onset === "phased") {
    if (monthsSinceGoLive < delayMonths) return 0;
    if (monthsSinceGoLive < 12) return phasing.year1Pct / 100;
    if (monthsSinceGoLive < 24) return phasing.year2Pct / 100;
    if (monthsSinceGoLive < 36) return phasing.year3Pct / 100;
    if (monthsSinceGoLive < 48) return (phasing.year4Pct ?? phasing.year3Pct) / 100;
    if (monthsSinceGoLive < 60) return (phasing.year5Pct ?? phasing.year3Pct) / 100;
    return (phasing.year6Pct ?? phasing.year3Pct) / 100;
  }

  if (monthsSinceGoLive < delayMonths) return 0;
  return 1;
}

function getProviderExpansion(
  month: number,
  goLiveMonth: number,
  _contractMonths: number,
  pilotProviders: number,
  fullScaleProviders: number,
  yearlyProviders?: { year1: number; year2: number; year3: number },
  quarterlyProviders?: QuarterlyProviders,
  implementationRampMonths: number = 3
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;

  if (quarterlyProviders) {
    const target = getQuarterlyValue(quarterlyProviders, monthsSinceGoLive);
    const qIdx = Math.floor(monthsSinceGoLive / 3);
    const prevTarget = qIdx > 0 ? getQuarterlyValue(quarterlyProviders, (qIdx - 1) * 3) : 0;
    if (target > prevTarget && implementationRampMonths > 0) {
      const monthInQuarter = monthsSinceGoLive % 3;
      const netNew = target - prevTarget;
      const rampProgress = Math.min((monthInQuarter + 1) / implementationRampMonths, 1);
      return Math.round(prevTarget + netNew * rampProgress);
    }
    return target;
  }

  if (yearlyProviders) {
    const y1 = yearlyProviders.year1;
    const y2 = yearlyProviders.year2;
    const y3 = _contractMonths >= 36 ? yearlyProviders.year3 : y2;

    const rampMonths = implementationRampMonths;

    if (monthsSinceGoLive < rampMonths) {
      const rampProgress = (monthsSinceGoLive + 1) / rampMonths;
      return Math.round(y1 * rampProgress);
    } else if (monthsSinceGoLive < 12) {
      return y1;
    } else if (monthsSinceGoLive < 24) {
      const monthInYear = monthsSinceGoLive - 12;
      if (y2 > y1 && monthInYear < rampMonths) {
        const netNew = y2 - y1;
        const rampProgress = (monthInYear + 1) / rampMonths;
        return Math.round(y1 + netNew * rampProgress);
      }
      return y2;
    } else if (monthsSinceGoLive < 36) {
      const monthInYear = monthsSinceGoLive - 24;
      if (y3 > y2 && monthInYear < rampMonths) {
        const netNew = y3 - y2;
        const rampProgress = (monthInYear + 1) / rampMonths;
        return Math.round(y2 + netNew * rampProgress);
      }
      return y3;
    } else {
      return y3;
    }
  }

  const expansionMonths = Math.max(_contractMonths - goLiveMonth, 12);
  const progress = Math.min(monthsSinceGoLive / expansionMonths, 1);
  return Math.round(pilotProviders + (fullScaleProviders - pilotProviders) * progress);
}

export function getLicensedProviders(
  month: number,
  goLiveMonth: number,
  contractMonths: number,
  pilotProviders: number,
  fullScaleProviders: number,
  yearlyProviders?: { year1: number; year2: number; year3: number },
  quarterlyProviders?: QuarterlyProviders
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;

  if (quarterlyProviders) {
    return getQuarterlyValue(quarterlyProviders, monthsSinceGoLive);
  }

  if (yearlyProviders) {
    const y3 = contractMonths >= 36 ? yearlyProviders.year3 : yearlyProviders.year2;
    if (monthsSinceGoLive < 12) return yearlyProviders.year1;
    if (monthsSinceGoLive < 24) return yearlyProviders.year2;
    return y3;
  }

  if (monthsSinceGoLive < 12) return pilotProviders;
  return fullScaleProviders;
}


function getUtilizationRamp(
  month: number,
  goLiveMonth: number,
  contractMonths: number,
  pilotUtil: number,
  fullScaleUtil: number,
  yearlyUtilization?: { year1: number; year2: number; year3: number }
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;

  if (yearlyUtilization) {
    if (monthsSinceGoLive < 12) return yearlyUtilization.year1;
    if (monthsSinceGoLive < 24) return yearlyUtilization.year2;
    return yearlyUtilization.year3;
  }

  const rampMonths = Math.max(contractMonths - goLiveMonth, 12);
  const progress = Math.min(monthsSinceGoLive / rampMonths, 1);
  return pilotUtil + (fullScaleUtil - pilotUtil) * sigmoidRamp(progress);
}

export function buildMonthlyCashFlows(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig
): ProformaCashFlowRow[] {
  const months = config.contractTermMonths;
  const rows: ProformaCashFlowRow[] = [];
  let cumulativeNet = 0;

  for (let m = 1; m <= months; m++) {
    let totalInvestment = 0;
    let totalCapacityValue = 0;
    let totalWorkforceValue = 0;
    let totalRevenueValue = 0;
    let totalQualityValue = 0;
    let totalDisplacementValue = 0;
    const bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; encounters: number; capacityValue: number; workforceValue: number; revenueValue: number; qualityValue: number; displacementValue: number }> = {};

    for (const setting of settings) {
      const monthsSinceGoLive = m - setting.goLiveMonth;
      if (monthsSinceGoLive < 0) {
        bySettings[setting.id] = { value: 0, investment: 0, providers: 0, licensedProviders: 0, encounters: 0, capacityValue: 0, workforceValue: 0, revenueValue: 0, qualityValue: 0, displacementValue: 0 };
        continue;
      }

      const fullScale = setting.fullScaleProviders || setting.providerCount;
      const fullScaleUtil = setting.fullScaleUtilization || setting.utilizationPercent;

      const implRampMonths = config.implementationRampMonths ?? 3;
      const currentProviders = getProviderExpansion(
        m, setting.goLiveMonth, months,
        setting.providerCount, fullScale,
        setting.yearlyProviders,
        setting.quarterlyProviders,
        implRampMonths
      );
      const isPerEncounter = setting.pricingModel === "perEncounter";

      const yearIndex = monthsSinceGoLive < 12 ? 0 : monthsSinceGoLive < 24 ? 1 : 2;

      const encUtil = setting.yearlyUtilization
        ?? (setting.careSetting === "nursing" && config.nursingYearlyUtilization
          ? config.nursingYearlyUtilization : config.yearlyUtilization);
      let currentUtil: number;
      if (isPerEncounter) {
        currentUtil = yearIndex === 0 ? encUtil.year1 : yearIndex === 1 ? encUtil.year2 : encUtil.year3;
      } else {
        const settingYearlyUtil = setting.yearlyUtilization
          ?? (setting.careSetting === "nursing" && config.nursingYearlyUtilization
            ? config.nursingYearlyUtilization
            : config.yearlyUtilization);
        currentUtil = setting.quarterlyUtilization
          ? getQuarterlyValue(setting.quarterlyUtilization, monthsSinceGoLive)
          : getUtilizationRamp(
              m, setting.goLiveMonth, months,
              setting.utilizationPercent, fullScaleUtil,
              settingYearlyUtil
            );
      }

      let activelyDocumenting: number;
      let expansionMultiplier: number;
      let currentYearEncounters = 0;

      // Terminal state = Explore full-scale assumptions (where annualValue was computed).
      // Multiplier climbs from ~0 at go-live toward 1.0 when we reach those assumptions.
      const terminalUtil = setting.utilizationPercent;

      if (isPerEncounter) {
        if (setting.yearlyEncounters) {
          const ye = setting.yearlyEncounters;
          currentYearEncounters = yearIndex === 0 ? ye.year1 : yearIndex === 1 ? ye.year2 : ye.year3;
        } else {
          const encountersPerProvider = setting.providerCount > 0
            ? setting.encounters / setting.providerCount : 0;
          currentYearEncounters = currentProviders * encountersPerProvider;
        }
        activelyDocumenting = Math.round(currentYearEncounters * currentUtil / 100);
        const terminalEncounters = setting.encounters;
        const encounterScale = terminalEncounters > 0 ? currentYearEncounters / terminalEncounters : 1;
        const utilScale = terminalUtil > 0 ? currentUtil / terminalUtil : 1;
        expansionMultiplier = Math.min(encounterScale * utilScale, 1);
      } else {
        activelyDocumenting = Math.round(currentProviders * currentUtil / 100);
        const terminalProviders = setting.fullScaleProviders || setting.providerCount;
        const providerScale = terminalProviders > 0 ? currentProviders / terminalProviders : 1;
        const utilScale = terminalUtil > 0 ? currentUtil / terminalUtil : 1;
        expansionMultiplier = Math.min(providerScale * utilScale, 1);
      }

      let settingCapacityValue = 0;
      let settingWorkforceValue = 0;
      let settingRevenueValue = 0;
      let settingQualityValue = 0;

      const retentionRate = setting.retentionRate ?? 0;
      const replacementCost = setting.replacementCost ?? 400000;
      const hasExploreRetention = setting.drivers.some(d => d.id === "retention");
      const proformaRetentionAnnual = !hasExploreRetention && retentionRate > 0
        ? setting.providerCount * (retentionRate / 100) * replacementCost
        : 0;

      const effectiveDrivers = [...setting.drivers];
      if (proformaRetentionAnnual > 0) {
        const existingIdx = effectiveDrivers.findIndex(d => d.id === "retention");
        if (existingIdx >= 0) {
          effectiveDrivers[existingIdx] = { ...effectiveDrivers[existingIdx], value: proformaRetentionAnnual };
        } else {
          effectiveDrivers.push({ id: "retention", name: "Retention", value: proformaRetentionAnnual, category: "time", quadrant: "Workforce", onset: "phased" });
        }
      }

      for (const driver of effectiveDrivers) {
        const onset = driver.onset || (driver.category === "documentation" ? "immediate" : "delayed");
        const delayMonths = ONSET_DELAY_MONTHS[onset] || 0;
        const rampMonths = implRampMonths;
        const monthsSinceOnset = monthsSinceGoLive - delayMonths;
        const adoptionRamp = getAdoptionRamp(monthsSinceOnset, rampMonths);
        const retentionPhasingToUse = (onset === "phased" && setting.careSetting === "nursing" && config.nursingRetentionPhasing)
          ? config.nursingRetentionPhasing
          : config.retentionPhasing;
        const onsetMult = getOnsetMultiplier(monthsSinceGoLive, onset, retentionPhasingToUse, setting.careSetting);
        const monthlyDriverValue = (driver.value / 12) * adoptionRamp * expansionMultiplier * onsetMult;

        switch (driver.quadrant) {
          case "Capacity":  settingCapacityValue  += monthlyDriverValue; break;
          case "Workforce": settingWorkforceValue += monthlyDriverValue; break;
          case "Revenue":   settingRevenueValue   += monthlyDriverValue; break;
          case "Quality":   settingQualityValue   += monthlyDriverValue; break;
          default:          settingRevenueValue   += monthlyDriverValue; break;
        }
      }

      let settingDisplacementValue = 0;
      for (const offset of (setting.costOffsets ?? [])) {
        const targetMonthly = (offset.annualSpend * offset.displacementPct / 100) / 12;
        const rampFactor = offset.transitionMonths <= 0
          ? 1
          : Math.min((monthsSinceGoLive + 1) / offset.transitionMonths, 1);
        settingDisplacementValue += targetMonthly * rampFactor;
      }

      const nonDriverValue = setting.annualValue - setting.drivers.reduce((s, d) => s + d.value, 0);
      if (nonDriverValue > 0) {
        const nonDriverRamp = getAdoptionRamp(monthsSinceGoLive, 3);
        settingRevenueValue += (nonDriverValue / 12) * nonDriverRamp * expansionMultiplier;
      }

      const licensedProviders = getLicensedProviders(
        m, setting.goLiveMonth, months,
        setting.providerCount, fullScale,
        setting.yearlyProviders,
        setting.quarterlyProviders
      );

      const quarterlyPrice = setting.quarterlyPricing
        ? getQuarterlyValue(setting.quarterlyPricing, monthsSinceGoLive)
        : undefined;
      const yearlyPrice = quarterlyPrice === undefined && setting.yearlyPricing
        ? [setting.yearlyPricing.year1, setting.yearlyPricing.year2, setting.yearlyPricing.year3][yearIndex]
        : undefined;
      const resolvedPrice = quarterlyPrice ?? yearlyPrice;

      let monthlyInvestment: number;
      if (setting.pricingModel === "annualFlat") {
        const price = resolvedPrice ?? (setting.annualLicenseFee || 0);
        monthlyInvestment = price / 12;
      } else if (setting.pricingModel === "perEncounter") {
        const price = resolvedPrice ?? (setting.costPerEncounter || 0);
        let annualEncounters: number;
        if (setting.yearlyEncounters) {
          const ye = setting.yearlyEncounters;
          annualEncounters = yearIndex === 0 ? ye.year1 : yearIndex === 1 ? ye.year2 : ye.year3;
        } else {
          const encountersPerProvider = setting.providerCount > 0
            ? setting.encounters / setting.providerCount
            : 0;
          annualEncounters = licensedProviders * encountersPerProvider;
        }
        const monthlyEncounters = annualEncounters / 12;
        monthlyInvestment = price * monthlyEncounters;
      } else if (setting.pricingModel === "platform") {
        const platformFee = setting.annualLicenseFee || 0;
        const encRate = setting.platformEncRate ?? setting.costPerEncounter ?? 0;
        let annualEncounters: number;
        if (setting.yearlyEncounters) {
          const ye = setting.yearlyEncounters;
          annualEncounters = yearIndex === 0 ? ye.year1 : yearIndex === 1 ? ye.year2 : ye.year3;
        } else {
          const encountersPerProvider = setting.providerCount > 0
            ? setting.encounters / setting.providerCount
            : 0;
          annualEncounters = licensedProviders * encountersPerProvider;
        }
        const monthlyEncounters = annualEncounters / 12;
        monthlyInvestment = platformFee / 12 + encRate * monthlyEncounters;
      } else {
        const price = resolvedPrice ?? setting.costPerUnit;
        monthlyInvestment = price * licensedProviders;
      }

      totalCapacityValue  += settingCapacityValue;
      totalWorkforceValue += settingWorkforceValue;
      totalRevenueValue   += settingRevenueValue;
      totalQualityValue   += settingQualityValue;
      totalDisplacementValue += settingDisplacementValue;
      totalInvestment += monthlyInvestment;

      bySettings[setting.id] = {
        value: settingCapacityValue + settingWorkforceValue + settingRevenueValue + settingQualityValue + settingDisplacementValue,
        investment: monthlyInvestment,
        providers: activelyDocumenting,
        licensedProviders,
        encounters: currentYearEncounters,
        capacityValue: settingCapacityValue,
        workforceValue: settingWorkforceValue,
        revenueValue: settingRevenueValue,
        qualityValue: settingQualityValue,
        displacementValue: settingDisplacementValue,
      };

      if (m === setting.goLiveMonth) {
        cumulativeNet -= setting.implementationFee;
      }
    }

    

    const totalValue = totalCapacityValue + totalWorkforceValue + totalRevenueValue + totalQualityValue + totalDisplacementValue;
    const netValue = totalValue - totalInvestment;
    cumulativeNet += netValue;

    rows.push({
      period: m,
      label: `M${m}`,
      investment: Math.round(totalInvestment),
      capacityValue: Math.round(totalCapacityValue),
      workforceValue: Math.round(totalWorkforceValue),
      revenueValue: Math.round(totalRevenueValue),
      qualityValue: Math.round(totalQualityValue),
      displacementValue: Math.round(totalDisplacementValue),
      totalValue: Math.round(totalValue),
      netValue: Math.round(netValue),
      cumulativeNet: Math.round(cumulativeNet),
      bySettings,
    });
  }

  return rows;
}

export function getContractStartDate(): Date {
  return new Date();
}

function getCalendarQuarterLabel(monthIndex: number, startDate: Date): string {
  const d = new Date(startDate.getFullYear(), startDate.getMonth() + monthIndex, 1);
  const calendarQuarter = Math.floor(d.getMonth() / 3) + 1;
  const yearShort = String(d.getFullYear()).slice(-2);
  return `Q${calendarQuarter} '${yearShort}`;
}

function getCalendarYearLabel(monthIndex: number, startDate: Date): string {
  const d = new Date(startDate.getFullYear(), startDate.getMonth() + monthIndex, 1);
  return String(d.getFullYear());
}

export function groupByQuarter(rows: ProformaCashFlowRow[], startDate?: Date): ProformaCashFlowRow[] {
  const start = startDate || getContractStartDate();
  const quarters: ProformaCashFlowRow[] = [];
  for (let q = 0; q < Math.ceil(rows.length / 3); q++) {
    const chunk = rows.slice(q * 3, q * 3 + 3);
    const allSettingIds = new Set<string>();
    chunk.forEach(r => Object.keys(r.bySettings).forEach(k => allSettingIds.add(k)));

    const bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; encounters: number; capacityValue: number; workforceValue: number; revenueValue: number; qualityValue: number; displacementValue: number }> = {};
    allSettingIds.forEach(id => {
      const avgProviders = chunk.length > 0
        ? Math.round(chunk.reduce((s, r) => s + (r.bySettings[id]?.providers || 0), 0) / chunk.length)
        : 0;
      const endLicensed = chunk.length > 0
        ? chunk[chunk.length - 1]?.bySettings[id]?.licensedProviders || 0
        : 0;
      const endEncounters = chunk.length > 0
        ? chunk[chunk.length - 1]?.bySettings[id]?.encounters || 0
        : 0;
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
        providers: avgProviders,
        licensedProviders: endLicensed,
        encounters: endEncounters,
        capacityValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.capacityValue || 0), 0),
        workforceValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.workforceValue || 0), 0),
        revenueValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.revenueValue || 0), 0),
        qualityValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.qualityValue || 0), 0),
        displacementValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.displacementValue || 0), 0),
      };
    });

    const firstMonthIndex = q * 3;
    quarters.push({
      period: q + 1,
      label: getCalendarQuarterLabel(firstMonthIndex, start),
      investment: chunk.reduce((s, r) => s + r.investment, 0),
      capacityValue: chunk.reduce((s, r) => s + r.capacityValue, 0),
      workforceValue: chunk.reduce((s, r) => s + r.workforceValue, 0),
      revenueValue: chunk.reduce((s, r) => s + r.revenueValue, 0),
      qualityValue: chunk.reduce((s, r) => s + r.qualityValue, 0),
      displacementValue: chunk.reduce((s, r) => s + r.displacementValue, 0),
      totalValue: chunk.reduce((s, r) => s + r.totalValue, 0),
      netValue: chunk.reduce((s, r) => s + r.netValue, 0),
      cumulativeNet: chunk[chunk.length - 1]?.cumulativeNet || 0,
      bySettings,
    });
  }
  return quarters;
}

export function groupByYear(rows: ProformaCashFlowRow[], startDate?: Date): ProformaCashFlowRow[] {
  const start = startDate || getContractStartDate();
  const years: ProformaCashFlowRow[] = [];
  for (let y = 0; y < Math.ceil(rows.length / 12); y++) {
    const chunk = rows.slice(y * 12, y * 12 + 12);
    if (chunk.length === 0) continue;

    const allSettingIds = new Set<string>();
    chunk.forEach(r => Object.keys(r.bySettings).forEach(k => allSettingIds.add(k)));

    const bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; encounters: number; capacityValue: number; workforceValue: number; revenueValue: number; qualityValue: number; displacementValue: number }> = {};
    allSettingIds.forEach(id => {
      const avgProviders = chunk.length > 0
        ? Math.round(chunk.reduce((s, r) => s + (r.bySettings[id]?.providers || 0), 0) / chunk.length)
        : 0;
      const endLicensed = chunk.length > 0
        ? chunk[chunk.length - 1]?.bySettings[id]?.licensedProviders || 0
        : 0;
      const endEncounters = chunk.length > 0
        ? chunk[chunk.length - 1]?.bySettings[id]?.encounters || 0
        : 0;
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
        providers: avgProviders,
        licensedProviders: endLicensed,
        encounters: endEncounters,
        capacityValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.capacityValue || 0), 0),
        workforceValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.workforceValue || 0), 0),
        revenueValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.revenueValue || 0), 0),
        qualityValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.qualityValue || 0), 0),
        displacementValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.displacementValue || 0), 0),
      };
    });

    const firstMonthIndex = y * 12;
    years.push({
      period: y + 1,
      label: getCalendarYearLabel(firstMonthIndex, start),
      investment: chunk.reduce((s, r) => s + r.investment, 0),
      capacityValue: chunk.reduce((s, r) => s + r.capacityValue, 0),
      workforceValue: chunk.reduce((s, r) => s + r.workforceValue, 0),
      revenueValue: chunk.reduce((s, r) => s + r.revenueValue, 0),
      qualityValue: chunk.reduce((s, r) => s + r.qualityValue, 0),
      displacementValue: chunk.reduce((s, r) => s + r.displacementValue, 0),
      totalValue: chunk.reduce((s, r) => s + r.totalValue, 0),
      netValue: chunk.reduce((s, r) => s + r.netValue, 0),
      cumulativeNet: chunk[chunk.length - 1]?.cumulativeNet || 0,
      bySettings,
    });
  }
  return years;
}

export function calculateProformaSummary(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  cashFlows: ProformaCashFlowRow[]
): ProformaSummary {
  const totalSystemValue = settings.reduce((s, v) => s + v.annualValue, 0);
  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);

  let paybackMonth: number | null = null;
  let cumulativeWentNegative = false;
  for (const row of cashFlows) {
    if (row.cumulativeNet < 0) cumulativeWentNegative = true;
    if (cumulativeWentNegative && row.cumulativeNet >= 0 && paybackMonth === null) {
      paybackMonth = row.period;
    }
  }

  const termValue = cashFlows.reduce((s, r) => s + r.totalValue, 0);
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  const termInvestment = cashFlows.reduce((s, r) => s + r.investment, 0) + totalImplFees;
  const termNet = termValue - termInvestment;

  const simpleROI = termInvestment > 0 ? termNet / termInvestment : 0;
  const valueToCost = termInvestment > 0 ? termValue / termInvestment : 0;

  const lastYearRows = cashFlows.slice(-12);
  const runRateValue = lastYearRows.reduce((s, r) => s + r.totalValue, 0);
  const runRateInvestment = lastYearRows.reduce((s, r) => s + r.investment, 0);
  const atScaleReturn = runRateInvestment > 0 ? totalSystemValue / runRateInvestment : 0;

  return {
    totalSystemValue,
    simpleROI,
    valueToCost,
    atScaleReturn,
    totalHours,
    paybackMonth,
    termNet,
    termValue,
    termInvestment,
    runRateValue,
    runRateInvestment,
  };
}

export function computeYearlyEncounters(
  setting: ProformaSettingSnapshot,
  config: ProformaConfig
): { year1: number; year2: number; year3: number } {
  const encountersPerProvider = setting.providerCount > 0
    ? setting.encounters / setting.providerCount
    : 0;

  const utilTargets = setting.careSetting === "nursing" && config.nursingYearlyUtilization
    ? config.nursingYearlyUtilization
    : config.yearlyUtilization;

  const licensedY1 = setting.yearlyProviders?.year1 ?? setting.providerCount;
  const licensedY2 = setting.yearlyProviders?.year2 ?? setting.fullScaleProviders;
  const licensedY3 = setting.yearlyProviders?.year3 ?? setting.fullScaleProviders;

  return {
    year1: Math.round(licensedY1 * encountersPerProvider),
    year2: Math.round(licensedY2 * encountersPerProvider),
    year3: Math.round(licensedY3 * encountersPerProvider),
  };
}

export function getYearlySummary(cashFlows: ProformaCashFlowRow[], settings: ProformaSettingSnapshot[], startDate?: Date) {
  const start = startDate || getContractStartDate();

  const contractYears = Math.ceil(cashFlows.length / 12);
  const years: { rows: ProformaCashFlowRow[] }[] = [];
  for (let y = 0; y < contractYears; y++) {
    years.push({ rows: cashFlows.filter(r => r.period > y * 12 && r.period <= (y + 1) * 12) });
  }

  return years
    .filter(y => y.rows.length > 0)
    .map((y, idx) => {
      const bySettings: Record<string, { value: number; workforceValue: number; investment: number; providers: number; licensedProviders: number; encounters: number }> = {};
      settings.forEach(s => {
        const avgProviders = y.rows.length > 0
          ? Math.round(y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.providers || 0), 0) / y.rows.length)
          : 0;
        const licensedProviders = y.rows.length > 0
          ? y.rows[y.rows.length - 1]?.bySettings[s.id]?.licensedProviders || 0
          : 0;
        const encounters = y.rows.length > 0
          ? y.rows[y.rows.length - 1]?.bySettings[s.id]?.encounters || 0
          : 0;
        bySettings[s.id] = {
          value: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.value || 0), 0),
          workforceValue: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.workforceValue || 0), 0),
          investment: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.investment || 0), 0),
          providers: avgProviders,
          licensedProviders,
          encounters,
        };
      });

      const subscriptionInvestment = y.rows.reduce((s, r) => s + r.investment, 0);
      const implInvestment = settings.reduce((sum, s) => {
        const settingYear = Math.floor((s.goLiveMonth - 1) / 12);
        return settingYear === idx ? sum + s.implementationFee : sum;
      }, 0);

      const yearLabel = getCalendarYearLabel(idx * 12, start);

      return {
        label: yearLabel,
        totalValue: y.rows.reduce((s, r) => s + r.totalValue, 0),
        capacityValue: y.rows.reduce((s, r) => s + r.capacityValue, 0),
        workforceValue: y.rows.reduce((s, r) => s + r.workforceValue, 0),
        revenueValue: y.rows.reduce((s, r) => s + r.revenueValue, 0),
        qualityValue: y.rows.reduce((s, r) => s + r.qualityValue, 0),
        displacementValue: y.rows.reduce((s, r) => s + r.displacementValue, 0),
        investment: subscriptionInvestment + implInvestment,
        netValue: y.rows.reduce((s, r) => s + r.netValue, 0) - implInvestment,
        bySettings,
      };
    });
}

/**
 * Computes the Year 1 value contribution for a single driver given a specific onset type.
 * Used to show live "≈ $X in Year 1" estimates in the Adjust Assumptions panel.
 * "Year 1" = contract months 1–12, respecting the setting's go-live month.
 */
export function computeDriverYear1Value(
  driverValue: number,
  onset: DriverOnset,
  setting: ProformaSettingSnapshot,
  config: ProformaConfig
): number {
  const goLiveMonth = setting.goLiveMonth;
  const rampMonths = config.implementationRampMonths ?? 3;
  const contractMonths = config.contractTermMonths;
  const fullScale = setting.fullScaleProviders || setting.providerCount;
  const terminalUtil = setting.utilizationPercent;
  const terminalProviders = fullScale;

  const retentionPhasingToUse =
    onset === "phased" && setting.careSetting === "nursing" && config.nursingRetentionPhasing
      ? config.nursingRetentionPhasing
      : config.retentionPhasing;

  let total = 0;
  for (let m = 1; m <= Math.min(12, contractMonths); m++) {
    const monthsSinceGoLive = m - goLiveMonth;
    if (monthsSinceGoLive < 0) continue;

    const currentProviders = getProviderExpansion(
      m, goLiveMonth, contractMonths,
      setting.providerCount, fullScale,
      setting.yearlyProviders, setting.quarterlyProviders, rampMonths
    );

    const settingYearlyUtil = setting.yearlyUtilization
      ?? (setting.careSetting === "nursing" && config.nursingYearlyUtilization
        ? config.nursingYearlyUtilization
        : config.yearlyUtilization);
    const currentUtil = setting.quarterlyUtilization
      ? getQuarterlyValue(setting.quarterlyUtilization, monthsSinceGoLive)
      : getUtilizationRamp(
          m, goLiveMonth, contractMonths,
          setting.utilizationPercent, setting.fullScaleUtilization || setting.utilizationPercent,
          settingYearlyUtil
        );

    const providerScale = terminalProviders > 0 ? currentProviders / terminalProviders : 1;
    const utilScale = terminalUtil > 0 ? currentUtil / terminalUtil : 1;
    const expansionMultiplier = Math.min(providerScale * utilScale, 1);

    const monthsSinceOnset = monthsSinceGoLive - (ONSET_DELAY_MONTHS[onset] || 0);
    const adoptionRamp = getAdoptionRamp(monthsSinceOnset, rampMonths);
    const onsetMult = getOnsetMultiplier(monthsSinceGoLive, onset, retentionPhasingToUse, setting.careSetting);

    total += (driverValue / 12) * adoptionRamp * expansionMultiplier * onsetMult;
  }

  return total;
}
