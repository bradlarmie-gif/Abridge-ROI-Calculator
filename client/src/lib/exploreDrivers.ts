export type ExploreQuadrant = 'Capacity' | 'Workforce' | 'Revenue' | 'Quality';
export type ExploreSetting = 'outpatient' | 'ed' | 'inpatient' | 'nursing';
export type ExploreDriverVisibility = 'quantified' | 'qualitative';

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
  // Workforce / Revenue / Quality drivers added in Sprint 2D
];

export function getDriversForPage(quadrant: ExploreQuadrant, setting: ExploreSetting): ExploreDriver[] {
  return EXPLORE_DRIVERS.filter(d => d.quadrant === quadrant && d.settings.includes(setting));
}
