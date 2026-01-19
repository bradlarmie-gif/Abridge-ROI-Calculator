export type CareSettingType = "outpatient" | "ed" | "nursing" | "inpatient";
export type AllSettingType = CareSettingType;
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
    // ⏱️ TIME SAVED BENEFITS
    {
      id: "nursingOvertime",
      label: "Overtime Reduction",
      category: "time",
      description: "Eliminate end-of-shift documentation catch-up",
      driverSummary: "Most directly measurable—shows up in payroll data",
      keyMetric: "$400K-900K for 200 staffed beds",
    },
    {
      id: "nursingDocTime",
      label: "Documentation Time Savings",
      category: "time",
      description: "Return hours to bedside care",
      driverSummary: "Immediate impact on nurse workflow",
      keyMetric: "$300K-700K for 200 staffed beds",
    },
    {
      id: "nursingAgency",
      label: "Agency & Travel Nurse Reduction",
      category: "time",
      description: "Convert expensive agency spend to staff positions",
      driverSummary: "Agency nurses cost 2-3x staff nurses",
      keyMetric: "$200K-500K for 200 staffed beds",
    },
    {
      id: "nursingRetention",
      label: "Nurse Retention",
      category: "time",
      description: "Address the top driver of nursing burnout",
      driverSummary: "Long-term impact—12+ months to measure fully",
      keyMetric: "$100K-250K for 200 staffed beds",
      hasWarning: true,
      warningText: "Long-term—12+ months to see full impact",
    },
    // 📋 DOCUMENTATION QUALITY BENEFITS
    {
      id: "nursingCompleteness",
      label: "Documentation Timeliness & Completeness",
      category: "documentation",
      description: "Real-time documentation, regulatory compliance",
      driverSummary: "Harder to monetize but important for compliance",
      keyMetric: "$30K-75K for 200 staffed beds",
      hasWarning: true,
      warningText: "Harder to monetize—but important for compliance",
    },
  ],

  inpatient: [
    {
      id: "inpatientRounding",
      label: "Rounding Efficiency & Time Savings",
      category: "time",
      description:
        "Return time to bedside care, teaching, discharge planning.",
      driverSummary: "Immediate impact—measurable within weeks",
      keyMetric: "$150K-350K for 20 hospitalists",
    },
    {
      id: "inpatientRetention",
      label: "Hospitalist Retention",
      category: "time",
      description:
        "Address the #1 driver of hospitalist turnover.",
      driverSummary: "Hospitalist turnover is a crisis (15-20% typical)",
      keyMetric: "$100K-250K for 20 hospitalists",
      hasWarning: true,
      warningText: "Long-term—12+ months to see full impact",
    },
    {
      id: "inpatientCCMCC",
      label: "CC/MCC Capture (DRG Optimization)",
      category: "documentation",
      description:
        "Document the complexity you're managing.",
      driverSummary: "Directly impacts DRG weight and reimbursement",
      keyMetric: "$250K-500K for 20 hospitalists",
    },
    {
      id: "inpatientCDI",
      label: "CDI Query Reduction",
      category: "documentation",
      description:
        "Better initial documentation = less rework.",
      driverSummary: "Operational efficiency—CDI teams love this",
      keyMetric: "$20K-50K for 20 hospitalists",
    },
    {
      id: "inpatientDenials",
      label: "Documentation-Related Denials",
      category: "documentation",
      description:
        "Protect your reimbursement.",
      driverSummary: "Inpatient denials are high-dollar",
      keyMetric: "$150K-400K for 20 hospitalists",
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
  time: {
    label: "Time Saved Benefits",
    description: "Workforce efficiency and cost management",
  },
  documentation: {
    label: "Documentation Quality Benefits",
    description: "Clinical documentation and compliance",
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
