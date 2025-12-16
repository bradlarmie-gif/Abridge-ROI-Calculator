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
      label: "Patient Access",
      category: "time",
      description: "Small documentation delays accumulate and limit how many patients a clinician can reasonably see. Reducing that friction restores time to the day, improving access without increasing staffing.",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Cost Avoidance",
      category: "time",
      description: "After-hours charting often drives avoidable overtime and reliance on locums. Completing more documentation during the visit reduces premium labor needs.",
    },
    {
      id: "workforce",
      label: "Clinician Retention",
      category: "time",
      description: "Administrative overload is a major driver of burnout and turnover. Lightening documentation improves clinician sustainability and helps teams stay intact.",
    },
    {
      id: "hcc",
      label: "HCC & Chronic Condition Capture",
      category: "documentation",
      description: "Incomplete documentation often understates patient complexity. Capturing conditions more consistently supports accurate risk adjustment and care planning.",
    },
    {
      id: "wrvu",
      label: "Level of Service Alignment",
      category: "documentation",
      description: "Visits are frequently coded below their true complexity because key reasoning isn't fully documented. Clearer narratives help coding align with the work actually performed.",
    },
    {
      id: "denials",
      label: "Medical Necessity–Driven Denials",
      category: "documentation",
      description: "Many denials occur because documentation doesn't reflect medical necessity clearly enough to stand on its own. Stronger encounter narratives reduce these unrecoverable losses.",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "ED Flow & LWBS",
      category: "time",
      description: "Throughput in the ED is governed not only by staffing but by the pace at which clinicians can evaluate, document, and disposition patients. When documentation happens more efficiently, patients move through the system faster and fewer leave without being seen. Abridge enables more in-flow documentation, improving ED efficiency and reducing LWBS.",
    },
    {
      id: "edProviderRetention",
      label: "ED Clinician Retention",
      category: "time",
      description: "ED clinicians tolerate acuity, but administrative drag erodes resilience. Documentation burden contributes heavily to burnout and turnover, creating staffing instability. By reducing cognitive load and end-of-shift documentation work, Abridge helps ED teams maintain more sustainable workloads and improves clinician retention.",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Utilization",
      category: "time",
      description: "Scribes are often used to compensate for documentation volume that outpaces clinician capacity. When documentation becomes lighter and more synchronous with care, organizations can rebalance how scribes are used—maintaining support where needed while reducing dependency where documentation friction decreases.",
    },
    {
      id: "edDocumentationQuality",
      label: "ED Clinical Documentation Quality",
      category: "documentation",
      description: "Accurate ED coding and care transitions depend on clear articulation of acuity and clinical reasoning. When documentation is incomplete or rushed, it weakens both coding fidelity and downstream clinical handoffs. Abridge captures more detail from the encounter, improving documentation quality without slowing clinicians down.",
    },
    {
      id: "edDenialSavings",
      label: "ED Denials",
      category: "documentation",
      description: "Many ED denials stem from insufficient documentation of urgency, rationale, or medical decision-making. These denials consume significant administrative effort and often represent preventable revenue loss. By strengthening the clinical narrative, Abridge reduces documentation-related ED denials tied to unclear or incomplete justification.",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "Nursing Time Recovered",
      category: "time",
      description: "A large portion of nursing overtime originates from documentation tasks that accumulate throughout the shift. When flowsheets and assessments take longer than planned, nurses finish documentation after their shift ends. Abridge streamlines documentation in real time, helping shifts end on time and reducing avoidable overtime.",
    },
    {
      id: "rnRetention",
      label: "Nursing Retention",
      category: "time",
      description: "Nurses often cite documentation burden as a major driver of burnout and turnover. Heavy administrative load reduces time spent on direct patient care and increases fatigue. Abridge lightens this burden, supporting more sustainable workflows and improving nurse retention.",
    },
    {
      id: "rnSafetyEvents",
      label: "Patient Safety Documentation",
      category: "documentation",
      description: "Early indicators of patient deterioration often appear first in nursing documentation. When documentation lags or is incomplete, safety signals can be missed. Abridge helps capture assessments more consistently and promptly, strengthening situational awareness and supporting prevention of avoidable safety events.",
    },
    {
      id: "rnDrgSeverity",
      label: "Severity Documentation",
      category: "documentation",
      description: "Many CC/MCC elements originate in nursing assessments and observations. When these details are inconsistently documented, patient severity is understated, affecting care planning and case mix accuracy. Abridge improves consistency of nursing documentation, supporting more accurate severity capture.",
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
