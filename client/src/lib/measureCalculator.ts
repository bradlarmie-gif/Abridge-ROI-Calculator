// MEASURE PATH CALCULATOR
// Natural experiment: comparing Abridge vs non-Abridge encounters for same providers

export type MeasureCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export interface MeasureDeployment {
  organizationName: string;
  providers: number;
  totalProviders: number;
  totalEncounters: number;
  abridgeEncounters: number;
  nonAbridgeEncounters: number;
  utilizationRate: number;
  monthsOnAbridge: number;
}

export interface DocumentationQuality {
  wrvuWithout: number;
  wrvuWith: number;
  emLevelWithout: number;
  emLevelWith: number;
}

export interface TimeEfficiency {
  timeInNotesWithout: number;
  timeInNotesWith: number;
  timeToCloseWithout: number;
  timeToCloseWith: number;
  sameDayClosureWithout: number;
  sameDayClosureWith: number;
  workOutsideWithout: number;
  workOutsideWith: number;
}

export interface TimeAllocation {
  hardSavingsPercent: number;
  capacityPercent: number;
  qualityOfLifePercent: number;
}

export interface Calibration {
  otHourlyRate: number;
  minutesPerVisit: number;
  revenuePerVisit: number;
  conversionFactor: number;
}

// Monthly trend data for advanced mode
export interface MonthlyMetricData {
  wrvu: number[];
  emLevel: number[];
  timeInNotes: number[];
  sameDayClosure: number[];
}

export interface TrendConfig {
  enabled: boolean;
  monthlyData: MonthlyMetricData;
}

export interface EMDistribution {
  level1: number; // 99211
  level2: number; // 99212
  level3: number; // 99213
  level4: number; // 99214
  level5: number; // 99215
}

export interface CustomMetric {
  id: string;
  label: string;
  before: number;
  after: number;
  section: string;
}

export type DataSource = 'analytics' | 'benchmark' | 'estimate';

export interface MeasureState {
  careSetting: MeasureCareSetting | null;
  dataSource: DataSource;
  goLiveDate: string | null;
  deployment: MeasureDeployment;
  documentationQuality: DocumentationQuality;
  timeEfficiency: TimeEfficiency;
  allocation: TimeAllocation;
  calibration: Calibration;
  trendConfig: TrendConfig;
  emDistribution: {
    without: EMDistribution;
    with: EMDistribution;
  };
  settingData: Partial<Record<MeasureCareSetting, Record<string, number>>>;
  customMetrics: CustomMetric[];
  expansionTargets?: {
    targetAdoption: number;
    targetProviders: number;
  };
}

export const DEFAULT_MEASURE_STATE: MeasureState = {
  careSetting: null,
  dataSource: 'estimate',
  goLiveDate: null,
  deployment: {
    organizationName: '',
    providers: 0,
    totalProviders: 0,
    totalEncounters: 0,
    abridgeEncounters: 0,
    nonAbridgeEncounters: 0,
    utilizationRate: 0,
    monthsOnAbridge: 0,
  },
  documentationQuality: {
    wrvuWithout: 0,
    wrvuWith: 0,
    emLevelWithout: 0,
    emLevelWith: 0,
  },
  timeEfficiency: {
    timeInNotesWithout: 0,
    timeInNotesWith: 0,
    timeToCloseWithout: 0,
    timeToCloseWith: 0,
    sameDayClosureWithout: 0,
    sameDayClosureWith: 0,
    workOutsideWithout: 0,
    workOutsideWith: 0,
  },
  allocation: {
    hardSavingsPercent: 50,
    capacityPercent: 20,
    qualityOfLifePercent: 30,
  },
  calibration: {
    otHourlyRate: 150,
    minutesPerVisit: 30,
    revenuePerVisit: 200,
    conversionFactor: 33,
  },
  trendConfig: {
    enabled: false,
    monthlyData: {
      wrvu: [],
      emLevel: [],
      timeInNotes: [],
      sameDayClosure: [],
    },
  },
  emDistribution: {
    without: {
      level1: 8,
      level2: 15,
      level3: 38,
      level4: 28,
      level5: 11,
    },
    with: {
      level1: 4,
      level2: 10,
      level3: 32,
      level4: 36,
      level5: 18,
    },
  },
  settingData: {},
  customMetrics: [],
};

export interface MeasureResults {
  wrvuDelta: number;
  wrvuDeltaPercent: number;
  emLevelDelta: number;
  
  timeInNotesDelta: number;
  timeInNotesDeltaPercent: number;
  timeToCloseDelta: number;
  timeToCloseDeltaPercent: number;
  sameDayClosureDelta: number;
  workOutsideDelta: number;
  workOutsideDeltaPercent: number;
  
  totalHoursSaved: number;
  
  hardSavingsHours: number;
  hardSavingsValue: number;
  
  capacityHours: number;
  capacityVisits: number;
  capacityValue: number;
  
  qualityHours: number;
  qualityHoursPerWeek: number;
  
  wrvuValue: number;
  emValue: number;
  documentationQualityTotal: number;
  
  timeReallocatedTotal: number;
  totalValue: number;
}

export function calculateMeasureResults(state: MeasureState): MeasureResults {
  const { deployment, documentationQuality, timeEfficiency, allocation, calibration } = state;
  
  const wrvuDelta = documentationQuality.wrvuWith - documentationQuality.wrvuWithout;
  const wrvuDeltaPercent = (wrvuDelta / documentationQuality.wrvuWithout) * 100;
  const emLevelDelta = documentationQuality.emLevelWith - documentationQuality.emLevelWithout;
  
  const timeInNotesDelta = timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith;
  const timeInNotesDeltaPercent = (timeInNotesDelta / timeEfficiency.timeInNotesWithout) * 100;
  const timeToCloseDelta = timeEfficiency.timeToCloseWithout - timeEfficiency.timeToCloseWith;
  const timeToCloseDeltaPercent = (timeToCloseDelta / timeEfficiency.timeToCloseWithout) * 100;
  const sameDayClosureDelta = timeEfficiency.sameDayClosureWith - timeEfficiency.sameDayClosureWithout;
  const workOutsideDelta = timeEfficiency.workOutsideWithout - timeEfficiency.workOutsideWith;
  const workOutsideDeltaPercent = (workOutsideDelta / timeEfficiency.workOutsideWithout) * 100;
  
  const adoptedEncounters = Math.round(deployment.totalEncounters * (deployment.utilizationRate / 100));
  const totalHoursSaved = (timeInNotesDelta * adoptedEncounters) / 60;
  
  const hardSavingsHours = totalHoursSaved * (allocation.hardSavingsPercent / 100);
  const hardSavingsValue = hardSavingsHours * calibration.otHourlyRate;
  
  const capacityHours = totalHoursSaved * (allocation.capacityPercent / 100);
  const capacityVisits = capacityHours / (calibration.minutesPerVisit / 60);
  const capacityValue = capacityVisits * calibration.revenuePerVisit;
  
  const qualityHours = totalHoursSaved * (allocation.qualityOfLifePercent / 100);
  const qualityHoursPerWeek = deployment.providers > 0 ? qualityHours / deployment.providers / (deployment.monthsOnAbridge * 4.33) : 0;
  
  // Attribution range is 50-75%; calculator uses conservative floor (0.50).
  // Display pages show the full 0.50–0.75 range for transparency.
  const wrvuValue = wrvuDelta * adoptedEncounters * calibration.conversionFactor * 0.50;
  
  const emValuePerLevel = 15;
  const emValue = emLevelDelta * adoptedEncounters * emValuePerLevel * 0.50;
  
  const documentationQualityTotal = wrvuValue + emValue;
  const timeReallocatedTotal = hardSavingsValue + capacityValue;
  const totalValue = documentationQualityTotal + timeReallocatedTotal;
  
  return {
    wrvuDelta,
    wrvuDeltaPercent,
    emLevelDelta,
    timeInNotesDelta,
    timeInNotesDeltaPercent,
    timeToCloseDelta,
    timeToCloseDeltaPercent,
    sameDayClosureDelta,
    workOutsideDelta,
    workOutsideDeltaPercent,
    totalHoursSaved,
    hardSavingsHours,
    hardSavingsValue,
    capacityHours,
    capacityVisits,
    capacityValue,
    qualityHours,
    qualityHoursPerWeek,
    wrvuValue,
    emValue,
    documentationQualityTotal,
    timeReallocatedTotal,
    totalValue,
  };
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function formatPercent(value: number, showSign = false): string {
  const rounded = Math.round(value);
  if (showSign && rounded > 0) {
    return `+${rounded}%`;
  }
  return `${rounded}%`;
}

export function formatDelta(value: number, suffix = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${suffix}`;
}

export function getEMDistributionArray(dist: EMDistribution): { level: string; percent: number }[] {
  return [
    { level: '99211', percent: dist.level1 },
    { level: '99212', percent: dist.level2 },
    { level: '99213', percent: dist.level3 },
    { level: '99214', percent: dist.level4 },
    { level: '99215', percent: dist.level5 },
  ];
}

export interface TrendDataPoint {
  month: string;
  abridge: number;
  baseline: number;
}

export function generateTrendData(
  state: MeasureState,
  metric: string
): TrendDataPoint[] {
  const months = state.deployment.monthsOnAbridge;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data: TrendDataPoint[] = [];
  
  // Get baseline (without) and current (with) values from state
  const metricValues: Record<string, { baseline: number; current: number }> = {
    wrvu: { 
      baseline: state.documentationQuality.wrvuWithout, 
      current: state.documentationQuality.wrvuWith 
    },
    emLevel: { 
      baseline: state.documentationQuality.emLevelWithout, 
      current: state.documentationQuality.emLevelWith 
    },
    timeInNotes: { 
      baseline: state.timeEfficiency.timeInNotesWithout, 
      current: state.timeEfficiency.timeInNotesWith 
    },
    sameDayClosure: { 
      baseline: state.timeEfficiency.sameDayClosureWithout, 
      current: state.timeEfficiency.sameDayClosureWith 
    },
  };
  
  const config = metricValues[metric] || metricValues.wrvu;
  const trendConfig = state.trendConfig;
  
  // Check if we have real monthly data for this metric
  const monthlyValues = trendConfig.enabled ? 
    trendConfig.monthlyData[metric as keyof MonthlyMetricData] : [];
  
  for (let i = 0; i < months; i++) {
    let abridgeValue: number;
    
    if (monthlyValues && monthlyValues.length > i && monthlyValues[i] !== undefined) {
      // Use real monthly data if available
      abridgeValue = monthlyValues[i];
    } else {
      // Interpolate from baseline to current with slight curve
      // Month 1 starts closer to baseline, final month reaches current value
      const progress = months > 1 ? i / (months - 1) : 1;
      // Use easeOutQuad curve for more realistic adoption curve
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      abridgeValue = config.baseline + (config.current - config.baseline) * easedProgress;
    }
    
    data.push({
      month: `Month ${i + 1}`,
      baseline: config.baseline,
      abridge: Number(abridgeValue.toFixed(2)),
    });
  }
  
  return data;
}

export interface ExpansionResults {
  currentAdoptedEncounters: number;
  currentNonAdoptedEncounters: number;
  deepenAdoptionRate: number;
  deepenEncounters: number;
  deepenHoursSaved: number;
  deepenAdditionalValue: number;
  expandProviders: number;
  expandValueLow: number;
  expandValueHigh: number;
  combinedProviders: number;
  combinedAdoptionRate: number;
  combinedValueLow: number;
  combinedValueHigh: number;
  perProviderValue: number;
  perEncounterValueLow: number;
  perEncounterValueHigh: number;
  hoursPerProvider: number;
  remainingProviders: number;
}

export type MaturityStage = 'unmeasured' | 'signaling' | 'validated' | 'strategic';
export type DomainStatus = 'no-data' | 'baseline-only' | 'signaling' | 'validated';

export interface EngagementContext {
  phase: 1 | 2 | 3 | 4;
  phaseLabel: string;
  phaseSubLabel: string;
  maturityStage: MaturityStage;
  maturityLabel: string;
  maturityNext: string;
  activeDomainsExpected: string[];
  phaseMonthsElapsed: number;
  monthsOnAbridge: number;
}

export function getMonthsFromGoLive(goLiveDate: string | null, fallback: number): number {
  if (!goLiveDate) return fallback;
  const start = new Date(goLiveDate);
  const now = new Date();
  const diff = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, Math.round(diff));
}

export function deriveEngagementContext(state: MeasureState): EngagementContext {
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const util = state.deployment.utilizationRate;
  const setting = state.careSetting || 'outpatient';
  const domainStatus = computeDomainStatus(state);
  const activeDomains = Object.values(domainStatus).filter(s => s === 'signaling' || s === 'validated').length;

  let phase: 1 | 2 | 3 | 4;
  let phaseLabel: string;
  if (months < 3) { phase = 1; phaseLabel = 'Documentation Fidelity'; }
  else if (months < 6) { phase = 2; phaseLabel = 'Efficiency'; }
  else if (months < 18) { phase = 3; phaseLabel = setting === 'inpatient' ? 'Patient Flow' : setting === 'ed' ? 'Throughput' : 'Capacity'; }
  else { phase = 4; phaseLabel = 'Strategic Proof'; }

  const phaseSubLabel = setting === 'inpatient' ? 'Patient Flow' : setting === 'ed' ? 'Throughput' : 'Capacity';

  let maturityStage: MaturityStage;
  let maturityLabel: string;
  if (months < 3 || util < 20) { maturityStage = 'unmeasured'; maturityLabel = 'Unmeasured'; }
  else if (months > 18 && util > 70) { maturityStage = 'strategic'; maturityLabel = 'Strategic'; }
  else if (months >= 9 || (util > 60 && activeDomains >= 3)) { maturityStage = 'validated'; maturityLabel = 'Validated'; }
  else { maturityStage = 'signaling'; maturityLabel = 'Signaling'; }

  const stageOrder: MaturityStage[] = ['unmeasured', 'signaling', 'validated', 'strategic'];
  const stageLabels: Record<MaturityStage, string> = { unmeasured: 'Unmeasured', signaling: 'Signaling', validated: 'Validated', strategic: 'Strategic' };
  const idx = stageOrder.indexOf(maturityStage);
  const maturityNext = idx < stageOrder.length - 1 ? stageLabels[stageOrder[idx + 1]] : 'Strategic';

  const activeDomainsExpected: string[] = [];
  if (phase >= 1) activeDomainsExpected.push('quality');
  if (phase >= 2) { activeDomainsExpected.push('workforce'); activeDomainsExpected.push('revenue'); }
  if (phase >= 3) activeDomainsExpected.push('capacity');

  return { phase, phaseLabel, phaseSubLabel, maturityStage, maturityLabel, maturityNext, activeDomainsExpected, phaseMonthsElapsed: months, monthsOnAbridge: months };
}

export function computeDomainStatus(state: MeasureState): Record<'quality' | 'workforce' | 'revenue' | 'capacity', DomainStatus> {
  const { documentationQuality: dq, timeEfficiency: te, deployment } = state;
  const months = getMonthsFromGoLive(state.goLiveDate, deployment.monthsOnAbridge);
  const settingData = state.settingData[state.careSetting || 'outpatient'] || {};

  const emDelta = dq.emLevelWith - dq.emLevelWithout;
  const wrvuDelta = dq.wrvuWith - dq.wrvuWithout;
  const cdiQueryDelta = Math.max(0, (settingData.cdiQueriesPer100_before ?? 0) - (settingData.cdiQueriesPer100_after ?? 0));
  const hasQualityData = emDelta !== 0 || wrvuDelta !== 0 || cdiQueryDelta > 0;
  const qualitySignaling = emDelta > 0 || wrvuDelta > 0 || cdiQueryDelta > 0;

  const timeInNotesDelta = te.timeInNotesWithout - te.timeInNotesWith;
  const workOutsideDelta = te.workOutsideWithout - te.workOutsideWith;
  const hasWorkforceData = timeInNotesDelta !== 0 || workOutsideDelta !== 0;
  const workforceSignaling = timeInNotesDelta > 0 || workOutsideDelta > 0;

  const cmiDelta = (settingData.cmi_after ?? 0) - (settingData.cmi_before ?? 0);
  const denialsDelta = (settingData.denialsPer100_before ?? 0) - (settingData.denialsPer100_after ?? 0);
  const hasRevenueData = wrvuDelta !== 0 || cmiDelta !== 0 || denialsDelta !== 0;
  const revenueSignaling = wrvuDelta > 0 || cmiDelta > 0 || denialsDelta > 0;

  const sameDayDelta = te.sameDayClosureWith - te.sameDayClosureWithout;
  const hasCapacityData = months >= 6 && (sameDayDelta > 0 || timeInNotesDelta > 3);

  function status(hasData: boolean, isSignaling: boolean): DomainStatus {
    if (!hasData) return 'no-data';
    if (isSignaling) return 'signaling';
    return 'baseline-only';
  }

  return {
    quality: status(hasQualityData, qualitySignaling),
    workforce: status(hasWorkforceData, workforceSignaling),
    revenue: status(hasRevenueData, revenueSignaling),
    capacity: status(hasCapacityData, hasCapacityData),
  };
}

export const BENCHMARK_RANGES: Record<string, Record<number, { low: number; high: number }>> = {
  outpatient: { 2: { low: 4000, high: 8000 }, 3: { low: 4000, high: 8000 }, 4: { low: 8000, high: 15000 } },
  ed: { 2: { low: 5000, high: 10000 }, 3: { low: 5000, high: 10000 }, 4: { low: 5000, high: 10000 } },
  inpatient: { 2: { low: 6000, high: 12000 }, 3: { low: 6000, high: 12000 }, 4: { low: 6000, high: 12000 } },
  nursing: { 2: { low: 3000, high: 6000 }, 3: { low: 3000, high: 6000 }, 4: { low: 3000, high: 6000 } },
};

export function calculateExpansionResults(
  state: MeasureState,
  totalValueLow: number,
  totalValueHigh: number,
  totalHoursSaved: number,
  targetAdoption?: number,
  targetProviders?: number,
): ExpansionResults {
  const { deployment } = state;
  const currentRate = Math.max(deployment.utilizationRate, 1) / 100;
  const deepenRate = (targetAdoption ?? 80) / 100;

  const currentAdoptedEncounters = Math.round(deployment.totalEncounters * currentRate);
  const currentNonAdoptedEncounters = deployment.totalEncounters - currentAdoptedEncounters;

  const deepenEncounters = Math.round(deployment.totalEncounters * deepenRate);
  const deepenScale = currentRate > 0 ? deepenRate / currentRate : 1;
  const deepenHoursSaved = totalHoursSaved * deepenScale;
  const deepenAdditionalValueLow = totalValueLow * (deepenScale - 1);
  const deepenAdditionalValueHigh = totalValueHigh * (deepenScale - 1);
  const deepenAdditionalValue = (deepenAdditionalValueLow + deepenAdditionalValueHigh) / 2;

  const expandTarget = targetProviders != null
    ? Math.max(targetProviders, deployment.providers)
    : Math.max(deployment.totalProviders, deployment.providers);
  const expandScale = deployment.providers > 0 ? expandTarget / deployment.providers : 1;
  const expandValueLow = totalValueLow * expandScale;
  const expandValueHigh = totalValueHigh * expandScale;

  const combinedProviders = expandTarget;
  const combinedAdoptionRate = deepenRate * 100;
  const combinedScale = expandScale * deepenScale;
  const combinedValueLow = totalValueLow * combinedScale;
  const combinedValueHigh = totalValueHigh * combinedScale;

  const avgValue = (totalValueLow + totalValueHigh) / 2;
  const perProviderValue = deployment.providers > 0 ? avgValue / deployment.providers : 0;
  const perEncounterValueLow = deployment.totalEncounters > 0 ? totalValueLow / deployment.totalEncounters : 0;
  const perEncounterValueHigh = deployment.totalEncounters > 0 ? totalValueHigh / deployment.totalEncounters : 0;
  const hoursPerProvider = deployment.providers > 0 ? totalHoursSaved / deployment.providers : 0;
  const remainingProviders = Math.max(0, expandTarget - deployment.providers);

  return {
    currentAdoptedEncounters,
    currentNonAdoptedEncounters,
    deepenAdoptionRate: deepenRate * 100,
    deepenEncounters,
    deepenHoursSaved,
    deepenAdditionalValue,
    expandProviders: expandTarget,
    expandValueLow,
    expandValueHigh,
    combinedProviders,
    combinedAdoptionRate,
    combinedValueLow,
    combinedValueHigh,
    perProviderValue,
    perEncounterValueLow,
    perEncounterValueHigh,
    hoursPerProvider,
    remainingProviders,
  };
}
