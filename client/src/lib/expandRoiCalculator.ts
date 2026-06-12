// ============================================================================
// EXPAND ROI CALCULATOR - Tiered Value Model
// ============================================================================
// This calculates ROI without double-counting time metrics.
// Time Savings, Work Outside Work, and Chart Closure all measure the same
// underlying improvement - documentation efficiency.

export type TimeConversionMethod = "none" | "patientAccess" | "overtime";

export interface ValueConfigData {
  timeConversionMethod: TimeConversionMethod;
  conversionPercent: number;
  overtimeReduction: number | null;
  estimateRetention: boolean;
  departuresPrevented: number;
  wrvuAttribution: number;
}

export interface ExpandROIDefaults {
  wrvuAttribution: number;
  dollarPerWRVU: number;
  timeConversionPercent: number;
  revenuePerVisit: number;
  visitRealizability: number;
  investmentPerProvider: number;
  replacementCost: number;
  minutesPerVisit: number;
  weeksPerYear: number;
}

export const EXPAND_ROI_DEFAULTS: ExpandROIDefaults = {
  wrvuAttribution: 0.75,
  dollarPerWRVU: 33,
  timeConversionPercent: 15,
  revenuePerVisit: 200,
  visitRealizability: 0.50,
  investmentPerProvider: 250,
  replacementCost: 400000,
  minutesPerVisit: 30,
  weeksPerYear: 48,
};

export interface WRVUCalculation {
  enabled: boolean;
  beforeValue: number | null;
  afterValue: number | null;
  liftPerEncounter: number;
  liftPercent: number;
  encounters: number;
  dollarPerWRVU: number;
  attribution: number;
  annualValue: number;
}

export interface TimeEfficiencyCalculation {
  minutesSavedPerEncounter: number;
  encounters: number;
  totalHoursSaved: number;
  conversionMethod: TimeConversionMethod;
  patientAccess: {
    enabled: boolean;
    conversionPercent: number;
    hoursConverted: number;
    additionalVisits: number;
    revenuePerVisit: number;
    realizability: number;
    annualValue: number;
  };
  overtime: {
    enabled: boolean;
    annualReduction: number;
  };
}

export interface RetentionCalculation {
  enabled: boolean;
  satisfactionImprovement: number;
  departuresPrevented: number;
  replacementCost: number;
  annualValue: number;
}

export interface EfficiencyMetrics {
  hoursSaved: number;
  pajamaTimeEliminated: number;
  pajamaTimeWeekly: number;
  chartClosureImprovement: number;
  chartClosureBefore: number;
  chartClosureAfter: number;
}

export interface LeadingIndicators {
  satisfactionBefore: number | null;
  satisfactionAfter: number | null;
  satisfactionImprovement: number;
}

export interface TieredROIResult {
  tier1HardValue: number;
  tier1Breakdown: {
    wrvuValue: number;
    timeConversionValue: number;
    retentionValue: number;
  };
  tier2EfficiencyMetrics: EfficiencyMetrics;
  tier3LeadingIndicators: LeadingIndicators;
  investment: number;
  netValue: number;
  roi: number;
  warnings: SanityWarning[];
  calculations: {
    wrvu: WRVUCalculation;
    timeEfficiency: TimeEfficiencyCalculation;
    retention: RetentionCalculation;
  };
}

export interface SanityWarning {
  type: "roi" | "wrvuLift" | "timeConversion" | "general";
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
}

export interface CalculationInputs {
  providers: number;
  encounters: number;
  utilizationRate: number;
  monthsOnAbridge: number;
  wrvuBefore: number | null;
  wrvuAfter: number | null;
  timeSavingsBefore: number | null;
  timeSavingsAfter: number | null;
  workOutsideWorkBefore: number | null;
  workOutsideWorkAfter: number | null;
  chartClosureBefore: number | null;
  chartClosureAfter: number | null;
  satisfactionBefore: number | null;
  satisfactionAfter: number | null;
  valueConfig: ValueConfigData;
}

export function calculateTieredROI(
  inputs: CalculationInputs,
  defaults: ExpandROIDefaults = EXPAND_ROI_DEFAULTS
): TieredROIResult {
  const warnings: SanityWarning[] = [];
  
  // ========== TIER 1: HARD VALUE ==========
  
  // 1. wRVU Calculation
  const wrvuCalc = calculateWRVU(inputs, defaults);
  if (wrvuCalc.liftPercent > 9) {
    warnings.push({
      type: "wrvuLift",
      severity: "info",
      title: `Your wRVU lift (${wrvuCalc.liftPercent.toFixed(1)}%) exceeds typical range`,
      message: "Most customers see 3-9% lift. Your results are impressive! If this reflects your actual data, you're seeing exceptional value from Abridge.",
    });
  }
  
  // 2. Time Efficiency Calculation
  const timeCalc = calculateTimeEfficiency(inputs, defaults);
  if (
    inputs.valueConfig.timeConversionMethod === "patientAccess" &&
    inputs.valueConfig.conversionPercent > 15
  ) {
    warnings.push({
      type: "timeConversion",
      severity: "warning",
      title: `High time conversion assumption (${inputs.valueConfig.conversionPercent}%)`,
      message: "Converting more than 15% of saved time to patient visits requires significant scheduling capacity and demand. Consider a more conservative estimate.",
    });
  }
  
  // 3. Retention Calculation
  const retentionCalc = calculateRetention(inputs, defaults);
  
  // Sum Tier 1 values
  const tier1HardValue = 
    wrvuCalc.annualValue + 
    (timeCalc.patientAccess.enabled ? timeCalc.patientAccess.annualValue : 0) +
    (timeCalc.overtime.enabled ? timeCalc.overtime.annualReduction : 0) +
    (retentionCalc.enabled ? retentionCalc.annualValue : 0);
  
  // ========== TIER 2: EFFICIENCY METRICS (NOT DOLLARIZED) ==========
  const tier2EfficiencyMetrics = calculateEfficiencyMetrics(inputs);
  
  // ========== TIER 3: LEADING INDICATORS ==========
  const tier3LeadingIndicators = calculateLeadingIndicators(inputs);
  
  // ========== INVESTMENT & ROI ==========
  const investment = inputs.providers * defaults.investmentPerProvider * 12;
  const netValue = tier1HardValue - investment;
  const roi = investment > 0 ? tier1HardValue / investment : 0;
  
  if (roi > 5) {
    warnings.push({
      type: "roi",
      severity: "warning",
      title: `Your projected ROI is ${roi.toFixed(1)}× — worth a second look`,
      message: "Organizations at this stage typically see 2–4× ROI. Review your inputs — particularly time conversion and wRVU assumptions — to make sure they reflect your organization's realistic scenario.",
    });
  }
  
  return {
    tier1HardValue,
    tier1Breakdown: {
      wrvuValue: wrvuCalc.annualValue,
      timeConversionValue: timeCalc.patientAccess.enabled 
        ? timeCalc.patientAccess.annualValue 
        : (timeCalc.overtime.enabled ? timeCalc.overtime.annualReduction : 0),
      retentionValue: retentionCalc.enabled ? retentionCalc.annualValue : 0,
    },
    tier2EfficiencyMetrics,
    tier3LeadingIndicators,
    investment,
    netValue,
    roi,
    warnings,
    calculations: {
      wrvu: wrvuCalc,
      timeEfficiency: timeCalc,
      retention: retentionCalc,
    },
  };
}

function calculateWRVU(
  inputs: CalculationInputs,
  defaults: ExpandROIDefaults
): WRVUCalculation {
  const before = inputs.wrvuBefore ?? 0;
  const after = inputs.wrvuAfter ?? 0;
  const lift = Math.max(0, after - before);
  const liftPercent = before > 0 ? (lift / before) * 100 : 0;
  
  // Eligible encounters = total encounters × utilization rate
  const eligibleEncounters = Math.round(inputs.encounters * (inputs.utilizationRate / 100));
  
  // Use configurable attribution from valueConfig, fallback to defaults
  const attribution = inputs.valueConfig?.wrvuAttribution ?? defaults.wrvuAttribution;
  
  const annualValue = Math.round(
    lift * eligibleEncounters * defaults.dollarPerWRVU * attribution
  );
  
  return {
    enabled: before > 0 && after > 0,
    beforeValue: inputs.wrvuBefore,
    afterValue: inputs.wrvuAfter,
    liftPerEncounter: lift,
    liftPercent,
    encounters: eligibleEncounters,
    dollarPerWRVU: defaults.dollarPerWRVU,
    attribution,
    annualValue,
  };
}

function calculateTimeEfficiency(
  inputs: CalculationInputs,
  defaults: ExpandROIDefaults
): TimeEfficiencyCalculation {
  const before = inputs.timeSavingsBefore ?? 0;
  const after = inputs.timeSavingsAfter ?? 0;
  const minutesSaved = Math.max(0, before - after);
  // Apply utilization rate to get eligible encounters
  const eligibleEncounters = Math.round(inputs.encounters * (inputs.utilizationRate / 100));
  const totalHoursSaved = Math.round((minutesSaved * eligibleEncounters) / 60);
  
  const config = inputs.valueConfig;
  const isPatientAccess = config.timeConversionMethod === "patientAccess";
  const isOvertime = config.timeConversionMethod === "overtime";
  
  let patientAccessValue = 0;
  let hoursConverted = 0;
  let additionalVisits = 0;
  
  if (isPatientAccess) {
    hoursConverted = Math.round(totalHoursSaved * (config.conversionPercent / 100));
    additionalVisits = Math.round((hoursConverted * 60) / defaults.minutesPerVisit);
    patientAccessValue = Math.round(
      additionalVisits * defaults.revenuePerVisit * defaults.visitRealizability
    );
  }
  
  return {
    minutesSavedPerEncounter: minutesSaved,
    encounters: inputs.encounters,
    totalHoursSaved,
    conversionMethod: config.timeConversionMethod,
    patientAccess: {
      enabled: isPatientAccess,
      conversionPercent: config.conversionPercent,
      hoursConverted,
      additionalVisits,
      revenuePerVisit: defaults.revenuePerVisit,
      realizability: defaults.visitRealizability,
      annualValue: patientAccessValue,
    },
    overtime: {
      enabled: isOvertime,
      annualReduction: config.overtimeReduction ?? 0,
    },
  };
}

function calculateRetention(
  inputs: CalculationInputs,
  defaults: ExpandROIDefaults
): RetentionCalculation {
  const config = inputs.valueConfig;
  const before = inputs.satisfactionBefore ?? 0;
  const after = inputs.satisfactionAfter ?? 0;
  const improvement = Math.max(0, after - before);
  
  const annualValue = config.estimateRetention
    ? config.departuresPrevented * defaults.replacementCost
    : 0;
  
  return {
    enabled: config.estimateRetention && config.departuresPrevented > 0,
    satisfactionImprovement: improvement,
    departuresPrevented: config.departuresPrevented,
    replacementCost: defaults.replacementCost,
    annualValue,
  };
}

function calculateEfficiencyMetrics(inputs: CalculationInputs): EfficiencyMetrics {
  const timeBefore = inputs.timeSavingsBefore ?? 0;
  const timeAfter = inputs.timeSavingsAfter ?? 0;
  const minutesSaved = Math.max(0, timeBefore - timeAfter);
  // Apply utilization rate to get eligible encounters
  const eligibleEncounters = Math.round(inputs.encounters * (inputs.utilizationRate / 100));
  const hoursSaved = Math.round((minutesSaved * eligibleEncounters) / 60);
  
  const wowBefore = inputs.workOutsideWorkBefore ?? 0;
  const wowAfter = inputs.workOutsideWorkAfter ?? 0;
  const pajamaTimeWeekly = Math.max(0, wowBefore - wowAfter);
  const pajamaTimeEliminated = Math.round(
    pajamaTimeWeekly * inputs.providers * EXPAND_ROI_DEFAULTS.weeksPerYear
  );
  
  const closureBefore = inputs.chartClosureBefore ?? 0;
  const closureAfter = inputs.chartClosureAfter ?? 0;
  const closureImprovement = Math.max(0, closureAfter - closureBefore);
  
  return {
    hoursSaved,
    pajamaTimeEliminated,
    pajamaTimeWeekly,
    chartClosureImprovement: closureImprovement,
    chartClosureBefore: closureBefore,
    chartClosureAfter: closureAfter,
  };
}

function calculateLeadingIndicators(inputs: CalculationInputs): LeadingIndicators {
  const before = inputs.satisfactionBefore;
  const after = inputs.satisfactionAfter;
  const improvement = (before !== null && after !== null) 
    ? Math.max(0, after - before)
    : 0;
  
  return {
    satisfactionBefore: before,
    satisfactionAfter: after,
    satisfactionImprovement: improvement,
  };
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    const k = Math.round(value / 1000);
    if (k >= 1000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${k}K`;
  }
  return `$${value.toLocaleString()}`;
}
