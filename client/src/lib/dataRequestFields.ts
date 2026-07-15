export type FieldType = 'number' | 'percent' | 'currency' | 'text';

export interface DataRequestField {
  id: string;           // unique key, matches TimeDriverInputs field name where applicable
  label: string;        // clean display label
  description: string;  // one sentence: what this number is and why we need it
  who: string;          // who at the hospital has this data (e.g. "Revenue cycle director")
  example: string;      // example value as a string (e.g. "3%" or "$480" or "12")
  type: FieldType;
  required?: boolean;   // true = must-fill (scale/identity, can't be benchmarked);
                        // otherwise optional — the engine uses an industry benchmark if blank.
}

export interface DriverFieldGroup {
  driverId: string;
  driverLabel: string;
  quadrant: 'Capacity' | 'Workforce' | 'Revenue' | 'Quality';
  fields: DataRequestField[];
}

export type DataRequestSetting = 'outpatient' | 'ed' | 'inpatient' | 'nursing';

export const BASELINE_FIELDS: Record<DataRequestSetting, DataRequestField[]> = {
  outpatient: [
    { id: 'orgName', label: 'Organization name', description: 'Name of the practice or health system.', who: 'Anyone', example: 'Riverside Medical Group', type: 'text', required: true },
    { id: 'opProviders', label: 'Number of providers', description: 'Total physicians and APPs in the outpatient practice.', who: 'Operations or HR', example: '24', type: 'number', required: true },
    { id: 'opEncounters', label: 'Annual patient encounters', description: 'Total outpatient visits per year across all providers.', who: 'Operations or revenue cycle', example: '85,000', type: 'number', required: true },
    { id: 'opRevenuePerVisit', label: 'Net revenue per visit', description: 'Average net collected revenue per outpatient encounter after adjustments.', who: 'Finance or revenue cycle', example: '$150', type: 'currency', required: true },
  ],
  ed: [
    { id: 'orgName', label: 'Organization name', description: 'Name of the health system or ED facility.', who: 'Anyone', example: 'Metro Health ED', type: 'text', required: true },
    { id: 'edProviders', label: 'Number of ED providers', description: 'Total ED physicians and APPs who see patients.', who: 'ED medical director or operations', example: '18', type: 'number', required: true },
    { id: 'edVisits', label: 'Annual ED visits', description: 'Total ED patient visits per year.', who: 'ED operations or finance', example: '55,000', type: 'number', required: true },
    { id: 'edRevenuePerVisit', label: 'Net revenue per ED visit', description: 'Average net collected revenue per ED encounter.', who: 'Finance or revenue cycle', example: '$480', type: 'currency', required: true },
  ],
  inpatient: [
    { id: 'orgName', label: 'Organization name', description: 'Name of the health system or hospital.', who: 'Anyone', example: 'St. Catherine Medical Center', type: 'text', required: true },
    { id: 'ipProviders', label: 'Number of hospitalists / attending physicians', description: 'Total inpatient physicians using Abridge.', who: 'Operations or HR', example: '32', type: 'number', required: true },
    { id: 'ipStaffedBeds', label: 'Total staffed inpatient beds', description: 'Licensed beds actively staffed and available for patient care.', who: 'Operations or finance', example: '350', type: 'number', required: true },
    { id: 'ipOccupancyRate', label: 'Average occupancy rate', description: 'Average percentage of staffed beds occupied.', who: 'Operations or finance', example: '75%', type: 'percent' },
    { id: 'ipAlos', label: 'Average length of stay (days)', description: 'Average inpatient length of stay across all admissions.', who: 'Finance or case management', example: '4.5', type: 'number' },
    { id: 'ipNetRevenuePerAdmission', label: 'Net revenue per admission', description: 'Average net collected revenue per inpatient admission.', who: 'Finance', example: '$9,000', type: 'currency', required: true },
  ],
  nursing: [
    { id: 'orgName', label: 'Organization name', description: 'Name of the health system or facility.', who: 'Anyone', example: 'Lakewood Regional Hospital', type: 'text', required: true },
    { id: 'nursingFTEs', label: 'Registered nurse FTEs', description: 'Total RN FTEs in the unit or facility.', who: 'HR or nursing operations', example: '180', type: 'number', required: true },
    { id: 'nursingStaffedBeds', label: 'Staffed beds', description: 'Total staffed inpatient beds covered by these RNs.', who: 'Operations', example: '200', type: 'number', required: true },
    { id: 'nursingOccupancyRate', label: 'Average occupancy rate', description: 'Average percentage of staffed beds occupied.', who: 'Operations or finance', example: '78%', type: 'percent', required: true },
  ],
};

export const DRIVER_FIELDS: DriverFieldGroup[] = [

  // ─── OUTPATIENT ───────────────────────────────────────────────────────────
  {
    driverId: 'patientAccess',
    driverLabel: 'Patient Access',
    quadrant: 'Capacity',
    fields: [
      { id: 'revenuePerVisit', label: 'Net revenue per visit', description: 'Average net collected revenue per additional patient visit.', who: 'Finance or billing', example: '$150', type: 'currency' },
    ],
  },
  {
    driverId: 'wrvu',
    driverLabel: 'wRVU Capture',
    quadrant: 'Revenue',
    fields: [
      { id: 'opCurrentWrvu', label: 'Average wRVU per encounter', description: 'Current average work RVU per outpatient encounter across providers.', who: 'Billing or revenue cycle', example: '1.8', type: 'number' },
      { id: 'opConversionFactor', label: 'Conversion factor ($/wRVU)', description: 'Dollar reimbursement per wRVU under your payer mix.', who: 'Finance or billing', example: '$38.00', type: 'currency' },
    ],
  },
  {
    driverId: 'hccCapture',
    driverLabel: 'HCC Capture',
    quadrant: 'Revenue',
    fields: [
      { id: 'opMaEnrollmentRate', label: 'Medicare Advantage patient share (%)', description: 'Percentage of your patient panel enrolled in Medicare Advantage.', who: 'Finance or managed care', example: '35%', type: 'percent' },
      { id: 'opAnnualPaymentPerRaf', label: 'Annual payment increase per 0.1 RAF improvement ($)', description: 'Estimated annual revenue increase for each 0.1-point improvement in risk adjustment factor score.', who: 'Finance or managed care contracting', example: '$800', type: 'currency' },
    ],
  },
  {
    driverId: 'denialPrevention',
    driverLabel: 'Denial Prevention',
    quadrant: 'Revenue',
    fields: [
      { id: 'opDenialRate', label: 'Medical necessity denial rate (%)', description: 'Percentage of outpatient claims denied for medical necessity or documentation reasons.', who: 'Revenue cycle director', example: '4%', type: 'percent' },
      { id: 'opAvgClaimValue', label: 'Average denied claim value ($)', description: 'Average dollar value of a denied outpatient claim.', who: 'Revenue cycle or billing', example: '$450', type: 'currency' },
    ],
  },
  {
    driverId: 'providerWellbeing',
    driverLabel: 'Provider Wellbeing & Retention',
    quadrant: 'Workforce',
    fields: [
      { id: 'annualTurnoverRate', label: 'Annual physician voluntary turnover rate (%)', description: 'Percentage of outpatient physicians who voluntarily leave per year.', who: 'HR or CMO office', example: '8%', type: 'percent' },
      { id: 'replacementCost', label: 'All-in replacement cost per physician ($)', description: 'Total cost to recruit, onboard, and ramp a replacement physician — including search fees, lost productivity, and training.', who: 'Finance or HR', example: '$250,000', type: 'currency' },
    ],
  },
  {
    driverId: 'physicianLocumAgency',
    driverLabel: 'Locum & Agency Cost Avoidance',
    quadrant: 'Workforce',
    fields: [
      { id: 'physicianAgencyWeeksPerVacancy', label: 'Weeks of locum coverage per physician vacancy', description: 'Average weeks a physician vacancy is filled by locum or agency before permanent hire.', who: 'Finance or HR', example: '16', type: 'number' },
      { id: 'physicianAgencyWeeklyPremium', label: 'Weekly locum premium above base salary ($)', description: 'Additional cost per week of locum coverage above what a permanent physician would cost.', who: 'Finance', example: '$5,000', type: 'currency' },
    ],
  },
  {
    driverId: 'scribeCostReduction',
    driverLabel: 'Scribe Cost Reduction',
    quadrant: 'Workforce',
    fields: [
      { id: 'scribeHeadcount', label: 'Current scribe headcount', description: 'Total in-person or virtual scribe positions currently in use.', who: 'Operations or finance', example: '4', type: 'number' },
      { id: 'scribeCostPerPosition', label: 'Annual cost per scribe position ($)', description: 'All-in annual cost per scribe — salary + benefits for in-person, or full contract value for virtual services.', who: 'Finance', example: '$38,000', type: 'currency' },
      { id: 'scribePositionsEliminated', label: 'Scribe positions being eliminated with Abridge', description: 'Number of positions expected to be eliminated or not backfilled after Abridge deployment.', who: 'Operations or finance', example: '3', type: 'number' },
    ],
  },

  // ─── ED ───────────────────────────────────────────────────────────────────
  {
    driverId: 'lwbsRecovery',
    driverLabel: 'LWBS Recovery',
    quadrant: 'Capacity',
    fields: [
      { id: 'edLwbsRate', label: 'Current LWBS rate (%)', description: 'Percentage of ED patients who leave without being seen.', who: 'ED operations or quality', example: '3%', type: 'percent' },
      { id: 'edRevenuePerVisit', label: 'Net revenue per ED visit ($)', description: 'Average net collected revenue per ED patient encounter.', who: 'Finance or revenue cycle', example: '$480', type: 'currency' },
    ],
  },
  {
    driverId: 'admissionCapture',
    driverLabel: 'Admission Capture',
    quadrant: 'Capacity',
    fields: [
      { id: 'edAdmissionRate', label: 'ED-to-inpatient admission rate (%)', description: 'Percentage of ED visits that result in inpatient admission.', who: 'Finance or operations', example: '18%', type: 'percent' },
      { id: 'edAdmissionRevenue', label: 'Net revenue per inpatient admission ($)', description: 'Average net revenue per admission for ED-sourced inpatient stays.', who: 'Finance', example: '$8,500', type: 'currency' },
    ],
  },
  {
    driverId: 'edEmLevel',
    driverLabel: 'E/M Level Accuracy',
    quadrant: 'Revenue',
    fields: [
      { id: 'edDenialRate', label: 'Medical necessity denial rate (%)', description: 'Percentage of ED claims denied for medical necessity or documentation.', who: 'Revenue cycle director', example: '4%', type: 'percent' },
      { id: 'edAvgClaimValue', label: 'Average denied claim value ($)', description: 'Average dollar value of a denied ED claim.', who: 'Revenue cycle or billing', example: '$350', type: 'currency' },
    ],
  },

  // ─── INPATIENT ────────────────────────────────────────────────────────────
  {
    driverId: 'drgAccuracy',
    driverLabel: 'DRG Accuracy',
    quadrant: 'Revenue',
    fields: [
      { id: 'ipDrgAtRiskRate', label: 'DRGs at risk for CC/MCC under-documentation (%)', description: 'Estimated percentage of DRGs where missing CC or MCC documentation affects the DRG weight.', who: 'CDI team or revenue cycle', example: '25%', type: 'percent' },
      { id: 'ipDrgBasePayment', label: 'Average DRG base payment ($)', description: 'Average base Medicare DRG payment across your admission mix.', who: 'Finance or revenue cycle', example: '$12,000', type: 'currency' },
    ],
  },
  {
    driverId: 'obsDefense',
    driverLabel: 'Obs/IP Status Defense',
    quadrant: 'Revenue',
    fields: [
      { id: 'ipConcurrentReviewRate', label: 'Admissions undergoing concurrent payer review (%)', description: 'Percentage of inpatient admissions that are actively reviewed for status by payers.', who: 'Revenue cycle or utilization management', example: '20%', type: 'percent' },
      { id: 'ipConcurrentDenialRate', label: 'Concurrent review cases resulting in IP-to-obs downgrade (%)', description: 'Of the cases reviewed, the percentage that result in reclassification from inpatient to observation.', who: 'Revenue cycle', example: '15%', type: 'percent' },
      { id: 'ipConcurrentDailyRate', label: 'IP-to-obs revenue delta per downgraded case ($)', description: 'Average revenue difference between inpatient DRG payment and observation APC payment per downgraded case.', who: 'Finance or revenue cycle', example: '$5,000', type: 'currency' },
    ],
  },
  {
    driverId: 'ipDischargePlanning',
    driverLabel: 'Discharge Planning Initiation',
    quadrant: 'Capacity',
    fields: [
      { id: 'ipDischargeLagAffectedRate', label: 'Admissions affected by discharge documentation lag (%)', description: 'Estimated percentage of admissions where discharge is delayed due to incomplete or late documentation.', who: 'Case management or operations', example: '12%', type: 'percent' },
      { id: 'ipDbnCrossNoonRate', label: 'Discharge-before-noon conversion rate with faster documentation (%)', description: 'Estimated percentage of lag-affected admissions that convert to discharge-before-noon when documentation is completed earlier.', who: 'Case management or operations', example: '20%', type: 'percent' },
    ],
  },
  {
    driverId: 'ipProviderWellbeing',
    driverLabel: 'Provider Wellbeing & Retention (Inpatient)',
    quadrant: 'Workforce',
    fields: [
      { id: 'ipAnnualTurnoverRate', label: 'Annual hospitalist voluntary turnover rate (%)', description: 'Percentage of hospitalists who voluntarily leave per year.', who: 'HR or CMO office', example: '10%', type: 'percent' },
      { id: 'ipReplacementCost', label: 'Hospitalist replacement cost ($)', description: 'All-in cost to recruit, onboard, and ramp a replacement hospitalist.', who: 'Finance or HR', example: '$300,000', type: 'currency' },
    ],
  },

  // ─── NURSING ──────────────────────────────────────────────────────────────
  {
    driverId: 'nursingRetention',
    driverLabel: 'RN Retention',
    quadrant: 'Workforce',
    fields: [
      { id: 'nursingTurnoverRate', label: 'Annual RN voluntary turnover rate (%)', description: 'Percentage of registered nurses who voluntarily leave per year.', who: 'HR or CNO office', example: '20%', type: 'percent' },
      { id: 'nursingReplacementCost', label: 'All-in RN replacement cost ($)', description: 'Total cost to replace one RN — recruiting, agency backfill, orientation, and productivity ramp.', who: 'Finance or HR', example: '$50,000', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingAgency',
    driverLabel: 'Travel & Agency Cost Avoidance',
    quadrant: 'Workforce',
    fields: [
      { id: 'nursingAgencyWeeksPerVacancy', label: 'Weeks of agency/travel coverage per vacancy', description: 'Average weeks a vacant RN position is filled by travel or agency nurses before permanent hire.', who: 'Finance or HR', example: '12', type: 'number' },
      { id: 'nursingAgencyWeeklyPremium', label: 'Weekly agency premium above base RN salary ($)', description: 'Additional cost per week of travel/agency RN coverage versus a permanent staff RN.', who: 'Finance', example: '$2,500', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingOvertime',
    driverLabel: 'Overtime Reduction',
    quadrant: 'Capacity',
    fields: [
      { id: 'nursingOtHoursPerNurseWeek', label: 'Average overtime hours per RN per week', description: 'Average weekly overtime hours per registered nurse across the unit.', who: 'HR or nursing operations', example: '4', type: 'number' },
      { id: 'nursingOtHourlyRate', label: 'RN overtime hourly rate ($)', description: 'Blended overtime hourly rate including base pay and overtime premium.', who: 'Finance or HR', example: '$45', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingHapi',
    driverLabel: 'HAPI Prevention',
    quadrant: 'Quality',
    fields: [
      { id: 'nursingHapiRate', label: 'HAPI rate (per 1,000 patient days)', description: 'Current hospital-acquired pressure injury rate per 1,000 inpatient days.', who: 'Quality / infection control / nursing leadership', example: '1.5', type: 'number' },
      { id: 'nursingCostPerHapi', label: 'Average cost per HAPI event ($)', description: 'All-in cost per hospital-acquired pressure injury — treatment, extended LOS, and potential penalties.', who: 'Finance or quality', example: '$17,000', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingFalls',
    driverLabel: 'Falls Prevention',
    quadrant: 'Quality',
    fields: [
      { id: 'nursingFallsRate', label: 'Fall rate (per 1,000 patient days)', description: 'Current inpatient fall rate per 1,000 patient days.', who: 'Quality or patient safety', example: '3.5', type: 'number' },
      { id: 'nursingCostPerFall', label: 'Average cost per fall event ($)', description: 'All-in cost per inpatient fall — treatment, extended stay, and liability.', who: 'Finance or quality', example: '$6,500', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingCauti',
    driverLabel: 'CAUTI Prevention',
    quadrant: 'Quality',
    fields: [
      { id: 'nursingCautiRate', label: 'CAUTI rate (per 1,000 catheter days)', description: 'Current catheter-associated UTI rate per 1,000 catheter days.', who: 'Quality / infection control', example: '1.2', type: 'number' },
      { id: 'nursingCostPerCauti', label: 'Average cost per CAUTI event ($)', description: 'All-in cost per CAUTI — treatment, extended stay, and CMS non-payment implications.', who: 'Finance or quality', example: '$13,000', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingClabsi',
    driverLabel: 'CLABSI Prevention',
    quadrant: 'Quality',
    fields: [
      { id: 'nursingClabsiRate', label: 'CLABSI rate (per 1,000 central line days)', description: 'Current central line-associated bloodstream infection rate per 1,000 central line days.', who: 'Quality / infection control', example: '0.8', type: 'number' },
      { id: 'nursingCostPerClabsi', label: 'Average cost per CLABSI event ($)', description: 'All-in cost per CLABSI event — treatment, extended stay, and CMS non-payment.', who: 'Finance or quality', example: '$48,000', type: 'currency' },
    ],
  },
  {
    driverId: 'nursingSepsis',
    driverLabel: 'Sepsis Bundle Compliance',
    quadrant: 'Quality',
    fields: [
      { id: 'nursingSepsisRate', label: 'Sepsis cases per 1,000 patient days', description: 'Current sepsis case volume per 1,000 inpatient patient days.', who: 'Quality or clinical operations', example: '2.1', type: 'number' },
      { id: 'nursingCostPerSepsis', label: 'Average cost per preventable sepsis complication ($)', description: 'Estimated additional cost per sepsis case where bundle compliance was not fully documented.', who: 'Finance or quality', example: '$25,000', type: 'currency' },
    ],
  },
];

/**
 * Splits the requested fields into the must-fill tier (required scale/identity)
 * and the optional tier (everything else — benchmarked if left blank). Drives
 * both the two-tier spreadsheet and the builder's "N required · M optional" count.
 */
export interface RequestFieldPlan {
  required: DataRequestField[];
  optionalBaseline: DataRequestField[];
  driverGroups: DriverFieldGroup[];
  requiredCount: number;
  optionalCount: number;
}

export function getRequestFieldPlan(setting: DataRequestSetting, driverIds: string[]): RequestFieldPlan {
  const baseline = BASELINE_FIELDS[setting];
  const required = baseline.filter(f => f.required);
  const optionalBaseline = baseline.filter(f => !f.required);
  const driverGroups = getDriverFieldGroups(setting, driverIds);
  const driverFieldCount = driverGroups.reduce((s, g) => s + g.fields.length, 0);
  return {
    required,
    optionalBaseline,
    driverGroups,
    requiredCount: required.length,
    optionalCount: optionalBaseline.length + driverFieldCount,
  };
}

export function getDriverFieldGroups(setting: DataRequestSetting, driverIds: string[]): DriverFieldGroup[] {
  const settingDriverMap: Record<DataRequestSetting, string[]> = {
    outpatient: ['patientAccess', 'wrvu', 'hccCapture', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
    ed: ['lwbsRecovery', 'admissionCapture', 'edEmLevel', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
    inpatient: ['drgAccuracy', 'obsDefense', 'ipDischargePlanning', 'ipProviderWellbeing', 'physicianLocumAgency'],
    nursing: ['nursingRetention', 'nursingAgency', 'nursingOvertime', 'nursingHapi', 'nursingFalls', 'nursingCauti', 'nursingClabsi', 'nursingSepsis'],
  };
  const available = settingDriverMap[setting];
  const selected = driverIds.filter(id => available.includes(id));
  return selected
    .map(id => DRIVER_FIELDS.find(g => g.driverId === id))
    .filter((g): g is DriverFieldGroup => g !== undefined);
}

export interface MultiRequestFieldPlan {
  perSetting: { setting: DataRequestSetting; plan: RequestFieldPlan }[];
  requiredCount: number;
  optionalCount: number;
}

export function getMultiRequestFieldPlan(
  settings: DataRequestSetting[],
  selectedBySetting: Record<DataRequestSetting, string[]>,
): MultiRequestFieldPlan {
  const perSetting = settings.map(setting => ({
    setting,
    plan: getRequestFieldPlan(setting, selectedBySetting[setting] ?? []),
  }));
  return {
    perSetting,
    requiredCount: perSetting.reduce((n, p) => n + p.plan.requiredCount, 0),
    optionalCount: perSetting.reduce((n, p) => n + p.plan.optionalCount, 0),
  };
}
