import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Svg,
  Path,
  Line,
  Circle,
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
// COLORS
// ============================================================================

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  green: "#059669",
  greenLight: "#ECFDF5",
  greenDark: "#047857",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  paleGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
};

// ============================================================================
// STYLES - Dense, professional, McKinsey-inspired
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 50,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logo: {
    width: 85,
    height: 17,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  sectionTitlePrimary: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },

  narrativeBox: {
    backgroundColor: colors.paleGray,
    padding: 14,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  narrativeText: {
    fontSize: 8.5,
    color: colors.darkGray,
    lineHeight: 1.55,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  narrativeHighlight: {
    fontWeight: "bold",
    color: colors.green,
  },

  metricsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  metricBoxLast: {
    marginRight: 0,
  },
  metricBoxHighlight: {
    flex: 1,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    fontFamily: "Helvetica-Bold",
  },
  metricValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3,
    textAlign: "center",
  },
  metricSublabel: {
    fontSize: 6,
    color: colors.lightGray,
    marginTop: 2,
    textAlign: "center",
  },

  twoColumn: {
    flexDirection: "row",
    marginBottom: 12,
  },
  column: {
    flex: 1,
    marginRight: 8,
  },
  columnLast: {
    flex: 1,
    marginRight: 0,
  },

  card: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 8,
    color: colors.darkGray,
  },
  cardValue: {
    fontSize: 8,
    color: colors.black,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  cardTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    marginTop: 4,
  },
  cardTotalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  cardTotalValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    fontFamily: "Helvetica-Bold",
  },

  valueBreakdownCard: {
    flex: 1,
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
  },
  valueBreakdownCardLast: {
    marginRight: 0,
  },
  laborCard: {
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: colors.blue,
  },
  revenueCard: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
  },
  valueBreakdownTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  valueBreakdownPct: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 6,
  },
  valueBreakdownAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  valueBreakdownDriver: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  valueBreakdownDriverLast: {
    borderBottomWidth: 0,
  },
  valueBreakdownDriverName: {
    fontSize: 7.5,
    color: colors.darkGray,
  },
  valueBreakdownDriverValue: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: colors.green,
  },

  progressBar: {
    height: 10,
    flexDirection: "row",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 6,
  },
  progressSegment: {
    height: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 6,
    color: colors.white,
    fontWeight: "bold",
  },

  table: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.paleGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    color: colors.darkGray,
    textAlign: "center",
  },
  tableCellBold: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "center",
  },
  tableCellGreen: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "center",
  },

  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  driverValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
  },

  theoryBox: {
    backgroundColor: colors.paleGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  theoryLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.amber,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  theoryText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  calcSection: {
    marginBottom: 14,
  },
  calcSectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stepBox: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  stepBoxLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  stepLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  stepQuestion: {
    fontSize: 8,
    color: colors.darkGray,
    fontStyle: "italic",
    marginBottom: 6,
  },
  stepMath: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  stepInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
  },
  stepInputText: {
    fontSize: 8,
    fontFamily: "Courier",
    color: colors.black,
  },
  stepOperator: {
    fontSize: 8,
    color: colors.mediumGray,
    marginHorizontal: 4,
  },
  stepResult: {
    backgroundColor: colors.paleGray,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  stepResultText: {
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: "Courier-Bold",
    color: colors.black,
  },
  stepNote: {
    fontSize: 7,
    color: colors.lightGray,
    fontStyle: "italic",
    marginTop: 4,
  },
  stepNoteHighlight: {
    fontSize: 7,
    color: colors.primary,
    marginTop: 4,
  },

  calloutBox: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  calloutTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.amberDark,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 7,
    color: colors.amberDark,
    lineHeight: 1.4,
  },

  benchmarkBox: {
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  benchmarkTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  benchmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  benchmarkLabel: {
    fontSize: 7,
    color: colors.darkGray,
  },
  benchmarkValue: {
    fontSize: 7,
    color: colors.black,
    fontWeight: "bold",
  },
  benchmarkNote: {
    fontSize: 6,
    color: colors.lightGray,
    fontStyle: "italic",
    marginTop: 4,
  },

  finalValueBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  finalValueLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  finalValueAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
  },
  finalValueFormula: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },

  implicationBox: {
    backgroundColor: colors.paleGray,
    padding: 10,
    borderRadius: 4,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  implicationTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.green,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  implicationText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  journeyIntro: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 14,
  },
  journeyChart: {
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 16,
    marginBottom: 14,
    minHeight: 120,
  },
  journeyScenario: {
    flexDirection: "row",
    marginBottom: 14,
  },
  journeyScenarioCard: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
  },
  journeyScenarioCardHighlight: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 12,
  },
  journeyScenarioTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  journeyScenarioTitleHighlight: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  journeyScenarioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  journeyScenarioCheck: {
    fontSize: 8,
    color: colors.mediumGray,
    marginRight: 6,
  },
  journeyScenarioText: {
    fontSize: 8,
    color: colors.darkGray,
  },
  journeyScenarioValue: {
    fontWeight: "bold",
    color: colors.black,
  },
  journeyScenarioValueGreen: {
    fontWeight: "bold",
    color: colors.green,
  },

  compoundingBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
  },
  compoundingTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  compoundingValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  compoundingSubtext: {
    fontSize: 8,
    color: colors.greenDark,
  },

  methodologyGrid: {
    flexDirection: "row",
    marginBottom: 12,
  },
  methodologyColumn: {
    flex: 1,
    marginRight: 12,
  },
  methodologyColumnLast: {
    marginRight: 0,
  },
  methodologyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.5,
    fontStyle: "italic",
    marginTop: 8,
  },

  closingBox: {
    backgroundColor: colors.paleGray,
    padding: 14,
    borderRadius: 4,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  closingText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  closingHighlight: {
    fontWeight: "bold",
    color: colors.black,
    fontStyle: "normal",
  },

  bold: {
    fontWeight: "bold",
  },
  mono: {
    fontFamily: "Courier",
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

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

// ============================================================================
// DRIVER EDUCATIONAL CONTENT
// ============================================================================

const driverTheories: Record<string, string> = {
  patientAccess: `When clinicians spend less time on documentation, they have capacity to see additional patients. Not all saved time converts to visits—scheduling, room availability, and demand limit realization—but even a modest portion creates meaningful revenue. The math is conservative: we assume only a portion of saved time goes to access, and only 50% of that actually converts to visits.`,
  
  wrvu: `Physicians under time pressure document less than the full clinical picture. AI-assisted documentation captures the complexity that supports accurate coding—not upcoding, just getting credit for work already done. A 5% wRVU lift across thousands of encounters compounds into significant revenue without changing clinical behavior.`,
  
  workforce: `Documentation burden is the #1 driver of physician burnout. Reducing this burden improves satisfaction and retention. Replacing a physician costs $400K-$800K+ when you factor in recruiting, lost revenue during vacancy, and onboarding. Even preventing a fraction of turnover creates substantial value.`,
  
  overtime: `Documentation that spills into after-hours ("pajama time") has real costs: overtime premiums, locum coverage, and burnout. Abridge helps clinicians finish notes during the workday, reducing the portion that converts to measurable savings.`,
  
  hcc: `Physicians discuss chronic conditions that don't make it into notes under time pressure. Each missed HCC-eligible condition represents risk adjustment value. Abridge captures what's discussed, recovering conditions that would otherwise be lost to documentation gaps.`,
  
  denials: `When documentation doesn't support the billed service, claims get denied. Not all are recoverable—some are abandoned because the documentation can't be fixed retroactively. Abridge captures the MDM and clinical reasoning in real-time, preventing denials at the source.`,
};

const driverImplications: Record<string, (value: number, data: OutpatientPDFData) => string> = {
  patientAccess: (value, data) => {
    const visits = Math.round(value / 200);
    return `At ${formatCurrency(value)} annually, this represents approximately ${visits} additional patient visits. Organizations with strong scheduling operations often see higher conversion rates as capacity improves.`;
  },
  
  wrvu: (value, data) => {
    return `The ${formatCurrency(value)} in wRVU improvement reflects documentation that accurately captures visit complexity. This isn't about billing more—it's about billing correctly for work already performed.`;
  },
  
  workforce: (value, data) => {
    const departures = value / 400000;
    return `This ${formatCurrency(value)} represents ${departures.toFixed(1)} avoided departures annually. Note: this is a long-term metric—benefits materialize over 12+ months as burnout reduction translates to retention.`;
  },
  
  overtime: (value, data) => {
    return `The ${formatCurrency(value)} in overtime reduction comes from documentation that stays within working hours. As providers become proficient with Abridge, this value typically increases.`;
  },
  
  hcc: (value, data) => {
    return `At ${formatCurrency(value)} in risk adjustment value, this represents HCCs that were discussed in visits but not making it into notes. Results vary significantly based on your current capture maturity.`;
  },
  
  denials: (value, data) => {
    return `The ${formatCurrency(value)} recovered represents claims that would otherwise be written off due to insufficient documentation. Abridge captures the clinical reasoning that either prevents denials or makes them winnable on appeal.`;
  },
};

// ============================================================================
// CALCULATION STEP GENERATORS
// ============================================================================

interface CalculationStep {
  label: string;
  question: string;
  inputs: { value: string; label?: string }[];
  operators?: string[];
  result: string;
  note?: string;
  noteHighlight?: boolean;
  subCalculation?: {
    title: string;
    rows: { label: string; value: string }[];
    note?: string;
  };
}

function getDriverSteps(driver: DriverCalculation, data: OutpatientPDFData): CalculationStep[] {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "patientAccess":
      return [
        {
          label: "Step 1: Time Saved",
          question: "How much documentation time does Abridge return?",
          inputs: [
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "enc" },
            { value: `${inputs.timeSavedPerEncounter || data.timeSavedPerEncounter} min` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.hoursReturned as number || data.hoursReturned)} hours`,
          note: "Time saved per encounter based on documented Abridge performance.",
        },
        {
          label: "Step 2: Time Allocated",
          question: "How much time can convert to patient access?",
          inputs: [
            { value: formatNumber(inputs.hoursReturned as number || data.hoursReturned), label: "hours" },
            { value: `${inputs.timeToAccessPct || 25}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.accessHours as number || 0)} hours`,
          note: "Not all saved time converts—some goes to work-life balance, teaching, research.",
        },
        {
          label: "Step 3: Visit Conversion",
          question: "How many additional visits does this enable?",
          inputs: [
            { value: formatNumber(inputs.accessHours as number || 0), label: "hours" },
            { value: `${inputs.conversionRate || 50}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.additionalVisits as number || 0)} visits`,
          note: "Conversion limited by scheduling, room availability, and patient demand.",
        },
        {
          label: "Step 4: Revenue",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.additionalVisits as number || 0), label: "visits" },
            { value: `$${inputs.revenuePerVisit || 200}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
        },
      ];

    case "wrvu":
      return [
        {
          label: "Step 1: Baseline wRVUs",
          question: "What's your current wRVU generation?",
          inputs: [
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "enc" },
            { value: `${inputs.avgWrvuPerEncounter || 1.5}` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.baselineWrvus as number || 0)} wRVUs`,
        },
        {
          label: "Step 2: wRVU Improvement",
          question: "How much lift does better documentation create?",
          inputs: [
            { value: formatNumber(inputs.baselineWrvus as number || 0), label: "wRVUs" },
            { value: `${inputs.wrvuImprovementRate || 5}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.wrvuGain as number || 0)} wRVU gain`,
          note: "Lift comes from capturing complexity that supports accurate E/M coding.",
        },
        {
          label: "Step 3: Revenue",
          question: "What's the dollar value?",
          inputs: [
            { value: formatNumber(inputs.wrvuGain as number || 0), label: "wRVUs" },
            { value: `$${inputs.conversionFactor || 33}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Using Medicare conversion factor. Commercial rates ($45-65) would yield higher results.",
        },
      ];

    case "workforce":
      return [
        {
          label: "Step 1: Expected Turnover",
          question: "How many departures occur annually?",
          inputs: [
            { value: formatNumber(inputs.providers as number || data.providers), label: data.unitNamePlural },
            { value: `${inputs.turnoverRate || 7}%` },
          ],
          operators: ["x"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
        },
        {
          label: "Step 2: Burnout-Related",
          question: "How many are tied to burnout?",
          inputs: [
            { value: (inputs.annualDepartures as number || 0).toFixed(1), label: "departures" },
            { value: `${inputs.burnoutAttribution || 50}%` },
          ],
          operators: ["x"],
          result: `${(inputs.burnoutDepartures as number || 0).toFixed(2)} burnout-related`,
        },
        {
          label: "Step 3: Abridge Impact",
          question: "How many can Abridge help prevent?",
          inputs: [
            { value: (inputs.burnoutDepartures as number || 0).toFixed(2), label: "at-risk" },
            { value: `${inputs.abridgeImpact || 30}%` },
          ],
          operators: ["x"],
          result: `${(inputs.departuresAvoided as number || 0).toFixed(2)} prevented`,
          note: "Conservative estimate—documentation is a major burnout driver but not the only one.",
        },
        {
          label: "Step 4: Value",
          question: "What's the savings?",
          inputs: [
            { value: (inputs.departuresAvoided as number || 0).toFixed(2), label: "prevented" },
            { value: formatCurrency(inputs.replacementCost as number || 400000) },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
        },
      ];

    case "overtime":
      return [
        {
          label: "Step 1: Overtime Hours",
          question: "How many overtime hours occur annually?",
          inputs: [
            { value: formatNumber(inputs.providersWithOT as number || 0), label: "providers w/ OT" },
            { value: `${inputs.otHoursPerWeek || 5} hrs/wk` },
            { value: `${inputs.otWeeksPerYear || 48} wks` },
          ],
          operators: ["x", "x"],
          result: `${formatNumber(inputs.totalOTHours as number || 0)} hours`,
          note: "Annual overtime from documentation that spills past clinic hours.",
        },
        {
          label: "Step 2: Hours Reclaimed",
          question: "How much overtime can Abridge eliminate?",
          inputs: [
            { value: formatNumber(inputs.totalOTHours as number || 0), label: "OT hours" },
            { value: `${inputs.otReductionRate || 70}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.hoursReclaimed as number || 0)} hours reclaimed`,
        },
        {
          label: "Step 3: Cost Savings",
          question: "How much converts to dollar savings?",
          inputs: [
            { value: formatNumber(inputs.hoursReclaimed as number || 0), label: "hours" },
            { value: `${inputs.otConversionRate || 33}%` },
            { value: `$${inputs.physicianHourlyRate || 150}` },
          ],
          operators: ["x", "x"],
          result: formatCurrency(driver.value),
          note: "Only a portion of reclaimed time converts to cost savings—the rest improves quality of life.",
        },
      ];

    case "hcc":
      return [
        {
          label: "Step 1: Risk Encounters",
          question: "How many encounters involve Medicare Advantage patients?",
          inputs: [
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "enc" },
            { value: `${inputs.riskContractPercent || 20}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.riskEncounters as number || 0)} MA encounters`,
        },
        {
          label: "Step 2: HCC Opportunities",
          question: "How many HCCs are being missed?",
          inputs: [
            { value: formatNumber(inputs.riskEncounters as number || 0), label: "enc" },
            { value: `${(inputs.missedHccsPerEncounter as number || 0.14).toFixed(2)}` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.missedHccOpportunities as number || 0)} opportunities`,
          note: "Based on conditions per visit × documentation gap × HCC-eligible percentage.",
        },
        {
          label: "Step 3: Abridge Capture",
          question: "How many can Abridge recover?",
          inputs: [
            { value: formatNumber(inputs.missedHccOpportunities as number || 0), label: "opportunities" },
            { value: `${inputs.abridgeCaptureRate || 40}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.hccsCaptured as number || 0)} HCCs captured`,
          note: "Abridge captures conditions mentioned in conversation that would otherwise be lost.",
        },
        {
          label: "Step 4: Revenue Impact",
          question: "What's the risk-adjusted value?",
          inputs: [
            { value: formatNumber(inputs.hccsCaptured as number || 0), label: "HCCs" },
            { value: `$${inputs.avgHccValue || 800}` },
            { value: `${inputs.auditFactor || 25}%` },
          ],
          operators: ["x", "x"],
          result: formatCurrency(driver.value),
          note: "Audit factor accounts for RADV audits and conditions that don't survive payer review.",
        },
      ];

    case "denials":
      return [
        {
          label: "Step 1: Total Denials",
          question: "How many claims are denied today?",
          inputs: [
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "enc" },
            { value: `${inputs.denialRate || 8}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.totalDenials as number || 0)} denials`,
        },
        {
          label: "Step 2: Documentation-Related",
          question: "How many are caused by documentation gaps?",
          inputs: [
            { value: formatNumber(inputs.totalDenials as number || 0), label: "denials" },
            { value: `${inputs.docRelatedPercent || 35}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.docRelatedDenials as number || 0)} doc denials`,
          note: "30-40% of denials stem from documentation gaps: missing clinical info, insufficient MDM.",
        },
        {
          label: "Step 3: Written Off",
          question: "How many are lost without appeal?",
          inputs: [
            { value: formatNumber(inputs.docRelatedDenials as number || 0), label: "doc denials" },
            { value: `${inputs.writtenOffPercent || 60}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.writtenOffDenials as number || 0)} written off`,
          note: "These claims are abandoned—documentation can't support an appeal.",
        },
        {
          label: "Step 4: Abridge Recovery",
          question: "How many can Abridge save?",
          inputs: [
            { value: formatNumber(inputs.writtenOffDenials as number || 0), label: "written off" },
            { value: `${inputs.abridgeCaptureRate || 75}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.claimsRecovered as number || 0)} recovered`,
        },
        {
          label: "Step 5: Value",
          question: "What's the dollar impact?",
          inputs: [
            { value: formatNumber(inputs.claimsRecovered as number || 0), label: "claims" },
            { value: `$${inputs.avgClaimValue || 250}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
        },
      ];

    default:
      return [];
  }
}

// ============================================================================
// BENCHMARKS & WARNINGS
// ============================================================================

interface Benchmark {
  title: string;
  rows: { label: string; value: string }[];
  note?: string;
}

function getDriverBenchmarks(driverId: string): Benchmark | null {
  switch (driverId) {
    case "patientAccess":
      return {
        title: "Revenue Per Visit",
        rows: [
          { label: "Primary Care", value: "$100 - $150" },
          { label: "Specialty", value: "$175 - $300" },
          { label: "Procedural", value: "$300 - $600+" },
        ],
        note: "Your input reflects a blended average across your specialty mix.",
      };

    case "wrvu":
      return {
        title: "Conversion Factor",
        rows: [
          { label: "Medicare (2024)", value: "$33" },
          { label: "Commercial (typical)", value: "$45 - $65" },
        ],
        note: "We anchor to Medicare for conservatism. Commercial-heavy payer mix yields higher results.",
      };

    case "hcc":
      return {
        title: "Average HCC Value",
        rows: [
          { label: "Low-complexity HCC", value: "$400 - $600" },
          { label: "Medium-complexity HCC", value: "$700 - $1,000" },
          { label: "High-complexity HCC", value: "$1,200 - $2,500+" },
          { label: "Blended Average", value: "~$800" },
        ],
        note: "Varies significantly based on payer mix and current capture rates.",
      };

    case "denials":
      return {
        title: "Average Claim Value",
        rows: [
          { label: "Primary Care E/M", value: "$125 - $175" },
          { label: "Specialty E/M", value: "$200 - $350" },
          { label: "Blended Outpatient", value: "~$250" },
        ],
      };

    default:
      return null;
  }
}

interface Warning {
  title: string;
  text: string;
}

function getDriverWarnings(driver: DriverCalculation, data: OutpatientPDFData): Warning | null {
  if (driver.id === "workforce" && data.providers < 50) {
    return {
      title: "Small Provider Count",
      text: "With fewer than 50 providers, retention savings are probabilistic over multi-year periods. Consider this a long-term investment metric.",
    };
  }

  if (driver.id === "hcc") {
    return {
      title: "Results Vary by Organization",
      text: "HCC value varies significantly based on payer mix and current capture rates. Organizations with mature risk programs may see lower opportunity.",
    };
  }

  return null;
}

function getFinalFormula(driver: DriverCalculation): string {
  const inputs = driver.inputs;
  switch (driver.id) {
    case "patientAccess":
      return `${formatNumber((inputs.additionalVisits as number) || 0)} visits x $${inputs.revenuePerVisit || 200}/visit`;
    case "wrvu":
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVU gain x $${inputs.conversionFactor || 33}`;
    case "workforce":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} avoided x ${formatCurrency((inputs.replacementCost as number) || 400000)}`;
    case "overtime":
      return `${formatNumber((inputs.hoursReclaimed as number) || 0)} hrs x ${inputs.otConversionRate || 33}% x $${inputs.physicianHourlyRate || 150}/hr`;
    case "hcc":
      return `${formatNumber((inputs.hccsCaptured as number) || 0)} HCCs x $${inputs.avgHccValue || 800} x ${inputs.auditFactor || 25}%`;
    case "denials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims x $${inputs.avgClaimValue || 250}`;
    default:
      return "";
  }
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  const valuePerProvider = Math.round(data.netGain / data.providers);
  const monthlyValue = Math.round(data.netGain / 12);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
          <Text style={styles.headerSubtitle}>{today}</Text>
        </View>
      </View>

      {data.organizationName && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.black }}>{data.organizationName}</Text>
          <Text style={{ fontSize: 8, color: colors.mediumGray, marginTop: 2 }}>
            {data.providers} {data.unitNamePlural} | {formatNumber(data.encounters)} encounters | {data.utilization}% utilization
          </Text>
        </View>
      )}

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>ROI models can feel like black boxes</Text>—numbers that sound good but don't explain themselves. This assessment is different.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          Every value traces back to your inputs, industry benchmarks, and assumptions you can inspect. We're not selling you on a number. We're giving you a model you can stress-test, adjust, and defend internally.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          You selected <Text style={styles.narrativeBold}>{data.drivers.length} value drivers</Text>: {data.drivers.map(d => d.name).join(", ")}. Each section walks through the logic step by step—what we're measuring, why it matters, and exactly how we calculated it.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBoxHighlight}>
          <Text style={styles.metricValueGreen}>+{formatCurrency(data.netGain)}</Text>
          <Text style={styles.metricLabel}>Net Annual Gain</Text>
          <Text style={styles.metricSublabel}>{formatCurrency(data.totalValue)} value - {formatCurrency(data.investment)} cost</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{data.roi.toFixed(1)}x</Text>
          <Text style={styles.metricLabel}>Return on Investment</Text>
          <Text style={styles.metricSublabel}>Every $1 returns ${data.roi.toFixed(2)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{formatCurrency(valuePerProvider)}</Text>
          <Text style={styles.metricLabel}>Per {data.unitName}</Text>
          <Text style={styles.metricSublabel}>Net annual benefit each</Text>
        </View>
        <View style={[styles.metricBox, styles.metricBoxLast]}>
          <Text style={styles.metricValue}>{formatNumber(data.hoursReturned)}</Text>
          <Text style={styles.metricLabel}>Hours Returned</Text>
          <Text style={styles.metricSublabel}>Documentation time saved</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Where the Value Comes From</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.valueBreakdownCard, styles.laborCard]}>
          <Text style={styles.valueBreakdownTitle}>Labor & Efficiency</Text>
          <Text style={styles.valueBreakdownPct}>{data.laborPct}% of total value</Text>
          <Text style={styles.valueBreakdownAmount}>{formatCurrency(data.laborTotal)}</Text>
          {laborDrivers.map((driver, i) => (
            <View key={driver.id} style={[styles.valueBreakdownDriver, i === laborDrivers.length - 1 ? styles.valueBreakdownDriverLast : {}]}>
              <Text style={styles.valueBreakdownDriverName}>{driver.name}</Text>
              <Text style={styles.valueBreakdownDriverValue}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {laborDrivers.length === 0 && (
            <Text style={{ fontSize: 7, color: colors.mediumGray, fontStyle: "italic" }}>No labor drivers selected</Text>
          )}
        </View>

        <View style={[styles.valueBreakdownCard, styles.revenueCard, styles.valueBreakdownCardLast]}>
          <Text style={styles.valueBreakdownTitle}>Revenue & Quality</Text>
          <Text style={styles.valueBreakdownPct}>{data.revenuePct}% of total value</Text>
          <Text style={styles.valueBreakdownAmount}>{formatCurrency(data.revenueTotal)}</Text>
          {revenueDrivers.map((driver, i) => (
            <View key={driver.id} style={[styles.valueBreakdownDriver, i === revenueDrivers.length - 1 ? styles.valueBreakdownDriverLast : {}]}>
              <Text style={styles.valueBreakdownDriverName}>{driver.name}</Text>
              <Text style={styles.valueBreakdownDriverValue}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {revenueDrivers.length === 0 && (
            <Text style={{ fontSize: 7, color: colors.mediumGray, fontStyle: "italic" }}>No revenue drivers selected</Text>
          )}
        </View>
      </View>

      <View style={styles.progressBar}>
        {data.laborPct > 0 && (
          <View style={[styles.progressSegment, { flex: data.laborPct, backgroundColor: colors.blue }]}>
            {data.laborPct > 20 && <Text style={styles.progressLabel}>Labor {data.laborPct}%</Text>}
          </View>
        )}
        {data.revenuePct > 0 && (
          <View style={[styles.progressSegment, { flex: data.revenuePct, backgroundColor: colors.green }]}>
            {data.revenuePct > 20 && <Text style={styles.progressLabel}>Revenue {data.revenuePct}%</Text>}
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Investment Details</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>Your Configuration</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Setting</Text>
            <Text style={styles.cardValue}>{data.careSetting}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{data.unitNamePlural}</Text>
            <Text style={styles.cardValue}>{data.providers}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Price</Text>
            <Text style={styles.cardValue}>${data.costPerProvider}/{data.unitName}/month</Text>
          </View>
          <View style={styles.cardTotal}>
            <Text style={styles.cardTotalLabel}>Annual Investment</Text>
            <Text style={styles.cardTotalValue}>{formatCurrency(data.investment)}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.columnLast]}>
          <Text style={styles.cardTitle}>Multi-Year Projection</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}></Text>
              <Text style={styles.tableHeaderCell}>Year 1</Text>
              <Text style={styles.tableHeaderCell}>Year 2</Text>
              <Text style={styles.tableHeaderCell}>Year 3</Text>
              <Text style={[styles.tableHeaderCell, { fontWeight: "bold" }]}>3-Yr Total</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left" }]}>Value</Text>
              <Text style={styles.tableCell}>{formatCurrency(data.year1Value)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(data.year2Value)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(data.year3Value)}</Text>
              <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearValue)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left" }]}>Cost</Text>
              <Text style={styles.tableCell}>{formatCurrency(data.year1Cost)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(data.year2Cost)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(data.year3Cost)}</Text>
              <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearCost)}</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCellBold, { flex: 0.8, textAlign: "left" }]}>Net</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
              <Text style={styles.tableCellGreen}>{formatCurrency(data.threeYearNet)}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6, color: colors.lightGray, marginTop: 4, fontStyle: "italic" }}>
            Assumes 10% annual value growth with increased adoption
          </Text>
        </View>
      </View>

      <View style={[styles.narrativeBox, { marginTop: 8, borderLeftColor: colors.green }]}>
        <Text style={styles.narrativeText}>
          At <Text style={styles.narrativeBold}>{formatCurrency(valuePerProvider)} per {data.unitName}</Text> in net annual value, scaling from {data.providers} to {Math.round(data.providers * 3)} {data.unitNamePlural} would increase annual benefit from {formatCurrency(data.netGain)} to approximately {formatCurrency(data.netGain * 3)}. The methodology section explains how these projections work—and where your situation might differ.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
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
  const theory = driverTheories[driver.id] || "This driver creates measurable value through improved documentation workflows.";
  const implicationFn = driverImplications[driver.id];
  const implication = implicationFn ? implicationFn(driver.value, data) : `This driver contributes ${formatCurrency(driver.value)} annually to your ROI.`;

  const steps = getDriverSteps(driver, data);
  const benchmarks = getDriverBenchmarks(driver.id);
  const warnings = getDriverWarnings(driver, data);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={styles.driverHeader}>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={styles.driverValue}>{formatCurrency(driver.value)}</Text>
      </View>

      <View style={styles.theoryBox}>
        <Text style={styles.theoryLabel}>The Theory</Text>
        <Text style={styles.theoryText}>{theory}</Text>
      </View>

      {warnings && (
        <View style={styles.calloutBox}>
          <Text style={styles.calloutTitle}>{warnings.title}</Text>
          <Text style={styles.calloutText}>{warnings.text}</Text>
        </View>
      )}

      <View style={styles.calcSection}>
        <Text style={styles.calcSectionTitle}>Your Calculation</Text>
        
        {steps.map((step, index) => (
          <View key={index} style={[styles.stepBox, index === steps.length - 1 ? styles.stepBoxLast : {}]}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <Text style={styles.stepQuestion}>{step.question}</Text>
            
            <View style={styles.stepMath}>
              {step.inputs.map((input, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                  {i > 0 && <Text style={styles.stepOperator}>{step.operators?.[i - 1] || "x"}</Text>}
                  <View style={styles.stepInput}>
                    <Text style={styles.stepInputText}>{input.value}</Text>
                  </View>
                  {input.label && (
                    <Text style={{ fontSize: 7, color: colors.lightGray, marginLeft: 2 }}>{input.label}</Text>
                  )}
                </View>
              ))}
              <Text style={styles.stepOperator}>=</Text>
              <View style={styles.stepResult}>
                <Text style={styles.stepResultText}>{step.result}</Text>
              </View>
            </View>
            
            {step.note && (
              <Text style={step.noteHighlight ? styles.stepNoteHighlight : styles.stepNote}>{step.note}</Text>
            )}
          </View>
        ))}
      </View>

      {benchmarks && (
        <View style={styles.benchmarkBox}>
          <Text style={styles.benchmarkTitle}>Benchmark: {benchmarks.title}</Text>
          {benchmarks.rows.map((row, i) => (
            <View key={i} style={styles.benchmarkRow}>
              <Text style={styles.benchmarkLabel}>{row.label}</Text>
              <Text style={styles.benchmarkValue}>{row.value}</Text>
            </View>
          ))}
          {benchmarks.note && (
            <Text style={styles.benchmarkNote}>{benchmarks.note}</Text>
          )}
        </View>
      )}

      <View style={styles.finalValueBox}>
        <View>
          <Text style={styles.finalValueLabel}>Annual {driver.name} Value</Text>
          <Text style={styles.finalValueFormula}>{getFinalFormula(driver)}</Text>
        </View>
        <Text style={styles.finalValueAmount}>{formatCurrency(driver.value)}</Text>
      </View>

      <View style={styles.implicationBox}>
        <Text style={styles.implicationTitle}>What This Means</Text>
        <Text style={styles.implicationText}>{implication}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const JourneyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const { journey } = data;
  const valueMultiple = (journey.fullScaleValue / journey.pilotValue).toFixed(1);
  const paceLabels: Record<string, string> = {
    measured: "36 months",
    steady: "24 months",
    aggressive: "18 months",
  };

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black, marginBottom: 4 }}>Your Journey with Abridge</Text>
      <Text style={{ fontSize: 9, color: colors.mediumGray, marginBottom: 14 }}>Start with a pilot. Prove the value. Scale across your organization.</Text>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          The ROI you see today reflects a pilot deployment of {journey.pilotProviders} {data.unitNamePlural} at {journey.pilotUtilization}% utilization. 
          As you scale, value compounds—not just linearly with {data.unitName} count, but exponentially as utilization matures, 
          workflows optimize, and network effects emerge.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 6 }]}>
          At full scale ({journey.fullScaleProviders} {data.unitNamePlural}, {journey.fullScaleUtilization}% utilization), 
          annual value reaches <Text style={styles.narrativeHighlight}>{formatCurrency(journey.fullScaleValue)}</Text>—a{" "}
          <Text style={styles.narrativeBold}>{valueMultiple}x increase</Text> from pilot.
        </Text>
      </View>

      <View style={styles.journeyChart}>
        {/* Chart container with SVG */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {/* Y-axis labels */}
          <View style={{ width: 55, justifyContent: "space-between", paddingVertical: 4, height: 100 }}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(journey.fullScaleValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(Math.round((journey.fullScaleValue + journey.pilotValue) / 2))}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(journey.pilotValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>$0</Text>
          </View>
          
          {/* Chart area with SVG */}
          <View style={{ flex: 1, marginLeft: 8, height: 100, position: "relative" }}>
            {/* SVG for lines and dots */}
            <Svg width="400" height="100" viewBox="0 0 400 100">
              {/* Background grid lines */}
              <Line x1="0" y1="25" x2="400" y2="25" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="50" x2="400" y2="50" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="75" x2="400" y2="75" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="100" x2="400" y2="100" stroke={colors.borderGray} strokeWidth="1" />
              <Line x1="0" y1="0" x2="0" y2="100" stroke={colors.borderGray} strokeWidth="1" />
              
              {/* Dashed gray straight line (linear projection) */}
              <Line 
                x1="20" 
                y1="85" 
                x2="380" 
                y2="15" 
                stroke={colors.lightGray} 
                strokeWidth="2" 
                strokeDasharray="6,4" 
              />
              
              {/* Solid green curved line (with compounding) - curves ABOVE the straight line */}
              <Path 
                d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15" 
                stroke={colors.green} 
                strokeWidth="2.5" 
                fill="none" 
              />
              
              {/* Shaded area between lines - green curve above, straight line below */}
              <Path 
                d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15 L 380 15 L 20 85 Z" 
                fill={colors.greenLight} 
                opacity="0.5" 
              />
              
              {/* Red dot - Today/Pilot */}
              <Circle cx="20" cy="85" r="6" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
              
              {/* Green dot - Full Scale */}
              <Circle cx="380" cy="10" r="6" fill={colors.green} stroke={colors.white} strokeWidth="2" />
            </Svg>
            
            {/* Labels positioned over the chart */}
            <Text style={{ position: "absolute", bottom: 2, left: 4, fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Today</Text>
            <Text style={{ position: "absolute", top: -2, right: 4, fontSize: 7, color: colors.green, fontWeight: "bold" }}>Full Scale</Text>
            
            {/* Compounding bonus label */}
            <View style={{ position: "absolute", top: 35, left: 160, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.green }}>
              <Text style={{ fontSize: 8, color: colors.green, fontWeight: "bold", textAlign: "center" }}>+{formatCurrency(journey.networkEffect)}</Text>
              <Text style={{ fontSize: 6, color: colors.greenDark, textAlign: "center" }}>compounding bonus</Text>
            </View>
          </View>
        </View>
        
        {/* X-axis labels */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 63, paddingRight: 10, marginBottom: 4 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Today</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{journey.pilotProviders} {data.unitNamePlural}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>6 mo</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>12 mo</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>18 mo</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 7, color: colors.green, fontWeight: "bold" }}>{paceLabels[journey.scalingPace]}</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{journey.fullScaleProviders} {data.unitNamePlural}</Text>
          </View>
        </View>
        
        {/* Legend */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderGray }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 4 }} />
            <Text style={{ fontSize: 7, color: colors.black }}>Pilot: {formatCurrency(journey.pilotValue)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginRight: 4 }} />
            <Text style={{ fontSize: 7, color: colors.black }}>Full Scale: {formatCurrency(journey.fullScaleValue)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
            <View style={{ width: 14, height: 2, backgroundColor: colors.green, marginRight: 4 }} />
            <Text style={{ fontSize: 7, color: colors.black }}>With compounding</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 14, height: 0, borderTopWidth: 2, borderTopColor: colors.lightGray, borderStyle: "dashed", marginRight: 4 }} />
            <Text style={{ fontSize: 7, color: colors.black }}>Linear projection</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitlePrimary}>Model Your Scenario</Text>

      <View style={styles.journeyScenario}>
        <View style={styles.journeyScenarioCard}>
          <Text style={styles.journeyScenarioTitle}>Your Starting Point</Text>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.pilotProviders}</Text> {data.unitNamePlural}</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{formatNumber(journey.pilotEncounters)}</Text> encounters</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.pilotUtilization}%</Text> utilization</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValueGreen}>{formatCurrency(journey.pilotValue)}</Text> /year</Text>
          </View>
        </View>

        <View style={styles.journeyScenarioCardHighlight}>
          <Text style={styles.journeyScenarioTitleHighlight}>Your Full Scale Potential</Text>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.fullScaleProviders}</Text> {data.unitNamePlural}</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.fullScaleUtilization}%</Text> utilization</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>Scaling: <Text style={styles.journeyScenarioValue}>{paceLabels[journey.scalingPace]}</Text></Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValueGreen}>{formatCurrency(journey.fullScaleValue)}</Text> /year</Text>
          </View>
        </View>
      </View>

      <View style={styles.compoundingBox}>
        <Text style={styles.compoundingTitle}>Why Value Compounds</Text>
        <Text style={styles.compoundingValue}>{valueMultiple}x</Text>
        <Text style={styles.compoundingSubtext}>
          Value doesn't just scale linearly with {data.unitName} count. As utilization improves ({journey.pilotUtilization}% to {journey.fullScaleUtilization}%), 
          workflows optimize, and network effects emerge, each {data.unitName} generates more value at maturity than at pilot.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black, marginBottom: 14 }}>Methodology & Assumptions</Text>

      <View style={styles.methodologyGrid}>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Your Inputs</Text>
          <Text style={styles.methodologyItem}>{data.providers} {data.unitNamePlural}</Text>
          <Text style={styles.methodologyItem}>{formatNumber(data.encounters)} annual encounters</Text>
          <Text style={styles.methodologyItem}>{data.utilization}% utilization rate</Text>
          <Text style={styles.methodologyItem}>{data.timeSavedPerEncounter} min saved per encounter</Text>
          <Text style={styles.methodologyItem}>${data.costPerProvider}/{data.unitName}/month</Text>
        </View>
        
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Industry Benchmarks</Text>
          <Text style={styles.methodologyItem}>wRVU conversion: $33 (Medicare)</Text>
          <Text style={styles.methodologyItem}>Provider replacement: $400K-$800K</Text>
          <Text style={styles.methodologyItem}>Time value: $150/hr (fully-loaded)</Text>
          <Text style={styles.methodologyItem}>Visit conversion: 50% of capacity</Text>
          <Text style={styles.methodologyItem}>Burnout attribution: 30%</Text>
        </View>
        
        <View style={[styles.methodologyColumn, styles.methodologyColumnLast]}>
          <Text style={styles.methodologyTitle}>Calculation Principles</Text>
          <Text style={styles.methodologyItem}>Conservative estimates throughout</Text>
          <Text style={styles.methodologyItem}>Medicare rates (not commercial)</Text>
          <Text style={styles.methodologyItem}>Transparent, auditable logic</Text>
          <Text style={styles.methodologyItem}>No compounding in Year 1</Text>
          <Text style={styles.methodologyItem}>10% annual growth for Y2-Y3</Text>
        </View>
      </View>

      <Text style={styles.methodologyNote}>
        All benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on specialty mix, 
        payer mix, operational factors, and implementation quality. We use conservative assumptions throughout—actual value may be higher.
      </Text>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          "Most organizations don't fail to get value from ambient documentation—they fail to optimize for it. The difference between a 2x ROI and a 5x ROI usually isn't the technology. It's utilization, change management, and knowing which drivers matter most for your situation."
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// MAIN DOCUMENT COMPONENT
// ============================================================================

const OutpatientROIDocument = ({ data }: { data: OutpatientPDFData }) => {
  const totalPages = 2 + data.drivers.length + 1;
  let currentPage = 1;

  return (
    <Document>
      <ExecutiveSummaryPage data={data} pageNum={currentPage++} totalPages={totalPages} />

      {data.drivers.map((driver) => (
        <DriverDetailPage
          key={driver.id}
          driver={driver}
          data={data}
          pageNum={currentPage++}
          totalPages={totalPages}
        />
      ))}

      <JourneyPage data={data} pageNum={currentPage++} totalPages={totalPages} />

      <MethodologyPage data={data} pageNum={currentPage++} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

export async function generateOutpatientROIPDF(data: OutpatientPDFData): Promise<void> {
  const blob = await pdf(<OutpatientROIDocument data={data} />).toBlob();

  const today = new Date().toISOString().split("T")[0];
  const orgSlug = data.organizationName
    ? data.organizationName.replace(/\s+/g, "-").toLowerCase().substring(0, 20)
    : "";
  const filename = orgSlug
    ? `abridge-${data.careSetting.toLowerCase()}-roi-${orgSlug}-${today}.pdf`
    : `abridge-${data.careSetting.toLowerCase()}-roi-${today}.pdf`;

  saveAs(blob, filename);
}

export default OutpatientROIDocument;
