import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// REGISTER MANROPE FONT
// ============================================================================

Font.register({
  family: "Manrope",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSg.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggOxSg.woff2",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggCxSg.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggqxSg.woff2",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggSxSg.woff2",
      fontWeight: 800,
    },
  ],
});

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
// PREMIUM BRAND PALETTE
// ============================================================================

const brand = {
  black: "#0A0A0A",
  white: "#FFFFFF",
  red: "#EA2C00",
  coral: "#F07B5F",
  warmGray: "#F5F4F3",
  lightGray: "#FAFAFA",
  midGray: "#E8E7E6",
  textPrimary: "#1A1A1A",
  textSecondary: "#5C5C5C",
  textTertiary: "#8A8A8A",
  textMuted: "#B0B0B0",
};

// ============================================================================
// PREMIUM TYPOGRAPHY & STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Base page styles
  page: {
    fontFamily: "Manrope",
    fontSize: 10,
    color: brand.textPrimary,
    backgroundColor: brand.white,
  },

  // =========================================================================
  // COVER PAGE - Bold, minimal, one powerful moment
  // =========================================================================
  coverPage: {
    backgroundColor: brand.black,
    height: "100%",
    padding: 0,
  },
  coverTop: {
    padding: 48,
    paddingBottom: 0,
  },
  coverLogo: {
    width: 90,
    height: 18,
    marginBottom: 80,
  },
  coverHero: {
    paddingHorizontal: 48,
    flex: 1,
    justifyContent: "center",
  },
  coverEyebrow: {
    fontSize: 11,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 42,
    fontWeight: 800,
    color: brand.white,
    lineHeight: 1.1,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    color: brand.textTertiary,
    lineHeight: 1.6,
    maxWidth: 400,
    marginBottom: 60,
  },
  coverMetricBlock: {
    marginBottom: 48,
  },
  coverMetricValue: {
    fontSize: 72,
    fontWeight: 800,
    color: brand.coral,
    letterSpacing: -2,
    lineHeight: 1,
  },
  coverMetricLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: brand.textTertiary,
    marginTop: 8,
    letterSpacing: 1,
  },
  coverBottom: {
    padding: 48,
    paddingTop: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverMeta: {
    fontSize: 10,
    color: brand.textTertiary,
    lineHeight: 1.5,
  },
  coverDate: {
    fontSize: 10,
    color: brand.textMuted,
  },

  // =========================================================================
  // CONTENT PAGES
  // =========================================================================
  contentPage: {
    backgroundColor: brand.white,
    padding: 0,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 48,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  headerLogo: {
    width: 70,
    height: 14,
  },
  headerMeta: {
    fontSize: 9,
    color: brand.textTertiary,
    letterSpacing: 0.5,
  },

  content: {
    padding: 48,
    paddingTop: 40,
  },

  // Section headers
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: 700,
    color: brand.red,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: brand.black,
    lineHeight: 1.15,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 32,
    maxWidth: 420,
  },

  // =========================================================================
  // THE STAKES PAGE - Urgency and impact
  // =========================================================================
  stakesHero: {
    backgroundColor: brand.black,
    marginHorizontal: -48,
    marginTop: -40,
    padding: 48,
    marginBottom: 32,
  },
  stakesHeroTitle: {
    fontSize: 32,
    fontWeight: 800,
    color: brand.white,
    lineHeight: 1.15,
    marginBottom: 16,
  },
  stakesHeroSubtitle: {
    fontSize: 13,
    color: brand.textTertiary,
    lineHeight: 1.6,
    maxWidth: 400,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 24,
  },
  statBlock: {
    flex: 1,
    paddingRight: 16,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 800,
    color: brand.red,
    marginBottom: 6,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: brand.textSecondary,
    lineHeight: 1.4,
  },
  narrativeBlock: {
    backgroundColor: brand.warmGray,
    padding: 24,
    marginBottom: 24,
  },
  narrativeText: {
    fontSize: 11,
    fontWeight: 400,
    color: brand.textPrimary,
    lineHeight: 1.7,
  },
  pullQuote: {
    borderLeftWidth: 4,
    borderLeftColor: brand.red,
    paddingLeft: 20,
    paddingVertical: 8,
    marginVertical: 24,
  },
  pullQuoteText: {
    fontSize: 16,
    fontWeight: 700,
    color: brand.black,
    lineHeight: 1.4,
    fontStyle: "italic",
  },

  // =========================================================================
  // EXECUTIVE SUMMARY - The opportunity
  // =========================================================================
  heroMetrics: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 32,
  },
  heroMetricPrimary: {
    flex: 2,
  },
  heroMetricSecondary: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: brand.midGray,
    paddingLeft: 24,
  },
  metricValueLarge: {
    fontSize: 48,
    fontWeight: 800,
    color: brand.red,
    letterSpacing: -1,
    lineHeight: 1,
    marginBottom: 8,
  },
  metricValueMedium: {
    fontSize: 32,
    fontWeight: 700,
    color: brand.black,
    lineHeight: 1,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricContext: {
    fontSize: 9,
    color: brand.textTertiary,
    marginTop: 4,
  },

  valueBreakdown: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 32,
  },
  valueColumn: {
    flex: 1,
  },
  valueColumnHeader: {
    backgroundColor: brand.black,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  valueColumnTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: brand.white,
    letterSpacing: 0.5,
  },
  valueColumnTotal: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.warmGray,
    backgroundColor: brand.lightGray,
  },
  valueRowLabel: {
    fontSize: 10,
    color: brand.textPrimary,
    fontWeight: 500,
  },
  valueRowAmount: {
    fontSize: 10,
    fontWeight: 700,
    color: brand.red,
  },

  insightBox: {
    backgroundColor: brand.black,
    padding: 24,
    marginTop: 24,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: brand.coral,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  insightText: {
    fontSize: 11,
    color: brand.white,
    lineHeight: 1.6,
  },

  // =========================================================================
  // DRIVER DETAIL PAGES - Story-driven calculations
  // =========================================================================
  driverHero: {
    backgroundColor: brand.black,
    marginHorizontal: -48,
    marginTop: -40,
    padding: 48,
    paddingBottom: 40,
    marginBottom: 24,
  },
  driverHeroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  driverHeroLeft: {
    flex: 1,
    paddingRight: 32,
  },
  driverEyebrow: {
    fontSize: 9,
    fontWeight: 700,
    color: brand.coral,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  driverTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: brand.white,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  driverTheory: {
    fontSize: 11,
    color: brand.textTertiary,
    lineHeight: 1.6,
  },
  driverHeroRight: {
    alignItems: "flex-end",
  },
  driverValueLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  driverValueAmount: {
    fontSize: 40,
    fontWeight: 800,
    color: brand.coral,
    letterSpacing: -1,
  },

  calculationSection: {
    marginBottom: 24,
  },
  calculationTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: brand.black,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  stepContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  stepContainerLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brand.red,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: 700,
    color: brand.white,
  },
  stepQuestion: {
    fontSize: 11,
    fontWeight: 600,
    color: brand.black,
  },
  stepMath: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginLeft: 30,
    marginTop: 8,
  },
  stepInput: {
    backgroundColor: brand.warmGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  stepInputText: {
    fontSize: 11,
    fontWeight: 700,
    color: brand.black,
  },
  stepOperator: {
    fontSize: 12,
    color: brand.textTertiary,
    marginHorizontal: 6,
  },
  stepResult: {
    backgroundColor: brand.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 6,
  },
  stepResultText: {
    fontSize: 11,
    fontWeight: 700,
    color: brand.coral,
  },
  stepNote: {
    fontSize: 9,
    color: brand.textTertiary,
    marginLeft: 30,
    marginTop: 6,
    fontStyle: "italic",
  },

  finalResultBox: {
    backgroundColor: brand.black,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  finalResultLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: brand.white,
  },
  finalResultFormula: {
    fontSize: 9,
    color: brand.textTertiary,
    marginTop: 4,
  },
  finalResultValue: {
    fontSize: 28,
    fontWeight: 800,
    color: brand.coral,
  },

  benchmarkBox: {
    backgroundColor: brand.warmGray,
    padding: 20,
    marginTop: 20,
  },
  benchmarkLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: brand.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  benchmarkText: {
    fontSize: 10,
    color: brand.textPrimary,
    lineHeight: 1.5,
    fontStyle: "italic",
  },

  // =========================================================================
  // PROJECTION PAGE
  // =========================================================================
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.black,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 9,
    fontWeight: 700,
    color: brand.white,
    textAlign: "center",
  },
  tableHeaderCellFirst: {
    flex: 1.2,
    textAlign: "left",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
    backgroundColor: brand.lightGray,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: brand.textPrimary,
    textAlign: "center",
  },
  tableCellFirst: {
    flex: 1.2,
    textAlign: "left",
    fontWeight: 600,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    color: brand.black,
    textAlign: "center",
  },
  tableCellRed: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    color: brand.red,
    textAlign: "center",
  },

  scaleComparison: {
    flexDirection: "row",
    gap: 24,
    marginTop: 24,
  },
  scaleCard: {
    flex: 1,
    backgroundColor: brand.black,
    padding: 24,
  },
  scaleCardLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: brand.coral,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  scaleCardValue: {
    fontSize: 28,
    fontWeight: 800,
    color: brand.white,
    marginBottom: 4,
  },
  scaleCardMeta: {
    fontSize: 10,
    color: brand.textTertiary,
    lineHeight: 1.4,
  },

  // =========================================================================
  // RECOMMENDATIONS PAGE
  // =========================================================================
  phaseContainer: {
    marginBottom: 20,
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  phaseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.red,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: 700,
    color: brand.white,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: 700,
    color: brand.black,
  },
  phaseDuration: {
    fontSize: 10,
    color: brand.textTertiary,
    marginLeft: 8,
  },
  phaseActions: {
    marginLeft: 40,
  },
  phaseAction: {
    flexDirection: "row",
    marginBottom: 6,
  },
  phaseActionBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.red,
    marginRight: 10,
    marginTop: 6,
  },
  phaseActionText: {
    fontSize: 10,
    color: brand.textPrimary,
    lineHeight: 1.5,
    flex: 1,
  },

  urgencyBox: {
    backgroundColor: brand.black,
    padding: 28,
    marginTop: 24,
  },
  urgencyLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: brand.coral,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  urgencyTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: brand.white,
    marginBottom: 12,
  },
  urgencyText: {
    fontSize: 11,
    color: brand.textTertiary,
    lineHeight: 1.6,
    marginBottom: 16,
  },
  urgencyValue: {
    fontSize: 36,
    fontWeight: 800,
    color: brand.coral,
  },
  urgencyValueLabel: {
    fontSize: 11,
    color: brand.textTertiary,
    marginTop: 4,
  },

  // =========================================================================
  // METHODOLOGY PAGE
  // =========================================================================
  principleRow: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  principleNumber: {
    width: 24,
    fontSize: 14,
    fontWeight: 800,
    color: brand.red,
  },
  principleContent: {
    flex: 1,
  },
  principleName: {
    fontSize: 12,
    fontWeight: 700,
    color: brand.black,
    marginBottom: 4,
  },
  principleDescription: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.5,
  },

  inputsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 24,
  },
  inputCard: {
    width: "47%",
    backgroundColor: brand.warmGray,
    padding: 16,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputValue: {
    fontSize: 16,
    fontWeight: 700,
    color: brand.black,
  },

  // =========================================================================
  // FOOTER
  // =========================================================================
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: brand.textTertiary,
    letterSpacing: 0.5,
  },
  footerPageNum: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.textSecondary,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatNumber = (value: number): string => value.toLocaleString();

// ============================================================================
// NARRATIVE CONTENT - Story Arc
// ============================================================================

const narrative = {
  stakes: {
    headline: "Every hour your clinicians spend on documentation is an hour stolen from patient care.",
    stats: [
      { value: "2:1", label: "Hours on documentation for every hour with patients" },
      { value: "49%", label: "Of physicians experiencing burnout symptoms" },
      { value: "$4.6B", label: "Annual cost of burnout to US health systems" },
    ],
    body: "The administrative burden on clinicians has reached a breaking point. Documentation has become the single largest driver of physician dissatisfaction—and the leading cause of preventable turnover. This isn't a technology problem. It's an institutional crisis that requires institutional action.",
    pullQuote: "The question isn't whether to address documentation burden. It's whether you'll lead the change or be forced to react.",
  },

  drivers: {
    patientAccess: {
      theory: "When documentation happens in real-time, clinicians reclaim capacity. That capacity converts to access—more patients seen, shorter wait times, healthier communities served.",
      implication: (value: number, pct: number) => 
        `At ${formatCurrency(value)}, patient access represents ${pct}% of your projected value. This is revenue you're currently leaving on the table—patients who want to be seen but can't get appointments.`,
      benchmark: "Top-performing practices convert 18-22% of reclaimed time to additional patient volume.",
    },
    reducingLocums: {
      theory: "Locum coverage costs 2-3x what employed physicians cost. Every hour of documentation burden translates to coverage gaps that require expensive fill-ins.",
      implication: (value: number) => 
        `The ${formatCurrency(value)} in projected locum reduction isn't theoretical—it's money currently flowing to staffing agencies instead of your organization.`,
      benchmark: "Organizations with high locum spend typically see 15-25% reduction within 18 months of deployment.",
    },
    clinicianWellbeing: {
      theory: "Physician replacement costs $500K-$1M+ per departure. Documentation burden is the leading driver of preventable turnover. Protecting your clinicians protects your bottom line.",
      implication: (value: number, providers: number) => 
        `With ${providers} clinicians, even fractional retention improvement creates ${formatCurrency(value)} in value. This is the cost of departures you won't have to absorb.`,
      benchmark: "Research indicates 20-40% of physician turnover is directly attributable to burnout.",
    },
    wrvu: {
      theory: "Complex medical decision-making often goes undocumented in the rush between patients. When notes capture the complete picture, coding reflects the actual work performed.",
      implication: (value: number) => 
        `This ${formatCurrency(value)} isn't about billing more—it's about billing accurately for complexity you're already delivering.`,
      benchmark: "Studies show 8-15% of encounters are systematically undercoded due to documentation gaps.",
    },
    hcc: {
      theory: "Hierarchical Condition Categories drive risk adjustment in value-based contracts. Conditions that aren't documented can't be coded. Gaps compound year over year.",
      implication: (value: number) => 
        `HCC capture at ${formatCurrency(value)} represents revenue you've already earned through patient care—you're just not capturing it in documentation.`,
      benchmark: "The average Medicare Advantage patient has 3.2 undocumented HCCs worth $1,200-2,400 annually.",
    },
    denials: {
      theory: "Claims denied for documentation gaps require expensive rework—when they're appealed at all. Prevention is dramatically more efficient than recovery.",
      implication: (value: number) => 
        `Denial prevention at ${formatCurrency(value)} is among the most measurable value drivers. You can track denials before and after with clear attribution.`,
      benchmark: "45% of denials stem from documentation issues. 60% of those are preventable with complete notes.",
    },
  },

  recommendations: {
    headline: "Your Path Forward",
    phases: [
      {
        name: "Validate",
        duration: "30 days",
        actions: [
          "Deploy with 5-10 high-volume clinicians",
          "Establish baseline time and satisfaction metrics",
          "Document workflow integration patterns",
        ],
      },
      {
        name: "Prove",
        duration: "60-90 days",
        actions: [
          "Measure time savings and clinician satisfaction",
          "Track coding accuracy improvements",
          "Calculate realized ROI against projections",
        ],
      },
      {
        name: "Scale",
        duration: "Ongoing",
        actions: [
          "Expand to additional clinicians and specialties",
          "Optimize workflows based on learnings",
          "Document and share best practices",
        ],
      },
    ],
    closing: "The organizations that move first don't just capture value—they define how value is created in their markets.",
  },

  methodology: {
    approach: "This model prioritizes transparency over precision. We use conservative assumptions, show our work step-by-step, and make every input editable. The goal isn't to prove a number—it's to give you a defensible framework for thinking about value.",
    principles: [
      { name: "Conservative by default", description: "All realization rates assume imperfect execution. Reality often exceeds these projections." },
      { name: "Transparent calculations", description: "Every number traces back to editable inputs. Challenge anything that doesn't match your reality." },
      { name: "Defensible to skeptics", description: "Built to withstand CFO scrutiny. No hidden assumptions or optimistic leaps." },
    ],
  },
};

const DRIVER_LABELS: Record<string, string> = {
  patientAccess: "Patient Access",
  reducingLocums: "Locum Reduction",
  clinicianWellbeing: "Clinician Wellbeing",
  wrvu: "Level of Service (wRVU)",
  hcc: "HCC Capture",
  denials: "Denial Prevention",
};

function getDriverName(id: string, fallback: string): string {
  return DRIVER_LABELS[id] || fallback;
}

// ============================================================================
// CALCULATION STEPS
// ============================================================================

interface CalculationStep {
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
          question: "How much documentation time does Abridge return?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${data.timeSavedPerEncounter} min` },
          ],
          operators: ["×"],
          result: `${formatNumber(data.hoursReturned)} hours/year`,
        },
        {
          question: "How much time converts to patient access?",
          inputs: [
            { value: formatNumber(data.hoursReturned), label: "hours" },
            { value: `${data.timeAllocation?.patientAccess || 35}%`, label: "allocation" },
          ],
          operators: ["×"],
          result: `${formatNumber(Math.round(data.hoursReturned * (data.timeAllocation?.patientAccess || 35) / 100))} hours`,
        },
        {
          question: "How many additional patients can you see?",
          inputs: [
            { value: formatNumber(Math.round(data.hoursReturned * (data.timeAllocation?.patientAccess || 35) / 100)) },
            { value: "15%", label: "realization" },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.additionalVisits as number) || 0)} patients`,
          note: "Realization accounts for scheduling constraints and room availability.",
        },
        {
          question: "What's the revenue impact?",
          inputs: [
            { value: formatNumber((inputs.additionalVisits as number) || 0) },
            { value: `$${inputs.revenuePerVisit || 200}`, label: "per visit" },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "wrvu":
      return [
        {
          question: "What's your baseline wRVU generation?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.avgWrvuPerEncounter || 1.5}`, label: "wRVU/enc" },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.baselineWrvus as number) || 0)} wRVUs`,
        },
        {
          question: "How much improvement does complete documentation create?",
          inputs: [
            { value: formatNumber((inputs.baselineWrvus as number) || 0) },
            { value: `${inputs.wrvuImprovementRate || 3}%`, label: "improvement" },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.wrvuGain as number) || 0)} additional wRVUs`,
        },
        {
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber((inputs.wrvuGain as number) || 0) },
            { value: `$${inputs.conversionFactor || 40}`, label: "CF" },
            { value: "75%", label: "realization" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "hcc":
      return [
        {
          question: "How many patients have documentation gaps?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.maPercentage || 25}%`, label: "MA patients" },
            { value: `${inputs.gapRate || 15}%`, label: "gap rate" },
          ],
          operators: ["×", "×"],
          result: `${formatNumber((inputs.patientsWithGaps as number) || 0)} patients`,
        },
        {
          question: "How many HCCs can complete documentation capture?",
          inputs: [
            { value: formatNumber((inputs.patientsWithGaps as number) || 0) },
            { value: `${inputs.captureRate || 70}%` },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.capturedHccs as number) || 0)} HCCs`,
        },
        {
          question: "What's the RAF impact?",
          inputs: [
            { value: formatNumber((inputs.capturedHccs as number) || 0) },
            { value: `$${inputs.rafValue || 1200}`, label: "per HCC" },
            { value: "60%", label: "realization" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "reducingLocums":
    case "clinicianWellbeing":
      return [
        {
          question: "What's your baseline turnover?",
          inputs: [
            { value: formatNumber(data.providers), label: "clinicians" },
            { value: `${inputs.turnoverRate || 8}%` },
          ],
          operators: ["×"],
          result: `${((inputs.annualDepartures as number) || 0).toFixed(1)} departures/year`,
        },
        {
          question: "How many departures are burnout-related?",
          inputs: [
            { value: ((inputs.annualDepartures as number) || 0).toFixed(1) },
            { value: `${inputs.burnoutAttribution || 50}%` },
          ],
          operators: ["×"],
          result: `${((inputs.burnoutDepartures as number) || 0).toFixed(2)} burnout-driven`,
        },
        {
          question: "How many can reduced documentation burden prevent?",
          inputs: [
            { value: ((inputs.burnoutDepartures as number) || 0).toFixed(2) },
            { value: `${inputs.retentionLift || 15}%`, label: "retention lift" },
          ],
          operators: ["×"],
          result: `${((inputs.departuresAvoided as number) || 0).toFixed(2)} prevented`,
          note: "Conservative estimate—documentation is a major driver but not the only one.",
        },
        {
          question: "What's the cost savings?",
          inputs: [
            { value: ((inputs.departuresAvoided as number) || 0).toFixed(2) },
            { value: formatCurrency((inputs.replacementCost as number) || 500000) },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "denials":
      return [
        {
          question: "How many claims are denied today?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters) },
            { value: `${inputs.denialRate || 8}%` },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.totalDenials as number) || 0)} denials`,
        },
        {
          question: "How many stem from documentation gaps?",
          inputs: [
            { value: formatNumber((inputs.totalDenials as number) || 0) },
            { value: `${inputs.docRelatedPercent || 50}%` },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.docRelatedDenials as number) || 0)} doc-related`,
        },
        {
          question: "How many are written off without appeal?",
          inputs: [
            { value: formatNumber((inputs.docRelatedDenials as number) || 0) },
            { value: `${inputs.writtenOffPercent || 45}%` },
          ],
          operators: ["×"],
          result: `${formatNumber((inputs.writtenOffDenials as number) || 0)} written off`,
        },
        {
          question: "What can complete documentation save?",
          inputs: [
            { value: formatNumber((inputs.writtenOffDenials as number) || 0) },
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
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVUs × $${inputs.conversionFactor || 40} × 75%`;
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
    <Page size="A4" style={[styles.page, styles.coverPage]} wrap={false}>
      <View style={styles.coverTop}>
        <Image src={abridgeLogoPath} style={styles.coverLogo} />
      </View>

      <View style={styles.coverHero}>
        <Text style={styles.coverEyebrow}>Value Assessment</Text>
        <Text style={styles.coverTitle}>{displayName}</Text>
        <Text style={styles.coverSubtitle}>
          A strategic framework for understanding how ambient AI documentation
          transforms clinical operations, financial performance, and clinician experience.
        </Text>

        <View style={styles.coverMetricBlock}>
          <Text style={styles.coverMetricValue}>{formatCurrency(data.netGain)}</Text>
          <Text style={styles.coverMetricLabel}>Projected Net Annual Value</Text>
        </View>
      </View>

      <View style={styles.coverBottom}>
        <View>
          <Text style={styles.coverMeta}>
            {data.providers} clinicians · {formatNumber(data.encounters)} annual encounters
          </Text>
          <Text style={styles.coverMeta}>{data.roi.toFixed(1)}x return on investment</Text>
        </View>
        <Text style={styles.coverDate}>{today}</Text>
      </View>
    </Page>
  );
};

const StakesPage = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.stakesHero}>
          <Text style={styles.stakesHeroTitle}>{narrative.stakes.headline}</Text>
          <Text style={styles.stakesHeroSubtitle}>
            The administrative burden has reached a breaking point.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {narrative.stakes.stats.map((stat, i) => (
            <View key={i} style={styles.statBlock}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.narrativeBlock}>
          <Text style={styles.narrativeText}>{narrative.stakes.body}</Text>
        </View>

        <View style={styles.pullQuote}>
          <Text style={styles.pullQuoteText}>{narrative.stakes.pullQuote}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerPageNum}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter((d) => d.category === "labor");
  const revenueDrivers = data.drivers.filter((d) => d.category === "revenue");

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionEyebrow}>Your Opportunity</Text>
        <Text style={styles.sectionTitle}>The Value Story</Text>
        <Text style={styles.sectionSubtitle}>
          Based on {data.providers} clinicians and {formatNumber(data.encounters)} annual encounters,
          here's what ambient documentation could unlock.
        </Text>

        <View style={styles.heroMetrics}>
          <View style={styles.heroMetricPrimary}>
            <Text style={styles.metricValueLarge}>{formatCurrency(data.netGain)}</Text>
            <Text style={styles.metricLabel}>Net Annual Value</Text>
            <Text style={styles.metricContext}>
              {formatCurrency(data.totalValue)} value − {formatCurrency(data.investment)} investment
            </Text>
          </View>
          <View style={styles.heroMetricSecondary}>
            <Text style={styles.metricValueMedium}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>ROI</Text>
          </View>
          <View style={styles.heroMetricSecondary}>
            <Text style={styles.metricValueMedium}>{formatNumber(data.hoursReturned)}</Text>
            <Text style={styles.metricLabel}>Hours Returned</Text>
          </View>
        </View>

        <View style={styles.valueBreakdown}>
          <View style={styles.valueColumn}>
            <View style={styles.valueColumnHeader}>
              <Text style={styles.valueColumnTitle}>Time Back</Text>
              <Text style={styles.valueColumnTotal}>{formatCurrency(data.laborTotal)}</Text>
            </View>
            {laborDrivers.map((driver) => (
              <View key={driver.id} style={styles.valueRow}>
                <Text style={styles.valueRowLabel}>{getDriverName(driver.id, driver.name)}</Text>
                <Text style={styles.valueRowAmount}>{formatCurrency(driver.value)}</Text>
              </View>
            ))}
            {laborDrivers.length === 0 && (
              <View style={styles.valueRow}>
                <Text style={[styles.valueRowLabel, { fontStyle: "italic", color: brand.textTertiary }]}>
                  No time-based drivers selected
                </Text>
              </View>
            )}
          </View>

          <View style={styles.valueColumn}>
            <View style={styles.valueColumnHeader}>
              <Text style={styles.valueColumnTitle}>Documentation Quality</Text>
              <Text style={styles.valueColumnTotal}>{formatCurrency(data.revenueTotal)}</Text>
            </View>
            {revenueDrivers.map((driver) => (
              <View key={driver.id} style={styles.valueRow}>
                <Text style={styles.valueRowLabel}>{getDriverName(driver.id, driver.name)}</Text>
                <Text style={styles.valueRowAmount}>{formatCurrency(driver.value)}</Text>
              </View>
            ))}
            {revenueDrivers.length === 0 && (
              <View style={styles.valueRow}>
                <Text style={[styles.valueRowLabel, { fontStyle: "italic", color: brand.textTertiary }]}>
                  No documentation drivers selected
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>The Bottom Line</Text>
          <Text style={styles.insightText}>
            Every number in this model traces back to editable inputs and conservative realization rates.
            We've built this to withstand scrutiny—not to sell you on optimistic projections.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerPageNum}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const DriverDetailPage = ({
  driver,
  data,
  pageNum,
  totalPages,
}: {
  driver: DriverCalculation;
  data: OutpatientPDFData;
  pageNum: number;
  totalPages: number;
}) => {
  const driverNarrative = narrative.drivers[driver.id as keyof typeof narrative.drivers];
  const steps = getDriverSteps(driver, data);
  const displayName = getDriverName(driver.id, driver.name);
  const pct = Math.round((driver.value / data.totalValue) * 100);

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.driverHero}>
          <Text style={styles.driverEyebrow}>Value Driver</Text>
          <View style={styles.driverHeroContent}>
            <View style={styles.driverHeroLeft}>
              <Text style={styles.driverTitle}>{displayName}</Text>
              <Text style={styles.driverTheory}>
                {driverNarrative?.theory || "This driver represents measurable value from improved documentation."}
              </Text>
            </View>
            <View style={styles.driverHeroRight}>
              <Text style={styles.driverValueLabel}>Annual Value</Text>
              <Text style={styles.driverValueAmount}>{formatCurrency(driver.value)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.calculationSection}>
          <Text style={styles.calculationTitle}>The Calculation</Text>
          {steps.map((step, index) => (
            <View
              key={index}
              style={[
                styles.stepContainer,
                index === steps.length - 1 ? styles.stepContainerLast : {},
              ]}
            >
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepQuestion}>{step.question}</Text>
              </View>
              <View style={styles.stepMath}>
                {step.inputs.map((input, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                    {i > 0 && (
                      <Text style={styles.stepOperator}>{step.operators?.[i - 1] || "×"}</Text>
                    )}
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

        <View style={styles.finalResultBox}>
          <View>
            <Text style={styles.finalResultLabel}>Annual {displayName} Value</Text>
            <Text style={styles.finalResultFormula}>{getFinalFormula(driver)}</Text>
          </View>
          <Text style={styles.finalResultValue}>{formatCurrency(driver.value)}</Text>
        </View>

        {driverNarrative && (
          <View style={styles.benchmarkBox}>
            <Text style={styles.benchmarkLabel}>What This Means</Text>
            <Text style={styles.benchmarkText}>
              {driverNarrative.implication(driver.value, pct)}
            </Text>
            {driverNarrative.benchmark && (
              <Text style={[styles.benchmarkText, { marginTop: 12 }]}>
                Industry benchmark: {driverNarrative.benchmark}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerPageNum}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ProjectionPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionEyebrow}>Multi-Year View</Text>
        <Text style={styles.sectionTitle}>Investment & Return</Text>
        <Text style={styles.sectionSubtitle}>
          Value compounds as adoption matures and workflows optimize.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderCellFirst]}></Text>
            <Text style={styles.tableHeaderCell}>Year 1</Text>
            <Text style={styles.tableHeaderCell}>Year 2</Text>
            <Text style={styles.tableHeaderCell}>Year 3</Text>
            <Text style={styles.tableHeaderCell}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellFirst]}>Value</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year1Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year2Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year3Value)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearValue)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellFirst]}>Investment</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year1Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year2Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year3Cost)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearCost)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.tableCell, styles.tableCellFirst]}>Net Value</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
            <Text style={styles.tableCellRed}>{formatCurrency(data.threeYearNet)}</Text>
          </View>
        </View>

        <View style={styles.scaleComparison}>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleCardLabel}>Current Model</Text>
            <Text style={styles.scaleCardValue}>{formatCurrency(data.journey.pilotValue)}/yr</Text>
            <Text style={styles.scaleCardMeta}>
              {data.journey.pilotProviders} clinicians at {data.journey.pilotUtilization}% utilization
            </Text>
          </View>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleCardLabel}>Full Scale Potential</Text>
            <Text style={styles.scaleCardValue}>{formatCurrency(data.journey.fullScaleValue)}/yr</Text>
            <Text style={styles.scaleCardMeta}>
              {data.journey.fullScaleProviders} clinicians at {data.journey.fullScaleUtilization}% utilization
            </Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>The Compounding Effect</Text>
          <Text style={styles.insightText}>
            Per-clinician economics remain consistent at scale, while operational learning typically
            improves utilization as workflows mature. Organizations that execute well often exceed
            these conservative projections.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerPageNum}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const RecommendationsPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const monthlyLoss = Math.round(data.totalValue / 12);

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionEyebrow}>Next Steps</Text>
        <Text style={styles.sectionTitle}>{narrative.recommendations.headline}</Text>
        <Text style={styles.sectionSubtitle}>
          A phased approach to validation, proof, and scale.
        </Text>

        {narrative.recommendations.phases.map((phase, i) => (
          <View key={i} style={styles.phaseContainer}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseNumber}>
                <Text style={styles.phaseNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.phaseName}>{phase.name}</Text>
              <Text style={styles.phaseDuration}>{phase.duration}</Text>
            </View>
            <View style={styles.phaseActions}>
              {phase.actions.map((action, j) => (
                <View key={j} style={styles.phaseAction}>
                  <View style={styles.phaseActionBullet} />
                  <Text style={styles.phaseActionText}>{action}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.urgencyBox}>
          <Text style={styles.urgencyLabel}>The Cost of Waiting</Text>
          <Text style={styles.urgencyTitle}>Every month of delay has measurable cost.</Text>
          <Text style={styles.urgencyText}>
            Based on your projected annual value of {formatCurrency(data.totalValue)},
            each month without action represents approximately:
          </Text>
          <Text style={styles.urgencyValue}>{formatCurrency(monthlyLoss)}</Text>
          <Text style={styles.urgencyValueLabel}>in unrealized value per month</Text>
        </View>

        <View style={styles.pullQuote}>
          <Text style={styles.pullQuoteText}>{narrative.recommendations.closing}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerPageNum}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Assessment</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionEyebrow}>Methodology</Text>
        <Text style={styles.sectionTitle}>How We Built This</Text>
        <Text style={styles.sectionSubtitle}>
          {narrative.methodology.approach}
        </Text>

        {narrative.methodology.principles.map((principle, i) => (
          <View key={i} style={styles.principleRow}>
            <Text style={styles.principleNumber}>{i + 1}</Text>
            <View style={styles.principleContent}>
              <Text style={styles.principleName}>{principle.name}</Text>
              <Text style={styles.principleDescription}>{principle.description}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionEyebrow, { marginTop: 32 }]}>Your Inputs</Text>
        <View style={styles.inputsGrid}>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Clinicians</Text>
            <Text style={styles.inputValue}>{data.providers}</Text>
          </View>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Annual Encounters</Text>
            <Text style={styles.inputValue}>{formatNumber(data.encounters)}</Text>
          </View>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Utilization Rate</Text>
            <Text style={styles.inputValue}>{data.utilization}%</Text>
          </View>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Time Saved</Text>
            <Text style={styles.inputValue}>{data.timeSavedPerEncounter} min/encounter</Text>
          </View>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Investment</Text>
            <Text style={styles.inputValue}>{formatCurrency(data.costPerProvider)}/mo per clinician</Text>
          </View>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Value Drivers</Text>
            <Text style={styles.inputValue}>{data.drivers.length} selected</Text>
          </View>
        </View>

        <View style={[styles.insightBox, { marginTop: 32 }]}>
          <Text style={styles.insightLabel}>A Note on Conservatism</Text>
          <Text style={styles.insightText}>
            These projections use conservative realization rates that account for real-world
            constraints—scheduling limitations, payer mix variability, and attribution complexity.
            Organizations that execute well typically exceed these projections.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerPageNum}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DOCUMENT COMPONENT
// ============================================================================

const OutpatientPDFDocument = ({ data }: { data: OutpatientPDFData }) => {
  const totalPages = 5 + data.drivers.length;
  let pageNum = 1;

  return (
    <Document>
      <CoverPage data={data} />
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
