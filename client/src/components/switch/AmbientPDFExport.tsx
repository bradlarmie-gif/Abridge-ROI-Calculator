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
  coral: "#E85A4F",
  coralLight: "#FEF2F2",
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
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.coral,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 1,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 6,
  },

  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 5,
  },
  introText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 4,
  },

  metricsGrid: {
    flexDirection: "row",
    marginBottom: 8,
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
    lineHeight: 1.2,
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
    fontSize: 5,
    color: colors.lightGray,
    textAlign: "center",
    width: "24%",
  },
  spectrumBarContainer: {
    height: 16,
    position: "relative",
    marginBottom: 4,
  },
  spectrumExplanation: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.3,
    marginTop: 6,
  },

  dimensionCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 6,
    overflow: "hidden",
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  dimensionName: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
  },
  dimensionScore: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.coral,
  },
  dimensionQuestion: {
    fontSize: 6,
    color: colors.mediumGray,
    padding: 6,
    paddingTop: 3,
    paddingBottom: 3,
    fontStyle: "italic",
  },
  dimensionContent: {
    padding: 6,
    paddingTop: 0,
  },
  dimensionValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  dimensionYou: {
    fontSize: 7,
    color: colors.black,
  },
  dimensionBenchmark: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  dimensionBar: {
    height: 6,
    backgroundColor: colors.borderGray,
    borderRadius: 3,
    marginBottom: 4,
  },
  dimensionBarFill: {
    height: 6,
    backgroundColor: colors.coral,
    borderRadius: 3,
  },
  dimensionWhy: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.3,
    fontStyle: "italic",
  },

  scoreCalculation: {
    backgroundColor: colors.backgroundGray,
    padding: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  scoreText: {
    fontSize: 7,
    color: colors.darkGray,
    textAlign: "center",
  },
  scoreBold: {
    fontWeight: "bold",
    color: colors.black,
  },

  compoundBox: {
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  compoundTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.coral,
    marginBottom: 3,
  },
  compoundText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },

  graphBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    height: 70,
    position: "relative",
  },
  graphLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  graphLabel: {
    fontSize: 6,
    color: colors.mediumGray,
  },

  monthlyCallout: {
    backgroundColor: colors.coralLight,
    borderWidth: 1,
    borderColor: colors.coral,
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
  },
  monthlyText: {
    fontSize: 7,
    color: colors.coral,
    textAlign: "center",
    fontWeight: "bold",
  },

  gapCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 6,
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
    lineHeight: 1.3,
    marginBottom: 1,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },
  gapNote: {
    fontSize: 5,
    color: colors.lightGray,
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 1.3,
  },

  totalGapBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  totalGapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalGapLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  totalGapValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.green,
  },
  totalGapBreakdown: {
    fontSize: 6,
    color: colors.darkGray,
    marginTop: 3,
  },

  takeawaysBox: {
    marginBottom: 8,
  },
  takeawaysTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  takeawayItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
    paddingLeft: 6,
  },

  methodologySection: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 8,
  },
  methodologyColumnTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  methodologyItem: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.3,
    marginBottom: 1,
  },
  methodologyNote: {
    fontSize: 6,
    color: colors.lightGray,
    lineHeight: 1.3,
    marginTop: 6,
    fontStyle: "italic",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 6,
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
  const barWidth = 480;
  const markerPosition = (score / 100) * barWidth;
  
  return (
    <Svg width={barWidth} height={16}>
      <Rect x={0} y={4} width={barWidth * 0.4} height={8} fill="#FEE2E2" rx={0} />
      <Rect x={barWidth * 0.4} y={4} width={barWidth * 0.2} height={8} fill="#FEF3C7" rx={0} />
      <Rect x={barWidth * 0.6} y={4} width={barWidth * 0.2} height={8} fill="#D1FAE5" rx={0} />
      <Rect x={barWidth * 0.8} y={4} width={barWidth * 0.2} height={8} fill="#A7F3D0" rx={4} />
      <Rect x={0} y={4} width={4} height={8} fill="#FEE2E2" rx={4} />
      <Rect x={markerPosition - 1} y={0} width={3} height={16} fill={colors.coral} rx={1} />
    </Svg>
  );
};

const CostGraph = ({ year1, year2, year3 }: { year1: number; year2: number; year3: number }) => {
  const maxValue = year3;
  const graphWidth = 460;
  const graphHeight = 50;
  const padding = 20;
  
  const points = [
    { x: padding, y: graphHeight - 4, value: 0 },
    { x: padding + (graphWidth - padding * 2) * 0.33, y: graphHeight - (year1 / maxValue) * (graphHeight - 12), value: year1 },
    { x: padding + (graphWidth - padding * 2) * 0.66, y: graphHeight - (year2 / maxValue) * (graphHeight - 12), value: year2 },
    { x: graphWidth - padding, y: 10, value: year3 },
  ];

  return (
    <View style={styles.graphBox}>
      <Svg width={graphWidth} height={graphHeight}>
        <Line x1={padding} y1={graphHeight - 4} x2={points[1].x} y2={points[1].y} stroke={colors.coral} strokeWidth={2} />
        <Line x1={points[1].x} y1={points[1].y} x2={points[2].x} y2={points[2].y} stroke={colors.coral} strokeWidth={2} />
        <Line x1={points[2].x} y1={points[2].y} x2={points[3].x} y2={points[3].y} stroke={colors.coral} strokeWidth={2} />
        {points.map((point, i) => (
          <Circle key={i} cx={point.x} cy={point.y} r={3} fill={colors.coral} />
        ))}
      </Svg>
      <View style={{ position: "absolute", top: 6, right: 25 }}>
        <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.coral }}>{formatCurrency(year3)}</Text>
      </View>
      <View style={{ position: "absolute", top: 18, left: graphWidth * 0.28 }}>
        <Text style={{ fontSize: 7, color: colors.darkGray }}>{formatCurrency(year1)}</Text>
      </View>
      <View style={{ position: "absolute", top: 14, left: graphWidth * 0.52 }}>
        <Text style={{ fontSize: 7, color: colors.darkGray }}>{formatCurrency(year2)}</Text>
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
          <Image src={abridgeLogoPath} style={{ width: 85, height: 17 }} />
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
          <Text style={[styles.introText, { marginBottom: 0 }]}>
            This assessment measures where you stand on the value realization spectrum and quantifies what closing the gap could mean for your organization.
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>YOUR RESULTS AT A GLANCE</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.metricLabel}>Annual Gap</Text>
            <Text style={styles.metricDescription}>Value not being captured</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{calculations.realizationScore}%</Text>
            <Text style={styles.metricLabel}>Realized</Text>
            <Text style={styles.metricDescription}>Of potential value today</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.metricLabel}>3-Year Gap</Text>
            <Text style={styles.metricDescription}>Cumulative over 3 years</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{calculations.maturityLevel}</Text>
            <Text style={styles.metricLabel}>Stage</Text>
            <Text style={styles.metricDescription}>On the maturity spectrum</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>THE VALUE REALIZATION SPECTRUM</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 6 }}>
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
          <Text style={{ fontSize: 8, color: colors.coral, textAlign: "center", fontWeight: "bold" }}>
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
          <Image src={abridgeLogoPath} style={{ width: 85, height: 17 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>YOUR PERFORMANCE ACROSS FOUR DIMENSIONS</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 6 }}>
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

        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>THE COST OF THE GAP OVER TIME</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 4 }}>
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
          <Image src={abridgeLogoPath} style={{ width: 85, height: 17 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>HOW EACH GAP IS CALCULATED</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 6 }}>
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
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Encounters at your util: {formatNumber(inputs.annualEncounters || 150000)} × {inputs.utilization}% = {formatNumber(encountersAtCurrent)} documented</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Encounters at benchmark: {formatNumber(inputs.annualEncounters || 150000)} × {ABRIDGE_BENCHMARKS.utilization}% = {formatNumber(encountersAtBenchmark)} documented</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Gap: {formatNumber(encountersAtBenchmark)} - {formatNumber(encountersAtCurrent)} = {formatNumber(encounterGap)} encounters not documented</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Time value: {formatNumber(encounterGap)} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {formatNumber(utilizationHoursGap)} hours</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 5:</Text> Dollar value: {formatNumber(utilizationHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = {formatCurrency(calculations.utilizationGapValue)}</Text>
            <Text style={styles.gapNote}>
              Note: {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion is deliberately conservative — assumes only {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% of saved time converts to measurable value.
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
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Hours with your efficiency: {formatNumber(encountersAtBenchmark)} enc × {inputs.timeSavedPerEncounter} min = {formatNumber(Math.round((inputs.timeSavedPerEncounter / 60) * encountersAtBenchmark))} hrs</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Hours at benchmark: {formatNumber(encountersAtBenchmark)} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {formatNumber(Math.round((ABRIDGE_BENCHMARKS.timeSavedAvg / 60) * encountersAtBenchmark))} hrs</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Gap: {formatNumber(efficiencyHoursGap)} additional hours possible</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Dollar value: {formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}</Text>
            <Text style={styles.gapNote}>
              Note: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion used as efficiency gains are more directly convertible than utilization gains.
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
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Additional wRVU potential: {formatNumber(encountersAtBenchmark)} enc × 1.5 avg wRVU × {wrvuGapPercent}% = {formatNumber(additionalWrvu)} wRVU</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Dollar value: {formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = {formatCurrency(calculations.wrvuGapValue)}</Text>
            <Text style={styles.gapNote}>
              Note: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution assumes only half of wRVU improvement is directly attributable to ambient AI.
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
              <Text style={styles.methodologyItem}>• {inputs.providers} providers, {formatNumber(inputs.annualEncounters || 150000)} annual encounters</Text>
              <Text style={styles.methodologyItem}>• {inputs.utilization}% utilization, {inputs.timeSavedPerEncounter} min saved</Text>
              <Text style={styles.methodologyItem}>• +{inputs.wrvuLift}% wRVU lift, {inputs.satisfaction}% satisfaction</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Abridge Benchmarks</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.utilization}% util, {ABRIDGE_BENCHMARKS.timeSavedAvg} min saved, +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU, {ABRIDGE_BENCHMARKS.satisfaction}% sat</Text>
              <Text style={[styles.methodologyColumnTitle, { marginTop: 4 }]}>Valuation</Text>
              <Text style={styles.methodologyItem}>• ${VALUE_ASSUMPTIONS.hourlyRate}/hr, {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}-{VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% time conversion, ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU at {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</Text>
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
