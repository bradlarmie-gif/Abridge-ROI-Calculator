export type CareSettingType = "outpatient" | "ed" | "nursing";
export type AllSettingType = CareSettingType | "inpatient";
export type LeverCategory = "time" | "documentation";

export interface LeverConfig {
  id: string;
  label: string;
  category: LeverCategory;
  description: string;
  driverSummary: string;
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
        "Reduce Left Without Being Seen (LWBS) rates and missed admissions by completing documentation faster during shift.",
      driverSummary: "additional patients treated, LWBS reduction, recovered visits/admissions.",
    },
    {
      id: "edRetention",
      label: "Workforce Retention",
      category: "time",
      description:
        "Lower ED clinician burnout and turnover by reducing after-shift documentation burden.",
      driverSummary: "ED clinician departures avoided, schedule stability.",
    },
    {
      id: "edLevelOfService",
      label: "wRVU & Level-of-Service Alignment",
      category: "documentation",
      description:
        "Improve E/M accuracy and documentation completeness for better wRVU capture in time-pressured ED environment.",
      driverSummary: "wRVU capture improvement, acuity-aligned coding.",
    },
    {
      id: "edDenialReduction",
      label: "Documentation-Related Denials",
      category: "documentation",
      description:
        "Reduce denials caused by incomplete or unclear ED documentation under time pressure.",
      driverSummary: "documentation-related denials prevented, higher net collections.",
    },
  ],
  nursing: [
    {
      id: "rnDocTime",
      label: "Documentation Time Reduction",
      category: "time",
      description: "Reduce time spent documenting during and after shifts.",
      driverSummary: "staffing efficiency, reduced overtime.",
    },
    {
      id: "rnCommunication",
      label: "Communication Efficiency",
      category: "time",
      description:
        "Reduce repetitive manual documentation across handoffs and care coordination.",
      driverSummary: "faster handoffs, more efficient team workflows.",
    },
    {
      id: "rnSafetyReduction",
      label: "Risk & Safety Event Reduction",
      category: "documentation",
      description:
        "Improve documentation timeliness to surface clinical changes and reduce safety events.",
      driverSummary: "reduced safety events, improved patient outcomes.",
    },
    {
      id: "rnDiagnosisSeverity",
      label: "Diagnosis Severity (CC/MCC Support)",
      category: "documentation",
      description:
        "Ensure nursing assessments capture clinical severity that supports CC/MCC documentation.",
      driverSummary:
        "CC/MCC capture, DRG integrity, accurate severity representation.",
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

export function getLeversByCategory(
  setting: CareSettingType,
): Record<LeverCategory, LeverConfig[]> {
  const levers = SETTING_CONFIG[setting];
  return {
    time: levers.filter((l) => l.category === "time"),
    documentation: levers.filter((l) => l.category === "documentation"),
  };
}

export function getLeverConfigById(
  setting: CareSettingType,
  leverId: string,
): LeverConfig | undefined {
  return SETTING_CONFIG[setting].find((l) => l.id === leverId);
}
