export type CareSettingType = "outpatient" | "ed" | "nursing";
export type AllSettingType = CareSettingType | "inpatient";
export type LeverCategory = "time" | "documentation" | "capacityLabor" | "documentationQuality" | "qualityRevenue";

export interface LeverConfig {
  id: string;
  label: string;
  category: LeverCategory;
  description: string;
  driverSummary: string;
  keyMetric?: string;
  hasWarning?: boolean;
  warningText?: string;
}

export const SETTING_CONFIG: Record<CareSettingType, LeverConfig[]> = {
  outpatient: [
    {
      id: "patientAccess",
      label: "Patient Access",
      category: "time",
      description:
        "Turn documentation efficiency into additional visit capacity.",
      driverSummary: "visits per provider per day, downstream revenue.",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Cost Savings",
      category: "time",
      description:
        "Reduce overtime and locum reliance driven by after-hours documentation.",
      driverSummary: "overtime spend, locum hours.",
    },
    {
      id: "workforce",
      label: "Clinician Retention",
      category: "time",
      description:
        "Lower burnout and turnover by reducing administrative burden.",
      driverSummary: "avoided replacement cost, team stability.",
    },
    {
      id: "wrvu",
      label: "Accurate Level of Service",
      category: "documentation",
      description: "Ensure visits are billed at the level actually delivered.",
      driverSummary: "wRVUs, per-visit reimbursement.",
    },
    {
      id: "hcc",
      label: "HCC & Chronic Condition Capture",
      category: "documentation",
      description:
        "Improve risk adjustment through more complete clinical documentation.",
      driverSummary: "RAF accuracy, risk-adjusted reimbursement.",
    },
    {
      id: "denials",
      label: "Documentation Related Denials",
      category: "documentation",
      description:
        "Reduce preventable denials caused by incomplete or unclear documentation.",
      driverSummary: "fewer denied claims, higher net collections.",
    },
  ],

  ed: [
    {
      id: "edThroughput",
      label: "Patient Throughput (LWBS Reduction)",
      category: "time",
      description:
        "Keep patients from leaving—capture that revenue.",
      driverSummary: "Direct revenue impact—every LWBS is lost revenue",
      keyMetric: "$150K-350K for 25 physicians",
    },
    {
      id: "edScribe",
      label: "Scribe Cost Reduction",
      category: "time",
      description:
        "Convert scribe labor cost to technology investment.",
      driverSummary: "Only relevant if you currently use scribes",
      keyMetric: "$200K-500K depending on scribe count",
      hasWarning: true,
      warningText: "Only relevant if you currently use scribes",
    },
    {
      id: "edRetention",
      label: "Physician Retention",
      category: "time",
      description:
        "Reduce ED burnout-driven turnover.",
      driverSummary: "Long-term—12+ months to see full impact",
      keyMetric: "$150K-300K for 25 physicians",
      hasWarning: true,
      warningText: "Long-term—12+ months to see full impact",
    },
    {
      id: "edLevelOfService",
      label: "Level-of-Service Accuracy",
      category: "documentation",
      description:
        "Capture appropriate E/M coding for complex ED visits.",
      driverSummary: "ED visits are often under-documented",
      keyMetric: "$150K-300K for 25 physicians",
    },
    {
      id: "edDenials",
      label: "Documentation-Related Denials",
      category: "documentation",
      description:
        "Reduce claim rejections from incomplete documentation.",
      driverSummary: "ED claims face heavy payer scrutiny",
      keyMetric: "$200K-450K for 25 physicians",
    },
  ],
  nursing: [
    // Capacity & Labor
    {
      id: "documentation_time_savings",
      label: "Documentation Time Savings",
      category: "capacityLabor",
      description: "Return hours to nurses through efficient documentation.",
      driverSummary: "staffing efficiency, reduced administrative burden.",
      keyMetric: "Hours returned annually",
    },
    {
      id: "overtime_reduction",
      label: "Overtime Reduction",
      category: "capacityLabor",
      description: "Reduce overtime driven by end-of-shift documentation.",
      driverSummary: "overtime spend reduction, labor cost savings.",
      keyMetric: "OT hours avoided",
    },
    {
      id: "agency_reduction",
      label: "Agency & Travel Nurse Reduction",
      category: "capacityLabor",
      description: "Decrease reliance on premium labor through retention.",
      driverSummary: "agency spend reduction, workforce stability.",
      keyMetric: "Agency hours reduced",
    },
    {
      id: "nurse_retention",
      label: "Nurse Retention",
      category: "capacityLabor",
      description: "Lower burnout and turnover from administrative burden.",
      driverSummary: "reduced turnover, avoided replacement costs.",
      keyMetric: "Departures avoided",
    },
    // Documentation Quality
    {
      id: "documentation_timeliness",
      label: "Documentation Timeliness",
      category: "documentationQuality",
      description: "Enable real-time documentation at point of care.",
      driverSummary: "reduced documentation lag, improved care coordination.",
      keyMetric: "Documentation lag reduction",
    },
    {
      id: "documentation_completeness",
      label: "Documentation Completeness",
      category: "documentationQuality",
      description: "Improve compliance and clinical documentation rates.",
      driverSummary: "improved field completion, better compliance.",
      keyMetric: "Field completion rate",
    },
    // Quality & Revenue (Indirect Impact)
    {
      id: "safety_event_reduction",
      label: "Safety Event Risk Reduction",
      category: "qualityRevenue",
      description: "Support identification of at-risk patients (HAPI, Falls).",
      driverSummary: "reduced safety events, improved patient outcomes.",
      keyMetric: "Risk exposure reduction",
      hasWarning: true,
      warningText: "Indirect relationship—see important limitations",
    },
    {
      id: "ccmcc_support",
      label: "Clinical Documentation & Revenue Support",
      category: "qualityRevenue",
      description: "Support CDI efforts through complete clinical indicators.",
      driverSummary: "CC/MCC capture support, DRG accuracy.",
      keyMetric: "CC/MCC capture support",
      hasWarning: true,
      warningText: "Indirect relationship—see important limitations",
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
  capacityLabor: "Capacity & Labor",
  documentationQuality: "Documentation Quality",
  qualityRevenue: "Quality & Revenue",
};

export const NURSING_CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  capacityLabor: {
    label: "Capacity & Labor",
    description: "Workforce efficiency and cost management",
  },
  documentationQuality: {
    label: "Documentation Quality",
    description: "Clinical documentation and compliance",
  },
  qualityRevenue: {
    label: "Quality & Revenue",
    description: "Requires additional assumptions—see methodology",
  },
};

export function getLeversByCategory(
  setting: CareSettingType,
): Record<LeverCategory, LeverConfig[]> {
  const levers = SETTING_CONFIG[setting];
  return {
    time: levers.filter((l) => l.category === "time"),
    documentation: levers.filter((l) => l.category === "documentation"),
    capacityLabor: levers.filter((l) => l.category === "capacityLabor"),
    documentationQuality: levers.filter((l) => l.category === "documentationQuality"),
    qualityRevenue: levers.filter((l) => l.category === "qualityRevenue"),
  };
}

export function getNursingDriversByCategory(): Record<string, LeverConfig[]> {
  const levers = SETTING_CONFIG.nursing;
  return {
    capacityLabor: levers.filter((l) => l.category === "capacityLabor"),
    documentationQuality: levers.filter((l) => l.category === "documentationQuality"),
    qualityRevenue: levers.filter((l) => l.category === "qualityRevenue"),
  };
}

export function getLeverConfigById(
  setting: CareSettingType,
  leverId: string,
): LeverConfig | undefined {
  return SETTING_CONFIG[setting].find((l) => l.id === leverId);
}
