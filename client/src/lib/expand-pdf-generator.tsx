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
    if (magnitude >= 5) return "This is the kind of improvement that gets CFO attention. Documentation is now capturing the true complexity of care—revenue that was always earned but never captured. Your providers aren't working harder; they're just getting credit for what they already do.";
    if (magnitude >= 3) return "Documentation is telling a more complete story of the care being delivered. This isn't about upcoding—it's about accuracy. Every wRVU recovered is revenue that was earned but previously left on the table.";
    if (magnitude >= 1) return "Early signals of improvement are emerging. As providers trust the AI-generated notes more, they're making fewer edits—and the documentation naturally becomes more complete.";
    return "The foundation is being laid. wRVU improvement typically accelerates as providers settle into the new workflow and trust the documentation quality.";
  }
  
  if (metric.id === "timeSavings") {
    const minutes = Math.abs(metric.change);
    if (minutes >= 4) return `${minutes} minutes per encounter doesn't sound like much—until you multiply it by thousands of visits. That's hours back every week. Hours that used to be spent typing, now spent with patients, with family, or just breathing.`;
    if (minutes >= 2) return `Think about what ${minutes} minutes per encounter really means: less clicking, less typing, fewer "I'll finish this chart later" moments. It's the small wins that change how work feels.`;
    return "Time savings often start small and grow as providers find their rhythm. The muscle memory of documentation is being rewired—and that takes time.";
  }
  
  if (metric.id === "workOutsideWork") {
    if (metric.change < -20) return "This is the metric that matters most to providers and their families. Less pajama time means more presence at home, more recovery between shifts, and ultimately—more sustainable careers. Burnout prevention isn't just good for people; it's good for retention.";
    if (metric.change < 0) return "Fewer hours spent charting after the kids are in bed. Less guilt about bringing work home. This is what sustainable practice looks like—and your providers are starting to feel it.";
    return "After-hours documentation is one of the last metrics to move, because old habits die hard. But the foundation is in place for meaningful change.";
  }
  
  if (metric.id === "chartClosure") {
    if (metric.change > 20) return "Same-day chart closure used to feel impossible. Now it's becoming routine. This isn't just about compliance—it's about care continuity. When charts close same-day, the next provider has what they need. Patients get better follow-up. Nothing falls through the cracks.";
    if (metric.change > 0) return "More charts closing same-day means less cognitive burden carried overnight. It means leaving work at work. The ripple effects of this change extend far beyond the EHR.";
    return "Chart closure patterns are shifting as providers adapt to the new workflow. This metric typically improves as trust in the documentation grows.";
  }
  
  if (metric.id === "clinicianSatisfaction") {
    if (metric.change > 10) return "When providers say they're happier, that's not just a survey answer—it's a leading indicator of retention, engagement, and care quality. Happy providers don't just stay; they bring their best selves to every patient encounter.";
    if (metric.change > 0) return "Satisfaction is trending in the right direction. Providers are noticing the difference in their day-to-day—and that matters more than any ROI calculation.";
    return "Provider sentiment is complex and multifaceted. Even stable satisfaction during a technology transition is a signal worth celebrating.";
  }
  
  return metric.whatThisMeans || "This metric reflects meaningful change in how your providers experience documentation—and that ripples into everything else.";
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

// Journey Value Chart - shows the value progression from baseline to full scale
const JourneyValueChart = ({ 
  current, 
  projected, 
  monthsOnAbridge 
}: { 
  current: number; 
  projected: number; 
  monthsOnAbridge: number;
}) => {
  // Guard against invalid values
  if (projected <= 0 || current <= 0) return null;
  
  const width = 460;
  const height = 80;
  const max = Math.max(projected * 1.1, 1); // Ensure max is never 0
  
  // Calculate key points
  const baselineX = 40;
  const todayX = 140 + Math.min(monthsOnAbridge * 8, 100);
  const maturityX = 280;
  const fullScaleX = 420;
  
  const currentY = height - 15 - ((current / max) * (height - 30));
  const maturityY = height - 15 - ((current * 1.3 / max) * (height - 30));
  const projectedY = height - 15 - ((projected / max) * (height - 30));
  
  return (
    <View style={{ marginTop: 16, marginBottom: 8 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        <Line x1={40} y1={height - 15} x2={fullScaleX} y2={height - 15} stroke={colors.borderGray} strokeWidth={1} />
        
        {/* Journey path - dashed for future */}
        <Polyline 
          points={`${baselineX},${height - 15} ${todayX},${currentY}`} 
          stroke={colors.emerald} 
          strokeWidth={3} 
          fill="none" 
        />
        <Polyline 
          points={`${todayX},${currentY} ${maturityX},${maturityY} ${fullScaleX},${projectedY}`} 
          stroke={colors.emerald} 
          strokeWidth={2} 
          strokeDasharray="6,4"
          fill="none" 
        />
        
        {/* Key points */}
        <Circle cx={baselineX} cy={height - 15} r={4} fill={colors.mediumGray} />
        <Circle cx={todayX} cy={currentY} r={6} fill={colors.emerald} />
        <Circle cx={maturityX} cy={maturityY} r={4} fill={colors.emerald} opacity={0.6} />
        <Circle cx={fullScaleX} cy={projectedY} r={5} fill={colors.primary} />
        
        {/* "YOU ARE HERE" marker */}
        <Rect x={todayX - 32} y={currentY - 26} width={64} height={16} rx={8} fill={colors.emerald} />
      </Svg>
      
      {/* Labels below chart */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>Baseline</Text>
        <Text style={{ fontSize: 7, color: colors.emerald, fontWeight: "bold" }}>Today</Text>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>Maturity</Text>
        <Text style={{ fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Full Scale</Text>
      </View>
    </View>
  );
};

// Expansion Scale Chart - visual bar showing current vs potential
const ExpansionScaleChart = ({ 
  currentProviders, 
  targetProviders,
  currentValue,
  projectedValue 
}: { 
  currentProviders: number;
  targetProviders: number;
  currentValue: number;
  projectedValue: number;
}) => {
  // Guard against invalid values
  if (targetProviders <= 0 || currentProviders <= 0) return null;
  
  const width = 460;
  const currentPercent = Math.min(Math.max((currentProviders / targetProviders) * 100, 0), 100); // Clamp to 0-100
  const currentBarWidth = Math.max((currentPercent / 100) * (width - 80), 20);
  
  return (
    <View style={{ marginTop: 12, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ fontSize: 8, color: colors.darkGray }}>Provider Coverage</Text>
        <Text style={{ fontSize: 8, color: colors.emerald, fontWeight: "bold" }}>
          {currentProviders} of {targetProviders} ({Math.round(currentPercent)}%)
        </Text>
      </View>
      <Svg width={width} height={28} viewBox={`0 0 ${width} 28`}>
        {/* Background bar */}
        <Rect x={0} y={4} width={width} height={20} rx={10} fill={colors.backgroundGray} />
        {/* Current coverage */}
        <Rect x={0} y={4} width={currentBarWidth} height={20} rx={10} fill={colors.emerald} />
        {/* Expansion potential */}
        <Rect x={currentBarWidth} y={4} width={width - currentBarWidth} height={20} rx={10} fill={colors.primaryLight} stroke={colors.primary} strokeWidth={1} strokeDasharray="4,2" />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald, marginRight: 4 }} />
          <Text style={{ fontSize: 7, color: colors.darkGray }}>Active ({formatCurrency(currentValue)})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary, marginRight: 4 }} />
          <Text style={{ fontSize: 7, color: colors.darkGray }}>Opportunity (+{formatCurrency(projectedValue - currentValue)})</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// PAGE 1: EXECUTIVE SUMMARY - YOUR ABRIDGE JOURNEY
// ============================================================================

const Page1ExecutiveSummary = ({ data }: { data: ExpandPDFData }) => {
  const displayClientName = data.clientName || "Your Organization";
  const displayPreparedBy = data.preparedBy || "Abridge";
  const valuePerProvider = data.providers > 0 ? Math.round(data.tier1Value / data.providers) : 0;
  const metricsImproving = data.metrics.filter(m => m.change !== 0).length;
  
  // Generate a personalized opening based on their journey
  const getPersonalizedOpening = () => {
    if (data.monthsOnAbridge <= 3) {
      return `In just ${data.monthsOnAbridge} months, your team is already seeing the impact of Abridge—and this is only the beginning.`;
    } else if (data.monthsOnAbridge <= 6) {
      return `Half a year in, and the results speak for themselves. Your providers are spending less time on documentation and more time on what matters.`;
    } else if (data.monthsOnAbridge <= 12) {
      return `${data.monthsOnAbridge} months of partnership, and the transformation is clear. What started as a pilot has become a foundation for lasting change.`;
    }
    return `Over a year into your Abridge journey, you've built something remarkable—a new way of working that your providers rely on every day.`;
  };
  
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
          Your Value Realization Report{"\n"}
          {data.monthsOnAbridge} months of partnership. Real results.
        </Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>The Story So Far</Text>
        <Text style={styles.sectionTitle}>Your Abridge Journey</Text>
        
        <Text style={styles.storyText}>{getPersonalizedOpening()}</Text>

        {/* Journey Value Chart */}
        <JourneyValueChart 
          current={data.tier1Value} 
          projected={data.expansion.projectedValue} 
          monthsOnAbridge={data.monthsOnAbridge} 
        />

        <View style={styles.metricsGrid}>
          <View style={styles.metricCardGreen}>
            <Text style={styles.metricLabel}>Annual Value Created</Text>
            <Text style={styles.metricValueGreen}>{formatCurrency(data.tier1Value)}</Text>
            <Text style={styles.metricSub}>proven from your data</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Value Per Provider</Text>
            <Text style={styles.metricValue}>{formatCurrency(valuePerProvider)}</Text>
            <Text style={styles.metricSub}>{data.providers} providers active</Text>
          </View>
          <View style={[styles.metricCardDark, styles.metricCardLast]}>
            <Text style={styles.metricLabelLight}>Still Ahead</Text>
            <Text style={styles.metricValueLight}>+{formatCurrency(data.expansion.expansionValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.lightGray, marginTop: 2 }}>expansion opportunity</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.chapterLabel}>By The Numbers</Text>
        <Text style={styles.sectionTitle}>What Your Data Shows</Text>

        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <View style={[styles.insightCard, { flex: 1, marginRight: 8 }]}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", marginBottom: 4 }}>Encounters Documented</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.black }}>{formatNumber(data.documentedEncounters)}</Text>
          </View>
          <View style={[styles.insightCard, { flex: 1, marginRight: 8 }]}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", marginBottom: 4 }}>Utilization Rate</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.black }}>{data.utilizationRate}%</Text>
          </View>
          <View style={[styles.insightCard, { flex: 1 }]}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", marginBottom: 4 }}>Metrics Improving</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.emerald }}>{metricsImproving} of {data.metrics.length}</Text>
          </View>
        </View>

        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>
            "Every number in this report comes from your actual experience—measured changes in how your providers work, how they feel, and the value they create. This isn't a projection. It's your reality."
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
  
  // Get a compelling one-liner for the hero based on the metric
  const getMetricTagline = () => {
    if (metric.id === "wrvu" || metric.id === "wrvuCapture") {
      return isPositive ? "Capturing the value that was always there." : "Building the foundation for revenue recovery.";
    }
    if (metric.id === "timeSavings") {
      return isPositive ? "Time reclaimed, one encounter at a time." : "Every minute saved is a minute earned.";
    }
    if (metric.id === "workOutsideWork") {
      return isPositive ? "When work stays at work." : "The path to sustainable practice.";
    }
    if (metric.id === "chartClosure") {
      return isPositive ? "Charts that close when you do." : "Working toward same-day completion.";
    }
    if (metric.id === "clinicianSatisfaction") {
      return isPositive ? "Happier providers, better care." : "Measuring what matters most.";
    }
    return "Tracking meaningful change.";
  };
  
  return (
    <Page size="A4" style={styles.page}>
      {/* Compact Hero */}
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 12 }} />
        <Text style={styles.heroCompactTitle}>{metric.name}</Text>
        <Text style={styles.heroCompactSubtitle}>
          {getMetricTagline()}
        </Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>{category}</Text>
        <Text style={styles.sectionTitle}>The Transformation</Text>
        <Text style={styles.sectionSubtitle}>
          Your data tells the story: {formatNumber(data.documentedEncounters)} encounters documented by {data.providers} providers.
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
        <Text style={styles.chapterLabel}>The Real Story</Text>
        <Text style={styles.sectionTitle}>Why This Matters</Text>
        
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
  const additionalProviders = expansion.targetProviders - expansion.currentProviders;
  
  // Personalized narrative based on expansion potential
  const getExpansionNarrative = () => {
    const ratio = expansion.targetProviders / expansion.currentProviders;
    if (ratio >= 5) {
      return `Your pilot with ${expansion.currentProviders} providers has proven the concept. Now imagine that same transformation reaching ${additionalProviders} more providers across your organization. The documentation burden they carry today? It doesn't have to be permanent.`;
    } else if (ratio >= 2) {
      return `You've built a strong foundation with ${expansion.currentProviders} providers. Extending to ${expansion.targetProviders} means ${additionalProviders} more clinicians spending less time in the EHR and more time with patients. That's the kind of change that defines culture.`;
    }
    return `With ${expansion.currentProviders} providers already on board, you're closer to full deployment than you might think. Adding the remaining ${additionalProviders} providers would complete the picture—and multiply the value you're already seeing.`;
  };
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 12 }} />
        <Text style={styles.heroCompactTitle}>What Could Be</Text>
        <Text style={styles.heroCompactSubtitle}>
          You've proven value. Now let's talk about scale.
        </Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>The Opportunity</Text>
        <Text style={styles.sectionTitle}>From Pilot to Platform</Text>
        
        <Text style={styles.storyText}>{getExpansionNarrative()}</Text>

        {/* Provider Coverage Chart */}
        <ExpansionScaleChart 
          currentProviders={expansion.currentProviders}
          targetProviders={expansion.targetProviders}
          currentValue={expansion.currentValue}
          projectedValue={expansion.projectedValue}
        />

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Today's Value</Text>
            <Text style={styles.metricValue}>{formatCurrency(expansion.currentValue)}</Text>
            <Text style={styles.metricSub}>{expansion.currentProviders} providers</Text>
          </View>
          <View style={styles.metricCardGreen}>
            <Text style={styles.metricLabel}>Full Scale Value</Text>
            <Text style={styles.metricValueGreen}>{formatCurrency(expansion.projectedValue)}</Text>
            <Text style={styles.metricSub}>{expansion.targetProviders} providers</Text>
          </View>
          <View style={[styles.metricCardDark, styles.metricCardLast]}>
            <Text style={styles.metricLabelLight}>The Unlock</Text>
            <Text style={styles.metricValueLight}>+{formatCurrency(expansion.expansionValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.lightGray, marginTop: 2 }}>additional annual value</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.chapterLabel}>The Economics</Text>
        <Text style={styles.sectionTitle}>Value Scales With You</Text>

        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <View style={[styles.insightCard, { flex: 1, marginRight: 8 }]}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", marginBottom: 4 }}>Value Per Provider</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.black }}>{formatCurrency(Math.round(expansion.currentValue / expansion.currentProviders))}</Text>
          </View>
          <View style={[styles.insightCard, { flex: 1, marginRight: 8 }]}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", marginBottom: 4 }}>Target Utilization</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.black }}>{expansion.targetUtilization}%</Text>
          </View>
          <View style={[styles.insightCard, { flex: 1 }]}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textTransform: "uppercase", marginBottom: 4 }}>Scale Factor</Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>{multiplier.toFixed(1)}×</Text>
          </View>
        </View>

        <View style={styles.opportunityBox}>
          <Text style={styles.opportunityTitle}>The Question Isn't If—It's When</Text>
          <Text style={styles.opportunityText}>
            Every month you wait is another month of documentation burden for {additionalProviders} providers who could be experiencing the same relief your current users already have.{"\n"}{"\n"}
            At {formatCurrency(valuePerProvider)} per provider per year, the math works. But the real win? A better day-to-day for your clinical team.
          </Text>
        </View>
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
  
  // Personalized closing message based on results
  const getClosingMessage = () => {
    const hasStrongResults = data.tier1Value > 100000;
    const hasExpansionPotential = data.expansion.expansionValue > data.tier1Value;
    
    if (hasStrongResults && hasExpansionPotential) {
      return "You've proven the value. You have the data. The question now is simple: how fast can you bring this to the rest of your organization?";
    } else if (hasStrongResults) {
      return "The numbers tell a clear story: Abridge is working for your providers. The path forward is about deepening what's already succeeding.";
    } else if (hasExpansionPotential) {
      return "Your foundation is in place. As utilization grows and more providers come on board, these numbers will grow with them.";
    }
    return "Every journey starts somewhere. You've taken the first steps—and the data shows it's working.";
  };
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.heroCompact}>
        <Image src={abridgeLogoPath} style={{ width: 70, height: 14, marginBottom: 12 }} />
        <Text style={styles.heroCompactTitle}>The Bottom Line</Text>
        <Text style={styles.heroCompactSubtitle}>
          A snapshot of {displayClientName}'s Abridge journey—ready to share.
        </Text>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.chapterLabel}>Executive Summary</Text>
        <Text style={styles.sectionTitle}>What We've Built Together</Text>
        <Text style={styles.sectionSubtitle}>
          {data.monthsOnAbridge} months. {data.providers} providers. {formatNumber(data.documentedEncounters)} encounters. Real results.
        </Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Value Created</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Annual Value</Text>
              <Text style={styles.summaryItemValueGreen}>{formatCurrency(data.tier1Value)}</Text>
              <Text style={styles.summaryItemSubtext}>proven from your data</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Per Provider</Text>
              <Text style={styles.summaryItemValue}>{formatCurrency(valuePerProvider)}</Text>
              <Text style={styles.summaryItemSubtext}>annual value each</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Expansion Potential</Text>
              <Text style={styles.summaryItemValueGreen}>+{formatCurrency(data.expansion.expansionValue)}</Text>
              <Text style={styles.summaryItemSubtext}>at full scale</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 16 }} />

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Your Deployment</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Active Providers</Text>
              <Text style={styles.summaryItemValue}>{data.providers}</Text>
              <Text style={styles.summaryItemSubtext}>using Abridge</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Utilization</Text>
              <Text style={styles.summaryItemValue}>{data.utilizationRate}%</Text>
              <Text style={styles.summaryItemSubtext}>of eligible encounters</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Partnership</Text>
              <Text style={styles.summaryItemValue}>{data.monthsOnAbridge}</Text>
              <Text style={styles.summaryItemSubtext}>months and counting</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Working Well / Areas to Watch */}
        {(data.workingWell.length > 0 || data.areasToWatch.length > 0) && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.chapterLabel}>Performance Insights</Text>
            
            {data.workingWell.length > 0 && (
              <View style={[styles.insightCard, { backgroundColor: colors.emeraldLight, marginBottom: 8 }]}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.emeraldDark, marginBottom: 6 }}>What's Working</Text>
                {data.workingWell.slice(0, 3).map((item, idx) => (
                  <Text key={idx} style={{ fontSize: 8, color: colors.emeraldDark, marginBottom: 2 }}>• {item}</Text>
                ))}
              </View>
            )}
            
            {data.areasToWatch.length > 0 && (
              <View style={[styles.insightCard, { backgroundColor: colors.amberLight }]}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.amber, marginBottom: 6 }}>Opportunities to Optimize</Text>
                {data.areasToWatch.slice(0, 3).map((item, idx) => (
                  <Text key={idx} style={{ fontSize: 8, color: colors.amber, marginBottom: 2 }}>• {item}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Personalized closing message */}
        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>{getClosingMessage()}</Text>
        </View>

        <View style={[styles.ctaSection, { marginTop: 16 }]}>
          <Text style={{ fontSize: 10, color: colors.darkGray, textAlign: "center", marginBottom: 6 }}>
            Ready to take the next step?
          </Text>
          <Text style={styles.ctaLink}>Contact your Abridge partner to discuss expansion</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerText}>Abridge Value Realization Report</Text>
          <Text style={styles.methodNote}>
            Values calculated from {data.providers} providers at {data.utilizationRate}% utilization, using ${33}/wRVU with 50% attribution factor.
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
