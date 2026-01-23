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
  hasWRVU: boolean;
  wrvuBefore: number | null;
  wrvuAfter: number | null;
  hasSatisfaction: boolean;
  satisfactionScore: number | null;
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
  
  // Tiered breakdown
  tier1: GapTier; // Quantifiable
  tier2: GapTier; // Probable
  
  // Capture rates
  utilizationCapture: number;
  efficiencyCapture: number;
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

// Abridge benchmarks (conservative, based on aggregate data)
export const ABRIDGE_BENCHMARKS = {
  utilization: 65, // 65% average utilization
  timeSavedMin: 3, // 3 min minimum
  timeSavedMax: 5, // 5 min maximum
  timeSavedAvg: 4, // 4 min average
  wrvuLiftMin: 3, // 3% minimum lift
  wrvuLiftMax: 7, // 7% maximum lift
  wrvuLiftAvg: 5, // 5% average lift
  satisfactionTarget: 85, // 85% satisfaction target
  costPerProviderMonth: 250, // Abridge cost estimate
};

// Value assumptions (conservative)
export const VALUE_ASSUMPTIONS = {
  encounterValue: 4, // $4 per additional encounter documented
  hourlyRate: 150, // $150/hr provider time
  timeConversionRate: 0.25, // 25% of saved time converts to value (conservative)
  wrvuDollarValue: 33, // $33 per wRVU
  wrvuAttribution: 0.5, // 50% attribution
  retentionCostPerProvider: 250000, // Cost to replace a provider
  satisfactionRetentionImpact: 0.02, // 2% retention impact per 10% satisfaction gap
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
    hasWRVU,
    wrvuBefore,
    wrvuAfter,
  } = inputs;

  // Encounters documented
  const yourEncountersDocumented = Math.round(annualEncounters * (utilization / 100));
  const abridgeEncountersDocumented = Math.round(annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));
  const encounterGap = abridgeEncountersDocumented - yourEncountersDocumented;

  // Hours returned
  const yourHoursReturned = Math.round((yourEncountersDocumented * timeSavedPerEncounter) / 60);
  const abridgeHoursReturned = Math.round((abridgeEncountersDocumented * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60);
  const hoursGap = abridgeHoursReturned - yourHoursReturned;

  // Tier 1: Quantifiable Gaps
  const tier1Items: GapItem[] = [];
  let tier1Total = 0;

  // Utilization gap
  const utilizationGapValue = Math.max(0, encounterGap * VALUE_ASSUMPTIONS.encounterValue);
  if (utilizationGapValue > 0) {
    tier1Items.push({
      name: "Utilization Gap",
      yourValue: `${utilization}%`,
      abridgeValue: `${ABRIDGE_BENCHMARKS.utilization}%`,
      gap: `+${encounterGap.toLocaleString()} encounters`,
      annualValue: utilizationGapValue,
      calculation: `${encounterGap.toLocaleString()} encounters × $${VALUE_ASSUMPTIONS.encounterValue}/enc`,
      icon: "chart",
    });
    tier1Total += utilizationGapValue;
  }

  // Efficiency gap
  const efficiencyGapMinutes = Math.max(0, ABRIDGE_BENCHMARKS.timeSavedAvg - timeSavedPerEncounter);
  const totalEfficiencyGapMinutes = abridgeEncountersDocumented * efficiencyGapMinutes;
  const efficiencyGapHours = totalEfficiencyGapMinutes / 60;
  const efficiencyGapValue = Math.round(efficiencyGapHours * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate);
  
  if (efficiencyGapValue > 0) {
    tier1Items.push({
      name: "Efficiency Gap",
      yourValue: `${timeSavedPerEncounter} min`,
      abridgeValue: `${ABRIDGE_BENCHMARKS.timeSavedAvg} min`,
      gap: `+${efficiencyGapMinutes.toFixed(1)} min/encounter`,
      annualValue: efficiencyGapValue,
      calculation: `${Math.round(efficiencyGapHours).toLocaleString()} hrs × $${VALUE_ASSUMPTIONS.hourlyRate}/hr × ${VALUE_ASSUMPTIONS.timeConversionRate * 100}%`,
      icon: "clock",
    });
    tier1Total += efficiencyGapValue;
  }

  // Tier 2: Probable Gaps (wRVU, Satisfaction)
  const tier2Items: GapItem[] = [];
  let tier2Total = 0;

  // wRVU gap (if provided)
  if (hasWRVU && wrvuBefore && wrvuAfter) {
    const theirLift = wrvuAfter - wrvuBefore;
    const theirLiftPercent = (theirLift / wrvuBefore) * 100;
    
    if (theirLiftPercent < ABRIDGE_BENCHMARKS.wrvuLiftMin) {
      const gapPercent = ABRIDGE_BENCHMARKS.wrvuLiftMin - theirLiftPercent;
      const gapWRVU = wrvuBefore * (gapPercent / 100);
      const wrvuGapValue = Math.round(
        gapWRVU * abridgeEncountersDocumented * VALUE_ASSUMPTIONS.wrvuDollarValue * VALUE_ASSUMPTIONS.wrvuAttribution
      );
      
      if (wrvuGapValue > 0) {
        tier2Items.push({
          name: "Revenue Capture Gap",
          yourValue: `${theirLiftPercent.toFixed(1)}% lift`,
          abridgeValue: `${ABRIDGE_BENCHMARKS.wrvuLiftMin}%+ lift`,
          gap: `+${gapPercent.toFixed(1)}% wRVU`,
          annualValue: wrvuGapValue,
          calculation: `${gapWRVU.toFixed(2)} wRVU × ${abridgeEncountersDocumented.toLocaleString()} enc × $${VALUE_ASSUMPTIONS.wrvuDollarValue} × ${VALUE_ASSUMPTIONS.wrvuAttribution * 100}%`,
          icon: "dollar",
        });
        tier2Total += wrvuGapValue;
      }
    }
  } else if (!hasWRVU) {
    tier2Items.push({
      name: "Revenue Capture Gap",
      yourValue: "Not provided",
      abridgeValue: `${ABRIDGE_BENCHMARKS.wrvuLiftMin}-${ABRIDGE_BENCHMARKS.wrvuLiftMax}% lift`,
      gap: "Unknown",
      annualValue: 0,
      calculation: "Add wRVU data to calculate",
      icon: "dollar",
    });
  }

  // Total annual values
  const yourAnnualValue = yourEncountersDocumented * VALUE_ASSUMPTIONS.encounterValue + yourHoursReturned * VALUE_ASSUMPTIONS.hourlyRate * VALUE_ASSUMPTIONS.timeConversionRate;
  const annualGap = tier1Total + tier2Total;
  const abridgeAnnualValue = yourAnnualValue + annualGap;
  const threeYearGap = annualGap * 3;
  const monthlyGap = Math.round(annualGap / 12);

  // Capture rates
  const utilizationCapture = Math.min(100, Math.round((utilization / ABRIDGE_BENCHMARKS.utilization) * 100));
  const efficiencyCapture = Math.min(100, Math.round((timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100));
  const combinedCapture = Math.round((utilizationCapture * efficiencyCapture) / 100);

  // Cost of waiting calculations
  const monthlyValue = annualGap / 12;
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
  const breakevenMonth = netAnnualBenefit > 0 ? Math.max(IMPLEMENTATION_TIMELINE.fullValueMonth, Math.ceil(Math.abs(investmentDifference) / (netAnnualBenefit / 12))) : 6;

  // 3-year trajectories
  const currentTrajectory: { month: number; value: number }[] = [];
  const abridgeTrajectory: { month: number; value: number }[] = [];
  
  for (let month = 0; month <= 36; month++) {
    // Current solution: linear value accumulation
    const currentMonthlyValue = yourAnnualValue / 12;
    currentTrajectory.push({
      month,
      value: Math.round(month * currentMonthlyValue),
    });
    
    // Abridge: ramp period then full value
    let abridgeValue = 0;
    if (month === 0) {
      abridgeValue = 0;
    } else if (month <= IMPLEMENTATION_TIMELINE.rampMonths) {
      // Ramp period: 25%, 50%, 75% of value
      const rampFraction = month / IMPLEMENTATION_TIMELINE.rampMonths;
      abridgeValue = currentTrajectory[month - 1]?.value || 0;
      abridgeValue += (abridgeAnnualValue / 12) * rampFraction;
    } else {
      // Full value after ramp
      const fullMonths = month - IMPLEMENTATION_TIMELINE.rampMonths;
      const rampValue = (abridgeAnnualValue / 12) * (0.25 + 0.5 + 0.75); // Sum of ramp months
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
    tier1: { label: "Quantifiable Gaps", items: tier1Items, total: tier1Total },
    tier2: { label: "Probable Gaps", items: tier2Items, total: tier2Total },
    utilizationCapture,
    efficiencyCapture,
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
