import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Line,
  Circle,
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
    marginTop: 12,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 10,
  },

  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 14,
    borderRadius: 4,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
  },
  introText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 6,
  },

  metricsGrid: {
    flexDirection: "row",
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  metricValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 7,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.3,
  },

  spectrumContainer: {
    marginBottom: 12,
  },
  spectrumBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  spectrumLabel: {
    fontSize: 7,
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
    marginBottom: 8,
  },
  spectrumRange: {
    fontSize: 6,
    color: colors.lightGray,
    textAlign: "center",
    width: "24%",
  },
  spectrumBarContainer: {
    height: 20,
    position: "relative",
    marginBottom: 8,
  },
  spectrumExplanation: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginTop: 8,
  },

  dimensionCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  dimensionName: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
  },
  dimensionScore: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
  },
  dimensionQuestion: {
    fontSize: 7,
    color: colors.mediumGray,
    padding: 8,
    paddingTop: 4,
    paddingBottom: 4,
    fontStyle: "italic",
  },
  dimensionContent: {
    padding: 8,
    paddingTop: 0,
  },
  dimensionValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dimensionYou: {
    fontSize: 8,
    color: colors.black,
  },
  dimensionBenchmark: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  dimensionBar: {
    height: 8,
    backgroundColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 6,
  },
  dimensionBarFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  dimensionWhy: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    fontStyle: "italic",
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
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  graphContainer: {
    marginBottom: 6,
  },
  graphBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    height: 80,
    position: "relative",
  },
  graphLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  graphLabel: {
    fontSize: 7,
    color: colors.mediumGray,
  },

  monthlyCallout: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
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
    marginBottom: 10,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapCardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
  },
  gapCardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  gapCardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginHorizontal: 8,
  },
  gapCardValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    paddingBottom: 6,
  },
  gapValueItem: {
    fontSize: 8,
    color: colors.darkGray,
  },
  gapValueBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardSteps: {
    padding: 8,
    paddingTop: 6,
    backgroundColor: colors.backgroundGray,
  },
  gapStep: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },
  gapNote: {
    fontSize: 6,
    color: colors.lightGray,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 1.4,
  },

  totalGapBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: "bold",
    color: colors.green,
  },
  totalGapBreakdown: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 4,
  },

  takeawaysBox: {
    marginBottom: 12,
  },
  takeawaysTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  takeawayItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 3,
    paddingLeft: 8,
  },

  methodologySection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
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
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.4,
    marginTop: 8,
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

const SpectrumBar = ({ score }: { score: number }) => {
  const barWidth = 460;
  const markerPosition = (score / 100) * barWidth;
  
  return (
    <Svg width={barWidth} height={20}>
      <Rect x={0} y={6} width={barWidth * 0.4} height={8} fill="#FEE2E2" rx={0} />
      <Rect x={barWidth * 0.4} y={6} width={barWidth * 0.2} height={8} fill="#FEF3C7" rx={0} />
      <Rect x={barWidth * 0.6} y={6} width={barWidth * 0.2} height={8} fill="#D1FAE5" rx={0} />
      <Rect x={barWidth * 0.8} y={6} width={barWidth * 0.2} height={8} fill="#A7F3D0" rx={4} />
      <Rect x={0} y={6} width={4} height={8} fill="#FEE2E2" rx={4} />
      
      <Rect x={markerPosition - 1} y={0} width={3} height={20} fill={colors.primary} rx={1} />
    </Svg>
  );
};

const CostGraph = ({ year1, year2, year3 }: { year1: number; year2: number; year3: number }) => {
  const maxValue = year3;
  const graphWidth = 440;
  const graphHeight = 65;
  const padding = 25;
  
  const points = [
    { x: padding, y: graphHeight - 5, value: 0, label: "Today" },
    { x: padding + (graphWidth - padding * 2) * 0.33, y: graphHeight - (year1 / maxValue) * (graphHeight - 15), value: year1 },
    { x: padding + (graphWidth - padding * 2) * 0.66, y: graphHeight - (year2 / maxValue) * (graphHeight - 15), value: year2 },
    { x: graphWidth - padding, y: 12, value: year3 },
  ];

  return (
    <View style={styles.graphBox}>
      <Svg width={graphWidth} height={graphHeight}>
        <Line x1={padding} y1={graphHeight - 5} x2={points[1].x} y2={points[1].y} stroke={colors.primary} strokeWidth={2} />
        <Line x1={points[1].x} y1={points[1].y} x2={points[2].x} y2={points[2].y} stroke={colors.primary} strokeWidth={2} />
        <Line x1={points[2].x} y1={points[2].y} x2={points[3].x} y2={points[3].y} stroke={colors.primary} strokeWidth={2} />
        
        {points.map((point, i) => (
          <Circle key={i} cx={point.x} cy={point.y} r={4} fill={colors.primary} />
        ))}
      </Svg>
      <View style={{ position: "absolute", top: 8, right: 30 }}>
        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{formatCurrency(year3)}</Text>
      </View>
      <View style={{ position: "absolute", top: 22, left: graphWidth * 0.28 }}>
        <Text style={{ fontSize: 8, color: colors.darkGray }}>{formatCurrency(year1)}</Text>
      </View>
      <View style={{ position: "absolute", top: 16, left: graphWidth * 0.52 }}>
        <Text style={{ fontSize: 8, color: colors.darkGray }}>{formatCurrency(year2)}</Text>
      </View>
    </View>
  );
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
          <Text style={styles.introText}>
            This assessment measures where you stand on the value realization spectrum and quantifies what closing the gap could mean for your organization.
          </Text>
        </View>

        <View style={styles.divider} />

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

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>THE VALUE REALIZATION SPECTRUM</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
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
          <Text style={{ fontSize: 8, color: colors.primary, textAlign: "center", fontWeight: "bold", marginTop: 4 }}>
            YOU: {calculations.realizationScore}%
          </Text>
          <Text style={styles.spectrumExplanation}>
            At {calculations.realizationScore}% realization, you're in the "{calculations.maturityLevel}" stage. This is where most organizations plateau without focused optimization. The gap between where you are and where you could be represents {formatCurrency(calculations.annualGap)} annually in unrealized value.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/3</Text>
        </View>
      </Page>

      {/* PAGE 2: THE EVIDENCE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>YOUR PERFORMANCE ACROSS FOUR DIMENSIONS</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
          Value realization depends on performance in four areas. Here's where you stand compared to Abridge benchmarks:
        </Text>

        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>UTILIZATION</Text>
            <Text style={styles.dimensionScore}>{calculations.utilizationScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionQuestion}>What % of encounters use ambient documentation?</Text>
          <View style={styles.dimensionContent}>
            <View style={styles.dimensionValues}>
              <Text style={styles.dimensionYou}>You: {inputs.utilization}%</Text>
              <Text style={styles.dimensionBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.utilization}%</Text>
            </View>
            <View style={styles.dimensionBar}>
              <View style={[styles.dimensionBarFill, { width: `${Math.min(100, (inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100)}%` }]} />
            </View>
            <Text style={styles.dimensionWhy}>
              Why it matters: Low utilization means many encounters don't benefit from ambient AI at all — wasted potential.
            </Text>
          </View>
        </View>

        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>EFFICIENCY</Text>
            <Text style={styles.dimensionScore}>{calculations.efficiencyScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionQuestion}>How much time is saved per encounter?</Text>
          <View style={styles.dimensionContent}>
            <View style={styles.dimensionValues}>
              <Text style={styles.dimensionYou}>You: {inputs.timeSavedPerEncounter} min</Text>
              <Text style={styles.dimensionBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
            </View>
            <View style={styles.dimensionBar}>
              <View style={[styles.dimensionBarFill, { width: `${Math.min(100, (inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100)}%` }]} />
            </View>
            <Text style={styles.dimensionWhy}>
              Why it matters: Less time saved per encounter means less value returned to providers — documentation burden persists.
            </Text>
          </View>
        </View>

        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>QUALITY (wRVU)</Text>
            <Text style={styles.dimensionScore}>{calculations.qualityScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionQuestion}>What improvement in documentation/coding accuracy?</Text>
          <View style={styles.dimensionContent}>
            <View style={styles.dimensionValues}>
              <Text style={styles.dimensionYou}>You: +{inputs.wrvuLift}%</Text>
              <Text style={styles.dimensionBenchmark}>Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            </View>
            <View style={styles.dimensionBar}>
              <View style={[styles.dimensionBarFill, { width: `${Math.min(100, (inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)}%` }]} />
            </View>
            <Text style={styles.dimensionWhy}>
              Why it matters: Better documentation leads to better coding and better reimbursement. This is often the largest dollar opportunity.
            </Text>
          </View>
        </View>

        <View style={styles.dimensionCard}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionName}>SATISFACTION</Text>
            <Text style={styles.dimensionScore}>{calculations.satisfactionScore}% of benchmark</Text>
          </View>
          <Text style={styles.dimensionQuestion}>Would providers recommend this solution?</Text>
          <View style={styles.dimensionContent}>
            <View style={styles.dimensionValues}>
              <Text style={styles.dimensionYou}>You: {inputs.satisfaction}%</Text>
              <Text style={styles.dimensionBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%</Text>
            </View>
            <View style={styles.dimensionBar}>
              <View style={[styles.dimensionBarFill, { width: `${Math.min(100, (inputs.satisfaction / ABRIDGE_BENCHMARKS.satisfaction) * 100)}%` }]} />
            </View>
            <Text style={styles.dimensionWhy}>
              Why it matters: Low satisfaction predicts declining utilization over time. Happy providers use it more — more value captured.
            </Text>
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
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 8 }}>
          If the gap persists, unrealized value accumulates:
        </Text>

        <CostGraph 
          year1={calculations.annualGap} 
          year2={calculations.annualGap * 2} 
          year3={calculations.threeYearGap} 
        />

        <View style={styles.graphLabels}>
          <Text style={styles.graphLabel}>Today</Text>
          <Text style={styles.graphLabel}>Year 1</Text>
          <Text style={styles.graphLabel}>Year 2</Text>
          <Text style={styles.graphLabel}>Year 3</Text>
        </View>

        <View style={styles.monthlyCallout}>
          <Text style={styles.monthlyText}>
            Every month at current performance = {formatCurrency(calculations.monthlyGap)} in unrealized value
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/3</Text>
        </View>
      </Page>

      {/* PAGE 3: THE DETAILS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW EACH GAP IS CALCULATED</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
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
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Encounters at your utilization</Text>
            <Text style={styles.gapStep}>        {formatNumber(inputs.annualEncounters || 150000)} × {inputs.utilization}% = {formatNumber(encountersAtCurrent)} encounters documented</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Encounters at benchmark</Text>
            <Text style={styles.gapStep}>        {formatNumber(inputs.annualEncounters || 150000)} × {ABRIDGE_BENCHMARKS.utilization}% = {formatNumber(encountersAtBenchmark)} encounters documented</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Gap in encounters</Text>
            <Text style={styles.gapStep}>        {formatNumber(encountersAtBenchmark)} - {formatNumber(encountersAtCurrent)} = {formatNumber(encounterGap)} encounters not documented</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Time value of gap (at benchmark efficiency)</Text>
            <Text style={styles.gapStep}>        {formatNumber(encounterGap)} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {formatNumber(utilizationHoursGap)} hours</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 5:</Text> Dollar value (conservative conversion)</Text>
            <Text style={styles.gapStep}>        {formatNumber(utilizationHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = {formatCurrency(calculations.utilizationGapValue)}</Text>
            <Text style={styles.gapNote}>
              Note: {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion assumes only {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% of saved time converts to measurable value. This is deliberately conservative.
            </Text>
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
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Hours at benchmark utilization with your efficiency</Text>
            <Text style={styles.gapStep}>        {formatNumber(encountersAtBenchmark)} enc × {inputs.timeSavedPerEncounter} min = {formatNumber(Math.round((inputs.timeSavedPerEncounter / 60) * encountersAtBenchmark))} hours saved</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Hours at benchmark utilization with benchmark efficiency</Text>
            <Text style={styles.gapStep}>        {formatNumber(encountersAtBenchmark)} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {formatNumber(Math.round((ABRIDGE_BENCHMARKS.timeSavedAvg / 60) * encountersAtBenchmark))} hours saved</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Gap in hours</Text>
            <Text style={styles.gapStep}>        {formatNumber(efficiencyHoursGap)} additional hours possible</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Dollar value (conservative conversion)</Text>
            <Text style={styles.gapStep}>        {formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}</Text>
            <Text style={styles.gapNote}>
              Note: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion is used here as efficiency gains are more directly convertible than utilization gains.
            </Text>
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
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Additional wRVU potential</Text>
            <Text style={styles.gapStep}>        {formatNumber(encountersAtBenchmark)} enc × 1.5 avg wRVU × {wrvuGapPercent}% = {formatNumber(additionalWrvu)} additional wRVU</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Dollar value (conservative attribution)</Text>
            <Text style={styles.gapStep}>        {formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = {formatCurrency(calculations.wrvuGapValue)}</Text>
            <Text style={styles.gapNote}>
              Note: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution assumes only half of wRVU improvement is directly attributable to ambient AI. Other factors matter too.
            </Text>
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
              <Text style={styles.methodologyItem}>• Current solution: Ambient AI</Text>
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
              <Text style={[styles.methodologyColumnTitle, { marginTop: 8 }]}>Valuation Assumptions</Text>
              <Text style={styles.methodologyItem}>• Provider time: ${VALUE_ASSUMPTIONS.hourlyRate}/hr</Text>
              <Text style={styles.methodologyItem}>• Utilization conversion: {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• Efficiency conversion: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• wRVU: ${VALUE_ASSUMPTIONS.wrvuDollarValue} (Medicare CF)</Text>
              <Text style={styles.methodologyItem}>• wRVU attribution: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            Benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on specialty mix and operational factors.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 3/3</Text>
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
