export type CareSettingType = "outpatient" | "ed" | "nursing";
export type AllSettingType = CareSettingType | "inpatient";
export type LeverCategory = "time" | "documentation";

export interface LeverConfig {
  id: string;
  label: string;
  category: LeverCategory;
  description: string;
  driverSummary: string;
}

export const SETTING_CONFIG: Record<CareSettingType, LeverConfig[]> = {
  outpatient: [
    {
      id: "patientAccess",
      label: "Patient Access",
      category: "time",
      description: "Small documentation delays accumulate and limit how many patients a clinician can reasonably see. Reducing that friction restores time to the day, improving access without increasing staffing.",
      driverSummary: "visits per provider per day, downstream revenue.",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Cost Avoidance",
      category: "time",
      description: "After-hours charting often drives avoidable overtime and reliance on locums. Completing more documentation during the visit reduces premium labor needs.",
      driverSummary: "overtime spend, locum hours.",
    },
    {
      id: "workforce",
      label: "Clinician Retention",
      category: "time",
      description: "Administrative overload is a major driver of burnout and turnover. Lightening documentation improves clinician sustainability and helps teams stay intact.",
      driverSummary: "avoided replacement cost, team stability.",
    },
    {
      id: "hcc",
      label: "HCC & Chronic Condition Capture",
      category: "documentation",
      description: "Incomplete documentation often understates patient complexity. Capturing conditions more consistently supports accurate risk adjustment and care planning.",
      driverSummary: "RAF accuracy, risk-adjusted reimbursement.",
    },
    {
      id: "wrvu",
      label: "Level of Service Alignment",
      category: "documentation",
      description: "Visits are frequently coded below their true complexity because key reasoning isn't fully documented. Clearer narratives help coding align with the work actually performed.",
      driverSummary: "wRVUs, per-visit reimbursement.",
    },
  ],
  ed: [
    {
      id: "edThroughput",
      label: "Throughput & Cycle Time Improvement",
      category: "time",
      description: "Documentation delays slow clinician flow and increase door-to-doc and disposition times. Ambient reduces charting overhead and keeps clinicians moving patients efficiently through the ED.",
      driverSummary: "throughput, LWBS reduction.",
    },
    {
      id: "edStaffingEfficiency",
      label: "Staffing Efficiency & Overtime Avoidance",
      category: "time",
      description: "EDs often depend on overtime or locums when documentation demands exceed available clinician hours. Ambient reduces after-shift charting and stabilizes staffing needs.",
      driverSummary: "overtime spend, locum reliance.",
    },
    {
      id: "edLevelOfService",
      label: "Level of Service Alignment",
      category: "documentation",
      description: "Critical reasoning in ED encounters is often under-documented, suppressing acuity-based coding. Ambient preserves clinical detail in real time, supporting accurate E/M level selection.",
      driverSummary: "ED professional revenue, acuity-aligned coding.",
    },
    {
      id: "edQualityCompliance",
      label: "Quality & Documentation Compliance",
      category: "documentation",
      description: "ED quality programs rely on precise documentation of symptoms, timing, interventions, and reassessments. Ambient automates consistent capture of these details.",
      driverSummary: "quality measure performance, regulatory compliance.",
    },
  ],
  nursing: [
    {
      id: "rnDocTime",
      label: "Documentation Time Reduction",
      category: "time",
      description: "Nurses spend large portions of each shift documenting, often outside of scheduled hours. Ambient captures bedside conversations automatically, reducing documentation load and freeing time for direct care.",
      driverSummary: "staffing efficiency, reduced overtime.",
    },
    {
      id: "rnQualityAccuracy",
      label: "Quality Measure Accuracy",
      category: "documentation",
      description: "Nursing documentation impacts CC/MCC capture, acuity scoring, and regulatory performance. Ambient ensures essential observations and assessments are consistently captured.",
      driverSummary: "CC/MCC accuracy, DRG integrity.",
    },
    {
      id: "rnSafetyReduction",
      label: "Risk & Safety Event Reduction",
      category: "documentation",
      description: "Incomplete or delayed documentation can obscure clinical changes and contribute to preventable safety events. Ambient strengthens real-time documentation to support timely recognition and intervention.",
      driverSummary: "reduced safety events, improved outcomes.",
    },
    {
      id: "rnCommunication",
      label: "Interdisciplinary Communication Efficiency",
      category: "time",
      description: "Nurses frequently re-document or verbally repeat information to other care team members. Ambient produces clear summaries that streamline handoffs and coordination.",
      driverSummary: "faster handoffs, more efficient team workflows.",
    },
  ],
};

export const CARE_SETTING_LABELS: Record<AllSettingType, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  nursing: "Nursing",
  inpatient: "Inpatient",
};

export const CATEGORY_LABELS: Record<LeverCategory, string> = {
  time: "Time",
  documentation: "Documentation Quality",
};

export function getLeversByCategory(setting: CareSettingType): Record<LeverCategory, LeverConfig[]> {
  const levers = SETTING_CONFIG[setting];
  return {
    time: levers.filter((l) => l.category === "time"),
    documentation: levers.filter((l) => l.category === "documentation"),
  };
}

export function getLeverConfigById(setting: CareSettingType, leverId: string): LeverConfig | undefined {
  return SETTING_CONFIG[setting].find((l) => l.id === leverId);
}
