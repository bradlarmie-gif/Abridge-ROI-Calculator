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
    const lwbsRate = (data.drivers.find(d => d.id === "edThroughput")?.inputs?.lwbsRate as number) || 4;
    const patientsRetained = Math.round(value / 350);
    return `At ${formatCurrency(value)}, throughput improvements contribute to your total value. This represents approximately ${patientsRetained} patients who would have left but now complete their visit. Beyond the revenue, there's a quality dimension: patients who leave without being seen may delay necessary care or present later with worse outcomes. Reducing LWBS is both a financial and clinical win.`;
  },
  
  edRetention: (value, data) => {
    const departures = value / 500000;
    const yearsPerDeparture = departures > 0 ? (1 / departures).toFixed(1) : "N/A";
    return `At ${formatCurrency(value)}, retention contributes to your total value. This represents ${departures.toFixed(2)} avoided departures annually—or roughly one retained physician every ${yearsPerDeparture} years. Note: this is a long-term metric—benefits materialize over 12+ months as burnout reduction translates to retention.`;
  },
  
  edLevelOfService: (value, data) => {
    return `At ${formatCurrency(value)}, level-of-service accuracy contributes to your total value. This represents getting appropriate credit for the complexity of care you're already delivering. The improvement comes from capturing the full clinical narrative—not upcoding, just accurate documentation of what you're already doing.`;
  },
  
  edDenials: (value, data) => {
    const claimsRecovered = Math.round(value / 350);
    return `At ${formatCurrency(value)}, denial prevention contributes to your total value. This represents approximately ${claimsRecovered} claims that would otherwise be written off. Abridge captures the clinical reasoning that either prevents denials or makes them winnable on appeal.`;
  },

  edScribe: (value, data) => {
    return `At ${formatCurrency(value)}, scribe reduction is likely your largest single driver. This is direct cost displacement—every dollar saved here flows straight to the bottom line. Implementation note: scribe reduction should be managed thoughtfully. Many organizations phase out over 3-6 months rather than eliminating immediately, allowing time for provider adjustment and workflow refinement.`;
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
            { value: formatNumber(inputs.eligibleEncounters as number || data.eligibleEncounters), label: "visits" },
            { value: `${inputs.lwbsRate || 4}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.lwbsPatients as number || 0)} LWBS`,
          note: "Industry LWBS rates vary from 2-5%. High-volume urban EDs often run higher.",
        },
        {
          label: "Step 2: Documentation-Attributable",
          question: "How much LWBS is documentation-related?",
          inputs: [
            { value: formatNumber(inputs.lwbsPatients as number || 0), label: "LWBS" },
            { value: `${inputs.docAttributablePct || 40}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.docAttributableLwbs as number || 0)} doc-related`,
          note: "Not all LWBS is documentation-related. We estimate 40% is tied to throughput delays that documentation impacts.",
        },
        {
          label: "Step 3: Abridge Impact",
          question: "How many can Abridge help recover?",
          inputs: [
            { value: formatNumber(inputs.docAttributableLwbs as number || 0), label: "doc-related" },
            { value: `${inputs.abridgeReductionPct || 50}%` },
          ],
          operators: ["x"],
          result: `${formatNumber(inputs.patientsRecovered as number || 0)} recovered`,
          note: "50% reduction is achievable when documentation becomes synchronous with care. Some organizations see more.",
        },
        {
          label: "Step 4: Revenue",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.patientsRecovered as number || 0), label: "recovered" },
            { value: `$${inputs.avgEdRevenue || 350}` },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Average ED revenue per visit. Adjust based on your payer mix and acuity.",
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
          <Text style={styles.headerSubtitle}>{today}</Text>
        </View>
      </View>

      {data.organizationName && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.black }}>{data.organizationName}</Text>
          <Text style={{ fontSize: 8, color: colors.mediumGray, marginTop: 2 }}>
            {data.providers} {data.unitNamePlural} | {formatNumber(data.encounters)} patient visits | {data.utilization}% utilization
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
        <Text style={styles.footerText}>Generated by Abridge{data.preparedBy ? ` | Prepared by ${data.preparedBy}` : ''}</Text>
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
          <Text style={styles.implicationTitle}>What This Means</Text>
          <Text style={styles.implicationText}>{implication}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge{data.preparedBy ? ` | Prepared by ${data.preparedBy}` : ''}</Text>
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
        <Text style={styles.compoundingTitle}>Why Value Compounds</Text>
        <Text style={styles.compoundingValue}>{valueMultiple}x</Text>
        <Text style={styles.compoundingSubtext}>
          Value doesn't just scale linearly with {data.unitName} count. As utilization improves ({journey.pilotUtilization}% to {journey.fullScaleUtilization}%), 
          workflows optimize, and network effects emerge, each {data.unitName} generates more value at maturity than at pilot.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge{data.preparedBy ? ` | Prepared by ${data.preparedBy}` : ''}</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: EDPDFData; pageNum: number; totalPages: number }) => {
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

      <View style={styles.downstreamSection}>
        <Text style={styles.downstreamTitle}>DOWNSTREAM VALUE</Text>
        <Text style={styles.downstreamSubtitle}>The ED admission note is just the beginning</Text>
        
        <Text style={styles.downstreamIntro}>
          When an ED physician decides to admit a patient, their documentation becomes the foundation for inpatient revenue. The conditions they capture, the medical necessity they establish, and the clinical reasoning they document all determine what happens downstream.
        </Text>
        
        <Text style={styles.downstreamSubheader}>Better ED documentation directly impacts:</Text>
        
        <View style={styles.downstreamGrid}>
          <View style={styles.downstreamItem}>
            <Text style={styles.downstreamItemTitle}>DRG & CMI Capture</Text>
            <Text style={styles.downstreamItemText}>
              CCs and MCCs documented in ED carry forward to inpatient coding. What's captured here determines your case mix.
            </Text>
          </View>
          
          <View style={styles.downstreamItem}>
            <Text style={styles.downstreamItemTitle}>Medical Necessity</Text>
            <Text style={styles.downstreamItemText}>
              The admission decision is documented in ED. This is your first line of defense against status denials and downgrades.
            </Text>
          </View>
          
          <View style={styles.downstreamItem}>
            <Text style={styles.downstreamItemTitle}>CDI Efficiency</Text>
            <Text style={styles.downstreamItemText}>
              When the ED note is complete, CDI teams spend less time querying physicians and more time on complex cases.
            </Text>
          </View>
          
          <View style={styles.downstreamItem}>
            <Text style={styles.downstreamItemTitle}>Denial Prevention</Text>
            <Text style={styles.downstreamItemText}>
              Payer audits start with the admission note. Complete documentation from day one means stronger appeals.
            </Text>
          </View>
        </View>
        
        <View style={styles.downstreamCallout}>
          <Text style={styles.downstreamCalloutText}>
            These benefits are quantified in the <Text style={styles.downstreamCalloutBold}>Inpatient Setting</Text>.
          </Text>
          <Text style={styles.downstreamCalloutText}>
            If your organization admits patients from the ED, the value compounds when both settings use Abridge.
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black, marginBottom: 14 }}>Methodology & Assumptions</Text>

      <View style={styles.methodologyGrid}>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Your Inputs</Text>
          <Text style={styles.methodologyItem}>{data.providers} {data.unitNamePlural}</Text>
          <Text style={styles.methodologyItem}>{formatNumber(data.encounters)} annual patient visits</Text>
          <Text style={styles.methodologyItem}>{data.utilization}% utilization rate</Text>
          <Text style={styles.methodologyItem}>{data.timeSavedPerEncounter} min saved per encounter</Text>
          <Text style={styles.methodologyItem}>${data.costPerProvider}/{data.unitName}/month</Text>
        </View>
        
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>ED-Specific Benchmarks</Text>
          <Text style={styles.methodologyItem}>wRVU per encounter: 2.0-2.5</Text>
          <Text style={styles.methodologyItem}>ED physician replacement: $500K+</Text>
          <Text style={styles.methodologyItem}>Average claim value: $350</Text>
          <Text style={styles.methodologyItem}>ED turnover rate: 8-12%</Text>
          <Text style={styles.methodologyItem}>ED denial rate: 8-12%</Text>
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
        All benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on patient acuity mix, 
        payer mix, operational factors, and implementation quality. We use conservative assumptions throughout—actual value may be higher.
      </Text>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          "Emergency departments face unique documentation pressures—high volume, high acuity, time pressure. The difference between a 2x ROI and a 5x ROI usually isn't the technology. It's utilization, change management, and knowing which drivers matter most for your ED's situation."
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge{data.preparedBy ? ` | Prepared by ${data.preparedBy}` : ''}</Text>
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
