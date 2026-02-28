import type {
  ProformaSettingSnapshot,
  ProformaConfig,
  ProformaCashFlowRow,
  ProformaSummary,
} from "@/pages/proforma/proformaTypes";

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

function getAdoptionRamp(month: number, goLiveMonth: number, rampMonths: number): number {
  const monthsSinceGoLive = month - goLiveMonth;
  if (monthsSinceGoLive < 0) return 0;
  if (monthsSinceGoLive >= rampMonths) return 1;
  const progress = monthsSinceGoLive / rampMonths;
  return Math.pow(progress, 0.8);
}

export function buildMonthlyCashFlows(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig
): ProformaCashFlowRow[] {
  const months = config.contractTermMonths;
  const rows: ProformaCashFlowRow[] = [];
  let cumulativeNet = 0;
  const rampMonths = 12;

  for (let m = 1; m <= months; m++) {
    let totalInvestment = 0;
    let totalBaseValue = 0;
    let totalRetentionValue = 0;
    const bySettings: Record<string, { value: number; investment: number }> = {};

    for (const setting of settings) {
      const monthsSinceGoLive = m - setting.goLiveMonth;
      if (monthsSinceGoLive < 0) {
        bySettings[setting.id] = { value: 0, investment: 0 };
        continue;
      }

      const ramp = getAdoptionRamp(m, setting.goLiveMonth, rampMonths);
      const retentionMultiplier = getRetentionPhasingMultiplier(m, setting.goLiveMonth, config.retentionPhasing);

      const monthlyBase = ((setting.annualValue - setting.retentionValue) / 12) * ramp;
      const monthlyRetention = (setting.retentionValue / 12) * ramp * retentionMultiplier;
      const monthlyInvestment = (setting.costPerUnit * setting.providerCount);

      const implFee = monthsSinceGoLive === 0 ? setting.implementationFee : 0;

      totalBaseValue += monthlyBase;
      totalRetentionValue += monthlyRetention;
      totalInvestment += monthlyInvestment + implFee;

      bySettings[setting.id] = {
        value: monthlyBase + monthlyRetention,
        investment: monthlyInvestment + implFee,
      };
    }

    const totalValue = totalBaseValue + totalRetentionValue;
    const netValue = totalValue - totalInvestment;
    cumulativeNet += netValue;

    rows.push({
      period: m,
      label: `M${m}`,
      investment: Math.round(totalInvestment),
      baseValue: Math.round(totalBaseValue),
      retentionValue: Math.round(totalRetentionValue),
      totalValue: Math.round(totalValue),
      netValue: Math.round(netValue),
      cumulativeNet: Math.round(cumulativeNet),
      bySettings,
    });
  }

  return rows;
}

export function groupByQuarter(rows: ProformaCashFlowRow[]): ProformaCashFlowRow[] {
  const quarters: ProformaCashFlowRow[] = [];
  for (let q = 0; q < Math.ceil(rows.length / 3); q++) {
    const chunk = rows.slice(q * 3, q * 3 + 3);
    const allSettingIds = new Set<string>();
    chunk.forEach(r => Object.keys(r.bySettings).forEach(k => allSettingIds.add(k)));

    const bySettings: Record<string, { value: number; investment: number }> = {};
    allSettingIds.forEach(id => {
      bySettings[id] = {
        value: chunk.reduce((s, r) => s + (r.bySettings[id]?.value || 0), 0),
        investment: chunk.reduce((s, r) => s + (r.bySettings[id]?.investment || 0), 0),
      };
    });

    quarters.push({
      period: q + 1,
      label: `Q${q + 1}`,
      investment: chunk.reduce((s, r) => s + r.investment, 0),
      baseValue: chunk.reduce((s, r) => s + r.baseValue, 0),
      retentionValue: chunk.reduce((s, r) => s + r.retentionValue, 0),
      totalValue: chunk.reduce((s, r) => s + r.totalValue, 0),
      netValue: chunk.reduce((s, r) => s + r.netValue, 0),
      cumulativeNet: chunk[chunk.length - 1]?.cumulativeNet || 0,
      bySettings,
    });
  }
  return quarters;
}

export function calculateIRR(monthlyCashFlows: number[], maxIterations = 100, tolerance = 1e-7): number {
  let rate = 0.01;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < monthlyCashFlows.length; t++) {
      const discount = Math.pow(1 + rate, t);
      npv += monthlyCashFlows[t] / discount;
      dnpv -= (t * monthlyCashFlows[t]) / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(dnpv) < 1e-12) break;

    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < tolerance) {
      rate = newRate;
      break;
    }
    rate = newRate;

    if (rate < -0.5) rate = -0.5;
    if (rate > 10) rate = 10;
  }

  const annualizedRate = Math.pow(1 + rate, 12) - 1;
  return annualizedRate;
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

  const monthlyCashFlowValues = cashFlows.map(r => r.netValue);
  const irr = calculateIRR(monthlyCashFlowValues);

  const threeYearValue = cashFlows.reduce((s, r) => s + r.totalValue, 0);
  const threeYearInvestment = cashFlows.reduce((s, r) => s + r.investment, 0);
  const threeYearNet = threeYearValue - threeYearInvestment;

  return {
    totalSystemValue,
    totalInvestment,
    combinedROI,
    totalHours,
    irr: isFinite(irr) ? irr : 0,
    paybackMonth,
    threeYearNet,
    threeYearValue,
    threeYearInvestment,
  };
}

export function getYearlySummary(cashFlows: ProformaCashFlowRow[], settings: ProformaSettingSnapshot[]) {
  const years = [
    { label: "Year 1", rows: cashFlows.filter(r => r.period <= 12) },
    { label: "Year 2", rows: cashFlows.filter(r => r.period > 12 && r.period <= 24) },
    { label: "Year 3", rows: cashFlows.filter(r => r.period > 24 && r.period <= 36) },
  ];

  return years.map(y => {
    const bySettings: Record<string, { value: number; retention: number; investment: number }> = {};
    settings.forEach(s => {
      bySettings[s.id] = {
        value: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.value || 0), 0),
        retention: 0,
        investment: y.rows.reduce((sum, r) => sum + (r.bySettings[s.id]?.investment || 0), 0),
      };
    });

    return {
      label: y.label,
      totalValue: y.rows.reduce((s, r) => s + r.totalValue, 0),
      baseValue: y.rows.reduce((s, r) => s + r.baseValue, 0),
      retentionValue: y.rows.reduce((s, r) => s + r.retentionValue, 0),
      investment: y.rows.reduce((s, r) => s + r.investment, 0),
      netValue: y.rows.reduce((s, r) => s + r.netValue, 0),
      bySettings,
    };
  });
}
