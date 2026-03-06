import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
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

export interface EDPDFData {
  clientName?: string;
  preparedBy?: string;
  organizationName?: string;
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
// Primary: Black, White, Cadmium Red, Coral
// Grays are neutral tints of black for text hierarchy (industry standard)
// ============================================================================

const brand = {
  // Primary brand colors
  black: "#000000",
  white: "#FFFFFF",
  red: "#EA2C00",
  coral: "#F07B5F",
  
  // Neutral grays (tints of black for text hierarchy)
  warmGray: "#F8F7F6",    // Very subtle warm white for backgrounds
  textSecondary: "#666666", // Secondary text on white
  textTertiary: "#999999",  // Tertiary text, notes
};

// ============================================================================
// PREMIUM EDITORIAL STYLES - SHARED WITH OUTPATIENT
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
    borderTopColor: brand.black,
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

  // Stakes page styles
  stakesPage: {
    backgroundColor: brand.white,
    padding: 0,
  },
  stakesHero: {
    backgroundColor: brand.black,
    padding: 50,
    paddingTop: 40,
    paddingBottom: 50,
  },
  stakesHeroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: brand.white,
    lineHeight: 1.2,
    marginBottom: 32,
    maxWidth: 440,
  },
  stakesStatRow: {
    flexDirection: "row",
    gap: 40,
  },
  stakesStat: {
    marginRight: 40,
  },
  stakesStatValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 6,
  },
  stakesStatLabel: {
    fontSize: 9,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    maxWidth: 120,
  },
  stakesContent: {
    padding: 50,
  },
  stakesBody: {
    fontSize: 12,
    color: brand.black,
    lineHeight: 1.8,
    marginBottom: 40,
  },
  pullQuoteBox: {
    borderLeftWidth: 4,
    borderLeftColor: brand.red,
    paddingLeft: 24,
    marginTop: 20,
  },
  pullQuoteText: {
    fontSize: 14,
    fontWeight: 500,
    color: brand.black,
    lineHeight: 1.6,
  },

  // Path Forward page styles
  phaseSection: {
    marginBottom: 28,
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand.red,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  phaseNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: brand.white,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: brand.black,
  },
  phaseDuration: {
    fontSize: 10,
    color: brand.textSecondary,
    marginLeft: 12,
  },
  phaseActions: {
    paddingLeft: 48,
  },
  phaseAction: {
    fontSize: 10,
    color: brand.black,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  costOfInactionBox: {
    backgroundColor: brand.black,
    padding: 24,
    marginTop: 32,
  },
  costOfInactionLabel: {
    fontSize: 9,
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
  },
  costOfInactionText: {
    fontSize: 11,
    color: brand.white,
    lineHeight: 1.6,
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
    fontWeight: 500,
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
    fontWeight: 500,
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
// ED-SPECIFIC NARRATIVE CONTENT - THE SOUL
// Premium story arc with emotional anchors
// ============================================================================

const narrativeContent = {
  cover: {
    subtitle: "A transparent framework for understanding how ambient AI documentation creates value in high-acuity, time-critical emergency care environments.",
  },

  stakes: {
    headline: "In the ED, every minute spent documenting is a minute not spent saving lives.",
    stats: [
      { value: "43%", label: "Of ED physicians report burnout symptoms" },
      { value: "3.5%", label: "Average LWBS rate—patients leaving without care" },
      { value: "$1.2M", label: "Cost per ED physician departure" },
    ],
    body: "Emergency Departments operate at the intersection of life and death. Yet ED physicians spend nearly half their shift on documentation—creating notes instead of treating patients. The result: longer wait times, higher LWBS rates, and clinicians pushed to the breaking point. This isn't sustainable. Every ED faces a choice: continue the status quo and absorb the costs, or fundamentally reimagine how documentation happens in emergency care.",
    pullQuote: "The ED that documents faster treats more patients. The question is whether you'll lead that transformation.",
  },
  
  executive: {
    intro: "Every number in this model traces back to editable inputs. The ED operates under unique pressures—high acuity, time sensitivity, throughput demands. This framework accounts for those realities with conservative assumptions you can stress-test.",
  },
  
  timeValue: {
    theory: "ED documentation typically adds 10-15 minutes per patient. When ambient AI handles this burden, physicians can see more patients, reduce LWBS rates, and reclaim work-life balance. But time savings only create value when converted to action.",
    why: "Time savings in the ED directly impact throughput, LWBS rates, and physician satisfaction. Each driver includes conservative realization rates reflecting ED-specific constraints.",
  },
  
  docValue: {
    theory: "ED documentation drives accurate level-of-service coding and denial prevention. High-acuity encounters with complex medical decision-making are often under-documented due to time pressure, leaving value on the table.",
    why: "ED encounters are high-acuity and time-sensitive. Documentation that captures the full clinical picture supports accurate E&M coding and reduces documentation-related denials.",
  },
  
  downstream: {
    intro: "ED encounters that result in admissions create additional documentation value opportunities. These are captured in the Inpatient flow and represent significant potential beyond direct ED metrics.",
    cards: [
      { title: "DRG/CMI Capture", text: "Accurate ED documentation supports proper DRG assignment for admitted patients, capturing the full complexity of the case." },
      { title: "Medical Necessity", text: "Complete documentation establishes medical necessity for admission decisions, reducing retrospective denials." },
      { title: "CDI Efficiency", text: "Reduces Clinical Documentation Improvement queries and rework by capturing detail upfront." },
      { title: "Inpatient Connection", text: "ED documentation flows into inpatient records, enabling end-to-end value capture across the care continuum." },
    ],
  },
  
  drivers: {
    patientAccess: {
      theory: "In the ED, reduced documentation time means improved throughput and lower LWBS rates. Each additional patient seen represents both revenue and better community access to emergency care.",
      implication: (value: number, pct: number) => `At ${formatCurrency(value)}, throughput improvement represents ${pct}% of your projected value. EDs with high LWBS rates often see this number grow as workflows mature.`,
      benchmark: "High-performing EDs convert 30-40% of reclaimed documentation time to additional patient throughput.",
    },
    overtime: {
      theory: "ED physician retention is heavily influenced by work-life balance. Documentation that extends shifts creates burnout, driving attrition. Reducing burnout-driven departures avoids substantial recruitment and ramp-up costs.",
      implication: (value: number) => `The ${formatCurrency(value)} in retention value represents avoided recruitment costs and maintained productivity. This materializes over 12+ months as turnover patterns emerge.`,
      benchmark: "ED physician turnover runs 15-20% annually, with 50-60% attributable to burnout.",
    },
    workforce: {
      theory: "ED physician burnout leads to departures, and each departure costs $500K-$1M+ in recruiting, onboarding, and lost productivity. Documentation burden is a leading driver of ED physician burnout.",
      implication: (value: number, providers: number) => `With ${providers} ED physicians, even fractional retention improvement creates substantial value. This is probabilistic and materializes over time.`,
      benchmark: "ED physician replacement typically takes 6-12 months with significant productivity loss during ramp-up.",
    },
    wrvu: {
      theory: "ED encounters often involve complex medical decision-making that isn't fully documented. When notes capture the complete picture, E&M coding can reflect the actual work performed.",
      implication: (value: number) => `This ${formatCurrency(value)} represents level-of-service accuracy—capturing complexity that's already being delivered. Highly defensible because it's not about doing more.`,
      benchmark: "ED E&M levels average 10-15% undercoding due to documentation gaps in high-acuity encounters.",
    },
    denials: {
      theory: "ED claims are frequently denied for documentation gaps—missing clinical information, insufficient medical necessity, incomplete MDM. Preventing denials upfront is more efficient than appeals.",
      implication: (value: number) => `Denial prevention at ${formatCurrency(value)} is highly measurable—you can track ED-specific denials before and after with clear attribution to documentation improvement.`,
      benchmark: "ED denial rates run 8-12%, with 50-60% stemming from documentation insufficiency.",
    },
  },
  
  scaling: {
    intro: "Value doesn't scale linearly. As utilization improves and workflows adapt, each ED physician may generate more value at maturity than at pilot. These projections assume adoption patterns we've observed—your experience could differ.",
  },

  recommendations: {
    headline: "Your Path Forward",
    phases: [
      {
        name: "Validate",
        duration: "30 days",
        actions: [
          "Deploy with 3-5 high-volume ED physicians",
          "Target a single shift pattern initially",
          "Establish baseline LWBS and throughput metrics",
        ],
      },
      {
        name: "Prove",
        duration: "60-90 days",
        actions: [
          "Measure time savings and physician satisfaction",
          "Track LWBS rate changes",
          "Document workflow integration patterns",
        ],
      },
      {
        name: "Scale",
        duration: "Ongoing",
        actions: [
          "Expand to all ED physicians and shifts",
          "Optimize workflows based on learnings",
          "Connect ED documentation to inpatient flow",
        ],
      },
    ],
    closing: "The EDs that move first don't just improve throughput—they become destinations for top emergency medicine talent.",
    costOfInaction: "Every month of delay represents patients leaving without care, physicians considering departure, and revenue lost to documentation gaps.",
  },
  
  methodology: {
    approach: "This model prioritizes transparency over precision. We use conservative assumptions informed by ED-specific realities, show our work step-by-step, and make every input editable. The goal isn't to prove a number—it's to give you a framework for thinking about ED value.",
    principles: [
      { name: "ED-specific conservatism", description: "Realization rates account for patient arrival unpredictability, capacity constraints, and high-stress environments." },
      { name: "Transparent calculations", description: "Every number traces back to editable inputs. Challenge anything that doesn't match your ED reality." },
      { name: "Defensible to skeptics", description: "Built to withstand executive scrutiny. No hidden assumptions or optimistic leaps." },
    ],
  },
};

// ============================================================================
// ED-SPECIFIC DRIVER LABELS
// ============================================================================

const ED_DRIVER_LABELS: Record<string, string> = {
  patientAccess: "Throughput & LWBS Reduction",
  overtime: "Physician Retention",
  workforce: "Clinician Wellbeing",
  wrvu: "Level of Service Accuracy",
  denials: "Denial Prevention",
};

function getEDDriverName(driverId: string, defaultName: string): string {
  return ED_DRIVER_LABELS[driverId] || defaultName;
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

function getDriverSteps(driver: DriverCalculation, data: EDPDFData): CalculationStep[] {
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
          question: "How much time converts to additional throughput?",
          inputs: [
            { value: formatNumber(data.hoursReturned), label: "hours" },
            { value: `${inputs.timeToAccessPct || 40}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.accessHours as number || 0)} hours`,
          note: "ED throughput conversion is typically higher than outpatient due to patient flow demands.",
        },
        {
          label: "Step 3",
          question: "How many hours become additional patients?",
          inputs: [
            { value: formatNumber(inputs.accessHours as number || 0), label: "hours" },
            { value: `${inputs.conversionRate || 35}%`, label: "realization" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.additionalVisits as number || 0)} patients`,
          note: "Realization accounts for ED capacity constraints and patient arrival patterns.",
        },
        {
          label: "Step 4",
          question: "What's the revenue impact?",
          inputs: [
            { value: formatNumber(inputs.additionalVisits as number || 0), label: "patients" },
            { value: `$${inputs.revenuePerVisit || 350}` },
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
            { value: `${inputs.avgWrvuPerEncounter || 2.5}`, label: "wRVU/enc" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.baselineWrvus as number || 0)} wRVUs`,
          note: "ED wRVU per encounter is typically higher than outpatient due to acuity.",
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
          note: "Lift from capturing complexity in high-acuity encounters.",
        },
        {
          label: "Step 3",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.wrvuGain as number || 0), label: "wRVUs" },
            { value: `$${inputs.conversionFactor || 40}`, label: "CF" },
            { value: `${inputs.realizationRate || 75}%` },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "edRetention":
    case "overtime":
    case "workforce": {
      const wellbeingPct = (inputs.wellbeingPct as number) ?? 30;
      const docQualityPct = (inputs.docQualityPct as number) ?? 30;
      const burdenReliefPct = docQualityPct + wellbeingPct;
      const wellbeingHours = (inputs.wellbeingHours as number) || Math.round(data.hoursReturned * (burdenReliefPct / 100));
      const hoursPerProvider = (inputs.hoursPerProvider as number) || Math.round(wellbeingHours / data.providers);
      const weeklyMinutes = Math.round(hoursPerProvider * 60 / 52);
      const tier = hoursPerProvider < 50 ? "MINIMAL (3-5%)" 
                 : hoursPerProvider < 100 ? "MODERATE (8-12%)" 
                 : hoursPerProvider < 150 ? "SIGNIFICANT (15-20%)"
                 : "MAXIMUM (25-30%)";
      
      return [
        {
          label: "Step 1",
          question: "How much time is returned to providers?",
          inputs: [
            { value: formatNumber(data.hoursReturned), label: "total hours" },
            { value: `${burdenReliefPct}%`, label: "burden relief" },
          ],
          operators: ["×"],
          result: `${formatNumber(wellbeingHours)} hours`,
          note: `That's ${hoursPerProvider} hours/physician/year (~${weeklyMinutes} min/week back). Includes doc quality and sustainability time — excludes only throughput hours.`,
        },
        {
          label: "Step 2",
          question: "What retention impact tier does this achieve?",
          inputs: [
            { value: `${hoursPerProvider}`, label: "hrs/provider" },
          ],
          operators: [],
          result: tier,
          note: "ED physicians have higher burnout rates—time-back interventions have proportionally greater impact.",
        },
        {
          label: "Step 3",
          question: "How many departures occur annually?",
          inputs: [
            { value: formatNumber(data.providers), label: "ED physicians" },
            { value: `${inputs.turnoverRate || 10}%` },
          ],
          operators: ["×"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
          note: `Of these, ${inputs.burnoutAttribution || 60}% (${(inputs.burnoutDepartures as number || 0).toFixed(1)}) are burnout-related.`,
        },
        {
          label: "Step 4",
          question: "What's the retention value?",
          inputs: [
            { value: (inputs.burnoutDepartures as number || 0).toFixed(2), label: "burnout departures" },
            { value: `${inputs.retentionLift || inputs.abridgeImpact || 15}%`, label: "retention lift" },
            { value: formatCurrency(inputs.replacementCost as number || 500000) },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: `${(inputs.departuresAvoided as number || 0).toFixed(2)} departures avoided. ED replacement costs include recruiting, signing bonus, credentialing, and revenue loss during vacancy.`,
        },
      ];
    }

    case "denials":
      return [
        {
          label: "Step 1",
          question: "How many ED claims are denied today?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.denialRate || 10}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.totalDenials as number || 0)} denials`,
          note: "ED denial rates are typically higher than outpatient.",
        },
        {
          label: "Step 2",
          question: "How many stem from documentation gaps?",
          inputs: [
            { value: formatNumber(inputs.totalDenials as number || 0) },
            { value: `${inputs.docRelatedPercent || 55}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.docRelatedDenials as number || 0)} doc-related`,
        },
        {
          label: "Step 3",
          question: "How many are lost without appeal?",
          inputs: [
            { value: formatNumber(inputs.docRelatedDenials as number || 0) },
            { value: `${inputs.writtenOffPercent || 50}%` },
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
            { value: `$${inputs.avgClaimValue || 400}` },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "ED claim values are typically higher than outpatient.",
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
      return `${formatNumber((inputs.additionalVisits as number) || 0)} patients × $${inputs.revenuePerVisit || 350}`;
    case "wrvu":
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVU × $${inputs.conversionFactor || 40} × ${inputs.realizationRate || 75}%`;
    case "workforce":
    case "overtime":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} prevented × ${formatCurrency((inputs.replacementCost as number) || 500000)}`;
    case "denials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims × $${inputs.avgClaimValue || 400}`;
    default:
      return "";
  }
}

function getDriverNarrative(driverId: string): { theory: string; implication: (value: number, data: EDPDFData) => string } {
  const content = narrativeContent.drivers[driverId as keyof typeof narrativeContent.drivers];
  if (!content) {
    return {
      theory: "This driver represents measurable value from improved documentation quality in the ED.",
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
        if (driverId === "workforce" || driverId === "overtime") {
          return (content.implication as (v: number, p: number) => string)(value, data.providers);
        }
        return (content.implication as (v: number) => string)(value);
      }
      return `At ${formatCurrency(value)}, this contributes meaningfully to your projected ED ROI.`;
    },
  };
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

const CoverPage = ({ data }: { data: EDPDFData }) => {
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
        <Text style={styles.coverLabel}>Emergency Department</Text>
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
          Emergency Department • {data.providers} ED physicians • {formatNumber(data.encounters)} encounters
        </Text>
      </View>
    </Page>
  );
};

// Stakes Page - The Urgency
const StakesPage = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.stakesPage} wrap={false}>
      <View style={styles.stakesHero}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <Image src={abridgeLogoPath} style={styles.headerLogo} />
          <Text style={{ fontSize: 9, color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>The Stakes</Text>
        </View>
        <Text style={styles.stakesHeroTitle}>{narrativeContent.stakes.headline}</Text>
        <View style={styles.stakesStatRow}>
          {narrativeContent.stakes.stats.map((stat, i) => (
            <View key={i} style={styles.stakesStat}>
              <Text style={styles.stakesStatValue}>{stat.value}</Text>
              <Text style={styles.stakesStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stakesContent}>
        <Text style={styles.stakesBody}>{narrativeContent.stakes.body}</Text>
        <View style={styles.pullQuoteBox}>
          <Text style={styles.pullQuoteText}>{narrativeContent.stakes.pullQuote}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");

  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Emergency Department Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Executive Summary</Text>
        <Text style={styles.sectionTitle}>The ED Value Story</Text>
        <Text style={styles.sectionSubtitle}>
          {data.providers} ED physicians • {formatNumber(data.encounters)} annual encounters • {data.drivers.length} value drivers
        </Text>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>ED-Specific Context</Text>
          <Text style={styles.narrativeText}>
            {narrativeContent.executive.intro}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValueRed}>{formatCurrency(data.netGain)}</Text>
            <Text style={styles.metricLabel}>Net Annual Value</Text>
            <Text style={styles.metricNote}>{formatCurrency(data.totalValue)} − {formatCurrency(data.investment)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>Return on Investment</Text>
            <Text style={styles.metricNote}>Every $1 returns ${data.roi.toFixed(2)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{formatNumber(data.hoursReturned)}</Text>
            <Text style={styles.metricLabel}>Hours Returned</Text>
            <Text style={styles.metricNote}>{data.timeSavedPerEncounter} min per encounter</Text>
          </View>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Time Back Value • {formatCurrency(data.laborTotal)}</Text>
          {laborDrivers.map((driver, i) => (
            <View key={driver.id} style={[styles.valueRow, i === laborDrivers.length - 1 ? styles.valueRowLast : {}]}>
              <Text style={styles.valueLabel}>{getEDDriverName(driver.id, driver.name)}</Text>
              <Text style={styles.valueAmount}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {laborDrivers.length === 0 && (
            <Text style={{ fontSize: 10, color: brand.textSecondary, fontWeight: 500, paddingVertical: 12 }}>No time-based drivers selected</Text>
          )}
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Documentation Quality • {formatCurrency(data.revenueTotal)}</Text>
          {revenueDrivers.map((driver, i) => (
            <View key={driver.id} style={[styles.valueRow, i === revenueDrivers.length - 1 ? styles.valueRowLast : {}]}>
              <Text style={styles.valueLabel}>{getEDDriverName(driver.id, driver.name)}</Text>
              <Text style={styles.valueAmount}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {revenueDrivers.length === 0 && (
            <Text style={{ fontSize: 10, color: brand.textSecondary, fontWeight: 500, paddingVertical: 12 }}>No documentation drivers selected</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ProjectionPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Emergency Department Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Multi-Year View</Text>
        <Text style={styles.sectionTitle}>Investment & Return</Text>
        <Text style={styles.sectionSubtitle}>
          How value compounds as adoption matures and ED workflows improve.
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
            <Text style={styles.metricLabel}>Per ED Physician Annual</Text>
          </View>
        </View>

        <View style={styles.downstreamSection}>
          <Text style={styles.downstreamTitle}>Downstream Value Potential</Text>
          <Text style={styles.downstreamText}>
            {narrativeContent.downstream.intro}
          </Text>
          <View style={styles.downstreamGrid}>
            {narrativeContent.downstream.cards.map((card, i) => (
              <View key={i} style={styles.downstreamCard}>
                <Text style={styles.downstreamCardTitle}>{card.title}</Text>
                <Text style={styles.downstreamCardText}>{card.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED Value Assessment</Text>
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
  data: EDPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  const narrative = getDriverNarrative(driver.id);
  const steps = getDriverSteps(driver, data);
  const displayName = getEDDriverName(driver.id, driver.name);

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
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// Path Forward Page - Recommendations
const PathForwardPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Emergency Department Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Recommendations</Text>
        <Text style={styles.sectionTitle}>{narrativeContent.recommendations.headline}</Text>
        <Text style={styles.sectionSubtitle}>
          A phased approach to capturing {formatCurrency(data.netGain)} in annual value.
        </Text>

        {narrativeContent.recommendations.phases.map((phase, i) => (
          <View key={i} style={styles.phaseSection}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseNumber}>
                <Text style={styles.phaseNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.phaseName}>{phase.name}</Text>
              <Text style={styles.phaseDuration}>{phase.duration}</Text>
            </View>
            <View style={styles.phaseActions}>
              {phase.actions.map((action, j) => (
                <Text key={j} style={styles.phaseAction}>• {action}</Text>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.pullQuoteBox}>
          <Text style={styles.pullQuoteText}>{narrativeContent.recommendations.closing}</Text>
        </View>

        <View style={styles.costOfInactionBox}>
          <Text style={styles.costOfInactionLabel}>The Cost of Waiting</Text>
          <Text style={styles.costOfInactionText}>{narrativeContent.recommendations.costOfInaction}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Emergency Department Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Methodology</Text>
        <Text style={styles.sectionTitle}>How We Built This</Text>
        <Text style={styles.sectionSubtitle}>
          The inputs, benchmarks, and ED-specific principles behind these projections.
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
            <Text style={styles.valueLabel}>ED physicians</Text>
            <Text style={styles.valueAmount}>{data.providers}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Annual ED encounters</Text>
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
            <Text style={styles.valueLabel}>Investment per ED physician</Text>
            <Text style={styles.valueAmount}>{formatCurrency(data.costPerProvider)}/mo</Text>
          </View>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>ED-Specific Assumptions</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Throughput realization</Text>
            <Text style={styles.valueAmount}>35%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Retention improvement realization</Text>
            <Text style={styles.valueAmount}>25%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>wRVU realization (payer mix)</Text>
            <Text style={styles.valueAmount}>75%</Text>
          </View>
          <View style={[styles.valueRow, styles.valueRowLast]}>
            <Text style={styles.valueLabel}>Denial prevention realization</Text>
            <Text style={styles.valueAmount}>70%</Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>A note on ED-specific conservatism</Text>
          <Text style={styles.insightText}>
            ED environments are fast-paced with unique constraints. Our realization rates account for 
            patient arrival unpredictability, capacity constraints, and the high-stress nature of emergency 
            care. Organizations that execute well often exceed these conservative projections.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DOCUMENT COMPONENT
// ============================================================================

const EDPDFDocument = ({ data }: { data: EDPDFData }) => {
  // Pages: Stakes, Executive, Driver pages..., Projections, Path Forward, Methodology (Cover not counted)
  const totalPages = 5 + data.drivers.length;
  let pageNum = 0;

  return (
    <Document>
      {/* Cover - no page number, not counted */}
      <CoverPage data={data} />
      {/* Stakes - Page 1 */}
      <StakesPage pageNum={++pageNum} totalPages={totalPages} />
      <ExecutiveSummaryPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      {data.drivers.map((driver) => (
        <DriverDetailPage 
          key={driver.id} 
          driver={driver} 
          data={data} 
          pageNum={++pageNum} 
          totalPages={totalPages}
        />
      ))}
      <ProjectionPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      <PathForwardPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      <MethodologyPage data={data} pageNum={++pageNum} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateEDROIPDF(data: EDPDFData): Promise<void> {
  const blob = await pdf(<EDPDFDocument data={data} />).toBlob();
  const fileName = data.clientName 
    ? `Abridge_ED_Value_Assessment_${data.clientName.replace(/\s+/g, "_")}.pdf`
    : "Abridge_ED_Value_Assessment.pdf";
  
  await savePdfBlob(blob, fileName);
}

export async function generateEDROIPDFBlob(data: EDPDFData): Promise<Blob> {
  return await pdf(<EDPDFDocument data={data} />).toBlob();
}

export { EDPDFDocument };
