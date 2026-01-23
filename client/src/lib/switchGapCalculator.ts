// ============================================================================
// SWITCH GAP CALCULATOR - VALUE REALIZATION ASSESSMENT
// Four-dimensional analysis: Utilization, Efficiency, Quality, Satisfaction
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
  satisfaction: number; // NEW: Provider satisfaction %
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
  // Individual dimension scores (as % of benchmark)
  utilizationScore: number;
  efficiencyScore: number;
  qualityScore: number;
  satisfactionScore: number;
  
  // The realization score (multiplicative)
  realizationScore: number;
  maturityLevel: string;
  
  // Your current state
  yourEncountersDocumented: number;
  yourHoursReturned: number;
  yourAnnualValue: number;
  
  // Abridge potential
  abridgeEncountersDocumented: number;
  abridgeHoursReturned: number;
  abridgeAnnualValue: number;
  
  // The gaps
  encounterGap: number;
  hoursGap: number;
  annualGap: number;
  threeYearGap: number;
  monthlyGap: number;
  
  // Individual gap values
  utilizationGapValue: number;
  efficiencyGapValue: number;
  wrvuGapValue: number;
  efficiencyGapHours: number;
  
  // Cost of waiting
  switchNowValue: number;
  wait6MonthsValue: number;
  wait12MonthsValue: number;
  wait6MonthsLoss: number;
  wait12MonthsLoss: number;
  
  // 3-year trajectories for graph
  currentTrajectory: { month: number; value: number }[];
  abridgeTrajectory: { month: number; value: number }[];
  
  // Current investment
  currentAnnualInvestment: number;
  abridgeAnnualInvestment: number;
}

// Abridge benchmarks (based on aggregate data)
export const ABRIDGE_BENCHMARKS = {
  utilization: 75, // 75% average utilization
  timeSavedMin: 3, // 3 min minimum
  timeSavedMax: 5, // 5 min maximum
  timeSavedAvg: 4, // 4 min average
  wrvuLift: 5, // 5% wRVU lift average
  satisfaction: 85, // 85% provider satisfaction/recommendation
  costPerProviderMonth: 250, // Abridge cost estimate
};

// Value assumptions (conservative)
export const VALUE_ASSUMPTIONS = {
  encounterValue: 4, // $4 per additional encounter documented
  hourlyRate: 150, // $150/hr provider time
  timeConversionRate: 0.20, // 20% of saved time converts to value (conservative)
  wrvuDollarValue: 33, // $33 per wRVU
  wrvuAttribution: 0.5, // 50% attribution
  avgWRVUPerEncounter: 1.5, // Assume 1.5 wRVU/encounter baseline
};

// Implementation timeline
export const IMPLEMENTATION_TIMELINE = {
  implementationWeeks: 5, // 4-6 weeks, avg 5
  rampMonths: 3, // 2-3 months to full utilization
  fullValueMonth: 4, // Month 4+ at full value
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
  } = inputs;

  // === DIMENSION SCORES (as % of benchmark) ===
  const utilizationScore = Math.min(100, Math.round((utilization / ABRIDGE_BENCHMARKS.utilization) * 100));
  const efficiencyScore = Math.min(100, Math.round((timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100));
  const qualityScore = Math.min(100, Math.round((wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100));
  const satisfactionScore = Math.min(100, Math.round((satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100));

  // === REALIZATION SCORE (multiplicative) ===
  const realizationScore = Math.round(
    (utilizationScore / 100) * 
    (efficiencyScore / 100) * 
    (qualityScore / 100) * 
    (satisfactionScore / 100) * 100
  );

  // Maturity level based on realization score
  let maturityLevel: string;
  if (realizationScore < 30) maturityLevel = 'Early Stage';
  else if (realizationScore < 60) maturityLevel = 'Developing';
  else if (realizationScore < 85) maturityLevel = 'Optimized';
  else maturityLevel = 'Transformed';

  // Encounters documented
  const yourEncountersDocumented = Math.round(annualEncounters * (utilization / 100));
  const abridgeEncountersDocumented = Math.round(annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));
  const encounterGap = Math.max(0, abridgeEncountersDocumented - yourEncountersDocumented);

  // Hours returned
  const yourHoursReturned = Math.round((yourEncountersDocumented * timeSavedPerEncounter) / 60);
  const abridgeHoursReturned = Math.round((abridgeEncountersDocumented * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60);
  const hoursGap = Math.max(0, abridgeHoursReturned - yourHoursReturned);

  // === GAP CALCULATIONS ===
  
  // 1. Utilization gap (now vs 75%)
  const utilizationGapPP = Math.max(0, ABRIDGE_BENCHMARKS.utilization - utilization);
  const utilizationGapEncounters = Math.round(annualEncounters * (utilizationGapPP / 100));
  const utilizationGapValue = utilizationGapEncounters * VALUE_ASSUMPTIONS.encounterValue;

  // 2. Efficiency gap
  const efficiencyGapMin = Math.max(0, ABRIDGE_BENCHMARKS.timeSavedAvg - timeSavedPerEncounter);
  const encountersAtBenchmark = Math.round(annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));
  const efficiencyGapHours = Math.round((encountersAtBenchmark * efficiencyGapMin) / 60);
  const efficiencyGapValue = Math.round(efficiencyGapHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate);

  // 3. wRVU gap (Quality)
  const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - wrvuLift);
  const wrvuGapPerEncounter = VALUE_ASSUMPTIONS.avgWRVUPerEncounter * (wrvuGapPercent / 100);
  const wrvuGapValue = Math.round(wrvuGapPerEncounter * encountersAtBenchmark * VALUE_ASSUMPTIONS.wrvuDollarValue * VALUE_ASSUMPTIONS.wrvuAttribution);

  // Total annual values
  const annualGap = utilizationGapValue + efficiencyGapValue + wrvuGapValue;
  const threeYearGap = annualGap * 3;
  const monthlyGap = Math.round(annualGap / 12);

  const yourAnnualValue = yourEncountersDocumented * VALUE_ASSUMPTIONS.encounterValue + 
    yourHoursReturned * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate;
  const abridgeAnnualValue = yourAnnualValue + annualGap;

  // Cost of waiting calculations
  const switchNowValue = annualGap * 3; // Full 3 years
  const wait6MonthsValue = annualGap * 2.5; // Lose 6 months
  const wait12MonthsValue = annualGap * 2; // Lose 12 months
  const wait6MonthsLoss = switchNowValue - wait6MonthsValue;
  const wait12MonthsLoss = switchNowValue - wait12MonthsValue;

  // Investment calculations
  const currentAnnualInvestment = currentCostPerProvider * providers * 12;
  const abridgeAnnualInvestment = ABRIDGE_BENCHMARKS.costPerProviderMonth * providers * 12;

  // 3-year trajectories
  const currentTrajectory: { month: number; value: number }[] = [];
  const abridgeTrajectory: { month: number; value: number }[] = [];
  
  for (let month = 0; month <= 36; month++) {
    const currentMonthlyValue = yourAnnualValue / 12;
    currentTrajectory.push({
      month,
      value: Math.round(month * currentMonthlyValue),
    });
    
    let abridgeValue = 0;
    if (month === 0) {
      abridgeValue = 0;
    } else if (month <= IMPLEMENTATION_TIMELINE.rampMonths) {
      const rampFraction = month / IMPLEMENTATION_TIMELINE.rampMonths;
      abridgeValue = currentTrajectory[month - 1]?.value || 0;
      abridgeValue += (abridgeAnnualValue / 12) * rampFraction;
    } else {
      const fullMonths = month - IMPLEMENTATION_TIMELINE.rampMonths;
      const rampValue = (abridgeAnnualValue / 12) * (0.25 + 0.5 + 0.75);
      abridgeValue = rampValue + fullMonths * (abridgeAnnualValue / 12);
    }
    
    abridgeTrajectory.push({
      month,
      value: Math.round(abridgeValue),
    });
  }

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
    switchNowValue,
    wait6MonthsValue,
    wait12MonthsValue,
    wait6MonthsLoss,
    wait12MonthsLoss,
    currentTrajectory,
    abridgeTrajectory,
    currentAnnualInvestment,
    abridgeAnnualInvestment,
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
