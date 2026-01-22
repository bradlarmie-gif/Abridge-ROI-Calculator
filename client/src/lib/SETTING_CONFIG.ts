export type CareSettingType = "outpatient" | "ed" | "nursing" | "inpatient";
export type AllSettingType = CareSettingType;
export type LeverCategory = "time" | "documentation" | "capacityLabor" | "documentationQuality" | "qualityRevenue" | "laborCost" | "qualitySafety" | "additional";

export interface LeverConfig {
  id: string;
  label: string;
  category: LeverCategory;
  description: string;
  driverSummary: string;
  keyMetric?: string;
  hasWarning?: boolean;
  warningText?: string;
  isPotentialValue?: boolean;   // Shown separately, not in main total (e.g., HAPI)
  isNotQuantified?: boolean;    // Qualitative only, not quantified in ROI (e.g., Survey, Care Coordination)
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
    // 💰 LABOR COST BENEFITS (Direct budget impact)
    {
      id: "nursingOvertime",
      label: "Overtime Reduction",
      category: "laborCost",
      description: "Eliminate end-of-shift documentation catch-up",
      driverSummary: "Most directly measurable—shows up in payroll data",
      keyMetric: "$300K-$600K for 200 beds",
    },
    {
      id: "nursingAgency",
      label: "Agency & Travel Nurse Reduction",
      category: "laborCost",
      description: "Convert expensive agency spend to staff positions",
      driverSummary: "Agency nurses cost 2-3x staff nurses",
      keyMetric: "$150K-$350K for 200 beds",
    },
    {
      id: "nursingRetention",
      label: "Nurse Retention",
      category: "laborCost",
      description: "Address the top driver of nursing burnout",
      driverSummary: "Long-term impact—12+ months to measure fully",
      keyMetric: "$150K-$350K for 200 beds",
      hasWarning: true,
      warningText: "Long-term—12+ months to see full impact",
    },
    // 🛡️ QUALITY & SAFETY BENEFITS
    {
      id: "nursingHAPI",
      label: "HAPI Prevention",
      category: "qualitySafety",
      description: "Reduce hospital-acquired pressure injuries",
      driverSummary: "Potential value—indirect causal link",
      keyMetric: "$300K-$600K for 200 beds (potential)",
      hasWarning: true,
      warningText: "Shown as potential value—not included in main ROI total",
      isPotentialValue: true,
    },
    {
      id: "nursingFalls",
      label: "Falls Prevention",
      category: "qualitySafety",
      description: "Reduce patient falls through real-time risk assessment",
      driverSummary: "Potential value—indirect causal link",
      keyMetric: "$150K-$300K for 200 beds (potential)",
      hasWarning: true,
      warningText: "Shown as potential value—not included in main ROI total",
      isPotentialValue: true,
    },
    // ✨ ADDITIONAL BENEFITS (Not quantified)
    {
      id: "nursingSurvey",
      label: "Survey & Compliance Readiness",
      category: "additional",
      description: "Real-time documentation supports audit confidence",
      driverSummary: "Not quantified—qualitative value",
      keyMetric: "Qualitative",
      isNotQuantified: true,
    },
    {
      id: "nursingCareCoordination",
      label: "Care Coordination",
      category: "additional",
      description: "Better handoffs through complete documentation",
      driverSummary: "Not quantified—qualitative value",
      keyMetric: "Qualitative",
      isNotQuantified: true,
    },
  ],

  inpatient: [
    {
      id: "inpatientRetention",
      label: "Hospitalist Retention",
      category: "capacityLabor",
      description:
        "Address the #1 driver of hospitalist turnover.",
      driverSummary: "Hospitalist turnover is a crisis (15-20% typical)",
      keyMetric: "$100K-250K for 20 providers",
      hasWarning: true,
      warningText: "Long-term—12+ months to see full impact",
    },
    {
      id: "inpatientCCMCC",
      label: "CC/MCC Capture (DRG Optimization)",
      category: "qualityRevenue",
      description:
        "Document the complexity you're managing.",
      driverSummary: "Directly impacts DRG weight and reimbursement",
      keyMetric: "$250K-500K for 20 providers",
    },
    {
      id: "inpatientCDI",
      label: "CDI Query Reduction",
      category: "qualityRevenue",
      description:
        "Better initial documentation = less rework.",
      driverSummary: "Operational efficiency—CDI teams love this",
      keyMetric: "$20K-50K for 20 providers",
    },
    {
      id: "inpatientDenials",
      label: "Documentation-Related Denials",
      category: "qualityRevenue",
      description:
        "Protect your reimbursement.",
      driverSummary: "Inpatient denials are high-dollar",
      keyMetric: "$150K-400K for 20 providers",
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
  laborCost: "Labor Cost Benefits",
  qualitySafety: "Quality & Safety Benefits",
  additional: "Additional Benefits",
};

export const NURSING_CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  laborCost: {
    label: "Labor Cost Benefits",
    description: "Direct budget impact",
  },
  qualitySafety: {
    label: "Quality & Safety Benefits",
    description: "Risk reduction and patient outcomes",
  },
  additional: {
    label: "Additional Benefits",
    description: "Not quantified — qualitative value",
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
    laborCost: levers.filter((l) => l.category === "laborCost"),
    qualitySafety: levers.filter((l) => l.category === "qualitySafety"),
    additional: levers.filter((l) => l.category === "additional"),
  };
}

export function getNursingDriversByCategory(): Record<string, LeverConfig[]> {
  const levers = SETTING_CONFIG.nursing;
  return {
    laborCost: levers.filter((l) => l.category === "laborCost"),
    qualitySafety: levers.filter((l) => l.category === "qualitySafety"),
    additional: levers.filter((l) => l.category === "additional"),
  };
}

export function getLeverConfigById(
  setting: CareSettingType,
  leverId: string,
): LeverConfig | undefined {
  return SETTING_CONFIG[setting].find((l) => l.id === leverId);
}
