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
  // God tier dark hero colors
  heroSlate: "#1e293b",
  heroSlateLight: "#334155",
  heroEmerald: "#10b981",
  heroEmeraldLight: "#34d399",
};

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

  // These are overridden by god tier styles below
  oldHeroSection: {
    marginBottom: 20,
  },
  oldHeroTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  oldHeroSubtitle: {
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
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
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
    color: colors.heroEmerald,
  },

  // God tier dark hero styles
  heroSection: {
    backgroundColor: colors.heroSlate,
    marginHorizontal: -40,
    marginTop: -40,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 20,
    marginBottom: 16,
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroTagline: {
    fontSize: 9,
    color: colors.heroEmeraldLight,
    fontWeight: 500,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    lineHeight: 1.4,
  },
  heroDate: {
    fontSize: 8,
    color: colors.lightGray,
  },

  // Compact Hero for driver pages
  heroCompact: {
    backgroundColor: colors.heroSlate,
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroCompactTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 4,
  },
  heroCompactSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
  },
  heroCompactValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.success,
    marginTop: 8,
  },

  // Content section styles
  contentSection: {
    padding: 40,
    paddingTop: 24,
    paddingBottom: 20,
  },
  chapterLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 9,
    color: colors.mediumGray,
    marginBottom: 12,
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
    fontWeight: 500,
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
    fontWeight: 500,
    marginTop: 4,
  },
  stepNoteHighlight: {
    fontSize: 7,
    color: colors.primary,
    marginTop: 4,
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
    fontWeight: 500,
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
    fontWeight: 500,
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
    fontWeight: 500,
  },
  closingHighlight: {
    fontWeight: "bold",
    color: colors.black,
    fontStyle: "normal",
  },

  mono: {
    fontFamily: "Courier",
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
    fontWeight: 500,
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
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  // narrativeHighlight is defined in god tier styles section above

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
  metricBoxLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
  metricValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
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

  sectionTitlePrimary: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
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
  inpatientRetention: `The hypothesis: Hospitalists often spend 2+ hours per day on documentation—much of it after rounds or at home. This pattern could drive burnout and turnover. Replacing a hospitalist may cost $400-600K when factoring in recruiting, lost revenue, and onboarding.

If documentation burden is a significant factor in turnover decisions, reducing that burden could improve retention. The connection depends on your specific hospitalist population and their stated concerns.`,

  inpatientCCMCC: `The hypothesis: DRG reimbursement depends on documented comorbidities. Conditions discussed at bedside but not captured in notes could mean missed CC/MCC assignments and lower DRG weights.

If ambient documentation captures what's discussed, it may enable more complete coding. The actual impact depends on your current documentation quality, case mix, and CDI workflow.`,

  inpatientCDI: `The hypothesis: Many CDI queries simply ask physicians to document what they already discussed with the patient. If Abridge captures these conversations automatically, some queries could become unnecessary.

This could free CDI to focus on complex cases rather than routine documentation gaps. The actual reduction depends on your current query patterns and documentation practices.`,

  inpatientDenials: `The hypothesis: Some inpatient denials are lost when documentation can't support the claim—medical necessity wasn't captured, status criteria weren't documented.

If ambient documentation captures the clinical reasoning discussed with patients, it may strengthen initial documentation and support appeals. Results depend on your specific payer mix and denial patterns.`,
};

const driverImplications: Record<string, (value: number, data: InpatientPDFData) => string> = {
  inpatientRetention: (value, data) => {
    const departuresAvoided = (data.drivers.find(d => d.id === "inpatientRetention")?.inputs?.departuresAvoided as number) || 0;
    const years = departuresAvoided > 0 ? (1 / departuresAvoided).toFixed(1) : "~1";
    return `Based on these assumptions, over ~${years} years you might retain one additional hospitalist who would have otherwise left due to burnout. That suggests up to ${formatCurrency(value)} in potential avoided replacement costs—though the actual impact depends on your specific turnover patterns and contributing factors.`;
  },
  inpatientCCMCC: (value, data) => {
    return `This suggests up to ${formatCurrency(value)} in potential additional revenue through more accurate DRG assignment. Work with your CDI team to validate these capture rates for your specific case mix—the actual opportunity may vary significantly based on current documentation practices.`;
  },
  inpatientCDI: (value, data) => {
    const queriesAvoided = (data.drivers.find(d => d.id === "inpatientCDI")?.inputs?.queriesAvoided as number) || 0;
    return `If these assumptions hold, ${formatNumber(queriesAvoided)} fewer queries could mean up to ${formatCurrency(value)} in operational efficiency. This would also mean less physician interruption and potentially faster billing cycles—though results depend on your specific CDI workflow.`;
  },
  inpatientDenials: (value, data) => {
    const claimsRecovered = (data.drivers.find(d => d.id === "inpatientDenials")?.inputs?.claimsRecovered as number) || 0;
    return `Based on these assumptions, ${formatNumber(claimsRecovered)} claims that might otherwise be written off could become recoverable—suggesting up to ${formatCurrency(value)} in potential retained revenue. Actual results depend on your payer mix and denial patterns.`;
  },
};

// ============================================================================
// PREMIUM NARRATIVE CONTENT - Story Arc
// ============================================================================

const narrativeContent = {
  stakes: {
    headline: "Hospitalists carry the heaviest documentation burden in medicine—and it's breaking them.",
    stats: [
      { value: "63%", label: "Of hospitalists report burnout symptoms" },
      { value: "2+ hrs", label: "Daily documentation time after rounds" },
      { value: "$500K", label: "Average cost to replace one hospitalist" },
    ],
    body: "Inpatient medicine demands the most complex documentation in healthcare. Every admission requires histories, progress notes, discharge summaries—often written after shifts or at home. The result: hospitalist turnover rates 50% higher than other specialties, DRG accuracy suffering from time pressure, and CDI teams spending hours chasing documentation gaps that were discussed but never captured.",
    pullQuote: "The hospital that documents at the bedside captures value that others leave behind.",
  },

  recommendations: {
    headline: "Your Path Forward",
    phases: [
      {
        name: "Validate",
        duration: "30-60 days",
        actions: [
          "Deploy with 3-5 hospitalists on a single unit",
          "Establish baseline documentation time and CDI query rates",
          "Track DRG accuracy for pilot patients",
        ],
      },
      {
        name: "Prove",
        duration: "60-90 days",
        actions: [
          "Measure documentation completion time",
          "Compare CC/MCC capture rates vs. baseline",
          "Survey hospitalist satisfaction and burnout indicators",
        ],
      },
      {
        name: "Scale",
        duration: "Ongoing",
        actions: [
          "Expand to all hospitalists and units",
          "Integrate with CDI workflow optimization",
          "Connect ED documentation for seamless care continuum",
        ],
      },
    ],
    closing: "The hospitals that move first on ambient documentation aren't just improving efficiency—they're becoming destinations for top hospitalist talent.",
    costOfInaction: "Every month of delay represents hospitalists considering departure, DRG accuracy gaps compounding, and CDI teams spending time on preventable queries.",
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

// ============================================================================
// PAGE COMPONENTS - Premium Narrative Arc
// ============================================================================

// Cover Page
const CoverPage = ({ data }: { data: InpatientPDFData }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayName = data.clientName || data.organizationName || "Your Organization";

  return (
    <Page size="A4" style={{ backgroundColor: colors.heroSlate, padding: 0 }} wrap={false}>
      <View style={{ padding: 50, height: "100%", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Image src={abridgeLogoPath} style={{ width: 100, height: 20 }} />
          <Text style={{ fontSize: 10, color: colors.lightGray, letterSpacing: 1 }}>{today}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingVertical: 60 }}>
          <Text style={{ fontSize: 11, color: colors.heroEmerald, textTransform: "uppercase", letterSpacing: 4, marginBottom: 24 }}>Inpatient</Text>
          <Text style={{ fontSize: 48, fontWeight: "bold", color: colors.white, marginBottom: 20, lineHeight: 1.0 }}>{displayName}</Text>
          <Text style={{ fontSize: 14, color: colors.lightGray, lineHeight: 1.6, maxWidth: 380 }}>
            A transparent framework for understanding how ambient AI documentation creates value in hospitalist programs.
          </Text>

          <View style={{ flexDirection: "row", marginTop: 50, gap: 60 }}>
            <View style={{ marginRight: 60 }}>
              <Text style={{ fontSize: 44, fontWeight: "bold", color: colors.heroEmerald, marginBottom: 8 }}>{formatCurrency(data.netGain)}</Text>
              <Text style={{ fontSize: 10, color: colors.lightGray, textTransform: "uppercase", letterSpacing: 2 }}>Net Annual Value</Text>
            </View>
            <View>
              <Text style={{ fontSize: 44, fontWeight: "bold", color: colors.white, marginBottom: 8 }}>{data.roi.toFixed(1)}x</Text>
              <Text style={{ fontSize: 10, color: colors.lightGray, textTransform: "uppercase", letterSpacing: 2 }}>Return on Investment</Text>
            </View>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.heroSlateLight, paddingTop: 20 }}>
          <Text style={{ fontSize: 10, color: colors.lightGray }}>
            Inpatient • {data.providers} {data.unitNamePlural} • {formatNumber(data.encounters)} admissions
          </Text>
        </View>
      </View>
    </Page>
  );
};

// Stakes Page
const StakesPage = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={{ backgroundColor: colors.white, padding: 0 }} wrap={false}>
      <View style={{ backgroundColor: colors.heroSlate, padding: 50, paddingTop: 40, paddingBottom: 50 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <Image src={abridgeLogoPath} style={{ width: 80, height: 16 }} />
          <Text style={{ fontSize: 9, color: colors.lightGray, textTransform: "uppercase", letterSpacing: 1 }}>The Stakes</Text>
        </View>
        <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.white, lineHeight: 1.2, marginBottom: 32, maxWidth: 440 }}>
          {narrativeContent.stakes.headline}
        </Text>
        <View style={{ flexDirection: "row", gap: 40 }}>
          {narrativeContent.stakes.stats.map((stat, i) => (
            <View key={i} style={{ marginRight: 40 }}>
              <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.heroEmerald, marginBottom: 6 }}>{stat.value}</Text>
              <Text style={{ fontSize: 9, color: colors.lightGray, textTransform: "uppercase", letterSpacing: 1, maxWidth: 120 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 50 }}>
        <Text style={{ fontSize: 12, color: colors.black, lineHeight: 1.8, marginBottom: 40 }}>
          {narrativeContent.stakes.body}
        </Text>
        <View style={{ borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 24, marginTop: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: 500, color: colors.black, lineHeight: 1.6 }}>
            {narrativeContent.stakes.pullQuote}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Inpatient ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// Path Forward Page
const PathForwardPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page} wrap={false}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.logo} />
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>Inpatient ROI Assessment</Text>
        </View>
      </View>

      <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Recommendations</Text>
      <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.black, marginBottom: 8 }}>{narrativeContent.recommendations.headline}</Text>
      <Text style={{ fontSize: 10, color: colors.mediumGray, marginBottom: 24 }}>
        A phased approach to capturing {formatCurrency(data.netGain)} in annual value.
      </Text>

      {narrativeContent.recommendations.phases.map((phase, i) => (
        <View key={i} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", marginRight: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.white }}>{i + 1}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black }}>{phase.name}</Text>
            <Text style={{ fontSize: 9, color: colors.mediumGray, marginLeft: 10 }}>{phase.duration}</Text>
          </View>
          <View style={{ paddingLeft: 42 }}>
            {phase.actions.map((action, j) => (
              <Text key={j} style={{ fontSize: 9, color: colors.darkGray, marginBottom: 6, lineHeight: 1.5 }}>• {action}</Text>
            ))}
          </View>
        </View>
      ))}

      <View style={{ borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 20, marginTop: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: 500, color: colors.black, lineHeight: 1.6 }}>
          {narrativeContent.recommendations.closing}
        </Text>
      </View>

      <View style={{ backgroundColor: colors.heroSlate, padding: 20, borderRadius: 4 }}>
        <Text style={{ fontSize: 8, color: colors.heroEmerald, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>The Cost of Waiting</Text>
        <Text style={{ fontSize: 10, color: colors.white, lineHeight: 1.6 }}>
          {narrativeContent.recommendations.costOfInaction}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Inpatient ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  const valuePerProvider = Math.round(data.netGain / data.providers);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.logo} />
          {data.clientName && (
            <Text style={{ fontSize: 8, color: colors.mediumGray, marginLeft: 8, fontWeight: "bold" }}>{data.clientName}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>Inpatient ROI Assessment</Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>What We're Exploring</Text>
        <Text style={styles.sectionTitle}>Your Inpatient ROI Model</Text>
        <Text style={styles.sectionSubtitle}>
          {data.providers} {data.unitNamePlural} | {formatNumber(data.encounters)} admissions | {data.utilization}% utilization
        </Text>

        <View style={{ backgroundColor: colors.paleGray, padding: 14, borderRadius: 4, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5 }}>
            Inpatient documentation carries significant financial stakes—every note may impact DRG assignment, CDI workflows, denial defense, and physician retention. This assessment explores where value could come from and what might be recoverable with better documentation.
          </Text>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5, marginTop: 6 }}>
            You selected <Text style={{ fontWeight: "bold" }}>{data.drivers.length} value drivers</Text>: {data.drivers.map(d => d.name).join(", ")}. Each section walks through the logic step by step.
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

        <View style={{ backgroundColor: colors.paleGray, padding: 12, borderRadius: 4, marginTop: 8, borderLeftWidth: 3, borderLeftColor: colors.green }}>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5 }}>
            At <Text style={{ fontWeight: "bold" }}>{formatCurrency(valuePerProvider)} per {data.unitName}</Text> in projected net annual value, scaling could increase benefits proportionally. The methodology section explains how these projections work—and where your situation might differ.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Inpatient ROI Assessment</Text>
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.logo} />
          {data.clientName && (
            <Text style={{ fontSize: 8, color: colors.mediumGray, marginLeft: 8, fontWeight: "bold" }}>{data.clientName}</Text>
          )}
        </View>
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
          <Text style={styles.implicationTitle}>What This Suggests</Text>
          <Text style={styles.implicationText}>{implication}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Inpatient ROI Assessment</Text>
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

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.logo} />
          {data.clientName && (
            <Text style={{ fontSize: 8, color: colors.mediumGray, marginLeft: 8, fontWeight: "bold" }}>{data.clientName}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.black, letterSpacing: 0.5, marginBottom: 4 }}>
          HOW SCALING COULD WORK
        </Text>
        <Text style={{ fontSize: 9, color: colors.darkGray }}>
          Exploring the path from pilot to full deployment—and where the math might differ.
        </Text>
      </View>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          This analysis starts with a pilot of {journey.pilotProviders} {data.unitNamePlural.toLowerCase()} at {journey.pilotUtilization}% utilization. 
          If adoption follows typical patterns, value may compound—not just linearly with hospitalist count, but as utilization matures 
          and workflows adapt to the new documentation approach.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          At full scale ({journey.fullScaleProviders} {data.unitNamePlural.toLowerCase()}, {journey.fullScaleUtilization}% utilization), 
          projected annual value could reach <Text style={styles.narrativeHighlight}>{formatCurrency(journey.fullScaleValue)}</Text>—approximately {valueMultiple}x the pilot projection. Individual results will vary.
        </Text>
      </View>

      <View style={styles.journeyChart}>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <View style={{ width: 55, justifyContent: "space-between", paddingVertical: 4, height: 100 }}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(journey.fullScaleValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(Math.round((journey.fullScaleValue + journey.pilotValue) / 2))}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(journey.pilotValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>$0</Text>
          </View>
          
          <View style={{ flex: 1, marginLeft: 8, height: 100, position: "relative" }}>
            <Svg width={400} height={100} viewBox="0 0 400 100">
              <Line x1="0" y1="25" x2="400" y2="25" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="50" x2="400" y2="50" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="75" x2="400" y2="75" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="100" x2="400" y2="100" stroke={colors.borderGray} strokeWidth="1" />
              <Line x1="0" y1="0" x2="0" y2="100" stroke={colors.borderGray} strokeWidth="1" />
              
              <Line 
                x1="20" 
                y1="85" 
                x2="380" 
                y2="15" 
                stroke={colors.lightGray} 
                strokeWidth="2" 
                strokeDasharray="6,4" 
              />
              
              <Path 
                d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15" 
                stroke={colors.green} 
                strokeWidth="2.5" 
                fill="none" 
              />
              
              <Path 
                d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15 L 380 15 L 20 85 Z" 
                fill={colors.greenLight} 
                opacity="0.5" 
              />
              
              <Circle cx="20" cy="85" r="6" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
              <Circle cx="380" cy="10" r="6" fill={colors.green} stroke={colors.white} strokeWidth="2" />
            </Svg>
            
            <Text style={{ position: "absolute", bottom: 2, left: 4, fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Today</Text>
            <Text style={{ position: "absolute", top: -2, right: 4, fontSize: 7, color: colors.green, fontWeight: "bold" }}>Full Scale</Text>
            
            <View style={{ position: "absolute", top: 35, left: 160, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.green }}>
              <Text style={{ fontSize: 8, color: colors.green, fontWeight: "bold", textAlign: "center" }}>+{formatCurrency(journey.networkEffect)}</Text>
              <Text style={{ fontSize: 6, color: colors.greenDark, textAlign: "center" }}>compounding bonus</Text>
            </View>
          </View>
        </View>
        
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
            <Text style={{ fontSize: 7, color: colors.green, fontWeight: "bold" }}>Full Scale</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{journey.fullScaleProviders} {data.unitNamePlural}</Text>
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
        <Text style={styles.compoundingTitle}>How Scaling May Affect Value</Text>
        <Text style={styles.compoundingValue}>+{formatCurrency(journey.networkEffect)}</Text>
        <Text style={styles.compoundingSubtext}>Projected additional value from network effects at full scale</Text>
      </View>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          In typical deployments, value may not grow linearly. As more hospitalists adopt ambient documentation, CDI teams could query less frequently 
          and denial patterns may shift. These projections assume adoption patterns we've observed—your experience could differ.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          At {journey.fullScaleUtilization}% utilization with {journey.fullScaleProviders} {data.unitNamePlural.toLowerCase()}, network effects could 
          add approximately {formatCurrency(journey.networkEffect)} to your annual value—suggesting total potential near {formatCurrency(journey.fullScaleValue + journey.networkEffect)}.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Inpatient ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={styles.logo} />
          {data.clientName && (
            <Text style={{ fontSize: 8, color: colors.mediumGray, marginLeft: 8, fontWeight: "bold" }}>{data.clientName}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={styles.connectedSection}>
        <Text style={styles.connectedTitle}>EXPLORING CONNECTED VALUE</Text>
        <Text style={styles.connectedSubtitle}>How ED + Inpatient documentation could compound results</Text>
        
        <Text style={styles.connectedIntro}>
          When both ED and Inpatient use ambient documentation, value may compound. The admission documentation that starts in ED could flow directly into inpatient coding, CDI workflows, and denial defense.
        </Text>
        
        <View style={styles.connectedGrid}>
          <View style={styles.connectedItem}>
            <Text style={styles.connectedItemTitle}>DRG Capture</Text>
            <Text style={styles.connectedItemText}>
              CCs/MCCs documented in ED may carry forward—potentially starting case mix stronger from admission.
            </Text>
          </View>
          
          <View style={styles.connectedItem}>
            <Text style={styles.connectedItemTitle}>CDI Efficiency</Text>
            <Text style={styles.connectedItemText}>
              When the ED note is complete, CDI teams may query less and focus on complex cases.
            </Text>
          </View>
          
          <View style={styles.connectedItem}>
            <Text style={styles.connectedItemTitle}>Denial Prevention</Text>
            <Text style={styles.connectedItemText}>
              Medical necessity documented at admission could strengthen defense against payer audits.
            </Text>
          </View>
        </View>
        
        <View style={styles.connectedCallout}>
          <Text style={styles.connectedCalloutText}>
            If you're also using Abridge in ED, these documentation quality benefits may be amplified—though results depend on your specific workflows.
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black, marginBottom: 4 }}>How We Built This Model</Text>
      <Text style={{ fontSize: 9, color: colors.mediumGray, marginBottom: 14 }}>Understanding the inputs, benchmarks, and principles behind these projections.</Text>

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
        These benchmarks reflect aggregate patterns from health system deployments. Your results will depend on patient acuity mix, 
        payer mix, operational factors, and implementation approach. We use conservative assumptions—actual value could be higher or lower 
        depending on your specific circumstances.
      </Text>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          This model is designed as a starting point for conversation, not a guarantee of results. The calculations are transparent 
          and adjustable—feel free to stress-test the assumptions. The goal is to help you explore what ambient documentation 
          might mean for your hospitalist program.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Inpatient ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const InpatientROIDocument = ({ data }: { data: InpatientPDFData }) => {
  // Stakes + Executive Summary + Drivers + Journey + Path Forward + Methodology (Cover excluded from count)
  const totalPages = 1 + 1 + data.drivers.length + 1 + 1 + 1;
  let currentPage = 1;

  return (
    <Document>
      {/* Cover - no page number, not counted */}
      <CoverPage data={data} />
      
      {/* Stakes - Page 1 */}
      <StakesPage pageNum={currentPage++} totalPages={totalPages} />
      
      {/* Executive Summary */}
      <ExecutiveSummaryPage data={data} pageNum={currentPage++} totalPages={totalPages} />

      {/* Driver Deep Dives */}
      {data.drivers.map((driver) => (
        <DriverDetailPage
          key={driver.id}
          driver={driver}
          data={data}
          pageNum={currentPage++}
          totalPages={totalPages}
        />
      ))}

      {/* Journey/Projections */}
      <JourneyPage data={data} pageNum={currentPage++} totalPages={totalPages} />
      
      {/* Path Forward */}
      <PathForwardPage data={data} pageNum={currentPage++} totalPages={totalPages} />

      {/* Methodology */}
      <MethodologyPage data={data} pageNum={currentPage++} totalPages={totalPages} />
    </Document>
  );
};

export async function generateInpatientROIPDFBlob(data: InpatientPDFData): Promise<{ blob: Blob; filename: string }> {
  const blob = await pdf(<InpatientROIDocument data={data} />).toBlob();

  const today = new Date().toISOString().split("T")[0];
  const orgSlug = data.organizationName
    ? data.organizationName.replace(/\s+/g, "-").toLowerCase().substring(0, 20)
    : "";
  const filename = orgSlug
    ? `abridge-inpatient-roi-${orgSlug}-${today}.pdf`
    : `abridge-inpatient-roi-${today}.pdf`;

  return { blob, filename };
}

export async function generateInpatientROIPDF(data: InpatientPDFData): Promise<void> {
  const { blob, filename } = await generateInpatientROIPDFBlob(data);
  saveAs(blob, filename);
}

export default InpatientROIDocument;
