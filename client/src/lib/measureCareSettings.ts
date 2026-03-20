import type { MeasureCareSetting } from "./measureCalculator";

export interface MetricField {
  key: string;
  label: string;
  hasBeforeAfter: boolean;
  optional?: boolean;
  step?: number;
  suffix?: string;
  prefix?: string;
}

export interface MetricSection {
  key: string;
  label: string;
  description?: string;
  metrics: MetricField[];
}

export interface ValueModelField {
  key: string;
  label: string;
  defaultValue: number;
  prefix?: string;
  suffix?: string;
}

export interface DeploymentField {
  key: string;
  label: string;
  required?: boolean;
  suffix?: string;
}

export interface AllocationField {
  key: string;
  label: string;
  defaultValue: number;
}

export type DomainKey = 'workforce' | 'revenue' | 'quality' | 'capacity' | 'throughput' | 'patientFlow';

export interface CareSettingConfig {
  key: MeasureCareSetting;
  label: string;
  shortLabel: string;
  fourthDomainKey: DomainKey;
  fourthDomainLabel: string;
  deploymentFields?: DeploymentField[];
  metricSections: MetricSection[];
  valueModel: ValueModelField[];
  allocationFields: AllocationField[];
}

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  workforce: 'Workforce',
  revenue: 'Revenue',
  quality: 'Quality',
  capacity: 'Capacity',
  throughput: 'Throughput',
  patientFlow: 'Patient Flow',
};

export function getSettingDomains(setting: MeasureCareSetting): { key: DomainKey; label: string }[] {
  const config = CARE_SETTING_CONFIGS[setting];
  return [
    { key: 'workforce', label: 'Workforce' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'quality', label: 'Quality' },
    { key: config.fourthDomainKey, label: config.fourthDomainLabel },
  ];
}

export const CARE_SETTING_CONFIGS: Record<MeasureCareSetting, CareSettingConfig> = {
  outpatient: {
    key: "outpatient",
    label: "Outpatient",
    shortLabel: "Outpatient",
    fourthDomainKey: "capacity",
    fourthDomainLabel: "Capacity",
    metricSections: [
      {
        key: "workforce",
        label: "Workforce",
        metrics: [
          { key: "timeInNotes", label: "Time in Notes (min)", hasBeforeAfter: true },
          { key: "daysToClose", label: "Days to Close", hasBeforeAfter: true, step: 0.1, optional: true },
          { key: "afterHours", label: "After-Hours (hrs/day)", hasBeforeAfter: true, step: 0.1 },
        ],
      },
      {
        key: "revenue",
        label: "Revenue",
        metrics: [
          { key: "wrvuPerEncounter", label: "wRVU per Encounter", hasBeforeAfter: true, step: 0.01 },
          { key: "emLevel", label: "E/M Level", hasBeforeAfter: true, optional: true, step: 0.1 },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        metrics: [],
      },
      {
        key: "capacity",
        label: "Capacity",
        metrics: [
          { key: "sameDayClosure", label: "Same-Day Closure (%)", hasBeforeAfter: true },
        ],
      },
    ],
    valueModel: [
      { key: "hourlyRate", label: "Provider hourly rate", defaultValue: 150, prefix: "$" },
      { key: "visitDuration", label: "Visit duration (min)", defaultValue: 30, suffix: "min" },
      { key: "revenuePerVisit", label: "Revenue per visit", defaultValue: 200, prefix: "$" },
      { key: "wrvuValue", label: "wRVU value", defaultValue: 33, prefix: "$" },
    ],
    allocationFields: [
      { key: "allocSavings", label: "Potential Value", defaultValue: 50 },
      { key: "allocCapacity", label: "Patient capacity", defaultValue: 20 },
      { key: "allocWellbeing", label: "Provider wellbeing", defaultValue: 30 },
    ],
  },

  ed: {
    key: "ed",
    label: "Emergency Department",
    shortLabel: "Emergency",
    fourthDomainKey: "throughput",
    fourthDomainLabel: "Throughput",
    metricSections: [
      {
        key: "workforce",
        label: "Workforce",
        metrics: [
          { key: "timeInNotes", label: "Time in Notes (min)", hasBeforeAfter: true },
          { key: "afterHours", label: "After-Hours (hrs/day)", hasBeforeAfter: true, step: 0.1 },
        ],
      },
      {
        key: "revenue",
        label: "Revenue",
        metrics: [
          { key: "emLevel", label: "E/M Level", hasBeforeAfter: true, step: 0.1 },
          { key: "admissionCapture", label: "Admission Capture (%)", hasBeforeAfter: true, step: 0.1 },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        metrics: [],
      },
      {
        key: "throughput",
        label: "Throughput",
        metrics: [
          { key: "doorToDoc", label: "Door-to-Doc (min)", hasBeforeAfter: true },
          { key: "lwbsRate", label: "LWBS Rate (%)", hasBeforeAfter: true, step: 0.1 },
        ],
      },
    ],
    valueModel: [
      { key: "hourlyRate", label: "Provider hourly rate", defaultValue: 175, prefix: "$" },
      { key: "avgEdVisitRevenue", label: "Avg ED visit revenue", defaultValue: 450, prefix: "$" },
      { key: "lwbsRevenueRecovery", label: "LWBS revenue recovery", defaultValue: 350, prefix: "$" },
    ],
    allocationFields: [
      { key: "allocSavings", label: "Potential Value", defaultValue: 40 },
      { key: "allocThroughput", label: "Throughput", defaultValue: 40 },
      { key: "allocWellbeing", label: "Provider wellbeing", defaultValue: 20 },
    ],
  },

  inpatient: {
    key: "inpatient",
    label: "Inpatient",
    shortLabel: "Inpatient",
    fourthDomainKey: "patientFlow",
    fourthDomainLabel: "Patient Flow",
    metricSections: [
      {
        key: "workforce",
        label: "Workforce",
        metrics: [
          { key: "timeInNotes", label: "Time in Notes (min)", hasBeforeAfter: true },
          { key: "afterHours", label: "After-Hours (hrs/day)", hasBeforeAfter: true, step: 0.1 },
        ],
      },
      {
        key: "revenue",
        label: "Revenue",
        metrics: [
          { key: "cmi", label: "CMI", hasBeforeAfter: true, step: 0.01 },
          { key: "ccMccCapture", label: "CC/MCC Capture Rate (%)", hasBeforeAfter: true, step: 0.1 },
          { key: "denialsPer100", label: "Denials per 100 Claims", hasBeforeAfter: true, step: 0.1 },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        metrics: [
          { key: "cdiQueriesPer100", label: "CDI Queries per 100 Cases", hasBeforeAfter: true, step: 1 },
        ],
      },
      {
        key: "patientFlow",
        label: "Patient Flow",
        metrics: [
          { key: "sameDayClosure", label: "Same-Day Completion (%)", hasBeforeAfter: true },
        ],
      },
    ],
    valueModel: [
      { key: "baseDrgPayment", label: "Average base DRG payment", defaultValue: 6500, prefix: "$" },
      { key: "cmiPointValue", label: "Avg CMI point value", defaultValue: 1500, prefix: "$" },
      { key: "denialCostPerCase", label: "Denial cost per case", defaultValue: 3200, prefix: "$" },
      { key: "cdiFteCost", label: "CDI FTE cost (annual)", defaultValue: 85000, prefix: "$" },
      { key: "casesPerCdiFte", label: "Cases per CDI FTE/year", defaultValue: 2500 },
      { key: "hourlyRate", label: "Provider hourly rate", defaultValue: 175, prefix: "$" },
    ],
    allocationFields: [
      { key: "allocSavings", label: "Potential Value", defaultValue: 60 },
      { key: "allocWellbeing", label: "Provider Wellbeing", defaultValue: 40 },
    ],
  },

  nursing: {
    key: "nursing",
    label: "Nursing",
    shortLabel: "Nursing",
    fourthDomainKey: "patientFlow",
    fourthDomainLabel: "Patient Flow",
    deploymentFields: [
      { key: "staffedBeds", label: "Staffed Beds", required: true },
      { key: "nurseFTEs", label: "Nurse FTEs", required: true },
      { key: "bedOccupancy", label: "Bed Occupancy", suffix: "%", required: true },
    ],
    metricSections: [
      {
        key: "workforce",
        label: "Workforce",
        metrics: [
          { key: "chartingTime", label: "Time in Charting (min/shift)", hasBeforeAfter: true },
          { key: "overtimeHours", label: "Overtime Hours/Week", hasBeforeAfter: true, step: 0.1 },
          { key: "afterShiftCharting", label: "After-Shift Charting (min)", hasBeforeAfter: true },
          { key: "turnoverRate", label: "Turnover Rate (%)", hasBeforeAfter: true, step: 0.1 },
        ],
      },
      {
        key: "revenue",
        label: "Revenue",
        metrics: [],
      },
      {
        key: "quality",
        label: "Quality",
        metrics: [
          { key: "fallsRate", label: "Falls Rate (per 1,000)", hasBeforeAfter: true, step: 0.1 },
          { key: "hapiRate", label: "HAPI Rate (per 1,000)", hasBeforeAfter: true, step: 0.1 },
          { key: "nurseSatisfaction", label: "Nurse Satisfaction (%)", hasBeforeAfter: true },
        ],
      },
      {
        key: "patientFlow",
        label: "Patient Flow",
        metrics: [],
      },
    ],
    valueModel: [
      { key: "otHourlyRate", label: "OT hourly rate", defaultValue: 75, prefix: "$" },
      { key: "otConversionRate", label: "OT conversion rate", defaultValue: 25, suffix: "%" },
      { key: "replacementCost", label: "Replacement cost per nurse", defaultValue: 52000, prefix: "$" },
      { key: "retentionImpact", label: "Retention impact", defaultValue: 15, suffix: "%" },
    ],
    allocationFields: [
      { key: "allocSavings", label: "Potential Value", defaultValue: 50 },
      { key: "allocCapacity", label: "Patient capacity", defaultValue: 20 },
      { key: "allocWellbeing", label: "Provider wellbeing", defaultValue: 30 },
    ],
  },
};

export interface AbridgeNativeMetricDef {
  key: string;
  label: string;
  suffix?: string;
  description?: string;
}

export const ABRIDGE_NATIVE_METRICS: AbridgeNativeMetricDef[] = [
  { key: 'notesGenerated', label: 'Notes Generated', description: 'Total AI-generated notes during deployment' },
  { key: 'avgNoteAcceptanceRate', label: 'Note Acceptance Rate', suffix: '%', description: 'Percentage of generated notes accepted by providers' },
  { key: 'activeProviders', label: 'Monthly Recording Users', description: 'Providers who recorded with Abridge at least once this month' },
  { key: 'encountersCaptured', label: 'Encounters Captured', description: 'Total encounters processed by Abridge' },
];

export const CARE_SETTING_ORDER: MeasureCareSetting[] = [
  "outpatient",
  "ed",
  "inpatient",
  "nursing",
];

export type SettingMetrics = Record<string, number>;

export function getTotalAvailableMetrics(setting: MeasureCareSetting): number {
  const config = CARE_SETTING_CONFIGS[setting];
  let count = 0;
  for (const section of config.metricSections) {
    for (const metric of section.metrics) {
      if (metric.hasBeforeAfter) count++;
    }
  }
  return count;
}

export function getEnabledMetricCount(
  setting: MeasureCareSetting,
  enabledMap: Record<string, boolean> | undefined,
): number {
  if (!enabledMap) return 0;
  const config = CARE_SETTING_CONFIGS[setting];
  let count = 0;
  for (const section of config.metricSections) {
    for (const metric of section.metrics) {
      if (metric.hasBeforeAfter && enabledMap[metric.key]) count++;
    }
  }
  return count;
}

export function getDefaultMetrics(setting: MeasureCareSetting): SettingMetrics {
  const config = CARE_SETTING_CONFIGS[setting];
  const metrics: SettingMetrics = {};

  for (const section of config.metricSections) {
    for (const metric of section.metrics) {
      if (metric.hasBeforeAfter) {
        metrics[`${metric.key}_before`] = 0;
        metrics[`${metric.key}_after`] = 0;
      } else {
        metrics[metric.key] = 0;
      }
    }
  }

  for (const field of config.valueModel) {
    metrics[`vm_${field.key}`] = field.defaultValue;
  }

  for (const field of config.allocationFields) {
    metrics[field.key] = field.defaultValue;
  }

  if (config.deploymentFields) {
    for (const field of config.deploymentFields) {
      metrics[`deploy_${field.key}`] = 0;
    }
  }

  return metrics;
}

export function getDefaultOutpatientMetrics(): SettingMetrics {
  return {
    timeInNotes_before: 0,
    timeInNotes_after: 0,
    sameDayClosure_before: 0,
    sameDayClosure_after: 0,
    daysToClose_before: 0,
    daysToClose_after: 0,
    afterHours_before: 0,
    afterHours_after: 0,
    wrvuPerEncounter_before: 0,
    wrvuPerEncounter_after: 0,
    emLevel_before: 0,
    emLevel_after: 0,
    vm_hourlyRate: 150,
    vm_visitDuration: 30,
    vm_revenuePerVisit: 200,
    vm_wrvuValue: 33,
    allocSavings: 50,
    allocCapacity: 20,
    allocWellbeing: 30,
  };
}

export function hasSettingData(metrics: SettingMetrics | undefined): boolean {
  if (!metrics) return false;
  return Object.values(metrics).some((v) => v !== 0);
}

export function isSectionComplete(
  sectionKey: string,
  config: CareSettingConfig,
  metrics: SettingMetrics,
): boolean {
  const section = config.metricSections.find((s) => s.key === sectionKey);
  if (!section) return false;

  const requiredMetrics = section.metrics.filter((m) => !m.optional);
  return requiredMetrics.every((m) => {
    if (m.hasBeforeAfter) {
      return (metrics[`${m.key}_before`] ?? 0) !== 0 && (metrics[`${m.key}_after`] ?? 0) !== 0;
    }
    return metrics[m.key] !== 0;
  });
}

export function syncSettingToState(
  setting: MeasureCareSetting,
  metrics: SettingMetrics,
): {
  timeEfficiency: {
    timeInNotesWithout: number;
    timeInNotesWith: number;
    timeToCloseWithout: number;
    timeToCloseWith: number;
    sameDayClosureWithout: number;
    sameDayClosureWith: number;
    workOutsideWithout: number;
    workOutsideWith: number;
  };
  documentationQuality: {
    wrvuWithout: number;
    wrvuWith: number;
    emLevelWithout: number;
    emLevelWith: number;
  };
  calibration: {
    otHourlyRate: number;
    minutesPerVisit: number;
    revenuePerVisit: number;
    conversionFactor: number;
  };
  allocation: {
    hardSavingsPercent: number;
    capacityPercent: number;
    qualityOfLifePercent: number;
  };
} {
  switch (setting) {
    case "outpatient":
      return {
        timeEfficiency: {
          timeInNotesWithout: metrics.timeInNotes_before ?? 0,
          timeInNotesWith: metrics.timeInNotes_after ?? 0,
          timeToCloseWithout: metrics.daysToClose_before ?? 0,
          timeToCloseWith: metrics.daysToClose_after ?? 0,
          sameDayClosureWithout: metrics.sameDayClosure_before ?? 0,
          sameDayClosureWith: metrics.sameDayClosure_after ?? 0,
          workOutsideWithout: metrics.afterHours_before ?? 0,
          workOutsideWith: metrics.afterHours_after ?? 0,
        },
        documentationQuality: {
          wrvuWithout: metrics.wrvuPerEncounter_before ?? 0,
          wrvuWith: metrics.wrvuPerEncounter_after ?? 0,
          emLevelWithout: metrics.emLevel_before ?? 0,
          emLevelWith: metrics.emLevel_after ?? 0,
        },
        calibration: {
          otHourlyRate: metrics.vm_hourlyRate ?? 150,
          minutesPerVisit: metrics.vm_visitDuration ?? 30,
          revenuePerVisit: metrics.vm_revenuePerVisit ?? 200,
          conversionFactor: metrics.vm_wrvuValue ?? 33,
        },
        allocation: {
          hardSavingsPercent: metrics.allocSavings ?? 50,
          capacityPercent: metrics.allocCapacity ?? 20,
          qualityOfLifePercent: metrics.allocWellbeing ?? 30,
        },
      };

    case "ed":
      return {
        timeEfficiency: {
          timeInNotesWithout: metrics.timeInNotes_before ?? 0,
          timeInNotesWith: metrics.timeInNotes_after ?? 0,
          timeToCloseWithout: metrics.doorToDoc_before ?? 0,
          timeToCloseWith: metrics.doorToDoc_after ?? 0,
          sameDayClosureWithout: metrics.lwbsRate_before ?? 0,
          sameDayClosureWith: metrics.lwbsRate_after ?? 0,
          workOutsideWithout: metrics.afterHours_before ?? 0,
          workOutsideWith: metrics.afterHours_after ?? 0,
        },
        documentationQuality: {
          wrvuWithout: 0,
          wrvuWith: 0,
          emLevelWithout: metrics.emLevel_before ?? 0,
          emLevelWith: metrics.emLevel_after ?? 0,
        },
        calibration: {
          otHourlyRate: metrics.vm_hourlyRate ?? 175,
          minutesPerVisit: 30,
          revenuePerVisit: metrics.vm_avgEdVisitRevenue ?? 450,
          conversionFactor: 33,
        },
        allocation: {
          hardSavingsPercent: metrics.allocSavings ?? 40,
          capacityPercent: metrics.allocThroughput ?? 40,
          qualityOfLifePercent: metrics.allocWellbeing ?? 20,
        },
      };

    case "inpatient":
      return {
        timeEfficiency: {
          timeInNotesWithout: metrics.timeInNotes_before ?? 0,
          timeInNotesWith: metrics.timeInNotes_after ?? 0,
          timeToCloseWithout: 0,
          timeToCloseWith: 0,
          sameDayClosureWithout: metrics.sameDayClosure_before ?? 0,
          sameDayClosureWith: metrics.sameDayClosure_after ?? 0,
          workOutsideWithout: metrics.afterHours_before ?? 0,
          workOutsideWith: metrics.afterHours_after ?? 0,
        },
        documentationQuality: {
          wrvuWithout: metrics.cmi_before ?? 0,
          wrvuWith: metrics.cmi_after ?? 0,
          emLevelWithout: 0,
          emLevelWith: 0,
        },
        calibration: {
          otHourlyRate: metrics.vm_hourlyRate ?? 175,
          minutesPerVisit: 30,
          revenuePerVisit: 200,
          conversionFactor: metrics.vm_cmiPointValue ?? 1500,
        },
        allocation: {
          hardSavingsPercent: metrics.allocSavings ?? 60,
          capacityPercent: 0,
          qualityOfLifePercent: metrics.allocWellbeing ?? 40,
        },
      };

    case "nursing":
      return {
        timeEfficiency: {
          timeInNotesWithout: metrics.chartingTime_before ?? 0,
          timeInNotesWith: metrics.chartingTime_after ?? 0,
          timeToCloseWithout: 0,
          timeToCloseWith: 0,
          sameDayClosureWithout: 0,
          sameDayClosureWith: 0,
          workOutsideWithout: metrics.overtimeHours_before ?? 0,
          workOutsideWith: metrics.overtimeHours_after ?? 0,
        },
        documentationQuality: {
          wrvuWithout: 0,
          wrvuWith: 0,
          emLevelWithout: 0,
          emLevelWith: 0,
        },
        calibration: {
          otHourlyRate: metrics.vm_otHourlyRate ?? 75,
          minutesPerVisit: 30,
          revenuePerVisit: 200,
          conversionFactor: 33,
        },
        allocation: {
          hardSavingsPercent: metrics.allocSavings ?? 50,
          capacityPercent: metrics.allocCapacity ?? 20,
          qualityOfLifePercent: metrics.allocWellbeing ?? 30,
        },
      };
  }
}
