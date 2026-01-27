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
// COLORS - Matching OutpatientPDFExport exactly
// ============================================================================

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  green: "#059669",
  greenLight: "#ECFDF5",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  backgroundGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  redLight: "#FEF2F2",
  redDark: "#991B1B",
  amber: "#D97706",
};

// ============================================================================
// STYLES - Matching OutpatientPDFExport exactly
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  // Header - exact match
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  // Intro box - exact match
  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  introText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  // Section title - exact match
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },

  // Metrics grid - exact match
  metricsGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  metricValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.green,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 6,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.3,
  },

  // Findings section - exact match
  findingsSection: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  findingsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  findingsNarrative: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  findingsSubsection: {
    marginBottom: 8,
  },
  findingsSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  findingsText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  // Score calculation box - matching the simple intro box style
  scoreBox: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  scoreBoxTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 3,
    backgroundColor: colors.white,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  scoreRowLabel: {
    fontSize: 8,
    color: colors.darkGray,
  },
  scoreRowValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  scoreDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 6,
  },
  scoreTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.greenLight,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.green,
  },
  scoreTotalLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  scoreTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  scoreExplanation: {
    fontSize: 7,
    color: colors.mediumGray,
    lineHeight: 1.4,
    marginTop: 8,
  },

  // Dimension card - exact match
  dimensionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dimensionName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionScore: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
  },
  dimensionDefinition: {
    fontSize: 8,
    color: colors.mediumGray,
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 1.4,
  },
  dimensionEducation: {
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
  },
  dimensionWhyMatters: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  dimensionWhatDrives: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  dimensionInsight: {
    fontSize: 7,
    color: colors.redDark,
    lineHeight: 1.5,
    backgroundColor: colors.redLight,
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  bold: {
    fontWeight: "bold",
  },

  // Gap card - exact match
  gapCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapCardTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
  },
  gapCardValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.green,
  },
  gapCardValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
    paddingBottom: 4,
  },
  gapValueItem: {
    fontSize: 7,
    color: colors.darkGray,
  },
  gapValueBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardSteps: {
    padding: 6,
    paddingTop: 4,
    backgroundColor: colors.backgroundGray,
  },
  gapStep: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 1,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },

  // Total box - exact match
  totalGapBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  totalGapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalGapLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  totalGapValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.green,
  },
  totalGapBreakdown: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 4,
  },

  // Timeline - exact match
  timelineSection: {
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timelineBox: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
    marginRight: 4,
  },
  timelineBoxHighlight: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  timelineLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  timelineValueLarge: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  timelineSubtext: {
    fontSize: 6,
    color: colors.mediumGray,
    marginTop: 2,
  },
  timelineArrow: {
    fontSize: 12,
    color: colors.mediumGray,
    paddingHorizontal: 2,
  },

  // Monthly callout - exact match
  monthlyCallout: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 8,
    borderRadius: 4,
  },
  monthlyText: {
    fontSize: 8,
    color: colors.primary,
    textAlign: "center",
    fontWeight: "bold",
  },

  // Takeaways - exact match
  takeawaysBox: {
    marginBottom: 10,
  },
  takeawaysTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  takeawayItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
    paddingLeft: 8,
  },

  // Next steps - exact match
  nextStepsBox: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  nextStepsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nextStepsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextStepsFocus: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    marginLeft: 8,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  nextStepsIntro: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  nextStepsGrid: {
    flexDirection: "row",
  },
  nextStepsColumn: {
    flex: 1,
    paddingRight: 8,
  },
  nextStepsColumnTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 3,
  },
  nextStepsItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
    paddingLeft: 6,
  },

  // Methodology - exact match
  methodologySection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 10,
  },
  methodologyColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 6,
    color: colors.lightGray,
    lineHeight: 1.4,
    marginTop: 6,
    fontStyle: "italic",
  },

  // Footer - exact match
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
});

// ============================================================================
// TYPES & HELPERS
// ============================================================================

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
  clientName: string;
  preparedBy: string;
}

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

const getScoreColor = (score: number): string => {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.amber;
  return colors.primary;
};

// ============================================================================
// NARRATIVE GENERATORS
// ============================================================================

interface DimensionInfo {
  name: string;
  score: number;
}

const getStageNarrative = (stage: string, score: number, gap: number): string => {
  switch(stage) {
    case 'Early Stage':
      return `At ${score}% value realization, your organization is in the early stages of capturing ambient AI's potential. The ${formatCurrency(gap)} annual opportunity represents value that could be captured with focused optimization.`;
    case 'Developing':
      return `At ${score}% value realization, you've made meaningful progress. The ${formatCurrency(gap)} opportunity is real and achievable with continued focus.`;
    case 'Optimized':
      return `At ${score}% value realization, you're performing above average. The remaining ${formatCurrency(gap)} represents optimization opportunity that could compound your already-strong results.`;
    case 'Transformed':
      return `At ${score}% value realization, you're among the top performers. The remaining ${formatCurrency(gap)} represents fine-tuning opportunity.`;
    default:
      return `At ${score}% value realization, there's room to optimize. The ${formatCurrency(gap)} annual opportunity awaits.`;
  }
};

const getPrimaryRecommendation = (lowest: DimensionInfo, highest: DimensionInfo): string => {
  return `Your data shows ${lowest.name} as your biggest opportunity area (${lowest.score}% of benchmark), while ${highest.name} is your relative strength (${highest.score}%). Focused attention on ${lowest.name} could yield meaningful returns.`;
};

const getDimensionRankings = (scores: { utilization: number; efficiency: number; quality: number; satisfaction: number }): { lowest: DimensionInfo; highest: DimensionInfo } => {
  const dimensions: DimensionInfo[] = [
    { name: 'Utilization', score: scores.utilization },
    { name: 'Efficiency', score: scores.efficiency },
    { name: 'Quality', score: scores.quality },
    { name: 'Satisfaction', score: scores.satisfaction },
  ];
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  return { lowest: sorted[0], highest: sorted[sorted.length - 1] };
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
        whyThis: `At ${lowestDimension.score}% of benchmark, building consistent usage is the foundation for all other value.`,
        quickWins: ['• Identify top non-users and understand barriers', '• Review workflow friction points', '• Create specialty-specific quick-start guides'],
        deeperDives: ['• Analyze utilization by department', '• Consider peer champion programs', '• Review training effectiveness'],
      };
    case 'Efficiency':
      return {
        focusArea: 'Time Savings',
        whyThis: `At ${lowestDimension.score}% of benchmark, providers aren't experiencing full time-saving promise.`,
        quickWins: ['• Survey providers on what they edit most', '• Review EHR integration points', '• Check template configurations'],
        deeperDives: ['• Analyze note editing patterns', '• Work with EHR team on friction', '• Specialty-specific optimization'],
      };
    case 'Quality':
      return {
        focusArea: 'Documentation & Revenue',
        whyThis: `At ${lowestDimension.score}% of benchmark, documentation isn't translating to coding accuracy.`,
        quickWins: ['• Connect with coding team for feedback', '• Review HCC capture rates', '• Identify specialty gaps'],
        deeperDives: ['• Establish coder feedback loop', '• Analyze wRVU patterns', '• Review note complexity'],
      };
    case 'Satisfaction':
      return {
        focusArea: 'Provider Experience',
        whyThis: `At ${lowestDimension.score}% of benchmark, provider sentiment predicts future adoption.`,
        quickWins: ['• Interview dissatisfied providers', '• Review support ticket themes', '• Check specialty correlations'],
        deeperDives: ['• Map satisfaction to efficiency', '• Review onboarding experience', '• Check expectation setting'],
      };
    default:
      return {
        focusArea: 'Optimization',
        whyThis: 'Targeted intervention on your weakest dimension typically yields highest ROI.',
        quickWins: ['• Gather data on pain points', '• Identify quick fixes'],
        deeperDives: ['• Develop optimization roadmap', '• Engage vendor support'],
      };
  }
};

// ============================================================================
// DIMENSION EDUCATION
// ============================================================================

const DimensionEducation = {
  utilization: {
    definition: "The percentage of encounters where ambient AI is used for documentation.",
    whyMatters: "Every encounter not using ambient AI is one where providers carry full documentation burden. Low utilization means paying for capacity that isn't being used.",
    whatDrives: "Workflow integration, provider habits, technical friction, and whether the tool feels natural in clinical environments.",
  },
  efficiency: {
    definition: "Average time saved per encounter when ambient AI is used.",
    whyMatters: "This is the core promise: giving time back to providers. Less time saved means the documentation burden persists.",
    whatDrives: "Note quality out of the box, editing frequency, template optimization, and EHR integration smoothness.",
  },
  quality: {
    definition: "Documentation improvement measured through wRVU capture.",
    whyMatters: "Better documentation leads to better coding, which leads to better reimbursement. Often the largest dollar opportunity.",
    whatDrives: "Clinical detail capture, coder feedback loops, and whether notes reflect complexity of care delivered.",
  },
  satisfaction: {
    definition: "Provider satisfaction — typically measured through NPS or likelihood to recommend.",
    whyMatters: "Satisfaction is a leading indicator. Dissatisfied providers use solutions less over time. Happy providers become champions.",
    whatDrives: "Note accuracy, time actually saved, reliability, and whether it genuinely makes their day better.",
  },
};

// ============================================================================
// PDF DOCUMENT - Matching OutpatientPDFExport structure exactly
// ============================================================================

const AmbientPDFDocument = ({ inputs, calculations, clientName, preparedBy }: AmbientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const encountersAtBenchmark = Math.round((inputs.annualEncounters || 150000) * (ABRIDGE_BENCHMARKS.utilization / 100));
  const monthlyGap = Math.round(calculations.annualGap / 12);
  
  const dimensionRankings = getDimensionRankings({
    utilization: calculations.utilizationScore,
    efficiency: calculations.efficiencyScore,
    quality: calculations.qualityScore,
    satisfaction: calculations.satisfactionScore,
  });

  const lowestDimension = dimensionRankings.lowest;
  const nextSteps = getStrategicNextSteps(lowestDimension);

  // Calculations for step-by-step
  const efficiencyTimeDiff = ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter;
  const efficiencyHoursGap = Math.round((efficiencyTimeDiff / 60) * encountersAtBenchmark);
  const wrvuGapPercent = ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift;
  const additionalWrvu = Math.round(encountersAtBenchmark * 1.5 * (wrvuGapPercent / 100));

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1: THE STORY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.introBox}>
          <Text style={styles.introTitle}>UNDERSTANDING VALUE REALIZATION</Text>
          <Text style={styles.introText}>
            Ambient AI creates value through four dimensions: utilization (encounter coverage), efficiency (time savings), quality (wRVU lift), and satisfaction (provider adoption). Most organizations capture 30-60% of potential value because optimization requires all four dimensions working together.
          </Text>
          <Text style={styles.introText}>
            This assessment was prepared for <Text style={styles.bold}>{clientName}</Text> by <Text style={styles.bold}>{preparedBy}</Text>. Each calculation is transparent and adjustable—these are your numbers, not black-box estimates.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>YOUR RESULTS AT A GLANCE</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.metricLabel}>Annual Opportunity</Text>
            <Text style={styles.metricDescription}>Additional value based on benchmarks</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{calculations.realizationScore}%</Text>
            <Text style={styles.metricLabel}>Realized</Text>
            <Text style={styles.metricDescription}>Of potential being captured</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.metricLabel}>3-Year Potential</Text>
            <Text style={styles.metricDescription}>Cumulative opportunity</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{calculations.maturityLevel}</Text>
            <Text style={styles.metricLabel}>Stage</Text>
            <Text style={styles.metricDescription}>On the maturity spectrum</Text>
          </View>
        </View>

        <View style={styles.findingsSection}>
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
            <Text style={styles.findingsSubtitle}>Deployment Baseline</Text>
            <Text style={styles.findingsText}>
              {inputs.providers} providers × {formatNumber(inputs.annualEncounters || 150000)} encounters × {inputs.utilization}% utilization = {formatNumber(Math.round((inputs.annualEncounters || 150000) * (inputs.utilization / 100)))} documented encounters annually.
            </Text>
          </View>
        </View>

        {/* Score Calculation Box - Simple clean style */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreBoxTitle}>HOW YOUR SCORE IS CALCULATED</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Utilization</Text>
            <Text style={styles.scoreRowValue}>{calculations.utilizationScore}%</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Efficiency</Text>
            <Text style={styles.scoreRowValue}>{calculations.efficiencyScore}%</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Quality</Text>
            <Text style={styles.scoreRowValue}>{calculations.qualityScore}%</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreRowLabel}>Satisfaction</Text>
            <Text style={styles.scoreRowValue}>{calculations.satisfactionScore}%</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreTotalRow}>
            <Text style={styles.scoreTotalLabel}>Average Score</Text>
            <Text style={styles.scoreTotalValue}>{calculations.realizationScore}%</Text>
          </View>
          <Text style={styles.scoreExplanation}>
            Your realization score is a simple average of how you perform across all four dimensions.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 2: DIMENSION DEEP-DIVE */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>YOUR PERFORMANCE ACROSS FOUR DIMENSIONS</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Value realization depends on performance in four interconnected areas. Weakness in one dimension limits the others.
        </Text>

        {/* Utilization */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>UTILIZATION</Text>
            <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.utilizationScore) }]}>
              {calculations.utilizationScore}% of benchmark
            </Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            You: {inputs.utilization}% | Benchmark: {ABRIDGE_BENCHMARKS.utilization}%
          </Text>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.utilization.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.utilization.whatDrives}
            </Text>
            {calculations.utilizationScore < 70 && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                At {calculations.utilizationScore}% of benchmark, there's significant room to increase adoption.
              </Text>
            )}
          </View>
        </View>

        {/* Efficiency */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>EFFICIENCY</Text>
            <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.efficiencyScore) }]}>
              {calculations.efficiencyScore}% of benchmark
            </Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            You: {inputs.timeSavedPerEncounter} min | Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min
          </Text>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.efficiency.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.efficiency.whatDrives}
            </Text>
            {calculations.efficiencyScore < 70 && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                At {calculations.efficiencyScore}% of benchmark, providers may be editing notes extensively.
              </Text>
            )}
          </View>
        </View>

        {/* Quality */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>QUALITY (wRVU)</Text>
            <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.qualityScore) }]}>
              {calculations.qualityScore}% of benchmark
            </Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            You: +{inputs.wrvuLift}% | Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%
          </Text>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.quality.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.quality.whatDrives}
            </Text>
            {calculations.qualityScore < 70 && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                At {calculations.qualityScore}% of benchmark, this could be the largest dollar opportunity.
              </Text>
            )}
          </View>
        </View>

        {/* Satisfaction */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>SATISFACTION</Text>
            <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.satisfactionScore) }]}>
              {calculations.satisfactionScore}% of benchmark
            </Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            You: {inputs.satisfaction}% | Benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%
          </Text>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.satisfaction.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.satisfaction.whatDrives}
            </Text>
            {calculations.satisfactionScore < 75 && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                At {calculations.satisfactionScore}% of benchmark, understanding dissatisfaction is critical.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: CALCULATIONS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW EACH OPPORTUNITY IS CALCULATED</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Every number traces back to your inputs and transparent assumptions. Here's the math:
        </Text>

        {/* Utilization Gap */}
        {calculations.utilizationGapValue > 0 && (
          <View style={styles.gapCard}>
            <View style={styles.gapCardHeader}>
              <Text style={styles.gapCardTitle}>Utilization Opportunity</Text>
              <Text style={styles.gapCardValue}>{formatCurrency(calculations.utilizationGapValue)}</Text>
            </View>
            <View style={styles.gapCardValues}>
              <Text style={styles.gapValueItem}>Your rate: <Text style={styles.gapValueBold}>{inputs.utilization}%</Text></Text>
              <Text style={styles.gapValueItem}>Benchmark: <Text style={styles.gapValueBold}>{ABRIDGE_BENCHMARKS.utilization}%</Text></Text>
              <Text style={styles.gapValueItem}>Gap: <Text style={styles.gapValueBold}>{ABRIDGE_BENCHMARKS.utilization - inputs.utilization}pp</Text></Text>
            </View>
            <View style={styles.gapCardSteps}>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> {formatNumber(inputs.annualEncounters || 150000)} enc × {ABRIDGE_BENCHMARKS.utilization}% = {formatNumber(encountersAtBenchmark)} benchmark encounters</Text>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Gap of {formatNumber(calculations.encounterGap)} encounters not documented today</Text>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> {formatNumber(calculations.encounterGap)} × {ABRIDGE_BENCHMARKS.timeSavedAvg} min ÷ 60 = {formatNumber(Math.round(calculations.encounterGap * ABRIDGE_BENCHMARKS.timeSavedAvg / 60))} hours</Text>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Hours × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = {formatCurrency(calculations.utilizationGapValue)}</Text>
            </View>
          </View>
        )}

        {/* Efficiency Gap */}
        {calculations.efficiencyGapValue > 0 && (
          <View style={styles.gapCard}>
            <View style={styles.gapCardHeader}>
              <Text style={styles.gapCardTitle}>Efficiency Opportunity</Text>
              <Text style={styles.gapCardValue}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
            </View>
            <View style={styles.gapCardValues}>
              <Text style={styles.gapValueItem}>Your savings: <Text style={styles.gapValueBold}>{inputs.timeSavedPerEncounter} min</Text></Text>
              <Text style={styles.gapValueItem}>Benchmark: <Text style={styles.gapValueBold}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text></Text>
              <Text style={styles.gapValueItem}>Gap: <Text style={styles.gapValueBold}>{efficiencyTimeDiff.toFixed(1)} min</Text></Text>
            </View>
            <View style={styles.gapCardSteps}>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> {formatNumber(encountersAtBenchmark)} enc × {efficiencyTimeDiff.toFixed(1)} min ÷ 60 = {formatNumber(efficiencyHoursGap)} hours</Text>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> {formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}</Text>
            </View>
          </View>
        )}

        {/* Quality Gap */}
        {calculations.wrvuGapValue > 0 && (
          <View style={styles.gapCard}>
            <View style={styles.gapCardHeader}>
              <Text style={styles.gapCardTitle}>Quality Opportunity (wRVU)</Text>
              <Text style={styles.gapCardValue}>{formatCurrency(calculations.wrvuGapValue)}</Text>
            </View>
            <View style={styles.gapCardValues}>
              <Text style={styles.gapValueItem}>Your lift: <Text style={styles.gapValueBold}>+{inputs.wrvuLift}%</Text></Text>
              <Text style={styles.gapValueItem}>Benchmark: <Text style={styles.gapValueBold}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text></Text>
              <Text style={styles.gapValueItem}>Gap: <Text style={styles.gapValueBold}>+{wrvuGapPercent.toFixed(1)}%</Text></Text>
            </View>
            <View style={styles.gapCardSteps}>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> {formatNumber(encountersAtBenchmark)} enc × 1.5 avg wRVU × {wrvuGapPercent.toFixed(1)}% = {formatNumber(additionalWrvu)} wRVU</Text>
              <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> {formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = {formatCurrency(calculations.wrvuGapValue)}</Text>
            </View>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalGapBox}>
          <View style={styles.totalGapRow}>
            <Text style={styles.totalGapLabel}>TOTAL ANNUAL OPPORTUNITY</Text>
            <Text style={styles.totalGapValue}>{formatCurrency(calculations.annualGap)}</Text>
          </View>
          <Text style={styles.totalGapBreakdown}>
            Utilization ({formatCurrency(calculations.utilizationGapValue)}) + Efficiency ({formatCurrency(calculations.efficiencyGapValue)}) + Quality ({formatCurrency(calculations.wrvuGapValue)})
          </Text>
        </View>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>THE OPPORTUNITY OVER TIME</Text>
        <View style={styles.timelineSection}>
          <View style={styles.timelineRow}>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>TODAY</Text>
              <Text style={styles.timelineValue}>$0</Text>
            </View>
            <Text style={styles.timelineArrow}>→</Text>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>YEAR 1</Text>
              <Text style={styles.timelineValue}>{formatCurrency(calculations.annualGap)}</Text>
            </View>
            <Text style={styles.timelineArrow}>→</Text>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>YEAR 2</Text>
              <Text style={styles.timelineValue}>{formatCurrency(calculations.annualGap * 2)}</Text>
            </View>
            <Text style={styles.timelineArrow}>→</Text>
            <View style={styles.timelineBoxHighlight}>
              <Text style={styles.timelineLabel}>YEAR 3</Text>
              <Text style={styles.timelineValueLarge}>{formatCurrency(calculations.threeYearGap)}</Text>
              <Text style={styles.timelineSubtext}>Cumulative</Text>
            </View>
          </View>
          <View style={styles.monthlyCallout}>
            <Text style={styles.monthlyText}>
              Every month of delay = {formatCurrency(monthlyGap)} in potential value not captured
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 3/4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: TAKEAWAYS & NEXT STEPS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <Text style={styles.takeawayItem}>• You're capturing {calculations.realizationScore}% of ambient AI's potential value</Text>
          <Text style={styles.takeawayItem}>• The largest opportunity is in {lowestDimension.name} ({lowestDimension.score}% of benchmark)</Text>
          <Text style={styles.takeawayItem}>• Capturing this opportunity could mean {formatCurrency(calculations.annualGap)} annually / {formatCurrency(calculations.threeYearGap)} over 3 years</Text>
          <Text style={styles.takeawayItem}>• All calculations use conservative assumptions — actual value may be higher</Text>
        </View>

        <View style={styles.nextStepsBox}>
          <View style={styles.nextStepsHeader}>
            <Text style={styles.nextStepsTitle}>RECOMMENDED NEXT STEPS</Text>
            <Text style={styles.nextStepsFocus}>Focus: {nextSteps.focusArea}</Text>
          </View>
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

        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>METHODOLOGY & ASSUMPTIONS</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>• {inputs.providers} providers</Text>
              <Text style={styles.methodologyItem}>• {formatNumber(inputs.annualEncounters || 150000)} annual encounters</Text>
              <Text style={styles.methodologyItem}>• {inputs.utilization}% utilization</Text>
              <Text style={styles.methodologyItem}>• {inputs.timeSavedPerEncounter} min time savings</Text>
              <Text style={styles.methodologyItem}>• +{inputs.wrvuLift}% wRVU lift</Text>
              <Text style={styles.methodologyItem}>• {inputs.satisfaction}% satisfaction</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Abridge Benchmarks</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.utilization}% utilization</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.timeSavedAvg} min saved per encounter</Text>
              <Text style={styles.methodologyItem}>• +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU lift</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.satisfaction}% satisfaction</Text>
              <Text style={[styles.methodologyColumnTitle, { marginTop: 6 }]}>Valuation Assumptions</Text>
              <Text style={styles.methodologyItem}>• Provider time: ${VALUE_ASSUMPTIONS.hourlyRate}/hr</Text>
              <Text style={styles.methodologyItem}>• Utilization conversion: {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• Efficiency conversion: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• wRVU: ${VALUE_ASSUMPTIONS.wrvuDollarValue} (Medicare CF)</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            Benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on specialty mix and operational factors.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 4/4</Text>
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
