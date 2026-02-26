export type NursingPriority =
  | 'retention'
  | 'staffingCosts'
  | 'wellbeing'
  | 'bedsidePresence'
  | 'docQuality'
  | 'futureReadiness';

export const NURSING_PRIORITIES: NursingPriority[] = [
  'retention',
  'staffingCosts',
  'wellbeing',
  'bedsidePresence',
  'docQuality',
  'futureReadiness',
];

export interface PriorityConfig {
  id: NursingPriority;
  title: string;
  description: string;
}

export const PRIORITY_CONFIGS: PriorityConfig[] = [
  {
    id: 'retention',
    title: 'Nurse Retention',
    description: 'Experienced nurses are leaving. The cost of replacing them is straining the organization.',
  },
  {
    id: 'staffingCosts',
    title: 'Staffing Costs',
    description: 'Overtime, agency, and travel nurse reliance are creating unsustainable cost pressure.',
  },
  {
    id: 'wellbeing',
    title: 'Nurse Wellbeing',
    description: 'Workload, administrative burden, and work-life balance are affecting how nurses feel about their jobs.',
  },
  {
    id: 'bedsidePresence',
    title: 'Bedside Presence',
    description: 'Nurses are spending too much time away from patients. Documentation is a primary competing demand for their time.',
  },
  {
    id: 'docQuality',
    title: 'Documentation Quality',
    description: 'Flowsheet gaps, inconsistent assessments, or documentation variability are affecting compliance or care continuity.',
  },
  {
    id: 'futureReadiness',
    title: 'Future Readiness',
    description: 'Positioning the nursing program for clinical AI, value-based care, Magnet, or data-driven practice.',
  },
];

export interface NursingBaselineInputs {
  staffedBeds: number;
  nurseFTEs: number;
  bedOccupancy: number;
}

export const DEFAULT_BASELINE: NursingBaselineInputs = {
  staffedBeds: 0,
  nurseFTEs: 0,
  bedOccupancy: 85,
};

export const RETENTION_INTERVENTIONS = [
  'Compensation and pay structure adjustments',
  'Scheduling flexibility programs',
  'Workload reduction initiatives',
  'Documentation and administrative burden reduction',
  'Mentorship and career development',
  'Wellness and resilience programs',
  'Shared governance and nurse voice',
];

export const STAFFING_COST_PRESSURES = [
  'End-of-shift overtime from documentation',
  'General overtime from staffing shortages',
  'Agency and travel nurse reliance',
  'Premium pay and incentive costs',
  'Unfilled positions creating coverage gaps',
];

export const STAFFING_COST_INTERVENTIONS = [
  'OT monitoring and reduction programs',
  'Agency spend reduction targets',
  'Internal float pool development',
  'Scheduling optimization',
  'Staffing model redesign',
  'Workflow and documentation efficiency improvements',
];

export const WELLBEING_PRESSURES = [
  'Nurses regularly staying late to finish charting',
  'Documentation cited in satisfaction or engagement surveys',
  'Burnout mentioned in exit interviews or stay conversations',
  'New nurses struggling with documentation workload',
  'Experienced nurses expressing frustration with admin tasks',
  'Work-life balance concerns related to after-shift work',
];

export const WELLBEING_SURVEY_FINDINGS = [
  'Documentation burden rated as a top concern',
  'Time spent on documentation reported as excessive',
  'Documentation affects willingness to stay',
  'Documentation affects job satisfaction',
  'Nurses want technology to reduce documentation',
];

export const DOC_QUALITY_CONCERNS = [
  'Flowsheet completeness varies across shifts or units',
  'Assessment documentation is inconsistent',
  'Handoff documentation quality is uneven',
  'Care plan updates are frequently incomplete',
  'Audit or survey findings cite documentation gaps',
  'Documentation variability is a known concern',
];

export const FUTURE_INITIATIVES = [
  'Magnet designation or Pathway to Excellence',
  'Clinical AI readiness and pilot programs',
  'Value-based care nursing initiatives',
  'Data-driven staffing and workforce analytics',
  'Nursing informatics maturity',
  'Structured documentation for quality reporting',
];

export interface RetentionInputs {
  turnoverRate: number;
  replacementCost: number;
  interventions: number[];
}

export interface StaffingCostsInputs {
  costPressures: number[];
  otMinPerShift: number;
  otFrequency: '' | 'occasionally' | 'frequently' | 'almost_always';
  agencyMonthlySpend: number;
  costInterventions: number[];
}

export interface WellbeingInputs {
  pressures: number[];
  surveyStatus: '' | 'not_yet' | 'informal' | 'structured';
  surveyFindings: number[];
}

export interface BedsidePresenceInputs {
  bedsidePriority: '' | 'conversation' | 'leadership_priority' | 'org_quality_goal';
  measuringBedside: '' | 'no' | 'informal' | 'yes';
  docHoursPerShift: number;
}

export interface DocQualityInputs {
  concerns: number[];
  measuringQuality: '' | 'no' | 'informal' | 'yes';
}

export interface FutureReadinessInputs {
  initiatives: number[];
  techMaturity: '' | 'early' | 'developing' | 'advanced' | 'leading';
}

export interface AllPriorityInputs {
  retention: RetentionInputs;
  staffingCosts: StaffingCostsInputs;
  wellbeing: WellbeingInputs;
  bedsidePresence: BedsidePresenceInputs;
  docQuality: DocQualityInputs;
  futureReadiness: FutureReadinessInputs;
}

export function createEmptyPriorityInputs(): AllPriorityInputs {
  return {
    retention: { turnoverRate: 0, replacementCost: 0, interventions: [] },
    staffingCosts: { costPressures: [], otMinPerShift: 0, otFrequency: '', agencyMonthlySpend: 0, costInterventions: [] },
    wellbeing: { pressures: [], surveyStatus: '', surveyFindings: [] },
    bedsidePresence: { bedsidePriority: '', measuringBedside: '', docHoursPerShift: 0 },
    docQuality: { concerns: [], measuringQuality: '' },
    futureReadiness: { initiatives: [], techMaturity: '' },
  };
}
