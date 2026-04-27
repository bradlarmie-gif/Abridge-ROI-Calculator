import type { ComponentType } from "react";
import type { ExploreState } from "@/pages/explore/ExploreFlow";
import PatientAccessCalc from "@/components/explore/drivers/PatientAccessCalc";
import LwbsRecoveryCalc from "@/components/explore/drivers/LwbsRecoveryCalc";
import AdmissionCaptureCalc from "@/components/explore/drivers/AdmissionCaptureCalc";
import ProviderWellbeingCalc from "@/components/explore/drivers/ProviderWellbeingCalc";
import PhysicianLocumAgencyCalc from "@/components/explore/drivers/PhysicianLocumAgencyCalc";
import NursingRetentionCalc from "@/components/explore/drivers/NursingRetentionCalc";
import NursingAgencyCalc from "@/components/explore/drivers/NursingAgencyCalc";
import NursingOvertimeCalc from "@/components/explore/drivers/NursingOvertimeCalc";
import NursingHapiCalc from "@/components/explore/drivers/NursingHapiCalc";
import NursingFallsCalc from "@/components/explore/drivers/NursingFallsCalc";
import NursingCautiCalc from "@/components/explore/drivers/NursingCautiCalc";
import NursingClabsiCalc from "@/components/explore/drivers/NursingClabsiCalc";
import NursingSepsisCalc from "@/components/explore/drivers/NursingSepsisCalc";

export type ExploreQuadrant = 'Capacity' | 'Workforce' | 'Revenue' | 'Quality';

export type DriverScaleAxis = 'providers' | 'encounters' | 'patientDays' | 'fixed';
export type ExploreSetting = 'outpatient' | 'ed' | 'inpatient' | 'nursing';
export type ExploreDriverVisibility = 'quantified' | 'qualitative';

export interface ExploreCalcComponentProps {
  state: ExploreState;
  updateTimeDriverInputs: (updates: Partial<ExploreState['timeDriverInputs']>) => void;
  updateDocQualityInputs: (updates: Partial<ExploreState['docQualityInputs']>) => void;
  totalHoursSaved: number;
}

export interface ExploreDriverMeasureDefaults {
  deltaLabel: string;
  deltaUnit: string;
  valuePerUnitLabel: string;
  valuePerUnitDefault: number;
  valuePerUnitPrefix?: string;
  valuePerUnitSuffix?: string;
  realizationDefault: number;
  scaleAxis: DriverScaleAxis;
}

export interface ExploreDriver {
  id: string;
  label: string;
  shortDescription: string;
  quadrant: ExploreQuadrant;
  settings: ExploreSetting[];
  visibility: ExploreDriverVisibility;
  enabledStateKey: string;
  expandedStateKey?: string;
  childOfDriverId?: string;
  trackedMeasureIds?: string[];
  calcComponent?: ComponentType<ExploreCalcComponentProps>;
  measureDefaults?: ExploreDriverMeasureDefaults;
}

export const EXPLORE_DRIVERS: ExploreDriver[] = [
  // ───── CAPACITY ─────
  {
    id: 'patientAccess',
    label: 'Patient Access',
    shortDescription: 'Reinvest reclaimed documentation time into additional patient visits.',
    quadrant: 'Capacity',
    settings: ['outpatient'],
    visibility: 'quantified',
    enabledStateKey: 'patientAccessEnabled',
    expandedStateKey: 'patientAccessExpanded',
    calcComponent: PatientAccessCalc,
    trackedMeasureIds: ['patientsPerProvider', 'visitsPerHour', 'timeInNote'],
    measureDefaults: {
      deltaLabel: 'Additional visits per year (across all providers)',
      deltaUnit: 'visits',
      valuePerUnitLabel: 'Revenue per visit',
      valuePerUnitDefault: 250,
      valuePerUnitPrefix: '$',
      realizationDefault: 80,
      scaleAxis: 'providers',
    },
  },
  {
    id: 'lwbsRecovery',
    label: 'LWBS Recovery',
    shortDescription: 'Recover patients who would otherwise leave the ED before being seen.',
    quadrant: 'Capacity',
    settings: ['ed'],
    visibility: 'quantified',
    enabledStateKey: 'edLwbsEnabled',
    expandedStateKey: 'edLwbsExpanded',
    calcComponent: LwbsRecoveryCalc,
    trackedMeasureIds: ['lwbsRate', 'doorToProvider'],
    measureDefaults: {
      deltaLabel: 'Patients recovered from LWBS per year',
      deltaUnit: 'patients',
      valuePerUnitLabel: 'Revenue per ED visit',
      valuePerUnitDefault: 480,
      valuePerUnitPrefix: '$',
      realizationDefault: 75,
      scaleAxis: 'encounters',
    },
  },
  {
    id: 'admissionCapture',
    label: 'Admission Capture',
    shortDescription: 'Capture revenue when LWBS-recovered patients require inpatient admission.',
    quadrant: 'Capacity',
    settings: ['ed'],
    visibility: 'quantified',
    enabledStateKey: 'edThroughputEnabled',
    expandedStateKey: 'edThroughputExpanded',
    childOfDriverId: 'lwbsRecovery',
    calcComponent: AdmissionCaptureCalc,
    measureDefaults: {
      deltaLabel: 'Admissions captured from recovered LWBS',
      deltaUnit: 'admissions',
      valuePerUnitLabel: 'Revenue per admission',
      valuePerUnitDefault: 8000,
      valuePerUnitPrefix: '$',
      realizationDefault: 40,
      scaleAxis: 'encounters',
    },
  },
  {
    id: 'roundingEfficiency',
    label: 'Rounding Efficiency',
    shortDescription: 'More time at the bedside during rounds rather than in the EHR.',
    quadrant: 'Capacity',
    settings: ['inpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'ipRoundingEnabled',
    expandedStateKey: 'ipRoundingExpanded',
  },
  {
    id: 'bedsideTime',
    label: 'Bedside / Direct Care Time',
    shortDescription: 'Reclaimed documentation time spent in direct patient care.',
    quadrant: 'Capacity',
    settings: ['nursing'],
    visibility: 'qualitative',
    enabledStateKey: 'nursingCareTimeEnabled',
    expandedStateKey: 'nursingCareTimeExpanded',
    trackedMeasureIds: ['bedsideTimeRatio'],
  },
  // ───── WORKFORCE ─────
  {
    id: 'providerWellbeing',
    label: 'Provider Wellbeing',
    shortDescription: 'Documentation burden is a leading contributor to provider burnout and turnover. This driver models the avoided replacement cost when retention improves.',
    quadrant: 'Workforce',
    settings: ['outpatient', 'ed', 'inpatient'],
    visibility: 'quantified',
    enabledStateKey: 'wellbeingEnabled',
    expandedStateKey: 'wellbeingExpanded',
    calcComponent: ProviderWellbeingCalc,
    trackedMeasureIds: ['burnoutAssessment', 'likelihoodToStay', 'workOutsideWorkEmpirical'],
    measureDefaults: {
      deltaLabel: 'Providers retained per year',
      deltaUnit: 'providers',
      valuePerUnitLabel: 'Replacement cost per provider',
      valuePerUnitDefault: 400000,
      valuePerUnitPrefix: '$',
      realizationDefault: 100,
      scaleAxis: 'providers',
    },
  },
  {
    id: 'physicianLocumAgency',
    label: 'Locum & Agency Cost Avoidance',
    shortDescription: 'Reduced reliance on contracted physician coverage as retention improves.',
    quadrant: 'Workforce',
    settings: ['outpatient', 'ed', 'inpatient'],
    visibility: 'quantified',
    enabledStateKey: 'physicianAgencyEnabled',
    expandedStateKey: 'physicianAgencyExpanded',
    childOfDriverId: 'providerWellbeing',
    calcComponent: PhysicianLocumAgencyCalc,
    trackedMeasureIds: ['agencyLocumSpend'],
    measureDefaults: {
      deltaLabel: 'Provider-weeks of locum coverage avoided',
      deltaUnit: 'weeks',
      valuePerUnitLabel: 'Weekly locum premium',
      valuePerUnitDefault: 5000,
      valuePerUnitPrefix: '$',
      realizationDefault: 100,
      scaleAxis: 'providers',
    },
  },
  {
    id: 'nursingRetention',
    label: 'RN Retention',
    shortDescription: 'Reduced documentation burden helps retain experienced nurses. Models avoided replacement cost.',
    quadrant: 'Workforce',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingRetentionEnabled',
    expandedStateKey: 'nursingRetentionExpanded',
    calcComponent: NursingRetentionCalc,
    trackedMeasureIds: ['rnRetention', 'burnoutAssessment', 'likelihoodToStay'],
    measureDefaults: {
      deltaLabel: 'Nurses retained per year',
      deltaUnit: 'nurses',
      valuePerUnitLabel: 'Replacement cost per nurse',
      valuePerUnitDefault: 56300,
      valuePerUnitPrefix: '$',
      realizationDefault: 100,
      scaleAxis: 'providers',
    },
  },
  {
    id: 'nursingAgency',
    label: 'Travel & Agency Cost Avoidance',
    shortDescription: 'Reduced reliance on travel/agency nurses as retention stabilizes.',
    quadrant: 'Workforce',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingAgencyEnabled',
    expandedStateKey: 'nursingAgencyExpanded',
    childOfDriverId: 'nursingRetention',
    calcComponent: NursingAgencyCalc,
    trackedMeasureIds: ['travelAgencyNurseSpend'],
    measureDefaults: {
      deltaLabel: 'Nurse-weeks of agency coverage avoided',
      deltaUnit: 'weeks',
      valuePerUnitLabel: 'Weekly agency premium',
      valuePerUnitDefault: 2500,
      valuePerUnitPrefix: '$',
      realizationDefault: 100,
      scaleAxis: 'providers',
    },
  },
  {
    id: 'nursingOvertime',
    label: 'Overtime Reduction',
    shortDescription: 'Faster charting reduces documentation-related overtime hours.',
    quadrant: 'Workforce',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingOtEnabled',
    expandedStateKey: 'nursingOtExpanded',
    calcComponent: NursingOvertimeCalc,
    trackedMeasureIds: ['documentationOvertime', 'chartingAfterShift'],
    measureDefaults: {
      deltaLabel: 'Overtime hours eliminated per year',
      deltaUnit: 'hours',
      valuePerUnitLabel: 'Overtime hourly rate',
      valuePerUnitDefault: 75,
      valuePerUnitPrefix: '$',
      realizationDefault: 100,
      scaleAxis: 'providers',
    },
  },
  // ───── QUALITY ─────
  // Outpatient (qualitative)
  {
    id: 'opCdiQueryReduction',
    label: 'CDI Query Reduction',
    shortDescription: 'Cleaner notes reduce coder/CDI follow-up queries downstream.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opCdiQueryReductionEnabled',
    expandedStateKey: 'opCdiQueryReductionExpanded',
  },
  {
    id: 'opCognitiveLoad',
    label: 'Cognitive Load Reduction',
    shortDescription: 'Less time juggling note-taking and listening means more focused clinical thinking.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opCognitiveLoadEnabled',
    expandedStateKey: 'opCognitiveLoadExpanded',
  },
  {
    id: 'opAuditCompliance',
    label: 'Audit & Compliance Posture',
    shortDescription: 'Standardized, complete notes improve audit readiness and compliance.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opAuditComplianceEnabled',
    expandedStateKey: 'opAuditComplianceExpanded',
  },
  {
    id: 'opCareContinuity',
    label: 'Care Continuity',
    shortDescription: 'Better-documented handoffs improve continuity across encounters and providers.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opCareContinuityEnabled',
    expandedStateKey: 'opCareContinuityExpanded',
  },
  {
    id: 'opNoteStarRating',
    label: 'Note Quality (Star Rating)',
    shortDescription: 'Internal note-quality scores improve with structured AI drafting.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opNoteStarRatingEnabled',
    expandedStateKey: 'opNoteStarRatingExpanded',
  },
  {
    id: 'opDiagnosisCapture',
    label: 'Diagnosis Capture',
    shortDescription: 'More complete capture of conditions discussed during the visit.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opDiagnosisCaptureEnabled',
    expandedStateKey: 'opDiagnosisCaptureExpanded',
  },
  {
    id: 'opDiagnosisSpecificity',
    label: 'Diagnosis Specificity',
    shortDescription: 'Higher coding specificity improves quality reporting and risk adjustment accuracy.',
    quadrant: 'Quality',
    settings: ['outpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'opDiagnosisSpecificityEnabled',
    expandedStateKey: 'opDiagnosisSpecificityExpanded',
  },
  // ED (qualitative)
  {
    id: 'edNoteStarRating',
    label: 'ED Note Quality (Star Rating)',
    shortDescription: 'Internal note-quality scores improve in the ED with structured AI drafting.',
    quadrant: 'Quality',
    settings: ['ed'],
    visibility: 'qualitative',
    enabledStateKey: 'edNoteStarRatingEnabled',
    expandedStateKey: 'edNoteStarRatingExpanded',
  },
  {
    id: 'edPressGaney',
    label: 'Patient Experience (Press Ganey)',
    shortDescription: 'More attentive face-time during the encounter lifts patient experience scores.',
    quadrant: 'Quality',
    settings: ['ed'],
    visibility: 'qualitative',
    enabledStateKey: 'edPressGaneyEnabled',
    expandedStateKey: 'edPressGaneyExpanded',
  },
  // IP (qualitative)
  {
    id: 'ipNoteStarRating',
    label: 'IP Note Quality (Star Rating)',
    shortDescription: 'Internal note-quality scores improve in the inpatient setting.',
    quadrant: 'Quality',
    settings: ['inpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'ipNoteStarRatingEnabled',
    expandedStateKey: 'ipNoteStarRatingExpanded',
  },
  {
    id: 'ipHcahpsComposite',
    label: 'HCAHPS Composite',
    shortDescription: 'Doctor-communication composite improves with attentive bedside time.',
    quadrant: 'Quality',
    settings: ['inpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'ipHcahpsCompositeEnabled',
    expandedStateKey: 'ipHcahpsCompositeExpanded',
  },
  {
    id: 'ipReadmission',
    label: '30-Day Readmission',
    shortDescription: 'Better discharge documentation supports lower 30-day readmissions.',
    quadrant: 'Quality',
    settings: ['inpatient'],
    visibility: 'qualitative',
    enabledStateKey: 'ipReadmissionEnabled',
    expandedStateKey: 'ipReadmissionExpanded',
  },
  // Nursing (5 quantified + 2 qualitative)
  {
    id: 'nursingHapi',
    label: 'HAPI Prevention',
    shortDescription: 'Real-time skin and turning documentation prevents hospital-acquired pressure injuries.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingHapiEnabled',
    expandedStateKey: 'nursingHapiExpanded',
    calcComponent: NursingHapiCalc,
    measureDefaults: {
      deltaLabel: 'HAPIs prevented per year',
      deltaUnit: 'events',
      valuePerUnitLabel: 'Cost per HAPI',
      valuePerUnitDefault: 25000,
      valuePerUnitPrefix: '$',
      realizationDefault: 85,
      scaleAxis: 'patientDays',
    },
  },
  {
    id: 'nursingFalls',
    label: 'Falls Prevention',
    shortDescription: 'Real-time risk assessments and Morse score updates reduce inpatient falls.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingFallsEnabled',
    expandedStateKey: 'nursingFallsExpanded',
    calcComponent: NursingFallsCalc,
    measureDefaults: {
      deltaLabel: 'Falls prevented per year',
      deltaUnit: 'events',
      valuePerUnitLabel: 'Cost per fall',
      valuePerUnitDefault: 6500,
      valuePerUnitPrefix: '$',
      realizationDefault: 85,
      scaleAxis: 'patientDays',
    },
  },
  {
    id: 'nursingCauti',
    label: 'CAUTI Prevention',
    shortDescription: 'Daily catheter-necessity documentation supports earlier removal and bundle adherence.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingCautiEnabled',
    expandedStateKey: 'nursingCautiExpanded',
    calcComponent: NursingCautiCalc,
    measureDefaults: {
      deltaLabel: 'CAUTIs prevented per year',
      deltaUnit: 'events',
      valuePerUnitLabel: 'Cost per CAUTI',
      valuePerUnitDefault: 13000,
      valuePerUnitPrefix: '$',
      realizationDefault: 80,
      scaleAxis: 'patientDays',
    },
  },
  {
    id: 'nursingClabsi',
    label: 'CLABSI Prevention',
    shortDescription: 'Bundle compliance and timely line documentation reduce central line bloodstream infections.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingClabsiEnabled',
    expandedStateKey: 'nursingClabsiExpanded',
    calcComponent: NursingClabsiCalc,
    measureDefaults: {
      deltaLabel: 'CLABSIs prevented per year',
      deltaUnit: 'events',
      valuePerUnitLabel: 'Cost per CLABSI',
      valuePerUnitDefault: 20000,
      valuePerUnitPrefix: '$',
      realizationDefault: 80,
      scaleAxis: 'patientDays',
    },
  },
  {
    id: 'nursingSepsis',
    label: 'Sepsis Bundle Compliance',
    shortDescription: 'Time-stamped vitals and antibiotic documentation lift SEP-1 bundle compliance.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'quantified',
    enabledStateKey: 'nursingSepsisEnabled',
    expandedStateKey: 'nursingSepsisExpanded',
    calcComponent: NursingSepsisCalc,
    measureDefaults: {
      deltaLabel: 'Sepsis bundle non-compliance cases avoided',
      deltaUnit: 'cases',
      valuePerUnitLabel: 'Excess cost per case',
      valuePerUnitDefault: 3500,
      valuePerUnitPrefix: '$',
      realizationDefault: 60,
      scaleAxis: 'patientDays',
    },
  },
  {
    id: 'nursingHcahps',
    label: 'HCAHPS (Nurse Communication)',
    shortDescription: 'More bedside time supports nurse-communication composite gains.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'qualitative',
    enabledStateKey: 'nursingHcahpsEnabled',
    expandedStateKey: 'nursingHcahpsExpanded',
  },
  {
    id: 'nursingMedError',
    label: 'Medication Error Reduction',
    shortDescription: 'Cleaner real-time documentation reduces medication-related near misses and errors.',
    quadrant: 'Quality',
    settings: ['nursing'],
    visibility: 'qualitative',
    enabledStateKey: 'nursingMedErrorEnabled',
    expandedStateKey: 'nursingMedErrorExpanded',
  },
];

export function getDriversForPage(quadrant: ExploreQuadrant, setting: ExploreSetting): ExploreDriver[] {
  return EXPLORE_DRIVERS.filter(d => d.quadrant === quadrant && d.settings.includes(setting));
}

export function isDriverEnabled(driver: ExploreDriver, state: ExploreState): boolean {
  const td = state.timeDriverInputs as any;
  const dq = state.docQualityInputs as any;
  return Boolean(td[driver.enabledStateKey] ?? dq[driver.enabledStateKey]);
}
