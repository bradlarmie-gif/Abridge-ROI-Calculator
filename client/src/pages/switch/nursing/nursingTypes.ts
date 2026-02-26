export type NursingDomain = 'workforce' | 'laborCost' | 'experience' | 'quality';
export type NursingLevel = 1 | 2 | 3 | 4;

export const NURSING_DOMAIN_ORDER: NursingDomain[] = ['workforce', 'laborCost', 'experience', 'quality'];

export const NURSING_DOMAIN_LABELS: Record<NursingDomain, string> = {
  workforce: 'Workforce Stability',
  laborCost: 'Labor Cost',
  experience: 'Nurse Experience',
  quality: 'Care Quality',
};

export const SCORE_MAP: Record<NursingLevel, number> = { 1: 6, 2: 12, 3: 19, 4: 25 };

export interface NursingDomainState {
  level: NursingLevel | null;
  inputs: Record<string, string | number>;
}

export interface NursingBaselineInputs {
  staffedBeds: number;
  nurseFTEs: number;
  bedOccupancy: number;
}

export const DEFAULT_BASELINE: NursingBaselineInputs = {
  staffedBeds: 0,
  nurseFTEs: 0,
  bedOccupancy: 80,
};

export function createEmptyDomainStates(): Record<NursingDomain, NursingDomainState> {
  return {
    workforce: { level: null, inputs: {} },
    laborCost: { level: null, inputs: {} },
    experience: { level: null, inputs: {} },
    quality: { level: null, inputs: {} },
  };
}

export interface LevelCard {
  level: NursingLevel;
  label: string;
  description: string;
}

export interface DomainConfig {
  domain: NursingDomain;
  label: string;
  headline: string;
  subtitle: string;
  cards: LevelCard[];
  nextLabel: string;
}

export const NURSING_DOMAIN_CONFIGS: Record<NursingDomain, DomainConfig> = {
  workforce: {
    domain: 'workforce',
    label: 'WORKFORCE STABILITY',
    headline: 'Are you keeping your nurses?',
    subtitle: 'Nursing turnover is one of the most expensive and disruptive challenges in healthcare. Understanding what\'s driving it is the first step toward addressing it.',
    cards: [
      { level: 1, label: 'Turnover is Manageable', description: 'Retention is stable. No urgent workforce concerns.' },
      { level: 2, label: 'Turnover is Elevated', description: 'You\'re losing nurses at a rate that\'s creating operational and financial strain.' },
      { level: 3, label: 'Turnover is a Strategic Threat', description: 'Retention challenges are affecting care delivery, labor costs, and organizational stability.' },
      { level: 4, label: 'Retention is Actively Managed', description: 'Your organization has a retention strategy with measured outcomes and targeted interventions.' },
    ],
    nextLabel: 'See Labor Cost Impact →',
  },
  laborCost: {
    domain: 'laborCost',
    label: 'LABOR COST',
    headline: 'Can you afford your staffing model?',
    subtitle: 'Overtime, agency spend, and premium labor are symptoms of a staffing model under pressure. Understanding the drivers helps identify where relief is possible.',
    cards: [
      { level: 1, label: 'Labor Costs Are Stable', description: 'OT and agency usage are within budget. No significant pressure.' },
      { level: 2, label: 'Overtime Is Elevated', description: 'End-of-shift charting and documentation workload are contributing to OT costs.' },
      { level: 3, label: 'Agency Reliance Is Growing', description: 'Staffing gaps from turnover are being filled with agency or travel nurses at premium rates.' },
      { level: 4, label: 'Labor Strategy Is Proactive', description: 'Your organization is actively managing OT, agency, and staffing mix with data and targeted interventions.' },
    ],
    nextLabel: 'See Nurse Experience Impact →',
  },
  experience: {
    domain: 'experience',
    label: 'NURSE EXPERIENCE',
    headline: 'Are your nurses spending time where it matters?',
    subtitle: 'Documentation pulls nurses away from patients. The question is how much — and whether your organization is measuring it.',
    cards: [
      { level: 1, label: 'Documentation Is a Known Burden', description: 'Nurses report spending significant time on documentation. No formal measurement of bedside time impact.' },
      { level: 2, label: 'Bedside Time Is a Priority', description: 'Your organization has identified bedside time as a strategic goal. Measurement may be informal.' },
      { level: 3, label: 'Experience Is Being Measured', description: 'You\'re tracking nurse satisfaction, bedside time, or documentation burden through surveys or operational data.' },
      { level: 4, label: 'Experience Strategy Is Integrated', description: 'Nurse experience metrics are part of organizational quality and performance frameworks.' },
    ],
    nextLabel: 'See Documentation Quality Impact →',
  },
  quality: {
    domain: 'quality',
    label: 'CARE QUALITY AND COMPLIANCE',
    headline: 'Is your documentation supporting quality and safety?',
    subtitle: 'Flowsheet completeness, assessment consistency, and handoff quality directly affect patient safety, survey readiness, and compliance.',
    cards: [
      { level: 1, label: 'Documentation Quality Is Variable', description: 'Flowsheet completeness and consistency vary across units and shifts. Not formally measured.' },
      { level: 2, label: 'Quality Gaps Are Known', description: 'Your organization has identified documentation quality issues that affect compliance or care delivery.' },
      { level: 3, label: 'Quality Is Being Measured', description: 'Documentation completeness, consistency, or audit readiness are actively tracked.' },
      { level: 4, label: 'Quality Is Governed', description: 'Documentation quality is part of your compliance framework and quality improvement programs.' },
    ],
    nextLabel: 'See My Assessment →',
  },
};

export const WORKFORCE_TURNOVER_DRIVERS = [
  'Workload and staffing ratios',
  'Documentation and administrative burden',
  'Compensation',
  'Leadership and culture',
  'Schedule flexibility',
  'Burnout',
];

export const WORKFORCE_RETENTION_INTERVENTIONS = [
  'Compensation adjustments',
  'Scheduling flexibility programs',
  'Workload reduction initiatives',
  'Documentation burden reduction',
  'Mentorship and career development',
  'Burnout prevention programs',
];

export const LABOR_MANAGEMENT_INTERVENTIONS = [
  'OT monitoring and management',
  'Agency spend reduction programs',
  'Internal float pool',
  'Predictive staffing models',
  'Documentation efficiency initiatives',
];

export const EXPERIENCE_MEASURING = [
  'Nursing satisfaction / engagement scores',
  'Documentation time per shift',
  'Bedside time or direct care hours',
  'Documentation burden survey results',
  'HCAHPS / patient experience scores',
];

export const EXPERIENCE_STRATEGY_AREAS = [
  'Quality program goals',
  'Nursing leadership performance metrics',
  'Magnet or pathway to excellence initiatives',
  'Patient experience improvement programs',
  'Technology investment decisions',
];

export const QUALITY_GAPS = [
  'Flowsheet completeness varies across shifts',
  'Assessment documentation is inconsistent',
  'Handoff documentation quality is uneven',
  'Care plan updates are frequently incomplete',
  'Audit or survey findings cite documentation gaps',
];

export const QUALITY_METRICS = [
  'Flowsheet completion rates',
  'Assessment documentation compliance',
  'Handoff quality metrics',
  'Audit readiness scores',
  'Documentation-related quality events',
];

export const QUALITY_GOVERNANCE = [
  'Quality committee reporting',
  'Regulatory compliance framework',
  'Magnet or pathway to excellence documentation',
  'Patient safety event review',
  'Nursing performance metrics',
];

export const LEVEL_LABELS: Record<NursingDomain, Record<NursingLevel, string>> = {
  workforce: {
    1: 'Turnover is Manageable',
    2: 'Turnover is Elevated',
    3: 'Turnover is a Strategic Threat',
    4: 'Retention is Actively Managed',
  },
  laborCost: {
    1: 'Labor Costs Are Stable',
    2: 'Overtime Is Elevated',
    3: 'Agency Reliance Is Growing',
    4: 'Labor Strategy Is Proactive',
  },
  experience: {
    1: 'Documentation Is a Known Burden',
    2: 'Bedside Time Is a Priority',
    3: 'Experience Is Being Measured',
    4: 'Experience Strategy Is Integrated',
  },
  quality: {
    1: 'Documentation Quality Is Variable',
    2: 'Quality Gaps Are Known',
    3: 'Quality Is Being Measured',
    4: 'Quality Is Governed',
  },
};
