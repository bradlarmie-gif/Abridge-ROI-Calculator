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
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// GOD TIER COLOR PALETTE
// ============================================================================

const colors = {
  // Brand
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  
  // Success/Money
  emerald: "#059669",
  emeraldLight: "#ECFDF5",
  emeraldDark: "#047857",
  
  // Accent
  amber: "#D97706",
  amberLight: "#FFFBEB",
  
  // Blues for utilization
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  
  // Purple for efficiency
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  
  // Neutral
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  backgroundGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  
  // Status
  redLight: "#FEF2F2",
  redDark: "#991B1B",
};

// ============================================================================
// GOD TIER STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  // ========================================
  // PREMIUM HEADER
  // ========================================
  premiumHeader: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  premiumHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  premiumHeaderRight: {
    textAlign: "right",
  },
  premiumDocType: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  premiumDate: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 3,
  },
  premiumHeaderClient: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 6,
  },
  premiumPreparedLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  premiumClientName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  premiumPreparedBy: {
    fontSize: 11,
    color: colors.darkGray,
  },

  // ========================================
  // PAGE HEADER (subsequent pages)
  // ========================================
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  pageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pageHeaderClient: {
    fontSize: 10,
    color: colors.darkGray,
    marginLeft: 14,
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderGray,
  },
  pageHeaderTitle: {
    fontSize: 9,
    color: colors.mediumGray,
    fontStyle: "italic",
  },

  // ========================================
  // SECTION HEADERS
  // ========================================
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 14,
  },
  sectionAccent: {
    width: 4,
    height: 14,
    backgroundColor: colors.primary,
    marginRight: 10,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.darkGray,
    marginBottom: 12,
    lineHeight: 1.5,
  },

  // ========================================
  // EXECUTIVE SUMMARY BOX
  // ========================================
  execSummary: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  execSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.black,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  execSummaryTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: 1,
  },
  execSummaryContent: {
    padding: 14,
  },
  execBullet: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 6,
  },
  execBulletBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  execHighlight: {
    color: colors.emerald,
    fontWeight: "bold",
  },

  // ========================================
  // HERO METRICS GRID
  // ========================================
  heroMetricsGrid: {
    flexDirection: "row",
    marginBottom: 14,
  },
  heroMetricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  heroMetricCardPrimary: {
    flex: 1,
    backgroundColor: colors.emeraldLight,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  heroMetricCardLast: {
    marginRight: 0,
  },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  heroMetricValueGreen: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.emerald,
    marginBottom: 4,
  },
  heroMetricLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroMetricDescription: {
    fontSize: 7,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.4,
  },

  // ========================================
  // FINDINGS NARRATIVE BOX
  // ========================================
  findingsBox: {
    backgroundColor: colors.backgroundGray,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  findingsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  findingsNarrative: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  findingsSubsection: {
    marginBottom: 10,
  },
  findingsSubtitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  findingsText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  // ========================================
  // DIMENSION TABLE
  // ========================================
  dimensionTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    overflow: "hidden",
  },
  dimensionTableHeader: {
    flexDirection: "row",
    backgroundColor: colors.black,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dimensionTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dimensionTableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dimensionTableCol1: {
    flex: 2,
  },
  dimensionTableCol2: {
    flex: 1,
    textAlign: "center",
  },
  dimensionTableCol3: {
    flex: 1,
    textAlign: "center",
  },
  dimensionTableCol4: {
    flex: 1.2,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableBodyText: {
    fontSize: 9,
    color: colors.black,
  },
  tableBodyTextBold: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },

  // ========================================
  // SCORE CALCULATION CARD (matches web UX)
  // ========================================
  scoreCalcContainer: {
    marginBottom: 14,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#1E293B", // Dark slate like web
  },
  scoreCalcHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: 8,
  },
  scoreCalcIcon: {
    width: 16,
    height: 16,
    backgroundColor: colors.amber,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreCalcTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.white,
  },
  scoreCalcSubtitle: {
    fontSize: 8,
    color: "#94A3B8", // slate-400
    paddingHorizontal: 12,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  scoreCalcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(71, 85, 105, 0.3)", // slate-700/30
    marginHorizontal: 10,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  scoreCalcRowLabel: {
    fontSize: 9,
    color: "#CBD5E1", // slate-300
  },
  scoreCalcRowValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },
  scoreCalcDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(71, 85, 105, 0.5)", // slate-600
    marginHorizontal: 10,
    marginVertical: 6,
  },
  scoreCalcTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)", // emerald/20
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)", // emerald/40
    marginHorizontal: 10,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  scoreCalcTotalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.white,
  },
  scoreCalcTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.emerald,
  },
  scoreCalcExplanation: {
    fontSize: 8,
    color: "#94A3B8",
    lineHeight: 1.5,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // ========================================
  // DIMENSION DEEP-DIVE CARDS
  // ========================================
  dimensionCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    marginBottom: 12,
    overflow: "hidden",
  },
  dimensionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  dimensionCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dimensionCardIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dimensionCardName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionCardScore: {
    fontSize: 14,
    fontWeight: "bold",
  },
  dimensionCardMetrics: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  dimensionCardMetric: {
    flex: 1,
    alignItems: "center",
  },
  dimensionCardMetricValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionCardMetricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 1,
  },
  dimensionCardBar: {
    height: 8,
    backgroundColor: colors.borderGray,
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  dimensionCardBarFill: {
    height: 8,
    borderRadius: 4,
  },
  dimensionCardBody: {
    padding: 10,
  },
  dimensionCardEducation: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  dimensionCardInsight: {
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  dimensionCardInsightText: {
    fontSize: 7,
    color: colors.primaryDark,
    lineHeight: 1.5,
    fontWeight: "bold",
  },

  // ========================================
  // OPPORTUNITY CALCULATION CARDS
  // ========================================
  opportunityCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    marginBottom: 12,
    overflow: "hidden",
  },
  opportunityCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  opportunityCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  opportunityCardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.emerald,
  },
  opportunityCardInputs: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  opportunityCardInput: {
    flex: 1,
    alignItems: "center",
  },
  opportunityCardInputValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  opportunityCardInputLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },
  opportunityCardSteps: {
    padding: 10,
    backgroundColor: colors.white,
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  stepNumberText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    marginBottom: 1,
  },
  stepMath: {
    fontSize: 9,
    color: colors.black,
    fontFamily: "Courier",
  },
  stepResult: {
    fontWeight: "bold",
    color: colors.emerald,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  resultCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.emeraldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  resultCheckText: {
    fontSize: 10,
    color: colors.emerald,
    fontWeight: "bold",
  },
  resultLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.emerald,
  },

  // ========================================
  // TOTAL OPPORTUNITY BOX
  // ========================================
  totalOpportunityBox: {
    backgroundColor: colors.emeraldLight,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalOpportunityLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  totalOpportunityValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.emerald,
  },
  totalOpportunityBreakdown: {
    fontSize: 8,
    color: colors.darkGray,
    marginTop: 4,
  },

  // ========================================
  // TIMELINE CHART
  // ========================================
  timelineContainer: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  timelineTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginBottom: 12,
  },
  timelineChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 80,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  timelineBar: {
    alignItems: "center",
    width: 80,
  },
  timelineBarFill: {
    width: 50,
    backgroundColor: colors.emerald,
    borderRadius: 4,
    marginBottom: 6,
  },
  timelineBarValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.emerald,
    marginBottom: 2,
  },
  timelineBarLabel: {
    fontSize: 8,
    color: colors.darkGray,
    fontWeight: "bold",
  },
  timelineTotalBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  timelineTotalLabel: {
    fontSize: 9,
    color: colors.darkGray,
    marginRight: 8,
  },
  timelineTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.emerald,
    marginRight: 4,
  },
  timelineTotalPeriod: {
    fontSize: 9,
    color: colors.darkGray,
  },

  // ========================================
  // COST OF WAITING
  // ========================================
  waitingContainer: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  waitingTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  waitingSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginBottom: 12,
  },
  waitingGrid: {
    flexDirection: "row",
  },
  waitingCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  waitingCardHighlight: {
    flex: 1,
    backgroundColor: colors.emeraldLight,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderRadius: 6,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  waitingCardLast: {
    marginRight: 0,
  },
  waitingCardLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  waitingCardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  waitingCardValueGreen: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.emerald,
    marginBottom: 2,
  },
  waitingCardNote: {
    fontSize: 7,
    color: colors.lightGray,
    textAlign: "center",
  },

  // ========================================
  // KEY TAKEAWAYS
  // ========================================
  takeawaysBox: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
  },
  takeawaysTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  takeawaysItem: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 4,
    paddingLeft: 12,
  },

  // ========================================
  // NEXT STEPS
  // ========================================
  nextStepsBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    marginBottom: 14,
    overflow: "hidden",
  },
  nextStepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.black,
    padding: 10,
  },
  nextStepsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: 0.5,
  },
  nextStepsFocus: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  nextStepsContent: {
    padding: 12,
  },
  nextStepsIntro: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  nextStepsGrid: {
    flexDirection: "row",
  },
  nextStepsColumn: {
    flex: 1,
    paddingRight: 10,
  },
  nextStepsColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  nextStepsItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
    paddingLeft: 8,
  },

  // ========================================
  // METHODOLOGY
  // ========================================
  methodologySection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 12,
    marginTop: 8,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 12,
  },
  methodologyColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  methodologyItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.4,
    marginTop: 10,
    fontStyle: "italic",
  },

  // ========================================
  // CONTACT CTA
  // ========================================
  contactCTA: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  contactCTAText: {
    fontSize: 9,
    color: colors.primaryDark,
    textAlign: "center",
    lineHeight: 1.5,
  },
  contactCTAPrepared: {
    fontSize: 8,
    color: colors.primaryDark,
    textAlign: "center",
    marginTop: 6,
  },

  // ========================================
  // CONFIDENTIAL FOOTER
  // ========================================
  confidentialFooter: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  confidentialText: {
    fontSize: 7,
    color: colors.lightGray,
    fontStyle: "italic",
  },
  pageNumber: {
    fontSize: 8,
    color: colors.mediumGray,
  },

  // Utility
  bold: {
    fontWeight: "bold",
  },
});

// ============================================================================
// TYPES
// ============================================================================

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
  clientName: string;
  preparedBy: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

const getScoreColor = (score: number): string => {
  if (score >= 80) return colors.emerald;
  if (score >= 60) return colors.amber;
  return colors.primary;
};

const getScoreStatus = (score: number): string => {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  return "Needs Focus";
};

// ============================================================================
// NARRATIVE GENERATORS
// ============================================================================

interface DimensionInfo {
  name: string;
  score: number;
  value?: number;
}

const getStageNarrative = (stage: string, score: number, gap: number): string => {
  switch(stage) {
    case 'Early Stage':
      return `At ${score}% value realization, your organization is in the early stages of capturing ambient AI's potential. This isn't unusual for newer deployments — we're seeing similar patterns across organizations at this stage. The ${formatCurrency(gap)} annual opportunity represents value that could be captured with focused optimization.`;
    case 'Developing':
      return `At ${score}% value realization, your organization has made meaningful progress. This is a common inflection point — you've proven the solution works, and the question now is how much of the remaining potential to pursue. The ${formatCurrency(gap)} opportunity is real and achievable.`;
    case 'Optimized':
      return `At ${score}% value realization, your organization is performing above average. You're capturing meaningful value from ambient AI. The remaining ${formatCurrency(gap)} represents optimization opportunity that could compound your already-strong results.`;
    case 'Transformed':
      return `At ${score}% value realization, your organization is among the top performers in ambient AI adoption. You're capturing the vast majority of available value. The remaining ${formatCurrency(gap)} represents fine-tuning opportunity.`;
    default:
      return `At ${score}% value realization, your organization has room to optimize ambient AI performance. The ${formatCurrency(gap)} annual opportunity awaits.`;
  }
};

const getPrimaryRecommendation = (lowest: DimensionInfo, highest: DimensionInfo): string => {
  return `Your data shows ${lowest.name} as your biggest opportunity area (${lowest.score}% of benchmark), while ${highest.name} is your relative strength (${highest.score}%). Focused attention on ${lowest.name} could yield meaningful returns without disrupting what's already working.`;
};

const getRiskStatement = (stage: string, gap: number, monthlyGap: number): string => {
  return `Each month represents approximately ${formatCurrency(monthlyGap)} in additional potential value. Organizations at the "${stage}" stage sometimes see gradual changes over time — the key is intentional optimization rather than hoping for organic improvement.`;
};

const getDimensionRankings = (scores: { utilization: number; efficiency: number; quality: number; satisfaction: number }): { lowest: DimensionInfo; highest: DimensionInfo } => {
  const dimensions: DimensionInfo[] = [
    { name: 'Utilization', score: scores.utilization },
    { name: 'Efficiency', score: scores.efficiency },
    { name: 'Quality', score: scores.quality },
    { name: 'Satisfaction', score: scores.satisfaction },
  ];
  
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  return {
    lowest: sorted[0],
    highest: sorted[sorted.length - 1],
  };
};

interface NextStepsContent {
  focusArea: string;
  whyThis: string;
  quickWins: string[];
  deeperDives: string[];
}

const getStrategicNextSteps = (lowestDimension: DimensionInfo): NextStepsContent => {
  switch(lowestDimension.name) {
    case 'Utilization':
      return {
        focusArea: 'Adoption & Habits',
        whyThis: `At ${lowestDimension.score}% of benchmark, many encounters aren't capturing ambient AI value. Building consistent usage is the foundation for all other value.`,
        quickWins: [
          '• Identify top 10 non-users and understand their barriers',
          '• Review workflow friction points — login, devices, room setup',
          '• Create specialty-specific quick-start guides',
        ],
        deeperDives: [
          '• Analyze utilization by department to find patterns',
          '• Consider peer champion programs in high-adoption areas',
          '• Review training effectiveness and refresh content',
        ],
      };
    case 'Efficiency':
      return {
        focusArea: 'Time Savings',
        whyThis: `At ${lowestDimension.score}% of benchmark, providers aren't experiencing the full time-saving promise. This often creates skepticism about value.`,
        quickWins: [
          '• Survey providers on what they\'re editing most',
          '• Review EHR integration for unnecessary steps',
          '• Check template configurations against best practices',
        ],
        deeperDives: [
          '• Analyze note editing patterns to identify issues',
          '• Work with EHR team on reducing workflow friction',
          '• Consider specialty-specific optimization sessions',
        ],
      };
    case 'Quality':
      return {
        focusArea: 'Documentation & Revenue',
        whyThis: `At ${lowestDimension.score}% of benchmark, documentation improvements aren't translating to coding accuracy. This is often the largest dollar opportunity.`,
        quickWins: [
          '• Connect with coding team for AI note feedback',
          '• Review HCC capture rates before vs. after',
          '• Identify specialties with documentation gaps',
        ],
        deeperDives: [
          '• Establish coder feedback loop for AI documentation',
          '• Analyze wRVU patterns to identify coaching needs',
          '• Review note complexity vs. billing support',
        ],
      };
    case 'Satisfaction':
      return {
        focusArea: 'Provider Experience',
        whyThis: `At ${lowestDimension.score}% of benchmark, provider sentiment predicts future adoption. Understanding dissatisfaction now prevents decline later.`,
        quickWins: [
          '• Conduct quick interviews with dissatisfied providers',
          '• Review support tickets for recurring themes',
          '• Check if dissatisfaction correlates with specialties',
        ],
        deeperDives: [
          '• Map satisfaction to efficiency — are unhappy providers saving time?',
          '• Review onboarding for recently started providers',
          '• Consider whether expectations were set accurately',
        ],
      };
    default:
      return {
        focusArea: 'Optimization',
        whyThis: 'Targeted intervention on your weakest dimension typically yields the highest ROI.',
        quickWins: ['• Gather data on specific pain points', '• Identify quick fixes with minimal disruption'],
        deeperDives: ['• Develop comprehensive optimization roadmap', '• Engage vendor partnership for support'],
      };
  }
};

// ============================================================================
// SVG COMPONENTS
// ============================================================================

// SpectrumBar removed - replaced with cleaner score calculation card

// ============================================================================
// DIMENSION EDUCATION CONTENT
// ============================================================================

const DimensionEducation = {
  utilization: {
    definition: "The percentage of encounters where ambient AI is used for documentation.",
    whyMatters: "Every encounter not using ambient AI is an encounter where providers still carry the full documentation burden. Low utilization means you're paying for capacity that isn't being used.",
    whatDrives: "Workflow integration, provider habits, technical friction, and whether the tool feels natural in clinical environments.",
  },
  efficiency: {
    definition: "Average time saved per encounter when ambient AI is used.",
    whyMatters: "This is the core promise: giving time back to providers. Less time saved means the documentation burden persists, even when the tool is being used.",
    whatDrives: "Note quality out of the box, editing frequency, template optimization, and EHR integration smoothness.",
  },
  quality: {
    definition: "Documentation improvement measured through wRVU capture — a proxy for whether notes support appropriate reimbursement.",
    whyMatters: "Better documentation leads to better coding, which leads to better reimbursement. Often the largest dollar opportunity because improvements compound across thousands of encounters.",
    whatDrives: "Clinical detail capture, coder feedback loops, and whether notes reflect the complexity of care actually delivered.",
  },
  satisfaction: {
    definition: "Provider satisfaction — typically measured through NPS or likelihood to recommend.",
    whyMatters: "Satisfaction is a leading indicator. Dissatisfied providers use solutions less over time, creating a downward spiral. Happy providers become champions.",
    whatDrives: "Note accuracy, time actually saved, reliability, and whether it genuinely makes their day better.",
  },
};

// ============================================================================
// PDF DOCUMENT COMPONENT
// ============================================================================

const AmbientPDFDocument = ({ inputs, calculations, clientName, preparedBy }: AmbientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Core calculations
  const encountersAtBenchmark = Math.round((inputs.annualEncounters || 150000) * (ABRIDGE_BENCHMARKS.utilization / 100));
  const monthlyGap = Math.round(calculations.annualGap / 12);
  
  // Dimension rankings
  const dimensionRankings = getDimensionRankings({
    utilization: calculations.utilizationScore,
    efficiency: calculations.efficiencyScore,
    quality: calculations.qualityScore,
    satisfaction: calculations.satisfactionScore,
  });

  const lowestDimension = {
    name: dimensionRankings.lowest.name,
    score: dimensionRankings.lowest.score,
  };

  const nextSteps = getStrategicNextSteps(lowestDimension);

  // Gap breakdown
  const utilizationGapValue = calculations.utilizationGapValue;
  const efficiencyGapValue = calculations.efficiencyGapValue;
  const qualityGapValue = calculations.wrvuGapValue;

  // Efficiency calc details
  const efficiencyTimeDiff = ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter;
  const efficiencyHoursGap = Math.round((efficiencyTimeDiff / 60) * encountersAtBenchmark);

  // Quality calc details
  const wrvuGapPercent = ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift;
  const additionalWrvu = Math.round(encountersAtBenchmark * 1.5 * (wrvuGapPercent / 100));

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1: THE EXECUTIVE STORY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        {/* Premium Header */}
        <View style={styles.premiumHeader}>
          <View style={styles.premiumHeaderTop}>
            <Image src={abridgeLogoPath} style={{ width: 100, height: 20 }} />
            <View style={styles.premiumHeaderRight}>
              <Text style={styles.premiumDocType}>VALUE REALIZATION ASSESSMENT</Text>
              <Text style={styles.premiumDate}>{today}</Text>
            </View>
          </View>
          <View style={styles.premiumHeaderClient}>
            <View>
              <Text style={styles.premiumPreparedLabel}>PREPARED FOR</Text>
              <Text style={styles.premiumClientName}>{clientName}</Text>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text style={styles.premiumPreparedLabel}>PREPARED BY</Text>
              <Text style={styles.premiumPreparedBy}>{preparedBy}</Text>
            </View>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={styles.execSummary}>
          <View style={styles.execSummaryHeader}>
            <Text style={styles.execSummaryTitle}>EXECUTIVE SUMMARY</Text>
          </View>
          <View style={styles.execSummaryContent}>
            <Text style={styles.execBullet}>
              • <Text style={styles.execHighlight}>{formatCurrency(calculations.annualGap)} annual opportunity</Text> — additional value that could be captured from your ambient AI investment
            </Text>
            <Text style={styles.execBullet}>
              • <Text style={styles.execBulletBold}>{calculations.realizationScore}% value realization</Text> — you're capturing {calculations.realizationScore} cents of every dollar of potential value
            </Text>
            <Text style={styles.execBullet}>
              • <Text style={styles.execBulletBold}>{lowestDimension.name} is your primary opportunity</Text> — at {lowestDimension.score}% of benchmark, this is where focused effort may yield the greatest returns
            </Text>
            <Text style={styles.execBullet}>
              • <Text style={styles.execBulletBold}>{formatCurrency(calculations.threeYearGap)} potential over 3 years</Text> — based on Abridge customer benchmarks
            </Text>
          </View>
        </View>

        {/* Context */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>UNDERSTANDING VALUE REALIZATION</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Ambient AI creates value through four dimensions: utilization (encounter coverage), efficiency (time savings), quality (wRVU lift), and satisfaction (provider adoption). Most organizations capture 30-60% of potential value because optimization requires all four dimensions working together.
        </Text>

        {/* Hero Metrics */}
        <View style={styles.heroMetricsGrid}>
          <View style={styles.heroMetricCardPrimary}>
            <Text style={styles.heroMetricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.heroMetricLabel}>Annual Opportunity</Text>
            <Text style={styles.heroMetricDescription}>Additional value based on benchmarks</Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricValue}>{calculations.realizationScore}%</Text>
            <Text style={styles.heroMetricLabel}>Value Realized</Text>
            <Text style={styles.heroMetricDescription}>Of potential being captured today</Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.heroMetricLabel}>3-Year Potential</Text>
            <Text style={styles.heroMetricDescription}>Cumulative opportunity</Text>
          </View>
          <View style={[styles.heroMetricCard, styles.heroMetricCardLast]}>
            <Text style={styles.heroMetricValue}>{calculations.maturityLevel}</Text>
            <Text style={styles.heroMetricLabel}>Maturity Stage</Text>
            <Text style={styles.heroMetricDescription}>On the optimization spectrum</Text>
          </View>
        </View>

        {/* Findings Narrative */}
        <View style={styles.findingsBox}>
          <Text style={styles.findingsTitle}>OUR FINDINGS</Text>
          <Text style={styles.findingsNarrative}>
            {getStageNarrative(calculations.maturityLevel, calculations.realizationScore, calculations.annualGap)}
          </Text>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>Primary Opportunity</Text>
            <Text style={styles.findingsText}>
              {getPrimaryRecommendation(dimensionRankings.lowest, dimensionRankings.highest)}
            </Text>
          </View>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>What This Means</Text>
            <Text style={styles.findingsText}>
              {getRiskStatement(calculations.maturityLevel, calculations.annualGap, monthlyGap)}
            </Text>
          </View>

          {/* Dimension Summary Table */}
          <View style={styles.dimensionTable}>
            <View style={styles.dimensionTableHeader}>
              <View style={styles.dimensionTableCol1}>
                <Text style={styles.tableHeaderText}>Dimension</Text>
              </View>
              <View style={styles.dimensionTableCol2}>
                <Text style={styles.tableHeaderText}>You</Text>
              </View>
              <View style={styles.dimensionTableCol3}>
                <Text style={styles.tableHeaderText}>Benchmark</Text>
              </View>
              <View style={styles.dimensionTableCol4}>
                <Text style={styles.tableHeaderText}>% of Benchmark</Text>
              </View>
            </View>
            <View style={styles.dimensionTableRow}>
              <View style={styles.dimensionTableCol1}>
                <Text style={styles.tableBodyTextBold}>Utilization</Text>
              </View>
              <View style={styles.dimensionTableCol2}>
                <Text style={styles.tableBodyText}>{inputs.utilization}%</Text>
              </View>
              <View style={styles.dimensionTableCol3}>
                <Text style={styles.tableBodyText}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
              <View style={styles.dimensionTableCol4}>
                <Text style={[styles.tableBodyTextBold, { color: getScoreColor(calculations.utilizationScore) }]}>
                  {calculations.utilizationScore}%
                </Text>
              </View>
            </View>
            <View style={styles.dimensionTableRow}>
              <View style={styles.dimensionTableCol1}>
                <Text style={styles.tableBodyTextBold}>Efficiency</Text>
              </View>
              <View style={styles.dimensionTableCol2}>
                <Text style={styles.tableBodyText}>{inputs.timeSavedPerEncounter} min</Text>
              </View>
              <View style={styles.dimensionTableCol3}>
                <Text style={styles.tableBodyText}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              </View>
              <View style={styles.dimensionTableCol4}>
                <Text style={[styles.tableBodyTextBold, { color: getScoreColor(calculations.efficiencyScore) }]}>
                  {calculations.efficiencyScore}%
                </Text>
              </View>
            </View>
            <View style={styles.dimensionTableRow}>
              <View style={styles.dimensionTableCol1}>
                <Text style={styles.tableBodyTextBold}>Quality (wRVU)</Text>
              </View>
              <View style={styles.dimensionTableCol2}>
                <Text style={styles.tableBodyText}>+{inputs.wrvuLift}%</Text>
              </View>
              <View style={styles.dimensionTableCol3}>
                <Text style={styles.tableBodyText}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
              <View style={styles.dimensionTableCol4}>
                <Text style={[styles.tableBodyTextBold, { color: getScoreColor(calculations.qualityScore) }]}>
                  {calculations.qualityScore}%
                </Text>
              </View>
            </View>
            <View style={styles.dimensionTableRowLast}>
              <View style={styles.dimensionTableCol1}>
                <Text style={styles.tableBodyTextBold}>Satisfaction</Text>
              </View>
              <View style={styles.dimensionTableCol2}>
                <Text style={styles.tableBodyText}>{inputs.satisfaction}%</Text>
              </View>
              <View style={styles.dimensionTableCol3}>
                <Text style={styles.tableBodyText}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
              <View style={styles.dimensionTableCol4}>
                <Text style={[styles.tableBodyTextBold, { color: getScoreColor(calculations.satisfactionScore) }]}>
                  {calculations.satisfactionScore}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How Your Score is Calculated - Matches Web UX */}
        <View style={styles.scoreCalcContainer}>
          <View style={styles.scoreCalcHeader}>
            <View style={styles.scoreCalcIcon}>
              <Text style={{ color: colors.white, fontSize: 8, fontWeight: "bold" }}>!</Text>
            </View>
            <Text style={styles.scoreCalcTitle}>How Your Score is Calculated</Text>
          </View>
          <Text style={styles.scoreCalcSubtitle}>
            Your realization score is a simple average of how you perform across all four dimensions:
          </Text>
          
          <View style={styles.scoreCalcRow}>
            <Text style={styles.scoreCalcRowLabel}>Utilization</Text>
            <Text style={styles.scoreCalcRowValue}>{calculations.utilizationScore}%</Text>
          </View>
          <View style={styles.scoreCalcRow}>
            <Text style={styles.scoreCalcRowLabel}>Efficiency</Text>
            <Text style={styles.scoreCalcRowValue}>{calculations.efficiencyScore}%</Text>
          </View>
          <View style={styles.scoreCalcRow}>
            <Text style={styles.scoreCalcRowLabel}>Quality</Text>
            <Text style={styles.scoreCalcRowValue}>{calculations.qualityScore}%</Text>
          </View>
          <View style={styles.scoreCalcRow}>
            <Text style={styles.scoreCalcRowLabel}>Satisfaction</Text>
            <Text style={styles.scoreCalcRowValue}>{calculations.satisfactionScore}%</Text>
          </View>
          
          <View style={styles.scoreCalcDivider} />
          
          <View style={styles.scoreCalcTotalRow}>
            <Text style={styles.scoreCalcTotalLabel}>Average Score</Text>
            <Text style={styles.scoreCalcTotalValue}>{calculations.realizationScore}%</Text>
          </View>
          
          <Text style={styles.scoreCalcExplanation}>
            At {calculations.realizationScore}% realization, you're in the "{calculations.maturityLevel}" stage. The gap between where you are and where you could be represents approximately {formatCurrency(calculations.annualGap)} annually.
          </Text>
        </View>

        <View style={styles.confidentialFooter}>
          <Text style={styles.confidentialText}>CONFIDENTIAL — Prepared exclusively for {clientName}</Text>
          <Text style={styles.pageNumber}>Page 1 of 4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 2: THE FOUR DIMENSIONS DEEP-DIVE */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Image src={abridgeLogoPath} style={{ width: 80, height: 16 }} />
            <Text style={styles.pageHeaderClient}>{clientName}</Text>
          </View>
          <Text style={styles.pageHeaderTitle}>Value Realization Assessment</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>EXHIBIT 1: YOUR PERFORMANCE ACROSS FOUR DIMENSIONS</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Value realization depends on performance in four interconnected areas. Weakness in one dimension limits the others — gaps multiply, they don't just add up.
        </Text>

        {/* Utilization Card */}
        <View style={styles.dimensionCard}>
          <View style={[styles.dimensionCardHeader, { backgroundColor: colors.blueLight }]}>
            <View style={styles.dimensionCardHeaderLeft}>
              <View style={[styles.dimensionCardIcon, { backgroundColor: colors.blue }]}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: "bold" }}>U</Text>
              </View>
              <Text style={styles.dimensionCardName}>UTILIZATION</Text>
            </View>
            <Text style={[styles.dimensionCardScore, { color: getScoreColor(calculations.utilizationScore) }]}>
              {calculations.utilizationScore}%
            </Text>
          </View>
          <View style={styles.dimensionCardMetrics}>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>{inputs.utilization}%</Text>
              <Text style={styles.dimensionCardMetricLabel}>Your Rate</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
              <Text style={styles.dimensionCardMetricLabel}>Benchmark</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={[styles.dimensionCardMetricValue, { color: getScoreColor(calculations.utilizationScore) }]}>
                {getScoreStatus(calculations.utilizationScore)}
              </Text>
              <Text style={styles.dimensionCardMetricLabel}>Status</Text>
            </View>
          </View>
          <View style={styles.dimensionCardBar}>
            <View style={[styles.dimensionCardBarFill, { 
              width: `${Math.min(100, calculations.utilizationScore)}%`,
              backgroundColor: getScoreColor(calculations.utilizationScore)
            }]} />
          </View>
          <View style={styles.dimensionCardBody}>
            <Text style={styles.dimensionCardEducation}>
              {DimensionEducation.utilization.whyMatters} {DimensionEducation.utilization.whatDrives}
            </Text>
            {calculations.utilizationScore < 70 && (
              <View style={styles.dimensionCardInsight}>
                <Text style={styles.dimensionCardInsightText}>
                  At {calculations.utilizationScore}% of benchmark, there's significant room to increase adoption. Common causes include inconsistent habits, workflow friction, or providers who tried it early and didn't return.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Efficiency Card */}
        <View style={styles.dimensionCard}>
          <View style={[styles.dimensionCardHeader, { backgroundColor: colors.purpleLight }]}>
            <View style={styles.dimensionCardHeaderLeft}>
              <View style={[styles.dimensionCardIcon, { backgroundColor: colors.purple }]}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: "bold" }}>E</Text>
              </View>
              <Text style={styles.dimensionCardName}>EFFICIENCY</Text>
            </View>
            <Text style={[styles.dimensionCardScore, { color: getScoreColor(calculations.efficiencyScore) }]}>
              {calculations.efficiencyScore}%
            </Text>
          </View>
          <View style={styles.dimensionCardMetrics}>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>{inputs.timeSavedPerEncounter} min</Text>
              <Text style={styles.dimensionCardMetricLabel}>Your Savings</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              <Text style={styles.dimensionCardMetricLabel}>Benchmark</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={[styles.dimensionCardMetricValue, { color: getScoreColor(calculations.efficiencyScore) }]}>
                {getScoreStatus(calculations.efficiencyScore)}
              </Text>
              <Text style={styles.dimensionCardMetricLabel}>Status</Text>
            </View>
          </View>
          <View style={styles.dimensionCardBar}>
            <View style={[styles.dimensionCardBarFill, { 
              width: `${Math.min(100, calculations.efficiencyScore)}%`,
              backgroundColor: getScoreColor(calculations.efficiencyScore)
            }]} />
          </View>
          <View style={styles.dimensionCardBody}>
            <Text style={styles.dimensionCardEducation}>
              {DimensionEducation.efficiency.whyMatters} {DimensionEducation.efficiency.whatDrives}
            </Text>
            {calculations.efficiencyScore < 70 && (
              <View style={styles.dimensionCardInsight}>
                <Text style={styles.dimensionCardInsightText}>
                  At {calculations.efficiencyScore}% of benchmark, providers may be spending significant time editing notes after generation. This often indicates template issues, trust issues with the AI output, or workflow problems.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quality Card */}
        <View style={styles.dimensionCard}>
          <View style={[styles.dimensionCardHeader, { backgroundColor: colors.emeraldLight }]}>
            <View style={styles.dimensionCardHeaderLeft}>
              <View style={[styles.dimensionCardIcon, { backgroundColor: colors.emerald }]}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: "bold" }}>Q</Text>
              </View>
              <Text style={styles.dimensionCardName}>QUALITY (wRVU)</Text>
            </View>
            <Text style={[styles.dimensionCardScore, { color: getScoreColor(calculations.qualityScore) }]}>
              {calculations.qualityScore}%
            </Text>
          </View>
          <View style={styles.dimensionCardMetrics}>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>+{inputs.wrvuLift}%</Text>
              <Text style={styles.dimensionCardMetricLabel}>Your Lift</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              <Text style={styles.dimensionCardMetricLabel}>Benchmark</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={[styles.dimensionCardMetricValue, { color: getScoreColor(calculations.qualityScore) }]}>
                {getScoreStatus(calculations.qualityScore)}
              </Text>
              <Text style={styles.dimensionCardMetricLabel}>Status</Text>
            </View>
          </View>
          <View style={styles.dimensionCardBar}>
            <View style={[styles.dimensionCardBarFill, { 
              width: `${Math.min(100, calculations.qualityScore)}%`,
              backgroundColor: getScoreColor(calculations.qualityScore)
            }]} />
          </View>
          <View style={styles.dimensionCardBody}>
            <Text style={styles.dimensionCardEducation}>
              {DimensionEducation.quality.whyMatters} {DimensionEducation.quality.whatDrives}
            </Text>
            {calculations.qualityScore < 70 && (
              <View style={styles.dimensionCardInsight}>
                <Text style={styles.dimensionCardInsightText}>
                  At {calculations.qualityScore}% of benchmark, documentation quality improvement is lagging. This could be the largest dollar opportunity — review whether notes are capturing clinical complexity that supports accurate coding.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Satisfaction Card */}
        <View style={styles.dimensionCard}>
          <View style={[styles.dimensionCardHeader, { backgroundColor: colors.amberLight }]}>
            <View style={styles.dimensionCardHeaderLeft}>
              <View style={[styles.dimensionCardIcon, { backgroundColor: colors.amber }]}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: "bold" }}>S</Text>
              </View>
              <Text style={styles.dimensionCardName}>SATISFACTION</Text>
            </View>
            <Text style={[styles.dimensionCardScore, { color: getScoreColor(calculations.satisfactionScore) }]}>
              {calculations.satisfactionScore}%
            </Text>
          </View>
          <View style={styles.dimensionCardMetrics}>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>{inputs.satisfaction}%</Text>
              <Text style={styles.dimensionCardMetricLabel}>Your Score</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={styles.dimensionCardMetricValue}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              <Text style={styles.dimensionCardMetricLabel}>Benchmark</Text>
            </View>
            <View style={styles.dimensionCardMetric}>
              <Text style={[styles.dimensionCardMetricValue, { color: getScoreColor(calculations.satisfactionScore) }]}>
                {getScoreStatus(calculations.satisfactionScore)}
              </Text>
              <Text style={styles.dimensionCardMetricLabel}>Status</Text>
            </View>
          </View>
          <View style={styles.dimensionCardBar}>
            <View style={[styles.dimensionCardBarFill, { 
              width: `${Math.min(100, calculations.satisfactionScore)}%`,
              backgroundColor: getScoreColor(calculations.satisfactionScore)
            }]} />
          </View>
          <View style={styles.dimensionCardBody}>
            <Text style={styles.dimensionCardEducation}>
              {DimensionEducation.satisfaction.whyMatters} {DimensionEducation.satisfaction.whatDrives}
            </Text>
            {calculations.satisfactionScore < 75 && (
              <View style={styles.dimensionCardInsight}>
                <Text style={styles.dimensionCardInsightText}>
                  At {calculations.satisfactionScore}% of benchmark, satisfaction is a concern. Understanding WHY providers are dissatisfied is critical — low satisfaction often predicts declining utilization.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.confidentialFooter}>
          <Text style={styles.confidentialText}>CONFIDENTIAL — Prepared exclusively for {clientName}</Text>
          <Text style={styles.pageNumber}>Page 2 of 4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: THE MATH - TRANSPARENT CALCULATIONS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Image src={abridgeLogoPath} style={{ width: 80, height: 16 }} />
            <Text style={styles.pageHeaderClient}>{clientName}</Text>
          </View>
          <Text style={styles.pageHeaderTitle}>Value Realization Assessment</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>EXHIBIT 2: HOW EACH OPPORTUNITY IS CALCULATED</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Every number can be traced back to your inputs and transparent assumptions. No black boxes — you can verify each step.
        </Text>

        {/* Utilization Opportunity */}
        {utilizationGapValue > 0 && (
          <View style={styles.opportunityCard}>
            <View style={styles.opportunityCardHeader}>
              <Text style={styles.opportunityCardTitle}>Utilization Opportunity</Text>
              <Text style={styles.opportunityCardValue}>{formatCurrency(utilizationGapValue)}</Text>
            </View>
            <View style={styles.opportunityCardInputs}>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>{inputs.utilization}%</Text>
                <Text style={styles.opportunityCardInputLabel}>Your Rate</Text>
              </View>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
                <Text style={styles.opportunityCardInputLabel}>Benchmark</Text>
              </View>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>{ABRIDGE_BENCHMARKS.utilization - inputs.utilization}pp</Text>
                <Text style={styles.opportunityCardInputLabel}>Gap</Text>
              </View>
            </View>
            <View style={styles.opportunityCardSteps}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Encounters at benchmark utilization</Text>
                  <Text style={styles.stepMath}>{formatNumber(inputs.annualEncounters || 150000)} × {ABRIDGE_BENCHMARKS.utilization}% = <Text style={styles.stepResult}>{formatNumber(encountersAtBenchmark)} enc</Text></Text>
                </View>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Gap encounters (not documented today)</Text>
                  <Text style={styles.stepMath}>{formatNumber(encountersAtBenchmark)} - {formatNumber(Math.round((inputs.annualEncounters || 150000) * (inputs.utilization / 100)))} = <Text style={styles.stepResult}>{formatNumber(calculations.encounterGap)} enc</Text></Text>
                </View>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Potential time savings if documented</Text>
                  <Text style={styles.stepMath}>{formatNumber(calculations.encounterGap)} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min ÷ 60 = <Text style={styles.stepResult}>{formatNumber(Math.round(calculations.encounterGap * ABRIDGE_BENCHMARKS.timeSavedAvg / 60))} hours</Text></Text>
                </View>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Value conversion (conservative {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% rate)</Text>
                  <Text style={styles.stepMath}>{formatNumber(Math.round(calculations.encounterGap * ABRIDGE_BENCHMARKS.timeSavedAvg / 60))} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = <Text style={styles.stepResult}>{formatCurrency(utilizationGapValue)}</Text></Text>
                </View>
              </View>
              <View style={styles.resultRow}>
                <View style={styles.resultCheck}><Text style={styles.resultCheckText}>✓</Text></View>
                <Text style={styles.resultLabel}>Annual utilization opportunity: {formatCurrency(utilizationGapValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Efficiency Opportunity */}
        {efficiencyGapValue > 0 && (
          <View style={styles.opportunityCard}>
            <View style={styles.opportunityCardHeader}>
              <Text style={styles.opportunityCardTitle}>Efficiency Opportunity</Text>
              <Text style={styles.opportunityCardValue}>{formatCurrency(efficiencyGapValue)}</Text>
            </View>
            <View style={styles.opportunityCardInputs}>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>{inputs.timeSavedPerEncounter} min</Text>
                <Text style={styles.opportunityCardInputLabel}>Your Savings</Text>
              </View>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
                <Text style={styles.opportunityCardInputLabel}>Benchmark</Text>
              </View>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>{efficiencyTimeDiff.toFixed(1)} min</Text>
                <Text style={styles.opportunityCardInputLabel}>Gap</Text>
              </View>
            </View>
            <View style={styles.opportunityCardSteps}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Additional time possible at benchmark efficiency</Text>
                  <Text style={styles.stepMath}>{formatNumber(encountersAtBenchmark)} enc × {efficiencyTimeDiff.toFixed(1)} min ÷ 60 = <Text style={styles.stepResult}>{formatNumber(efficiencyHoursGap)} hours</Text></Text>
                </View>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Value conversion ({VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% rate — not all time converts)</Text>
                  <Text style={styles.stepMath}>{formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = <Text style={styles.stepResult}>{formatCurrency(efficiencyGapValue)}</Text></Text>
                </View>
              </View>
              <View style={styles.resultRow}>
                <View style={styles.resultCheck}><Text style={styles.resultCheckText}>✓</Text></View>
                <Text style={styles.resultLabel}>Annual efficiency opportunity: {formatCurrency(efficiencyGapValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quality Opportunity */}
        {qualityGapValue > 0 && (
          <View style={styles.opportunityCard}>
            <View style={styles.opportunityCardHeader}>
              <Text style={styles.opportunityCardTitle}>Quality Opportunity (wRVU)</Text>
              <Text style={styles.opportunityCardValue}>{formatCurrency(qualityGapValue)}</Text>
            </View>
            <View style={styles.opportunityCardInputs}>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>+{inputs.wrvuLift}%</Text>
                <Text style={styles.opportunityCardInputLabel}>Your Lift</Text>
              </View>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
                <Text style={styles.opportunityCardInputLabel}>Benchmark</Text>
              </View>
              <View style={styles.opportunityCardInput}>
                <Text style={styles.opportunityCardInputValue}>+{wrvuGapPercent.toFixed(1)}%</Text>
                <Text style={styles.opportunityCardInputLabel}>Gap</Text>
              </View>
            </View>
            <View style={styles.opportunityCardSteps}>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Additional wRVU at benchmark quality</Text>
                  <Text style={styles.stepMath}>{formatNumber(encountersAtBenchmark)} enc × 1.5 avg wRVU × {wrvuGapPercent.toFixed(1)}% = <Text style={styles.stepResult}>{formatNumber(additionalWrvu)} wRVU</Text></Text>
                </View>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Dollar value ({VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution — conservative)</Text>
                  <Text style={styles.stepMath}>{formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = <Text style={styles.stepResult}>{formatCurrency(qualityGapValue)}</Text></Text>
                </View>
              </View>
              <View style={styles.resultRow}>
                <View style={styles.resultCheck}><Text style={styles.resultCheckText}>✓</Text></View>
                <Text style={styles.resultLabel}>Annual quality opportunity: {formatCurrency(qualityGapValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Total Opportunity Box */}
        <View style={styles.totalOpportunityBox}>
          <View>
            <Text style={styles.totalOpportunityLabel}>TOTAL ANNUAL OPPORTUNITY</Text>
            <Text style={styles.totalOpportunityBreakdown}>
              {utilizationGapValue > 0 ? `Utilization (${formatCurrency(utilizationGapValue)})` : ''}
              {utilizationGapValue > 0 && efficiencyGapValue > 0 ? ' + ' : ''}
              {efficiencyGapValue > 0 ? `Efficiency (${formatCurrency(efficiencyGapValue)})` : ''}
              {(utilizationGapValue > 0 || efficiencyGapValue > 0) && qualityGapValue > 0 ? ' + ' : ''}
              {qualityGapValue > 0 ? `Quality (${formatCurrency(qualityGapValue)})` : ''}
            </Text>
          </View>
          <Text style={styles.totalOpportunityValue}>{formatCurrency(calculations.annualGap)}</Text>
        </View>

        {/* Timeline Chart */}
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>THE OPPORTUNITY OVER TIME</Text>
          <Text style={styles.timelineSubtitle}>Cumulative potential based on Abridge customer benchmarks</Text>
          
          <View style={styles.timelineChart}>
            <View style={styles.timelineBar}>
              <View style={[styles.timelineBarFill, { height: 25 }]} />
              <Text style={styles.timelineBarValue}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.timelineBarLabel}>Year 1</Text>
            </View>
            <View style={styles.timelineBar}>
              <View style={[styles.timelineBarFill, { height: 45 }]} />
              <Text style={styles.timelineBarValue}>{formatCurrency(calculations.annualGap * 2)}</Text>
              <Text style={styles.timelineBarLabel}>Year 2</Text>
            </View>
            <View style={styles.timelineBar}>
              <View style={[styles.timelineBarFill, { height: 65 }]} />
              <Text style={styles.timelineBarValue}>{formatCurrency(calculations.threeYearGap)}</Text>
              <Text style={styles.timelineBarLabel}>Year 3</Text>
            </View>
          </View>
          
          <View style={styles.timelineTotalBox}>
            <Text style={styles.timelineTotalLabel}>Total opportunity:</Text>
            <Text style={styles.timelineTotalValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.timelineTotalPeriod}>over 3 years</Text>
          </View>
        </View>

        <View style={styles.confidentialFooter}>
          <Text style={styles.confidentialText}>CONFIDENTIAL — Prepared exclusively for {clientName}</Text>
          <Text style={styles.pageNumber}>Page 3 of 4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: TAKEAWAYS & NEXT STEPS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Image src={abridgeLogoPath} style={{ width: 80, height: 16 }} />
            <Text style={styles.pageHeaderClient}>{clientName}</Text>
          </View>
          <Text style={styles.pageHeaderTitle}>Value Realization Assessment</Text>
        </View>

        {/* Cost of Waiting */}
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingTitle}>THE COST OF WAITING</Text>
          <Text style={styles.waitingSubtitle}>Every month of delay is value that could have been captured</Text>
          <View style={styles.waitingGrid}>
            <View style={[styles.waitingCardHighlight, styles.waitingCardLast, { marginRight: 8 }]}>
              <Text style={styles.waitingCardLabel}>Close Now</Text>
              <Text style={styles.waitingCardValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.waitingCardNote}>Full Year 1 value</Text>
            </View>
            <View style={styles.waitingCard}>
              <Text style={styles.waitingCardLabel}>Wait 6 Months</Text>
              <Text style={styles.waitingCardValue}>{formatCurrency(calculations.annualGap / 2)}</Text>
              <Text style={styles.waitingCardNote}>Half the first year lost</Text>
            </View>
            <View style={[styles.waitingCard, styles.waitingCardLast]}>
              <Text style={styles.waitingCardLabel}>Wait 12 Months</Text>
              <Text style={styles.waitingCardValue}>$0</Text>
              <Text style={styles.waitingCardNote}>Full year of value lost</Text>
            </View>
          </View>
        </View>

        {/* Key Takeaways */}
        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <Text style={styles.takeawaysItem}>• You're capturing <Text style={styles.bold}>{calculations.realizationScore}%</Text> of ambient AI's potential value</Text>
          <Text style={styles.takeawaysItem}>• The largest opportunity is in <Text style={styles.bold}>{lowestDimension.name}</Text> ({lowestDimension.score}% of benchmark)</Text>
          <Text style={styles.takeawaysItem}>• Capturing this opportunity could mean <Text style={styles.bold}>{formatCurrency(calculations.annualGap)} annually</Text> / {formatCurrency(calculations.threeYearGap)} over 3 years</Text>
          <Text style={styles.takeawaysItem}>• Each month represents approximately <Text style={styles.bold}>{formatCurrency(monthlyGap)}</Text> in potential value</Text>
          <Text style={styles.takeawaysItem}>• All calculations use conservative assumptions — actual value may be higher</Text>
        </View>

        {/* Strategic Next Steps */}
        <View style={styles.nextStepsBox}>
          <View style={styles.nextStepsHeader}>
            <Text style={styles.nextStepsTitle}>RECOMMENDED NEXT STEPS</Text>
            <Text style={styles.nextStepsFocus}>Focus: {nextSteps.focusArea}</Text>
          </View>
          <View style={styles.nextStepsContent}>
            <Text style={styles.nextStepsIntro}>{nextSteps.whyThis}</Text>
            <View style={styles.nextStepsGrid}>
              <View style={styles.nextStepsColumn}>
                <Text style={styles.nextStepsColumnTitle}>Quick Wins (This Week)</Text>
                {nextSteps.quickWins.map((item, i) => (
                  <Text key={i} style={styles.nextStepsItem}>{item}</Text>
                ))}
              </View>
              <View style={styles.nextStepsColumn}>
                <Text style={styles.nextStepsColumnTitle}>Deeper Dives (This Month)</Text>
                {nextSteps.deeperDives.map((item, i) => (
                  <Text key={i} style={styles.nextStepsItem}>{item}</Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Methodology */}
        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>METHODOLOGY & ASSUMPTIONS</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>• {inputs.providers} providers</Text>
              <Text style={styles.methodologyItem}>• {formatNumber(inputs.annualEncounters || 150000)} annual encounters</Text>
              <Text style={styles.methodologyItem}>• {inputs.utilization}% utilization</Text>
              <Text style={styles.methodologyItem}>• {inputs.timeSavedPerEncounter} min time savings/encounter</Text>
              <Text style={styles.methodologyItem}>• +{inputs.wrvuLift}% wRVU lift</Text>
              <Text style={styles.methodologyItem}>• {inputs.satisfaction}% provider satisfaction</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Abridge Benchmarks</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.utilization}% utilization</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.timeSavedAvg} min saved per encounter</Text>
              <Text style={styles.methodologyItem}>• +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU lift</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.satisfaction}% satisfaction</Text>
              <Text style={[styles.methodologyColumnTitle, { marginTop: 8 }]}>Valuation Assumptions</Text>
              <Text style={styles.methodologyItem}>• Provider time: ${VALUE_ASSUMPTIONS.hourlyRate}/hr</Text>
              <Text style={styles.methodologyItem}>• Utilization conversion: {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• Efficiency conversion: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• wRVU: ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU (Medicare CF)</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            Benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on specialty mix, operational factors, and implementation maturity. Conservative conversion rates ensure defensible projections.
          </Text>
        </View>

        {/* Contact CTA */}
        <View style={styles.contactCTA}>
          <Text style={styles.contactCTAText}>
            To discuss these findings and explore how Abridge can help capture this opportunity, contact your Abridge representative.
          </Text>
          <Text style={styles.contactCTAPrepared}>
            This assessment was prepared by: <Text style={{ fontWeight: "bold" }}>{preparedBy}</Text>
          </Text>
        </View>

        <View style={styles.confidentialFooter}>
          <Text style={styles.confidentialText}>CONFIDENTIAL — Prepared exclusively for {clientName}</Text>
          <Text style={styles.pageNumber}>Page 4 of 4</Text>
        </View>
      </Page>
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

export async function generateAmbientPDF(inputs: SwitchInputs, calculations: SwitchCalculations, clientName?: string, preparedBy?: string) {
  const blob = await pdf(
    <AmbientPDFDocument 
      inputs={inputs} 
      calculations={calculations} 
      clientName={clientName || "Your Organization"}
      preparedBy={preparedBy || "Abridge"}
    />
  ).toBlob();
  const today = new Date().toISOString().split("T")[0];
  const sanitizedClientName = (clientName || "organization").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  
  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, `value-assessment-${sanitizedClientName}-${today}.pdf`);
  }
}
