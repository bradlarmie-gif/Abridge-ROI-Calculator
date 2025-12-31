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
      description:
        "Improve appointment availability by reducing documentation-related friction.",
      driverSummary: "visits per provider per day, downstream revenue.",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Cost Savings",
      category: "time",
      description:
        "Reduce after-hours documentation that contributes to overtime and premium staffing.",
      driverSummary: "overtime spend, locum hours.",
    },
    {
      id: "workforce",
      label: "Clinician Retention",
      category: "time",
      description:
        "Reduce administrative burden to support clinician sustainability and team stability.",
      driverSummary: "avoided replacement cost, team stability.",
    },
    {
      id: "losaccuracy",
      label: "Accurate Level of Service",
      category: "documentation",
      description:
        "Ensure visit documentation supports the level of service billed.",
      driverSummary: "wRVUs, per-visit reimbursement.",
    },
    {
      id: "hcc",
      label: "HCC & Chronic Condition Capture",
      category: "documentation",
      description:
        "Capture chronic conditions consistently to support accurate risk adjustment.",
      driverSummary: "RAF accuracy, risk-adjusted reimbursement.",
    },
    {
      id: "denials",
      label: "Denial Reduction",
      category: "documentation",
      description:
        "Reduce preventable denials by improving documentation clarity and completeness.",
      driverSummary: "fewer denied claims, higher net collections.",
    },
  ],

  ed: [
    {
      id: "edThroughput",
      label: "Throughput & Patient Leakage Improvement",
      category: "time",
      description:
        "Documentation done after the fact slows clinicians down and extends door-to-doc and disposition times. Ambient captures the story as care happens, improving flow and reducing patients who leave before being seen or complete their care elsewhere.",
      driverSummary: "throughput, LWBS reduction, recovered visits/admissions.",
    },
    {
      id: "edStaffingEfficiency",
      label: "Staffing Efficiency & Locum Avoidance",
      category: "time",
      description:
        "EDs often plug staffing gaps with overtime or locums when documentation demands eat into clinician capacity. Ambient reduces after-shift charting so more clinical time happens inside scheduled hours with the core team.",
      driverSummary: "overtime spend, locum reliance.",
    },
    {
      id: "edRetention",
      label: "Clinician Retention",
      category: "time",
      description:
        "ED work is intense, and extra documentation load accelerates burnout and churn. Offloading much of the narrative work to ambient support makes shifts more sustainable and helps retain experienced emergency clinicians.",
      driverSummary: "avoided turnover cost, schedule stability.",
    },
    {
      id: "edLevelOfService",
      label: "Level of Service Realignment",
      category: "documentation",
      description:
        "High-acuity ED encounters are often under-documented, pushing E/M levels down. Ambient preserves critical thinking and clinical risk assessment in real time, supporting accurate E/M selection for the acuity actually managed.",
      driverSummary: "ED professional revenue, acuity-aligned coding.",
    },
    {
      id: "edDocCompliance",
      label: "Documentation Compliance",
      category: "documentation",
      description:
        "ED quality programs, sepsis bundles, and payer audits all depend on precise documentation of symptoms, timing, interventions, and reassessments. Ambient ensures these elements are consistently captured, strengthening compliance, quality reporting, and denial defense.",
      driverSummary:
        "quality measure performance, audit readiness, preventable denial reduction.",
    },
  ],
  nursing: [
    {
      id: "rnDocTime",
      label: "Documentation Time Reduction",
      category: "time",
      description:
        "Nurses spend large portions of each shift documenting, often finishing notes after the shift ends. Ambient captures bedside conversations and assessments automatically, reducing manual charting and overtime.",
      driverSummary: "staffing efficiency, reduced overtime.",
    },
    {
      id: "rnCommunication",
      label: "Communication Efficiency",
      category: "time",
      description:
        "Nurses frequently repeat information in handoffs, calls, or manual notes to physicians and other team members. Ambient generates clear summaries that can be shared across the team, speeding handoffs and reducing re-documentation.",
      driverSummary: "faster handoffs, more efficient team workflows.",
    },
    {
      id: "rnSafetyReduction",
      label: "Risk & Safety Event Reduction",
      category: "documentation",
      description:
        "Incomplete or delayed documentation can obscure clinical changes and contribute to preventable safety events like falls, pressure injuries, or missed deterioration. Ambient supports timely, detailed documentation that makes risk more visible.",
      driverSummary: "reduced safety events, improved patient outcomes.",
    },
    {
      id: "rnDiagnosisSeverity",
      label: "Diagnosis Severity (CC/MCC Support)",
      category: "documentation",
      description:
        "Nursing assessments and flowsheets often carry the details that support CC/MCC capture and true severity of illness. Ambient helps ensure these findings are consistently documented, strengthening case-mix accuracy and DRG assignment.",
      driverSummary:
        "CC/MCC capture, DRG integrity, accurate severity representation.",
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

export function getLeversByCategory(
  setting: CareSettingType,
): Record<LeverCategory, LeverConfig[]> {
  const levers = SETTING_CONFIG[setting];
  return {
    time: levers.filter((l) => l.category === "time"),
    documentation: levers.filter((l) => l.category === "documentation"),
  };
}

export function getLeverConfigById(
  setting: CareSettingType,
  leverId: string,
): LeverConfig | undefined {
  return SETTING_CONFIG[setting].find((l) => l.id === leverId);
}
