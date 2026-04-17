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

interface DomainCard {
  label: string;
  description: string;
  footer: string;
  accentColor: string;
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
  domains?: DomainCard[];
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
    coverSubtitle: "A transparent framework for understanding where\ntime saved becomes measurable value across four domains",
    contextHeadline: "Outpatient has the clearest path from time saved to dollars\u2014which is exactly why the assumptions matter most here.",
    contextBody: "A physician saves 2\u20134 minutes per visit. That time can become more patients, less pajama-time charting, or better documentation quality. Billing creates traceability, but traceability isn\u2019t the same as simplicity. Every conversion step has a realization rate, and we model each one honestly. The four-domain framework keeps the story organized: Quality is about what gets documented. Workforce is about who stays. Capacity is about throughput. Revenue is about what coding and billing recover.",
    contextQuestion: "Four value domains \u2014 each with a different measurement timeline.",
    cat1Label: "CAPACITY",
    cat1Description: "More patients seen, less after-hours work.",
    cat1Footer: "Measurable",
    cat2Label: "REVENUE",
    cat2Description: "wRVU accuracy, HCC capture, denial prevention.",
    cat2Footer: "Auditable",
    domains: [
      {
        label: "QUALITY",
        description: "When documentation is complete, downstream care improves. Specialist referrals arrive with context. Chronic conditions get captured for value-based contracts. Pre-authorization notes survive scrutiny. Quality outcomes are the hardest to monetize\u2014so we measure them and report them rather than manufacture a dollar figure.",
        footer: "Strategic \u2014 qualitative, tracked not monetized",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Physician burnout in outpatient medicine is driven more by documentation burden than by patient volume. After-hours charting\u2014pajama time\u2014is the most cited frustration. When documentation is faster, physicians leave work on time, feel less administrative burden, and are more likely to stay. At $250K\u2013$500K per replacement, every physician retained is a significant avoided cost.",
        footer: "Influenceable \u2014 retention impact at 12\u201318 months",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "Freed documentation time can become additional patient visits\u2014increasing throughput and practice revenue. It can also reduce after-hours charting without adding volume. The conversion rate from documentation time saved to capacity gained depends on scheduling patterns, demand, and practice model. We model it honestly with adjustable levers.",
        footer: "Measurable \u2014 visit volume and schedule utilization",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "Better documentation supports accurate coding. Notes that capture full clinical complexity yield higher wRVUs. Complete documentation of chronic conditions improves risk adjustment for Medicare Advantage populations. Documentation gaps drive unappealable denials\u2014real-time capture prevents permanent revenue loss. All three are measurable from existing billing and claims data.",
        footer: "Auditable \u2014 billing data within 90 days",
        accentColor: colors.secondary,
      },
    ],
    frameworkCallout: "We model all four domains\u2014but we\u2019re transparent about what each requires to measure. Capacity is visible in weeks. Revenue (wRVU, denials) is auditable from claims data within 90 days. Workforce (retention) takes 12\u201318 months. Quality drives downstream outcomes we track and report\u2014because honest measurement is more defensible than a made-up number.",
    categories: [
      {
        label: "QUALITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Referral & Downstream Documentation",
            attribution: "Strategic",
            description: "When outpatient notes capture full clinical context\u2014differential reasoning, exam findings, medication rationale\u2014specialist referrals arrive with the information needed to act. Thin referral notes create redundant workups, delays, and patient frustration. Documentation quality is the upstream input to care coordination quality.",
            formula: "Measured: referral note completeness rate, prior auth approval rate, specialist query volume on incoming referrals",
          },
          {
            name: "HCC Accuracy (Medicare Advantage)",
            attribution: "Potential",
            description: "Medicare Advantage populations require annual documentation of active chronic conditions to maintain RAF scores. When documentation is complete and specific\u2014using the right ICD-10 codes, capturing status and treatment\u2014risk adjustment payments follow. When conditions are documented inconsistently year-over-year, RAF scores drift downward and per-member payments fall.",
            formula: "MA patients \u00D7 Condition gap rate \u00D7 Recapture % (20\u201335%) \u00D7 RAF impact \u00D7 Per-member payment",
          },
        ],
      },
      {
        label: "WORKFORCE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "Provider Retention Savings",
            attribution: "Influenceable",
            description: "Documentation burden is the single most-cited driver of physician burnout in outpatient medicine. Abridge reduces after-hours charting\u2014pajama time\u2014and between-patient documentation time. At $250K\u2013$500K per physician replacement (recruiting, onboarding, productivity ramp, and coverage), even a modest reduction in burnout-driven departures generates significant avoided cost. We use conservative impact rates because documentation is one of many burnout factors.",
            formula: "Providers \u00D7 Turnover (4\u20138%) \u00D7 Burnout % (30\u201350%) \u00D7 Abridge impact (10\u201320%) \u00D7 Replacement cost ($250\u2013500K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Patient Access Expansion",
            attribution: "Measurable",
            description: "When documentation per encounter takes less time, that time can be reallocated to additional patient visits. The conversion rate is not 100%\u2014scheduling, demand, and practice model constrain it. We apply a realistic conversion rate (15\u201330%) and let you adjust based on your scheduling patterns. Practices with open access models and unmet demand see higher capacity conversion than fully booked panels.",
            formula: "Hours saved \u00D7 % to capacity (15\u201330%) \u00D7 Revenue per visit \u00D7 Realization (70\u201385%)",
          },
          {
            name: "Operational Time Recovery",
            attribution: "Measurable",
            description: "Time saved that doesn\u2019t convert to additional patients still has value\u2014it reduces after-hours overtime, lowers per-encounter labor cost, and improves the economics of the practice day. We show this as a floor scenario: even if zero additional patients are seen, documentation time has a dollar value based on the hourly cost of physician time.",
            formula: "Providers \u00D7 Encounters \u00D7 Time saved (2\u20134 min) \u00D7 Conversion (15\u201330%) \u00D7 Physician hourly rate ($100\u2013250)",
          },
        ],
      },
      {
        label: "REVENUE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "wRVU Capture",
            attribution: "Measurable",
            description: "Better documentation supports accurate coding. Notes that capture full clinical complexity\u2014multiple diagnoses addressed, medical decision-making detail, time-based billing eligibility\u2014yield higher wRVUs. The mechanism is documentation of complexity that was already delivered, not upcoding. wRVU lift is auditable from billing data by comparing level mix before and after implementation.",
            formula: "Encounters \u00D7 Avg wRVU (specialty-specific) \u00D7 Lift % (2\u20137%) \u00D7 Conversion factor ($33\u201336) \u00D7 Realization (75\u201385%)",
          },
          {
            name: "Denial Prevention",
            attribution: "Potential",
            description: "Documentation gaps drive unappealable denials\u2014revenue that is permanently lost, not just delayed. The most common outpatient denial root causes are missing medical necessity language, incomplete exam documentation, and absent clinical rationale for ordered services. Real-time capture prevents these gaps at the point of care. Your RCM team can identify documentation-related denials by root cause code.",
            formula: "Encounters \u00D7 Denial rate \u00D7 Doc-related % \u00D7 Prevention rate (25\u201350%) \u00D7 Avg claim value",
          },
        ],
      },
    ],
    careQualityCallout: "Revenue optimization depends on coding workflows, payer mix, and practice patterns. We provide the framework\u2014your data determines the magnitude. HCC accuracy is most valuable for MA-heavy practices; wRVU lift matters most in fee-for-service contexts. The model lets you weight each lever based on your payer mix.",
    honestLimits: {
      measure: [
        "Time per encounter \u2014 EHR timestamps, visible in weeks",
        "wRVU per visit \u2014 claims data, auditable at 90 days",
        "Same-day note closure rate",
        "After-hours charting volume (EHR session data)",
      ],
      influence: [
        "Patient capacity \u2014 requires demand + scheduling alignment",
        "HCC recapture \u2014 MA-dependent, requires coding workflow",
        "Denial prevention \u2014 multi-factorial, RCM team dependent",
        "Provider satisfaction \u2014 survey-based, directional",
      ],
      enable: [
        "Retention \u2014 12\u201318 months to measure",
        "Referral quality \u2014 downstream, hard to attribute",
        "Patient satisfaction (CAHPS) \u2014 multi-factorial",
        "Quality metrics \u2014 clinical practice dependent",
      ],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "Outpatient documentation quality impacts downstream referrals (specialists receive better context), HCC accuracy for value-based contracts (RAF scores depend on annual documentation), and pre-authorization efficiency (complete clinical notes reduce prior auth denials). When outpatient notes are strong, the entire care continuum benefits.",
    mechanismsSubtitle: "How Each Domain Creates Value in Outpatient",
    assumptions: [
      { assumption: "Time saved/encounter", range: "2\u20134 min", defaultVal: "3 min", source: "Abridge data" },
      { assumption: "Time conversion rate", range: "15\u201330%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Physician hourly rate", range: "$100\u2013250", defaultVal: "$150", source: "MGMA" },
      { assumption: "Visit duration", range: "15\u201330 min", defaultVal: "20 min", source: "Specialty avg" },
      { assumption: "Revenue per visit", range: "$150\u2013350", defaultVal: "$200", source: "Practice data" },
      { assumption: "wRVU value", range: "$30\u201340", defaultVal: "$33", source: "CMS" },
      { assumption: "wRVU lift %", range: "2\u20137%", defaultVal: "5.5%", source: "Abridge data" },
      { assumption: "HCC gap rate (MA)", range: "15\u201330%", defaultVal: "20%", source: "MA benchmarks" },
      { assumption: "HCC recapture %", range: "20\u201335%", defaultVal: "25%", source: "Conservative" },
      { assumption: "Denial prevention rate", range: "25\u201350%", defaultVal: "35%", source: "RCM benchmarks" },
      { assumption: "Physician turnover", range: "4\u20138%", defaultVal: "6%", source: "AAMC" },
      { assumption: "Burnout-related %", range: "30\u201350%", defaultVal: "40%", source: "AMA research" },
      { assumption: "Retention impact", range: "10\u201320%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$250\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny. The answer depends on your practice\u2014payer mix, scheduling model, and specialty all move the levers. We give you the framework; you supply the data that determines the magnitude.",
    validation: [
      {
        name: "CAPACITY (TIME SAVINGS)",
        before: ["EHR session data \u2014 time per encounter, after-hours charting", "Schedule utilization and open slot rate"],
        after: ["Repeat EHR session data \u2014 Abridge vs. control providers", "Track encounter volume changes"],
        timeline: "2\u20134 weeks",
      },
      {
        name: "REVENUE (wRVU + DENIALS)",
        before: ["wRVU distribution by provider and E/M level mix", "Denial rate by reason code \u2014 documentation-related"],
        after: ["Compare wRVU distribution pre/post \u2014 Abridge vs. control", "Track denial rate trend quarterly"],
        timeline: "3\u20136 months",
      },
      {
        name: "QUALITY (HCC + REFERRALS)",
        before: ["HCC capture rate for MA population", "Prior auth approval rate, referral note completeness"],
        after: ["Track HCC recapture on Abridge providers vs. control", "Survey specialist partners on referral note quality"],
        timeline: "3\u20136 months",
      },
      {
        name: "WORKFORCE (RETENTION)",
        before: ["Baseline turnover rate by provider group", "Exit interview data \u2014 documentation burnout attribution"],
        after: ["Track turnover Abridge vs. pre-implementation", "Survey on documentation satisfaction at 6 and 12 months"],
        timeline: "12\u201318 months",
      },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling outpatient ROI across four domains: Quality, Workforce, Capacity, and Revenue. We lead with what\u2019s measurable (time savings, wRVU accuracy) and are transparent about what takes longer to prove (retention) and what we track without monetizing (referral quality, care coordination). All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
  ed: {
    settingLabel: "Emergency",
    settingLabelLower: "emergency",
    coverSubtitle: "A transparent framework for understanding where\nvalue lives across four domains in the ED",
    contextHeadline: "In the ED, you can\u2019t schedule value\u2014it shows up in the patients you keep, the complexity you capture, and the physicians who stay.",
    contextBody: "Time savings per encounter are smaller here\u20142\u20134 minutes vs. outpatient\u2014because ED documentation is already faster-paced with more templated workflows. But the ED is a volume engine. At 40,000\u201380,000 visits per year, those minutes compound: three minutes across 50,000 visits is 2,500 hours of physician time. The ED\u2019s unique challenge is that notes get worse when volume gets high. During surges, documentation quality drops\u2014E/M levels understate complexity, medical necessity gets under-documented, and for admitted patients, the ED note becomes the foundation of the entire inpatient DRG. Ambient AI doesn\u2019t get tired during a surge.",
    contextQuestion: "Four value domains \u2014 each with a different measurement timeline.",
    cat1Label: "CAPACITY",
    cat1Description: "LWBS recovery and throughput improvement.",
    cat1Footer: "Trackable",
    cat2Label: "REVENUE",
    cat2Description: "E/M accuracy and denial prevention.",
    cat2Footer: "Auditable",
    domains: [
      {
        label: "QUALITY",
        description: "ED documentation quality drives clinical decisions and downstream inpatient coding. Sepsis recognition, stroke protocol documentation, and CDI completeness all depend on what gets captured during the encounter\u2014in real time, not reconstructed hours later.",
        footer: "Strategic \u2014 qualitative, with measurable CDI impact",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Emergency medicine has the highest physician burnout rate in medicine. Documentation burden is consistently cited as the leading driver. Time returned to physicians\u2014away from after-shift charting and between-patient documentation\u2014directly reduces the friction that precedes burnout and departure.",
        footer: "Influenceable \u2014 retention impact at 12\u201318 months",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "When physicians spend less time documenting between patients, they are available to see the next patient sooner. Shorter wait times reduce LWBS\u2014patients who were already in your department and left only because of wait time. Each recovered LWBS patient is revenue that was walking out the door.",
        footer: "Measurable \u2014 LWBS rate tracks weekly",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "During surges, ED notes understate what actually happened\u2014E/M levels drop, medical necessity goes under-documented, and denials accumulate silently. Accurate documentation reflects care delivered. That\u2019s E/M accuracy and denial prevention\u2014the most directly auditable revenue drivers in the ED.",
        footer: "Auditable \u2014 claims data within 90 days",
        accentColor: colors.secondary,
      },
    ],
    frameworkCallout: "We model all four domains\u2014but we\u2019re transparent about what each requires to measure. Capacity (LWBS) is trackable in weeks. Revenue (E/M accuracy, denials) is auditable from claims data. Workforce (retention) takes 12\u201318 months. Quality drives clinical outcomes that we measure but don\u2019t monetize\u2014because doing so honestly is harder than making up a number.",
    categories: [
      {
        label: "QUALITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Clinical Documentation Completeness",
            attribution: "Strategic",
            description: "Real-time capture during the encounter prevents the reconstruction problem\u2014physicians documenting hours later miss specificity that was present in the room. For time-sensitive conditions (sepsis, stroke, STEMI), documentation captured at the point of care enables faster protocol activation and cleaner clinical records. For admitted patients, a complete ED note is where the inpatient stay begins\u2014and where the CDI opportunity lives.",
            formula: "Measured: note completeness rates, CDI query volume on admitted patients, sepsis/stroke bundle documentation compliance",
          },
          {
            name: "CDI & Inpatient Connection",
            attribution: "Connected",
            description: "For admitted patients (15\u201325% of ED visits), the ED note is the foundation of DRG assignment. When ED notes capture presenting conditions, comorbidities, and clinical reasoning, inpatient CDI teams have a stronger starting point\u2014fewer queries, fewer missed CCs/MCCs. We quantify this in the Inpatient methodology to avoid double-counting.",
            formula: "ED admissions \u00D7 DRG improvement rate \u00D7 Avg DRG value increase ($6\u20138K) \u00D7 Realization \u2014 quantified in Inpatient model",
            formulaColor: colors.tertiary,
          },
        ],
      },
      {
        label: "WORKFORCE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "Clinician Sustainability & Retention",
            attribution: "Influenceable",
            description: "ED physician burnout isn\u2019t a trend\u2014it\u2019s a workforce crisis. Documentation burden is consistently cited as a top contributor. Abridge returns hours per week per physician\u2014time that currently comes from post-shift charting and between-patient documentation. At $400K\u2013$700K per physician replacement (including locum coverage at $250\u2013$400/hour, recruitment, and onboarding), even a modest reduction in burnout-driven departures generates significant avoided cost.",
            formula: "ED physicians \u00D7 Turnover (8\u201315%) \u00D7 Burnout % (40\u201360%) \u00D7 Abridge impact (10\u201320%) \u00D7 Replacement cost ($400\u2013700K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "LWBS Recovery",
            attribution: "Measurable",
            description: "The mechanism is documentation speed \u2192 physician availability \u2192 shorter wait times \u2192 fewer walkouts. These patients were already in your department. The encounter was already initiated. The only variable was time. Documentation speed is one factor among many\u2014staffing, triage, bed availability all matter\u2014so we use conservative recovery rates (5\u201315%) and are explicit about attribution.",
            formula: "Annual visits \u00D7 LWBS rate (2\u20134%) \u00D7 Recovery % (5\u201315%) \u00D7 Avg ED visit revenue ($300\u2013500)",
          },
          {
            name: "Admission Capture",
            attribution: "Connected",
            description: "Of patients who leave before being seen in high-acuity EDs, published literature suggests 15\u201320% would have met inpatient admission criteria. Faster throughput that recovers LWBS patients also recovers the admission revenue downstream. We model this separately from LWBS visit revenue to avoid bundling\u2014the admission is a different financial event.",
            formula: "LWBS recovered \u00D7 Admission rate (15\u201320%) \u00D7 Avg admission revenue \u00D7 Realization",
          },
        ],
      },
      {
        label: "REVENUE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "E/M Level Accuracy",
            attribution: "Measurable",
            description: "During high-volume shifts, ED notes understate visit complexity\u2014not because the care wasn\u2019t delivered, but because documentation at speed omits decision-making specificity. E/M accuracy improves when notes capture the complexity that was already there. ED wRVU lift is typically lower than outpatient (1\u20134% vs 2\u20137%) because ED workflows are already more templated. We use conservative defaults.",
            formula: "Encounters \u00D7 Baseline wRVU (1.6) \u00D7 Lift % (1\u20134%) \u00D7 Conversion factor ($33\u201336) \u00D7 Realization (75%)",
          },
          {
            name: "Denial Prevention",
            attribution: "Measurable",
            description: "ED claim denials most often trace to three documentation failures: absent medical necessity language, incomplete physical exam documentation, and missing decision rationale for admission vs. discharge. Abridge captures clinical reasoning in real time. Documentation-related denials are among the most preventable in the revenue cycle\u2014and your RCM team can identify them by root cause.",
            formula: "Claims \u00D7 Denial rate \u00D7 Doc-related % \u00D7 Prevention rate (15\u201330%) \u00D7 Avg claim value",
          },
        ],
      },
    ],
    careQualityCallout: "Quality outcomes in the ED are real but indirect\u2014we capture the documentation, clinical teams act on it. E/M accuracy is auditable from claims data: compare high-volume vs. low-volume shifts for similar patient populations. If high-volume shifts show lower E/M levels, that gap is documentation-driven, not clinical.",
    honestLimits: {
      measure: [
        "E/M level distribution by shift volume (claims data, 90 days)",
        "Denial rates by root cause \u2014 RCM data",
        "LWBS rate \u2014 every ED tracks this weekly",
        "CDI query volume on admitted patients",
      ],
      influence: [
        "Throughput / door-to-doc time (staffing, triage, bed management)",
        "Retention (12\u201318 months to measure)",
        "Sepsis/stroke bundle compliance (clinical practice dependent)",
        "DRG accuracy on admits (team-produced, quantified in Inpatient model)",
      ],
      enable: [
        "Care continuity (downstream \u2014 outpatient follow-up quality)",
        "Patient experience (multi-factorial)",
        "Readmission reduction (too indirect to model)",
        "Coding accuracy (coder-dependent downstream step)",
      ],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "ED documentation drives downstream inpatient revenue\u2014when ED notes capture presenting conditions and comorbidities, inpatient CDI has a stronger foundation for DRG accuracy. For admitted patients, the ED note is where the inpatient stay begins. ED nursing notes also feed into inpatient handoff quality. We quantify this connection in the Inpatient methodology to avoid double-counting across settings.",
    mechanismsSubtitle: "How Each Domain Creates Value in the ED",
    assumptions: [
      { assumption: "Time saved/encounter", range: "2\u20134 min", defaultVal: "3 min", source: "Abridge data" },
      { assumption: "ED wRVU baseline", range: "1.4\u20132.0", defaultVal: "1.6", source: "ACEP benchmarks" },
      { assumption: "wRVU lift % (ED)", range: "1\u20134%", defaultVal: "2.5%", source: "Abridge data" },
      { assumption: "LWBS rate", range: "2\u20134%", defaultVal: "3%", source: "National benchmark" },
      { assumption: "LWBS recovery rate", range: "5\u201315%", defaultVal: "10%", source: "Conservative" },
      { assumption: "Avg ED visit revenue", range: "$300\u2013500", defaultVal: "$400", source: "Blended avg" },
      { assumption: "LWBS admission rate", range: "15\u201320%", defaultVal: "18%", source: "Literature" },
      { assumption: "Avg admission revenue", range: "$7\u201310K", defaultVal: "$8,000", source: "ED-to-IP contribution" },
      { assumption: "Denial reduction (Conservative)", range: "15\u201320%", defaultVal: "15%", source: "RCM benchmarks" },
      { assumption: "Denial reduction (Typical)", range: "25\u201335%", defaultVal: "30%", source: "RCM benchmarks" },
      { assumption: "Physician turnover", range: "8\u201315%", defaultVal: "10%", source: "ACEP surveys" },
      { assumption: "Burnout-related %", range: "40\u201360%", defaultVal: "50%", source: "Emergency medicine research" },
      { assumption: "Retention impact", range: "10\u201320%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$400\u2013700K", defaultVal: "$500K", source: "Merritt Hawkins" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny. If your LWBS rate is already below 2%, that lever is smaller. If your E/M distribution looks consistent across shift volumes, the documentation gap may be minimal. We let you adjust based on your reality.",
    validation: [
      {
        name: "CAPACITY (LWBS)",
        before: ["Current LWBS rate by shift", "Door-to-disposition time by hour"],
        after: ["Track LWBS rate weekly \u2014 Abridge vs. control shifts", "Measure wait time delta"],
        timeline: "4\u20138 weeks",
      },
      {
        name: "REVENUE (E/M + DENIALS)",
        before: ["E/M level distribution by shift volume", "Denial rate by root cause code"],
        after: ["Compare E/M level mix pre/post \u2014 high vs. low volume shifts", "Track documentation-related denial rate quarterly"],
        timeline: "3\u20136 months",
      },
      {
        name: "QUALITY (CDI)",
        before: ["CDI query volume on ED-admitted patients", "Sepsis/stroke bundle documentation compliance %"],
        after: ["Track CDI queries on Abridge-documented admits vs. control", "Compare bundle compliance rates"],
        timeline: "2\u20133 months",
      },
      {
        name: "WORKFORCE (RETENTION)",
        before: ["Baseline turnover rate", "Exit interview data \u2014 documentation burnout attribution"],
        after: ["Track turnover on Abridge vs. pre-implementation", "Survey on documentation satisfaction at 6 and 12 months"],
        timeline: "12\u201318 months",
      },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling ED ROI across four domains: Quality, Workforce, Capacity, and Revenue. We lead with what\u2019s measurable (LWBS, E/M accuracy) and are transparent about what takes longer to prove (retention) and what we influence but don\u2019t monetize (clinical quality outcomes). All defaults are conservative and editable. The goal is a defensible framework, not a predetermined answer.",
  },
  inpatient: {
    settingLabel: "Inpatient",
    settingLabelLower: "inpatient",
    coverSubtitle: "A transparent framework for understanding where\ndocumentation accuracy drives DRG economics across four domains",
    contextHeadline: "Inpatient is where documentation has the highest per-note financial impact in healthcare\u2014and the most complex attribution chain.",
    contextBody: "A single admission note that captures an additional CC/MCC can shift DRG weight by 0.3\u20130.5\u2014worth $2,000\u2013$4,000 in reimbursement. But inpatient revenue is team-produced: the hospitalist documents, CDI reviews, coders assign, and the DRG determines payment. Ambient AI improves step one\u2014and when step one is better, every downstream step benefits. Unlike outpatient, hospitalists can\u2019t \u2018see more patients\u2019 with saved time. They have an assigned census. That\u2019s why Capacity in the inpatient setting means rounding efficiency and time returned to clinical care\u2014not throughput expansion.",
    contextQuestion: "Four value domains \u2014 each with a different attribution timeline.",
    cat1Label: "QUALITY",
    cat1Description: "CDI query reduction and documentation completeness.",
    cat1Footer: "Measurable",
    cat2Label: "REVENUE",
    cat2Description: "DRG accuracy, obs/IP defense, concurrent review.",
    cat2Footer: "Auditable",
    domains: [
      {
        label: "QUALITY",
        description: "CDI query reduction is the cleanest quality metric in inpatient medicine. Every query represents a documentation gap\u2014something that should have been in the note. When hospitalists capture clinical specificity at point of care, CDI teams need fewer queries, and the notes that drive DRG assignment are stronger from the start. CDI departments track query volume daily; this is one of the most measurable outcomes in the building.",
        footer: "Measurable \u2014 CDI query data tracked daily",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Hospitalist medicine has some of the highest turnover in healthcare. Documentation burden during overnight admits, weekend shifts, and high-census periods is a major driver. At $350K\u2013$500K per replacement\u2014including locum coverage, recruiting, and onboarding\u2014every hospitalist retained is significant avoided cost. We use conservative impact rates because documentation is one of many burnout factors.",
        footer: "Influenceable \u2014 retention impact at 12\u201318 months",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "Inpatient capacity is not about seeing more patients\u2014hospitalists have an assigned census. It\u2019s about what happens to the time saved. Documentation that previously extended post-rounding hours now completes during rounds. That time returns to clinical care: more thorough rounding, earlier discharge planning, better handoffs. We show hours returned rather than dollar value for time savings\u2014because that\u2019s the honest story.",
        footer: "Honest \u2014 hours returned to clinical care, not throughput",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "DRG accuracy is the core revenue story in inpatient. When notes capture CC/MCC specificity\u2014AKI, malnutrition, respiratory failure, sepsis\u2014DRG weight increases follow. Observation vs. inpatient defense and concurrent review protection are downstream of the same documentation quality. Complete notes support appropriate status determinations and withstand payer audits.",
        footer: "Auditable \u2014 CMI and DRG data in claims within 90 days",
        accentColor: colors.secondary,
      },
    ],
    frameworkCallout: "We model all four domains\u2014but we lead with Quality (CDI queries) because that\u2019s the most defensible, most measurable outcome in the building. Revenue (DRG accuracy) is auditable from claims data. Capacity is honest: we show time returned to clinical care, not throughput expansion. Workforce (retention) takes 12\u201318 months to measure. We explicitly do not claim LOS reduction, readmission reduction, or capacity expansion\u2014the causal chains are too long.",
    categories: [
      {
        label: "QUALITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "CDI Query Reduction",
            attribution: "Measurable",
            description: "Every CDI query represents a documentation gap\u2014something that should have been in the note but wasn\u2019t. Each query costs $40\u2013$60 in CDI labor (creation, tracking, follow-up, physician response time). When documentation captures clinical detail at the point of care, fewer queries are needed. CDI departments track query volume daily\u2014this is one of the cleanest metrics to measure pre/post implementation.",
            formula: "Admissions \u00D7 Query rate (25\u201335%) \u00D7 Reduction % (15\u201335%) \u00D7 Cost per query ($40\u2013$60)",
          },
          {
            name: "Documentation Completeness",
            attribution: "Strategic",
            description: "Complete documentation at the point of care means fewer CDI queries, more accurate DRG assignment, and stronger payer audit defense\u2014all from the same root cause. When hospitalists discuss AKI, malnutrition, or respiratory failure at bedside and the note reflects it in real time, every downstream step benefits: CDI, coding, billing, and appeals. This is the mechanism that connects Quality to Revenue.",
            formula: "Measured: note completeness rate (CDI audit), CC/MCC capture rate, same-day note closure rate",
          },
        ],
      },
      {
        label: "WORKFORCE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "Hospitalist Retention Savings",
            attribution: "Influenceable",
            description: "Documentation burden during overnight admits and weekend shifts is a leading driver of hospitalist burnout and turnover. Abridge reduces documentation time per admission\u2014H&Ps, daily progress notes, and discharge summaries that previously took 15\u201340 minutes. At $350K\u2013$500K per replacement (recruiting, locum coverage during gap, and months of onboarding), every hospitalist retained represents significant avoided cost. The financial impact extends far beyond recruitment fees.",
            formula: "Hospitalists \u00D7 Turnover (8\u201312%) \u00D7 Burnout % (40\u201350%) \u00D7 Abridge impact (15%) \u00D7 Replacement cost ($350\u2013500K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Rounding Efficiency",
            attribution: "Measurable",
            description: "Documentation that previously extended the post-rounding workday now completes during or immediately after rounds. We measure this as hours returned per physician per week\u2014not as additional patient capacity, because hospitalists have an assigned census. Hours returned go to clinical care: more thorough rounding conversations, earlier discharge planning, better handoffs to the next shift. We show this as time value, not revenue.",
            formula: "Hospitalists \u00D7 Time saved/admission (15\u201330 min) \u00D7 Admissions/month \u00D7 Physician hourly rate \u2014 shown as hours returned",
          },
          {
            name: "Discharge Planning Timeliness",
            attribution: "Connected",
            description: "When documentation completes earlier in the day, discharge summaries are available sooner, post-acute placement requests can go earlier, and case management has more lead time. Earlier discharges free beds earlier\u2014a capacity benefit that accrues to the institution rather than to the hospitalist directly. We note this connection without assigning a dollar value, because the attribution chain runs through bed management and case management, not documentation alone.",
            formula: "Noted as downstream benefit \u2014 not monetized to avoid attribution overreach",
            formulaColor: colors.tertiary,
          },
        ],
      },
      {
        label: "REVENUE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "DRG Accuracy (CC/MCC Capture)",
            attribution: "Measurable",
            description: "When hospitalists discuss AKI, malnutrition, or respiratory failure at bedside but the note says \u2018renal function stable,\u2019 that missing specificity costs $2,000\u2013$4,000 in DRG weight. Ambient AI captures the clinical conversation so the note reflects what actually happened\u2014ensuring documentation reflects care delivered. This is the highest-value mechanism in inpatient medicine, auditable from CMI trend data.",
            formula: "Admissions at risk (20\u201330%) \u00D7 Protection rate (20%) \u00D7 DRG weight increase (0.4) \u00D7 Base payment ($6K) \u00D7 Realization (50%)",
          },
          {
            name: "Observation vs. Inpatient Defense",
            attribution: "Connected",
            description: "Appropriate inpatient admission status requires documentation that supports medical necessity\u2014acuity, complexity, and the clinical reasoning for why outpatient or observation care was insufficient. When documentation captures this at point of care, status determinations hold up to payer review. When it doesn\u2019t, downgrades from IP to observation are common and expensive. We include this within DRG accuracy to avoid double-counting.",
            formula: "Combined with DRG accuracy \u2014 documentation quality supports both appropriate DRG assignment and status defense",
            formulaColor: colors.tertiary,
          },
          {
            name: "Concurrent Review & Denial Prevention",
            attribution: "Measurable",
            description: "Inpatient denials are the most expensive in healthcare\u2014average claim values of $8,000\u2013$15,000. Medical necessity denials, DRG downgrade audits, and concurrent review failures all stem from documentation gaps. Complete notes that capture clinical reasoning for continued stay, discharge barriers, and comorbidity burden support concurrent review and reduce unappealable denials.",
            formula: "Claims \u00D7 Documentation-related denial rate \u00D7 Prevention rate (15\u201325%) \u00D7 Avg claim value ($8\u201315K)",
          },
        ],
      },
    ],
    careQualityCallout: "Documentation value in inpatient is about accuracy, not speed. We capture what was discussed\u2014that\u2019s where the DRG value lives. Unlike outpatient, time savings in inpatient don\u2019t convert to additional visits. They return to clinical care: more thorough rounds, earlier discharge planning, better handoffs. We show hours returned rather than dollar value for time savings\u2014because that\u2019s the honest story.",
    honestLimits: {
      measure: [
        "CDI query rates \u2014 tracked daily by CDI department",
        "Documentation time per note type \u2014 EHR timestamps, weeks",
        "CMI trends \u2014 claims data, quarterly",
        "Note completeness \u2014 CDI audit",
      ],
      influence: [
        "DRG accuracy \u2014 team-produced revenue (CDI + coding)",
        "Denial rates \u2014 payer-dependent, 6+ months",
        "DRG finalization speed",
        "Coder productivity downstream",
      ],
      enable: [
        "Length of stay \u2014 not defensible as direct attribution",
        "Readmission reduction \u2014 too indirect to model",
        "Capacity expansion \u2014 not applicable in inpatient",
        "Rounding efficiency (hours, not $)",
      ],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "Inpatient sits at the center of the hospital value chain. ED documentation feeds in (stronger admission notes, comorbidity capture from ED). Nursing documentation supports CC/MCC coding (skin assessments, fall risk, nutritional status). Complete discharge summaries improve outpatient follow-up and reduce readmissions. We don\u2019t sum cross-setting values\u2014attribution gets complex\u2014but when building a system-level business case, these connections matter.",
    mechanismsSubtitle: "How Each Domain Creates Value in Inpatient",
    assumptions: [
      { assumption: "Time saved/admission", range: "15\u201345 min", defaultVal: "30 min", source: "Customer data" },
      { assumption: "At-risk admissions", range: "20\u201330%", defaultVal: "25%", source: "CDI benchmarks" },
      { assumption: "DRG protection rate", range: "15\u201325%", defaultVal: "20%", source: "Conservative" },
      { assumption: "DRG weight increase", range: "0.3\u20130.5", defaultVal: "0.4", source: "CMS differentials" },
      { assumption: "Base DRG payment", range: "$5.5\u20137.5K", defaultVal: "$6,000", source: "CMS base rate" },
      { assumption: "CDI query rate", range: "25\u201335%", defaultVal: "30%", source: "ACDIS benchmarks" },
      { assumption: "Query reduction %", range: "15\u201335%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Cost per CDI query", range: "$40\u201360", defaultVal: "$50", source: "ACDIS productivity" },
      { assumption: "Concurrent review denial rate", range: "3\u20136%", defaultVal: "4%", source: "Inpatient RCM" },
      { assumption: "Denial prevention rate", range: "15\u201325%", defaultVal: "20%", source: "Conservative" },
      { assumption: "Hospitalist turnover", range: "8\u201312%", defaultVal: "8%", source: "SHM benchmarks" },
      { assumption: "Burnout-related %", range: "40\u201350%", defaultVal: "45%", source: "Research" },
      { assumption: "Retention impact", range: "10\u201320%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$350\u2013500K", defaultVal: "$400K", source: "Merritt Hawkins" },
      { assumption: "Realization rate", range: "40\u201360%", defaultVal: "50%", source: "Conservative" },
    ],
    conservativeCallout: "We\u2019d rather show a defensible DRG improvement number based on CDI data than a speculative LOS reduction based on assumptions. Every variable in our model is editable\u2014because your CDI team knows your gaps better than any default can. We do not model LOS, readmissions, or capacity expansion.",
    validation: [
      {
        name: "QUALITY (CDI QUERIES)",
        before: ["Query volume by physician \u2014 current baseline", "Query types (specificity, POA, status) and resolution time"],
        after: ["Track query rates \u2014 Abridge vs. control physicians", "Measure CDI productivity: queries per admission"],
        timeline: "2\u20133 months",
      },
      {
        name: "REVENUE (DRG / CMI)",
        before: ["12 months CMI by hospitalist", "CC/MCC capture rates by provider and service line"],
        after: ["Compare CMI \u2014 Abridge vs. control group", "Track CC/MCC rate changes quarterly"],
        timeline: "3\u20136 months",
      },
      {
        name: "CAPACITY (ROUNDING TIME)",
        before: ["EHR session data \u2014 documentation time per admission type", "Post-rounding charting hours per physician"],
        after: ["Repeat EHR session data \u2014 Abridge vs. control", "Survey hospitalists on time-of-note-completion"],
        timeline: "2\u20134 weeks",
      },
      {
        name: "WORKFORCE (RETENTION)",
        before: ["Baseline turnover by program", "Exit interview data \u2014 documentation burnout attribution"],
        after: ["Track turnover Abridge vs. pre-implementation", "Survey on documentation satisfaction at 6 and 12 months"],
        timeline: "12\u201318 months",
      },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling inpatient ROI across four domains: Quality, Workforce, Capacity, and Revenue. We lead with Quality (CDI queries) because that\u2019s the most measurable outcome and the one your CDI department can validate fastest. Revenue (DRG accuracy) is auditable from claims data. Capacity is honest: hours returned to clinical care, not throughput expansion. All defaults are conservative and editable. The goal is a defensible framework\u2014not a predetermined answer.",
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

        {data.domains ? (
          <>
            <Text style={styles.sectionLabel}>FOUR VALUE DOMAINS</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
              {data.domains.slice(0, 2).map((d, i) => (
                <View key={i} style={[styles.col, { backgroundColor: colors.cards, padding: 12, borderRadius: 4 }]}>
                  <View style={{ borderLeftWidth: 3, borderLeftColor: d.accentColor, paddingLeft: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, letterSpacing: 1, textTransform: "uppercase" }}>{d.label}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>{d.description}</Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: d.accentColor }}>{d.footer}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              {data.domains.slice(2, 4).map((d, i) => (
                <View key={i} style={[styles.col, { backgroundColor: colors.cards, padding: 12, borderRadius: 4 }]}>
                  <View style={{ borderLeftWidth: 3, borderLeftColor: d.accentColor, paddingLeft: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, letterSpacing: 1, textTransform: "uppercase" }}>{d.label}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>{d.description}</Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: d.accentColor }}>{d.footer}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
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
          </>
        )}

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
