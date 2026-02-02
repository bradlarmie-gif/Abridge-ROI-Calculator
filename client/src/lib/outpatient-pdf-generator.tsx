import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// TYPES
// ============================================================================

export interface DriverCalculation {
  id: string;
  name: string;
  value: number;
  category: "labor" | "revenue";
  inputs: Record<string, number | string>;
}

export interface JourneyData {
  pilotProviders: number;
  pilotEncounters: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleProviders: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: "measured" | "steady" | "aggressive";
  scalingMonths: number;
  networkEffect: number;
}

export interface OutpatientPDFData {
  clientName?: string;
  preparedBy?: string;
  organizationName?: string;
  contactName?: string;
  careSetting: string;
  unitName: string;
  unitNamePlural: string;
  
  providers: number;
  encounters: number;
  eligibleEncounters: number;
  utilization: number;
  timeSavedPerEncounter: number;
  hoursReturned: number;
  
  totalValue: number;
  investment: number;
  netGain: number;
  roi: number;
  costPerProvider: number;
  
  drivers: DriverCalculation[];
  laborTotal: number;
  revenueTotal: number;
  laborPct: number;
  revenuePct: number;
  
  timeAllocation?: {
    patientAccess: number;
    patientExperience: number;
    clinicianWellbeing: number;
    reducingLocums?: number;
  };
  
  timeValues?: {
    patientAccess: number;
    patientExperience: number | string;
    clinicianWellbeing: number;
    reducingLocums?: number;
  };
  
  wellbeingThreshold?: string;
  
  year1Value: number;
  year2Value: number;
  year3Value: number;
  year1Cost: number;
  year2Cost: number;
  year3Cost: number;
  threeYearValue: number;
  threeYearCost: number;
  threeYearNet: number;
  
  journey: JourneyData;
}

// ============================================================================
// ABRIDGE BRAND - STRICT 3-COLOR PENTAGRAM PALETTE
// ============================================================================

const brand = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#EA2C00",
  coral: "#F07B5F",
  warmGray: "#F8F7F6",
  textSecondary: "#666666",
  textTertiary: "#999999",
};

// ============================================================================
// PREMIUM EDITORIAL STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: brand.black,
    backgroundColor: brand.white,
  },

  coverPage: {
    backgroundColor: brand.black,
    height: "100%",
    padding: 60,
    justifyContent: "space-between",
  },
  coverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  coverLogo: {
    width: 100,
    height: 20,
  },
  coverDate: {
    fontSize: 10,
    color: brand.textSecondary,
    letterSpacing: 1,
  },
  coverHero: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 60,
  },
  coverLabel: {
    fontSize: 11,
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 4,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 52,
    fontWeight: "bold",
    color: brand.white,
    marginBottom: 20,
    lineHeight: 1.0,
  },
  coverSubtitle: {
    fontSize: 14,
    color: brand.textSecondary,
    lineHeight: 1.6,
    maxWidth: 380,
  },
  coverMetrics: {
    flexDirection: "row",
    marginTop: 50,
    gap: 60,
  },
  coverMetric: {
    marginRight: 60,
  },
  coverMetricValue: {
    fontSize: 44,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 8,
  },
  coverMetricLabel: {
    fontSize: 10,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: brand.textSecondary,
    paddingTop: 20,
  },
  coverFooterText: {
    fontSize: 10,
    color: brand.textSecondary,
  },

  contentPage: {
    padding: 0,
    paddingBottom: 60,
    backgroundColor: brand.white,
  },
  pageHeader: {
    backgroundColor: brand.black,
    padding: 24,
    paddingHorizontal: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLogo: {
    width: 80,
    height: 16,
  },
  headerTitle: {
    fontSize: 10,
    color: brand.white,
    letterSpacing: 1,
  },
  
  content: {
    padding: 50,
    paddingTop: 40,
  },

  sectionLabel: {
    fontSize: 11,
    color: brand.red,
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: brand.black,
    marginBottom: 12,
    lineHeight: 1.1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 40,
    maxWidth: 420,
  },

  narrativeBox: {
    backgroundColor: brand.warmGray,
    padding: 28,
    marginBottom: 36,
  },
  narrativeLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.red,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  narrativeText: {
    fontSize: 11,
    color: brand.black,
    lineHeight: 1.7,
  },

  metricsRow: {
    flexDirection: "row",
    marginBottom: 40,
  },
  metricBox: {
    flex: 1,
    paddingRight: 30,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: brand.black,
    marginBottom: 6,
  },
  metricValueRed: {
    fontSize: 36,
    fontWeight: "bold",
    color: brand.red,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 9,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  metricNote: {
    fontSize: 9,
    color: brand.textSecondary,
    marginTop: 4,
  },

  valueSection: {
    marginBottom: 40,
  },
  valueSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: brand.black,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.warmGray,
  },
  valueRowLast: {
    borderBottomWidth: 0,
  },
  valueLabel: {
    fontSize: 11,
    color: brand.black,
  },
  valueAmount: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.red,
  },

  driverHero: {
    backgroundColor: brand.black,
    padding: 50,
    paddingTop: 30,
    paddingBottom: 40,
  },
  driverHeroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 30,
  },
  driverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: brand.white,
    marginBottom: 12,
  },
  driverSubtitle: {
    fontSize: 12,
    color: brand.textSecondary,
    lineHeight: 1.6,
    maxWidth: 320,
  },
  driverValue: {
    alignItems: "flex-end",
  },
  driverValueLabel: {
    fontSize: 9,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  driverValueAmount: {
    fontSize: 40,
    fontWeight: "bold",
    color: brand.coral,
  },

  calcSection: {
    marginBottom: 32,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: brand.black,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 20,
  },
  stepBox: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: brand.warmGray,
  },
  stepBoxLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.red,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepQuestion: {
    fontSize: 11,
    color: brand.black,
    fontStyle: "italic",
    marginBottom: 12,
  },
  stepMath: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  stepInput: {
    backgroundColor: brand.warmGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  stepInputText: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.black,
  },
  stepOperator: {
    fontSize: 12,
    color: brand.textSecondary,
    marginHorizontal: 8,
  },
  stepResult: {
    backgroundColor: brand.black,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  stepResultText: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.coral,
  },
  stepNote: {
    fontSize: 9,
    color: brand.textSecondary,
    fontStyle: "italic",
    marginTop: 10,
  },

  finalBox: {
    backgroundColor: brand.black,
    padding: 28,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  finalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: brand.white,
  },
  finalFormula: {
    fontSize: 9,
    color: brand.textSecondary,
    marginTop: 4,
  },
  finalValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: brand.coral,
  },

  insightBox: {
    backgroundColor: brand.warmGray,
    padding: 24,
    marginTop: 24,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.red,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  insightText: {
    fontSize: 10,
    color: brand.black,
    lineHeight: 1.6,
  },

  pullQuote: {
    borderLeftWidth: 4,
    borderLeftColor: brand.red,
    paddingLeft: 24,
    paddingVertical: 16,
    marginVertical: 30,
  },
  pullQuoteText: {
    fontSize: 18,
    fontWeight: "bold",
    color: brand.black,
    lineHeight: 1.4,
    fontStyle: "italic",
  },

  bigStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  bigStat: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  bigStatValue: {
    fontSize: 42,
    fontWeight: "bold",
    color: brand.red,
    marginBottom: 8,
  },
  bigStatLabel: {
    fontSize: 10,
    color: brand.textSecondary,
    textAlign: "center",
    lineHeight: 1.4,
  },

  benchmarkContainer: {
    marginBottom: 30,
  },
  benchmarkBar: {
    height: 12,
    backgroundColor: brand.warmGray,
    marginBottom: 8,
    position: "relative",
  },
  benchmarkFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 12,
    backgroundColor: brand.coral,
  },
  benchmarkYou: {
    position: "absolute",
    top: -4,
    width: 4,
    height: 20,
    backgroundColor: brand.red,
  },
  benchmarkLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  benchmarkLabel: {
    fontSize: 8,
    color: brand.textSecondary,
  },

  keyFinding: {
    flexDirection: "row",
    marginBottom: 14,
    paddingLeft: 4,
  },
  keyFindingBullet: {
    width: 8,
    height: 8,
    backgroundColor: brand.red,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 4,
  },
  keyFindingText: {
    flex: 1,
    fontSize: 11,
    color: brand.black,
    lineHeight: 1.5,
  },

  phaseContainer: {
    marginBottom: 24,
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  phaseNumber: {
    width: 28,
    height: 28,
    backgroundColor: brand.red,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: brand.white,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: "bold",
    color: brand.black,
  },
  phaseDuration: {
    fontSize: 10,
    color: brand.textSecondary,
    marginLeft: 8,
  },
  phaseAction: {
    flexDirection: "row",
    marginLeft: 40,
    marginBottom: 6,
  },
  phaseActionBullet: {
    fontSize: 10,
    color: brand.red,
    marginRight: 8,
  },
  phaseActionText: {
    fontSize: 10,
    color: brand.black,
    lineHeight: 1.4,
  },

  alertBox: {
    backgroundColor: brand.black,
    padding: 24,
    marginTop: 30,
  },
  alertLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
  },
  alertText: {
    fontSize: 11,
    color: brand.white,
    lineHeight: 1.6,
  },
  alertValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: brand.coral,
    marginTop: 12,
  },

  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.black,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 9,
    fontWeight: "bold",
    color: brand.white,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.warmGray,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: brand.black,
    textAlign: "center",
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: brand.black,
    textAlign: "center",
  },
  tableCellRed: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: brand.red,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: brand.textSecondary,
  },

  downstreamSection: {
    backgroundColor: brand.black,
    padding: 40,
    marginTop: 30,
  },
  downstreamTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: brand.white,
    marginBottom: 16,
  },
  downstreamText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  downstreamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  downstreamCard: {
    width: "48%",
    backgroundColor: brand.black,
    borderWidth: 1,
    borderColor: brand.textSecondary,
    padding: 16,
    marginBottom: 12,
    marginRight: "2%",
  },
  downstreamCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 6,
  },
  downstreamCardText: {
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.5,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatNumber = (value: number): string => value.toLocaleString();

// ============================================================================
// OUTPATIENT-SPECIFIC NARRATIVE CONTENT
// ============================================================================

const narrativeContent = {
  cover: {
    subtitle: "A strategic assessment of how ambient AI documentation could transform clinical operations, financial performance, and clinician experience in your outpatient practice.",
  },
  
  // NEW: Industry context/framing content
  industryContext: {
    headline: "The Documentation Crisis",
    subheadline: "American healthcare faces an unprecedented challenge",
    stats: [
      { value: "2 hours", label: "Time spent on documentation for every 1 hour of patient care" },
      { value: "49%", label: "Of physicians report symptoms of burnout" },
      { value: "$4.6B", label: "Annual cost of physician burnout to US health systems" },
    ],
    narrative: "The administrative burden on clinicians has reached a breaking point. For every hour spent with patients, physicians spend nearly two hours on documentation and EHR tasks. This isn't sustainable—and it's driving experienced clinicians out of medicine at an alarming rate.",
    pullQuote: "The question isn't whether to address documentation burden. It's whether you'll lead the change or react to it.",
  },
  
  executive: {
    intro: "Every number in this model traces back to editable inputs. Outpatient practices face unique pressures—patient volume, documentation burden, and the constant tension between quality and throughput. This framework accounts for those realities with conservative assumptions you can stress-test.",
    keyFindings: [
      "Your investment generates measurable returns across multiple value streams",
      "Labor efficiency and revenue quality work together, not against each other",
      "Conservative realization rates account for real-world implementation realities",
    ],
  },
  
  // NEW: Benchmark comparison content
  benchmarks: {
    headline: "How You Compare",
    intro: "Based on the inputs you provided, here's how your projected performance stacks up against organizations we've studied.",
    roiBenchmark: {
      low: 1.5,
      median: 2.2,
      high: 3.8,
      topQuartile: 2.8,
    },
    adoption: {
      conservative: { utilization: 60, monthsToValue: 6 },
      typical: { utilization: 75, monthsToValue: 4 },
      aggressive: { utilization: 90, monthsToValue: 2 },
    },
  },
  
  timeValue: {
    theory: "Outpatient documentation typically adds 10-15 minutes per patient. When ambient AI handles this burden, clinicians can see more patients, go home on time, and reclaim work-life balance. But time savings only create value when converted to action.",
    why: "Time savings in outpatient settings directly impact access, clinician satisfaction, and operational costs. Each driver includes conservative realization rates reflecting real-world constraints.",
    pullQuote: "Time returned to clinicians is only valuable if it's converted to outcomes that matter.",
  },
  
  docValue: {
    theory: "Outpatient documentation drives accurate level-of-service coding, HCC capture, and denial prevention. Comprehensive notes capture complexity that's often lost in the rush between patients.",
    why: "Outpatient encounters represent the foundation of revenue cycle management. Complete documentation supports accurate coding and reduces preventable denials.",
  },
  
  downstream: {
    intro: "Beyond direct value drivers, improved documentation quality creates cascading benefits across your organization. These represent opportunities to explore as workflows mature.",
    cards: [
      { title: "Provider Satisfaction", text: "Reduced documentation burden is the #1 driver of physician satisfaction and retention." },
      { title: "Patient Experience", text: "More time for patients means better conversations, outcomes, and loyalty." },
      { title: "Quality Measures", text: "Complete documentation supports accurate quality reporting and value-based care performance." },
      { title: "Compliance & Audit", text: "Comprehensive notes reduce audit risk and support accurate billing." },
    ],
  },
  
  drivers: {
    patientAccess: {
      theory: "When clinicians spend less time on documentation, they can see more patients. Each additional patient represents both revenue and better community access to care.",
      implication: (value: number, pct: number) => `At ${formatCurrency(value)}, patient access represents ${pct}% of your projected value. Practices with high demand often see this number grow as workflows mature.`,
      benchmark: "Top-quartile organizations convert 18-22% of time savings to additional patient volume.",
    },
    reducingLocums: {
      theory: "Locum coverage is expensive—typically 2-3x the cost of employed physicians. When documentation efficiency improves, you may be able to reduce locum reliance.",
      implication: (value: number) => `The ${formatCurrency(value)} in locum reduction represents direct cost savings. This materializes as contracts are renegotiated and coverage patterns shift.`,
      benchmark: "Organizations with high locum spend often see 15-25% reduction within 18 months.",
    },
    clinicianWellbeing: {
      theory: "Physician burnout leads to departures, and each departure costs $500K-$1M+ in recruiting, onboarding, and lost productivity. Documentation burden is a leading driver of burnout.",
      implication: (value: number, providers: number) => `With ${providers} clinicians, even fractional retention improvement creates substantial value. This is probabilistic and materializes over time.`,
      benchmark: "Literature suggests 20-40% of physician turnover is attributable to burnout.",
    },
    wrvu: {
      theory: "Outpatient encounters often involve complex medical decision-making that isn't fully documented. When notes capture the complete picture, E&M coding can reflect the actual work performed.",
      implication: (value: number) => `This ${formatCurrency(value)} represents level-of-service accuracy—capturing complexity that's already being delivered. Highly defensible because it's not about doing more.`,
      benchmark: "Studies show 8-15% of encounters are undercoded due to incomplete documentation.",
    },
    hcc: {
      theory: "Hierarchical Condition Categories (HCC) drive risk adjustment in Medicare Advantage and other value-based contracts. Complete documentation ensures conditions are captured and recaptured annually.",
      implication: (value: number) => `HCC capture at ${formatCurrency(value)} is particularly valuable for practices with significant Medicare Advantage panels. This is realized through RAF score improvements.`,
      benchmark: "Average MA patient has 3.2 undocumented HCCs annually worth $1,200-2,400 each.",
    },
    denials: {
      theory: "Claims are frequently denied for documentation gaps—missing clinical information, insufficient medical necessity, or incomplete medical decision-making. Preventing denials upfront is more efficient than appeals.",
      implication: (value: number) => `Denial prevention at ${formatCurrency(value)} is highly measurable—you can track denials before and after with clear attribution to documentation improvement.`,
      benchmark: "45% of denials stem from documentation issues; 60% of these are preventable.",
    },
  },
  
  // NEW: Cost of inaction content
  costOfInaction: {
    headline: "The Cost of Waiting",
    intro: "Every month without action has measurable consequences. Based on your inputs, here's what continued documentation burden may cost your organization.",
    factors: [
      { name: "Lost productivity", multiplier: 0.15 },
      { name: "Turnover risk", multiplier: 0.08 },
      { name: "Missed revenue", multiplier: 0.12 },
    ],
    pullQuote: "The cost of inaction isn't zero—it's the compounding sum of preventable losses.",
  },
  
  // NEW: Strategic recommendations
  recommendations: {
    headline: "Recommended Next Steps",
    intro: "Based on your organizational profile and value drivers, we recommend the following approach:",
    phases: [
      {
        name: "Phase 1: Validate",
        duration: "30 days",
        actions: ["Pilot with 5-10 clinicians", "Establish baseline metrics", "Document workflow integration"],
      },
      {
        name: "Phase 2: Prove",
        duration: "60-90 days",
        actions: ["Measure time savings and satisfaction", "Track coding accuracy improvements", "Calculate realized ROI"],
      },
      {
        name: "Phase 3: Scale",
        duration: "Ongoing",
        actions: ["Expand to additional clinicians", "Optimize workflows", "Document best practices"],
      },
    ],
    closingStatement: "The organizations that move first don't just capture value—they define how value is created in their markets.",
  },
  
  scaling: {
    intro: "Value doesn't scale linearly. As utilization improves and workflows adapt, each clinician may generate more value at maturity than at pilot. These projections assume adoption patterns we've observed—your experience could differ.",
  },
  
  methodology: {
    approach: "This model prioritizes transparency over precision. We use conservative assumptions informed by outpatient-specific realities, show our work step-by-step, and make every input editable. The goal isn't to prove a number—it's to give you a framework for thinking about value.",
    principles: [
      { name: "Conservative by default", description: "All realization rates assume imperfect execution" },
      { name: "Transparent logic", description: "Every calculation is shown step-by-step" },
      { name: "Editable inputs", description: "Challenge any assumption that doesn't match your reality" },
    ],
  },
};

// ============================================================================
// OUTPATIENT-SPECIFIC DRIVER LABELS
// ============================================================================

const DRIVER_LABELS: Record<string, string> = {
  patientAccess: "Patient Access",
  reducingLocums: "Locum Reduction",
  clinicianWellbeing: "Clinician Wellbeing",
  wrvu: "Level of Service (wRVU)",
  hcc: "HCC Capture",
  denials: "Denial Prevention",
};

function getDriverName(driverId: string, defaultName: string): string {
  return DRIVER_LABELS[driverId] || defaultName;
}

// ============================================================================
// CALCULATION STEPS
// ============================================================================

interface CalculationStep {
  label: string;
  question: string;
  inputs: { value: string; label?: string }[];
  operators?: string[];
  result: string;
  note?: string;
}

function getDriverSteps(driver: DriverCalculation, data: OutpatientPDFData): CalculationStep[] {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "patientAccess":
      return [
        {
          label: "Step 1",
          question: "How much documentation time does Abridge return?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${data.timeSavedPerEncounter} min` },
          ],
          operators: ["×"],
          result: `${formatNumber(data.hoursReturned)} hours`,
        },
        {
          label: "Step 2",
          question: "How much time converts to additional patient access?",
          inputs: [
            { value: formatNumber(data.hoursReturned), label: "hours" },
            { value: `${data.timeAllocation?.patientAccess || 35}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(Math.round(data.hoursReturned * (data.timeAllocation?.patientAccess || 35) / 100))} hours`,
          note: "Time allocation based on practice priorities.",
        },
        {
          label: "Step 3",
          question: "How many hours become additional patients?",
          inputs: [
            { value: formatNumber(Math.round(data.hoursReturned * (data.timeAllocation?.patientAccess || 35) / 100)), label: "hours" },
            { value: `15%`, label: "realization" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.additionalVisits as number || 0)} patients`,
          note: "Realization accounts for scheduling constraints and room availability.",
        },
        {
          label: "Step 4",
          question: "What's the revenue impact?",
          inputs: [
            { value: formatNumber(inputs.additionalVisits as number || 0), label: "patients" },
            { value: `$${inputs.revenuePerVisit || 200}` },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "wrvu":
      return [
        {
          label: "Step 1",
          question: "What's your current wRVU generation?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${inputs.avgWrvuPerEncounter || 1.5}`, label: "wRVU/enc" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.baselineWrvus as number || 0)} wRVUs`,
        },
        {
          label: "Step 2",
          question: "How much improvement does better documentation create?",
          inputs: [
            { value: formatNumber(inputs.baselineWrvus as number || 0), label: "wRVUs" },
            { value: `${inputs.wrvuImprovementRate || 3}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.wrvuGain as number || 0)} wRVU gain`,
          note: "Lift from capturing complexity in E&M encounters.",
        },
        {
          label: "Step 3",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.wrvuGain as number || 0), label: "wRVUs" },
            { value: `$${inputs.conversionFactor || 40}`, label: "CF" },
            { value: `75%`, label: "realization" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "hcc":
      return [
        {
          label: "Step 1",
          question: "How many patients have undocumented HCCs?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.maPercentage || 25}%`, label: "MA patients" },
            { value: `${inputs.gapRate || 15}%`, label: "gap rate" },
          ],
          operators: ["×", "×"],
          result: `${formatNumber(inputs.patientsWithGaps as number || 0)} patients`,
        },
        {
          label: "Step 2",
          question: "How many HCCs can documentation capture?",
          inputs: [
            { value: formatNumber(inputs.patientsWithGaps as number || 0) },
            { value: `${inputs.captureRate || 70}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.capturedHccs as number || 0)} HCCs`,
        },
        {
          label: "Step 3",
          question: "What's the RAF impact?",
          inputs: [
            { value: formatNumber(inputs.capturedHccs as number || 0), label: "HCCs" },
            { value: `$${inputs.rafValue || 1200}`, label: "per HCC" },
            { value: `60%`, label: "realization" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "reducingLocums":
    case "clinicianWellbeing":
      return [
        {
          label: "Step 1",
          question: "How many departures occur annually?",
          inputs: [
            { value: formatNumber(data.providers), label: "clinicians" },
            { value: `${inputs.turnoverRate || 8}%` },
          ],
          operators: ["×"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
        },
        {
          label: "Step 2",
          question: "How many are tied to burnout?",
          inputs: [
            { value: (inputs.annualDepartures as number || 0).toFixed(1) },
            { value: `${inputs.burnoutAttribution || 50}%` },
          ],
          operators: ["×"],
          result: `${(inputs.burnoutDepartures as number || 0).toFixed(2)} burnout-related`,
        },
        {
          label: "Step 3",
          question: "How many can improved documentation help prevent?",
          inputs: [
            { value: (inputs.burnoutDepartures as number || 0).toFixed(2) },
            { value: `${inputs.retentionLift || 15}%`, label: "retention lift" },
          ],
          operators: ["×"],
          result: `${(inputs.departuresAvoided as number || 0).toFixed(2)} prevented`,
          note: "Conservative—documentation is a major driver but not the only one.",
        },
        {
          label: "Step 4",
          question: "What's the cost savings?",
          inputs: [
            { value: (inputs.departuresAvoided as number || 0).toFixed(2) },
            { value: formatCurrency(inputs.replacementCost as number || 500000) },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "denials":
      return [
        {
          label: "Step 1",
          question: "How many claims are denied today?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.denialRate || 8}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.totalDenials as number || 0)} denials`,
        },
        {
          label: "Step 2",
          question: "How many stem from documentation gaps?",
          inputs: [
            { value: formatNumber(inputs.totalDenials as number || 0) },
            { value: `${inputs.docRelatedPercent || 50}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.docRelatedDenials as number || 0)} doc-related`,
        },
        {
          label: "Step 3",
          question: "How many are lost without appeal?",
          inputs: [
            { value: formatNumber(inputs.docRelatedDenials as number || 0) },
            { value: `${inputs.writtenOffPercent || 45}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.writtenOffDenials as number || 0)} written off`,
        },
        {
          label: "Step 4",
          question: "What can Abridge save?",
          inputs: [
            { value: formatNumber(inputs.writtenOffDenials as number || 0) },
            { value: `${inputs.abridgeCaptureRate || 70}%` },
            { value: `$${inputs.avgClaimValue || 350}` },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    default:
      return [];
  }
}

function getFinalFormula(driver: DriverCalculation): string {
  const inputs = driver.inputs;
  switch (driver.id) {
    case "patientAccess":
      return `${formatNumber((inputs.additionalVisits as number) || 0)} patients × $${inputs.revenuePerVisit || 200}`;
    case "wrvu":
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVU × $${inputs.conversionFactor || 40} × 75%`;
    case "hcc":
      return `${formatNumber((inputs.capturedHccs as number) || 0)} HCCs × $${inputs.rafValue || 1200} × 60%`;
    case "reducingLocums":
    case "clinicianWellbeing":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} prevented × ${formatCurrency((inputs.replacementCost as number) || 500000)}`;
    case "denials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims × $${inputs.avgClaimValue || 350}`;
    default:
      return "";
  }
}

function getDriverNarrative(driverId: string): { theory: string; implication: (value: number, data: OutpatientPDFData) => string } {
  const content = narrativeContent.drivers[driverId as keyof typeof narrativeContent.drivers];
  if (!content) {
    return {
      theory: "This driver represents measurable value from improved documentation quality.",
      implication: (value) => `At ${formatCurrency(value)}, this contributes meaningfully to your projected ROI.`,
    };
  }
  return {
    theory: content.theory,
    implication: (value, data) => {
      if (typeof content.implication === "function") {
        if (driverId === "patientAccess") {
          const pct = Math.round((value / data.totalValue) * 100);
          return (content.implication as (v: number, p: number) => string)(value, pct);
        }
        if (driverId === "clinicianWellbeing" || driverId === "reducingLocums") {
          return (content.implication as (v: number, p: number) => string)(value, data.providers);
        }
        return (content.implication as (v: number) => string)(value);
      }
      return `At ${formatCurrency(value)}, this contributes meaningfully to your projected ROI.`;
    },
  };
}

function getDriverBenchmark(driverId: string): string | null {
  const content = narrativeContent.drivers[driverId as keyof typeof narrativeContent.drivers];
  return (content as { benchmark?: string })?.benchmark || null;
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

const CoverPage = ({ data }: { data: OutpatientPDFData }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayName = data.clientName || data.organizationName || "Your Organization";

  return (
    <Page size="A4" style={styles.coverPage} wrap={false}>
      <View style={styles.coverHeader}>
        <Image src={abridgeLogoPath} style={styles.coverLogo} />
        <Text style={styles.coverDate}>{today}</Text>
      </View>

      <View style={styles.coverHero}>
        <Text style={styles.coverLabel}>Outpatient Value Assessment</Text>
        <Text style={styles.coverTitle}>{displayName}</Text>
        <Text style={styles.coverSubtitle}>
          {narrativeContent.cover.subtitle}
        </Text>

        <View style={styles.coverMetrics}>
          <View style={styles.coverMetric}>
            <Text style={styles.coverMetricValue}>{formatCurrency(data.netGain)}</Text>
            <Text style={styles.coverMetricLabel}>Net Annual Value</Text>
          </View>
          <View style={styles.coverMetric}>
            <Text style={[styles.coverMetricValue, { color: brand.white }]}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.coverMetricLabel}>Return on Investment</Text>
          </View>
        </View>
      </View>

      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>
          Outpatient • {data.providers} clinicians • {formatNumber(data.encounters)} encounters
        </Text>
      </View>
    </Page>
  );
};

// NEW: Industry Context Page - Sets the stage with macro trends
const IndustryContextPage = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => {
  const ctx = narrativeContent.industryContext;
  
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Outpatient Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Industry Context</Text>
        <Text style={styles.sectionTitle}>{ctx.headline}</Text>
        <Text style={styles.sectionSubtitle}>{ctx.subheadline}</Text>

        <View style={styles.bigStatRow}>
          {ctx.stats.map((stat, i) => (
            <View key={i} style={styles.bigStat}>
              <Text style={styles.bigStatValue}>{stat.value}</Text>
              <Text style={styles.bigStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>The Challenge</Text>
          <Text style={styles.narrativeText}>{ctx.narrative}</Text>
        </View>

        <View style={styles.pullQuote}>
          <Text style={styles.pullQuoteText}>{ctx.pullQuote}</Text>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>Why This Matters Now</Text>
          <Text style={styles.insightText}>
            Healthcare systems that address documentation burden today gain competitive advantage in recruiting, 
            retain experienced clinicians longer, and create capacity for growth without adding headcount. 
            The organizations that wait face compounding costs as the talent market tightens.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Outpatient Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// NEW: Recommendations & Next Steps Page
const RecommendationsPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const recs = narrativeContent.recommendations;
  const costOfInaction = narrativeContent.costOfInaction;
  
  // Calculate monthly cost of inaction (simplified model)
  const monthlyLoss = Math.round(data.totalValue / 12);
  
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Outpatient Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Strategic Recommendations</Text>
        <Text style={styles.sectionTitle}>{recs.headline}</Text>
        <Text style={styles.sectionSubtitle}>{recs.intro}</Text>

        {recs.phases.map((phase, i) => (
          <View key={i} style={styles.phaseContainer}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseNumber}>
                <Text style={styles.phaseNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.phaseName}>{phase.name}</Text>
              <Text style={styles.phaseDuration}>{phase.duration}</Text>
            </View>
            {phase.actions.map((action, j) => (
              <View key={j} style={styles.phaseAction}>
                <Text style={styles.phaseActionBullet}>•</Text>
                <Text style={styles.phaseActionText}>{action}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.alertBox}>
          <Text style={styles.alertLabel}>{costOfInaction.headline}</Text>
          <Text style={styles.alertText}>
            Every month without action has measurable consequences. Based on your projected value 
            of {formatCurrency(data.totalValue)} annually, each month of delay represents approximately:
          </Text>
          <Text style={styles.alertValue}>{formatCurrency(monthlyLoss)}/month</Text>
          <Text style={[styles.alertText, { marginTop: 8, fontSize: 9 }]}>
            in unrealized value from productivity, retention, and revenue quality improvements.
          </Text>
        </View>

        <View style={styles.pullQuote}>
          <Text style={styles.pullQuoteText}>{recs.closingStatement}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Outpatient Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  
  // Determine ROI tier for benchmark comparison
  const roiBenchmark = narrativeContent.benchmarks.roiBenchmark;
  const roiPosition = data.roi >= roiBenchmark.topQuartile ? "top-quartile" :
                      data.roi >= roiBenchmark.median ? "above-median" : "developing";
  const roiPositionLabel = roiPosition === "top-quartile" ? "Top Quartile" :
                           roiPosition === "above-median" ? "Above Median" : "Developing";

  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Outpatient Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Executive Summary</Text>
        <Text style={styles.sectionTitle}>The Value Story</Text>
        <Text style={styles.sectionSubtitle}>
          {data.providers} clinicians • {formatNumber(data.encounters)} annual encounters • {data.drivers.length} value drivers
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValueRed}>{formatCurrency(data.netGain)}</Text>
            <Text style={styles.metricLabel}>Net Annual Value</Text>
            <Text style={styles.metricNote}>{formatCurrency(data.totalValue)} − {formatCurrency(data.investment)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>Return on Investment</Text>
            <Text style={styles.metricNote}>{roiPositionLabel} performance</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{formatNumber(data.hoursReturned)}</Text>
            <Text style={styles.metricLabel}>Hours Returned</Text>
            <Text style={styles.metricNote}>{data.timeSavedPerEncounter} min per encounter</Text>
          </View>
        </View>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>Key Findings</Text>
          {narrativeContent.executive.keyFindings.map((finding, i) => (
            <View key={i} style={styles.keyFinding}>
              <View style={styles.keyFindingBullet} />
              <Text style={styles.keyFindingText}>{finding}</Text>
            </View>
          ))}
        </View>

        {/* Benchmark comparison visualization */}
        <View style={styles.benchmarkContainer}>
          <Text style={[styles.narrativeLabel, { marginBottom: 16 }]}>How You Compare</Text>
          <View style={styles.benchmarkLabels}>
            <Text style={styles.benchmarkLabel}>1.5x Low</Text>
            <Text style={styles.benchmarkLabel}>2.2x Median</Text>
            <Text style={styles.benchmarkLabel}>2.8x Top Quartile</Text>
            <Text style={styles.benchmarkLabel}>3.8x High</Text>
          </View>
          <View style={styles.benchmarkBar}>
            {/* Fill to show range */}
            <View style={[styles.benchmarkFill, { width: `${Math.min(100, (data.roi / 4) * 100)}%` }]} />
            {/* Your position marker */}
            <View style={[styles.benchmarkYou, { left: `${Math.min(95, Math.max(5, (data.roi / 4) * 100))}%` }]} />
          </View>
          <Text style={{ fontSize: 10, color: brand.textSecondary, marginTop: 8 }}>
            Your projected {data.roi.toFixed(1)}x ROI places you in the {roiPositionLabel.toLowerCase()} tier of similar implementations.
          </Text>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Time Back Value • {formatCurrency(data.laborTotal)}</Text>
          {laborDrivers.map((driver, i) => (
            <View key={driver.id} style={[styles.valueRow, i === laborDrivers.length - 1 ? styles.valueRowLast : {}]}>
              <Text style={styles.valueLabel}>{getDriverName(driver.id, driver.name)}</Text>
              <Text style={styles.valueAmount}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {laborDrivers.length === 0 && (
            <Text style={{ fontSize: 10, color: brand.textSecondary, fontStyle: "italic", paddingVertical: 12 }}>No time-based drivers selected</Text>
          )}
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Documentation Quality • {formatCurrency(data.revenueTotal)}</Text>
          {revenueDrivers.map((driver, i) => (
            <View key={driver.id} style={[styles.valueRow, i === revenueDrivers.length - 1 ? styles.valueRowLast : {}]}>
              <Text style={styles.valueLabel}>{getDriverName(driver.id, driver.name)}</Text>
              <Text style={styles.valueAmount}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {revenueDrivers.length === 0 && (
            <Text style={{ fontSize: 10, color: brand.textSecondary, fontStyle: "italic", paddingVertical: 12 }}>No documentation drivers selected</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Outpatient Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ProjectionPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Outpatient Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Multi-Year View</Text>
        <Text style={styles.sectionTitle}>Investment & Return</Text>
        <Text style={styles.sectionSubtitle}>
          How value compounds as adoption matures and workflows improve.
        </Text>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>The compounding effect</Text>
          <Text style={styles.narrativeText}>
            {narrativeContent.scaling.intro}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: "left" }]}></Text>
            <Text style={styles.tableHeaderCell}>Year 1</Text>
            <Text style={styles.tableHeaderCell}>Year 2</Text>
            <Text style={styles.tableHeaderCell}>Year 3</Text>
            <Text style={styles.tableHeaderCell}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left", fontWeight: "bold" }]}>Value</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year1Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year2Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year3Value)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearValue)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left", fontWeight: "bold" }]}>Investment</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year1Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year2Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year3Cost)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearCost)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left", fontWeight: "bold" }]}>Net Value</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.threeYearNet)}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValueRed}>{formatCurrency(data.threeYearNet)}</Text>
            <Text style={styles.metricLabel}>3-Year Net Value</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{formatCurrency(Math.round(data.netGain / data.providers))}</Text>
            <Text style={styles.metricLabel}>Per Clinician Annual</Text>
          </View>
        </View>

        <View style={styles.downstreamSection}>
          <Text style={styles.downstreamTitle}>Expansion Opportunity</Text>
          <Text style={styles.downstreamText}>
            Your per-clinician economics tend to remain consistent at scale, while operational learning often improves utilization as workflows mature.
          </Text>
          <View style={styles.downstreamGrid}>
            <View style={styles.downstreamCard}>
              <Text style={styles.downstreamCardTitle}>Today's Model</Text>
              <Text style={styles.downstreamCardText}>
                {data.journey.pilotProviders} clinicians at {data.journey.pilotUtilization}% utilization
              </Text>
              <Text style={[styles.downstreamCardTitle, { marginTop: 8 }]}>
                {formatCurrency(data.journey.pilotValue)}/yr
              </Text>
            </View>
            <View style={styles.downstreamCard}>
              <Text style={styles.downstreamCardTitle}>Full Scale Potential</Text>
              <Text style={styles.downstreamCardText}>
                {data.journey.fullScaleProviders} clinicians at {data.journey.fullScaleUtilization}% utilization
              </Text>
              <Text style={[styles.downstreamCardTitle, { marginTop: 8 }]}>
                {formatCurrency(data.journey.fullScaleValue)}/yr
              </Text>
            </View>
          </View>
          <Text style={[styles.downstreamText, { marginTop: 16 }]}>
            Scaling pace: {data.journey.scalingPace === 'measured' ? '36 months' : data.journey.scalingPace === 'steady' ? '24 months' : '18 months'} to full deployment
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Outpatient Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const DriverDetailPage = ({ 
  driver, 
  data, 
  pageNum, 
  totalPages 
}: { 
  driver: DriverCalculation; 
  data: OutpatientPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  const narrative = getDriverNarrative(driver.id);
  const steps = getDriverSteps(driver, data);
  const displayName = getDriverName(driver.id, driver.name);
  const benchmark = getDriverBenchmark(driver.id);

  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.driverHero}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.headerLogo} />
        </View>
        <View style={styles.driverHeroContent}>
          <View style={{ flex: 1, paddingRight: 40 }}>
            <Text style={styles.driverTitle}>{displayName}</Text>
            <Text style={styles.driverSubtitle}>
              {narrative.theory.substring(0, 180)}...
            </Text>
          </View>
          <View style={styles.driverValue}>
            <Text style={styles.driverValueLabel}>Annual Value</Text>
            <Text style={styles.driverValueAmount}>{formatCurrency(driver.value)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>The Logic</Text>
          <Text style={styles.narrativeText}>{narrative.theory}</Text>
        </View>

        <View style={styles.calcSection}>
          <Text style={styles.calcTitle}>Your Calculation</Text>
          
          {steps.map((step, index) => (
            <View key={index} style={[styles.stepBox, index === steps.length - 1 ? styles.stepBoxLast : {}]}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepQuestion}>{step.question}</Text>
              
              <View style={styles.stepMath}>
                {step.inputs.map((input, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                    {i > 0 && <Text style={styles.stepOperator}>{step.operators?.[i - 1] || "×"}</Text>}
                    <View style={styles.stepInput}>
                      <Text style={styles.stepInputText}>{input.value}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.stepOperator}>=</Text>
                <View style={styles.stepResult}>
                  <Text style={styles.stepResultText}>{step.result}</Text>
                </View>
              </View>
              
              {step.note && <Text style={styles.stepNote}>{step.note}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.finalBox}>
          <View>
            <Text style={styles.finalLabel}>Annual {displayName} Value</Text>
            <Text style={styles.finalFormula}>{getFinalFormula(driver)}</Text>
          </View>
          <Text style={styles.finalValue}>{formatCurrency(driver.value)}</Text>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>What This Means</Text>
          <Text style={styles.insightText}>{narrative.implication(driver.value, data)}</Text>
          {benchmark && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: brand.warmGray }}>
              <Text style={[styles.insightLabel, { color: brand.textSecondary, fontSize: 8 }]}>Industry Benchmark</Text>
              <Text style={[styles.insightText, { fontStyle: "italic" }]}>{benchmark}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Outpatient Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Outpatient Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Methodology</Text>
        <Text style={styles.sectionTitle}>How We Built This</Text>
        <Text style={styles.sectionSubtitle}>
          The inputs, benchmarks, and principles behind these projections.
        </Text>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>Our Approach</Text>
          <Text style={styles.narrativeText}>
            {narrativeContent.methodology.approach}
          </Text>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Your Inputs</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Clinicians</Text>
            <Text style={styles.valueAmount}>{data.providers}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Annual encounters</Text>
            <Text style={styles.valueAmount}>{formatNumber(data.encounters)}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Utilization rate</Text>
            <Text style={styles.valueAmount}>{data.utilization}%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Time saved per encounter</Text>
            <Text style={styles.valueAmount}>{data.timeSavedPerEncounter} min</Text>
          </View>
          <View style={[styles.valueRow, styles.valueRowLast]}>
            <Text style={styles.valueLabel}>Investment per clinician</Text>
            <Text style={styles.valueAmount}>{formatCurrency(data.costPerProvider)}/mo</Text>
          </View>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Realization Assumptions</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Patient Access realization</Text>
            <Text style={styles.valueAmount}>15%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Locum reduction realization</Text>
            <Text style={styles.valueAmount}>60%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>wRVU realization (payer mix)</Text>
            <Text style={styles.valueAmount}>75%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>HCC capture realization</Text>
            <Text style={styles.valueAmount}>60%</Text>
          </View>
          <View style={[styles.valueRow, styles.valueRowLast]}>
            <Text style={styles.valueLabel}>Denial prevention realization</Text>
            <Text style={styles.valueAmount}>70%</Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>A note on conservatism</Text>
          <Text style={styles.insightText}>
            These projections use conservative realization rates that account for real-world constraints—
            scheduling limitations, payer mix variability, and the complexity of attribution. Organizations 
            that execute well often exceed these conservative projections.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Outpatient Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DOCUMENT COMPONENT
// ============================================================================

const OutpatientPDFDocument = ({ data }: { data: OutpatientPDFData }) => {
  // Updated page count: Cover + Context + Executive + Projection + Drivers + Recommendations + Methodology
  const totalPages = 5 + data.drivers.length + 1;
  let pageNum = 1;

  return (
    <Document>
      <CoverPage data={data} />
      <IndustryContextPage pageNum={++pageNum} totalPages={totalPages} />
      <ExecutiveSummaryPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      <ProjectionPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      {data.drivers.map((driver) => (
        <DriverDetailPage 
          key={driver.id} 
          driver={driver} 
          data={data} 
          pageNum={++pageNum} 
          totalPages={totalPages}
        />
      ))}
      <RecommendationsPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      <MethodologyPage data={data} pageNum={++pageNum} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateOutpatientROIPDF(data: OutpatientPDFData): Promise<void> {
  const blob = await pdf(<OutpatientPDFDocument data={data} />).toBlob();
  const today = new Date().toISOString().split("T")[0];
  const orgName = data.clientName || data.organizationName || "Organization";
  const fileName = `Abridge_Value_Assessment_${orgName.replace(/\s+/g, "_")}_${today}.pdf`;
  saveAs(blob, fileName);
}

export async function generateOutpatientROIPDFBlob(data: OutpatientPDFData): Promise<Blob> {
  return await pdf(<OutpatientPDFDocument data={data} />).toBlob();
}

export { OutpatientPDFDocument };
