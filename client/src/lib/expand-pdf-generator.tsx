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
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// TYPES
// ============================================================================

export interface ExpandMetricData {
  id: string;
  name: string;
  before: number;
  after: number;
  change: number;
  changePercent: number;
  unit: string;
  isPositiveGood: boolean;
  value?: number;
  formula?: string;
}

export interface TierData {
  name: string;
  items: {
    label: string;
    value: number | string;
    formula?: string;
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
  investmentPerProvider: number;
  projectedROI: number;
  expansionValue: number;
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
  tier2Items: { label: string; value: string }[];
  tier3Items: { label: string; value: string }[];
  
  investment: number;
  roi: number;
  
  metrics: ExpandMetricData[];
  
  expansion: ExpansionData;
  
  valueConfig: {
    timeConversionMethod: string;
    conversionPercent?: number;
    retentionEnabled: boolean;
  };
  
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
// STYLES - Dense, professional, McKinsey-inspired
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
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },

  orgContext: {
    marginBottom: 14,
  },
  orgName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  orgDetails: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 14,
  },
  sectionTitlePrimary: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 14,
  },

  narrativeBox: {
    backgroundColor: colors.paleGray,
    padding: 14,
    borderRadius: 4,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  narrativeTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  narrativeText: {
    fontSize: 8.5,
    color: colors.darkGray,
    lineHeight: 1.55,
    marginBottom: 6,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  narrativeHighlight: {
    fontWeight: "bold",
    color: colors.green,
  },

  heroRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  heroBox: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  heroBoxHighlight: {
    flex: 1,
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  heroBoxLast: {
    marginRight: 0,
  },
  heroValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  heroValueGreen: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.green,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  heroSublabel: {
    fontSize: 6,
    color: colors.lightGray,
    marginTop: 2,
    textAlign: "center",
  },

  tierCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    marginBottom: 12,
    overflow: "hidden",
  },
  tierHeader: {
    backgroundColor: colors.paleGray,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  tierHeaderGreen: {
    backgroundColor: colors.greenLight,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.green,
  },
  tierTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  tierSubtitle: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  tierValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  tierContent: {
    padding: 10,
  },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  tierRowLast: {
    borderBottomWidth: 0,
  },
  tierRowLabel: {
    flex: 1,
    fontSize: 8,
    color: colors.darkGray,
  },
  tierRowFormula: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 2,
    fontFamily: "Courier",
  },
  tierRowValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "right",
  },
  tierRowValueNeutral: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "right",
  },

  metricCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    marginBottom: 10,
    overflow: "hidden",
  },
  metricHeader: {
    backgroundColor: colors.paleGray,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  metricName: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  metricContent: {
    padding: 10,
  },

  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  comparisonBox: {
    alignItems: "center",
    width: 80,
  },
  comparisonLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonUnit: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },
  comparisonArrow: {
    fontSize: 14,
    color: colors.mediumGray,
    marginHorizontal: 12,
  },
  comparisonChange: {
    alignItems: "center",
    backgroundColor: colors.greenLight,
    borderRadius: 6,
    padding: 8,
    minWidth: 80,
  },
  comparisonChangeValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  comparisonChangePercent: {
    fontSize: 7,
    color: colors.greenDark,
    marginTop: 2,
  },

  twoColumn: {
    flexDirection: "row",
    marginBottom: 12,
  },
  column: {
    flex: 1,
    marginRight: 8,
  },
  columnLast: {
    flex: 1,
    marginRight: 0,
  },

  expansionCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 12,
  },
  expansionCardHighlight: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 6,
    padding: 12,
  },
  expansionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  expansionTitlePrimary: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  expansionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  expansionLabel: {
    fontSize: 8,
    color: colors.darkGray,
  },
  expansionValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  expansionValueGreen: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.green,
  },

  projectionBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
  },
  projectionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  projectionItem: {
    alignItems: "center",
  },
  projectionValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
  },
  projectionLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.greenDark,
    textTransform: "uppercase",
    marginTop: 2,
  },

  infoBox: {
    backgroundColor: colors.blueLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
    padding: 8,
    marginTop: 6,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 7,
    color: colors.blueDark,
    lineHeight: 1.4,
  },

  warningBox: {
    backgroundColor: colors.amberLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    padding: 8,
    marginTop: 6,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 7,
    color: colors.amberDark,
    lineHeight: 1.4,
  },

  methodologyGrid: {
    flexDirection: "row",
    marginBottom: 12,
  },
  methodologyColumn: {
    flex: 1,
    marginRight: 10,
  },
  methodologyColumnLast: {
    flex: 1,
    marginRight: 0,
  },
  methodologyTitle: {
    fontSize: 8,
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
    padding: 14,
    borderRadius: 4,
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  closingText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  journeyChart: {
    backgroundColor: colors.paleGray,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    minHeight: 100,
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
// PAGE 1: VALUE REALIZATION SUMMARY
// ============================================================================

const ResultsSummaryPage = ({ 
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
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>Value Realization Report</Text>
          <Text style={styles.headerSubtitle}>{getToday()}</Text>
        </View>
      </View>

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
          <Text style={styles.narrativeBold}>{data.monthsOnAbridge} months ago</Text>, you deployed Abridge to {data.providers} providers. Since then, those providers have documented <Text style={styles.narrativeBold}>{formatNumber(data.documentedEncounters)} encounters</Text>—each one a data point in understanding whether this investment is working.
        </Text>
        <Text style={styles.narrativeText}>
          This report answers three questions:
        </Text>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>1.</Text> What value have you actually captured? (not projected—measured)
        </Text>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>2.</Text> How do your results compare to what we typically see?
        </Text>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>3.</Text> What would full-scale expansion look like based on your proven results?
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 4, marginBottom: 0 }]}>
          The numbers that follow are yours. We've applied conservative attribution and flagged anything that looks unusual.
        </Text>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroBox}>
          <Text style={styles.heroValueGreen}>{formatCurrency(data.tier1Value)}</Text>
          <Text style={styles.heroLabel}>PROVEN VALUE</Text>
          <Text style={styles.heroSublabel}>Hard $ captured</Text>
        </View>
        <View style={styles.heroBoxHighlight}>
          <Text style={styles.heroValue}>{data.roi.toFixed(1)}x</Text>
          <Text style={styles.heroLabel}>ROI</Text>
          <Text style={styles.heroSublabel}>{formatCurrency(data.investment)}/yr invested</Text>
        </View>
        <View style={[styles.heroBox, styles.heroBoxLast]}>
          <Text style={styles.heroValueGreen}>+{formatCurrency(data.expansion.expansionValue)}</Text>
          <Text style={styles.heroLabel}>EXPANSION POTENTIAL</Text>
          <Text style={styles.heroSublabel}>At {data.expansion.targetProviders} providers</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>YOUR VALUE JOURNEY</Text>
      
      <View style={styles.journeyChart}>
        <View style={{ position: "relative", width: "100%", minHeight: 70 }}>
          <Svg width="100%" height="70" viewBox="0 0 400 70">
            <Line x1="0" y1="60" x2="400" y2="60" stroke={colors.borderGray} strokeWidth="1" />
            <Path
              d="M 20 55 Q 100 50 200 35 T 380 10"
              fill="none"
              stroke={colors.green}
              strokeWidth="2"
            />
            <Circle cx="20" cy="55" r="5" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
            <Circle cx="200" cy="35" r="4" fill={colors.blue} stroke={colors.white} strokeWidth="1.5" />
            <Circle cx="380" cy="10" r="5" fill={colors.green} stroke={colors.white} strokeWidth="2" />
          </Svg>
          
          <Text style={{ position: "absolute", bottom: 0, left: 10, fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Before</Text>
          <Text style={{ position: "absolute", top: 28, left: 190, fontSize: 6, color: colors.blue, fontWeight: "bold" }}>Today</Text>
          <Text style={{ position: "absolute", top: 0, right: 0, fontSize: 7, color: colors.green, fontWeight: "bold" }}>Full Scale</Text>
        </View>
        
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 7, color: colors.mediumGray }}>Baseline</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.green }}>{formatCurrency(data.tier1Value)}</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{data.providers} providers</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.green }}>{formatCurrency(data.expansion.projectedValue)}</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{data.expansion.targetProviders} providers</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>VALUE BREAKDOWN</Text>

      <View style={styles.tierCard}>
        <View style={styles.tierHeaderGreen}>
          <View>
            <Text style={styles.tierTitle}>Tier 1: Hard Value</Text>
            <Text style={styles.tierSubtitle}>Directly measurable financial impact</Text>
          </View>
          <Text style={styles.tierValue}>{formatCurrency(data.tier1Value)}</Text>
        </View>
        <View style={styles.tierContent}>
          {data.metrics.filter(m => m.value && m.value > 0).map((metric, idx, arr) => (
            <View key={metric.id} style={[styles.tierRow, idx === arr.length - 1 ? styles.tierRowLast : {}]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierRowLabel}>{metric.name}</Text>
                {metric.formula && (
                  <Text style={styles.tierRowFormula}>{metric.formula}</Text>
                )}
              </View>
              <Text style={styles.tierRowValue}>{formatCurrency(metric.value!)}</Text>
            </View>
          ))}
        </View>
      </View>

      {data.tier2Items.length > 0 && (
        <View style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierTitle}>Tier 2: Efficiency Gains</Text>
              <Text style={styles.tierSubtitle}>Measured improvements, not yet dollarized</Text>
            </View>
          </View>
          <View style={styles.tierContent}>
            {data.tier2Items.map((item, idx) => (
              <View key={idx} style={[styles.tierRow, idx === data.tier2Items.length - 1 ? styles.tierRowLast : {}]}>
                <Text style={styles.tierRowLabel}>{item.label}</Text>
                <Text style={styles.tierRowValueNeutral}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {data.tier3Items.length > 0 && (
        <View style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierTitle}>Tier 3: Leading Indicators</Text>
              <Text style={styles.tierSubtitle}>Early signals of future value</Text>
            </View>
          </View>
          <View style={styles.tierContent}>
            {data.tier3Items.map((item, idx) => (
              <View key={idx} style={[styles.tierRow, idx === data.tier3Items.length - 1 ? styles.tierRowLast : {}]}>
                <Text style={styles.tierRowLabel}>{item.label}</Text>
                <Text style={styles.tierRowValueNeutral}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// PAGE 2: EXPANSION OPPORTUNITY
// ============================================================================

const ExpansionPage = ({ 
  data, 
  pageNum, 
  totalPages 
}: { 
  data: ExpandPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  const { expansion } = data;
  const valuePerProvider = data.providers > 0 ? data.tier1Value / data.providers : 0;
  const utilizationMultiplier = expansion.currentUtilization > 0 
    ? expansion.targetUtilization / expansion.currentUtilization 
    : 1;
  const providerMultiplier = expansion.targetProviders / data.providers;
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>Value Realization Report</Text>
          <Text style={styles.headerSubtitle}>{getToday()}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black, marginBottom: 14 }}>Expansion Opportunity</Text>

      <Text style={styles.narrativeText}>
        Based on your proven results of <Text style={styles.narrativeHighlight}>{formatCurrency(data.tier1Value)}</Text> with {data.providers} providers, here's what full-scale expansion could look like.
      </Text>

      <View style={styles.projectionBox}>
        <View style={styles.projectionRow}>
          <View style={styles.projectionItem}>
            <Text style={styles.projectionValue}>{formatCurrency(expansion.projectedValue)}</Text>
            <Text style={styles.projectionLabel}>Projected Value</Text>
          </View>
          <View style={styles.projectionItem}>
            <Text style={styles.projectionValue}>{expansion.projectedROI.toFixed(1)}x</Text>
            <Text style={styles.projectionLabel}>Projected ROI</Text>
          </View>
          <View style={styles.projectionItem}>
            <Text style={styles.projectionValue}>+{formatCurrency(expansion.expansionValue)}</Text>
            <Text style={styles.projectionLabel}>Additional Value</Text>
          </View>
        </View>
      </View>

      <View style={styles.twoColumn}>
        <View style={[styles.column, styles.expansionCard]}>
          <Text style={styles.expansionTitle}>Current State</Text>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Providers</Text>
            <Text style={styles.expansionValue}>{data.providers}</Text>
          </View>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Utilization</Text>
            <Text style={styles.expansionValue}>{expansion.currentUtilization}%</Text>
          </View>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Annual Value</Text>
            <Text style={styles.expansionValueGreen}>{formatCurrency(data.tier1Value)}</Text>
          </View>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Value per Provider</Text>
            <Text style={styles.expansionValue}>{formatCurrency(valuePerProvider)}</Text>
          </View>
        </View>

        <View style={[styles.columnLast, styles.expansionCardHighlight]}>
          <Text style={styles.expansionTitlePrimary}>Expansion Target</Text>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Providers</Text>
            <Text style={styles.expansionValue}>{expansion.targetProviders}</Text>
          </View>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Utilization</Text>
            <Text style={styles.expansionValue}>{expansion.targetUtilization}%</Text>
          </View>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Projected Value</Text>
            <Text style={styles.expansionValueGreen}>{formatCurrency(expansion.projectedValue)}</Text>
          </View>
          <View style={styles.expansionRow}>
            <Text style={styles.expansionLabel}>Investment</Text>
            <Text style={styles.expansionValue}>{formatCurrency(expansion.targetProviders * expansion.investmentPerProvider * 12)}/yr</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>How We Calculate Expansion</Text>

      <View style={styles.tierCard}>
        <View style={styles.tierContent}>
          <View style={[styles.tierRow]}>
            <Text style={styles.tierRowLabel}>Base value per provider</Text>
            <Text style={styles.tierRowValueNeutral}>{formatCurrency(valuePerProvider)}</Text>
          </View>
          <View style={[styles.tierRow]}>
            <Text style={styles.tierRowLabel}>× Provider scaling ({data.providers} → {expansion.targetProviders})</Text>
            <Text style={styles.tierRowValueNeutral}>{providerMultiplier.toFixed(1)}x</Text>
          </View>
          <View style={[styles.tierRow]}>
            <Text style={styles.tierRowLabel}>× Utilization improvement ({expansion.currentUtilization}% → {expansion.targetUtilization}%)</Text>
            <Text style={styles.tierRowValueNeutral}>{utilizationMultiplier.toFixed(2)}x</Text>
          </View>
          <View style={[styles.tierRow]}>
            <Text style={styles.tierRowLabel}>× Maturity multiplier</Text>
            <Text style={styles.tierRowValueNeutral}>1.15x</Text>
          </View>
          <View style={[styles.tierRow, styles.tierRowLast, { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderGray }]}>
            <Text style={[styles.tierRowLabel, { fontWeight: "bold" }]}>Projected annual value</Text>
            <Text style={styles.tierRowValue}>{formatCurrency(expansion.projectedValue)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          <Text style={{ fontWeight: "bold" }}>Why the 1.15x maturity multiplier?</Text> Organizations at scale typically see 15% higher per-provider value due to workflow optimization, institutional knowledge, and network effects. This is a conservative estimate based on aggregate customer data.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Methodology & Assumptions</Text>

      <View style={styles.methodologyGrid}>
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Your Data</Text>
          <Text style={styles.methodologyItem}>{data.providers} providers</Text>
          <Text style={styles.methodologyItem}>{formatNumber(data.encounters)} annual encounters</Text>
          <Text style={styles.methodologyItem}>{data.utilizationRate}% utilization rate</Text>
          <Text style={styles.methodologyItem}>{data.monthsOnAbridge} months on Abridge</Text>
        </View>
        
        <View style={styles.methodologyColumn}>
          <Text style={styles.methodologyTitle}>Industry Benchmarks</Text>
          <Text style={styles.methodologyItem}>wRVU conversion: $33 (Medicare)</Text>
          <Text style={styles.methodologyItem}>Attribution factor: 50%</Text>
          <Text style={styles.methodologyItem}>Time value: $150/hr</Text>
          <Text style={styles.methodologyItem}>Max utilization: 85%</Text>
        </View>
        
        <View style={[styles.methodologyColumn, styles.methodologyColumnLast]}>
          <Text style={styles.methodologyTitle}>Calculation Principles</Text>
          <Text style={styles.methodologyItem}>Conservative estimates</Text>
          <Text style={styles.methodologyItem}>Medicare rates (not commercial)</Text>
          <Text style={styles.methodologyItem}>Transparent, auditable logic</Text>
          <Text style={styles.methodologyItem}>Based on your actual results</Text>
        </View>
      </View>

      <View style={styles.closingBox}>
        <Text style={styles.closingText}>
          "The difference between a 2x ROI and a 5x ROI usually isn't the technology. It's utilization, change management, and knowing which drivers matter most for your situation."
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// MAIN DOCUMENT COMPONENT
// ============================================================================

const ExpandROIDocument = ({ data }: { data: ExpandPDFData }) => {
  const totalPages = 2;

  return (
    <Document>
      <ResultsSummaryPage data={data} pageNum={1} totalPages={totalPages} />
      <ExpansionPage data={data} pageNum={2} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateExpandROIPDFBlob(data: ExpandPDFData): Promise<{ blob: Blob; filename: string }> {
  const blob = await pdf(<ExpandROIDocument data={data} />).toBlob();

  const today = new Date().toISOString().split("T")[0];
  const orgSlug = data.organizationName
    ? data.organizationName.replace(/\s+/g, "-").toLowerCase().substring(0, 20)
    : "";
  const filename = orgSlug
    ? `abridge-value-realization-${orgSlug}-${today}.pdf`
    : `abridge-value-realization-${today}.pdf`;

  return { blob, filename };
}

export async function generateExpandROIPDF(data: ExpandPDFData): Promise<void> {
  const { blob, filename } = await generateExpandROIPDFBlob(data);
  saveAs(blob, filename);
}

export default ExpandROIDocument;
