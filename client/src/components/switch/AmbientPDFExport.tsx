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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  metricItem: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.borderGray,
  },
  metricItemLast: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRightWidth: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
  },
  metricValueCoral: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.coral,
  },
  metricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },

  execSummary: {
    marginBottom: 12,
  },
  execTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  execText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "bold",
    color: colors.black,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionNumber: {
    backgroundColor: colors.coral,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionNumberText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.darkGray,
    marginBottom: 8,
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
    padding: 10,
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
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  perfValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  perfYou: {
    fontSize: 8,
    color: colors.black,
  },
  perfBenchmark: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  perfBar: {
    height: 6,
    backgroundColor: colors.borderGray,
    borderRadius: 3,
  },
  perfBarFill: {
    height: 6,
    backgroundColor: colors.coral,
    borderRadius: 3,
  },
  perfPercent: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginTop: 4,
  },

  scoreSummary: {
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignItems: "center",
  },
  scoreSummaryText: {
    fontSize: 9,
    color: colors.darkGray,
  },

  graphContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  graphBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    height: 100,
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
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  monthlyText: {
    fontSize: 8,
    color: colors.coral,
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
  },
  gapCardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  gapCardBarContainer: {
    padding: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapBar: {
    height: 8,
    backgroundColor: colors.borderGray,
    borderRadius: 4,
    flexDirection: "row",
  },
  gapBarFill: {
    height: 8,
    backgroundColor: colors.coral,
    borderRadius: 4,
  },
  gapBarValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  gapBarText: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  gapCardMath: {
    padding: 8,
  },
  gapMathTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  gapMathLine: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },

  totalGapBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
    fontSize: 8,
    color: colors.darkGray,
    marginTop: 2,
  },

  takeawaysContainer: {
    marginBottom: 12,
  },
  takeawaysTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  takeawayItem: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "flex-start",
  },
  takeawayBullet: {
    fontSize: 8,
    color: colors.coral,
    marginRight: 6,
    width: 8,
  },
  takeawayText: {
    fontSize: 8,
    color: colors.darkGray,
    flex: 1,
    lineHeight: 1.4,
  },

  methodologySection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodologyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  methodologyColumn: {
    width: "50%",
    marginBottom: 8,
  },
  methodologyColumnTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 1,
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

const CostGraph = ({ year1, year2, year3 }: { year1: number; year2: number; year3: number }) => {
  const maxValue = year3;
  const graphWidth = 480;
  const graphHeight = 70;
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
          <Circle key={i} cx={point.x} cy={point.y} r={4} fill={colors.coral} />
        ))}
      </Svg>
      <View style={{ position: "absolute", top: 8, right: 20 }}>
        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.coral }}>{formatCurrency(year3)}</Text>
      </View>
      <View style={{ position: "absolute", top: 25, left: graphWidth * 0.33 }}>
        <Text style={{ fontSize: 8, color: colors.darkGray }}>{formatCurrency(year1)}</Text>
      </View>
      <View style={{ position: "absolute", top: 20, left: graphWidth * 0.58 }}>
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

  const largestGapName = 
    calculations.utilizationGapValue >= calculations.efficiencyGapValue && 
    calculations.utilizationGapValue >= calculations.wrvuGapValue
      ? "Utilization"
      : calculations.efficiencyGapValue >= calculations.wrvuGapValue
      ? "Efficiency"
      : "Quality";

  const largestGapScore = 
    largestGapName === "Utilization" ? calculations.utilizationScore :
    largestGapName === "Efficiency" ? calculations.efficiencyScore :
    calculations.qualityScore;

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

        <View style={styles.execSummary}>
          <Text style={styles.execTitle}>Executive Summary</Text>
          <Text style={styles.execText}>
            Based on your inputs, your organization is capturing{" "}
            <Text style={styles.bold}>{calculations.realizationScore}%</Text> of the potential value from ambient AI — leaving an estimated{" "}
            <Text style={styles.bold}>{formatCurrency(calculations.annualGap)}</Text> per year unrealized. Over 3 years, this gap represents{" "}
            <Text style={styles.bold}>{formatCurrency(calculations.threeYearGap)}</Text> in value that could be captured through improved utilization, efficiency, and documentation quality.
          </Text>
          <Text style={styles.execText}>
            You are in the "<Text style={styles.bold}>{calculations.maturityLevel}</Text>" stage of ambient AI value realization. Most organizations plateau here without focused optimization.
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

        <View style={styles.scoreSummary}>
          <Text style={styles.scoreSummaryText}>
            Average Score: <Text style={{ fontWeight: "bold", color: colors.coral }}>{calculations.realizationScore}%</Text> realized — "<Text style={{ fontWeight: "bold" }}>{calculations.maturityLevel}</Text>" stage
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
          Each gap below represents value that exists but isn't being captured. These gaps compound — small improvements in each area yield significant total value.
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
          <View style={styles.gapCardMath}>
            <Text style={styles.gapMathTitle}>The Math:</Text>
            <Text style={styles.gapMathLine}>• Your utilization: {inputs.utilization}% of {formatNumber(inputs.annualEncounters || 150000)} encounters = {formatNumber(encountersAtCurrent)} documented</Text>
            <Text style={styles.gapMathLine}>• At benchmark ({ABRIDGE_BENCHMARKS.utilization}%): {formatNumber(encountersAtBenchmark)} would be documented</Text>
            <Text style={styles.gapMathLine}>• Gap: {formatNumber(encounterGap)} encounters not getting ambient documentation</Text>
            <Text style={styles.gapMathLine}>• These encounters could save {ABRIDGE_BENCHMARKS.timeSavedAvg} min each = {formatNumber(utilizationHoursGap)} additional hours</Text>
            <Text style={styles.gapMathLine}>• Value: {formatNumber(utilizationHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion = {formatCurrency(calculations.utilizationGapValue)}</Text>
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
          <View style={styles.gapCardMath}>
            <Text style={styles.gapMathTitle}>The Math:</Text>
            <Text style={styles.gapMathLine}>• You save {inputs.timeSavedPerEncounter} min/encounter, benchmark is {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
            <Text style={styles.gapMathLine}>• Gap: {efficiencyTimeDiff} min/encounter × {formatNumber(encountersAtBenchmark)} encounters = {formatNumber(efficiencyHoursGap)} hours</Text>
            <Text style={styles.gapMathLine}>• Value: {formatNumber(efficiencyHoursGap)} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion = {formatCurrency(calculations.efficiencyGapValue)}</Text>
            <Text style={styles.gapMathLine}>• Note: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion is conservative — not all time converts</Text>
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
          <View style={styles.gapCardMath}>
            <Text style={styles.gapMathTitle}>The Math:</Text>
            <Text style={styles.gapMathLine}>• Your wRVU lift: +{inputs.wrvuLift}%, benchmark is +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            <Text style={styles.gapMathLine}>• Gap: {wrvuGapPercent}% additional wRVU lift potential</Text>
            <Text style={styles.gapMathLine}>• At {formatNumber(encountersAtBenchmark)} encounters × avg 1.5 wRVU × {wrvuGapPercent}% = {formatNumber(additionalWrvu)} additional wRVU</Text>
            <Text style={styles.gapMathLine}>• Value: {formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution = {formatCurrency(calculations.wrvuGapValue)}</Text>
            <Text style={styles.gapMathLine}>• Note: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution is conservative — other factors affect wRVU</Text>
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

        <View style={styles.divider} />

        <View style={styles.takeawaysContainer}>
          <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              You're capturing {calculations.realizationScore}% of ambient AI's potential value
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              The largest opportunity is in {largestGapName} ({largestGapScore}% of benchmark)
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              Closing the gap could recover {formatCurrency(calculations.annualGap)} annually / {formatCurrency(calculations.threeYearGap)} over 3 years
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              All calculations use conservative assumptions (see methodology)
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Methodology & Assumptions</Text>
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
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.utilization}% utilization (avg deployment)</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.timeSavedAvg} min saved/encounter (avg)</Text>
              <Text style={styles.methodologyItem}>• +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU lift (avg)</Text>
              <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.satisfaction}% satisfaction (avg)</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Calculated Values</Text>
              <Text style={styles.methodologyItem}>• Encounters at benchmark: {formatNumber(encountersAtBenchmark)}</Text>
              <Text style={styles.methodologyItem}>• Score: ({calculations.utilizationScore}+{calculations.efficiencyScore}+{calculations.qualityScore}+{calculations.satisfactionScore})/4 = {calculations.realizationScore}%</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Valuation Assumptions</Text>
              <Text style={styles.methodologyItem}>• Provider time: ${VALUE_ASSUMPTIONS.hourlyRate}/hr (loaded)</Text>
              <Text style={styles.methodologyItem}>• Time conversion: {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}-{VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</Text>
              <Text style={styles.methodologyItem}>• wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue} (Medicare CF)</Text>
              <Text style={styles.methodologyItem}>• wRVU attribution: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</Text>
              <Text style={styles.methodologyItem}>• 3-year multiplier: 3x annual</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            These benchmarks are based on aggregate performance data from 200+ health system partners. Individual results may vary based on specialty mix, payer contracts, and operational factors.
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
