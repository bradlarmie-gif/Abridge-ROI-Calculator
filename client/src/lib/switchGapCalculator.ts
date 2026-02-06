// ============================================================================
// SWITCH GAP CALCULATOR - VALUE REALIZATION ASSESSMENT
// Four-dimensional analysis: Utilization, Efficiency, Quality, Satisfaction
// Formulas aligned with Abridge benchmark spec
// ============================================================================

export type SolutionType = "ambient-ai" | "human-scribes";

export interface SwitchInputs {
  solution: SolutionType;
  providers: number;
  annualEncounters: number;
  currentCostPerProvider: number;
  utilization: number;
  timeSavedPerEncounter: number;
  wrvuLift: number;
  satisfaction: number;
  afterHoursPerWeek: number;
}

export interface GapItem {
  name: string;
  yourValue: string;
  abridgeValue: string;
  gap: string;
  annualValue: number;
  calculation: string;
  icon: string;
}

export interface SwitchCalculations {
  utilizationScore: number;
  efficiencyScore: number;
  qualityScore: number;
  satisfactionScore: number;
  realizationScore: number;
  maturityLevel: string;
  yourEncountersDocumented: number;
  yourHoursReturned: number;
  yourAnnualValue: number;
  abridgeEncountersDocumented: number;
  abridgeHoursReturned: number;
  abridgeAnnualValue: number;
  encounterGap: number;
  hoursGap: number;
  annualGap: number;
  threeYearGap: number;
  monthlyGap: number;
  utilizationGapValue: number;
  efficiencyGapValue: number;
  wrvuGapValue: number;
  efficiencyGapHours: number;
  switchNowValue: number;
  wait6MonthsValue: number;
  wait12MonthsValue: number;
  wait6MonthsLoss: number;
  wait12MonthsLoss: number;
  optimizedYear1: number;
  optimizedYear2: number;
  optimizedYear3: number;
  currentYear1: number;
  currentYear2: number;
  currentYear3: number;
  currentTrajectory: { month: number; value: number }[];
  abridgeTrajectory: { month: number; value: number }[];
  currentAnnualInvestment: number;
  abridgeAnnualInvestment: number;
  afterHoursAnnual: number;
  afterHoursBenchmarkAnnual: number;
  afterHoursGap: number;
}

export const ABRIDGE_BENCHMARKS = {
  utilization: 76,
  utilizationMin: 70,
  utilizationMax: 80,
  timeSavedMin: 3,
  timeSavedMax: 5,
  timeSavedAvg: 4,
  wrvuLift: 5.5,
  wrvuLiftMin: 4,
  wrvuLiftMax: 7,
  satisfaction: 88,
  satisfactionMin: 80,
  satisfactionMax: 95,
  afterHoursPerWeek: 2,
  afterHoursMin: 1,
  afterHoursMax: 3,
  costPerProviderMonth: 250,
};

export const VALUE_ASSUMPTIONS = {
  hourlyRate: 150,
  timeConversionRate: 0.25,
  wrvuDollarValue: 33,
  wrvuRealization: 0.85,
  avgWRVUPerEncounter: 1.5,
};

export const IMPLEMENTATION_TIMELINE = {
  implementationWeeks: 5,
  rampMonths: 3,
  fullValueMonth: 4,
};

export function calculateSwitchGap(inputs: SwitchInputs): SwitchCalculations {
  const {
    providers,
    annualEncounters,
    currentCostPerProvider,
    utilization,
    timeSavedPerEncounter,
    wrvuLift,
    satisfaction,
    afterHoursPerWeek,
  } = inputs;

  const utilizationScore = Math.min(100, Math.round((utilization / ABRIDGE_BENCHMARKS.utilization) * 100));
  const efficiencyScore = Math.min(100, Math.round((timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100));
  const qualityScore = Math.min(100, Math.round((wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100));
  const satisfactionScore = Math.min(100, Math.round((satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100));

  const realizationScore = Math.round(
    (utilizationScore + efficiencyScore + qualityScore + satisfactionScore) / 4
  );

  let maturityLevel: string;
  if (realizationScore < 40) maturityLevel = 'Early Stage';
  else if (realizationScore < 60) maturityLevel = 'Developing';
  else if (realizationScore < 80) maturityLevel = 'Optimized';
  else maturityLevel = 'Transformed';

  const yourEncountersDocumented = Math.round(annualEncounters * (utilization / 100));
  const abridgeEncountersDocumented = Math.round(annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));
  const encounterGap = Math.max(0, abridgeEncountersDocumented - yourEncountersDocumented);

  const yourHoursReturned = Math.round((yourEncountersDocumented * timeSavedPerEncounter) / 60);
  const abridgeHoursReturned = Math.round((abridgeEncountersDocumented * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60);
  const hoursGap = Math.max(0, abridgeHoursReturned - yourHoursReturned);

  // 1. Utilization gap: encounters NOT getting AI × benchmark time saved
  const utilizationGapPP = Math.max(0, ABRIDGE_BENCHMARKS.utilization - utilization);
  const encountersWithoutAI = Math.round(annualEncounters * (utilizationGapPP / 100));
  const utilizationTimeSavedHours = (encountersWithoutAI * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60;
  const utilizationGapValue = Math.round(utilizationTimeSavedHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate);

  // 2. Efficiency gap: encounters WITH AI (at YOUR utilization) × time gap
  const encountersWithAI = yourEncountersDocumented;
  const efficiencyGapMin = Math.max(0, ABRIDGE_BENCHMARKS.timeSavedAvg - timeSavedPerEncounter);
  const efficiencyGapHours = Math.round((encountersWithAI * efficiencyGapMin) / 60);
  const efficiencyGapValue = Math.round(efficiencyGapHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate);

  // 3. wRVU gap: base wRVUs at YOUR utilization × lift gap × realization
  const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - wrvuLift);
  const baseWRVUs = VALUE_ASSUMPTIONS.avgWRVUPerEncounter * encountersWithAI;
  const missingWRVUs = baseWRVUs * (wrvuGapPercent / 100);
  const wrvuGapValue = Math.round(missingWRVUs * VALUE_ASSUMPTIONS.wrvuDollarValue * VALUE_ASSUMPTIONS.wrvuRealization);

  const annualGap = utilizationGapValue + efficiencyGapValue + wrvuGapValue;
  const monthlyGap = Math.round(annualGap / 12);

  // 3-year projections per spec ramp formulas
  const optimizedYear1 = Math.round(annualGap * 0.87);
  const optimizedYear2 = Math.round(optimizedYear1 + (annualGap * 1.10));
  const optimizedYear3 = Math.round(optimizedYear2 + (annualGap * 1.15));

  const currentYear1 = Math.round(annualGap * 0.10);
  const currentYear2 = Math.round(currentYear1 + (annualGap * 0.11));
  const currentYear3 = Math.round(currentYear2 + (annualGap * 0.12));

  const threeYearGap = optimizedYear3 - currentYear3;

  // Cost of waiting per spec
  const switchNowValue = optimizedYear3;
  const wait6MonthsValue = Math.round(optimizedYear3 - (annualGap * 0.5));
  const wait12MonthsValue = Math.round(optimizedYear3 - annualGap);
  const wait6MonthsLoss = switchNowValue - wait6MonthsValue;
  const wait12MonthsLoss = switchNowValue - wait12MonthsValue;

  const yourTimeSavedMinutes = yourEncountersDocumented * timeSavedPerEncounter;
  const yourTimeSavedHours = yourTimeSavedMinutes / 60;
  const yourAnnualValue = yourTimeSavedHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate;
  const abridgeAnnualValue = yourAnnualValue + annualGap;

  const currentAnnualInvestment = currentCostPerProvider * providers * 12;
  const abridgeAnnualInvestment = ABRIDGE_BENCHMARKS.costPerProviderMonth * providers * 12;

  // After-hours calculations
  const afterHoursAnnual = Math.round((afterHoursPerWeek || 0) * providers * 52);
  const afterHoursBenchmarkAnnual = Math.round(ABRIDGE_BENCHMARKS.afterHoursPerWeek * providers * 52);
  const afterHoursGap = Math.max(0, afterHoursAnnual - afterHoursBenchmarkAnnual);

  // Build trajectory arrays for chart (yearly data points)
  const currentTrajectory: { month: number; value: number }[] = [
    { month: 0, value: 0 },
    { month: 12, value: currentYear1 },
    { month: 24, value: currentYear2 },
    { month: 36, value: currentYear3 },
  ];

  const abridgeTrajectory: { month: number; value: number }[] = [
    { month: 0, value: 0 },
    { month: 12, value: optimizedYear1 },
    { month: 24, value: optimizedYear2 },
    { month: 36, value: optimizedYear3 },
  ];

  return {
    utilizationScore,
    efficiencyScore,
    qualityScore,
    satisfactionScore,
    realizationScore,
    maturityLevel,
    yourEncountersDocumented,
    yourHoursReturned,
    yourAnnualValue: Math.round(yourAnnualValue),
    abridgeEncountersDocumented,
    abridgeHoursReturned,
    abridgeAnnualValue: Math.round(abridgeAnnualValue),
    encounterGap,
    hoursGap,
    annualGap,
    threeYearGap,
    monthlyGap,
    utilizationGapValue,
    efficiencyGapValue,
    wrvuGapValue,
    efficiencyGapHours,
    optimizedYear1,
    optimizedYear2,
    optimizedYear3,
    currentYear1,
    currentYear2,
    currentYear3,
    switchNowValue,
    wait6MonthsValue,
    wait12MonthsValue,
    wait6MonthsLoss,
    wait12MonthsLoss,
    currentTrajectory,
    abridgeTrajectory,
    currentAnnualInvestment,
    abridgeAnnualInvestment,
    afterHoursAnnual,
    afterHoursBenchmarkAnnual,
    afterHoursGap,
  };
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}
