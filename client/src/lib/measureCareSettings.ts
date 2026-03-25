import type { MeasureCareSetting } from "./measureCalculator";

export interface MetricDefinition {
  id: string;
  label: string;
  domain: 'foundational' | 'quality' | 'workforce' | 'capacity' | 'revenue' | 'throughput' | 'patientFlow';
  phase: 1 | 2 | 3;
  inputType: 'single' | 'before-after';
  unit: string;
  unitLabel: string;
  lowerIsBetter: boolean;
  source: 'abridge' | 'epic' | 'rcm' | 'coding' | 'survey' | 'cdi' | 'hris' | 'finance' | 'partner';
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

export const ED_METRICS: MetricDefinition[] = [
  {
    id: 'docTimePerEncounter',
    label: 'Documentation Time per Encounter',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Active time spent in the note per ED encounter.',
    whyItMatters: 'Pulled from Abridge platform data. Measures documentation burden per encounter.',
    plainEnglishTemplate:
      'ED providers are spending {{after}} minutes per note, down from {{before}}. ' +
      "That's {{delta}} minutes back per encounter — across {{providers}} providers and {{encounters}} annual encounters, " +
      "that's {{totalHours}} hours of documentation time returned annually.",
  },
  {
    id: 'wowTime',
    label: 'Words on Workday (WoW) Time',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'ED-specific Abridge metric capturing after-hours documentation burden.',
    whyItMatters: 'Captures after-hours and outside-shift documentation burden on Epic Clarity.',
    plainEnglishTemplate:
      "WoW time is down {{delta}} minutes per encounter. " +
      "For {{providers}} ED providers, that's approximately {{totalHours}} hours of after-hours documentation eliminated annually.",
  },
  {
    id: 'noteCompletionTime',
    label: 'Note Completion Time',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hours',
    unitLabel: 'hours',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Time from end of encounter to note sign-off.',
    whyItMatters: 'Pulled from Abridge platform or EHR timestamp data.',
    plainEnglishTemplate:
      "Note completion time has dropped from {{before}}h to {{after}}h after the encounter ends. " +
      "That's {{delta}} hours per note — for {{providers}} providers doing {{encounters}} encounters, " +
      'this represents {{totalHours}} hours of shifted or eliminated after-hours work annually.',
  },
  {
    id: 'timeToCloseEncounter',
    label: 'Time to Close Encounter',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hours',
    unitLabel: 'hours',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'EHR / Epic',
    description: 'Time from patient discharge to full encounter closure in the EHR.',
    whyItMatters: 'Typically sourced from Epic reporting.',
    plainEnglishTemplate:
      'Encounter close time is down from {{before}}h to {{after}}h. ' +
      'Faster closures reduce after-hours work and improve billing lag for your {{providers}} ED providers.',
  },
  {
    id: 'workAfterHours',
    label: 'Work After Hours',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes/week',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'EHR / Epic Signal',
    description: 'After-hours EHR activity per provider per week.',
    whyItMatters: 'Source: Epic Signal, Abridge platform, or provider self-report.',
    plainEnglishTemplate:
      "After-hours documentation is down {{delta}} minutes per provider per week. " +
      "Across {{providers}} ED providers over 52 weeks, that's {{totalHours}} hours of protected time returned annually.",
  },
  {
    id: 'burnoutAssessment',
    label: 'Burnout Assessment (Survey)',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'survey score',
    lowerIsBetter: true,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Before/after survey comparison using MBI, single-item, or Maslach scale.',
    whyItMatters: 'Leading indicator for retention. Each ED turnover event typically costs $500K–$1M+.',
    plainEnglishTemplate:
      'Burnout scores improved from {{before}} to {{after}} on your survey scale. ' +
      'This is a leading indicator for retention. For ED physicians, each turnover event typically costs $500K–$1M+ in replacement costs.',
  },
  {
    id: 'likelihoodToStay',
    label: 'Likelihood to Stay (Survey)',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Before/after pulse survey — % responding "likely" or "very likely" to stay.',
    whyItMatters: 'Align with HR and medical staff office on survey instrument and timing.',
    plainEnglishTemplate:
      "Provider retention intent is up {{delta}} points — {{after}}% now say they're likely to stay, vs {{before}}% before Abridge.",
  },
  {
    id: 'wrvu',
    label: 'wRVU per Provider per Shift',
    domain: 'revenue',
    phase: 1,
    inputType: 'before-after',
    unit: 'rvu',
    unitLabel: 'wRVU',
    lowerIsBetter: false,
    source: 'epic',
    sourceLabel: 'EHR / Billing',
    description: 'Per-shift wRVU comparison from provider productivity reports.',
    whyItMatters: 'Source: provider productivity reports from EHR or billing system.',
    plainEnglishTemplate:
      'wRVU per shift is up {{delta}} — from {{before}} to {{after}}. ' +
      "At your conversion rate, that's {{value}} per shift per provider.",
  },
  {
    id: 'emLevel',
    label: 'Average E/M Level (99281–99285)',
    domain: 'revenue',
    phase: 1,
    inputType: 'before-after',
    unit: 'level',
    unitLabel: 'E/M level',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'Revenue Cycle',
    description: 'ED E/M uses 99281–99285 scale. Each level step represents meaningful revenue.',
    whyItMatters: 'Source: charge capture / billing system.',
    plainEnglishTemplate:
      'Average E/M level has moved from {{before}} to {{after}} on the 99281–99285 scale. ' +
      'Each level step in ED billing is worth approximately $25–$80 per encounter.',
  },
  {
    id: 'lwbsRate',
    label: 'Left Without Being Seen (LWBS) Rate',
    domain: 'throughput',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'ADT / ED Dashboard',
    description: 'The signature ED throughput metric. Each LWBS patient is lost revenue.',
    whyItMatters: 'Each LWBS patient is lost revenue and a potential HCAHPS/quality flag.',
    plainEnglishTemplate:
      'LWBS rate is down from {{before}}% to {{after}}% — {{delta}} percentage points.',
  },
  {
    id: 'doorToProvider',
    label: 'Door-to-Provider Time',
    domain: 'throughput',
    phase: 2,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'EHR Timestamps',
    description: 'Time from patient arrival to first provider contact.',
    whyItMatters: 'Foundational throughput metric driving HCAHPS scores and LWBS reduction.',
    plainEnglishTemplate:
      'Door-to-provider time is down {{delta}} minutes — from {{before}} to {{after}} minutes. ' +
      'Faster initial contact drives HCAHPS scores, LWBS reduction, and CMS quality measures.',
  },
  {
    id: 'doorToDisposition',
    label: 'Door-to-Disposition Time',
    domain: 'throughput',
    phase: 2,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'EHR Timestamps',
    description: 'Time from arrival to admit/discharge decision.',
    whyItMatters: 'Reducing door-to-disposition improves boarding and bed availability.',
    plainEnglishTemplate:
      'Door-to-disposition is down {{delta}} minutes — from {{before}} to {{after}} minutes. ' +
      "For {{encounters}} annual visits, that's {{totalMinutes}} minutes of throughput recaptured.",
  },
  {
    id: 'patientProviderRatio',
    label: 'Patients per Provider per Shift',
    domain: 'throughput',
    phase: 2,
    inputType: 'before-after',
    unit: 'count',
    unitLabel: 'patients/shift',
    lowerIsBetter: false,
    source: 'epic',
    sourceLabel: 'Scheduling / EHR',
    description: 'Provider throughput — a direct measure of capacity.',
    whyItMatters: 'Increase without quality degradation is the strongest throughput signal.',
    plainEnglishTemplate:
      'Providers are seeing {{after}} patients per shift, up from {{before}} — {{delta}} more per shift per provider.',
  },
  {
    id: 'diagnosisCapture',
    label: 'Diagnosis Capture Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'CDI / Coding QA',
    description: 'Completeness of diagnosis coding per encounter.',
    whyItMatters: 'Undercaptured diagnoses in the ED reduce HCC scores and risk-adjustment revenue.',
    plainEnglishTemplate:
      'Diagnosis capture is up {{delta}} points — from {{before}}% to {{after}}% of encounters fully coded.',
  },
  {
    id: 'diagnosisSpecificity',
    label: 'Diagnosis Specificity Score',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'specificity score',
    lowerIsBetter: false,
    source: 'cdi',
    sourceLabel: 'CDI Platform',
    description: 'Specificity of ICD-10 coding per encounter.',
    whyItMatters: 'Higher specificity means more defensible coding and fewer denials.',
    plainEnglishTemplate:
      'Diagnosis specificity has improved from {{before}} to {{after}} on your CDI scoring scale. ' +
      'Higher specificity means more defensible coding, fewer denials, and better case mix index.',
  },
  {
    id: 'medicalNecessityDenialRate',
    label: 'Medical Necessity Denial Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: true,
    source: 'rcm',
    sourceLabel: 'Revenue Cycle',
    description: 'ED-specific denial category tied to insufficient clinical documentation.',
    whyItMatters: 'Denials often tied to insufficient documentation supporting the E/M level billed.',
    plainEnglishTemplate:
      'Medical necessity denial rate is down from {{before}}% to {{after}}% — a {{delta}}-point improvement.',
  },
  {
    id: 'cleanClaimRate',
    label: 'Clean Claim Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'Revenue Cycle',
    description: 'Percentage of ED claims that pass on first submission.',
    whyItMatters: 'Documentation completeness is the primary driver.',
    plainEnglishTemplate:
      'Clean claim rate is up {{delta}} points — from {{before}}% to {{after}}%. ' +
      'Each point of improvement reduces rework cost and accelerates cash flow.',
  },
  {
    id: 'netCollectionRate',
    label: 'Net Collection Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'Revenue Cycle',
    description: 'Percentage of collectible revenue actually collected.',
    whyItMatters: 'Downstream of denial rate and clean claim rate.',
    plainEnglishTemplate:
      'Net collection rate improved from {{before}}% to {{after}}%.',
  },
  {
    id: 'noteQualityScore',
    label: 'Note Quality Score (Star Rating)',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'stars',
    unitLabel: 'avg stars (1–5)',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Abridge platform metric reflecting clinical documentation completeness.',
    whyItMatters: 'Note quality is the upstream driver of coding accuracy, denial rates, and compliance.',
    plainEnglishTemplate:
      'Average note quality is now {{after}} stars — up {{delta}} from {{before}}. ' +
      'In the ED, note quality drives coding accuracy, denial rates, and compliance defensibility.',
  },
  {
    id: 'pressGaney',
    label: 'Press Ganey / Patient Experience Score',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'percentile',
    unitLabel: 'percentile rank',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Patient Experience',
    description: 'ED-specific HCAHPS/PG domain. Provider attentiveness is the primary driver.',
    whyItMatters: 'Directly affects value-based care contract performance and network reputation.',
    plainEnglishTemplate:
      'Patient experience scores have moved from {{before}}th to {{after}}th percentile — a {{delta}}-point improvement. ' +
      'Provider attentiveness accounts for the largest share of the top-box score in the ED.',
  },
  {
    id: 'physicianRetention',
    label: 'ED Physician / APP Retention Rate',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'hris',
    sourceLabel: 'HR / Medical Staff',
    description: 'Annual retention rate. ED physician turnover cost is typically $500K–$1M+ per physician.',
    whyItMatters: 'Source: HR / medical staff office.',
    plainEnglishTemplate:
      'ED physician/APP retention has moved from {{before}}% to {{after}}% — {{delta}} points.',
    phase3Roadmap: true,
  },
  {
    id: 'agencyLocumSpend',
    label: 'Agency / Locum Spend',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'annual spend',
    lowerIsBetter: true,
    source: 'finance',
    sourceLabel: 'Finance / Contracting',
    description: 'Annual total spend on locum/agency coverage.',
    whyItMatters: 'Reduction correlates with improved retention and reduced scheduling gaps.',
    plainEnglishTemplate:
      'Agency and locum spend is down from {{before}} to {{after}} — a {{delta}} reduction.',
    phase3Roadmap: true,
  },
  {
    id: 'netPatientRevenue',
    label: 'Net Patient Revenue per ED Visit',
    domain: 'revenue',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'per visit',
    lowerIsBetter: false,
    source: 'finance',
    sourceLabel: 'Finance',
    description: 'Rolls up E/M improvement, denial reduction, and collection rate into a per-visit figure.',
    whyItMatters: 'Annual strategic metric.',
    plainEnglishTemplate:
      'Net patient revenue per visit has moved from {{before}} to {{after}} — up {{delta}} per visit.',
    phase3Roadmap: true,
  },
];

export const INPATIENT_METRICS: MetricDefinition[] = [
  {
    id: 'docTimePerNote',
    label: 'Documentation Time per Note',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Active time spent documenting per inpatient encounter. Includes H&P, progress notes, and discharge documentation.',
    whyItMatters: 'Abridge platform metric. Active time spent documenting per inpatient encounter.',
    plainEnglishTemplate:
      'Inpatient providers are spending {{after}} minutes per note, down from {{before}}. ' +
      "That's {{delta}} minutes back per admission — across {{providers}} providers and {{encounters}} annual admissions, " +
      "that's {{totalHours}} hours of documentation time returned annually.",
  },
  {
    id: 'noteQualityScore',
    label: 'Note Quality Score (Star Rating)',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'stars',
    unitLabel: 'avg stars (1–5)',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'In inpatient, note quality is directly upstream of CC/MCC capture and DRG assignment accuracy.',
    whyItMatters: 'Abridge platform metric. Documentation quality drives DRG accuracy, CC/MCC capture, and compliance.',
    plainEnglishTemplate:
      'Average note quality is {{after}} stars — up {{delta}} from {{before}}. ' +
      'In inpatient, documentation quality is the upstream driver of DRG accuracy, CC/MCC capture, and compliance defensibility.',
  },
  {
    id: 'wowTime',
    label: 'Words on Workday (WoW) Time',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'After-hours and outside-shift documentation burden. Particularly significant for hospitalists covering overnight.',
    whyItMatters: 'After-hours documentation burden sourced from Epic Clarity or Abridge platform.',
    plainEnglishTemplate:
      'WoW time is down {{delta}} minutes per admission. ' +
      "For {{providers}} hospitalists, that's {{totalHours}} hours of after-hours documentation eliminated annually — " +
      'a direct driver of overnight burden and on-call burnout.',
  },
  {
    id: 'timeToSignNote',
    label: 'Time to Sign Note',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hours',
    unitLabel: 'hours',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'EHR Timestamps',
    description: 'Time from end of patient interaction to completed, signed note. CMS requires H&Ps within 24h.',
    whyItMatters: 'Source: EHR timestamp reports. CMS requires H&Ps within 24h; discharge summaries within 30 days.',
    plainEnglishTemplate:
      'Note sign-off time is down from {{before}}h to {{after}}h. ' +
      'Across {{providers}} providers and {{encounters}} annual admissions, ' +
      'this eliminates delinquent-record risk and reduces the after-shift burden that drives hospitalist turnover.',
  },
  {
    id: 'workAfterHours',
    label: 'Work After Hours',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes/week',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'EHR / Epic Signal',
    description: 'After-hours EHR activity per provider per week. Hospitalists are disproportionately affected.',
    whyItMatters: 'Source: Epic Signal, pajama time reports, or provider self-report.',
    plainEnglishTemplate:
      "After-hours documentation is down {{delta}} minutes per provider per week. " +
      "For {{providers}} inpatient providers over 52 weeks, that's {{totalHours}} hours of protected time returned annually.",
  },
  {
    id: 'burnoutAssessment',
    label: 'Burnout Assessment (Survey)',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'survey score',
    lowerIsBetter: true,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Before/after survey comparison using MBI, single-item, or Maslach scale.',
    whyItMatters: 'Hospitalist burnout is heavily documentation-driven — high-signal metric for inpatient Abridge deployments.',
    plainEnglishTemplate:
      'Burnout scores improved from {{before}} to {{after}} on your survey scale. ' +
      'Documentation burden accounts for roughly 40–60% of hospitalist burnout drivers.',
  },
  {
    id: 'likelihoodToStay',
    label: 'Likelihood to Stay (Survey)',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Clinician Survey',
    description: 'Before/after pulse survey — % responding "likely" or "very likely" to stay.',
    whyItMatters: 'Hospitalist turnover costs $300K–$500K+ per physician. Align with medical staff office on instrument.',
    plainEnglishTemplate:
      "Provider retention intent is up {{delta}} points — {{after}}% now say they're likely to stay, vs {{before}}% before Abridge.",
  },
  {
    id: 'caseMixIndex',
    label: 'Case Mix Index (CMI)',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: 'index',
    unitLabel: 'CMI',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Finance / DRG Analytics',
    description: 'The single most important inpatient revenue metric. CMI is a weighted average of DRG relative weights.',
    whyItMatters: 'Even small CMI movements represent significant revenue at scale. Source: finance / DRG analytics team.',
    plainEnglishTemplate:
      'Case Mix Index has moved from {{before}} to {{after}} — a {{delta}} point improvement. ' +
      'At your volume of {{encounters}} annual admissions, each 0.1 CMI improvement is worth significant additional net revenue.',
  },
  {
    id: 'ccMccCaptureRate',
    label: 'CC/MCC Capture Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'CDI / Coding QA',
    description: 'CC/MCC capture rate — documentation completeness is the primary lever.',
    whyItMatters: 'If it is not in the note, CDI cannot query it. Source: CDI platform or coding QA.',
    plainEnglishTemplate:
      'CC/MCC capture rate is up {{delta}} points — from {{before}}% to {{after}}%. ' +
      'Each percentage point of CC/MCC improvement drives DRG weight and directly impacts CMI.',
  },
  {
    id: 'drgAccuracyRate',
    label: 'DRG Accuracy Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Revenue Cycle',
    description: 'Percentage of cases where initial DRG assignment matches final DRG after coding review.',
    whyItMatters: 'Higher accuracy means fewer reworks and faster billing. Source: coding QA or CDI platform.',
    plainEnglishTemplate:
      'DRG accuracy is up {{delta}} points — from {{before}}% to {{after}}%. ' +
      'Fewer DRG corrections means faster claim submission and reduced coding rework.',
  },
  {
    id: 'diagnosisCapture',
    label: 'Diagnosis Capture Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'coding',
    sourceLabel: 'CDI / Coding QA',
    description: 'Completeness of diagnosis coding per admission.',
    whyItMatters: 'Undercaptured diagnoses reduce HCC scores and risk-adjustment revenue.',
    plainEnglishTemplate:
      'Diagnosis capture is up {{delta}} points — from {{before}}% to {{after}}% of admissions fully coded.',
  },
  {
    id: 'medicalNecessityDenialRate',
    label: 'Medical Necessity Denial Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: true,
    source: 'rcm',
    sourceLabel: 'Revenue Cycle',
    description: 'Denials tied to insufficient clinical documentation supporting the admission or procedure.',
    whyItMatters: 'Inpatient denials are high-dollar. Documentation completeness is the primary lever.',
    plainEnglishTemplate:
      'Medical necessity denial rate is down from {{before}}% to {{after}}% — a {{delta}}-point improvement.',
  },
  {
    id: 'cleanClaimRate',
    label: 'Clean Claim Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'rcm',
    sourceLabel: 'Revenue Cycle',
    description: 'Percentage of inpatient claims that pass on first submission.',
    whyItMatters: 'Documentation completeness is the primary driver.',
    plainEnglishTemplate:
      'Clean claim rate is up {{delta}} points — from {{before}}% to {{after}}%. ' +
      'Each point of improvement reduces rework cost and accelerates cash flow.',
  },
  {
    id: 'lengthOfStay',
    label: 'Average Length of Stay (ALOS)',
    domain: 'patientFlow',
    phase: 2,
    inputType: 'before-after',
    unit: 'days',
    unitLabel: 'days',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'ADT / Case Management',
    description: 'The signature inpatient flow metric. Documentation delays are a meaningful component of excess days.',
    whyItMatters: 'Each excess day costs $2,000–$4,000+. Documentation completeness drives discharge readiness.',
    plainEnglishTemplate:
      'Average length of stay is down {{delta}} days — from {{before}} to {{after}} days. ' +
      "At {{encounters}} annual admissions, that's {{totalDays}} patient-days freed annually.",
  },
  {
    id: 'dischargeBeforeNoon',
    label: 'Discharge Before Noon Rate',
    domain: 'patientFlow',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'ADT / EHR',
    description: 'Discharge timing drives ED boarding and admit-from-ED flow.',
    whyItMatters: 'Source: ADT/EHR discharge timestamp reports.',
    plainEnglishTemplate:
      'Discharge before noon rate is up {{delta}} points — from {{before}}% to {{after}}% of discharges. ' +
      'Earlier discharges free beds for afternoon admits and reduce ED boarding time.',
  },
  {
    id: 'dischargeDelayRate',
    label: 'Discharge Delay Rate',
    domain: 'patientFlow',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Case Management',
    description: 'Percentage of discharges delayed due to incomplete documentation.',
    whyItMatters: 'Each delayed discharge costs the hospital approximately $2,000–$4,000 in extra bed-days.',
    plainEnglishTemplate:
      'Documentation-related discharge delays are down {{delta}} points — from {{before}}% to {{after}}% of cases.',
  },
  {
    id: 'readmissionRate30Day',
    label: '30-Day Readmission Rate',
    domain: 'patientFlow',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Quality Department',
    description: 'CMS-reportable metric. Discharge summary completeness is a primary driver.',
    whyItMatters: 'Under HRRP, excess readmissions generate CMS penalties. Source: quality department or EHR analytics.',
    plainEnglishTemplate:
      '30-day readmission rate is down {{delta}} points — from {{before}}% to {{after}}%. ' +
      'At {{encounters}} admissions, a {{delta}}-point reduction reduces penalty exposure and uncompensated care.',
  },
  {
    id: 'hcahpsScore',
    label: 'HCAHPS Composite Score',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'percentile',
    unitLabel: 'percentile rank',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Patient Experience',
    description: 'Inpatient patient experience. "Communication with doctors" domain is most directly affected.',
    whyItMatters: 'HCAHPS performance affects value-based purchasing payments and health system reputation.',
    plainEnglishTemplate:
      'HCAHPS scores have moved from {{before}}th to {{after}}th percentile — a {{delta}}-point improvement. ' +
      'The "communication with doctors" domain is most directly tied to ambient documentation.',
  },
  {
    id: 'coreQualityMeasureCompliance',
    label: 'Core Quality Measure Compliance',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Quality Department',
    description: 'CMS/TJC core measures. Documentation completeness is often the compliance gap.',
    whyItMatters: 'Documentation components (sepsis bundle timing, VTE documentation) improve without additional provider effort.',
    plainEnglishTemplate:
      'Core quality measure compliance is up {{delta}} points — from {{before}}% to {{after}}%.',
  },
  {
    id: 'pressGaney',
    label: 'Press Ganey Inpatient Score',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'percentile',
    unitLabel: 'percentile rank',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Patient Experience',
    description: 'Inpatient-specific PG score. Physician communication domain is the primary lever.',
    whyItMatters: 'Provider attentiveness — enabled by not typing during the encounter — is the primary driver.',
    plainEnglishTemplate:
      'Press Ganey inpatient scores have improved from {{before}}th to {{after}}th percentile. ' +
      'Provider attentiveness carries the highest weight in the inpatient PG composite.',
  },
  {
    id: 'physicianRetention',
    label: 'Hospitalist / Inpatient Physician Retention Rate',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'hris',
    sourceLabel: 'HR / Medical Staff',
    description: 'Annual retention rate. Hospitalist turnover cost is typically $300K–$500K per physician.',
    whyItMatters: 'Source: HR / medical staff office.',
    plainEnglishTemplate:
      'Inpatient physician retention has moved from {{before}}% to {{after}}% — {{delta}} points.',
    phase3Roadmap: true,
  },
  {
    id: 'agencyLocumSpend',
    label: 'Agency / Locum Spend',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'annual spend',
    lowerIsBetter: true,
    source: 'finance',
    sourceLabel: 'Finance / Contracting',
    description: 'Annual total spend on locum/agency hospitalist coverage.',
    whyItMatters: 'Reflects improved hospitalist stability and reduced scheduling gaps.',
    plainEnglishTemplate:
      'Agency and locum spend is down from {{before}} to {{after}} — a {{delta}} reduction.',
    phase3Roadmap: true,
  },
  {
    id: 'netPatientRevenue',
    label: 'Net Patient Revenue per Admission',
    domain: 'revenue',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'per admission',
    lowerIsBetter: false,
    source: 'finance',
    sourceLabel: 'Finance',
    description: 'Rolls up CMI improvement, denial reduction, LOS reduction, and DRG accuracy into a per-admission figure.',
    whyItMatters: 'Annual strategic metric. Source: finance.',
    plainEnglishTemplate:
      'Net patient revenue per admission has moved from {{before}} to {{after}} — up {{delta}} per case. ' +
      'This rolls up CMI improvement, CC/MCC capture, denial reduction, and LOS savings into one number.',
    phase3Roadmap: true,
  },
  {
    id: 'valueBasedCarePerformance',
    label: 'Value-Based Care Contract Performance',
    domain: 'quality',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'incentive earned',
    lowerIsBetter: false,
    source: 'finance',
    sourceLabel: 'Value-Based Care Team',
    description: 'HCAHPS, readmission rates, and quality measures all feed into VBP/shared savings performance.',
    whyItMatters: 'Source: value-based care team or payer contracts.',
    plainEnglishTemplate:
      'Value-based care performance has improved from {{before}} to {{after}} in earned incentives — {{delta}} in incremental performance pay.',
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

export type DomainKey = 'workforce' | 'revenue' | 'quality' | 'capacity' | 'throughput' | 'patientFlow' | 'foundational';

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
  foundational: 'Foundational',
};

export function getSettingDomains(setting: MeasureCareSetting): { key: DomainKey; label: string }[] {
  if (setting === 'outpatient') {
    return [
      { key: 'foundational', label: 'Foundational' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'workforce', label: 'Workforce' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'quality', label: 'Quality' },
    ];
  }
  if (setting === 'ed') {
    return [
      { key: 'throughput', label: 'Throughput' },
      { key: 'workforce', label: 'Workforce' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'quality', label: 'Quality' },
    ];
  }
  if (setting === 'inpatient') {
    return [
      { key: 'patientFlow', label: 'Patient Flow' },
      { key: 'workforce', label: 'Workforce' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'quality', label: 'Quality' },
    ];
  }
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
  if (setting === 'outpatient') {
    return OUTPATIENT_METRICS.filter(m => !m.phase3Roadmap).length;
  }
  if (setting === 'ed') {
    return ED_METRICS.filter(m => !m.phase3Roadmap).length;
  }
  if (setting === 'inpatient') {
    return INPATIENT_METRICS.filter(m => !m.phase3Roadmap).length;
  }
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
