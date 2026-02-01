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
import type { MeasureState } from "@/lib/measureCalculator";
import { calculateMeasureResults, generateTrendData } from "@/lib/measureCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

const colors = {
  primary: "#EA2C00",
  coral: "#F07B5F",
  black: "#0f172a",
  darkGray: "#334155",
  mediumGray: "#64748b",
  lightGray: "#94a3b8",
  borderGray: "#e2e8f0",
  backgroundGray: "#f8fafc",
  white: "#FFFFFF",
  emerald: "#059669",
  emeraldLight: "#d1fae5",
  amber: "#d97706",
  amberLight: "#fef3c7",
  slate800: "#1e293b",
  slate900: "#0f172a",
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

  fullHero: {
    backgroundColor: colors.slate900,
    flex: 1,
    padding: 48,
    justifyContent: "space-between",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroMeta: {
    textAlign: "right",
  },
  heroMetaText: {
    fontSize: 8,
    color: colors.lightGray,
    marginBottom: 2,
  },
  heroCenter: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  heroLabel: {
    fontSize: 8,
    color: colors.coral,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 14,
  },
  heroBigNumber: {
    fontSize: 64,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: -2,
    marginBottom: 6,
  },
  heroBigUnit: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.coral,
    marginBottom: 20,
  },
  heroNarrative: {
    fontSize: 12,
    color: colors.lightGray,
    lineHeight: 1.7,
    maxWidth: 420,
  },
  heroNarrativeHighlight: {
    color: colors.white,
    fontWeight: "bold",
  },
  heroBottom: {
    borderTopWidth: 1,
    borderTopColor: colors.slate800,
    paddingTop: 20,
  },
  heroStatsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  heroStat: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  heroStatSub: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 1,
  },

  compactHero: {
    backgroundColor: colors.slate900,
    padding: 32,
    paddingTop: 24,
    paddingBottom: 20,
  },
  compactHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactHeroLeft: {
    flex: 1,
  },
  compactHeroLabel: {
    fontSize: 7,
    color: colors.coral,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  compactHeroTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: -0.3,
  },
  compactHeroRight: {
    alignItems: "flex-end",
  },
  compactHeroNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.coral,
  },
  compactHeroUnit: {
    fontSize: 8,
    color: colors.lightGray,
    marginTop: 2,
  },

  content: {
    flex: 1,
    padding: 36,
    paddingTop: 24,
  },

  sectionLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headline: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  subheadline: {
    fontSize: 9,
    color: colors.mediumGray,
    lineHeight: 1.6,
    marginBottom: 16,
  },

  prose: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.7,
    marginBottom: 14,
  },
  proseBold: {
    fontWeight: "bold",
    color: colors.black,
  },

  metricsTable: {
    marginBottom: 16,
  },
  metricsTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    paddingBottom: 6,
    marginBottom: 8,
  },
  metricsTableHeaderCell: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricsTableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundGray,
  },
  metricsTableCell: {
    fontSize: 9,
    color: colors.darkGray,
  },
  metricsTableCellBold: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  metricsTableCellGreen: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.emerald,
  },

  comparisonRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  comparisonCard: {
    flex: 1,
    padding: 14,
    marginRight: 8,
  },
  comparisonCardLast: {
    marginRight: 0,
  },
  comparisonCardLight: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
  },
  comparisonCardDark: {
    backgroundColor: colors.slate900,
    borderRadius: 8,
  },
  comparisonLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  comparisonLabelLight: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  comparisonValueLight: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.white,
  },
  comparisonUnit: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },
  comparisonUnitLight: {
    fontSize: 8,
    color: colors.lightGray,
    marginTop: 2,
  },
  comparisonDelta: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.emerald,
    marginTop: 4,
  },

  trendContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
  },
  trendTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 12,
  },
  trendLegend: {
    flexDirection: "row",
    marginTop: 10,
  },
  trendLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  trendLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  trendLegendText: {
    fontSize: 7,
    color: colors.mediumGray,
  },

  valueCard: {
    backgroundColor: colors.slate900,
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
  },
  valueCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueCardLabel: {
    fontSize: 8,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueCardAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.white,
  },
  valueCardSub: {
    fontSize: 8,
    color: colors.lightGray,
    marginTop: 4,
  },

  allocationSection: {
    marginBottom: 16,
  },
  allocationItem: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  allocationName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  allocationPercent: {
    fontSize: 10,
    fontWeight: "bold",
  },
  allocationBar: {
    marginBottom: 8,
  },
  allocationDetails: {
    flexDirection: "row",
  },
  allocationDetailItem: {
    flex: 1,
  },
  allocationDetailLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  allocationDetailValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  allocationMath: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
  },

  docQualitySection: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  docQualityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  docQualityTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  docQualityValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
  },
  docQualityGrid: {
    flexDirection: "row",
  },
  docQualityItem: {
    flex: 1,
  },
  docQualityLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  docQualityMetric: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.darkGray,
  },

  insightBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    backgroundColor: "#fef7f5",
    padding: 12,
    marginBottom: 14,
  },
  insightText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  summaryTable: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  summaryTableHeader: {
    backgroundColor: colors.slate900,
    padding: 10,
  },
  summaryTableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.white,
  },
  summaryTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  summaryTableRowAlt: {
    backgroundColor: colors.backgroundGray,
  },
  summaryTableCell: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    color: colors.darkGray,
  },
  summaryTableCellLabel: {
    flex: 2,
    padding: 8,
    fontSize: 8,
    color: colors.darkGray,
  },
  summaryTableCellValue: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "right",
  },
  summaryTableCellValueGreen: {
    flex: 1,
    padding: 8,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.emerald,
    textAlign: "right",
  },

  projectionGrid: {
    flexDirection: "row",
    marginBottom: 16,
  },
  projectionCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 14,
    marginRight: 8,
    alignItems: "center",
  },
  projectionCardLast: {
    marginRight: 0,
  },
  projectionCardDark: {
    backgroundColor: colors.slate900,
  },
  projectionLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  projectionLabelLight: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  projectionValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  projectionValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },
  projectionValueLight: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  projectionSub: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
    textAlign: "center",
  },
  projectionSubLight: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 2,
    textAlign: "center",
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 14,
  },

  methodology: {
    marginBottom: 12,
  },
  methodologyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 8,
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
  methodologyItem: {
    fontSize: 7,
    color: colors.mediumGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.5,
    marginTop: 12,
    fontStyle: "italic",
  },

  footer: {
    marginTop: "auto",
    marginLeft: 36,
    marginRight: 36,
    marginBottom: 20,
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

const AllocationBar = ({ percent, color, width = 380 }: { percent: number; color: string; width?: number }) => {
  const barWidth = Math.max((percent / 100) * width, 4);
  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} fill={colors.borderGray} rx={3} />
      <Rect x={0} y={0} width={barWidth} height={6} fill={color} rx={3} />
    </Svg>
  );
};

const SimpleTrendChart = ({
  data,
  width = 380,
  height = 100,
  color = colors.emerald,
}: {
  data: { month: string; abridge: number; baseline: number }[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  if (data.length === 0) return null;

  const padding = { left: 32, right: 12, top: 12, bottom: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => [d.abridge, d.baseline]);
  const minValue = Math.min(...allValues) * 0.85;
  const maxValue = Math.max(...allValues) * 1.1;
  const range = maxValue - minValue || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };
  const getY = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / range) * chartHeight;

  return (
    <Svg width={width} height={height}>
      <Rect
        x={padding.left}
        y={padding.top}
        width={chartWidth}
        height={chartHeight}
        fill={colors.white}
        rx={4}
      />

      <Line
        x1={padding.left}
        y1={getY(data[0].baseline)}
        x2={padding.left + chartWidth}
        y2={getY(data[0].baseline)}
        stroke={colors.lightGray}
        strokeWidth={1}
        strokeDasharray="3,2"
      />

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
  const displayPreparedBy = preparedBy || "Abridge Partner Success";

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const docValueConservative =
    wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.5;
  const docValueOptimistic =
    wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.75;

  const totalValueLow = results.timeReallocatedTotal + docValueConservative;
  const totalValueHigh = results.timeReallocatedTotal + docValueOptimistic;

  const projectionMultiplier = 2;
  const projectedProviders = state.deployment.providers * projectionMultiplier;
  const projectedHours = Math.round(results.totalHoursSaved * projectionMultiplier);
  const projectedValueLow = totalValueLow * projectionMultiplier;
  const projectedValueHigh = totalValueHigh * projectionMultiplier;

  const timeInNotesTrend = state.trendConfig.enabled
    ? generateTrendData(state, "timeInNotes")
    : [];
  const wrvuTrend = state.trendConfig.enabled
    ? generateTrendData(state, "wrvu")
    : [];
  const sameDayClosureTrend = state.trendConfig.enabled
    ? generateTrendData(state, "sameDayClosure")
    : [];
  
  const hasTimeInNotesTrend = state.trendConfig.enabled && timeInNotesTrend.length >= 2;
  const hasWrvuTrend = state.trendConfig.enabled && wrvuTrend.length >= 2;
  const hasSameDayClosureTrend = state.trendConfig.enabled && sameDayClosureTrend.length >= 2;
  const hasAnyTrends = hasTimeInNotesTrend || hasWrvuTrend || hasSameDayClosureTrend;

  const totalPages = 5;

  return (
    <Document>
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.fullHero}>
          <View style={styles.heroTop}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{today}</Text>
              <Text style={styles.heroMetaText}>Prepared by {displayPreparedBy}</Text>
            </View>
          </View>

          <View style={styles.heroCenter}>
            <Text style={styles.heroLabel}>Your Value Story</Text>
            <Text style={styles.heroBigNumber}>{formatNumber(Math.round(results.totalHoursSaved))}</Text>
            <Text style={styles.heroBigUnit}>hours reclaimed</Text>
            <Text style={styles.heroNarrative}>
              In {state.deployment.monthsOnAbridge} months, your{" "}
              <Text style={styles.heroNarrativeHighlight}>{state.deployment.providers} providers</Text> reclaimed this
              time from documentation. This report shows what you've built together—and what's possible next.
            </Text>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Total Encounters</Text>
                <Text style={styles.heroStatValue}>{formatNumber(state.deployment.totalEncounters)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Abridge Encounters</Text>
                <Text style={styles.heroStatValue}>{formatNumber(state.deployment.abridgeEncounters)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Utilization Rate</Text>
                <Text style={styles.heroStatValue}>{Math.round(state.deployment.utilizationRate)}%</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Time Per Provider/Week</Text>
                <Text style={styles.heroStatValue}>{results.qualityHoursPerWeek.toFixed(1)}h</Text>
              </View>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Time Reallocation Value</Text>
                <Text style={styles.heroStatValue}>{formatCurrency(results.timeReallocatedTotal)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Documentation Value</Text>
                <Text style={styles.heroStatValue}>{formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}</Text>
                <Text style={styles.heroStatSub}>50-75% attribution</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Combined Annual Value</Text>
                <Text style={styles.heroStatValue}>{formatCurrency(totalValueLow)} – {formatCurrency(totalValueHigh)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Months on Abridge</Text>
                <Text style={styles.heroStatValue}>{state.deployment.monthsOnAbridge}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 2: TIME EFFICIENCY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>Time Efficiency</Text>
                <Text style={styles.compactHeroTitle}>Your Providers as Their Own Control Group</Text>
              </View>
              <View style={styles.compactHeroRight}>
                <Text style={styles.compactHeroNumber}>-{results.timeInNotesDelta}</Text>
                <Text style={styles.compactHeroUnit}>min per encounter</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              Of {formatNumber(state.deployment.totalEncounters)} total encounters,{" "}
              {formatNumber(state.deployment.abridgeEncounters)} used Abridge ({Math.round(state.deployment.utilizationRate)}% utilization). 
              The remaining {formatNumber(state.deployment.nonAbridgeEncounters)} did not. Same physicians, same patient panels—different documentation experience.
            </Text>

            <Text style={styles.sectionLabel}>Primary Metric: Time in Notes</Text>
            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonCard, styles.comparisonCardLight]}>
                <Text style={styles.comparisonLabel}>Without Abridge</Text>
                <Text style={styles.comparisonValue}>{state.timeEfficiency.timeInNotesWithout}</Text>
                <Text style={styles.comparisonUnit}>minutes per encounter</Text>
              </View>
              <View style={[styles.comparisonCard, styles.comparisonCardDark, styles.comparisonCardLast]}>
                <Text style={styles.comparisonLabelLight}>With Abridge</Text>
                <Text style={styles.comparisonValueLight}>{state.timeEfficiency.timeInNotesWith}</Text>
                <Text style={styles.comparisonUnitLight}>minutes per encounter</Text>
                <Text style={styles.comparisonDelta}>{Math.round(results.timeInNotesDeltaPercent)}% reduction</Text>
              </View>
            </View>

            {hasTimeInNotesTrend && (
              <View style={styles.trendContainer}>
                <Text style={styles.trendTitle}>Time in Notes Over {state.deployment.monthsOnAbridge} Months</Text>
                <SimpleTrendChart data={timeInNotesTrend} color={colors.emerald} />
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
            
            {hasSameDayClosureTrend && (
              <View style={styles.trendContainer}>
                <Text style={styles.trendTitle}>Same-Day Closure Rate Over {state.deployment.monthsOnAbridge} Months</Text>
                <SimpleTrendChart data={sameDayClosureTrend} color={colors.primary} />
                <View style={styles.trendLegend}>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.trendLegendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.trendLegendText}>With Abridge</Text>
                  </View>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.trendLegendDot, { backgroundColor: colors.lightGray }]} />
                    <Text style={styles.trendLegendText}>Baseline (Without)</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>Additional Efficiency Metrics</Text>
            <View style={styles.metricsTable}>
              <View style={styles.metricsTableHeader}>
                <Text style={[styles.metricsTableHeaderCell, { flex: 2 }]}>Metric</Text>
                <Text style={[styles.metricsTableHeaderCell, { flex: 1, textAlign: "right" }]}>Without</Text>
                <Text style={[styles.metricsTableHeaderCell, { flex: 1, textAlign: "right" }]}>With</Text>
                <Text style={[styles.metricsTableHeaderCell, { flex: 1, textAlign: "right" }]}>Change</Text>
              </View>
              <View style={styles.metricsTableRow}>
                <Text style={[styles.metricsTableCell, { flex: 2 }]}>Same-Day Note Closure</Text>
                <Text style={[styles.metricsTableCell, { flex: 1, textAlign: "right" }]}>{state.timeEfficiency.sameDayClosureWithout}%</Text>
                <Text style={[styles.metricsTableCellBold, { flex: 1, textAlign: "right" }]}>{state.timeEfficiency.sameDayClosureWith}%</Text>
                <Text style={[styles.metricsTableCellGreen, { flex: 1, textAlign: "right" }]}>+{results.sameDayClosureDelta}pp</Text>
              </View>
              <View style={styles.metricsTableRow}>
                <Text style={[styles.metricsTableCell, { flex: 2 }]}>Days to Close</Text>
                <Text style={[styles.metricsTableCell, { flex: 1, textAlign: "right" }]}>{state.timeEfficiency.timeToCloseWithout}</Text>
                <Text style={[styles.metricsTableCellBold, { flex: 1, textAlign: "right" }]}>{state.timeEfficiency.timeToCloseWith}</Text>
                <Text style={[styles.metricsTableCellGreen, { flex: 1, textAlign: "right" }]}>-{results.timeToCloseDelta.toFixed(1)} days</Text>
              </View>
              <View style={styles.metricsTableRow}>
                <Text style={[styles.metricsTableCell, { flex: 2 }]}>Work Outside Hours (hrs/day)</Text>
                <Text style={[styles.metricsTableCell, { flex: 1, textAlign: "right" }]}>{state.timeEfficiency.workOutsideWithout}</Text>
                <Text style={[styles.metricsTableCellBold, { flex: 1, textAlign: "right" }]}>{state.timeEfficiency.workOutsideWith}</Text>
                <Text style={[styles.metricsTableCellGreen, { flex: 1, textAlign: "right" }]}>-{results.workOutsideDelta.toFixed(1)}h ({Math.round(results.workOutsideDeltaPercent)}%)</Text>
              </View>
            </View>

            <View style={styles.valueCard}>
              <View style={styles.valueCardRow}>
                <View>
                  <Text style={styles.valueCardLabel}>Total Hours Reclaimed</Text>
                  <Text style={styles.valueCardAmount}>{formatNumber(Math.round(results.totalHoursSaved))}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.valueCardLabel}>Calculation</Text>
                  <Text style={styles.valueCardSub}>
                    {results.timeInNotesDelta} min saved x {formatNumber(state.deployment.abridgeEncounters)} encounters / 60
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 2 of {totalPages}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 3: VALUE ALLOCATION */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>Value Allocation</Text>
                <Text style={styles.compactHeroTitle}>Where the Time Went</Text>
              </View>
              <View style={styles.compactHeroRight}>
                <Text style={styles.compactHeroNumber}>{formatNumber(Math.round(results.totalHoursSaved))}</Text>
                <Text style={styles.compactHeroUnit}>hours allocated</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              Time saved only creates value when it goes somewhere. Based on your allocation, here's how the {formatNumber(Math.round(results.totalHoursSaved))} hours 
              reclaimed from documentation are being deployed across your organization.
            </Text>

            <View style={styles.allocationSection}>
              {state.allocation.hardSavingsPercent > 0 && (
                <View style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationName}>Hard Savings</Text>
                    <Text style={[styles.allocationPercent, { color: colors.emerald }]}>{state.allocation.hardSavingsPercent}%</Text>
                  </View>
                  <View style={styles.allocationBar}>
                    <AllocationBar percent={state.allocation.hardSavingsPercent} color={colors.emerald} />
                  </View>
                  <View style={styles.allocationDetails}>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Hours Applied</Text>
                      <Text style={styles.allocationDetailValue}>{formatNumber(Math.round(results.hardSavingsHours))}</Text>
                    </View>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Hourly Rate</Text>
                      <Text style={styles.allocationDetailValue}>${state.calibration.otHourlyRate}</Text>
                    </View>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Value Created</Text>
                      <Text style={[styles.allocationDetailValue, { color: colors.emerald }]}>{formatCurrency(results.hardSavingsValue)}</Text>
                    </View>
                  </View>
                  <Text style={styles.allocationMath}>
                    {formatNumber(Math.round(results.hardSavingsHours))} hours x ${state.calibration.otHourlyRate}/hr = {formatCurrency(results.hardSavingsValue)}
                  </Text>
                </View>
              )}

              {state.allocation.capacityPercent > 0 && (
                <View style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationName}>Capacity / Throughput</Text>
                    <Text style={[styles.allocationPercent, { color: colors.primary }]}>{state.allocation.capacityPercent}%</Text>
                  </View>
                  <View style={styles.allocationBar}>
                    <AllocationBar percent={state.allocation.capacityPercent} color={colors.primary} />
                  </View>
                  <View style={styles.allocationDetails}>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Hours Applied</Text>
                      <Text style={styles.allocationDetailValue}>{formatNumber(Math.round(results.capacityHours))}</Text>
                    </View>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Additional Visits</Text>
                      <Text style={styles.allocationDetailValue}>{formatNumber(Math.round(results.capacityVisits))}</Text>
                    </View>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Value Created</Text>
                      <Text style={[styles.allocationDetailValue, { color: colors.primary }]}>{formatCurrency(results.capacityValue)}</Text>
                    </View>
                  </View>
                  <Text style={styles.allocationMath}>
                    {formatNumber(Math.round(results.capacityHours))} hrs / {state.calibration.minutesPerVisit} min = {formatNumber(Math.round(results.capacityVisits))} visits x ${state.calibration.revenuePerVisit} = {formatCurrency(results.capacityValue)}
                  </Text>
                </View>
              )}

              {state.allocation.qualityOfLifePercent > 0 && (
                <View style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationName}>Quality of Life</Text>
                    <Text style={[styles.allocationPercent, { color: colors.amber }]}>{state.allocation.qualityOfLifePercent}%</Text>
                  </View>
                  <View style={styles.allocationBar}>
                    <AllocationBar percent={state.allocation.qualityOfLifePercent} color={colors.amber} />
                  </View>
                  <View style={styles.allocationDetails}>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Hours Applied</Text>
                      <Text style={styles.allocationDetailValue}>{formatNumber(Math.round(results.qualityHours))}</Text>
                    </View>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Per Provider</Text>
                      <Text style={styles.allocationDetailValue}>{(results.qualityHours / state.deployment.providers).toFixed(0)} hrs total</Text>
                    </View>
                    <View style={styles.allocationDetailItem}>
                      <Text style={styles.allocationDetailLabel}>Per Week</Text>
                      <Text style={[styles.allocationDetailValue, { color: colors.amber }]}>{results.qualityHoursPerWeek.toFixed(1)} hrs/provider</Text>
                    </View>
                  </View>
                  {state.allocation.qualityOfLifePercent >= 50 && (
                    <View style={[styles.insightBox, { marginTop: 8, marginBottom: 0 }]}>
                      <Text style={styles.insightText}>
                        Physician replacement costs $300K-$500K. If improved wellbeing prevents even one departure, the retention value exceeds the investment.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {state.allocation.hardSavingsPercent === 0 &&
                state.allocation.capacityPercent === 0 &&
                state.allocation.qualityOfLifePercent === 0 && (
                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      Allocation not yet configured. The {formatNumber(Math.round(results.totalHoursSaved))} hours saved can be distributed across 
                      hard savings, capacity, and quality of life based on how your organization is using the time.
                    </Text>
                  </View>
                )}
            </View>

            <View style={styles.docQualitySection}>
              <View style={styles.docQualityHeader}>
                <Text style={styles.docQualityTitle}>Documentation Quality Improvement</Text>
                <Text style={styles.docQualityValue}>{formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}</Text>
              </View>
              <View style={styles.docQualityGrid}>
                <View style={styles.docQualityItem}>
                  <Text style={styles.docQualityLabel}>wRVU Without</Text>
                  <Text style={styles.docQualityMetric}>{state.documentationQuality.wrvuWithout.toFixed(2)}</Text>
                </View>
                <View style={styles.docQualityItem}>
                  <Text style={styles.docQualityLabel}>wRVU With</Text>
                  <Text style={styles.docQualityMetric}>{state.documentationQuality.wrvuWith.toFixed(2)}</Text>
                </View>
                <View style={styles.docQualityItem}>
                  <Text style={styles.docQualityLabel}>Delta</Text>
                  <Text style={[styles.docQualityMetric, { color: colors.emerald }]}>+{wrvuDelta.toFixed(2)} ({Math.round(results.wrvuDeltaPercent)}%)</Text>
                </View>
                <View style={styles.docQualityItem}>
                  <Text style={styles.docQualityLabel}>Attribution</Text>
                  <Text style={styles.docQualityMetric}>50-75%</Text>
                </View>
              </View>
              
              {hasWrvuTrend && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.trendTitle, { marginBottom: 8 }]}>wRVU per Encounter Over {state.deployment.monthsOnAbridge} Months</Text>
                  <SimpleTrendChart data={wrvuTrend} color={colors.primary} width={360} height={80} />
                  <View style={[styles.trendLegend, { marginTop: 6 }]}>
                    <View style={styles.trendLegendItem}>
                      <View style={[styles.trendLegendDot, { backgroundColor: colors.primary }]} />
                      <Text style={styles.trendLegendText}>With Abridge</Text>
                    </View>
                    <View style={styles.trendLegendItem}>
                      <View style={[styles.trendLegendDot, { backgroundColor: colors.lightGray }]} />
                      <Text style={styles.trendLegendText}>Baseline</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.valueCard}>
              <View style={styles.valueCardRow}>
                <View>
                  <Text style={styles.valueCardLabel}>Total Value Created</Text>
                  <Text style={styles.valueCardAmount}>{formatCurrency(totalValueLow)} – {formatCurrency(totalValueHigh)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.valueCardSub}>Time: {formatCurrency(results.timeReallocatedTotal)}</Text>
                  <Text style={styles.valueCardSub}>Docs: {formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 3 of {totalPages}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 4: THE PATH AHEAD */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>The Path Ahead</Text>
                <Text style={styles.compactHeroTitle}>What's Possible at Scale</Text>
              </View>
              <View style={styles.compactHeroRight}>
                <Text style={styles.compactHeroNumber}>{projectedProviders}</Text>
                <Text style={styles.compactHeroUnit}>providers projected</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              You've proven the model with {state.deployment.providers} providers over {state.deployment.monthsOnAbridge} months. 
              If you expanded to {projectedProviders} providers while maintaining current utilization and efficiency gains, here's what the numbers suggest.
            </Text>

            <Text style={styles.sectionLabel}>Current State vs. Projection</Text>
            <View style={styles.summaryTable}>
              <View style={styles.summaryTableHeader}>
                <Text style={styles.summaryTableHeaderText}>Key Metrics Comparison</Text>
              </View>
              <View style={styles.summaryTableRow}>
                <Text style={styles.summaryTableCellLabel}>Metric</Text>
                <Text style={styles.summaryTableCellValue}>Current</Text>
                <Text style={styles.summaryTableCellValue}>At {projectedProviders} Providers</Text>
              </View>
              <View style={[styles.summaryTableRow, styles.summaryTableRowAlt]}>
                <Text style={styles.summaryTableCellLabel}>Providers</Text>
                <Text style={styles.summaryTableCellValue}>{state.deployment.providers}</Text>
                <Text style={styles.summaryTableCellValueGreen}>{projectedProviders}</Text>
              </View>
              <View style={styles.summaryTableRow}>
                <Text style={styles.summaryTableCellLabel}>Hours Saved (Annual)</Text>
                <Text style={styles.summaryTableCellValue}>{formatNumber(Math.round(results.totalHoursSaved))}</Text>
                <Text style={styles.summaryTableCellValueGreen}>{formatNumber(projectedHours)}</Text>
              </View>
              <View style={[styles.summaryTableRow, styles.summaryTableRowAlt]}>
                <Text style={styles.summaryTableCellLabel}>Time Reallocation Value</Text>
                <Text style={styles.summaryTableCellValue}>{formatCurrency(results.timeReallocatedTotal)}</Text>
                <Text style={styles.summaryTableCellValueGreen}>{formatCurrency(results.timeReallocatedTotal * projectionMultiplier)}</Text>
              </View>
              <View style={styles.summaryTableRow}>
                <Text style={styles.summaryTableCellLabel}>Documentation Value (Low)</Text>
                <Text style={styles.summaryTableCellValue}>{formatCurrency(docValueConservative)}</Text>
                <Text style={styles.summaryTableCellValueGreen}>{formatCurrency(docValueConservative * projectionMultiplier)}</Text>
              </View>
              <View style={[styles.summaryTableRow, styles.summaryTableRowAlt]}>
                <Text style={styles.summaryTableCellLabel}>Documentation Value (High)</Text>
                <Text style={styles.summaryTableCellValue}>{formatCurrency(docValueOptimistic)}</Text>
                <Text style={styles.summaryTableCellValueGreen}>{formatCurrency(docValueOptimistic * projectionMultiplier)}</Text>
              </View>
              <View style={styles.summaryTableRow}>
                <Text style={[styles.summaryTableCellLabel, { fontWeight: "bold" }]}>Total Value Range</Text>
                <Text style={styles.summaryTableCellValue}>{formatCurrency(totalValueLow)} – {formatCurrency(totalValueHigh)}</Text>
                <Text style={styles.summaryTableCellValueGreen}>{formatCurrency(projectedValueLow)} – {formatCurrency(projectedValueHigh)}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Projected Outcomes</Text>
            <View style={styles.projectionGrid}>
              <View style={styles.projectionCard}>
                <Text style={styles.projectionLabel}>Providers</Text>
                <Text style={styles.projectionValue}>{projectedProviders}</Text>
                <Text style={styles.projectionSub}>{projectionMultiplier}x current</Text>
              </View>
              <View style={styles.projectionCard}>
                <Text style={styles.projectionLabel}>Hours Saved</Text>
                <Text style={styles.projectionValueGreen}>{formatNumber(projectedHours)}</Text>
                <Text style={styles.projectionSub}>annually</Text>
              </View>
              <View style={[styles.projectionCard, styles.projectionCardDark, styles.projectionCardLast]}>
                <Text style={styles.projectionLabelLight}>Projected Value</Text>
                <Text style={styles.projectionValueLight}>{formatCurrency(projectedValueLow)}</Text>
                <Text style={styles.projectionSubLight}>to {formatCurrency(projectedValueHigh)}</Text>
              </View>
            </View>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                Unlike scribe programs that scale linearly with headcount, AI documentation scales differently. 
                Per-provider investment decreases as adoption grows, while value creation remains consistent per encounter. 
                The {state.deployment.providers}-provider proof of concept demonstrates what {projectedProviders} providers could deliver.
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Assumptions for Projection</Text>
            <Text style={styles.prose}>
              This projection assumes: (1) utilization rate remains at {Math.round(state.deployment.utilizationRate)}%, 
              (2) time savings per encounter remain consistent at {results.timeInNotesDelta} minutes, 
              (3) wRVU improvements continue at +{wrvuDelta.toFixed(2)} per encounter, and 
              (4) your allocation pattern remains similar across the expanded provider base.
            </Text>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 4 of {totalPages}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 5: METHODOLOGY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>Methodology</Text>
                <Text style={styles.compactHeroTitle}>How We Calculated This</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              This analysis uses your organization's actual data—not industry benchmarks or theoretical projections. 
              Here's exactly what went into the calculations and the assumptions behind them.
            </Text>

            {hasAnyTrends && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.methodologyTitle}>Performance Trends (Advanced)</Text>
                <View style={styles.metricsTable}>
                  <View style={styles.metricsTableHeader}>
                    <Text style={[styles.metricsTableHeaderCell, { flex: 2 }]}>Metric</Text>
                    <Text style={[styles.metricsTableHeaderCell, { flex: 1, textAlign: "right" }]}>Month 1</Text>
                    <Text style={[styles.metricsTableHeaderCell, { flex: 1, textAlign: "right" }]}>Current</Text>
                    <Text style={[styles.metricsTableHeaderCell, { flex: 1, textAlign: "right" }]}>Trend</Text>
                  </View>
                  {hasTimeInNotesTrend && timeInNotesTrend.length >= 2 && (
                    <View style={styles.metricsTableRow}>
                      <Text style={[styles.metricsTableCell, { flex: 2 }]}>Time in Notes (min)</Text>
                      <Text style={[styles.metricsTableCell, { flex: 1, textAlign: "right" }]}>{timeInNotesTrend[0].abridge.toFixed(1)}</Text>
                      <Text style={[styles.metricsTableCellBold, { flex: 1, textAlign: "right" }]}>{timeInNotesTrend[timeInNotesTrend.length - 1].abridge.toFixed(1)}</Text>
                      <Text style={[styles.metricsTableCellGreen, { flex: 1, textAlign: "right" }]}>
                        {timeInNotesTrend[timeInNotesTrend.length - 1].abridge < timeInNotesTrend[0].abridge ? "Improving" : "Stable"}
                      </Text>
                    </View>
                  )}
                  {hasWrvuTrend && wrvuTrend.length >= 2 && (
                    <View style={styles.metricsTableRow}>
                      <Text style={[styles.metricsTableCell, { flex: 2 }]}>wRVU per Encounter</Text>
                      <Text style={[styles.metricsTableCell, { flex: 1, textAlign: "right" }]}>{wrvuTrend[0].abridge.toFixed(2)}</Text>
                      <Text style={[styles.metricsTableCellBold, { flex: 1, textAlign: "right" }]}>{wrvuTrend[wrvuTrend.length - 1].abridge.toFixed(2)}</Text>
                      <Text style={[styles.metricsTableCellGreen, { flex: 1, textAlign: "right" }]}>
                        {wrvuTrend[wrvuTrend.length - 1].abridge > wrvuTrend[0].abridge ? "Improving" : "Stable"}
                      </Text>
                    </View>
                  )}
                  {hasSameDayClosureTrend && sameDayClosureTrend.length >= 2 && (
                    <View style={styles.metricsTableRow}>
                      <Text style={[styles.metricsTableCell, { flex: 2 }]}>Same-Day Closure (%)</Text>
                      <Text style={[styles.metricsTableCell, { flex: 1, textAlign: "right" }]}>{sameDayClosureTrend[0].abridge.toFixed(0)}</Text>
                      <Text style={[styles.metricsTableCellBold, { flex: 1, textAlign: "right" }]}>{sameDayClosureTrend[sameDayClosureTrend.length - 1].abridge.toFixed(0)}</Text>
                      <Text style={[styles.metricsTableCellGreen, { flex: 1, textAlign: "right" }]}>
                        {sameDayClosureTrend[sameDayClosureTrend.length - 1].abridge > sameDayClosureTrend[0].abridge ? "Improving" : "Stable"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.divider} />
              </View>
            )}

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Your Deployment Data</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>{state.deployment.providers} providers over {state.deployment.monthsOnAbridge} months</Text>
                  <Text style={styles.methodologyItem}>{formatNumber(state.deployment.totalEncounters)} total encounters analyzed</Text>
                  <Text style={styles.methodologyItem}>{formatNumber(state.deployment.abridgeEncounters)} Abridge-assisted encounters</Text>
                  <Text style={styles.methodologyItem}>{formatNumber(state.deployment.nonAbridgeEncounters)} non-Abridge encounters (control)</Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>{Math.round(state.deployment.utilizationRate)}% utilization rate</Text>
                  <Text style={styles.methodologyItem}>Care setting: {state.careSetting || "Outpatient"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Time Efficiency Inputs</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>Time in notes: {state.timeEfficiency.timeInNotesWithout} min (without) → {state.timeEfficiency.timeInNotesWith} min (with)</Text>
                  <Text style={styles.methodologyItem}>Same-day closure: {state.timeEfficiency.sameDayClosureWithout}% → {state.timeEfficiency.sameDayClosureWith}%</Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>Days to close: {state.timeEfficiency.timeToCloseWithout} → {state.timeEfficiency.timeToCloseWith}</Text>
                  <Text style={styles.methodologyItem}>Work outside hours: {state.timeEfficiency.workOutsideWithout}h → {state.timeEfficiency.workOutsideWith}h</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Documentation Quality Inputs</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>wRVU per encounter: {state.documentationQuality.wrvuWithout.toFixed(2)} (without) → {state.documentationQuality.wrvuWith.toFixed(2)} (with)</Text>
                  <Text style={styles.methodologyItem}>E/M level: {state.documentationQuality.emLevelWithout.toFixed(1)} (without) → {state.documentationQuality.emLevelWith.toFixed(1)} (with)</Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>wRVU conversion factor: ${state.calibration.conversionFactor}</Text>
                  <Text style={styles.methodologyItem}>Attribution range: 50-75%</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Value Calibration</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>Provider hourly rate (for hard savings): ${state.calibration.otHourlyRate}</Text>
                  <Text style={styles.methodologyItem}>Average visit duration: {state.calibration.minutesPerVisit} minutes</Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>Revenue per visit (for capacity): ${state.calibration.revenuePerVisit}</Text>
                  <Text style={styles.methodologyItem}>Allocation: {state.allocation.hardSavingsPercent}% hard / {state.allocation.capacityPercent}% capacity / {state.allocation.qualityOfLifePercent}% QoL</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Key Formulas</Text>
              <View style={styles.methodologyGrid}>
                <View style={[styles.methodologyColumn, { flex: 2 }]}>
                  <Text style={styles.methodologyItem}>Hours Saved = (Time Without - Time With) x Abridge Encounters / 60</Text>
                  <Text style={styles.methodologyItem}>Hard Savings Value = Hours Saved x Hard Savings % x Hourly Rate</Text>
                  <Text style={styles.methodologyItem}>Capacity Value = (Hours Saved x Capacity %) / Min per Visit x Revenue per Visit</Text>
                  <Text style={styles.methodologyItem}>wRVU Value = wRVU Delta x Abridge Encounters x Conversion Factor x Attribution %</Text>
                </View>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              This analysis is for informational purposes. Documentation value uses a 50-75% attribution range to acknowledge uncertainty about causation—
              the wRVU improvement may be partially attributable to other factors. Projections assume current patterns continue at scale. 
              Past performance does not guarantee future results. Consult with your finance team before making investment decisions based on these numbers.
            </Text>
          </View>

          <View style={styles.footer}>
            <View>
              <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 4 }} />
              <Text style={styles.footerText}>Questions? Reach out to your Abridge Partner Success team.</Text>
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

  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const fileName = `abridge-value-story-${new Date().toISOString().split("T")[0]}.pdf`;

  if (isMobile) {
    // Try Web Share API first (works great on iOS for AirDrop, Messages, etc.)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: "Abridge Value Story" };
      
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          // User cancelled or share failed, fall through to download
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }
    
    // Fallback: Create download link and trigger click
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
}

export default MeasurePDFDocument;
