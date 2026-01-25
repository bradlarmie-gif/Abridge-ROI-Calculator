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
// STYLES - DENSE LAYOUT
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 32,
    paddingBottom: 45,
    fontFamily: "Helvetica",
    fontSize: 8,
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
    borderBottomColor: colors.primary,
  },
  logo: {
    width: 75,
    height: 15,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 1,
  },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 6,
    color: colors.lightGray,
  },

  orgContext: {
    marginBottom: 6,
  },
  orgName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  orgDetails: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 1,
  },

  pageTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  executiveCallout: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  executiveCalloutTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  executiveCalloutText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },

  keyTakeaway: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 6,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  keyTakeawayLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    marginRight: 6,
    marginTop: 1,
  },
  keyTakeawayText: {
    flex: 1,
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.3,
  },

  narrativeBox: {
    backgroundColor: colors.paleGray,
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  narrativeTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  narrativeText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.black,
  },

  heroRow: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 4,
  },
  heroBox: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 6,
    alignItems: "center",
  },
  heroBoxHighlight: {
    flex: 1,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 6,
    alignItems: "center",
  },
  heroValue: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: 2,
  },
  heroValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
    marginBottom: 2,
  },
  heroLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
    marginTop: 2,
  },
  heroSublabel: {
    fontSize: 5,
    color: colors.lightGray,
    marginTop: 1,
    textAlign: "center",
  },

  card: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 4,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: colors.paleGray,
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  cardHeaderGreen: {
    backgroundColor: colors.greenLight,
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.green,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  cardSubtitle: {
    fontSize: 6,
    color: colors.mediumGray,
    marginTop: 1,
  },
  cardValue: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  cardContent: {
    padding: 6,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 7,
    color: colors.darkGray,
  },
  rowFormula: {
    fontSize: 6,
    color: colors.lightGray,
    marginTop: 1,
    fontFamily: "Courier",
  },
  rowExplanation: {
    fontSize: 6,
    color: colors.mediumGray,
    marginTop: 1,
    lineHeight: 1.3,
  },
  rowValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "right",
  },
  rowValueNeutral: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "right",
  },

  metricCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  metricHeader: {
    backgroundColor: colors.paleGray,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  metricName: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  metricDesc: {
    fontSize: 6,
    color: colors.mediumGray,
    marginTop: 1,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
    textAlign: "right",
  },
  metricContent: {
    padding: 8,
  },

  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  comparisonBox: {
    alignItems: "center",
    minWidth: 60,
  },
  comparisonLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
  comparisonUnit: {
    fontSize: 6,
    color: colors.mediumGray,
    marginTop: 1,
  },
  comparisonArrowContainer: {
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonChange: {
    alignItems: "center",
    backgroundColor: colors.greenLight,
    borderRadius: 4,
    padding: 6,
    minWidth: 60,
  },
  comparisonChangeValue: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  comparisonChangePercent: {
    fontSize: 6,
    color: colors.greenDark,
    marginTop: 1,
  },

  sectionBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 6,
    marginBottom: 6,
  },
  sectionBoxTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  benchmarkBox: {
    backgroundColor: colors.blueLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
    padding: 6,
    marginBottom: 6,
    borderRadius: 3,
  },
  benchmarkTitle: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.blueDark,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  benchmarkText: {
    fontSize: 7,
    color: colors.blueDark,
    lineHeight: 1.3,
  },

  warningBox: {
    backgroundColor: colors.amberLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    padding: 6,
    marginBottom: 6,
    borderRadius: 3,
  },
  warningTitle: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.amberDark,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  warningText: {
    fontSize: 7,
    color: colors.amberDark,
    lineHeight: 1.3,
  },

  valueCalcBox: {
    backgroundColor: colors.greenLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    padding: 6,
    marginBottom: 6,
    borderRadius: 3,
  },
  valueCalcTitle: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.greenDark,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  valueCalcFormula: {
    fontSize: 7,
    color: colors.green,
    fontFamily: "Courier",
    fontWeight: "bold",
    marginBottom: 2,
  },
  valueCalcText: {
    fontSize: 6,
    color: colors.greenDark,
    lineHeight: 1.3,
  },

  meaningBox: {
    backgroundColor: colors.paleGray,
    borderLeftWidth: 3,
    borderLeftColor: colors.mediumGray,
    padding: 6,
    marginTop: 4,
    borderRadius: 3,
  },
  meaningTitle: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.darkGray,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  meaningText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },

  trendChartContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  trendLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 6,
  },
  trendSummary: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 4,
  },

  checkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  checkMark: {
    fontSize: 7,
    color: colors.green,
    marginRight: 4,
    fontWeight: "bold",
  },
  arrowMark: {
    fontSize: 7,
    color: colors.amber,
    marginRight: 4,
    fontWeight: "bold",
  },
  checkText: {
    flex: 1,
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.3,
  },

  opportunityCard: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  opportunityCardExpanded: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  contextBox: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  bottomLineBox: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.darkGray,
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  opportunityTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  opportunityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  opportunityLabel: {
    fontSize: 6,
    color: colors.mediumGray,
  },
  opportunityValue: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.black,
  },
  opportunityAction: {
    fontSize: 6,
    color: colors.darkGray,
    marginTop: 3,
    fontStyle: "italic",
    lineHeight: 1.3,
  },

  twoColumn: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  column: {
    flex: 1,
  },

  journeyChart: {
    backgroundColor: colors.paleGray,
    borderRadius: 4,
    padding: 6,
    marginBottom: 4,
    minHeight: 55,
  },

  methodologyGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  methodologyColumn: {
    flex: 1,
  },
  methodologyTitle: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  methodologyItem: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 1,
  },

  closingBox: {
    backgroundColor: colors.paleGray,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  closingText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    fontStyle: "italic",
  },

  progressBar: {
    height: 8,
    backgroundColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  progressLabel: {
    fontSize: 5,
    color: colors.mediumGray,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },

  sparklineContainer: {
    flexDirection: "row",
    alignItems: "center",
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

const getStatusColor = (status: "good" | "warning" | "alert"): string => {
  switch (status) {
    case "good": return colors.green;
    case "warning": return colors.amber;
    case "alert": return colors.primary;
  }
};

const getMaturityLevel = (utilization: number): { label: string; color: string; percent: number } => {
  if (utilization >= 80) return { label: "Optimized", color: colors.green, percent: 100 };
  if (utilization >= 60) return { label: "Developing", color: colors.blue, percent: 75 };
  if (utilization >= 40) return { label: "Emerging", color: colors.amber, percent: 50 };
  return { label: "Early Stage", color: colors.lightGray, percent: 25 };
};

// ============================================================================
// SVG ICON COMPONENTS
// ============================================================================

const IconChart = ({ size = 10, color = colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 3v18h18" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M7 14l4-4 4 4 5-5" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const IconTarget = ({ size = 10, color = colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" fill="none" />
    <Circle cx="12" cy="12" r="1" fill={color} />
  </Svg>
);

const IconLightbulb = ({ size = 10, color = colors.amber }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M9 21h6M12 3a6 6 0 0 0-6 6c0 2.5 1.5 4.5 4 5.5V17h4v-2.5c2.5-1 4-3 4-5.5a6 6 0 0 0-6-6z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const IconCheckCircle = ({ size = 10, color = colors.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const IconTrendUp = ({ size = 10, color = colors.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M23 6l-9 9-5-5-7 7" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M17 6h6v6" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const IconExpand = ({ size = 10, color = colors.blue }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const IconBook = ({ size = 10, color = colors.mediumGray }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const ArrowRight = ({ size = 12, color = colors.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2.5" fill="none" />
  </Svg>
);

// ============================================================================
// TRAFFIC LIGHT STATUS DOT
// ============================================================================

const StatusDot = ({ status }: { status: "good" | "warning" | "alert" }) => (
  <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
);

// ============================================================================
// MINI SPARKLINE COMPONENT
// ============================================================================

const MiniSparkline = ({ 
  values, 
  width = 40, 
  height = 12,
  color = colors.green 
}: { 
  values: number[]; 
  width?: number; 
  height?: number;
  color?: string;
}) => {
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <View style={{ marginLeft: 6 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={points} stroke={color} strokeWidth="1.5" fill="none" />
        <Circle 
          cx={(values.length - 1) / (values.length - 1) * width} 
          cy={height - ((values[values.length - 1] - min) / range) * (height - 2) - 1}
          r="2" 
          fill={color} 
        />
      </Svg>
    </View>
  );
};

// ============================================================================
// PROGRESS INDICATOR COMPONENT
// ============================================================================

const ProgressIndicator = ({ 
  current, 
  target, 
  label,
  showLabels = true,
  barWidth = 100
}: { 
  current: number; 
  target: number; 
  label: string;
  showLabels?: boolean;
  barWidth?: number;
}) => {
  const percent = Math.min((current / target) * 100, 100);
  const color = percent >= 80 ? colors.green : percent >= 50 ? colors.blue : colors.amber;
  const fillWidth = (percent / 100) * barWidth;
  
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
        <Text style={{ fontSize: 6, color: colors.mediumGray }}>{label}</Text>
        <Text style={{ fontSize: 6, fontWeight: "bold", color }}>{current}%</Text>
      </View>
      <View style={[styles.progressBar, { width: barWidth }]}>
        <View style={[styles.progressFill, { width: fillWidth, backgroundColor: color }]} />
      </View>
      {showLabels && (
        <View style={[styles.progressLabels, { width: barWidth }]}>
          <Text style={styles.progressLabel}>0%</Text>
          <Text style={[styles.progressLabel, { color }]}>{target}% target</Text>
        </View>
      )}
    </View>
  );
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
// SECTION TITLE WITH ICON
// ============================================================================

const SectionTitle = ({ 
  icon, 
  title 
}: { 
  icon: "chart" | "target" | "lightbulb" | "check" | "trend" | "expand" | "book";
  title: string;
}) => {
  const IconComponent = {
    chart: IconChart,
    target: IconTarget,
    lightbulb: IconLightbulb,
    check: IconCheckCircle,
    trend: IconTrendUp,
    expand: IconExpand,
    book: IconBook,
  }[icon];
  
  return (
    <View style={styles.sectionTitleRow}>
      <IconComponent size={10} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
};

// ============================================================================
// KEY TAKEAWAY BOX
// ============================================================================

const KeyTakeaway = ({ text }: { text: string }) => (
  <View style={styles.keyTakeaway} wrap={false}>
    <Text style={styles.keyTakeawayLabel}>KEY TAKEAWAY</Text>
    <Text style={styles.keyTakeawayText}>{text}</Text>
  </View>
);

// ============================================================================
// EXECUTIVE CALLOUT BOX
// ============================================================================

const ExecutiveCallout = ({ title, text }: { title: string; text: string }) => (
  <View style={styles.executiveCallout} wrap={false}>
    <Text style={styles.executiveCalloutTitle}>{title}</Text>
    <Text style={styles.executiveCalloutText}>{text}</Text>
  </View>
);

// ============================================================================
// ENHANCED TREND CHART - LARGER AND MORE PROMINENT
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

  const data: TrendDataPoint[] = [
    { label: "BL", value: baseline, isBaseline: true },
    ...trend.map((t, i) => ({
      label: `M${i + 1}`,
      value: t.value,
      isCurrent: i === trend.length - 1,
    })),
  ];

  const width = 480;
  const height = 120;
  const positiveIsGood = metric.isPositiveGood;
  const valueSuffix = metric.unit;

  const yAxisColumnWidth = 40;
  const svgWidth = width - yAxisColumnWidth;
  const padding = { top: 15, right: 15, bottom: 20, left: 10 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const valuePadding = valueRange * 0.15;
  const yMin = minValue - valuePadding;
  const yMax = maxValue + valuePadding;
  const yRange = yMax - yMin;

  const xStep = chartWidth / (data.length - 1);
  
  const getX = (index: number) => padding.left + (index * xStep);
  const getY = (value: number) => padding.top + chartHeight - ((value - yMin) / yRange * chartHeight);

  const linePath = data.map((point, i) => {
    const x = getX(i);
    const y = getY(point.value);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");

  const areaPath = `${linePath} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const current = data[data.length - 1];
  const change = current.value - baseline;
  const changePercent = baseline !== 0 ? (change / baseline) * 100 : 0;
  const isPositiveTrend = positiveIsGood ? change >= 0 : change <= 0;

  const chartColors = {
    line: colors.green,
    area: "#9CA3AF20",
    baseline: colors.primary,
    current: colors.green,
    currentRing: colors.white,
    grid: "#E5E7EB",
    text: colors.mediumGray,
    axisLine: "#D1D5DB",
  };

  const yTicks = [
    { value: yMin + yRange * 0.1, y: getY(yMin + yRange * 0.1) },
    { value: yMin + yRange * 0.5, y: getY(yMin + yRange * 0.5) },
    { value: yMin + yRange * 0.9, y: getY(yMin + yRange * 0.9) },
  ];

  const formatValue = (val: number) => {
    if (valueSuffix === "%" || valueSuffix.includes("wRVU")) {
      return val.toFixed(2);
    }
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toFixed(1);
  };

  const yAxisLabels = yTicks.map(tick => ({
    value: formatValue(tick.value),
    topOffset: tick.y - padding.top,
  }));

  return (
    <View style={styles.trendChartContainer} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Text style={styles.trendLabel}>TREND OVER {trend.length} MONTHS</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <StatusDot status={isPositiveTrend ? "good" : "warning"} />
          <Text style={{ fontSize: 6, color: isPositiveTrend ? colors.green : colors.amber, fontWeight: "bold" }}>
            {isPositiveTrend ? "IMPROVING" : "NEEDS ATTENTION"}
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: yAxisColumnWidth, height: chartHeight + padding.top + padding.bottom, justifyContent: "flex-start", paddingTop: padding.top }}>
          {yAxisLabels.map((label, i) => (
            <Text
              key={`y-label-${i}`}
              style={{
                fontSize: 6,
                color: chartColors.text,
                textAlign: "right",
                position: "absolute",
                top: label.topOffset - 4,
                right: 4,
              }}
            >
              {label.value}
            </Text>
          ))}
        </View>
        
        <Svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
          <Rect x={0} y={0} width={svgWidth} height={height} fill={colors.white} rx={4} />
          <Rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill={colors.paleGray} />

          {yTicks.map((tick, i) => (
            <Line
              key={`grid-${i}`}
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + chartWidth}
              y2={tick.y}
              stroke={chartColors.grid}
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
          ))}

          <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke={chartColors.axisLine} strokeWidth={1} />
          <Line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke={chartColors.axisLine} strokeWidth={1} />

          <Path d={areaPath} fill={chartColors.area} />
          <Path d={linePath} stroke={chartColors.line} strokeWidth={2.5} fill="none" />

          {data.map((point, i) => {
            const x = getX(i);
            const y = getY(point.value);
            
            if (point.isBaseline) {
              return (
                <G key={`point-${i}`}>
                  <Circle cx={x} cy={y} r={5} fill={chartColors.baseline} />
                  <Circle cx={x} cy={y} r={3} fill={colors.white} />
                  <Circle cx={x} cy={y} r={1.5} fill={chartColors.baseline} />
                </G>
              );
            } else if (point.isCurrent) {
              return (
                <G key={`point-${i}`}>
                  <Circle cx={x} cy={y} r={8} fill={chartColors.current} opacity={0.2} />
                  <Circle cx={x} cy={y} r={5} fill={chartColors.current} />
                  <Circle cx={x} cy={y} r={3} fill={chartColors.currentRing} />
                  <Circle cx={x} cy={y} r={1.5} fill={chartColors.current} />
                </G>
              );
            } else {
              return (
                <Circle key={`point-${i}`} cx={x} cy={y} r={3} fill={chartColors.line} />
              );
            }
          })}
        </Svg>
      </View>
      
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: yAxisColumnWidth + padding.left, paddingRight: padding.right, marginTop: 3 }}>
        {data.map((point, i) => (
          <Text 
            key={`x-label-${i}`}
            style={{ 
              fontSize: 6, 
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
      
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.borderGray }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 10, height: 3, backgroundColor: chartColors.baseline, borderRadius: 1, marginRight: 4 }} />
          <Text style={{ fontSize: 6, color: colors.mediumGray }}>Baseline: {formatValue(baseline)} {valueSuffix}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 10, height: 3, backgroundColor: chartColors.current, borderRadius: 1, marginRight: 4 }} />
          <Text style={{ fontSize: 6, color: colors.mediumGray }}>Current: {formatValue(current.value)} {valueSuffix}</Text>
        </View>
        <View style={{ backgroundColor: isPositiveTrend ? colors.greenLight : colors.amberLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
          <Text style={{ fontSize: 6, fontWeight: "bold", color: isPositiveTrend ? colors.green : colors.amber }}>
            {change >= 0 ? "+" : ""}{formatValue(change)} ({changePercent >= 0 ? "+" : ""}{changePercent.toFixed(0)}%)
          </Text>
        </View>
      </View>
    </View>
  );
};


// ============================================================================
// PAGE 1: EXECUTIVE SUMMARY
// ============================================================================

const ExecutiveSummaryPage = ({ data, totalPages }: { data: ExpandPDFData; totalPages: number }) => {
  const hardValueMetrics = data.metrics.filter(m => m.value && m.value > 0);
  const maturity = getMaturityLevel(data.utilizationRate);
  const valuePerProvider = data.providers > 0 ? data.tier1Value / data.providers : 0;
  
  return (
    <Page size="A4" style={styles.page}>
      <Header title="Value Realization Report" />

      <View style={styles.orgContext} wrap={false}>
        {data.organizationName && (
          <Text style={styles.orgName}>{data.organizationName}</Text>
        )}
        <Text style={styles.orgDetails}>
          {data.providers} providers · {data.monthsOnAbridge} months on Abridge · {data.utilizationRate}% utilization · {formatNumber(data.documentedEncounters)} documented encounters
        </Text>
      </View>

      <ExecutiveCallout 
        title="At a Glance" 
        text={`Your ${data.providers} providers are generating ${formatCurrency(valuePerProvider)} each annually in documented value. At ${data.utilizationRate}% utilization, you're capturing ${formatCurrency(data.tier1Value)} today—with a clear path to ${formatCurrency(data.expansion.projectedValue)} at scale.`}
      />

      <View style={styles.heroRow} wrap={false}>
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

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }} wrap={false}>
        <View style={{ flex: 1, backgroundColor: colors.paleGray, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: colors.borderGray }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.mediumGray, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>DEPLOYMENT MATURITY</Text>
          <ProgressIndicator current={data.utilizationRate} target={85} label="Utilization Rate" showLabels={false} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: maturity.color, marginRight: 6 }} />
            <Text style={{ fontSize: 7, fontWeight: "bold", color: maturity.color }}>{maturity.label}</Text>
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.paleGray, borderRadius: 4, padding: 8, borderWidth: 1, borderColor: colors.borderGray }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.mediumGray, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>VALUE DRIVERS</Text>
          {hardValueMetrics.slice(0, 2).map((m, idx) => (
            <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <StatusDot status="good" />
                <Text style={{ fontSize: 7, color: colors.darkGray }}>{m.name}</Text>
              </View>
              {m.trend && m.trend.length > 0 && (
                <MiniSparkline values={[m.before, ...m.trend.map(t => t.value)]} />
              )}
            </View>
          ))}
        </View>
      </View>

      <SectionTitle icon="chart" title="Your Value Journey" />
      
      <View style={styles.journeyChart} wrap={false}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 35, justifyContent: "space-between", height: 40, paddingRight: 4 }}>
            <Text style={{ fontSize: 5, color: colors.green, fontWeight: "bold", textAlign: "right" }}>{formatCurrency(data.expansion.projectedValue)}</Text>
            <Text style={{ fontSize: 5, color: colors.green, fontWeight: "bold", textAlign: "right" }}>{formatCurrency(data.tier1Value)}</Text>
            <Text style={{ fontSize: 5, color: colors.mediumGray, textAlign: "right" }}>$0</Text>
          </View>
          
          <Svg width="100%" height="45" viewBox="0 0 350 45" preserveAspectRatio="xMidYMid meet">
            <Rect x="0" y="0" width="350" height="45" fill={colors.white} />
            <Line x1="0" y1="42" x2="350" y2="42" stroke={colors.borderGray} strokeWidth="1" />
            <Line x1="0" y1="22" x2="350" y2="22" stroke={colors.borderGray} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
            <Line x1="0" y1="4" x2="350" y2="4" stroke={colors.borderGray} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
            
            <Path d="M 10 42 L 10 38 Q 50 33 90 28 T 140 22 T 175 19 L 175 42 Z" fill={colors.green} opacity="0.12" />
            <Path d="M 10 38 Q 50 33 90 28 T 140 22 T 175 19" fill="none" stroke={colors.green} strokeWidth="2" />
            <Path d="M 175 19 Q 230 12 280 7 T 340 4" fill="none" stroke={colors.blue} strokeWidth="1.5" strokeDasharray="4,3" />
            
            <Circle cx="10" cy="38" r="2.5" fill={colors.lightGray} stroke={colors.white} strokeWidth="1" />
            <Circle cx="90" cy="28" r="2" fill={colors.green} stroke={colors.white} strokeWidth="1" />
            <Circle cx="140" cy="23" r="2" fill={colors.green} stroke={colors.white} strokeWidth="1" />
            
            <Circle cx="175" cy="19" r="6" fill={colors.primaryLight} opacity="0.5" />
            <Circle cx="175" cy="19" r="4" fill={colors.primary} stroke={colors.white} strokeWidth="1.5" />
            
            <Circle cx="260" cy="10" r="2" fill={colors.blue} stroke={colors.white} strokeWidth="1" />
            <Circle cx="340" cy="4" r="3" fill={colors.green} stroke={colors.white} strokeWidth="1.5" />
          </Svg>
        </View>
        
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 3, paddingLeft: 35 }}>
          <View style={{ alignItems: "flex-start", width: 50 }}>
            <Text style={{ fontSize: 5, fontWeight: "bold", color: colors.mediumGray }}>Before</Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 5, fontWeight: "bold", color: colors.primary }}>YOU ARE HERE</Text>
            <Text style={{ fontSize: 6, fontWeight: "bold", color: colors.green, fontFamily: "Helvetica-Bold" }}>{formatCurrency(data.tier1Value)}</Text>
          </View>
          <View style={{ alignItems: "flex-end", width: 55 }}>
            <Text style={{ fontSize: 5, fontWeight: "bold", color: colors.green }}>Full Scale</Text>
            <Text style={{ fontSize: 6, fontWeight: "bold", color: colors.green, fontFamily: "Helvetica-Bold" }}>{formatCurrency(data.expansion.projectedValue)}</Text>
          </View>
        </View>
      </View>

      <SectionTitle icon="target" title="Value Breakdown" />

      <View style={styles.card} wrap={false}>
        <View style={styles.cardHeaderGreen}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <StatusDot status="good" />
            <View>
              <Text style={styles.cardTitle}>Tier 1: Hard Value</Text>
              <Text style={styles.cardSubtitle}>Directly measurable financial impact</Text>
            </View>
          </View>
          <Text style={styles.cardValue}>{formatCurrency(data.tier1Value)}</Text>
        </View>
        <View style={styles.cardContent}>
          {hardValueMetrics.map((metric, idx) => (
            <View key={metric.id} style={[styles.row, idx === hardValueMetrics.length - 1 ? styles.rowLast : {}]}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{metric.name}</Text>
                  {metric.formula && <Text style={styles.rowFormula}>{metric.formula}</Text>}
                </View>
                {metric.trend && metric.trend.length > 0 && (
                  <MiniSparkline values={[metric.before, ...metric.trend.map(t => t.value)]} width={35} height={10} />
                )}
              </View>
              <Text style={styles.rowValue}>{formatCurrency(metric.value!)}</Text>
            </View>
          ))}
        </View>
      </View>

      {data.tier2Items.length > 0 && (
        <View style={styles.card} wrap={false}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <StatusDot status="warning" />
              <View>
                <Text style={styles.cardTitle}>Tier 2: Efficiency Gains</Text>
                <Text style={styles.cardSubtitle}>Measured improvements—not yet converted to dollars</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardContent}>
            {data.tier2Items.map((item, idx) => (
              <View key={idx} style={[styles.row, idx === data.tier2Items.length - 1 ? styles.rowLast : {}]}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowValueNeutral}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {data.tier3Items.length > 0 && (
        <View style={styles.card} wrap={false}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Tier 3: Leading Indicators</Text>
              <Text style={styles.cardSubtitle}>Directional signals that predict future value</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            {data.tier3Items.map((item, idx) => (
              <View key={idx} style={[styles.row, idx === data.tier3Items.length - 1 ? styles.rowLast : {}]}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowValueNeutral}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <KeyTakeaway 
        text={`The foundation is solid. Your deployment is proving out the value model in your environment—the next step is deepening adoption among existing providers and extending to new ones.`}
      />

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
        const status: "good" | "warning" | "alert" = isValueMetric ? "good" : metric.changePercent > 0 ? "good" : "warning";
        
        return (
        <View key={metric.id} style={styles.metricCard} wrap={false}>
          <View style={[styles.metricHeader, isValueMetric ? { backgroundColor: colors.greenLight, borderBottomColor: colors.green } : {}]}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
              <StatusDot status={status} />
              <View style={{ flex: 1 }}>
                <Text style={styles.metricName}>{metric.name.toUpperCase()}</Text>
                <Text style={styles.metricDesc}>{metric.description}</Text>
              </View>
            </View>
            {isValueMetric ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metricValue, { color: colors.green }]}>{formatCurrency(metric.value!)}</Text>
                <Text style={{ fontSize: 5, color: colors.mediumGray }}>annual value</Text>
              </View>
            ) : isTimeMetric ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.metricValue}>{Math.abs(metric.change).toFixed(1)} {metric.unit}</Text>
                <Text style={{ fontSize: 5, color: colors.mediumGray }}>saved per encounter</Text>
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
              <View style={styles.comparisonArrowContainer}>
                <ArrowRight size={16} color={colors.mediumGray} />
              </View>
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>AFTER ABRIDGE</Text>
                <Text style={styles.comparisonValue}>{metric.after.toFixed(2)}</Text>
                <Text style={styles.comparisonUnit}>{metric.unit}</Text>
              </View>
              <View style={styles.comparisonArrowContainer}>
                <Text style={{ fontSize: 12, color: colors.mediumGray }}>=</Text>
              </View>
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
              <View style={styles.benchmarkBox} wrap={false}>
                <Text style={styles.benchmarkTitle}>BENCHMARK COMPARISON</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.benchmarkText}>
                    Typical range: {metric.benchmark.typicalRange}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <StatusDot status={metric.benchmark.status === "within" || metric.benchmark.status === "above" ? "good" : "warning"} />
                    <Text style={[styles.benchmarkText, { fontWeight: "bold" }]}>
                      {metric.benchmark.statusLabel}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {metric.warningMessage && (
              <View style={styles.warningBox} wrap={false}>
                <Text style={styles.warningTitle}>VALIDATION RECOMMENDED</Text>
                <Text style={styles.warningText}>{metric.warningMessage}</Text>
              </View>
            )}

            {metric.value && metric.value > 0 && metric.formula && (
              <View style={styles.valueCalcBox} wrap={false}>
                <Text style={styles.valueCalcTitle}>VALUE CALCULATION</Text>
                <Text style={styles.valueCalcFormula}>{metric.formula} = {formatCurrency(metric.value)}</Text>
                {metric.formulaExplanation && (
                  <Text style={styles.valueCalcText}>{metric.formulaExplanation}</Text>
                )}
              </View>
            )}

            {metric.whatThisMeans && (
              <View style={styles.meaningBox} wrap={false}>
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

      <SectionTitle icon="lightbulb" title="Early Indicators" />

      <View style={styles.twoColumn} wrap={false}>
        <View style={styles.column}>
          <View style={[styles.sectionBox, { borderLeftWidth: 3, borderLeftColor: colors.green }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <IconCheckCircle size={8} color={colors.green} />
              <Text style={[styles.sectionBoxTitle, { color: colors.green, marginLeft: 4, marginBottom: 0 }]}>What's Working Well</Text>
            </View>
            {data.workingWell.map((item, idx) => (
              <View key={idx} style={styles.statusRow}>
                <StatusDot status="good" />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.column}>
          <View style={[styles.sectionBox, { borderLeftWidth: 3, borderLeftColor: colors.amber }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <IconTarget size={8} color={colors.amber} />
              <Text style={[styles.sectionBoxTitle, { color: colors.amber, marginLeft: 4, marginBottom: 0 }]}>Areas to Watch</Text>
            </View>
            {data.areasToWatch.map((item, idx) => (
              <View key={idx} style={styles.statusRow}>
                <StatusDot status="warning" />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <SectionTitle icon="trend" title="Optimization Opportunities" />

      {data.optimizationOpportunities.map((opp, idx) => (
        <View key={idx} style={styles.opportunityCardExpanded} wrap={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ backgroundColor: colors.green, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2, marginRight: 6 }}>
                <Text style={{ fontSize: 6, color: colors.white, fontWeight: "bold" }}>{idx + 1}</Text>
              </View>
              <Text style={[styles.opportunityTitle, { marginBottom: 0 }]}>{opp.title}</Text>
            </View>
            <Text style={{ color: colors.green, fontSize: 9, fontWeight: "bold" }}>+{formatCurrency(opp.potentialValue)}/yr</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            <View style={{ flex: 1, backgroundColor: colors.paleGray, padding: 4, borderRadius: 3 }}>
              <Text style={{ fontSize: 5, color: colors.mediumGray, marginBottom: 1 }}>CURRENT</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold" }}>{opp.current}</Text>
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <ArrowRight size={10} color={colors.green} />
            </View>
            <View style={{ flex: 1, backgroundColor: colors.greenLight, padding: 4, borderRadius: 3 }}>
              <Text style={{ fontSize: 5, color: colors.greenDark, marginBottom: 1 }}>TARGET</Text>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.green }}>{opp.target}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: colors.paleGray, padding: 4, borderRadius: 3 }}>
            <Text style={{ fontSize: 5, color: colors.mediumGray, marginBottom: 1 }}>RECOMMENDED ACTION</Text>
            <Text style={{ fontSize: 6, lineHeight: 1.3 }}>{opp.action}</Text>
          </View>
        </View>
      ))}

      {data.utilizationRate < 70 && (
        <View style={styles.contextBox} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <IconLightbulb size={10} color={colors.amber} />
            <Text style={[styles.sectionBoxTitle, { color: colors.amber, marginLeft: 4, marginBottom: 0 }]}>EARLY STAGE CONTEXT</Text>
          </View>
          <Text style={{ fontSize: 6, lineHeight: 1.3, marginBottom: 4 }}>
            At {data.utilizationRate}% utilization and {data.monthsOnAbridge} months in, you're still in early deployment. Here's the path forward:
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <ProgressIndicator current={data.utilizationRate} target={70} label="To 70%" showLabels={false} />
              <Text style={{ fontSize: 5, color: colors.mediumGray, textAlign: "center" }}>+{Math.round((70 / data.utilizationRate - 1) * 100)}% value</Text>
            </View>
            <View style={{ flex: 1 }}>
              <ProgressIndicator current={data.utilizationRate} target={80} label="To 80%" showLabels={false} />
              <Text style={{ fontSize: 5, color: colors.mediumGray, textAlign: "center" }}>+{Math.round((80 / data.utilizationRate - 1) * 100)}% value</Text>
            </View>
            <View style={{ flex: 1 }}>
              <ProgressIndicator current={data.utilizationRate} target={85} label="To 85%" showLabels={false} />
              <Text style={{ fontSize: 5, color: colors.mediumGray, textAlign: "center" }}>Maximum</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.bottomLineBox} wrap={false}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <IconChart size={10} color={colors.primary} />
          <Text style={[styles.sectionBoxTitle, { marginLeft: 4, marginBottom: 0 }]}>THE BIGGER PICTURE</Text>
        </View>
        <Text style={{ fontSize: 7, lineHeight: 1.4, color: colors.darkGray }}>
          {data.utilizationRate < 70 
            ? `Here's what's worth noting: at ${data.utilizationRate}% utilization, you're seeing ${formatCurrency(data.tier1Value)} annually with significant runway remaining. The value you're capturing today is real—and it's just a fraction of what's possible as adoption deepens.`
            : `At ${data.utilizationRate}% utilization, you've moved past the early adoption phase into optimization. The focus shifts from "does this work?" to "how do we maximize it?"—protecting these gains while extending to new areas.`
          }
        </Text>
      </View>

      <KeyTakeaway 
        text={`We've identified ${data.optimizationOpportunities.length} optimization areas worth exploring. Start with whichever feels most actionable—even partial progress on any of these moves the needle meaningfully.`}
      />

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
  const valuePerProviderAtScale = expansion.targetProviders > 0 ? expansion.projectedValue / expansion.targetProviders : 0;

  return (
    <Page size="A4" style={styles.page}>
      <Header title="Expansion Opportunity" />

      <SectionTitle icon="expand" title="The Path to Full Scale" />

      <ExecutiveCallout 
        title="The Expansion Story" 
        text={`You've established proof of concept. The question now is: how does this scale? The math suggests each additional provider at target utilization adds roughly ${formatCurrency(valuePerProviderAtScale)} annually.`}
      />

      <View style={styles.heroRow} wrap={false}>
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

      <SectionTitle icon="chart" title="Scaling Math" />

      <View style={styles.card} wrap={false}>
        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Current annual value</Text>
            <Text style={styles.rowValue}>{formatCurrency(expansion.currentValue)}</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.rowLabel}>× Provider scale ({expansion.currentProviders} → {expansion.targetProviders})</Text>
            </View>
            <Text style={styles.rowValueNeutral}>{providerMultiplier.toFixed(1)}x</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>× Utilization improvement ({expansion.currentUtilization}% → {expansion.targetUtilization}%)</Text>
            <Text style={styles.rowValueNeutral}>{utilizationMultiplier.toFixed(2)}x</Text>
          </View>
          <View style={[styles.row, styles.rowLast, { backgroundColor: colors.greenLight, margin: -6, marginTop: 6, padding: 6 }]}>
            <Text style={[styles.rowLabel, { fontWeight: "bold" }]}>Projected annual value at scale</Text>
            <Text style={[styles.rowValue, { fontSize: 10 }]}>{formatCurrency(expansion.projectedValue)}</Text>
          </View>
        </View>
      </View>

      <SectionTitle icon="target" title="Current vs. Projected" />

      <View style={styles.twoColumn} wrap={false}>
        <View style={styles.column}>
          <View style={styles.sectionBox}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mediumGray, marginRight: 4 }} />
              <Text style={styles.sectionBoxTitle}>Current State</Text>
            </View>
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
        <View style={{ alignItems: "center", justifyContent: "center", width: 30 }}>
          <ArrowRight size={20} color={colors.green} />
        </View>
        <View style={styles.column}>
          <View style={[styles.sectionBox, { borderColor: colors.green, borderWidth: 2, backgroundColor: colors.greenLight }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginRight: 4 }} />
              <Text style={[styles.sectionBoxTitle, { color: colors.green }]}>Full Scale Target</Text>
            </View>
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

      <View style={styles.closingBox} wrap={false}>
        <Text style={styles.closingText}>
          Think of your current deployment as a pilot that's already delivering. The patterns you're seeing at {expansion.currentProviders} providers translate predictably as you scale—this isn't a leap of faith, it's an extension of demonstrated results.
        </Text>
      </View>

      <KeyTakeaway 
        text={`The model works in your environment. The expansion opportunity is about replicating what's already proven—methodically extending to new providers while deepening adoption with existing ones.`}
      />

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

      <SectionTitle icon="book" title="How We Calculated Your Value" />

      <View style={styles.narrativeBox} wrap={false}>
        <Text style={styles.narrativeText}>
          Every calculation here traces back to either your data or industry-standard benchmarks. We lean conservative throughout—no optimistic assumptions. The methodology is transparent so you can validate the logic yourself.
        </Text>
      </View>

      <View style={styles.twoColumn} wrap={false}>
        <View style={styles.column}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Your Inputs</Text>
            <Text style={styles.methodologyItem}>• {data.providers} providers</Text>
            <Text style={styles.methodologyItem}>• {formatNumber(data.encounters)} annual encounters</Text>
            <Text style={styles.methodologyItem}>• {data.utilizationRate}% utilization rate</Text>
            <Text style={styles.methodologyItem}>• {data.monthsOnAbridge} months on Abridge</Text>
            <Text style={styles.methodologyItem}>• {formatNumber(data.documentedEncounters)} documented encounters</Text>
          </View>
        </View>
        <View style={styles.column}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionBoxTitle}>Value Attribution</Text>
            <Text style={styles.methodologyItem}>• wRVU: $33/wRVU (Medicare), 50% attribution</Text>
            <Text style={styles.methodologyItem}>• Time: $150/hr provider value</Text>
            <Text style={styles.methodologyItem}>• Retention: $500K per departure</Text>
            <Text style={styles.methodologyItem}>• Commercial payers: 30-50% higher</Text>
          </View>
        </View>
      </View>

      <SectionTitle icon="chart" title="Benchmark Ranges" />

      <View style={styles.twoColumn} wrap={false}>
        <View style={styles.column}>
          <View style={[styles.sectionBox, { backgroundColor: colors.blueLight }]}>
            <Text style={[styles.sectionBoxTitle, { color: colors.blueDark }]}>Typical Abridge Results</Text>
            <View style={styles.statusRow}>
              <StatusDot status="good" />
              <Text style={styles.methodologyItem}>wRVU lift: 3-7%</Text>
            </View>
            <View style={styles.statusRow}>
              <StatusDot status="good" />
              <Text style={styles.methodologyItem}>Time reduction: 3-5 min/enc</Text>
            </View>
            <View style={styles.statusRow}>
              <StatusDot status="good" />
              <Text style={styles.methodologyItem}>Chart closure: +5-15 pp</Text>
            </View>
          </View>
        </View>
        <View style={styles.column}>
          <View style={[styles.sectionBox, { backgroundColor: colors.greenLight }]}>
            <Text style={[styles.sectionBoxTitle, { color: colors.greenDark }]}>Quality of Life</Text>
            <View style={styles.statusRow}>
              <StatusDot status="good" />
              <Text style={styles.methodologyItem}>Pajama time: -2-5 hrs/wk</Text>
            </View>
            <View style={styles.statusRow}>
              <StatusDot status="good" />
              <Text style={styles.methodologyItem}>Satisfaction: +10-20 pts</Text>
            </View>
            <View style={styles.statusRow}>
              <StatusDot status="warning" />
              <Text style={styles.methodologyItem}>Burnout: varies by org</Text>
            </View>
          </View>
        </View>
      </View>

      <SectionTitle icon="lightbulb" title="What We Don't Include" />

      <View style={styles.card} wrap={false}>
        <View style={styles.cardContent}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodologyItem}>• Downstream revenue from patient experience</Text>
              <Text style={styles.methodologyItem}>• Quality measure incentives (MIPS, HEDIS)</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodologyItem}>• Reduced compliance/audit risk</Text>
              <Text style={styles.methodologyItem}>• Training time reduction & career satisfaction</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.closingBox} wrap={false}>
        <Text style={styles.closingText}>
          Have questions about any calculation? We're happy to walk through the details—every number here is designed to be defensible in a CFO conversation.
        </Text>
      </View>

      <KeyTakeaway 
        text={`Conservative by design: with commercial payer rates and full attribution, actual value is typically 30-50% higher than shown here.`}
      />

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
