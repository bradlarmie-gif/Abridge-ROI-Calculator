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
      label: "HCC & Chronic Condition Capture",
      category: "documentation",
      description: "Chronic conditions often exist in the record but aren't consistently documented in each encounter. Better note completeness surfaces both previously known conditions and newly identified ones, supporting more accurate risk scoring and care planning.",
    },
    {
      id: "wrvu",
      label: "Level of Service Alignment",
      category: "documentation",
      description: "Many encounters are billed below their actual complexity because essential clinical reasoning isn't fully documented. Richer narrative detail helps coding teams assign the level that reflects the work actually performed.",
    },
    {
      id: "denials",
      label: "Documentation-Driven Denials",
      category: "documentation",
      description: "A substantial share of denials originate not from coding errors but from documentation that doesn't clearly support medical necessity. Strengthening the clinical story reduces these preventable denials and lowers the burden of rework and appeals.",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "ED Flow & LWBS",
      category: "time",
      description: "Flow in the ED depends as much on documentation speed as it does on staffing or room availability. When clinicians can complete documentation during the encounter, patients are dispositioned sooner—reducing LWBS and restoring predictable throughput.",
    },
    {
      id: "edProviderRetention",
      label: "ED Clinician Retention",
      category: "time",
      description: "Emergency clinicians tolerate intensity; what erodes them is the administrative load layered on top of it. Reducing that load preserves cognitive bandwidth and stabilizes staffing, which strongly influences overall ED performance.",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Utilization",
      category: "time",
      description: "Scribes help ED teams keep pace when documentation demands exceed real-time capacity. When documentation becomes lighter and more synchronous with care, organizations can rebalance scribe use—aligning support with true clinical need.",
    },
    {
      id: "edDocumentationQuality",
      label: "ED Clinical Documentation Quality",
      category: "documentation",
      description: "A strong ED note captures the clinical reasoning behind urgency, acuity, and disposition. When the story is clearer, coding, downstream teams, and quality reviews align more closely with the clinician's intent.",
    },
    {
      id: "edDenialSavings",
      label: "ED Denials",
      category: "documentation",
      description: "Medical-necessity denials in the ED often occur when documentation doesn't fully convey the rationale for the visit or the decisions made. Strengthening those elements reduces preventable denials and supports smoother billing.",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "Nursing Time Recovered",
      category: "time",
      description: "A surprising portion of nursing overtime originates from documentation tasks that spill past shift end. When assessments and flowsheets are completed more efficiently, time returns to direct care and schedule reliability improves.",
    },
    {
      id: "rnRetention",
      label: "Nursing Retention",
      category: "time",
      description: "Nurses rarely cite patient care as their reason for leaving—they cite the administrative burden surrounding it. Reducing that burden helps teams stay intact, preserving experience and reducing turnover-related costs.",
    },
    {
      id: "rnSafetyEvents",
      label: "Patient Safety Documentation",
      category: "documentation",
      description: "Early indicators of patient deterioration often appear first in nursing documentation—or are missed when documentation lags behind care. More timely and structured charting strengthens situational awareness and supports prevention of avoidable events.",
    },
    {
      id: "rnDrgSeverity",
      label: "Severity Documentation",
      category: "documentation",
      description: "Many elements that influence CC/MCC status originate in nursing assessments. When these details are consistently documented, recorded severity aligns more closely with the patient's true condition and improves care planning.",
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
