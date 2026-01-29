// Measure Flow Calculator - State, Types, and Calculations
// For existing Abridge customers documenting their value story

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DeploymentData {
  providers: number;
  annualEncounters: number;
  utilizationRate: number; // percentage
  monthsOnAbridge: number;
}

export interface MetricSelection {
  // Core Financial Value
  wrvuPerEncounter: boolean;
  avgEmLevel: boolean;
  diagnosisCapture: boolean;
  // Operational Efficiency
  timeInNotes: boolean;
  workOutsideWork: boolean;
  // Quality Indicators
  utilizationRate: boolean;
  sameDayChartClosure: boolean;
  clinicianSatisfaction: boolean;
}

export interface BeforeAfterData {
  before: number | null;
  after: number | null;
}

export interface MetricData {
  wrvuPerEncounter: BeforeAfterData;
  avgEmLevel: BeforeAfterData;
  diagnosisCapture: BeforeAfterData;
  timeInNotes: BeforeAfterData;
  workOutsideWork: BeforeAfterData;
  utilizationRate: BeforeAfterData;
  sameDayChartClosure: BeforeAfterData;
  clinicianSatisfaction: BeforeAfterData;
}

export interface TimeAllocation {
  hardSavings: number;      // percentage 0-100
  capacityUnlocked: number; // percentage 0-100
  qualityOfLife: number;    // percentage 0-100
}

export interface MeasureState {
  deployment: DeploymentData;
  selectedMetrics: MetricSelection;
  metricData: MetricData;
  timeAllocation: TimeAllocation;
}

// ============================================================================
// METRIC DEFINITIONS
// ============================================================================

export type MetricKey = keyof MetricSelection;

export interface MetricDefinition {
  key: MetricKey;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  category: 'financial' | 'operational' | 'quality';
  categoryName: string;
  unit: string;
  unitSuffix: string;
  isRecommended: boolean;
  benchmarkRange: { low: number; high: number };
  benchmarkLabel: string;
  calculateValue: (
    beforeAfter: BeforeAfterData,
    deployment: DeploymentData
  ) => { value: number; label: string; isStrong: boolean } | null;
}

// Calculation constants
export const MEASURE_CONSTANTS = {
  WRVU_DOLLAR_VALUE: 33,
  ATTRIBUTION_FACTOR: 0.5,
  EM_LEVEL_REVENUE_IMPACT: 35, // $ difference per level
  DIAGNOSIS_HCC_VALUE: 1200, // annual $ per additional HCC
  OVERTIME_HOURLY_RATE: 150,
  MINUTES_PER_VISIT: 30,
  REVENUE_PER_VISIT: 150,
  WEEKS_PER_YEAR: 52,
};

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // CORE FINANCIAL VALUE
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'wrvuPerEncounter',
    slug: 'wrvu',
    name: 'wRVU per Encounter',
    shortName: 'wRVU',
    description: 'Revenue capture from complete documentation',
    category: 'financial',
    categoryName: 'Core Financial Value',
    unit: 'wRVU/enc',
    unitSuffix: ' wRVU',
    isRecommended: true,
    benchmarkRange: { low: 3, high: 9 },
    benchmarkLabel: 'Typical: 3-9% lift',
    calculateValue: (ba, deployment) => {
      if (ba.before === null || ba.after === null) return null;
      const lift = ba.after - ba.before;
      const liftPercent = (lift / ba.before) * 100;
      const annualValue = lift * deployment.annualEncounters * 
        (deployment.utilizationRate / 100) * MEASURE_CONSTANTS.WRVU_DOLLAR_VALUE * 
        MEASURE_CONSTANTS.ATTRIBUTION_FACTOR;
      return {
        value: Math.round(annualValue),
        label: `+${lift.toFixed(2)} wRVU/enc · ${liftPercent.toFixed(0)}% lift`,
        isStrong: liftPercent >= 5
      };
    }
  },
  {
    key: 'avgEmLevel',
    slug: 'em-level',
    name: 'Average E&M Level',
    shortName: 'E&M Level',
    description: 'Coding accuracy from complete documentation',
    category: 'financial',
    categoryName: 'Core Financial Value',
    unit: 'level',
    unitSuffix: '',
    isRecommended: true,
    benchmarkRange: { low: 0.1, high: 0.3 },
    benchmarkLabel: 'Typical: 0.1-0.3 level increase',
    calculateValue: (ba, deployment) => {
      if (ba.before === null || ba.after === null) return null;
      const lift = ba.after - ba.before;
      const annualValue = lift * deployment.annualEncounters * 
        (deployment.utilizationRate / 100) * MEASURE_CONSTANTS.EM_LEVEL_REVENUE_IMPACT * 
        MEASURE_CONSTANTS.ATTRIBUTION_FACTOR;
      return {
        value: Math.round(annualValue),
        label: `+${lift.toFixed(2)} avg level`,
        isStrong: lift >= 0.15
      };
    }
  },
  {
    key: 'diagnosisCapture',
    slug: 'diagnosis',
    name: 'Diagnosis Capture',
    shortName: 'HCC/RAF',
    description: 'HCC/RAF score improvement',
    category: 'financial',
    categoryName: 'Core Financial Value',
    unit: 'HCCs/patient',
    unitSuffix: ' HCCs',
    isRecommended: false,
    benchmarkRange: { low: 0.5, high: 2 },
    benchmarkLabel: 'Typical: 0.5-2 additional HCCs per patient',
    calculateValue: (ba, deployment) => {
      if (ba.before === null || ba.after === null) return null;
      const lift = ba.after - ba.before;
      const uniquePatients = deployment.annualEncounters / 3; // assume 3 visits per patient
      const annualValue = lift * uniquePatients * MEASURE_CONSTANTS.DIAGNOSIS_HCC_VALUE * 
        MEASURE_CONSTANTS.ATTRIBUTION_FACTOR;
      return {
        value: Math.round(annualValue),
        label: `+${lift.toFixed(1)} HCCs/patient`,
        isStrong: lift >= 1
      };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OPERATIONAL EFFICIENCY
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'timeInNotes',
    slug: 'time-in-notes',
    name: 'Time in Notes',
    shortName: 'Note Time',
    description: 'Minutes per encounter documenting',
    category: 'operational',
    categoryName: 'Operational Efficiency',
    unit: 'min/enc',
    unitSuffix: ' min',
    isRecommended: true,
    benchmarkRange: { low: 3, high: 8 },
    benchmarkLabel: 'Typical: 3-8 minutes saved per encounter',
    calculateValue: (ba, deployment) => {
      if (ba.before === null || ba.after === null) return null;
      const minutesSaved = ba.before - ba.after;
      const totalMinutes = minutesSaved * deployment.annualEncounters * 
        (deployment.utilizationRate / 100);
      const totalHours = totalMinutes / 60;
      return {
        value: Math.round(totalHours),
        label: `${minutesSaved.toFixed(0)} min saved/encounter`,
        isStrong: minutesSaved >= 5
      };
    }
  },
  {
    key: 'workOutsideWork',
    slug: 'after-hours',
    name: 'Work Outside of Work',
    shortName: 'After-Hours',
    description: 'After-hours documentation burden',
    category: 'operational',
    categoryName: 'Operational Efficiency',
    unit: 'hrs/week',
    unitSuffix: ' hrs/wk',
    isRecommended: true,
    benchmarkRange: { low: 2, high: 5 },
    benchmarkLabel: 'Typical: 2-5 hours/week reduction',
    calculateValue: (ba, deployment) => {
      if (ba.before === null || ba.after === null) return null;
      const hoursSavedPerWeek = ba.before - ba.after;
      const annualHours = hoursSavedPerWeek * MEASURE_CONSTANTS.WEEKS_PER_YEAR * deployment.providers;
      return {
        value: Math.round(annualHours),
        label: `${hoursSavedPerWeek.toFixed(1)} hrs/week saved`,
        isStrong: hoursSavedPerWeek >= 3
      };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUALITY INDICATORS
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'utilizationRate',
    slug: 'utilization',
    name: 'Utilization Rate',
    shortName: 'Utilization',
    description: 'Percentage of providers actively using',
    category: 'quality',
    categoryName: 'Quality Indicators',
    unit: '%',
    unitSuffix: '%',
    isRecommended: false,
    benchmarkRange: { low: 60, high: 85 },
    benchmarkLabel: 'Strong adoption: 70%+',
    calculateValue: (ba) => {
      if (ba.before === null || ba.after === null) return null;
      const lift = ba.after - ba.before;
      return {
        value: 0, // Non-dollar metric
        label: `+${lift.toFixed(0)}% adoption`,
        isStrong: ba.after >= 80
      };
    }
  },
  {
    key: 'sameDayChartClosure',
    slug: 'same-day-closure',
    name: 'Same-Day Chart Closure',
    shortName: 'Chart Closure',
    description: 'Real-time documentation behavior',
    category: 'quality',
    categoryName: 'Quality Indicators',
    unit: '%',
    unitSuffix: '%',
    isRecommended: false,
    benchmarkRange: { low: 20, high: 40 },
    benchmarkLabel: 'Typical improvement: 20-40%',
    calculateValue: (ba) => {
      if (ba.before === null || ba.after === null) return null;
      const lift = ba.after - ba.before;
      return {
        value: 0, // Non-dollar metric
        label: `+${lift.toFixed(0)}% same-day closure`,
        isStrong: lift >= 30
      };
    }
  },
  {
    key: 'clinicianSatisfaction',
    slug: 'satisfaction',
    name: 'Clinician Satisfaction',
    shortName: 'Satisfaction',
    description: 'Leading indicator for retention',
    category: 'quality',
    categoryName: 'Quality Indicators',
    unit: 'NPS',
    unitSuffix: ' pts',
    isRecommended: false,
    benchmarkRange: { low: 15, high: 35 },
    benchmarkLabel: 'Typical: 15-35 point improvement',
    calculateValue: (ba) => {
      if (ba.before === null || ba.after === null) return null;
      const lift = ba.after - ba.before;
      return {
        value: 0, // Non-dollar metric
        label: `+${lift.toFixed(0)} NPS points`,
        isStrong: lift >= 25
      };
    }
  },
];

// ============================================================================
// DEFAULT STATE
// ============================================================================

export const getDefaultMeasureState = (): MeasureState => ({
  deployment: {
    providers: 0,
    annualEncounters: 0,
    utilizationRate: 0,
    monthsOnAbridge: 0,
  },
  selectedMetrics: {
    wrvuPerEncounter: false,
    avgEmLevel: false,
    diagnosisCapture: false,
    timeInNotes: false,
    workOutsideWork: false,
    utilizationRate: false,
    sameDayChartClosure: false,
    clinicianSatisfaction: false,
  },
  metricData: {
    wrvuPerEncounter: { before: null, after: null },
    avgEmLevel: { before: null, after: null },
    diagnosisCapture: { before: null, after: null },
    timeInNotes: { before: null, after: null },
    workOutsideWork: { before: null, after: null },
    utilizationRate: { before: null, after: null },
    sameDayChartClosure: { before: null, after: null },
    clinicianSatisfaction: { before: null, after: null },
  },
  timeAllocation: {
    hardSavings: 20,
    capacityUnlocked: 15,
    qualityOfLife: 65,
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSelectedMetricDefinitions(selected: MetricSelection): MetricDefinition[] {
  return METRIC_DEFINITIONS.filter(def => selected[def.key]);
}

export function hasOperationalEfficiencyMetrics(selected: MetricSelection): boolean {
  return selected.timeInNotes || selected.workOutsideWork;
}

export function getMetricBySlug(slug: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS.find(def => def.slug === slug);
}

export function getMetricsByCategory(category: 'financial' | 'operational' | 'quality'): MetricDefinition[] {
  return METRIC_DEFINITIONS.filter(def => def.category === category);
}

// ============================================================================
// CALCULATIONS
// ============================================================================

export interface CalculatedMetricResult {
  metric: MetricDefinition;
  beforeAfter: BeforeAfterData;
  dollarValue: number;
  label: string;
  isStrong: boolean;
  liftPercent: number;
}

export interface TimeAllocationResults {
  totalHoursSaved: number;
  hardSavings: {
    hours: number;
    dollarValue: number;
  };
  capacityUnlocked: {
    hours: number;
    additionalVisits: number;
    dollarValue: number;
  };
  qualityOfLife: {
    hours: number;
    hoursPerProviderPerWeek: number;
  };
}

export interface MeasureCalculationResults {
  metricResults: CalculatedMetricResult[];
  totalFinancialValue: number;
  totalOperationalValue: number;
  totalValue: number;
  valuePerProvider: number;
  timeAllocation: TimeAllocationResults;
  qualityIndicators: CalculatedMetricResult[];
}

export function calculateMeasureResults(state: MeasureState): MeasureCalculationResults {
  const selectedDefs = getSelectedMetricDefinitions(state.selectedMetrics);
  
  const metricResults: CalculatedMetricResult[] = [];
  const qualityIndicators: CalculatedMetricResult[] = [];
  
  let totalFinancialValue = 0;
  let totalHoursSaved = 0;
  
  for (const def of selectedDefs) {
    const ba = state.metricData[def.key];
    const result = def.calculateValue(ba, state.deployment);
    
    if (result) {
      const liftPercent = ba.before && ba.before > 0 
        ? ((ba.after || 0) - ba.before) / ba.before * 100 
        : 0;
      
      const metricResult: CalculatedMetricResult = {
        metric: def,
        beforeAfter: ba,
        dollarValue: result.value,
        label: result.label,
        isStrong: result.isStrong,
        liftPercent,
      };
      
      if (def.category === 'financial') {
        totalFinancialValue += result.value;
        metricResults.push(metricResult);
      } else if (def.category === 'operational') {
        totalHoursSaved += result.value; // hours for operational metrics
        metricResults.push(metricResult);
      } else {
        qualityIndicators.push(metricResult);
      }
    }
  }
  
  // Calculate time allocation
  const { hardSavings, capacityUnlocked, qualityOfLife } = state.timeAllocation;
  
  const hardSavingsHours = totalHoursSaved * (hardSavings / 100);
  const capacityHours = totalHoursSaved * (capacityUnlocked / 100);
  const qolHours = totalHoursSaved * (qualityOfLife / 100);
  
  const timeAllocationResults: TimeAllocationResults = {
    totalHoursSaved,
    hardSavings: {
      hours: hardSavingsHours,
      dollarValue: Math.round(hardSavingsHours * MEASURE_CONSTANTS.OVERTIME_HOURLY_RATE),
    },
    capacityUnlocked: {
      hours: capacityHours,
      additionalVisits: Math.round(capacityHours * 60 / MEASURE_CONSTANTS.MINUTES_PER_VISIT),
      dollarValue: Math.round(capacityHours * 60 / MEASURE_CONSTANTS.MINUTES_PER_VISIT * MEASURE_CONSTANTS.REVENUE_PER_VISIT),
    },
    qualityOfLife: {
      hours: qolHours,
      hoursPerProviderPerWeek: state.deployment.providers > 0 
        ? qolHours / state.deployment.providers / MEASURE_CONSTANTS.WEEKS_PER_YEAR
        : 0,
    },
  };
  
  // Total operational value = hard savings only (capacity and QoL are non-dollar or separate)
  const totalOperationalValue = timeAllocationResults.hardSavings.dollarValue;
  
  const totalValue = totalFinancialValue + totalOperationalValue;
  const valuePerProvider = state.deployment.providers > 0 
    ? Math.round(totalValue / state.deployment.providers)
    : 0;
  
  return {
    metricResults,
    totalFinancialValue,
    totalOperationalValue,
    totalValue,
    valuePerProvider,
    timeAllocation: timeAllocationResults,
    qualityIndicators,
  };
}

// Format helpers
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatHours(hours: number): string {
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}K hrs`;
  }
  return `${hours.toLocaleString()} hrs`;
}
