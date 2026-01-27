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
// COLORS
// ============================================================================

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  green: "#059669",
  greenLight: "#ECFDF5",
  greenDark: "#047857",
  emerald: "#10b981",
  emeraldLight: "#d1fae5",
  emeraldDark: "#065f46",
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
  slate: "#1e293b",
  slateLight: "#334155",
};

// ============================================================================
// STYLES - God Tier Premium Storytelling Format
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 0,
    paddingBottom: 50,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  // Dark Hero Section (Page 1)
  heroSection: {
    backgroundColor: colors.slate,
    padding: 40,
    paddingTop: 30,
    paddingBottom: 35,
    marginBottom: 0,
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  heroMetaText: {
    fontSize: 8,
    color: colors.lightGray,
  },
  heroClientName: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroTagline: {
    fontSize: 12,
    color: colors.lightGray,
    lineHeight: 1.6,
  },

  // Compact Hero for driver pages
  heroCompact: {
    backgroundColor: colors.slate,
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
    color: colors.emerald,
    marginTop: 8,
  },

  // Content section below hero
  contentSection: {
    padding: 40,
    paddingTop: 24,
    paddingBottom: 20,
  },

  // Chapter labels
  chapterLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: colors.mediumGray,
    marginBottom: 16,
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

  sectionTitleOld: {
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

  downstreamSection: {
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.lightGray,
    paddingLeft: 12,
  },
  downstreamTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 1,
    marginBottom: 2,
  },
  downstreamSubtitle: {
    fontSize: 9,
    color: colors.darkGray,
    fontStyle: "italic",
    marginBottom: 10,
  },
  downstreamIntro: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  downstreamSubheader: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
  },
  downstreamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  downstreamItem: {
    width: "47%",
    backgroundColor: colors.paleGray,
    padding: 8,
    borderRadius: 3,
    marginRight: 8,
    marginBottom: 8,
  },
  downstreamItemTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  downstreamItemText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },
  downstreamCallout: {
    backgroundColor: "#3B82F6",
    padding: 10,
    borderRadius: 4,
  },
  downstreamCalloutText: {
    fontSize: 8,
    color: "#FFFFFF",
    lineHeight: 1.5,
  },
  downstreamCalloutBold: {
    fontWeight: "bold",
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
// ED-SPECIFIC DRIVER EDUCATIONAL CONTENT
// ============================================================================

const driverTheories: Record<string, string> = {
  edThroughput: `When patients leave without being seen (LWBS), the ED loses revenue and—more importantly—fails its core mission. LWBS happens for many reasons: long wait times, staffing constraints, perceived non-urgency. But documentation delays play a role too.

When physicians can complete documentation faster, disposition happens sooner. Patients move through the department more quickly. Wait times compress. And fewer patients give up and leave.

We model this conservatively: only 40% of LWBS is attributable to documentation-driven bottlenecks, and Abridge can address about half of that. The rest is driven by factors outside documentation—true capacity constraints, triage decisions, patient behavior.`,
  
  edRetention: `ED physicians face unique burnout pressures: shift work, high acuity, unpredictable volume, and—yes—documentation burden. The charting follows them home. The cognitive load compounds across shifts.

Replacing an ED physician is expensive: $500K+ when you factor recruiting, credentialing, lost revenue during vacancy, and the 6-12 months it takes to reach full productivity in a new environment.

We use the same "Rule of Thirds" as outpatient: documentation burden contributes to roughly half of burnout, Abridge reduces that burden by ~70%, yielding ~35% theoretical impact. We round to 30% for conservatism.`,
  
  edLevelOfService: `ED visits are often complex—multiple problems, rapid assessment, time-sensitive decisions. But documentation doesn't always reflect that complexity. Under time pressure, notes get truncated. MDM is summarized rather than detailed. The result: visits that should code at 99285 get billed as 99284.

Abridge captures the clinical narrative as it happens. When the note includes the full reasoning—why you ordered that CT, what differential you were considering, how the patient's presentation evolved—coding can be more accurate.

We model a 5% wRVU improvement, consistent with what we see across ED deployments. Your results depend on current documentation quality and specialty complexity.`,
  
  edDenials: `ED claims face unique denial challenges. The acuity that justified the visit isn't always clear in the note. The medical necessity for a procedure gets questioned. The MDM that seemed obvious in the moment doesn't translate to paper.

These denials are often recoverable—you appeal, you win. But the rework is expensive, and some claims get written off because the cost of appeal exceeds the value.

Abridge captures the clinical reasoning in real time. When that reasoning is in the note, denials are less likely—and when they happen, appeals are more defensible.`,

  edScribe: `Scribes exist because ED documentation is intensive—high volume, high acuity, time pressure. They're effective, but expensive: $20-30/hr fully loaded, often with scheduling overhead and training costs on top.

When ambient documentation handles the bulk of note generation, the role of scribes shifts. Some organizations eliminate them entirely. Others reduce to a small team for complex cases or training purposes. Either way, the cost structure changes significantly.

We model a 75% reduction in scribe hours. This assumes some organizations will maintain minimal scribe presence for edge cases. If you're comfortable going to zero, actual savings may be higher.`,
};

const driverImplications: Record<string, (value: number, data: EDPDFData) => string> = {
  edThroughput: (value, data) => {
    const patientsRetained = Math.round(value / 350);
    return `Based on these inputs, the model suggests potential value of ${formatCurrency(value)} annually. This would represent approximately ${patientsRetained} patients retained who might otherwise leave. Of course, actual results depend on your specific patient population, acuity mix, and operational factors. The clinical benefit—ensuring patients receive care—may be as significant as the financial impact.`;
  },
  
  edRetention: (value, data) => {
    const departures = value / 500000;
    const yearsPerDeparture = departures > 0 ? (1 / departures).toFixed(1) : "N/A";
    return `The calculation suggests potential value of ${formatCurrency(value)} annually, representing approximately ${departures.toFixed(2)} avoided departures per year—or roughly one retained physician every ${yearsPerDeparture} years. This is a long-term metric; benefits would materialize over 12+ months as burnout patterns shift. Your actual experience may vary based on existing culture, workload, and other retention factors.`;
  },
  
  edLevelOfService: (value, data) => {
    return `Based on these assumptions, the model suggests ${formatCurrency(value)} in potential annual value from more accurate documentation. This reflects the hypothesis that comprehensive notes capture complexity that might otherwise be under-documented. Results depend significantly on your current documentation quality—if notes are already thorough, improvement may be less.`;
  },
  
  edDenials: (value, data) => {
    const claimsRecovered = Math.round(value / 350);
    return `The calculation suggests potential value of ${formatCurrency(value)} annually, representing approximately ${claimsRecovered} claims that might otherwise be lost. This assumes Abridge captures clinical reasoning that strengthens documentation. Actual denial rates and recovery success depend on payer mix, claim complexity, and current documentation practices.`;
  },

  edScribe: (value, data) => {
    return `At ${formatCurrency(value)}, scribe cost reduction could be a significant driver if applicable to your situation. This represents direct cost displacement. Implementation note: many organizations transition gradually over 3-6 months, allowing time for workflow adjustment. Your timeline and approach would depend on current scribe coverage and provider preferences.`;
  },
};

// ============================================================================
// ED-SPECIFIC CALCULATION STEP GENERATORS
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

function getDriverSteps(driver: DriverCalculation, data: EDPDFData): CalculationStep[] {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "edThroughput":
      return [
        {
          label: "Step 1: LWBS Patients",
          question: "How many patients leave without being seen?",
          inputs: [
            { value: formatNumber(inputs.annualEdVisits as number || data.eligibleEncounters), label: "ED visits" },
            { value: `${inputs.lwbsRate || 4}%`, label: "LWBS rate" },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.lwbsPatients as number || 0)} patients leaving`,
          note: "Industry LWBS rates vary from 2-5%. High-volume urban EDs often run higher.",
        },
        {
          label: "Step 2: Patients Retained",
          question: "How many can be retained with faster throughput?",
          inputs: [
            { value: formatNumber(inputs.lwbsPatients as number || 0), label: "LWBS" },
            { value: `${inputs.improvementRate || 50}%`, label: "improvement" },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.patientsRetained as number || 0)} retained`,
          note: "With faster documentation, staff can see waiting patients before they leave.",
        },
        {
          label: "Step 3: Abridge Attribution",
          question: "How many are attributable to Abridge?",
          inputs: [
            { value: formatNumber(inputs.patientsRetained as number || 0), label: "retained" },
            { value: `${inputs.abridgeAttributionPercent || 100}%`, label: "attribution" },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.patientsRecovered as number || 0)} attributed`,
          note: "Portion of improvement directly tied to Abridge documentation efficiency.",
        },
        {
          label: "Step 4: Revenue Impact",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.patientsRecovered as number || 0), label: "patients" },
            { value: formatCurrency(inputs.avgEdVisitRevenue as number || 350), label: "per visit" },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: inputs.includeAdmissions 
            ? `Includes ${inputs.admissionPercent || 15}% admission rate at ${formatCurrency(inputs.avgAdmissionRevenue as number || 8500)} per admission.`
            : "Average ED revenue per visit. Adjust based on your payer mix and acuity.",
        },
      ];

    case "edRetention":
      return [
        {
          label: "Step 1: Expected Turnover",
          question: "How many departures occur annually?",
          inputs: [
            { value: formatNumber(inputs.providers as number || data.providers), label: "ED providers" },
            { value: `${inputs.turnoverRate || 10}%` },
          ],
          operators: ["x"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
          note: "ED turnover often runs higher than outpatient—8-12% is common.",
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
          note: "Burnout is particularly prevalent in emergency medicine.",
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
          note: "The Rule of Thirds: 50% of burnout x 70% doc reduction = 35%, rounded to 30%.",
        },
        {
          label: "Step 4: Value",
          question: "What's the savings?",
          inputs: [
            { value: (inputs.departuresAvoided as number || 0).toFixed(2), label: "prevented" },
            { value: formatCurrency(inputs.replacementCost as number || 500000) },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "ED replacement cost is typically higher than outpatient due to specialized credentialing and shift coverage complexity.",
        },
      ];

    case "edLevelOfService":
      return [
        {
          label: "Step 1: Baseline wRVUs",
          question: "What's your current wRVU generation?",
          inputs: [
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "visits" },
            { value: `${inputs.avgWrvuPerEncounter || 2.2}` },
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
          note: "5% improvement assumes meaningful under-documentation today. If your notes are already comprehensive, improvement may be less.",
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
          note: "Medicare conversion factor. Commercial rates run $45-65.",
        },
      ];

    case "edDenials":
      return [
        {
          label: "Step 1: Total Denials",
          question: "How many claims are denied today?",
          inputs: [
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "visits" },
            { value: `${inputs.denialRate || 10}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.totalDenials as number || 0)} denials`,
          note: "ED denial rates often run 8-12%—higher than outpatient due to complexity.",
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
          note: "35% of ED denials are documentation-related: missing MDM, unclear necessity, incomplete notes.",
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
          note: "These are claims abandoned without appeal.",
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
          note: "75% recovery when the clinical reasoning exists but wasn't documented.",
        },
        {
          label: "Step 5: Value",
          question: "What's the dollar impact?",
          inputs: [
            { value: formatNumber(inputs.claimsRecovered as number || 0), label: "claims" },
            { value: `$${inputs.avgClaimValue || 350}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "ED claims average higher than outpatient due to acuity.",
        },
      ];

    case "edScribe":
      return [
        {
          label: "Step 1: Current Scribe Investment",
          question: "What's your annual scribe spend?",
          inputs: [
            { value: formatCurrency(inputs.annualScribeCost as number || 0) },
          ],
          operators: [],
          result: formatCurrency(inputs.annualScribeCost as number || 0),
          note: "Your current scribe investment. Include all costs: wages, benefits, scheduling overhead.",
        },
        {
          label: "Step 2: Abridge Reduction",
          question: "How much can be eliminated with Abridge?",
          inputs: [
            { value: formatCurrency(inputs.annualScribeCost as number || 0), label: "scribe cost" },
            { value: `${inputs.scribeReductionRate || 75}%` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "75% reduction is typical. Some organizations eliminate scribes entirely; others keep a small team for complex cases.",
        },
      ];

    default:
      return [];
  }
}

// ============================================================================
// ED-SPECIFIC BENCHMARKS & WARNINGS
// ============================================================================

interface Benchmark {
  title: string;
  rows: { label: string; value: string }[];
  note?: string;
}

function getDriverBenchmarks(driverId: string): Benchmark | null {
  switch (driverId) {
    case "edThroughput":
      return {
        title: "ED Revenue Per Visit",
        rows: [
          { label: "Low Acuity (ESI 4-5)", value: "$150 - $250" },
          { label: "Medium Acuity (ESI 3)", value: "$300 - $450" },
          { label: "High Acuity (ESI 1-2)", value: "$600 - $1,200+" },
          { label: "Blended Average", value: "~$350" },
        ],
        note: "Your input reflects a blended average across your acuity mix.",
      };

    case "edLevelOfService":
      return {
        title: "ED wRVU Per Encounter",
        rows: [
          { label: "Low Acuity (ESI 4-5)", value: "1.2 - 1.6" },
          { label: "Medium Acuity (ESI 3)", value: "2.0 - 2.5" },
          { label: "High Acuity (ESI 1-2)", value: "3.0 - 5.0+" },
          { label: "Blended Average", value: "~2.2" },
        ],
        note: "ED wRVUs vary by acuity mix. 2.0-2.5 per encounter is typical.",
      };

    case "edDenials":
      return {
        title: "Average ED Claim Value",
        rows: [
          { label: "Low Complexity", value: "$175 - $250" },
          { label: "Medium Complexity", value: "$300 - $450" },
          { label: "High Complexity", value: "$500 - $800+" },
          { label: "Blended Average", value: "~$350" },
        ],
      };

    case "edRetention":
      return {
        title: "ED Physician Replacement Cost",
        rows: [
          { label: "Recruiting & Credentialing", value: "$50K - $100K" },
          { label: "Lost Revenue (vacancy)", value: "$200K - $400K" },
          { label: "Onboarding & Ramp-up", value: "$100K - $150K" },
          { label: "Total Cost", value: "$400K - $650K+" },
        ],
        note: "ED replacement typically higher than outpatient due to shift coverage complexity.",
      };

    default:
      return null;
  }
}

interface Warning {
  title: string;
  text: string;
}

function getDriverWarnings(driver: DriverCalculation, data: EDPDFData): Warning | null {
  if (driver.id === "edRetention" && data.providers < 50) {
    return {
      title: "Small Provider Count",
      text: "With fewer than 50 ED providers, retention math is probabilistic over multi-year periods. Over a 3-4 year period, the cumulative effect is equivalent to retaining one additional physician. The value is real—it just materializes over time.",
    };
  }

  return null;
}

function getFinalFormula(driver: DriverCalculation): string {
  const inputs = driver.inputs;
  switch (driver.id) {
    case "edThroughput":
      return `${formatNumber((inputs.patientsRecovered as number) || 0)} recovered x $${inputs.avgEdRevenue || 350}/visit`;
    case "edRetention":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} avoided x ${formatCurrency((inputs.replacementCost as number) || 500000)}`;
    case "edLevelOfService":
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVU gain x $${inputs.conversionFactor || 33}`;
    case "edDenials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims x $${inputs.avgClaimValue || 350}`;
    case "edScribe":
      return `${formatCurrency((inputs.annualScribeCost as number) || 0)} x ${inputs.scribeReductionRate || 100}%`;
    default:
      return "";
  }
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  const valuePerProvider = Math.round(data.netGain / data.providers);
  const displayClientName = data.clientName || data.organizationName || "Your Organization";
  const displayPreparedBy = data.preparedBy || "Abridge";

  // Personalized opening narrative based on their context - ED-specific
  const getOpeningNarrative = () => {
    if (data.drivers.length >= 4) {
      return `Emergency departments face unique pressures—high acuity, unpredictable volume, time-sensitive decisions, and documentation that follows providers home. With ${data.drivers.length} value drivers selected, this model explores multiple pathways where better documentation could create value. Each page walks through the math step-by-step.`;
    } else if (data.drivers.length >= 2) {
      return `In the ED, every minute counts—for patients waiting, for providers charting, for throughput metrics. This assessment explores ${data.drivers.length} key areas: ${data.drivers.map(d => d.name).join(" and ")}. Each driver page breaks down the calculation so you can stress-test the assumptions.`;
    }
    return `ED workflows are unforgiving—high volume, rapid decisions, and notes that need to capture complexity in real time. This focused assessment explores ${data.drivers[0]?.name || "your selected driver"} in depth, showing exactly how we arrived at each number.`;
  };

  // ED-specific personalized tagline based on ROI and drivers
  const getHeroTagline = () => {
    const hasLWBS = data.drivers.some(d => d.id === "edThroughput");
    const hasRetention = data.drivers.some(d => d.id === "edRetention");
    
    if (data.roi >= 5 && hasLWBS) {
      return "Strong potential to reduce walkouts and capture lost revenue";
    } else if (data.roi >= 5 && hasRetention) {
      return "Addressing the documentation burden that drives ED burnout";
    } else if (data.roi >= 5) {
      return "Significant opportunity across your ED value drivers";
    } else if (data.roi >= 3) {
      return "Meaningful pathways to efficiency and revenue recovery";
    } else if (data.roi >= 2) {
      return "A solid foundation worth exploring for your ED";
    }
    return "Understanding your ED documentation value landscape";
  };

  return (
    <Page size="A4" style={styles.page}>
      {/* Dark Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>{today}</Text>
          <Text style={styles.heroMetaText}>Prepared by {displayPreparedBy}</Text>
        </View>
        <Image src={abridgeLogoPath} style={{ width: 85, height: 17, marginBottom: 24 }} />
        <Text style={styles.heroClientName}>{displayClientName}</Text>
        <Text style={styles.heroTagline}>
          {getHeroTagline()}
        </Text>
        <Text style={{ fontSize: 9, color: colors.lightGray, marginTop: 8, lineHeight: 1.5 }}>
          Emergency Department ROI Assessment — An exploratory model built from your inputs and industry benchmarks.
        </Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>The Overview</Text>
        <Text style={styles.sectionTitle}>What We're Exploring Together</Text>
        
        <Text style={{ fontSize: 9, color: colors.darkGray, lineHeight: 1.6, marginBottom: 16 }}>
          {getOpeningNarrative()}
        </Text>

        {/* Key Metrics Grid */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBoxHighlight}>
            <Text style={styles.metricValueGreen}>+{formatCurrency(data.netGain)}</Text>
            <Text style={styles.metricLabel}>Potential Net Gain</Text>
            <Text style={styles.metricSublabel}>{formatCurrency(data.totalValue)} value - {formatCurrency(data.investment)} cost</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>Projected ROI</Text>
            <Text style={styles.metricSublabel}>Based on selected drivers</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{formatCurrency(valuePerProvider)}</Text>
            <Text style={styles.metricLabel}>Per {data.unitName}</Text>
            <Text style={styles.metricSublabel}>Annual value estimate</Text>
          </View>
          <View style={[styles.metricBox, styles.metricBoxLast]}>
            <Text style={styles.metricValue}>{formatNumber(data.hoursReturned)}</Text>
            <Text style={styles.metricLabel}>Hours Returned</Text>
            <Text style={styles.metricSublabel}>Documentation time</Text>
          </View>
        </View>

        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.black, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 12 }}>Where Value Could Come From</Text>
        
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

        {/* What's Inside This Report */}
        <View style={{ backgroundColor: colors.paleGray, padding: 14, borderRadius: 4, marginTop: 12, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.black, marginBottom: 6 }}>What's Inside This Report</Text>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5 }}>
            Each of the following pages explores one driver in depth—showing the theory, the step-by-step calculation, industry benchmarks, and what the numbers might suggest for your ED. Review, adjust assumptions, and see what resonates.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// Driver-specific hero taglines (exploratory tone)
const driverHeroTaglines: Record<string, string> = {
  edThroughput: "Exploring how faster throughput could reduce patient walkouts",
  edRetention: "Understanding the connection between documentation burden and retention",
  edLevelOfService: "Examining patterns in documentation complexity capture",
  edDenials: "Exploring how complete documentation could reduce denial rates",
  edScribe: "Analyzing potential shifts in your scribe cost structure",
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
  const theory = driverTheories[driver.id] || "This driver explores potential value through improved documentation workflows.";
  const implicationFn = driverImplications[driver.id];
  const implication = implicationFn ? implicationFn(driver.value, data) : `Based on the inputs above, this driver suggests potential annual value of ${formatCurrency(driver.value)}.`;

  const steps = getDriverSteps(driver, data);
  const benchmarks = getDriverBenchmarks(driver.id);
  const warnings = getDriverWarnings(driver, data);
  const heroTagline = driverHeroTaglines[driver.id] || "Exploring potential value pathways";

  return (
    <Page size="A4" style={styles.page} wrap={false}>
      {/* Compact Dark Hero */}
      <View style={styles.heroCompact}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 10 }} />
            <Text style={styles.heroCompactTitle}>{driver.name}</Text>
            <Text style={styles.heroCompactSubtitle}>{heroTagline}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8, color: colors.lightGray, marginBottom: 4 }}>Potential Value</Text>
            <Text style={styles.heroCompactValue}>{formatCurrency(driver.value)}</Text>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>The Opportunity</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5, marginBottom: 14 }}>{theory}</Text>

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
            <Text style={styles.finalValueLabel}>Estimated Annual Value</Text>
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
        <Text style={styles.footerText}>Abridge ED ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const JourneyPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  const { journey } = data;
  const valueMultiple = (journey.fullScaleValue / journey.pilotValue).toFixed(1);
  const paceLabels: Record<string, string> = {
    measured: "36 months",
    steady: "24 months",
    aggressive: "18 months",
  };

  return (
    <Page size="A4" style={styles.page}>
      {/* Compact Hero */}
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 10 }} />
        <Text style={styles.heroCompactTitle}>Scaling in the ED Environment</Text>
        <Text style={styles.heroCompactSubtitle}>How value could compound as adoption grows across shifts and providers</Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>The ED Scaling Model</Text>
        <Text style={styles.sectionTitle}>From Pilot to Full Deployment</Text>

        <View style={{ backgroundColor: colors.paleGray, padding: 14, borderRadius: 4, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5 }}>
            ED scaling has unique dynamics: shift-based coverage, variable volume patterns, and the critical mass needed for workflow consistency. 
            Starting with {journey.pilotProviders} {data.unitNamePlural} at {journey.pilotUtilization}% utilization, value could grow as adoption 
            spreads across shifts and throughput improvements compound.
          </Text>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5, marginTop: 6 }}>
            At full scale with {journey.fullScaleProviders} {data.unitNamePlural}, projected annual value reaches approximately{" "}
            <Text style={{ fontWeight: "bold", color: colors.green }}>{formatCurrency(journey.fullScaleValue)}</Text>—roughly{" "}
            <Text style={{ fontWeight: "bold" }}>{valueMultiple}x</Text> the pilot projection. Actual results depend on adoption consistency across all shifts.
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
            <Text style={{ fontSize: 7, color: colors.green, fontWeight: "bold" }}>{paceLabels[journey.scalingPace]}</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{journey.fullScaleProviders} {data.unitNamePlural}</Text>
          </View>
        </View>
        
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
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{formatNumber(journey.pilotEncounters)}</Text> patient visits</Text>
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
        <Text style={styles.compoundingTitle}>Why ED Value Could Compound</Text>
        <Text style={styles.compoundingValue}>{valueMultiple}x</Text>
        <Text style={styles.compoundingSubtext}>
          In the ED, network effects may be particularly strong. When all shifts use Abridge, throughput improvements become consistent. 
          Door-to-doc times stabilize. LWBS patterns shift across the board—not just during peak hours. As utilization grows from{" "}
          {journey.pilotUtilization}% to {journey.fullScaleUtilization}%, each provider could generate more value at maturity than at pilot.
        </Text>
      </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
  const displayClientName = data.clientName || data.organizationName || "Your Organization";
  const valuePerProvider = Math.round(data.netGain / data.providers);

  // Personalized closing based on their numbers
  const getClosingMessage = () => {
    if (data.roi > 5) {
      return "The model suggests strong potential ROI. As always, actual results will depend on implementation, adoption patterns, and operational factors specific to your ED.";
    } else if (data.roi > 2) {
      return "The projections indicate solid potential value. We're happy to discuss which drivers resonate most with your situation and where assumptions might need adjustment.";
    }
    return "Every ED is different. These projections give us a starting point for discussion—we can refine assumptions based on your specific context and priorities.";
  };

  return (
    <Page size="A4" style={styles.page}>
      {/* Compact Hero */}
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 10 }} />
        <Text style={styles.heroCompactTitle}>ED Model Summary</Text>
        <Text style={styles.heroCompactSubtitle}>How we built this assessment—and what's worth discussing further</Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>Your ED Assessment</Text>
        <Text style={styles.sectionTitle}>Summary at a Glance</Text>

        {/* Summary metrics */}
        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: colors.greenLight, padding: 12, borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: colors.green }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.green }}>{formatCurrency(data.netGain)}</Text>
            <Text style={{ fontSize: 7, color: colors.greenDark, textTransform: "uppercase" }}>Potential Net Gain</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.paleGray, padding: 12, borderRadius: 4, marginRight: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.black }}>{data.roi.toFixed(1)}x</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase" }}>Projected ROI</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.paleGray, padding: 12, borderRadius: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.black }}>{formatCurrency(valuePerProvider)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase" }}>Per Provider</Text>
          </View>
        </View>

        <Text style={styles.chapterLabel}>Methodology</Text>
        <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.black, marginBottom: 10 }}>How We Built This Model</Text>

        <View style={styles.methodologyGrid}>
          <View style={styles.methodologyColumn}>
            <Text style={styles.methodologyTitle}>Your Inputs</Text>
            <Text style={styles.methodologyItem}>{data.providers} {data.unitNamePlural}</Text>
            <Text style={styles.methodologyItem}>{formatNumber(data.encounters)} annual visits</Text>
            <Text style={styles.methodologyItem}>{data.utilization}% utilization</Text>
            <Text style={styles.methodologyItem}>${data.costPerProvider}/{data.unitName}/mo</Text>
          </View>
          
          <View style={styles.methodologyColumn}>
            <Text style={styles.methodologyTitle}>ED Benchmarks</Text>
            <Text style={styles.methodologyItem}>wRVU/encounter: 2.0-2.5</Text>
            <Text style={styles.methodologyItem}>Replacement: $500K+</Text>
            <Text style={styles.methodologyItem}>Claim value: ~$350</Text>
            <Text style={styles.methodologyItem}>Turnover: 8-12%</Text>
          </View>
          
          <View style={[styles.methodologyColumn, styles.methodologyColumnLast]}>
            <Text style={styles.methodologyTitle}>Our Approach</Text>
            <Text style={styles.methodologyItem}>Conservative estimates</Text>
            <Text style={styles.methodologyItem}>Medicare rates used</Text>
            <Text style={styles.methodologyItem}>Transparent logic</Text>
            <Text style={styles.methodologyItem}>Adjustable inputs</Text>
          </View>
        </View>

        <Text style={{ fontSize: 7, color: colors.lightGray, fontStyle: "italic", marginTop: 8, marginBottom: 12 }}>
          ED benchmarks reflect aggregate data from emergency departments nationwide. Your results may vary based on acuity mix, boarding patterns, payer mix, and shift coverage.
        </Text>

        {/* ED-Specific Strategic Considerations */}
        <View style={{ backgroundColor: colors.blueLight, padding: 12, borderRadius: 4, marginBottom: 12 }}>
          <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.black, marginBottom: 6 }}>ED-Specific Considerations</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <View style={{ width: "48%", marginRight: "2%", marginBottom: 6 }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.darkGray }}>Shift Coverage</Text>
              <Text style={{ fontSize: 7, color: colors.darkGray, lineHeight: 1.4 }}>Value compounds when all shifts adopt—not just days.</Text>
            </View>
            <View style={{ width: "48%", marginBottom: 6 }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.darkGray }}>Volume Variability</Text>
              <Text style={{ fontSize: 7, color: colors.darkGray, lineHeight: 1.4 }}>Peak hours benefit most from documentation speed.</Text>
            </View>
            <View style={{ width: "48%", marginRight: "2%" }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.darkGray }}>Boarding Impact</Text>
              <Text style={{ fontSize: 7, color: colors.darkGray, lineHeight: 1.4 }}>Faster disposition could reduce boarding pressure.</Text>
            </View>
            <View style={{ width: "48%" }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.darkGray }}>Inpatient Connection</Text>
              <Text style={{ fontSize: 7, color: colors.darkGray, lineHeight: 1.4 }}>Quality ED notes could strengthen admission documentation.</Text>
            </View>
          </View>
        </View>

        {/* Closing message */}
        <View style={{ backgroundColor: colors.paleGray, padding: 14, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.black, marginBottom: 6 }}>What's Next</Text>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.5 }}>
            {getClosingMessage()} This document is meant to start a conversation—not end one. We're here to help you stress-test these numbers and understand what makes sense for {displayClientName}'s emergency department.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge ED ROI Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// MAIN DOCUMENT COMPONENT
// ============================================================================

const EDROIDocument = ({ data }: { data: EDPDFData }) => {
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

export async function generateEDROIPDFBlob(data: EDPDFData): Promise<{ blob: Blob; filename: string }> {
  const blob = await pdf(<EDROIDocument data={data} />).toBlob();

  const today = new Date().toISOString().split("T")[0];
  const orgSlug = data.organizationName
    ? data.organizationName.replace(/\s+/g, "-").toLowerCase().substring(0, 20)
    : "";
  const filename = orgSlug
    ? `abridge-ed-roi-${orgSlug}-${today}.pdf`
    : `abridge-ed-roi-${today}.pdf`;

  return { blob, filename };
}

export async function generateEDROIPDF(data: EDPDFData): Promise<void> {
  const { blob, filename } = await generateEDROIPDFBlob(data);
  saveAs(blob, filename);
}

export default EDROIDocument;
