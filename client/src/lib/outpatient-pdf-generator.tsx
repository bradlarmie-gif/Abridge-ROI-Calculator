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

  // ==========================================
  // COVER - TRUE BLACK HERO
  // ==========================================
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

  // ==========================================
  // CONTENT PAGES - GENEROUS WHITE SPACE
  // ==========================================
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

  // Section typography - BOLD & CONFIDENT
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

  // Narrative blocks - THE SOUL
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

  // Metrics - BOLD TYPOGRAPHY
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

  // Value breakdown - CLEAN LINES
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

  // Driver pages - EDITORIAL LAYOUT
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

  // Calculation steps - TRANSPARENT METHODOLOGY
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

  // Final value - HERO MOMENT
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

  // Implications - STRATEGIC INSIGHT
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

  // Tables - MINIMAL & CLEAN
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

  // Footer - SUBTLE
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
// NARRATIVE CONTENT - THE SOUL OF THE PDF
// ============================================================================

const narrativeContent = {
  cover: {
    subtitle: "This document explores how ambient AI documentation could create value for your practice—built on transparent methodology you can challenge and adapt.",
  },
  
  executive: {
    intro: "Every number in this model traces back to editable inputs. The goal isn't to prove a predetermined outcome—it's to give you a defensible framework for thinking about value that you can stress-test with your own assumptions.",
  },
  
  timeValue: {
    theory: "Documentation consumes 1-2 hours of clinician time daily. When ambient AI handles the documentation burden, that time can be strategically reinvested. But not all time converts to value automatically—scheduling constraints, room availability, and patient demand all play a role.",
    why: "Time savings only create financial value when converted to action. This model uses conservative realization rates to account for real-world constraints.",
  },
  
  docValue: {
    theory: "When clinicians are pressed for time, documentation often captures less than the full clinical picture. The result: E&M levels that don't reflect actual complexity, chronic conditions that go undocumented, and claims that get denied for lack of supporting information.",
    why: "Better documentation isn't about upcoding—it's about accurate representation. When notes capture what actually happened, coding can reflect the work actually performed.",
  },
  
  drivers: {
    patientAccess: {
      theory: "When clinicians spend less time on documentation, they may have capacity for additional patient visits. The conversion isn't automatic—scheduling, room availability, and demand all play a role.",
      implication: (value: number, pct: number) => `At ${formatCurrency(value)}, patient access represents ${pct}% of your projected value. Organizations with strong scheduling operations and patient demand often see this grow as workflows mature.`,
    },
    overtime: {
      theory: "Documentation that spills outside clinic hours creates premium labor costs—overtime pay, locum coverage, and the invisible burnout tax. When providers finish notes during the workday, these costs decrease.",
      implication: (value: number) => `The ${formatCurrency(value)} in overtime reduction represents both hard savings and quality-of-life improvement—a leading indicator of broader satisfaction gains.`,
    },
    workforce: {
      theory: "Documentation burden is consistently cited as the leading driver of physician burnout. Replacing a departing clinician costs $400K-$1M+ when factoring recruiting, lost revenue, onboarding, and productivity ramp.",
      implication: (value: number, providers: number) => `With ${providers} providers, even fractional retention improvement creates substantial value. This materializes over 12+ months as turnover patterns emerge.`,
    },
    wrvu: {
      theory: "The hypothesis: physicians under time pressure often document less than the full clinical picture. When notes capture complete visit complexity, coding can reflect the work actually performed—not upcoding, just accurate representation.",
      implication: (value: number) => `This ${formatCurrency(value)} represents documentation improvement value—capturing complexity that's already being delivered. Highly defensible because it's not about doing more.`,
    },
    hcc: {
      theory: "Risk adjustment pays based on documented conditions. Clinicians frequently discuss chronic conditions that don't make it into the note due to time pressure. Each missed HCC-eligible condition represents RAF value that compounds.",
      implication: (value: number) => `HCC capture at ${formatCurrency(value)} depends heavily on your current capture maturity and payer mix. Organizations early in their journey often exceed these projections.`,
    },
    denials: {
      theory: "About half of claim denials stem from documentation gaps—missing clinical information, insufficient medical decision-making, incomplete narratives. Preventing denials upfront is more efficient than winning appeals.",
      implication: (value: number) => `Denial prevention at ${formatCurrency(value)} is one of the most measurable value drivers—you can track denials before and after with clear attribution to documentation improvement.`,
    },
  },
  
  scaling: {
    intro: "Value doesn't scale linearly. As utilization improves and workflows adapt, each provider may generate more value at maturity than at pilot. These projections assume adoption patterns we've observed—your experience could differ.",
  },
  
  methodology: {
    approach: "This model prioritizes transparency over precision. We use conservative assumptions, show our work step-by-step, and make every input editable. The goal isn't to prove a number—it's to give you a framework for thinking about value that you can stress-test and adapt.",
  },
};

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
          question: "How much time converts to patient access?",
          inputs: [
            { value: formatNumber(data.hoursReturned), label: "hours" },
            { value: `${inputs.timeToAccessPct || 25}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.accessHours as number || 0)} hours`,
          note: "Not all time converts—some goes to wellbeing, teaching, research.",
        },
        {
          label: "Step 3",
          question: "How many hours become visits?",
          inputs: [
            { value: formatNumber(inputs.accessHours as number || 0), label: "hours" },
            { value: `${inputs.conversionRate || 50}%`, label: "realization" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.additionalVisits as number || 0)} visits`,
          note: "Realization rate accounts for scheduling, room availability, demand.",
        },
        {
          label: "Step 4",
          question: "What's the revenue impact?",
          inputs: [
            { value: formatNumber(inputs.additionalVisits as number || 0), label: "visits" },
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
            { value: `${inputs.wrvuImprovementRate || 5}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.wrvuGain as number || 0)} wRVU gain`,
          note: "Lift comes from capturing complexity that supports accurate coding.",
        },
        {
          label: "Step 3",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.wrvuGain as number || 0), label: "wRVUs" },
            { value: `$${inputs.conversionFactor || 33}`, label: "CF" },
            { value: `${inputs.realizationRate || 75}%` },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "Medicare CF shown. Commercial rates ($45-65) yield higher results.",
        },
      ];

    case "workforce":
      return [
        {
          label: "Step 1",
          question: "How many departures occur annually?",
          inputs: [
            { value: formatNumber(data.providers), label: data.unitNamePlural },
            { value: `${inputs.turnoverRate || 7}%` },
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
            { value: `${inputs.abridgeImpact || 30}%` },
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
            { value: formatCurrency(inputs.replacementCost as number || 400000) },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "overtime":
      return [
        {
          label: "Step 1",
          question: "How many overtime hours occur annually?",
          inputs: [
            { value: formatNumber(inputs.providersWithOT as number || 0), label: "providers" },
            { value: `${inputs.otHoursPerWeek || 5} hrs/wk` },
            { value: `${inputs.otWeeksPerYear || 48} wks` },
          ],
          operators: ["×", "×"],
          result: `${formatNumber(inputs.totalOTHours as number || 0)} hours`,
        },
        {
          label: "Step 2",
          question: "How much overtime can Abridge eliminate?",
          inputs: [
            { value: formatNumber(inputs.totalOTHours as number || 0) },
            { value: `${inputs.otReductionRate || 70}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.hoursReclaimed as number || 0)} reclaimed`,
        },
        {
          label: "Step 3",
          question: "How much converts to cost savings?",
          inputs: [
            { value: formatNumber(inputs.hoursReclaimed as number || 0) },
            { value: `${inputs.otConversionRate || 33}%` },
            { value: `$${inputs.physicianHourlyRate || 150}/hr` },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "Only a portion converts to savings—the rest improves quality of life.",
        },
      ];

    case "hcc":
      return [
        {
          label: "Step 1",
          question: "How many encounters involve MA patients?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.riskContractPercent || 20}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.riskEncounters as number || 0)} MA encounters`,
        },
        {
          label: "Step 2",
          question: "How many HCCs are being missed?",
          inputs: [
            { value: formatNumber(inputs.riskEncounters as number || 0) },
            { value: `${(inputs.missedHccsPerEncounter as number || 0.14).toFixed(2)}` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.missedHccOpportunities as number || 0)} opportunities`,
        },
        {
          label: "Step 3",
          question: "How many can Abridge recover?",
          inputs: [
            { value: formatNumber(inputs.missedHccOpportunities as number || 0) },
            { value: `${inputs.abridgeCaptureRate || 40}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.hccsCaptured as number || 0)} HCCs`,
        },
        {
          label: "Step 4",
          question: "What's the financial impact after audit adjustments?",
          inputs: [
            { value: formatNumber(inputs.hccsCaptured as number || 0) },
            { value: `$${inputs.avgHccValue || 800}` },
            { value: `${100 - (inputs.auditFactor as number || 25)}%` },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "Audit factor accounts for RADV risk and payer review.",
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
          note: "About half of denials stem from documentation issues.",
        },
        {
          label: "Step 3",
          question: "How many are lost without appeal?",
          inputs: [
            { value: formatNumber(inputs.docRelatedDenials as number || 0) },
            { value: `${inputs.writtenOffPercent || 60}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.writtenOffDenials as number || 0)} written off`,
        },
        {
          label: "Step 4",
          question: "What can Abridge save?",
          inputs: [
            { value: formatNumber(inputs.writtenOffDenials as number || 0) },
            { value: `${inputs.abridgeCaptureRate || 75}%` },
            { value: `$${inputs.avgClaimValue || 250}` },
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
      return `${formatNumber((inputs.additionalVisits as number) || 0)} visits × $${inputs.revenuePerVisit || 200}`;
    case "wrvu":
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVU × $${inputs.conversionFactor || 33} × ${inputs.realizationRate || 75}%`;
    case "workforce":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} prevented × ${formatCurrency((inputs.replacementCost as number) || 400000)}`;
    case "overtime":
      return `${formatNumber((inputs.hoursReclaimed as number) || 0)} hrs × ${inputs.otConversionRate || 33}% × $${inputs.physicianHourlyRate || 150}`;
    case "hcc":
      return `${formatNumber((inputs.hccsCaptured as number) || 0)} HCCs × $${inputs.avgHccValue || 800}`;
    case "denials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims × $${inputs.avgClaimValue || 250}`;
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
        if (driverId === "workforce") {
          return (content.implication as (v: number, p: number) => string)(value, data.providers);
        }
        return (content.implication as (v: number) => string)(value);
      }
      return `At ${formatCurrency(value)}, this contributes meaningfully to your projected ROI.`;
    },
  };
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
        <Text style={styles.coverLabel}>Value Assessment</Text>
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
          {data.careSetting} • {data.providers} {data.unitNamePlural} • {formatNumber(data.encounters)} encounters
        </Text>
      </View>
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");

  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>{data.careSetting} Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Executive Summary</Text>
        <Text style={styles.sectionTitle}>The Value Story</Text>
        <Text style={styles.sectionSubtitle}>
          {data.providers} {data.unitNamePlural} • {formatNumber(data.encounters)} annual encounters • {data.drivers.length} value drivers
        </Text>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeLabel}>How to use this</Text>
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
              <Text style={styles.valueLabel}>{driver.name}</Text>
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
              <Text style={styles.valueLabel}>{driver.name}</Text>
              <Text style={styles.valueAmount}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {revenueDrivers.length === 0 && (
            <Text style={{ fontSize: 10, color: brand.textSecondary, fontStyle: "italic", paddingVertical: 12 }}>No documentation drivers selected</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
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
        <Text style={styles.headerTitle}>{data.careSetting} Value Assessment</Text>
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
            <Text style={styles.metricLabel}>Per {data.unitName} Annual</Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>Scaling note</Text>
          <Text style={styles.insightText}>
            Projection assumes 10% annual value growth with increased adoption and workflow maturity. 
            Your per-{data.unitName} economics ({formatCurrency(Math.round(data.netGain / data.providers))}/year) 
            tend to remain consistent at scale, while operational learning often improves utilization.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
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

  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.driverHero}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.headerLogo} />
        </View>
        <View style={styles.driverHeroContent}>
          <View style={{ flex: 1, paddingRight: 40 }}>
            <Text style={styles.driverTitle}>{driver.name}</Text>
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
            <Text style={styles.finalLabel}>Annual {driver.name} Value</Text>
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
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
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
        <Text style={styles.headerTitle}>{data.careSetting} Value Assessment</Text>
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
            <Text style={styles.valueLabel}>{data.unitNamePlural}</Text>
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
            <Text style={styles.valueLabel}>Investment per {data.unitName}</Text>
            <Text style={styles.valueAmount}>{formatCurrency(data.costPerProvider)}/mo</Text>
          </View>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueSectionTitle}>Conservative Assumptions</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Patient access realization</Text>
            <Text style={styles.valueAmount}>20%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Locum reduction realization</Text>
            <Text style={styles.valueAmount}>60%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Retention improvement realization</Text>
            <Text style={styles.valueAmount}>20%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>wRVU realization (payer mix)</Text>
            <Text style={styles.valueAmount}>75%</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>HCC realization (audit risk)</Text>
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
            We intentionally use conservative realization rates throughout. This means our projections 
            likely understate actual value for organizations that execute well. We believe it's better 
            to under-promise and over-deliver than to create expectations that don't materialize.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DOCUMENT COMPONENT
// ============================================================================

const OutpatientPDFDocument = ({ data }: { data: OutpatientPDFData }) => {
  const totalPages = 3 + data.drivers.length + 1;
  let pageNum = 1;

  return (
    <Document>
      <CoverPage data={data} />
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
      <MethodologyPage data={data} pageNum={++pageNum} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateOutpatientROIPDF(data: OutpatientPDFData): Promise<void> {
  const blob = await pdf(<OutpatientPDFDocument data={data} />).toBlob();
  const fileName = data.clientName 
    ? `Abridge_Value_Assessment_${data.clientName.replace(/\s+/g, "_")}.pdf`
    : "Abridge_Value_Assessment.pdf";
  saveAs(blob, fileName);
}

export async function generateOutpatientROIPDFBlob(data: OutpatientPDFData): Promise<Blob> {
  return await pdf(<OutpatientPDFDocument data={data} />).toBlob();
}

export { OutpatientPDFDocument };
