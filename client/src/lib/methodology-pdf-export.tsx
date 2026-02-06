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
  coverDate: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 20,
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
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 10,
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
});

interface MechanismData {
  name: string;
  attribution: string;
  description: string;
  formula: string;
  formulaColor?: string;
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
  coverSubtitle: string;
  contextHeadline: string;
  contextBody: string;
  contextQuestion: string;
  cat1Label: string;
  cat1Description: string;
  cat1Footer: string;
  cat2Label: string;
  cat2Description: string;
  cat2Footer: string;
  frameworkCallout: string;
  categories: CategoryData[];
  honestLimits: HonestLimitsData;
  connectedValueLabel: string;
  connectedValue: string;
  mechanismsSubtitle: string;
  careQualityCallout: string;
  assumptions: AssumptionRow[];
  conservativeCallout: string;
  validation: ValidationCard[];
  closingNote: string;
}

const settingData: Record<MethodologyCareSetting, SettingData> = {
  nursing: {
    settingLabel: "Nursing",
    settingLabelLower: "nursing",
    coverSubtitle: "A transparent framework for understanding where\nvalue lives when there\u2019s no billing relationship",
    contextHeadline: "Nursing is the hardest setting to model ROI\u2014and the most important to get right.",
    contextBody: "In outpatient medicine, a physician saves 4 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. Nurses don\u2019t bill. They don\u2019t generate wRVUs. And yet nursing documentation burden is massive\u201425\u201335% of every shift spent on flowsheets, assessments, handoffs, and charting.",
    contextQuestion: "So where does the value live?",
    cat1Label: "LABOR ECONOMICS",
    cat1Description: "Overtime, retention, and agency spend. Real dollars that show up in the budget. When nurses spend less time documenting, they finish shifts on time, burn out less, and the organization needs fewer travel nurses.",
    cat1Footer: "Direct, measurable",
    cat2Label: "CARE QUALITY ENABLEMENT",
    cat2Description: "Falls, pressure injuries, patient satisfaction. Influenced by bedside time. But the causal chain is indirect\u2014documentation supports care, it doesn\u2019t replace it.",
    cat2Footer: "Potential value (shown separately)",
    frameworkCallout: "We model both\u2014but we\u2019re honest about what\u2019s directly measurable versus what we only enable. Labor economics value is defensible in CFO conversations. Care quality potential is real but requires clinical practice to realize.",
    categories: [
      {
        label: "LABOR ECONOMICS",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "Overtime Reduction",
            attribution: "Measurable",
            description: "When nurses document faster, they finish on time. Not all time saved reduces OT\u2014some goes to care\u2014but a measurable portion does.",
            formula: "Hours saved \u00D7 Conversion (15\u201340%) \u00D7 OT rate (1.5\u00D7)",
          },
          {
            name: "Retention Savings",
            attribution: "Influenceable",
            description: "Documentation burden \u2192 burnout \u2192 turnover. Reducing burden helps retain nurses who would otherwise leave.",
            formula: "FTEs \u00D7 Turnover \u00D7 Burnout% \u00D7 Impact (10\u201325%) \u00D7 Replacement cost",
          },
          {
            name: "Agency Labor Reduction",
            attribution: "Tied to retention",
            description: "When nurses leave, hospitals fill gaps with agency nurses at 2\u20133\u00D7 the cost. Better retention directly reduces agency dependency.",
            formula: "Nurses retained \u00D7 Coverage weeks (8\u201316) \u00D7 Weekly premium ($2\u20134K)",
          },
        ],
      },
      {
        label: "CARE QUALITY ENABLEMENT",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "HAPI Prevention",
            attribution: "Potential",
            description: "Real-time documentation ensures skin assessments and risk factors are captured\u2014enabling earlier intervention for pressure injuries.",
            formula: "Current HAPIs \u00D7 Doc-preventable (5%) \u00D7 Cost/HAPI",
          },
          {
            name: "Falls Prevention",
            attribution: "Potential",
            description: "Real-time fall risk scores and mobility status enable earlier preventive action. CMS does not reimburse for hospital-acquired fall injuries.",
            formula: "Current falls \u00D7 Doc-preventable (5%) \u00D7 Cost/fall",
          },
          {
            name: "Patient Experience (HCAHPS)",
            attribution: "Directional",
            description: "More bedside time correlates with higher scores. But HCAHPS is influenced by dozens of factors. Track as indicator, not outcome.",
            formula: "Top quartile HCAHPS \u2248 2% higher VBP reimbursement",
            formulaColor: colors.tertiary,
          },
        ],
      },
    ],
    careQualityCallout: "The link between documentation and care quality is indirect. We don\u2019t cause fewer falls\u2014we enable the visibility that helps prevent them. Clinical practice matters more than documentation.",
    honestLimits: {
      measure: ["OT hours pre/post", "Doc time per shift", "Shift completion", "Chart timing"],
      influence: ["Turnover rates", "Agency utilization", "Nurse satisfaction", "Burnout indicators"],
      enable: ["Falls prevention", "HAPI prevention", "HCAHPS improvement", "Clinical outcomes"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "When nurses document thoroughly and in real-time, it directly impacts inpatient revenue. Nursing assessments capture clinical indicators (CC/MCC) that support DRG accuracy and stronger payer appeals. These benefits are quantified in the Inpatient methodology.",
    mechanismsSubtitle: "How Time Saved Becomes Value",
    assumptions: [
      { assumption: "Time saved/shift", range: "15\u201330 min", defaultVal: "20 min", source: "Customer data" },
      { assumption: "OT conversion", range: "15\u201340%", defaultVal: "25%", source: "Studies" },
      { assumption: "Nurse turnover", range: "15\u201325%", defaultVal: "18%", source: "NSI 2024" },
      { assumption: "Burnout-related %", range: "30\u201350%", defaultVal: "40%", source: "ANA" },
      { assumption: "Retention impact", range: "10\u201325%", defaultVal: "15%", source: "Conserv." },
      { assumption: "Replacement cost", range: "$40\u201365K", defaultVal: "$52K", source: "NSI 2024" },
      { assumption: "Agency weeks", range: "8\u201316 wks", defaultVal: "12 wks", source: "Industry" },
      { assumption: "Agency premium", range: "$2\u20134K/wk", defaultVal: "$2,500", source: "Travel" },
      { assumption: "Doc-preventable %", range: "3\u20138%", defaultVal: "5%", source: "Conserv." },
      { assumption: "Cost per HAPI", range: "$10\u201350K", defaultVal: "$26K", source: "AHRQ" },
      { assumption: "Cost per fall", range: "$3\u201330K", defaultVal: "$6.5K", source: "CMS" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "TIME SAVINGS", before: ["Survey nurses on doc time; review EHR session data"], after: ["Repeat; compare with utilization data"], timeline: "2\u20134 weeks" },
      { name: "OVERTIME", before: ["Baseline OT hours per unit/month; note seasonal patterns"], after: ["Track Abridge vs control units"], timeline: "2\u20133 months" },
      { name: "RETENTION", before: ["Baseline turnover by unit; exit interview data"], after: ["Track Abridge vs control; survey on satisfaction"], timeline: "12\u201318 months" },
      { name: "CARE QUALITY", before: ["Baseline HAPI/falls rates; baseline HCAHPS scores"], after: ["Track Abridge vs control; be cautious on attribution"], timeline: "Treat as bonus, not promise." },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling nursing ROI. All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
  outpatient: {
    settingLabel: "Outpatient",
    settingLabelLower: "outpatient",
    coverSubtitle: "A transparent framework for understanding where\ntime saved becomes measurable value",
    contextHeadline: "Outpatient has the clearest path from time saved to value\u2014but the assumptions still matter.",
    contextBody: "A physician saves 4 minutes per visit with ambient documentation. That time can flow to more patients, less after-hours work, or better documentation quality. The question isn\u2019t whether value exists\u2014it\u2019s how much converts and at what rate.",
    contextQuestion: "The answer depends on your practice.",
    cat1Label: "TIME RECAPTURED",
    cat1Description: "Capacity expansion, operational savings, clinician wellbeing. When documentation is faster, providers can see more patients, leave on time, or both.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "REVENUE OPTIMIZED",
    cat2Description: "wRVU accuracy, HCC capture, denial prevention. When documentation is complete, coding is accurate, and downstream revenue follows.",
    cat2Footer: "Potential value (shown separately)",
    frameworkCallout: "We model both\u2014but we\u2019re honest about what\u2019s directly measurable versus what requires downstream attribution. Time savings are defensible. Revenue optimization depends on coding, billing, and practice patterns.",
    categories: [
      {
        label: "TIME RECAPTURED",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "Operational Savings", attribution: "Measurable", description: "Time saved on documentation reduces overtime, after-hours work, and per-encounter labor cost.", formula: "Providers \u00D7 encounters \u00D7 time saved \u00D7 hourly rate \u00D7 realization" },
          { name: "Patient Capacity", attribution: "Measurable", description: "Freed time can be allocated to additional patient visits, increasing throughput and revenue.", formula: "Hours saved \u00D7 % to capacity \u00D7 revenue/visit \u00D7 realization" },
          { name: "Provider Wellbeing", attribution: "Influenceable", description: "Reduced documentation burden lowers burnout and may improve retention, avoiding replacement costs.", formula: "Providers \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
        ],
      },
      {
        label: "REVENUE OPTIMIZED",
        labelColor: colors.primary,
        mechanisms: [
          { name: "wRVU Capture", attribution: "Measurable", description: "Better documentation supports accurate coding. Notes that capture full complexity yield higher wRVUs.", formula: "Encounters \u00D7 avg wRVU \u00D7 lift% \u00D7 conversion factor \u00D7 realization" },
          { name: "HCC Accuracy", attribution: "Potential", description: "Complete documentation captures chronic conditions for MA populations, improving risk adjustment scores.", formula: "MA patients \u00D7 gap rate \u00D7 recapture% \u00D7 RAF impact \u00D7 payment" },
          { name: "Denial Prevention", attribution: "Potential", description: "Documentation gaps drive unappealable denials. Real-time capture prevents permanent revenue loss.", formula: "Encounters \u00D7 denial rate \u00D7 prevention% \u00D7 avg claim \u00D7 realization" },
        ],
      },
    ],
    careQualityCallout: "Revenue optimization depends on coding workflows, payer mix, and practice patterns. We provide the framework\u2014your data determines the magnitude.",
    honestLimits: {
      measure: ["Time/encounter", "wRVU lift", "Same-day closure", "After-hours work"],
      influence: ["Capacity (demand-dependent)", "Retention", "Satisfaction", "Referral patterns"],
      enable: ["HCC accuracy", "Denial rates", "Patient experience", "Quality metrics"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "Outpatient documentation quality impacts downstream referrals, HCC accuracy for value-based contracts, and pre-auth efficiency.",
    mechanismsSubtitle: "How Time Saved Becomes Value",
    assumptions: [
      { assumption: "Time saved/encounter", range: "2\u20136 min", defaultVal: "4 min", source: "Abridge data" },
      { assumption: "Time conversion rate", range: "15\u201330%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Provider hourly rate", range: "$100\u2013250", defaultVal: "$150", source: "MGMA" },
      { assumption: "Visit duration", range: "15\u201330 min", defaultVal: "20 min", source: "Specialty avg" },
      { assumption: "Revenue per visit", range: "$150\u2013350", defaultVal: "$200", source: "Practice data" },
      { assumption: "wRVU value", range: "$30\u201340", defaultVal: "$33", source: "CMS" },
      { assumption: "wRVU lift", range: "2\u20137%", defaultVal: "5.5%", source: "Abridge data" },
      { assumption: "Turnover rate", range: "4\u20138%", defaultVal: "6%", source: "AAMC" },
      { assumption: "Replacement cost", range: "$250\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "TIME SAVINGS", before: ["Time-motion studies", "EHR session data"], after: ["Repeat measurements", "Abridge vs. control"], timeline: "2\u20134 weeks" },
      { name: "wRVU ACCURACY", before: ["wRVU distribution by provider", "E&M level mix"], after: ["Compare distribution pre/post", "Track by complexity"], timeline: "3\u20136 months" },
      { name: "CAPACITY", before: ["Daily encounter volume", "Schedule utilization"], after: ["Track volume changes", "Measure open slots"], timeline: "3\u20136 months" },
      { name: "RETENTION", before: ["Baseline turnover rate", "Exit interview data"], after: ["Track turnover on Abridge", "Survey satisfaction"], timeline: "12\u201318 months" },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling outpatient ROI. All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
  ed: {
    settingLabel: "Emergency",
    settingLabelLower: "emergency",
    coverSubtitle: "A transparent framework for understanding where\ntime saved becomes throughput and revenue",
    contextHeadline: "In the ED, time is the constraint on everything\u2014throughput, LWBS, admission capture.",
    contextBody: "Value shows up in patients seen, patients kept, and encounters documented completely. Every minute saved in documentation can reduce door-to-disposition time and recover patients who would otherwise leave.",
    contextQuestion: "The question is how much converts\u2014and how to measure it.",
    cat1Label: "THROUGHPUT UNLOCKED",
    cat1Description: "LWBS reduction, faster throughput, clinician wellbeing. Every minute saved in documentation can reduce door-to-disposition time and recover lost patients.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "REVENUE CAPTURED",
    cat2Description: "E&M accuracy, admission capture, denial prevention. Complete documentation captures clinical complexity and supports appropriate reimbursement.",
    cat2Footer: "Potential value (shown separately)",
    frameworkCallout: "We model both\u2014but we\u2019re honest about what\u2019s directly measurable versus what depends on operational workflows. LWBS recovery is trackable. Admission capture depends on clinical judgment.",
    categories: [
      {
        label: "THROUGHPUT UNLOCKED",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "LWBS Reduction", attribution: "Measurable", description: "Faster documentation reduces wait times. Recovered LWBS patients represent direct revenue capture.", formula: "Annual visits \u00D7 LWBS rate \u00D7 reduction% \u00D7 avg ED revenue" },
          { name: "Throughput/Capacity", attribution: "Measurable", description: "Documentation time savings increase patients-per-hour, expanding effective capacity.", formula: "Time saved \u00D7 encounters \u00D7 throughput conversion \u00D7 revenue/visit" },
          { name: "Provider Wellbeing", attribution: "Influenceable", description: "ED physicians face extreme documentation burden. Reduced burden may lower turnover in high-pressure settings.", formula: "Physicians \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
        ],
      },
      {
        label: "REVENUE CAPTURED",
        labelColor: colors.primary,
        mechanisms: [
          { name: "E&M Accuracy", attribution: "Measurable", description: "Complete documentation captures visit complexity, supporting appropriate E&M level coding.", formula: "Encounters \u00D7 E&M uplift \u00D7 revenue/level \u00D7 realization" },
          { name: "Admission Capture", attribution: "Potential", description: "Better documentation supports appropriate admission decisions, capturing revenue for patients who meet criteria.", formula: "ED visits \u00D7 admission capture% \u00D7 avg admission value" },
          { name: "Denial Prevention", attribution: "Potential", description: "Complete ED documentation prevents medical necessity denials and observation status downgrades.", formula: "Claims \u00D7 denial rate \u00D7 reduction% \u00D7 avg denial value" },
        ],
      },
    ],
    careQualityCallout: "ED throughput is operational\u2014it depends on staffing, patient flow, and bed management. We provide the documentation time savings; your team converts it to throughput.",
    honestLimits: {
      measure: ["LWBS rate", "Door-to-doc time", "Time/encounter", "E&M levels"],
      influence: ["Throughput (operational)", "Retention", "Satisfaction", "Admission decisions"],
      enable: ["Admission capture", "Downstream inpatient", "Quality metrics", "Patient experience"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "ED documentation drives downstream inpatient revenue. When ED admits are documented completely, the inpatient stay starts with a stronger clinical picture.",
    mechanismsSubtitle: "How Time Saved Becomes Value",
    assumptions: [
      { assumption: "Time saved/encounter", range: "1\u20133 min", defaultVal: "2 min", source: "Abridge data" },
      { assumption: "LWBS rate", range: "2\u20135%", defaultVal: "3%", source: "ED benchmark" },
      { assumption: "LWBS reduction", range: "10\u201330%", defaultVal: "15%", source: "Conserv." },
      { assumption: "Avg ED visit revenue", range: "$350\u2013600", defaultVal: "$450", source: "CMS" },
      { assumption: "E&M level uplift", range: "0.2\u20130.5", defaultVal: "0.3", source: "Abridge data" },
      { assumption: "Revenue per E&M level", range: "$30\u201380", defaultVal: "$50", source: "CMS fee" },
      { assumption: "Admission capture rate", range: "1\u20135%", defaultVal: "2%", source: "Conserv." },
      { assumption: "Avg admission value", range: "$8\u201315K", defaultVal: "$10K", source: "DRG avg" },
      { assumption: "Denial reduction", range: "5\u201315%", defaultVal: "8%", source: "Conserv." },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "LWBS RECOVERY", before: ["Current LWBS rate", "Door-to-disposition time"], after: ["Track LWBS rate changes", "Measure wait time impact"], timeline: "1\u20132 months" },
      { name: "THROUGHPUT", before: ["Patients/hour baseline", "Average door-to-dispo"], after: ["Compare throughput metrics", "Track volume trends"], timeline: "2\u20133 months" },
      { name: "E&M ACCURACY", before: ["E&M level distribution", "Coding accuracy audit"], after: ["Compare level mix pre/post", "Track by acuity"], timeline: "3\u20136 months" },
      { name: "DENIALS", before: ["Denial rate by category", "Medical necessity rates"], after: ["Track denial trends", "Compare appeal success"], timeline: "6\u201312 months" },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling ED ROI. All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
  inpatient: {
    settingLabel: "Inpatient",
    settingLabelLower: "inpatient",
    coverSubtitle: "A transparent framework for understanding where\ndocumentation accuracy drives reimbursement",
    contextHeadline: "Inpatient value is driven by DRG-based reimbursement\u2014documentation accuracy is everything.",
    contextBody: "Documentation accuracy directly impacts coding, CMI, and denials. Time saved creates capacity for rounding, throughput, and retention. When hospitalist notes capture full clinical complexity, the entire revenue cycle benefits.",
    contextQuestion: "The question is attribution\u2014how much improvement is Abridge vs. other factors.",
    cat1Label: "CAPACITY UNLOCKED",
    cat1Description: "Hospitalist retention, rounding efficiency, throughput. Documentation time saved creates space for clinical care and may improve length of stay.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "REVENUE OPTIMIZED",
    cat2Description: "DRG accuracy, CDI efficiency, denial prevention. Complete documentation drives coding accuracy and protects reimbursement.",
    cat2Footer: "Potential value (shown separately)",
    frameworkCallout: "We model both\u2014but we\u2019re honest about what\u2019s directly measurable versus what depends on coding workflows and CDI processes. DRG accuracy is trackable. Full revenue impact depends on the broader system.",
    categories: [
      {
        label: "CAPACITY UNLOCKED",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "Hospitalist Retention", attribution: "Influenceable", description: "Hospitalist burnout rates are among the highest. Reduced documentation burden may improve retention.", formula: "Hospitalists \u00D7 turnover \u00D7 burnout% \u00D7 impact \u00D7 replacement cost" },
          { name: "Throughput/LOS", attribution: "Potential", description: "Faster documentation supports earlier discharge decisions and care transitions.", formula: "Admissions \u00D7 LOS reduction \u00D7 cost/day \u00D7 realization" },
        ],
      },
      {
        label: "REVENUE OPTIMIZED",
        labelColor: colors.primary,
        mechanisms: [
          { name: "DRG Accuracy", attribution: "Measurable", description: "Complete documentation captures CC/MCC indicators, supporting accurate DRG assignment and protecting CMI.", formula: "At-risk encounters \u00D7 protection rate \u00D7 DRG weight increase \u00D7 base payment" },
          { name: "CDI Efficiency", attribution: "Measurable", description: "Real-time documentation reduces CDI queries, saving specialist time and improving workflow.", formula: "Admissions \u00D7 query rate \u00D7 reduction% \u00D7 cost/query" },
          { name: "Denial Prevention", attribution: "Measurable", description: "Complete inpatient documentation prevents medical necessity denials and supports payer appeals.", formula: "Claims \u00D7 denial rate \u00D7 reduction% \u00D7 avg denial value" },
        ],
      },
    ],
    careQualityCallout: "Inpatient documentation drives DRG accuracy\u2014but the revenue impact depends on coding workflows, CDI processes, and payer mix. We provide the documentation quality; your revenue cycle converts it.",
    honestLimits: {
      measure: ["CMI trends", "Query response rates", "Denial rates", "Doc time/encounter"],
      influence: ["Retention", "Throughput/LOS", "Satisfaction", "Care transitions"],
      enable: ["Readmission reduction", "Quality metrics", "Clinical outcomes", "Patient experience"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "Inpatient documentation is strengthened by nursing documentation. When both are on Abridge, the combined clinical picture drives higher coding accuracy and stronger appeals.",
    mechanismsSubtitle: "How Documentation Accuracy Becomes Value",
    assumptions: [
      { assumption: "Time saved/encounter", range: "1.5\u20134 min", defaultVal: "2.5 min", source: "Abridge data" },
      { assumption: "At-risk DRG encounters", range: "20\u201335%", defaultVal: "25%", source: "CDI benchmark" },
      { assumption: "DRG protection rate", range: "15\u201330%", defaultVal: "20%", source: "Conserv." },
      { assumption: "Avg DRG weight increase", range: "0.3\u20130.6", defaultVal: "0.4", source: "CMS" },
      { assumption: "Base DRG payment", range: "$5\u20138K", defaultVal: "$6,500", source: "Medicare avg" },
      { assumption: "CDI query reduction", range: "20\u201340%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Denial rate reduction", range: "10\u201325%", defaultVal: "15%", source: "Conserv." },
      { assumption: "Hospitalist turnover", range: "5\u20138%", defaultVal: "6%", source: "SHM" },
      { assumption: "Burnout-related %", range: "30\u201350%", defaultVal: "40%", source: "Research" },
      { assumption: "Replacement cost", range: "$300\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny.",
    validation: [
      { name: "DRG / CMI", before: ["CMI by service line", "CC/MCC capture rate"], after: ["Track CMI trends", "Compare capture rates"], timeline: "3\u20136 months" },
      { name: "CDI EFFICIENCY", before: ["Query volume/rate", "Resolution time"], after: ["Track query reduction", "Measure time savings"], timeline: "2\u20133 months" },
      { name: "DENIALS", before: ["Denial rate by type", "Appeal success rate"], after: ["Track denial trends", "Compare appeal outcomes"], timeline: "6\u201312 months" },
      { name: "RETENTION", before: ["Baseline turnover", "Burnout survey scores"], after: ["Track turnover rates", "Repeat burnout surveys"], timeline: "12\u201318 months" },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling inpatient ROI. All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
};

function CoverPage({ setting }: { setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
        <Text style={styles.coverTitle}>{data.settingLabel}: How We{"\n"}Think About Value</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>{data.coverSubtitle}</Text>
        <Text style={styles.coverDate}>{dateStr}</Text>
      </View>
      <View style={styles.coverDisclaimer}>
        <Text style={styles.coverDisclaimerText}>
          Every assumption is visible. Every calculation is transparent.
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
      <Text style={styles.footerRight}>Page {pageNum} of 3</Text>
    </View>
  );
}

function MechanismItem({ mechanism, isLast }: { mechanism: MechanismData; isLast: boolean }) {
  return (
    <View>
      <View style={{ paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.primary }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{mechanism.name}</Text>
          <Text style={{ fontSize: 8.5, color: colors.tertiary }}>{mechanism.attribution}</Text>
        </View>
        <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 3 }}>{mechanism.description}</Text>
        <Text style={{ fontSize: 9, color: mechanism.formulaColor || colors.primary }}>{mechanism.formula}</Text>
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

        <View style={[styles.cardBg, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>{data.contextHeadline}</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>{data.contextBody}</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText }}>{data.contextQuestion}</Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>TWO VALUE CATEGORIES</Text>
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

        <View style={[styles.calloutBox, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>{data.frameworkCallout}</Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>THE HONEST LIMITS</Text>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
            <View style={{ flex: 1, borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 8 }}>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>WHAT WE MEASURE</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>Direct attribution</Text>
              {data.honestLimits.measure.map((item, i) => (
                <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>{"\u00B7"} {item}</Text>
              ))}
            </View>
            <View style={{ flex: 1, borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 8 }}>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>WHAT WE INFLUENCE</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>Indirect attribution</Text>
              {data.honestLimits.influence.map((item, i) => (
                <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>{"\u00B7"} {item}</Text>
              ))}
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
            <View style={{ borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: 8 }}>
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>WHAT WE ENABLE</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>Supportive only</Text>
              <View style={{ flexDirection: "row", gap: 20 }}>
                <View style={{ flex: 1 }}>
                  {data.honestLimits.enable.slice(0, 2).map((item, i) => (
                    <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>{"\u00B7"} {item}</Text>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  {data.honestLimits.enable.slice(2).map((item, i) => (
                    <Text key={i} style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>{"\u00B7"} {item}</Text>
                  ))}
                </View>
              </View>
              {setting === "nursing" && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>Documentation creates visibility.{"\n"}Clinical teams act on it.</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>{data.connectedValueLabel}</Text>
        <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.5 }}>{data.connectedValue}</Text>

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
        <Text style={styles.sectionLabel}>VALUE MECHANISMS</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>{data.mechanismsSubtitle}</Text>

        <View style={styles.divider} />

        {data.categories.map((cat, ci) => (
          <View key={ci}>
            <Text style={{ fontSize: 9, color: cat.labelColor, textTransform: "uppercase", letterSpacing: 2, marginTop: ci > 0 ? 10 : 0, marginBottom: 6, fontWeight: "bold" }}>{cat.label}</Text>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: 6 }}>
              {cat.mechanisms.map((m, mi) => (
                <MechanismItem key={mi} mechanism={m} isLast={mi === cat.mechanisms.length - 1} />
              ))}
            </View>
            {ci < data.categories.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <View style={[styles.calloutBox, { marginBottom: 0 }]}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>{data.careQualityCallout}</Text>
          </View>
        </View>

        <PageFooter pageNum={2} setting={setting} />
      </View>
    </Page>
  );
}

function Page3Content({ setting }: { setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>TRANSPARENCY</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Every Number Has a Source</Text>
        <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>We don{"\u2019"}t hide assumptions. If your data is different, the model adapts.</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>KEY ASSUMPTIONS</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 3, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>ASSUMPTION</Text>
            <Text style={{ flex: 1.5, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>RANGE</Text>
            <Text style={{ flex: 1.5, fontSize: 8, fontWeight: "bold", color: colors.primary }}>DEFAULT</Text>
            <Text style={{ flex: 1.5, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>SOURCE</Text>
          </View>
          {data.assumptions.map((row, i) => (
            <View key={i} style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 10, backgroundColor: i % 2 === 1 ? colors.cards : colors.background, borderBottomWidth: i < data.assumptions.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 3, fontSize: 8.5, color: colors.primaryText }}>{row.assumption}</Text>
              <Text style={{ flex: 1.5, fontSize: 8.5, color: colors.secondary }}>{row.range}</Text>
              <Text style={{ flex: 1.5, fontSize: 8.5, color: colors.primary, fontWeight: "bold" }}>{row.defaultVal}</Text>
              <Text style={{ flex: 1.5, fontSize: 8.5, color: colors.secondary }}>{row.source}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.calloutBox, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{data.conservativeCallout}</Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>VALIDATION PATH</Text>
        <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>Our projections are starting points. The real answers come from your data.</Text>

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
        <View style={[styles.twoColRow, { marginBottom: 8 }]}>
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

        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>{data.closingNote}</Text>

        <PageFooter pageNum={3} setting={setting} />
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
      <Page3Content setting={setting} />
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
