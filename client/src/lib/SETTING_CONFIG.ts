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
      description: "Patient access constraints often originate from minutes lost to documentation throughout the clinic day. These small inefficiencies compress schedules, extend wait times, and limit how many visits a provider can realistically support. When documentation burden decreases, schedules stabilize, backlog shrinks, and access expands without adding hours. Abridge returns those minutes by capturing the clinical story in real time, allowing more of the clinician's day to remain available for patient care.",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Cost Avoidance",
      category: "time",
      description: "Premium labor in outpatient clinics is often a symptom of documentation spilling past scheduled hours, not true staffing shortages. When clinicians stay late to finish notes, organizations quietly accumulate overtime and rely more heavily on locums to maintain coverage. Abridge reduces spillover work by enabling more documentation to be completed inside the visit, helping clinics reduce overtime and avoid avoidable locum spend.",
    },
    {
      id: "workforce",
      label: "Clinician Retention",
      category: "time",
      description: "Burnout is driven less by clinical complexity and more by administrative overload. When documentation consistently extends the workday, clinicians experience higher fatigue and turnover risk. Abridge lightens that load by reducing after-hours charting, helping create a more sustainable daily workflow that supports clinician well-being and retention.",
    },
    {
      id: "riskAdjustment",
      label: "HCC & Chronic Condition Capture",
      category: "documentation",
      description: "Many chronic conditions exist in the record but are inconsistently restated across encounters, leading to under-reported patient complexity and weakened risk models. Abridge generates richer clinical narratives that surface relevant conditions naturally, making it easier for clinicians to confirm or update them. This supports more accurate risk adjustment without adding administrative burden.",
    },
    {
      id: "wrvu",
      label: "Level of Service Alignment",
      category: "documentation",
      description: "Visits are frequently coded below their true complexity because documentation does not fully capture the clinical reasoning behind the encounter. When essential details of assessment and decision-making are missing, coders default to safer, lower levels. Abridge preserves more of the clinician's thought process, enabling coding to reflect the visit's actual complexity: not upcoding, just accurate alignment.",
    },
    {
      id: "denials",
      label: "Medical Necessity–Driven Denials",
      category: "documentation",
      description: "A significant share of unrecoverable denials stem from insufficient documentation of medical necessity or incomplete MDM. These denials cannot be overturned through rework and represent avoidable revenue loss. Abridge strengthens the clinical narrative by capturing clear reasoning for decisions during the visit, reducing denials that originate from documentation gaps rather than clinical care.",
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
