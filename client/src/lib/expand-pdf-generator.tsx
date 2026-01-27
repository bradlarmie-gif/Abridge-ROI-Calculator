import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Svg,
  Rect,
  Line,
  Circle,
  Polyline,
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
  clientName?: string;
  preparedBy?: string;
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
// COLORS - Premium palette matching Scribe PDF
// ============================================================================

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF7F5",
  primaryDark: "#C42400",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  borderGray: "#E5E7EB",
  backgroundGray: "#F1F5F9",
  white: "#FFFFFF",
  emerald: "#059669",
  emeraldLight: "#ECFDF5",
  emeraldDark: "#047857",
  slate800: "#1e293b",
  slate900: "#0f172a",
  blue: "#2563EB",
  blueLight: "#DBEAFE",
  amber: "#D97706",
  amberLight: "#FEF3C7",
};

// ============================================================================
// STYLES - Premium god tier layout
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },
  
  // Hero sections
  heroSection: {
    backgroundColor: colors.slate900,
    padding: 40,
    paddingBottom: 32,
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
  heroClientName: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 11,
    color: colors.lightGray,
    lineHeight: 1.6,
  },
  
  heroCompact: {
    backgroundColor: colors.slate900,
    padding: 28,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  heroCompactTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroCompactSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.5,
    maxWidth: 400,
  },
  
  // Content section
  contentSection: {
    padding: 40,
    paddingTop: 28,
  },
  
  // Typography
  chapterLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: colors.mediumGray,
    marginBottom: 20,
    lineHeight: 1.5,
  },
  
  storyText: {
    fontSize: 10,
    color: colors.darkGray,
    lineHeight: 1.7,
    marginBottom: 12,
  },
  storyTextBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  storyTextEmphasis: {
    color: colors.emerald,
    fontWeight: "bold",
  },
  
  // Metrics grid
  metricsGrid: {
    flexDirection: "row",
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricCardDark: {
    flex: 1,
    backgroundColor: colors.slate800,
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: "center",
  },
  metricCardGreen: {
    flex: 1,
    backgroundColor: colors.emeraldLight,
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.emerald,
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
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
  },
  metricValueLight: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
  },
  metricValueGreen: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.emerald,
  },
  metricSub: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },
  
  // Comparison boxes
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  comparisonBox: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    minWidth: 100,
  },
  comparisonArrow: {
    paddingHorizontal: 12,
  },
  comparisonChange: {
    backgroundColor: colors.emeraldLight,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.emerald,
  },
  
  // Insight cards
  insightCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  insightLabel: {
    fontSize: 9,
    color: colors.darkGray,
    flex: 1,
  },
  insightValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  insightValueGreen: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.emerald,
  },
  
  // Opportunity box
  opportunityBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: "#FECDC4",
    borderRadius: 10,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  opportunityTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.primaryDark,
    marginBottom: 8,
    textAlign: "center",
  },
  opportunityText: {
    fontSize: 9,
    color: colors.darkGray,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 380,
  },
  
  // Summary box
  summaryBox: {
    backgroundColor: colors.slate800,
    borderRadius: 10,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: "row",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  summaryItemValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },
  summaryItemSubtext: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 2,
    textAlign: "center",
  },
  
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 20,
  },
  
  // Quote box
  quoteBox: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  quoteText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  
  // CTA section
  ctaSection: {
    marginTop: 20,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 9,
    color: colors.mediumGray,
    textAlign: "center",
  },
  ctaLink: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 4,
  },
  
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
  methodNote: {
    fontSize: 6,
    color: colors.lightGray,
    marginTop: 4,
    maxWidth: 350,
  },
  
  // Trend chart
  trendContainer: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  trendTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 8,
  },
  
  // Value calc box
  valueCalcBox: {
    backgroundColor: colors.emeraldLight,
    borderWidth: 1,
    borderColor: colors.emerald,
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
  },
  valueCalcLabel: {
    fontSize: 7,
    color: colors.emeraldDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueCalcFormula: {
    fontSize: 9,
    color: colors.darkGray,
    fontFamily: "Courier",
    marginBottom: 4,
  },
  valueCalcResult: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.emerald,
  },
  
  // Warning box
  warningBox: {
    backgroundColor: colors.amberLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.amber,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 8,
    color: colors.amber,
    lineHeight: 1.4,
  },
  
  // Benchmark box
  benchmarkBox: {
    backgroundColor: colors.blueLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  benchmarkTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.blue,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  benchmarkText: {
    fontSize: 8,
    color: colors.blue,
    lineHeight: 1.4,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

const today = (): string => new Date().toLocaleDateString("en-US", { 
  year: "numeric", 
  month: "long", 
  day: "numeric" 
});

const getMetricCategory = (id: string): string => {
  if (id === "wrvu" || id === "wrvuCapture") return "Revenue Capture";
  if (id === "timeSavings" || id === "chartClosure") return "Time Efficiency";
  if (id === "workOutsideWork" || id === "clinicianSatisfaction") return "Quality of Life";
  return "Performance";
};

const getMetricNarrative = (metric: ExpandMetricData): string => {
  const isPositive = metric.isPositiveGood ? metric.change > 0 : metric.change < 0;
  const magnitude = Math.abs(metric.changePercent);
  
  if (metric.id === "wrvu" || metric.id === "wrvuCapture") {
    if (magnitude >= 5) return "This is a significant improvement in revenue capture, suggesting documentation is capturing clinical complexity more completely.";
    if (magnitude >= 3) return "This represents meaningful progress in revenue capture, with documentation better reflecting the care being delivered.";
    return "While modest, this improvement indicates documentation is trending in the right direction.";
  }
  
  if (metric.id === "timeSavings") {
    const minutes = Math.abs(metric.change);
    if (minutes >= 4) return `Saving ${minutes} minutes per encounter translates to meaningful time back in the day for your providers.`;
    if (minutes >= 2) return `Every minute counts—${minutes} minutes saved per encounter adds up across thousands of visits.`;
    return "Time savings are emerging as providers become more comfortable with the workflow.";
  }
  
  if (metric.id === "workOutsideWork") {
    if (metric.change < -20) return "A significant reduction in after-hours work directly impacts provider wellbeing and retention.";
    if (metric.change < 0) return "Less time documenting after hours means more time for rest and recovery.";
    return "After-hours documentation patterns are stabilizing.";
  }
  
  if (metric.id === "chartClosure") {
    if (metric.change > 20) return "Dramatically more charts closing same-day reduces compliance risk and improves care continuity.";
    if (metric.change > 0) return "Same-day chart closure is improving, supporting better care coordination.";
    return "Chart closure patterns are evolving with the new workflow.";
  }
  
  if (metric.id === "clinicianSatisfaction") {
    if (metric.change > 0) return "Improved satisfaction scores reflect the positive impact on daily work experience.";
    return "Provider sentiment is an important indicator to continue monitoring.";
  }
  
  return metric.whatThisMeans || "This metric reflects meaningful change in your documentation workflow.";
};

// Mini sparkline component
const TrendSparkline = ({ values, width = 200, height = 40 }: { values: number[]; width?: number; height?: number }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={points} stroke={colors.emerald} strokeWidth="2" fill="none" />
      <Circle 
        cx={width} 
        cy={height - 4 - ((values[values.length - 1] - min) / range) * (height - 8)} 
        r="4" 
        fill={colors.emerald} 
      />
    </Svg>
  );
};

// Progress bar for comparisons
const ProgressBar = ({ percent, color, width = 200 }: { percent: number; color: string; width?: number }) => {
  const barWidth = Math.max((percent / 100) * width, 4);
  return (
    <Svg width={width} height={12}>
      <Rect x={0} y={0} width={width} height={12} fill={colors.backgroundGray} rx={6} />
      <Rect x={0} y={0} width={barWidth} height={12} fill={color} rx={6} />
    </Svg>
  );
};

// ============================================================================
// PAGE 1: EXECUTIVE SUMMARY - YOUR ABRIDGE JOURNEY
// ============================================================================

const Page1ExecutiveSummary = ({ data }: { data: ExpandPDFData }) => {
  const displayClientName = data.clientName || "Your Organization";
  const displayPreparedBy = data.preparedBy || "Abridge";
  const valuePerProvider = data.providers > 0 ? Math.round(data.tier1Value / data.providers) : 0;
  
  return (
    <Page size="A4" style={styles.page}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>{today()}</Text>
          <Text style={styles.heroMetaText}>Prepared by {displayPreparedBy}</Text>
        </View>
        <Image src={abridgeLogoPath} style={{ width: 85, height: 17, marginBottom: 24 }} />
        <Text style={styles.heroClientName}>{displayClientName}</Text>
        <Text style={styles.heroTagline}>
          You've been using Abridge for {data.monthsOnAbridge} months.{"\n"}
          Here's the value you've created—and what's still ahead.
        </Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>Your Journey So Far</Text>
        <Text style={styles.sectionTitle}>The Value You've Created</Text>
        <Text style={styles.sectionSubtitle}>
          With {data.providers} providers and {data.utilizationRate}% utilization, you're building a foundation of measurable value.
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCardGreen}>
            <Text style={styles.metricLabel}>Annual Value Created</Text>
            <Text style={styles.metricValueGreen}>{formatCurrency(data.tier1Value)}</Text>
            <Text style={styles.metricSub}>from your data</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Value Per Provider</Text>
            <Text style={styles.metricValue}>{formatCurrency(valuePerProvider)}</Text>
            <Text style={styles.metricSub}>{data.providers} providers</Text>
          </View>
          <View style={[styles.metricCardDark, styles.metricCardLast]}>
            <Text style={styles.metricLabelLight}>Expansion Potential</Text>
            <Text style={styles.metricValueLight}>+{formatCurrency(data.expansion.expansionValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.lightGray, marginTop: 2 }}>at {data.expansion.targetProviders} providers</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.chapterLabel}>Where You Stand</Text>
        <Text style={styles.sectionTitle}>Deployment Progress</Text>
        
        <Text style={styles.storyText}>
          With <Text style={styles.storyTextBold}>{formatNumber(data.documentedEncounters)} documented encounters</Text> across {data.providers} providers, your team has established a meaningful baseline. At <Text style={styles.storyTextBold}>{data.utilizationRate}% utilization</Text>, there's still room to grow—and as utilization increases, so does value.
        </Text>

        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Documented encounters to date</Text>
            <Text style={styles.insightValue}>{formatNumber(data.documentedEncounters)}</Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Current utilization rate</Text>
            <Text style={styles.insightValue}>{data.utilizationRate}%</Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Metrics showing improvement</Text>
            <Text style={styles.insightValueGreen}>{data.metrics.filter(m => m.change !== 0).length} of {data.metrics.length}</Text>
          </View>
        </View>

        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>
            "The value captured here is measured from your actual data—real changes in documentation time, revenue capture, and provider experience. As your deployment matures, these numbers grow with it."
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Realization Report</Text>
        <Text style={styles.footerText}>Page 1</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DRIVER PAGES: One page per metric with full story
// ============================================================================

const DriverPage = ({ metric, pageNum, data }: { metric: ExpandMetricData; pageNum: number; data: ExpandPDFData }) => {
  const category = getMetricCategory(metric.id);
  const narrative = getMetricNarrative(metric);
  const isPositive = metric.isPositiveGood ? metric.change > 0 : metric.change < 0;
  const changeDisplay = metric.change > 0 ? `+${metric.change}` : `${metric.change}`;
  
  return (
    <Page size="A4" style={styles.page}>
      {/* Compact Hero */}
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 12 }} />
        <Text style={styles.heroCompactTitle}>{metric.name}</Text>
        <Text style={styles.heroCompactSubtitle}>
          {category} · {data.clientName || "Your Organization"}
        </Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>Before & After</Text>
        <Text style={styles.sectionTitle}>What Changed</Text>
        <Text style={styles.sectionSubtitle}>
          Comparing your baseline to current performance across {formatNumber(data.documentedEncounters)} documented encounters.
        </Text>

        {/* Before/After Comparison */}
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonBox}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Before</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.black }}>{metric.before}</Text>
            <Text style={{ fontSize: 8, color: colors.mediumGray }}>{metric.unit}</Text>
          </View>
          
          <View style={styles.comparisonArrow}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Line x1={4} y1={12} x2={20} y2={12} stroke={colors.mediumGray} strokeWidth={2} />
              <Line x1={14} y1={6} x2={20} y2={12} stroke={colors.mediumGray} strokeWidth={2} />
              <Line x1={14} y1={18} x2={20} y2={12} stroke={colors.mediumGray} strokeWidth={2} />
            </Svg>
          </View>
          
          <View style={styles.comparisonBox}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>After</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.black }}>{metric.after}</Text>
            <Text style={{ fontSize: 8, color: colors.mediumGray }}>{metric.unit}</Text>
          </View>
          
          <View style={styles.comparisonArrow}>
            <Text style={{ fontSize: 16, color: colors.mediumGray }}>=</Text>
          </View>
          
          <View style={styles.comparisonChange}>
            <Text style={{ fontSize: 7, color: colors.emeraldDark, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Change</Text>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.emerald }}>{changeDisplay}</Text>
            <Text style={{ fontSize: 8, color: colors.emeraldDark }}>{metric.changePercent > 0 ? "+" : ""}{metric.changePercent}%</Text>
          </View>
        </View>

        {/* Trend chart if available */}
        {metric.trend && metric.trend.length > 1 && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendTitle}>Trend Over Time</Text>
            <TrendSparkline values={metric.trend.map(t => t.value)} width={460} height={50} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ fontSize: 7, color: colors.mediumGray }}>{metric.trend[0].month}</Text>
              <Text style={{ fontSize: 7, color: colors.emerald, fontWeight: "bold" }}>
                {metric.trendDirection === "improving" ? "↑ Improving" : metric.trendDirection === "stable" ? "→ Stable" : "↓ Declining"}
              </Text>
              <Text style={{ fontSize: 7, color: colors.mediumGray }}>{metric.trend[metric.trend.length - 1].month}</Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* What This Means */}
        <Text style={styles.chapterLabel}>The Story</Text>
        <Text style={styles.sectionTitle}>What This Means</Text>
        
        <Text style={styles.storyText}>{narrative}</Text>
        
        {metric.whatThisMeans && metric.whatThisMeans !== narrative && (
          <Text style={styles.storyText}>{metric.whatThisMeans}</Text>
        )}

        {/* Value Calculation if applicable */}
        {metric.value && metric.value > 0 && (
          <View style={styles.valueCalcBox}>
            <Text style={styles.valueCalcLabel}>Annual Value Created</Text>
            {metric.formula && (
              <Text style={styles.valueCalcFormula}>{metric.formula}</Text>
            )}
            <Text style={styles.valueCalcResult}>{formatCurrency(metric.value)}/year</Text>
            {metric.formulaExplanation && (
              <Text style={{ fontSize: 7, color: colors.emeraldDark, marginTop: 4 }}>{metric.formulaExplanation}</Text>
            )}
          </View>
        )}

        {/* Benchmark if available */}
        {metric.benchmark && (
          <View style={styles.benchmarkBox}>
            <Text style={styles.benchmarkTitle}>Industry Benchmark</Text>
            <Text style={styles.benchmarkText}>
              Typical range: {metric.benchmark.typicalRange}. Your result is {metric.benchmark.statusLabel.toLowerCase()}.
            </Text>
          </View>
        )}

        {/* Warning if applicable */}
        {metric.warningMessage && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Note</Text>
            <Text style={styles.warningText}>{metric.warningMessage}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Realization Report · {category}</Text>
        <Text style={styles.footerText}>Page {pageNum}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// EXPANSION OPPORTUNITY PAGE
// ============================================================================

const ExpansionPage = ({ data, pageNum }: { data: ExpandPDFData; pageNum: number }) => {
  const { expansion } = data;
  const multiplier = expansion.targetProviders / expansion.currentProviders;
  const valuePerProvider = Math.round(expansion.projectedValue / expansion.targetProviders);
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 12 }} />
        <Text style={styles.heroCompactTitle}>The Opportunity Ahead</Text>
        <Text style={styles.heroCompactSubtitle}>
          You've proven value with {expansion.currentProviders} providers.{"\n"}
          Here's what full deployment could look like.
        </Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>Expansion Modeling</Text>
        <Text style={styles.sectionTitle}>From {expansion.currentProviders} to {expansion.targetProviders} Providers</Text>
        <Text style={styles.sectionSubtitle}>
          Based on your current per-provider performance, expanding to additional providers would scale value proportionally.
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Current Value</Text>
            <Text style={styles.metricValue}>{formatCurrency(expansion.currentValue)}</Text>
            <Text style={styles.metricSub}>{expansion.currentProviders} providers</Text>
          </View>
          <View style={styles.metricCardGreen}>
            <Text style={styles.metricLabel}>Projected Value</Text>
            <Text style={styles.metricValueGreen}>{formatCurrency(expansion.projectedValue)}</Text>
            <Text style={styles.metricSub}>at full scale</Text>
          </View>
          <View style={[styles.metricCardDark, styles.metricCardLast]}>
            <Text style={styles.metricLabelLight}>Growth Multiple</Text>
            <Text style={styles.metricValueLight}>{multiplier.toFixed(1)}×</Text>
            <Text style={{ fontSize: 7, color: colors.lightGray, marginTop: 2 }}>provider scale</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.chapterLabel}>The Math</Text>
        <Text style={styles.sectionTitle}>How We Get There</Text>

        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Current value per provider</Text>
            <Text style={styles.insightValue}>{formatCurrency(Math.round(expansion.currentValue / expansion.currentProviders))}</Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Target utilization rate</Text>
            <Text style={styles.insightValue}>{expansion.targetUtilization}%</Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Additional value at full scale</Text>
            <Text style={styles.insightValueGreen}>+{formatCurrency(expansion.expansionValue)}</Text>
          </View>
        </View>

        <View style={styles.opportunityBox}>
          <Text style={styles.opportunityTitle}>The Expansion Opportunity</Text>
          <Text style={styles.opportunityText}>
            Imagine all {expansion.targetProviders} providers experiencing the same documentation improvements you've measured today.{"\n"}{"\n"}
            That's {formatCurrency(expansion.projectedValue)} in annual value—an additional {formatCurrency(expansion.expansionValue)} beyond what you're capturing now.
          </Text>
        </View>

        <Text style={styles.storyText}>
          <Text style={styles.storyTextBold}>The bottom line:</Text> Your pilot has proven the model works. At {formatCurrency(valuePerProvider)} per provider, expansion isn't just possible—it's a multiplier on what you've already built.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Realization Report</Text>
        <Text style={styles.footerText}>Page {pageNum}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// SUMMARY PAGE
// ============================================================================

const SummaryPage = ({ data, pageNum }: { data: ExpandPDFData; pageNum: number }) => {
  const valuePerProvider = data.providers > 0 ? Math.round(data.tier1Value / data.providers) : 0;
  const displayClientName = data.clientName || "Your Organization";
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 12 }} />
        <Text style={styles.heroCompactTitle}>Your Summary to Share</Text>
        <Text style={styles.heroCompactSubtitle}>
          The key numbers from {displayClientName}'s Abridge deployment.
        </Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>At a Glance</Text>
        <Text style={styles.sectionTitle}>The Numbers That Matter</Text>
        <Text style={styles.sectionSubtitle}>
          A snapshot of your value realization journey—ready to share with leadership.
        </Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Value Created</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Annual Value</Text>
              <Text style={styles.summaryItemValueGreen}>{formatCurrency(data.tier1Value)}</Text>
              <Text style={styles.summaryItemSubtext}>measured from data</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Value/Provider</Text>
              <Text style={styles.summaryItemValue}>{formatCurrency(valuePerProvider)}</Text>
              <Text style={styles.summaryItemSubtext}>{data.providers} providers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Expansion</Text>
              <Text style={styles.summaryItemValueGreen}>+{formatCurrency(data.expansion.expansionValue)}</Text>
              <Text style={styles.summaryItemSubtext}>at {data.expansion.targetProviders} providers</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Deployment Status</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Providers</Text>
              <Text style={styles.summaryItemValue}>{data.providers}</Text>
              <Text style={styles.summaryItemSubtext}>on Abridge</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Utilization</Text>
              <Text style={styles.summaryItemValue}>{data.utilizationRate}%</Text>
              <Text style={styles.summaryItemSubtext}>of encounters</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Duration</Text>
              <Text style={styles.summaryItemValue}>{data.monthsOnAbridge}</Text>
              <Text style={styles.summaryItemSubtext}>months</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Working Well / Areas to Watch */}
        {(data.workingWell.length > 0 || data.areasToWatch.length > 0) && (
          <>
            <Text style={styles.chapterLabel}>Performance Summary</Text>
            
            {data.workingWell.length > 0 && (
              <View style={[styles.insightCard, { backgroundColor: colors.emeraldLight }]}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.emeraldDark, marginBottom: 6 }}>Working Well</Text>
                {data.workingWell.slice(0, 3).map((item, idx) => (
                  <Text key={idx} style={{ fontSize: 8, color: colors.emeraldDark, marginBottom: 2 }}>• {item}</Text>
                ))}
              </View>
            )}
            
            {data.areasToWatch.length > 0 && (
              <View style={[styles.insightCard, { backgroundColor: colors.amberLight }]}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.amber, marginBottom: 6 }}>Areas to Watch</Text>
                {data.areasToWatch.slice(0, 3).map((item, idx) => (
                  <Text key={idx} style={{ fontSize: 8, color: colors.amber, marginBottom: 2 }}>• {item}</Text>
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.ctaSection}>
          <Text style={styles.ctaText}>Ready to expand your deployment or optimize further?</Text>
          <Text style={styles.ctaLink}>Contact your Abridge partner to discuss next steps</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerText}>Abridge Value Realization Report</Text>
          <Text style={styles.methodNote}>
            Values based on {data.providers} providers, {data.utilizationRate}% utilization, ${33}/wRVU with 50% attribution.
          </Text>
        </View>
        <Text style={styles.footerText}>Page {pageNum}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

const ExpandROIDocument = ({ data }: { data: ExpandPDFData }) => {
  // Filter metrics that have meaningful data
  const metricsWithData = data.metrics.filter(m => 
    (m.value && m.value > 0) || 
    m.change !== 0 || 
    (m.trend && m.trend.length > 1)
  );
  
  let pageNum = 1;
  
  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page1ExecutiveSummary data={data} />
      
      {/* Driver Pages: One per metric */}
      {metricsWithData.map((metric, idx) => (
        <DriverPage key={metric.id} metric={metric} pageNum={++pageNum} data={data} />
      ))}
      
      {/* Expansion Opportunity Page */}
      <ExpansionPage data={data} pageNum={++pageNum} />
      
      {/* Summary Page */}
      <SummaryPage data={data} pageNum={++pageNum} />
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
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  
  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, filename);
  }
};

export const generateExpandROIPDFBlob = async (data: ExpandPDFData): Promise<{ blob: Blob; filename: string }> => {
  const blob = await pdf(<ExpandROIDocument data={data} />).toBlob();
  const date = new Date().toISOString().split("T")[0];
  const filename = `abridge-value-realization-${date}.pdf`;
  return { blob, filename };
};
