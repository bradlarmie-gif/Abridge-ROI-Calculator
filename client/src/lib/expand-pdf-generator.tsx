import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Svg,
  Path,
  Line,
  Circle,
  Rect,
  Polyline,
  G,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// TYPES
// ============================================================================

export interface MetricTrendPoint {
  month: string;
  value: number;
}

export interface MetricBenchmark {
  typicalRange: string;
  typicalMin: number;
  typicalMax: number;
  status: "below" | "within" | "above";
  statusLabel: string;
}

export interface ExpandMetricData {
  id: string;
  name: string;
  description: string;
  before: number;
  after: number;
  change: number;
  changePercent: number;
  unit: string;
  isPositiveGood: boolean;
  value?: number;
  formula?: string;
  formulaExplanation?: string;
  whatThisMeans?: string;
  trend?: MetricTrendPoint[];
  trendDirection?: "improving" | "stable" | "declining";
  benchmark?: MetricBenchmark;
  warningMessage?: string;
}

export interface TierData {
  name: string;
  items: {
    label: string;
    value: number | string;
    formula?: string;
    explanation?: string;
    isSpeculative?: boolean;
  }[];
  total?: number;
}

export interface ExpansionData {
  currentProviders: number;
  currentUtilization: number;
  currentValue: number;
  targetProviders: number;
  targetUtilization: number;
  projectedValue: number;
  expansionValue: number;
}

export interface OptimizationOpportunity {
  title: string;
  current: string;
  target: string;
  potentialValue: number;
  action: string;
}

export interface ExpandPDFData {
  organizationName?: string;
  careSetting: string;
  
  providers: number;
  encounters: number;
  utilizationRate: number;
  monthsOnAbridge: number;
  documentedEncounters: number;
  
  tier1Value: number;
  tier2Items: { label: string; value: string; formula?: string; explanation?: string }[];
  tier3Items: { label: string; value: string; explanation?: string }[];
  
  metrics: ExpandMetricData[];
  
  expansion: ExpansionData;
  
  valueConfig: {
    timeConversionMethod: string;
    conversionPercent?: number;
    retentionEnabled: boolean;
  };
  
  workingWell: string[];
  areasToWatch: string[];
  optimizationOpportunities: OptimizationOpportunity[];
  
  warnings: {
    type: string;
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
  }[];
}

// ============================================================================
// COLORS
// ============================================================================

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  green: "#059669",
  greenLight: "#ECFDF5",
  greenDark: "#047857",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  paleGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  blueDark: "#1E40AF",
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 50,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logo: {
    width: 85,
    height: 17,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },

  orgContext: {
    marginBottom: 12,
  },
  orgName: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.black,
  },
  orgDetails: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  pageTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },

  narrativeBox: {
    backgroundColor: colors.paleGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  narrativeTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  narrativeText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.black,
  },

  heroRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  heroBox: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  heroBoxHighlight: {
    flex: 1,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  heroValue: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: 3,
  },
  heroValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
    marginBottom: 3,
  },
  heroLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 3,
  },
  heroSublabel: {
    fontSize: 6,
    color: colors.lightGray,
    marginTop: 2,
    textAlign: "center",
  },

  card: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: colors.paleGray,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  cardHeaderGreen: {
    backgroundColor: colors.greenLight,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.green,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  cardSubtitle: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 1,
  },
  cardValue: {
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  cardContent: {
    padding: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 8,
    color: colors.darkGray,
  },
  rowFormula: {
    fontSize: 6.5,
    color: colors.lightGray,
    marginTop: 2,
    fontFamily: "Courier",
  },
  rowExplanation: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
    lineHeight: 1.4,
  },
  rowValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "right",
  },
  rowValueNeutral: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "right",
  },

  metricCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  metricHeader: {
    backgroundColor: colors.paleGray,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  metricName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  metricDesc: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
    textAlign: "right",
  },
  metricContent: {
    padding: 10,
  },

  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  comparisonBox: {
    alignItems: "center",
    minWidth: 70,
  },
  comparisonLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
  comparisonUnit: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 1,
  },
  comparisonArrow: {
    fontSize: 14,
    color: colors.mediumGray,
    marginHorizontal: 14,
  },
  comparisonChange: {
    alignItems: "center",
    backgroundColor: colors.greenLight,
    borderRadius: 4,
    padding: 8,
    minWidth: 70,
  },
  comparisonChangeValue: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  comparisonChangePercent: {
    fontSize: 7,
    color: colors.greenDark,
    marginTop: 1,
  },

  sectionBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  sectionBoxTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  benchmarkBox: {
    backgroundColor: colors.blueLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
    padding: 8,
    marginBottom: 8,
    borderRadius: 3,
  },
  benchmarkTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.blueDark,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  benchmarkText: {
    fontSize: 7.5,
    color: colors.blueDark,
    lineHeight: 1.4,
  },

  warningBox: {
    backgroundColor: colors.amberLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    padding: 8,
    marginBottom: 8,
    borderRadius: 3,
  },
  warningTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.amberDark,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 7.5,
    color: colors.amberDark,
    lineHeight: 1.4,
  },

  valueCalcBox: {
    backgroundColor: colors.greenLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    padding: 8,
    marginBottom: 8,
    borderRadius: 3,
  },
  valueCalcTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.greenDark,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  valueCalcFormula: {
    fontSize: 8,
    color: colors.green,
    fontFamily: "Courier",
    fontWeight: "bold",
    marginBottom: 4,
  },
  valueCalcText: {
    fontSize: 7,
    color: colors.greenDark,
    lineHeight: 1.4,
  },

  meaningBox: {
    backgroundColor: colors.paleGray,
    borderLeftWidth: 3,
    borderLeftColor: colors.mediumGray,
    padding: 8,
    marginTop: 6,
    borderRadius: 3,
  },
  meaningTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 7.5,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  trendChartContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    minHeight: 80,
  },
  trendLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  trendSummary: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 6,
  },

  checkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  checkMark: {
    fontSize: 8,
    color: colors.green,
    marginRight: 6,
    fontWeight: "bold",
  },
  arrowMark: {
    fontSize: 8,
    color: colors.amber,
    marginRight: 6,
    fontWeight: "bold",
  },
  checkText: {
    flex: 1,
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.4,
  },

  opportunityCard: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  opportunityCardExpanded: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  contextBox: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  bottomLineBox: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.darkGray,
    borderRadius: 4,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  opportunityTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  opportunityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  opportunityLabel: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  opportunityValue: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
  },
  opportunityAction: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 4,
    fontStyle: "italic",
    lineHeight: 1.4,
  },

  twoColumn: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },

  journeyChart: {
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    minHeight: 90,
  },

  methodologyGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  methodologyColumn: {
    flex: 1,
  },
  methodologyTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },

  closingBox: {
    backgroundColor: colors.paleGray,
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  closingText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    fontStyle: "italic",
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

const getToday = (): string => {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================

const Header = ({ title }: { title: string }) => (
  <View style={styles.header}>
    <Image src={abridgeLogoPath} style={styles.logo} />
    <View style={styles.headerRight}>
      <Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerSubtitle}>{getToday()}</Text>
    </View>
  </View>
);

// ============================================================================
// FOOTER COMPONENT
// ============================================================================

const Footer = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>Abridge Value Realization Report</Text>
    <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
  </View>
);

// ============================================================================
// TREND CHART COMPONENT - Professional SVG Chart for React-PDF
// ============================================================================

interface TrendDataPoint {
  label: string;
  value: number;
  isBaseline?: boolean;
  isCurrent?: boolean;
}

const TrendChart = ({ 
  metric, 
  baseline 
}: { 
  metric: ExpandMetricData;
  baseline: number;
}) => {
  const trend = metric.trend || [];
  if (trend.length === 0) {
    return null;
  }

  // Transform metric data to chart data points
  const data: TrendDataPoint[] = [
    { label: "BL", value: baseline, isBaseline: true },
    ...trend.map((t, i) => ({
      label: `M${i + 1}`,
      value: t.value,
      isCurrent: i === trend.length - 1,
    })),
  ];

  const width = 460;
  const height = 100;
  const positiveIsGood = metric.isPositiveGood;
  const valueSuffix = metric.unit;

  // Chart dimensions - SVG width accounts for Y-axis labels column (35px)
  const yAxisColumnWidth = 35;
  const svgWidth = width - yAxisColumnWidth;
  const padding = { top: 15, right: 15, bottom: 25, left: 10 }; // Reduced left padding since Y-axis is external
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate value range
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const valuePadding = valueRange * 0.15;
  const yMin = minValue - valuePadding;
  const yMax = maxValue + valuePadding;
  const yRange = yMax - yMin;

  // Calculate positions
  const xStep = chartWidth / (data.length - 1);
  
  const getX = (index: number) => padding.left + (index * xStep);
  const getY = (value: number) => padding.top + chartHeight - ((value - yMin) / yRange * chartHeight);

  // Generate path for the line
  const linePath = data.map((point, i) => {
    const x = getX(i);
    const y = getY(point.value);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");

  // Generate path for the area fill
  const areaPath = `${linePath} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Calculate trend summary
  const current = data[data.length - 1];
  const change = current.value - baseline;
  const changePercent = baseline !== 0 ? (change / baseline) * 100 : 0;
  const isPositiveTrend = positiveIsGood ? change >= 0 : change <= 0;
  const trendIndicator = isPositiveTrend ? "↗" : "↘";
  const trendLabel = Math.abs(changePercent) < 2 ? "Stable" : 
                     isPositiveTrend ? "Consistent improvement" : "Needs attention";

  // Chart colors
  const chartColors = {
    line: colors.green,
    area: "#10B98120",
    baseline: colors.primary,
    current: colors.green,
    currentRing: colors.white,
    grid: "#E5E7EB",
    text: colors.mediumGray,
    labelText: colors.darkGray,
    axisLine: "#D1D5DB",
  };

  // Y-axis tick values (3 ticks)
  const yTicks = [
    { value: yMin + yRange * 0.1, y: getY(yMin + yRange * 0.1) },
    { value: yMin + yRange * 0.5, y: getY(yMin + yRange * 0.5) },
    { value: yMin + yRange * 0.9, y: getY(yMin + yRange * 0.9) },
  ];

  // Format value for display
  const formatValue = (val: number) => {
    if (valueSuffix === "%" || valueSuffix.includes("wRVU")) {
      return val.toFixed(2);
    }
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(1);
  };

  // Generate Y-axis labels for display outside SVG
  const yAxisLabels = yTicks.map(tick => ({
    value: formatValue(tick.value),
    topOffset: tick.y - padding.top,
  }));

  return (
    <View style={styles.trendChartContainer}>
      <Text style={styles.trendLabel}>YOUR TREND ({trend.length} months)</Text>
      <View style={{ flexDirection: "row" }}>
        {/* Y-axis labels column */}
        <View style={{ width: yAxisColumnWidth, height: chartHeight + padding.top + padding.bottom, justifyContent: "flex-start", paddingTop: padding.top }}>
          {yAxisLabels.map((label, i) => (
            <Text
              key={`y-label-${i}`}
              style={{
                fontSize: 7,
                color: chartColors.text,
                textAlign: "right",
                position: "absolute",
                top: label.topOffset - 4,
                right: 2,
              }}
            >
              {label.value}
            </Text>
          ))}
        </View>
        
        {/* Chart SVG */}
        <Svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
        {/* Background */}
        <Rect x={0} y={0} width={svgWidth} height={height} fill="#F9FAFB" rx={4} />
        
        {/* Chart area background */}
        <Rect 
          x={padding.left} 
          y={padding.top} 
          width={chartWidth} 
          height={chartHeight} 
          fill={colors.white} 
        />

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={padding.left + chartWidth}
            y2={tick.y}
            stroke={chartColors.grid}
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        ))}

        {/* Y-axis line */}
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke={chartColors.axisLine}
          strokeWidth={1}
        />

        {/* X-axis line */}
        <Line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke={chartColors.axisLine}
          strokeWidth={1}
        />

        {/* Area fill under line */}
        <Path
          d={areaPath}
          fill={chartColors.area}
        />

        {/* Main line */}
        <Path
          d={linePath}
          stroke={chartColors.line}
          strokeWidth={2.5}
          fill="none"
        />

        {/* Data points */}
        {data.map((point, i) => {
          const x = getX(i);
          const y = getY(point.value);
          
          if (point.isBaseline) {
            return (
              <G key={`point-${i}`}>
                <Circle cx={x} cy={y} r={5} fill={chartColors.baseline} />
                <Circle cx={x} cy={y} r={3} fill={colors.white} />
                <Circle cx={x} cy={y} r={2} fill={chartColors.baseline} />
              </G>
            );
          } else if (point.isCurrent) {
            return (
              <G key={`point-${i}`}>
                <Circle cx={x} cy={y} r={8} fill={chartColors.current} />
                <Circle cx={x} cy={y} r={5} fill={chartColors.currentRing} />
                <Circle cx={x} cy={y} r={3} fill={chartColors.current} />
              </G>
            );
          } else {
            return (
              <Circle key={`point-${i}`} cx={x} cy={y} r={4} fill={chartColors.line} />
            );
          }
        })}
      </Svg>
      </View>
      
      {/* X-axis labels - rendered outside SVG for reliable text rendering */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: yAxisColumnWidth + padding.left, paddingRight: padding.right, marginTop: 4 }}>
        {data.map((point, i) => (
          <Text 
            key={`x-label-${i}`}
            style={{ 
              fontSize: 7, 
              color: point.isBaseline ? chartColors.baseline : point.isCurrent ? chartColors.current : chartColors.text,
              fontWeight: (point.isBaseline || point.isCurrent) ? "bold" : "normal",
              textAlign: "center",
              width: chartWidth / data.length,
            }}
          >
            {point.label}
          </Text>
        ))}
      </View>
      
      {/* Summary line - rendered outside SVG for reliable text rendering */}
      <Text style={styles.trendSummary}>
        <Text style={{ fontWeight: "bold" }}>Baseline:</Text> {formatValue(baseline)} {valueSuffix}  →  <Text style={{ fontWeight: "bold" }}>Current:</Text> {formatValue(current.value)} {valueSuffix}  =  
        <Text style={{ fontWeight: "bold", color: isPositiveTrend ? chartColors.current : chartColors.baseline }}>
          {change >= 0 ? "+" : ""}{formatValue(change)} ({changePercent >= 0 ? "+" : ""}{changePercent.toFixed(0)}%)
        </Text>
      </Text>
      
      {/* Trend indicator */}
      <Text style={[styles.trendSummary, { color: isPositiveTrend ? chartColors.current : chartColors.baseline }]}>
        {trendIndicator} {trendLabel}
      </Text>
    </View>
  );
};


// ============================================================================
// PAGE 1: EXECUTIVE SUMMARY
// ============================================================================

const ExecutiveSummaryPage = ({ data, totalPages }: { data: ExpandPDFData; totalPages: number }) => {
  const hardValueMetrics = data.metrics.filter(m => m.value && m.value > 0);
  
  return (
    <Page size="A4" style={styles.page}>
      <Header title="Value Realization Report" />

      <View style={styles.orgContext}>
        {data.organizationName && (
          <Text style={styles.orgName}>{data.organizationName}</Text>
        )}
        <Text style={styles.orgDetails}>
          {data.providers} providers · {data.monthsOnAbridge} months on Abridge · {data.utilizationRate}% utilization · {formatNumber(data.documentedEncounters)} documented encounters
        </Text>
      </View>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeTitle}>THE STORY SO FAR</Text>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>{data.monthsOnAbridge} months ago</Text>, you deployed Abridge to {data.providers} providers. Since then, those providers have documented <Text style={styles.narrativeBold}>{formatNumber(data.documentedEncounters)} encounters</Text>—each one generating data about the value Abridge is creating.
        </Text>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>The short answer: it is.</Text>
        </Text>
        <Text style={styles.narrativeText}>
          This report breaks down exactly where value is coming from, how your results compare to what we typically see, and what the path forward looks like. Every number traces back to your data. Where we've made assumptions, we've flagged them. Where results look unusual, we've called that out too.
        </Text>
        <Text style={[styles.narrativeText, { marginBottom: 0 }]}>
          The goal isn't to make Abridge look good. It's to give you a picture you can trust—and act on.
        </Text>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroBoxHighlight}>
          <Text style={styles.heroValueGreen}>{formatCurrency(data.tier1Value)}</Text>
          <Text style={styles.heroLabel}>ANNUAL VALUE CREATED</Text>
          <Text style={styles.heroSublabel}>Defensible hard dollars</Text>
        </View>
        <View style={styles.heroBox}>
          <Text style={styles.heroValue}>{formatCurrency(data.providers > 0 ? data.tier1Value / data.providers : 0)}</Text>
          <Text style={styles.heroLabel}>VALUE / PROVIDER</Text>
          <Text style={styles.heroSublabel}>Based on {data.providers} providers</Text>
        </View>
        <View style={styles.heroBox}>
          <Text style={styles.heroValueGreen}>+{formatCurrency(data.expansion.expansionValue)}</Text>
          <Text style={styles.heroLabel}>EXPANSION POTENTIAL</Text>
          <Text style={styles.heroSublabel}>At {data.expansion.targetProviders} providers</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>YOUR VALUE JOURNEY</Text>
      
      <View style={styles.journeyChart}>
        {/* Row with Y-axis labels + Chart SVG */}
        <View style={{ flexDirection: "row" }}>
          {/* Y-axis labels column */}
          <View style={{ width: 45, justifyContent: "space-between", height: 75, paddingRight: 4 }}>
            <Text style={{ fontSize: 7, color: colors.green, fontWeight: "bold", textAlign: "right" }}>{formatCurrency(data.expansion.projectedValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.green, fontWeight: "bold", textAlign: "right" }}>{formatCurrency(data.tier1Value)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>$0</Text>
          </View>
          
          {/* Chart SVG */}
          <Svg width="430" height="80" viewBox="0 0 430 80">
            {/* Background grid lines */}
            <Rect x="0" y="0" width="430" height="80" fill={colors.white} />
            <Line x1="0" y1="75" x2="430" y2="75" stroke={colors.borderGray} strokeWidth="1" />
            <Line x1="0" y1="40" x2="430" y2="40" stroke={colors.borderGray} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
            <Line x1="0" y1="8" x2="430" y2="8" stroke={colors.borderGray} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
            
            {/* Shaded area under actual results */}
            <Path
              d="M 15 75 L 15 65 Q 60 55 110 48 T 170 40 T 220 36 L 220 75 Z"
              fill={colors.green}
              opacity="0.12"
            />
            
            {/* Actual results line (solid green) - thicker */}
            <Path
              d="M 15 65 Q 60 55 110 48 T 170 40 T 220 36"
              fill="none"
              stroke={colors.green}
              strokeWidth="2.5"
            />
            
            {/* Projected growth line (dashed blue) */}
            <Path
              d="M 220 36 Q 280 25 340 15 T 420 8"
              fill="none"
              stroke={colors.blue}
              strokeWidth="2"
              strokeDasharray="5,4"
            />
            
            {/* Data points - baseline */}
            <Circle cx="15" cy="65" r="4" fill={colors.lightGray} stroke={colors.white} strokeWidth="1.5" />
            
            {/* Data points - progress */}
            <Circle cx="110" cy="48" r="3" fill={colors.green} stroke={colors.white} strokeWidth="1" />
            <Circle cx="170" cy="42" r="3" fill={colors.green} stroke={colors.white} strokeWidth="1" />
            
            {/* TODAY marker - prominent, red/orange with glow effect */}
            <Circle cx="220" cy="36" r="10" fill={colors.primaryLight} opacity="0.5" />
            <Circle cx="220" cy="36" r="7" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
            
            {/* Future projections */}
            <Circle cx="320" cy="20" r="3" fill={colors.blue} stroke={colors.white} strokeWidth="1" />
            <Circle cx="420" cy="8" r="5" fill={colors.green} stroke={colors.white} strokeWidth="2" />
          </Svg>
        </View>
        
        {/* X-axis labels */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingLeft: 45 }}>
          <View style={{ alignItems: "flex-start", width: 65 }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.mediumGray }}>Before</Text>
            <Text style={{ fontSize: 6, color: colors.lightGray }}>Baseline</Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primary }}>● YOU ARE HERE</Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.green, fontFamily: "Helvetica-Bold" }}>{formatCurrency(data.tier1Value)}</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{data.providers} providers · {data.utilizationRate}%</Text>
          </View>
          <View style={{ alignItems: "flex-end", width: 80 }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.green }}>Full Scale</Text>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.green, fontFamily: "Helvetica-Bold" }}>{formatCurrency(data.expansion.projectedValue)}</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{data.expansion.targetProviders} providers · {data.expansion.targetUtilization}%</Text>
          </View>
        </View>
        
        {/* Legend */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 18, height: 3, backgroundColor: colors.green, marginRight: 5, borderRadius: 1.5 }} />
            <Text style={{ fontSize: 6.5, color: colors.mediumGray }}>Actual results</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 18, height: 2, borderWidth: 1, borderColor: colors.blue, borderStyle: "dashed", marginRight: 5 }} />
            <Text style={{ fontSize: 6.5, color: colors.mediumGray }}>Projected growth</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>VALUE BREAKDOWN</Text>
      <Text style={{ fontSize: 7, color: colors.mediumGray, marginBottom: 8, marginTop: -4 }}>
        We separate value into three tiers based on how confidently we can measure and attribute it:
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeaderGreen}>
          <View>
            <Text style={styles.cardTitle}>Tier 1: Hard Value</Text>
            <Text style={styles.cardSubtitle}>Directly measurable financial impact</Text>
          </View>
          <Text style={styles.cardValue}>{formatCurrency(data.tier1Value)}</Text>
        </View>
        <View style={styles.cardContent}>
          {hardValueMetrics.map((metric, idx) => (
            <View key={metric.id} style={[styles.row, idx === hardValueMetrics.length - 1 ? styles.rowLast : {}]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{metric.name}</Text>
                {metric.formula && <Text style={styles.rowFormula}>{metric.formula}</Text>}
              </View>
              <Text style={styles.rowValue}>{formatCurrency(metric.value!)}</Text>
            </View>
          ))}
        </View>
      </View>

      {data.tier2Items.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Tier 2: Efficiency Gains</Text>
              <Text style={styles.cardSubtitle}>Measured improvements—not yet converted to dollars</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            {data.tier2Items.map((item, idx) => (
              <View key={idx} style={[styles.row, idx === data.tier2Items.length - 1 ? styles.rowLast : {}]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.formula && <Text style={styles.rowFormula}>{item.formula}</Text>}
                </View>
                <Text style={styles.rowValueNeutral}>{item.value}</Text>
              </View>
            ))}
            <Text style={[styles.rowExplanation, { marginTop: 6 }]}>
              We show these in hours and percentages rather than dollars because the conversion varies by organization. If you want to dollarize time savings, we can adjust the model.
            </Text>
          </View>
        </View>
      )}

      {data.tier3Items.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Tier 3: Leading Indicators</Text>
              <Text style={styles.cardSubtitle}>Directional signals that predict future value</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            {data.tier3Items.map((item, idx) => (
              <View key={idx} style={[styles.row, idx === data.tier3Items.length - 1 ? styles.rowLast : {}]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.explanation && <Text style={styles.rowExplanation}>{item.explanation}</Text>}
                </View>
                <Text style={styles.rowValueNeutral}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Footer pageNum={1} totalPages={totalPages} />
    </Page>
  );
};

// ============================================================================
// PAGES 2-3: METRIC DEEP DIVES
// ============================================================================

const MetricDeepDivePage = ({ 
  metrics, 
  pageNum, 
  totalPages,
  startIdx
}: { 
  metrics: ExpandMetricData[]; 
  pageNum: number; 
  totalPages: number;
  startIdx: number;
}) => {
  return (
    <Page size="A4" style={styles.page}>
      <Header title="Metric Deep Dives" />

      {metrics.map((metric) => {
        const isValueMetric = metric.value && metric.value > 0;
        const isTimeMetric = metric.id === "timeSavings" || metric.id === "workOutsideWork";
        
        return (
        <View key={metric.id} style={styles.metricCard} wrap={false}>
          <View style={[styles.metricHeader, isValueMetric ? { backgroundColor: colors.greenLight, borderBottomColor: colors.green } : {}]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricName}>{metric.name.toUpperCase()}</Text>
              <Text style={styles.metricDesc}>{metric.description}</Text>
            </View>
            {isValueMetric ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metricValue, { color: colors.green }]}>{formatCurrency(metric.value!)}</Text>
                <Text style={{ fontSize: 6, color: colors.mediumGray }}>annual value</Text>
              </View>
            ) : isTimeMetric ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.metricValue}>{Math.abs(metric.change).toFixed(1)} {metric.unit}</Text>
                <Text style={{ fontSize: 6, color: colors.mediumGray }}>saved per encounter</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metricContent}>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>BEFORE ABRIDGE</Text>
                <Text style={styles.comparisonValue}>{metric.before.toFixed(2)}</Text>
                <Text style={styles.comparisonUnit}>{metric.unit}</Text>
              </View>
              <Text style={styles.comparisonArrow}>→</Text>
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>AFTER ABRIDGE</Text>
                <Text style={styles.comparisonValue}>{metric.after.toFixed(2)}</Text>
                <Text style={styles.comparisonUnit}>{metric.unit}</Text>
              </View>
              <Text style={styles.comparisonArrow}>=</Text>
              <View style={styles.comparisonChange}>
                <Text style={styles.comparisonChangeValue}>
                  {metric.change >= 0 ? "+" : ""}{metric.change.toFixed(2)}
                </Text>
                <Text style={styles.comparisonChangePercent}>
                  {metric.changePercent.toFixed(0)}% {metric.isPositiveGood ? "lift" : "reduction"}
                </Text>
              </View>
            </View>

            {metric.trend && metric.trend.length > 0 && (
              <TrendChart metric={metric} baseline={metric.before} />
            )}

            {metric.benchmark && (
              <View style={styles.benchmarkBox}>
                <Text style={styles.benchmarkTitle}>BENCHMARK</Text>
                <Text style={styles.benchmarkText}>
                  Typical Abridge customers see: {metric.benchmark.typicalRange}
                </Text>
                <Text style={[styles.benchmarkText, { fontWeight: "bold", marginTop: 2 }]}>
                  You're at: {metric.changePercent.toFixed(0)}% — {metric.benchmark.statusLabel}
                </Text>
              </View>
            )}

            {metric.warningMessage && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>VALIDATION RECOMMENDED</Text>
                <Text style={styles.warningText}>{metric.warningMessage}</Text>
              </View>
            )}

            {metric.value && metric.value > 0 && metric.formula && (
              <View style={styles.valueCalcBox}>
                <Text style={styles.valueCalcTitle}>VALUE CALCULATION</Text>
                <Text style={styles.valueCalcFormula}>{metric.formula} = {formatCurrency(metric.value)}</Text>
                {metric.formulaExplanation && (
                  <Text style={styles.valueCalcText}>{metric.formulaExplanation}</Text>
                )}
              </View>
            )}

            {metric.whatThisMeans && (
              <View style={styles.meaningBox}>
                <Text style={styles.meaningTitle}>WHAT THIS MEANS</Text>
                <Text style={styles.meaningText}>{metric.whatThisMeans}</Text>
              </View>
            )}
          </View>
        </View>
        );
      })}

      <Footer pageNum={pageNum} totalPages={totalPages} />
    </Page>
  );
};

// ============================================================================
// PAGE 4: WHAT WE'RE SEEING (NARRATIVE ANALYSIS)
// ============================================================================

const NarrativeAnalysisPage = ({ 
  data, 
  pageNum, 
  totalPages 
}: { 
  data: ExpandPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  return (
    <Page size="A4" style={styles.page}>
      <Header title="What We're Seeing" />

      <Text style={styles.pageTitle}>EARLY INDICATORS</Text>

      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <View style={styles.sectionBox}>
            <Text style={[styles.sectionBoxTitle, { color: colors.green }]}>What's Working Well</Text>
            {data.workingWell.map((item, idx) => (
              <View key={idx} style={styles.checkItem}>
                <Text style={styles.checkMark}>✓</Text>
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.column}>
          <View style={styles.sectionBox}>
            <Text style={[styles.sectionBoxTitle, { color: colors.amber }]}>Areas to Watch</Text>
            {data.areasToWatch.map((item, idx) => (
              <View key={idx} style={styles.checkItem}>
                <Text style={styles.arrowMark}>→</Text>
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>OPTIMIZATION OPPORTUNITIES</Text>

      {data.optimizationOpportunities.map((opp, idx) => (
        <View key={idx} style={styles.opportunityCardExpanded} wrap={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={styles.opportunityTitle}>{idx + 1}. {opp.title}</Text>
            <Text style={[styles.opportunityValue, { color: colors.green, fontSize: 10 }]}>+{formatCurrency(opp.potentialValue)}/yr</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 6, color: colors.mediumGray, marginBottom: 2 }}>CURRENT</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold" }}>{opp.current}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 6, color: colors.mediumGray, marginBottom: 2 }}>TARGET</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.green }}>{opp.target}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 6, color: colors.mediumGray, marginBottom: 2 }}>GAP</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.amber }}>{opp.title === "Utilization Focus" ? `${parseFloat(opp.target) - parseFloat(opp.current)} pp` : "See action"}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: colors.lightGray, padding: 6, borderRadius: 3 }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray, marginBottom: 2 }}>RECOMMENDED ACTION</Text>
            <Text style={{ fontSize: 7, lineHeight: 1.3 }}>{opp.action}</Text>
          </View>
        </View>
      ))}

      {/* Value Realization Context for Low Utilization */}
      {data.utilizationRate < 70 && (
        <View style={styles.contextBox} wrap={false}>
          <Text style={[styles.sectionBoxTitle, { color: colors.amber, marginBottom: 4 }]}>EARLY STAGE CONTEXT</Text>
          <Text style={{ fontSize: 7, lineHeight: 1.4, marginBottom: 6 }}>
            At {data.utilizationRate}% utilization and {data.monthsOnAbridge} months in, you're still in early deployment. This is common—adoption takes time. Here's the path forward:
          </Text>
          <View style={{ paddingLeft: 8 }}>
            <Text style={{ fontSize: 7, marginBottom: 3 }}>• Increase utilization to 70%: Value improves ~{Math.round((70 / data.utilizationRate - 1) * 100)}%</Text>
            <Text style={{ fontSize: 7, marginBottom: 3 }}>• Increase utilization to 80%: Value improves ~{Math.round((80 / data.utilizationRate - 1) * 100)}%</Text>
            <Text style={{ fontSize: 7 }}>• Full adoption (85%): Unlocks maximum value potential</Text>
          </View>
        </View>
      )}

      {/* Bottom Line Summary */}
      <View style={styles.bottomLineBox} wrap={false}>
        <Text style={[styles.sectionBoxTitle, { marginBottom: 6 }]}>THE BOTTOM LINE</Text>
        <Text style={{ fontSize: 7, lineHeight: 1.4, marginBottom: 8 }}>
          {data.monthsOnAbridge} months in, you're building a foundation:
        </Text>
        <View style={{ paddingLeft: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 7, marginBottom: 2 }}>• {formatCurrency(data.tier1Value)} in annual value from measurable improvements</Text>
          {data.tier2Items.length > 0 && <Text style={{ fontSize: 7, marginBottom: 2 }}>• Efficiency gains captured but not yet converted to dollars</Text>}
          {data.tier3Items.length > 0 && <Text style={{ fontSize: 7, marginBottom: 2 }}>• Leading indicators showing positive trajectory</Text>}
          <Text style={{ fontSize: 7 }}>• Expansion potential of +{formatCurrency(data.expansion.expansionValue)} at full scale</Text>
        </View>
        <Text style={{ fontSize: 7, lineHeight: 1.4, fontStyle: "italic" }}>
          {data.utilizationRate < 70 
            ? `At ${data.utilizationRate}% utilization, you're capturing less than half the potential. The path to multiplying this value is clear: push utilization to 80%+, validate gains, and consider converting efficiency to access.`
            : `With ${data.utilizationRate}% utilization, you're already capturing strong value. Focus on maintaining gains, expanding coverage, and converting efficiency improvements to additional capacity.`
          }
        </Text>
      </View>

      <Footer pageNum={pageNum} totalPages={totalPages} />
    </Page>
  );
};

// ============================================================================
// PAGE 5: EXPANSION OPPORTUNITY
// ============================================================================

const ExpansionOpportunityPage = ({ 
  data, 
  pageNum, 
  totalPages 
}: { 
  data: ExpandPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  const { expansion } = data;
  const utilizationMultiplier = expansion.targetUtilization / expansion.currentUtilization;
  const providerMultiplier = expansion.targetProviders / expansion.currentProviders;

  return (
    <Page size="A4" style={styles.page}>
      <Header title="Expansion Opportunity" />

      <Text style={styles.pageTitle}>THE PATH TO FULL SCALE</Text>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          Based on your proven results at {expansion.currentProviders} providers and {expansion.currentUtilization}% utilization, here's what full-scale deployment could look like. These projections use your actual per-provider value generation—no hypotheticals.
        </Text>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroBox}>
          <Text style={styles.heroValueGreen}>{formatCurrency(expansion.projectedValue)}</Text>
          <Text style={styles.heroLabel}>PROJECTED ANNUAL VALUE</Text>
          <Text style={styles.heroSublabel}>At full scale</Text>
        </View>
        <View style={styles.heroBoxHighlight}>
          <Text style={styles.heroValueGreen}>+{formatCurrency(expansion.expansionValue)}</Text>
          <Text style={styles.heroLabel}>ADDITIONAL VALUE</Text>
          <Text style={styles.heroSublabel}>Beyond current</Text>
        </View>
        <View style={styles.heroBox}>
          <Text style={styles.heroValue}>{expansion.targetProviders}</Text>
          <Text style={styles.heroLabel}>TARGET PROVIDERS</Text>
          <Text style={styles.heroSublabel}>{expansion.targetUtilization}% utilization</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>SCALING MATH</Text>

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Current annual value</Text>
            <Text style={styles.rowValue}>{formatCurrency(expansion.currentValue)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>× Provider scale ({expansion.currentProviders} → {expansion.targetProviders})</Text>
            <Text style={styles.rowValueNeutral}>{providerMultiplier.toFixed(1)}x</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>× Utilization improvement ({expansion.currentUtilization}% → {expansion.targetUtilization}%)</Text>
            <Text style={styles.rowValueNeutral}>{utilizationMultiplier.toFixed(2)}x</Text>
          </View>
          <View style={[styles.row, styles.rowLast, { backgroundColor: colors.greenLight, margin: -8, marginTop: 8, padding: 8 }]}>
            <Text style={[styles.rowLabel, { fontWeight: "bold" }]}>Projected annual value at scale</Text>
            <Text style={styles.rowValue}>{formatCurrency(expansion.projectedValue)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>CURRENT VS. PROJECTED</Text>

      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Current State</Text>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Providers:</Text>
              <Text style={styles.opportunityValue}>{expansion.currentProviders}</Text>
            </View>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Utilization:</Text>
              <Text style={styles.opportunityValue}>{expansion.currentUtilization}%</Text>
            </View>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Annual value:</Text>
              <Text style={[styles.opportunityValue, { color: colors.green }]}>{formatCurrency(expansion.currentValue)}</Text>
            </View>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Value/provider:</Text>
              <Text style={styles.opportunityValue}>{formatCurrency(expansion.currentProviders > 0 ? expansion.currentValue / expansion.currentProviders : 0)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.column}>
          <View style={[styles.sectionBox, { borderColor: colors.green, borderWidth: 2 }]}>
            <Text style={[styles.sectionBoxTitle, { color: colors.green }]}>Full Scale Target</Text>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Providers:</Text>
              <Text style={styles.opportunityValue}>{expansion.targetProviders}</Text>
            </View>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Utilization:</Text>
              <Text style={styles.opportunityValue}>{expansion.targetUtilization}%</Text>
            </View>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Annual value:</Text>
              <Text style={[styles.opportunityValue, { color: colors.green }]}>{formatCurrency(expansion.projectedValue)}</Text>
            </View>
            <View style={styles.opportunityRow}>
              <Text style={styles.opportunityLabel}>Added value:</Text>
              <Text style={[styles.opportunityValue, { color: colors.green }]}>+{formatCurrency(expansion.expansionValue)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          The value you're capturing today isn't a ceiling—it's a proof point. At {expansion.currentProviders} providers and {expansion.currentUtilization}% utilization, you've demonstrated {formatCurrency(data.tier1Value)} in annual value. Scaling to {expansion.targetProviders} providers at {expansion.targetUtilization}% utilization projects to {formatCurrency(expansion.projectedValue)}.
        </Text>
      </View>

      <Footer pageNum={pageNum} totalPages={totalPages} />
    </Page>
  );
};

// ============================================================================
// PAGE 6: METHODOLOGY
// ============================================================================

const MethodologyPage = ({ 
  data, 
  pageNum, 
  totalPages 
}: { 
  data: ExpandPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  return (
    <Page size="A4" style={styles.page}>
      <Header title="Methodology" />

      <Text style={styles.pageTitle}>HOW WE CALCULATED YOUR VALUE</Text>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          Every number in this report traces back to data you provided or industry-standard benchmarks. We've used conservative assumptions throughout—if anything, actual value is likely higher. Here's exactly how we calculated each component.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>YOUR INPUTS</Text>
      
      <View style={styles.methodologyGrid}>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Deployment</Text>
          <Text style={styles.methodologyItem}>• {data.providers} providers</Text>
          <Text style={styles.methodologyItem}>• {formatNumber(data.encounters)} annual encounters</Text>
          <Text style={styles.methodologyItem}>• {data.utilizationRate}% utilization rate</Text>
          <Text style={styles.methodologyItem}>• {data.monthsOnAbridge} months on Abridge</Text>
        </View>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Documented Volume</Text>
          <Text style={styles.methodologyItem}>• {formatNumber(data.documentedEncounters)} documented encounters</Text>
          <Text style={styles.methodologyItem}>• = encounters × utilization × (months/12)</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>VALUE ATTRIBUTION</Text>

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { fontWeight: "bold" }]}>wRVU Value</Text>
              <Text style={styles.rowExplanation}>
                We use Medicare's $33/wRVU conversion factor and apply 50% attribution to Abridge. If your payer mix is commercial-heavy (where conversion factors run $45-65), actual revenue impact may be 30-50% higher.
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { fontWeight: "bold" }]}>Time Conversion</Text>
              <Text style={styles.rowExplanation}>
                Time savings are calculated from before/after documentation time. When converted to patient access, we use $150/hour provider value and your specified conversion percentage.
              </Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { fontWeight: "bold" }]}>Retention Value</Text>
              <Text style={styles.rowExplanation}>
                Provider turnover costs estimated at $500,000 per departure (recruitment, onboarding, lost productivity). Attribution to satisfaction improvement is conservative.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>BENCHMARK RANGES</Text>

      <View style={styles.methodologyGrid}>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Typical Abridge Results</Text>
          <Text style={styles.methodologyItem}>• wRVU lift: 3-7%</Text>
          <Text style={styles.methodologyItem}>• Time in notes reduction: 3-5 min/encounter</Text>
          <Text style={styles.methodologyItem}>• Chart closure improvement: 5-15 pp</Text>
        </View>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Quality of Life Metrics</Text>
          <Text style={styles.methodologyItem}>• Pajama time reduction: 2-5 hrs/week</Text>
          <Text style={styles.methodologyItem}>• Satisfaction improvement: 10-20 points</Text>
          <Text style={styles.methodologyItem}>• Burnout reduction: varies by baseline</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>WHAT WE DON'T INCLUDE</Text>

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.rowExplanation}>
            • Downstream revenue from improved patient experience and retention
          </Text>
          <Text style={styles.rowExplanation}>
            • Quality measure improvements (MIPS, HEDIS) and associated incentives
          </Text>
          <Text style={styles.rowExplanation}>
            • Reduced compliance and audit risk from better documentation
          </Text>
          <Text style={styles.rowExplanation}>
            • Training and onboarding time reduction for new providers
          </Text>
          <Text style={[styles.rowExplanation, { marginBottom: 0 }]}>
            • Long-term career satisfaction and reduced early retirement
          </Text>
        </View>
      </View>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          Questions about our methodology? We're happy to walk through any calculation in detail. The goal is confidence in every number—if something doesn't make sense, we want to know.
        </Text>
      </View>

      <Footer pageNum={pageNum} totalPages={totalPages} />
    </Page>
  );
};

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

const ExpandROIDocument = ({ data }: { data: ExpandPDFData }) => {
  const metricsWithDeepDive = data.metrics.filter(m => 
    (m.value && m.value > 0) || m.trend || m.before !== m.after
  );
  
  const metricsPerPage = 2;
  const metricPages: ExpandMetricData[][] = [];
  for (let i = 0; i < metricsWithDeepDive.length; i += metricsPerPage) {
    metricPages.push(metricsWithDeepDive.slice(i, i + metricsPerPage));
  }
  
  const totalPages = 1 + metricPages.length + 3;
  
  return (
    <Document>
      <ExecutiveSummaryPage data={data} totalPages={totalPages} />
      
      {metricPages.map((metrics, idx) => (
        <MetricDeepDivePage 
          key={idx} 
          metrics={metrics} 
          pageNum={2 + idx} 
          totalPages={totalPages}
          startIdx={idx * metricsPerPage}
        />
      ))}
      
      <NarrativeAnalysisPage 
        data={data} 
        pageNum={2 + metricPages.length} 
        totalPages={totalPages} 
      />
      
      <ExpansionOpportunityPage 
        data={data} 
        pageNum={3 + metricPages.length} 
        totalPages={totalPages} 
      />
      
      <MethodologyPage 
        data={data} 
        pageNum={4 + metricPages.length} 
        totalPages={totalPages} 
      />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export const generateExpandROIPDF = async (data: ExpandPDFData): Promise<void> => {
  const blob = await pdf(<ExpandROIDocument data={data} />).toBlob();
  const date = new Date().toISOString().split("T")[0];
  const filename = `abridge-value-realization-${date}.pdf`;
  saveAs(blob, filename);
};

export const generateExpandROIPDFBlob = async (
  data: ExpandPDFData
): Promise<{ blob: Blob; filename: string }> => {
  const blob = await pdf(<ExpandROIDocument data={data} />).toBlob();
  const date = new Date().toISOString().split("T")[0];
  const filename = `abridge-value-realization-${date}.pdf`;
  return { blob, filename };
};
