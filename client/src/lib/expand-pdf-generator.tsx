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
// COLORS - Professional palette
// ============================================================================

const c = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  green: "#059669",
  greenLight: "#D1FAE5",
  greenDark: "#047857",
  black: "#111827",
  dark: "#374151",
  medium: "#6B7280",
  light: "#9CA3AF",
  pale: "#F3F4F6",
  border: "#E5E7EB",
  white: "#FFFFFF",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  blue: "#2563EB",
  blueLight: "#DBEAFE",
};

// ============================================================================
// STYLES - Dense Bloomberg/Stripe-style layout
// ============================================================================

const s = StyleSheet.create({
  page: {
    padding: 24,
    paddingBottom: 36,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: c.black,
    backgroundColor: c.white,
    lineHeight: 1.2,
  },
  
  // Header - compact
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: c.primary,
  },
  logo: { width: 70, height: 14 },
  headerRight: { textAlign: "right" },
  headerTitle: { fontSize: 10, fontWeight: "bold", color: c.black },
  headerDate: { fontSize: 7, color: c.medium, marginTop: 1 },
  
  // Footer - minimal
  footer: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
  },
  footerText: { fontSize: 6, color: c.light },
  
  // Context bar - tight
  contextBar: {
    backgroundColor: c.pale,
    borderRadius: 2,
    padding: 5,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  contextItem: { fontSize: 7, color: c.dark },
  contextValue: { fontWeight: "bold" },
  
  // Hero metrics - compact
  heroRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 6,
  },
  heroCard: {
    flex: 1,
    backgroundColor: c.pale,
    borderRadius: 2,
    padding: 6,
    alignItems: "center",
  },
  heroCardPrimary: {
    flex: 1,
    backgroundColor: c.greenLight,
    borderRadius: 2,
    padding: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.green,
  },
  heroValue: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: c.black,
  },
  heroValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: c.green,
  },
  heroLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: c.medium,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  heroSub: { fontSize: 5, color: c.light, marginTop: 1 },
  
  // Section headers - minimal
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  sectionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: c.black,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  
  // Cards - tight borders, minimal padding
  card: {
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 2,
    marginBottom: 5,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: c.pale,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  cardHeaderGreen: {
    backgroundColor: c.greenLight,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: c.green,
  },
  cardTitle: { fontSize: 9, fontWeight: "bold", color: c.black },
  cardSub: { fontSize: 6, color: c.medium },
  cardValue: { fontSize: 11, fontWeight: "bold", color: c.green },
  cardBody: { padding: 6 },
  
  // Table rows - tight
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, fontSize: 8, color: c.dark },
  rowValue: { fontSize: 9, fontWeight: "bold", color: c.green },
  rowValueNeutral: { fontSize: 9, fontWeight: "bold", color: c.black },
  
  // Two column layout
  twoCol: { flexDirection: "row", gap: 6, marginBottom: 5 },
  col: { flex: 1 },
  
  // Callout boxes - compact
  callout: {
    backgroundColor: c.primaryLight,
    borderLeftWidth: 2,
    borderLeftColor: c.primary,
    padding: 6,
    marginBottom: 8,
    borderRadius: 1,
  },
  calloutTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: c.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  calloutText: { fontSize: 8, color: c.dark, lineHeight: 1.3 },
  
  // Key takeaway - inline
  takeaway: {
    backgroundColor: c.pale,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 2,
    padding: 6,
    marginTop: 8,
    flexDirection: "row",
  },
  takeawayLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: c.primary,
    textTransform: "uppercase",
    marginRight: 6,
  },
  takeawayText: { flex: 1, fontSize: 8, color: c.dark, lineHeight: 1.3 },
  
  // Metric comparison - DENSE horizontal table style
  comparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 4,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
    marginBottom: 4,
  },
  compBox: { alignItems: "center", minWidth: 50 },
  compLabel: { fontSize: 6, fontWeight: "bold", color: c.medium, textTransform: "uppercase", marginBottom: 1 },
  compValue: { fontSize: 14, fontWeight: "bold", color: c.black, fontFamily: "Courier" },
  compUnit: { fontSize: 6, color: c.medium },
  compChange: {
    alignItems: "center",
    backgroundColor: c.greenLight,
    borderRadius: 2,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  compChangeValue: { fontSize: 12, fontWeight: "bold", color: c.green, fontFamily: "Courier" },
  compChangePercent: { fontSize: 6, color: c.greenDark },
  
  // Benchmark/Warning - inline compact
  benchBox: {
    backgroundColor: c.blueLight,
    padding: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  benchTitle: { fontSize: 6, fontWeight: "bold", color: c.blue, textTransform: "uppercase", marginBottom: 1 },
  benchText: { fontSize: 7, color: c.blue, lineHeight: 1.2 },
  
  warnBox: {
    backgroundColor: c.amberLight,
    padding: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  warnTitle: { fontSize: 6, fontWeight: "bold", color: c.amber, textTransform: "uppercase", marginBottom: 1 },
  warnText: { fontSize: 7, color: c.amber, lineHeight: 1.2 },
  
  // Value calc - prominent formula
  valueBox: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.green,
    padding: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  valueFormula: { fontSize: 9, fontWeight: "bold", color: c.black, fontFamily: "Courier" },
  valueNote: { fontSize: 6, color: c.medium, marginTop: 2 },
  
  // What this means - compact
  meaningBox: {
    backgroundColor: c.pale,
    padding: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  meaningTitle: { fontSize: 6, fontWeight: "bold", color: c.dark, textTransform: "uppercase", marginBottom: 2 },
  meaningText: { fontSize: 7, color: c.dark, lineHeight: 1.25 },
  
  // Opportunity cards - tight
  oppCard: {
    backgroundColor: c.white,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 2,
    padding: 4,
    marginBottom: 4,
  },
  oppHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  oppNum: {
    backgroundColor: c.green,
    borderRadius: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginRight: 4,
  },
  oppNumText: { fontSize: 5, color: c.white, fontWeight: "bold" },
  oppTitle: { fontSize: 7, fontWeight: "bold", color: c.black },
  oppValue: { fontSize: 8, fontWeight: "bold", color: c.green },
  oppRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
  oppLabel: { fontSize: 5, color: c.medium },
  oppData: { fontSize: 6, fontWeight: "bold", color: c.black },
  oppAction: { fontSize: 5, color: c.dark, lineHeight: 1.2, marginTop: 1 },
  
  // Progress bar - slim
  progressTrack: {
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 2,
  },
  progressFill: { height: 4, borderRadius: 2 },
  
  // Status dots - small
  statusDot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  statusRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  statusText: { flex: 1, fontSize: 6, color: c.dark, lineHeight: 1.2 },
  
  // Chart container - minimal
  chartContainer: {
    backgroundColor: c.pale,
    borderRadius: 2,
    padding: 6,
    marginBottom: 4,
  },
  chartTitle: { fontSize: 6, fontWeight: "bold", color: c.dark, textTransform: "uppercase", marginBottom: 3 },
});

// ============================================================================
// HELPERS
// ============================================================================

const fmt = (value: number): string => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
};

const fmtNum = (value: number): string => value.toLocaleString();

const today = (): string => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const statusColor = (status: "good" | "warning" | "alert"): string => {
  return status === "good" ? c.green : status === "warning" ? c.amber : c.primary;
};

// ============================================================================
// COMPONENTS
// ============================================================================

const Header = ({ title, clientName }: { title: string; clientName?: string }) => (
  <View style={s.header} fixed>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Image src={abridgeLogoPath} style={s.logo} />
      {clientName && (
        <Text style={{ fontSize: 8, color: c.medium, marginLeft: 8, fontWeight: "bold" }}>{clientName}</Text>
      )}
    </View>
    <View style={s.headerRight}>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerDate}>{today()}</Text>
    </View>
  </View>
);

const Footer = ({ pageNum, totalPages, preparedBy }: { pageNum: number; totalPages: number; preparedBy?: string }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerText}>
      Abridge Value Realization Report{preparedBy ? ` | Prepared by ${preparedBy}` : ''}
    </Text>
    <Text style={s.footerText}>Page {pageNum} of {totalPages}</Text>
  </View>
);

const SectionHeader = ({ title, color = c.primary }: { title: string; color?: string }) => (
  <View style={s.sectionHeader}>
    <View style={[s.sectionDot, { backgroundColor: color }]} />
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const StatusDot = ({ status }: { status: "good" | "warning" | "alert" }) => (
  <View style={[s.statusDot, { backgroundColor: statusColor(status) }]} />
);

const Arrow = ({ size = 10, color = c.medium }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2.5" fill="none" />
  </Svg>
);

// Mini sparkline for compact display
const Sparkline = ({ values, width = 40, height = 12, color = c.green }: { values: number[]; width?: number; height?: number; color?: string }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={points} stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx={width} cy={height - 1 - ((values[values.length - 1] - min) / range) * (height - 2)} r="2" fill={color} />
    </Svg>
  );
};

// Journey visualization - larger, cleaner
const JourneyChart = ({ current, projected }: { current: number; projected: number }) => {
  const width = 500;
  const height = 60;
  const padding = { left: 45, right: 20, top: 10, bottom: 10 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  const maxVal = projected * 1.1;
  const currentX = padding.left + (current / maxVal) * graphWidth * 0.6;
  const projectedX = padding.left + graphWidth;
  const currentY = padding.top + graphHeight * 0.5;
  
  return (
    <View style={s.chartContainer} wrap={false}>
      <Text style={s.chartTitle}>Value Journey: Current to Full Scale</Text>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background track */}
        <Rect x={padding.left} y={currentY - 3} width={graphWidth} height={6} fill={c.border} rx={3} />
        
        {/* Progress fill */}
        <Rect x={padding.left} y={currentY - 3} width={currentX - padding.left} height={6} fill={c.green} rx={3} />
        
        {/* Current position marker */}
        <Circle cx={currentX} cy={currentY} r={8} fill={c.green} />
        <Circle cx={currentX} cy={currentY} r={4} fill={c.white} />
        
        {/* Target marker */}
        <Circle cx={projectedX} cy={currentY} r={6} fill={c.pale} stroke={c.green} strokeWidth={2} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.green, marginRight: 4 }} />
          <Text style={{ fontSize: 7, color: c.dark }}>Now: {fmt(current)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.pale, borderWidth: 1, borderColor: c.green, marginRight: 4 }} />
          <Text style={{ fontSize: 7, color: c.dark }}>Target: {fmt(projected)}</Text>
        </View>
      </View>
    </View>
  );
};


// ============================================================================
// PAGE 1: EXECUTIVE DASHBOARD
// ============================================================================

const Page1Dashboard = ({ data, totalPages }: { data: ExpandPDFData; totalPages: number }) => {
  const valuePerProvider = data.providers > 0 ? data.tier1Value / data.providers : 0;
  const hardMetrics = data.metrics.filter(m => m.value && m.value > 0);
  const maturityLabel = data.utilizationRate >= 80 ? "Optimized" : data.utilizationRate >= 60 ? "Developing" : data.utilizationRate >= 40 ? "Emerging" : "Early Stage";
  const maturityColor = data.utilizationRate >= 80 ? c.green : data.utilizationRate >= 60 ? c.blue : c.amber;
  
  return (
    <Page size="A4" style={s.page}>
      <Header title="Value Realization Report" clientName={data.clientName} />
      
      {/* Context bar */}
      <View style={s.contextBar} wrap={false}>
        <Text style={s.contextItem}><Text style={s.contextValue}>{data.providers}</Text> providers</Text>
        <Text style={s.contextItem}><Text style={s.contextValue}>{data.monthsOnAbridge}</Text> months on Abridge</Text>
        <Text style={s.contextItem}><Text style={s.contextValue}>{data.utilizationRate}%</Text> utilization</Text>
        <Text style={s.contextItem}><Text style={s.contextValue}>{fmtNum(data.documentedEncounters)}</Text> documented encounters</Text>
      </View>
      
      {/* Executive callout */}
      <View style={s.callout} wrap={false}>
        <Text style={s.calloutTitle}>Summary</Text>
        <Text style={s.calloutText}>
          Based on your data, each of your {data.providers} providers is generating approximately {fmt(valuePerProvider)} annually. With {data.utilizationRate}% of eligible encounters documented, the current measured value is {fmt(data.tier1Value)}. As utilization increases, this number would grow proportionally.
        </Text>
      </View>
      
      {/* Hero metrics */}
      <View style={s.heroRow} wrap={false}>
        <View style={s.heroCardPrimary}>
          <Text style={s.heroValueGreen}>{fmt(data.tier1Value)}</Text>
          <Text style={s.heroLabel}>Annual Value Created</Text>
          <Text style={s.heroSub}>Measured from your data</Text>
        </View>
        <View style={s.heroCard}>
          <Text style={s.heroValue}>{fmt(valuePerProvider)}</Text>
          <Text style={s.heroLabel}>Value / Provider</Text>
          <Text style={s.heroSub}>Based on {data.providers} providers</Text>
        </View>
        <View style={s.heroCard}>
          <Text style={s.heroValueGreen}>+{fmt(data.expansion.expansionValue)}</Text>
          <Text style={s.heroLabel}>Expansion Potential</Text>
          <Text style={s.heroSub}>At {data.expansion.targetProviders} providers</Text>
        </View>
      </View>
      
      {/* Two column: Maturity + Drivers */}
      <View style={s.twoCol} wrap={false}>
        <View style={s.col}>
          <View style={[s.card, { marginBottom: 0 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Deployment Maturity</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: maturityColor, marginRight: 4 }} />
                <Text style={{ fontSize: 7, fontWeight: "bold", color: maturityColor }}>{maturityLabel}</Text>
              </View>
            </View>
            <View style={s.cardBody}>
              <Text style={{ fontSize: 7, color: c.medium, marginBottom: 2 }}>Utilization Rate</Text>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${data.utilizationRate}%`, backgroundColor: maturityColor }]} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 6, color: c.medium }}>0%</Text>
                <Text style={{ fontSize: 6, fontWeight: "bold", color: maturityColor }}>{data.utilizationRate}%</Text>
                <Text style={{ fontSize: 6, color: c.medium }}>100%</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={s.col}>
          <View style={[s.card, { marginBottom: 0 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Key Value Drivers</Text>
            </View>
            <View style={s.cardBody}>
              {hardMetrics.slice(0, 3).map((m, idx) => (
                <View key={idx} style={[s.row, idx === Math.min(2, hardMetrics.length - 1) ? s.rowLast : {}]}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <StatusDot status="good" />
                    <Text style={s.rowLabel}>{m.name}</Text>
                  </View>
                  {m.trend && m.trend.length > 0 && <Sparkline values={[m.before, ...m.trend.map(t => t.value)]} />}
                  <Text style={[s.rowValue, { marginLeft: 8 }]}>{fmt(m.value!)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      
      {/* Journey chart */}
      <SectionHeader title="Your Value Journey" color={c.green} />
      <JourneyChart current={data.tier1Value} projected={data.expansion.projectedValue} />
      
      {/* Value breakdown */}
      <SectionHeader title="Value Breakdown" color={c.green} />
      
      <View style={s.card} wrap={false}>
        <View style={s.cardHeaderGreen}>
          <View>
            <Text style={s.cardTitle}>Core Financial Value</Text>
            <Text style={s.cardSub}>Directly measurable revenue impact</Text>
          </View>
          <Text style={s.cardValue}>{fmt(data.tier1Value)}</Text>
        </View>
        <View style={s.cardBody}>
          {hardMetrics.map((m, idx) => (
            <View key={m.id} style={[s.row, idx === hardMetrics.length - 1 ? s.rowLast : {}]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{m.name}</Text>
                {m.formula && <Text style={{ fontSize: 6, color: c.light, fontFamily: "Courier" }}>{m.formula}</Text>}
              </View>
              <Text style={s.rowValue}>{fmt(m.value!)}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {data.tier2Items.length > 0 && (
        <View style={s.card} wrap={false}>
          <View style={s.cardHeader}>
            <View>
              <Text style={s.cardTitle}>Operational Efficiency</Text>
              <Text style={s.cardSub}>Time and workflow improvements</Text>
            </View>
          </View>
          <View style={s.cardBody}>
            {data.tier2Items.map((item, idx) => (
              <View key={idx} style={[s.row, idx === data.tier2Items.length - 1 ? s.rowLast : {}]}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Text style={s.rowValueNeutral}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={s.takeaway} wrap={false}>
        <Text style={s.takeawayLabel}>Key Takeaway</Text>
        <Text style={s.takeawayText}>
          This report reflects your current deployment state. As providers become more familiar with the tool and utilization increases, you'll have more data to refine these measurements and track progress over time.
        </Text>
      </View>
      
      <Footer pageNum={1} totalPages={totalPages} preparedBy={data.preparedBy} />
    </Page>
  );
};

// ============================================================================
// PAGE 2+: METRIC DEEP DIVES - Dense table-style layout
// ============================================================================

const MetricSection = ({ metric }: { metric: ExpandMetricData }) => {
  const isValueMetric = metric.value && metric.value > 0;
  const status: "good" | "warning" | "alert" = isValueMetric ? "good" : metric.changePercent > 0 ? "good" : "warning";
  const hasTrend = metric.trend && metric.trend.length > 0;
  
  return (
    <View style={[s.card, { marginBottom: 6 }]} wrap={false}>
      {/* Compact header with inline value */}
      <View style={[s.cardHeader, isValueMetric ? { backgroundColor: c.greenLight, borderBottomColor: c.green } : {}, { padding: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <StatusDot status={status} />
          <Text style={[s.cardTitle, { fontSize: 8 }]}>{metric.name}</Text>
          {isValueMetric && (
            <Text style={{ fontSize: 10, fontWeight: "bold", color: c.green, marginLeft: 8 }}>{fmt(metric.value!)}</Text>
          )}
        </View>
        <Text style={{ fontSize: 6, color: c.medium }}>{metric.description}</Text>
      </View>
      
      <View style={[s.cardBody, { padding: 4 }]}>
        {/* Two-column layout: Data left, Chart right (if exists) */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Left: Core data table */}
          <View style={{ flex: hasTrend ? 1 : 2, minWidth: 160 }}>
            {/* Before/After as compact table rows */}
            <View style={{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: c.border, paddingBottom: 2, marginBottom: 2 }}>
              <Text style={{ width: 45, fontSize: 6, color: c.medium, fontWeight: "bold" }}>BEFORE</Text>
              <Text style={{ width: 45, fontSize: 6, color: c.medium, fontWeight: "bold" }}>AFTER</Text>
              <Text style={{ width: 50, fontSize: 6, color: c.medium, fontWeight: "bold" }}>CHANGE</Text>
              <Text style={{ flex: 1, fontSize: 6, color: c.medium, fontWeight: "bold" }}>%</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ width: 45, fontSize: 10, fontWeight: "bold", fontFamily: "Courier", color: c.dark }}>{metric.before.toFixed(2)}</Text>
              <Text style={{ width: 45, fontSize: 10, fontWeight: "bold", fontFamily: "Courier", color: c.dark }}>{metric.after.toFixed(2)}</Text>
              <Text style={{ width: 50, fontSize: 10, fontWeight: "bold", fontFamily: "Courier", color: metric.isPositiveGood ? (metric.change >= 0 ? c.green : c.primary) : (metric.change <= 0 ? c.green : c.primary) }}>
                {metric.change >= 0 ? "+" : ""}{metric.change.toFixed(2)}
              </Text>
              <View style={{ backgroundColor: metric.isPositiveGood ? (metric.change >= 0 ? c.greenLight : c.amberLight) : (metric.change <= 0 ? c.greenLight : c.amberLight), paddingHorizontal: 3, paddingVertical: 1, borderRadius: 1 }}>
                <Text style={{ fontSize: 7, fontWeight: "bold", color: metric.isPositiveGood ? (metric.change >= 0 ? c.green : c.amber) : (metric.change <= 0 ? c.green : c.amber) }}>
                  {Math.abs(metric.changePercent).toFixed(0)}% {metric.isPositiveGood ? (metric.change >= 0 ? "up" : "down") : (metric.change <= 0 ? "down" : "up")}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 5, color: c.light, marginBottom: 4 }}>Unit: {metric.unit}</Text>
            
            {/* Formula - prominent, dark */}
            {isValueMetric && metric.formula && (
              <View style={{ backgroundColor: c.pale, padding: 3, borderRadius: 1, marginBottom: 3 }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", fontFamily: "Courier", color: c.black }}>{metric.formula}</Text>
                <Text style={{ fontSize: 8, fontWeight: "bold", fontFamily: "Courier", color: c.green }}>= {fmt(metric.value!)}</Text>
                {metric.formulaExplanation && <Text style={{ fontSize: 5, color: c.medium, marginTop: 1 }}>{metric.formulaExplanation}</Text>}
              </View>
            )}
            
            {/* Benchmark inline */}
            {metric.benchmark && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <Text style={{ fontSize: 6, color: c.blue, marginRight: 4 }}>Benchmark: {metric.benchmark.typicalRange}</Text>
                <Text style={{ fontSize: 6, fontWeight: "bold", color: c.blue }}>{metric.benchmark.statusLabel}</Text>
              </View>
            )}
            
            {/* Warning inline */}
            {metric.warningMessage && (
              <View style={{ backgroundColor: c.amberLight, padding: 2, borderRadius: 1, marginBottom: 2 }}>
                <Text style={{ fontSize: 5, color: c.amber }}>{metric.warningMessage}</Text>
              </View>
            )}
          </View>
          
          {/* Right: Compact trend chart */}
          {hasTrend && (
            <View style={{ flex: 1 }}>
              <CompactTrendChart metric={metric} baseline={metric.before} />
            </View>
          )}
        </View>
        
        {/* What this means - single line if short */}
        {metric.whatThisMeans && (
          <View style={{ backgroundColor: c.pale, padding: 3, borderRadius: 1, marginTop: 2 }}>
            <Text style={{ fontSize: 6, color: c.dark, lineHeight: 1.2 }}>{metric.whatThisMeans}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Compact trend chart for inline display
const CompactTrendChart = ({ metric, baseline }: { metric: ExpandMetricData; baseline: number }) => {
  const trend = metric.trend || [];
  if (trend.length === 0) return null;
  
  const data = [{ label: "BL", value: baseline }, ...trend.map((t, i) => ({ label: `M${i + 1}`, value: t.value }))];
  const width = 180;
  const height = 50;
  const padding = { left: 25, right: 5, top: 5, bottom: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const values = data.map(d => d.value);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;
  
  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;
  
  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.value)}`).join(" ");
  const current = data[data.length - 1];
  const change = current.value - baseline;
  const isPositive = metric.isPositiveGood ? change >= 0 : change <= 0;
  
  return (
    <View style={{ backgroundColor: c.white, borderWidth: 0.5, borderColor: c.border, borderRadius: 1, padding: 2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <Text style={{ fontSize: 5, fontWeight: "bold", color: c.medium }}>{trend.length}mo trend</Text>
        <Text style={{ fontSize: 6, fontWeight: "bold", color: isPositive ? c.green : c.amber }}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}
        </Text>
      </View>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid line */}
        <Line x1={padding.left} y1={padding.top + chartHeight / 2} x2={padding.left + chartWidth} y2={padding.top + chartHeight / 2} stroke={c.border} strokeWidth={0.5} strokeDasharray="1,1" />
        
        {/* Line */}
        <Path d={linePath} stroke={isPositive ? c.green : c.amber} strokeWidth={1.5} fill="none" />
        
        {/* Points - only first and last */}
        <Circle cx={getX(0)} cy={getY(data[0].value)} r={2.5} fill={c.primary} />
        <Circle cx={getX(data.length - 1)} cy={getY(current.value)} r={3} fill={isPositive ? c.green : c.amber} />
        
        {/* X labels */}
        {data.filter((_, i) => i === 0 || i === data.length - 1).map((d, idx) => {
          const actualIdx = idx === 0 ? 0 : data.length - 1;
          return (
            <G key={`label-${actualIdx}`}>
              <Rect x={getX(actualIdx) - 8} y={height - 10} width={16} height={10} fill="transparent" />
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: padding.left - 5 }}>
        <Text style={{ fontSize: 5, color: c.primary, fontWeight: "bold" }}>BL</Text>
        <Text style={{ fontSize: 5, color: isPositive ? c.green : c.amber, fontWeight: "bold" }}>Now</Text>
      </View>
    </View>
  );
};

const MetricDeepDivePage = ({ metrics, pageNum, totalPages, clientName, preparedBy }: { metrics: ExpandMetricData[]; pageNum: number; totalPages: number; clientName?: string; preparedBy?: string }) => (
  <Page size="A4" style={s.page}>
    <Header title="Metric Deep Dives" clientName={clientName} />
    {metrics.map(m => <MetricSection key={m.id} metric={m} />)}
    <Footer pageNum={pageNum} totalPages={totalPages} preparedBy={preparedBy} />
  </Page>
);

// ============================================================================
// PAGE: STRATEGIC ANALYSIS
// ============================================================================

const StrategicAnalysisPage = ({ data, pageNum, totalPages }: { data: ExpandPDFData; pageNum: number; totalPages: number }) => (
  <Page size="A4" style={s.page}>
    <Header title="Strategic Analysis" clientName={data.clientName} />
    
    <SectionHeader title="Early Indicators" color={c.blue} />
    
    <View style={s.twoCol} wrap={false}>
      <View style={s.col}>
        <View style={[s.card, { marginBottom: 0 }]}>
          <View style={[s.cardHeader, { backgroundColor: c.greenLight, borderBottomColor: c.green }]}>
            <Text style={[s.cardTitle, { color: c.green }]}>What's Working Well</Text>
          </View>
          <View style={s.cardBody}>
            {data.workingWell.map((item, idx) => (
              <View key={idx} style={s.statusRow}>
                <StatusDot status="good" />
                <Text style={s.statusText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={s.col}>
        <View style={[s.card, { marginBottom: 0 }]}>
          <View style={[s.cardHeader, { backgroundColor: c.amberLight, borderBottomColor: c.amber }]}>
            <Text style={[s.cardTitle, { color: c.amber }]}>Areas to Watch</Text>
          </View>
          <View style={s.cardBody}>
            {data.areasToWatch.map((item, idx) => (
              <View key={idx} style={s.statusRow}>
                <StatusDot status="warning" />
                <Text style={s.statusText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
    
    <SectionHeader title="Optimization Opportunities" color={c.green} />
    
    {data.optimizationOpportunities.map((opp, idx) => (
      <View key={idx} style={s.oppCard} wrap={false}>
        <View style={s.oppHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={s.oppNum}><Text style={s.oppNumText}>{idx + 1}</Text></View>
            <Text style={s.oppTitle}>{opp.title}</Text>
          </View>
          <Text style={s.oppValue}>+{fmt(opp.potentialValue)}/yr</Text>
        </View>
        <View style={s.oppRow}>
          <View style={{ flex: 1, backgroundColor: c.pale, padding: 4, borderRadius: 2 }}>
            <Text style={s.oppLabel}>CURRENT</Text>
            <Text style={s.oppData}>{opp.current}</Text>
          </View>
          <View style={{ justifyContent: "center", paddingHorizontal: 4 }}><Arrow size={10} color={c.green} /></View>
          <View style={{ flex: 1, backgroundColor: c.greenLight, padding: 4, borderRadius: 2 }}>
            <Text style={[s.oppLabel, { color: c.greenDark }]}>TARGET</Text>
            <Text style={[s.oppData, { color: c.green }]}>{opp.target}</Text>
          </View>
        </View>
        <Text style={s.oppAction}>{opp.action}</Text>
      </View>
    ))}
    
    {data.utilizationRate < 70 && (
      <View style={[s.callout, { backgroundColor: c.amberLight, borderLeftColor: c.amber }]} wrap={false}>
        <Text style={[s.calloutTitle, { color: c.amber }]}>Context Note</Text>
        <Text style={[s.calloutText, { fontSize: 7 }]}>
          At {data.utilizationRate}% utilization and {data.monthsOnAbridge} months into deployment, your organization is still building adoption patterns. These early metrics will become more stable as usage matures.
        </Text>
      </View>
    )}
    
    <View style={s.takeaway} wrap={false}>
      <Text style={s.takeawayLabel}>Where You Are</Text>
      <Text style={s.takeawayText}>
        {data.utilizationRate < 70 
          ? `At ${data.utilizationRate}% utilization, you're in the growth phase of adoption. The ${fmt(data.tier1Value)} measured so far provides a baseline to track as your team becomes more comfortable with the workflow.`
          : `At ${data.utilizationRate}% utilization, you've established consistent adoption patterns. This is a good foundation for understanding which workflows are driving the most value for your organization.`
        }
      </Text>
    </View>
    
    <Footer pageNum={pageNum} totalPages={totalPages} preparedBy={data.preparedBy} />
  </Page>
);

// ============================================================================
// PAGE: EXPANSION OPPORTUNITY
// ============================================================================

const ExpansionPage = ({ data, pageNum, totalPages }: { data: ExpandPDFData; pageNum: number; totalPages: number }) => {
  const { expansion } = data;
  const providerMult = expansion.targetProviders / expansion.currentProviders;
  const utilMult = expansion.targetUtilization / expansion.currentUtilization;
  const valuePerProvider = expansion.targetProviders > 0 ? expansion.projectedValue / expansion.targetProviders : 0;
  
  return (
    <Page size="A4" style={s.page}>
      <Header title="Expansion Opportunity" clientName={data.clientName} />
      
      <View style={s.callout} wrap={false}>
        <Text style={s.calloutTitle}>Understanding Scale</Text>
        <Text style={s.calloutText}>
          Based on your current per-provider metrics, expanding to additional providers would proportionally increase measured value. At target utilization, each provider would contribute approximately {fmt(valuePerProvider)} annually.
        </Text>
      </View>
      
      <View style={s.heroRow} wrap={false}>
        <View style={s.heroCardPrimary}>
          <Text style={s.heroValueGreen}>{fmt(expansion.projectedValue)}</Text>
          <Text style={s.heroLabel}>Projected Annual Value</Text>
          <Text style={s.heroSub}>At full scale</Text>
        </View>
        <View style={s.heroCard}>
          <Text style={s.heroValueGreen}>+{fmt(expansion.expansionValue)}</Text>
          <Text style={s.heroLabel}>Additional Value</Text>
          <Text style={s.heroSub}>Beyond current</Text>
        </View>
        <View style={s.heroCard}>
          <Text style={s.heroValue}>{expansion.targetProviders}</Text>
          <Text style={s.heroLabel}>Target Providers</Text>
          <Text style={s.heroSub}>{expansion.targetUtilization}% utilization</Text>
        </View>
      </View>
      
      <SectionHeader title="Expansion Calculation" color={c.green} />
      
      <View style={s.card} wrap={false}>
        <View style={s.cardBody}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Current annual value</Text>
            <Text style={s.rowValue}>{fmt(expansion.currentValue)}</Text>
          </View>
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>Provider scale</Text>
              <Text style={{ fontSize: 6, color: c.medium }}>{expansion.currentProviders} → {expansion.targetProviders} providers</Text>
            </View>
            <Text style={s.rowValueNeutral}>{providerMult.toFixed(1)}x</Text>
          </View>
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>Utilization improvement</Text>
              <Text style={{ fontSize: 6, color: c.medium }}>{expansion.currentUtilization}% → {expansion.targetUtilization}%</Text>
            </View>
            <Text style={s.rowValueNeutral}>{utilMult.toFixed(2)}x</Text>
          </View>
          <View style={[s.row, s.rowLast, { backgroundColor: c.greenLight, borderRadius: 4, marginTop: 4, padding: 8 }]}>
            <Text style={[s.rowLabel, { fontWeight: "bold", fontSize: 9 }]}>Projected annual value at scale</Text>
            <Text style={[s.rowValue, { fontSize: 12 }]}>{fmt(expansion.projectedValue)}</Text>
          </View>
        </View>
      </View>
      
      <SectionHeader title="Current vs. Full Scale" color={c.blue} />
      
      <View style={s.twoCol} wrap={false}>
        <View style={s.col}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Current State</Text>
            </View>
            <View style={s.cardBody}>
              <View style={s.row}><Text style={s.rowLabel}>Providers</Text><Text style={s.rowValueNeutral}>{expansion.currentProviders}</Text></View>
              <View style={s.row}><Text style={s.rowLabel}>Utilization</Text><Text style={s.rowValueNeutral}>{expansion.currentUtilization}%</Text></View>
              <View style={s.row}><Text style={s.rowLabel}>Annual value</Text><Text style={s.rowValue}>{fmt(expansion.currentValue)}</Text></View>
              <View style={[s.row, s.rowLast]}><Text style={s.rowLabel}>Value/provider</Text><Text style={s.rowValueNeutral}>{fmt(expansion.currentProviders > 0 ? expansion.currentValue / expansion.currentProviders : 0)}</Text></View>
            </View>
          </View>
        </View>
        <View style={s.col}>
          <View style={[s.card, { borderColor: c.green, borderWidth: 2 }]}>
            <View style={s.cardHeaderGreen}>
              <Text style={[s.cardTitle, { color: c.green }]}>Full Scale Target</Text>
            </View>
            <View style={s.cardBody}>
              <View style={s.row}><Text style={s.rowLabel}>Providers</Text><Text style={s.rowValueNeutral}>{expansion.targetProviders}</Text></View>
              <View style={s.row}><Text style={s.rowLabel}>Utilization</Text><Text style={s.rowValueNeutral}>{expansion.targetUtilization}%</Text></View>
              <View style={s.row}><Text style={s.rowLabel}>Annual value</Text><Text style={s.rowValue}>{fmt(expansion.projectedValue)}</Text></View>
              <View style={[s.row, s.rowLast]}><Text style={s.rowLabel}>Added value</Text><Text style={[s.rowValue, { fontWeight: "bold" }]}>+{fmt(expansion.expansionValue)}</Text></View>
            </View>
          </View>
        </View>
      </View>
      
      <View style={s.takeaway} wrap={false}>
        <Text style={s.takeawayLabel}>Key Insight</Text>
        <Text style={s.takeawayText}>
          These projections are based on your current per-provider performance. Actual results at scale will depend on factors like specialty mix, patient volume, and workflow adoption across different departments.
        </Text>
      </View>
      
      <Footer pageNum={pageNum} totalPages={totalPages} preparedBy={data.preparedBy} />
    </Page>
  );
};

// ============================================================================
// PAGE: METHODOLOGY
// ============================================================================

const MethodologyPage = ({ data, pageNum, totalPages }: { data: ExpandPDFData; pageNum: number; totalPages: number }) => (
  <Page size="A4" style={s.page}>
    <Header title="Methodology" clientName={data.clientName} />
    
    <View style={[s.callout, { marginBottom: 8 }]} wrap={false}>
      <Text style={s.calloutText}>
        This section explains how each calculation was derived. All figures are based on either your input data or established industry benchmarks. The methodology is documented here so you can review and adjust assumptions as needed.
      </Text>
    </View>
    
    <View style={s.twoCol} wrap={false}>
      <View style={s.col}>
        <View style={s.card}>
          <View style={s.cardHeader}><Text style={s.cardTitle}>Your Inputs</Text></View>
          <View style={s.cardBody}>
            <View style={s.row}><Text style={s.rowLabel}>Providers</Text><Text style={s.rowValueNeutral}>{data.providers}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Annual encounters</Text><Text style={s.rowValueNeutral}>{fmtNum(data.encounters)}</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Utilization rate</Text><Text style={s.rowValueNeutral}>{data.utilizationRate}%</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Months on Abridge</Text><Text style={s.rowValueNeutral}>{data.monthsOnAbridge}</Text></View>
            <View style={[s.row, s.rowLast]}><Text style={s.rowLabel}>Documented encounters</Text><Text style={s.rowValueNeutral}>{fmtNum(data.documentedEncounters)}</Text></View>
          </View>
        </View>
      </View>
      <View style={s.col}>
        <View style={s.card}>
          <View style={s.cardHeader}><Text style={s.cardTitle}>Value Attribution</Text></View>
          <View style={s.cardBody}>
            <View style={s.row}><Text style={s.rowLabel}>wRVU conversion</Text><Text style={s.rowValueNeutral}>$33/wRVU</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>wRVU attribution</Text><Text style={s.rowValueNeutral}>50%</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Provider hourly value</Text><Text style={s.rowValueNeutral}>$150/hr</Text></View>
            <View style={s.row}><Text style={s.rowLabel}>Retention cost</Text><Text style={s.rowValueNeutral}>$500K/departure</Text></View>
            <View style={[s.row, s.rowLast]}><Text style={s.rowLabel}>Commercial uplift</Text><Text style={s.rowValueNeutral}>30-50% higher</Text></View>
          </View>
        </View>
      </View>
    </View>
    
    <SectionHeader title="Reference Benchmarks" color={c.blue} />
    
    <View style={s.twoCol} wrap={false}>
      <View style={s.col}>
        <View style={[s.card, { backgroundColor: c.blueLight }]}>
          <View style={s.cardBody}>
            <Text style={[s.cardTitle, { color: c.blue, marginBottom: 6 }]}>Industry Observations</Text>
            <View style={s.statusRow}><StatusDot status="good" /><Text style={s.statusText}>wRVU change: 3-7% range observed</Text></View>
            <View style={s.statusRow}><StatusDot status="good" /><Text style={s.statusText}>Documentation time: 3-5 min/encounter typical</Text></View>
            <View style={s.statusRow}><StatusDot status="good" /><Text style={s.statusText}>Same-day chart closure: varies widely</Text></View>
          </View>
        </View>
      </View>
      <View style={s.col}>
        <View style={[s.card, { backgroundColor: c.greenLight }]}>
          <View style={s.cardBody}>
            <Text style={[s.cardTitle, { color: c.green, marginBottom: 6 }]}>Provider Experience</Text>
            <View style={s.statusRow}><StatusDot status="good" /><Text style={s.statusText}>After-hours documentation: varies</Text></View>
            <View style={s.statusRow}><StatusDot status="good" /><Text style={s.statusText}>Satisfaction surveys: context-dependent</Text></View>
            <View style={s.statusRow}><StatusDot status="warning" /><Text style={s.statusText}>Burnout indicators: organization-specific</Text></View>
          </View>
        </View>
      </View>
    </View>
    
    <SectionHeader title="What We Don't Include" color={c.medium} />
    
    <View style={s.card} wrap={false}>
      <View style={s.cardBody}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, color: c.dark, marginBottom: 2 }}>• Downstream revenue from patient experience</Text>
            <Text style={{ fontSize: 7, color: c.dark, marginBottom: 2 }}>• Quality measure incentives (MIPS, HEDIS)</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, color: c.dark, marginBottom: 2 }}>• Reduced compliance/audit risk</Text>
            <Text style={{ fontSize: 7, color: c.dark, marginBottom: 2 }}>• Training time reduction</Text>
          </View>
        </View>
      </View>
    </View>
    
    <View style={s.takeaway} wrap={false}>
      <Text style={s.takeawayLabel}>About These Estimates</Text>
      <Text style={s.takeawayText}>
        These calculations use Medicare conversion factors and conservative attribution percentages. Organizations with a higher proportion of commercial payers or different specialty mixes may see different results. We recommend validating these assumptions against your specific payer mix.
      </Text>
    </View>
    
    <Footer pageNum={pageNum} totalPages={totalPages} preparedBy={data.preparedBy} />
  </Page>
);

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

const ExpandROIDocument = ({ data }: { data: ExpandPDFData }) => {
  const metricsWithDeepDive = data.metrics.filter(m => (m.value && m.value > 0) || m.trend || m.before !== m.after);
  
  const metricsPerPage = 3;
  const metricPages: ExpandMetricData[][] = [];
  for (let i = 0; i < metricsWithDeepDive.length; i += metricsPerPage) {
    metricPages.push(metricsWithDeepDive.slice(i, i + metricsPerPage));
  }
  
  const totalPages = 1 + metricPages.length + 3;
  
  return (
    <Document>
      <Page1Dashboard data={data} totalPages={totalPages} />
      
      {metricPages.map((metrics, idx) => (
        <MetricDeepDivePage key={idx} metrics={metrics} pageNum={2 + idx} totalPages={totalPages} clientName={data.clientName} preparedBy={data.preparedBy} />
      ))}
      
      <StrategicAnalysisPage data={data} pageNum={2 + metricPages.length} totalPages={totalPages} />
      <ExpansionPage data={data} pageNum={3 + metricPages.length} totalPages={totalPages} />
      <MethodologyPage data={data} pageNum={4 + metricPages.length} totalPages={totalPages} />
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
