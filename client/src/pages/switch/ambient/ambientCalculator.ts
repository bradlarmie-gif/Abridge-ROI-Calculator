import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import type { DataMode } from "@/lib/switchGapCalculator";

export interface AmbientDomainValues {
  capacity: number;
  revenue: number;
  workforce: number;
  risk: number;
}

export interface AmbientScoreResult {
  score: number;
  utilizationPct: number;
  efficiencyPct: number;
  measurementPct: number;
  domains: AmbientDomainValues;
  totalGap: number;
  displayedTotal: number;
  haircut: number;
  monthlyGap: number;
  utilizationGapEncounters: number;
  efficiencyGapHours: number;
  yourDocumented: number;
  abridgeDocumented: number;
  yourHours: number;
  abridgeHours: number;
  afterHoursEstimate: number;
  riskLevel: string;
  topDomain: keyof AmbientDomainValues;
  topDomainValue: number;
  verdictLine: string;
  switchNowValue: number;
  wait6MonthsValue: number;
  wait12MonthsValue: number;
  wait6MonthsLoss: number;
  wait12MonthsLoss: number;
}

export function calculateAmbientScore(
  providers: number,
  annualEncounters: number,
  utilization: number,
  timeSavings: number,
  dataMode: DataMode,
): AmbientScoreResult {
  const utilizationPct = Math.min(100, Math.round((utilization / 76) * 100));
  const efficiencyPct = Math.min(100, Math.round((timeSavings / 4.0) * 100));
  const measurementPct = dataMode === 'measured' ? 85 : dataMode === 'estimated' ? 60 : 38;

  const score = Math.round(
    utilizationPct * 0.40 +
    efficiencyPct * 0.35 +
    measurementPct * 0.25,
  );

  const utilizationGapEncounters = Math.max(0, Math.round(
    annualEncounters * ((76 - utilization) / 100),
  ));
  const capacityValue = Math.round(
    Math.max(0, utilizationGapEncounters) * 0.15 * 200,
  );

  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));
  const efficiencyGapHours = Math.max(0, Math.round(
    (documentedEncounters * Math.max(0, 4.0 - timeSavings)) / 60,
  ));
  const revenueValue = Math.round(
    efficiencyGapHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate,
  );

  const afterHoursExposure = Math.round(
    providers * 52 * Math.max(0, timeSavings < 3.0 ? (3.0 - timeSavings) * 0.4 : 0) * VALUE_ASSUMPTIONS.hourlyRate,
  );
  const workforceValue = Math.round(afterHoursExposure * 0.20);

  const riskValue = Math.round((capacityValue + revenueValue) * 0.08);

  const domains: AmbientDomainValues = {
    capacity: capacityValue,
    revenue: revenueValue,
    workforce: workforceValue,
    risk: riskValue,
  };

  const totalGap = capacityValue + revenueValue + workforceValue + riskValue;

  const haircut = dataMode === 'measured' ? 0.85 : dataMode === 'estimated' ? 0.70 : 0.55;
  const displayedTotal = Math.round(totalGap * haircut);
  const monthlyGap = Math.round(displayedTotal / 12);

  const yourDocumented = Math.round(annualEncounters * (utilization / 100));
  const abridgeDocumented = Math.round(annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));
  const yourHours = Math.round((yourDocumented * timeSavings) / 60);
  const abridgeHours = Math.round((abridgeDocumented * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60);

  const afterHoursEstimate = Math.round(
    providers * 52 * Math.max(0, timeSavings < 3.0 ? (3.0 - timeSavings) * 0.4 : 0),
  );

  let riskLevel: string;
  if (score >= 65) riskLevel = 'Optimized';
  else if (score >= 45) riskLevel = 'Managed';
  else riskLevel = 'Developing';

  const domainEntries = Object.entries(domains) as [keyof AmbientDomainValues, number][];
  const sorted = domainEntries.sort((a, b) => b[1] - a[1]);
  const topDomain = sorted[0][0];
  const topDomainValue = Math.round(sorted[0][1] * haircut);

  let verdictLine: string;
  if (score <= 35) {
    verdictLine = 'You are performing below the industry average. The gap is structural, not incremental.';
  } else if (score <= 50) {
    verdictLine = 'You are performing at the industry average. The gap to top quartile is not incremental. It is structural.';
  } else if (score <= 70) {
    verdictLine = 'You are performing above the industry average. The remaining gap to top quartile is addressable with the right infrastructure.';
  } else {
    verdictLine = 'You are performing at or near top quartile. The opportunity now is deepening and expanding.';
  }

  const switchNowValue = Math.round(
    displayedTotal * 0.85 + displayedTotal + displayedTotal * 1.08,
  );
  const wait6Value = Math.round(displayedTotal * 0.48 + displayedTotal * 0.85 + displayedTotal);
  const wait12Value = Math.round(displayedTotal * 0.85 + displayedTotal);

  const wait6MonthsLoss = Math.round(switchNowValue - wait6Value);
  const wait12MonthsLoss = Math.round(switchNowValue - wait12Value);

  return {
    score,
    utilizationPct,
    efficiencyPct,
    measurementPct,
    domains,
    totalGap,
    displayedTotal,
    haircut,
    monthlyGap,
    utilizationGapEncounters: Math.max(0, utilizationGapEncounters),
    efficiencyGapHours,
    yourDocumented,
    abridgeDocumented,
    yourHours,
    abridgeHours,
    afterHoursEstimate,
    riskLevel,
    topDomain,
    topDomainValue,
    verdictLine,
    switchNowValue,
    wait6MonthsValue: wait6Value,
    wait12MonthsValue: wait12Value,
    wait6MonthsLoss,
    wait12MonthsLoss,
  };
}

export function formatDollar(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatDollarFull(value: number): string {
  return `$${value.toLocaleString()}`;
}
