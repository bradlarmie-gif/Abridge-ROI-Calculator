import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Rect,
  Line,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { MeasureState, MeasureResults } from "@/lib/measureCalculator";
import { calculateMeasureResults, generateTrendData } from "@/lib/measureCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF7F5",
  primaryDark: "#C42400",
  coral: "#F07B5F",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  borderGray: "#E5E7EB",
  backgroundGray: "#F8FAFC",
  white: "#FFFFFF",
  emerald: "#059669",
  emeraldLight: "#ECFDF5",
  emeraldDark: "#047857",
  amber: "#D97706",
  amberLight: "#FFFBEB",
  slate800: "#1e293b",
  slate900: "#0f172a",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  
  heroSection: {
    backgroundColor: colors.slate900,
    padding: 40,
    paddingBottom: 32,
  },
  heroLabel: {
    fontSize: 8,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 10,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  heroHighlight: {
    color: colors.coral,
  },
  heroSubtitle: {
    fontSize: 11,
    color: colors.lightGray,
    lineHeight: 1.7,
    maxWidth: 420,
  },
  heroMeta: {
    position: "absolute",
    top: 40,
    right: 40,
    textAlign: "right",
  },
  heroMetaText: {
    fontSize: 8,
    color: colors.lightGray,
    marginBottom: 2,
  },
  
  heroCompact: {
    backgroundColor: colors.slate900,
    padding: 32,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
  },
  heroCompactLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: "center",
  },
  heroCompactTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroCompactSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 440,
  },
  
  contentSection: {
    padding: 40,
    paddingTop: 28,
    flex: 1,
  },
  
  chapterLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: colors.mediumGray,
    marginBottom: 20,
    lineHeight: 1.6,
  },
  
  storyText: {
    fontSize: 10,
    color: colors.darkGray,
    lineHeight: 1.8,
    marginBottom: 14,
  },
  storyTextBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  
  metricsRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: "center",
  },
  metricBoxLast: {
    marginRight: 0,
  },
  metricBoxDark: {
    flex: 1,
    backgroundColor: colors.slate800,
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  metricLabelLight: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
  },
  metricValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.emerald,
  },
  metricValueLight: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
  },
  metricSub: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 3,
    textAlign: "center",
  },
  
  experimentCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
  },
  experimentHeader: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  experimentTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  experimentSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  experimentBody: {
    flexDirection: "row",
    padding: 12,
  },
  experimentColumn: {
    flex: 1,
    alignItems: "center",
  },
  experimentLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  experimentValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  experimentValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },
  experimentDelta: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.emerald,
    marginTop: 2,
  },
  
  rangeCard: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: "#FECDC4",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  rangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rangeTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primaryDark,
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  rangeSubtext: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  
  allocationCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  allocationName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  allocationPercent: {
    fontSize: 11,
    fontWeight: "bold",
  },
  allocationRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  allocationItem: {
    flex: 1,
  },
  allocationItemLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  allocationItemValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  allocationMath: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.8,
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  
  insightCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: 6,
    marginBottom: 14,
  },
  insightTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primaryDark,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
  },
  
  projectionCard: {
    backgroundColor: colors.slate800,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  projectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 14,
  },
  projectionGrid: {
    flexDirection: "row",
  },
  projectionItem: {
    flex: 1,
    alignItems: "center",
  },
  projectionItemLabel: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  projectionItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },
  projectionItemSub: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 2,
  },
  
  trendSection: {
    marginBottom: 20,
  },
  trendTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 12,
  },
  trendChart: {
    marginBottom: 16,
  },
  trendLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  trendLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  trendLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  trendLegendText: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  
  methodologySection: {
    marginTop: 16,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 16,
  },
  methodologyLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  methodologyItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.5,
    marginTop: 12,
    fontStyle: "italic",
  },
  
  footer: {
    marginTop: "auto",
    marginLeft: 40,
    marginRight: 40,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
  
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 16,
  },
});

interface MeasurePDFData {
  state: MeasureState;
  clientName?: string;
  preparedBy?: string;
}

const formatCurrency = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${Math.round(num).toLocaleString()}`;
};

const formatNumber = (num: number): string => Math.round(num).toLocaleString();

const formatPercent = (num: number): string => `${Math.round(num)}%`;

const AllocationBar = ({ percent, color, width = 200 }: { percent: number; color: string; width?: number }) => {
  const barWidth = Math.max((percent / 100) * width, 4);
  
  return (
    <Svg width={width} height={8}>
      <Rect x={0} y={0} width={width} height={8} fill={colors.backgroundGray} rx={4} />
      <Rect x={0} y={0} width={barWidth} height={8} fill={color} rx={4} />
    </Svg>
  );
};

const SimpleTrendChart = ({ 
  data, 
  width = 480, 
  height = 100,
  color = colors.emerald,
}: { 
  data: { month: string; abridge: number; baseline: number }[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  if (data.length === 0) return null;
  
  const padding = { left: 40, right: 20, top: 10, bottom: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const allValues = data.flatMap(d => [d.abridge, d.baseline]);
  const minValue = Math.min(...allValues) * 0.9;
  const maxValue = Math.max(...allValues) * 1.1;
  const range = maxValue - minValue || 1;
  
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };
  const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
  
  return (
    <Svg width={width} height={height}>
      <Rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill={colors.backgroundGray} />
      
      {data.map((d, i) => (
        <Line 
          key={`baseline-${i}`}
          x1={getX(i)} 
          y1={getY(d.baseline)} 
          x2={getX(i)} 
          y2={getY(d.baseline) + 0.5} 
          stroke={colors.lightGray}
          strokeWidth={2}
          strokeDasharray="4,2"
        />
      ))}
      
      {data.map((d, i) => {
        if (i === 0) return null;
        const prev = data[i - 1];
        return (
          <Line
            key={`line-${i}`}
            x1={getX(i - 1)}
            y1={getY(prev.abridge)}
            x2={getX(i)}
            y2={getY(d.abridge)}
            stroke={color}
            strokeWidth={2}
          />
        );
      })}
      
      {data.map((d, i) => (
        <Rect
          key={`dot-${i}`}
          x={getX(i) - 3}
          y={getY(d.abridge) - 3}
          width={6}
          height={6}
          fill={color}
          rx={3}
        />
      ))}
      
      {data.map((d, i) => (
        <Text
          key={`label-${i}`}
          x={getX(i)}
          y={height - 4}
          style={{ fontSize: 6, fill: colors.mediumGray, textAnchor: "middle" }}
        >
          {d.month}
        </Text>
      ))}
    </Svg>
  );
};

const MeasurePDFDocument = ({ state, clientName, preparedBy }: MeasurePDFData) => {
  const results = calculateMeasureResults(state);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayClientName = clientName || "Your Organization";
  const displayPreparedBy = preparedBy || "Abridge Partner Success";
  
  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const docValueConservative = wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.5;
  const docValueOptimistic = wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.75;
  
  const projectionMultiplier = 2;
  const projectedProviders = state.deployment.providers * projectionMultiplier;
  const projectedHours = Math.round(results.totalHoursSaved * projectionMultiplier);
  const projectedDocValueLow = docValueConservative * projectionMultiplier;
  const projectedDocValueHigh = docValueOptimistic * projectionMultiplier;
  const projectedTimeValue = results.timeReallocatedTotal * projectionMultiplier;
  
  const timeInNotesTrend = state.trendConfig.enabled ? generateTrendData(state, 'timeInNotes') : [];
  const wrvuTrend = state.trendConfig.enabled ? generateTrendData(state, 'wrvu') : [];
  
  const totalPages = state.trendConfig.enabled ? 5 : 5;

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1: YOUR STORY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        <View style={styles.heroSection}>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>{today}</Text>
            <Text style={styles.heroMetaText}>Prepared by {displayPreparedBy}</Text>
          </View>
          <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 24 }} />
          <Text style={styles.heroLabel}>Value Story</Text>
          <Text style={styles.heroTitle}>
            In {state.deployment.monthsOnAbridge} months, your {state.deployment.providers} providers{"\n"}
            <Text style={styles.heroHighlight}>reclaimed {formatNumber(results.totalHoursSaved)} hours.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            This isn't a projection or a benchmark. It's what your providers actually experienced—measured by comparing encounters with and without Abridge for the same providers.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>The Natural Experiment</Text>
          <Text style={styles.sectionTitle}>Your Providers as Their Own Control Group</Text>
          <Text style={styles.sectionSubtitle}>
            Of {formatNumber(state.deployment.totalEncounters)} total encounters, {formatNumber(state.deployment.abridgeEncounters)} used Abridge ({Math.round(state.deployment.utilizationRate)}% utilization). This gives us a clean comparison.
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Providers</Text>
              <Text style={styles.metricValue}>{state.deployment.providers}</Text>
              <Text style={styles.metricSub}>using Abridge</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Time Period</Text>
              <Text style={styles.metricValue}>{state.deployment.monthsOnAbridge}</Text>
              <Text style={styles.metricSub}>months</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Hours Saved</Text>
              <Text style={styles.metricValueGreen}>{formatNumber(results.totalHoursSaved)}</Text>
              <Text style={styles.metricSub}>from documentation</Text>
            </View>
            <View style={[styles.metricBoxDark, styles.metricBoxLast]}>
              <Text style={styles.metricLabelLight}>Per Provider/Week</Text>
              <Text style={styles.metricValueLight}>{results.qualityHoursPerWeek.toFixed(1)}h</Text>
              <Text style={[styles.metricSub, { color: colors.lightGray }]}>reclaimed</Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>What Makes This Different</Text>
            <Text style={styles.insightText}>
              Most ROI calculations use industry benchmarks. This one uses your data—your providers, your encounters, your before-and-after. When the same physician documents with and without Abridge, the difference is the difference.
            </Text>
          </View>
          
          <View style={styles.experimentCard}>
            <View style={styles.experimentHeader}>
              <Text style={styles.experimentTitle}>Time in Notes (Per Encounter)</Text>
              <Text style={styles.experimentSubtitle}>How long providers spend documenting each visit</Text>
            </View>
            <View style={styles.experimentBody}>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>Without Abridge</Text>
                <Text style={styles.experimentValue}>{state.timeEfficiency.timeInNotesWithout} min</Text>
              </View>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>With Abridge</Text>
                <Text style={styles.experimentValueGreen}>{state.timeEfficiency.timeInNotesWith} min</Text>
                <Text style={styles.experimentDelta}>-{results.timeInNotesDelta} min ({Math.round(results.timeInNotesDeltaPercent)}% faster)</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Image src={abridgeLogoPath} style={{ width: 70 }} />
          <Text style={styles.footerText}>Page 1 of {totalPages}</Text>
        </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 2: YOUR RESULTS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 2 · Your Results</Text>
          <Text style={styles.heroCompactTitle}>The Value You've Created</Text>
          <Text style={styles.heroCompactSubtitle}>
            Time saved and documentation improved—measured across {formatNumber(state.deployment.abridgeEncounters)} Abridge-assisted encounters.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>Time Benefits</Text>
          <Text style={styles.sectionTitle}>{formatNumber(results.totalHoursSaved)} Hours Reclaimed</Text>
          <Text style={styles.sectionSubtitle}>
            Your providers saved an average of {results.timeInNotesDelta} minutes per encounter. Over {formatNumber(state.deployment.abridgeEncounters)} encounters, that adds up.
          </Text>
          
          <View style={styles.experimentCard}>
            <View style={styles.experimentBody}>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>Without Abridge</Text>
                <Text style={styles.experimentValue}>{state.timeEfficiency.timeInNotesWithout} min/enc</Text>
              </View>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>With Abridge</Text>
                <Text style={styles.experimentValueGreen}>{state.timeEfficiency.timeInNotesWith} min/enc</Text>
              </View>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>Delta</Text>
                <Text style={styles.experimentDelta}>-{results.timeInNotesDelta} min</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Same-Day Closure</Text>
              <Text style={styles.metricValueGreen}>{state.timeEfficiency.sameDayClosureWith}%</Text>
              <Text style={styles.metricSub}>vs {state.timeEfficiency.sameDayClosureWithout}% before</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Days to Close</Text>
              <Text style={styles.metricValueGreen}>{state.timeEfficiency.timeToCloseWith}</Text>
              <Text style={styles.metricSub}>vs {state.timeEfficiency.timeToCloseWithout} before</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxLast]}>
              <Text style={styles.metricLabel}>Work Outside Hours</Text>
              <Text style={styles.metricValueGreen}>{state.timeEfficiency.workOutsideWith}h</Text>
              <Text style={styles.metricSub}>vs {state.timeEfficiency.workOutsideWithout}h before</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.chapterLabel}>Documentation Quality</Text>
          <Text style={styles.sectionTitle}>Better Capture, Better Documentation</Text>
          <Text style={styles.sectionSubtitle}>
            When documentation is easier, it's more complete. Here's what the data shows.
          </Text>
          
          <View style={styles.experimentCard}>
            <View style={styles.experimentHeader}>
              <Text style={styles.experimentTitle}>wRVU per Encounter</Text>
              <Text style={styles.experimentSubtitle}>Work Relative Value Units captured per patient visit</Text>
            </View>
            <View style={styles.experimentBody}>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>Without Abridge</Text>
                <Text style={styles.experimentValue}>{state.documentationQuality.wrvuWithout.toFixed(2)}</Text>
              </View>
              <View style={styles.experimentColumn}>
                <Text style={styles.experimentLabel}>With Abridge</Text>
                <Text style={styles.experimentValueGreen}>{state.documentationQuality.wrvuWith.toFixed(2)}</Text>
                <Text style={styles.experimentDelta}>+{wrvuDelta.toFixed(2)} ({Math.round(results.wrvuDeltaPercent)}%)</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.rangeCard}>
            <View style={styles.rangeHeader}>
              <Text style={styles.rangeTitle}>Documentation Value (Range)</Text>
              <Text style={styles.rangeValue}>{formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}</Text>
            </View>
            <Text style={styles.rangeSubtext}>
              Conservative estimate (50% attribution) to optimistic (75% attribution). The true value depends on how much of the wRVU improvement is directly attributable to Abridge vs other factors.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Image src={abridgeLogoPath} style={{ width: 70 }} />
          <Text style={styles.footerText}>Page 2 of {totalPages}</Text>
        </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: VALUE ALLOCATION */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 3 · Value Allocation</Text>
          <Text style={styles.heroCompactTitle}>Where Did the Time Go?</Text>
          <Text style={styles.heroCompactSubtitle}>
            {formatNumber(results.totalHoursSaved)} hours is a lot of time. Here's how your organization is using it.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          {state.allocation.hardSavingsPercent > 0 && (
            <View style={styles.allocationCard}>
              <View style={styles.allocationHeader}>
                <Text style={styles.allocationName}>Hard Savings</Text>
                <Text style={[styles.allocationPercent, { color: colors.emerald }]}>{state.allocation.hardSavingsPercent}%</Text>
              </View>
              <AllocationBar percent={state.allocation.hardSavingsPercent} color={colors.emerald} />
              <View style={styles.allocationRow}>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Hours Applied</Text>
                  <Text style={styles.allocationItemValue}>{formatNumber(results.hardSavingsHours)}</Text>
                </View>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Value Created</Text>
                  <Text style={[styles.allocationItemValue, { color: colors.emerald }]}>{formatCurrency(results.hardSavingsValue)}</Text>
                </View>
              </View>
              <Text style={styles.allocationMath}>
                {formatNumber(results.hardSavingsHours)} hours x ${state.calibration.otHourlyRate}/hr = {formatCurrency(results.hardSavingsValue)}
              </Text>
            </View>
          )}
          
          {state.allocation.capacityPercent > 0 && (
            <View style={styles.allocationCard}>
              <View style={styles.allocationHeader}>
                <Text style={styles.allocationName}>Capacity / Throughput</Text>
                <Text style={[styles.allocationPercent, { color: colors.primary }]}>{state.allocation.capacityPercent}%</Text>
              </View>
              <AllocationBar percent={state.allocation.capacityPercent} color={colors.primary} />
              <View style={styles.allocationRow}>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Hours Applied</Text>
                  <Text style={styles.allocationItemValue}>{formatNumber(results.capacityHours)}</Text>
                </View>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Additional Visits</Text>
                  <Text style={styles.allocationItemValue}>{formatNumber(results.capacityVisits)}</Text>
                </View>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Value Created</Text>
                  <Text style={[styles.allocationItemValue, { color: colors.primary }]}>{formatCurrency(results.capacityValue)}</Text>
                </View>
              </View>
              <Text style={styles.allocationMath}>
                {formatNumber(results.capacityHours)} hours / {state.calibration.minutesPerVisit} min/visit = {formatNumber(results.capacityVisits)} visits x ${state.calibration.revenuePerVisit}/visit = {formatCurrency(results.capacityValue)}
              </Text>
            </View>
          )}
          
          {state.allocation.qualityOfLifePercent > 0 && (
            <View style={styles.allocationCard}>
              <View style={styles.allocationHeader}>
                <Text style={styles.allocationName}>Quality of Life</Text>
                <Text style={[styles.allocationPercent, { color: colors.amber }]}>{state.allocation.qualityOfLifePercent}%</Text>
              </View>
              <AllocationBar percent={state.allocation.qualityOfLifePercent} color={colors.amber} />
              <View style={styles.allocationRow}>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Hours Applied</Text>
                  <Text style={styles.allocationItemValue}>{formatNumber(results.qualityHours)}</Text>
                </View>
                <View style={styles.allocationItem}>
                  <Text style={styles.allocationItemLabel}>Per Provider/Week</Text>
                  <Text style={[styles.allocationItemValue, { color: colors.amber }]}>{results.qualityHoursPerWeek.toFixed(1)} hours</Text>
                </View>
              </View>
              {state.allocation.qualityOfLifePercent >= 50 && (
                <View style={[styles.insightCard, { marginTop: 10, marginBottom: 0 }]}>
                  <Text style={styles.insightTitle}>Retention Context</Text>
                  <Text style={styles.insightText}>
                    If improved quality of life prevents just one physician departure, the avoided replacement cost ($300K–$500K) exceeds the investment many times over.
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {(state.allocation.hardSavingsPercent === 0 && state.allocation.capacityPercent === 0 && state.allocation.qualityOfLifePercent === 0) && (
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>Allocation Not Yet Configured</Text>
              <Text style={styles.insightText}>
                This section will show how saved time is being deployed once allocation percentages are set. The total time saved ({formatNumber(results.totalHoursSaved)} hours) can be distributed across hard savings, capacity, and quality of life.
              </Text>
            </View>
          )}
          
          <View style={styles.divider} />
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Time Value</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(results.timeReallocatedTotal)}</Text>
              <Text style={styles.metricSub}>from reallocation</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Documentation</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{formatCurrency(docValueConservative)}</Text>
              <Text style={styles.metricSub}>conservative est.</Text>
            </View>
            <View style={[styles.metricBoxDark, styles.metricBoxLast]}>
              <Text style={styles.metricLabelLight}>Total Value</Text>
              <Text style={styles.metricValueLight}>{formatCurrency(results.timeReallocatedTotal + docValueConservative)}</Text>
              <Text style={[styles.metricSub, { color: colors.lightGray }]}>combined</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Image src={abridgeLogoPath} style={{ width: 70 }} />
          <Text style={styles.footerText}>Page 3 of {totalPages}</Text>
        </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: THE PATH AHEAD */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 4 · The Path Ahead</Text>
          <Text style={styles.heroCompactTitle}>What If You Expanded?</Text>
          <Text style={styles.heroCompactSubtitle}>
            You've proven the model with {state.deployment.providers} providers. Here's what the math looks like at scale.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>Current State</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Providers</Text>
              <Text style={styles.metricValue}>{state.deployment.providers}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Utilization</Text>
              <Text style={styles.metricValue}>{Math.round(state.deployment.utilizationRate)}%</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Hours Saved</Text>
              <Text style={styles.metricValueGreen}>{formatNumber(results.totalHoursSaved)}</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxLast]}>
              <Text style={styles.metricLabel}>Total Value</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(results.timeReallocatedTotal + docValueConservative)}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.chapterLabel}>Expansion Projection</Text>
          <Text style={styles.sectionTitle}>At {projectedProviders} Providers</Text>
          <Text style={styles.sectionSubtitle}>
            If you expanded to {projectedProviders} providers while maintaining current utilization and performance patterns, here's the projected impact.
          </Text>
          
          <View style={styles.projectionCard}>
            <Text style={styles.projectionTitle}>Projected Annual Value</Text>
            <View style={styles.projectionGrid}>
              <View style={styles.projectionItem}>
                <Text style={styles.projectionItemLabel}>Providers</Text>
                <Text style={styles.projectionItemValue}>{projectedProviders}</Text>
                <Text style={styles.projectionItemSub}>{projectionMultiplier}x current</Text>
              </View>
              <View style={styles.projectionItem}>
                <Text style={styles.projectionItemLabel}>Hours Saved</Text>
                <Text style={styles.projectionItemValue}>{formatNumber(projectedHours)}</Text>
                <Text style={styles.projectionItemSub}>annually</Text>
              </View>
              <View style={styles.projectionItem}>
                <Text style={styles.projectionItemLabel}>Time Value</Text>
                <Text style={styles.projectionItemValue}>{formatCurrency(projectedTimeValue)}</Text>
                <Text style={styles.projectionItemSub}>from reallocation</Text>
              </View>
              <View style={styles.projectionItem}>
                <Text style={styles.projectionItemLabel}>Doc Value</Text>
                <Text style={styles.projectionItemValue}>{formatCurrency(projectedDocValueLow)}</Text>
                <Text style={styles.projectionItemSub}>conservative</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.rangeCard}>
            <View style={styles.rangeHeader}>
              <Text style={styles.rangeTitle}>Total Projected Value (at {projectedProviders} providers)</Text>
              <Text style={styles.rangeValue}>{formatCurrency(projectedTimeValue + projectedDocValueLow)} – {formatCurrency(projectedTimeValue + projectedDocValueHigh)}</Text>
            </View>
            <Text style={styles.rangeSubtext}>
              Based on current performance patterns. Conservative documentation attribution (50%) to optimistic (75%). Assumes utilization and efficiency gains remain consistent at scale.
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>The Scaling Story</Text>
            <Text style={styles.insightText}>
              Unlike scribe programs that scale linearly with headcount, AI documentation scales differently. Your per-provider investment decreases as adoption grows, while value creation remains consistent per encounter. The {state.deployment.providers}-provider proof of concept gives stakeholders confidence in what {projectedProviders} providers could deliver.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Image src={abridgeLogoPath} style={{ width: 70 }} />
          <Text style={styles.footerText}>Page 4 of {totalPages}</Text>
        </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 5: METHODOLOGY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 5 · Methodology</Text>
          <Text style={styles.heroCompactTitle}>How We Calculated This</Text>
          <Text style={styles.heroCompactSubtitle}>
            Transparency matters. Here are the inputs, assumptions, and methodology behind these numbers.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          {state.trendConfig.enabled && timeInNotesTrend.length > 0 && (
            <View style={styles.trendSection}>
              <Text style={styles.chapterLabel}>Performance Over Time</Text>
              <Text style={styles.trendTitle}>Time in Notes (Monthly Trend)</Text>
              <View style={styles.trendChart}>
                <SimpleTrendChart data={timeInNotesTrend} color={colors.emerald} />
              </View>
              <View style={styles.trendLegend}>
                <View style={styles.trendLegendItem}>
                  <View style={[styles.trendLegendDot, { backgroundColor: colors.emerald }]} />
                  <Text style={styles.trendLegendText}>With Abridge</Text>
                </View>
                <View style={styles.trendLegendItem}>
                  <View style={[styles.trendLegendDot, { backgroundColor: colors.lightGray }]} />
                  <Text style={styles.trendLegendText}>Baseline (Without)</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.methodologySection}>
            <Text style={styles.methodologyTitle}>Your Inputs</Text>
            <View style={styles.methodologyGrid}>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyLabel}>Deployment</Text>
                <Text style={styles.methodologyItem}>- {state.deployment.providers} providers</Text>
                <Text style={styles.methodologyItem}>- {formatNumber(state.deployment.totalEncounters)} total encounters</Text>
                <Text style={styles.methodologyItem}>- {formatNumber(state.deployment.abridgeEncounters)} Abridge encounters</Text>
                <Text style={styles.methodologyItem}>- {Math.round(state.deployment.utilizationRate)}% utilization</Text>
                <Text style={styles.methodologyItem}>- {state.deployment.monthsOnAbridge} months on Abridge</Text>
              </View>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyLabel}>Time Efficiency</Text>
                <Text style={styles.methodologyItem}>- {state.timeEfficiency.timeInNotesWithout} min without → {state.timeEfficiency.timeInNotesWith} min with</Text>
                <Text style={styles.methodologyItem}>- {state.timeEfficiency.sameDayClosureWithout}% same-day → {state.timeEfficiency.sameDayClosureWith}%</Text>
                <Text style={styles.methodologyItem}>- {state.timeEfficiency.timeToCloseWithout} days to close → {state.timeEfficiency.timeToCloseWith}</Text>
                <Text style={styles.methodologyItem}>- {state.timeEfficiency.workOutsideWithout}h outside work → {state.timeEfficiency.workOutsideWith}h</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.methodologySection}>
            <Text style={styles.methodologyTitle}>Value Assumptions</Text>
            <View style={styles.methodologyGrid}>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyLabel}>Calibration</Text>
                <Text style={styles.methodologyItem}>- Provider hourly rate: ${state.calibration.otHourlyRate}</Text>
                <Text style={styles.methodologyItem}>- Minutes per visit: {state.calibration.minutesPerVisit}</Text>
                <Text style={styles.methodologyItem}>- Revenue per visit: ${state.calibration.revenuePerVisit}</Text>
                <Text style={styles.methodologyItem}>- wRVU conversion factor: ${state.calibration.conversionFactor}</Text>
              </View>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyLabel}>Allocation</Text>
                <Text style={styles.methodologyItem}>- Hard savings: {state.allocation.hardSavingsPercent}%</Text>
                <Text style={styles.methodologyItem}>- Capacity/throughput: {state.allocation.capacityPercent}%</Text>
                <Text style={styles.methodologyItem}>- Quality of life: {state.allocation.qualityOfLifePercent}%</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.methodologySection}>
            <Text style={styles.methodologyTitle}>Key Formulas</Text>
            <View style={styles.methodologyGrid}>
              <View style={[styles.methodologyColumn, { flex: 2 }]}>
                <Text style={styles.methodologyItem}>- Time Saved = (Time Without - Time With) x Abridge Encounters / 60</Text>
                <Text style={styles.methodologyItem}>- Hard Savings = Time Saved x Hard Savings % x Hourly Rate</Text>
                <Text style={styles.methodologyItem}>- Capacity Value = (Time Saved x Capacity %) / Min per Visit x Revenue per Visit</Text>
                <Text style={styles.methodologyItem}>- wRVU Value = wRVU Delta x Encounters x Conversion Factor x Attribution %</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.methodologyNote}>
            This analysis is for informational purposes only. Results are based on the inputs provided and reflect actual organizational data. Documentation value uses a range (50%-75% attribution) to acknowledge uncertainty about causation. Past performance does not guarantee future results. Consult with your finance team before making investment decisions based on these projections.
          </Text>
        </View>
        
        <View style={styles.footer}>
          <View>
            <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 6 }} />
            <Text style={styles.footerText}>Questions? Contact your Abridge Partner Success team.</Text>
          </View>
          <Text style={styles.footerText}>Page 5 of {totalPages}</Text>
        </View>
        </View>
      </Page>
    </Document>
  );
};

export async function generateMeasurePDF(
  state: MeasureState,
  clientName?: string,
  preparedBy?: string
): Promise<void> {
  const blob = await pdf(
    <MeasurePDFDocument state={state} clientName={clientName} preparedBy={preparedBy} />
  ).toBlob();
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const fileName = `abridge-value-story-${new Date().toISOString().split("T")[0]}.pdf`;
  
  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
}

export default MeasurePDFDocument;
