import type { MeasureCareSetting } from "./measureCalculator";

export interface MetricDefinition {
  id: string;
  label: string;
  domain: 'foundational' | 'quality' | 'workforce' | 'capacity' | 'revenue';
  phase: 1 | 2 | 3;
  inputType: 'single' | 'before-after';
  unit: string;
  unitLabel: string;
  lowerIsBetter: boolean;
  source: 'abridge' | 'epic' | 'rcm' | 'coding' | 'survey' | 'cdi' | 'hris' | 'finance';
  sourceLabel: string;
  description: string;
  whyItMatters: string;
  plainEnglishTemplate: string;
  phase3Roadmap?: boolean;
}

export const OUTPATIENT_METRICS: MetricDefinition[] = [
  {
    id: 'utilization',
    label: '% Utilization',
    domain: 'foundational',
    phase: 1,
    inputType: 'single',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Percentage of eligible providers actively using Abridge.',
    whyItMatters: 'Utilization is the foundation — you can\'t measure what isn\'t being used.',
    plainEnglishTemplate: '{{after}}% of eligible providers are actively using Abridge.',
    phase3Roadmap: false,
  },
  {
    id: 'consent_rate',
    label: 'Patient Consent Rate',
    domain: 'foundational',
    phase: 1,
    inputType: 'single',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Percentage of patients who consent to ambient recording.',
    whyItMatters: 'Consent rate gates the encounter volume available for AI documentation.',
    plainEnglishTemplate: '{{after}}% of patients consent to Abridge recording.',
    phase3Roadmap: false,
  },
  {
    id: 'user_retention',
    label: '% Abridge User Retention',
    domain: 'foundational',
    phase: 2,
    inputType: 'single',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Percentage of providers who continue using Abridge month-over-month.',
    whyItMatters: 'Retention validates that providers find sustained value in the tool.',
    plainEnglishTemplate: '{{after}}% of Abridge users continue using the tool month-over-month.',
    phase3Roadmap: false,
  },

  {
    id: 'note_star_rating',
    label: 'Avg Note Star Rating',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'stars',
    unitLabel: 'avg stars (0–5)',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Average star rating providers assign to AI-generated notes.',
    whyItMatters: 'Star rating is the most direct signal of note quality satisfaction from providers.',
    plainEnglishTemplate: 'Average note star rating improved from {{before}} to {{after}} stars.',
    phase3Roadmap: false,
  },
  {
    id: 'diagnosis_capture',
    label: 'Diagnosis Capture Rate',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent of diagnoses captured',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'Coding Analytics',
    description: 'Percentage of discussed diagnoses that appear in the coded record.',
    whyItMatters: 'Abridge captures clinical detail from the conversation that manual documentation misses.',
    plainEnglishTemplate: 'Diagnosis capture improved {{delta}} points — more of what\'s discussed in the visit is making it into the record.',
    phase3Roadmap: false,
  },
  {
    id: 'diagnosis_specificity',
    label: 'Diagnosis Specificity',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent coded to highest specificity',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'Coding Analytics',
    description: 'Percentage of diagnoses coded to the highest available ICD-10 specificity.',
    whyItMatters: 'More specific codes support better reimbursement, quality reporting, and risk adjustment.',
    plainEnglishTemplate: 'Diagnosis specificity improved from {{before}}% to {{after}}% — {{delta}} more percentage points of diagnoses coded to highest specificity.',
    phase3Roadmap: false,
  },

  {
    id: 'time_to_close',
    label: 'Time to Close Encounter',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'Epic Clarity',
    description: 'Average time from encounter end to note signature.',
    whyItMatters: 'Faster closure means less cognitive carry-over and less end-of-day documentation burden.',
    plainEnglishTemplate: 'Time to close dropped {{delta}} minutes per encounter — notes are being completed closer to the point of care.',
    phase3Roadmap: false,
  },
  {
    id: 'work_after_hours_perceived',
    label: 'Work After Hours — Perceived',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent reporting after-hours work',
    lowerIsBetter: true,
    source: 'survey',
    sourceLabel: 'Pulse Survey',
    description: 'Percentage of providers who report doing documentation work after hours.',
    whyItMatters: 'The perceived burden of after-hours work is a leading indicator of burnout.',
    plainEnglishTemplate: 'After-hours work perception dropped from {{before}}% to {{after}}% of providers — {{delta}} fewer percentage points report working after hours.',
    phase3Roadmap: false,
  },
  {
    id: 'work_outside_work_empirical',
    label: 'Work Outside Work — Empirical',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hrs/wk',
    unitLabel: 'hours per week',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'Epic Clarity',
    description: 'Average hours per week providers spend on documentation outside scheduled work hours.',
    whyItMatters: 'Empirical after-hours work is the measurable version of "pajama time" — directly tied to burnout and retention.',
    plainEnglishTemplate: 'Providers are spending {{delta}} fewer hours per week on documentation outside of work — down from {{before}} to {{after}} hrs/wk.',
    phase3Roadmap: false,
  },
  {
    id: 'burnout_assessment',
    label: 'Burnout Assessment Score',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'score (0–100, higher = less burned out)',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Composite burnout score from validated survey instrument, normalized to 0–100.',
    whyItMatters: 'Burnout is the single biggest predictor of physician turnover. Reducing documentation burden directly reduces burnout.',
    plainEnglishTemplate: 'Burnout score improved from {{before}} to {{after}} — a {{delta}}-point improvement on a 100-point scale.',
    phase3Roadmap: false,
  },
  {
    id: 'likelihood_to_stay',
    label: 'Likelihood to Stay',
    domain: 'workforce',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent likely/very likely to stay',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Percentage of clinicians responding "likely" or "very likely" to stay at the organization.',
    whyItMatters: 'Retention intent is the leading indicator of actual turnover — each prevented departure saves $500K–$1M.',
    plainEnglishTemplate: 'Likelihood to stay improved from {{before}}% to {{after}}% — {{delta}} more percentage points of clinicians plan to stay.',
    phase3Roadmap: false,
  },

  {
    id: 'time_in_note',
    label: 'Time in Note per Appt',
    domain: 'capacity',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes per encounter',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'Epic Clarity',
    description: 'Average minutes spent in the note per appointment, including review and edits.',
    whyItMatters: 'This is the primary time-savings metric. Every minute recovered is capacity that can be reallocated.',
    plainEnglishTemplate: 'Note time dropped {{delta}} minutes per encounter. Across {{encounters}} Abridge encounters, that\'s {{totalHours}} hours of capacity recovered.',
    phase3Roadmap: false,
  },
  {
    id: 'effort_reduction',
    label: '% Effort Reduction',
    domain: 'capacity',
    phase: 1,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent effort reduction reported',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Self-reported percentage reduction in documentation effort compared to before Abridge.',
    whyItMatters: 'The perceived version of efficiency gain — correlates with note time savings and provider satisfaction.',
    plainEnglishTemplate: 'Providers report {{after}}% reduction in documentation effort — up from {{before}}% baseline.',
    phase3Roadmap: false,
  },
  {
    id: 'patients_per_provider_month',
    label: 'Patients per Provider per Month',
    domain: 'capacity',
    phase: 2,
    inputType: 'before-after',
    unit: 'count',
    unitLabel: 'patients per month',
    lowerIsBetter: false,
    source: 'epic',
    sourceLabel: 'Epic Clarity',
    description: 'Average number of patients seen per provider per month.',
    whyItMatters: 'The capacity unlock made possible when documentation time savings are reinvested in patient access.',
    plainEnglishTemplate: 'Providers are seeing {{delta}} more patients per month on average — {{providers}} providers \u00d7 {{delta}} patients = {{total}} additional patient visits per month.',
    phase3Roadmap: false,
  },
  {
    id: 'visits_per_clinician_hour',
    label: 'Visits per Clinician Hour',
    domain: 'capacity',
    phase: 2,
    inputType: 'before-after',
    unit: 'ratio',
    unitLabel: 'visits per hour',
    lowerIsBetter: false,
    source: 'epic',
    sourceLabel: 'Epic Clarity',
    description: 'Number of completed patient visits per scheduled clinician hour.',
    whyItMatters: 'Throughput efficiency — the scheduling-level signal that documentation savings are translating to access.',
    plainEnglishTemplate: 'Throughput improved from {{before}} to {{after}} visits per clinician hour — a {{delta}} visit improvement per hour scheduled.',
    phase3Roadmap: false,
  },

  {
    id: 'wrvu',
    label: 'wRVU per Encounter',
    domain: 'revenue',
    phase: 1,
    inputType: 'before-after',
    unit: 'wRVU',
    unitLabel: 'work RVUs',
    lowerIsBetter: false,
    source: 'epic',
    sourceLabel: 'Epic Clarity',
    description: 'Average work Relative Value Units generated per encounter.',
    whyItMatters: 'Better documentation captures the complexity of the visit — directly increasing wRVU capture.',
    plainEnglishTemplate: 'wRVU per encounter improved {{delta}} — across {{encounters}} encounters at ${{cf}} conversion, that\'s {{value}} in additional revenue.',
    phase3Roadmap: false,
  },
  {
    id: 'em_level',
    label: 'Level of Service (E/M)',
    domain: 'revenue',
    phase: 1,
    inputType: 'before-after',
    unit: 'level',
    unitLabel: 'avg E/M level (1–5)',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'RCM Platform',
    description: 'Average E/M level (99211–99215) across Abridge-documented encounters.',
    whyItMatters: 'Documentation specificity supports higher E/M level assignment — each level up represents meaningful revenue per encounter.',
    plainEnglishTemplate: 'Average E/M level improved from {{before}} to {{after}} — documentation is supporting more accurate visit complexity coding.',
    phase3Roadmap: false,
  },
  {
    id: 'hcc_capture',
    label: 'HCC Capture Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent of HCC gaps closed',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'Coding Analytics',
    description: 'Percentage of known Hierarchical Condition Category gaps that are documented and coded at the visit.',
    whyItMatters: 'In Medicare Advantage, undocumented HCCs mean underfunded capitation. Abridge captures conditions discussed but not written.',
    plainEnglishTemplate: 'HCC capture improved {{delta}} points — more chronic conditions discussed in the visit are making it into the coded record, supporting accurate risk adjustment.',
    phase3Roadmap: false,
  },
  {
    id: 'clean_claim_rate',
    label: 'Clean Claim Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent first-pass clean',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'RCM Platform',
    description: 'Percentage of claims accepted on first submission without requiring correction or additional documentation.',
    whyItMatters: 'Better documentation means fewer incomplete or unsupported claims — less rework, faster payment.',
    plainEnglishTemplate: 'Clean claim rate improved from {{before}}% to {{after}}% — {{delta}} points fewer claims requiring rework or resubmission.',
    phase3Roadmap: false,
  },
  {
    id: 'initial_denial_rate',
    label: 'Initial Denial Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent denied on first submission',
    lowerIsBetter: true,
    source: 'rcm',
    sourceLabel: 'RCM Platform',
    description: 'Percentage of claims denied on first submission.',
    whyItMatters: 'Denials are directly tied to documentation gaps. Abridge reduces the gaps that trigger denials.',
    plainEnglishTemplate: 'Initial denial rate dropped from {{before}}% to {{after}}% — {{delta}} points fewer claims denied on first submission.',
    phase3Roadmap: false,
  },
  {
    id: 'net_collection_rate',
    label: 'Net Collection Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent of net collectible revenue collected',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'RCM Platform',
    description: 'Net collections as a percentage of net collectible revenue after adjustments.',
    whyItMatters: 'The downstream impact of cleaner documentation and fewer denials — more of what\'s owed is actually collected.',
    plainEnglishTemplate: 'Net collection rate improved from {{before}}% to {{after}}% — more of what\'s billed is being collected.',
    phase3Roadmap: false,
  },

  {
    id: 'physician_retention',
    label: 'Physician Retention Rate',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent annual retention',
    lowerIsBetter: false,
    source: 'hris',
    sourceLabel: 'HRIS',
    description: 'Annual physician retention rate by department.',
    whyItMatters: 'The long-term workforce ROI signal. Each retained physician represents $500K–$1M in avoided replacement cost.',
    plainEnglishTemplate: 'Physician retention improved from {{before}}% to {{after}}%.',
    phase3Roadmap: true,
  },
  {
    id: 'third_next_available',
    label: '3rd Next Available',
    domain: 'capacity',
    phase: 3,
    inputType: 'before-after',
    unit: 'days',
    unitLabel: 'days to 3rd next available appointment',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'Epic Cadence',
    description: 'Days until the third next available appointment slot per provider — the standard measure of access.',
    whyItMatters: 'When time savings are reinvested in scheduling capacity, access improves. This is the proof.',
    plainEnglishTemplate: 'Time to 3rd next available dropped from {{before}} to {{after}} days — patients are getting in sooner.',
    phase3Roadmap: true,
  },
  {
    id: 'hedis',
    label: 'HEDIS Performance',
    domain: 'quality',
    phase: 3,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'composite score',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'Quality Registry',
    description: 'Performance on HEDIS quality measures relevant to the patient population.',
    whyItMatters: 'Better documentation upstream feeds better quality measure performance downstream.',
    plainEnglishTemplate: 'HEDIS performance improved from {{before}} to {{after}}.',
    phase3Roadmap: true,
  },
  {
    id: 'raf_scores',
    label: 'RAF Scores',
    domain: 'revenue',
    phase: 3,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'avg risk adjustment factor',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'Coding Analytics',
    description: 'Average Risk Adjustment Factor score for Medicare Advantage patient population.',
    whyItMatters: 'RAF scores drive MA capitation payments. Better HCC capture and diagnosis specificity compound into higher RAF scores annually.',
    plainEnglishTemplate: 'Average RAF score improved from {{before}} to {{after}} — supporting more accurate capitation payments.',
    phase3Roadmap: true,
  },
  {
    id: 'net_patient_revenue',
    label: 'Net Patient Revenue',
    domain: 'revenue',
    phase: 3,
    inputType: 'before-after',
    unit: '$M',
    unitLabel: 'millions',
    lowerIsBetter: false,
    source: 'finance',
    sourceLabel: 'Finance System',
    description: 'Annual net patient revenue after adjustments, denials, and write-offs.',
    whyItMatters: 'The full compounded impact of Phase 1 and Phase 2 improvements on the bottom line.',
    plainEnglishTemplate: 'Net patient revenue grew from ${{before}}M to ${{after}}M over the deployment period.',
    phase3Roadmap: true,
  },
  {
    id: 'mips',
    label: 'MIPS Score',
    domain: 'quality',
    phase: 3,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'points',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'CMS / RCM Platform',
    description: 'Merit-based Incentive Payment System composite score.',
    whyItMatters: 'Better documentation quality drives higher MIPS scores and payment adjustments.',
    plainEnglishTemplate: 'MIPS score improved from {{before}} to {{after}} points.',
    phase3Roadmap: true,
  },
  {
    id: 'recapture_dx',
    label: 'Recapture Dx Rate',
    domain: 'revenue',
    phase: 3,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'Coding Analytics',
    description: 'Rate of recaptured diagnoses from prior year for risk-adjusted patients.',
    whyItMatters: 'AI documentation prompts help clinicians recapture chronic conditions that affect risk scores.',
    plainEnglishTemplate: 'Diagnosis recapture rate improved from {{before}}% to {{after}}%.',
    phase3Roadmap: true,
  },
];

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
      { key: "unitsLive", label: "Units Live", required: true },
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
  { key: 'encountersCaptured', label: 'Encounters Captured', description: 'Total encounters processed by Abridge' },
  { key: 'avgNoteAcceptanceRate', label: 'Note Acceptance Rate', suffix: '%', description: 'Percentage of generated notes accepted by providers' },
];

export function getMetricLabel(metricKey: string): string {
  for (const config of Object.values(CARE_SETTING_CONFIGS)) {
    for (const section of config.metricSections) {
      for (const metric of section.metrics) {
        if (metric.key === metricKey) return metric.label;
      }
    }
  }
  return metricKey;
}

export function getMetricSuffix(metricKey: string): string {
  for (const config of Object.values(CARE_SETTING_CONFIGS)) {
    for (const section of config.metricSections) {
      for (const metric of section.metrics) {
        if (metric.key === metricKey) return metric.suffix || '';
      }
    }
  }
  return '';
}

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
