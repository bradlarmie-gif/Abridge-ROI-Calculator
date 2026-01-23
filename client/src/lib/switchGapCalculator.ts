// ============================================================================
// SWITCH GAP CALCULATOR
// Conservative, transparent gap analysis for prospects on competing solutions
// ============================================================================

export type SolutionType = "ambient-ai" | "human-scribes";

export interface SwitchInputs {
  solution: SolutionType;
  providers: number;
  annualEncounters: number;
  currentCostPerProvider: number;
  utilization: number;
  timeSavedPerEncounter: number;
  wrvuLift: number; // Now always tracked (percentage lift)
}

export interface GapTier {
  label: string;
  items: GapItem[];
  total: number;
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
  
  // Tiered breakdown
  tier1: GapTier; // Quantifiable
  tier2: GapTier; // Probable
  
  // Capture rates
  utilizationCapture: number;
  efficiencyCapture: number;
  wrvuCapture: number;
  combinedCapture: number;
  
  // Cost of waiting
  switchNowValue: number;
  wait6MonthsValue: number;
  wait12MonthsValue: number;
  wait6MonthsLoss: number;
  wait12MonthsLoss: number;
  
  // Switching timeline
  breakevenMonth: number;
  
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
  satisfactionTarget: 85, // 85% satisfaction target
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
  retentionCostPerProvider: 250000, // Cost to replace a provider
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
  } = inputs;

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

  // 3. wRVU gap
  const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - wrvuLift);
  const wrvuGapPerEncounter = VALUE_ASSUMPTIONS.avgWRVUPerEncounter * (wrvuGapPercent / 100);
  const wrvuGapValue = Math.round(wrvuGapPerEncounter * encountersAtBenchmark * VALUE_ASSUMPTIONS.wrvuDollarValue * VALUE_ASSUMPTIONS.wrvuAttribution);

  // Capture rates
  const utilizationCapture = Math.min(100, Math.round((utilization / ABRIDGE_BENCHMARKS.utilization) * 100));
  const efficiencyCapture = Math.min(100, Math.round((timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100));
  const wrvuCapture = Math.min(100, Math.round((wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100));
  const combinedCapture = Math.round((utilizationCapture / 100) * (efficiencyCapture / 100) * (wrvuCapture / 100) * 100);

  // Tier 1: Quantifiable Gaps
  const tier1Items: GapItem[] = [];
  let tier1Total = 0;

  if (utilizationGapValue > 0) {
    tier1Items.push({
      name: "Utilization Gap",
      yourValue: `${utilization}%`,
      abridgeValue: `${ABRIDGE_BENCHMARKS.utilization}%`,
      gap: `+${utilizationGapEncounters.toLocaleString()} encounters`,
      annualValue: utilizationGapValue,
      calculation: `${utilizationGapEncounters.toLocaleString()} encounters × $${VALUE_ASSUMPTIONS.encounterValue}/enc`,
      icon: "chart",
    });
    tier1Total += utilizationGapValue;
  }

  if (efficiencyGapValue > 0) {
    tier1Items.push({
      name: "Efficiency Gap",
      yourValue: `${timeSavedPerEncounter} min`,
      abridgeValue: `${ABRIDGE_BENCHMARKS.timeSavedAvg} min`,
      gap: `+${efficiencyGapMin.toFixed(1)} min/encounter`,
      annualValue: efficiencyGapValue,
      calculation: `${efficiencyGapHours.toLocaleString()} hrs × $${VALUE_ASSUMPTIONS.hourlyRate}/hr × ${VALUE_ASSUMPTIONS.timeConversionRate * 100}%`,
      icon: "clock",
    });
    tier1Total += efficiencyGapValue;
  }

  if (wrvuGapValue > 0) {
    tier1Items.push({
      name: "Revenue Capture Gap",
      yourValue: `+${wrvuLift}%`,
      abridgeValue: `+${ABRIDGE_BENCHMARKS.wrvuLift}%`,
      gap: `+${wrvuGapPercent.toFixed(1)}% wRVU`,
      annualValue: wrvuGapValue,
      calculation: `${wrvuGapPercent.toFixed(1)}% × ${VALUE_ASSUMPTIONS.avgWRVUPerEncounter} wRVU × ${encountersAtBenchmark.toLocaleString()} enc × $${VALUE_ASSUMPTIONS.wrvuDollarValue} × ${VALUE_ASSUMPTIONS.wrvuAttribution * 100}%`,
      icon: "dollar",
    });
    tier1Total += wrvuGapValue;
  }

  // Tier 2: empty for now (could add satisfaction etc.)
  const tier2Items: GapItem[] = [];
  const tier2Total = 0;

  // Total annual values
  const yourAnnualValue = yourEncountersDocumented * VALUE_ASSUMPTIONS.encounterValue + 
    yourHoursReturned * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate;
  const annualGap = tier1Total + tier2Total;
  const abridgeAnnualValue = yourAnnualValue + annualGap;
  const threeYearGap = annualGap * 3;
  const monthlyGap = Math.round(annualGap / 12);

  // Cost of waiting calculations
  const switchNowValue = annualGap * 3; // Full 3 years
  const wait6MonthsValue = annualGap * 2.5; // Lose 6 months
  const wait12MonthsValue = annualGap * 2; // Lose 12 months
  const wait6MonthsLoss = switchNowValue - wait6MonthsValue;
  const wait12MonthsLoss = switchNowValue - wait12MonthsValue;

  // Break-even calculation
  const currentAnnualInvestment = currentCostPerProvider * providers * 12;
  const abridgeAnnualInvestment = ABRIDGE_BENCHMARKS.costPerProviderMonth * providers * 12;
  const investmentDifference = abridgeAnnualInvestment - currentAnnualInvestment;
  const netAnnualBenefit = annualGap - investmentDifference;
  const breakevenMonth = netAnnualBenefit > 0 
    ? Math.max(IMPLEMENTATION_TIMELINE.fullValueMonth, Math.ceil(Math.abs(investmentDifference) / (netAnnualBenefit / 12))) 
    : 6;

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
    tier1: { label: "Quantifiable Gaps", items: tier1Items, total: tier1Total },
    tier2: { label: "Probable Gaps", items: tier2Items, total: tier2Total },
    utilizationCapture,
    efficiencyCapture,
    wrvuCapture,
    combinedCapture,
    switchNowValue,
    wait6MonthsValue,
    wait12MonthsValue,
    wait6MonthsLoss,
    wait12MonthsLoss,
    breakevenMonth,
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
