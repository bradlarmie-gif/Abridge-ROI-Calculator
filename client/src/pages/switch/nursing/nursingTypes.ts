export interface NursingInputs {
  staffedBeds: number;
  nurseFTEs: number;
  bedOccupancy: number;

  docTimeFlowsheets: number;
  docTimeCare: number;
  docTimeHandoff: number;
  docTimeOther: number;
  burdenIndicators: string[];

  otRelevance: string;
  otMinPerShift: number;

  turnoverRate: number;
  retentionRelevance: string;

  agencyReliance: string;
  agencyMonthlySpend: number;

  bedsidePriority: string;
  bedsideTracking: string;

  qualityConcern: string;
}

export const BURDEN_INDICATORS = [
  { id: "overtime_late", label: "Nurses regularly stay late to finish charting" },
  { id: "engagement_surveys", label: "Documentation is cited in engagement or satisfaction surveys" },
  { id: "onboarding_struggle", label: "New nurses struggle with documentation workload during onboarding" },
  { id: "experienced_frustration", label: "Experienced nurses mention documentation as a frustration" },
  { id: "bedside_time", label: "Documentation time reduces time available for direct patient care" },
  { id: "flowsheet_completeness", label: "Flowsheet completeness or consistency is a concern" },
  { id: "handoff_quality", label: "Handoff documentation quality varies significantly" },
  { id: "exit_interviews", label: "Documentation burden is mentioned in exit interviews" },
  { id: "agency_reliance", label: "We rely on agency or travel nurses partly due to staffing challenges" },
  { id: "ot_budget", label: "Overtime driven by end-of-shift charting is a budget concern" },
] as const;

export const PATHWAY_KEYS = ["overtime", "retention", "agency", "bedside", "quality"] as const;
export type PathwayKey = typeof PATHWAY_KEYS[number];

export interface PathwayResult {
  key: PathwayKey;
  label: string;
  relevance: "high" | "moderate" | "low";
  dataAvailable: "yes" | "some" | "limited" | "no";
}

export const DEFAULT_NURSING_INPUTS: NursingInputs = {
  staffedBeds: 0,
  nurseFTEs: 0,
  bedOccupancy: 80,
  docTimeFlowsheets: 0,
  docTimeCare: 0,
  docTimeHandoff: 0,
  docTimeOther: 0,
  burdenIndicators: [],
  otRelevance: "",
  otMinPerShift: 0,
  turnoverRate: 0,
  retentionRelevance: "",
  agencyReliance: "",
  agencyMonthlySpend: 0,
  bedsidePriority: "",
  bedsideTracking: "",
  qualityConcern: "",
};
