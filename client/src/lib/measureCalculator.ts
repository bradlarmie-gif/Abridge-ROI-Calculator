// MEASURE PATH CALCULATOR
// Natural experiment: comparing Abridge vs non-Abridge encounters for same providers

export type MeasureCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

export interface MeasureDeployment {
  providers: number;
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

export interface MeasureState {
  careSetting: MeasureCareSetting | null;
  deployment: MeasureDeployment;
  documentationQuality: DocumentationQuality;
  timeEfficiency: TimeEfficiency;
  allocation: TimeAllocation;
  calibration: Calibration;
}

export const DEFAULT_MEASURE_STATE: MeasureState = {
  careSetting: null,
  deployment: {
    providers: 80,
    totalEncounters: 47000,
    abridgeEncounters: 34000,
    nonAbridgeEncounters: 13000,
    utilizationRate: 72,
    monthsOnAbridge: 6,
  },
  documentationQuality: {
    wrvuWithout: 2.1,
    wrvuWith: 2.3,
    emLevelWithout: 3.2,
    emLevelWith: 3.5,
  },
  timeEfficiency: {
    timeInNotesWithout: 12,
    timeInNotesWith: 4,
    timeToCloseWithout: 4.2,
    timeToCloseWith: 1.1,
    sameDayClosureWithout: 41,
    sameDayClosureWith: 78,
    workOutsideWithout: 2.1,
    workOutsideWith: 0.4,
  },
  allocation: {
    hardSavingsPercent: 20,
    capacityPercent: 15,
    qualityOfLifePercent: 65,
  },
  calibration: {
    otHourlyRate: 150,
    minutesPerVisit: 30,
    revenuePerVisit: 200,
    conversionFactor: 33,
  },
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
  
  const totalHoursSaved = (timeInNotesDelta * deployment.abridgeEncounters) / 60;
  
  const hardSavingsHours = totalHoursSaved * (allocation.hardSavingsPercent / 100);
  const hardSavingsValue = hardSavingsHours * calibration.otHourlyRate;
  
  const capacityHours = totalHoursSaved * (allocation.capacityPercent / 100);
  const capacityVisits = capacityHours / (calibration.minutesPerVisit / 60);
  const capacityValue = capacityVisits * calibration.revenuePerVisit;
  
  const qualityHours = totalHoursSaved * (allocation.qualityOfLifePercent / 100);
  const qualityHoursPerWeek = deployment.providers > 0 ? qualityHours / deployment.providers / 52 : 0;
  
  const wrvuValue = wrvuDelta * deployment.abridgeEncounters * calibration.conversionFactor * 0.5;
  
  const emValuePerLevel = 15;
  const emValue = emLevelDelta * deployment.abridgeEncounters * emValuePerLevel * 0.5;
  
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

export const EM_DISTRIBUTION_WITHOUT = [
  { level: '99211', percent: 8 },
  { level: '99212', percent: 15 },
  { level: '99213', percent: 38 },
  { level: '99214', percent: 28 },
  { level: '99215', percent: 11 },
];

export const EM_DISTRIBUTION_WITH = [
  { level: '99211', percent: 4 },
  { level: '99212', percent: 10 },
  { level: '99213', percent: 32 },
  { level: '99214', percent: 36 },
  { level: '99215', percent: 18 },
];

export function generateTrendData(months: number, metric: string): { month: string; abridge: number; baseline: number }[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data: { month: string; abridge: number; baseline: number }[] = [];
  
  const baseValues: Record<string, { baseline: number; abridgeStart: number; growth: number }> = {
    wrvu: { baseline: 2.1, abridgeStart: 2.2, growth: 0.02 },
    emLevel: { baseline: 3.2, abridgeStart: 3.3, growth: 0.03 },
    timeInNotes: { baseline: 12, abridgeStart: 6, growth: -0.3 },
    sameDayClosure: { baseline: 41, abridgeStart: 65, growth: 2 },
  };
  
  const config = baseValues[metric] || baseValues.wrvu;
  
  for (let i = 0; i < months; i++) {
    data.push({
      month: monthNames[i % 12],
      baseline: config.baseline,
      abridge: config.abridgeStart + (config.growth * i),
    });
  }
  
  return data;
}
