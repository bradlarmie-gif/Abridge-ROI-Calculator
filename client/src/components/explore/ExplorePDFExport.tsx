import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Svg,
  Rect,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

const colors = {
  background: "#FFFFFF",
  cards: "#F5F0EB",
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  sectionLabel: {
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionHeadline: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 6,
  },
  body: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  caption: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 10,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
  },
  calloutBox: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 12,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "bold",
  },
  footerCenter: {
    fontSize: 8.5,
    color: colors.secondary,
  },
  footerRight: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
});

export type ExploreCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

export interface ExploreDriver {
  id: string;
  name: string;
  value: number;
  category: "time" | "documentation";
  calcSteps?: string[];
  calibrationNote?: string;
  inputs?: Record<string, number | string>;
}

export interface ExplorePDFData {
  careSetting: ExploreCareSetting;
  clientName: string;
  preparedBy: string;

  providers: number;
  encounters: number;
  utilizationPercent: number;
  hoursReturned: number;

  nursingStaffedBeds?: number;
  nursingFTEs?: number;

  totalValue: number;
  timeValue: number;
  docValue: number;
  annualInvestment: number;
  netAnnualValue: number;
  roi: number;

  drivers: ExploreDriver[];
  qualitativeDrivers: string[];

  fullScaleProviders: number;
  fullScaleUtilization: number;
  implementationCost: number;

  minutesSavedPerEncounter: number;

  eligibleEncounters?: number;
  encountersPerProvider?: number;
  timeSavingsScenario?: string;
  dailyImpactMinutes?: number;

  capacityAllocationPct?: number;
  docQualityAllocationPct?: number;
  sustainabilityAllocationPct?: number;
  capacityHours?: number;
  docQualityHours?: number;
  sustainabilityHours?: number;

  patientAccessEnabled?: boolean;
  additionalVisitsPerWeek?: number;
  accessProviders?: number;
  accessConversionPct?: number;
  avgVisitDurationMin?: number;
  revenuePerVisit?: number;
  projectedAdditionalVisits?: number;
  patientAccessValue?: number;

  sustainabilityEnabled?: boolean;
  retentionValueEnabled?: boolean;
  hoursPerProviderPerWeekBack?: number;
  annualTurnoverRate?: number;
  burnoutRelatedTurnoverPct?: number;
  replacementCostPerProvider?: number;
  abridgeRetentionImpactPct?: number;
  abridgeRetentionImpactLabel?: string;
  providersLeavingPerYear?: number;
  burnoutDepartures?: number;
  providersRetained?: number;
  retentionValue?: number;

  wrvuEnabled?: boolean;
  wrvuScenario?: string;
  wrvuImprovementPct?: number;
  currentAvgWrvuPerVisit?: number;
  wrvuLiftPerVisit?: number;
  totalAdditionalWrvus?: number;
  wrvuConversionFactor?: number;
  wrvuRealizationRate?: number;
  annualWrvuValue?: number;

  hccEnabled?: boolean;
  hccRecaptureScenario?: string;
  panelSizePerProvider?: number;
  totalPatients?: number;
  medicareAdvantagePct?: number;
  maPatientPanel?: number;
  documentationGapRate?: number;
  patientsWithGaps?: number;
  avgMissedHccsPerPatient?: number;
  totalRecaptureOpportunity?: number;
  hccRecaptureTargetPct?: number;
  hccsDocumented?: number;
  rafImpactPerHcc?: number;
  annualPaymentPerRaf?: number;
  hccGrossValue?: number;
  hccRealizationRate?: number;
  annualHccValue?: number;

  denialEnabled?: boolean;
  denialPreventionScenario?: string;
  baselineDenialRate?: number;
  totalDenials?: number;
  unappealableDenialRate?: number;
  unrecoverableDenials?: number;
  preventionTargetPct?: number;
  denialsPrevented?: number;
  avgDeniedClaimValue?: number;
  denialGrossValue?: number;
  denialRealizationRate?: number;
  annualDenialValue?: number;

  pricingModel?: string;
  costPerProviderPerMonth?: number;
  efficiencyValue?: number;
  documentationQualityValue?: number;

  lwbsEnabled?: boolean;
  currentLwbsRatePct?: number;
  expectedLwbsReductionPct?: number;
  revenuePerEdVisit?: number;
  annualLwbsPatients?: number;
  patientsRecovered?: number;
  lwbsGrossValue?: number;
  lwbsRealizationRate?: number;
  netLwbsValue?: number;

  admissionCaptureEnabled?: boolean;
  admissionRate?: number;
  avgAdmissionRevenue?: number;
  recoveredEdPatients?: number;
  potentialAdmissions?: number;
  admissionGrossValue?: number;
  admissionRealizationRate?: number;
  annualAdmissionCaptureValue?: number;

  throughputAllocationPct?: number;
  throughputHours?: number;
  wellbeingAllocationPct?: number;
  wellbeingHours?: number;
  throughputValue?: number;
  edCapacityValue?: number;
  edWorkforceValue?: number;

  emAccuracyEnabled?: boolean;
  emScenario?: string;
  emImprovementPct?: number;
  emWrvuLiftPerVisit?: number;
  emConversionFactor?: number;
  emRealizationRate?: number;
  annualEmValue?: number;

  ipDirectPatientCarePct?: number;
  ipDocQualityPct?: number;
  ipShiftSustainabilityPct?: number;
  ipRoundingHoursTotal?: number;
  ipRoundingHoursPerProvider?: number;
  ipHoursPerProviderPerYear?: number;
  ipHoursPerWeek?: number;
  ipMinutesPerDayPerProvider?: number;
  ipProvidersLeavingPerYear?: number;
  ipBurnoutDepartures?: number;
  ipProvidersRetained?: number;
  ipDrgOpportunityRate?: number;
  ipAdmissionsWithGaps?: number;
  ipAbridgeCaptureRate?: number;
  ipAdmissionsCaptured?: number;
  ipAvgDRGWeightLift?: number;
  ipBaseDRGPayment?: number;
  ipDrgRealizationRate?: number;
  ipDrgValue?: number;
  ipEmCodingEnabled?: boolean;
  ipEmCodingValue?: number;
  ipEmCodingGapScenario?: string;
  ipEmCodingAvgRevenueLift?: number;
  ipEmCodingRealization?: number;
  ipEmCodingTotalCharges?: number;
  ipEmCodingChargesCaptured?: number;
  ipEmCodingHAndPs?: number;
  ipEmCodingProgressNotes?: number;
  ipEmCodingConsults?: number;
  ipAvgLengthOfStay?: number;
  ipDrgEnabled?: boolean;
  ipCdiQueryRate?: number;
  ipTotalCDIQueries?: number;
  ipQueriesAvoidedRate?: number;
  ipQueriesAvoided?: number;
  ipCostPerQuery?: number;
  ipCdiValue?: number;
  ipCdiRealization?: number;
  ipCdiEnabled?: boolean;
  ipCdiScenario?: string;
  ipDrgScenario?: string;
  ipObsDefenseEnabled?: boolean;
  ipObsDefenseValue?: number;
  ipObsDefenseRealization?: number;
  ipCostReductionValue?: number;
  ipCostReductionEnabled?: boolean;
  ipWellbeingHoursPerWeek?: number;
  ipRoundingEnabled?: boolean;
  ipFullScaleValue?: number;
  ipFullScaleROI?: number;
  ipFullScalePerProvider?: number;

  nursingOccupancyRate?: number;
  nursingPatientDays?: number;
  nursingAdoptionRate?: number;
  nursingEnabledShifts?: number;
  nursingMinutesPerShift?: number;
  nursingOtAllocationPct?: number;
  nursingOtHoursPerNurseWeek?: number;
  nursingCurrentOtPerYear?: number;
  nursingOtHoursEliminated?: number;
  nursingHoursPerNurse?: number;
  nursingHoursPerWeek?: number;
  nursingOtHourlyRate?: number;
  nursingOtValue?: number;
  nursingTurnoverRate?: number;
  nursingBurnoutPct?: number;
  nursingReplacementCost?: number;
  nursingRetentionImpactPct?: number;
  nursingNursesLeaving?: number;
  nursingBurnoutDepartures?: number;
  nursingNursesRetained?: number;
  nursingRetentionValue?: number;
  nursingAgencyEnabled?: boolean;
  nursingAgencyWeeks?: number;
  nursingAgencyPremium?: number;
  nursingAgencyValue?: number;
  nursingStaffingTotal?: number;
  nursingHapiEnabled?: boolean;
  nursingHapiRatePer1000?: number;
  nursingHapiPerYear?: number;
  nursingHapiPreventionRate?: number;
  nursingHapiCostPer?: number;
  nursingHapiAddressed?: number;
  nursingHapiValue?: number;
  nursingFallsEnabled?: boolean;
  nursingFallsRatePer1000?: number;
  nursingFallsPerYear?: number;
  nursingFallsDocGapRate?: number;
  nursingFallsCostPer?: number;
  nursingFallsAddressed?: number;
  nursingFallsValue?: number;
  nursingHacEnabled?: boolean;
  nursingHacBottomQuartile?: boolean;
  nursingHacMedicareRevenue?: number;
  nursingHacPenalty?: number;
  nursingHacAttribution?: number;
  nursingHacRealization?: number;
  nursingHacValue?: number;
  /* HAC fields above kept for backward compat; nursingHacValue is no longer modeled */
  nursingHcahpsEnabled?: boolean;
  nursingCautiEnabled?: boolean;
  nursingCautiUtilizationRatio?: number;
  nursingCautiDaysPerYear?: number;
  nursingCautiRatePer1000?: number;
  nursingCautiPerYear?: number;
  nursingCautiPreventionRate?: number;
  nursingCautiCostPer?: number;
  nursingCautiPrevented?: number;
  nursingCautiValue?: number;
  nursingClabsiEnabled?: boolean;
  nursingClabsiUtilizationRatio?: number;
  nursingClabsiDaysPerYear?: number;
  nursingClabsiRatePer1000?: number;
  nursingClabsiPerYear?: number;
  nursingClabsiPreventionRate?: number;
  nursingClabsiCostPer?: number;
  nursingClabsiPrevented?: number;
  nursingClabsiValue?: number;
  nursingSepsisEnabled?: boolean;
  nursingSepsisRatePerThousand?: number;
  nursingSepsisPerYear?: number;
  nursingSepsisCurrentCompliance?: number;
  nursingSepsisNonCompliant?: number;
  nursingSepsisDocLagPercent?: number;
  nursingSepsisDocLagCases?: number;
  nursingSepsisExcessCostPerCase?: number;
  nursingSepsisRealization?: number;
  nursingSepsisValue?: number;

  nursingPotentialTotal?: number;
  nursingFullScaleBeds?: number;
  nursingFullScaleAdoption?: number;
  nursingFullScaleValue?: number;
  nursingFullScalePerBed?: number;
  nursingAdditionalCostSavings?: Array<{ id: string; label: string; amount: number }>;
}

const fmtCurrency = (n: number): string => {
  const v = safe(n);
  if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000).toLocaleString()}K`;
  return `$${Math.round(v).toLocaleString()}`;
};

const fmtNum = (n: number): string => {
  return Math.round(safe(n)).toLocaleString();
};

const safe = (v: number | undefined | null) => (!v || isNaN(v) ? 0 : v);

const ProgressBar = ({ percent, width = 400 }: { percent: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(percent)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={colors.border} rx={5} />
      <Rect x={0} y={0} width={filled} height={10} fill={colors.primary} rx={5} />
    </Svg>
  );
};

const PageFooter = ({ pageNum, orgName, settingLabel, totalPages = 5 }: { pageNum: number; orgName: string; settingLabel: string; totalPages?: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>{orgName} {"\u00B7"} {settingLabel} Value Assessment</Text>
    <Text style={styles.footerRight}>Page {pageNum} of {totalPages}</Text>
  </View>
);

interface SettingConfig {
  label: string;
  coverLabel: string;
  providerType: string;
  providerTypePlural: string;
  coverSubtitle: (d: ExplorePDFData) => string;
  thesisQuestion: string;
  thesisParagraph: string;
  source1Label: string;
  source1Description: string;
  source1Tagline: string;
  source2Label: string;
  source2Description: string;
  source2Tagline: string;
  strategicObservation: (d: ExplorePDFData) => string;
  page2Intro: (d: ExplorePDFData) => string;
  closingInsight: string;
  keyMetrics: string[];
}

const SETTING_CONFIGS: Record<ExploreCareSetting, SettingConfig> = {
  outpatient: {
    label: "Outpatient",
    coverLabel: "OUTPATIENT VALUE ASSESSMENT",
    providerType: "provider",
    providerTypePlural: "providers",
    coverSubtitle: (d) => `${fmtNum(d.providers)} providers \u00B7 ${fmtNum(d.encounters)} encounters \u00B7 Outpatient`,
    thesisQuestion: "If we give providers time back, what happens to your practice?",
    thesisParagraph: "Ambient documentation creates value in two distinct ways: by returning time to providers (which translates to capacity and provider wellbeing) and by improving documentation quality (which captures revenue that already exists but isn't being coded).",
    source1Label: "TIME RECAPTURED",
    source1Description: "Hours returned to patient care, capacity expansion, and operational efficiency.",
    source1Tagline: "The constraint is time.",
    source2Label: "REVENUE OPTIMIZED",
    source2Description: "wRVU capture, HCC recapture, and denial prevention through documentation quality.",
    source2Tagline: "The notes drive the revenue.",
    strategicObservation: (d) => {
      if (d.totalValue === 0 && d.qualitativeDrivers.length > 0) {
        return `Your assessment focused on qualitative drivers (${d.qualitativeDrivers.join(", ")}). These represent strategic value\u2014clinician experience, retention signal, and practice sustainability\u2014that is meaningful but not easily dollarized. To build a financial case, consider enabling quantitative levers like Patient Access or wRVU Improvement.`;
      }
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 60
        ? `Your value model is ${timePct}% time-driven. This indicates significant documentation burden\u2014providers are spending substantial time that could be redirected to patient care and capacity.`
        : `Your value model balances time recapture (${timePct}%) with documentation quality (${100 - timePct}%). This balanced profile typically indicates both operational and revenue optimization opportunities.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your providers. Here\u2019s how each driver works.`,
    closingInsight: "Give providers their time back\u2014and the documentation gets better, not worse. That\u2019s the counterintuitive truth about ambient documentation. Better notes come from less time documenting.",
    keyMetrics: [
      "1. Documentation time per encounter (target: -50%)",
      "2. Provider satisfaction score (target: +15 pts)",
      "3. wRVU per encounter trend (target: +2-5%)",
    ],
  },
  ed: {
    label: "Emergency Department",
    coverLabel: "EMERGENCY DEPARTMENT VALUE ASSESSMENT",
    providerType: "ED physician",
    providerTypePlural: "ED physicians",
    coverSubtitle: (d) => `${fmtNum(d.providers)} ED physicians \u00B7 ${fmtNum(d.encounters)} encounters \u00B7 Emergency`,
    thesisQuestion: "In the ED, minutes matter. What happens when you give them back?",
    thesisParagraph: "Emergency documentation creates value through two mechanisms: throughput gains (LWBS reduction, faster disposition, admission capture) and revenue accuracy (E&M level precision, denial prevention). Faster documentation means faster disposition — reducing walkouts and creating capacity for additional admissions.",
    source1Label: "THROUGHPUT UNLOCKED",
    source1Description: "LWBS reduction, faster door-to-doc times, and additional patient capacity.",
    source1Tagline: "Speed saves lives\u2014and revenue.",
    source2Label: "REVENUE CAPTURED",
    source2Description: "E&M accuracy, admission capture, and denial prevention from complete documentation.",
    source2Tagline: "Capture encounters more completely.",
    strategicObservation: (d) => {
      if (d.totalValue === 0 && d.qualitativeDrivers.length > 0) {
        return `Your assessment focused on qualitative drivers (${d.qualitativeDrivers.join(", ")}). These represent strategic value for your ED\u2014clinician satisfaction and sustainability\u2014that is meaningful but not easily dollarized. To build a financial case, consider enabling throughput or documentation accuracy levers.`;
      }
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 60
        ? `Your model is ${timePct}% throughput-driven. This suggests LWBS and capacity are your primary value levers\u2014common in high-volume EDs where each recovered patient generates significant downstream value.`
        : `Your model balances throughput (${timePct}%) with revenue accuracy (${100 - timePct}%). Mature ED implementations typically optimize both simultaneously.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your ED physicians. Here\u2019s how each driver works.`,
    closingInsight: "In emergency medicine, time spent documenting is time not spent with the next patient. Ambient documentation doesn\u2019t just save time\u2014it removes the trade-off between thorough documentation and throughput.",
    keyMetrics: [
      "1. Documentation time per encounter (target: -50%)",
      "2. LWBS rate reduction (target: -10-30%)",
      "3. E&M accuracy / level distribution shift",
    ],
  },
  inpatient: {
    label: "Inpatient",
    coverLabel: "INPATIENT VALUE ASSESSMENT",
    providerType: "hospitalist",
    providerTypePlural: "hospitalists",
    coverSubtitle: (d) => `${fmtNum(d.providers)} hospitalists \u00B7 ${fmtNum(d.encounters)} encounters \u00B7 Inpatient`,
    thesisQuestion: "If we give hospitalists time back, what happens to your hospital?",
    thesisParagraph: "Inpatient documentation creates value through capacity and retention (reduced rounding documentation burden, hospitalist retention) and revenue optimization (DRG accuracy, CDI efficiency, denial prevention). The notes drive the entire downstream revenue cycle.",
    source1Label: "CAPACITY UNLOCKED",
    source1Description: "Rounding time recovered, reduced burnout, and hospitalist retention.",
    source1Tagline: "The constraint is time. Remove it.",
    source2Label: "REVENUE OPTIMIZED",
    source2Description: "DRG accuracy, CDI query reduction, and denial prevention.",
    source2Tagline: "The notes drive the revenue.",
    strategicObservation: (d) => {
      if (d.totalValue === 0 && d.qualitativeDrivers.length > 0) {
        return `Your assessment focused on qualitative drivers (${d.qualitativeDrivers.join(", ")}). These represent strategic value\u2014rounding efficiency, hospitalist experience, and retention signal\u2014that is meaningful but not easily dollarized. To build a financial case, consider enabling Provider Wellbeing with retention modeling, DRG Accuracy, or Denial Prevention.`;
      }
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 50
        ? `Your model is ${timePct}% capacity-driven, indicating retention and operational gains dominate. This is common when turnover costs are high and replacement cycles are long.`
        : `Your model is ${100 - timePct}% revenue-driven. DRG accuracy and denial prevention represent the largest value pools\u2014typical for organizations with complex case mix and documentation gaps.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your hospitalists. Here\u2019s how each driver works.`,
    closingInsight: "Hospitalist documentation drives everything downstream\u2014coding accuracy, denial prevention, care transitions. When the notes are complete in real-time, the entire revenue cycle benefits.",
    keyMetrics: [
      "1. Documentation time per encounter (target: -50%)",
      "2. Hospitalist satisfaction score (target: +15 pts)",
      "3. CDI query rate per admission (target: -25%)",
    ],
  },
  nursing: {
    label: "Inpatient Nursing",
    coverLabel: "NURSING VALUE ASSESSMENT",
    providerType: "bed",
    providerTypePlural: "beds",
    coverSubtitle: (d) => `${fmtNum(d.nursingStaffedBeds || 0)} beds \u00B7 ${fmtNum(d.nursingFTEs || d.providers)} nurse FTEs \u00B7 Inpatient Nursing`,
    thesisQuestion: "Nurses don\u2019t bill. So where does the value live?",
    thesisParagraph: "Nursing documentation creates value through two mechanisms: labor economics (overtime reduction, retention, agency cost avoidance) and care quality (HAPI risk reduction, fall risk visibility, patient experience). The budget impact is real\u2014and so is the care improvement.",
    source1Label: "LABOR ECONOMICS",
    source1Description: "Overtime reduction, nurse retention savings, and agency cost avoidance.",
    source1Tagline: "The budget impact is real.",
    source2Label: "CARE QUALITY ENABLEMENT",
    source2Description: "Falls, pressure injuries, patient satisfaction. These outcomes are influenced by bedside time. More time caring, less time charting, better outcomes. But the causal chain is indirect \u2014 documentation supports care, it doesn\u2019t replace it.",
    source2Tagline: "Better care starts with better information.",
    strategicObservation: (d) => {
      if (d.totalValue === 0 && d.qualitativeDrivers.length > 0) {
        return `Your assessment focused on qualitative drivers (${d.qualitativeDrivers.join(", ")}). These represent strategic value for your nursing program\u2014patient experience, bedside presence, and care quality\u2014that is meaningful but not easily dollarized. To build a financial case, consider enabling OT Reduction or Retention Savings.`;
      }
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 70
        ? `Your model is ${timePct}% labor economics\u2014overtime, retention, and agency costs dominate. This is typical for organizations with high turnover or significant agency dependence.`
        : `Your model balances labor economics (${timePct}%) with care quality (${100 - timePct}%). This profile suggests both staffing and patient outcomes can improve simultaneously.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your nursing staff. Here\u2019s how each driver works.`,
    closingInsight: "Nurses don\u2019t bill. But their flowsheet documentation drives care quality\u2014reducing the risk events most sensitive to documentation gaps\u2014and their time drives labor economics. Ambient documentation creates value in the two places it matters most for nursing: the budget and the bedside.",
    keyMetrics: [
      "1. Documentation time per shift (target: -40%)",
      "2. Nurse satisfaction / burnout score (target: +15 pts)",
      "3. Overtime hours per FTE per week (target: -25%)",
    ],
  },
};

const getOutpatientObservation = (data: ExplorePDFData): string => {
  const capPct = safe(data.capacityAllocationPct);
  const susPct = safe(data.sustainabilityAllocationPct);
  const docPct = safe(data.docQualityAllocationPct);
  const hasRetention = !!data.retentionValueEnabled;
  const hasDocDrivers = !!(data.wrvuEnabled || data.hccEnabled || data.denialEnabled);

  let obs = "";
  const visitsPerWk = safe(data.additionalVisitsPerWeek);

  if (data.patientAccessEnabled && hasRetention) {
    obs = `Your organization modeled ${visitsPerWk} additional visits per provider per week, using ~${capPct}% of recovered time for scheduling capacity. The remaining time flows into documentation quality and provider wellbeing${hasRetention ? ", including a quantified retention model" : ""}. That\u2019s a deliberate balance between near-term revenue and long-term workforce protection.`;
  } else if (data.patientAccessEnabled && capPct >= 40) {
    obs = `Your model is capacity-driven \u2014 ${visitsPerWk} additional visits per provider per week uses ~${capPct}% of recovered documentation time. That\u2019s the most direct line from documentation efficiency to revenue. The remaining ${100 - capPct}% adds a buffer against burnout without making it the headline.`;
  } else if (susPct >= 30 || hasRetention) {
    obs = `You put real weight on provider wellbeing${hasRetention ? ", including a quantified retention model" : ""}. That\u2019s a leadership signal: this isn\u2019t just a revenue initiative. Protecting providers from documentation burden protects the organization from turnover costs that dwarf the investment.`;
  } else if (docPct >= 40 && hasDocDrivers) {
    obs = `Documentation quality is at the center of your model. Better notes require attention in the moment. Abridge creates the space for that. The revenue capture drivers on the right are built on this foundation.`;
  } else if (data.patientAccessEnabled) {
    obs = `Your organization modeled ${visitsPerWk} additional visits per provider per week. That uses ~${capPct}% of recovered documentation time, with the rest flowing into documentation quality and provider sustainability.`;
  } else {
    obs = `Your model focuses on documentation quality and provider sustainability rather than scheduling additional visits. That\u2019s the right approach when the priority is workforce protection and care quality.`;
  }

  if (!hasDocDrivers) {
    obs += ` The documentation quality drivers were not activated in this model. That\u2019s not a gap \u2014 it\u2019s the right starting point. Quantify the efficiency gains first. Then layer in revenue capture with real data.`;
  }

  return obs;
};

const getOutpatientClosingQuote = (data: ExplorePDFData): string => {
  const susPct = safe(data.sustainabilityAllocationPct);
  const capPct = safe(data.capacityAllocationPct);
  if (susPct >= 30 || data.retentionValueEnabled) {
    return "Give providers their time back \u2014 and the documentation gets better, not worse. That\u2019s the counterintuitive truth about ambient documentation. Less time at the keyboard means more attention in the room. Better notes follow naturally \u2014 and so does everything that depends on them.";
  }
  if (capPct >= 50 && susPct < 20) {
    return "The scheduling problem and the documentation problem are the same problem. When providers spend less time writing notes, they have more time to see patients. Abridge doesn\u2019t create capacity \u2014 it uncovers capacity that was already there, buried in after-hours charting.";
  }
  if (data.wrvuEnabled && safe(data.annualWrvuValue) > 0) {
    return "The complexity was always there. The provider delivered it. The patient experienced it. The only thing missing was a note that captured it fully. That\u2019s what changes.";
  }
  if (data.hccEnabled && data.denialEnabled) {
    return "Revenue cycle isn\u2019t downstream from clinical documentation \u2014 it is clinical documentation. What gets captured in the room determines what gets paid. Abridge closes that gap in real time, before the encounter ends.";
  }
  return "Give providers their time back \u2014 and the documentation gets better, not worse. That\u2019s the counterintuitive truth about ambient documentation. Better notes come from less time documenting.";
};

const getEdObservation = (data: ExplorePDFData): string => {
  const thrPct = safe(data.throughputAllocationPct);
  const wellPct = safe(data.wellbeingAllocationPct);
  const hasRetention = !!data.retentionValueEnabled;
  const hasEm = !!data.emAccuracyEnabled;
  const hasDenial = !!data.denialEnabled;

  let obs = "";

  if (thrPct >= 40 && !hasRetention) {
    obs = `Your model leads with throughput \u2014 ${thrPct}% of reclaimed time flowing into faster disposition and LWBS recovery. That\u2019s the right starting point for an ED: every minute of faster documentation is a minute of faster patient movement. The wellbeing allocation (${wellPct}%) adds a quiet but important buffer \u2014 emergency physician burnout has a replacement cost that dwarfs this investment.`;
  } else if (hasRetention) {
    obs = `You quantified the retention case \u2014 ${fmtNum(data.providers)} physicians, ${safe(data.annualTurnoverRate)}% annual turnover, ${fmtCurrency(safe(data.replacementCostPerProvider))} to replace each one. That puts the sustainability allocation in financial terms most organizations avoid calculating. The result is a model that accounts for both what Abridge generates and what it protects.`;
  } else if (hasEm && hasDenial) {
    obs = `You activated both documentation quality drivers \u2014 E&M accuracy and denial prevention. In the ED, these are not separate problems. Notes that understate acuity are the same notes that get denied. Fixing the documentation fixes both simultaneously.`;
  } else if (hasEm && !hasDenial) {
    obs = `You activated E&M accuracy but not denial prevention. That captures the coding upside. The denial prevention driver addresses a separate loss \u2014 claims denied because medical necessity wasn\u2019t explicit in the note. Both are worth modeling before your 90-day review.`;
  } else {
    obs = `No documentation quality drivers were activated. That\u2019s a conservative and defensible starting point. The throughput model stands on its own. When you\u2019re ready to add the revenue capture layer, E&M accuracy and denial prevention are the two highest-impact drivers for ED settings.`;
  }

  return obs;
};

const getEdClosingQuote = (data: ExplorePDFData): string => {
  const thrPct = safe(data.throughputAllocationPct);
  if (thrPct >= 50) {
    return "In an emergency department, the documentation bottleneck and the patient flow bottleneck are the same bottleneck. When physicians spend less time charting, patients move faster, wait times fall, and fewer people leave without care. The math follows from there.";
  }
  if (data.retentionValueEnabled) {
    return `Replacing an emergency physician costs ${fmtCurrency(safe(data.replacementCostPerProvider))}. Burning one out costs that \u2014 plus the patients they would have seen, the residents they would have trained, and the institutional knowledge that walks out the door with them. Abridge doesn\u2019t solve burnout. But it removes the thing most emergency physicians cite when they say they\u2019re thinking about leaving.`;
  }
  if (data.emAccuracyEnabled && data.denialEnabled) {
    return "The note written at the end of a twelve-hour shift \u2014 fast, abbreviated, adequate but not complete \u2014 is the note that gets denied, downcoded, and queried. Abridge captures what happened in the room while it\u2019s still happening. That\u2019s the difference between documentation that pays and documentation that creates more work.";
  }
  if (data.emAccuracyEnabled && !data.denialEnabled) {
    return "The acuity was always there. The physician delivered it. The patient experienced it. The only thing the note didn\u2019t fully capture was the complexity that determines how the visit codes. That\u2019s what changes.";
  }
  return "In the ED, every minute of documentation time is a minute the next patient waits. Abridge gives that time back \u2014 to the patient, to the physician, and to the department.";
};

const getInpatientObservation = (data: ExplorePDFData): string => {
  const retVal = safe(data.retentionValue);
  const costRedVal = safe(data.ipCostReductionValue);
  const clinOpsTotal = retVal + costRedVal;
  const drgVal = safe(data.ipDrgValue);
  const cdiVal = safe(data.ipCdiValue);

  if (clinOpsTotal === 0 && drgVal === 0 && cdiVal === 0) {
    const activeQual = data.qualitativeDrivers || [];
    const driverList = activeQual.length > 0 ? activeQual.join(", ") : "Rounding Efficiency, Provider Wellbeing";
    return `Your model is built on qualitative drivers (${driverList}). These represent strategic value \u2014 rounding efficiency, hospitalist experience, and retention signal \u2014 that is meaningful but not easily dollarized. To build a financial case, consider enabling Provider Wellbeing with retention modeling or activating documentation quality drivers.`;
  }

  const capPct = safe(data.ipDirectPatientCarePct) + safe(data.ipShiftSustainabilityPct);
  const revPct = safe(data.ipDocQualityPct);

  if (capPct > 50) {
    return `Your model is ${capPct}% capacity-driven, indicating retention and operational gains dominate. This is common when turnover costs are high and replacement cycles are long.`;
  }

  return `Your model is ${revPct}% revenue-driven. DRG accuracy and denial prevention represent the largest value pools \u2014 typical for organizations with complex case mix and documentation gaps.`;
};

const getNursingObservation = (data: ExplorePDFData): string => {
  const staffingTotal = safe(data.nursingStaffingTotal);
  const potentialTotal = safe(data.nursingPotentialTotal);
  const otVal = safe(data.nursingOtValue);
  const retVal = safe(data.nursingRetentionValue);
  const agencyOn = !!data.nursingAgencyEnabled;

  if (staffingTotal === 0 && potentialTotal === 0) {
    const activeQual = data.qualitativeDrivers || [];
    const driverList = activeQual.length > 0 ? activeQual.join(", ") : "HCAHPS Improvement";
    return `Your assessment focused on qualitative drivers (${driverList}). These represent strategic value for your nursing program \u2014 patient experience, bedside presence, and care quality \u2014 that is meaningful but not easily dollarized. To build a financial case, consider enabling OT Reduction or Retention Savings.`;
  }

  if (otVal > 0 && retVal > 0 && agencyOn) {
    return `Your model captures three labor cost levers: overtime reduction grounded in current OT spend, retention savings from reduced burnout-driven turnover, and avoided agency costs. This is typical for organizations with high turnover or significant agency dependence.`;
  }

  if (otVal > 0 && retVal > 0) {
    return `Your model combines overtime reduction with retention savings. OT reduction is grounded in your current overtime spend; retention reflects the burnout-related turnover that documentation burden accelerates. Together they form a defensible staffing ROI.`;
  }

  if (otVal > 0) {
    return `Your model focuses on overtime reduction \u2014 grounded in your nurses\u2019 current OT hours. This is the most direct, measurable labor cost savings in nursing: fewer hours on the clock past shift end.`;
  }

  if (retVal > 0) {
    return `Your model focuses on retention savings. Documentation burden is among the most frequently cited contributors to nurse burnout and turnover. Quantifying the retention impact creates a compelling case for investment.`;
  }

  return `Your model captures staffing efficiency value from documentation time savings. The remaining time returns to the bedside for assessments, interventions, and the clinical presence that improves care quality.`;
};



const ExplorePDFDocument = ({ data }: { data: ExplorePDFData }) => {
  const config = SETTING_CONFIGS[data.careSetting];
  const orgName = data.clientName || "Organization";
  const timeDrivers = data.drivers.filter((d) => d.category === "time");
  const docDrivers = data.drivers.filter((d) => d.category === "documentation");
  const timeTotal = timeDrivers.reduce((s, d) => s + safe(d.value), 0);
  const docTotal = docDrivers.reduce((s, d) => s + safe(d.value), 0);

  const isNursing = data.careSetting === "nursing";
  const isOutpatient = data.careSetting === "outpatient";
  const unitCount = isNursing ? (data.nursingStaffedBeds || data.providers) : data.providers;

  const derivedTotalValue = timeTotal + docTotal;
  const derivedNetValue = derivedTotalValue - data.annualInvestment;
  const derivedRoi = data.annualInvestment > 0 ? derivedTotalValue / data.annualInvestment : 0;
  const perUnit = unitCount > 0 ? Math.round(derivedNetValue / unitCount) : 0;

  const qualDrivers = data.qualitativeDrivers || [];
  const hasQualitative = qualDrivers.length > 0;
  const isQualitativeOnly = hasQualitative && derivedTotalValue === 0;
  const timeIsQualitativeOnly = timeTotal === 0 && hasQualitative;
  const docIsNotMeasured = docTotal === 0 && docDrivers.length === 0;

  const year1Value = derivedTotalValue;
  const year1Cost = data.annualInvestment + safe(data.implementationCost);
  const year2Value = Math.round(derivedTotalValue * 1.1);
  const year2Cost = data.annualInvestment;
  const year3Value = Math.round(derivedTotalValue * 1.21);
  const year3Cost = data.annualInvestment;
  const cumulative1 = year1Value - year1Cost;
  const cumulative2 = cumulative1 + (year2Value - year2Cost);
  const cumulative3 = cumulative2 + (year3Value - year3Cost);
  const year3Roi = year3Cost > 0 ? ((year3Value) / year3Cost).toFixed(1) : "N/A";

  const fullScaleMultiplier = unitCount > 0
    ? (data.fullScaleProviders / unitCount) * (data.fullScaleUtilization / Math.max(data.utilizationPercent, 1))
    : 1;
  const fullScaleNetValue = Math.round(derivedNetValue * fullScaleMultiplier);
  const fullScaleInvestment = Math.round(data.annualInvestment * (data.fullScaleProviders / Math.max(unitCount, 1)));
  const perUnitFullScale = data.fullScaleProviders > 0 ? Math.round(fullScaleNetValue / data.fullScaleProviders) : 0;

  const realizationRates = data.drivers
    .filter((d) => d.inputs && (d.inputs.realizationRate || d.inputs.realization))
    .map((d) => ({
      name: d.name,
      rate: `${safe(Number(d.inputs?.realizationRate || d.inputs?.realization || d.inputs?.wrvuRealization || 0))}%`,
    }));

  const totalPages = isOutpatient ? 6 : 5;

  const investmentDisplay = data.annualInvestment >= 1000 ? `$${Math.round(data.annualInvestment / 1000)}K/yr` : `$${Math.round(data.annualInvestment)}/yr`;

  if (isOutpatient) {
    const effVal = safe(data.efficiencyValue);
    const docQualVal = safe(data.documentationQualityValue);
    const capPct = safe(data.capacityAllocationPct);
    const docPct = safe(data.docQualityAllocationPct);
    const susPct = safe(data.sustainabilityAllocationPct);
    const capHrs = safe(data.capacityHours);
    const susHrs = safe(data.sustainabilityHours);
    const convPct = safe(data.accessConversionPct);
    const hrsPerWkBack = safe(data.hoursPerProviderPerWeekBack);

    const timeRecapturedCopy = (() => {
      if (data.patientAccessEnabled && data.retentionValueEnabled) {
        return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually. Your organization modeled ${safe(data.additionalVisitsPerWeek)} additional visits per provider per week \u2014 using ~${capPct}% of recovered time for capacity while investing the rest in documentation quality and retention.`;
      }
      if (data.patientAccessEnabled) {
        return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually. Your organization modeled ${safe(data.additionalVisitsPerWeek)} additional visits per provider per week \u2014 the most direct path from documentation savings to revenue.`;
      }
      if (data.sustainabilityEnabled) {
        return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually. You chose to apply this time to provider wellbeing \u2014 a signal that retention and sustainability are the priority right now.`;
      }
      return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually.`;
    })();

    const activatedDocDriversList: string[] = [];
    if (data.wrvuEnabled && safe(data.annualWrvuValue) > 0) activatedDocDriversList.push(`wRVU improvement (${fmtCurrency(safe(data.annualWrvuValue))})`);
    if (data.hccEnabled && safe(data.annualHccValue) > 0) activatedDocDriversList.push(`HCC capture (${fmtCurrency(safe(data.annualHccValue))})`);
    if (data.denialEnabled && safe(data.annualDenialValue) > 0) activatedDocDriversList.push(`denial prevention (${fmtCurrency(safe(data.annualDenialValue))})`);

    let investmentPageNum = 5;
    let assessmentPageNum = 6;

    return (
      <Document>
        <PDFCoverPage
          reportLabel={config.coverLabel}
          title={orgName}
          subtitle={`${fmtNum(data.providers)} providers \u00B7 ${fmtNum(data.encounters)} encounters \u00B7 Outpatient`}
          preparedBy={data.preparedBy}
        />

        {/* OUTPATIENT PAGE 1: THE THESIS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE THESIS</Text>

            <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 8 }]}>
              <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
                {fmtNum(data.providers)} providers {"\u00B7"} {fmtNum(data.encounters)} encounters {"\u00B7"} Outpatient
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    PROJECTED NET ANNUAL VALUE
                  </Text>
                  <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary }}>
                    {fmtCurrency(derivedNetValue)}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
                What changes when your providers get time back?
              </Text>

              <View style={{ flexDirection: "row", gap: 6 }}>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.providers)}</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>providers</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.encounters)}</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>encounters</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{data.utilizationPercent}%</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>utilization</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{investmentDisplay}</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>investment</Text>
                </View>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>FOUR DRIVERS OF VALUE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              Outpatient value compounds across four connected dimensions. Access reinvests recovered time into patient capacity. Revenue captures the documentation completeness that turns delivered care into appropriate reimbursement. Workforce protects the providers doing the work. Downstream effects ripple through specialist referrals, ancillary revenue, and care continuity.
            </Text>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  ACCESS
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: safe(data.patientAccessValue) > 0 ? colors.primaryText : colors.secondary, marginBottom: 4 }}>
                  {safe(data.patientAccessValue) > 0 ? fmtCurrency(safe(data.patientAccessValue)) : "Not Measured"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Time recaptured from documentation, reinvested into patient capacity. Each additional visit creates immediate revenue and reduces access wait times.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: docQualVal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {docQualVal > 0 ? fmtCurrency(docQualVal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Documentation completeness translates directly to coding accuracy {"\u2014"} wRVU lift, HCC recapture, and denial prevention are all documentation stories.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  WORKFORCE
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: (data.retentionValueEnabled && safe(data.retentionValue) > 0) || data.sustainabilityEnabled ? colors.primaryText : colors.secondary, marginBottom: 4 }}>
                  {data.retentionValueEnabled && safe(data.retentionValue) > 0
                    ? fmtCurrency(safe(data.retentionValue))
                    : data.sustainabilityEnabled
                      ? `${hrsPerWkBack.toFixed(1)} hrs/wk`
                      : "Not Measured"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Burnout is a documentation problem. Time returned to providers reduces the pressure that drives turnover in primary care and specialty practices.
                </Text>
              </View>

              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  DOWNSTREAM
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.secondary, marginBottom: 4 }}>
                  Org-Level
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Complete outpatient documentation creates downstream value across the health system {"\u2014"} specialist context, ancillary revenue, and care continuity. Sized with your data, not this model.
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                WHAT YOUR CHOICES REVEAL
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                {getOutpatientObservation(data)}
              </Text>
            </View>

            <PageFooter pageNum={1} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 2: ACCESS & WORKFORCE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>ACCESS</Text>
            <Text style={styles.sectionHeadline}>Time recaptured becomes capacity.</Text>
            <Text style={styles.body}>
              Time saved on documentation is only valuable if it{"\u2019"}s reinvested. The reinvestment rate reflects the share of recovered documentation time that flows back into the schedule {"\u2014"} the rest is absorbed into documentation quality, inbox management, and care transitions.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: data.patientAccessEnabled && safe(data.patientAccessValue) > 0 ? colors.primary : colors.border, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Patient Access</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: data.patientAccessEnabled && safe(data.patientAccessValue) > 0 ? colors.primary : colors.secondary }}>
                      {data.patientAccessEnabled && safe(data.patientAccessValue) > 0 ? fmtCurrency(safe(data.patientAccessValue)) : "Not Selected"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                    At a {safe(data.accessConversionPct) || 25}% reinvestment rate {"\u2014"} meaning {safe(data.accessConversionPct) || 25}% of recovered documentation time goes back into patient scheduling {"\u2014"} that generates {safe(data.additionalVisitsPerWeek)} additional visit{safe(data.additionalVisitsPerWeek) === 1 ? "" : "s"} per provider per week. Across {fmtNum(safe(data.accessProviders) || data.providers)} providers seeing {fmtNum(safe(data.projectedAdditionalVisits))} additional patients annually at ${safe(data.revenuePerVisit) || 200} per visit: {fmtCurrency(safe(data.patientAccessValue))}.
                  </Text>
                  <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5, fontStyle: "italic" }}>
                    Methodology: Reinvestment rate reflects the portion of recovered documentation time realistically converted to schedule capacity. The remainder is absorbed into documentation quality, inbox management, and care transitions.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>WORKFORCE</Text>
            <Text style={styles.sectionHeadline}>Burnout is a documentation problem.</Text>
            <Text style={styles.body}>
              Primary care and specialty medicine carry some of the highest burnout rates in medicine {"\u2014"} and documentation burden is the most-cited driver. Time returned to providers reduces the pressure that drives turnover.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: data.sustainabilityEnabled ? colors.primary : colors.border, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Provider Wellbeing</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: data.retentionValueEnabled && safe(data.retentionValue) > 0 ? colors.primary : data.sustainabilityEnabled ? colors.secondary : colors.tertiary }}>
                      {data.retentionValueEnabled && safe(data.retentionValue) > 0
                        ? fmtCurrency(safe(data.retentionValue))
                        : data.sustainabilityEnabled
                          ? `${hrsPerWkBack.toFixed(1)} hrs/wk per provider`
                          : "Not Selected"}
                    </Text>
                  </View>
                  {data.retentionValueEnabled && safe(data.retentionValue) > 0 ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      The hypothesis we model: ambient documentation returns roughly {hrsPerWkBack.toFixed(1)} hours per week per provider. At {safe(data.annualTurnoverRate) || 6}% annual turnover, {safe(data.burnoutRelatedTurnoverPct) || 40}% burnout-related, and ${(safe(data.replacementCostPerProvider) || 400000).toLocaleString()} to replace a departing physician, a {safe(data.abridgeRetentionImpactPct) || 10}% reduction in burnout-driven departures would retain roughly {(safe(data.providersRetained) || 0).toFixed(1)} providers annually {"\u2014"} pointing to {fmtCurrency(safe(data.retentionValue))} in avoided turnover, a number to validate against your exit-interview and turnover data over 12{"\u2013"}18 months.
                    </Text>
                  ) : data.sustainabilityEnabled ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      The hypothesis we model: ambient documentation returns roughly {hrsPerWkBack.toFixed(1)} hours per week per provider {"\u2014"} time that currently comes from the end of the clinical day. Whether it goes back to patients, to administrative catch-up, or to simply leaving on time, it changes the experience of practicing medicine. Confirm against your own EHR time-in-notes data once deployed.
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Sustainability was not selected for this assessment. Quantifying retention impact requires turnover and replacement-cost inputs from your workforce team.
                    </Text>
                  )}
                  <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5, fontStyle: "italic", marginBottom: 2 }}>
                    Methodology: Retention impact is modeled at the selected scenario. Validate using exit interview data to confirm burnout-related attribution.
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.4 }}>
                    Source: AMA National Physician Burnout Survey, 2024.
                  </Text>
                </View>
              </View>
            </View>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 3: REVENUE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>REVENUE</Text>
            <Text style={styles.sectionHeadline}>The notes were already earning this.{"\n"}They just weren{"\u2019"}t capturing it.</Text>
            <Text style={styles.body}>
              Documentation completeness {"\u2014"} not upcoding {"\u2014"} is what changes here. The clinical complexity was delivered. The note needs to reflect it.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>REVENUE DRIVERS</Text>

            {data.wrvuEnabled && safe(data.annualWrvuValue) > 0 ? (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>wRVU IMPROVEMENT</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualWrvuValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      At a {data.wrvuScenario || "typical"} documentation improvement rate of {safe(data.wrvuImprovementPct)}% {"\u2014"} the conservative range seen in ambulatory settings {"\u2014"} that{"\u2019"}s {(safe(data.wrvuLiftPerVisit) || 0).toFixed(3)} additional wRVUs per visit, {Math.round(safe(data.totalAdditionalWrvus) || 0).toLocaleString()} total additional wRVUs at ${safe(data.wrvuConversionFactor) || 33}/wRVU and {safe(data.wrvuRealizationRate) || 75}% realization: {fmtCurrency(safe(data.annualWrvuValue))}.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5, fontStyle: "italic" }}>
                      Current average: {(safe(data.currentAvgWrvuPerVisit) || 1.8).toFixed(1)} wRVU per visit
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.tertiary }}>wRVU IMPROVEMENT {"\u2014"} Not Selected</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.5, marginTop: 4 }}>
                  Requires baseline wRVU data per provider. Available to model once baseline data is established.
                </Text>
              </View>
            )}

            {data.hccEnabled && safe(data.annualHccValue) > 0 ? (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>HCC CAPTURE</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualHccValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Medicare Advantage plans pay based on documented risk {"\u2014"} and HCC gaps are common even in well-run practices. Your {safe(data.medicareAdvantagePct) || 20}% MA panel of {(safe(data.maPatientPanel) || 0).toLocaleString()} patients has an estimated {safe(data.documentationGapRate) || 12}% gap rate {"\u2014"} {(safe(data.patientsWithGaps) || 0).toLocaleString()} patients with unrecaptured conditions. At {safe(data.hccRecaptureTargetPct)}% recapture of {safe(data.avgMissedHccsPerPatient) || 0.5} HCCs per patient, that{"\u2019"}s {Math.round(safe(data.hccsDocumented) || 0)} HCCs documented, each carrying a {safe(data.rafImpactPerHcc) || 0.15} RAF impact at ${(safe(data.annualPaymentPerRaf) || 10000).toLocaleString()}/RAF unit. At {safe(data.hccRealizationRate) || 40}% realization: {fmtCurrency(safe(data.annualHccValue))}.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5, fontStyle: "italic" }}>
                      HCC documentation reflects conditions that were clinically present but not captured in the note. This is a documentation completeness story.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.tertiary }}>HCC CAPTURE {"\u2014"} Not Selected</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.5, marginTop: 4 }}>
                  Requires Medicare Advantage population size and current HCC capture rate to size accurately.
                </Text>
              </View>
            )}

            {data.denialEnabled && safe(data.annualDenialValue) > 0 ? (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>DENIAL PREVENTION</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualDenialValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Your {safe(data.baselineDenialRate) || 8}% baseline denial rate generates {(safe(data.totalDenials) || 0).toLocaleString()} denied claims annually, of which {(safe(data.unrecoverableDenials) || 0).toLocaleString()} ({safe(data.unappealableDenialRate) || 30}%) are unappealable due to documentation gaps. At a {safe(data.preventionTargetPct)}% reduction in documentation-related denials {"\u2014"} the {data.denialPreventionScenario || "typical"} scenario {"\u2014"} that{"\u2019"}s {(safe(data.denialsPrevented) || 0).toLocaleString()} claims recovered at ${safe(data.avgDeniedClaimValue) || 200} each. At {safe(data.denialRealizationRate) || 60}% realization: {fmtCurrency(safe(data.annualDenialValue))}.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.tertiary }}>DENIAL PREVENTION {"\u2014"} Not Selected</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.5, marginTop: 4 }}>
                  Requires current denial rate and average claim value from your revenue cycle team.
                </Text>
              </View>
            )}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>REVENUE SUBTOTAL</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{docQualVal > 0 ? fmtCurrency(docQualVal) : "Not Modeled"}</Text>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 4: DOWNSTREAM */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>DOWNSTREAM</Text>
            <Text style={styles.sectionHeadline}>Value that flows through the organization,{"\n"}not just the visit.</Text>
            <Text style={styles.body}>
              Complete outpatient documentation creates value that extends beyond the encounter {"\u2014"} into specialist relationships, downstream care settings, and health system revenue. These outcomes are real but require your organization{"\u2019"}s data to size precisely. We don{"\u2019"}t model them. We name them so you can track them.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Specialist Referral Quality</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                When primary care documentation captures the full clinical picture, specialists receive context that reduces redundant testing and accelerates diagnosis. The documentation that follows the patient is the care handoff.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Ancillary and Lab Revenue</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Additional outpatient visits create downstream ancillary revenue {"\u2014"} labs, imaging, and procedures ordered at or following the encounter. A conservative estimate is $80{"\u2013"}$150 in ancillary revenue per incremental visit, though this varies by payer mix and service line.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>ED Diversion Through Chronic Disease Management</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Better-documented primary care improves chronic disease management {"\u2014"} reducing ED visits for ambulatory-sensitive conditions. Organizations with higher primary care documentation completeness show measurable reductions in preventable ED utilization.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Inpatient Transition Support</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Complete outpatient documentation reduces information gaps at hospital admission and supports care transitions {"\u2014"} reducing the readmission risk that comes from missing chronic condition context.
              </Text>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                HCC value from your MA population is already quantified in the Revenue section. Specialist referral quality and downstream organizational impact are not double-counted {"\u2014"} they require your organization{"\u2019"}s data to size precisely. Ask your Abridge team for network-level outcome data from comparable deployments.
              </Text>
            </View>

            <PageFooter pageNum={4} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 3/4: THE INVESTMENT CASE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
            <Text style={styles.sectionHeadline}>Infrastructure, Not Expense.</Text>
            <Text style={styles.body}>
              The investment is {investmentDisplay} annually and does not change as value grows. That asymmetry {"\u2014"} fixed cost, compounding return {"\u2014"} is what separates infrastructure from a line item.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>3-YEAR PROJECTION</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Period</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Investment</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Net Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Cumulative</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

              {[
                { period: "Year 1", value: year1Value, cost: year1Cost, net: year1Value - year1Cost, cum: cumulative1 },
                { period: "Year 2", value: year2Value, cost: year2Cost, net: year2Value - year2Cost, cum: cumulative2 },
                { period: "Year 3", value: year3Value, cost: year3Cost, net: year3Value - year3Cost, cum: cumulative3 },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText }}>{row.period}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.cost)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
                </View>
              ))}

              <Text style={{ fontSize: 8.5, color: colors.tertiary, marginTop: 6, lineHeight: 1.4 }}>
                Years 2{"\u2013"}3 reflect a 10% annual value improvement as provider adoption deepens and documentation patterns mature. The investment stays flat.
              </Text>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                By Year 3, you{"\u2019"}re generating {year3Roi}{"\u00D7"} for every dollar invested {"\u2014"} {fmtCurrency(cumulative3)} cumulative net value against {fmtCurrency(data.annualInvestment * 3)} in total investment. That{"\u2019"}s not a cost to defend. That{"\u2019"}s a return to protect.
              </Text>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>AT SCALE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              Per-provider economics hold at scale {"\u2014"} and improve slightly as workflow maturity compounds across a larger organization.
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CURRENT MODEL
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {fmtCurrency(derivedNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.providers)} providers</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}% utilization</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>~{fmtCurrency(perUnit)}/provider/yr</Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  AT FULL SCALE
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                  {fmtCurrency(fullScaleNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.fullScaleProviders)} providers</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.fullScaleUtilization}% utilization</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>~{fmtCurrency(perUnitFullScale)}/provider/yr</Text>
              </View>
            </View>

            <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 6 }}>
              The per-provider return improves at scale because utilization typically increases as workflows mature and more providers adopt Abridge as their default documentation approach {"\u2014"} not because the math changes.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>WHAT TO MEASURE AT 90 DAYS</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 2 }}>
              These are the signals that confirm the model is working {"\u2014"} and the levers that improve it if it isn{"\u2019"}t.
            </Text>
            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} Documentation time per encounter (target: {"\u2212"}50% from baseline)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} Provider satisfaction with documentation burden (target: +15 pts from baseline)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} wRVU per encounter trend (target: +2{"\u2013"}5% if wRVU driver is relevant)
              </Text>
            </View>
            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              Tracking these at 90 days gives you the data to validate this model with real numbers {"\u2014"} and to activate any documentation quality drivers that weren{"\u2019"}t modeled here.
            </Text>

            <PageFooter pageNum={investmentPageNum} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 4/5: YOUR ASSESSMENT */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

            <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 16, paddingHorizontal: 20 }]}>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(data.providers)} providers.
              </Text>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(data.encounters)} encounters.
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(derivedNetValue)} projected net value.
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>
                {fmtCurrency(perUnit)} per provider per year.
              </Text>
            </View>

            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                {getOutpatientClosingQuote(data)}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  VALUE SUMMARY
                </Text>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>ACCESS</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Patient Access</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.patientAccessEnabled ? fmtCurrency(safe(data.patientAccessValue)) : "Not modeled"}</Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>REVENUE</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>wRVU Improvement</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.wrvuEnabled ? fmtCurrency(safe(data.annualWrvuValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>HCC Capture</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.hccEnabled ? fmtCurrency(safe(data.annualHccValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Denial Prevention</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.denialEnabled ? fmtCurrency(safe(data.annualDenialValue)) : "Not modeled"}</Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>WORKFORCE</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Provider Wellbeing</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : data.sustainabilityEnabled ? `${hrsPerWkBack.toFixed(1)} hrs/wk` : "Not modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>DOWNSTREAM</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary, fontStyle: "italic" }}>Org-level outcomes</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary, fontStyle: "italic" }}>Not modeled</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Net Annual Value</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(derivedNetValue)}</Text>
                </View>
              </View>

              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  INVESTMENT SUMMARY
                </Text>
                <View style={{ marginBottom: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Annual Investment</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{investmentDisplay}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Per provider</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(data.providers > 0 ? data.annualInvestment / data.providers * 12 / 12 : 0)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Year 1 ROI</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{derivedRoi.toFixed(1)}{"\u00D7"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Year 3 Cumulative Net</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(cumulative3)}</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  UTILIZATION
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Projected</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}%</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Hours Returned</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.hoursReturned)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Per provider/week</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>
                    {data.providers > 0 ? `${(data.hoursReturned / data.providers / 52).toFixed(1)} hrs` : "0 hrs"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>METHODOLOGY</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  YOUR INPUTS
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                  {fmtNum(data.providers)} providers{"\n"}
                  {fmtNum(data.encounters)} encounters{"\n"}
                  {data.utilizationPercent}% utilization{"\n"}
                  {data.minutesSavedPerEncounter} min saved per encounter{"\n"}
                  {investmentDisplay} annual investment{"\n"}
                  {fmtNum(data.hoursReturned)} hrs returned annually
                  {data.retentionValueEnabled ? `\n${safe(data.annualTurnoverRate)}% annual turnover / ${fmtCurrency(safe(data.replacementCostPerProvider))} replacement cost` : ""}
                </Text>
              </View>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  HOW WE CALCULATED THIS
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  All figures are built from your inputs {"\u2014"} not industry averages applied generically. Where assumptions were required (conversion rates, realization rates, turnover benchmarks), we used the conservative end of observed Abridge deployment data.
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginTop: 4 }}>
                  The goal of this model is to give you a defensible starting point, not a ceiling. The most reliable validation comes after deployment, when you can measure these baselines directly. This document gives you the numbers to track against.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              This assessment is for planning purposes. Projections are based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, and organizational factors. This does not constitute a guarantee of financial outcomes.
            </Text>

            <PageFooter pageNum={assessmentPageNum} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>
      </Document>
    );
  }

  const isED = data.careSetting === "ed";
  if (isED) {
    const thrPct = safe(data.throughputAllocationPct);
    const wellPct = safe(data.wellbeingAllocationPct);
    const docQualPct = safe(data.docQualityAllocationPct);
    const burdenReliefPct = docQualPct + wellPct;
    const thrHrs = safe(data.throughputHours);
    const wellHrs = safe(data.wellbeingHours);
    const hrsPerWkBack = safe(data.hoursPerProviderPerWeekBack);
    const thrVal = safe(data.throughputValue);
    const docQualVal = safe(data.documentationQualityValue);
    const edHasDocQuality = !!(data.emAccuracyEnabled || data.denialEnabled);
    const edCapacityVal = safe(data.edCapacityValue ?? (safe(data.netLwbsValue) + safe(data.annualAdmissionCaptureValue)));
    const edWorkforceVal = safe(data.edWorkforceValue ?? data.retentionValue);
    const edTotalPages = 6;
    const investmentPageNum = 5;
    const assessmentPageNum = 6;
    const investmentDisplay = data.annualInvestment >= 1000 ? `$${Math.round(data.annualInvestment / 1000)}K/yr` : `$${Math.round(data.annualInvestment)}/yr`;

    const thrCopy = (() => {
      const base = `${fmtNum(data.providers)} physicians reclaim ${fmtNum(data.hoursReturned)} hours annually. You directed ${thrPct}% of that time toward patient throughput \u2014 reducing wait times and the LWBS rate that quietly drains ED revenue every shift.`;
      if (data.retentionValueEnabled) {
        return base + ` The remaining allocations address documentation quality and physician wellbeing \u2014 including a quantified retention case built from your turnover data.`;
      }
      if (data.sustainabilityEnabled) {
        return base + ` The remaining ${burdenReliefPct}% returns ${hrsPerWkBack.toFixed(1)} hours per week per physician through documentation quality and shift sustainability \u2014 burden relief that compounds over time.`;
      }
      return base;
    })();

    const revOptCopy = (() => {
      if (data.emAccuracyEnabled && data.denialEnabled) {
        return `In high-volume settings, notes often understate acuity \u2014 especially during surges. E&M accuracy and denial prevention together recover ${fmtCurrency(docQualVal)} annually.`;
      }
      if (data.emAccuracyEnabled) {
        return `In high-volume settings, notes often understate acuity \u2014 especially during surges. E&M accuracy alone recovers ${fmtCurrency(safe(data.annualEmValue))} by capturing the complexity that was always there.`;
      }
      if (data.denialEnabled) {
        return `In high-volume settings, notes often understate acuity \u2014 especially during surges. Denial prevention recovers ${fmtCurrency(safe(data.annualDenialValue))} by stopping documentation-related claim losses before they occur.`;
      }
      return "";
    })();

    return (
      <Document>
        <PDFCoverPage
          reportLabel={config.coverLabel}
          title={orgName}
          subtitle={`${fmtNum(data.providers)} physicians \u00B7 ${fmtNum(data.encounters)} visits \u00B7 Emergency Department`}
          preparedBy={data.preparedBy}
        />

        {/* ED PAGE 1: THE THESIS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE THESIS</Text>

            <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 8 }]}>
              <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
                {fmtNum(data.providers)} physicians {"\u00B7"} {fmtNum(data.encounters)} visits {"\u00B7"} Emergency Department
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    PROJECTED NET ANNUAL VALUE
                  </Text>
                  <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary }}>
                    {fmtCurrency(derivedNetValue)}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
                What changes when your ED moves faster?
              </Text>

              <View style={{ flexDirection: "row", gap: 6 }}>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.providers)}</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>physicians</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.encounters)}</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>annual visits</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{data.utilizationPercent}%</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>utilization</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{investmentDisplay}</Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>investment</Text>
                </View>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>FOUR DRIVERS OF VALUE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              In the emergency department, time is the unit of currency. When documentation is faster and more complete, value shows up in four distinct places {"\u2014"} on the revenue line, in capacity, across the workforce, and in the quality outcomes that show up at 90 days.
            </Text>

            <View style={styles.divider} />

            {/* 2x2 grid: QUALITY / WORKFORCE on top, CAPACITY / REVENUE on bottom */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  QUALITY
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.secondary, marginBottom: 4, marginTop: 4 }}>
                  Measured, Not Modeled
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Sepsis and stroke protocol documentation, observation vs. admission status defense, and readmission prevention. Outcomes reported at 90 days {"\u2014"} not estimated upfront.
                </Text>
              </View>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  WORKFORCE
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: edWorkforceVal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {edWorkforceVal > 0 ? fmtCurrency(edWorkforceVal) : data.sustainabilityEnabled ? "Qualitative" : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Emergency medicine has the highest burnout rate in medicine. Documentation burden is the most-cited driver. Time returned from charting changes what it feels like to practice in an ED.
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CAPACITY
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: edCapacityVal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {edCapacityVal > 0 ? fmtCurrency(edCapacityVal) : "Not Measured"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  When physicians spend less time charting between patients, they are available to see the next patient sooner. That shortens wait time {"\u2014"} the primary driver of LWBS.
                </Text>
              </View>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: edHasDocQuality && docQualVal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {docQualVal > 0 ? fmtCurrency(docQualVal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  {edHasDocQuality
                    ? "E&M level accuracy and denial prevention \u2014 documentation completeness translates directly to reimbursement."
                    : "No documentation quality drivers were selected. E&M level accuracy and denial prevention are available to model \u2014 both are high-impact in ED settings."}
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                WHAT YOUR CHOICES REVEAL
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                {getEdObservation(data)}
              </Text>
            </View>

            <PageFooter pageNum={1} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* ED PAGE 2: WORKFORCE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>WORKFORCE</Text>
            <Text style={styles.sectionHeadline}>The Department That Holds Onto Its People.</Text>
            <Text style={styles.body}>
              ED physician burnout is not a soft cost. It is a documented driver of turnover, and turnover in emergency medicine is among the most expensive in healthcare. Returning hours of cognitive work to physicians {"\u2014"} reliably, every shift {"\u2014"} is the lever that moves retention.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>WORKFORCE</Text>

            {data.sustainabilityEnabled && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Clinician Retention</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: data.retentionValueEnabled ? colors.primary : colors.secondary }}>
                        {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : `${hrsPerWkBack.toFixed(1)} hrs/wk per physician`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      The hypothesis we model: ambient documentation returns roughly {hrsPerWkBack.toFixed(1)} hours per week to each physician {"\u2014"} time previously spent at a terminal, now available for patient care, recovery between shifts, or the cognitive reset that makes the next shift sustainable. Across {fmtNum(data.providers)} physicians, that would be {fmtNum(data.hoursReturned)} hours returned annually {"\u2014"} confirm against your own EHR time-in-notes data once deployed.
                    </Text>
                    {data.retentionValueEnabled ? (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        At your {safe(data.annualTurnoverRate)}% annual turnover rate and {safe(data.burnoutRelatedTurnoverPct)}% burnout attribution {"\u2014"} the {data.abridgeRetentionImpactLabel || "typical"} scenario in the AMA/MGMA literature {"\u2014"} the modeled retention impact is roughly {Math.round(safe(data.providersRetained) ?? 0)} physicians retained per year. At {fmtCurrency(safe(data.replacementCostPerProvider))} replacement cost per departing physician, that points to {fmtCurrency(safe(data.retentionValue))} in avoided turnover annually {"\u2014"} a number to validate against your exit-interview and turnover data over 12{"\u2013"}18 months.
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        Emergency medicine has among the highest burnout rates in medicine. Documentation burden is consistently cited as the primary driver. {hrsPerWkBack.toFixed(1)} hours per week is not a large number in isolation {"\u2014"} but multiplied across {fmtNum(data.providers)} physicians and compounded over three years of shifts, it is the difference between a department that loses physicians and one that keeps them.
                      </Text>
                    )}
                    <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.4 }}>
                      Source: AMA National Physician Burnout Survey 2024; MGMA emergency physician replacement cost benchmarks. Documentation burden cited as the leading modifiable driver of ED burnout.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>WORKFORCE SUBTOTAL</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>
                {edWorkforceVal > 0 ? fmtCurrency(edWorkforceVal) : data.sustainabilityEnabled ? `${hrsPerWkBack.toFixed(1)} hrs/wk per physician` : "Not modeled"}
              </Text>
            </View>

            <View style={[styles.calloutBox]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                Retention is the longest-tail outcome in this model {"\u2014"} the hardest to attribute and the most consequential when it lands. The financial logic compounds: the physician you don{"\u2019"}t lose this year is the physician who isn{"\u2019"}t a $250K{"\u2013"}$500K replacement cost next year, and isn{"\u2019"}t a 9{"\u2013"}12 month vacancy gap absorbed by your remaining team.
              </Text>
            </View>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* ED PAGE 3: CAPACITY & REVENUE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>CAPACITY & REVENUE</Text>
            <Text style={styles.sectionHeadline}>How Time Becomes Capacity {"\u2014"} and Notes Become Revenue.</Text>
            <Text style={styles.body}>
              Two ways the same documentation work shows up on the financials: faster cycles open capacity in the department, more complete notes protect what was already earned.
            </Text>

            <View style={styles.divider} />

            {/* CAPACITY SECTION */}
            <Text style={styles.sectionLabelGray}>CAPACITY</Text>

            {data.lwbsEnabled && safe(data.netLwbsValue) > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>LWBS Recovery</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.netLwbsValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 3 }}>
                      When physicians spend less time charting between patients, they are available to see the next patient sooner. That shortens wait time {"\u2014"} the primary driver of LWBS. Your current LWBS rate of {safe(data.currentLwbsRatePct)}% generates {fmtNum(safe(data.annualLwbsPatients))} walkouts annually. At a {safe(data.expectedLwbsReductionPct)}% reduction {"\u2014"} consistent with ED operations literature on wait time sensitivity {"\u2014"} that{"\u2019"}s {fmtNum(safe(data.patientsRecovered))} patients recovered.
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, fontStyle: "italic", marginBottom: 3 }}>
                      These patients were already in your department. The encounter was already initiated. The only variable was time.
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.4 }}>
                      Source: ACEP/AHRQ data {"\u2014"} LWBS rates are highly sensitive to wait times exceeding 30{"\u2013"}45 minutes. Mechanism: documentation speed {"\u2192"} physician availability {"\u2192"} wait time {"\u2192"} LWBS.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.admissionCaptureEnabled && safe(data.annualAdmissionCaptureValue) > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Admission Capture</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualAdmissionCaptureValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 3 }}>
                      Of patients who leave before being seen in high-acuity EDs, published literature suggests 15{"\u2013"}20% would have met inpatient admission criteria. These are not speculative admissions {"\u2014"} they are patients whose clinical trajectory would have led to an admit decision. The {Math.round(safe(data.potentialAdmissions) ?? 0)} additional admissions at ${safe(data.avgAdmissionRevenue)} each, at a {safe(data.admissionRealizationRate)}% realization rate for payer mix and bed availability, generates {fmtCurrency(safe(data.annualAdmissionCaptureValue))} annually.
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.4 }}>
                      Methodology note: Admission revenue reflects incremental ED-to-admission revenue contribution, not full hospitalization value.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>CAPACITY SUBTOTAL</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(edCapacityVal)}</Text>
            </View>

            {/* REVENUE SECTION */}
            {edHasDocQuality && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabelGray}>REVENUE</Text>

                {data.emAccuracyEnabled && safe(data.annualEmValue) > 0 && (
                  <View style={[styles.cardBg, { marginBottom: 6 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>E&M Level Accuracy</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualEmValue))}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45 }}>
                          Emergency department documentation frequently understates visit complexity {"\u2014"} not because the care wasn{"\u2019"}t delivered, but because documentation at speed omits specificity. E/M level accuracy improves when notes capture the decision complexity that was already there. At a {safe(data.emImprovementPct)}% documentation improvement across {fmtNum(safe(data.eligibleEncounters))} eligible encounters {"\u2014"} the conservative range seen in acute care settings {"\u2014"} that{"\u2019"}s {fmtNum(safe(data.totalAdditionalWrvus))} additional wRVUs at ${safe(data.emConversionFactor)}/wRVU and {safe(data.emRealizationRate)}% realization: {fmtCurrency(safe(data.annualEmValue))} annually.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {data.denialEnabled && safe(data.annualDenialValue) > 0 && (
                  <View style={[styles.cardBg, { marginBottom: 6 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Denial Prevention</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualDenialValue))}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 3 }}>
                          ED claim denials most often trace to three documentation failures: absent medical necessity language, incomplete physical exam documentation, and missing decision rationale for admission vs. discharge. The mechanism we{"\u2019"}re modeling: capturing clinical reasoning at the point of care creates an opportunity to close those gaps before the note is finalized and the claim is sent. Your {safe(data.baselineDenialRate)}% baseline denial rate generates {fmtNum(safe(data.totalDenials))} unappealable claims annually. At a {safe(data.preventionTargetPct)}% reduction in documentation-related denials {"\u2014"} the {data.denialPreventionScenario} scenario based on ED denial root cause data {"\u2014"} that would translate to {fmtCurrency(safe(data.annualDenialValue))} in annual recovery, validated against your RCM team{"\u2019"}s denial root-cause data.
                        </Text>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, fontStyle: "italic" }}>
                          Documentation-related denials are among the most preventable in the revenue cycle.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>REVENUE SUBTOTAL</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(docQualVal)}</Text>
                </View>
              </>
            )}

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* ED PAGE 4: QUALITY */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>QUALITY</Text>
            <Text style={styles.sectionHeadline}>What Better Documentation Protects {"\u2014"} Measured, Not Modeled.</Text>
            <Text style={styles.body}>
              Quality outcomes follow from better documentation, but they are not modeled here. The mechanisms are well-established in the ED literature; the magnitudes are department-specific and require post-deployment measurement.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>WHAT WE TRACK AT 90 DAYS</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>Sepsis & Stroke Documentation Completeness</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Time-stamped documentation of sepsis bundle elements and stroke door-to-needle decision points. Direct CMS/Joint Commission quality measure exposure. Tracked as completeness rate against bundle elements.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>Observation vs. Admission Status Defense</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Documentation that supports inpatient admission criteria when warranted. Reduces RAC audit exposure and protects against Medicare status downgrades. Tracked as defended status decisions per quarter.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>72-Hour ED Readmission Prevention</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Discharge instructions and follow-up documentation that reduce avoidable bouncebacks. Tracked as readmission rate trend post-deployment, controlled for case mix.
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.calloutBox]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                These outcomes are not included in the projected value on this report. They are measured at 90 days post-deployment using your ED{"\u2019"}s own data {"\u2014"} and reported alongside the financial drivers, not in place of them.
              </Text>
            </View>

            <PageFooter pageNum={4} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* OLD ED PAGE 4 (conditional): DOCUMENTATION QUALITY - REMOVED, content moved to Page 2 */}

        {/* ED PAGE 3/4: THE INVESTMENT CASE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
            <Text style={styles.sectionHeadline}>Infrastructure, Not Expense.</Text>
            <Text style={styles.body}>
              {investmentDisplay} annually. Fixed. Every year, whether you see {fmtNum(data.providers)} physicians or {fmtNum(data.providers * 10)}.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>3-YEAR PROJECTION</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Period</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Investment</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Net Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Cumulative</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

              {[
                { period: "Year 1", value: year1Value, cost: year1Cost, net: year1Value - year1Cost, cum: cumulative1 },
                { period: "Year 2", value: year2Value, cost: year2Cost, net: year2Value - year2Cost, cum: cumulative2 },
                { period: "Year 3", value: year3Value, cost: year3Cost, net: year3Value - year3Cost, cum: cumulative3 },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText }}>{row.period}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.cost)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
                </View>
              ))}

              <Text style={{ fontSize: 8.5, color: colors.tertiary, marginTop: 6, lineHeight: 1.4 }}>
                Years 2{"\u2013"}3 reflect 10% annual value growth as physician adoption deepens and documentation patterns mature. The investment doesn{"\u2019"}t move.
              </Text>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                By Year 3, you{"\u2019"}re generating {year3Roi}{"\u00D7"} for every dollar invested {"\u2014"} {fmtCurrency(cumulative3)} cumulative net value against {fmtCurrency(data.annualInvestment * 3)} in total investment. In an environment where every capital expenditure competes, this one pays for itself before year one ends.
              </Text>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>AT SCALE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              ED economics improve at scale for a specific reason: documentation workflows mature faster in high-volume environments. Physicians adopt ambient documentation faster when they see its impact on their shift, not just on a dashboard.
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CURRENT MODEL
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {fmtCurrency(derivedNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.providers)} physicians</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}% utilization</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>~{fmtCurrency(perUnit)}/physician/yr</Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  AT FULL SCALE
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                  {fmtCurrency(fullScaleNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.fullScaleProviders)} physicians</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.fullScaleUtilization}% utilization</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>~{fmtCurrency(perUnitFullScale)}/physician/yr</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>WHAT TO MEASURE AT 90 DAYS</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 6 }}>
              These are the signals that confirm the model is working in your specific department. Quantitative ranges reflect what published deployments have measured at the 90-day mark.
            </Text>
            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} Door-to-provider time {"\u2014"} target reduction of 4{"\u2013"}8 minutes from documentation baseline
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} LWBS rate {"\u2014"} target absolute reduction of 0.3{"\u2013"}0.8 percentage points
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} E&M level distribution {"\u2014"} target 1{"\u2013"}3 percentage point upward shift in level 4{"\u2013"}5 frequency
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} EHR time-in-notes {"\u2014"} target reduction of 15{"\u2013"}25% per physician
              </Text>
            </View>
            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              Tracking these at 90 days validates the financial model with your own data and surfaces any drivers that weren{"\u2019"}t modeled in this initial assessment.
            </Text>

            <PageFooter pageNum={investmentPageNum} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* ED PAGE 4/5: YOUR ASSESSMENT */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

            <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 16, paddingHorizontal: 20 }]}>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(data.providers)} physicians.
              </Text>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(data.encounters)} ED visits.
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(derivedNetValue)} projected net value.
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>
                {fmtCurrency(perUnit)} per physician per year.
              </Text>
            </View>

            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                {getEdClosingQuote(data)}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  VALUE SUMMARY
                </Text>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>CAPACITY</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>LWBS Recovery</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.lwbsEnabled ? fmtCurrency(safe(data.netLwbsValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Admission Capture</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.admissionCaptureEnabled ? fmtCurrency(safe(data.annualAdmissionCaptureValue)) : "Not modeled"}</Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>REVENUE</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>E&M Level Accuracy</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.emAccuracyEnabled ? fmtCurrency(safe(data.annualEmValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Denial Prevention</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.denialEnabled ? fmtCurrency(safe(data.annualDenialValue)) : "Not modeled"}</Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>WORKFORCE</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Clinician Retention</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : data.sustainabilityEnabled ? `${hrsPerWkBack.toFixed(1)} hrs/wk` : "Not modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>QUALITY</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Sepsis/Stroke, Status, Readmit</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Measured at 90 days</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Net Annual Value</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(derivedNetValue)}</Text>
                </View>
              </View>

              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  INVESTMENT SUMMARY
                </Text>
                <View style={{ marginBottom: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Annual Investment</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{investmentDisplay}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Per physician</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(data.providers > 0 ? data.annualInvestment / data.providers : 0)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Year 1 ROI</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{derivedRoi.toFixed(1)}{"\u00D7"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Year 3 Cumulative Net</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(cumulative3)}</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  UTILIZATION
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Projected</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}%</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Hours Returned</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.hoursReturned)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Per physician/week</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>
                    {data.providers > 0 ? `${(data.hoursReturned / data.providers / 48).toFixed(1)} hrs` : "0 hrs"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>METHODOLOGY</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  YOUR INPUTS
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                  {fmtNum(data.providers)} ED physicians{"\n"}
                  {fmtNum(data.encounters)} annual visits{"\n"}
                  {data.utilizationPercent}% utilization{"\n"}
                  {data.minutesSavedPerEncounter} min saved per encounter{"\n"}
                  {investmentDisplay} annual investment{"\n"}
                  {fmtNum(data.hoursReturned)} hrs returned annually
                  {data.retentionValueEnabled ? `\n${safe(data.annualTurnoverRate)}% turnover / ${fmtCurrency(safe(data.replacementCostPerProvider))} replacement` : ""}
                </Text>
              </View>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  HOW WE CALCULATED THIS
                </Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 3 }}>
                  {"\u2022 "}<Text style={{ fontWeight: "bold" }}>LWBS Recovery:</Text> ACEP/AHRQ literature. Mechanism: documentation speed {"\u2192"} physician availability {"\u2192"} wait time {"\u2192"} LWBS rate. Recovery range 5{"\u2013"}15% applied to annual walkout volume at the selected realization rate.
                </Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 3 }}>
                  {"\u2022 "}<Text style={{ fontWeight: "bold" }}>Admission Capture:</Text> 15{"\u2013"}20% of LWBS patients meet inpatient admission criteria per published literature. Revenue reflects ED-to-admission contribution, not full hospitalization value. Realization rate applied for payer mix and bed availability.
                </Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 3 }}>
                  {"\u2022 "}<Text style={{ fontWeight: "bold" }}>E&M Level Accuracy:</Text> ED improvement range 1{"\u2013"}4% (acute care settings). Default wRVU baseline 1.6 (unselected ED population). CMS conversion factor with realization adjustment.
                </Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 3 }}>
                  {"\u2022 "}<Text style={{ fontWeight: "bold" }}>Denial Prevention:</Text> Reduction in documentation-related denials at the selected scenario {"\u2014"} Conservative 15{"\u2013"}20%, Typical 25{"\u2013"}35%. Root cause: medical necessity language, physical exam documentation, admission/discharge rationale.
                </Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 3 }}>
                  {"\u2022 "}<Text style={{ fontWeight: "bold" }}>Clinician Retention:</Text> Emergency medicine burnout rate per AMA. Documentation burden cited as primary driver, with burnout attribution in the 10{"\u2013"}20% range. Replacement cost $250{"\u2013"}$500K per MGMA / AMGA. Retention impact at selected scenario {"\u2014"} validate via exit-interview and turnover data over 12{"\u2013"}18 months.
                </Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                  {"\u2022 "}<Text style={{ fontWeight: "bold" }}>Quality:</Text> Not modeled. Measured at 90+ days post-deployment.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              This assessment is for planning purposes. Projections are based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, physician adoption, and departmental factors. This does not constitute a guarantee of financial outcomes.
            </Text>

            <PageFooter pageNum={assessmentPageNum} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>
      </Document>
    );
  }

  const isInpatient = data.careSetting === "inpatient";
  if (isInpatient) {
    const retVal = safe(data.retentionValue);
    const costRedVal = safe(data.ipCostReductionValue);
    const drgVal = safe(data.ipDrgValue);
    const cdiQueryVal = safe(data.ipCdiValue);
    const obsDefVal = safe(data.ipObsDefenseValue);
    const revenueTotal = drgVal + obsDefVal;
    const ipTotalPages = 6;
    const investmentPageNum = 5;
    const assessmentPageNum = 6;
    const investmentDisplay = data.annualInvestment >= 1000 ? `$${Math.round(data.annualInvestment / 1000)}K/yr` : `$${Math.round(data.annualInvestment)}/yr`;
    const hrsPerWk = safe(data.ipHoursPerWeek);
    const roundingHrsTotal = safe(data.ipRoundingHoursTotal);
    const roundingHrsPerProv = safe(data.ipRoundingHoursPerProvider);
    const directPct = safe(data.ipDirectPatientCarePct);
    const shiftPct = safe(data.ipShiftSustainabilityPct);
    const docQPct = safe(data.ipDocQualityPct);
    const costPerMo = data.providers > 0 ? Math.round(data.annualInvestment / data.providers / 12) : 0;

    const ipDrgOpRate = safe(data.ipDrgOpportunityRate);
    const ipAdmGaps = safe(data.ipAdmissionsWithGaps);
    const ipCapRate = safe(data.ipAbridgeCaptureRate);
    const ipAdmCaptured = safe(data.ipAdmissionsCaptured);
    const ipWeightLift = safe(data.ipAvgDRGWeightLift);
    const ipBasePayment = safe(data.ipBaseDRGPayment);
    const ipDrgRealize = safe(data.ipDrgRealizationRate);
    const ipCdiQRate = safe(data.ipCdiQueryRate);
    const ipTotalQ = safe(data.ipTotalCDIQueries);
    const ipQAvoidRate = safe(data.ipQueriesAvoidedRate);
    const ipQAvoided = safe(data.ipQueriesAvoided);
    const ipQCost = safe(data.ipCostPerQuery);

    const ipFullScaleVal = safe(data.ipFullScaleValue);
    const ipFullScaleRoi = safe(data.ipFullScaleROI);
    const ipFullScalePerProv = safe(data.ipFullScalePerProvider);

    return (
      <Document>
        <PDFCoverPage
          reportLabel={config.coverLabel}
          title={orgName}
          subtitle={`${fmtNum(data.providers)} hospitalists \u00B7 ${fmtNum(safe(data.eligibleEncounters) || data.encounters)} admissions \u00B7 Inpatient`}
          preparedBy={data.preparedBy}
        />

        {/* INPATIENT PAGE 1: THE THESIS \u2014 4 BUCKETS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE THESIS</Text>
            <Text style={styles.sectionHeadline}>Four Drivers of Value, One Integrated Platform</Text>
            <Text style={styles.body}>
              Ambient documentation creates value across four mechanisms {"\u2014"} not two. Quality, Workforce, Capacity, and Revenue each operate on a different timescale and address a different organizational priority.
            </Text>
            <Text style={styles.body}>
              The four drivers are integrated. Time returned makes documentation completeness possible; documentation completeness drives both query reduction and revenue capture. The platform is one. The value shows up in four places.
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  QUALITY
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: cdiQueryVal > 0 ? colors.primaryText : colors.secondary, marginBottom: 4 }}>
                  {cdiQueryVal > 0 ? fmtCurrency(cdiQueryVal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Complete real-time documentation eliminates the CDI query before it{"\u2019"}s needed. Documentation completeness is the upstream intervention {"\u2014"} query reduction is how you measure it.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  WORKFORCE
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: (data.retentionValueEnabled && retVal > 0) || data.sustainabilityEnabled ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {data.retentionValueEnabled && retVal > 0
                    ? fmtCurrency(retVal)
                    : data.sustainabilityEnabled
                      ? `${safe(data.ipWellbeingHoursPerWeek).toFixed(1)} hrs/wk`
                      : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  After-hours charting is the documentation burden that drives hospitalist turnover. Time returned from documentation is the mechanism behind every other value driver in this model.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CAPACITY
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {costRedVal > 0
                    ? fmtCurrency(costRedVal)
                    : `${(safe(data.hoursReturned) / (data.providers || 1) / 52).toFixed(1)} hrs/wk`}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Documentation removed from rounding returns hospitalists to the bedside. More time for complex case management, teaching, and care transitions {"\u2014"} the work that doesn{"\u2019"}t fit in a note.
                </Text>
              </View>

              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: revenueTotal > 0 ? colors.primaryText : colors.secondary, marginBottom: 4 }}>
                  {revenueTotal > 0 ? fmtCurrency(revenueTotal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  DRG accuracy, observation/inpatient status defense, and concurrent review protection. The clinical conversation that happens at the bedside drives the payer relationship downstream.
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                WHAT YOUR CHOICES REVEAL
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                {getInpatientObservation(data)}
              </Text>
            </View>

            <PageFooter pageNum={1} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>

        {/* INPATIENT PAGE 2: QUALITY */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>QUALITY</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.2, marginBottom: 6 }}>
              When documentation is complete at the bedside,{"\n"}the CDI query never needs to happen.
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
              CDI queries are a downstream symptom of upstream documentation gaps. The hypothesis we model: when ambient capture brings the clinical conversation into the note in real time, many of those queries become unnecessary because the answer is already there {"\u2014"} a signal CDI departments can validate quickly from query-volume trends.
            </Text>

            <View style={styles.divider} />

            {data.ipCdiEnabled && cdiQueryVal > 0 ? (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>CDI QUERY REDUCTION</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(cdiQueryVal)}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      At a {ipCdiQRate}% query rate, your CDI team manages roughly {fmtNum(ipTotalQ)} queries per year. The mechanism we{"\u2019"}re modeling: when ambient capture pulls the clinical conversation into the note completely, many queries become unnecessary because the answer is already there. At a {data.ipCdiScenario ?? "typical"} scenario reduction of {ipQAvoidRate}%, that would translate to {fmtNum(ipQAvoided)} queries avoided at {fmtCurrency(ipQCost)} each {"\u2014"} {fmtCurrency(cdiQueryVal)} annually in CDI capacity freed for complex cases, validated against your CDI team{"\u2019"}s monthly query-volume trend.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
                      CDI query cost reflects fully-loaded CDI team time: query generation, clinical review, response tracking, and physician follow-up. Queries avoided free CDI capacity for higher-complexity case optimization {"\u2014"} not headcount reduction.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.secondary, marginBottom: 4 }}>CDI Query Reduction {"\u2014"} Not Selected</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Available to model when your CDI director is ready to size the opportunity.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>CONNECTED VALUE</Text>

            <View style={[styles.calloutBox, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>WHEN ED AND INPATIENT BOTH USE ABRIDGE</Text>
              <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.5 }}>
                Inpatient documentation doesn{"\u2019"}t start at admission. The ED note that precedes it sets the documentation trajectory for the entire encounter. The hypothesis we model: when both care settings deploy ambient capture, documentation completeness can compound across the handoff {"\u2014"} a downstream effect to validate against your CDI team{"\u2019"}s observed query rates.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>DRG CAPTURE</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                CCs/MCCs documented in the ED carry forward into inpatient coding. Your case mix starts stronger from the moment of admission {"\u2014"} before the hospitalist writes a word.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>CDI EFFICIENCY</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                When the ED note is complete, CDI teams encounter fewer gaps on day one. Query volume drops before the inpatient note is even written.
              </Text>
            </View>

            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>DENIAL PREVENTION</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Medical necessity documented at the point of the admission decision {"\u2014"} in real time, in the ED {"\u2014"} is your first line of defense against retrospective payer audit.
              </Text>
            </View>

            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5, marginTop: 4 }}>
              These connected benefits are not included in the primary model above. They require both care settings to be in scope and are available to quantify separately.
            </Text>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>

        {/* INPATIENT PAGE 3: WORKFORCE & CAPACITY */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>WORKFORCE & CAPACITY</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.2, marginBottom: 6 }}>
              The hospitalist carries a documentation load{"\n"}disproportionate to their time at the bedside.
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
              Time returned from documentation doesn{"\u2019"}t stay abstract. It goes back to rounding, to complex cases, to leaving on time {"\u2014"} and over time, to staying.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>WORKFORCE</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: (data.retentionValueEnabled && retVal > 0) || data.sustainabilityEnabled ? colors.primary : colors.secondary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Provider Wellbeing</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: (data.retentionValueEnabled && retVal > 0) || data.sustainabilityEnabled ? colors.primary : colors.secondary }}>
                      {data.retentionValueEnabled && retVal > 0
                        ? fmtCurrency(retVal)
                        : data.sustainabilityEnabled
                          ? `${safe(data.ipWellbeingHoursPerWeek).toFixed(1)} hrs/wk per hospitalist`
                          : "Not Selected"}
                    </Text>
                  </View>
                  {data.retentionValueEnabled && retVal > 0 ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      After-hours charting is the piece of hospitalist burnout that organizations underestimate {"\u2014"} not because it{"\u2019"}s invisible, but because its cost only becomes visible when someone leaves. At a {safe(data.annualTurnoverRate)}% annual turnover rate, with {safe(data.burnoutRelatedTurnoverPct)}% of departures burnout-related, roughly {safe(data.ipBurnoutDepartures)?.toFixed(1)} of your hospitalist departures per year are attributable to documentation burden. At a {safe(data.abridgeRetentionImpactPct)}% modeled retention impact and {fmtCurrency(safe(data.replacementCostPerProvider))} replacement cost ($250{"\u2013"}$500K, AMGA), that points to {fmtCurrency(retVal)} in avoided turnover {"\u2014"} a number to validate against your exit-interview and turnover data over 12{"\u2013"}18 months.
                    </Text>
                  ) : data.sustainabilityEnabled ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      The hypothesis we model: ambient documentation returns roughly {safe(data.ipWellbeingHoursPerWeek).toFixed(1)} hours per week per hospitalist {"\u2014"} time that currently comes from after-shift charting. Whether that goes back to complex case review, teaching, or simply leaving on time, it changes what it feels like to practice hospital medicine. Confirm against your own EHR time-in-notes data once deployed.
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Wellbeing is available to model when your team is ready to size shift sustainability or quantify retention.
                    </Text>
                  )}
                  <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
                    Source: AMA National Physician Burnout Survey, 2024.
                    {data.retentionValueEnabled && retVal > 0
                      ? ` Retention impact modeled at the ${data.abridgeRetentionImpactLabel ?? "typical"} scenario. Validate using exit interview data to confirm burnout-related attribution.`
                      : ""}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>CAPACITY</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.secondary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Rounding Efficiency</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.secondary }}>
                      {`${(roundingHrsTotal / (data.providers || 1) / 52).toFixed(1)} hrs/wk per hospitalist`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                    Hospitalists spend a disproportionate share of documentation time on notes that follow rounds rather than driving them. The hypothesis we model: ambient capture returns roughly {roundingHrsPerProv?.toFixed(0) ?? 0} hours per hospitalist per year to direct patient care. At the bedside. In the room. In the conversation that actually informs the note {"\u2014"} because the note is writing itself.
                  </Text>
                  <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
                    Rounding Efficiency is qualitative. It is the mechanism {"\u2014"} the freed time that makes every other value driver in this model possible.
                  </Text>
                </View>
              </View>
            </View>

            {data.ipCostReductionEnabled && costRedVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Cost Reduction</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(costRedVal)}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Your organization has identified {fmtCurrency(costRedVal)} in annual operational cost reduction attributable to improved documentation velocity and reduced administrative overhead. This figure was entered directly by your team and is not modeled by Abridge.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>YOUR NUMBERS AT HUMAN SCALE</Text>

            <View style={[styles.cardBg, { padding: 0, flexDirection: "row", marginBottom: 0 }]}>
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.hoursReturned)} hrs/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4, textAlign: "center" }}>Returned to your {fmtNum(data.providers)} hospitalists.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{(safe(data.hoursReturned) / (data.providers || 1) / 52).toFixed(1)} hrs/week</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4, textAlign: "center" }}>Per hospitalist, every week.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{(safe(data.hoursReturned) / (data.providers || 1) / 8).toFixed(0)} days/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4, textAlign: "center" }}>Per hospitalist, not at a keyboard.</Text>
              </View>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>

        {/* INPATIENT PAGE 4: REVENUE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>REVENUE</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.2, marginBottom: 6 }}>
              The documentation that drives DRG accuracy{"\n"}is written during the encounter {"\u2014"} or not at all.
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
              Payer challenges target the same documentation gaps every time: incomplete complication and comorbidity capture, missing medical necessity language, and absent continued-stay rationale. The mechanism we{"\u2019"}re modeling: capturing the clinical conversation at the point of care creates an opportunity to close those gaps before the note is finalized {"\u2014"} a hypothesis your CDI and case management teams can validate by comparing query and audit-exposure rates pre- and post-deployment.
            </Text>

            <View style={styles.divider} />

            {(data.ipDrgEnabled && drgVal > 0) || (data.ipObsDefenseEnabled && obsDefVal > 0) || (data.ipEmCodingEnabled && safe(data.ipEmCodingValue) > 0) ? (
              <>
                {data.ipEmCodingEnabled && safe(data.ipEmCodingValue) > 0 && (
                  <View style={[styles.cardBg, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>E/M CODING ACCURACY</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.ipEmCodingValue))}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                          {`Across ${fmtNum(safe(data.ipEmCodingTotalCharges))} annual chargeable encounters (H&Ps, progress notes, consults \u2014 excluding time-based discharge codes), ${data.ipEmCodingGapScenario ?? "typical"} scenario assumes ${data.ipEmCodingGapScenario === "conservative" ? "8" : data.ipEmCodingGapScenario === "optimistic" ? "18" : "12"}% have a documentation-driven coding gap \u2014 ${fmtNum(safe(data.ipEmCodingChargesCaptured))} encounters where the note didn't fully reflect clinical complexity. At $${safe(data.ipEmCodingAvgRevenueLift)} average lift per charge and ${safe(data.ipEmCodingRealization)}% realization, that translates to ${fmtCurrency(safe(data.ipEmCodingValue))} annually.`}
                        </Text>
                        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
                          {`${fmtNum(safe(data.ipEmCodingHAndPs))} H&Ps + ${fmtNum(safe(data.ipEmCodingProgressNotes))} progress notes + ${fmtNum(safe(data.ipEmCodingConsults))} consults. Avg LOS: ${safe(data.ipAvgLengthOfStay) || 4.5} days. Validate consult billing against your group's payer contracts.`}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                {data.ipDrgEnabled && drgVal > 0 ? (
                  <View style={[styles.cardBg, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>DRG ACCURACY</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(drgVal)}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                          Your hospitalists discuss clinical complexity that doesn{"\u2019"}t always make it into the final note. CDI teams identify documentation opportunities in roughly {ipDrgOpRate}% of admissions {"\u2014"} {fmtNum(ipAdmGaps)} admissions per year carrying a documentation gap. The hypothesis we model is that ambient capture closes {ipCapRate}% of those gaps {"\u2014"} the portion where clinical detail was spoken but not captured. Each closed gap carries an average DRG weight lift of {ipWeightLift} at {fmtCurrency(ipBasePayment)} base payment. After a {ipDrgRealize}% realization rate for RAC and PEPPER audit exposure, that would translate to {fmtCurrency(drgVal)} {"\u2014"} validated against your CDI team{"\u2019"}s observed gap-closure rate post-deployment.
                        </Text>
                        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
                          Common missed conditions: acute respiratory failure, sepsis, malnutrition, acute encephalopathy, acute kidney injury. Validate gap rates with your CDI team before presenting.
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>DRG Accuracy</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Not Selected</Text>
                  </View>
                )}

                {data.ipObsDefenseEnabled && obsDefVal > 0 ? (
                  <View style={[styles.cardBg, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>OBS/IP STATUS DEFENSE</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(obsDefVal)}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                          Observation vs. inpatient status determinations are among the most contested payer decisions {"\u2014"} and the most documentation-sensitive. The mechanism we{"\u2019"}re modeling: capturing the clinical rationale for inpatient admission at the moment of the decision creates a stronger position for retrospective defense than reconstructing it later. At a {safe(data.ipObsDefenseRealization)}% realization rate, that would translate to {fmtCurrency(obsDefVal)} {"\u2014"} validated against your utilization-management team{"\u2019"}s reversal-rate data.
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Obs/IP Status Defense</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Not Selected</Text>
                  </View>
                )}

              </>
            ) : (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.secondary, marginBottom: 4 }}>Revenue Drivers {"\u2014"} Not Selected</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Revenue drivers were not selected for this model. DRG Accuracy and Obs/IP Status Defense are available to model when your revenue cycle team is ready.
                </Text>
              </View>
            )}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>Revenue Subtotal</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: revenueTotal > 0 ? colors.primary : colors.secondary }}>
                {revenueTotal > 0 ? fmtCurrency(revenueTotal) : "Not Modeled"}
              </Text>
            </View>

            <PageFooter pageNum={4} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>


        {/* INPATIENT PAGE 4: THE INVESTMENT CASE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
            <Text style={styles.sectionHeadline}>Infrastructure, Not Expense</Text>
            <Text style={styles.body}>
              The investment is {fmtCurrency(data.annualInvestment)} annually and does not change as value grows. That asymmetry {"\u2014"} fixed cost, compounding return {"\u2014"} is what separates infrastructure from a line item.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>3-YEAR PROJECTION</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Period</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Investment</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Net Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Cumulative</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

              {[
                { period: "Year 1", value: year1Value, cost: year1Cost, net: year1Value - year1Cost, cum: cumulative1 },
                { period: "Year 2", value: year2Value, cost: year2Cost, net: year2Value - year2Cost, cum: cumulative2 },
                { period: "Year 3", value: year3Value, cost: year3Cost, net: year3Value - year3Cost, cum: cumulative3 },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText }}>{row.period}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.cost)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                By Year 3, you{"\u2019"}re generating {year3Roi}{"\u00D7"} for every $1 invested {"\u2014"} while your hospitalist program carries more complex cases with better documentation integrity.
              </Text>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>AT SCALE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              Per-hospitalist economics hold as the program expands.
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CURRENT MODEL
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {fmtCurrency(derivedNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.providers)} hospitalists</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}% utilization</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>Per hospitalist: ~{fmtCurrency(perUnit)}/yr</Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  AT FULL SCALE
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                  {ipFullScaleVal > 0 ? fmtCurrency(ipFullScaleVal) : fmtCurrency(fullScaleNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.fullScaleProviders)} hospitalists</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.fullScaleUtilization}% utilization</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>Per hospitalist: ~{fmtCurrency(ipFullScalePerProv > 0 ? ipFullScalePerProv : perUnitFullScale)}/yr</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>KEY METRICS TO TRACK</Text>
            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                1. Documentation time per encounter (target: {"\u2013"}50%)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                2. Hospitalist satisfaction score (target: +15 pts)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                3. CDI query rate per admission (target: {"\u2013"}25%)
              </Text>
            </View>

            <PageFooter pageNum={investmentPageNum} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>

        {/* INPATIENT LAST PAGE: YOUR ASSESSMENT */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

            <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 16, paddingHorizontal: 20 }]}>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(data.providers)} hospitalists.
              </Text>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(safe(data.eligibleEncounters))} admissions.
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(derivedNetValue)} projected net value.
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>
                {fmtCurrency(perUnit)} per hospitalist per year.
              </Text>
            </View>

            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                Hospitalist documentation drives everything downstream {"\u2014"} coding accuracy, denial prevention, care transitions. When the notes are complete in real-time, the entire revenue cycle benefits.
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  VALUE SUMMARY
                </Text>
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>QUALITY</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {cdiQueryVal > 0 ? fmtCurrency(cdiQueryVal) : "Not Modeled"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>CDI Query Reduction</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.ipCdiEnabled ? fmtCurrency(cdiQueryVal) : "Not Modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>WORKFORCE</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {data.retentionValueEnabled && retVal > 0 ? fmtCurrency(retVal) : "Qualitative"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Provider Wellbeing</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.retentionValueEnabled && retVal > 0
                        ? fmtCurrency(retVal)
                        : data.sustainabilityEnabled
                          ? `${safe(data.ipWellbeingHoursPerWeek).toFixed(1)} hrs/wk`
                          : "Not Selected"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>CAPACITY</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {costRedVal > 0 ? fmtCurrency(costRedVal) : "Qualitative"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Rounding Efficiency</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Qualitative</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Cost Reduction</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {costRedVal > 0 ? fmtCurrency(costRedVal) : "Not Modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>REVENUE</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {revenueTotal > 0 ? fmtCurrency(revenueTotal) : "Not Modeled"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>DRG Accuracy</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.ipDrgEnabled ? fmtCurrency(drgVal) : "Not Modeled"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Obs/IP Status Defense</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.ipObsDefenseEnabled ? fmtCurrency(obsDefVal) : "Not Modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Net Annual Value</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(derivedNetValue)}</Text>
                </View>
              </View>

              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  INVESTMENT SUMMARY
                </Text>
                <View style={{ marginBottom: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Annual Investment</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(data.annualInvestment)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Per hospitalist</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(costPerMo)}/mo</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Year 1 ROI</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{derivedRoi.toFixed(1)}{"\u00D7"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>3-Year Cumulative</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(cumulative3)}</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  UTILIZATION
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Projected</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}%</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Hours Returned</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.hoursReturned)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Per hospitalist/week</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{hrsPerWk.toFixed(1)} hrs</Text>
                </View>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>METHODOLOGY</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6, marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold", color: colors.primaryText }}>CDI Query Reduction:</Text> {data.ipCdiScenario ?? "typical"} scenario {"\u2014"} {ipQAvoidRate}% of queries avoided. Cost per query {fmtCurrency(ipQCost)} (fully-loaded CDI team time: generation, review, tracking, physician follow-up). Mechanism: upstream documentation completeness eliminates the need for the query.
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6, marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Clinician Retention:</Text> AMA burnout data applied to {safe(data.annualTurnoverRate)}% turnover, {safe(data.burnoutRelatedTurnoverPct)}% burnout-related. Replacement cost {fmtCurrency(safe(data.replacementCostPerProvider))}. Modeled at {data.abridgeRetentionImpactLabel ?? "typical"} scenario. Validate via exit interview data.
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6, marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Rounding Efficiency:</Text> Qualitative. Time returned from documentation to direct patient care. Mechanism: documentation during the encounter, not after it.
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6, marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold", color: colors.primaryText }}>DRG Accuracy:</Text> {data.ipDrgScenario ?? "typical"} scenario {"\u2014"} {ipDrgOpRate}% of admissions carry a gap; Abridge closes {ipCapRate}% of those gaps. DRG weight lift {ipWeightLift} at {fmtCurrency(ipBasePayment)} base payment. {ipDrgRealize}% realization for RAC/PEPPER exposure.
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6, marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Obs/IP Defense:</Text> Documentation-sensitive observation denials. {safe(data.ipObsDefenseRealization)}% realization applied.
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              This assessment is for planning purposes. Realization rates are conservative and based on observed implementations. The goal is a framework for decisions, not a prediction. Validate with your organization{"\u2019"}s data post-implementation.
            </Text>

            <PageFooter pageNum={assessmentPageNum} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>
      </Document>
    );
  }

  if (isNursing) {
    const beds = safe(data.nursingStaffedBeds);
    const ftes = safe(data.nursingFTEs) || data.providers;
    const staffingTotal = safe(data.nursingStaffingTotal);
    const potentialTotal = safe(data.nursingPotentialTotal);
    const otVal = safe(data.nursingOtValue);
    const retVal = safe(data.nursingRetentionValue);
    const agencyVal = safe(data.nursingAgencyValue);
    const agencyOn = !!data.nursingAgencyEnabled;
    const hapiVal = safe(data.nursingHapiValue);
    const fallsVal = safe(data.nursingFallsValue);
    const hacPenaltyVal = safe(data.nursingHacPenalty);
    const cautiVal = safe(data.nursingCautiValue);
    const clabsiVal = safe(data.nursingClabsiValue);
    const sepsisVal = safe(data.nursingSepsisValue);
    const nursingTotalPages = 6;
    const costPerBedMo = beds > 0 ? Math.round(data.annualInvestment / beds / 12) : 0;
    const hardNetValue = staffingTotal - data.annualInvestment;
    const hardRoi = data.annualInvestment > 0 ? parseFloat((staffingTotal / data.annualInvestment).toFixed(1)) : 0;
    const netPerBed = beds > 0 ? Math.round(hardNetValue / beds) : 0;
    const hrsPerWk = safe(data.nursingHoursPerWeek);
    const hrsPerNurse = safe(data.nursingHoursPerNurse);
    const otPct = safe(data.nursingOtAllocationPct);
    const otHrsPerWk = safe(data.nursingOtHoursPerNurseWeek);
    const currentOtPerYear = safe(data.nursingCurrentOtPerYear);
    const otHrsElim = safe(data.nursingOtHoursEliminated);
    const patientDays = safe(data.nursingPatientDays);

    const nYear1Hard = staffingTotal;
    const nYear1Cost = data.annualInvestment;
    const nYear2Hard = Math.round(nYear1Hard * 1.10);
    const nYear2Cost = nYear1Cost;
    const nYear3Hard = Math.round(nYear2Hard * 1.10);
    const nYear3Cost = nYear1Cost;
    const nCum1 = nYear1Hard - nYear1Cost;
    const nCum2 = nCum1 + (nYear2Hard - nYear2Cost);
    const nCum3 = nCum2 + (nYear3Hard - nYear3Cost);
    const nYear3Roi = nYear3Cost > 0 ? (nYear3Hard / nYear3Cost).toFixed(1) : "0.0";

    const nFullScaleBeds = safe(data.nursingFullScaleBeds);
    const nFullScaleAdopt = safe(data.nursingFullScaleAdoption);
    const nFullScaleVal = safe(data.nursingFullScaleValue);
    const nFullScalePerBed = safe(data.nursingFullScalePerBed);
    const nFullScaleInv = nFullScaleBeds > 0 ? Math.round(data.annualInvestment * (nFullScaleBeds / beds)) : 0;
    const nFullScaleNet = nFullScaleVal - nFullScaleInv;
    const nFullScaleRoi = nFullScaleInv > 0 ? (nFullScaleVal / nFullScaleInv).toFixed(1) : "0.0";

    const qualityTotal = hapiVal + fallsVal + cautiVal + clabsiVal + sepsisVal;
    const workforceTotal = retVal + agencyVal;

    return (
      <Document>
        <PDFCoverPage
          reportLabel={config.coverLabel}
          title={orgName}
          subtitle={`${fmtNum(beds)} beds \u00B7 ${fmtNum(ftes)} nurse FTEs \u00B7 Inpatient Nursing`}
          preparedBy={data.preparedBy}
        />

        {/* NURSING PAGE 1: THE THESIS (4 BUCKETS) */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE THESIS</Text>
            <Text style={styles.sectionHeadline}>Where Nursing Value Actually Lives</Text>
            <Text style={styles.body}>
              Ambient documentation creates value across four distinct buckets. For nursing, three of them carry real dollars {"\u2014"} and one of them, honestly, doesn{"\u2019"}t apply. We separate them because the strategic implications of each are different.
            </Text>

            <View style={[styles.cardBg, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 12, color: colors.primaryText, marginBottom: 6 }}>
                Nurses don{"\u2019"}t bill. So where does the value live?
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                Nursing documentation creates value through quality (preventable harm and bundle compliance), workforce (retention and agency cost avoidance), and capacity (overtime reduction). Revenue {"\u2014"} the fourth bucket {"\u2014"} is where nursing intentionally doesn{"\u2019"}t play.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  QUALITY
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: qualityTotal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {qualityTotal > 0 ? fmtCurrency(qualityTotal) : "Not Modeled"}
                </Text>
                {qualityTotal > 0 && (
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>potential</Text>
                )}
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  Preventable harm events {"\u2014"} HAPIs, falls, CAUTI, CLABSI {"\u2014"} and sepsis bundle compliance are sensitive to documentation timing. The hypothesis we model: real-time flowsheet capture surfaces the visibility for earlier intervention, with each unit{"\u2019"}s actual outcome shaped by clinical practice.
                </Text>
              </View>

              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  WORKFORCE
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: workforceTotal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {workforceTotal > 0 ? fmtCurrency(workforceTotal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginTop: qualityTotal > 0 ? 12 : 0 }}>
                  Documentation burden is among the top drivers of nurse turnover. The hypothesis we model: reducing end-of-shift charting can move retention {"\u2014"} and the agency spend that follows every vacancy {"\u2014"} a number to validate against your own exit-interview and turnover data.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CAPACITY
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: otVal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {otVal > 0 ? fmtCurrency(otVal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  The hypothesis we model: when nurses finish charting before the end of their shift, more of them leave on time. Overtime reduction is the most direct, measurable labor-cost line in the model {"\u2014"} one to validate against your unit{"\u2019"}s payroll OT trend.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: "#F5F5F5" }}>
                <Text style={{ fontSize: 9, color: "#888888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "bold", color: "#888888", marginBottom: 4 }}>
                  Not Applicable
                </Text>
                <Text style={{ fontSize: 9, color: "#888888", lineHeight: 1.4 }}>
                  Nursing documentation doesn{"\u2019"}t generate billing revenue. The value lives in labor economics and care quality {"\u2014"} which is where we{"\u2019"}ve modeled it.
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                WHAT YOUR CHOICES REVEAL
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                {getNursingObservation(data)}
              </Text>
            </View>

            <PageFooter pageNum={1} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 2: QUALITY */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>QUALITY</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.2, marginBottom: 6 }}>
              Real-time documentation is the visibility layer{"\n"}that makes early intervention possible.
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 10 }}>
              Preventable harm events don{"\u2019"}t happen because nurses don{"\u2019"}t care {"\u2014"} they happen when risk signals are missed or delayed. The hypothesis we model: real-time flowsheet capture surfaces those signals while there{"\u2019"}s still time to act, with the actual outcome determined by clinical practice on each unit.
            </Text>

            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                The values below are <Text style={{ fontWeight: "bold" }}>potential</Text> {"\u2014"} they require clinical practice change alongside documentation improvement. Documentation creates the visibility; the care team creates the outcome. Validate baseline rates with your infection control and quality teams before presenting.
              </Text>
            </View>

            {data.nursingHapiEnabled && hapiVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>HAPI Risk Reduction</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(hapiVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>(potential)</Text></Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  At {safe(data.nursingHapiRatePer1000) || 2.5}/1,000 patient days across {fmtNum(patientDays)} patient days, your program sees approximately {(safe(data.nursingHapiPerYear) ?? 0).toFixed(1)} HAPIs per year. The hypothesis we model: when skin assessments are captured at the point of care rather than reconstructed at shift end, the visibility for earlier intervention improves. At a {safe(data.nursingHapiPreventionRate) || 6.5}% documentation-attributable prevention rate and {fmtCurrency(safe(data.nursingHapiCostPer) || 25000)}/event, that would translate to {fmtCurrency(hapiVal)} {"\u2014"} a potential to validate against your wound-care team{"\u2019"}s baseline.
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 3 }}>Source: Dowding et al., JAMIA 2012.</Text>
              </View>
            )}

            {data.nursingFallsEnabled && fallsVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>Fall Risk Visibility</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(fallsVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>(potential)</Text></Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  At {safe(data.nursingFallsRatePer1000) || 3.5}/1,000 patient days, your program sees approximately {(safe(data.nursingFallsPerYear) ?? 0).toFixed(1)} falls per year. The hypothesis we model: when Morse Fall Scale assessments are completed in real time rather than deferred to end of shift, risk escalations become visible to the care team when they matter. At a {safe(data.nursingFallsDocGapRate) || 10}% documentation-attributable prevention rate and {fmtCurrency(safe(data.nursingFallsCostPer) || 6500)}/event, that would translate to {fmtCurrency(fallsVal)} {"\u2014"} a potential to validate against your falls-prevention committee{"\u2019"}s data.
                </Text>
              </View>
            )}

            {data.nursingCautiEnabled && cautiVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>CAUTI Bundle Compliance</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(cautiVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>(potential)</Text></Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  The hypothesis we model: nurse-driven catheter stop orders and daily necessity assessments captured in real time create the visibility for earlier line removal. Across {fmtNum(safe(data.nursingCautiDaysPerYear))} catheter days at {safe(data.nursingCautiRatePer1000) || 1.8}/1,000, {(safe(data.nursingCautiPrevented) ?? 0).toFixed(1)} infections potentially avoided at {fmtCurrency(safe(data.nursingCautiCostPer) || 13000)} each would translate to {fmtCurrency(cautiVal)} {"\u2014"} validated against your infection-prevention team{"\u2019"}s baseline.
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 3 }}>Source: Meddings et al., 2014 JAMA Internal Medicine.</Text>
              </View>
            )}

            {data.nursingClabsiEnabled && clabsiVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>CLABSI Bundle Compliance</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(clabsiVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>(potential)</Text></Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  IHI bundle-compliance literature shows a 30{"\u2013"}66% CLABSI reduction range with full adherence. The hypothesis we model: real-time bundle documentation makes adherence visible at the bedside. Across {fmtNum(safe(data.nursingClabsiDaysPerYear))} central line days at {safe(data.nursingClabsiRatePer1000) || 0.8}/1,000, {(safe(data.nursingClabsiPrevented) ?? 0).toFixed(1)} infections potentially avoided at {fmtCurrency(safe(data.nursingClabsiCostPer) || 20000)} each would translate to {fmtCurrency(clabsiVal)} {"\u2014"} validated against your central-line audit data.
                </Text>
              </View>
            )}

            {data.nursingSepsisEnabled && sepsisVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>Sepsis SEP-1 Bundle Compliance</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(sepsisVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>(potential)</Text></Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  SEP-1 compliance requires timely documentation of sepsis recognition, lactate ordering, cultures, and antibiotic administration. The mechanism we{"\u2019"}re modeling: when those steps are captured as they happen rather than reconstructed later, the documentation lag piece of non-compliance shrinks. Of your {(safe(data.nursingSepsisPerYear) ?? 0).toFixed(0)} annual sepsis cases, {(100 - (safe(data.nursingSepsisCurrentCompliance) || 75)).toFixed(0)}% are currently non-compliant and {safe(data.nursingSepsisDocLagPercent) || 30}% of those involve a documentation lag rather than a care delivery gap. At {fmtCurrency(safe(data.nursingSepsisExcessCostPerCase) || 3500)} excess cost per delayed case and {safe(data.nursingSepsisRealization) || 60}% realization, that would translate to {fmtCurrency(sepsisVal)} {"\u2014"} validated against your sepsis-committee chart audits.
                </Text>
              </View>
            )}

            {data.nursingHacEnabled && (
              <View style={[styles.cardBg, { marginBottom: 6, backgroundColor: "#F5F5F5" }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>HAC Penalty Exposure</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: "#888888" }}>
                    {data.nursingHacBottomQuartile ? `${fmtCurrency(safe(data.nursingHacPenalty))} (risk only)` : "Risk Monitored"}
                  </Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  {data.nursingHacBottomQuartile
                    ? `Hospitals in the bottom HAC quartile receive a 1% reduction in all Medicare inpatient payments \u2014 ${fmtCurrency(safe(data.nursingHacPenalty))} annually on ${fmtCurrency(safe(data.nursingHacMedicareRevenue) || 50000000)} in Medicare revenue. Documentation completeness is a direct input to AHRQ PSI measures that drive HAC scoring. This is financial risk \u2014 improving documentation trajectory reduces your probability of remaining in the bottom quartile.`
                    : `Your program is not currently in the bottom HAC quartile. Documentation completeness is a protective factor that affects AHRQ PSI measures and HAC scoring trajectory. Monitor annually.`}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 3, fontStyle: "italic" }}>HAC penalty is not included in the primary ROI total.</Text>
              </View>
            )}

            {data.nursingHcahpsEnabled && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>HCAHPS / Patient Experience</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: "#888888" }}>Qualitative</Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Patient experience scores are sensitive to nursing presence and communication {"\u2014"} both of which improve when nurses spend less time at the workstation. HCAHPS performance affects Value-Based Purchasing scores and thus Medicare reimbursement, but the causal chain is indirect and organization-specific to size precisely.
                </Text>
              </View>
            )}

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 3: WORKFORCE & CAPACITY */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>WORKFORCE & CAPACITY</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.2, marginBottom: 6 }}>
              Documentation burden is the reason{"\n"}nurses leave. And the reason they stay late.
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 10 }}>
              These are two distinct budget lines {"\u2014"} turnover cost and overtime cost {"\u2014"} both directly driven by how long it takes to finish charting at the end of a shift.
            </Text>

            <Text style={styles.sectionLabelGray}>WORKFORCE</Text>

            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>Retention Savings</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: data.nursingRetentionEnabled && retVal > 0 ? colors.primary : "#888888" }}>
                  {data.nursingRetentionEnabled && retVal > 0 ? fmtCurrency(retVal) : "Not Selected"}
                </Text>
              </View>
              {data.nursingRetentionEnabled && retVal > 0 && (
                <>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    At {safe(data.nursingTurnoverRate) || 18}% annual turnover across {fmtNum(safe(data.nursingFTEs) || data.providers)} nurse FTEs, your program loses approximately {(safe(data.nursingNursesLeaving) ?? 0).toFixed(1)} nurses per year. Of those, an estimated {safe(data.nursingBurnoutPct) || 40}% leave for burnout-related reasons {"\u2014"} documentation burden among the most cited. The hypothesis we model: at a {safe(data.nursingRetentionImpactPct) || 15}% impact on burnout-driven departures, {(safe(data.nursingNursesRetained) ?? 0).toFixed(1)} nurses would be retained at {fmtCurrency(safe(data.nursingReplacementCost) || 56300)} replacement cost, pointing to {fmtCurrency(retVal)} {"\u2014"} a number to validate against your own exit-interview and turnover data over 12{"\u2013"}18 months.
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 3 }}>Source: NSI Nursing Solutions, 2023 National Health Care Retention Report. Replacement cost includes recruitment, onboarding, and productivity ramp to full effectiveness.</Text>
                </>
              )}
            </View>

            {agencyOn && agencyVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>Agency Cost Avoidance</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(agencyVal)}</Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Every nurse retained avoids a vacancy that would otherwise be filled with agency staff. At {safe(data.nursingAgencyWeeks) || 12} weeks of agency coverage per vacancy at {fmtCurrency(safe(data.nursingAgencyPremium) || 2500)}/week premium, the modeled {(safe(data.nursingNursesRetained) ?? 0).toFixed(1)} retained nurses would translate to {fmtCurrency(agencyVal)} in avoided agency premium {"\u2014"} validated against your contract-labor spend trend.
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Workforce Subtotal</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>
                {workforceTotal > 0 ? fmtCurrency(workforceTotal) : "Not Modeled"}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>CAPACITY</Text>

            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>OT Reduction</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: data.nursingOtEnabled && otVal > 0 ? colors.primary : "#888888" }}>
                  {data.nursingOtEnabled && otVal > 0 ? fmtCurrency(otVal) : "Not Selected"}
                </Text>
              </View>
              {data.nursingOtEnabled && otVal > 0 && (
                <>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    The hypothesis we model: when nurses complete their documentation before the end of shift rather than after it, more of them leave on time. At {safe(data.nursingOtHoursPerNurseWeek) || 1.0} overtime hours per nurse per week, a {safe(data.nursingOtReductionPercent) || 40}% reduction across {fmtNum(safe(data.nursingFTEs) || data.providers)} nurses would translate to {fmtNum(otHrsElim)} OT hours per year at {fmtCurrency(safe(data.nursingOtHourlyRate) || 75)}/hour, or {fmtCurrency(otVal)} {"\u2014"} validated against your unit{"\u2019"}s payroll OT trend.
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 3, fontStyle: "italic" }}>Overtime reduction is the most direct, immediately measurable labor cost savings in this model. It does not depend on clinical practice change {"\u2014"} only documentation speed.</Text>
                </>
              )}
            </View>

            <View style={styles.divider} />

            <View style={[styles.cardBg, { padding: 0, flexDirection: "row" }]}>
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(patientDays)}</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>patient days/year</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>
                  {(safe(data.hoursReturned) / (safe(data.nursingFTEs) || data.providers || 1) / 52).toFixed(1)}
                </Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>hrs/week per nurse</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(beds)}</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>staffed beds</Text>
              </View>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 4: REVENUE (HONEST N/A) */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>REVENUE</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.2, marginBottom: 10 }}>
              Nursing documentation doesn{"\u2019"}t generate billing revenue.{"\n"}That{"\u2019"}s by design {"\u2014"} and it{"\u2019"}s worth saying directly.
            </Text>

            <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 10 }}>
              Every other care setting in this model has a revenue optimization story {"\u2014"} wRVU lift, DRG accuracy, denial prevention. Nursing doesn{"\u2019"}t. Nurses don{"\u2019"}t bill. Their documentation drives care quality and labor economics, not the revenue cycle.
            </Text>

            <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 12 }}>
              We{"\u2019"}ve modeled the value where it actually lives: in the QUALITY bucket (preventable harm events, sepsis bundle compliance) and the WORKFORCE and CAPACITY buckets (retention, agency cost avoidance, overtime reduction). Presenting a nursing revenue story that doesn{"\u2019"}t exist would undermine the credibility of the model that does.
            </Text>

            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                WHAT THIS MEANS FOR YOUR PRESENTATION
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                When a CFO asks where the nursing revenue story is, the answer is: there isn{"\u2019"}t one {"\u2014"} and that{"\u2019"}s the point. The ROI case for nursing ambient AI is a labor economics and care quality story. It stands on its own. You don{"\u2019"}t need to manufacture a billing narrative to make it compelling.
              </Text>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                THE INDIRECT CONNECTION
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                Complete nursing documentation does create downstream organizational value: HCAHPS performance affects Value-Based Purchasing scores. HAC scores affect Medicare payment rates. Sepsis SEP-1 compliance affects public reporting and payer relationships. These are real {"\u2014"} they{"\u2019"}re just not direct billing revenue, and we{"\u2019"}ve modeled them as quality outcomes rather than revenue line items, which is the more defensible framing.
              </Text>
            </View>

            <PageFooter pageNum={4} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 5: THE INVESTMENT CASE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
            <Text style={styles.sectionHeadline}>Infrastructure, Not Expense</Text>
            <Text style={styles.body}>
              The investment is {fmtCurrency(data.annualInvestment)} annually {"\u2014"} {fmtCurrency(costPerBedMo)} per bed per month. It does not change as value grows. Years 2{"\u2013"}3 assume 10% growth as adoption matures and documentation habits improve across the unit.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>3-YEAR PROJECTION (HARD VALUE)</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Period</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Investment</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Net Value</Text>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Cumulative</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

              {[
                { period: "Year 1", value: nYear1Hard, cost: nYear1Cost, net: nYear1Hard - nYear1Cost, cum: nCum1 },
                { period: "Year 2", value: nYear2Hard, cost: nYear2Cost, net: nYear2Hard - nYear2Cost, cum: nCum2 },
                { period: "Year 3", value: nYear3Hard, cost: nYear3Cost, net: nYear3Hard - nYear3Cost, cum: nCum3 },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText }}>{row.period}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.cost)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                By Year 3, you{"\u2019"}re generating {nYear3Roi}{"\u00D7"} for every $1 invested {"\u2014"} while your nursing staff spends more time at the bedside and less time charting after their shift.
              </Text>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>AT SCALE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              Per-bed economics hold as the program expands to more units.
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CURRENT MODEL
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {fmtCurrency(hardNetValue)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(beds)} beds</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}% adoption</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>Per bed: ~{fmtCurrency(netPerBed)}/yr</Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  AT FULL SCALE
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                  {fmtCurrency(nFullScaleNet)}/yr
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(nFullScaleBeds)} beds</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{nFullScaleAdopt}% adoption</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>Per bed: ~{fmtCurrency(nFullScalePerBed)}/yr</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>KEY METRICS TO TRACK</Text>
            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                1. Documentation time per shift (target: {"\u2013"}40%)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                2. Nurse satisfaction / burnout score (target: +15 pts)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                3. Overtime hours per FTE per week (target: {"\u2013"}25%)
              </Text>
            </View>

            <PageFooter pageNum={5} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 6: YOUR ASSESSMENT (4-BUCKET) */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

            <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 14, paddingHorizontal: 18 }]}>
              <Text style={{ fontSize: 16, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(beds)} staffed beds. {fmtNum(ftes)} nurse FTEs.
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(hardNetValue)} projected net value.
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>
                {fmtCurrency(netPerBed)} per bed per year.
              </Text>
            </View>

            <Text style={styles.sectionLabelGray}>VALUE SUMMARY</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              {/* QUALITY */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>QUALITY</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>
                  {qualityTotal > 0 ? `${fmtCurrency(qualityTotal)} (potential)` : "Not Modeled"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>HAPI Risk Reduction</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingHapiEnabled ? `${fmtCurrency(hapiVal)} (potential)` : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>Fall Risk Visibility</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingFallsEnabled ? `${fmtCurrency(fallsVal)} (potential)` : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>CAUTI Compliance</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingCautiEnabled ? `${fmtCurrency(cautiVal)} (potential)` : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>CLABSI Compliance</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingClabsiEnabled ? `${fmtCurrency(clabsiVal)} (potential)` : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>Sepsis SEP-1</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingSepsisEnabled ? `${fmtCurrency(sepsisVal)} (potential)` : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>HAC Penalty</Text>
                <Text style={{ fontSize: 8.5, color: "#888888", fontStyle: "italic" }}>{data.nursingHacEnabled && data.nursingHacBottomQuartile ? `${fmtCurrency(hacPenaltyVal)} (risk only)` : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>HCAHPS</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>Qualitative</Text>
              </View>

              <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border, marginVertical: 4 }} />

              {/* WORKFORCE */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>WORKFORCE</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>
                  {workforceTotal > 0 ? fmtCurrency(workforceTotal) : "Not Modeled"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 1 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>Retention Savings</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingRetentionEnabled ? fmtCurrency(retVal) : "\u2014"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>Agency Cost Avoidance</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingAgencyEnabled && data.nursingRetentionEnabled ? fmtCurrency(agencyVal) : "\u2014"}</Text>
              </View>

              <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border, marginVertical: 4 }} />

              {/* CAPACITY */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>CAPACITY</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>
                  {data.nursingOtEnabled && otVal > 0 ? fmtCurrency(otVal) : "Not Modeled"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>OT Reduction</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingOtEnabled ? fmtCurrency(otVal) : "\u2014"}</Text>
              </View>

              <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border, marginVertical: 4 }} />

              {/* REVENUE */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: "#888888" }}>REVENUE</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: "#888888" }}>Not Applicable</Text>
              </View>
              <Text style={{ fontSize: 8.5, color: "#888888", paddingLeft: 10, fontStyle: "italic", marginBottom: 4 }}>
                Nursing documentation does not generate billing revenue.
              </Text>

              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>Net Annual Value (Hard)</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(hardNetValue)}</Text>
              </View>
            </View>

            <View style={styles.thickDivider} />

            <Text style={styles.sectionLabel}>METHODOLOGY</Text>
            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                <Text style={{ fontWeight: "bold" }}>HAPI:</Text> {safe(data.nursingHapiRatePer1000) || 2.5}/1,000 patient days. {safe(data.nursingHapiPreventionRate) || 6.5}% documentation-attributable prevention rate. {fmtCurrency(safe(data.nursingHapiCostPer) || 25000)}/event. Source: Dowding et al., JAMIA 2012. Potential value {"\u2014"} requires clinical practice change.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>Falls:</Text> {safe(data.nursingFallsRatePer1000) || 3.5}/1,000 patient days. {safe(data.nursingFallsDocGapRate) || 10}% documentation-attributable prevention rate. {fmtCurrency(safe(data.nursingFallsCostPer) || 6500)}/event. Potential value {"\u2014"} requires clinical practice change.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>CAUTI:</Text> {safe(data.nursingCautiPreventionRate) || 12}% documentation-timing contribution to bundle compliance. {fmtCurrency(safe(data.nursingCautiCostPer) || 13000)}/infection. Source: Meddings et al., 2014 JAMA IM.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>CLABSI:</Text> {safe(data.nursingClabsiPreventionRate) || 8}% documentation-timing contribution. {fmtCurrency(safe(data.nursingClabsiCostPer) || 20000)}/infection.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>Sepsis SEP-1:</Text> Documentation-lag cases only. {safe(data.nursingSepsisDocLagPercent) || 30}% of non-compliant cases have documentation lag as root cause. {fmtCurrency(safe(data.nursingSepsisExcessCostPerCase) || 3500)} excess cost/case. {safe(data.nursingSepsisRealization) || 60}% realization.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>HAC Penalty:</Text> 1% of Medicare revenue if in bottom quartile. Risk display only {"\u2014"} not included in ROI total.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>Retention:</Text> {safe(data.nursingTurnoverRate) || 18}% annual turnover, {safe(data.nursingBurnoutPct) || 40}% burnout-related. {safe(data.nursingRetentionImpactPct) || 15}% impact scenario. {fmtCurrency(safe(data.nursingReplacementCost) || 56300)} replacement cost. Source: NSI Nursing Solutions 2023.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>Agency Cost Avoidance:</Text> {safe(data.nursingAgencyWeeks) || 12} weeks coverage per vacancy at {fmtCurrency(safe(data.nursingAgencyPremium) || 2500)}/week premium.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>OT Reduction:</Text> {safe(data.nursingOtHoursPerNurseWeek) || 1.0} OT hrs/nurse/week at {safe(data.nursingOtReductionPercent) || 40}% reduction. {fmtCurrency(safe(data.nursingOtHourlyRate) || 75)}/hour.{"\n\n"}
                <Text style={{ fontWeight: "bold" }}>Revenue:</Text> Not applicable. Nursing documentation does not generate billing revenue.
              </Text>
            </View>

            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              This assessment is for planning purposes. Hard value projections are based on user-provided staffing inputs. Potential value uses published clinical rates with halved attribution to reflect the indirect causal chain. Validate with your organization{"\u2019"}s data post-implementation.
            </Text>

            <PageFooter pageNum={6} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <PDFCoverPage
        reportLabel={config.coverLabel}
        title={orgName}
        subtitle={config.coverSubtitle(data)}
        preparedBy={data.preparedBy}
      />

      {/* PAGE 1: THE THESIS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE THESIS</Text>

          <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 8 }]}>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
              {config.coverSubtitle(data)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  {isQualitativeOnly ? "ASSESSMENT TYPE" : "PROJECTED NET ANNUAL VALUE"}
                </Text>
                <Text style={{ fontSize: isQualitativeOnly ? 24 : 36, fontWeight: "bold", color: colors.primary }}>
                  {isQualitativeOnly ? "Qualitative Assessment" : fmtCurrency(derivedNetValue)}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
              {config.thesisQuestion}
            </Text>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(unitCount)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{config.providerTypePlural}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{isNursing ? fmtNum(data.hoursReturned) : fmtNum(data.encounters)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{isNursing ? "hours saved" : "encounters"}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{data.utilizationPercent}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{isNursing ? "adoption" : "utilization"}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(data.annualInvestment)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>investment</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>TWO SOURCES OF VALUE</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
            {config.thesisParagraph}
          </Text>

          <View style={styles.divider} />

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                {config.source1Label}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: timeIsQualitativeOnly ? colors.secondary : colors.primaryText, marginBottom: 4 }}>
                {timeTotal > 0 ? fmtCurrency(timeTotal) : timeIsQualitativeOnly ? "Qualitative" : "Not Measured"}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                {timeIsQualitativeOnly
                  ? `Selected drivers (${qualDrivers.join(", ")}) represent strategic value that is not easily dollarized.`
                  : timeTotal === 0
                    ? "No time-based drivers were selected for this assessment."
                    : config.source1Description}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                {config.source1Tagline}
              </Text>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                {config.source2Label}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: docIsNotMeasured ? colors.secondary : colors.primary, marginBottom: 4 }}>
                {docTotal > 0 ? fmtCurrency(docTotal) : "Not Measured"}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                {docIsNotMeasured
                  ? "No documentation quality drivers were selected for this assessment."
                  : config.source2Description}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                {config.source2Tagline}
              </Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              STRATEGIC OBSERVATION
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {config.strategicObservation(data)}
            </Text>
          </View>

          <PageFooter pageNum={1} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>

      {/* PAGE 2: VALUE DRIVERS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
          <Text style={styles.sectionHeadline}>How Time Becomes Value</Text>
          <Text style={styles.body}>
            {config.page2Intro(data)}
          </Text>

          <View style={styles.divider} />

          {isQualitativeOnly && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.sectionLabelGray}>QUALITATIVE DRIVERS</Text>
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                {qualDrivers.map((name, i) => (
                  <View key={i}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.secondary, marginRight: 10, borderRadius: 1, minHeight: 30 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.secondary }}>Qualitative</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                          Strategic value that supports clinician experience and organizational sustainability.
                        </Text>
                      </View>
                    </View>
                    {i < qualDrivers.length - 1 && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
                    )}
                  </View>
                ))}
                <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  These drivers represent strategic value that is not easily dollarized. They are meaningful indicators of clinician experience, retention risk, and practice sustainability.
                </Text>
              </View>
            </View>
          )}

          {timeDrivers.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.sectionLabelGray}>{config.source1Label}</Text>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                {timeDrivers.map((driver, i) => (
                  <View key={driver.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(driver.value)}</Text>
                        </View>
                        {driver.calcSteps && driver.calcSteps.map((step, si) => (
                          <Text key={si} style={{ fontSize: 9, color: si === driver.calcSteps!.length - 1 ? colors.primary : colors.secondary, lineHeight: 1.5, fontWeight: si === driver.calcSteps!.length - 1 ? "bold" : "normal" }}>
                            {step}
                          </Text>
                        ))}
                        {driver.calibrationNote && (
                          <Text style={{ fontSize: 8.5, color: colors.tertiary, marginTop: 2 }}>
                            {driver.calibrationNote}
                          </Text>
                        )}
                      </View>
                    </View>
                    {i < timeDrivers.length - 1 && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
                    )}
                  </View>
                ))}
                <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{config.source1Label} Subtotal</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(timeTotal)}</Text>
                </View>
              </View>
            </View>
          )}

          {docDrivers.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={styles.divider} />
              <Text style={{ ...styles.sectionLabel, marginBottom: 8 }}>{config.source2Label}</Text>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                {docDrivers.map((driver, i) => (
                  <View key={driver.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(driver.value)}</Text>
                        </View>
                        {driver.calcSteps && driver.calcSteps.map((step, si) => (
                          <Text key={si} style={{ fontSize: 9, color: si === driver.calcSteps!.length - 1 ? colors.primary : colors.secondary, lineHeight: 1.5, fontWeight: si === driver.calcSteps!.length - 1 ? "bold" : "normal" }}>
                            {step}
                          </Text>
                        ))}
                        {driver.calibrationNote && (
                          <Text style={{ fontSize: 8.5, color: colors.tertiary, marginTop: 2 }}>
                            {driver.calibrationNote}
                          </Text>
                        )}
                      </View>
                    </View>
                    {i < docDrivers.length - 1 && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
                    )}
                  </View>
                ))}
                <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{config.source2Label} Subtotal</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(docTotal)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.thickDivider} />

          <View style={[styles.cardBg, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
            <View>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {isQualitativeOnly ? "ASSESSMENT TYPE" : "PROJECTED ANNUAL VALUE"}
              </Text>
              <Text style={{ fontSize: isQualitativeOnly ? 18 : 28, fontWeight: "bold", color: colors.primary }}>
                {isQualitativeOnly ? "Qualitative Assessment" : fmtCurrency(derivedNetValue)}
              </Text>
            </View>
            {!isQualitativeOnly && (
              <Text style={{ fontSize: 10, color: colors.secondary }}>
                Per {config.providerType}: ~{fmtCurrency(perUnit)}/year
              </Text>
            )}
          </View>

          <PageFooter pageNum={2} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>

      {/* PAGE 3: THE INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
          <Text style={styles.sectionHeadline}>{isQualitativeOnly ? "Building the Case" : "Infrastructure, Not Expense"}</Text>
          <Text style={styles.body}>
            {isQualitativeOnly
              ? `This assessment focused on qualitative drivers${qualDrivers.length > 0 ? ` (${qualDrivers.join(", ")})` : ""}. These represent strategic value\u2014clinician experience, retention signal, and practice sustainability\u2014that is meaningful but not easily dollarized.`
              : `Investment stays flat while value grows. This is the signature of infrastructure\u2014fixed cost, scaling returns.`}
          </Text>

          <View style={styles.divider} />

          {isQualitativeOnly ? (
            <>
              <Text style={styles.sectionLabelGray}>QUALITATIVE VALUE FRAMEWORK</Text>
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6, marginBottom: 8 }}>
                  The drivers you selected represent value that is real but difficult to express in dollars. Organizations that invest based on these drivers typically see returns in:
                </Text>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9.5, color: colors.primaryText, lineHeight: 1.7 }}>{"\u2022"} Clinician satisfaction and retention (reduced turnover costs)</Text>
                  <Text style={{ fontSize: 9.5, color: colors.primaryText, lineHeight: 1.7 }}>{"\u2022"} Practice sustainability and competitive positioning</Text>
                  <Text style={{ fontSize: 9.5, color: colors.primaryText, lineHeight: 1.7 }}>{"\u2022"} Work-life balance and reduced after-hours documentation</Text>
                  <Text style={{ fontSize: 9.5, color: colors.primaryText, lineHeight: 1.7 }}>{"\u2022"} Patient experience through more present clinicians</Text>
                </View>
              </View>

              <View style={styles.calloutBox}>
                <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                  To build a financial investment case, consider enabling quantitative levers like Patient Access, wRVU Improvement, or Cost Reduction alongside your qualitative assessment.
                </Text>
              </View>

              <View style={styles.thickDivider} />

              <Text style={styles.sectionLabelGray}>KEY METRICS TO TRACK</Text>
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                {config.keyMetrics.map((metric, i) => (
                  <Text key={i} style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                    {metric}
                  </Text>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabelGray}>3-YEAR PROJECTION</Text>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", marginBottom: 6 }}>
                  <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Period</Text>
                  <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Value</Text>
                  <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Investment</Text>
                  <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Net Value</Text>
                  <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Cumulative</Text>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

                {[
                  { period: "Year 1", value: year1Value, cost: year1Cost, net: year1Value - year1Cost, cum: cumulative1 },
                  { period: "Year 2", value: year2Value, cost: year2Cost, net: year2Value - year2Cost, cum: cumulative2 },
                  { period: "Year 3", value: year3Value, cost: year3Cost, net: year3Value - year3Cost, cum: cumulative3 },
                ].map((row, i) => (
                  <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                    <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText }}>{row.period}</Text>
                    <Text style={{ flex: 1, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                    <Text style={{ flex: 1, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.cost)}</Text>
                    <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                    <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calloutBox}>
                <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                  By Year 3, you{"\u2019"}re generating {year3Roi}{"\u00D7"} for every $1 invested. That{"\u2019"}s not a line item to cut in a downturn{"\u2014"}it{"\u2019"}s infrastructure to protect.
                </Text>
              </View>

              <View style={styles.thickDivider} />

              <Text style={styles.sectionLabel}>AT SCALE</Text>
              <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>
                Per-{config.providerType} economics remain consistent at scale.
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                <View style={[styles.cardBg, { flex: 1 }]}>
                  <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                    CURRENT MODEL
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                    {fmtCurrency(derivedNetValue)}/yr
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>
                    {fmtNum(unitCount)} {config.providerTypePlural}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>
                    {data.utilizationPercent}% utilization
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>
                    Per {config.providerType}: ~{fmtCurrency(perUnit)}/yr
                  </Text>
                </View>

                <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                  <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                    AT FULL SCALE
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                    {fmtCurrency(fullScaleNetValue)}/yr
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>
                    {fmtNum(data.fullScaleProviders)} {config.providerTypePlural}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>
                    {data.fullScaleUtilization}% utilization
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>
                    Per {config.providerType}: ~{fmtCurrency(perUnitFullScale)}/yr
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionLabelGray}>KEY METRICS TO TRACK</Text>
              <View style={[styles.cardBg, { marginBottom: 6 }]}>
                {config.keyMetrics.map((metric, i) => (
                  <Text key={i} style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                    {metric}
                  </Text>
                ))}
              </View>
            </>
          )}

          <PageFooter pageNum={3} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>

      {/* PAGE 4: YOUR SUMMARY + METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

          <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 16, paddingHorizontal: 20 }]}>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(unitCount)} {config.providerTypePlural}.
            </Text>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {isNursing ? `${fmtNum(data.hoursReturned)} hours saved.` : `${fmtNum(data.encounters)} encounters.`}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              {isQualitativeOnly ? "Qualitative Assessment" : `${fmtCurrency(derivedNetValue)} projected net value.`}
            </Text>
            {!isQualitativeOnly && (
              <Text style={{ fontSize: 11, color: colors.secondary }}>
                {fmtCurrency(perUnit)} per {config.providerType} per year.
              </Text>
            )}
            {isQualitativeOnly && (
              <Text style={{ fontSize: 11, color: colors.secondary }}>
                {qualDrivers.length} qualitative driver{qualDrivers.length !== 1 ? "s" : ""} assessed.
              </Text>
            )}
          </View>

          <View style={[styles.calloutBox, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
              {config.closingInsight}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                VALUE SUMMARY
              </Text>
              {isQualitativeOnly && qualDrivers.length > 0 && (
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>Qualitative Drivers</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.secondary }}>Qualitative</Text>
                  </View>
                  {qualDrivers.map((name, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                      <Text style={{ fontSize: 8.5, color: colors.secondary }}>{name}</Text>
                      <Text style={{ fontSize: 8.5, color: colors.secondary }}>{"\u2014"}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!isQualitativeOnly && (
                <>
                  <View style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{config.source1Label}</Text>
                      <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                        {timeTotal > 0 ? fmtCurrency(timeTotal) : timeIsQualitativeOnly ? "Qualitative" : "Not Measured"}
                      </Text>
                    </View>
                    {timeDrivers.map((d) => (
                      <View key={d.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                        <Text style={{ fontSize: 8.5, color: colors.secondary }}>{d.name}</Text>
                        <Text style={{ fontSize: 8.5, color: colors.secondary }}>{fmtCurrency(d.value)}</Text>
                      </View>
                    ))}
                    {hasQualitative && qualDrivers.map((name, i) => (
                      <View key={`q-${i}`} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                        <Text style={{ fontSize: 8.5, color: colors.secondary }}>{name}</Text>
                        <Text style={{ fontSize: 8.5, color: colors.secondary }}>Qualitative</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{config.source2Label}</Text>
                      <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                        {docTotal > 0 ? fmtCurrency(docTotal) : "Not Measured"}
                      </Text>
                    </View>
                    {docDrivers.map((d) => (
                      <View key={d.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                        <Text style={{ fontSize: 8.5, color: colors.secondary }}>{d.name}</Text>
                        <Text style={{ fontSize: 8.5, color: colors.secondary }}>{fmtCurrency(d.value)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>
                  {isQualitativeOnly ? "Assessment Type" : "Net Annual Value"}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>
                  {isQualitativeOnly ? "Qualitative" : fmtCurrency(derivedNetValue)}
                </Text>
              </View>
            </View>

            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                {isQualitativeOnly ? "ASSESSMENT DETAILS" : "INVESTMENT SUMMARY"}
              </Text>
              <View style={{ marginBottom: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Annual Investment</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(data.annualInvestment)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Per {config.providerType}</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(unitCount > 0 ? data.annualInvestment / unitCount : 0)}</Text>
                </View>
                {!isQualitativeOnly && (
                  <>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={{ fontSize: 9, color: colors.secondary }}>Year 1 ROI</Text>
                      <Text style={{ fontSize: 9, color: colors.secondary }}>{derivedRoi.toFixed(1)}{"\u00D7"}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ fontSize: 9, color: colors.secondary }}>Year 3 Cumulative</Text>
                      <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(cumulative3)}</Text>
                    </View>
                  </>
                )}
                {isQualitativeOnly && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Financial ROI</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{"\u2014"}</Text>
                  </View>
                )}
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                UTILIZATION
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Projected</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}%</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Hours Returned</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>
                  {data.hoursReturned > 0 ? fmtNum(data.hoursReturned) : isQualitativeOnly ? "\u2014" : "0"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Per {config.providerType}/week</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>
                  {data.hoursReturned > 0 && unitCount > 0
                    ? `${(data.hoursReturned / unitCount / 52).toFixed(1)} hrs`
                    : isQualitativeOnly ? "\u2014" : "0 hrs"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>METHODOLOGY</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                YOUR INPUTS
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {fmtNum(unitCount)} {config.providerTypePlural}{"\n"}
                {isNursing ? `${fmtNum(data.hoursReturned)} hours saved` : `${fmtNum(data.encounters)} encounters`}{"\n"}
                {data.utilizationPercent}% {isNursing ? "adoption" : "utilization"}{"\n"}
                {isNursing ? "" : `${data.minutesSavedPerEncounter} min saved\n`}
                {fmtCurrency(data.annualInvestment)} investment{"\n"}
                {fmtNum(data.hoursReturned)} hrs returned
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                REALIZATION RATES
              </Text>
              {realizationRates.length > 0 ? (
                realizationRates.map((r, i) => (
                  <Text key={i} style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                    {r.name}: {r.rate}
                  </Text>
                ))
              ) : (
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                  Values use conservative{"\n"}realization rates based on{"\n"}observed implementations.
                </Text>
              )}
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7, marginTop: 4 }}>
                Conservative by design.{"\n"}Based on observed{"\n"}implementations.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
            This assessment is for planning purposes. {isQualitativeOnly
              ? `This assessment focused on qualitative drivers that represent strategic value not easily expressed in financial terms. Where "Qualitative" or "\u2014" appears, it indicates intentionally non-dollarized value rather than missing data.`
              : `Realization rates are conservative and based on observed implementations.`} The goal is a framework for decisions, not a prediction. Validate with your organization{"\u2019"}s data post-implementation.
          </Text>

          <PageFooter pageNum={4} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>
    </Document>
  );
};

export const generateExplorePDF = async (data: ExplorePDFData): Promise<void> => {
  const blob = await pdf(<ExplorePDFDocument data={data} />).toBlob();

  const config = SETTING_CONFIGS[data.careSetting];
  const orgName = data.clientName ? data.clientName.replace(/[^a-zA-Z0-9]/g, "_") : "Organization";
  const settingSlug = data.careSetting === "ed" ? "ED" : config.label.replace(/\s+/g, "_");
  const fileName = `Abridge_${settingSlug}_Analysis_${orgName}.pdf`;

  await savePdfBlob(blob, fileName);
};

export default ExplorePDFDocument;
