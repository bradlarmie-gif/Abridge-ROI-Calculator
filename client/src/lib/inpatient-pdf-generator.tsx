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

export interface DriverCalculation {
  id: string;
  name: string;
  value: number;
  category: "labor" | "revenue";
  inputs: Record<string, unknown>;
}

export interface JourneyData {
  pilotProviders: number;
  pilotEncounters: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleProviders: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: string;
  scalingMonths: number;
  networkEffect: number;
}

export interface InpatientPDFData {
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
  success: "#059669",
  successLight: "#d1fae5",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.darkGray,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paleGray,
    paddingBottom: 12,
  },
  logo: {
    width: 80,
    height: 24,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  headerSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  heroSection: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 11,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  kpiGrid: {
    flexDirection: "row",
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.paleGray,
    marginRight: 8,
    borderRadius: 4,
  },
  kpiCardLast: {
    marginRight: 0,
  },
  kpiCardHighlight: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  kpiLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  kpiValueHighlight: {
    color: colors.success,
  },

  valueBreakdownSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.paleGray,
  },
  valueRowLabel: {
    fontSize: 9,
    color: colors.darkGray,
    flex: 1,
  },
  valueRowAmount: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "right",
    minWidth: 70,
  },
  valueRowTotal: {
    backgroundColor: colors.paleGray,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 3,
    marginTop: 4,
  },
  categoryLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },

  investmentSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.paleGray,
    borderRadius: 4,
  },
  investmentGrid: {
    flexDirection: "row",
  },
  investmentItem: {
    flex: 1,
  },
  investmentLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  investmentValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },

  narrativeSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  narrativeTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  narrativeText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.6,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.black,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.paleGray,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },

  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.paleGray,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  driverValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.success,
  },

  theoryBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  theoryLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  theoryText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  calcSection: {
    marginBottom: 12,
  },
  calcSectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepBox: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: colors.paleGray,
    borderRadius: 3,
  },
  stepBoxLast: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
  stepLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepQuestion: {
    fontSize: 8,
    color: colors.black,
    marginBottom: 4,
  },
  stepMath: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  stepInput: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginRight: 4,
  },
  stepInputText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  stepOperator: {
    fontSize: 9,
    color: colors.mediumGray,
    marginHorizontal: 4,
  },
  stepResult: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    marginLeft: 4,
  },
  stepResultText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.white,
  },
  stepNote: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 4,
  },
  stepNoteHighlight: {
    fontSize: 7,
    color: colors.success,
    marginTop: 4,
    fontWeight: "bold",
  },

  benchmarkBox: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: colors.paleGray,
    borderRadius: 3,
  },
  benchmarkTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  benchmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  benchmarkLabel: {
    fontSize: 7,
    color: colors.darkGray,
  },
  benchmarkValue: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
  },
  benchmarkNote: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 4,
  },

  calloutBox: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: colors.warningLight,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  calloutTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  calloutText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },

  finalValueBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: colors.successLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: 10,
  },
  finalValueLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.success,
  },
  finalValueFormula: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 2,
  },
  finalValueAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.success,
  },

  implicationBox: {
    padding: 10,
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  implicationTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  implicationText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },


  methodologyGrid: {
    flexDirection: "row",
    marginBottom: 12,
  },
  methodologyColumn: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    marginRight: 8,
  },
  methodologyColumnLast: {
    marginRight: 0,
  },
  methodologyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  methodologyNote: {
    fontSize: 7,
    color: colors.mediumGray,
    lineHeight: 1.5,
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
  },

  bold: {
    fontWeight: "bold",
  },

  connectedSection: {
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.lightGray,
    paddingLeft: 12,
  },
  connectedTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 1,
    marginBottom: 2,
  },
  connectedSubtitle: {
    fontSize: 9,
    color: colors.darkGray,
    marginBottom: 10,
  },
  connectedIntro: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  connectedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  connectedItem: {
    width: "31%",
    backgroundColor: colors.paleGray,
    padding: 8,
    borderRadius: 3,
    marginRight: 8,
    marginBottom: 8,
  },
  connectedItemTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  connectedItemText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },
  connectedCallout: {
    backgroundColor: colors.warningLight,
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  connectedCalloutText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  narrativeBox: {
    backgroundColor: colors.paleGray,
    padding: 14,
    borderRadius: 4,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  narrativeHighlight: {
    fontWeight: "bold",
    color: colors.green,
  },

  metricsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  metricBoxHighlight: {
    flex: 1,
    backgroundColor: colors.greenLight,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  metricBoxLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: 4,
  },
  metricValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "center",
    marginBottom: 2,
  },
  metricSublabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textAlign: "center",
  },

  sectionTitlePrimary: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
  },

  twoColumn: {
    flexDirection: "row",
    marginBottom: 12,
  },
  column: {
    flex: 1,
    marginRight: 10,
  },
  columnLast: {
    flex: 1,
    marginRight: 0,
  },

  valueBreakdownCard: {
    flex: 1,
    borderRadius: 4,
    padding: 12,
    marginRight: 10,
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
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  valueBreakdownPct: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 6,
  },
  valueBreakdownAmount: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  valueBreakdownDriver: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  valueBreakdownDriverLast: {
    marginBottom: 0,
  },
  valueBreakdownDriverName: {
    fontSize: 7,
    color: colors.darkGray,
  },
  valueBreakdownDriverValue: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
  },

  progressBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressSegment: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 5,
    fontWeight: "bold",
    color: colors.white,
  },

  card: {
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 12,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  cardValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  cardTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTotalLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  cardTotalValue: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },

  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.paleGray,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    fontSize: 7,
    color: colors.darkGray,
    textAlign: "center",
  },
  tableCellBold: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "center",
  },
  tableCellGreen: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "center",
  },

  journeyChart: {
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
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
});

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

const driverTheories: Record<string, string> = {
  inpatientRetention: `Hospitalists spend 2+ hours per day on documentation—much of it after rounds or at home. This drives burnout and turnover. Replacing a hospitalist costs $400-600K when you factor in recruiting, lost revenue, and onboarding.

The documentation burden is consistently cited as the top complaint among hospitalists considering a change. When that burden lifts, satisfaction improves and turnover drops.`,

  inpatientCCMCC: `DRG reimbursement depends on documented comorbidities. Conditions discussed at bedside but not captured in notes mean missed CC/MCC assignments and lower DRG weights.

Abridge ensures what's discussed gets documented. When the clinical picture is complete, coders can assign appropriate complexity—and the DRG reflects the true acuity of care.`,

  inpatientCDI: `Many CDI queries are simply asking physicians to document what they already discussed with the patient. When Abridge captures these conversations automatically, the query becomes unnecessary.

This frees CDI to focus on complex cases rather than chasing routine documentation gaps. The result: faster DRG finalization and less physician interruption.`,

  inpatientDenials: `Most inpatient denials are appealed due to high stakes—but some are lost forever when documentation can't support the claim. Medical necessity wasn't captured. Status criteria weren't documented.

Abridge captures the clinical reasoning that makes the difference. When the thinking is documented, appeals have substance.`,
};

const driverImplications: Record<string, (value: number, data: InpatientPDFData) => string> = {
  inpatientRetention: (value, data) => {
    const departuresAvoided = (data.drivers.find(d => d.id === "inpatientRetention")?.inputs?.departuresAvoided as number) || 0;
    const years = departuresAvoided > 0 ? (1 / departuresAvoided).toFixed(1) : "~1";
    return `Over ~${years} years, expect to retain 1 additional hospitalist you would have otherwise lost to burnout. That's ${formatCurrency(value)} in avoided replacement costs—not counting the continuity, culture, and quality impacts of physician turnover.`;
  },
  inpatientCCMCC: (value, data) => {
    return `This represents ${formatCurrency(value)} in additional revenue through more accurate DRG assignment. Work with your CDI team to validate these capture rates for your specific case mix—the actual opportunity may be higher or lower depending on your current documentation quality.`;
  },
  inpatientCDI: (value, data) => {
    const queriesAvoided = (data.drivers.find(d => d.id === "inpatientCDI")?.inputs?.queriesAvoided as number) || 0;
    return `${formatNumber(queriesAvoided)} fewer queries means ${formatCurrency(value)} in operational savings. More importantly, it means less physician interruption and faster billing cycles. CDI can focus on complex cases instead of chasing routine documentation gaps.`;
  },
  inpatientDenials: (value, data) => {
    const claimsRecovered = (data.drivers.find(d => d.id === "inpatientDenials")?.inputs?.claimsRecovered as number) || 0;
    return `${formatNumber(claimsRecovered)} claims that would have been written off are now recoverable—${formatCurrency(value)} in revenue that stays with your organization. Better initial documentation means fewer denials and stronger appeals.`;
  },
};

interface StepData {
  label: string;
  question: string;
  inputs: Array<{ value: string; label?: string }>;
  operators?: string[];
  result: string;
  note?: string;
  noteHighlight?: boolean;
}

function getDriverSteps(driver: DriverCalculation, data: InpatientPDFData): StepData[] {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "inpatientRetention":
      return [
        {
          label: "Step 1: Baseline Turnover",
          question: "How many hospitalists leave annually?",
          inputs: [
            { value: formatNumber(inputs.providers as number || data.providers), label: "hospitalists" },
            { value: `${inputs.turnoverRate || 15}%` },
          ],
          operators: ["x"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
          note: "Hospitalist turnover averages 15-20%. Higher than most specialties due to workload and schedule demands.",
        },
        {
          label: "Step 2: Burnout-Related",
          question: "How many are tied to burnout?",
          inputs: [
            { value: (inputs.annualDepartures as number || 0).toFixed(1), label: "departures" },
            { value: `${inputs.burnoutPct || 50}%` },
          ],
          operators: ["x"],
          result: `${(inputs.burnoutDepartures as number || 0).toFixed(2)} burnout-related`,
          note: "~50% of hospitalist departures cite burnout as a primary factor. Documentation burden is consistently the top complaint.",
        },
        {
          label: "Step 3: Abridge Attribution",
          question: "How many can Abridge help prevent?",
          inputs: [
            { value: (inputs.burnoutDepartures as number || 0).toFixed(2), label: "at-risk" },
            { value: `${inputs.abridgeImpact || 30}%` },
          ],
          operators: ["x"],
          result: `${(inputs.departuresAvoided as number || 0).toFixed(2)} prevented`,
          note: "Documentation is a major burnout driver, but not the only one. We conservatively estimate Abridge impacts 30% of burnout-related turnover.",
        },
        {
          label: "Step 4: Cost Savings",
          question: "What's the value?",
          inputs: [
            { value: (inputs.departuresAvoided as number || 0).toFixed(2), label: "prevented" },
            { value: formatCurrency(inputs.replacementCost as number || 500000) },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Hospitalist replacement cost: $400K-$600K including recruiting, lost revenue, and onboarding.",
        },
      ];

    case "inpatientCCMCC":
      return [
        {
          label: "Step 1: Admissions with Opportunity",
          question: "How many admissions have documentation gaps?",
          inputs: [
            { value: formatNumber(inputs.eligibleAdmissions as number || data.eligibleEncounters), label: "admissions" },
            { value: `${inputs.gapRate || 40}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.admissionsWithGaps as number || 0)} opportunities`,
          note: "Studies show 30-50% of admissions have undocumented CC/MCC opportunities. We use 40% as a moderate estimate.",
        },
        {
          label: "Step 2: Capture Improvement",
          question: "How many gaps can Abridge help close?",
          inputs: [
            { value: formatNumber(inputs.admissionsWithGaps as number || 0), label: "gaps" },
            { value: `${inputs.captureRate || 15}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.admissionsImproved as number || 0)} improved`,
          note: "Not every gap is capturable. 15% accounts for cases where Abridge documentation directly enables CC/MCC capture.",
        },
        {
          label: "Step 3: DRG Weight Impact",
          question: "What's the gross revenue impact?",
          inputs: [
            { value: formatNumber(inputs.admissionsImproved as number || 0), label: "improved" },
            { value: `${inputs.drgWeightIncrease || 0.4}`, label: "DRG lift" },
            { value: `$${inputs.baseDrgPayment || 6000}` },
          ],
          operators: ["x", "x"],
          result: formatCurrency(inputs.grossImpact as number || 0),
          note: "0.4 DRG weight is a blended average for MCC captures (respiratory failure, sepsis, malnutrition, etc.).",
        },
        {
          label: "Step 4: Reality Check",
          question: "What's the final value after haircuts?",
          inputs: [
            { value: formatCurrency(inputs.grossImpact as number || 0) },
            { value: `${inputs.realizationRate || 50}%` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "50% haircut accounts for RAC/PEPPER audits, coder discretion, and cases where documentation doesn't change final code.",
        },
      ];

    case "inpatientCDI":
      return [
        {
          label: "Step 1: Current Query Volume",
          question: "How many CDI queries occur annually?",
          inputs: [
            { value: formatNumber(inputs.eligibleAdmissions as number || data.eligibleEncounters), label: "admissions" },
            { value: `${inputs.queryRate || 30}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.annualQueries as number || 0)} queries`,
          note: "CDI query rates typically range 20-40% of admissions. 30% is average for most health systems.",
        },
        {
          label: "Step 2: Queries Avoided",
          question: "How many queries become unnecessary?",
          inputs: [
            { value: formatNumber(inputs.annualQueries as number || 0), label: "queries" },
            { value: `${inputs.reductionRate || 25}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.queriesAvoided as number || 0)} avoided`,
          note: "When initial documentation is complete, CDI doesn't need to query. 25% is conservative—many queries ask for info that was discussed but not documented.",
        },
        {
          label: "Step 3: Operational Savings",
          question: "What's the value?",
          inputs: [
            { value: formatNumber(inputs.queriesAvoided as number || 0), label: "avoided" },
            { value: `$${inputs.costPerQuery || 50}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Fully loaded cost per query: $50-$100 including CDI and physician time. We use $50 conservatively.",
        },
      ];

    case "inpatientDenials":
      return [
        {
          label: "Step 1: Total Denials",
          question: "How many claims are denied annually?",
          inputs: [
            { value: formatNumber(inputs.eligibleAdmissions as number || data.eligibleEncounters), label: "admissions" },
            { value: `${inputs.denialRate || 5}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.totalDenials as number || 0)} denials`,
          note: "Inpatient denial rates typically range 5-10%. Varies by payer mix and case complexity.",
        },
        {
          label: "Step 2: Documentation-Related",
          question: "How many are caused by documentation gaps?",
          inputs: [
            { value: formatNumber(inputs.totalDenials as number || 0), label: "denials" },
            { value: `${inputs.docRelatedPct || 35}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.docRelatedDenials as number || 0)} doc-related`,
          note: "35-40% of inpatient denials stem from documentation gaps: medical necessity, level of care, status (IP vs Obs).",
        },
        {
          label: "Step 3: Written Off",
          question: "How many are lost without appeal?",
          inputs: [
            { value: formatNumber(inputs.docRelatedDenials as number || 0), label: "doc denials" },
            { value: `${inputs.writeOffPct || 25}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.writtenOff as number || 0)} written off`,
          note: "Due to high claim values, most are appealed. But ~25% are ultimately written off—documentation can't support the appeal.",
        },
        {
          label: "Step 4: Abridge Recovery",
          question: "How many can Abridge save?",
          inputs: [
            { value: formatNumber(inputs.writtenOff as number || 0), label: "written off" },
            { value: `${inputs.captureRate || 75}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.claimsRecovered as number || 0)} recovered`,
          note: "Abridge captures the clinical reasoning and medical necessity that physicians discuss but don't document.",
        },
        {
          label: "Step 5: Value Recovered",
          question: "What's the dollar impact?",
          inputs: [
            { value: formatNumber(inputs.claimsRecovered as number || 0), label: "claims" },
            { value: `$${formatNumber(inputs.avgClaimValue as number || 12000)}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Inpatient claims average $12,000. Range: $6K-$50K+ depending on complexity.",
        },
      ];

    default:
      return [];
  }
}

interface BenchmarkData {
  title: string;
  rows: Array<{ label: string; value: string }>;
  note?: string;
}

function getDriverBenchmarks(driverId: string): BenchmarkData | null {
  switch (driverId) {
    case "inpatientRetention":
      return {
        title: "Hospitalist Replacement Cost",
        rows: [
          { label: "Recruiting + signing bonus", value: "$75K - $150K" },
          { label: "Lost revenue during vacancy", value: "$250K - $400K" },
          { label: "Onboarding & ramp-up", value: "$50K - $75K" },
          { label: "Total", value: "$400K - $600K" },
        ],
      };
    case "inpatientCCMCC":
      return {
        title: "What Drives 0.4 DRG Weight?",
        rows: [
          { label: "Acute respiratory failure", value: "+0.3 to +0.5" },
          { label: "Sepsis / Severe sepsis", value: "+0.4 to +0.6" },
          { label: "Malnutrition", value: "+0.2 to +0.4" },
          { label: "Acute encephalopathy", value: "+0.3 to +0.5" },
          { label: "Acute kidney injury", value: "+0.1 to +0.3" },
        ],
        note: "0.4 is a blended average for MCC captures.",
      };
    case "inpatientCDI":
      return {
        title: "Cost per CDI Query",
        rows: [
          { label: "CDI time (research, write, follow-up)", value: "20-30 min" },
          { label: "Physician time (read, respond)", value: "5-10 min" },
          { label: "Fully loaded cost", value: "$50 - $100" },
        ],
        note: "Additional benefit: Faster DRG finalization → faster billing cycles.",
      };
    case "inpatientDenials":
      return {
        title: "Inpatient Claim Value by Complexity",
        rows: [
          { label: "Low complexity admission", value: "$6,000 - $10,000" },
          { label: "Medium complexity", value: "$10,000 - $18,000" },
          { label: "High complexity / ICU", value: "$20,000 - $50,000+" },
          { label: "Blended average", value: "~$12,000" },
        ],
      };
    default:
      return null;
  }
}

interface WarningData {
  title: string;
  text: string;
}

function getDriverWarnings(driver: DriverCalculation, data: InpatientPDFData): WarningData | null {
  if (driver.id === "inpatientRetention") {
    return {
      title: "Timeline Note",
      text: "Retention impact typically measurable after 12-18 months. Early indicators include satisfaction scores and intent-to-stay surveys.",
    };
  }

  if (driver.id === "inpatientCCMCC") {
    return {
      title: "Validation Required",
      text: "Work with your CDI team to validate capture rates for your specific case mix. Actual opportunity depends on current documentation quality.",
    };
  }

  if (driver.id === "inpatientDenials") {
    return {
      title: "Payer Variation",
      text: "Denial patterns vary by payer. Work with your revenue cycle team to validate rates for your specific payer mix.",
    };
  }

  return null;
}

function getFinalFormula(driver: DriverCalculation): string {
  const inputs = driver.inputs;
  switch (driver.id) {
    case "inpatientRetention":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} avoided x ${formatCurrency((inputs.replacementCost as number) || 500000)}`;
    case "inpatientCCMCC":
      return `${formatNumber((inputs.admissionsImproved as number) || 0)} improved x 0.4 weight x $${inputs.baseDrgPayment || 6000} x 50%`;
    case "inpatientCDI":
      return `${formatNumber((inputs.queriesAvoided as number) || 0)} queries x $${inputs.costPerQuery || 50}`;
    case "inpatientDenials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims x $${formatNumber(inputs.avgClaimValue as number || 12000)}`;
    default:
      return "";
  }
}

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  const valuePerProvider = Math.round(data.netGain / data.providers);

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
            {data.providers} {data.unitNamePlural} | {formatNumber(data.encounters)} admissions | {data.utilization}% utilization
          </Text>
        </View>
      )}

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>Inpatient documentation carries the highest financial stakes in healthcare.</Text> Every note impacts DRG assignment, CDI workflows, denial defense, and physician retention. This assessment models where value actually comes from—and what's recoverable with better documentation.
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
            <Text style={{ fontSize: 7, color: colors.mediumGray }}>No labor drivers selected</Text>
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
            <Text style={{ fontSize: 7, color: colors.mediumGray }}>No revenue drivers selected</Text>
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
          <Text style={{ fontSize: 6, color: colors.lightGray, marginTop: 4 }}>
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
  data: InpatientPDFData; 
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
    <Page size="A4" style={styles.page} wrap={false}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View wrap={false}>
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
            <View key={index} style={[styles.stepBox, index === steps.length - 1 ? styles.stepBoxLast : {}]} wrap={false}>
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
          <View style={styles.benchmarkBox} wrap={false}>
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

        <View style={styles.finalValueBox} wrap={false}>
          <View>
            <Text style={styles.finalValueLabel}>Annual {driver.name} Value</Text>
            <Text style={styles.finalValueFormula}>{getFinalFormula(driver)}</Text>
          </View>
          <Text style={styles.finalValueAmount}>{formatCurrency(driver.value)}</Text>
        </View>

        <View style={styles.implicationBox} wrap={false}>
          <Text style={styles.implicationTitle}>What This Means</Text>
          <Text style={styles.implicationText}>{implication}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const JourneyPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const { journey } = data;
  const valueMultiple = journey.pilotValue > 0 ? (journey.fullScaleValue / journey.pilotValue).toFixed(1) : "N/A";
  const paceLabels: Record<string, string> = {
    measured: "36 months",
    steady: "24 months",
    aggressive: "18 months",
  };
  const timeline = paceLabels[journey.scalingPace] || "24 months";
  const midScaleValue = (journey.pilotValue + journey.fullScaleValue) / 2;
  const maxBarHeight = 70;
  const pilotBarHeight = 30;
  const midBarHeight = 50;
  const fullBarHeight = maxBarHeight;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.black, letterSpacing: 0.5, marginBottom: 4 }}>
          YOUR SCALING JOURNEY
        </Text>
        <Text style={{ fontSize: 9, color: colors.darkGray }}>
          From pilot to full deployment: {valueMultiple}x value growth over {timeline}
        </Text>
      </View>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>Implementation follows a proven path.</Text> Starting with a pilot group of {journey.pilotProviders} {data.unitNamePlural.toLowerCase()}, you'll prove value quickly before expanding. This isn't just about adding more {data.unitNamePlural.toLowerCase()}—it's about building compounding returns as adoption increases.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          At full scale with {journey.fullScaleProviders} {data.unitNamePlural.toLowerCase()} and {journey.fullScaleUtilization}% utilization, annual value reaches {formatCurrency(journey.fullScaleValue)}—a {valueMultiple}x increase from pilot. The journey matters as much as the destination.
        </Text>
      </View>

      <View style={styles.journeyChart}>
        <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.black, marginBottom: 10 }}>Value Growth Trajectory</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 90, paddingHorizontal: 20 }}>
          <View style={{ width: "25%", alignItems: "center" }}>
            <View style={{ height: pilotBarHeight, width: 45, backgroundColor: colors.primary, borderRadius: 3 }} />
            <Text style={{ fontSize: 7, marginTop: 6, color: colors.darkGray }}>Pilot</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.black }}>{formatCurrency(journey.pilotValue)}</Text>
            <Text style={{ fontSize: 6, color: colors.lightGray }}>{journey.pilotProviders} {data.unitNamePlural}</Text>
          </View>
          <View style={{ width: "25%", alignItems: "center" }}>
            <View style={{ height: midBarHeight, width: 45, backgroundColor: colors.green, opacity: 0.6, borderRadius: 3 }} />
            <Text style={{ fontSize: 7, marginTop: 6, color: colors.darkGray }}>Scaling</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.black }}>{formatCurrency(midScaleValue)}</Text>
            <Text style={{ fontSize: 6, color: colors.lightGray }}>Growing adoption</Text>
          </View>
          <View style={{ width: "25%", alignItems: "center" }}>
            <View style={{ height: fullBarHeight, width: 45, backgroundColor: colors.green, borderRadius: 3 }} />
            <Text style={{ fontSize: 7, marginTop: 6, color: colors.darkGray }}>Full Scale</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.green }}>{formatCurrency(journey.fullScaleValue)}</Text>
            <Text style={{ fontSize: 6, color: colors.lightGray }}>{journey.fullScaleProviders} {data.unitNamePlural}</Text>
          </View>
          <View style={{ width: "25%", alignItems: "center" }}>
            <View style={{ height: fullBarHeight + 8, width: 45, backgroundColor: colors.greenDark, borderRadius: 3, borderWidth: 1, borderColor: colors.green }} />
            <Text style={{ fontSize: 7, marginTop: 6, color: colors.darkGray }}>+ Network</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.greenDark }}>{formatCurrency(journey.fullScaleValue + journey.networkEffect)}</Text>
            <Text style={{ fontSize: 6, color: colors.lightGray }}>Compounded</Text>
          </View>
        </View>
      </View>

      <View style={styles.journeyScenario}>
        <View style={styles.journeyScenarioCard}>
          <Text style={styles.journeyScenarioTitle}>Pilot Phase</Text>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.pilotProviders}</Text> {data.unitNamePlural.toLowerCase()}</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{formatNumber(journey.pilotEncounters)}</Text> admissions</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.pilotUtilization}%</Text> utilization target</Text>
          </View>
          <View style={[styles.journeyScenarioRow, { marginTop: 6 }]}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>Annual value: <Text style={styles.journeyScenarioValue}>{formatCurrency(journey.pilotValue)}</Text></Text>
          </View>
        </View>

        <View style={styles.journeyScenarioCardHighlight}>
          <Text style={styles.journeyScenarioTitleHighlight}>Full Scale</Text>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValueGreen}>{journey.fullScaleProviders}</Text> {data.unitNamePlural.toLowerCase()}</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValueGreen}>{journey.fullScaleUtilization}%</Text> utilization target</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>{timeline} timeline</Text>
          </View>
          <View style={[styles.journeyScenarioRow, { marginTop: 6 }]}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>Annual value: <Text style={styles.journeyScenarioValueGreen}>{formatCurrency(journey.fullScaleValue)}</Text></Text>
          </View>
        </View>
      </View>

      <View style={styles.compoundingBox}>
        <Text style={styles.compoundingTitle}>The Compounding Effect</Text>
        <Text style={styles.compoundingValue}>+{formatCurrency(journey.networkEffect)}</Text>
        <Text style={styles.compoundingSubtext}>Additional annual value from network effects at full scale</Text>
      </View>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>Value doesn't grow linearly—it compounds.</Text> As more hospitalists adopt Abridge, documentation quality improves across the board. CDI teams query less frequently. Denial patterns shift. The value per {data.unitName.toLowerCase()} increases even as you add {data.unitNamePlural.toLowerCase()}.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          This is why pilot success often understates full-scale potential. At {journey.fullScaleUtilization}% utilization with {journey.fullScaleProviders} {data.unitNamePlural.toLowerCase()}, network effects add {formatCurrency(journey.networkEffect)} to your annual value—bringing total potential to {formatCurrency(journey.fullScaleValue + journey.networkEffect)}.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={styles.connectedSection}>
        <Text style={styles.connectedTitle}>CONNECTED VALUE</Text>
        <Text style={styles.connectedSubtitle}>ED + Inpatient compounds your results</Text>
        
        <Text style={styles.connectedIntro}>
          When both ED and Inpatient use Abridge, the value compounds. The admission documentation that starts in ED flows directly into inpatient coding, CDI workflows, and denial defense.
        </Text>
        
        <View style={styles.connectedGrid}>
          <View style={styles.connectedItem}>
            <Text style={styles.connectedItemTitle}>DRG Capture</Text>
            <Text style={styles.connectedItemText}>
              CCs/MCCs documented in ED carry forward—your case mix starts stronger from admission.
            </Text>
          </View>
          
          <View style={styles.connectedItem}>
            <Text style={styles.connectedItemTitle}>CDI Efficiency</Text>
            <Text style={styles.connectedItemText}>
              When the ED note is complete, CDI teams query less and focus on complex cases.
            </Text>
          </View>
          
          <View style={styles.connectedItem}>
            <Text style={styles.connectedItemTitle}>Denial Prevention</Text>
            <Text style={styles.connectedItemText}>
              Medical necessity documented at admission is your first line of defense against payer audits.
            </Text>
          </View>
        </View>
        
        <View style={styles.connectedCallout}>
          <Text style={styles.connectedCalloutText}>
            If you're also using Abridge in ED, the documentation quality benefits below are amplified—you're building on a stronger foundation.
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black, marginBottom: 14 }}>Methodology & Assumptions</Text>

      <View style={styles.methodologyGrid}>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Your Inputs</Text>
          <Text style={styles.methodologyItem}>{data.providers} {data.unitNamePlural}</Text>
          <Text style={styles.methodologyItem}>{formatNumber(data.encounters)} annual admissions</Text>
          <Text style={styles.methodologyItem}>{data.utilization}% utilization rate</Text>
          <Text style={styles.methodologyItem}>{data.timeSavedPerEncounter} min saved per encounter</Text>
          <Text style={styles.methodologyItem}>${data.costPerProvider}/{data.unitName}/month</Text>
        </View>
        
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Inpatient Benchmarks</Text>
          <Text style={styles.methodologyItem}>Hospitalist replacement: $400K-$600K</Text>
          <Text style={styles.methodologyItem}>Base DRG payment: $6,000</Text>
          <Text style={styles.methodologyItem}>Avg DRG weight lift: 0.4</Text>
          <Text style={styles.methodologyItem}>CDI query rate: 20-40%</Text>
          <Text style={styles.methodologyItem}>Cost per query: $50-$100</Text>
          <Text style={styles.methodologyItem}>Denial rate: 5-10%</Text>
          <Text style={styles.methodologyItem}>Avg claim value: $12,000</Text>
        </View>
        
        <View style={[styles.methodologyColumn, styles.methodologyColumnLast]}>
          <Text style={styles.methodologyTitle}>Calculation Principles</Text>
          <Text style={styles.methodologyItem}>Conservative estimates throughout</Text>
          <Text style={styles.methodologyItem}>Medicare rates (not commercial)</Text>
          <Text style={styles.methodologyItem}>Transparent, auditable logic</Text>
          <Text style={styles.methodologyItem}>50% reality check on DRG capture</Text>
          <Text style={styles.methodologyItem}>10% annual growth for Y2-Y3</Text>
        </View>
      </View>

      <Text style={styles.methodologyNote}>
        All benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on patient acuity mix, 
        payer mix, operational factors, and implementation quality. We use conservative assumptions throughout—actual value may be higher.
      </Text>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          "Inpatient documentation has the highest stakes—DRGs, CDI, denials, retention all trace back to the note. The difference between a 3x ROI and a 7x ROI usually isn't the technology. It's utilization, workflow integration, and knowing which drivers matter most for your hospitalist program."
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const InpatientROIDocument = ({ data }: { data: InpatientPDFData }) => {
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

export async function generateInpatientROIPDF(data: InpatientPDFData): Promise<void> {
  const blob = await pdf(<InpatientROIDocument data={data} />).toBlob();

  const today = new Date().toISOString().split("T")[0];
  const orgSlug = data.organizationName
    ? data.organizationName.replace(/\s+/g, "-").toLowerCase().substring(0, 20)
    : "";
  const filename = orgSlug
    ? `abridge-inpatient-roi-${orgSlug}-${today}.pdf`
    : `abridge-inpatient-roi-${today}.pdf`;

  saveAs(blob, filename);
}

export default InpatientROIDocument;
