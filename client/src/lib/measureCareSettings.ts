import type { MeasureCareSetting } from "./measureCalculator";

export interface MetricDefinition {
  id: string;
  label: string;
  domain: 'foundational' | 'quality' | 'workforce' | 'capacity' | 'revenue' | 'throughput' | 'patientFlow' | 'staffing';
  phase: 1 | 2 | 3;
  inputType: 'single' | 'before-after';
  unit: string;
  unitLabel: string;
  lowerIsBetter: boolean;
  source: 'abridge' | 'epic' | 'rcm' | 'coding' | 'survey' | 'cdi' | 'hris' | 'finance' | 'partner';
  sourceLabel: string;
  description: string;
  whyItMatters: string;
  financialStream?: string;
  plainEnglishTemplate: string;
  phase3Roadmap?: boolean;
  step?: number;
  roiQuadrant: 'Capacity' | 'Workforce' | 'Revenue' | 'Quality';
  shortDescription: string;
  exploreVisibility: 'driver-quantified' | 'driver-qualitative' | 'hidden';
  childOfDriver?: string;
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
    whyItMatters: 'Every downstream financial calculation is scoped to Abridge-documented encounters. Low utilization doesn\'t mean low value, it means less of your total encounter volume is in the calculation. This metric sets the denominator.',
    financialStream: 'Adoption signal',
    plainEnglishTemplate: '{{after}}% of eligible providers are actively using Abridge.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'user_retention',
    label: '% Abridge User Retention',
    domain: 'foundational',
    phase: 1,
    inputType: 'single',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Percentage of providers who continue using Abridge month-over-month.',
    whyItMatters: 'Retained users are the only users generating data. A provider who adopted and stopped using Abridge contributes $0 to every value stream. Retention rate determines what percentage of your \'live\' count is actually in the model.',
    financialStream: 'Adoption signal',
    plainEnglishTemplate: '{{after}}% of Abridge users continue using the tool month-over-month.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'consent_rate',
    label: 'Patient Consent Rate',
    domain: 'foundational',
    phase: 2,
    inputType: 'single',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Percentage of patients who consent to ambient recording.',
    whyItMatters: 'Ambient documentation only applies to consented encounters. A 10% consent rate on a 10,000 encounter base means 9,000 encounters are outside the calculation entirely. Most organizations reach 85\u201395% within 90 days.',
    financialStream: 'Adoption signal',
    plainEnglishTemplate: '{{after}}% of patients consent to Abridge recording.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Star rating is a proxy for note completeness and accuracy. It doesn\'t directly feed a dollar calculation, but it validates that the documentation Abridge is producing is high enough quality to support the billing, coding, and HCC claims made in other metrics.',
    financialStream: 'Documentation quality',
    plainEnglishTemplate: 'Average note star rating improved from {{before}} to {{after}} stars.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Provider-assigned quality rating of generated notes (typically 1-5 scale).',
    exploreVisibility: 'driver-qualitative',
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
    whyItMatters: 'When a chronic condition is discussed but not documented, it cannot be coded. For Medicare Advantage patients, each uncoded HCC condition represents a missed risk adjustment payment \u2014 typically $1,200\u2013$1,500 per condition per year from CMS. The mechanic: Abridge captures the diagnosis in the note \u2192 coder can code it \u2192 plan receives the RAF-adjusted payment. A 5pp improvement on 5,000 MA encounters can represent hundreds of thousands in recaptured revenue.',
    financialStream: 'HCC value \u00b7 Billing capture',
    plainEnglishTemplate: 'Diagnosis capture improved {{delta}} points, more of what\'s discussed in the visit is making it into the record.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Share of diagnoses discussed during the encounter that appear in the coded record.',
    exploreVisibility: 'driver-qualitative',
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
    whyItMatters: 'ICD-10 has thousands of codes, and payers reimburse differently based on specificity level. \u2018Diabetes\u2019 (E11.9) is worth less than \u2018Type 2 diabetes with CKD stage 3\u2019 (E11.65). Abridge captures the clinical detail providers discuss \u2014 which allows coders to use the more specific, higher-value code. Each specificity shift also affects HCC tier and RAF score.',
    financialStream: 'HCC value \u00b7 Billing capture',
    plainEnglishTemplate: 'Diagnosis specificity improved from {{before}}% to {{after}}%, {{delta}} more percentage points of diagnoses coded to highest specificity.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Share of diagnoses coded to the highest available ICD-10 specificity.',
    exploreVisibility: 'driver-qualitative',
  },

  {
    id: 'time_to_close',
    label: 'Time to Close Encounter',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hours',
    unitLabel: 'hours',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'EHR report',
    description: 'Average time from encounter end to note signature.',
    whyItMatters: 'Time to close measures how long documentation follows a provider after the patient leaves. The financial path isn\'t the time itself \u2014 physicians are salaried. The path is: high close times correlate with higher after-hours burden, higher burnout scores, and lower likelihood-to-stay. A reduction here feeds the retention risk model downstream, not a time-dollar calculation.',
    financialStream: 'Workforce burden',
    plainEnglishTemplate: 'Time to close dropped {{delta}} hours per encounter, notes are being completed closer to the point of care.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'work_after_hours_perceived',
    label: 'Work After Hours (Perceived)',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent reporting after-hours work',
    lowerIsBetter: true,
    source: 'survey',
    sourceLabel: 'Pulse Survey',
    description: 'Percentage of providers who report doing documentation work after hours.',
    whyItMatters: 'After-hours documentation is the primary burnout driver in most physician surveys. The financial mechanic: providers who report high after-hours burden score significantly lower on likelihood-to-stay surveys. When that survey score improves, departure probability changes. This metric provides the leading signal \u2014 it\u2019s the \u2018why\u2019 behind the retention numbers, which makes the downstream cost avoidance defensible.',
    financialStream: 'Retention cost',
    plainEnglishTemplate: 'After-hours work perception dropped from {{before}}% to {{after}}% of providers, {{delta}} fewer percentage points report working after hours.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'work_outside_work_empirical',
    label: 'Work Outside Work (Empirical)',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hrs/wk',
    unitLabel: 'hours per week',
    lowerIsBetter: true,
    source: 'epic',
    sourceLabel: 'EHR report',
    description: 'Average hours per week providers spend on documentation outside scheduled work hours.',
    whyItMatters: 'Empirical after-hours documentation \u2014 from EHR audit trails \u2014 is more defensible than survey perception because it\'s not self-reported. The financial path isn\'t hours \u00d7 salary: physicians are salaried and that math doesn\'t hold. The path is that providers doing documentation at 10pm have measurably lower likelihood-to-stay scores \u2014 and each departure costs $350K\u2013$500K to replace. This metric provides the signal. The retention cost model provides the dollar.',
    financialStream: 'Retention cost',
    plainEnglishTemplate: 'Providers are spending {{delta}} fewer hours per week on documentation outside of work, down from {{before}} to {{after}} hrs/wk.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: 'EHR activity logged outside scheduled clinical hours, derived from audit logs. A common signal for after-hours documentation work.',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'Validated burnout instruments (Maslach, MBI-HSS) are predictive of departure. The mechanic: physicians scoring in the high-burnout range have 2\u20133\u00d7 the departure rate of those in the low range. A 10-point normalized improvement in burnout score correlates with roughly a 1% reduction in annualized departure probability. At 100 providers \u00d7 $350K AMGA replacement cost, that\u2019s $350K of cost avoidance per 10-point improvement.',
    financialStream: 'Retention cost',
    plainEnglishTemplate: 'Burnout score improved from {{before}} to {{after}}, a {{delta}}-point improvement on a 100-point scale.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: 'Score from a validated burnout instrument (e.g., Maslach Burnout Inventory). Used as a leading indicator for retention risk.',
    exploreVisibility: 'driver-qualitative',
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
    whyItMatters: 'This metric measures the percentage of providers who say they\u2019re likely to still be here in 12 months. The financial mechanic: (1) baseline \u2018at-risk\u2019 population = 100% minus this percentage; (2) industry data shows roughly 15\u201325% of at-risk providers actually depart in a 12-month window; (3) a 5pp improvement in a 100-physician group moves 5 providers from at-risk to stable \u2014 at 20% conversion that\u2019s 1 departure avoided; (4) at AMGA\u2019s $350K benchmark, 1 avoided departure = $350K.',
    financialStream: 'Retention cost',
    plainEnglishTemplate: 'Likelihood to stay improved from {{before}}% to {{after}}%, {{delta}} more percentage points of clinicians plan to stay.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: 'Survey item measuring intent to remain in current role over a defined timeframe (typically 12 months).',
    exploreVisibility: 'driver-quantified',
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
    sourceLabel: 'EHR report',
    description: 'Average minutes spent in the note per appointment, including review and edits.',
    whyItMatters: 'Minutes per appointment spent in the note is the upstream input to the capacity calculation. The mechanic: minutes saved \u00d7 encounters/day \u00d7 working days = total hours recovered. Those hours can be redeployed as additional patient slots. The model uses your revenue-per-visit rate to translate slots into dollars.',
    financialStream: 'Capacity revenue',
    plainEnglishTemplate: 'Note time dropped {{delta}} minutes per encounter. Across {{encounters}} Abridge encounters, that\'s {{totalHours}} hours of capacity recovered.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: 'Average minutes spent actively documenting per outpatient encounter, captured from EHR audit logs.',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'Self-reported effort reduction is a reasonable proxy when time-tracking data isn\u2019t available. It\u2019s less precise than time-in-note, but the mechanic is the same: percentage reduction \u00d7 estimated minutes/note \u00d7 encounters = hours recovered \u2192 patient slots \u2192 revenue. Useful for early-stage conversations where hard data isn\u2019t in yet.',
    financialStream: 'Capacity revenue',
    plainEnglishTemplate: 'Providers report {{after}}% reduction in documentation effort, up from {{before}}% baseline.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    sourceLabel: 'EHR report',
    description: 'Average number of patients seen per provider per month.',
    whyItMatters: 'This is the direct capacity revenue driver \u2014 the cleanest metric on this screen. The mechanic: (after \u2212 before) \u00d7 providers \u00d7 12 months \u00d7 revenue-per-visit = annual revenue impact. No assumptions about conversion rates or attribution needed \u2014 if the number is real, the math is straightforward. A 1-patient-per-provider-per-month improvement on a 100-provider group at $200/visit = $240K/year.',
    financialStream: 'Capacity revenue',
    plainEnglishTemplate: 'Providers are seeing {{delta}} more patients per month on average, {{providers}} providers \u00d7 {{delta}} patients = {{total}} additional patient visits per month.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: 'Average patient encounters per provider per month.',
    exploreVisibility: 'driver-quantified',
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
    sourceLabel: 'EHR report',
    description: 'Number of completed patient visits per scheduled clinician hour.',
    whyItMatters: 'Throughput per hour measures how efficiently providers move through patient volume. The financial mechanic: improvement in visits/hour \u00d7 scheduled hours \u00d7 working days \u00d7 revenue-per-visit = incremental revenue from the same staffing base. Most useful in high-volume ambulatory or ED settings where scheduling is tight and every slot has value.',
    financialStream: 'Capacity revenue',
    plainEnglishTemplate: 'Throughput improved from {{before}} to {{after}} visits per clinician hour, a {{delta}} visit improvement per hour scheduled.',
    phase3Roadmap: false,
    roiQuadrant: 'Capacity',
    shortDescription: 'Completed patient visits per scheduled clinician hour.',
    exploreVisibility: 'driver-quantified',
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
    sourceLabel: 'EHR report',
    description: 'Average work Relative Value Units generated per encounter.',
    whyItMatters: 'wRVU is the unit of physician reimbursement in outpatient. The mechanic is direct: (after \u2212 before) wRVU \u00d7 Abridge-documented encounters \u00d7 conversion factor ($33 default) = billing capture. Better documentation allows coders to justify higher E/M levels, which map to higher wRVU values. A 0.1 wRVU improvement on 10,000 encounters at $33 = $33,000. This is not a projection \u2014 it\u2019s arithmetic from your data.',
    financialStream: 'Billing capture',
    plainEnglishTemplate: 'wRVU per encounter improved {{delta}}, across {{encounters}} encounters at ${{cf}} conversion, that\'s {{value}} in additional revenue.',
    phase3Roadmap: false,
    roiQuadrant: 'Revenue',
    shortDescription: 'Average work RVU value per outpatient encounter.',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'E/M levels (99211\u201399215) have defined wRVU values. A shift from average 99213 to 99214 is roughly a 0.7 wRVU difference per encounter. The mechanic: (after level \u2212 before level) \u00d7 wRVU difference per level \u00d7 encounters \u00d7 conversion factor = billing capture. This is the second path to billing capture if wRVU data isn\u2019t available \u2014 coders can report before/after average level, and the model translates it.',
    financialStream: 'Billing capture',
    plainEnglishTemplate: 'Average E/M level improved from {{before}} to {{after}}, documentation is supporting more accurate visit complexity coding.',
    phase3Roadmap: false,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Medicare Advantage plans are paid by CMS based on the risk (RAF) score of their enrolled population. Each HCC code contributes to that score. The mechanic: (after rate \u2212 before rate) \u00d7 MA-eligible encounters \u00d7 $1,200 per HCC point = annual revenue impact. The $1,200 figure is the CMS-published average per-HCC payment in MA risk adjustment. Organizations with large MA populations \u2014 even 20\u201330% of encounters \u2014 often find this is the largest single value stream.',
    financialStream: 'HCC value',
    plainEnglishTemplate: 'HCC capture improved {{delta}} points, more chronic conditions discussed in the visit are making it into the coded record, supporting accurate risk adjustment.',
    phase3Roadmap: false,
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of known HCC diagnostic gaps documented and coded during the visit. HCC capture contributes to the RAF score that determines Medicare Advantage capitated payment.',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'A denied claim costs $25\u2013$50 to rework and delays cash by 30\u201360 days \u2014 or gets written off entirely. The mechanic: (after rate \u2212 before rate) \u00d7 total claims \u00d7 average denial cost = denial management savings. Better documentation reduces the most common denial triggers: insufficient clinical detail, missing diagnoses, unsupported E/M level. This metric captures that relationship directly.',
    financialStream: 'Revenue recovery',
    plainEnglishTemplate: 'Clean claim rate improved from {{before}}% to {{after}}%, {{delta}} points fewer claims requiring rework or resubmission.',
    phase3Roadmap: false,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Abridge surfaces documentation gaps that can lead to denials. When teams close them, fewer claims come back.',
    financialStream: 'Revenue recovery',
    plainEnglishTemplate: 'Initial denial rate dropped from {{before}}% to {{after}}%, {{delta}} points fewer claims denied on first submission.',
    phase3Roadmap: false,
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of claims accepted on first submission without correction.',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'The downstream impact of cleaner documentation and fewer denials, more of what\'s owed is actually collected.',
    financialStream: 'Revenue recovery',
    plainEnglishTemplate: 'Net collection rate improved from {{before}}% to {{after}}%, more of what\'s billed is being collected.',
    phase3Roadmap: false,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    financialStream: 'Retention cost',
    plainEnglishTemplate: 'Physician retention improved from {{before}}% to {{after}}%.',
    phase3Roadmap: true,
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    sourceLabel: 'EHR scheduling',
    description: 'Days until the third next available appointment slot per provider, the standard measure of access.',
    whyItMatters: 'When time savings are reinvested in scheduling capacity, access can improve. This metric is where that shows up.',
    financialStream: 'Capacity revenue',
    plainEnglishTemplate: 'Time to 3rd next available dropped from {{before}} to {{after}} days, patients are getting in sooner.',
    phase3Roadmap: true,
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    financialStream: 'Documentation quality',
    plainEnglishTemplate: 'HEDIS performance improved from {{before}} to {{after}}.',
    phase3Roadmap: true,
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'RAF scores determine MA capitation payments. Better HCC capture and diagnosis specificity can raise RAF scores over time.',
    financialStream: 'HCC value',
    plainEnglishTemplate: 'Average RAF score improved from {{before}} to {{after}}, supporting more accurate capitation payments.',
    phase3Roadmap: true,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    financialStream: 'Revenue recovery',
    plainEnglishTemplate: 'Net patient revenue grew from ${{before}}M to ${{after}}M over the deployment period.',
    phase3Roadmap: true,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Better documentation quality can support higher MIPS scores and payment adjustments.',
    financialStream: 'Documentation quality',
    plainEnglishTemplate: 'MIPS score improved from {{before}} to {{after}} points.',
    phase3Roadmap: true,
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    financialStream: 'HCC value',
    plainEnglishTemplate: 'Diagnosis recapture rate improved from {{before}}% to {{after}}%.',
    phase3Roadmap: true,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'opCdiQueryReduction',
    label: 'CDI Query Reduction',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percentage points',
    lowerIsBetter: true,
    source: 'cdi',
    sourceLabel: 'CDI / Coding system',
    description: 'Volume of CDI or coding queries returned to providers post-visit.',
    whyItMatters: 'Reductions in query volume are typically associated with documentation that captures clinical reasoning and specificity at the point of care.',
    plainEnglishTemplate: 'CDI query rate moved from {{before}}% to {{after}}%.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Volume of CDI or coding queries returned to providers post-visit. Reductions are typically associated with more complete documentation captured at the point of care.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'opCognitiveLoadReduction',
    label: 'Cognitive Load Reduction',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'score',
    unitLabel: 'self-reported score',
    lowerIsBetter: false,
    source: 'survey',
    sourceLabel: 'Provider survey',
    description: 'Self-reported reduction in mental effort spent context-switching between patient interaction and documentation during a visit.',
    whyItMatters: 'Cognitive load is associated with provider burnout, decision fatigue, and patient experience. Captured via brief in-workflow survey instruments.',
    plainEnglishTemplate: 'Self-reported cognitive load score moved from {{before}} to {{after}}.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Self-reported reduction in mental effort spent context-switching between patient interaction and documentation during a visit. Not modeled as financial value.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'opAuditComplianceReadiness',
    label: 'Audit & Compliance Readiness',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percentage of records meeting completeness criteria',
    lowerIsBetter: false,
    source: 'cdi',
    sourceLabel: 'Internal audit / Compliance',
    description: 'Share of encounter records that meet documentation completeness criteria as defined by internal audit or compliance teams.',
    whyItMatters: 'Higher completeness rates are associated with reduced exposure during payer audits and faster credentialing cycles.',
    plainEnglishTemplate: 'Records meeting completeness criteria moved from {{before}}% to {{after}}%.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Share of encounter records that meet internal audit or payer completeness criteria. Higher completeness is associated with reduced audit exposure.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'opCareContinuity',
    label: 'Care Continuity for Handoffs & Referrals',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percentage of referrals with complete documentation',
    lowerIsBetter: false,
    source: 'epic',
    sourceLabel: 'EHR / referral records',
    description: 'Share of outbound referrals or care handoffs accompanied by structured, complete documentation at time of transition.',
    whyItMatters: 'Documentation completeness at handoff is associated with reduced rework for receiving providers and improved continuity for patients across care settings.',
    plainEnglishTemplate: 'Referrals with complete handoff documentation moved from {{before}}% to {{after}}%.',
    phase3Roadmap: false,
    roiQuadrant: 'Quality',
    shortDescription: 'Share of referrals or care handoffs accompanied by structured documentation at time of transition. Associated with reduced rework for receiving providers.',
    exploreVisibility: 'driver-qualitative',
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
      "That's {{delta}} minutes back per encounter, across {{providers}} providers and {{encounters}} annual encounters, " +
      "that's {{totalHours}} hours of documentation time returned annually.",
    roiQuadrant: 'Workforce',
    shortDescription: 'Average minutes spent actively documenting per ED encounter, captured from EHR audit logs.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'wowTime',
    label: 'Work Outside of Work (WOW) Time',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'ED-specific Abridge metric capturing after-hours documentation burden.',
    whyItMatters: 'Captures after-hours and outside-shift documentation burden in EHR reporting.',
    plainEnglishTemplate:
      "Work Outside of Work is down {{delta}} minutes per encounter. " +
      "For {{providers}} ED providers, that's approximately {{totalHours}} hours of after-hours documentation avoided annually.",
    roiQuadrant: 'Workforce',
    shortDescription: 'EHR documentation activity captured outside scheduled patient-care time.',
    exploreVisibility: 'driver-quantified',
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
      "That's {{delta}} hours per note, for {{providers}} providers doing {{encounters}} encounters, " +
      'this represents {{totalHours}} hours of shifted or avoided after-hours work annually.',
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    sourceLabel: 'EHR',
    description: 'Time from patient discharge to full encounter closure in the EHR.',
    whyItMatters: 'Typically sourced from EHR reporting.',
    plainEnglishTemplate:
      'Encounter close time is down from {{before}}h to {{after}}h. ' +
      'Faster closures reduce after-hours work and improve billing lag for your {{providers}} ED providers.',
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    sourceLabel: 'EHR signal',
    description: 'After-hours EHR activity per provider per week.',
    whyItMatters: 'Source: EHR signal, Abridge platform, or provider self-report.',
    plainEnglishTemplate:
      "After-hours documentation is down {{delta}} minutes per provider per week. " +
      "Across {{providers}} ED providers over 52 weeks, that's {{totalHours}} hours of protected time returned annually.",
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    roiQuadrant: 'Workforce',
    shortDescription: 'Score from a validated burnout instrument (e.g., Maslach Burnout Inventory). Used as a leading indicator for retention risk.',
    exploreVisibility: 'driver-qualitative',
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
    description: 'Before/after pulse survey, % responding "likely" or "very likely" to stay.',
    whyItMatters: 'Align with HR and medical staff office on survey instrument and timing.',
    plainEnglishTemplate:
      "Provider retention intent is up {{delta}} points, {{after}}% now say they're likely to stay, vs {{before}}% before Abridge.",
    roiQuadrant: 'Workforce',
    shortDescription: 'Survey item measuring intent to remain in current role over a defined timeframe (typically 12 months).',
    exploreVisibility: 'driver-quantified',
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
      'wRVU per shift is up {{delta}}, from {{before}} to {{after}}. ' +
      "At your conversion rate, that's {{value}} per shift per provider.",
    roiQuadrant: 'Revenue',
    shortDescription: 'Average work RVU value per ED shift. ED billing is shift-based, distinct from outpatient encounter-based wRVU.',
    exploreVisibility: 'driver-quantified',
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
    roiQuadrant: 'Revenue',
    shortDescription: 'Average E/M level coded across ED encounters (99281-99285).',
    exploreVisibility: 'driver-quantified',
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
      'LWBS rate is down from {{before}}% to {{after}}%, {{delta}} percentage points.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Share of patients leaving the ED before being seen by a provider.',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'Foundational throughput metric tied to HCAHPS scores and LWBS reduction.',
    plainEnglishTemplate:
      'Door-to-provider time is down {{delta}} minutes, from {{before}} to {{after}} minutes. ' +
      'Faster initial contact is associated with better HCAHPS scores, lower LWBS, and stronger CMS quality measures.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Minutes from patient arrival to first provider contact.',
    exploreVisibility: 'driver-qualitative',
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
    whyItMatters: 'Reducing door-to-disposition can improve boarding and bed availability.',
    plainEnglishTemplate:
      'Door-to-disposition is down {{delta}} minutes, from {{before}} to {{after}} minutes. ' +
      "For {{encounters}} annual visits, that's {{totalMinutes}} minutes of throughput recaptured.",
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    description: 'Provider throughput, a direct measure of capacity.',
    whyItMatters: 'Increase without quality degradation is the strongest throughput signal.',
    plainEnglishTemplate:
      'Providers are seeing {{after}} patients per shift, up from {{before}}, {{delta}} more per shift per provider.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Average patient volume per provider per shift.',
    exploreVisibility: 'driver-quantified',
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
      'Diagnosis capture is up {{delta}} points, from {{before}}% to {{after}}% of encounters fully coded.',
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      'Medical necessity denial rate is down from {{before}}% to {{after}}%, a {{delta}}-point improvement.',
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of claims denied for insufficient documentation supporting medical necessity.',
    exploreVisibility: 'driver-quantified',
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
      'Clean claim rate is up {{delta}} points, from {{before}}% to {{after}}%. ' +
      'Each point of improvement reduces rework cost and accelerates cash flow.',
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      'Average note quality is now {{after}} stars, up {{delta}} from {{before}}. ' +
      'In the ED, note quality is closely tied to coding accuracy, denial rates, and compliance defensibility.',
    roiQuadrant: 'Quality',
    shortDescription: 'Provider-assigned quality rating of generated notes (typically 1-5 scale).',
    exploreVisibility: 'driver-qualitative',
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
      'Patient experience scores have moved from {{before}}th to {{after}}th percentile, a {{delta}}-point improvement. ' +
      'Provider attentiveness accounts for the largest share of the top-box score in the ED.',
    roiQuadrant: 'Quality',
    shortDescription: 'Patient experience scores from Press Ganey or similar instruments, ED-specific subscale.',
    exploreVisibility: 'driver-qualitative',
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
      'ED physician/APP retention has moved from {{before}}% to {{after}}%, {{delta}} points.',
    phase3Roadmap: true,
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'agencyLocumSpend',
    label: 'Agency / Locum Spend',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'annual spend',
    lowerIsBetter: true,
    source: 'finance',
    sourceLabel: 'Finance / Contracting',
    description: 'Annual total spend on locum/agency coverage.',
    whyItMatters: 'Reduction correlates with improved retention and reduced scheduling gaps.',
    plainEnglishTemplate:
      'Agency and locum spend is down from {{before}} to {{after}}, a {{delta}} reduction.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: 'Annual spend on contracted locum or agency physician coverage. Often used as a downstream indicator of retention and scheduling stability.',
    exploreVisibility: 'driver-quantified',
    childOfDriver: 'retention',
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
      'Net patient revenue per visit has moved from {{before}} to {{after}}, up {{delta}} per visit.',
    phase3Roadmap: true,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      "That's {{delta}} minutes back per admission, across {{providers}} providers and {{encounters}} annual admissions, " +
      "that's {{totalHours}} hours of documentation time returned annually.",
    roiQuadrant: 'Workforce',
    shortDescription: 'Average minutes spent actively documenting per inpatient note (H&P, progress notes, discharge summaries).',
    exploreVisibility: 'driver-quantified',
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
    whyItMatters: 'Abridge platform metric. Documentation quality is closely tied to DRG accuracy, CC/MCC capture, and compliance.',
    plainEnglishTemplate:
      'Average note quality is {{after}} stars, up {{delta}} from {{before}}. ' +
      'In inpatient, documentation quality is the upstream driver of DRG accuracy, CC/MCC capture, and compliance defensibility.',
    roiQuadrant: 'Quality',
    shortDescription: 'Provider-assigned quality rating of generated notes (typically 1-5 scale).',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'wowTime',
    label: 'Work Outside of Work (WOW) Time',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'After-hours and outside-shift documentation burden. Particularly significant for hospitalists covering overnight.',
    whyItMatters: 'After-hours documentation burden sourced from EHR reporting or Abridge platform.',
    plainEnglishTemplate:
      'Work Outside of Work is down {{delta}} minutes per admission. ' +
      "For {{providers}} hospitalists, that's {{totalHours}} hours of after-hours documentation avoided annually, " +
      'a direct driver of overnight burden and on-call burnout.',
    roiQuadrant: 'Workforce',
    shortDescription: 'EHR documentation activity captured outside scheduled hours.',
    exploreVisibility: 'driver-quantified',
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
      'this reduces delinquent-record risk and eases the after-shift burden tied to hospitalist turnover.',
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    sourceLabel: 'EHR signal',
    description: 'After-hours EHR activity per provider per week. Hospitalists are disproportionately affected.',
    whyItMatters: 'Source: EHR signal, pajama time reports, or provider self-report.',
    plainEnglishTemplate:
      "After-hours documentation is down {{delta}} minutes per provider per week. " +
      "For {{providers}} inpatient providers over 52 weeks, that's {{totalHours}} hours of protected time returned annually.",
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Hospitalist burnout is heavily documentation-driven, high-signal metric for inpatient Abridge deployments.',
    plainEnglishTemplate:
      'Burnout scores improved from {{before}} to {{after}} on your survey scale. ' +
      'Documentation burden accounts for roughly 40–60% of hospitalist burnout drivers.',
    roiQuadrant: 'Workforce',
    shortDescription: 'Score from a validated burnout instrument (e.g., Maslach Burnout Inventory). Used as a leading indicator for hospitalist retention risk.',
    exploreVisibility: 'driver-qualitative',
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
    description: 'Before/after pulse survey, % responding "likely" or "very likely" to stay.',
    whyItMatters: 'Hospitalist turnover costs $300K–$500K+ per physician. Align with medical staff office on instrument.',
    plainEnglishTemplate:
      "Provider retention intent is up {{delta}} points, {{after}}% now say they're likely to stay, vs {{before}}% before Abridge.",
    roiQuadrant: 'Workforce',
    shortDescription: 'Survey item measuring intent to remain in current role over a defined timeframe (typically 12 months).',
    exploreVisibility: 'driver-quantified',
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
      'Case Mix Index has moved from {{before}} to {{after}}, a {{delta}} point improvement. ' +
      'At your volume of {{encounters}} annual admissions, each 0.1 CMI improvement is worth significant additional net revenue.',
    roiQuadrant: 'Revenue',
    shortDescription: 'Weighted average of DRG relative weights across discharges.',
    exploreVisibility: 'driver-quantified',
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
    description: 'CC/MCC capture rate, documentation completeness is the primary lever.',
    whyItMatters: 'If it is not in the note, CDI cannot query it. Source: CDI platform or coding QA.',
    plainEnglishTemplate:
      'CC/MCC capture rate is up {{delta}} points, from {{before}}% to {{after}}%. ' +
      'Each percentage point of CC/MCC improvement raises DRG weight and affects CMI.',
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of admissions with documented complication or comorbidity codes captured.',
    exploreVisibility: 'driver-quantified',
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
      'DRG accuracy is up {{delta}} points, from {{before}}% to {{after}}%. ' +
      'Fewer DRG corrections means faster claim submission and reduced coding rework.',
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of cases where the initial DRG assignment matches the final DRG after coding review.',
    exploreVisibility: 'driver-quantified',
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
      'Diagnosis capture is up {{delta}} points, from {{before}}% to {{after}}% of admissions fully coded.',
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      'Medical necessity denial rate is down from {{before}}% to {{after}}%, a {{delta}}-point improvement.',
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      'Clean claim rate is up {{delta}} points, from {{before}}% to {{after}}%. ' +
      'Each point of improvement reduces rework cost and accelerates cash flow.',
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Each excess day costs $2,000–$4,000+. Documentation completeness supports discharge readiness.',
    plainEnglishTemplate:
      'Average length of stay is down {{delta}} days, from {{before}} to {{after}} days. ' +
      "At {{encounters}} annual admissions, that's {{totalDays}} patient-days freed annually.",
    roiQuadrant: 'Capacity',
    shortDescription: 'Average days per inpatient admission.',
    exploreVisibility: 'driver-quantified',
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
    description: 'Discharge timing affects ED boarding and admit-from-ED flow.',
    whyItMatters: 'Source: ADT/EHR discharge timestamp reports.',
    plainEnglishTemplate:
      'Discharge before noon rate is up {{delta}} points, from {{before}}% to {{after}}% of discharges. ' +
      'Earlier discharges free beds for afternoon admits and reduce ED boarding time.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Share of inpatient discharges completed before noon.',
    exploreVisibility: 'driver-qualitative',
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
      'Documentation-related discharge delays are down {{delta}} points, from {{before}}% to {{after}}% of cases.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Share of discharges delayed due to incomplete documentation.',
    exploreVisibility: 'driver-quantified',
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
      '30-day readmission rate is down {{delta}} points, from {{before}}% to {{after}}%. ' +
      'At {{encounters}} admissions, a {{delta}}-point reduction reduces penalty exposure and uncompensated care.',
    roiQuadrant: 'Quality',
    shortDescription: 'Share of inpatient discharges followed by readmission within 30 days. CMS-reportable under HRRP.',
    exploreVisibility: 'driver-qualitative',
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
      'HCAHPS scores have moved from {{before}}th to {{after}}th percentile, a {{delta}}-point improvement. ' +
      'The "communication with doctors" domain is most directly tied to ambient documentation.',
    roiQuadrant: 'Quality',
    shortDescription: 'Inpatient patient experience score from the HCAHPS survey.',
    exploreVisibility: 'driver-qualitative',
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
      'Core quality measure compliance is up {{delta}} points, from {{before}}% to {{after}}%.',
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
    whyItMatters: 'Provider attentiveness is the primary driver, and it grows when clinicians are not typing during the encounter.',
    plainEnglishTemplate:
      'Press Ganey inpatient scores have improved from {{before}}th to {{after}}th percentile. ' +
      'Provider attentiveness carries the highest weight in the inpatient PG composite.',
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      'Inpatient physician retention has moved from {{before}}% to {{after}}%, {{delta}} points.',
    phase3Roadmap: true,
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'agencyLocumSpend',
    label: 'Agency / Locum Spend',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'annual spend',
    lowerIsBetter: true,
    source: 'finance',
    sourceLabel: 'Finance / Contracting',
    description: 'Annual total spend on locum/agency hospitalist coverage.',
    whyItMatters: 'Reflects improved hospitalist stability and reduced scheduling gaps.',
    plainEnglishTemplate:
      'Agency and locum spend is down from {{before}} to {{after}}, a {{delta}} reduction.',
    phase3Roadmap: false,
    roiQuadrant: 'Workforce',
    shortDescription: 'Annual spend on contracted locum hospitalist coverage. Often used as a downstream indicator of retention and scheduling stability.',
    exploreVisibility: 'driver-quantified',
    childOfDriver: 'retention',
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
      'Net patient revenue per admission has moved from {{before}} to {{after}}, up {{delta}} per case. ' +
      'This rolls up CMI improvement, CC/MCC capture, denial reduction, and LOS savings into one number.',
    phase3Roadmap: true,
    roiQuadrant: 'Revenue',
    shortDescription: '',
    exploreVisibility: 'hidden',
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
      'Value-based care performance has improved from {{before}} to {{after}} in earned incentives, {{delta}} in incremental performance pay.',
    phase3Roadmap: true,
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
];

export const NURSING_METRICS: MetricDefinition[] = [
  {
    id: 'docTimePerShift',
    label: 'Documentation Time per Shift',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Total active EHR documentation time per shift, flowsheets, assessments, care plans, handoff notes.',
    whyItMatters: 'The primary platform-native signal for nursing documentation burden.',
    plainEnglishTemplate:
      'Nurses are spending {{after}} minutes per shift on documentation, down from {{before}}. ' +
      "That's {{delta}} minutes back per shift per nurse. " +
      'Across {{providers}} nurses, that represents significant documentation time returned to patient care.',
    roiQuadrant: 'Workforce',
    shortDescription: 'Total active documentation time per nursing shift, including flowsheets, assessments, care plans, and handoff notes.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'noteQualityScore',
    label: 'Assessment / Documentation Quality Score',
    domain: 'quality',
    phase: 1,
    inputType: 'before-after',
    unit: 'stars',
    unitLabel: 'rating',
    lowerIsBetter: false,
    source: 'abridge',
    sourceLabel: 'Abridge Platform',
    description: 'Quality of nursing documentation, assessments, care plans, handoff notes.',
    whyItMatters: 'Complete, specific nursing assessments reduce CDI query burden and support DRG accuracy.',
    plainEnglishTemplate:
      'Average nursing documentation quality is {{after}}, up {{delta}} from {{before}}. ' +
      'Complete, specific nursing assessments reduce CDI query burden, support DRG accuracy, ' +
      'and are the primary input to nursing-sensitive quality indicators.',
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'chartingAfterShift',
    label: 'Charting After Shift',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'min',
    unitLabel: 'minutes',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'EHR signal / Time-and-Attendance',
    description: 'Time nurses spend in the EHR after their scheduled shift end.',
    whyItMatters: 'Chronic after-shift charting is one of the top drivers of nursing burnout and turnover intent.',
    plainEnglishTemplate:
      'After-shift charting is down {{delta}} minutes per nurse, from {{before}} to {{after}} minutes. ' +
      'Across {{providers}} nurses, ' +
      "that's significant unpaid or overtime documentation avoided. " +
      'This is the most frequently cited burnout driver in nursing workforce surveys.',
    roiQuadrant: 'Workforce',
    shortDescription: 'Minutes spent in the EHR after scheduled shift end.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'overtimeHours',
    label: 'Documentation-Related Overtime',
    domain: 'workforce',
    phase: 1,
    inputType: 'before-after',
    unit: 'hours',
    unitLabel: 'hours/month',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Payroll / Time-and-Attendance',
    description: 'Overtime hours attributable to documentation burden.',
    whyItMatters: 'Direct labor cost exposure from documentation-driven overtime.',
    plainEnglishTemplate:
      'Documentation-related overtime is down {{delta}} hours per nurse per month. ' +
      'Across {{providers}} nurses, that represents significant overtime hours reduced monthly.',
    roiQuadrant: 'Workforce',
    shortDescription: 'Overtime hours attributable to documentation completion.',
    exploreVisibility: 'driver-quantified',
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
    sourceLabel: 'Nursing Leadership',
    description: 'Before/after burnout survey score (MBI, single-item, or custom scale).',
    whyItMatters: 'Documentation burden accounts for a disproportionate share of nursing burnout.',
    plainEnglishTemplate:
      'Burnout scores improved from {{before}} to {{after}} on your scale. ' +
      'Documentation burden is the single largest modifiable driver of nursing burnout. ' +
      'At {{providers}} nurses, each point of improvement correlates with measurable reduction in turnover intent.',
    roiQuadrant: 'Workforce',
    shortDescription: 'Score from a validated burnout instrument (e.g., Maslach Burnout Inventory). Used as a leading indicator for nursing retention risk.',
    exploreVisibility: 'driver-qualitative',
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
    sourceLabel: 'Nursing Leadership / HR',
    description: 'Percentage of nurses responding "likely" or "very likely" to stay.',
    whyItMatters: 'RN turnover cost is $40K–$65K per nurse. At large scale, even 1-point improvement represents significant avoided cost.',
    plainEnglishTemplate:
      "Retention intent is up {{delta}} points, {{after}}% of nurses say they're likely to stay, vs {{before}}% before Abridge. " +
      'At {{providers}} nurses, this improvement in likelihood-to-stay can reduce departures and avoid recruitment costs.',
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'patientFallRate',
    label: 'Patient Fall Rate',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'rate',
    unitLabel: 'per 1,000 patient days',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Quality Department',
    description: 'NDNQI nursing-sensitive indicator. Falls per 1,000 patient days.',
    whyItMatters: 'Falls correlate with documentation gaps: incomplete risk assessments, missed reassessments.',
    plainEnglishTemplate:
      'Patient fall rate is down from {{before}} to {{after}} per 1,000 patient days. ' +
      'A fall with injury runs an average of $14,000–$30,000 in direct care costs, plus regulatory exposure.',
    roiQuadrant: 'Quality',
    shortDescription: 'Falls per 1,000 patient days. NDNQI nursing-sensitive indicator.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'hapiRate',
    label: 'Hospital-Acquired Pressure Injury (HAPI) Rate',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'rate',
    unitLabel: 'per 1,000 patient days',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Wound Care / Quality',
    description: 'NDNQI nursing-sensitive indicator. Stage 2+ HAPIs per 1,000 patient days.',
    whyItMatters: 'Skin assessment documentation completeness is the primary driver, gaps prevent early intervention.',
    plainEnglishTemplate:
      'HAPI rate is down from {{before}} to {{after}} per 1,000 patient days. ' +
      'Stage 2+ HAPIs cost $10,700–$151,700 per event and are non-reimbursable under CMS.',
    roiQuadrant: 'Quality',
    shortDescription: 'Stage 2+ hospital-acquired pressure injuries per 1,000 patient days. NDNQI nursing-sensitive indicator. Typically non-reimbursable under CMS HAC policy.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'clabsiRate',
    label: 'CLABSI Rate',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'rate',
    unitLabel: 'per 1,000 line-days',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Infection Prevention',
    description: 'NHSN-reportable. Central line bundle compliance documentation supports prevention.',
    whyItMatters: 'Each CLABSI costs $46,000–$68,000 and generates CMS HAC penalty exposure.',
    plainEnglishTemplate:
      'CLABSI rate is down from {{before}} to {{after}} per 1,000 line-days. ' +
      'Each CLABSI event costs approximately $46,000–$68,000 in additional care costs and generates CMS HAC penalty exposure.',
    roiQuadrant: 'Quality',
    shortDescription: 'Central line-associated bloodstream infections per 1,000 line days. NHSN-reportable.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'cautiRate',
    label: 'CAUTI Rate',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'rate',
    unitLabel: 'per 1,000 catheter days',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Infection Prevention',
    description: 'NHSN-reportable. Foley necessity documentation and daily removal prompts.',
    whyItMatters: 'Each CAUTI costs $896–$2,836 and affects CMS HAC scoring.',
    plainEnglishTemplate:
      'CAUTI rate is down from {{before}} to {{after}} per 1,000 catheter days. ' +
      'Timely documentation of daily necessity review is the primary prevention driver.',
    roiQuadrant: 'Quality',
    shortDescription: 'Catheter-associated urinary tract infections per 1,000 catheter days. NHSN-reportable.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'medicationErrorRate',
    label: 'Medication Error / Near-Miss Rate',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'rate',
    unitLabel: 'per 1,000 patient days',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Pharmacy / Safety Reporting',
    description: 'Documentation clarity and handoff completeness are upstream drivers of nursing medication errors.',
    whyItMatters: 'Each prevented adverse drug event avoids $5,000–$50,000 in additional care costs.',
    plainEnglishTemplate:
      'Medication error / near-miss rate is down from {{before}} to {{after}} per 1,000 patient days. ' +
      'Clearer handoff documentation and care plan updates can close the gaps that contribute to medication errors at shift change.',
    roiQuadrant: 'Quality',
    shortDescription: 'Medication error and near-miss events per 1,000 patient days.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'hcahpsNurseCommunication',
    label: 'HCAHPS Nurse Communication Score',
    domain: 'quality',
    phase: 2,
    inputType: 'before-after',
    unit: 'percentile',
    unitLabel: 'percentile',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'HCAHPS Portal',
    description: 'The nurse communication domain is the highest-weighted component of inpatient HCAHPS.',
    whyItMatters: 'Time freed from documentation means more time present with patients, which can lift this score.',
    plainEnglishTemplate:
      'HCAHPS nurse communication scores have moved from {{before}}th to {{after}}th percentile, a {{delta}}-point improvement. ' +
      'The nurse communication domain carries the highest weight in inpatient patient experience scoring.',
    roiQuadrant: 'Quality',
    shortDescription: 'HCAHPS subscale measuring patient-reported quality of nurse communication.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'bedsideTimeRatio',
    label: 'Bedside / Direct Care Time Ratio',
    domain: 'staffing',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent of shift',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Nursing Leadership',
    description: 'Percent of shift time spent in direct patient care vs. documentation.',
    whyItMatters: 'National benchmark: nurses spend 35–40% of shift time on documentation.',
    plainEnglishTemplate:
      'Direct care time has increased from {{before}}% to {{after}}% of shift time, {{delta}} points more time with patients. ' +
      'For {{providers}} nurses, that represents additional hours of bedside care annually without adding staff.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Share of shift time spent in direct patient care versus documentation.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'travelNurseUtilization',
    label: 'Travel / Agency Nurse Utilization Rate',
    domain: 'staffing',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent of FTEs',
    lowerIsBetter: true,
    source: 'partner',
    sourceLabel: 'Staffing Office / Finance',
    description: 'Travel or agency nurses as percentage of total nursing FTEs.',
    whyItMatters: 'Documentation burden contributes to staff nurse turnover, which increases reliance on expensive travel coverage.',
    plainEnglishTemplate:
      'Travel and agency nurse utilization is down from {{before}}% to {{after}}% of nursing FTEs, a {{delta}}-point reduction. ' +
      'Each point of utilization reduction saves significant premium labor costs annually.',
    roiQuadrant: 'Capacity',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'openShiftFillRate',
    label: 'Open Shift Fill Rate',
    domain: 'staffing',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Staffing Office',
    description: 'Percentage of open shifts filled by staff nurses vs. agency or left unfilled.',
    whyItMatters: 'Retention-driven staffing stability metric.',
    plainEnglishTemplate:
      'Open shift fill rate by staff nurses is up from {{before}}% to {{after}}%, {{delta}} points more shifts covered internally. ' +
      'Higher fill rates reflect improved retention and scheduling stability, and directly reduce agency premium spend.',
    roiQuadrant: 'Capacity',
    shortDescription: 'Share of open shifts filled by staff nurses versus agency or left unfilled.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'cdiQueryResponseRate',
    label: 'CDI Query Response Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'CDI Platform',
    description: 'CDI query response rate, percentage of nursing CDI queries answered within 24h.',
    whyItMatters: 'Nursing documentation supports CDI queries for DRG accuracy.',
    plainEnglishTemplate:
      'CDI query response rate is up from {{before}}% to {{after}}%, {{delta}} points. ' +
      'Faster, more complete nursing documentation reduces query volume and accelerates DRG assignment.',
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of CDI queries answered within established timeframes (typically 24 hours).',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'nursingDocCompletionRate',
    label: 'Nursing Documentation Completion Rate',
    domain: 'revenue',
    phase: 2,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'EHR Compliance Reports',
    description: 'Percentage of required nursing documentation completed within required timeframes.',
    whyItMatters: 'Delinquent nursing documentation holds up billing, delays discharge, and creates compliance exposure.',
    plainEnglishTemplate:
      'Nursing documentation is now completed on time {{after}}% of the time, up from {{before}}%. ' +
      'A {{delta}}-point improvement means more complete, timely nursing records across the year.',
    roiQuadrant: 'Revenue',
    shortDescription: 'Share of required nursing documentation completed within mandated timeframes.',
    exploreVisibility: 'driver-qualitative',
  },
  {
    id: 'nurseRetentionRate',
    label: 'RN Retention Rate',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: '%',
    unitLabel: 'percent',
    lowerIsBetter: false,
    source: 'hris',
    sourceLabel: 'HR',
    description: 'Annual RN retention rate. Turnover cost is $40K–$65K per nurse.',
    whyItMatters: 'At nursing workforce scale, this is the highest-volume cost lever.',
    plainEnglishTemplate:
      'RN retention rate has moved from {{before}}% to {{after}}%, {{delta}} points. ' +
      'At your scale, this is likely the largest single financial impact in this analysis.',
    phase3Roadmap: true,
    roiQuadrant: 'Workforce',
    shortDescription: 'Annual share of RN staff retained from the prior period.',
    exploreVisibility: 'driver-quantified',
  },
  {
    id: 'travelNurseSpend',
    label: 'Travel / Agency Nurse Annual Spend',
    domain: 'staffing',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'annual spend',
    lowerIsBetter: true,
    source: 'finance',
    sourceLabel: 'Finance / Contracting',
    description: 'Total annual travel/agency nursing spend.',
    whyItMatters: 'The most direct financial expression of improved nursing retention and scheduling stability.',
    plainEnglishTemplate:
      'Travel and agency nursing spend is down from {{before}} to {{after}}, {{delta}} in avoided premium labor costs. ' +
      'This is the most direct financial expression of improved nursing retention.',
    phase3Roadmap: true,
    roiQuadrant: 'Capacity',
    shortDescription: 'Annual spend on travel or agency nursing coverage. Often used as a downstream financial signal of retention stability.',
    exploreVisibility: 'driver-quantified',
    childOfDriver: 'retention',
  },
  {
    id: 'nursingOvertimeCost',
    label: 'Nursing Overtime Cost',
    domain: 'workforce',
    phase: 3,
    inputType: 'before-after',
    unit: 'dollars',
    unitLabel: 'annual cost',
    lowerIsBetter: true,
    source: 'finance',
    sourceLabel: 'Payroll / Finance',
    description: 'Total annual nursing overtime cost attributable to documentation burden and staffing gaps.',
    whyItMatters: 'Documentation-driven overtime and agency coverage are the two largest controllable cost levers.',
    plainEnglishTemplate:
      'Annual nursing overtime cost is down from {{before}} to {{after}}, {{delta}} in avoided labor premium.',
    phase3Roadmap: true,
    roiQuadrant: 'Workforce',
    shortDescription: '',
    exploreVisibility: 'hidden',
  },
  {
    id: 'pressGaneyNursing',
    label: 'Press Ganey Nursing / Patient Experience Score',
    domain: 'quality',
    phase: 3,
    inputType: 'before-after',
    unit: 'percentile',
    unitLabel: 'percentile',
    lowerIsBetter: false,
    source: 'partner',
    sourceLabel: 'Press Ganey Portal',
    description: 'Annual Press Ganey overall or nurse-specific percentile rank.',
    whyItMatters: 'Nursing responsiveness and communication are the largest drivers of inpatient PG composite.',
    plainEnglishTemplate:
      'Press Ganey scores have moved from {{before}}th to {{after}}th percentile annually. ' +
      'Nursing responsiveness and communication are the largest drivers of the inpatient PG composite.',
    phase3Roadmap: true,
    roiQuadrant: 'Quality',
    shortDescription: '',
    exploreVisibility: 'hidden',
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

export type DomainKey = 'workforce' | 'revenue' | 'quality' | 'capacity' | 'throughput' | 'patientFlow' | 'staffing' | 'foundational';

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
  staffing: 'Staffing',
  foundational: 'Foundational',
};

export const ORG_WIDE_METRIC_IDS = ['burnoutAssessment', 'likelihoodToStay'];

export const FOUNDATIONAL_GROUPS: { label: string; metricIds: string[] }[] = [
  { label: 'Documentation Time', metricIds: ['docTimePerNote', 'docTimePerEncounter', 'docTimePerShift'] },
  { label: 'Note Quality Score', metricIds: ['noteQualityScore'] },
];

export const SETTING_THIRD_CHAPTER_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: 'Capacity gains',
  ed: 'Throughput gains',
  inpatient: 'Flow outcomes',
  nursing: 'Staffing outcomes',
};

export interface ResolvedMetric {
  metric: MetricDefinition;
  settings: MeasureCareSetting[];
  isOrgWide: boolean;
}

export function getMetricsForSetting(setting: MeasureCareSetting): MetricDefinition[] {
  switch (setting) {
    case 'outpatient': return OUTPATIENT_METRICS;
    case 'ed': return ED_METRICS;
    case 'inpatient': return INPATIENT_METRICS;
    case 'nursing': return NURSING_METRICS;
    default: return OUTPATIENT_METRICS;
  }
}

export function getMetricsForSettings(settings: MeasureCareSetting[]): ResolvedMetric[] {
  const allMetrics = settings.flatMap(setting => {
    const metricsForSetting = getMetricsForSetting(setting);
    return metricsForSetting.map(m => ({ metric: m, setting }));
  });

  const grouped = new Map<string, { metric: MetricDefinition; settings: MeasureCareSetting[] }>();
  for (const { metric, setting } of allMetrics) {
    if (!grouped.has(metric.id)) {
      grouped.set(metric.id, { metric, settings: [] });
    }
    grouped.get(metric.id)!.settings.push(setting);
  }

  return Array.from(grouped.values()).map(({ metric, settings: metricSettings }) => ({
    metric,
    settings: metricSettings,
    isOrgWide: ORG_WIDE_METRIC_IDS.includes(metric.id),
  }));
}

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
  if (setting === 'nursing') {
    return [
      { key: 'staffing', label: 'Staffing' },
      { key: 'workforce', label: 'Workforce' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'quality', label: 'Quality' },
    ];
  }
  // Unreachable: all settings are handled above, so `setting` is `never` here. Cast keeps
  // the type-checker happy without changing the (dead) runtime behavior.
  const config = CARE_SETTING_CONFIGS[setting as MeasureCareSetting];
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
    fourthDomainKey: "staffing",
    fourthDomainLabel: "Staffing",
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
  if (setting === 'nursing') {
    return NURSING_METRICS.filter(m => !m.phase3Roadmap).length;
  }
  // Unreachable: all settings handled above (`setting` is `never`). Cast for the type-checker.
  const config = CARE_SETTING_CONFIGS[setting as MeasureCareSetting];
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
