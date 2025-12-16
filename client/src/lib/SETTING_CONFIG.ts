export type CareSettingType = "outpatient" | "ed" | "nursing";
export type AllSettingType = CareSettingType | "inpatient";
export type LeverCategory = "time" | "documentation";

export interface LeverConfig {
  id: string;
  label: string;
  category: LeverCategory;
  description: string;
}

export const SETTING_CONFIG: Record<CareSettingType, LeverConfig[]> = {
  outpatient: [
    {
      id: "patientAccess",
      label: "Clinical Time Recovered",
      category: "time",
      description: "Most outpatient access problems come from time lost to documentation, not lack of demand. Recovering that time stabilizes schedules, shortens third-next-available, and keeps referrals from backing up.",
    },
    {
      id: "overtime",
      label: "Overtime Reduction",
      category: "time",
      description: "Overtime commonly reflects workflow spillover rather than true staffing gaps. When documentation fits inside the workday, premium labor drops naturally and predictably.",
    },
    {
      id: "workforce",
      label: "Clinician Retention",
      category: "time",
      description: "Burnout is driven less by clinical load and more by the administrative drag wrapped around it. Reducing that drag keeps clinicians in the organization and preserves experience.",
    },
    {
      id: "riskAdjustment",
      label: "Condition Documentation Completeness",
      category: "documentation",
      description: "Care teams often know patients' chronic conditions, but documentation doesn't always carry those details forward. Capturing the full clinical picture leads to more accurate risk modeling and resource planning.",
    },
    {
      id: "wrvu",
      label: "Visit Complexity Documentation",
      category: "documentation",
      description: "Visit complexity is frequently understated because documentation leaves parts of the clinical story unsaid. Better narrative detail allows coding to reflect the work actually performed.",
    },
    {
      id: "denials",
      label: "Documentation-Related Denials",
      category: "documentation",
      description: "Many denials originate from thin documentation rather than clinical disagreement. Strengthening the narrative closes those gaps and reduces avoidable reimbursement friction.",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "ED Flow & LWBS",
      category: "time",
      description: "Flow in the ED is governed by how quickly clinicians can evaluate, document, and disposition patients. When documentation moves faster, fewer patients leave without being seen and throughput improves.",
    },
    {
      id: "edProviderRetention",
      label: "ED Clinician Retention",
      category: "time",
      description: "Emergency clinicians tolerate acuity but not administrative overload. Reducing that overload lowers turnover and reduces dependence on locums.",
    },
    {
      id: "edDocumentationQuality",
      label: "ED Clinical Documentation Quality",
      category: "documentation",
      description: "ED visits rely on clear articulation of acuity and decision-making. More complete documentation strengthens coding accuracy and transitions of care.",
    },
    {
      id: "edDenialSavings",
      label: "ED Denials",
      category: "documentation",
      description: "Medical-necessity denials often stem from incomplete documentation of urgency or rationale. Capturing those elements reliably reduces these preventable denials.",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Utilization",
      category: "documentation",
      description: "Scribes compensate for documentation bottlenecks. When notes keep pace with care, scribes become optional rather than operationally required.",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "Nursing Time Recovered",
      category: "time",
      description: "A significant share of nursing overtime comes from documentation that spills past shift end. Streamlined charting returns time to nurses and reduces reliance on travelers.",
    },
    {
      id: "rnRetention",
      label: "Nursing Retention",
      category: "time",
      description: "Nurses rarely leave because of patient care—they leave because documentation pulls them away from it. Lightening that burden stabilizes staffing and reduces turnover.",
    },
    {
      id: "rnSafetyEvents",
      label: "Patient Safety Documentation",
      category: "documentation",
      description: "Missed or delayed documentation can obscure early signs of deterioration. More timely and structured charting improves situational awareness and supports safer care.",
    },
    {
      id: "rnDrgSeverity",
      label: "Severity Documentation",
      category: "documentation",
      description: "Many CC/MCC indicators originate in nursing assessments. When these are documented consistently, a patient's recorded severity better matches their clinical reality.",
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
