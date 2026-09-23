// MEASURE PATH CALCULATOR
// Natural experiment: comparing Abridge vs non-Abridge encounters for same providers

import { getTotalAvailableMetrics as getTotalAvailableMetricsFromConfig, OUTPATIENT_METRICS, ED_METRICS, INPATIENT_METRICS, NURSING_METRICS } from './measureCareSettings';

export type MeasureCareSetting = 'outpatient' | 'ed' | 'nursing' | 'inpatient';

import type { ExploreSetting, CustomDriverDef, ExploreDriver } from "./exploreDrivers";
import type { ForecastScenarioLevel } from "./forecastDefaults";
import type { PricingScenario } from "./forecastPricing";

export interface ForecastAddedSetting {
  id: string;
  setting: ExploreSetting;
  providers: number;
  utilizationPercent: number;
  encounters: number;
  staffedBeds: number;
  occupancyPercent: number;
  scenario: ForecastScenarioLevel;
  customValueOverride?: number;
}

export interface ForecastScenario {
  providers: number;
  utilizationPercent: number;
  encounters: number;
  staffedBeds: number;
  occupancyPercent: number;
  addedSettings: ForecastAddedSetting[];
  pricingScenarios: PricingScenario[];
  forecastYears?: 1 | 2 | 3;
}

export interface SettingForecastValues {
  providers: number;
  utilizationPercent: number;
  encounters: number;
  staffedBeds: number;
  occupancyPercent: number;
}

export interface MeasureDeployment {
  organizationName: string;
  providers: number;
  liveProviders: number;
  mruProviders: number;
  totalProviders: number;
  totalEncounters: number;
  abridgeEncounters: number;
  nonAbridgeEncounters: number;
  utilizationRate: number;
  encounterCoverageRate: number;
  mruActivationRate: number;
  monthsOnAbridge: number;
  annualContractValue?: number;
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
  // Avg value of a clean (recovered) OP/ED claim — used to dollarize denial-rate
  // improvement. Inpatient uses its own per-case value (vm_denialCostPerCase).
  avgClaimValue?: number;
}

export type MonthlyMetricData = Record<string, number[]>;

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

export interface SurveyMetric {
  id: string;
  label: string;
  before: number;
  after: number;
  unit?: string;
  domain: string;
  setting?: MeasureCareSetting;
}

export type DataSource = 'analytics' | 'benchmark' | 'estimate';

export type MetricDataSource = 'ehr' | 'survey';

export type EntryDataSource = 'ehr' | 'survey' | 'admin_data' | 'chart_review' | 'manual_entry';

export interface MeasureQuote {
  id: string;
  text: string;
  attribution: string;
  role?: string;
}

export interface MetricValue {
  before: number | null;
  after: number | null;
  singleValue: number | null;
}

export interface MetricEntry {
  before: number | null;
  after: number | null;
  monthlyData?: number[];
  isMonthlyMode: boolean;
}

export function metricKey(metricId: string, setting?: MeasureCareSetting): string {
  return setting ? `${metricId}__${setting}` : metricId;
}

export interface AbridgeNativeDataModel {
  utilization: number | null;
  consentRate: number | null;
  userRetention: number | null;
  noteStarRatingBefore: number | null;
  noteStarRatingAfter: number | null;
}

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
  abridgeNativeData: Partial<Record<string, number>>;
  customMetrics: CustomMetric[];
  surveyMetrics: SurveyMetric[];
  outpatientMetrics: Record<string, MetricValue>;
  outpatientNativeData: AbridgeNativeDataModel;
  edMetrics: Record<string, MetricValue>;
  edAbridgeNativeData: {
    docTimePerEncounter?: MetricValue;
    wowTime?: MetricValue;
    noteQualityScore?: MetricValue;
  };
  inpatientMetrics: Record<string, MetricValue>;
  inpatientAbridgeNativeData: {
    docTimePerNote?: MetricValue;
    noteQualityScore?: MetricValue;
    wowTime?: MetricValue;
  };
  nursingMetrics: Record<string, MetricValue>;
  nursingAbridgeNativeData: {
    docTimePerShift?: MetricValue;
    noteQualityScore?: MetricValue;
  };
  metricValues: Record<string, MetricEntry>;
  enabledMetrics: Partial<Record<MeasureCareSetting, Record<string, boolean>>>;
  activeCareSettings: MeasureCareSetting[];
  expansionTargets?: {
    targetAdoption: number;
    targetProviders: number;
  };
  scenarioOverrides?: {
    conservative?: ScenarioInputs;
    typical?: ScenarioInputs;
    optimistic?: ScenarioInputs;
    conservativeCustom?: boolean;
    typicalCustom?: boolean;
    optimisticCustom?: boolean;
  };
  streamStates?: Record<string, boolean>;
  emEligibilityRate?: number;
  maEncounterPct?: number;
  censusConstrained?: boolean;
  trackedDrivers: Record<string, Record<string, MeasureDriverEntry>>;
  forecastScenario: ForecastScenario;
  settingForecasts?: Record<string, SettingForecastValues>;
  settingForecastYears?: Record<string, SettingForecastValues[]>;
  // Per setting: whether projected Annual Encounters ride the projected provider
  // count (at the baseline encounters-per-provider ratio). Undefined = linked.
  encountersLinked?: Record<string, boolean>;
  maturityPhase: MaturityStage | null;
  quotes?: MeasureQuote[];
  customDriverDefs?: Record<string, CustomDriverDef>;
}

export interface MeasureDriverEntry {
  driverId: string;
  withoutAbridge: number;
  withAbridge: number;
  valuePerUnit: number;
  attributionPercent: number;
  expanded: boolean;
  notes?: string;
  isMonthlyMode?: boolean;
  monthlyData?: Array<{ month: string; withAbridge: number; withoutAbridge: number }>;
  lowerIsBetter?: boolean;
  distributionData?: { before: Record<string, number>; after: Record<string, number> };
  scaleValue?: number;
  scaleDivisor?: number;
  measuredAt?: string;
  entryDataSource?: EntryDataSource;
  populationType?: string;
  serviceLineRows?: Array<{ serviceLine: string; withoutAbridge: number; withAbridge: number }>;
}

/**
 * Single source of truth for a tracked driver's realized annual $ value.
 * Used by the Measure output screen AND its exported PDF so the two cannot
 * disagree. Per-encounter-rate drivers scale by the setting's Abridge encounter
 * count; everything else scales by scaleValue/scaleDivisor (default 1).
 */
export function computeRealizedDriverValue(
  driver: ExploreDriver,
  entry: MeasureDriverEntry,
  abridgeEncounters?: number,
): number {
  const md = driver.measureDefaults;
  if (driver.visibility !== "quantified" || !md) return 0;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const lowerIsBetter = md?.lowerIsBetter ?? entry.lowerIsBetter ?? false;
  const delta = lowerIsBetter ? effWithout - effWith : effWith - effWithout;
  const scale = md.isPerEncounterRate && (abridgeEncounters ?? 0) > 0
    ? abridgeEncounters!
    : (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
      ? entry.scaleValue / entry.scaleDivisor
      : 1;
  return Math.round(delta * entry.valuePerUnit * scale * (entry.attributionPercent / 100));
}

// ── Rollout sensitivity grid (shared by the Measure screen + its PDF) ──
// breadth = % of target providers enrolled; depth = % encounter utilization.
export interface RolloutSensitivityCell {
  breadthPct: number;
  depthPct: number;
  providers: number;
  value: number;
  roi: number | null;
  isSnap: boolean; // the "Now" cell = current deployment baseline
}
export interface RolloutSensitivity {
  breadths: number[];
  depths: number[];
  snapRow: number;
  snapCol: number;
  hasInvestment: boolean;
  cells: RolloutSensitivityCell[];
}

const SENS_BREADTHS = [50, 75, 100];
const SENS_DEPTHS = [50, 70, 90];

export function computeRolloutSensitivity(p: {
  totalRealized: number;
  combinedProviders: number;
  baselineProviderCount: number;
  baselineUtilPct: number;
  investment: number;
}): RolloutSensitivity {
  const { totalRealized, combinedProviders, baselineProviderCount, baselineUtilPct, investment } = p;
  const snapRow = combinedProviders > 0
    ? SENS_BREADTHS.reduce((best, r) => {
        const bPct = (baselineProviderCount / combinedProviders) * 100;
        return Math.abs(r - bPct) < Math.abs(best - bPct) ? r : best;
      }, 100)
    : 100;
  const snapCol = SENS_DEPTHS.reduce((best, c) =>
    Math.abs(c - baselineUtilPct) < Math.abs(best - baselineUtilPct) ? c : best, 70);
  const baseScale = baselineProviderCount * (baselineUtilPct / 100);
  const cells: RolloutSensitivityCell[] = [];
  for (const breadthPct of SENS_BREADTHS) {
    const providers = Math.round(combinedProviders * (breadthPct / 100));
    for (const depthPct of SENS_DEPTHS) {
      const cellScale = baseScale > 0 ? (providers * (depthPct / 100)) / baseScale : 0;
      const value = Math.round(totalRealized * cellScale);
      cells.push({
        breadthPct,
        depthPct,
        providers,
        value,
        roi: investment > 0 ? value / investment : null,
        isSnap: breadthPct === snapRow && depthPct === snapCol,
      });
    }
  }
  return { breadths: SENS_BREADTHS, depths: SENS_DEPTHS, snapRow, snapCol, hasInvestment: investment > 0, cells };
}

export function getEffectiveWithWithout(entry: MeasureDriverEntry): { withAbridge: number; withoutAbridge: number } {
  if (entry.isMonthlyMode && entry.monthlyData && entry.monthlyData.length > 0) {
    const sorted = [...entry.monthlyData].sort((a, b) => a.month.localeCompare(b.month));
    const latest = sorted[sorted.length - 1];
    return { withAbridge: latest.withAbridge, withoutAbridge: latest.withoutAbridge };
  }
  return { withAbridge: entry.withAbridge, withoutAbridge: entry.withoutAbridge };
}

export function getRealizedValueForEntry(
  entry: MeasureDriverEntry,
  isQuantifiable: boolean,
): number {
  if (!isQuantifiable) return 0;
  const { withAbridge, withoutAbridge } = getEffectiveWithWithout(entry);
  const delta = entry.lowerIsBetter ? withoutAbridge - withAbridge : withAbridge - withoutAbridge;
  const scale = (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
    ? entry.scaleValue / entry.scaleDivisor
    : 1;
  return Math.round(delta * entry.valuePerUnit * scale * (entry.attributionPercent / 100));
}

export const CONFIDENCE_LABELS: Record<string, string> = {
  unmeasured: 'Benchmark estimate',
  emerging: 'Directional estimate',
  demonstrated: 'Based on measured outcomes',
  strategic: 'Financially documented',
};

export const EM_TO_WRVU: Record<number, number> = { 1: 0.48, 2: 0.93, 3: 1.40, 4: 1.92, 5: 2.80 };

export const DEFAULT_STREAM_STATES: Record<string, boolean> = {
  billingCapture: true,
  revenueRecovery: true,
  hccCapture: true,
  patientFlow: true,
  capacityRevenue: true,
  costReduction: true,
  physicianRetention: false,
};

export const DEFAULT_MEASURE_STATE: MeasureState = {
  careSetting: null,
  dataSource: 'estimate',
  goLiveDate: null,
  deployment: {
    organizationName: '',
    providers: 0,
    liveProviders: 0,
    mruProviders: 0,
    totalProviders: 0,
    totalEncounters: 0,
    abridgeEncounters: 0,
    nonAbridgeEncounters: 0,
    utilizationRate: 0,
    encounterCoverageRate: 0,
    mruActivationRate: 0,
    monthsOnAbridge: 0,
    annualContractValue: 0,
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
    avgClaimValue: 350,
  },
  trendConfig: {
    enabled: false,
    monthlyData: {},
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
  abridgeNativeData: {},
  customMetrics: [],
  surveyMetrics: [],
  outpatientMetrics: Object.fromEntries(
    OUTPATIENT_METRICS.filter(m => !m.phase3Roadmap).map(m => [m.id, { before: null, after: null, singleValue: null }])
  ),
  outpatientNativeData: {
    utilization: null,
    consentRate: null,
    userRetention: null,
    noteStarRatingBefore: null,
    noteStarRatingAfter: null,
  },
  edMetrics: Object.fromEntries(
    ED_METRICS.filter(m => !m.phase3Roadmap).map(m => [m.id, { before: null, after: null, singleValue: null }])
  ),
  edAbridgeNativeData: {},
  inpatientMetrics: Object.fromEntries(
    INPATIENT_METRICS.filter(m => !m.phase3Roadmap).map(m => [m.id, { before: null, after: null, singleValue: null }])
  ),
  inpatientAbridgeNativeData: {},
  nursingMetrics: Object.fromEntries(
    NURSING_METRICS.filter(m => !m.phase3Roadmap).map(m => [m.id, { before: null, after: null, singleValue: null }])
  ),
  nursingAbridgeNativeData: {},
  metricValues: {},
  enabledMetrics: {},
  activeCareSettings: ['outpatient'],
  trackedDrivers: {},
  forecastScenario: {
    providers: 0,
    utilizationPercent: 0,
    encounters: 0,
    staffedBeds: 0,
    occupancyPercent: 0,
    addedSettings: [],
    pricingScenarios: [],
  },
  settingForecastYears: {},
  maturityPhase: null,
  quotes: [],
  customDriverDefs: {},
};

export function syncOutpatientMetricsToLegacy(state: MeasureState): Partial<MeasureState> {
  const om = { ...state.outpatientMetrics };
  const nd = state.outpatientNativeData;
  if (!om) return {};

  if (nd?.noteStarRatingBefore != null || nd?.noteStarRatingAfter != null) {
    om.note_star_rating = {
      before: nd.noteStarRatingBefore,
      after: nd.noteStarRatingAfter,
      singleValue: null,
    };
  }
  if (nd?.utilization != null) {
    om.utilization = { before: null, after: null, singleValue: nd.utilization };
  }
  if (nd?.consentRate != null) {
    om.consent_rate = { before: null, after: null, singleValue: nd.consentRate };
  }
  if (nd?.userRetention != null) {
    om.user_retention = { before: null, after: null, singleValue: nd.userRetention };
  }

  const documentationQuality: DocumentationQuality = {
    ...state.documentationQuality,
    wrvuWithout: om.wrvu?.before ?? state.documentationQuality.wrvuWithout,
    wrvuWith: om.wrvu?.after ?? state.documentationQuality.wrvuWith,
    emLevelWithout: om.em_level?.before ?? state.documentationQuality.emLevelWithout,
    emLevelWith: om.em_level?.after ?? state.documentationQuality.emLevelWith,
  };

  const timeEfficiency: TimeEfficiency = {
    ...state.timeEfficiency,
    timeInNotesWithout: om.time_in_note?.before ?? state.timeEfficiency.timeInNotesWithout,
    timeInNotesWith: om.time_in_note?.after ?? state.timeEfficiency.timeInNotesWith,
    workOutsideWithout: om.work_outside_work_empirical?.before ?? state.timeEfficiency.workOutsideWithout,
    workOutsideWith: om.work_outside_work_empirical?.after ?? state.timeEfficiency.workOutsideWith,
  };

  const settingData = { ...state.settingData };
  const outpatientData = { ...(settingData.outpatient || {}) };
  if (om.wrvu) {
    outpatientData.wrvuPerEncounter_before = om.wrvu.before ?? 0;
    outpatientData.wrvuPerEncounter_after = om.wrvu.after ?? 0;
  }
  if (om.em_level) {
    outpatientData.emLevel_before = om.em_level.before ?? 0;
    outpatientData.emLevel_after = om.em_level.after ?? 0;
  }
  if (om.time_in_note) {
    outpatientData.timeInNotes_before = om.time_in_note.before ?? 0;
    outpatientData.timeInNotes_after = om.time_in_note.after ?? 0;
  }
  if (om.work_outside_work_empirical) {
    outpatientData.afterHours_before = om.work_outside_work_empirical.before ?? 0;
    outpatientData.afterHours_after = om.work_outside_work_empirical.after ?? 0;
  }
  if (om.time_to_close) {
    outpatientData.daysToClose_before = om.time_to_close.before ?? 0;
    outpatientData.daysToClose_after = om.time_to_close.after ?? 0;
  }
  settingData.outpatient = outpatientData;

  const deployment = { ...state.deployment };
  if (nd?.utilization != null) {
    deployment.utilizationRate = nd.utilization;
  }

  return { documentationQuality, timeEfficiency, settingData, deployment, outpatientMetrics: om };
}

const ED_LEGACY_KEY_MAP: Record<string, string> = {
  docTimePerEncounter: 'timeInNotes',
  workAfterHours: 'afterHours',
  emLevel: 'emLevel',
  wrvu: 'wrvuPerEncounter',
  lwbsRate: 'lwbsRate',
  doorToProvider: 'doorToDoc',
};

export function syncEdMetricsToLegacy(state: MeasureState): Partial<MeasureState> {
  const em = { ...state.edMetrics };
  const nd = state.edAbridgeNativeData;
  if (!em) return {};

  if (nd?.docTimePerEncounter) {
    em.docTimePerEncounter = nd.docTimePerEncounter;
  }
  if (nd?.wowTime) {
    em.wowTime = nd.wowTime;
  }
  if (nd?.noteQualityScore) {
    em.noteQualityScore = nd.noteQualityScore;
  }

  const timeEfficiency: TimeEfficiency = {
    ...state.timeEfficiency,
    timeInNotesWithout: em.docTimePerEncounter?.before ?? state.timeEfficiency.timeInNotesWithout,
    timeInNotesWith: em.docTimePerEncounter?.after ?? state.timeEfficiency.timeInNotesWith,
    workOutsideWithout: em.workAfterHours?.before ?? state.timeEfficiency.workOutsideWithout,
    workOutsideWith: em.workAfterHours?.after ?? state.timeEfficiency.workOutsideWith,
  };

  const documentationQuality: DocumentationQuality = {
    ...state.documentationQuality,
    wrvuWithout: em.wrvu?.before ?? state.documentationQuality.wrvuWithout,
    wrvuWith: em.wrvu?.after ?? state.documentationQuality.wrvuWith,
    emLevelWithout: em.emLevel?.before ?? state.documentationQuality.emLevelWithout,
    emLevelWith: em.emLevel?.after ?? state.documentationQuality.emLevelWith,
  };

  const settingData = { ...state.settingData };
  const edData = { ...(settingData.ed || {}) };
  for (const [newKey, legacyKey] of Object.entries(ED_LEGACY_KEY_MAP)) {
    const mv = em[newKey];
    if (mv) {
      edData[`${legacyKey}_before`] = mv.before ?? 0;
      edData[`${legacyKey}_after`] = mv.after ?? 0;
    }
  }
  settingData.ed = edData;

  return { documentationQuality, timeEfficiency, settingData, edMetrics: em };
}

const INPATIENT_LEGACY_KEY_MAP: Record<string, string> = {
  docTimePerNote: 'timeInNotes',
  workAfterHours: 'afterHours',
  caseMixIndex: 'caseMixIndex',
  lengthOfStay: 'los',
};

export function syncInpatientMetricsToLegacy(state: MeasureState): Partial<MeasureState> {
  const im = { ...state.inpatientMetrics };
  const nd = state.inpatientAbridgeNativeData;

  if (nd?.docTimePerNote) {
    im.docTimePerNote = nd.docTimePerNote;
  }
  if (nd?.noteQualityScore) {
    im.noteQualityScore = nd.noteQualityScore;
  }
  if (nd?.wowTime) {
    im.wowTime = nd.wowTime;
  }

  const timeEfficiency = {
    ...state.timeEfficiency,
    timeInNotesWithout: im.docTimePerNote?.before ?? state.timeEfficiency.timeInNotesWithout,
    timeInNotesWith: im.docTimePerNote?.after ?? state.timeEfficiency.timeInNotesWith,
  };

  const settingData = { ...state.settingData };
  const ipData = { ...(settingData.inpatient || {}) };
  for (const [newKey, legacyKey] of Object.entries(INPATIENT_LEGACY_KEY_MAP)) {
    const mv = im[newKey];
    if (mv) {
      ipData[`${legacyKey}_before`] = mv.before ?? 0;
      ipData[`${legacyKey}_after`] = mv.after ?? 0;
    }
  }
  settingData.inpatient = ipData;

  return { timeEfficiency, settingData, inpatientMetrics: im };
}

const NURSING_LEGACY_KEY_MAP: Record<string, string> = {
  docTimePerShift: 'docTimePerShift',
  chartingAfterShift: 'afterShiftCharting',
  overtimeHours: 'overtimeHours',
};

export function syncNursingMetricsToLegacy(state: MeasureState): Partial<MeasureState> {
  const nm = { ...state.nursingMetrics };
  const nd = state.nursingAbridgeNativeData;

  if (nd?.docTimePerShift) {
    nm.docTimePerShift = nd.docTimePerShift;
  }
  if (nd?.noteQualityScore) {
    nm.noteQualityScore = nd.noteQualityScore;
  }

  const settingData = { ...state.settingData };
  const nursingData = { ...(settingData.nursing || {}) };
  for (const [newKey, legacyKey] of Object.entries(NURSING_LEGACY_KEY_MAP)) {
    const mv = nm[newKey];
    if (mv) {
      nursingData[`${legacyKey}_before`] = mv.before ?? 0;
      nursingData[`${legacyKey}_after`] = mv.after ?? 0;
    }
  }
  settingData.nursing = nursingData;

  return { settingData, nursingMetrics: nm };
}

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
  
  const adoptedEncounters = deployment.abridgeEncounters > 0
    ? deployment.abridgeEncounters
    : Math.round(deployment.totalEncounters * (deployment.encounterCoverageRate / 100));
  const totalHoursSaved = (timeInNotesDelta * adoptedEncounters) / 60;
  
  const hardSavingsHours = totalHoursSaved * (allocation.hardSavingsPercent / 100);
  const hardSavingsValue = hardSavingsHours * calibration.otHourlyRate;
  
  const capacityHours = totalHoursSaved * (allocation.capacityPercent / 100);
  const capacityVisits = capacityHours / (calibration.minutesPerVisit / 60);
  const capacityValue = capacityVisits * calibration.revenuePerVisit;
  
  const qualityHours = totalHoursSaved * (allocation.qualityOfLifePercent / 100);
  const activeMRU = deployment.mruProviders !== undefined ? deployment.mruProviders : deployment.providers;
  const qualityHoursPerWeek = activeMRU > 0 ? qualityHours / activeMRU / (deployment.monthsOnAbridge * 4.33) : 0;
  
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
    const k = Math.round(value / 1000);
    if (k >= 1000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${k}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

export function fmtMoneyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) {
    const k = Math.round(n / 1_000);
    if (Math.abs(k) >= 1_000) return `$${(n / 1_000_000).toFixed(1)}M`; // $999.5k+ rolls to $1.0M, never "$1000K"
    return `$${k.toLocaleString()}K`;
  }
  return `$${Math.round(n).toLocaleString()}`;
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
  
  let config = metricValues[metric];
  if (!config) {
    let baseline = 0;
    let current = 0;
    for (const settingKey of Object.keys(state.settingData || {})) {
      const sd = state.settingData[settingKey as MeasureCareSetting];
      if (sd) {
        const b = sd[`${metric}_before`];
        const a = sd[`${metric}_after`];
        if ((b != null && b !== 0) || (a != null && a !== 0)) {
          baseline = b ?? 0;
          current = a ?? 0;
          break;
        }
      }
    }
    config = { baseline, current };
  }
  const trendConfig = state.trendConfig;
  
  // Check if we have real monthly data for this metric
  const monthlyValues = trendConfig.enabled ? 
    trendConfig.monthlyData[metric] || [] : [];
  
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

export type MaturityStage = 'unmeasured' | 'emerging' | 'demonstrated' | 'strategic';
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
  const util = state.deployment.encounterCoverageRate;
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
  else if (months >= 9 || (util > 60 && activeDomains >= 3)) { maturityStage = 'demonstrated'; maturityLabel = 'Demonstrated'; }
  else { maturityStage = 'emerging'; maturityLabel = 'Emerging'; }

  const stageOrder: MaturityStage[] = ['unmeasured', 'emerging', 'demonstrated', 'strategic'];
  const stageLabels: Record<MaturityStage, string> = { unmeasured: 'Unmeasured', emerging: 'Emerging', demonstrated: 'Demonstrated', strategic: 'Strategic' };
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

export interface ScenarioInputs {
  adoptionRate: number;
  attributionRate: number;
  providers: number;
  encountersPerProvider: number;
}

export interface ScenarioResult {
  label: 'conservative' | 'typical' | 'optimistic' | 'custom';
  inputs: ScenarioInputs;
  annualValue: number;
  hoursReclaimed: number;
  perProviderValue: number;
  isCustomized: boolean;
}

export function getDefaultScenarios(state: MeasureState): {
  conservative: ScenarioInputs;
  typical: ScenarioInputs;
  optimistic: ScenarioInputs;
} {
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const annualFactor = 12 / Math.max(months, 1);
  const baseEncounters = state.deployment.totalEncounters > 0
    ? Math.round((state.deployment.totalEncounters / Math.max(state.deployment.providers, 1)) * annualFactor)
    : 200;

  return {
    conservative: {
      adoptionRate: state.deployment.encounterCoverageRate,
      attributionRate: 50,
      providers: state.deployment.providers,
      encountersPerProvider: baseEncounters,
    },
    typical: {
      adoptionRate: Math.min(75, Math.max(state.deployment.encounterCoverageRate + 15, 60)),
      attributionRate: 62,
      providers: state.deployment.totalProviders > 0 ? state.deployment.totalProviders : state.deployment.providers,
      encountersPerProvider: baseEncounters,
    },
    optimistic: {
      adoptionRate: 90,
      attributionRate: 75,
      providers: state.deployment.totalProviders > 0 ? state.deployment.totalProviders : state.deployment.providers,
      encountersPerProvider: baseEncounters,
    },
  };
}

export function calculateScenario(
  state: MeasureState,
  inputs: ScenarioInputs,
  label: ScenarioResult['label'],
  isCustomized: boolean = false,
): ScenarioResult {
  const te = state.timeEfficiency;
  const cal = state.calibration;
  const dq = state.documentationQuality;

  const timeSavedPerNote = Math.max(0, te.timeInNotesWithout - te.timeInNotesWith);
  const totalEncounters = inputs.providers * inputs.encountersPerProvider;
  const adoptedEncounters = Math.round(totalEncounters * (inputs.adoptionRate / 100));
  const totalHoursSaved = (timeSavedPerNote * adoptedEncounters) / 60;

  const efficiencyValue = totalHoursSaved * 0.5 * cal.otHourlyRate;

  const wrvuLift = dq.wrvuWith - dq.wrvuWithout;
  const wrvuValue = wrvuLift > 0 ? wrvuLift * adoptedEncounters * cal.conversionFactor * (inputs.attributionRate / 100) : 0;

  let settingValue = 0;
  const careSetting = state.careSetting || 'outpatient';
  const settingData = state.settingData?.[careSetting] || {};

  if (careSetting === 'inpatient') {
    const cmiDelta = Math.max(0, (settingData.cmi_after ?? 0) - (settingData.cmi_before ?? 0));
    const cmiPointValue = settingData.vm_cmiPointValue ?? cal.conversionFactor ?? 1500;
    settingValue += cmiDelta * adoptedEncounters * cmiPointValue * (inputs.attributionRate / 100);
    const denialsDelta = Math.max(0, (settingData.denialsPer100_before ?? 0) - (settingData.denialsPer100_after ?? 0));
    settingValue += (denialsDelta / 100) * adoptedEncounters * (settingData.vm_denialCostPerCase ?? 3200);
  } else if (careSetting === 'ed') {
    const throughputHours = totalHoursSaved * 0.3;
    const addlPatients = throughputHours * (60 / cal.minutesPerVisit);
    settingValue += addlPatients * cal.revenuePerVisit;
  } else if (careSetting !== 'nursing') {
    const capHours = totalHoursSaved * 0.2;
    const addlVisits = capHours * (60 / cal.minutesPerVisit);
    settingValue += addlVisits * cal.revenuePerVisit;
  }

  const annualValue = efficiencyValue + wrvuValue + settingValue;
  const perProviderValue = inputs.providers > 0 ? annualValue / inputs.providers : 0;

  return {
    label,
    inputs,
    annualValue,
    hoursReclaimed: Math.round(totalHoursSaved),
    perProviderValue,
    isCustomized,
  };
}

export interface ConfirmedDomainValues {
  workforceValue: number;
  qualityValueLow: number;
  qualityValueHigh: number;
  revenueValueLow: number;
  revenueValueHigh: number;
  denialValue: number;
  capacityValue: number;
  totalHoursSaved: number;
  efficiencyHours: number;
  qualityHoursPerWeek: number;
  wrvuDelta: number;
}

export interface ConfirmedValue {
  low: number;
  high: number;
  perProviderLow: number;
  perProviderHigh: number;
  hoursReclaimed: number;
  adoptedEncounters: number;
  domains: ConfirmedDomainValues;
}

export function getActiveMetrics(state: MeasureState): {
  metricId: string;
  setting?: MeasureCareSetting;
  before: number;
  after: number;
  monthlyData?: number[];
  isOrgWide: boolean;
}[] {
  const ORG_WIDE_IDS = ['burnoutAssessment', 'likelihoodToStay'];
  if (!state.metricValues) return [];

  const hasEnabledFlags = state.enabledMetrics && Object.keys(state.enabledMetrics).length > 0;

  return Object.entries(state.metricValues)
    .filter(([key, entry]) => {
      if (entry.before == null || entry.after == null || (entry.before === 0 && entry.after === 0)) return false;
      if (!hasEnabledFlags) return true;
      const parts = key.split('__');
      const metricId = parts[0];
      const setting = parts[1] as MeasureCareSetting | undefined;
      if (ORG_WIDE_IDS.includes(metricId)) {
        return Object.values(state.enabledMetrics!).some(sm => sm?.[metricId]);
      }
      if (setting) {
        return !!state.enabledMetrics![setting]?.[metricId];
      }
      return true;
    })
    .map(([key, entry]) => {
      const parts = key.split('__');
      const metricId = parts[0];
      const setting = parts[1] as MeasureCareSetting | undefined;
      return {
        metricId,
        setting,
        before: entry.before!,
        after: entry.after!,
        monthlyData: entry.isMonthlyMode ? entry.monthlyData : undefined,
        isOrgWide: ORG_WIDE_IDS.includes(metricId),
      };
    });
}

export function calculateConfirmedValue(state: MeasureState): ConfirmedValue {
  const te = state.timeEfficiency;
  const cal = state.calibration;
  const dq = state.documentationQuality;
  const dep = state.deployment;
  const months = getMonthsFromGoLive(state.goLiveDate, dep.monthsOnAbridge);
  const annualFactor = 12 / Math.max(months, 1);
  const careSetting = state.careSetting || 'outpatient';
  const settingData = state.settingData?.[careSetting] || {};

  const timeSavedPerNote = Math.max(0, te.timeInNotesWithout - te.timeInNotesWith);
  const adoptedEncounters = Math.round(dep.totalEncounters * (dep.utilizationRate / 100));
  const totalHoursSaved = (timeSavedPerNote * adoptedEncounters) / 60;

  const efficiencyHours = totalHoursSaved * 0.5;
  const workforceValue = efficiencyHours * cal.otHourlyRate * annualFactor;

  const qualityHours = totalHoursSaved * 0.3;
  const settingMRU = dep.mruProviders !== undefined ? dep.mruProviders : dep.providers;
  const qualityHoursPerWeek = settingMRU > 0 ? qualityHours / settingMRU / Math.max(dep.monthsOnAbridge, 1) / 4.33 : 0;

  const wrvuLift = dq.wrvuWith - dq.wrvuWithout;
  const isInpatient = careSetting === 'inpatient';
  const useGenericWrvu = !isInpatient && wrvuLift > 0;
  const wrvuValueLow = useGenericWrvu ? wrvuLift * adoptedEncounters * cal.conversionFactor * 0.50 * annualFactor : 0;
  const wrvuValueHigh = useGenericWrvu ? wrvuLift * adoptedEncounters * cal.conversionFactor * 0.75 * annualFactor : 0;

  let qualityValueLow = 0;
  let qualityValueHigh = 0;
  let revenueValueLow = wrvuValueLow;
  let revenueValueHigh = wrvuValueHigh;
  let capacityValue = 0;
  let denialValue = 0;

  if (isInpatient) {
    const cmiDelta = Math.max(0, (settingData.cmi_after ?? 0) - (settingData.cmi_before ?? 0));
    const cmiPointValue = settingData.vm_cmiPointValue ?? cal.conversionFactor ?? 1500;
    qualityValueLow += cmiDelta * adoptedEncounters * cmiPointValue * 0.50 * annualFactor;
    qualityValueHigh += cmiDelta * adoptedEncounters * cmiPointValue * 0.75 * annualFactor;
    const denialsDelta = Math.max(0, (settingData.denialsPer100_before ?? 0) - (settingData.denialsPer100_after ?? 0));
    denialValue = (denialsDelta / 100) * adoptedEncounters * (settingData.vm_denialCostPerCase ?? 3200) * annualFactor;
    revenueValueLow += denialValue;
    revenueValueHigh += denialValue;
  } else if (careSetting === 'ed') {
    const throughputHours = totalHoursSaved * 0.3;
    const addlPatients = throughputHours * (60 / cal.minutesPerVisit);
    capacityValue = addlPatients * cal.revenuePerVisit * annualFactor;
  } else if (careSetting !== 'nursing') {
    const capHours = totalHoursSaved * 0.2;
    const addlVisits = capHours * (60 / cal.minutesPerVisit);
    capacityValue = addlVisits * cal.revenuePerVisit * annualFactor;
  }

  const low = workforceValue + qualityValueLow + revenueValueLow + capacityValue;
  const high = workforceValue + qualityValueHigh + revenueValueHigh + capacityValue;

  return {
    low,
    high,
    perProviderLow: dep.providers > 0 ? low / dep.providers : 0,
    perProviderHigh: dep.providers > 0 ? high / dep.providers : 0,
    hoursReclaimed: Math.round(totalHoursSaved),
    adoptedEncounters,
    domains: {
      workforceValue,
      qualityValueLow,
      qualityValueHigh,
      revenueValueLow,
      revenueValueHigh,
      denialValue,
      capacityValue,
      totalHoursSaved,
      efficiencyHours,
      qualityHoursPerWeek,
      wrvuDelta: wrvuLift,
    },
  };
}

export interface NextStageMetric {
  metric: string;
  domain: string;
  why: string;
  source: string;
  expectedAtMonth: number;
}

export interface SettingStage {
  setting: MeasureCareSetting;
  settingLabel: string;
  months: number;
  phase: 1 | 2 | 3 | 4;
  phaseLabel: string;
  phaseThirdLabel: string;
  maturityStage: MaturityStage;
  maturityLabel: string;
  maturityNext: string;
  domainStatus: {
    quality: DomainStatus;
    workforce: DomainStatus;
    revenue: DomainStatus;
    capacity: DomainStatus;
  };
  activeDomainCount: number;
  confirmedLow: number;
  confirmedHigh: number;
  perProviderLow: number;
  perProviderHigh: number;
  defensibleClaims: string[];
  nextStageMetrics: NextStageMetric[];
}

const SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const PHASE_THIRD_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: 'Capacity',
  ed: 'Throughput',
  inpatient: 'Patient Flow',
  nursing: 'Staffing',
};

const NEXT_STAGE_METRICS: Record<MeasureCareSetting, Record<number, NextStageMetric[]>> = {
  outpatient: {
    1: [
      { metric: 'CDI query reduction', domain: 'Quality', why: 'First CDI signal', source: 'EHR analytics', expectedAtMonth: 3 },
      { metric: 'After-hours work decline', domain: 'Workforce', why: 'WoW signal', source: 'Abridge platform', expectedAtMonth: 3 },
      { metric: 'wRVU per encounter', domain: 'Revenue', why: 'Coding lift signal', source: 'Billing', expectedAtMonth: 3 },
    ],
    2: [
      { metric: 'Encounter volume lift', domain: 'Capacity', why: 'Panel growth', source: 'EHR analytics', expectedAtMonth: 6 },
      { metric: 'Physician retention data', domain: 'Workforce', why: 'Retention advantage', source: 'HR', expectedAtMonth: 9 },
      { metric: 'Clean claim rate', domain: 'Revenue', why: 'Coding confirmed', source: 'Revenue Cycle', expectedAtMonth: 9 },
    ],
    3: [
      { metric: 'New care settings added', domain: 'Capacity', why: 'Expansion story', source: 'Abridge platform', expectedAtMonth: 12 },
      { metric: 'Net collection ratio', domain: 'Revenue', why: 'Board-level revenue', source: 'Finance', expectedAtMonth: 12 },
      { metric: 'Provider satisfaction score', domain: 'Workforce', why: 'Recruitment leverage', source: 'HR', expectedAtMonth: 12 },
    ],
    4: [],
  },
  ed: {
    1: [
      { metric: 'E/M level accuracy', domain: 'Revenue', why: 'Coding lift', source: 'Billing', expectedAtMonth: 3 },
      { metric: 'Shift-end documentation time', domain: 'Workforce', why: 'WoW relief', source: 'Abridge platform', expectedAtMonth: 3 },
    ],
    2: [
      { metric: 'LWBS rate', domain: 'Throughput', why: 'Patient retention', source: 'Operations', expectedAtMonth: 6 },
      { metric: 'Patients per provider per shift', domain: 'Throughput', why: 'Throughput lift', source: 'Operations', expectedAtMonth: 6 },
    ],
    3: [],
    4: [],
  },
  inpatient: {
    1: [
      { metric: 'CMI improvement', domain: 'Revenue', why: 'DRG accuracy', source: 'Health Information', expectedAtMonth: 4 },
      { metric: 'CDI query rate', domain: 'Quality', why: 'CDI baseline', source: 'CDI team', expectedAtMonth: 3 },
      { metric: 'EHR time per patient day', domain: 'Workforce', why: 'Rounding efficiency', source: 'Abridge platform', expectedAtMonth: 3 },
    ],
    2: [
      { metric: 'Denial reduction rate', domain: 'Revenue', why: 'Payer defense', source: 'Revenue Cycle', expectedAtMonth: 9 },
      { metric: 'Discharge summary completion time', domain: 'Patient Flow', why: 'Flow signal', source: 'Operations', expectedAtMonth: 9 },
      { metric: 'Physician retention', domain: 'Workforce', why: 'Retention data', source: 'HR', expectedAtMonth: 12 },
    ],
    3: [],
    4: [],
  },
  nursing: {
    1: [
      { metric: 'Overtime hours per nurse', domain: 'Workforce', why: 'OT relief', source: 'HR/Payroll', expectedAtMonth: 3 },
      { metric: 'Turnover rate', domain: 'Workforce', why: 'Retention signal', source: 'HR', expectedAtMonth: 6 },
    ],
    2: [
      { metric: 'Falls/HAPIs rate', domain: 'Quality', why: 'Safety signal', source: 'Quality team', expectedAtMonth: 9 },
      { metric: 'Nurse satisfaction', domain: 'Workforce', why: 'Recruitment leverage', source: 'HR', expectedAtMonth: 9 },
    ],
    3: [],
    4: [],
  },
};

function getDefensibleClaims(
  stage: MaturityStage,
  strongestDomain: string,
  activeDomainCount: number,
  totalHoursSaved: number,
  providers: number,
  confirmedLow: number,
  confirmedHigh: number,
  perProviderLow: number,
  settingCount: number,
): string[] {
  const hoursPerProv = providers > 0 ? totalHoursSaved / providers : 0;
  switch (stage) {
    case 'unmeasured':
      return [
        'Abridge is live and being used',
        'Baseline metrics are establishing',
        'No outcome claims yet: foundation building',
      ];
    case 'emerging':
      return [
        'Documentation patterns are changing with Abridge',
        `Early efficiency signals are present in ${strongestDomain}`,
        'Trend direction is confirmed, but too early for magnitude',
      ];
    case 'demonstrated':
      return [
        `${activeDomainCount} domains show consistent positive trends`,
        `Time reclaimed: ${formatNumber(Math.round(totalHoursSaved))} hours across ${providers} providers`,
        `Value range ${formatCurrency(confirmedLow)}–${formatCurrency(confirmedHigh)} / year is supported by the data`,
        'Renewal decision is made on data, not relationship',
      ];
    case 'strategic':
      return [
        `Multi-domain proof across ${settingCount} setting${settingCount > 1 ? 's' : ''}`,
        `Per-provider value of ${formatCurrency(perProviderLow)} is proven and scalable`,
        'Expansion economics are understood',
        'This deployment is a strategic asset, not a tool',
      ];
    default:
      return [];
  }
}

function getSettingTotalAvailableMetrics(setting: MeasureCareSetting): number {
  return getTotalAvailableMetricsFromConfig(setting);
}

export function deriveSettingStage(
  state: MeasureState,
  setting: MeasureCareSetting,
): SettingStage {
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const util = state.deployment.encounterCoverageRate;
  const domainStatus = computeDomainStatus(state);
  const activeDomains = Object.values(domainStatus).filter(s => s === 'signaling' || s === 'validated');
  const activeDomainCount = activeDomains.length;

  let phase: 1 | 2 | 3 | 4;
  let phaseLabel: string;
  if (months < 3) { phase = 1; phaseLabel = 'Documentation Fidelity'; }
  else if (months < 6) { phase = 2; phaseLabel = 'Efficiency'; }
  else if (months < 18) { phase = 3; phaseLabel = PHASE_THIRD_LABELS[setting]; }
  else { phase = 4; phaseLabel = 'Strategic Proof'; }

  const settingData = state.settingData[setting] || {};
  const enabledMap = state.enabledMetrics?.[setting] || {};
  let evidencedMetrics = 0;
  for (const [key, isEnabled] of Object.entries(enabledMap)) {
    if (!isEnabled) continue;
    const b = settingData[`${key}_before`] ?? 0;
    const a = settingData[`${key}_after`] ?? 0;
    if (b !== 0 && a !== 0) evidencedMetrics++;
  }
  const validSurveys = (state.surveyMetrics || []).filter(sm => sm.label.trim());
  const evidencedSurvey = validSurveys.filter(sm => sm.before > 0 && sm.after > 0).length;
  const totalEvidenced = evidencedMetrics + evidencedSurvey;
  const totalAvailable = getSettingTotalAvailableMetrics(setting) + validSurveys.length;
  const coverageRatio = totalAvailable > 0 ? Math.min(totalEvidenced / totalAvailable, 1) : 0;

  let maturityStage: MaturityStage;
  let maturityLabel: string;
  if (months < 3 || util < 20) { maturityStage = 'unmeasured'; maturityLabel = 'Unmeasured'; }
  else if (months > 18 && util > 70 && coverageRatio > 0.5) { maturityStage = 'strategic'; maturityLabel = 'Strategic'; }
  else if (months >= 9 || (util > 60 && activeDomainCount >= 3) || coverageRatio > 0.7) { maturityStage = 'demonstrated'; maturityLabel = 'Demonstrated'; }
  else { maturityStage = 'emerging'; maturityLabel = 'Emerging'; }

  const stageOrder: MaturityStage[] = ['unmeasured', 'emerging', 'demonstrated', 'strategic'];
  const stageLabels: Record<MaturityStage, string> = { unmeasured: 'Unmeasured', emerging: 'Emerging', demonstrated: 'Demonstrated', strategic: 'Strategic' };
  const idx = stageOrder.indexOf(maturityStage);
  const maturityNext = idx < stageOrder.length - 1 ? stageLabels[stageOrder[idx + 1]] : 'Strategic';

  const confirmed = calculateConfirmedValue(state);

  const strongestDomainKey = Object.entries(domainStatus).reduce((best, [k, v]) => {
    const p = v === 'validated' ? 4 : v === 'signaling' ? 3 : v === 'baseline-only' ? 2 : 1;
    return p > best.p ? { key: k, p } : best;
  }, { key: 'workforce', p: 0 }).key;

  const settingCount = Object.keys(state.settingData).filter(k => {
    const d = state.settingData[k as MeasureCareSetting];
    return d && Object.values(d).some(v => v !== 0);
  }).length || 1;

  const defensibleClaims = getDefensibleClaims(
    maturityStage,
    strongestDomainKey.charAt(0).toUpperCase() + strongestDomainKey.slice(1),
    activeDomainCount,
    confirmed.hoursReclaimed,
    state.deployment.providers,
    confirmed.low,
    confirmed.high,
    confirmed.perProviderLow,
    settingCount,
  );

  const nextPhase = Math.min(phase, 3) as 1 | 2 | 3;
  const nextStageMetrics = NEXT_STAGE_METRICS[setting][nextPhase] || [];

  return {
    setting,
    settingLabel: SETTING_LABELS[setting],
    months,
    phase,
    phaseLabel,
    phaseThirdLabel: PHASE_THIRD_LABELS[setting],
    maturityStage,
    maturityLabel,
    maturityNext,
    domainStatus,
    activeDomainCount,
    confirmedLow: confirmed.low,
    confirmedHigh: confirmed.high,
    perProviderLow: confirmed.perProviderLow,
    perProviderHigh: confirmed.perProviderHigh,
    defensibleClaims,
    nextStageMetrics,
  };
}

export function calculateExpansionResults(
  state: MeasureState,
  totalValueLow: number,
  totalValueHigh: number,
  totalHoursSaved: number,
  targetAdoption?: number,
  targetProviders?: number,
): ExpansionResults {
  const { deployment } = state;
  const currentMRU = deployment.mruProviders !== undefined ? deployment.mruProviders : deployment.providers;
  const currentLive = deployment.liveProviders !== undefined ? deployment.liveProviders : deployment.providers;
  const currentCoverageRate = Math.max(deployment.encounterCoverageRate, 1) / 100;
  const deepenRate = (targetAdoption ?? 80) / 100;

  const currentAdoptedEncounters = Math.round(deployment.totalEncounters * currentCoverageRate);
  const currentNonAdoptedEncounters = deployment.totalEncounters - currentAdoptedEncounters;

  const deepenEncounters = Math.round(deployment.totalEncounters * deepenRate);
  const rawMruGapScale = currentMRU > 0 && currentLive > currentMRU
    ? currentLive / currentMRU
    : (currentMRU === 0 && currentLive > 0 ? Math.min(currentLive, 5) : 1);
  const mruGapScale = Math.min(rawMruGapScale, 5);
  const encounterScale = currentCoverageRate > 0 ? deepenRate / currentCoverageRate : 1;
  const deepenScale = mruGapScale * encounterScale;
  const deepenHoursSaved = totalHoursSaved * deepenScale;
  const deepenAdditionalValueLow = totalValueLow * (deepenScale - 1);
  const deepenAdditionalValueHigh = totalValueHigh * (deepenScale - 1);
  const deepenAdditionalValue = (deepenAdditionalValueLow + deepenAdditionalValueHigh) / 2;

  const expandTarget = targetProviders != null
    ? Math.max(targetProviders, currentLive)
    : Math.max(deployment.totalProviders, currentLive);
  const expandScale = currentLive > 0 ? expandTarget / currentLive : 1;
  const expandValueLow = totalValueLow * expandScale;
  const expandValueHigh = totalValueHigh * expandScale;

  const combinedProviders = expandTarget;
  const combinedAdoptionRate = deepenRate * 100;
  const combinedScale = expandScale * deepenScale;
  const combinedValueLow = totalValueLow * combinedScale;
  const combinedValueHigh = totalValueHigh * combinedScale;

  const avgValue = (totalValueLow + totalValueHigh) / 2;
  const perProviderValue = currentMRU > 0 ? avgValue / currentMRU : 0;
  const perEncounterValueLow = deployment.totalEncounters > 0 ? totalValueLow / deployment.totalEncounters : 0;
  const perEncounterValueHigh = deployment.totalEncounters > 0 ? totalValueHigh / deployment.totalEncounters : 0;
  const hoursPerProvider = currentMRU > 0 ? totalHoursSaved / currentMRU : 0;
  const remainingProviders = Math.max(0, expandTarget - currentLive);

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
