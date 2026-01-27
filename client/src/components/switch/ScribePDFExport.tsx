import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Rect,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { SCRIBE_ASSUMPTIONS } from "@/lib/scribeGapCalculator";

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF7F5",
  primaryDark: "#C42400",
  primaryBorder: "#FECDC4",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  borderGray: "#E5E7EB",
  backgroundGray: "#F9FAFB",
  white: "#FFFFFF",
  emerald: "#059669",
  emeraldLight: "#ECFDF5",
  emeraldBorder: "#A7F3D0",
  amber: "#D97706",
  amberLight: "#FFFBEB",
  amberBorder: "#FDE68A",
  slate800: "#1e293b",
  slate900: "#0f172a",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
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
    marginTop: 2,
  },
  
  // Page titles
  pageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 10,
    color: colors.mediumGray,
    marginBottom: 20,
  },
  
  // Section titles
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginBottom: 10,
  },
  
  // Scaling bars
  scalingBarContainer: {
    marginBottom: 20,
  },
  scalingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  scalingLabel: {
    width: 45,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    paddingRight: 10,
  },
  scalingBarOuter: {
    flex: 1,
    height: 24,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    position: "relative",
  },
  scalingCostLabel: {
    width: 60,
    textAlign: "right",
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    paddingLeft: 10,
  },
  scalingTag: {
    width: 50,
    fontSize: 8,
    color: colors.emerald,
    fontWeight: "bold",
  },
  scalingTagAlert: {
    width: 50,
    fontSize: 8,
    color: colors.primary,
    fontWeight: "bold",
  },
  
  // Alert box
  alertBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  alertText: {
    fontSize: 9,
    color: colors.black,
    lineHeight: 1.5,
  },
  alertBold: {
    fontWeight: "bold",
  },
  
  // Hidden costs grid
  hiddenCostGrid: {
    flexDirection: "row",
    marginBottom: 16,
  },
  hiddenCostCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 12,
    marginRight: 10,
  },
  hiddenCostCardLast: {
    marginRight: 0,
  },
  hiddenCostIcon: {
    fontSize: 16,
    marginBottom: 6,
  },
  hiddenCostTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  hiddenCostSubtitle: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 8,
  },
  hiddenCostValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  hiddenCostDesc: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
  },
  
  // True cost box
  trueCostBox: {
    backgroundColor: colors.slate800,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trueCostLeft: {},
  trueCostLabel: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trueCostValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.white,
  },
  trueCostBreakdown: {
    fontSize: 8,
    color: colors.lightGray,
    marginTop: 4,
  },
  trueCostRight: {
    textAlign: "right",
  },
  trueCostPerProvider: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
  },
  
  // Question box
  questionBox: {
    backgroundColor: colors.slate900,
    borderRadius: 8,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 10,
  },
  questionText: {
    fontSize: 9,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.5,
    maxWidth: 400,
  },
  
  // Summary grid
  summaryGrid: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  summaryCardLast: {
    marginRight: 0,
  },
  summaryCardAlert: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  summaryValueAlert: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  
  // Bottom line
  bottomLine: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  bottomLineText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  bottomLineBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  
  // Methodology
  methodologySection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 12,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 16,
  },
  methodologyColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  methodologyItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
  
  // Takeaways
  takeawaysBox: {
    marginBottom: 16,
  },
  takeawaysTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
  },
  takeawayItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 4,
    paddingLeft: 12,
  },
  
  // CTA box
  ctaBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primaryDark,
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 9,
    color: colors.darkGray,
    textAlign: "center",
    lineHeight: 1.5,
  },
  
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 16,
  },
});

interface ScribePDFData {
  inputs: ScribeInputs;
  calculations: ScribeCalculations;
  clientName?: string;
  preparedBy?: string;
}

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const ScalingBar = ({ percent, color }: { percent: number; color: string }) => {
  const width = 380;
  const barWidth = Math.max((percent / 100) * width, 4);
  
  return (
    <Svg width={width} height={24}>
      <Rect x={0} y={0} width={width} height={24} fill={colors.backgroundGray} rx={4} />
      <Rect x={0} y={0} width={barWidth} height={24} fill={color} rx={4} />
    </Svg>
  );
};

const ScribePDFDocument = ({ inputs, calculations, clientName, preparedBy }: ScribePDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayClientName = clientName || "Your Organization";
  const displayPreparedBy = preparedBy || "Abridge";

  // Hidden costs calculations
  const turnoverRate = 0.40;
  const trainingCostPerScribe = 5000;
  const annualTurnoverCost = Math.round(inputs.scribeCount * turnoverRate * trainingCostPerScribe);
  const managementOverhead = Math.round(calculations.totalScribeCost * 0.15);
  const totalHiddenCosts = annualTurnoverCost + managementOverhead;
  const trueTotalCost = calculations.totalScribeCost + totalHiddenCosts;
  const trueCostPerProvider = Math.round(trueTotalCost / inputs.providersWithScribes);

  const cost50 = Math.round(calculations.fullScribeCost * 0.5);

  return (
    <Document>
      {/* PAGE 1: THE SCALING REALITY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{displayClientName}</Text>
            <Text style={styles.headerDate}>Prepared by {displayPreparedBy} · {today}</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>The Problem With Scaling Scribes</Text>
        <Text style={styles.pageSubtitle}>
          You're spending {formatCurrency(calculations.totalScribeCost)}/year to cover {calculations.coveragePercent}% of your providers. Here's why that math never gets better.
        </Text>

        <Text style={styles.sectionTitle}>Scribe programs scale linearly</Text>
        <Text style={styles.sectionSubtitle}>Double the coverage = double the cost. There are no economies of scale.</Text>

        <View style={styles.scalingBarContainer}>
          {/* Current coverage */}
          <View style={styles.scalingRow}>
            <Text style={styles.scalingLabel}>{calculations.coveragePercent}%</Text>
            <View style={styles.scalingBarOuter}>
              <ScalingBar percent={calculations.coveragePercent} color={colors.emerald} />
            </View>
            <Text style={styles.scalingCostLabel}>{formatCurrency(calculations.totalScribeCost)}</Text>
            <Text style={styles.scalingTag}>Today</Text>
          </View>
          
          {/* 50% coverage */}
          <View style={styles.scalingRow}>
            <Text style={styles.scalingLabel}>50%</Text>
            <View style={styles.scalingBarOuter}>
              <ScalingBar percent={50} color={colors.mediumGray} />
            </View>
            <Text style={styles.scalingCostLabel}>{formatCurrency(cost50)}</Text>
            <Text style={styles.scalingTag}></Text>
          </View>
          
          {/* 100% coverage */}
          <View style={styles.scalingRow}>
            <Text style={styles.scalingLabel}>100%</Text>
            <View style={styles.scalingBarOuter}>
              <ScalingBar percent={100} color={colors.darkGray} />
            </View>
            <Text style={styles.scalingCostLabel}>{formatCurrency(calculations.fullScribeCost)}</Text>
            <Text style={styles.scalingTagAlert}>Full</Text>
          </View>
        </View>

        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            To cover all <Text style={styles.alertBold}>{inputs.totalProviders} providers</Text>, you'd need <Text style={styles.alertBold}>{calculations.scribesNeededForFullCoverage} scribes</Text> at a cost of <Text style={styles.alertBold}>{formatCurrency(calculations.fullScribeCost)}/year</Text>—an additional <Text style={styles.alertBold}>{formatCurrency(calculations.costToScale)}</Text>.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>The costs you're not seeing</Text>
        <Text style={styles.sectionSubtitle}>Beyond salaries, scribe programs carry hidden operational costs</Text>

        <View style={styles.hiddenCostGrid}>
          <View style={styles.hiddenCostCard}>
            <Text style={styles.hiddenCostTitle}>Turnover & Training</Text>
            <Text style={styles.hiddenCostSubtitle}>~40% annual turnover rate</Text>
            <Text style={styles.hiddenCostValue}>{formatCurrency(annualTurnoverCost)}</Text>
            <Text style={styles.hiddenCostDesc}>
              You'll replace ~{Math.round(inputs.scribeCount * turnoverRate)} scribes this year at ~$5K each in training costs
            </Text>
          </View>
          <View style={[styles.hiddenCostCard, styles.hiddenCostCardLast]}>
            <Text style={styles.hiddenCostTitle}>Management Overhead</Text>
            <Text style={styles.hiddenCostSubtitle}>~15% of program cost</Text>
            <Text style={styles.hiddenCostValue}>{formatCurrency(managementOverhead)}</Text>
            <Text style={styles.hiddenCostDesc}>
              Scheduling, supervision, quality assurance, and administrative support
            </Text>
          </View>
        </View>

        <View style={styles.trueCostBox}>
          <View style={styles.trueCostLeft}>
            <Text style={styles.trueCostLabel}>Your true annual cost</Text>
            <Text style={styles.trueCostValue}>{formatCurrency(trueTotalCost)}</Text>
            <Text style={styles.trueCostBreakdown}>
              {formatCurrency(calculations.totalScribeCost)} salaries + {formatCurrency(totalHiddenCosts)} hidden costs
            </Text>
          </View>
          <View style={styles.trueCostRight}>
            <Text style={styles.trueCostLabel}>Per covered provider</Text>
            <Text style={styles.trueCostPerProvider}>{formatCurrency(trueCostPerProvider)}/year</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1 of 2</Text>
        </View>
      </Page>

      {/* PAGE 2: THE QUESTION + SUMMARY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
          </View>
        </View>

        <View style={styles.questionBox}>
          <Text style={styles.questionTitle}>
            What if documentation support didn't scale this way?
          </Text>
          <Text style={styles.questionText}>
            AI-powered ambient documentation can support every provider without the linear cost curve. No turnover. No training. No coverage gaps.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Your Scribe Program Summary</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Annual Investment</Text>
            <Text style={styles.summaryValue}>{formatCurrency(calculations.totalScribeCost)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Coverage</Text>
            <Text style={styles.summaryValue}>{calculations.coveragePercent}%</Text>
          </View>
          <View style={styles.summaryCardAlert}>
            <Text style={styles.summaryLabel}>Hidden Costs</Text>
            <Text style={styles.summaryValueAlert}>+{formatCurrency(totalHiddenCosts)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardLast]}>
            <Text style={styles.summaryLabel}>Cost to Scale</Text>
            <Text style={styles.summaryValue}>{formatCurrency(calculations.costToScale)}</Text>
          </View>
        </View>

        <View style={styles.bottomLine}>
          <Text style={styles.bottomLineText}>
            <Text style={styles.bottomLineBold}>Bottom line: </Text>
            Your scribe program costs <Text style={styles.bottomLineBold}>{formatCurrency(trueCostPerProvider)}/provider/year</Text> when you include hidden costs. Scaling to 100% coverage would require an additional <Text style={styles.bottomLineBold}>{formatCurrency(calculations.costToScale)}/year</Text>.
          </Text>
        </View>

        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
          <Text style={styles.takeawayItem}>
            • Your scribe investment covers {calculations.coveragePercent}% of providers at {formatCurrency(trueCostPerProvider)} per covered provider (including hidden costs)
          </Text>
          <Text style={styles.takeawayItem}>
            • {calculations.providersWithoutSupport} providers ({100 - calculations.coveragePercent}%) document without support—{calculations.unsupportedDocTimeHours.toLocaleString()} hours annually
          </Text>
          <Text style={styles.takeawayItem}>
            • Hidden costs (turnover, training, management) add ~{Math.round((totalHiddenCosts / calculations.totalScribeCost) * 100)}% to your visible program cost
          </Text>
          <Text style={styles.takeawayItem}>
            • Scaling to full coverage would require {formatCurrency(calculations.costToScale)} additional—a {Math.round(calculations.fullScribeCost / calculations.totalScribeCost)}x increase
          </Text>
          <Text style={styles.takeawayItem}>
            • Linear scaling means no efficiency gains at scale—each new provider costs the same as the first
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Ready to explore alternatives?</Text>
          <Text style={styles.ctaText}>
            AI-powered ambient documentation can provide 100% coverage without the linear cost curve. Visit abridge.com to learn how.
          </Text>
        </View>

        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>Methodology & Assumptions</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>• {inputs.scribeCount} scribes at ${inputs.scribeCostPerHour}/hr × {inputs.scribeHoursPerWeek} hrs/week</Text>
              <Text style={styles.methodologyItem}>• {inputs.providersWithScribes} of {inputs.totalProviders} providers covered</Text>
              <Text style={styles.methodologyItem}>• {inputs.annualEncounters.toLocaleString()} annual encounters</Text>
              <Text style={styles.methodologyItem}>• Scribe:Provider ratio 1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Industry Assumptions</Text>
              <Text style={styles.methodologyItem}>• ~40% annual scribe turnover rate</Text>
              <Text style={styles.methodologyItem}>• ~$5,000 training cost per new scribe</Text>
              <Text style={styles.methodologyItem}>• ~15% management overhead</Text>
              <Text style={styles.methodologyItem}>• Doc time without scribe: {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateScribePDF = async (
  inputs: ScribeInputs,
  calculations: ScribeCalculations,
  clientName?: string,
  preparedBy?: string
): Promise<void> => {
  const blob = await pdf(
    <ScribePDFDocument inputs={inputs} calculations={calculations} clientName={clientName} preparedBy={preparedBy} />
  ).toBlob();
  saveAs(blob, `scribe-program-analysis-${new Date().toISOString().split("T")[0]}.pdf`);
};

export default ScribePDFDocument;
