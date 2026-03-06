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
  const startUtil = Math.max(y1 * 0.4, 5);
  return {
    q1: Math.round(startUtil),
    q2: Math.round(startUtil + (y1 - startUtil) * 0.4),
    q3: Math.round(startUtil + (y1 - startUtil) * 0.75),
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
  if (monthsSinceOnset >= rampMonths) return 1;
  const progress = monthsSinceOnset / rampMonths;
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
    if (monthsSinceGoLive < 12) return phasing.year1Pct / 100;
    if (monthsSinceGoLive < 24) return phasing.year2Pct / 100;
    if (monthsSinceGoLive < 36) return phasing.year3Pct / 100;
    if (monthsSinceGoLive < 48) return (phasing.year4Pct ?? phasing.year3Pct) / 100;
    if (monthsSinceGoLive < 60) return (phasing.year5Pct ?? phasing.year3Pct) / 100;
    return (phasing.year6Pct ?? phasing.year3Pct) / 100;
  }

  if (onset === "delayed") {
    if (monthsSinceGoLive < delayMonths) return 0;
    const monthsSinceOnset = monthsSinceGoLive - delayMonths;
    const rampUpMonths = 3;
    if (monthsSinceOnset >= rampUpMonths) return 1;
    return monthsSinceOnset / rampUpMonths;
  }

  if (monthsSinceGoLive === 0) return 0.5;
  return 1;
}

function getProviderExpansion(
  month: number,
  goLiveMonth: number,
  _contractMonths: number,
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
    const y1 = yearlyProviders.year1;
    const y2 = yearlyProviders.year2;
    const y3 = _contractMonths >= 36 ? yearlyProviders.year3 : y2;

    if (monthsSinceGoLive < 12) {
      return y1;
    } else if (monthsSinceGoLive < 24) {
      const progress = Math.min((monthsSinceGoLive - 12 + 1) / 12, 1);
      return Math.round(y1 + (y2 - y1) * progress);
    } else if (monthsSinceGoLive < 36) {
      const progress = Math.min((monthsSinceGoLive - 24 + 1) / 12, 1);
      return Math.round(y2 + (y3 - y2) * progress);
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
    const y1 = yearlyUtilization.year1;
    const y2 = yearlyUtilization.year2;
    const y3 = yearlyUtilization.year3;

    if (monthsSinceGoLive < 12) {
      const progress = monthsSinceGoLive / 12;
      return y1 * sigmoidRamp(progress);
    } else if (monthsSinceGoLive < 24) {
      const progress = (monthsSinceGoLive - 12) / 12;
      return y1 + (y2 - y1) * sigmoidRamp(progress);
    } else if (monthsSinceGoLive < 36) {
      const progress = (monthsSinceGoLive - 24) / 12;
      return y2 + (y3 - y2) * sigmoidRamp(progress);
    } else {
      return y3;
    }
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

  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  cumulativeNet = -totalImplFees;

  for (let m = 1; m <= months; m++) {
    let totalInvestment = 0;
    let totalDocValue = 0;
    let totalTimeValue = 0;
    let totalRetentionValue = 0;
    const bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; docValue: number; timeValue: number; retentionValue: number }> = {};

    for (const setting of settings) {
      const monthsSinceGoLive = m - setting.goLiveMonth;
      if (monthsSinceGoLive < 0) {
        bySettings[setting.id] = { value: 0, investment: 0, providers: 0, licensedProviders: 0, docValue: 0, timeValue: 0, retentionValue: 0 };
        continue;
      }

      const fullScale = setting.fullScaleProviders || setting.providerCount;
      const fullScaleUtil = setting.fullScaleUtilization || setting.utilizationPercent;

      const currentProviders = getProviderExpansion(
        m, setting.goLiveMonth, months,
        setting.providerCount, fullScale,
        setting.yearlyProviders,
        setting.quarterlyProviders
      );
      const settingYearlyUtil = setting.careSetting === "nursing" && config.nursingYearlyUtilization
        ? config.nursingYearlyUtilization
        : config.yearlyUtilization;
      const currentUtil = setting.quarterlyUtilization
        ? getQuarterlyValue(setting.quarterlyUtilization, monthsSinceGoLive)
        : getUtilizationRamp(
            m, setting.goLiveMonth, months,
            setting.utilizationPercent, fullScaleUtil,
            settingYearlyUtil
          );

      const providerScale = currentProviders / setting.providerCount;
      const utilScale = currentUtil / setting.utilizationPercent;
      const expansionMultiplier = providerScale * utilScale;

      let settingDocValue = 0;
      let settingTimeValue = 0;
      let settingRetentionValue = 0;

      const retentionRate = setting.retentionRate ?? 0;
      const replacementCost = setting.replacementCost ?? 400000;
      const hasExploreRetention = setting.drivers.some(d => d.id === "retention" && d.value > 0);
      const proformaRetentionAnnual = !hasExploreRetention && retentionRate > 0
        ? fullScale * (retentionRate / 100) * replacementCost
        : 0;

      const effectiveDrivers = [...setting.drivers];
      if (proformaRetentionAnnual > 0) {
        const existingIdx = effectiveDrivers.findIndex(d => d.id === "retention");
        if (existingIdx >= 0) {
          effectiveDrivers[existingIdx] = { ...effectiveDrivers[existingIdx], value: proformaRetentionAnnual };
        } else {
          effectiveDrivers.push({ id: "retention", name: "Retention", value: proformaRetentionAnnual, category: "time", onset: "phased" });
        }
      }

      for (const driver of effectiveDrivers) {
        const onset = driver.onset || (driver.category === "documentation" ? "immediate" : "delayed");
        const rampMonths = (onset === "immediate" || (onset !== "phased" && onset !== "delayed" && driver.category === "documentation")) ? 1 : 12;
        const adoptionRamp = getAdoptionRamp(monthsSinceGoLive, rampMonths);
        const retentionPhasingToUse = (onset === "phased" && setting.careSetting === "nursing" && config.nursingRetentionPhasing)
          ? config.nursingRetentionPhasing
          : config.retentionPhasing;
        const onsetMult = getOnsetMultiplier(monthsSinceGoLive, onset, retentionPhasingToUse, setting.careSetting);
        const monthlyDriverValue = (driver.value / 12) * adoptionRamp * expansionMultiplier * onsetMult;

        if (onset === "phased") {
          settingRetentionValue += monthlyDriverValue;
        } else if (driver.category === "documentation") {
          settingDocValue += monthlyDriverValue;
        } else {
          settingTimeValue += monthlyDriverValue;
        }
      }

      const nonDriverValue = setting.annualValue - setting.drivers.reduce((s, d) => s + d.value, 0);
      if (nonDriverValue > 0) {
        const nonDriverRamp = getAdoptionRamp(monthsSinceGoLive, 3);
        settingDocValue += (nonDriverValue / 12) * nonDriverRamp * expansionMultiplier;
      }

      const licensedProviders = getLicensedProviders(
        m, setting.goLiveMonth, months,
        setting.providerCount, fullScale,
        setting.yearlyProviders,
        setting.quarterlyProviders
      );

      const yearIndex = monthsSinceGoLive < 12 ? 0 : monthsSinceGoLive < 24 ? 1 : 2;
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
        const encountersPerProvider = setting.providerCount > 0
          ? setting.encounters / setting.providerCount
          : 0;
        const monthlyEncounters = licensedProviders * encountersPerProvider * (currentUtil / 100) / 12;
        monthlyInvestment = price * monthlyEncounters;
      } else {
        const price = resolvedPrice ?? setting.costPerUnit;
        monthlyInvestment = price * licensedProviders;
      }

      totalDocValue += settingDocValue;
      totalTimeValue += settingTimeValue;
      totalRetentionValue += settingRetentionValue;
      totalInvestment += monthlyInvestment;

      bySettings[setting.id] = {
        value: settingDocValue + settingTimeValue + settingRetentionValue,
        investment: monthlyInvestment,
        providers: currentProviders,
        licensedProviders,
        docValue: settingDocValue,
        timeValue: settingTimeValue,
        retentionValue: settingRetentionValue,
      };
    }

    const implRamp = config.implementationRampMonths || 0;
    if (m <= implRamp) {
      totalDocValue = 0;
      totalTimeValue = 0;
      totalRetentionValue = 0;
      for (const key of Object.keys(bySettings)) {
        bySettings[key].value = 0;
        bySettings[key].docValue = 0;
        bySettings[key].timeValue = 0;
        bySettings[key].retentionValue = 0;
        bySettings[key].providers = 0;
      }
    }

    const totalValue = totalDocValue + totalTimeValue + totalRetentionValue;
    const netValue = totalValue - totalInvestment;
    cumulativeNet += netValue;

    rows.push({
      period: m,
      label: `M${m}`,
      investment: Math.round(totalInvestment),
      docValue: Math.round(totalDocValue),
      timeValue: Math.round(totalTimeValue),
      retentionValue: Math.round(totalRetentionValue),
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

    const bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; docValue: number; timeValue: number; retentionValue: number }> = {};
    allSettingIds.forEach(id => {
      const avgProviders = chunk.length > 0
        ? Math.round(chunk.reduce((s, r) => s + (r.bySettings[id]?.providers || 0), 0) / chunk.length)
        : 0;
      const endLicensed = chunk.length > 0
        ? chunk[chunk.length - 1]?.bySettings[id]?.licensedProviders || 0
        : 0;
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
        providers: avgProviders,
        licensedProviders: endLicensed,
        docValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.docValue || 0), 0),
        timeValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.timeValue || 0), 0),
        retentionValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.retentionValue || 0), 0),
      };
    });

    const firstMonthIndex = q * 3;
    quarters.push({
      period: q + 1,
      label: getCalendarQuarterLabel(firstMonthIndex, start),
      investment: chunk.reduce((s, r) => s + r.investment, 0),
      docValue: chunk.reduce((s, r) => s + r.docValue, 0),
      timeValue: chunk.reduce((s, r) => s + r.timeValue, 0),
      retentionValue: chunk.reduce((s, r) => s + r.retentionValue, 0),
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

    const bySettings: Record<string, { value: number; investment: number; providers: number; licensedProviders: number; docValue: number; timeValue: number; retentionValue: number }> = {};
    allSettingIds.forEach(id => {
      const avgProviders = chunk.length > 0
        ? Math.round(chunk.reduce((s, r) => s + (r.bySettings[id]?.providers || 0), 0) / chunk.length)
        : 0;
      const endLicensed = chunk.length > 0
        ? chunk[chunk.length - 1]?.bySettings[id]?.licensedProviders || 0
        : 0;
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
        providers: avgProviders,
        licensedProviders: endLicensed,
        docValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.docValue || 0), 0),
        timeValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.timeValue || 0), 0),
        retentionValue: chunk.reduce((s, r) => s + (r.bySettings[id]?.retentionValue || 0), 0),
      };
    });

    const firstMonthIndex = y * 12;
    years.push({
      period: y + 1,
      label: getCalendarYearLabel(firstMonthIndex, start),
      investment: chunk.reduce((s, r) => s + r.investment, 0),
      docValue: chunk.reduce((s, r) => s + r.docValue, 0),
      timeValue: chunk.reduce((s, r) => s + r.timeValue, 0),
      retentionValue: chunk.reduce((s, r) => s + r.retentionValue, 0),
      totalValue: chunk.reduce((s, r) => s + r.totalValue, 0),
      netValue: chunk.reduce((s, r) => s + r.netValue, 0),
      cumulativeNet: chunk[chunk.length - 1]?.cumulativeNet || 0,
      bySettings,
    });
  }
  return years;
}

export function npvAtRate(cashFlows: number[], rate: number): number {
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const denom = Math.pow(1 + rate, t);
    if (!isFinite(denom) || denom === 0) return NaN;
    npv += cashFlows[t] / denom;
  }
  return npv;
}

function npvDerivativeAtRate(cashFlows: number[], rate: number): number {
  let dnpv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const denom = Math.pow(1 + rate, t + 1);
    if (!isFinite(denom) || denom === 0) return NaN;
    dnpv -= (t * cashFlows[t]) / denom;
  }
  return dnpv;
}

export function countSignChanges(cashFlows: number[]): number {
  let changes = 0;
  let lastSign = 0;
  for (const v of cashFlows) {
    const sign = v > 0.01 ? 1 : (v < -0.01 ? -1 : 0);
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) changes++;
    if (sign !== 0) lastSign = sign;
  }
  return changes;
}

function newtonRaphsonIRR(cashFlows: number[], initialGuess: number, maxIterations = 300, tolerance = 1e-10): number | null {
  let rate = initialGuess;

  for (let i = 0; i < maxIterations; i++) {
    const npv = npvAtRate(cashFlows, rate);
    const dnpv = npvDerivativeAtRate(cashFlows, rate);

    if (!isFinite(npv) || !isFinite(dnpv)) return null;
    if (Math.abs(dnpv) < 1e-14) return null;

    const step = npv / dnpv;
    if (!isFinite(step)) return null;

    const dampening = Math.abs(step) > 1 ? 0.5 : 1.0;
    const newRate = rate - step * dampening;
    if (!isFinite(newRate)) return null;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    rate = newRate;

    if (rate < -0.999) rate = -0.999;
    if (rate > 10) rate = 10;
  }

  const finalNpv = npvAtRate(cashFlows, rate);
  if (isFinite(finalNpv)) {
    const totalAbsFlow = cashFlows.reduce((s, v) => s + Math.abs(v), 0);
    if (totalAbsFlow > 0 && Math.abs(finalNpv) / totalAbsFlow < 0.0001) return rate;
  }
  return null;
}

function bisectionIRR(cashFlows: number[], lo: number, hi: number, maxIterations = 200): number | null {
  let npvLo = npvAtRate(cashFlows, lo);
  let npvHi = npvAtRate(cashFlows, hi);

  if (!isFinite(npvLo) || !isFinite(npvHi)) return null;
  if (npvLo * npvHi > 0) return null;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npvAtRate(cashFlows, mid);

    if (!isFinite(npvMid)) return null;
    if ((hi - lo) < 1e-10) {
      return mid;
    }

    if (npvMid * npvLo < 0) {
      hi = mid;
      npvHi = npvMid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }

  return (lo + hi) / 2;
}

export function calculateMIRR(cashFlows: number[], financeRate = 0.005, reinvestRate = 0.005): number {
  const n = cashFlows.length - 1;
  if (n < 1) return 0;

  let pvNeg = 0;
  let fvPos = 0;

  for (let t = 0; t < cashFlows.length; t++) {
    if (cashFlows[t] < 0) {
      pvNeg += cashFlows[t] / Math.pow(1 + financeRate, t);
    } else if (cashFlows[t] > 0) {
      fvPos += cashFlows[t] * Math.pow(1 + reinvestRate, n - t);
    }
  }

  if (pvNeg >= 0 || fvPos <= 0) return 0;

  const monthlyMirr = Math.pow(fvPos / Math.abs(pvNeg), 1 / n) - 1;
  if (!isFinite(monthlyMirr)) return 0;

  const annualized = Math.pow(1 + monthlyMirr, 12) - 1;
  return isFinite(annualized) && annualized > -1 ? annualized : 0;
}

function validateIRRResult(monthlyRate: number, cashFlows: number[]): boolean {
  if (!isFinite(monthlyRate)) return false;
  if (monthlyRate <= -1) return false;

  const verifyNpv = npvAtRate(cashFlows, monthlyRate);
  if (!isFinite(verifyNpv)) return false;

  const totalAbsFlow = cashFlows.reduce((s, v) => s + Math.abs(v), 0);
  if (totalAbsFlow === 0) return false;

  const relativeError = Math.abs(verifyNpv) / totalAbsFlow;
  return relativeError < 0.001;
}

export interface IRRResult {
  annualizedRate: number;
  method: "irr" | "mirr";
  isValid: boolean;
}

export function calculateIRR(monthlyCashFlows: number[]): IRRResult {
  const INVALID: IRRResult = { annualizedRate: 0, method: "irr", isValid: false };

  if (!monthlyCashFlows || monthlyCashFlows.length < 2) return INVALID;

  const allZero = monthlyCashFlows.every(v => Math.abs(v) < 0.01);
  if (allZero) return INVALID;

  const hasNeg = monthlyCashFlows.some(v => v < -0.01);
  const hasPos = monthlyCashFlows.some(v => v > 0.01);
  if (!hasNeg || !hasPos) return INVALID;

  const signChanges = countSignChanges(monthlyCashFlows);

  if (signChanges > 1) {
    const mirr = calculateMIRR(monthlyCashFlows);
    return { annualizedRate: mirr, method: "mirr", isValid: mirr !== 0 };
  }

  const totalInvestment = Math.abs(monthlyCashFlows[0]);
  const totalReturns = monthlyCashFlows.slice(1).reduce((s, v) => s + Math.max(0, v), 0);
  const avgMonthlyReturn = totalReturns / (monthlyCashFlows.length - 1);
  const roughGuess = totalInvestment > 0 ? avgMonthlyReturn / totalInvestment : 0.01;

  const initialGuesses = [
    Math.min(Math.max(roughGuess, 0.001), 2.0),
    0.01,
    0.005,
    0.05,
    0.1,
    0.5,
    1.0,
    0.001,
    -0.01,
    -0.05,
    -0.1,
    -0.2,
    -0.5,
  ];

  for (const guess of initialGuesses) {
    const result = newtonRaphsonIRR(monthlyCashFlows, guess);
    if (result !== null && validateIRRResult(result, monthlyCashFlows)) {
      const annualized = Math.pow(1 + result, 12) - 1;
      if (isFinite(annualized) && annualized > -1) {
        return { annualizedRate: annualized, method: "irr", isValid: true };
      }
    }
  }

  const bisectionBounds: [number, number][] = [
    [-0.9, 5.0],
    [-0.99, 10.0],
    [-0.5, 2.0],
    [-0.3, 0.5],
  ];

  for (const [lo, hi] of bisectionBounds) {
    const bisResult = bisectionIRR(monthlyCashFlows, lo, hi);
    if (bisResult !== null && validateIRRResult(bisResult, monthlyCashFlows)) {
      const annualized = Math.pow(1 + bisResult, 12) - 1;
      if (isFinite(annualized) && annualized > -1) {
        return { annualizedRate: annualized, method: "irr", isValid: true };
      }
    }
  }

  const mirr = calculateMIRR(monthlyCashFlows);
  if (mirr !== 0) {
    return { annualizedRate: mirr, method: "mirr", isValid: true };
  }

  return INVALID;
}

export function buildIRRCashFlows(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  cashFlows: ProformaCashFlowRow[]
): number[] {
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  const totalSubscription = cashFlows.reduce((s, r) => s + r.investment, 0);
  const totalCost = totalImplFees + totalSubscription;

  if (totalCost <= 0) return [0];

  const month0 = totalImplFees > 0 ? -totalImplFees : 0;
  const monthlyNetFlows = cashFlows.map(r => {
    const gross = r.docValue + r.timeValue + r.retentionValue;
    const net = (isFinite(gross) ? gross : 0) - r.investment;
    return net;
  });

  return [month0, ...monthlyNetFlows];
}

export function buildAnnualIRRCashFlows(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  cashFlows: ProformaCashFlowRow[]
): number[] {
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  const contractYears = Math.ceil(config.contractTermMonths / 12);

  const yearBuckets: { grossValue: number; subscription: number }[] = [];
  for (let y = 0; y < contractYears; y++) {
    const startMonth = y * 12 + 1;
    const endMonth = (y + 1) * 12;
    const yearRows = cashFlows.filter(r => r.period >= startMonth && r.period <= endMonth);
    yearBuckets.push({
      grossValue: yearRows.reduce((s, r) => s + r.docValue + r.timeValue + r.retentionValue, 0),
      subscription: yearRows.reduce((s, r) => s + r.investment, 0),
    });
  }

  const totalSubscription = yearBuckets.reduce((s, yb) => s + yb.subscription, 0);
  const totalCost = totalImplFees + totalSubscription;

  if (totalCost <= 0) return [0];

  return [-(totalImplFees + totalSubscription), ...yearBuckets.map(yb => yb.grossValue)];
}

export function calculateAnnualIRR(annualCashFlows: number[]): IRRResult {
  const INVALID: IRRResult = { annualizedRate: 0, method: "irr", isValid: false };

  if (!annualCashFlows || annualCashFlows.length < 2) return INVALID;

  const allZero = annualCashFlows.every(v => Math.abs(v) < 0.01);
  if (allZero) return INVALID;

  const hasNeg = annualCashFlows.some(v => v < -0.01);
  const hasPos = annualCashFlows.some(v => v > 0.01);
  if (!hasNeg || !hasPos) return INVALID;

  const signChanges = countSignChanges(annualCashFlows);

  if (signChanges > 1) {
    const n = annualCashFlows.length - 1;
    if (n < 1) return INVALID;
    let pvNeg = 0;
    let fvPos = 0;
    const financeRate = 0.05;
    const reinvestRate = 0.05;
    for (let t = 0; t < annualCashFlows.length; t++) {
      if (annualCashFlows[t] < 0) {
        pvNeg += annualCashFlows[t] / Math.pow(1 + financeRate, t);
      } else if (annualCashFlows[t] > 0) {
        fvPos += annualCashFlows[t] * Math.pow(1 + reinvestRate, n - t);
      }
    }
    if (pvNeg >= 0 || fvPos <= 0) return INVALID;
    const annualMirr = Math.pow(fvPos / Math.abs(pvNeg), 1 / n) - 1;
    if (!isFinite(annualMirr) || annualMirr <= -1) return INVALID;
    return { annualizedRate: annualMirr, method: "mirr", isValid: true };
  }

  const totalInvestment = Math.abs(annualCashFlows[0]);
  const totalReturns = annualCashFlows.slice(1).reduce((s, v) => s + Math.max(0, v), 0);
  const avgReturn = totalReturns / (annualCashFlows.length - 1);
  const roughGuess = totalInvestment > 0 ? avgReturn / totalInvestment : 0.1;

  const initialGuesses = [
    Math.min(Math.max(roughGuess, 0.01), 50.0),
    0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 0.05, 0.01,
    -0.05, -0.1, -0.2, -0.5,
  ];

  for (const guess of initialGuesses) {
    const result = newtonRaphsonIRR(annualCashFlows, guess);
    if (result !== null && validateIRRResult(result, annualCashFlows)) {
      if (isFinite(result) && result > -1) {
        return { annualizedRate: result, method: "irr", isValid: true };
      }
    }
  }

  const bisectionBounds: [number, number][] = [
    [-0.9, 100.0],
    [-0.5, 50.0],
    [-0.3, 20.0],
    [-0.1, 5.0],
  ];

  for (const [lo, hi] of bisectionBounds) {
    const bisResult = bisectionIRR(annualCashFlows, lo, hi);
    if (bisResult !== null && validateIRRResult(bisResult, annualCashFlows)) {
      if (isFinite(bisResult) && bisResult > -1) {
        return { annualizedRate: bisResult, method: "irr", isValid: true };
      }
    }
  }

  return INVALID;
}

export function calculateProformaSummary(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  cashFlows: ProformaCashFlowRow[]
): ProformaSummary {
  const totalSystemValue = settings.reduce((s, v) => s + v.annualValue, 0);
  const totalInvestment = settings.reduce((s, v) => {
    if (v.pricingModel === "annualFlat") return s + (v.annualLicenseFee || 0);
    if (v.pricingModel === "perEncounter") return s + (v.costPerEncounter || 0) * (v.yearlyEncounters?.year1 ?? v.encounters);
    return s + v.costPerUnit * v.providerCount * 12;
  }, 0);
  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);
  const combinedROI = totalInvestment > 0 ? totalSystemValue / totalInvestment : 0;

  let paybackMonth: number | null = null;
  for (const row of cashFlows) {
    if (row.cumulativeNet >= 0 && paybackMonth === null) {
      paybackMonth = row.period;
    }
  }

  const annualIrrCF = buildAnnualIRRCashFlows(settings, config, cashFlows);
  const irrResult = calculateAnnualIRR(annualIrrCF);

  const termValue = cashFlows.reduce((s, r) => s + r.totalValue, 0);
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  const termInvestment = cashFlows.reduce((s, r) => s + r.investment, 0) + totalImplFees;
  const termNet = termValue - termInvestment;

  const simpleROI = termInvestment > 0 ? termNet / termInvestment : 0;
  const valueToCost = termInvestment > 0 ? termValue / termInvestment : 0;

  const lastYearRows = cashFlows.slice(-12);
  const runRateValue = lastYearRows.reduce((s, r) => s + r.totalValue, 0);
  const runRateInvestment = lastYearRows.reduce((s, r) => s + r.investment, 0);

  return {
    totalSystemValue,
    totalInvestment,
    combinedROI,
    simpleROI,
    valueToCost,
    totalHours,
    irr: irrResult.annualizedRate,
    irrMethod: irrResult.method,
    irrValid: irrResult.isValid,
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
    year1: Math.round(licensedY1 * encountersPerProvider * (utilTargets.year1 / 100)),
    year2: Math.round(licensedY2 * encountersPerProvider * (utilTargets.year2 / 100)),
    year3: Math.round(licensedY3 * encountersPerProvider * (utilTargets.year3 / 100)),
  };
}

export function getYearlySummary(cashFlows: ProformaCashFlowRow[], settings: ProformaSettingSnapshot[], startDate?: Date) {
  const start = startDate || getContractStartDate();
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);

  const contractYears = Math.ceil(cashFlows.length / 12);
  const years: { rows: ProformaCashFlowRow[] }[] = [];
  for (let y = 0; y < contractYears; y++) {
    years.push({ rows: cashFlows.filter(r => r.period > y * 12 && r.period <= (y + 1) * 12) });
  }

  return years
    .filter(y => y.rows.length > 0)
    .map((y, idx) => {
      const bySettings: Record<string, { value: number; retention: number; investment: number; providers: number; licensedProviders: number }> = {};
      settings.forEach(s => {
        const avgProviders = y.rows.length > 0
          ? Math.round(y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.providers || 0), 0) / y.rows.length)
          : 0;
        const licensedProviders = y.rows.length > 0
          ? y.rows[y.rows.length - 1]?.bySettings[s.id]?.licensedProviders || 0
          : 0;
        bySettings[s.id] = {
          value: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.value || 0), 0),
          retention: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.retentionValue || 0), 0),
          investment: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.investment || 0), 0),
          providers: avgProviders,
          licensedProviders,
        };
      });

      const subscriptionInvestment = y.rows.reduce((s, r) => s + r.investment, 0);
      const implInvestment = idx === 0 ? totalImplFees : 0;

      const yearLabel = getCalendarYearLabel(idx * 12, start);

      return {
        label: yearLabel,
        totalValue: y.rows.reduce((s, r) => s + r.totalValue, 0),
        docValue: y.rows.reduce((s, r) => s + r.docValue, 0),
        timeValue: y.rows.reduce((s, r) => s + r.timeValue, 0),
        retentionValue: y.rows.reduce((s, r) => s + r.retentionValue, 0),
        investment: subscriptionInvestment + implInvestment,
        netValue: y.rows.reduce((s, r) => s + r.netValue, 0) - implInvestment,
        bySettings,
      };
    });
}
