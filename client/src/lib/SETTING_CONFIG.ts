export type CareSettingType = "outpatient" | "ed" | "nursing";
export type AllSettingType = CareSettingType | "inpatient";

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
      description: "Abridge reduces time spent documenting, freeing provider capacity that can be reinvested into additional visits. As more visit slots open, organizations can convert that time into incremental revenue and shorter wait times.",
    },
    {
      id: "overtime",
      label: "Overtime & Locum Savings",
      description: "By shrinking after-hours documentation and inbox work, Abridge reduces the need for overtime and expensive locum coverage. Fewer premium-rate hours directly lower labor spend for the same (or higher) visit volume.",
    },
    {
      id: "workforce",
      label: "Workforce Retention",
      description: "Reducing administrative burden lowers burnout and turnover among clinicians. Avoided departures save recruiting, onboarding, and ramp time costs while preserving continuity of care.",
    },
    {
      id: "riskAdjustment",
      label: "Risk Adjustment / HCC",
      description: "More complete visit documentation makes it easier to capture chronic conditions that accurately reflect patient risk. Better RAF capture improves value-based and capitated revenue without changing panel size.",
    },
    {
      id: "wrvuAlignment",
      label: "wRVU & Level-of-Service Alignment",
      description: "Abridge supports more complete HPI, ROS, and MDM, which shifts encounters to the appropriate E/M level. That documentation-driven wRVU uplift increases revenue per visit while staying compliant.",
    },
    {
      id: "denialReduction",
      label: "Denial Reduction Savings",
      description: "Cleaner, more consistent documentation reduces missing elements that trigger payer denials. Fewer documentation-related denials mean less rework and more revenue paid on first submission.",
    },
  ],
  ed: [
    {
      id: "edPatientAccess",
      label: "ED Patient Access",
      description: "By cutting documentation time per shift, Abridge lets ED clinicians see and disposition more patients without extending hours. As LWBS and walkouts fall, more patients are treated or admitted and their contribution margin is retained.",
    },
    {
      id: "edDocumentationQuality",
      label: "Documentation Quality",
      description: "Structured, complete ED notes and MDM support appropriate E/M levels and accurate coding for high-acuity visits. This improves revenue per ED encounter while reducing audit and compliance risk.",
    },
    {
      id: "edDenialSavings",
      label: "ED Denial Savings",
      description: "Richer ED documentation makes it easier to meet payer requirements for medical necessity, services rendered, and severity. That reduces documentation-driven denials and clawbacks on ED claims.",
    },
    {
      id: "edProviderRetention",
      label: "ED Provider Retention",
      description: "Lower cognitive and clerical load per shift can reduce burnout and annual clinician turnover. Fewer departures avoid the high cost of recruiting, onboarding, and covering gaps with locums.",
    },
    {
      id: "edScribeSavings",
      label: "Scribe Cost Savings",
      description: "As Abridge takes over real-time note generation, dependence on in-person or virtual scribes can be reduced. Those avoided scribe hours or FTEs become direct, recurring cost savings.",
    },
  ],
  nursing: [
    {
      id: "rnLaborEfficiency",
      label: "Annual Labor Efficiency Savings",
      description: "Abridge shortens the time nurses spend charting flowsheets and assessments each shift. Those reclaimed hours reduce overtime and reliance on traveler or agency nurses for the same nursing workload.",
    },
    {
      id: "rnRetention",
      label: "Workforce Retention & Sustainability",
      description: "Reducing documentation burden lowers stress and burnout that drive nurse turnover. Avoided RN departures prevent recruiting and training costs while stabilizing unit staffing.",
    },
    {
      id: "rnSafetyEvents",
      label: "Safety Events Avoidance Cost",
      description: "More timely, accurate documentation and prompts improve awareness of risk factors for falls and HAPI. Fewer serious safety events mean avoided treatment costs, penalties, and quality hits.",
    },
    {
      id: "rnDrgSeverity",
      label: "DRG Severity Capture",
      description: "Richer nursing documentation helps surface comorbidities and complications that support CC/MCC assignment. Better DRG severity capture increases reimbursement per inpatient stay for the same census.",
    },
  ],
};

export const CARE_SETTING_LABELS: Record<AllSettingType, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  nursing: "Nursing",
  inpatient: "Inpatient",
};
