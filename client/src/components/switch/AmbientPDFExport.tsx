import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Rect,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
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
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

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

  pageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 8,
  },

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

  spectrumContainer: {
    marginBottom: 10,
  },
  spectrumBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  spectrumLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textAlign: "center",
    width: "24%",
  },
  spectrumLabelBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  spectrumRanges: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  spectrumRange: {
    fontSize: 6,
    color: colors.lightGray,
    textAlign: "center",
    width: "24%",
  },
  spectrumBarContainer: {
    height: 16,
    position: "relative",
    marginBottom: 6,
  },
  spectrumExplanation: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginTop: 6,
  },

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
  dimensionInsightsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  insightItem: {
    marginBottom: 4,
  },
  insightDimension: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
  },
  insightText: {
    fontSize: 6,
    color: colors.mediumGray,
    lineHeight: 1.4,
    marginTop: 1,
  },

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
  dimensionMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dimensionYou: {
    fontSize: 8,
    color: colors.black,
    fontWeight: "bold",
  },
  dimensionBenchmark: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  dimensionBar: {
    height: 8,
    backgroundColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 8,
  },
  dimensionBarFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
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

  scoreCalculation: {
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 8,
    color: colors.darkGray,
    textAlign: "center",
  },
  scoreBold: {
    fontWeight: "bold",
    color: colors.black,
  },

  compoundBox: {
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  compoundTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  compoundText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

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
  gapNote: {
    fontSize: 6,
    color: colors.lightGray,
    fontStyle: "italic",
    marginTop: 3,
    lineHeight: 1.4,
  },

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

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
}

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

interface DimensionInfo {
  name: string;
  score: number;
}

const getStageNarrative = (stage: string, score: number, gap: number): string => {
  switch(stage) {
    case 'Early Stage':
      return `At ${score}% value realization, your organization is in the early stages of capturing ambient AI's potential. This isn't unusual for newer deployments, but it does mean significant value is being left on the table. The gap of ${formatCurrency(gap)} annually represents real dollars that could be recovered with focused optimization.`;
    case 'Developing':
      return `At ${score}% value realization, your organization has made progress but is at a critical juncture. This is where most organizations plateau without focused optimization. You've proven the solution works — the question now is whether you'll capture its full potential or settle for partial value.`;
    case 'Optimized':
      return `At ${score}% value realization, your organization is performing above average. You're capturing meaningful value from ambient AI, but there's still a gap of ${formatCurrency(gap)} annually that represents optimization opportunity.`;
    case 'Transformed':
      return `At ${score}% value realization, your organization is among the top performers in ambient AI adoption. You're capturing the vast majority of available value. The remaining gap of ${formatCurrency(gap)} represents marginal optimization opportunity.`;
    default:
      return `At ${score}% value realization, your organization has room to optimize ambient AI performance.`;
  }
};

const getPrimaryRecommendation = (lowest: DimensionInfo, highest: DimensionInfo): string => {
  return `Your data shows ${lowest.name} as your biggest gap (${lowest.score}% of benchmark), while ${highest.name} is your relative strength (${highest.score}%). This suggests targeted intervention on ${lowest.name} could yield disproportionate returns without disrupting what's already working.`;
};

const getRiskStatement = (stage: string, gap: number): string => {
  switch(stage) {
    case 'Early Stage':
      return `The risk of staying at this stage: providers may lose confidence in the solution if they don't see consistent value, leading to declining utilization over time — a downward spiral that becomes harder to reverse.`;
    case 'Developing':
      return `Organizations that stay in the "Developing" stage often see erosion over time — small drops in utilization, creeping dissatisfaction, gradual return to old habits. The ${formatCurrency(gap)} annual gap compounds: every year at this level is another year of unrealized value.`;
    case 'Optimized':
      return `The risk at this stage is complacency. "Good enough" can become the enemy of excellent. Organizations that push from Optimized to Transformed often see the highest ROI on their optimization efforts because the foundation is already strong.`;
    case 'Transformed':
      return `Even top performers need to maintain vigilance. Technology evolves, staff turns over, workflows change. What got you to Transformed requires ongoing attention to stay there.`;
    default:
      return `Gaps compound over time. Each year at current performance means another ${formatCurrency(gap)} in unrealized value.`;
  }
};

interface DimensionInsight {
  dimension: string;
  insight: string;
}

const getDimensionInsights = (scores: { utilization: number; efficiency: number; quality: number; satisfaction: number }): DimensionInsight[] => {
  const insights: DimensionInsight[] = [];
  
  if (scores.utilization < 70) {
    insights.push({
      dimension: 'Utilization',
      insight: `At ${scores.utilization}% of benchmark, many encounters aren't using ambient documentation at all. This is often a change management issue — providers may not have formed the habit, or friction in the workflow is preventing consistent adoption.`
    });
  }
  
  if (scores.efficiency < 60) {
    insights.push({
      dimension: 'Efficiency',
      insight: `At ${scores.efficiency}% of benchmark, time savings per encounter is below expectations. This could indicate workflow issues, suboptimal configuration, or that providers are editing notes extensively after generation.`
    });
  }
  
  if (scores.quality < 50) {
    insights.push({
      dimension: 'Quality',
      insight: `At ${scores.quality}% of benchmark, documentation quality improvement is lagging. This is often the largest dollar opportunity — better documentation drives better coding and reimbursement.`
    });
  }
  
  if (scores.satisfaction < 75) {
    insights.push({
      dimension: 'Satisfaction',
      insight: `At ${scores.satisfaction}% of benchmark, provider satisfaction is a concern. Dissatisfied providers use solutions less over time. Understanding WHY satisfaction is low is critical before it affects utilization.`
    });
  }
  
  return insights;
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

const SpectrumBar = ({ score }: { score: number }) => {
  const barWidth = 460;
  const markerPosition = (score / 100) * barWidth;
  
  return (
    <Svg width={barWidth} height={16}>
      <Rect x={0} y={4} width={barWidth * 0.4} height={8} fill="#FEE2E2" rx={0} />
      <Rect x={barWidth * 0.4} y={4} width={barWidth * 0.2} height={8} fill="#FEF3C7" rx={0} />
      <Rect x={barWidth * 0.6} y={4} width={barWidth * 0.2} height={8} fill="#D1FAE5" rx={0} />
      <Rect x={barWidth * 0.8} y={4} width={barWidth * 0.2} height={8} fill="#A7F3D0" rx={4} />
      <Rect x={0} y={4} width={4} height={8} fill="#FEE2E2" rx={4} />
      
      <Rect x={markerPosition - 1} y={0} width={3} height={16} fill={colors.primary} rx={1} />
    </Svg>
  );
};

const DimensionEducationContent = {
  utilization: {
    definition: "The percentage of patient encounters where ambient AI is actually used to generate documentation.",
    whyMatters: "Every encounter not using ambient AI is an encounter where providers still carry the full documentation burden. Low utilization means you're paying for a solution that isn't being used consistently.",
    whatDrives: "Workflow integration, provider habits, technical friction (login issues, connectivity), specialty fit, and whether using the tool feels natural in the clinical environment.",
    insightThreshold: 70,
    getInsight: (score: number) => `At ${score}% of benchmark, there's significant room to increase adoption. Common causes include inconsistent habits, workflow friction, or providers who tried it early and didn't return.`,
  },
  efficiency: {
    definition: "The average time saved per encounter when ambient AI is used — typically measured as reduction in documentation time.",
    whyMatters: "This is the core promise of ambient AI: giving time back to providers. Less time saved per encounter means the documentation burden persists, even when the tool is being used.",
    whatDrives: "Note quality out of the box, how much providers edit generated notes, specialty-specific templates, EHR integration smoothness, and whether the AI captures the encounter accurately the first time.",
    insightThreshold: 60,
    getInsight: (score: number) => `At ${score}% of benchmark, providers may be spending significant time editing notes after generation. This often indicates template issues, trust issues with the AI output, or workflow problems.`,
  },
  quality: {
    definition: "The improvement in documentation completeness and coding accuracy, measured through wRVU capture — a proxy for whether documentation supports appropriate reimbursement.",
    whyMatters: "Better documentation leads to better coding, which leads to better reimbursement. This is often the largest dollar opportunity in ambient AI — small improvements in coding accuracy compound across thousands of encounters.",
    whatDrives: "How completely the AI captures clinical details, whether it prompts for missing elements, coder feedback loops, and whether documentation supports the complexity of care actually delivered.",
    insightThreshold: 50,
    getInsight: (score: number) => `At ${score}% of benchmark, documentation quality improvement is lagging. This could be the largest dollar opportunity — review whether notes are capturing clinical complexity that supports accurate coding.`,
  },
  satisfaction: {
    definition: "Provider satisfaction with the ambient AI solution — typically measured through surveys asking whether they would recommend it to colleagues.",
    whyMatters: "Satisfaction is a leading indicator. Dissatisfied providers use solutions less over time, creating a downward spiral. Happy providers become champions who drive adoption among peers.",
    whatDrives: "Accuracy of generated notes, time actually saved, reliability, ease of use, and whether it makes their day genuinely better vs. adding another thing to manage.",
    insightThreshold: 75,
    getInsight: (score: number) => `At ${score}% of benchmark, satisfaction is a concern. Understanding WHY providers are dissatisfied is critical — is it accuracy? Reliability? Workflow friction? Low satisfaction often predicts declining utilization.`,
  },
};

const AmbientPDFDocument = ({ inputs, calculations }: AmbientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const encountersAtBenchmark = Math.round((inputs.annualEncounters || 150000) * (ABRIDGE_BENCHMARKS.utilization / 100));
  const encountersAtCurrent = Math.round((inputs.annualEncounters || 150000) * (inputs.utilization / 100));
  const encounterGap = encountersAtBenchmark - encountersAtCurrent;
  
  const utilizationHoursGap = Math.round(encounterGap * (ABRIDGE_BENCHMARKS.timeSavedAvg / 60));
  
  const efficiencyTimeDiff = ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter;
  const efficiencyHoursGap = Math.round((efficiencyTimeDiff / 60) * encountersAtBenchmark);
  
  const wrvuGapPercent = ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift;
  const additionalWrvu = Math.round(encountersAtBenchmark * 1.5 * (wrvuGapPercent / 100));

  const gapDimensions = [
    { name: "Utilization", score: calculations.utilizationScore, value: calculations.utilizationGapValue },
    { name: "Efficiency", score: calculations.efficiencyScore, value: calculations.efficiencyGapValue },
    { name: "Quality", score: calculations.qualityScore, value: calculations.wrvuGapValue },
  ];
  
  const lowestDimension = gapDimensions.reduce((min, dim) => 
    dim.score < min.score ? dim : min, gapDimensions[0]);

  const dimensionRankings = getDimensionRankings({
    utilization: calculations.utilizationScore,
    efficiency: calculations.efficiencyScore,
    quality: calculations.qualityScore,
    satisfaction: calculations.satisfactionScore,
  });

  const dimensionInsights = getDimensionInsights({
    utilization: calculations.utilizationScore,
    efficiency: calculations.efficiencyScore,
    quality: calculations.qualityScore,
    satisfaction: calculations.satisfactionScore,
  });

  return (
    <Document>
      {/* PAGE 1: THE STORY */}
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
            Ambient AI creates value through four dimensions: how many encounters use it (utilization), how much time it saves (efficiency), how it improves documentation quality (wRVU lift), and whether providers will keep using it (satisfaction).
          </Text>
          <Text style={styles.introText}>
            Most organizations capture only 30-60% of the potential value. The gap isn't because ambient AI doesn't work — it's because value realization requires optimization across all four dimensions. Small gaps in each area compound into significant unrealized value.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>YOUR RESULTS AT A GLANCE</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.metricLabel}>Annual Gap</Text>
            <Text style={styles.metricDescription}>Value that exists but isn't being captured</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{calculations.realizationScore}%</Text>
            <Text style={styles.metricLabel}>Realized</Text>
            <Text style={styles.metricDescription}>Of potential value being captured today</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.metricLabel}>3-Year Gap</Text>
            <Text style={styles.metricDescription}>Cumulative gap over three years</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{calculations.maturityLevel}</Text>
            <Text style={styles.metricLabel}>Stage</Text>
            <Text style={styles.metricDescription}>Where you are on the maturity spectrum</Text>
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
            <Text style={styles.findingsSubtitle}>What's at Stake</Text>
            <Text style={styles.findingsText}>
              {getRiskStatement(calculations.maturityLevel, calculations.annualGap)}
            </Text>
          </View>
          {dimensionInsights.length > 0 && (
            <View style={styles.dimensionInsightsContainer}>
              <Text style={styles.findingsSubtitle}>Dimension-Specific Observations</Text>
              {dimensionInsights.map((insight, i) => (
                <View key={i} style={styles.insightItem}>
                  <Text style={styles.insightDimension}>{insight.dimension}:</Text>
                  <Text style={styles.insightText}>{insight.insight}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>THE VALUE REALIZATION SPECTRUM</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Organizations move through four stages as they optimize ambient AI:
        </Text>

        <View style={styles.spectrumBox}>
          <View style={styles.spectrumLabels}>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>EARLY STAGE</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>DEVELOPING</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>OPTIMIZED</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>TRANSFORMED</Text></Text>
          </View>
          <View style={styles.spectrumRanges}>
            <Text style={styles.spectrumRange}>Under 40%</Text>
            <Text style={styles.spectrumRange}>40-60%</Text>
            <Text style={styles.spectrumRange}>60-80%</Text>
            <Text style={styles.spectrumRange}>80%+</Text>
          </View>
          <View style={styles.spectrumBarContainer}>
            <SpectrumBar score={calculations.realizationScore} />
          </View>
          <Text style={{ fontSize: 8, color: colors.primary, textAlign: "center", fontWeight: "bold", marginTop: 2 }}>
            YOU: {calculations.realizationScore}%
          </Text>
          <Text style={styles.spectrumExplanation}>
            At {calculations.realizationScore}% realization, you're in the "{calculations.maturityLevel}" stage. The gap between where you are and where you could be represents {formatCurrency(calculations.annualGap)} annually in unrealized value.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/4</Text>
        </View>
      </Page>

      {/* PAGE 2: THE FOUR DIMENSIONS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>YOUR PERFORMANCE ACROSS FOUR DIMENSIONS</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Value realization depends on performance in four areas. Here's where you stand compared to Abridge benchmarks:
        </Text>

        {/* UTILIZATION */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>UTILIZATION</Text>
            <Text style={styles.dimensionScore}>{calculations.utilizationScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            What it measures: {DimensionEducationContent.utilization.definition}
          </Text>
          <View style={styles.dimensionMetrics}>
            <Text style={styles.dimensionYou}>You: {inputs.utilization}%</Text>
            <Text style={styles.dimensionBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.utilization}%</Text>
          </View>
          <View style={styles.dimensionBar}>
            <View style={[styles.dimensionBarFill, { width: `${Math.min(100, calculations.utilizationScore)}%` }]} />
          </View>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>
              {DimensionEducationContent.utilization.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>
              {DimensionEducationContent.utilization.whatDrives}
            </Text>
            {calculations.utilizationScore < DimensionEducationContent.utilization.insightThreshold && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                {DimensionEducationContent.utilization.getInsight(calculations.utilizationScore)}
              </Text>
            )}
          </View>
        </View>

        {/* EFFICIENCY */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>EFFICIENCY</Text>
            <Text style={styles.dimensionScore}>{calculations.efficiencyScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            What it measures: {DimensionEducationContent.efficiency.definition}
          </Text>
          <View style={styles.dimensionMetrics}>
            <Text style={styles.dimensionYou}>You: {inputs.timeSavedPerEncounter} min</Text>
            <Text style={styles.dimensionBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
          </View>
          <View style={styles.dimensionBar}>
            <View style={[styles.dimensionBarFill, { width: `${Math.min(100, calculations.efficiencyScore)}%` }]} />
          </View>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>
              {DimensionEducationContent.efficiency.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>
              {DimensionEducationContent.efficiency.whatDrives}
            </Text>
            {calculations.efficiencyScore < DimensionEducationContent.efficiency.insightThreshold && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                {DimensionEducationContent.efficiency.getInsight(calculations.efficiencyScore)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/4</Text>
        </View>
      </Page>

      {/* PAGE 3: DIMENSIONS CONTINUED + TIMELINE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        {/* QUALITY */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>QUALITY (wRVU LIFT)</Text>
            <Text style={styles.dimensionScore}>{calculations.qualityScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            What it measures: {DimensionEducationContent.quality.definition}
          </Text>
          <View style={styles.dimensionMetrics}>
            <Text style={styles.dimensionYou}>You: +{inputs.wrvuLift}%</Text>
            <Text style={styles.dimensionBenchmark}>Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
          </View>
          <View style={styles.dimensionBar}>
            <View style={[styles.dimensionBarFill, { width: `${Math.min(100, calculations.qualityScore)}%` }]} />
          </View>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>
              {DimensionEducationContent.quality.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>
              {DimensionEducationContent.quality.whatDrives}
            </Text>
            {calculations.qualityScore < DimensionEducationContent.quality.insightThreshold && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                {DimensionEducationContent.quality.getInsight(calculations.qualityScore)}
              </Text>
            )}
          </View>
        </View>

        {/* SATISFACTION */}
        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>SATISFACTION</Text>
            <Text style={styles.dimensionScore}>{calculations.satisfactionScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionDefinition}>
            What it measures: {DimensionEducationContent.satisfaction.definition}
          </Text>
          <View style={styles.dimensionMetrics}>
            <Text style={styles.dimensionYou}>You: {inputs.satisfaction}%</Text>
            <Text style={styles.dimensionBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%</Text>
          </View>
          <View style={styles.dimensionBar}>
            <View style={[styles.dimensionBarFill, { width: `${Math.min(100, calculations.satisfactionScore)}%` }]} />
          </View>
          <View style={styles.dimensionEducation}>
            <Text style={styles.dimensionWhyMatters}>
              <Text style={styles.bold}>Why it matters: </Text>
              {DimensionEducationContent.satisfaction.whyMatters}
            </Text>
            <Text style={styles.dimensionWhatDrives}>
              <Text style={styles.bold}>What drives it: </Text>
              {DimensionEducationContent.satisfaction.whatDrives}
            </Text>
            {calculations.satisfactionScore < DimensionEducationContent.satisfaction.insightThreshold && (
              <Text style={styles.dimensionInsight}>
                <Text style={styles.bold}>Your situation: </Text>
                {DimensionEducationContent.satisfaction.getInsight(calculations.satisfactionScore)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.scoreCalculation}>
          <Text style={styles.scoreText}>
            Your average score: ({calculations.utilizationScore}% + {calculations.efficiencyScore}% + {calculations.qualityScore}% + {calculations.satisfactionScore}%) ÷ 4 = <Text style={styles.scoreBold}>{calculations.realizationScore}%</Text>
          </Text>
        </View>

        <View style={styles.compoundBox}>
          <Text style={styles.compoundTitle}>WHY GAPS COMPOUND</Text>
          <Text style={styles.compoundText}>
            The four dimensions don't add — they multiply. A 60% score in one dimension limits the value you can capture from improvements in others. This is why small gaps across multiple dimensions create large overall gaps.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>THE COST OF THE GAP OVER TIME</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          If the gap persists, unrealized value accumulates:
        </Text>

        <View style={styles.timelineSection}>
          <View style={styles.timelineRow}>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>TODAY</Text>
              <Text style={styles.timelineValue}>$0</Text>
              <Text style={styles.timelineSubtext}>Starting point</Text>
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
              Every month at current performance = {formatCurrency(calculations.monthlyGap)} in unrealized value
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 3/4</Text>
        </View>
      </Page>

      {/* PAGE 4: THE DETAILS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW EACH GAP IS CALCULATED</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Every number in this assessment can be traced back to your inputs and transparent assumptions. Here's the math:
        </Text>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>UTILIZATION GAP</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.utilizationGapValue)}</Text>
          </View>
          <View style={styles.gapCardValues}>
            <Text style={styles.gapValueItem}>Your utilization: <Text style={styles.gapValueBold}>{inputs.utilization}%</Text></Text>
            <Text style={styles.gapValueItem}>Benchmark: <Text style={styles.gapValueBold}>{ABRIDGE_BENCHMARKS.utilization}%</Text></Text>
            <Text style={styles.gapValueItem}>Gap: <Text style={styles.gapValueBold}>{ABRIDGE_BENCHMARKS.utilization - inputs.utilization}pp</Text></Text>
          </View>
          <View style={styles.gapCardSteps}>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Encounters at benchmark: {formatNumber(inputs.annualEncounters || 150000)} × {ABRIDGE_BENCHMARKS.utilization}% = {formatNumber(encountersAtBenchmark)}</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Encounters at your rate: {formatNumber(inputs.annualEncounters || 150000)} × {inputs.utilization}% = {formatNumber(encountersAtCurrent)}</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Gap × time savings: {formatNumber(encounterGap)} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {formatNumber(utilizationHoursGap)} hours</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Dollar value: {formatNumber(utilizationHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = {formatCurrency(calculations.utilizationGapValue)}</Text>
          </View>
        </View>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>EFFICIENCY GAP</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
          </View>
          <View style={styles.gapCardValues}>
            <Text style={styles.gapValueItem}>Your efficiency: <Text style={styles.gapValueBold}>{inputs.timeSavedPerEncounter} min</Text></Text>
            <Text style={styles.gapValueItem}>Benchmark: <Text style={styles.gapValueBold}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text></Text>
            <Text style={styles.gapValueItem}>Gap: <Text style={styles.gapValueBold}>{efficiencyTimeDiff} min</Text></Text>
          </View>
          <View style={styles.gapCardSteps}>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Additional hours possible: {formatNumber(encountersAtBenchmark)} enc × {efficiencyTimeDiff} min ÷ 60 = {formatNumber(efficiencyHoursGap)} hours</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Dollar value: {formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}</Text>
          </View>
        </View>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>QUALITY GAP (wRVU)</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.wrvuGapValue)}</Text>
          </View>
          <View style={styles.gapCardValues}>
            <Text style={styles.gapValueItem}>Your wRVU lift: <Text style={styles.gapValueBold}>+{inputs.wrvuLift}%</Text></Text>
            <Text style={styles.gapValueItem}>Benchmark: <Text style={styles.gapValueBold}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text></Text>
            <Text style={styles.gapValueItem}>Gap: <Text style={styles.gapValueBold}>{wrvuGapPercent}%</Text></Text>
          </View>
          <View style={styles.gapCardSteps}>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Additional wRVU: {formatNumber(encountersAtBenchmark)} enc × 1.5 avg wRVU × {wrvuGapPercent}% = {formatNumber(additionalWrvu)} wRVU</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Dollar value: {formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = {formatCurrency(calculations.wrvuGapValue)}</Text>
          </View>
        </View>

        <View style={styles.totalGapBox}>
          <View style={styles.totalGapRow}>
            <Text style={styles.totalGapLabel}>TOTAL ANNUAL GAP</Text>
            <Text style={styles.totalGapValue}>{formatCurrency(calculations.annualGap)}</Text>
          </View>
          <Text style={styles.totalGapBreakdown}>
            Utilization ({formatCurrency(calculations.utilizationGapValue)}) + Efficiency ({formatCurrency(calculations.efficiencyGapValue)}) + Quality ({formatCurrency(calculations.wrvuGapValue)})
          </Text>
        </View>

        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <Text style={styles.takeawayItem}>• You're capturing {calculations.realizationScore}% of ambient AI's potential value</Text>
          <Text style={styles.takeawayItem}>• The largest opportunity is in {lowestDimension.name} ({lowestDimension.score}% of benchmark)</Text>
          <Text style={styles.takeawayItem}>• Closing the gap could recover {formatCurrency(calculations.annualGap)} annually / {formatCurrency(calculations.threeYearGap)} over 3 years</Text>
          <Text style={styles.takeawayItem}>• All calculations use conservative assumptions — actual value may be higher</Text>
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

export async function generateAmbientPDF(inputs: SwitchInputs, calculations: SwitchCalculations) {
  const blob = await pdf(<AmbientPDFDocument inputs={inputs} calculations={calculations} />).toBlob();
  const today = new Date().toISOString().split("T")[0];
  saveAs(blob, `ambient-value-assessment-${today}.pdf`);
}
