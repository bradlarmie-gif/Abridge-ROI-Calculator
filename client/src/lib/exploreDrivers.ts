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

export type ExploreQuadrant = 'Capacity' | 'Workforce' | 'Revenue' | 'Quality';
export type ExploreSetting = 'outpatient' | 'ed' | 'inpatient' | 'nursing';
export type ExploreDriverVisibility = 'quantified' | 'qualitative';

export interface ExploreCalcComponentProps {
  state: ExploreState;
  updateTimeDriverInputs: (updates: Partial<ExploreState['timeDriverInputs']>) => void;
  updateDocQualityInputs: (updates: Partial<ExploreState['docQualityInputs']>) => void;
  totalHoursSaved: number;
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
  },
];

export function getDriversForPage(quadrant: ExploreQuadrant, setting: ExploreSetting): ExploreDriver[] {
  return EXPLORE_DRIVERS.filter(d => d.quadrant === quadrant && d.settings.includes(setting));
}
