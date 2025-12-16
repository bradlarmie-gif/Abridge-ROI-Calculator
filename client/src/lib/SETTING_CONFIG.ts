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
      description: "When documentation takes less time, schedule capacity stops leaking; providers can reduce third-next-available and capture referrals they currently turn away.",
    },
    {
      id: "overtime",
      label: "Overtime & Premium Labor Avoidance",
      category: "time",
      description: "End-of-day work isn't inevitable—it's a symptom of friction. Removing that friction shrinks overtime and premium pay that shouldn't exist.",
    },
    {
      id: "workforce",
      label: "Clinician Retention Support",
      category: "time",
      description: "Most turnover is driven by cognitive overload, not the medicine. Lighter documentation helps keep clinicians, preserving your most expensive asset: experience.",
    },
    {
      id: "riskAdjustment",
      label: "Risk Adjustment Completeness",
      category: "documentation",
      description: "When the full clinical picture is documented consistently, risk scores stop under-representing patient complexity and stabilize value-based performance.",
    },
    {
      id: "wrvu",
      label: "E/M Level Appropriateness",
      category: "documentation",
      description: "Under-leveling happens when details are missing, not when complexity is low. Abridge restores the completeness needed for coding to reflect real clinical work.",
    },
    {
      id: "denials",
      label: "Denial Risk Reduction",
      category: "documentation",
      description: "Many denials trace back to thin or ambiguous documentation. Strengthening the clinical narrative from the start collapses avoidable denial pathways.",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "Throughput & LWBS Improvement",
      category: "time",
      description: "Throughput is mostly documentation time in disguise. When notes move faster, clinicians disposition patients earlier and LWBS falls.",
    },
    {
      id: "edProviderRetention",
      label: "ED Clinician Retention Support",
      category: "time",
      description: "ED burnout isn't acuity—it's the administrative drag layered on top of acuity. Reducing that drag stabilizes staffing and lowers locum dependence.",
    },
    {
      id: "edDocumentationQuality",
      label: "ED Documentation Completeness",
      category: "documentation",
      description: "Chaotic environments shouldn't produce chaotic notes. More complete ED documentation supports accurate acuity capture and clearer clinical stories.",
    },
    {
      id: "edDenialSavings",
      label: "ED Denial Risk Reduction",
      category: "documentation",
      description: "Emergency claims falter when the narrative doesn't justify urgency. Stronger ED documentation meets medical necessity thresholds from the outset.",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Utilization Reduction",
      category: "documentation",
      description: "When real-time documentation keeps up with the encounter, scribes shift from 'required coverage' to 'optional support,' converting recurring costs into choice.",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "Nursing Labor Efficiency",
      category: "time",
      description: "A large share of overtime comes from documentation spillover. Faster flowsheeting brings shifts back on time and reduces reliance on travelers.",
    },
    {
      id: "rnRetention",
      label: "Nursing Retention Support",
      category: "time",
      description: "Nurses don't leave the bedside—they leave the burden. Reducing documentation strain helps retain teams and lowers constant backfill costs.",
    },
    {
      id: "rnSafetyEvents",
      label: "Patient Safety Event Prevention Support",
      category: "documentation",
      description: "Most preventable events start with missed signals. Timely, structured documentation strengthens awareness and supports safety bundle adherence.",
    },
    {
      id: "rnDrgSeverity",
      label: "DRG Severity Documentation Support",
      category: "documentation",
      description: "Many CC/MCC opportunities originate in nursing assessments. When these are consistently captured, case severity aligns with clinical reality.",
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
