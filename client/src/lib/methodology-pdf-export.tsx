import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Svg,
  Path,
  Image,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import manropeRegular from "../assets/fonts/manrope-regular.ttf";
import manropeBold from "../assets/fonts/manrope-bold.ttf";
import abridgeFont from "../assets/fonts/abridge.otf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

Font.register({
  family: "Abridge",
  src: abridgeFont,
});

export type MethodologyCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

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
  coverPage: {
    backgroundColor: colors.background,
    position: "relative",
    padding: 0,
  },
  coverCurve: {
    position: "absolute",
    bottom: 80,
    right: 0,
    width: 300,
    height: 300,
  },
  coverContent: {
    flex: 1,
    paddingHorizontal: 54,
    paddingTop: 54,
    justifyContent: "center",
    position: "relative",
    zIndex: 10,
  },
  coverLogo: {
    width: 90,
    position: "absolute",
    top: 54,
    left: 54,
  },
  coverLabel: {
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 3,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: "Abridge",
    fontWeight: "bold",
    color: colors.primaryText,
    lineHeight: 1.2,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  coverRule: {
    width: 60,
    height: 2,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 32,
  },
  coverDisclaimer: {
    position: "absolute",
    bottom: 36,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  coverDisclaimerText: {
    fontSize: 8.5,
    color: colors.tertiary,
    lineHeight: 1.5,
  },
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
  body: {
    fontSize: 10.5,
    color: "#333333",
    lineHeight: 1.5,
    marginBottom: 10,
  },
  bodySmall: {
    fontSize: 9,
    color: colors.secondary,
    lineHeight: 1.5,
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
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  threeColRow: {
    flexDirection: "row",
    gap: 8,
  },
  threeCol: {
    flex: 1,
  },
});

interface MechanismData {
  name: string;
  badge: string;
  badgeType: "direct" | "indirect" | "connected" | "potential" | "qualitative";
  description: string;
  formula: string;
}

interface CategoryData {
  label: string;
  labelColor: string;
  mechanisms: MechanismData[];
}

interface HonestLimitsData {
  measure: string[];
  influence: string[];
  enable: string[];
}

interface AssumptionRow {
  assumption: string;
  range: string;
  defaultVal: string;
  source: string;
}

interface ValidationCard {
  name: string;
  before: string[];
  after: string[];
  timeline: string;
}

interface SettingData {
  settingLabel: string;
  settingLabelLower: string;
  context: string;
  cat1Label: string;
  cat1Description: string;
  cat1Footer: string;
  cat2Label: string;
  cat2Description: string;
  cat2Footer: string;
  categories: CategoryData[];
  honestLimits: HonestLimitsData;
  assumptions: AssumptionRow[];
  conservativeCallout: string;
  validation: ValidationCard[];
  connectedValue: string;
}

function getBadgeStyle(type: string) {
  switch (type) {
    case "direct":
      return { backgroundColor: colors.cards, color: colors.primaryText, borderWidth: 1, borderColor: colors.border };
    case "indirect":
      return { backgroundColor: colors.cards, color: colors.secondary, borderWidth: 1, borderColor: colors.border };
    case "connected":
      return { backgroundColor: colors.cards, color: colors.secondary, borderWidth: 1, borderColor: colors.border };
    case "potential":
      return { backgroundColor: "#FFF5F2", color: colors.primary, borderWidth: 1, borderColor: "rgba(234,44,0,0.3)" };
    case "qualitative":
      return { backgroundColor: "#F5F5F5", color: colors.tertiary, borderWidth: 1, borderColor: colors.border };
    default:
      return { backgroundColor: colors.cards, color: colors.secondary, borderWidth: 1, borderColor: colors.border };
  }
}

const settingData: Record<MethodologyCareSetting, SettingData> = {
  outpatient: {
    settingLabel: "Outpatient",
    settingLabelLower: "outpatient",
    context: "Outpatient value has a clear billing relationship\u2014wRVUs, capacity, documentation quality. Time saved traces to revenue. The question is how much converts and at what rate.",
    cat1Label: "TIME RECAPTURED",
    cat1Description: "Capacity expansion, operational savings, clinician wellbeing. When documentation is faster, providers can see more patients, leave on time, or both.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "REVENUE OPTIMIZED",
    cat2Description: "wRVU accuracy, HCC capture, denial prevention. When documentation is complete, coding is accurate, and downstream revenue follows.",
    cat2Footer: "Potential value (shown separately)",
    categories: [
      {
        label: "TIME RECAPTURED",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "Operational Savings", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Time saved on documentation reduces overtime, after-hours work, and per-encounter labor cost.", formula: "Providers \u00D7 encounters \u00D7 time saved \u00D7 hourly rate \u00D7 realization" },
          { name: "Patient Capacity", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Freed time can be allocated to additional patient visits, increasing throughput and revenue.", formula: "Hours saved \u00D7 % to capacity \u00D7 revenue/visit \u00D7 realization" },
          { name: "Provider Wellbeing", badge: "INDIRECT", badgeType: "indirect", description: "Reduced documentation burden lowers burnout and may improve retention, avoiding replacement costs.", formula: "Providers \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
        ],
      },
      {
        label: "REVENUE OPTIMIZED",
        labelColor: colors.primary,
        mechanisms: [
          { name: "wRVU Capture", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Better documentation supports accurate coding. Notes that capture full complexity yield higher wRVUs.", formula: "Encounters \u00D7 avg wRVU \u00D7 lift% \u00D7 conversion factor \u00D7 realization" },
          { name: "HCC Accuracy", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Complete documentation captures chronic conditions for MA populations, improving risk adjustment scores.", formula: "MA patients \u00D7 gap rate \u00D7 recapture% \u00D7 RAF impact \u00D7 payment" },
          { name: "Denial Prevention", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Documentation gaps drive unappealable denials. Real-time capture prevents permanent revenue loss.", formula: "Encounters \u00D7 denial rate \u00D7 prevention% \u00D7 avg claim \u00D7 realization" },
        ],
      },
    ],
    honestLimits: {
      measure: ["Time/encounter", "wRVU lift", "Same-day closure", "After-hours work"],
      influence: ["Capacity (depends on demand)", "Retention", "Satisfaction", "Referral patterns"],
      enable: ["HCC accuracy", "Denial rates", "Patient experience", "Quality metrics"],
    },
    assumptions: [
      { assumption: "Time saved/encounter", range: "2\u20136 min", defaultVal: "4 min", source: "Abridge data" },
      { assumption: "Time conversion rate", range: "15\u201330%", defaultVal: "25%", source: "Implementation data" },
      { assumption: "Provider hourly rate", range: "$100\u2013250", defaultVal: "$150", source: "MGMA data" },
      { assumption: "Visit duration", range: "15\u201330 min", defaultVal: "20 min", source: "Specialty avg" },
      { assumption: "Revenue per visit", range: "$150\u2013350", defaultVal: "$200", source: "Practice data" },
      { assumption: "wRVU value", range: "$30\u201340", defaultVal: "$33", source: "CMS conversion" },
      { assumption: "wRVU lift", range: "2\u20137%", defaultVal: "5.5%", source: "Abridge data" },
      { assumption: "wRVU attribution", range: "50\u201385%", defaultVal: "60%", source: "Conservative est." },
      { assumption: "Turnover rate", range: "4\u20138%", defaultVal: "6%", source: "AAMC data" },
      { assumption: "Replacement cost", range: "$250\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "TIME SAVINGS", before: ["Time-motion studies", "EHR session data"], after: ["Repeat measurements", "Abridge vs. control"], timeline: "2\u20134 weeks" },
      { name: "wRVU ACCURACY", before: ["wRVU distribution by provider", "E&M level mix"], after: ["Compare distribution pre/post", "Track by complexity"], timeline: "3\u20136 months" },
      { name: "CAPACITY", before: ["Daily encounter volume", "Schedule utilization"], after: ["Track volume changes", "Measure open slots"], timeline: "3\u20136 months" },
      { name: "RETENTION", before: ["Baseline turnover rate", "Exit interview data"], after: ["Track turnover on Abridge", "Survey satisfaction"], timeline: "12\u201318 months" },
    ],
    connectedValue: "Outpatient documentation quality impacts downstream referrals, HCC accuracy for value-based contracts, and pre-auth efficiency.",
  },
  ed: {
    settingLabel: "Emergency",
    settingLabelLower: "emergency",
    context: "In the ED, time is the constraint on everything\u2014throughput, LWBS, admission capture. Value shows up in patients seen, patients kept, and encounters documented completely.",
    cat1Label: "THROUGHPUT UNLOCKED",
    cat1Description: "LWBS reduction, faster throughput, clinician wellbeing. Every minute saved in documentation can reduce door-to-disposition time and recover lost patients.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "REVENUE CAPTURED",
    cat2Description: "E&M accuracy, admission capture, denial prevention. Complete documentation captures clinical complexity and supports appropriate reimbursement.",
    cat2Footer: "Potential value (shown separately)",
    categories: [
      {
        label: "THROUGHPUT UNLOCKED",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "LWBS Reduction", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Faster documentation reduces wait times. Recovered LWBS patients represent direct revenue capture.", formula: "Annual visits \u00D7 LWBS rate \u00D7 reduction% \u00D7 avg ED revenue" },
          { name: "Throughput/Capacity", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Documentation time savings increase patients-per-hour, expanding effective capacity.", formula: "Time saved \u00D7 encounters \u00D7 throughput conversion \u00D7 revenue/visit" },
          { name: "Provider Wellbeing", badge: "INDIRECT", badgeType: "indirect", description: "ED physicians face extreme documentation burden. Reduced burden may lower turnover in high-pressure settings.", formula: "Physicians \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
        ],
      },
      {
        label: "REVENUE CAPTURED",
        labelColor: colors.primary,
        mechanisms: [
          { name: "E&M Accuracy", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Complete documentation captures visit complexity, supporting appropriate E&M level coding.", formula: "Encounters \u00D7 E&M uplift \u00D7 revenue/level \u00D7 realization" },
          { name: "Admission Capture", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Better documentation supports appropriate admission decisions, capturing revenue for patients who meet criteria.", formula: "ED visits \u00D7 admission capture% \u00D7 avg admission value" },
          { name: "Denial Prevention", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Complete ED documentation prevents medical necessity denials and observation status downgrades.", formula: "Claims \u00D7 denial rate \u00D7 reduction% \u00D7 avg denial value" },
        ],
      },
    ],
    honestLimits: {
      measure: ["LWBS rate", "Door-to-doc time", "Time/encounter", "E&M levels"],
      influence: ["Throughput (operational)", "Retention", "Satisfaction", "Admission decisions"],
      enable: ["Admission capture", "Downstream inpatient", "Quality metrics", "Patient experience"],
    },
    assumptions: [
      { assumption: "Time saved/encounter", range: "1\u20133 min", defaultVal: "2 min", source: "Abridge data" },
      { assumption: "LWBS rate", range: "2\u20135%", defaultVal: "3%", source: "ED benchmark data" },
      { assumption: "LWBS reduction", range: "10\u201330%", defaultVal: "15%", source: "Conservative est." },
      { assumption: "Avg ED visit revenue", range: "$350\u2013600", defaultVal: "$450", source: "CMS data" },
      { assumption: "E&M level uplift", range: "0.2\u20130.5", defaultVal: "0.3", source: "Abridge data" },
      { assumption: "Revenue per E&M level", range: "$30\u201380", defaultVal: "$50", source: "CMS fee schedule" },
      { assumption: "Admission capture rate", range: "1\u20135%", defaultVal: "2%", source: "Conservative est." },
      { assumption: "Avg admission value", range: "$8\u201315K", defaultVal: "$10K", source: "DRG avg" },
      { assumption: "Denial reduction", range: "5\u201315%", defaultVal: "8%", source: "Conservative est." },
      { assumption: "Avg denial value", range: "$150\u2013300", defaultVal: "$200", source: "Industry data" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "LWBS RECOVERY", before: ["Current LWBS rate", "Door-to-disposition time"], after: ["Track LWBS rate changes", "Measure wait time impact"], timeline: "1\u20132 months" },
      { name: "THROUGHPUT", before: ["Patients/hour baseline", "Average door-to-dispo"], after: ["Compare throughput metrics", "Track volume trends"], timeline: "2\u20133 months" },
      { name: "E&M ACCURACY", before: ["E&M level distribution", "Coding accuracy audit"], after: ["Compare level mix pre/post", "Track by acuity"], timeline: "3\u20136 months" },
      { name: "DENIALS", before: ["Denial rate by category", "Medical necessity rates"], after: ["Track denial trends", "Compare appeal success"], timeline: "6\u201312 months" },
    ],
    connectedValue: "ED documentation drives downstream inpatient revenue. When ED admits are documented completely, the inpatient stay starts with a stronger clinical picture.",
  },
  inpatient: {
    settingLabel: "Inpatient",
    settingLabelLower: "inpatient",
    context: "Inpatient value is driven by DRG-based reimbursement. Documentation accuracy directly impacts coding, CMI, and denials. Time saved creates capacity for rounding, throughput, and retention.",
    cat1Label: "CAPACITY UNLOCKED",
    cat1Description: "Hospitalist retention, rounding efficiency, throughput. Documentation time saved creates space for clinical care and may improve length of stay.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "REVENUE OPTIMIZED",
    cat2Description: "DRG accuracy, CDI efficiency, denial prevention. Complete documentation drives coding accuracy and protects reimbursement.",
    cat2Footer: "Potential value (shown separately)",
    categories: [
      {
        label: "CAPACITY UNLOCKED",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "Hospitalist Retention", badge: "INDIRECT", badgeType: "indirect", description: "Hospitalist burnout rates are among the highest. Reduced documentation burden may improve retention.", formula: "Hospitalists \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
          { name: "Throughput/LOS", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Faster documentation supports earlier discharge decisions and care transitions.", formula: "Admissions \u00D7 LOS reduction \u00D7 cost/day \u00D7 realization" },
        ],
      },
      {
        label: "REVENUE OPTIMIZED",
        labelColor: colors.primary,
        mechanisms: [
          { name: "DRG Accuracy", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Complete documentation captures CC/MCC indicators, supporting accurate DRG assignment and protecting CMI.", formula: "At-risk encounters \u00D7 protection rate \u00D7 DRG weight increase \u00D7 base payment" },
          { name: "CDI Efficiency", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Real-time documentation reduces CDI queries, saving specialist time and improving workflow.", formula: "Admissions \u00D7 query rate \u00D7 reduction% \u00D7 cost/query" },
          { name: "Denial Prevention", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Complete inpatient documentation prevents medical necessity denials and supports payer appeals.", formula: "Claims \u00D7 denial rate \u00D7 reduction% \u00D7 avg denial value" },
        ],
      },
    ],
    honestLimits: {
      measure: ["CMI trends", "Query response rates", "Denial rates", "Doc time/encounter"],
      influence: ["Retention", "Throughput/LOS", "Satisfaction", "Care transitions"],
      enable: ["Readmission reduction", "Quality metrics", "Clinical outcomes", "Patient experience"],
    },
    assumptions: [
      { assumption: "Time saved/encounter", range: "1.5\u20134 min", defaultVal: "2.5 min", source: "Abridge data" },
      { assumption: "At-risk DRG encounters", range: "20\u201335%", defaultVal: "25%", source: "CDI benchmark" },
      { assumption: "DRG protection rate", range: "15\u201330%", defaultVal: "20%", source: "Conservative est." },
      { assumption: "Avg DRG weight increase", range: "0.3\u20130.6", defaultVal: "0.4", source: "CMS data" },
      { assumption: "Base DRG payment", range: "$5\u20138K", defaultVal: "$6,500", source: "Medicare avg" },
      { assumption: "CDI query reduction", range: "20\u201340%", defaultVal: "25%", source: "Implementation data" },
      { assumption: "Denial rate reduction", range: "10\u201325%", defaultVal: "15%", source: "Conservative est." },
      { assumption: "Hospitalist turnover", range: "5\u20138%", defaultVal: "6%", source: "SHM data" },
      { assumption: "Burnout-related turnover", range: "30\u201350%", defaultVal: "40%", source: "Research data" },
      { assumption: "Replacement cost", range: "$300\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
      { assumption: "Retention impact", range: "3\u201315%", defaultVal: "4%", source: "Conservative est." },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "DRG / CMI", before: ["CMI by service line", "CC/MCC capture rate"], after: ["Track CMI trends", "Compare capture rates"], timeline: "3\u20136 months" },
      { name: "CDI EFFICIENCY", before: ["Query volume/rate", "Resolution time"], after: ["Track query reduction", "Measure time savings"], timeline: "2\u20133 months" },
      { name: "DENIALS", before: ["Denial rate by type", "Appeal success rate"], after: ["Track denial trends", "Compare appeal outcomes"], timeline: "6\u201312 months" },
      { name: "RETENTION", before: ["Baseline turnover", "Burnout survey scores"], after: ["Track turnover rates", "Repeat burnout surveys"], timeline: "12\u201318 months" },
    ],
    connectedValue: "Inpatient documentation is strengthened by nursing documentation. When both are on Abridge, the combined clinical picture drives higher coding accuracy and stronger appeals.",
  },
  nursing: {
    settingLabel: "Nursing",
    settingLabelLower: "nursing",
    context: "Nursing is the hardest setting to model ROI\u2014and the most important to get right. Nurses don\u2019t bill. They don\u2019t generate wRVUs. Yet 25\u201335% of every shift is spent documenting. The value lives in two places: labor economics and care quality.",
    cat1Label: "LABOR ECONOMICS",
    cat1Description: "Overtime reduction, retention savings, agency cost reduction. When documentation is faster, nurses finish on time, stay longer, and organizations need fewer travelers.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "CARE QUALITY ENABLEMENT",
    cat2Description: "HAPI prevention, falls reduction, patient experience. More time at the bedside enables better assessments and earlier intervention.",
    cat2Footer: "Potential value (shown separately)",
    categories: [
      {
        label: "LABOR ECONOMICS",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "Overtime Reduction", badge: "DIRECTLY MEASURABLE", badgeType: "direct", description: "Time saved on documentation reduces end-of-shift overtime. Savings calculated at 1.5x hourly rate.", formula: "Nurses \u00D7 time saved \u00D7 OT conversion% \u00D7 1.5x hourly rate" },
          { name: "Retention Savings", badge: "INDIRECT", badgeType: "indirect", description: "Documentation burden drives burnout and turnover. Reducing burden may improve retention, avoiding replacement costs.", formula: "Nurses \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
          { name: "Agency Reduction", badge: "CONNECTED", badgeType: "connected", description: "Better retention means fewer agency/travel nurse weeks needed to cover vacancies.", formula: "Retained nurses \u00D7 coverage weeks \u00D7 weekly agency premium" },
        ],
      },
      {
        label: "CARE QUALITY ENABLEMENT",
        labelColor: colors.primary,
        mechanisms: [
          { name: "HAPI Prevention", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Real-time documentation enables earlier visibility of pressure injury risk, supporting prevention protocols.", formula: "Patient days \u00D7 HAPI rate \u00D7 prevention% \u00D7 cost/HAPI" },
          { name: "Falls Prevention", badge: "POTENTIAL VALUE", badgeType: "potential", description: "Better documentation of mobility status and risk factors supports fall prevention programs.", formula: "Patient days \u00D7 fall rate \u00D7 prevention% \u00D7 cost/fall" },
          { name: "Patient Experience", badge: "QUALITATIVE", badgeType: "qualitative", description: "More bedside time correlates with patient satisfaction. HCAHPS is influenced by many factors beyond documentation.", formula: "Qualitative \u2014 not directly calculated" },
        ],
      },
    ],
    honestLimits: {
      measure: ["OT hours", "Doc time/shift", "Shift completion", "Chart timing"],
      influence: ["Turnover", "Agency spend", "Satisfaction", "Burnout scores"],
      enable: ["Falls rate", "HAPI rate", "HCAHPS", "Clinical outcomes"],
    },
    assumptions: [
      { assumption: "Time saved/shift", range: "15\u201330 min", defaultVal: "20 min", source: "Abridge data" },
      { assumption: "OT conversion rate", range: "15\u201340%", defaultVal: "25%", source: "Implementation data" },
      { assumption: "Nurse turnover rate", range: "15\u201325%", defaultVal: "18%", source: "NSI 2024" },
      { assumption: "Burnout-related turnover", range: "30\u201350%", defaultVal: "40%", source: "ANA research" },
      { assumption: "Abridge retention impact", range: "10\u201325%", defaultVal: "15%", source: "Conservative est." },
      { assumption: "Replacement cost", range: "$40\u201365K", defaultVal: "$52K", source: "NSI 2024" },
      { assumption: "Agency coverage weeks", range: "8\u201316 wks", defaultVal: "12 wks", source: "Industry avg" },
      { assumption: "Weekly agency premium", range: "$2\u20134K", defaultVal: "$2,500", source: "Travel nurse rates" },
      { assumption: "Doc-preventable HAC rate", range: "3\u20138%", defaultVal: "5%", source: "Conservative est." },
      { assumption: "Cost per HAPI", range: "$10\u201350K", defaultVal: "$26K", source: "AHRQ data" },
      { assumption: "Cost per fall w/ injury", range: "$3\u201330K", defaultVal: "$6.5K", source: "CMS data" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "TIME SAVINGS", before: ["Documentation time/shift", "End-of-shift completion"], after: ["Repeat time studies", "Track shift completion"], timeline: "2\u20134 weeks" },
      { name: "OT REDUCTION", before: ["OT hours by unit", "OT cost baseline"], after: ["Track OT trends", "Compare pilot vs. control"], timeline: "2\u20133 months" },
      { name: "RETENTION", before: ["Turnover rate by unit", "Burnout survey data"], after: ["Track turnover changes", "Repeat surveys"], timeline: "12\u201318 months" },
      { name: "CARE QUALITY", before: ["HAPI/falls rates", "HCAHPS scores"], after: ["Monitor trends", "Treat as directional"], timeline: "Treat as bonus" },
    ],
    connectedValue: "Nursing documentation feeds inpatient revenue. Complete assessments capture CC/MCC indicators that support DRG accuracy and strengthen payer appeals.",
  },
};

function CoverPage({ setting }: { setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  return (
    <Page size="LETTER" style={styles.coverPage}>
      <Image src={abridgeLogoRed} style={styles.coverLogo} />
      <View style={styles.coverCurve}>
        <Svg width={300} height={300} viewBox="0 0 300 300">
          <Path
            d="M 300 0 Q 250 50 200 120 Q 150 190 80 240 Q 40 270 0 300"
            stroke={colors.primary}
            strokeWidth={80}
            fill="none"
            strokeOpacity={0.08}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View style={styles.coverContent}>
        <Text style={styles.coverLabel}>ROI METHODOLOGY</Text>
        <Text style={styles.coverTitle}>{data.settingLabel}:{"\n"}How We Think{"\n"}About Value</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>A transparent methodology for understanding{"\n"}where value lives in {data.settingLabelLower} documentation</Text>
      </View>
      <View style={styles.coverDisclaimer}>
        <Text style={styles.coverDisclaimerText}>
          Every assumption is visible. Every calculation is transparent. If you disagree with an input, change it.
        </Text>
      </View>
    </Page>
  );
}

function PageFooter({ pageNum, setting }: { pageNum: number; setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>ABRIDGE</Text>
      <Text style={styles.footerCenter}>ROI Methodology {"\u00B7"} {data.settingLabel}</Text>
      <Text style={styles.footerRight}>Page {pageNum} of 2</Text>
    </View>
  );
}

function MechanismRow({ mechanism, isLast }: { mechanism: MechanismData; isLast: boolean }) {
  const badgeStyle = getBadgeStyle(mechanism.badgeType);
  return (
    <View>
      <View style={{ flexDirection: "row", paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.primary }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{mechanism.name}</Text>
            <View style={{ paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, ...badgeStyle }}>
              <Text style={{ fontSize: 7, letterSpacing: 1, textTransform: "uppercase", color: badgeStyle.color }}>{mechanism.badge}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 2 }}>{mechanism.description}</Text>
          <Text style={{ fontSize: 9, color: colors.tertiary }}>{mechanism.formula}</Text>
        </View>
      </View>
      {!isLast && <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />}
    </View>
  );
}

function Page1Content({ setting }: { setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>THE CONTEXT</Text>
        <Text style={styles.body}>{data.context}</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>TWO VALUE CATEGORIES</Text>
        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.cardBg]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{data.cat1Label}</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>{data.cat1Description}</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{data.cat1Footer}</Text>
            </View>
          </View>
          <View style={[styles.col, { backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, paddingVertical: 10 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{data.cat2Label}</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>{data.cat2Description}</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{data.cat2Footer}</Text>
            </View>
          </View>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>VALUE MECHANISMS</Text>
        <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>How each driver works and how we calculate it.</Text>
        <View style={styles.divider} />

        {data.categories.map((cat, ci) => (
          <View key={ci}>
            <Text style={[ci === 0 ? styles.sectionLabelGray : styles.sectionLabel, { marginTop: ci > 0 ? 8 : 0, marginBottom: 6, color: cat.labelColor }]}>{cat.label}</Text>
            <View style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: 6 }}>
              {cat.mechanisms.map((m, mi) => (
                <MechanismRow key={mi} mechanism={m} isLast={mi === cat.mechanisms.length - 1} />
              ))}
            </View>
            {ci < data.categories.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>THE HONEST LIMITS</Text>
        <View style={[styles.threeColRow, { marginBottom: 4 }]}>
          <View style={[styles.threeCol, styles.cardBg, { padding: 10 }]}>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>{"\u2713"} WE MEASURE</Text>
            <Text style={{ fontSize: 8.5, color: colors.secondary, marginBottom: 4 }}>Direct</Text>
            {data.honestLimits.measure.map((item, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {item}</Text>
            ))}
          </View>
          <View style={[styles.threeCol, styles.cardBg, { padding: 10 }]}>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>{"~"} WE INFLUENCE</Text>
            <Text style={{ fontSize: 8.5, color: colors.secondary, marginBottom: 4 }}>Indirect</Text>
            {data.honestLimits.influence.map((item, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {item}</Text>
            ))}
          </View>
          <View style={[styles.threeCol, styles.cardBg, { padding: 10 }]}>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>{"\u25CB"} WE ENABLE</Text>
            <Text style={{ fontSize: 8.5, color: colors.secondary, marginBottom: 4 }}>Supportive</Text>
            {data.honestLimits.enable.map((item, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {item}</Text>
            ))}
          </View>
        </View>

        <PageFooter pageNum={1} setting={setting} />
      </View>
    </Page>
  );
}

function Page2Content({ setting }: { setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>KEY ASSUMPTIONS</Text>
        <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>Every number has a source. We default conservative.</Text>
        <View style={styles.divider} />

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 3, fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>ASSUMPTION</Text>
            <Text style={{ flex: 1.5, fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>RANGE</Text>
            <Text style={{ flex: 1.5, fontSize: 9, fontWeight: "bold", color: colors.primary }}>DEFAULT</Text>
            <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>SOURCE</Text>
          </View>
          {data.assumptions.map((row, i) => (
            <View key={i} style={{ flexDirection: "row", paddingVertical: 5, paddingHorizontal: 10, backgroundColor: i % 2 === 1 ? colors.cards : colors.background, borderBottomWidth: i < data.assumptions.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 3, fontSize: 9, color: colors.primaryText }}>{row.assumption}</Text>
              <Text style={{ flex: 1.5, fontSize: 9, color: colors.secondary }}>{row.range}</Text>
              <Text style={{ flex: 1.5, fontSize: 9, color: colors.primary, fontWeight: "bold" }}>{row.defaultVal}</Text>
              <Text style={{ flex: 2, fontSize: 9, color: colors.secondary }}>{row.source}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.calloutBox, { marginBottom: 12 }]}>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{data.conservativeCallout}</Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>VALIDATION PATH</Text>
        <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>Our projections are starting points. The real answers come from your data.</Text>
        <View style={styles.divider} />

        <View style={[styles.twoColRow, { marginBottom: 8 }]}>
          {data.validation.slice(0, 2).map((v, i) => (
            <View key={i} style={[styles.col, styles.cardBg, { padding: 10 }]}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 5 }}>{v.name}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.secondary, marginBottom: 2 }}>Before:</Text>
              {v.before.map((b, bi) => (
                <Text key={bi} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {b}</Text>
              ))}
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.secondary, marginTop: 4, marginBottom: 2 }}>After:</Text>
              {v.after.map((a, ai) => (
                <Text key={ai} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {a}</Text>
              ))}
              <Text style={{ fontSize: 9, color: colors.primary, marginTop: 4, fontWeight: "bold" }}>Timeline: {v.timeline}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          {data.validation.slice(2, 4).map((v, i) => (
            <View key={i} style={[styles.col, styles.cardBg, { padding: 10 }]}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 5 }}>{v.name}</Text>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.secondary, marginBottom: 2 }}>Before:</Text>
              {v.before.map((b, bi) => (
                <Text key={bi} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {b}</Text>
              ))}
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.secondary, marginTop: 4, marginBottom: 2 }}>After:</Text>
              {v.after.map((a, ai) => (
                <Text key={ai} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>{"\u2022"} {a}</Text>
              ))}
              <Text style={{ fontSize: 9, color: colors.primary, marginTop: 4, fontWeight: "bold" }}>Timeline: {v.timeline}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={[styles.cardBg, { marginBottom: 8 }]}>
          <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>CONNECTED VALUE</Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{data.connectedValue}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>OUR PRINCIPLES</Text>
        <Text style={{ fontSize: 9, color: colors.tertiary }}>Show our work {"\u00B7"} Conservative by default {"\u00B7"} Honest about limits {"\u00B7"} Validate with your data</Text>

        <PageFooter pageNum={2} setting={setting} />
      </View>
    </Page>
  );
}

function MethodologyDocument({ setting }: { setting: MethodologyCareSetting }) {
  return (
    <Document>
      <CoverPage setting={setting} />
      <Page1Content setting={setting} />
      <Page2Content setting={setting} />
    </Document>
  );
}

export async function generateMethodologyPDF(setting: MethodologyCareSetting): Promise<void> {
  const data = settingData[setting];
  const doc = <MethodologyDocument setting={setting} />;
  const blob = await pdf(doc).toBlob();
  const filename = `Abridge-${data.settingLabel}-ROI-Methodology.pdf`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${data.settingLabel} ROI Methodology` });
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
          setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        }
        return;
      }
    }
  }

  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } else {
    saveAs(blob, filename);
  }
}
