import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../assets/fonts/manrope-regular.ttf";
import manropeBold from "../assets/fonts/manrope-bold.ttf";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
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
    contextBody: "In outpatient medicine, a physician saves 3 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. Nurses don\u2019t bill. They don\u2019t generate wRVUs. And yet nursing documentation burden is massive\u201425\u201335% of every shift spent on flowsheets, assessments, handoffs, and charting.",
    contextQuestion: "So where does the value live?",
    cat1Label: "LABOR ECONOMICS",
    cat1Description: "Overtime, retention, and agency spend. Real dollars that show up in the budget. When nurses spend less time documenting, they finish shifts on time, burn out less, and the organization needs fewer travel nurses.",
    cat1Footer: "Direct, measurable",
    cat2Label: "CARE QUALITY ENABLEMENT",
    cat2Description: "Falls, pressure injuries, patient satisfaction. Influenced by bedside time. But the causal chain is indirect\u2014documentation supports care, it doesn\u2019t replace it.",
    cat2Footer: "Potential value (shown separately)",
    frameworkCallout: "We model both\u2014but we\u2019re honest about what\u2019s directly measurable versus what we only enable. Labor economics value is defensible in internal stakeholder conversations. Care quality potential is real but requires clinical practice to realize.",
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
    contextHeadline: "Outpatient has the clearest path from time saved to dollars\u2014which is exactly why the assumptions matter most here.",
    contextBody: "A physician saves 2\u20134.5 minutes per visit. That time can become more patients, less pajama-time charting, or better documentation quality. Billing creates traceability, but traceability isn\u2019t the same as simplicity. Every conversion step has a realization rate, and we model each one honestly.",
    contextQuestion: "The answer depends on your practice\u2014and we give you every lever to adjust it.",
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
          { name: "Potential Value", attribution: "Measurable", description: "Time saved on documentation reduces overtime, after-hours work, and per-encounter labor cost.", formula: "Providers \u00D7 encounters \u00D7 time saved \u00D7 hourly rate \u00D7 realization" },
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
      measure: ["Time/encounter (visible in weeks)", "wRVU per visit (90 days)", "Same-day note closure", "After-hours charting"],
      influence: ["Capacity (requires demand + scheduling)", "HCC recapture (MA-dependent)", "Denial prevention (multi-factorial)", "Provider satisfaction"],
      enable: ["Retention (12-18 months)", "Patient satisfaction (CAHPS)", "Referral quality", "Quality metrics"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "Outpatient documentation quality impacts downstream referrals (specialists receive better context), HCC accuracy for value-based contracts (RAF scores depend on annual documentation), and pre-authorization efficiency (complete clinical notes reduce prior auth denials).",
    mechanismsSubtitle: "How Time Saved Becomes Value",
    assumptions: [
      { assumption: "Time saved/encounter", range: "2\u20134.5 min", defaultVal: "3 min", source: "Abridge data" },
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
    coverSubtitle: "A transparent framework for understanding where\nspeed matters and every minute counts differently",
    contextHeadline: "In the ED, you can\u2019t schedule value\u2014it shows up in the patients you keep and the complexity you capture.",
    contextBody: "Time savings per encounter are smaller here\u20142\u20134 minutes vs. 2\u20134.5 in outpatient\u2014because ED documentation is already faster-paced with more templated workflows. But the ED is a volume engine. At 40,000\u201380,000 visits per year, those minutes compound: three minutes across 50,000 visits is 2,500 hours of physician time. The ED\u2019s unique challenge is that notes get worse when volume gets high. During surges, documentation quality drops\u2014E/M levels understate complexity, medical necessity gets under-documented, and for admitted patients, the ED note becomes the foundation of the entire inpatient DRG. Ambient AI doesn\u2019t get tired during a surge.",
    contextQuestion: "Three value paths\u2014each with different measurement challenges.",
    cat1Label: "THROUGHPUT & LWBS",
    cat1Description: "Every patient who leaves without being seen is lost revenue\u2014$300\u2013$500+ per visit, gone permanently. Faster documentation contributes to faster throughput, which can recover some of these patients.",
    cat1Footer: "Trackable, attribution is the challenge",
    cat2Label: "DOCUMENTATION QUALITY",
    cat2Description: "E/M accuracy during surges, medical necessity capture, and the ED-to-inpatient connection. When notes reflect what actually happened, coding is accurate and denials are preventable.",
    cat2Footer: "Measurable and auditable",
    frameworkCallout: "We model throughput, documentation quality, and clinician sustainability\u2014but we\u2019re honest about measurement timelines. LWBS recovery is trackable in weeks. E/M accuracy is auditable from claims data. Retention takes 12\u201318 months. We explicitly note that throughput depends on staffing, triage, and bed management\u2014documentation speed is one lever, not the only one.",
    categories: [
      {
        label: "THROUGHPUT & LWBS",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "LWBS Recovery", attribution: "Measurable", description: "When physicians spend less time documenting, they move through patients faster. Faster throughput means shorter wait times, and shorter wait times mean fewer patients leave before being seen. Each recovered LWBS patient is revenue that was walking out the door. Documentation speed is one factor among many\u2014staffing, triage, bed availability all matter\u2014so we use conservative recovery rates (5\u201315%).", formula: "Annual visits \u00D7 LWBS rate (2\u20134%) \u00D7 Recovery % (5\u201315%) \u00D7 Avg ED visit revenue ($300\u2013500)" },
        ],
      },
      {
        label: "DOCUMENTATION QUALITY",
        labelColor: colors.primary,
        mechanisms: [
          { name: "E/M Level Accuracy", attribution: "Measurable", description: "During surges, ED notes understate what actually happened. A physician manages a complex patient\u2014multiple differentials, medication adjustments, procedure decisions\u2014but the note reflects a simpler encounter because there wasn\u2019t time to document the full decision-making. ED wRVU lift is typically lower than outpatient (2\u20134% vs 3\u20137%) because ED workflows are already more templated. We account for this.", formula: "Encounters \u00D7 Baseline wRVU (2.0\u20133.0) \u00D7 Lift % (2\u20134%) \u00D7 Conversion factor \u00D7 Realization" },
          { name: "Medical Necessity & Denials", attribution: "Measurable", description: "Medical necessity is the ED\u2019s denial vulnerability. When a note doesn\u2019t capture why a test was ordered, why a patient was admitted, or why observation wasn\u2019t sufficient\u2014that\u2019s a denial waiting to happen. Many ED denials are unappealable because the documentation gap existed at the time of service. Your RCM team can categorize denials by root cause\u2014documentation-related denials are identifiable.", formula: "Claims \u00D7 Denial rate \u00D7 Doc-related % \u00D7 Prevention rate \u00D7 Avg claim value" },
          { name: "CDI & Inpatient Connection", attribution: "Connected", description: "For admitted patients (15\u201325% of ED visits), the ED note is where the inpatient stay begins. A complete ED note captures presenting conditions, comorbidities, and clinical reasoning that CDI teams need for accurate DRG assignment. When ED notes are thin, CDI teams spend time querying\u2014and some opportunities are missed entirely. We quantify this in the Inpatient methodology to avoid double-counting.", formula: "ED admissions \u00D7 DRG improvement rate \u00D7 Avg DRG value increase ($6\u20138K) \u00D7 Realization" },
          { name: "Clinician Sustainability", attribution: "Influenceable", description: "ED physician burnout isn\u2019t a trend\u2014it\u2019s a workforce crisis. Documentation burden is consistently cited as a top contributor. At $400K\u2013$700K per physician replacement, the cost isn\u2019t just recruiting\u2014it\u2019s locum coverage at $250\u2013$400/hour, coverage gaps affecting throughput, and institutional knowledge that walks out the door. We use conservative impact rates (10\u201320%) because documentation is one of many burnout drivers.", formula: "ED physicians \u00D7 Turnover (8\u201315%) \u00D7 Burnout % \u00D7 Impact (10\u201320%) \u00D7 Replacement cost ($400\u2013700K)" },
        ],
      },
    ],
    careQualityCallout: "ED throughput depends on staffing, patient flow, and bed management\u2014documentation speed is one lever, not the only one. E/M accuracy is auditable from claims data: compare high-volume vs. low-volume shifts for similar patient populations. If high-volume shifts show lower E/M levels, that gap is documentation-driven, not clinical.",
    honestLimits: {
      measure: ["Doc time per encounter (EHR timestamps, weeks)", "E/M level distribution (claims data, auditable)", "Denial rates by category (RCM data)", "LWBS rate (every ED tracks this)"],
      influence: ["Throughput (staffing, triage, bed management)", "Door-to-doc time (multi-factorial)", "CDI queries on admitted patients", "Provider satisfaction surveys"],
      enable: ["DRG impact on admits (indirect, see Inpatient)", "Retention (12\u201318 months to measure)", "Care continuity (downstream)", "Patient experience"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "ED documentation drives downstream inpatient revenue\u2014when ED notes capture presenting conditions and comorbidities, inpatient CDI has a stronger foundation for DRG accuracy. For admitted patients, the ED note is where the inpatient stay begins. ED nursing notes also feed into inpatient handoff quality. We quantify this connection in the Inpatient methodology to avoid double-counting across settings.",
    mechanismsSubtitle: "How Time Saved Becomes Value in the ED",
    assumptions: [
      { assumption: "Time saved/encounter", range: "2\u20134 min", defaultVal: "3 min", source: "Abridge data" },
      { assumption: "ED wRVU baseline", range: "2.0\u20133.0", defaultVal: "2.5", source: "ACEP benchmarks" },
      { assumption: "wRVU lift %", range: "2\u20134%", defaultVal: "3%", source: "Abridge data" },
      { assumption: "LWBS rate", range: "2\u20134%", defaultVal: "3%", source: "National benchmark" },
      { assumption: "LWBS recovery rate", range: "5\u201315%", defaultVal: "10%", source: "Conservative" },
      { assumption: "Avg ED visit revenue", range: "$300\u2013500", defaultVal: "$400", source: "Blended avg" },
      { assumption: "ED admission rate", range: "15\u201325%", defaultVal: "20%", source: "Acuity-dependent" },
      { assumption: "Avg DRG value increase", range: "$6\u20138K", defaultVal: "$7K", source: "DRG avg" },
      { assumption: "Denial reduction", range: "5\u201315%", defaultVal: "8%", source: "Conservative" },
      { assumption: "Physician turnover", range: "8\u201315%", defaultVal: "10%", source: "ACEP surveys" },
      { assumption: "Replacement cost", range: "$400\u2013700K", defaultVal: "$500K", source: "Merritt Hawkins" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny. If your LWBS rate is already below 2%, that lever is smaller. If your E/M distribution looks consistent across shift volumes, the documentation gap may be minimal. We let you adjust based on your reality.",
    validation: [
      { name: "LWBS RECOVERY", before: ["Current LWBS rate by shift", "Door-to-disposition time"], after: ["Track LWBS rate changes weekly", "Measure wait time impact"], timeline: "1\u20132 months" },
      { name: "E/M ACCURACY", before: ["E/M level distribution by shift volume", "Coding accuracy audit"], after: ["Compare level mix pre/post", "Compare high vs. low volume shifts"], timeline: "3\u20136 months" },
      { name: "DENIALS", before: ["Denial rate by reason code", "Medical necessity denial rates"], after: ["Track denial trends on Abridge shifts", "Compare appeal success rates"], timeline: "6\u201312 months" },
      { name: "RETENTION", before: ["Baseline turnover rate", "Exit interview data on burnout"], after: ["Track turnover Abridge vs. pre-impl", "Survey on documentation satisfaction"], timeline: "12\u201318 months" },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling ED ROI. We lead with what\u2019s measurable (LWBS, E/M accuracy) and are transparent about what takes longer to prove (retention). All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
  inpatient: {
    settingLabel: "Inpatient",
    settingLabelLower: "inpatient",
    coverSubtitle: "A transparent framework for understanding where\ndocumentation accuracy drives DRG economics",
    contextHeadline: "Inpatient is where documentation has the highest per-note financial impact in healthcare.",
    contextBody: "A single admission note that captures an additional CC/MCC can shift DRG weight by 0.3\u20130.5\u2014worth $2,000\u2013$4,000 in reimbursement. But inpatient revenue is team-produced: the hospitalist documents, CDI reviews, coders assign, and the DRG determines payment. Ambient AI improves step one\u2014and when step one is better, every downstream step benefits. Unlike outpatient, hospitalists can\u2019t \u201Csee more patients\u201D with saved time. They have an assigned census. Value shows up in DRG accuracy, CDI efficiency, and reduced documentation burden\u2014not throughput.",
    contextQuestion: "The challenge: how much can documentation improvement credibly claim?",
    cat1Label: "DOCUMENTATION QUALITY",
    cat1Description: "DRG accuracy, CDI query reduction, denial prevention. When documentation captures clinical complexity, revenue follows. The notes drive the payment.",
    cat1Footer: "Direct, measurable value",
    cat2Label: "CLINICIAN WELLBEING",
    cat2Description: "Hospitalists document H&Ps, daily progress notes, and discharge summaries\u201415\u201340 minutes per admission. Reducing this burden improves work-life balance and retention.",
    cat2Footer: "Indirect value (no capacity expansion)",
    frameworkCallout: "We model both\u2014but we lead with documentation quality because that\u2019s where the defensible, measurable value lives in inpatient. Clinician wellbeing is real but requires longer measurement timelines. We explicitly do not claim LOS reduction, capacity expansion, or readmission reduction\u2014the causal chains are too long.",
    categories: [
      {
        label: "DOCUMENTATION QUALITY",
        labelColor: colors.secondary,
        mechanisms: [
          { name: "DRG Accuracy (CC/MCC Capture)", attribution: "Measurable", description: "When hospitalists discuss AKI, malnutrition, or respiratory failure at bedside but the note says \u201Crenal function stable,\u201D that missing specificity costs $2,000\u2013$4,000 in DRG weight. Ambient AI captures the clinical conversation so the note reflects what actually happened. This isn\u2019t upcoding\u2014it\u2019s ensuring documentation reflects care delivered.", formula: "Admissions at risk (20\u201330%) \u00D7 Protection rate (20%) \u00D7 DRG weight increase (0.4) \u00D7 Base payment ($6K) \u00D7 Realization (50%)" },
          { name: "CDI Query Reduction", attribution: "Measurable", description: "Every CDI query represents a documentation gap\u2014something that should have been in the note. Each query costs $40\u2013$60 in CDI labor (creation, tracking, follow-up) plus physician response time. When documentation captures clinical detail at point of care, fewer queries are needed. CDI departments track query volume daily\u2014this is one of the cleanest metrics to measure.", formula: "Admissions \u00D7 Query rate (25\u201335%) \u00D7 Reduction % (15\u201335%) \u00D7 Cost per query ($40\u2013$60)" },
          { name: "Denial Prevention", attribution: "Connected", description: "Inpatient denials are the most expensive in healthcare\u2014average claim values of $8,000\u2013$15,000. Medical necessity denials, observation vs. inpatient status challenges, and DRG downgrade audits all stem from documentation gaps. We include denial prevention within DRG accuracy to avoid double-counting\u2014complete documentation supports both appropriate DRG assignment AND denial defense.", formula: "Combined with DRG accuracy (3\u20136% leakage, 15\u201325% Abridge capture)" },
        ],
      },
      {
        label: "CLINICIAN WELLBEING",
        labelColor: colors.primary,
        mechanisms: [
          { name: "Retention Savings", attribution: "Influenceable", description: "Hospitalist medicine has some of the highest turnover in healthcare. Documentation burden during overnight admits and weekend shifts is a major driver. At $400K\u2013$600K per replacement, every hospitalist retained represents significant avoided cost. The financial impact extends far beyond recruitment\u2014institutional knowledge, coverage gaps, and months of onboarding.", formula: "Hospitalists \u00D7 Turnover (8\u201312%) \u00D7 Burnout % (40\u201350%) \u00D7 Abridge impact (15%) \u00D7 Replacement cost ($400K)" },
        ],
      },
    ],
    careQualityCallout: "Documentation value in inpatient is about accuracy, not speed. We capture what was discussed\u2014that\u2019s where the DRG value lives. Unlike outpatient where time converts to additional visits, inpatient time savings return to clinical care: more thorough rounds, earlier discharge planning, better handoffs. We show hours returned rather than dollar value for time savings.",
    honestLimits: {
      measure: ["Documentation time per note type (weeks)", "CDI query rates (tracked daily)", "CMI trends (claims data, quarterly)", "Note completeness (CDI audit)"],
      influence: ["DRG accuracy (team-produced revenue)", "Denial rates (payer-dependent, 6+ mo)", "DRG finalization speed", "Coder productivity"],
      enable: ["Length of stay (not defensible)", "Capacity expansion (not applicable)", "Readmission reduction (too indirect)", "Rounding efficiency (hours, not $)"],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "Inpatient sits at the center of the hospital value chain. ED documentation feeds in (stronger admission notes, comorbidity capture). Nursing documentation supports CC/MCC coding (skin assessments, fall risk, nutritional status). Complete discharge summaries improve outpatient follow-up and care continuity. We don\u2019t sum cross-setting values\u2014attribution gets complex\u2014but when building a system-level business case, these connections matter.",
    mechanismsSubtitle: "How Documentation Accuracy Becomes DRG Value",
    assumptions: [
      { assumption: "Time saved/admission", range: "15\u201345 min", defaultVal: "30 min", source: "Customer data" },
      { assumption: "At-risk admissions", range: "20\u201330%", defaultVal: "25%", source: "CDI benchmarks" },
      { assumption: "DRG protection rate", range: "15\u201325%", defaultVal: "20%", source: "Conservative" },
      { assumption: "DRG weight increase", range: "0.3\u20130.5", defaultVal: "0.4", source: "CMS differentials" },
      { assumption: "Base DRG payment", range: "$5.5\u20137.5K", defaultVal: "$6,000", source: "CMS base rate" },
      { assumption: "CDI query rate", range: "25\u201335%", defaultVal: "30%", source: "ACDIS benchmarks" },
      { assumption: "Query reduction %", range: "15\u201335%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Cost per query", range: "$40\u201360", defaultVal: "$50", source: "ACDIS productivity" },
      { assumption: "Hospitalist turnover", range: "8\u201312%", defaultVal: "8%", source: "SHM benchmarks" },
      { assumption: "Burnout-related %", range: "40\u201350%", defaultVal: "45%", source: "Research" },
      { assumption: "Replacement cost", range: "$350\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
      { assumption: "Realization rate", range: "40\u201360%", defaultVal: "50%", source: "Conservative" },
    ],
    conservativeCallout: "We\u2019d rather show a defensible DRG improvement number based on CDI data than a speculative LOS reduction based on assumptions. Every variable in our model is editable\u2014because your CDI team knows your gaps better than any default can.",
    validation: [
      { name: "DRG / CMI", before: ["12 months CMI by hospitalist", "CC/MCC capture rates by provider"], after: ["Compare CMI Abridge vs. control", "Track CC/MCC changes quarterly"], timeline: "3\u20136 months" },
      { name: "CDI QUERIES", before: ["Query volume by physician", "Query types and resolution time"], after: ["Track query rates Abridge vs. control", "Measure CDI productivity gains"], timeline: "2\u20133 months" },
      { name: "DENIAL RATES", before: ["Denial rates by reason code", "Documentation-related root causes"], after: ["Track denials on Abridge admissions", "Compare appeal success rates"], timeline: "6\u201312 months" },
      { name: "RETENTION", before: ["Baseline turnover by program", "Exit interview data on burnout"], after: ["Track turnover Abridge vs. pre-impl", "Survey on documentation satisfaction"], timeline: "12\u201318 months" },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling inpatient ROI. We lead with documentation quality because that\u2019s where the defensible value lives. All defaults are conservative and editable. The goal is a defensible framework\u2014not a predetermined answer.",
  },
};

function CoverPage({ setting }: { setting: MethodologyCareSetting }) {
  const data = settingData[setting];
  return (
    <PDFCoverPage
      reportLabel="ROI METHODOLOGY"
      title={`${data.settingLabel}: How We Think About Value`}
      subtitle={data.coverSubtitle}
      showPreparedBy={false}
      disclaimerText="Every assumption is visible. Every calculation is transparent."
    />
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
    <Page size="LETTER" style={styles.page} wrap={false}>
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
    <Page size="LETTER" style={styles.page} wrap={false}>
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
    <Page size="LETTER" style={styles.page} wrap={false}>
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

  await savePdfBlob(blob, filename, data.settingLabel + " ROI Methodology");
}
