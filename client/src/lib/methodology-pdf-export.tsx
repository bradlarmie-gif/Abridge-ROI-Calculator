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
    contextBody: "In outpatient medicine, a physician saves 3 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. In nursing, the same time saved flows differently: documentation burden accounts for 25\u201335% of every shift, and reclaiming that time shows up in overtime reduction, retention improvement, and more bedside time. The four-domain framework applies here\u2014revenue flows through quality outcomes, workforce stability, and support for physician coding accuracy. What nursing has is the largest quality footprint in the building: HAPI, falls, CAUTI, CLABSI, sepsis SEP-1, HAC penalties, and HCAHPS scores all run through nursing documentation. That\u2019s where the value lives.",
    contextQuestion: "Three active domains \u2014 Quality, Workforce, and Capacity.",
    cat1Label: "WORKFORCE",
    cat1Description: "Retention and agency reduction.",
    cat1Footer: "Measurable",
    cat2Label: "QUALITY",
    cat2Description: "HAPI, falls, CAUTI, CLABSI, sepsis, HCAHPS.",
    cat2Footer: "Potential",
    domains: [
      {
        label: "QUALITY",
        description: "Nursing documentation drives the largest quality footprint in the hospital: HAPI prevention, falls, CAUTI, CLABSI, sepsis SEP-1 bundle compliance, and HCAHPS. When documentation is real-time and complete, assessments are captured when they happen\u2014not reconstructed hours later. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Potential \u2014 documentation enables, clinical practice realizes",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Nursing turnover and agency dependency are the most expensive workforce problems in healthcare, and documentation burden is a measurable contributor. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Measurable \u2014 retention and agency spend tracked",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "When nurses spend less time documenting, on-time shift completion improves and a portion of that time tends to show up as reduced overtime\u2014the most direct, payroll-verified financial signal in nursing. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Measurable \u2014 OT hours visible within 2\u20133 months",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "Nurses don\u2019t bill directly. Revenue impact flows through quality, workforce stability, and support for physician documentation\u2014not a billing line. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Revenue flows through Quality and Workforce \u2014 tracked there",
        accentColor: colors.tertiary,
      },
    ],
    frameworkCallout: "Three domains are active in nursing: Quality, Workforce, and Capacity. Nursing\u2019s financial impact flows through quality outcomes, workforce stability, and documentation that supports physician coding accuracy\u2014not direct billing. Track it there\u2014those numbers are real and defensible.",
    categories: [
      {
        label: "QUALITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "HAPI Prevention",
            attribution: "Trend",
            description: "Real-time documentation ensures skin assessments and risk factors are captured when they\u2019re observed\u2014not reconstructed at end of shift when the picture has already changed. Complete risk documentation enables earlier intervention for pressure injuries. CMS does not reimburse for hospital-acquired pressure injuries; each HAPI represents both a clinical failure and a financial penalty.",
            formula: "Current HAPIs \u00D7 Doc-preventable % (3\u201310%) \u00D7 Cost per HAPI ($10K\u2013$100K+, severity-dependent)",
          },
          {
            name: "Falls Prevention",
            attribution: "Trend",
            description: "Real-time fall risk scores and mobility status documentation enable earlier preventive action. When risk assessments are completed and documented at the right intervals, fall prevention protocols can be activated before an event occurs. CMS does not reimburse for hospital-acquired fall injuries.",
            formula: "Current falls \u00D7 Doc-preventable % (3\u201310%) \u00D7 Cost per fall ($14\u201335K)",
          },
          {
            name: "CAUTI & CLABSI Prevention",
            attribution: "Trend",
            description: "Device-associated infection prevention depends on insertion documentation, daily necessity assessments, and removal timing. When nursing documentation captures device placement dates, indication reviews, and care bundle compliance in real time, infection prevention teams have the data to act. CMS penalizes HAI rates through the HAC Reduction Program.",
            formula: "CAUTI/CLABSI rates \u00D7 Doc-preventable % (3\u20138%) \u00D7 Cost per event \u00D7 HAC penalty exposure",
          },
          {
            name: "Sepsis SEP-1 Bundle Compliance",
            attribution: "Trend",
            description: "Sepsis SEP-1 bundle compliance requires timely documentation of screening, assessment, and intervention\u2014across nursing and physician notes. When nursing documentation captures vital sign changes, mental status shifts, and suspected infection in real time, the clinical picture that triggers sepsis recognition is clearer and faster. Earlier recognition improves outcomes and supports bundle compliance rates reported to CMS.",
            formula: "Measured: SEP-1 bundle compliance rate, time-to-recognition for sepsis alerts \u2014 not monetized directly",
            formulaColor: colors.tertiary,
          },
          {
            name: "HCAHPS & Patient Experience",
            attribution: "Proof",
            description: "More bedside time correlates with higher patient experience scores. When documentation is faster, nurses spend more time at the bedside\u2014which is where responsiveness, communication, and care perception are shaped. HCAHPS scores affect VBP reimbursement by approximately 2% for top-quartile performers. We treat this as a directional indicator, not a direct attribution.",
            formula: "Top quartile HCAHPS \u2248 2% higher VBP reimbursement \u2014 tracked as indicator, not outcome",
            formulaColor: colors.tertiary,
          },
        ],
      },
      {
        label: "WORKFORCE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "Nurse Retention Savings",
            attribution: "Trend",
            description: "Documentation burden is among the top drivers of nursing burnout and departure. When nurses finish shifts on time and spend less time on administrative documentation, the friction that precedes burnout decreases. At $50K\u2013$100K per nurse replacement (NSI 2023), even modest retention improvement compounds significantly across a large nursing staff. We use conservative impact rates (10\u201325%) because documentation is one of many burnout factors.",
            formula: "Nurses \u00D7 Turnover (15\u201325%) \u00D7 Burnout % (30\u201350%) \u00D7 Burnout attribution (10\u201325%) \u00D7 Replacement cost ($50\u2013100K)",
          },
          {
            name: "Agency Labor Reduction",
            attribution: "Trend",
            description: "When nurses leave, hospitals fill coverage gaps with agency and travel nurses at 2\u20133\u00D7 the cost of permanent staff. Better retention directly reduces agency dependency. This is the highest-dollar workforce outcome in nursing\u2014agency premiums of $2,000\u2013$4,000 per week per nurse add up quickly across a unit with persistent vacancies.",
            formula: "Nurses retained \u00D7 Coverage weeks needed (8\u201316 wks) \u00D7 Weekly agency premium ($2\u20134K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Overtime Reduction",
            attribution: "Signal",
            description: "When nurses document faster, they finish their shift workload on time. Not all time saved reduces overtime\u2014some returns to patient care, which is the right use of it. But a measurable portion of time saved does convert to shift completion, reducing mandatory and voluntary overtime hours. This is the most immediately trackable financial outcome in nursing ROI, visible in payroll data within 2\u20133 months.",
            formula: "Nurses \u00D7 Shifts/year \u00D7 Time saved/shift \u00D7 OT conversion rate (15\u201340%) \u00D7 OT rate (1.5\u00D7 base hourly)",
          },
        ],
      },
    ],
    careQualityCallout: "The link between documentation and care quality is indirect. We don\u2019t cause fewer falls\u2014we enable the visibility that helps prevent them. Clinical practice matters more than documentation. We model Quality outcomes separately from Labor Economics for exactly this reason: the causal chain is real but longer, and conflating them overstates confidence.",
    honestLimits: {
      measure: [
        "OT hours per unit per month \u2014 payroll data, 2\u20133 months",
        "Documentation time per shift \u2014 EHR session data, weeks",
        "Shift completion rate \u2014 scheduling data",
        "Agency utilization hours and cost",
      ],
      influence: [
        "Turnover rates \u2014 12\u201318 months to measure",
        "HAPI and falls rates \u2014 clinical practice dependent",
        "SEP-1 bundle compliance \u2014 multi-disciplinary",
        "HCAHPS scores \u2014 many factors beyond documentation",
      ],
      enable: [
        "HAC penalty reduction \u2014 payer and CMS timing dependent",
        "VBP reimbursement improvement \u2014 annual settlement",
        "Care coordination quality \u2014 downstream",
        "Inpatient DRG accuracy \u2014 quantified in Inpatient model",
      ],
    },
    connectedValueLabel: "CONNECTED VALUE",
    connectedValue: "When nurses document thoroughly and in real time, it directly impacts inpatient revenue. Nursing assessments capture clinical indicators\u2014skin integrity, nutritional status, fall risk, mental status\u2014that CDI teams use to support CC/MCC coding and DRG accuracy. Complete nursing documentation also strengthens the inpatient record for payer audit defense. These benefits are quantified in the Inpatient methodology to avoid double-counting.",
    mechanismsSubtitle: "How Each Domain Creates Value in Nursing",
    assumptions: [
      { assumption: "Time saved/shift", range: "15\u201330 min", defaultVal: "20 min", source: "Customer data" },
      { assumption: "OT conversion rate", range: "15\u201340%", defaultVal: "25%", source: "Studies" },
      { assumption: "Nurse base hourly rate", range: "$35\u201355/hr", defaultVal: "$42/hr", source: "BLS 2024" },
      { assumption: "Nurse turnover", range: "15\u201325%", defaultVal: "18%", source: "NSI 2024" },
      { assumption: "Burnout-related %", range: "30\u201350%", defaultVal: "40%", source: "ANA" },
      { assumption: "Retention impact", range: "10\u201325%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$50\u2013100K", defaultVal: "$65K", source: "NSI 2023" },
      { assumption: "Agency coverage weeks", range: "8\u201316 wks", defaultVal: "12 wks", source: "Industry avg" },
      { assumption: "Agency weekly premium", range: "$2\u20134K/wk", defaultVal: "$2,500", source: "Travel nursing" },
      { assumption: "Doc-preventable HAE %", range: "3\u201310%", defaultVal: "5%", source: "Conservative" },
      { assumption: "Cost per HAPI", range: "$10K\u2013$100K+", defaultVal: "$40K", source: "AHRQ \u2014 severity-dependent" },
      { assumption: "Cost per fall", range: "$14\u201335K", defaultVal: "$25K", source: "Industry estimates" },
    ],
    conservativeCallout: "We\u2019d rather show a smaller number you can defend than a larger number that falls apart under scrutiny. Quality outcomes are shown separately from Labor Economics because the causal chain is longer and the attribution is indirect. We\u2019d rather be honest about that than bundle everything into a single inflated number.",
    validation: [
      {
        name: "CAPACITY (OVERTIME)",
        before: ["OT hours per unit per month \u2014 baseline by season", "Shift completion rate \u2014 mandatory vs. voluntary OT split"],
        after: ["Track OT hours \u2014 Abridge vs. control units", "Compare shift completion rate pre/post"],
        timeline: "2\u20133 months",
      },
      {
        name: "QUALITY (HAPI + FALLS)",
        before: ["HAPI and falls rates per unit \u2014 12-month baseline", "Bundle compliance rates (SEP-1, CAUTI, CLABSI)"],
        after: ["Track event rates \u2014 Abridge vs. control units", "Be cautious on attribution \u2014 use as indicator, not proof"],
        timeline: "6\u201312 months \u2014 treat as bonus, not promise",
      },
      {
        name: "WORKFORCE (RETENTION + AGENCY)",
        before: ["Turnover by unit \u2014 baseline and exit interview data", "Agency hours and spend per unit per month"],
        after: ["Track turnover Abridge vs. control units", "Track agency utilization monthly"],
        timeline: "12\u201318 months",
      },
      {
        name: "REVENUE",
        before: ["Baseline VBP scores and HAC penalty exposure", "CC/MCC capture rate \u2014 see Inpatient methodology"],
        after: ["Track VBP reimbursement trend annually", "Revenue impact of nursing documentation tracked in Inpatient model"],
        timeline: "Tracked through Quality and Workforce timelines",
      },
    ],
    closingNote: "This methodology reflects Abridge\u2019s approach to modeling nursing ROI across four domains: Quality, Workforce, Capacity, and Revenue. Three domains are active. Revenue flows through quality outcomes and workforce stability\u2014those numbers are real and defensible, they just live in different domains than physician ROI. All defaults are conservative and editable. The goal is a framework you can walk into a CFO conversation with\u2014not a number that falls apart under the first question.",
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
        description: "Documentation completeness drives referral quality and risk adjustment accuracy for value-based contracts. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Proof \u2014 qualitative, tracked not monetized",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Physician burnout and turnover represent the largest hidden cost in outpatient practices, with documentation burden a measurable driver. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Influenceable \u2014 retention impact at 12\u201318 months",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "Time saved per encounter is the outpatient multiplier\u2014translating directly into capacity or clinical headroom depending on scheduling and demand. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Measurable \u2014 visit volume and schedule utilization",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "wRVU accuracy and denial prevention are the most directly attributable revenue drivers in outpatient. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
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
            attribution: "Proof",
            description: "When outpatient notes capture full clinical context\u2014differential reasoning, exam findings, medication rationale\u2014specialist referrals arrive with the information needed to act. Thin referral notes create redundant workups, delays, and patient frustration. Documentation quality is the upstream input to care coordination quality.",
            formula: "Measured: referral note completeness rate, prior auth approval rate, specialist query volume on incoming referrals",
          },
          {
            name: "HCC Accuracy (Medicare Advantage)",
            attribution: "Trend",
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
            attribution: "Trend",
            description: "Documentation burden is the single most-cited driver of physician burnout in outpatient medicine. Ambient AI documentation can reduce after-hours charting\u2014pajama time\u2014and between-patient documentation time. At $250K\u2013$500K per physician replacement (recruiting, onboarding, productivity ramp, and coverage), even a modest reduction in burnout-driven departures generates significant avoided cost. We use conservative impact rates because documentation is one of many burnout factors.",
            formula: "Providers \u00D7 Turnover (4\u20138%) \u00D7 Burnout % (30\u201350%) \u00D7 Burnout attribution (10\u201320%) \u00D7 Replacement cost ($250\u2013500K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Patient Access Expansion",
            attribution: "Trend",
            description: "When documentation per encounter takes less time, that time can be reallocated to additional patient visits. The conversion rate is not 100%\u2014scheduling, demand, and practice model constrain it. We apply a realistic conversion rate (15\u201330%) and let you adjust based on your scheduling patterns. Practices with open access models and unmet demand see higher capacity conversion than fully booked panels.",
            formula: "Hours saved \u00D7 % to capacity (15\u201330%) \u00D7 Revenue per visit \u00D7 Realization (70\u201385%)",
          },
          {
            name: "Operational Time Recovery",
            attribution: "Signal",
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
            attribution: "Trend",
            description: "Better documentation supports accurate coding. Notes that capture full clinical complexity\u2014multiple diagnoses addressed, medical decision-making detail, time-based billing eligibility\u2014yield higher wRVUs. The mechanism is documentation of complexity that was already delivered, not upcoding. wRVU lift is auditable from billing data by comparing level mix before and after implementation.",
            formula: "Encounters \u00D7 Avg wRVU (specialty-specific) \u00D7 Lift % (2\u20137%) \u00D7 Conversion factor ($33\u201336) \u00D7 Realization (75\u201385%)",
          },
          {
            name: "Denial Prevention",
            attribution: "Trend",
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
      { assumption: "Time saved/encounter", range: "2\u20134 min", defaultVal: "3 min", source: "Deployment data" },
      { assumption: "Time conversion rate", range: "15\u201330%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Physician hourly rate", range: "$100\u2013250", defaultVal: "$150", source: "MGMA" },
      { assumption: "Visit duration", range: "15\u201330 min", defaultVal: "20 min", source: "Specialty avg" },
      { assumption: "Revenue per visit", range: "$150\u2013350", defaultVal: "$200", source: "Practice data" },
      { assumption: "wRVU baseline per visit", range: "1.5\u20132.5", defaultVal: "1.8", source: "MGMA" },
      { assumption: "wRVU conversion factor", range: "$30\u201350", defaultVal: "$33", source: "CMS MPFS" },
      { assumption: "wRVU lift %", range: "2\u20137%", defaultVal: "4%", source: "Deployment data" },
      { assumption: "Denial rate", range: "5\u201312%", defaultVal: "8%", source: "MGMA" },
      { assumption: "HCC gap rate (MA)", range: "20\u201330%", defaultVal: "25%", source: "MA benchmarks" },
      { assumption: "HCC recapture %", range: "20\u201335%", defaultVal: "25%", source: "Conservative" },
      { assumption: "Denial prevention rate", range: "25\u201350%", defaultVal: "35%", source: "RCM benchmarks" },
      { assumption: "Physician turnover", range: "4\u20138%", defaultVal: "6%", source: "AAMC" },
      { assumption: "Burnout-related %", range: "30\u201350%", defaultVal: "40%", source: "AMA research" },
      { assumption: "Retention impact", range: "10\u201320%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$250\u2013500K", defaultVal: "$350K", source: "AMGA" },
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
        description: "Documentation accuracy under pressure\u2014capturing complexity that determines DRG, E/M level, and clinical defensibility. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Proof \u2014 qualitative, with measurable CDI impact",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Physician burnout and turnover are the ED\u2019s slow bleed\u2014documentation burden is a measurable contributor. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Influenceable \u2014 retention impact at 12\u201318 months",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "Throughput is the ED\u2019s operating system. Faster documentation is one lever\u2014not the only one. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Measurable \u2014 LWBS rate tracks weekly",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "ED coding is the most audit-vulnerable setting. Every surge creates under-documented complexity. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
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
            name: "CDI Query Volume on Admits",
            attribution: "Signal",
            description: "When ED documentation captures presenting conditions and comorbidities completely, CDI specialists receive fewer queries to clarify the clinical picture. This is tracked daily by most CDI departments\u2014before/after comparison is fast and clean. Better ED notes also form the foundation of inpatient DRG accuracy for admitted patients (quantified in the Inpatient methodology to avoid double-counting).",
            formula: "Admissions \u00D7 query rate \u00D7 reduction % \u2014 tracked by CDI department",
          },
          {
            name: "Note Completeness Rate",
            attribution: "Signal",
            description: "EHR timestamp data shows exactly when notes are completed and how long they take. During surges, note quality often drops\u2014key elements get abbreviated or omitted. The hypothesis we model is that ambient capture, by removing the typing bottleneck, reduces volume-driven completeness loss; organizations have observed this pattern, and CDI and compliance teams can audit directly to confirm whether it holds in your environment.",
            formula: "EHR session data: note completion time, completeness scores (CDI audit-based)",
          },
          {
            name: "Sepsis / Stroke Protocol Documentation",
            attribution: "Proof",
            description: "Proper documentation of sepsis and stroke presentations affects both regulatory compliance (CMS sepsis bundle measures) and downstream coding accuracy. The documentation is real and the clinical stakes are high\u2014but direct financial attribution is indirect and multi-factorial. Track as a quality signal, not a revenue line.",
            formula: "Tracked as a quality signal: bundle compliance %, time-to-recognition \u2014 not monetized directly",
            formulaColor: colors.tertiary,
          },
        ],
      },
      {
        label: "WORKFORCE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "Physician Retention Savings",
            attribution: "Trend",
            description: "ED burnout is a workforce crisis. Documentation burden is consistently cited in ACEP surveys and Medscape reports as a top contributor. At $250K\u2013$500K per physician replacement (AMGA Physician Retention Survey), retaining even one additional physician could offset a significant portion of implementation cost. The link is attributable; the measurement takes 12\u201318 months. Documentation is one of many burnout drivers\u2014don\u2019t attribute all turnover change to documentation.",
            formula: "ED physicians \u00D7 Turnover (8\u201315%) \u00D7 Burnout attribution (10\u201320%) \u00D7 Replacement cost ($250\u2013500K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Documentation Time Per Encounter (EHR)",
            attribution: "Signal",
            description: "EHR timestamps show exactly when charting begins and ends. In the ED, time savings per encounter are smaller (2\u20134 minutes) than outpatient\u2014but the ED is a volume engine. At 40,000\u201380,000 visits/year, 3 minutes \u00D7 50,000 visits \u2248 2,500 hours of physician time annually (illustrative). Early signals are often visible within weeks in deployment data.",
            formula: "Minutes saved \u00D7 annual ED visits / 60 = estimated physician hours potentially returned",
          },
          {
            name: "LWBS Recovery (Wait Time Sensitivity)",
            attribution: "Trend",
            description: "Each patient who leaves without being seen represents $300\u2013$500+ in lost revenue. Faster documentation contributes to faster throughput, which can reduce wait times and recover some LWBS patients. Attribution is the challenge\u2014documentation is one lever among staffing, bed management, triage protocol, and acuity mix. We use conservative recovery rates (5\u201315%) and are explicit about attribution. If your LWBS rate is already below 2%, this lever is smaller.",
            formula: "(LWBS rate before \u2212 after, in pp) \u00D7 annual ED visits \u00D7 $300\u2013500/visit \u00D7 attribution %",
          },
          {
            name: "Admission Capture (Downstream of LWBS)",
            attribution: "Trend",
            description: "Of patients recovered from LWBS, some require inpatient admission\u2014converting a lost ED visit into DRG-based inpatient revenue. This driver only activates when LWBS recovery is calculated first. Without real LWBS data, don\u2019t estimate this\u2014compounding two estimates produces a number that won\u2019t survive scrutiny.",
            formula: "Recovered LWBS patients \u00D7 Admission rate (15\u201320%) \u00D7 Avg admission revenue \u00D7 Realization",
          },
        ],
      },
      {
        label: "REVENUE",
        labelColor: colors.secondary,
        mechanisms: [
          {
            name: "E/M Level Accuracy (Claims Data)",
            attribution: "Trend",
            description: "During surges, ED notes understate what actually happened\u2014a physician manages a complex differential but the note reflects a simpler encounter because time was short. Claims data shows E/M level distribution shifts before and after. ED wRVU lift is typically 2\u20134% (lower than outpatient because ED workflows are more structured). We use your observed delta, not an assumed percentage.",
            formula: "(wRVU per encounter after \u2212 before) \u00D7 adopted encounters \u00D7 $33/wRVU \u00D7 attribution % \u00D7 realization %",
          },
          {
            name: "Denial Prevention (RCM Root Cause)",
            attribution: "Trend",
            description: "Medical necessity is the ED\u2019s denial vulnerability. The mechanism we\u2019re modeling: capturing clinical reasoning in real time creates an opportunity to close medical-necessity gaps at the point of care\u2014before the note is finalized and the claim is sent. When a note doesn\u2019t capture why a test was ordered or why admission was necessary, that\u2019s a denial waiting to happen, and many ED denials are unappealable because the documentation gap existed at time of service. RCM teams track documentation-related denials as a specific root cause category\u2014that\u2019s where you validate whether the mechanism is showing up in your data.",
            formula: "(denial rate before \u2212 after, in pp) \u00D7 annual encounters \u00D7 avg denial cost per encounter \u00D7 attribution %  (ED default: $500/encounter)",
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
      { assumption: "Burnout attribution %", range: "10\u201320%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$250\u2013500K", defaultVal: "$375K", source: "AMGA Physician Retention Survey" },
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
        description: "CDI query reduction and CC/MCC capture are daily, trackable signals of documentation improvement. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Measurable \u2014 CDI query data tracked daily",
        accentColor: colors.primary,
      },
      {
        label: "WORKFORCE",
        description: "Hospitalist burnout from documentation burden is real and expensive, and turnover drives operational and financial risk. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Influenceable \u2014 retention impact at 12\u201318 months",
        accentColor: colors.secondary,
      },
      {
        label: "CAPACITY",
        description: "Time returned from documentation becomes rounding time, discharge planning time, or clinical headroom\u2014not throughput, because hospitalists have an assigned census. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
        footer: "Honest \u2014 hours returned to clinical care, not throughput",
        accentColor: colors.primary,
      },
      {
        label: "REVENUE",
        description: "DRG accuracy and concurrent review are the core inpatient revenue levers\u2014both tied directly to documentation quality. We model this domain to help surface where your data could tell the story\u2014not to set a number before you\u2019ve looked.",
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
            attribution: "Signal",
            description: "Every CDI query represents a documentation gap\u2014something that should have been in the note but wasn\u2019t. Each query costs $40\u2013$60 in CDI labor (creation, tracking, follow-up, physician response time). When documentation captures clinical detail at the point of care, fewer queries are needed. CDI departments track query volume daily\u2014this is one of the cleanest metrics to measure pre/post implementation.",
            formula: "Admissions \u00D7 Query rate (25\u201335%) \u00D7 Reduction % (15\u201335%) \u00D7 Cost per query ($40\u2013$60)",
          },
          {
            name: "Documentation Completeness",
            attribution: "Proof",
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
            attribution: "Trend",
            description: "Documentation burden during overnight admits and weekend shifts is a leading driver of hospitalist burnout and turnover. Ambient AI documentation can reduce time spent on H&Ps, daily progress notes, and discharge summaries that previously took 15\u201340 minutes. At $250K\u2013$500K per replacement (recruiting, locum coverage during gap, and months of onboarding), every hospitalist retained represents significant avoided cost. The financial impact extends far beyond recruitment fees.",
            formula: "Hospitalists \u00D7 Turnover (8\u201312%) \u00D7 Burnout % (40\u201350%) \u00D7 Burnout attribution (15%) \u00D7 Replacement cost ($250\u2013500K)",
          },
        ],
      },
      {
        label: "CAPACITY",
        labelColor: colors.primary,
        mechanisms: [
          {
            name: "Documentation Time Returned",
            attribution: "Signal",
            description: "Documentation that previously extended the post-rounding workday now completes during or immediately after rounds. We measure this as hours returned per physician per week\u2014not as additional patient capacity, because hospitalists have an assigned census. Hours returned go to clinical care: more thorough rounding conversations, earlier discharge planning, better handoffs to the next shift. We show this as time value, not revenue.",
            formula: "Hospitalists \u00D7 Time saved/admission (15\u201330 min) \u00D7 Admissions/month \u00D7 Physician hourly rate \u2014 shown as hours returned",
          },
          {
            name: "Discharge Planning Timeliness",
            attribution: "Proof",
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
            attribution: "Trend",
            description: "When hospitalists discuss AKI, malnutrition, or respiratory failure at bedside but the note says \u2018renal function stable,\u2019 that missing specificity costs $2,000\u2013$4,000 in DRG weight. Ambient AI captures the clinical conversation so the note reflects what actually happened\u2014ensuring documentation reflects care delivered. This is the highest-value mechanism in inpatient medicine, auditable from CMI trend data.",
            formula: "Admissions at risk (20\u201330%) \u00D7 Protection rate (20%) \u00D7 DRG weight increase (0.4) \u00D7 Base payment ($6,800) \u00D7 Realization (50%)",
          },
          {
            name: "Observation vs. Inpatient Defense",
            attribution: "Trend",
            description: "Appropriate inpatient admission status requires documentation that supports medical necessity\u2014acuity, complexity, and the clinical reasoning for why outpatient or observation care was insufficient. When documentation captures this at point of care, status determinations hold up to payer review. When it doesn\u2019t, downgrades from IP to observation are common and expensive. We include this within DRG accuracy to avoid double-counting.",
            formula: "Combined with DRG accuracy \u2014 documentation quality supports both appropriate DRG assignment and status defense",
            formulaColor: colors.tertiary,
          },
          {
            name: "Concurrent Review & Denial Prevention",
            attribution: "Trend",
            description: "Inpatient denials are expensive\u2014documentation-related cases average $3,500+ per denial, with complex medical necessity and DRG downgrade audits running higher. Medical necessity denials, DRG downgrade audits, and concurrent review failures all stem from documentation gaps. Complete notes that capture clinical reasoning for continued stay, discharge barriers, and comorbidity burden support concurrent review and reduce unappealable denials.",
            formula: "(denial rate before \u2212 after, in pp) \u00D7 annual discharges \u00D7 $3,500/case \u00D7 attribution %",
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
      { assumption: "Time saved/admission", range: "15\u201345 min", defaultVal: "30 min", source: "Deployment data" },
      { assumption: "At-risk admissions", range: "20\u201330%", defaultVal: "25%", source: "CDI benchmarks" },
      { assumption: "DRG protection rate", range: "15\u201325%", defaultVal: "20%", source: "Conservative" },
      { assumption: "DRG weight increase", range: "0.3\u20130.5", defaultVal: "0.4", source: "CMS differentials" },
      { assumption: "DRG base rate", range: "$6,000\u2013$8,000", defaultVal: "$6,800", source: "CMS IPPS base rate" },
      { assumption: "CDI query rate", range: "25\u201335%", defaultVal: "30%", source: "ACDIS benchmarks" },
      { assumption: "Query reduction %", range: "15\u201335%", defaultVal: "25%", source: "Impl. data" },
      { assumption: "Cost per CDI query", range: "$40\u201360", defaultVal: "$50", source: "ACDIS productivity" },
      { assumption: "Concurrent review denial rate", range: "3\u20136%", defaultVal: "4%", source: "Inpatient RCM" },
      { assumption: "Denial prevention rate", range: "15\u201325%", defaultVal: "20%", source: "Conservative" },
      { assumption: "Avg case denial value", range: "$3.5\u201315K", defaultVal: "$3,500", source: "Inpatient RCM" },
      { assumption: "Hospitalist turnover", range: "8\u201312%", defaultVal: "8%", source: "SHM benchmarks" },
      { assumption: "Burnout-related %", range: "40\u201350%", defaultVal: "45%", source: "Research" },
      { assumption: "Retention impact", range: "10\u201320%", defaultVal: "15%", source: "Conservative" },
      { assumption: "Replacement cost", range: "$250\u2013500K", defaultVal: "$350K", source: "AMGA" },
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

        <View style={{ marginBottom: 10 }}>
          <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>HOW VALUE ACCRUES</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { stage: "SIGNAL", timeline: "30–90 days", description: "Provider-level, EHR-measurable. Documentation time, CDI queries, note completion rate." },
              { stage: "TREND", timeline: "3–6 months", description: "Documentation patterns emerge. Billing distributions, retention signals, coding accuracy." },
              { stage: "PROOF", timeline: "6–18 months", description: "System-level statistical credibility. Claims validation, CMI trending, retention data." },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.cards, borderLeftWidth: 2, borderLeftColor: colors.primary, padding: 8 }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 2 }}>{s.stage}</Text>
                <Text style={{ fontSize: 8.5, color: colors.primary, fontWeight: "bold" as const, marginBottom: 3 }}>{s.timeline}</Text>
                <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>{s.description}</Text>
              </View>
            ))}
          </View>
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
