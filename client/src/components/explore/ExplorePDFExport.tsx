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
  fullScaleValue: number;
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

const PageFooter = ({ pageNum, orgName, settingLabel, totalPages = 4 }: { pageNum: number; orgName: string; settingLabel: string; totalPages?: number }) => (
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
    thesisParagraph: "Emergency documentation creates value through two mechanisms: throughput gains (LWBS reduction, faster disposition, admission capture) and revenue accuracy (E&M level precision, denial prevention). Your throughput allocation determines how much reclaimed time translates to patient recovery — with a 50% conversion factor reflecting real-world ED dynamics.",
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
      "2. LWBS rate reduction (target: -15-25%)",
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
    source2Label: "CARE QUALITY",
    source2Description: "HAPI risk reduction, fall risk visibility, and patient experience improvement.",
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
  const roughlyEqual = Math.abs(capPct - susPct) <= 5 && Math.abs(capPct - docPct) <= 5;

  if (roughlyEqual) {
    obs = `You spread the allocation evenly \u2014 capacity, documentation quality, and clinician sustainability each getting meaningful weight. That reflects an organization trying to solve for all three at once, which is exactly the right instinct. The model reflects that balance.`;
  } else if (susPct >= 30 || hasRetention) {
    obs = `You put real weight on clinician sustainability \u2014 ${susPct}% of reclaimed time${hasRetention ? ", plus a quantified retention model" : ""}. That\u2019s a leadership signal: this isn\u2019t just a revenue initiative. Protecting providers from documentation burden protects the organization from turnover costs that dwarf the investment.`;
  } else if (capPct >= 40 && !hasRetention) {
    obs = `Your model is weighted toward capacity \u2014 ${capPct}% of reclaimed time flows back to patient access. That\u2019s the most direct line from documentation efficiency to revenue. The sustainability allocation (${susPct}%) adds a buffer against burnout without making it the headline.`;
  } else if (docPct >= 40 && hasDocDrivers) {
    obs = `The ${docPct}% you allocated to documentation quality time isn\u2019t passive \u2014 it\u2019s the foundation of the revenue capture on the right. Better notes require attention in the moment. Abridge creates the space for that.`;
  } else {
    obs = `Your model balances capacity (${capPct}%), documentation quality (${docPct}%), and clinician sustainability (${susPct}%). That reflects an organization working across multiple value dimensions simultaneously.`;
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
  const totalPages = isOutpatient ? (opHasDocQuality ? 5 : 4) : 4;

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
        return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually. You directed ${capPct}% toward patient access and ${susPct}% toward clinician wellbeing \u2014 a deliberate balance between near-term capacity and long-term retention.`;
      }
      if (data.patientAccessEnabled) {
        return `${fmtNum(data.providers)} providers reclaim ${fmtNum(data.hoursReturned)} hours annually. You directed ${capPct}% of that time toward patient access \u2014 the most direct path from documentation savings to revenue.`;
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

    let investmentPageNum = opHasDocQuality ? 4 : 3;
    let assessmentPageNum = opHasDocQuality ? 5 : 4;

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

        {/* OUTPATIENT PAGE 2: HOW YOUR TIME ALLOCATION BECOMES REVENUE */}
        <Page size="LETTER" style={styles.page} wrap={false}>
          <View style={styles.pageWrapper}>
            <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
            <Text style={styles.sectionHeadline}>How Your Time Allocation Becomes Revenue</Text>
            <Text style={styles.body}>
              {fmtNum(data.hoursReturned)} hours returned to your {fmtNum(data.providers)} providers. Here{"\u2019"}s what each allocation decision produces.
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
                      You directed {capPct}% of reclaimed time {"\u2014"} {fmtNum(capHrs)} hours {"\u2014"} toward patient capacity. At a {convPct}% conversion rate to scheduled visits, that generates {fmtNum(safe(data.projectedAdditionalVisits))} additional encounters per year. At ${safe(data.revenuePerVisit)} per visit, the return is {fmtCurrency(safe(data.patientAccessValue))}.
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                      The {convPct}% conversion rate reflects the realistic friction between recovered time and scheduled appointments {"\u2014"} scheduling demand, slot availability, and provider willingness to add volume. {convPct === 10 ? "The 10% default is the midpoint of what Abridge-deployed organizations typically see." : convPct > 10 ? "You modeled this above the typical starting point \u2014 that reflects confidence in your scheduling capacity and demand." : "You modeled this conservatively, which is the right approach for a first-year model."}
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
                      You allocated {susPct}% of reclaimed time {"\u2014"} {fmtNum(susHrs)} hours {"\u2014"} to clinician wellbeing. That returns {hrsPerWkBack.toFixed(1)} hours per week to each provider.
                    </Text>
                    {data.retentionValueEnabled ? (
                      <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                        You chose to quantify the retention value of that time. Based on a {safe(data.annualTurnoverRate)}% annual turnover rate, {safe(data.burnoutRelatedTurnoverPct)}% burnout attribution, and {fmtCurrency(safe(data.replacementCostPerProvider))} replacement cost, Abridge{"\u2019"}s estimated retention impact is {fmtCurrency(safe(data.retentionValue))} annually. That{"\u2019"}s {safe(data.providersRetained)?.toFixed(2)} providers retained per year at the {data.abridgeRetentionImpactLabel || "typical"} impact scenario.
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

            <PageFooter pageNum={2} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
          </View>
        </Page>

        {/* OUTPATIENT PAGE 3 (conditional): DOCUMENTATION QUALITY */}
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
                        This is not upcoding. It is accurate coding of complexity that was always there.
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

              <PageFooter pageNum={3} orgName={orgName} settingLabel="Outpatient" totalPages={totalPages} />
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
