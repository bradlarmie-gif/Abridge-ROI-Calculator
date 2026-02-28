import type {
  ProformaSettingSnapshot,
  ProformaConfig,
  ProformaCashFlowRow,
  ProformaSummary,
  DriverOnset,
} from "@/pages/proforma/proformaTypes";
import { ONSET_DELAY_MONTHS } from "@/pages/proforma/proformaTypes";

function getRetentionPhasingMultiplier(
  month: number,
  goLiveMonth: number,
  phasing: ProformaConfig["retentionPhasing"]
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;

  if (monthsSinceGoLive < 12) return phasing.year1Pct / 100;
  if (monthsSinceGoLive < 24) return phasing.year2Pct / 100;
  return phasing.year3Pct / 100;
}

function getAdoptionRamp(monthsSinceOnset: number, rampMonths: number): number {
  if (monthsSinceOnset < 0) return 0;
  if (monthsSinceOnset >= rampMonths) return 1;
  const progress = monthsSinceOnset / rampMonths;
  return Math.pow(progress, 0.8);
}

function getOnsetMultiplier(
  monthsSinceGoLive: number,
  onset: DriverOnset,
  phasing: ProformaConfig["retentionPhasing"]
): number {
  if (monthsSinceGoLive < 0) return 0;

  const delayMonths = ONSET_DELAY_MONTHS[onset] || 0;

  if (onset === "phased") {
    if (monthsSinceGoLive < 12) return phasing.year1Pct / 100;
    if (monthsSinceGoLive < 24) return phasing.year2Pct / 100;
    return phasing.year3Pct / 100;
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
  contractMonths: number,
  pilotProviders: number,
  fullScaleProviders: number
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;

  const expansionMonths = Math.max(contractMonths - goLiveMonth, 12);
  const progress = Math.min(monthsSinceGoLive / expansionMonths, 1);
  return Math.round(pilotProviders + (fullScaleProviders - pilotProviders) * progress);
}

function getUtilizationRamp(
  month: number,
  goLiveMonth: number,
  contractMonths: number,
  pilotUtil: number,
  fullScaleUtil: number
): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return pilotUtil;

  const rampMonths = Math.max(contractMonths - goLiveMonth, 12);
  const progress = Math.min(monthsSinceGoLive / rampMonths, 1);
  const utilizationProgress = Math.pow(progress, 0.8);
  return pilotUtil + (fullScaleUtil - pilotUtil) * utilizationProgress;
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
    const bySettings: Record<string, { value: number; investment: number; providers: number; docValue: number; timeValue: number; retentionValue: number }> = {};

    for (const setting of settings) {
      const monthsSinceGoLive = m - setting.goLiveMonth;
      if (monthsSinceGoLive < 0) {
        bySettings[setting.id] = { value: 0, investment: 0, providers: 0, docValue: 0, timeValue: 0, retentionValue: 0 };
        continue;
      }

      const fullScale = setting.fullScaleProviders || setting.providerCount;
      const fullScaleUtil = setting.fullScaleUtilization || setting.utilizationPercent;

      const currentProviders = getProviderExpansion(
        m, setting.goLiveMonth, months,
        setting.providerCount, fullScale
      );
      const currentUtil = getUtilizationRamp(
        m, setting.goLiveMonth, months,
        setting.utilizationPercent, fullScaleUtil
      );

      const providerScale = currentProviders / setting.providerCount;
      const utilScale = currentUtil / setting.utilizationPercent;
      const expansionMultiplier = providerScale * utilScale;

      const adoptionRamp = getAdoptionRamp(monthsSinceGoLive, 12);

      let settingDocValue = 0;
      let settingTimeValue = 0;
      let settingRetentionValue = 0;

      for (const driver of setting.drivers) {
        const onset = driver.onset || (driver.category === "documentation" ? "immediate" : "delayed");
        const onsetMult = getOnsetMultiplier(monthsSinceGoLive, onset, config.retentionPhasing);
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
        settingDocValue += (nonDriverValue / 12) * adoptionRamp * expansionMultiplier;
      }

      const monthlyInvestment = setting.costPerUnit * currentProviders;

      totalDocValue += settingDocValue;
      totalTimeValue += settingTimeValue;
      totalRetentionValue += settingRetentionValue;
      totalInvestment += monthlyInvestment;

      bySettings[setting.id] = {
        value: settingDocValue + settingTimeValue + settingRetentionValue,
        investment: monthlyInvestment,
        providers: currentProviders,
        docValue: settingDocValue,
        timeValue: settingTimeValue,
        retentionValue: settingRetentionValue,
      };
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

    const bySettings: Record<string, { value: number; investment: number; providers: number; docValue: number; timeValue: number; retentionValue: number }> = {};
    allSettingIds.forEach(id => {
      const lastChunk = chunk[chunk.length - 1];
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
        providers: lastChunk?.bySettings[id]?.providers || 0,
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

    const bySettings: Record<string, { value: number; investment: number; providers: number; docValue: number; timeValue: number; retentionValue: number }> = {};
    allSettingIds.forEach(id => {
      const lastChunk = chunk[chunk.length - 1];
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
        providers: lastChunk?.bySettings[id]?.providers || 0,
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

function npvAtRate(cashFlows: number[], rate: number): number {
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return npv;
}

function npvDerivativeAtRate(cashFlows: number[], rate: number): number {
  let dnpv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
  }
  return dnpv;
}

function newtonRaphsonIRR(cashFlows: number[], initialGuess: number, maxIterations = 200, tolerance = 1e-7): number | null {
  let rate = initialGuess;

  for (let i = 0; i < maxIterations; i++) {
    const npv = npvAtRate(cashFlows, rate);
    const dnpv = npvDerivativeAtRate(cashFlows, rate);

    if (!isFinite(npv) || !isFinite(dnpv)) return null;
    if (Math.abs(dnpv) < 1e-12) return null;

    const newRate = rate - npv / dnpv;
    if (!isFinite(newRate)) return null;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    rate = newRate;

    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  const finalNpv = npvAtRate(cashFlows, rate);
  const totalAbsFlow = cashFlows.reduce((s, v) => s + Math.abs(v), 0);
  const finalTolerance = Math.max(1, totalAbsFlow * 0.0001);
  if (Math.abs(finalNpv) < finalTolerance) return rate;
  return null;
}

function bisectionIRR(cashFlows: number[], lo: number, hi: number, maxIterations = 100, rateTolerance = 1e-7): number | null {
  let npvLo = npvAtRate(cashFlows, lo);
  let npvHi = npvAtRate(cashFlows, hi);

  if (!isFinite(npvLo) || !isFinite(npvHi)) return null;
  if (npvLo * npvHi > 0) return null;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npvAtRate(cashFlows, mid);

    if (!isFinite(npvMid)) return null;
    if ((hi - lo) / 2 < rateTolerance) {
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

export function calculateIRR(monthlyCashFlows: number[]): number {
  if (!monthlyCashFlows || monthlyCashFlows.length < 2) return 0;

  const allZero = monthlyCashFlows.every(v => Math.abs(v) < 0.01);
  if (allZero) return 0;

  const hasNeg = monthlyCashFlows.some(v => v < -0.01);
  const hasPos = monthlyCashFlows.some(v => v > 0.01);
  if (!hasNeg || !hasPos) return 0;

  const totalInvestment = Math.abs(monthlyCashFlows[0]);
  const totalReturns = monthlyCashFlows.slice(1).reduce((s, v) => s + Math.max(0, v), 0);
  const roughMonthlyReturn = totalReturns / (monthlyCashFlows.length - 1);
  const roughGuess = totalInvestment > 0 ? roughMonthlyReturn / totalInvestment : 0.01;

  const initialGuesses = [
    Math.min(Math.max(roughGuess, 0.001), 0.5),
    0.01,
    0.005,
    0.05,
    0.1,
    0.001,
    -0.01,
  ];

  for (const guess of initialGuesses) {
    const result = newtonRaphsonIRR(monthlyCashFlows, guess);
    if (result !== null && isFinite(result) && result > -0.99 && result < 10) {
      const verifyNpv = npvAtRate(monthlyCashFlows, result);
      const totalAbsFlow = monthlyCashFlows.reduce((s, v) => s + Math.abs(v), 0);
      const tolerance = Math.max(1, totalAbsFlow * 0.0001);
      if (Math.abs(verifyNpv) < tolerance) {
        const annualized = Math.pow(1 + result, 12) - 1;
        if (isFinite(annualized) && annualized > -1) {
          return annualized;
        }
      }
    }
  }

  const bisResult = bisectionIRR(monthlyCashFlows, -0.5, 5.0);
  if (bisResult !== null && isFinite(bisResult)) {
    const annualized = Math.pow(1 + bisResult, 12) - 1;
    if (isFinite(annualized) && annualized > -1) {
      return annualized;
    }
  }

  return 0;
}

export function buildIRRCashFlows(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  cashFlows: ProformaCashFlowRow[]
): number[] {
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);

  const firstQuarterSubscription = cashFlows.slice(0, 3).reduce((s, r) => s + r.investment, 0);
  const initialOutflow = -(totalImplFees + firstQuarterSubscription);

  if (!isFinite(initialOutflow) || initialOutflow >= 0) {
    return [0];
  }

  const monthlyNetReturns = cashFlows.slice(3).map(r => {
    const v = r.totalValue - r.investment;
    return isFinite(v) ? v : 0;
  });

  return [initialOutflow, ...monthlyNetReturns];
}

export function calculateProformaSummary(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  cashFlows: ProformaCashFlowRow[]
): ProformaSummary {
  const totalSystemValue = settings.reduce((s, v) => s + v.annualValue, 0);
  const totalInvestment = settings.reduce((s, v) => s + v.costPerUnit * v.providerCount * 12, 0);
  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);
  const combinedROI = totalInvestment > 0 ? totalSystemValue / totalInvestment : 0;

  let paybackMonth: number | null = null;
  for (const row of cashFlows) {
    if (row.cumulativeNet >= 0 && paybackMonth === null) {
      paybackMonth = row.period;
    }
  }

  const irrCashFlows = buildIRRCashFlows(settings, config, cashFlows);
  const irr = calculateIRR(irrCashFlows);

  const threeYearValue = cashFlows.reduce((s, r) => s + r.totalValue, 0);
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  const threeYearInvestment = cashFlows.reduce((s, r) => s + r.investment, 0) + totalImplFees;
  const threeYearNet = threeYearValue - threeYearInvestment;

  const simpleROI = threeYearInvestment > 0 ? threeYearNet / threeYearInvestment : 0;

  return {
    totalSystemValue,
    totalInvestment,
    combinedROI,
    simpleROI,
    totalHours,
    irr: isFinite(irr) ? irr : 0,
    paybackMonth,
    threeYearNet,
    threeYearValue,
    threeYearInvestment,
  };
}

export function getYearlySummary(cashFlows: ProformaCashFlowRow[], settings: ProformaSettingSnapshot[], startDate?: Date) {
  const start = startDate || getContractStartDate();
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);

  const years = [
    { rows: cashFlows.filter(r => r.period <= 12) },
    { rows: cashFlows.filter(r => r.period > 12 && r.period <= 24) },
    { rows: cashFlows.filter(r => r.period > 24 && r.period <= 36) },
  ];

  return years
    .filter(y => y.rows.length > 0)
    .map((y, idx) => {
      const bySettings: Record<string, { value: number; retention: number; investment: number }> = {};
      settings.forEach(s => {
        bySettings[s.id] = {
          value: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.value || 0), 0),
          retention: 0,
          investment: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.investment || 0), 0),
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
