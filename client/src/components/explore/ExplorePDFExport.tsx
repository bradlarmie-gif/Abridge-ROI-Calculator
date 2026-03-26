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
  ipDrgEnabled?: boolean;
  ipCdiQueryRate?: number;
  ipTotalCDIQueries?: number;
  ipQueriesAvoidedRate?: number;
  ipQueriesAvoided?: number;
  ipCostPerQuery?: number;
  ipCdiValue?: number;
  ipCdiEnabled?: boolean;
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

const ValueDriversGlanceBlock = ({ drivers, formatValue }: { drivers: ExploreDriver[]; formatValue: (n: number) => string }) => {
  const activeDrivers = drivers.filter(d => d.value > 0);
  if (activeDrivers.length === 0) return null;
  return (
    <View style={{ backgroundColor: colors.cards, borderRadius: 4 }}>
      {activeDrivers.map((driver, i) => (
        <View key={i} style={{ paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: i < activeDrivers.length - 1 ? 0.5 : 0, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <View style={{ width: 3, height: 16, backgroundColor: driver.category === "time" ? colors.primary : "#1A6B4A", borderRadius: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
              <Text style={{ fontSize: 7.5, color: "#888888", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>{driver.category === "time" ? "Time Recaptured" : "Documentation Quality"}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>{formatValue(driver.value)}</Text>
        </View>
      ))}
    </View>
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
    thesisParagraph: "Ambient documentation creates value in two distinct ways: by returning time to providers (which translates to capacity and clinician sustainability) and by improving documentation quality (which captures revenue that already exists but isn't being coded).",
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
        return `Your assessment focused on qualitative drivers (${d.qualitativeDrivers.join(", ")}). These represent strategic value\u2014rounding efficiency, hospitalist experience, and retention signal\u2014that is meaningful but not easily dollarized. To build a financial case, consider enabling Clinician Wellbeing with retention modeling, DRG Accuracy, or Denial Prevention.`;
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
    obs = `Your organization modeled ${visitsPerWk} additional visits per provider per week, using ~${capPct}% of recovered time for scheduling capacity. The remaining time flows into documentation quality and clinician sustainability${hasRetention ? ", including a quantified retention model" : ""}. That\u2019s a deliberate balance between near-term revenue and long-term workforce protection.`;
  } else if (data.patientAccessEnabled && capPct >= 40) {
    obs = `Your model is capacity-driven \u2014 ${visitsPerWk} additional visits per provider per week uses ~${capPct}% of recovered documentation time. That\u2019s the most direct line from documentation efficiency to revenue. The remaining ${100 - capPct}% adds a buffer against burnout without making it the headline.`;
  } else if (susPct >= 30 || hasRetention) {
    obs = `You put real weight on clinician sustainability${hasRetention ? ", including a quantified retention model" : ""}. That\u2019s a leadership signal: this isn\u2019t just a revenue initiative. Protecting providers from documentation burden protects the organization from turnover costs that dwarf the investment.`;
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
    const driverList = activeQual.length > 0 ? activeQual.join(", ") : "Rounding Efficiency, Clinician Wellbeing";
    return `Your model is built on qualitative drivers (${driverList}). These represent strategic value \u2014 rounding efficiency, hospitalist experience, and retention signal \u2014 that is meaningful but not easily dollarized. To build a financial case, consider enabling Clinician Wellbeing with retention modeling or activating documentation quality drivers.`;
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

  const opHasDocQuality = isOutpatient && !!(data.wrvuEnabled || data.hccEnabled || data.denialEnabled);
  const totalPages = isOutpatient ? (opHasDocQuality ? 6 : 5) : 5;

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
        return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually. You chose to apply this time to clinician wellbeing \u2014 a signal that retention and sustainability are the priority right now.`;
      }
      return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually.`;
    })();

    const activatedDocDriversList: string[] = [];
    if (data.wrvuEnabled && safe(data.annualWrvuValue) > 0) activatedDocDriversList.push(`wRVU improvement (${fmtCurrency(safe(data.annualWrvuValue))})`);
    if (data.hccEnabled && safe(data.annualHccValue) > 0) activatedDocDriversList.push(`HCC capture (${fmtCurrency(safe(data.annualHccValue))})`);
    if (data.denialEnabled && safe(data.annualDenialValue) > 0) activatedDocDriversList.push(`denial prevention (${fmtCurrency(safe(data.annualDenialValue))})`);

    let investmentPageNum = opHasDocQuality ? 5 : 4;
    let assessmentPageNum = opHasDocQuality ? 6 : 5;

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

            <Text style={styles.sectionLabel}>TWO SOURCES OF VALUE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              Ambient documentation creates value in two distinct ways. The first is time: when providers spend less time on notes, that time can flow back to patients, to breathing room, or to both. The second is documentation quality: when notes fully capture the complexity of what happened in the room, the revenue that was already earned gets properly coded and collected.
            </Text>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  TIME RECAPTURED
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {effVal > 0 ? fmtCurrency(effVal) : "Not Measured"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  {timeRecapturedCopy}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  The constraint is time. This is what changes when documentation gets faster.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE OPTIMIZED
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: opHasDocQuality ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {docQualVal > 0 ? fmtCurrency(docQualVal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  {opHasDocQuality
                    ? `Better notes capture the complexity that\u2019s already there. ${activatedDocDriversList.join(", ")}. The notes drive the revenue.`
                    : `No documentation quality drivers were selected for this assessment. wRVU improvement, HCC capture, and denial prevention are available to model \u2014 most organizations explore these at their 90-day review once baseline adoption is established.`}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  {opHasDocQuality ? "The notes drive the revenue." : ""}
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

        {/* OUTPATIENT PAGE 2: THE WORKFORCE BEHIND THE NUMBERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE WORKFORCE BEHIND THE NUMBERS</Text>
            <Text style={{ fontSize: 26, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.15, marginBottom: 4 }}>
              5 hours in the EHR.{"\n"}For every 8 hours with patients.
            </Text>
            <Text style={{ fontSize: 10, color: "#888888", lineHeight: 1.4, marginBottom: 16 }}>
              That{"\u2019"}s not a documentation problem.{"\n"}That{"\u2019"}s a workforce problem {"\u2014"} and it{"\u2019"}s why time is{"\n"}the most strategic asset in this model.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.calloutBox, { marginBottom: 0 }]}>
              <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.5 }}>
                Healthcare spent the last two decades optimizing for throughput, revenue capture, and compliance. The clinician{"\u2019"}s time was the variable that absorbed everything else. The result is a physician workforce where 43% report burnout symptoms {"\u2014"} not because medicine got harder, but because the administrative layer around medicine got heavier. Ambient documentation doesn{"\u2019"}t fix healthcare. But it removes the single most modifiable variable driving documentation burden. That{"\u2019"}s not a small claim. It{"\u2019"}s a precise one.
              </Text>
              <View style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: "#888888" }}>
                  Source: AMA National Physician Burnout Survey, 2024. EHR documentation time: Arndt et al., JAMIA, as cited by the American Medical Association, October 2024.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>YOUR NUMBERS AT HUMAN SCALE</Text>

            <View style={[styles.cardBg, { padding: 0, flexDirection: "row", marginBottom: 0 }]}>
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.hoursReturned)} hours/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to your {fmtNum(data.providers)} providers.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Built from your inputs. Your scale.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{data.providers > 0 ? (data.hoursReturned / data.providers / 52).toFixed(1) : "0"} hrs/week</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per provider, every week.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Not a rounding error. A measurable shift in how your providers experience their job.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{data.providers > 0 ? (data.hoursReturned / data.providers / 8).toFixed(1) : "0"} days/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per provider, not at a keyboard.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to the schedule, the patient, or the evening. Your providers decide.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>VALUE DRIVERS AT A GLANCE</Text>

            <ValueDriversGlanceBlock drivers={data.drivers} formatValue={fmtCurrency} />

            <View style={styles.divider} />

            <Text style={{ fontSize: 10, color: colors.primaryText, textAlign: "center", marginTop: 4, marginBottom: 4 }}>
              {"\u201C"}The pages that follow detail how each driver works{"\n"}and what it produces for your organization.{"\u201D"}
            </Text>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 3: YOUR VALUE DRIVERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
            <Text style={styles.sectionHeadline}>How Time Becomes Revenue</Text>
            <Text style={styles.body}>
              {fmtNum(data.hoursReturned)} hours returned to your {fmtNum(data.providers)} providers. Here{"\u2019"}s how each driver works.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>TIME RECAPTURED</Text>

            {data.patientAccessEnabled && safe(data.patientAccessValue) > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Patient Access</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.patientAccessValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Your organization modeled {safe(data.additionalVisitsPerWeek)} additional visits per provider per week. Across {fmtNum(safe(data.accessProviders) || data.providers)}{(safe(data.accessProviders) || 0) > 0 && safe(data.accessProviders) !== data.providers ? ` (of ${fmtNum(data.providers)} total)` : ""} providers over 48 working weeks, that{"\u2019"}s {fmtNum(safe(data.projectedAdditionalVisits))} additional encounters annually. At ${safe(data.revenuePerVisit)} per visit, the return is {fmtCurrency(safe(data.patientAccessValue))}.
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      This uses approximately {capPct}% of recovered documentation time for scheduling capacity. The remaining time flows into documentation quality and provider sustainability. {safe(data.additionalVisitsPerWeek) === 1 ? "One additional visit per week is a conservative starting point \u2014 achievable with minimal scheduling changes." : safe(data.additionalVisitsPerWeek) === 2 ? "Two additional visits per week reflects intentional template adjustments to capture recovered time." : (safe(data.additionalVisitsPerWeek) ?? 0) >= 3 ? "This level of capacity expansion requires active workflow redesign and scheduling optimization." : ""}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.sustainabilityEnabled && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Clinician Sustainability</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: data.retentionValueEnabled ? colors.primary : colors.secondary }}>
                        {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : `${hrsPerWkBack.toFixed(1)} hrs/wk per provider`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      {100 - capPct}% of reclaimed time goes back to your providers {"\u2014"} split between documentation quality and sustainability. That returns {hrsPerWkBack.toFixed(1)} hours per week to each provider. Only {capPct}% is reinvested into additional patient visits.
                    </Text>
                    {data.retentionValueEnabled ? (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        You chose to quantify the retention value of that time. Based on a {safe(data.annualTurnoverRate)}% annual turnover rate, {safe(data.burnoutRelatedTurnoverPct)}% burnout attribution, and {fmtCurrency(safe(data.replacementCostPerProvider))} replacement cost, Abridge{"\u2019"}s estimated retention impact is {fmtCurrency(safe(data.retentionValue))} annually. That{"\u2019"}s {Math.round(safe(data.providersRetained) ?? 0)} providers retained per year at the {data.abridgeRetentionImpactLabel || "typical"} impact scenario.
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        That{"\u2019"}s {Math.round(hrsPerWkBack * 60)} minutes back at the end of a shift. Not every hour of recovered time translates directly to a dollar figure {"\u2014"} but the evidence on documentation burden and physician attrition is clear. This allocation is protecting something that{"\u2019"}s harder to rebuild once it{"\u2019"}s gone.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>TIME RECAPTURED SUBTOTAL</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(effVal)}</Text>
            </View>

            <View style={[styles.cardBg, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <View>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  PROJECTED ANNUAL VALUE
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>
                  {fmtCurrency(derivedNetValue)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.secondary, marginTop: 2 }}>
                  Per provider: ~{fmtCurrency(perUnit)}/year
                </Text>
              </View>
              <View style={{ maxWidth: 180 }}>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, textAlign: "right" }}>
                  {docQualVal > 0
                    ? `This reflects time value only. Documentation quality adds ${fmtCurrency(docQualVal)} \u2014 detailed on the next page.`
                    : `This is year one, before documentation quality drivers are measured. The model has room to grow.`}
                </Text>
              </View>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 4 (conditional): DOCUMENTATION QUALITY */}
        {opHasDocQuality && (
          <Page size="LETTER" style={styles.page} wrap={false}>
            <View style={styles.pageWrapper}>
              <Text style={styles.sectionLabel}>DOCUMENTATION QUALITY</Text>
              <Text style={styles.sectionHeadline}>The Notes Were Already Earning This.</Text>
              <Text style={styles.body}>
                Better documentation doesn{"\u2019"}t create new revenue. It captures revenue that already exists {"\u2014"} for complexity that was delivered but not fully coded, for diagnoses that were discussed but not documented, for claims that were denied because the medical necessity wasn{"\u2019"}t explicit. Abridge captures it in the room, in the moment.
              </Text>

              <View style={styles.divider} />

              <Text style={styles.sectionLabelGray}>REVENUE DRIVERS</Text>

              {data.wrvuEnabled && safe(data.annualWrvuValue) > 0 && (
                <View style={[styles.cardBg, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>wRVU Improvement</Text>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualWrvuValue))}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        When visit notes fully reflect the complexity of what happened in the room, E/M levels code higher. The current average of {safe(data.currentAvgWrvuPerVisit)} wRVU per visit has room to move. At a {safe(data.wrvuImprovementPct)}% documentation improvement {"\u2014"} the {data.wrvuScenario} scenario, where industry data shows a 2{"\u2013"}7% lift range {"\u2014"} that{"\u2019"}s {safe(data.wrvuLiftPerVisit)?.toFixed(3)} additional wRVU per visit, {fmtNum(safe(data.totalAdditionalWrvus))} across your {fmtNum(safe(data.eligibleEncounters))} eligible encounters. At a ${safe(data.wrvuConversionFactor)} conversion factor and {safe(data.wrvuRealizationRate)}% realization, the annual value is {fmtCurrency(safe(data.annualWrvuValue))}.
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        This is accurate coding of complexity that was always there.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {data.hccEnabled && safe(data.annualHccValue) > 0 && (
                <View style={[styles.cardBg, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>HCC Capture</Text>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualHccValue))}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        For your Medicare Advantage population, risk adjustment pays based on what{"\u2019"}s documented {"\u2014"} not what{"\u2019"}s known. Many patients have conditions that are managed and discussed at every visit but never formally captured in the note. Abridge surfaces those moments in real time.
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        This model covers only the MA patients touched in Abridge-documented encounters {"\u2014"} your estimated {fmtNum(safe(data.maPatientPanel))} MA patients at {safe(data.medicareAdvantagePct)}% of your {fmtNum(safe(data.totalPatients))} total panel. Of those, approximately {fmtNum(safe(data.patientsWithGaps))} have documentation gaps. At the {data.hccRecaptureScenario} recapture target of {safe(data.hccRecaptureTargetPct)}%, that{"\u2019"}s {fmtNum(safe(data.hccsDocumented))} HCCs documented. The annual value {"\u2014"} after a {safe(data.hccRealizationRate)}% realization rate {"\u2014"} is {fmtCurrency(safe(data.annualHccValue))}.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {data.denialEnabled && safe(data.annualDenialValue) > 0 && (
                <View style={[styles.cardBg, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Denial Prevention</Text>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualDenialValue))}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        Documentation gaps are the primary driver of claim denials that cannot be appealed {"\u2014"} permanent, unrecoverable revenue loss. Of your estimated {fmtNum(safe(data.totalDenials))} annual denials, {fmtNum(safe(data.unrecoverableDenials))} are unappealable. At the {data.denialPreventionScenario} prevention target of {safe(data.preventionTargetPct)}%, Abridge prevents {fmtNum(safe(data.denialsPrevented))} of those claims from being denied in the first place. At ${safe(data.avgDeniedClaimValue)} per claim and a {safe(data.denialRealizationRate)}% realization rate, that{"\u2019"}s {fmtCurrency(safe(data.annualDenialValue))} annually.
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        These are not recoverable through appeals. They either get documented correctly the first time, or they don{"\u2019"}t get paid.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>DOCUMENTATION QUALITY SUBTOTAL</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(docQualVal)}</Text>
              </View>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
                All figures use conservative realization rates based on observed Abridge deployments. The full opportunity is larger {"\u2014"} and measurable once baseline data is established.
              </Text>

              {(!data.wrvuEnabled || !data.hccEnabled || !data.denialEnabled) && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ ...styles.sectionLabelGray, marginBottom: 6 }}>WHAT WASN{"\u2019"}T MODELED</Text>
                  {!data.wrvuEnabled && (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      wRVU Improvement {"\u2014"} Not modeled in this assessment. Requires baseline wRVU data per provider to size accurately.
                    </Text>
                  )}
                  {!data.hccEnabled && (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      HCC Capture {"\u2014"} Not modeled in this assessment. Requires Medicare Advantage population size and current HCC capture rate.
                    </Text>
                  )}
                  {!data.denialEnabled && (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Denial Prevention {"\u2014"} Not modeled in this assessment. Requires current denial rate and claim value data from your revenue cycle team.
                    </Text>
                  )}
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    These are available to activate in a future model {"\u2014"} the inputs are straightforward once baseline data exists.
                  </Text>
                </View>
              )}

              <PageFooter pageNum={4} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
            </View>
          </Page>
        )}

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
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>TIME RECAPTURED</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Patient Access</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.patientAccessEnabled ? fmtCurrency(safe(data.patientAccessValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Clinician Wellbeing</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : data.sustainabilityEnabled ? `${hrsPerWkBack.toFixed(1)} hrs/wk` : "Not modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>REVENUE OPTIMIZED</Text>
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
    const edTotalPages = edHasDocQuality ? 6 : 5;
    const investmentPageNum = edHasDocQuality ? 5 : 4;
    const assessmentPageNum = edHasDocQuality ? 6 : 5;
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

            <Text style={styles.sectionLabel}>TWO SOURCES OF VALUE</Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
              In the emergency department, time is the unit of currency. When documentation is faster, everything downstream accelerates {"\u2014"} door-to-disposition time shrinks, fewer patients walk before being seen, and the complexity that was delivered gets properly coded. Abridge creates value on both ends: faster documentation and more complete documentation.
            </Text>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  THROUGHPUT VALUE
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {thrVal > 0 ? fmtCurrency(thrVal) : "Not Measured"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  {thrCopy}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  The constraint in the ED is always time. This is what changes when documentation stops slowing it down.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE OPTIMIZED
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: edHasDocQuality ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {docQualVal > 0 ? fmtCurrency(docQualVal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  {edHasDocQuality
                    ? revOptCopy
                    : `No documentation quality drivers were selected. E&M level accuracy and denial prevention are available to model \u2014 both are particularly high-impact in ED settings where documentation often understates acuity and denial rates run above the national average.`}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  {edHasDocQuality ? "The notes drive the revenue." : ""}
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

        {/* ED PAGE 2: THE WORKFORCE BEHIND THE NUMBERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE WORKFORCE BEHIND THE NUMBERS</Text>
            <Text style={{ fontSize: 26, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.15, marginBottom: 4 }}>
              Every minute at a terminal{"\n"}is a minute away from a patient.
            </Text>
            <Text style={{ fontSize: 10, color: "#888888", lineHeight: 1.4, marginBottom: 16 }}>
              In an emergency department, documentation speed{"\n"}isn{"\u2019"}t a convenience. It{"\u2019"}s a flow variable.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.calloutBox, { marginBottom: 0 }]}>
              <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.5 }}>
                Emergency medicine has one of the highest burnout rates in medicine {"\u2014"} not because the clinical work is unsustainable, but because the documentation load that follows it is. The same AMA data that shows office-based physicians spending more than 5 hours in the EHR for every 8 patient hours applies with equal force in the ED {"\u2014"} where the pace is faster, the documentation windows are shorter, and the cost of a slow note can be a patient who left without being seen. Time reclaimed from documentation in an ED doesn{"\u2019"}t stay abstract. It moves through the department in real time.
              </Text>
              <View style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: "#888888" }}>
                  Source: AMA National Physician Burnout Survey, 2024. EHR documentation time: Arndt et al., JAMIA, as cited by the American Medical Association, October 2024.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>YOUR NUMBERS AT HUMAN SCALE</Text>

            <View style={[styles.cardBg, { padding: 0, flexDirection: "row", marginBottom: 0 }]}>
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.hoursReturned)} hours/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to your {fmtNum(data.providers)} ED physicians.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Across every Abridge-enabled encounter, every shift.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{data.minutesSavedPerEncounter} min/shift</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per physician, every shift.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>The documentation window that closes before the next patient opens.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{data.providers > 0 ? (data.hoursReturned / data.providers / 8).toFixed(1) : "0"} shifts/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per physician, returned.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Full shifts of documentation time given back {"\u2014"} per physician, per year.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>VALUE DRIVERS AT A GLANCE</Text>

            <ValueDriversGlanceBlock drivers={data.drivers} formatValue={fmtCurrency} />

            <View style={styles.divider} />

            <Text style={{ fontSize: 10, color: colors.primaryText, textAlign: "center", marginTop: 4, marginBottom: 4 }}>
              {"\u201C"}The pages that follow detail how each driver works{"\n"}and what it produces for your organization.{"\u201D"}
            </Text>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* ED PAGE 3: YOUR VALUE DRIVERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
            <Text style={styles.sectionHeadline}>How Time Drives ED Revenue</Text>
            <Text style={styles.body}>
              {fmtNum(data.hoursReturned)} hours returned to your {fmtNum(data.providers)} emergency physicians. Here{"\u2019"}s how each driver works.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>THROUGHPUT VALUE</Text>

            {data.lwbsEnabled && safe(data.netLwbsValue) > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>LWBS Recovery</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.netLwbsValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      You directed {thrPct}% of reclaimed time {"\u2014"} {fmtNum(thrHrs)} hours {"\u2014"} toward patient throughput. Faster documentation reduces door-to-doc time. Shorter wait times mean fewer patients leave without being seen.
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Your current LWBS rate of {safe(data.currentLwbsRatePct)}% generates {fmtNum(safe(data.annualLwbsPatients))} walkouts annually. At a {safe(data.expectedLwbsReductionPct)}% reduction {"\u2014"} the expected impact of faster documentation on wait times {"\u2014"} that{"\u2019"}s {fmtNum(safe(data.patientsRecovered))} patients recovered. At ${safe(data.revenuePerEdVisit)} per visit and a {safe(data.lwbsRealizationRate)}% realization rate, the annual recovery is {fmtCurrency(safe(data.netLwbsValue))}.
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      LWBS is one of the most undercounted losses in emergency medicine. These patients were already in the department. The visit was already scheduled. The only thing missing was time.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.admissionCaptureEnabled && safe(data.annualAdmissionCaptureValue) > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Admission Capture</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualAdmissionCaptureValue))}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Of the {fmtNum(safe(data.recoveredEdPatients))} patients recovered through LWBS reduction, {safe(data.admissionRate)}% require inpatient admission. That{"\u2019"}s {Math.round(safe(data.potentialAdmissions) ?? 0)} additional admissions {"\u2014"} each one generating {fmtCurrency(safe(data.avgAdmissionRevenue))} in admission revenue. At a {safe(data.admissionRealizationRate)}% realization rate accounting for bed availability and payer mix, the annual value is {fmtCurrency(safe(data.annualAdmissionCaptureValue))}.
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      These are not speculative admissions. They are patients who were already sick enough to admit {"\u2014"} they just left before the decision was made.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.sustainabilityEnabled && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Clinician Wellbeing</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: data.retentionValueEnabled ? colors.primary : colors.secondary }}>
                        {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : `${hrsPerWkBack.toFixed(1)} hrs/wk per physician`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      {burdenReliefPct}% of reclaimed time goes back to your physicians {"\u2014"} through documentation quality ({docQualPct}%) and wellbeing ({wellPct}%). That returns {hrsPerWkBack.toFixed(1)} hours per week to each emergency physician. Only throughput time is reinvested into patient flow.
                    </Text>
                    {data.retentionValueEnabled ? (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        At {safe(data.annualTurnoverRate)}% annual turnover, {safe(data.burnoutRelatedTurnoverPct)}% burnout attribution, and {fmtCurrency(safe(data.replacementCostPerProvider))} to replace a departing physician, Abridge{"\u2019"}s estimated retention impact is {fmtCurrency(safe(data.retentionValue))} annually {"\u2014"} {Math.round(safe(data.providersRetained) ?? 0)} physicians retained at the {data.abridgeRetentionImpactLabel || "typical"} scenario.
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        Emergency medicine has among the highest burnout rates in medicine. Documentation burden is consistently cited as the primary driver. {hrsPerWkBack.toFixed(1)} hours per week is not a large number in isolation {"\u2014"} but multiplied across {fmtNum(data.providers)} physicians and compounded over three years of shifts, it is the difference between a department that loses physicians and one that keeps them.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>THROUGHPUT VALUE SUBTOTAL</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(thrVal)}</Text>
            </View>

            <View style={[styles.cardBg, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <View>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  PROJECTED ANNUAL VALUE
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>
                  {fmtCurrency(derivedNetValue)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.secondary, marginTop: 2 }}>
                  Per physician: ~{fmtCurrency(perUnit)}/year
                </Text>
              </View>
              <View style={{ maxWidth: 180 }}>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, textAlign: "right" }}>
                  {docQualVal > 0
                    ? `This reflects throughput value only. Documentation quality adds ${fmtCurrency(docQualVal)} \u2014 detailed on the next page.`
                    : `This is year one, before documentation quality drivers are measured. E&M accuracy and denial prevention are available to model when you\u2019re ready.`}
                </Text>
              </View>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
          </View>
        </Page>

        {/* ED PAGE 4 (conditional): DOCUMENTATION QUALITY */}
        {edHasDocQuality && (
          <Page size="LETTER" style={styles.page} wrap={false}>
            <View style={styles.pageWrapper}>
              <Text style={styles.sectionLabel}>DOCUMENTATION QUALITY</Text>
              <Text style={styles.sectionHeadline}>The Acuity Was Always There. The Notes Just Didn{"\u2019"}t Show It.</Text>
              <Text style={styles.body}>
                In high-volume ED settings, documentation often understates clinical complexity {"\u2014"} not because the care wasn{"\u2019"}t delivered, but because there wasn{"\u2019"}t time to capture it fully. Abridge closes that gap in real time, during the encounter, before the physician moves to the next patient.
              </Text>

              <View style={styles.divider} />

              <Text style={styles.sectionLabelGray}>REVENUE DRIVERS</Text>

              {data.emAccuracyEnabled && safe(data.annualEmValue) > 0 && (
                <View style={[styles.cardBg, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>E&M Level Accuracy</Text>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualEmValue))}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        When ED notes fully reflect visit complexity, E/M levels code higher. The current average of {safe(data.currentAvgWrvuPerVisit)} wRVU per visit has room to move. At a {safe(data.emImprovementPct)}% documentation improvement {"\u2014"} the {data.emScenario} scenario in a range where industry data shows 2{"\u2013"}7% is achievable {"\u2014"} that{"\u2019"}s {safe(data.emWrvuLiftPerVisit)?.toFixed(3)} additional wRVU per visit, {fmtNum(safe(data.totalAdditionalWrvus))} across your {fmtNum(safe(data.eligibleEncounters))} eligible encounters. At a ${safe(data.emConversionFactor)} conversion factor and {safe(data.emRealizationRate)}% realization, the annual value is {fmtCurrency(safe(data.annualEmValue))}.
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        This is accurate coding of complexity that was delivered and documented {"\u2014"} just documented completely.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {data.denialEnabled && safe(data.annualDenialValue) > 0 && (
                <View style={[styles.cardBg, { marginBottom: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Denial Prevention</Text>
                        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(safe(data.annualDenialValue))}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                        ED denial rates run above average for a specific reason: high-volume documentation pressure leads to notes that lack explicit medical necessity language. Payers know this. Your {safe(data.baselineDenialRate)}% baseline denial rate generates {fmtNum(safe(data.totalDenials))} annual denials, of which {fmtNum(safe(data.unrecoverableDenials))} are unappealable. At the {data.denialPreventionScenario} prevention target of {safe(data.preventionTargetPct)}%, Abridge prevents {fmtNum(safe(data.denialsPrevented))} of those claims from being denied in the first place. At ${safe(data.avgDeniedClaimValue)} per claim and a {safe(data.denialRealizationRate)}% realization rate, that{"\u2019"}s {fmtCurrency(safe(data.annualDenialValue))} annually.
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        The window to prevent a denial is during the encounter. After the claim is submitted, that {fmtNum(safe(data.unrecoverableDenials))} unappealable share is gone permanently.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>DOCUMENTATION QUALITY SUBTOTAL</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(docQualVal)}</Text>
              </View>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
                All figures use conservative realization rates based on observed Abridge deployments. The full opportunity is larger {"\u2014"} and measurable once baseline data is established.
              </Text>

              {(!data.emAccuracyEnabled || !data.denialEnabled) && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ ...styles.sectionLabelGray, marginBottom: 6 }}>WHAT WASN{"\u2019"}T MODELED</Text>
                  {!data.emAccuracyEnabled && (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      E&M Level Accuracy {"\u2014"} Not modeled. Requires baseline wRVU data per physician and current E/M level distribution to size accurately.
                    </Text>
                  )}
                  {!data.denialEnabled && (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      Denial Prevention {"\u2014"} Not modeled. Requires current denial rate and average denied claim value from your revenue cycle team. In ED settings, this is typically the faster driver to activate because the baseline data is readily available.
                    </Text>
                  )}
                </View>
              )}

              <PageFooter pageNum={4} orgName={orgName} settingLabel="Emergency Department" totalPages={edTotalPages} />
            </View>
          </Page>
        )}

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
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 2 }}>
              These are the signals that confirm the model is working in your specific department.
            </Text>
            <View style={[styles.cardBg, { marginBottom: 6 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} Door-to-provider time trend (target: measurable reduction from documentation baseline)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} LWBS rate (target: reduction proportional to wait time improvement)
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} E&M level distribution shift (target: upward movement in level 4{"\u2013"}5 frequency if E&M driver relevant)
              </Text>
            </View>
            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              Tracking these at 90 days gives you the data to validate this model and activate any drivers that weren{"\u2019"}t modeled in this initial assessment.
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
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>THROUGHPUT VALUE</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>LWBS Recovery</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.lwbsEnabled ? fmtCurrency(safe(data.netLwbsValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Admission Capture</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.admissionCaptureEnabled ? fmtCurrency(safe(data.annualAdmissionCaptureValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Clinician Wellbeing</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.retentionValueEnabled ? fmtCurrency(safe(data.retentionValue)) : data.sustainabilityEnabled ? `${hrsPerWkBack.toFixed(1)} hrs/wk` : "Not modeled"}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>REVENUE OPTIMIZED</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>E&M Level Accuracy</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.emAccuracyEnabled ? fmtCurrency(safe(data.annualEmValue)) : "Not modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Denial Prevention</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.denialEnabled ? fmtCurrency(safe(data.annualDenialValue)) : "Not modeled"}</Text>
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
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  All figures are built from your inputs {"\u2014"} not industry averages applied generically. Where assumptions were required (LWBS reduction rates, realization rates, admission conversion), we used the conservative end of observed Abridge deployment data.
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginTop: 4 }}>
                  LWBS recovery uses a 75% realization (not all recovered patients complete visits) and 40% for Admission Capture (bed availability and payer mix constraints). The goal is a defensible starting point, not a ceiling.
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
    const clinOpsTotal = retVal + costRedVal;
    const drgVal = safe(data.ipDrgValue);
    const cdiQueryVal = safe(data.ipCdiValue);
    const revenueTotal = drgVal + cdiQueryVal;
    const ipHasDocQuality = !!(data.ipDrgEnabled || data.ipCdiEnabled);
    const ipTotalPages = ipHasDocQuality ? 6 : 5;
    const investmentPageNum = 4;
    const connectedPageNum = 5;
    const assessmentPageNum = ipHasDocQuality ? 6 : 5;
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

        {/* INPATIENT PAGE 1: THE THESIS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE THESIS</Text>
            <Text style={styles.sectionHeadline}>Two Sources of Value, One Strategic Choice</Text>
            <Text style={styles.body}>
              Ambient documentation creates value through two distinct mechanisms: time returned and documentation improved. Most analyses conflate these. We separate them {"\u2014"} because the strategic implications are different.
            </Text>
            <Text style={styles.body}>
              Time returned is a resource. You decide how to deploy it. Documentation improved is a capture. It happens automatically.
            </Text>

            <View style={[styles.cardBg, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 12, color: colors.primaryText, marginBottom: 6 }}>
                If we give hospitalists time back, what happens to your hospital?
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                The answer reveals your strategy. There are two fundamental ways inpatient documentation time creates value:
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CAPACITY UNLOCKED
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {clinOpsTotal > 0 ? fmtCurrency(clinOpsTotal) : "Qualitative"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  Hours returned to rounding, patient care, and throughput. Beds freed by earlier discharges. Admits processed faster.
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  The constraint is time. Remove it.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  REVENUE OPTIMIZED
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: revenueTotal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {revenueTotal > 0 ? fmtCurrency(revenueTotal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  Better documentation, higher CMI, reduced denials. Every encounter captured completely, coded correctly.
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  The notes drive the revenue.
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                STRATEGIC OBSERVATION
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                {getInpatientObservation(data)}
              </Text>
            </View>

            <PageFooter pageNum={1} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>

        {/* INPATIENT PAGE 2: THE WORKFORCE BEHIND THE NUMBERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE WORKFORCE BEHIND THE NUMBERS</Text>
            <Text style={{ fontSize: 26, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.15, marginBottom: 4 }}>
              The hospitalist carries a documentation load{"\n"}disproportionate to their billable output.
            </Text>
            <Text style={{ fontSize: 10, color: "#888888", lineHeight: 1.4, marginBottom: 16 }}>
              Every admission generates a history, a plan, an attestation, orders.{"\n"}Most of it happens after the patient interaction is over.{"\n"}Often after hours.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.calloutBox, { marginBottom: 0 }]}>
              <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.5 }}>
                Hospital medicine is one of the most demanding documentation environments in the building {"\u2014"} and one of the hardest specialties to retain. KLAS data on ambient speech implementations documents consistent reductions in after-hours charting time and measurable improvements in provider satisfaction scores across health systems. The time this model returns to your hospitalists isn{"\u2019"}t a benefit in the traditional ROI sense. It{"\u2019"}s a workforce protection strategy {"\u2014"} one that also happens to drive capacity, DRG accuracy, and downstream revenue. The two are not mutually exclusive.
              </Text>
              <View style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: "#888888" }}>
                  Source: AMA National Physician Burnout Survey, 2024. KLAS Ambient Speech Outcomes, 2025.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>YOUR NUMBERS AT HUMAN SCALE</Text>

            <View style={[styles.cardBg, { padding: 0, flexDirection: "row", marginBottom: 0 }]}>
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.hoursReturned)} hours/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to your {fmtNum(data.providers)} hospitalists.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Built from your admission volume, your utilization, your time savings scenario.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{data.providers > 0 ? (data.hoursReturned / data.providers / 52).toFixed(1) : "0"} hrs/week</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per hospitalist, every week.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Including the hours they were finishing notes at home. Especially those.</Text>
              </View>
              <View style={{ width: 0.5, backgroundColor: colors.border }} />
              <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{data.providers > 0 ? (data.hoursReturned / data.providers / 8).toFixed(1) : "0"} days/year</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per hospitalist, not at a keyboard.</Text>
                <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to the rounding list, the patient family, or the end of a shift that actually ends.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>VALUE DRIVERS AT A GLANCE</Text>

            <ValueDriversGlanceBlock drivers={data.drivers} formatValue={fmtCurrency} />

            <View style={styles.divider} />

            <Text style={{ fontSize: 10, color: colors.primaryText, textAlign: "center", marginTop: 4, marginBottom: 4 }}>
              {"\u201C"}The pages that follow detail how each driver works{"\n"}and what it produces for your organization.{"\u201D"}
            </Text>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
          </View>
        </Page>

        {/* INPATIENT PAGE 3: YOUR VALUE DRIVERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
            <Text style={styles.sectionHeadline}>How Time Becomes Value</Text>
            <Text style={styles.body}>
              {fmtNum(data.hoursReturned)} hours returned to your hospitalists. Here{"\u2019"}s how each driver works.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>CLINICAL OPERATIONS</Text>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.secondary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Rounding Efficiency</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.secondary }}>Qualitative</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    You allocated {directPct}% of reclaimed time to direct patient care {"\u2014"} {fmtNum(roundingHrsTotal)} hours per year across your program, or {fmtNum(roundingHrsPerProv)} hours per hospitalist. That time returns to rounding, bedside presence, teaching, and managing complex census loads. Its value appears in care quality, hospitalist satisfaction, and the capacity to absorb growth without adding FTEs.
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: data.retentionValueEnabled ? colors.primary : colors.secondary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Clinician Wellbeing</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: data.retentionValueEnabled ? colors.primary : colors.secondary }}>
                      {data.retentionValueEnabled ? fmtCurrency(retVal) : `${hrsPerWk.toFixed(1)} hrs/wk`}
                    </Text>
                  </View>
                  {data.retentionValueEnabled ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      After-hours charting is the piece of physician burnout that organizations underestimate {"\u2014"} not because it{"\u2019"}s invisible, but because its cost only becomes visible when someone leaves. At a {safe(data.annualTurnoverRate)}% annual turnover rate, with {safe(data.burnoutRelatedTurnoverPct)}% of departures burnout-related, your program loses an estimated {safe(data.ipBurnoutDepartures)?.toFixed(1)} hospitalists per year to documentation burden. Modeled at a {safe(data.abridgeRetentionImpactPct)}% retention impact {"\u2014"} conservative {"\u2014"} and a {fmtCurrency(safe(data.replacementCostPerProvider))} replacement cost, the projected annual value is {fmtCurrency(retVal)}.
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Your {shiftPct}% shift sustainability allocation returns roughly {hrsPerWk.toFixed(1)} hours per week to each hospitalist {"\u2014"} time that would otherwise be spent charting after shifts. When retention is a concern, the retention model is available to quantify this further.
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Clinical Operations Subtotal</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>
                {clinOpsTotal > 0 ? fmtCurrency(clinOpsTotal) : "Qualitative \u2014 see notes above"}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>DOCUMENTATION QUALITY</Text>

            {ipHasDocQuality ? (
              <>
                {data.ipDrgEnabled && drgVal > 0 && (
                  <View style={[styles.cardBg, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>DRG Accuracy</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(drgVal)}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                          Your hospitalists discuss clinical complexity that doesn{"\u2019"}t always make it into the final note. CDI teams identify documentation opportunities in roughly {ipDrgOpRate}% of admissions {"\u2014"} {fmtNum(ipAdmGaps)} admissions per year carrying a documentation gap. Abridge is modeled to close {ipCapRate}% of those gaps {"\u2014"} the portion where clinical detail was spoken but not written. Each captured case carries an average DRG weight lift of {ipWeightLift}, worth roughly {fmtCurrency(ipBasePayment)} in base payment. After a conservative {ipDrgRealize}% realization rate, the modeled annual value is {fmtCurrency(drgVal)}.
                        </Text>
                        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
                          Common missed conditions: acute respiratory failure, sepsis, malnutrition, acute encephalopathy, acute kidney injury. Validate gap rates with your CDI team.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                {!data.ipDrgEnabled && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>DRG Accuracy</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Not Modeled</Text>
                  </View>
                )}

                {data.ipCdiEnabled && cdiQueryVal > 0 && (
                  <View style={[styles.cardBg, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>CDI Query Reduction</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(cdiQueryVal)}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                          CDI queries are a symptom of incomplete upstream documentation. At a {ipCdiQRate}% query rate, your team manages roughly {fmtNum(ipTotalQ)} queries per year. When Abridge captures the clinical conversation completely, many become unnecessary {"\u2014"} the answer is already in the note. At a typical {ipQAvoidRate}% reduction, {fmtNum(ipQAvoided)} queries avoided at {fmtCurrency(ipQCost)} each yields {fmtCurrency(cdiQueryVal)} annually in CDI team capacity.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                {!data.ipCdiEnabled && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>CDI Query Reduction</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Not Modeled</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.secondary, marginBottom: 4 }}>Documentation Quality: Not Modeled</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  No documentation quality drivers were selected. The DRG accuracy and CDI opportunity is available to model when your program is ready.
                </Text>
              </View>
            )}

            <View style={[styles.cardBg, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }]}>
              <View>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  PROJECTED ANNUAL VALUE
                </Text>
                <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>
                  {fmtCurrency(derivedNetValue)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.secondary, marginTop: 2 }}>
                  Per hospitalist: ~{fmtCurrency(perUnit)}/year
                </Text>
              </View>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Inpatient" totalPages={ipTotalPages} />
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

        {/* INPATIENT PAGE 4: CONNECTED VALUE (only if doc quality drivers active) */}
        {ipHasDocQuality && (
          <Page size="LETTER" style={styles.page} wrap={false}>
            <View style={styles.pageWrapper}>
              <Text style={styles.sectionLabel}>CONNECTED VALUE</Text>
              <Text style={styles.sectionHeadline}>Inpatient Documentation Doesn{"\u2019"}t Start at Admission</Text>
              <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
                The note that matters most to DRG accuracy is often written before the patient reaches the floor.
              </Text>
              <Text style={styles.body}>
                When both ED and Inpatient use Abridge, the value compounds. The admission documentation that starts in ED flows directly into inpatient coding, CDI workflows, and denial defense.
              </Text>

              <View style={styles.divider} />

              <View style={[styles.calloutBox, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>DRG CAPTURE</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  CCs/MCCs documented in ED carry forward {"\u2014"} your case mix starts stronger from admission.
                </Text>
              </View>

              <View style={[styles.calloutBox, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>CDI EFFICIENCY</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  When the ED note is complete, CDI teams query less and focus on complex cases.
                </Text>
              </View>

              <View style={[styles.calloutBox, { marginBottom: 10 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>DENIAL PREVENTION</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Medical necessity documented at admission is your first line of defense against payer audits.
                </Text>
              </View>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  ADDITIONAL OPPORTUNITY {"\u2014"} NOT YET MODELED
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Your wizard inputs support an additional value scenario not included in the primary model: Medical Necessity Appeal Support (documentation completeness supporting retrospective denial defense). This is available to model when your team is ready to quantify it.
                </Text>
              </View>

              <PageFooter pageNum={connectedPageNum} orgName={orgName} settingLabel="Inpatient" totalPages={6} />
            </View>
          </Page>
        )}

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
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>CLINICAL OPERATIONS</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {clinOpsTotal > 0 ? fmtCurrency(clinOpsTotal) : "Qualitative"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Rounding Efficiency</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Qualitative</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Clinician Wellbeing</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.retentionValueEnabled ? fmtCurrency(retVal) : "Qualitative"}
                    </Text>
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
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>DOCUMENTATION QUALITY</Text>
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
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>CDI Query Reduction</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {data.ipCdiEnabled ? fmtCurrency(cdiQueryVal) : "Not Modeled"}
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

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  YOUR INPUTS
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                  {fmtNum(data.providers)} hospitalists{"\n"}
                  {fmtNum(safe(data.eligibleEncounters))} admissions{"\n"}
                  {data.utilizationPercent}% utilization{"\n"}
                  {data.minutesSavedPerEncounter} min saved/admission{"\n"}
                  {fmtCurrency(data.annualInvestment)} investment{"\n"}
                  {fmtNum(data.hoursReturned)} hrs returned
                </Text>
              </View>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  REALIZATION RATES
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Values use conservative realization rates based on observed implementations. Conservative by design. Based on observed implementations.
                </Text>
              </View>
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
    const hacVal = safe(data.nursingHacValue);
    const cautiVal = safe(data.nursingCautiValue);
    const clabsiVal = safe(data.nursingClabsiValue);
    const sepsisVal = safe(data.nursingSepsisValue);
    const nursingHasCareQuality = !!(
      (data.nursingHapiEnabled && hapiVal > 0) ||
      (data.nursingFallsEnabled && fallsVal > 0) ||
      (data.nursingHacEnabled && data.nursingHacBottomQuartile && hacVal > 0) ||
      (data.nursingCautiEnabled && cautiVal > 0) ||
      (data.nursingClabsiEnabled && clabsiVal > 0) ||
      (data.nursingSepsisEnabled && sepsisVal > 0)
    );
    const nursingTotalPages = nursingHasCareQuality ? 6 : 5;
    const investmentPageNum = 4;
    const connectedPageNum = 5;
    const assessmentPageNum = nursingHasCareQuality ? 6 : 5;
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

    return (
      <Document>
        <PDFCoverPage
          reportLabel={config.coverLabel}
          title={orgName}
          subtitle={`${fmtNum(beds)} beds \u00B7 ${fmtNum(ftes)} nurse FTEs \u00B7 Inpatient Nursing`}
          preparedBy={data.preparedBy}
        />

        {/* NURSING PAGE 1: THE THESIS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE THESIS</Text>
            <Text style={styles.sectionHeadline}>Two Sources of Value, One Strategic Choice</Text>
            <Text style={styles.body}>
              Ambient documentation creates value through two distinct mechanisms: time returned and care quality enabled. Most analyses conflate these. We separate them {"\u2014"} because the strategic implications are different.
            </Text>
            <Text style={styles.body}>
              Time returned is a labor economics story. You decide how to deploy it. Care quality enabled is a visibility story. It happens when nurses document in real time instead of catching up at the end of a shift.
            </Text>

            <View style={[styles.cardBg, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 12, color: colors.primaryText, marginBottom: 6 }}>
                Nurses don{"\u2019"}t bill. So where does the value live?
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                Nursing documentation creates value through two mechanisms: labor economics (overtime reduction, retention, agency cost avoidance) and care quality (HAPI risk reduction, fall risk visibility, patient experience). The budget impact is real {"\u2014"} and so is the care improvement.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  LABOR ECONOMICS
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                  {staffingTotal > 0 ? fmtCurrency(staffingTotal) : "Not Modeled"}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  Overtime, retention, and agency spend. These are real dollars that show up in the budget. When nurses spend less time documenting, they finish shifts on time, burn out less, and the organization needs fewer expensive travel nurses.
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  The budget impact is real.
                </Text>
              </View>

              <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                  CARE QUALITY ENABLEMENT
                </Text>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: potentialTotal > 0 ? colors.primary : colors.secondary, marginBottom: 4 }}>
                  {potentialTotal > 0 ? fmtCurrency(potentialTotal) : "Not Modeled"}
                </Text>
                {potentialTotal > 0 && (
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>potential</Text>
                )}
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                  Falls, pressure injuries, patient satisfaction. These outcomes are influenced by bedside time. More time caring, less time charting, better outcomes. But the causal chain is indirect {"\u2014"} documentation supports care, it doesn{"\u2019"}t replace it.
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                  Better care starts with better information.
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                STRATEGIC OBSERVATION
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                {getNursingObservation(data)}
              </Text>
            </View>

            <PageFooter pageNum={1} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 2: THE WORKFORCE BEHIND THE NUMBERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>THE WORKFORCE BEHIND THE NUMBERS</Text>
            <Text style={{ fontSize: 26, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.15, marginBottom: 4 }}>
              Nursing turnover costs between $40,000{"\n"}and $60,000 per nurse replaced.
            </Text>
            <Text style={{ fontSize: 10, color: "#888888", lineHeight: 1.4, marginBottom: 16 }}>
              Documentation burden is consistently cited among the top{"\n"}reasons nurses leave. This model addresses the variable{"\n"}most directly in your control.
            </Text>

            <View style={styles.divider} />

            <View style={[styles.calloutBox, { marginBottom: 0 }]}>
              <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.5 }}>
                The nursing workforce crisis is not a pipeline problem alone {"\u2014"} it{"\u2019"}s a retention problem. And retention is shaped by something that rarely shows up cleanly in exit surveys: the cumulative weight of documentation that follows every shift. Charting that runs past shift end. Flowsheet entries completed from memory rather than presence. The 20 minutes that turns a 12-hour shift into 12 hours and 20 minutes, every day, indefinitely. KLAS data consistently documents that ambient documentation {"\u2014"} when implemented in nursing {"\u2014"} reduces end-of-shift burden and improves shift satisfaction scores. That matters to the budget. It matters more to the bedside.
              </Text>
              <View style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: "#888888" }}>
                  Source: NSI Nursing Solutions National Health Care Retention & RN Staffing Report, 2024. KLAS Ambient Speech Outcomes, 2025.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>YOUR NUMBERS AT HUMAN SCALE</Text>

            {(() => {
              const activeNurses = ftes * (safe(data.nursingAdoptionRate) / 100);
              const hoursPerActiveNurse = activeNurses > 0 ? Math.round(data.hoursReturned / activeNurses) : 0;
              const enabledShifts = safe(data.nursingEnabledShifts);
              const minsPerShift = safe(data.nursingMinutesPerShift);
              return (
                <View style={[styles.cardBg, { padding: 0, flexDirection: "row", marginBottom: 0 }]}>
                  <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.hoursReturned)} hours/year</Text>
                    <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to your nursing staff.</Text>
                    <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Across {fmtNum(enabledShifts)} Abridge-enabled shifts annually.</Text>
                  </View>
                  <View style={{ width: 0.5, backgroundColor: colors.border }} />
                  <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{minsPerShift} min/shift</Text>
                    <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per nurse, every shift.</Text>
                    <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>The documentation window at end of shift that closes before overtime begins.</Text>
                  </View>
                  <View style={{ width: 0.5, backgroundColor: colors.border }} />
                  <View style={{ flex: 1, padding: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(hoursPerActiveNurse)} hrs/year</Text>
                    <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Per nurse using Abridge.</Text>
                    <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>Returned to the patient, the team, or the clock-out. Every nurse. Every shift.</Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.divider} />

            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>VALUE DRIVERS AT A GLANCE</Text>

            <ValueDriversGlanceBlock drivers={data.drivers} formatValue={fmtCurrency} />

            <View style={styles.divider} />

            <Text style={{ fontSize: 10, color: colors.primaryText, textAlign: "center", marginTop: 4, marginBottom: 4 }}>
              {"\u201C"}The pages that follow detail how each driver works{"\n"}and what it produces for your organization.{"\u201D"}
            </Text>

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 3: YOUR VALUE DRIVERS */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
            <Text style={styles.sectionHeadline}>How Documentation Time Becomes Value</Text>
            <Text style={styles.body}>
              {fmtNum(data.hoursReturned)} hours returned to your nursing staff. Here{"\u2019"}s how each driver works.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>STAFFING EFFICIENCY</Text>

            {otVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>OT Reduction</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(otVal)}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
                      You allocated {otPct}% of reclaimed time to overtime reduction. That translates to roughly {fmtNum(otHrsElim)} hours of end-of-shift overtime eliminated per year. When nurses finish charting during their shift instead of after it, they clock out on time {"\u2014"} and the overtime line in the staffing budget shrinks directly. At ${safe(data.nursingOtHourlyRate)}/hour, that{"\u2019"}s {fmtCurrency(otVal)} annually in avoided overtime spend.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>
                      Validation: Check this against your current OT spend. If this exceeds your total nursing OT budget, the conversion rate may need adjustment.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {retVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Retention Savings</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(retVal)}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Documentation burden is among the most frequently cited contributors to nurse burnout. At a {safe(data.nursingTurnoverRate)}% annual turnover rate, your program loses roughly {safe(data.nursingNursesLeaving)?.toFixed(1)} nurses per year {"\u2014"} and about {safe(data.nursingBurnoutDepartures)?.toFixed(1)} of those departures are burnout-related. Reclaimed documentation time reduces the end-of-shift pressure that drives burnout {"\u2014"} the primary mechanism behind retention impact. Modeled at a {safe(data.nursingRetentionImpactPct)}% impact on burnout-driven departures, {Math.round(safe(data.nursingNursesRetained) ?? 0)} nurses retained at {fmtCurrency(safe(data.nursingReplacementCost))} each yields {fmtCurrency(retVal)} annually.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {agencyOn && agencyVal > 0 ? (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Agency Labor Reduction</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(agencyVal)}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Every nursing vacancy filled with travel agency staff costs roughly {fmtCurrency(safe(data.nursingAgencyPremium))}/week in labor premium above base {"\u2014"} over and above replacement cost. That {safe(data.nursingAgencyWeeks)}-week gap at full premium adds up. With {Math.round(safe(data.nursingNursesRetained) ?? 0)} nurses retained, the avoided agency premium is {fmtCurrency(agencyVal)} per year. This is separate from the retention value above {"\u2014"} retention captures the replacement cost of recruiting and onboarding; agency captures the premium labor spend during the vacancy window.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Agency Labor Reduction</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Not Modeled</Text>
              </View>
            )}

            {(data.nursingAdditionalCostSavings || []).filter(item => item.amount > 0 && item.label).map((item) => (
              <View key={item.id} style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 24 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{item.label}</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(item.amount)}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Organization-identified cost saving applied as a one-time annual benefit.
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Staffing Efficiency Subtotal</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>
                {staffingTotal > 0 ? fmtCurrency(staffingTotal) : "Not Modeled"}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabelGray}>CARE QUALITY {"\u2014"} POTENTIAL VALUE</Text>

            <View style={[styles.cardBg, { marginBottom: 8, paddingVertical: 8 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                The value below reflects potential impact {"\u2014"} not a guarantee. Documentation enables the clinical visibility that supports better care; it doesn{"\u2019"}t replace clinical judgment or protocol. These figures are shown separately from hard staffing value.
              </Text>
            </View>

            {data.nursingHapiEnabled && hapiVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>HAPI Risk: Documentation Impact</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(hapiVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>potential</Text></Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Your program generates roughly {safe(data.nursingHapiPerYear)?.toFixed(1)} hospital-acquired pressure injuries per year across {fmtNum(patientDays)} patient days {"\u2014"} consistent with a national rate of {safe(data.nursingHapiRatePer1000)}/1,000 patient days. Real-time documentation of skin assessments, Braden scores, and turning schedules creates the clinical visibility that enables earlier intervention. Abridge{"\u2019"}s attributable share is modeled at {safe(data.nursingHapiPreventionRate)}% {"\u2014"} exactly half the 13% reduction observed in Dowding et al. (JAMIA 2012) {"\u2014"} to reflect that documentation is one input in a broader care system. The potential value is {fmtCurrency(hapiVal)}.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>
                      Source: Dowding J et al., JAMIA 2012. Prevention rate halved (6.5% vs 13% observed) to reflect documentation as one input in a broader prevention system.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.nursingFallsEnabled && fallsVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Fall Risk Visibility Gap</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(fallsVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>potential</Text></Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      Your hospital experiences roughly {safe(data.nursingFallsPerYear)?.toFixed(1)} patient falls per year. Real-time Morse score and mobility documentation ensures fall risk status reflects the patient{"\u2019"}s current condition {"\u2014"} not end-of-shift catch-up charting. This is not a prevention claim {"\u2014"} it is a documentation timeliness gap claim. At a {safe(data.nursingFallsDocGapRate)}% documentation gap rate (Joint Commission sentinel event data) and {fmtCurrency(safe(data.nursingFallsCostPer))} cost per fall, the potential value is {fmtCurrency(fallsVal)}.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>
                      Source: Joint Commission Sentinel Event data. Gap rate reflects documentation-timing-related falls only.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.nursingHacEnabled && data.nursingHacBottomQuartile && hacVal > 0 ? (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>HAC Penalty Avoidance</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(hacVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>potential</Text></Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      The CMS HAC Reduction Program penalizes hospitals in the bottom quartile by reducing Medicare payments by 1%. At {fmtCurrency(safe(data.nursingHacMedicareRevenue))} in annual Medicare inpatient revenue, that{"\u2019"}s a {fmtCurrency(safe(data.nursingHacPenalty))} penalty. With {safe(data.nursingHacAttribution)}% attribution to documentation and {safe(data.nursingHacRealization)}% Year 1 realization, the potential value is {fmtCurrency(hacVal)}.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>HAC Penalty Avoidance</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Not Modeled</Text>
              </View>
            )}

            {data.nursingCautiEnabled && cautiVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>CAUTI Bundle Compliance</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(cautiVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>potential</Text></Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      At {safe(data.nursingCautiUtilizationRatio)}% catheter utilization ({fmtNum(safe(data.nursingCautiDaysPerYear))} catheter days/year), a rate of {safe(data.nursingCautiRatePer1000)} per 1,000 catheter days yields {safe(data.nursingCautiPerYear)} CAUTIs/year. A {safe(data.nursingCautiPreventionRate)}% documentation-attributable prevention rate prevents {safe(data.nursingCautiPrevented)} events at {fmtCurrency(safe(data.nursingCautiCostPer))} each.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>
                      Source: Meddings et al., 2014 JAMA Internal Medicine. Prevention rate reflects documentation-timing contribution (~1/5 of full bundle effect).
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.nursingClabsiEnabled && clabsiVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>CLABSI Bundle Compliance</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(clabsiVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>potential</Text></Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      At {safe(data.nursingClabsiUtilizationRatio)}% central line utilization ({fmtNum(safe(data.nursingClabsiDaysPerYear))} line days/year), a rate of {safe(data.nursingClabsiRatePer1000)} per 1,000 line days yields {safe(data.nursingClabsiPerYear)} CLABSIs/year. An {safe(data.nursingClabsiPreventionRate)}% documentation-attributable prevention rate prevents {safe(data.nursingClabsiPrevented)} events at {fmtCurrency(safe(data.nursingClabsiCostPer))} each.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>
                      Source: IHI bundle compliance literature. Prevention rate reflects documentation-timing contribution (~1/8 of full bundle effect).
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.nursingSepsisEnabled && sepsisVal > 0 && (
              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Sepsis SEP-1 Bundle</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(sepsisVal)} <Text style={{ fontSize: 8, color: colors.tertiary }}>potential</Text></Text>
                    </View>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      At {safe(data.nursingSepsisRatePerThousand)} cases per 1,000 patient days ({safe(data.nursingSepsisPerYear)} cases/year), {safe(data.nursingSepsisCurrentCompliance)}% current compliance leaves {safe(data.nursingSepsisNonCompliant)} non-compliant cases. Of those, {safe(data.nursingSepsisDocLagPercent)}% ({safe(data.nursingSepsisDocLagCases)} cases) are attributable to documentation-timing failures. Each case converted from non-compliant to compliant saves approximately {fmtCurrency(safe(data.nursingSepsisExcessCostPerCase))} in excess hospitalization cost (HCUP; Seymour NEJM 2017), applied at {safe(data.nursingSepsisRealization)}% realization.
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>
                      Modeled as excess cost of non-compliant vs. compliant cases — same structure as CAUTI and CLABSI.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {data.nursingHcahpsEnabled && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Patient Experience (HCAHPS)</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Qualitative</Text>
              </View>
            )}

            <View style={[styles.cardBg, { marginTop: 10 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    PROJECTED ANNUAL VALUE (HARD)
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>
                    {fmtCurrency(hardNetValue)}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.secondary, marginTop: 2 }}>
                    Per bed: ~{fmtCurrency(netPerBed)}/year
                  </Text>
                </View>
                {potentialTotal > 0 && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 8, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      POTENTIAL VALUE
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.secondary }}>
                      +{fmtCurrency(potentialTotal)}
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>
                      not included in net
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <PageFooter pageNum={3} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 4: THE INVESTMENT CASE */}
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

            <PageFooter pageNum={investmentPageNum} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
          </View>
        </Page>

        {/* NURSING PAGE 4: CONNECTED VALUE (only if care quality drivers active) */}
        {nursingHasCareQuality && (
          <Page size="LETTER" style={styles.page} wrap={false}>
            <View style={styles.pageWrapper}>
              <Text style={styles.sectionLabel}>CONNECTED VALUE</Text>
              <Text style={styles.sectionHeadline}>Nursing Documentation Doesn{"\u2019"}t Stay at the Bedside</Text>
              <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
                Real-time flowsheet documentation creates the clinical record that downstream teams depend on. When nurses document in the moment, the entire hospital benefits.
              </Text>

              <View style={styles.divider} />

              <View style={[styles.calloutBox, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>CC/MCC CAPTURE</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Nursing assessments capture clinical indicators that support accurate DRG assignment. {"\u201C"}Patient appears malnourished{"\u201D"} feeds coding directly. When the nursing flowsheet is complete, the clinical picture available to coders and CDI teams is richer from the start.
                </Text>
              </View>

              <View style={[styles.calloutBox, { marginBottom: 10 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>MEDICAL NECESSITY</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Real-time nursing docs provide evidence of patient acuity {"\u2014"} critical for payer appeals. When medical necessity is questioned, the nursing record is often the strongest supporting evidence.
                </Text>
              </View>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  The value above reflects nursing-only documentation. If your organization also uses Abridge for inpatient medicine teams, the clinical record built by nursing directly extends the ROI of the Inpatient model {"\u2014"} no double-counting.
                </Text>
              </View>

              <PageFooter pageNum={connectedPageNum} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={6} />
            </View>
          </Page>
        )}

        {/* NURSING LAST PAGE: YOUR ASSESSMENT */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

            <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 16, paddingHorizontal: 20 }]}>
              <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
                {fmtNum(beds)} staffed beds. {fmtNum(ftes)} nurse FTEs.
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(hardNetValue)} projected net value.
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>
                {fmtCurrency(netPerBed)} per bed per year.
              </Text>
            </View>

            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
                Nurses don{"\u2019"}t bill. But their flowsheet documentation drives care quality {"\u2014"} reducing the risk events most sensitive to documentation gaps {"\u2014"} and their time drives labor economics. Ambient documentation creates value in the two places it matters most for nursing: the budget and the bedside.
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
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>STAFFING EFFICIENCY</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {staffingTotal > 0 ? fmtCurrency(staffingTotal) : "Not Modeled"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>OT Reduction</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{otVal > 0 ? fmtCurrency(otVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Retention Savings</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{retVal > 0 ? fmtCurrency(retVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Agency Reduction</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{agencyOn && agencyVal > 0 ? fmtCurrency(agencyVal) : "Not Modeled"}</Text>
                  </View>
                  {(data.nursingAdditionalCostSavings || []).filter(item => item.amount > 0 && item.label).map((item) => (
                    <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                      <Text style={{ fontSize: 8.5, color: colors.secondary }}>{item.label}</Text>
                      <Text style={{ fontSize: 8.5, color: colors.secondary }}>{fmtCurrency(item.amount)}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>CARE QUALITY (POTENTIAL)</Text>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                      {potentialTotal > 0 ? fmtCurrency(potentialTotal) : "Not Modeled"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>HAPI Risk</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingHapiEnabled && hapiVal > 0 ? fmtCurrency(hapiVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Fall Risk</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingFallsEnabled && fallsVal > 0 ? fmtCurrency(fallsVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>HAC Penalty</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingHacEnabled && data.nursingHacBottomQuartile && hacVal > 0 ? fmtCurrency(hacVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>CAUTI</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingCautiEnabled && cautiVal > 0 ? fmtCurrency(cautiVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>CLABSI</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingClabsiEnabled && clabsiVal > 0 ? fmtCurrency(clabsiVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>Sepsis SEP-1</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingSepsisEnabled && sepsisVal > 0 ? fmtCurrency(sepsisVal) : "Not Modeled"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>HCAHPS</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{data.nursingHcahpsEnabled ? "Qualitative" : "Not Modeled"}</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Net Annual Value (Hard)</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(hardNetValue)}</Text>
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
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Per bed/month</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(costPerBedMo)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>Year 1 ROI (hard value)</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{hardRoi.toFixed(1)}{"\u00D7"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>3-Year Cumulative</Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(nCum3)}</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  ADOPTION
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
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Per nurse/week</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{hrsPerWk.toFixed(1)} hrs</Text>
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
                  {fmtNum(beds)} staffed beds{"\n"}
                  {fmtNum(ftes)} nurse FTEs{"\n"}
                  {safe(data.nursingOccupancyRate)}% bed occupancy{"\n"}
                  {data.utilizationPercent}% adoption{"\n"}
                  {safe(data.nursingMinutesPerShift)} min saved/shift{"\n"}
                  {fmtCurrency(data.annualInvestment)} investment ({fmtCurrency(costPerBedMo)}/bed/mo){"\n"}
                  {fmtNum(data.hoursReturned)} hrs returned
                </Text>
              </View>
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  HOW WE CALCULATED
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Hard value (Staffing Efficiency) uses direct inputs: OT hours eliminated, retention modeling at conservative impact rates, and agency cost avoidance. Potential value (Care Quality) uses published rates and halved attribution {"\u2014"} conservative by design. The two are shown separately throughout.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
              This assessment is for planning purposes. Hard value projections are based on user-provided staffing inputs. Potential value uses published clinical rates with halved attribution to reflect the indirect causal chain. Validate with your organization{"\u2019"}s data post-implementation.
            </Text>

            <PageFooter pageNum={assessmentPageNum} orgName={orgName} settingLabel="Nursing Value Assessment" totalPages={nursingTotalPages} />
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
