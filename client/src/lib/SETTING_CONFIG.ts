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
      label: "Patient Capacity Enablement",
      category: "time",
      description: "Abridge reduces documentation time, enabling clinicians to redirect a portion of their day toward direct patient care. This creates the potential for additional visit capacity without extending schedules.",
    },
    {
      id: "overtime",
      label: "Overtime & Premium Labor Avoidance",
      category: "time",
      description: "By decreasing after-hours and end-of-day documentation, Abridge supports lower reliance on overtime and premium-rate labor needed to complete charting.",
    },
    {
      id: "workforce",
      label: "Clinician Retention Support",
      category: "time",
      description: "Reducing administrative load can help decrease burnout-related attrition, lowering the operational and financial burden associated with clinician turnover.",
    },
    {
      id: "riskAdjustment",
      label: "Risk Adjustment Completeness",
      category: "documentation",
      description: "More complete and structured clinical documentation helps ensure chronic conditions are consistently captured, supporting accurate risk adjustment under value-based programs.",
    },
    {
      id: "wrvu",
      label: "E/M Level Appropriateness",
      category: "documentation",
      description: "Enhanced documentation quality provides clearer clinical detail, helping coding teams assign the most appropriate E/M level based on medical decision-making.",
    },
    {
      id: "denials",
      label: "Denial Risk Reduction",
      category: "documentation",
      description: "Improved clarity and completeness of documentation reduce common causes of documentation-related denials, supporting higher first-pass claim acceptance.",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "Throughput & LWBS Improvement",
      category: "time",
      description: "By reducing the time clinicians spend documenting each shift, Abridge can help increase patient throughput and reduce the number of patients leaving without being seen.",
    },
    {
      id: "edProviderRetention",
      label: "ED Clinician Retention Support",
      category: "time",
      description: "Decreasing clerical burden can help mitigate burnout, lowering the likelihood of turnover and the associated operational disruption.",
    },
    {
      id: "edDocumentationQuality",
      label: "ED Documentation Completeness",
      category: "documentation",
      description: "More complete ED documentation strengthens the clinical story, supporting appropriate acuity capture and improved coding accuracy.",
    },
    {
      id: "edDenialSavings",
      label: "ED Denial Risk Reduction",
      category: "documentation",
      description: "Higher-quality documentation reduces gaps that commonly lead to medical necessity or clinical validation denials within emergency services.",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Utilization Reduction",
      category: "documentation",
      description: "As real-time documentation support improves note completeness, organizations may reduce reliance on in-person or virtual scribes.",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "Nursing Labor Efficiency",
      category: "time",
      description: "Streamlined flowsheet and assessment documentation gives nurses meaningful time back during their shifts, which can reduce overtime and reliance on traveler or agency staff.",
    },
    {
      id: "rnRetention",
      label: "Nursing Retention Support",
      category: "time",
      description: "Lower documentation burden can help lessen burnout-related RN turnover, reducing replacement, orientation, and onboarding costs.",
    },
    {
      id: "rnSafetyEvents",
      label: "Patient Safety Event Prevention Support",
      category: "documentation",
      description: "More timely, accurate documentation supports situational awareness and adherence to care bundles, helping reduce the likelihood of preventable safety events.",
    },
    {
      id: "rnDrgSeverity",
      label: "DRG Severity Documentation Support",
      category: "documentation",
      description: "Improved nursing documentation helps surface clinically relevant comorbidities and complications, supporting more accurate severity capture for inpatient cases.",
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
  time: "Time Benefits",
  documentation: "Documentation Quality Benefits",
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
