export type CareSettingType = "outpatient" | "ed" | "nursing";

export interface LeverConfig {
  id: string;
  label: string;
  description: string;
}

export const SETTING_CONFIG: Record<CareSettingType, LeverConfig[]> = {
  outpatient: [
    {
      id: "patientAccess",
      label: "Patient Access",
      description: "Revenue from additional patient visits enabled by reclaimed provider time",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Savings",
      description: "Cost savings from reduced overtime and locum coverage requirements",
    },
    {
      id: "workforce",
      label: "Workforce Retention",
      description: "Savings from reduced burnout-driven provider turnover",
    },
    {
      id: "riskAdjustment",
      label: "Risk Adjustment / HCC",
      description: "Additional MA revenue from improved HCC condition capture",
    },
    {
      id: "wrvuAlignment",
      label: "wRVU & Level-of-Service Alignment",
      description: "Additional revenue from improved documentation and coding accuracy",
    },
    {
      id: "denialReduction",
      label: "Denial Reduction",
      description: "Revenue recovered by reducing documentation-related claim denials",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "ED Patient Access",
      description: "Improved patient throughput and reduced wait times in emergency department",
    },
    {
      id: "edDocumentationQuality",
      label: "Documentation Quality",
      description: "Enhanced clinical documentation accuracy and completeness for ED visits",
    },
    {
      id: "edDenialSavings",
      label: "ED Denial Savings",
      description: "Reduced claim denials through better ED documentation and coding",
    },
    {
      id: "edProviderRetention",
      label: "ED Provider Retention",
      description: "Reduced ED physician and APP turnover from decreased administrative burden",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Savings",
      description: "Cost reduction from decreased reliance on medical scribes in the ED",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "RN Labor Efficiency",
      description: "Time savings from streamlined nursing documentation workflows",
    },
    {
      id: "rnRetention",
      label: "RN Retention",
      description: "Reduced nursing turnover from decreased documentation burden",
    },
    {
      id: "rnSafetyEvents",
      label: "Safety Event Reduction",
      description: "Decreased adverse events through improved documentation and handoffs",
    },
    {
      id: "rnDrgSeverity",
      label: "DRG Severity Capture",
      description: "Improved reimbursement through accurate nursing-driven severity documentation",
    },
  ],
};

export const CARE_SETTING_LABELS: Record<CareSettingType, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  nursing: "Nursing",
};
