export type NursingPriority =
  | 'retention'
  | 'laborCosts'
  | 'burnout'
  | 'bedsideTime'
  | 'docQuality'
  | 'future';

export const NURSING_PRIORITIES: NursingPriority[] = [
  'retention',
  'laborCosts',
  'burnout',
  'bedsideTime',
  'docQuality',
  'future',
];

export interface PriorityConfig {
  id: NursingPriority;
  title: string;
  description: string;
}

export const PRIORITY_CONFIGS: PriorityConfig[] = [
  {
    id: 'retention',
    title: 'Keep Our Nurses',
    description: 'Retention is a top concern. We\'re losing experienced nurses and the cost of replacing them is unsustainable.',
  },
  {
    id: 'laborCosts',
    title: 'Control Labor Costs',
    description: 'Overtime, agency spend, or premium labor costs are putting pressure on our margins.',
  },
  {
    id: 'burnout',
    title: 'Reduce Burnout',
    description: 'Our nurses are exhausted. Documentation is one of the biggest contributors to workload strain.',
  },
  {
    id: 'bedsideTime',
    title: 'Get Nurses Back to the Bedside',
    description: 'Documentation pulls nurses away from patients. We want more time for direct care.',
  },
  {
    id: 'docQuality',
    title: 'Improve Documentation Quality',
    description: 'Flowsheet completeness, assessment consistency, or handoff quality are gaps that affect compliance and care continuity.',
  },
  {
    id: 'future',
    title: 'Prepare for the Future',
    description: 'We want to build a documentation infrastructure that supports AI, automation, and data-driven nursing practice.',
  },
];

export type ConnectionStrength = 'direct' | 'moderate' | 'indirect' | 'strategic';

export interface ConnectionBar {
  label: string;
  strength: ConnectionStrength;
  filled: number;
  total: number;
}

export interface PriorityConnection {
  priority: NursingPriority;
  headline: string;
  howItConnects: string;
  whatResearchSays?: string;
  whatItMeansForROI: string;
  bars: ConnectionBar[];
}

export type PathwayRole = 'primary' | 'supporting' | 'notSelected';

export interface PathwayClassification {
  priority: NursingPriority;
  role: PathwayRole;
  label: string;
  narrative: string;
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
