// ============================================================================
// SWITCH GAP CALCULATOR - VALUE REALIZATION ASSESSMENT
// Six-dimensional analysis: Utilization, Net Time Impact, Documentation Completeness,
// Coding Impact (wRVU), Provider Satisfaction, After-Hours Reduction
// Formulas aligned with Abridge benchmark spec
// ============================================================================

export type SolutionType = "ambient-ai" | "human-scribes";
export type SpecialtyMix = "primary-care" | "balanced" | "specialty";
export type DeployIntentOption = "reduce-backlog" | "grow-visits" | "protect-time" | "not-sure";

export interface SwitchInputs {
  solution: SolutionType;
  providers: number;
  annualEncounters: number;
  currentCostPerProvider: number;
  specialtyMix: SpecialtyMix;
  utilization: number;
  timeSavedPerEncounter: number;
  editTimePerEncounter: number;
  docCompleteness: number;
  wrvuLift: number;
  satisfaction: number;
  afterHoursPerWeek: number;
  deployIntent: DeployIntentOption;
  yieldUpliftPercent: number;
  ffsSharePercent: number;
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
  docCompletenessScore: number;
  satisfactionScore: number;
  afterHoursScore: number;
  realizationScore: number;
  maturityLevel: string;
  maturityStage: number;
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
  netEfficiencyGapValue: number;
  wrvuGapValue: number;
  efficiencyGapHours: number;
  netEfficiencyGapHours: number;
  currentNetImpact: number;
  benchmarkNetImpact: number;
  netImpactGap: number;
  editTimeErosionPct: number;
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
  utilizationGapEncounters: number;
}

export const ABRIDGE_BENCHMARKS = {
  utilization: 76,
  utilizationMin: 70,
  utilizationMax: 80,
  timeSavedMin: 3,
  timeSavedMax: 5,
  timeSavedAvg: 4,
  editTime: 0.5,
  editTimeMax: 1,
  netImpact: 3.5,
  docCompleteness: 80,
  docCompletenessMin: 75,
  docCompletenessMax: 85,
  wrvuLift: 5.5,
  wrvuLiftMin: 4,
  wrvuLiftMax: 7,
  satisfaction: 85,
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

export const REALIZATION_WEIGHTS = {
  utilization: 0.25,
  netTimeImpact: 0.20,
  docCompleteness: 0.20,
  codingImpact: 0.15,
  satisfaction: 0.10,
  afterHoursReduction: 0.10,
};

export function calculateSwitchGap(inputs: SwitchInputs): SwitchCalculations {
  const {
    providers,
    annualEncounters,
    currentCostPerProvider,
    utilization,
    timeSavedPerEncounter,
    editTimePerEncounter,
    docCompleteness,
    wrvuLift,
    satisfaction,
    afterHoursPerWeek,
  } = inputs;

  const utilizationScore = Math.min(100, Math.round((utilization / ABRIDGE_BENCHMARKS.utilization) * 100));

  const currentNetImpact = timeSavedPerEncounter - (editTimePerEncounter || 0);
  const benchmarkNetImpact = ABRIDGE_BENCHMARKS.timeSavedAvg - ABRIDGE_BENCHMARKS.editTime;
  const efficiencyScore = Math.min(100, Math.round((Math.max(0, currentNetImpact) / benchmarkNetImpact) * 100));

  const docCompletenessScore = Math.min(100, Math.round(((docCompleteness || 50) / ABRIDGE_BENCHMARKS.docCompleteness) * 100));
  const qualityScore = Math.min(100, Math.round((wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100));
  const satisfactionScore = Math.min(100, Math.round((satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100));

  const afterHoursReductionScore = afterHoursPerWeek <= ABRIDGE_BENCHMARKS.afterHoursPerWeek
    ? 100
    : Math.min(100, Math.round(((8 - afterHoursPerWeek) / (8 - ABRIDGE_BENCHMARKS.afterHoursPerWeek)) * 100));
  const afterHoursScore = Math.max(0, afterHoursReductionScore);

  const realizationScore = Math.round(
    utilizationScore * REALIZATION_WEIGHTS.utilization +
    efficiencyScore * REALIZATION_WEIGHTS.netTimeImpact +
    docCompletenessScore * REALIZATION_WEIGHTS.docCompleteness +
    qualityScore * REALIZATION_WEIGHTS.codingImpact +
    satisfactionScore * REALIZATION_WEIGHTS.satisfaction +
    afterHoursScore * REALIZATION_WEIGHTS.afterHoursReduction
  );

  let maturityLevel: string;
  let maturityStage: number;
  if (realizationScore < 35) { maturityLevel = 'Deployed'; maturityStage = 1; }
  else if (realizationScore < 65) { maturityLevel = 'Adopted'; maturityStage = 2; }
  else if (realizationScore < 85) { maturityLevel = 'Optimized'; maturityStage = 3; }
  else { maturityLevel = 'Transformed'; maturityStage = 4; }

  const yourEncountersDocumented = Math.round(annualEncounters * (utilization / 100));
  const abridgeEncountersDocumented = Math.round(annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));
  const encounterGap = Math.max(0, abridgeEncountersDocumented - yourEncountersDocumented);

  const yourHoursReturned = Math.round((yourEncountersDocumented * timeSavedPerEncounter) / 60);
  const abridgeHoursReturned = Math.round((abridgeEncountersDocumented * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60);
  const hoursGap = Math.max(0, abridgeHoursReturned - yourHoursReturned);

  const utilizationGapPP = Math.max(0, ABRIDGE_BENCHMARKS.utilization - utilization);
  const encountersWithoutAI = Math.round(annualEncounters * (utilizationGapPP / 100));
  const utilizationTimeSavedHours = (encountersWithoutAI * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60;
  const utilizationGapValue = Math.round(utilizationTimeSavedHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate);

  const encountersWithAI = yourEncountersDocumented;
  const netImpactGap = benchmarkNetImpact - currentNetImpact;

  const netEfficiencyGapHours = Math.round((netImpactGap * encountersWithAI) / 60);
  const netEfficiencyGapValue = Math.round(
    Math.max(0, netEfficiencyGapHours) * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate
  );

  const efficiencyGapMin = Math.max(0, ABRIDGE_BENCHMARKS.timeSavedAvg - timeSavedPerEncounter);
  const efficiencyGapHours = Math.round((encountersWithAI * efficiencyGapMin) / 60);
  const efficiencyGapValue = Math.round(efficiencyGapHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate);

  const editTimeErosionPct = timeSavedPerEncounter > 0
    ? Math.round(((editTimePerEncounter || 0) / timeSavedPerEncounter) * 100)
    : 0;

  const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - wrvuLift);
  const baseWRVUs = VALUE_ASSUMPTIONS.avgWRVUPerEncounter * encountersWithAI;
  const missingWRVUs = baseWRVUs * (wrvuGapPercent / 100);
  const wrvuGapValue = Math.round(missingWRVUs * VALUE_ASSUMPTIONS.wrvuDollarValue * VALUE_ASSUMPTIONS.wrvuRealization);

  const annualGap = utilizationGapValue + netEfficiencyGapValue + wrvuGapValue;
  const monthlyGap = Math.round(annualGap / 12);

  const yourTimeSavedMinutes = yourEncountersDocumented * timeSavedPerEncounter;
  const yourTimeSavedHours = yourTimeSavedMinutes / 60;
  const yourAnnualValue = yourTimeSavedHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate;
  const abridgeAnnualValue = yourAnnualValue + annualGap;

  const currentYear1 = 0;
  const currentYear2 = 0;
  const currentYear3 = 0;

  const optimizedYear1 = Math.round(annualGap * 0.90);
  const optimizedYear2 = Math.round(optimizedYear1 + annualGap);
  const optimizedYear3 = Math.round(optimizedYear2 + annualGap * 1.03);

  const threeYearGap = optimizedYear3;

  const switchNowValue = optimizedYear3;
  const wait6MonthsValue = Math.round(optimizedYear3 - (annualGap * 0.5));
  const wait12MonthsValue = Math.round(optimizedYear3 - annualGap);
  const wait6MonthsLoss = switchNowValue - wait6MonthsValue;
  const wait12MonthsLoss = switchNowValue - wait12MonthsValue;

  const currentAnnualInvestment = currentCostPerProvider * providers * 12;
  const abridgeAnnualInvestment = ABRIDGE_BENCHMARKS.costPerProviderMonth * providers * 12;

  const afterHoursAnnual = Math.round((afterHoursPerWeek || 0) * providers * 52);
  const afterHoursBenchmarkAnnual = Math.round(ABRIDGE_BENCHMARKS.afterHoursPerWeek * providers * 52);
  const afterHoursGap = Math.max(0, afterHoursAnnual - afterHoursBenchmarkAnnual);

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
    docCompletenessScore,
    satisfactionScore,
    afterHoursScore,
    realizationScore,
    maturityLevel,
    maturityStage,
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
    netEfficiencyGapValue,
    wrvuGapValue,
    efficiencyGapHours,
    netEfficiencyGapHours,
    currentNetImpact,
    benchmarkNetImpact,
    netImpactGap,
    editTimeErosionPct,
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
    utilizationGapEncounters: encountersWithoutAI,
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
