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
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.coral,
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
    marginTop: 1,
  },

  metricsStrip: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  metricItem: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.borderGray,
  },
  metricItemLast: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    borderRightWidth: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  metricValueCoral: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.coral,
  },
  metricLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },

  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.coral,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  introText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 3,
  },

  execSummary: {
    marginBottom: 8,
  },
  execTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  execText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  bold: {
    fontWeight: "bold",
    color: colors.black,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionNumber: {
    backgroundColor: colors.coral,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  sectionNumberText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 7,
    color: colors.darkGray,
    marginBottom: 6,
  },

  perfGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
  },
  perfCell: {
    width: "50%",
    padding: 8,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderGray,
  },
  perfCellRight: {
    borderRightWidth: 0,
  },
  perfCellBottom: {
    borderBottomWidth: 0,
  },
  perfLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  perfValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  perfYou: {
    fontSize: 7,
    color: colors.black,
  },
  perfBenchmark: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  perfBar: {
    height: 5,
    backgroundColor: colors.borderGray,
    borderRadius: 2,
  },
  perfBarFill: {
    height: 5,
    backgroundColor: colors.coral,
    borderRadius: 2,
  },
  perfPercent: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginTop: 3,
  },

  compoundBox: {
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    marginBottom: 6,
  },
  compoundTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.coral,
    marginBottom: 3,
  },
  compoundText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },

  graphContainer: {
    marginTop: 6,
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
    marginTop: 3,
  },
  graphLabel: {
    fontSize: 6,
    color: colors.mediumGray,
  },

  monthlyCallout: {
    backgroundColor: colors.coralLight,
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
  },
  gapCardValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.green,
  },
  gapCardBarContainer: {
    padding: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapBar: {
    height: 6,
    backgroundColor: colors.borderGray,
    borderRadius: 3,
    flexDirection: "row",
  },
  gapBarFill: {
    height: 6,
    backgroundColor: colors.coral,
    borderRadius: 3,
  },
  gapBarValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  gapBarText: {
    fontSize: 6,
    color: colors.mediumGray,
  },
  gapContext: {
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  contextTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 2,
  },
  contextText: {
    fontSize: 7,
    color: colors.mediumGray,
    lineHeight: 1.4,
  },
  gapDrivers: {
    padding: 6,
    backgroundColor: colors.backgroundGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  driversTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 3,
  },
  driverItem: {
    fontSize: 6,
    color: colors.mediumGray,
    marginBottom: 1,
    paddingLeft: 4,
  },
  gapCardMath: {
    padding: 6,
  },
  gapMathTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  gapMathLine: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 1,
  },

  totalGapBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 2,
  },

  pathForward: {
    marginTop: 8,
    marginBottom: 8,
  },
  pathTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pathText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  pathSteps: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    marginTop: 4,
    marginBottom: 3,
  },
  pathStep: {
    fontSize: 7,
    color: colors.darkGray,
    marginBottom: 2,
    paddingLeft: 8,
  },
  pathConclusion: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 6,
    fontStyle: "italic",
  },

  questionBox: {
    backgroundColor: colors.coralLight,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.coral,
    marginTop: 8,
  },
  questionText: {
    fontSize: 8,
    color: colors.coral,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 1.4,
  },

  methodologySection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  methodologyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  methodologyColumn: {
    width: "50%",
    marginBottom: 4,
  },
  methodologyColumnTitle: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 2,
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
    marginTop: 4,
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

const CostGraph = ({ year1, year2, year3 }: { year1: number; year2: number; year3: number }) => {
  const maxValue = year3;
  const graphWidth = 480;
  const graphHeight = 55;
  const padding = 20;
  
  const points = [
    { x: padding, y: graphHeight - 5, value: 0, label: "Today" },
    { x: padding + (graphWidth - padding * 2) * 0.33, y: graphHeight - (year1 / maxValue) * (graphHeight - 15), value: year1, label: "Year 1" },
    { x: padding + (graphWidth - padding * 2) * 0.66, y: graphHeight - (year2 / maxValue) * (graphHeight - 15), value: year2, label: "Year 2" },
    { x: graphWidth - padding, y: 10, value: year3, label: "Year 3" },
  ];

  return (
    <View style={styles.graphBox}>
      <Svg width={graphWidth} height={graphHeight}>
        <Line x1={padding} y1={graphHeight - 5} x2={points[1].x} y2={points[1].y} stroke={colors.coral} strokeWidth={2} />
        <Line x1={points[1].x} y1={points[1].y} x2={points[2].x} y2={points[2].y} stroke={colors.coral} strokeWidth={2} />
        <Line x1={points[2].x} y1={points[2].y} x2={points[3].x} y2={points[3].y} stroke={colors.coral} strokeWidth={2} />
        
        {points.map((point, i) => (
          <Circle key={i} cx={point.x} cy={point.y} r={3} fill={colors.coral} />
        ))}
      </Svg>
      <View style={{ position: "absolute", top: 6, right: 20 }}>
        <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.coral }}>{formatCurrency(year3)}</Text>
      </View>
      <View style={{ position: "absolute", top: 20, left: graphWidth * 0.30 }}>
        <Text style={{ fontSize: 7, color: colors.darkGray }}>{formatCurrency(year1)}</Text>
      </View>
      <View style={{ position: "absolute", top: 15, left: graphWidth * 0.55 }}>
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
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValueCoral}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.metricLabel}>Annual Gap</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{calculations.realizationScore}%</Text>
            <Text style={styles.metricLabel}>Realized</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.metricLabel}>3-Year Gap</Text>
          </View>
          <View style={styles.metricItemLast}>
            <Text style={styles.metricValue}>{calculations.maturityLevel}</Text>
            <Text style={styles.metricLabel}>Stage</Text>
          </View>
        </View>

        <View style={styles.introBox}>
          <Text style={styles.introTitle}>WHAT THIS ASSESSMENT SHOWS</Text>
          <Text style={styles.introText}>
            This assessment measures how much value you're extracting from your ambient AI investment across four dimensions: Utilization, Efficiency, Quality, and Satisfaction.
          </Text>
          <Text style={styles.introText}>
            Most organizations capture 40-60% of potential value — not because the technology doesn't work, but because value realization requires optimization across all four dimensions simultaneously.
          </Text>
        </View>

        <View style={styles.execSummary}>
          <Text style={styles.execTitle}>Executive Summary</Text>
          <Text style={styles.execText}>
            Based on your inputs, your organization is capturing <Text style={styles.bold}>{calculations.realizationScore}%</Text> of potential value — leaving <Text style={styles.bold}>{formatCurrency(calculations.annualGap)}</Text> per year unrealized. Over 3 years, this gap represents <Text style={styles.bold}>{formatCurrency(calculations.threeYearGap)}</Text>. You are in the "<Text style={styles.bold}>{calculations.maturityLevel}</Text>" stage.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>1</Text>
          </View>
          <Text style={styles.sectionTitle}>Your Performance vs. Benchmarks</Text>
        </View>

        <View style={styles.perfGrid}>
          <View style={styles.perfCell}>
            <Text style={styles.perfLabel}>Utilization</Text>
            <View style={styles.perfValues}>
              <Text style={styles.perfYou}>You: {inputs.utilization}%</Text>
              <Text style={styles.perfBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.utilization}%</Text>
            </View>
            <View style={styles.perfBar}>
              <View style={[styles.perfBarFill, { width: `${calculations.utilizationScore}%` }]} />
            </View>
            <Text style={styles.perfPercent}>{calculations.utilizationScore}%</Text>
          </View>
          <View style={[styles.perfCell, styles.perfCellRight]}>
            <Text style={styles.perfLabel}>Efficiency</Text>
            <View style={styles.perfValues}>
              <Text style={styles.perfYou}>You: {inputs.timeSavedPerEncounter}min</Text>
              <Text style={styles.perfBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg}min</Text>
            </View>
            <View style={styles.perfBar}>
              <View style={[styles.perfBarFill, { width: `${calculations.efficiencyScore}%` }]} />
            </View>
            <Text style={styles.perfPercent}>{calculations.efficiencyScore}%</Text>
          </View>
          <View style={[styles.perfCell, styles.perfCellBottom]}>
            <Text style={styles.perfLabel}>Quality (wRVU Lift)</Text>
            <View style={styles.perfValues}>
              <Text style={styles.perfYou}>You: +{inputs.wrvuLift}%</Text>
              <Text style={styles.perfBenchmark}>Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            </View>
            <View style={styles.perfBar}>
              <View style={[styles.perfBarFill, { width: `${calculations.qualityScore}%` }]} />
            </View>
            <Text style={styles.perfPercent}>{calculations.qualityScore}%</Text>
          </View>
          <View style={[styles.perfCell, styles.perfCellRight, styles.perfCellBottom]}>
            <Text style={styles.perfLabel}>Satisfaction</Text>
            <View style={styles.perfValues}>
              <Text style={styles.perfYou}>You: {inputs.satisfaction}%</Text>
              <Text style={styles.perfBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%</Text>
            </View>
            <View style={styles.perfBar}>
              <View style={[styles.perfBarFill, { width: `${calculations.satisfactionScore}%` }]} />
            </View>
            <Text style={styles.perfPercent}>{calculations.satisfactionScore}%</Text>
          </View>
        </View>

        <View style={styles.compoundBox}>
          <Text style={styles.compoundTitle}>WHY SMALL GAPS COMPOUND</Text>
          <Text style={styles.compoundText}>
            Ambient AI value is multiplicative. If you're at {calculations.utilizationScore}% of utilization, {calculations.efficiencyScore}% of efficiency, {calculations.qualityScore}% of quality, and {calculations.satisfactionScore}% of satisfaction potential — you're not simply at {calculations.realizationScore}% of total value. The gaps compound because each dimension affects the others.
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>2</Text>
          </View>
          <Text style={styles.sectionTitle}>The Cost of the Gap Over Time</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Cumulative unrealized value if gap persists:</Text>

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
          <Text style={styles.footerText}>Page 1/2</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>3</Text>
          </View>
          <Text style={styles.sectionTitle}>How the Gap Breaks Down</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Each gap represents value that exists but isn't being captured. These gaps compound — small improvements yield significant total value.
        </Text>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>UTILIZATION GAP</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.utilizationGapValue)}</Text>
          </View>
          <View style={styles.gapCardBarContainer}>
            <View style={styles.gapBar}>
              <View style={[styles.gapBarFill, { width: `${calculations.utilizationScore}%` }]} />
            </View>
            <View style={styles.gapBarValues}>
              <Text style={styles.gapBarText}>You: {inputs.utilization}%</Text>
              <Text style={styles.gapBarText}>Benchmark: {ABRIDGE_BENCHMARKS.utilization}%</Text>
            </View>
          </View>
          <View style={styles.gapContext}>
            <Text style={styles.contextTitle}>Why This Matters:</Text>
            <Text style={styles.contextText}>
              Every encounter not documented is time providers spend on notes that could be automated, an opportunity for quality improvement missed, and investment not being utilized.
            </Text>
          </View>
          <View style={styles.gapDrivers}>
            <Text style={styles.driversTitle}>What Drives Utilization:</Text>
            <Text style={styles.driverItem}>• Provider adoption and training</Text>
            <Text style={styles.driverItem}>• Workflow integration</Text>
            <Text style={styles.driverItem}>• Technical reliability</Text>
            <Text style={styles.driverItem}>• Specialty-specific optimization</Text>
          </View>
          <View style={styles.gapCardMath}>
            <Text style={styles.gapMathTitle}>The Math:</Text>
            <Text style={styles.gapMathLine}>• Your utilization: {inputs.utilization}% of {formatNumber(inputs.annualEncounters || 150000)} = {formatNumber(encountersAtCurrent)} documented</Text>
            <Text style={styles.gapMathLine}>• At benchmark ({ABRIDGE_BENCHMARKS.utilization}%): {formatNumber(encountersAtBenchmark)} would be documented</Text>
            <Text style={styles.gapMathLine}>• Gap: {formatNumber(encounterGap)} encounters × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {formatNumber(utilizationHoursGap)} hours</Text>
            <Text style={styles.gapMathLine}>• Value: {formatNumber(utilizationHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = {formatCurrency(calculations.utilizationGapValue)}</Text>
          </View>
        </View>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>EFFICIENCY GAP</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
          </View>
          <View style={styles.gapCardBarContainer}>
            <View style={styles.gapBar}>
              <View style={[styles.gapBarFill, { width: `${calculations.efficiencyScore}%` }]} />
            </View>
            <View style={styles.gapBarValues}>
              <Text style={styles.gapBarText}>You: {inputs.timeSavedPerEncounter}min</Text>
              <Text style={styles.gapBarText}>Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg}min</Text>
            </View>
          </View>
          <View style={styles.gapContext}>
            <Text style={styles.contextTitle}>Why This Matters:</Text>
            <Text style={styles.contextText}>
              Time savings is the core value proposition. If providers aren't seeing meaningful time back, they won't sustain adoption — and utilization will decline.
            </Text>
          </View>
          <View style={styles.gapDrivers}>
            <Text style={styles.driversTitle}>What Drives Efficiency:</Text>
            <Text style={styles.driverItem}>• Note quality and accuracy (less editing)</Text>
            <Text style={styles.driverItem}>• EHR integration depth</Text>
            <Text style={styles.driverItem}>• Template and workflow optimization</Text>
            <Text style={styles.driverItem}>• Provider trust in the output</Text>
          </View>
          <View style={styles.gapCardMath}>
            <Text style={styles.gapMathTitle}>The Math:</Text>
            <Text style={styles.gapMathLine}>• You save {inputs.timeSavedPerEncounter} min/encounter, benchmark is {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
            <Text style={styles.gapMathLine}>• Gap: {efficiencyTimeDiff} min × {formatNumber(encountersAtBenchmark)} encounters = {formatNumber(efficiencyHoursGap)} hours</Text>
            <Text style={styles.gapMathLine}>• Value: {formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}</Text>
          </View>
        </View>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>QUALITY GAP (wRVU)</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.wrvuGapValue)}</Text>
          </View>
          <View style={styles.gapCardBarContainer}>
            <View style={styles.gapBar}>
              <View style={[styles.gapBarFill, { width: `${calculations.qualityScore}%` }]} />
            </View>
            <View style={styles.gapBarValues}>
              <Text style={styles.gapBarText}>You: +{inputs.wrvuLift}%</Text>
              <Text style={styles.gapBarText}>Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            </View>
          </View>
          <View style={styles.gapContext}>
            <Text style={styles.contextTitle}>Why This Matters:</Text>
            <Text style={styles.contextText}>
              Better documentation leads to more accurate coding and appropriate reimbursement. This is often the largest financial lever in ambient AI.
            </Text>
          </View>
          <View style={styles.gapDrivers}>
            <Text style={styles.driversTitle}>What Drives Quality:</Text>
            <Text style={styles.driverItem}>• Documentation completeness</Text>
            <Text style={styles.driverItem}>• HCC and chronic condition capture</Text>
            <Text style={styles.driverItem}>• Accurate level of service coding</Text>
            <Text style={styles.driverItem}>• Denial reduction</Text>
          </View>
          <View style={styles.gapCardMath}>
            <Text style={styles.gapMathTitle}>The Math:</Text>
            <Text style={styles.gapMathLine}>• Your wRVU lift: +{inputs.wrvuLift}%, benchmark is +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            <Text style={styles.gapMathLine}>• Gap: {wrvuGapPercent}% × {formatNumber(encountersAtBenchmark)} × 1.5 wRVU = {formatNumber(additionalWrvu)} wRVU</Text>
            <Text style={styles.gapMathLine}>• Value: {formatNumber(additionalWrvu)} × ${VALUE_ASSUMPTIONS.wrvuDollarValue} × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = {formatCurrency(calculations.wrvuGapValue)}</Text>
          </View>
        </View>

        <View style={styles.totalGapBox}>
          <View>
            <Text style={styles.totalGapLabel}>TOTAL ANNUAL GAP</Text>
            <Text style={styles.totalGapBreakdown}>
              Utilization ({formatCurrency(calculations.utilizationGapValue)}) + Efficiency ({formatCurrency(calculations.efficiencyGapValue)}) + Quality ({formatCurrency(calculations.wrvuGapValue)})
            </Text>
          </View>
          <Text style={styles.totalGapValue}>{formatCurrency(calculations.annualGap)}</Text>
        </View>

        <View style={styles.pathForward}>
          <Text style={styles.pathTitle}>The Path Forward</Text>
          <Text style={styles.pathText}>
            You're capturing <Text style={styles.bold}>{calculations.realizationScore}%</Text> of potential value from your ambient AI investment. This is common — most organizations land in the "{calculations.maturityLevel}" stage without focused optimization.
          </Text>
          <Text style={styles.pathText}>
            But the gap represents real dollars: <Text style={styles.bold}>{formatCurrency(calculations.annualGap)}</Text> this year, <Text style={styles.bold}>{formatCurrency(calculations.threeYearGap)}</Text> over three years.
          </Text>
          <Text style={styles.pathSteps}>The path to closing this gap involves:</Text>
          <Text style={styles.pathStep}>1. Understanding which dimension has the largest opportunity (for you: {lowestDimension.name})</Text>
          <Text style={styles.pathStep}>2. Diagnosing the root causes of underperformance</Text>
          <Text style={styles.pathStep}>3. Implementing targeted optimization strategies</Text>
          <Text style={styles.pathStep}>4. Measuring progress and iterating</Text>
          <Text style={styles.pathConclusion}>
            This assessment gives you the baseline. The next step is understanding what's driving your gaps and what it would take to close them.
          </Text>
        </View>

        <View style={styles.questionBox}>
          <Text style={styles.questionText}>
            The question: What would it take to move from {calculations.realizationScore}% to 75%+ value realization — and capture the {formatCurrency(calculations.annualGap)} annual opportunity?
          </Text>
        </View>

        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Methodology</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>• {inputs.providers} providers, {formatNumber(inputs.annualEncounters || 150000)} encounters</Text>
              <Text style={styles.methodologyItem}>• {inputs.utilization}% util, {inputs.timeSavedPerEncounter}min saved, +{inputs.wrvuLift}% wRVU, {inputs.satisfaction}% sat</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Benchmarks</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.utilization}% util, {ABRIDGE_BENCHMARKS.timeSavedAvg}min saved, +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU, {ABRIDGE_BENCHMARKS.satisfaction}% sat</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            Benchmarks from 200+ health system partners. Valuation: ${VALUE_ASSUMPTIONS.hourlyRate}/hr loaded rate, {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}-{VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% time conversion, ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU at {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/2</Text>
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
