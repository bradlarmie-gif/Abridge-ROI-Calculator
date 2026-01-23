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
  Rect,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { SCRIBE_ASSUMPTIONS } from "@/lib/scribeGapCalculator";

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  primaryBorder: "#FDCDC5",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  borderGray: "#E5E7EB",
  backgroundGray: "#F9FAFB",
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
    marginBottom: 12,
    paddingBottom: 10,
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

  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 10,
  },

  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 14,
    borderRadius: 4,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
  },
  introText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 6,
  },

  metricsGrid: {
    flexDirection: "row",
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 7,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.3,
  },

  spectrumContainer: {
    marginBottom: 12,
  },
  spectrumBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  spectrumLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textAlign: "center",
    width: "20%",
  },
  spectrumLabelBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  spectrumBarContainer: {
    height: 20,
    position: "relative",
    marginBottom: 8,
  },
  spectrumExplanation: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginTop: 8,
  },

  comparisonContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  comparisonBox: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    marginRight: 8,
  },
  comparisonBoxHighlight: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  comparisonLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  comparisonTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  comparisonRowLabel: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  comparisonRowValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  comparisonTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonIncrease: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 2,
  },

  whyMattersBox: {
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    marginTop: 6,
  },
  whyMattersTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  whyMattersText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  burdenContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  burdenCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    marginRight: 8,
  },
  burdenCardLast: {
    marginRight: 0,
  },
  burdenValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  burdenLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textAlign: "center",
  },

  graphContainer: {
    marginBottom: 8,
  },
  graphBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    height: 90,
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
    textTransform: "uppercase",
  },
  gapCardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardSteps: {
    padding: 10,
    backgroundColor: colors.backgroundGray,
  },
  gapStep: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },

  takeawaysBox: {
    marginBottom: 12,
  },
  takeawaysTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  takeawayItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 3,
    paddingLeft: 8,
  },

  questionBox: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 1.4,
  },

  methodologySection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 10,
  },
  methodologyColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
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

interface ScribePDFData {
  inputs: ScribeInputs;
  calculations: ScribeCalculations;
}

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

const CoverageBar = ({ coveragePercent }: { coveragePercent: number }) => {
  const barWidth = 460;
  const markerPosition = Math.max(10, (coveragePercent / 100) * barWidth);
  
  return (
    <Svg width={barWidth} height={20}>
      <Rect x={0} y={6} width={barWidth} height={8} fill={colors.primaryLight} rx={4} />
      <Rect x={0} y={6} width={markerPosition} height={8} fill={colors.primary} rx={4} />
      <Rect x={markerPosition - 1} y={0} width={3} height={20} fill={colors.primaryDark} rx={1} />
    </Svg>
  );
};

const ScalingGraph = ({ 
  currentCoverage, 
  currentCost, 
  fullCost 
}: { 
  currentCoverage: number; 
  currentCost: number; 
  fullCost: number;
}) => {
  const graphWidth = 440;
  const graphHeight = 65;
  const padding = 25;
  
  const xCurrent = padding + ((currentCoverage / 100) * (graphWidth - padding * 2));
  const yCurrent = graphHeight - ((currentCost / fullCost) * (graphHeight - 20));
  const xFull = graphWidth - padding;
  const yFull = 12;

  return (
    <View style={styles.graphBox}>
      <Svg width={graphWidth} height={graphHeight}>
        <Line x1={padding} y1={graphHeight - 5} x2={xFull} y2={yFull} stroke={colors.primary} strokeWidth={2} />
        
        <Circle cx={padding} cy={graphHeight - 5} r={4} fill={colors.borderGray} />
        <Circle cx={xCurrent} cy={yCurrent} r={5} fill={colors.primary} />
        <Circle cx={xFull} cy={yFull} r={4} fill={colors.primary} />
      </Svg>
      <View style={{ position: "absolute", top: 6, right: 30 }}>
        <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{formatCurrency(fullCost)}</Text>
      </View>
      <View style={{ position: "absolute", top: yCurrent - 16, left: xCurrent - 20 }}>
        <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.darkGray }}>YOU</Text>
      </View>
      <View style={{ position: "absolute", bottom: 8, left: xCurrent - 20 }}>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>{currentCoverage}%</Text>
      </View>
    </View>
  );
};

const ScribePDFDocument = ({ inputs, calculations }: ScribePDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scaleMultiplier =
    calculations.totalScribeCost > 0
      ? Math.round(calculations.fullScribeCost / calculations.totalScribeCost)
      : 1;

  const fteEquivalents = Math.round(calculations.unsupportedDocTimeHours / 2000);
  const pajamaPercent = Math.round(
    (calculations.pajamaTimeHours / calculations.unsupportedDocTimeHours) * 100
  );
  const additionalScribesNeeded =
    calculations.scribesNeededForFullCoverage - inputs.scribeCount;

  const encountersPerProvider = Math.round(inputs.annualEncounters / inputs.totalProviders);
  const docTimePerProviderHours = Math.round((encountersPerProvider * SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe) / 60);

  return (
    <Document>
      {/* PAGE 1: THE FRAME */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.introBox}>
          <Text style={styles.introTitle}>UNDERSTANDING SCRIBE PROGRAM ECONOMICS</Text>
          <Text style={styles.introText}>
            Scribe programs provide valuable documentation support, but they operate under a fundamental economic constraint: linear scaling. To cover more providers, you need proportionally more scribes — each requiring salary, benefits, training, and management overhead.
          </Text>
          <Text style={styles.introText}>
            Most organizations can only afford to provide scribes to a fraction of their providers, creating a two-tier system: some providers receive documentation support while the majority handle the full burden alone.
          </Text>
          <Text style={styles.introText}>
            This analysis examines your scribe program economics — what you're investing, who's covered, what the gap means for your unsupported providers, and what scaling would actually cost.
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>YOUR PROGRAM AT A GLANCE</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.totalScribeCost)}</Text>
            <Text style={styles.metricLabel}>Investment</Text>
            <Text style={styles.metricDescription}>Annual scribe program cost</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{calculations.coveragePercent}%</Text>
            <Text style={styles.metricLabel}>Coverage</Text>
            <Text style={styles.metricDescription}>{inputs.providersWithScribes} of {inputs.totalProviders} providers have support</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.costPerProviderCovered)}</Text>
            <Text style={styles.metricLabel}>Per Provider</Text>
            <Text style={styles.metricDescription}>Cost per covered provider annually</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{scaleMultiplier}x</Text>
            <Text style={styles.metricLabel}>To Scale</Text>
            <Text style={styles.metricDescription}>Investment multiplier for full coverage</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>THE COVERAGE SPECTRUM</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
          Your scribe program covers {calculations.coveragePercent}% of your provider base:
        </Text>

        <View style={styles.spectrumBox}>
          <View style={styles.spectrumLabels}>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>0%</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>25%</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>50%</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>75%</Text></Text>
            <Text style={styles.spectrumLabel}><Text style={styles.spectrumLabelBold}>100%</Text></Text>
          </View>
          <View style={styles.spectrumBarContainer}>
            <CoverageBar coveragePercent={calculations.coveragePercent} />
          </View>
          <Text style={{ fontSize: 8, color: colors.primary, textAlign: "center", fontWeight: "bold", marginTop: 4 }}>
            YOU: {calculations.coveragePercent}% ({inputs.providersWithScribes} providers)
          </Text>
          <Text style={styles.spectrumExplanation}>
            At {calculations.coveragePercent}% coverage, {calculations.providersWithoutSupport} of your {inputs.totalProviders} providers have no documentation support. This raises a strategic question: is partial coverage sustainable, or does the gap create problems that offset the benefits?
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/4</Text>
        </View>
      </Page>

      {/* PAGE 2: THE EVIDENCE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW SCRIBE PROGRAMS SCALE</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
          At your current scribe-to-provider ratio of 1:{calculations.scribeRatio}, here's what coverage looks like:
        </Text>

        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonBox}>
            <Text style={styles.comparisonLabel}>Current State</Text>
            <Text style={styles.comparisonTitle}>{inputs.scribeCount} scribes → {inputs.providersWithScribes} providers</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Coverage</Text>
              <Text style={styles.comparisonRowValue}>{calculations.coveragePercent}%</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Scribe-to-Provider</Text>
              <Text style={styles.comparisonRowValue}>1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.comparisonTotal}>
              <Text style={styles.comparisonTotalValue}>{formatCurrency(calculations.totalScribeCost)}/yr</Text>
            </View>
          </View>
          <View style={styles.comparisonBoxHighlight}>
            <Text style={styles.comparisonLabel}>Full Coverage</Text>
            <Text style={styles.comparisonTitle}>{calculations.scribesNeededForFullCoverage} scribes → {inputs.totalProviders} providers</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Coverage</Text>
              <Text style={styles.comparisonRowValue}>100%</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Scribe-to-Provider</Text>
              <Text style={styles.comparisonRowValue}>1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.comparisonTotal}>
              <Text style={styles.comparisonTotalValue}>{formatCurrency(calculations.fullScribeCost)}/yr</Text>
              <Text style={styles.comparisonIncrease}>+{formatCurrency(calculations.costToScale)} ({scaleMultiplier}x)</Text>
            </View>
          </View>
        </View>

        <View style={styles.whyMattersBox}>
          <Text style={styles.whyMattersTitle}>WHY IT MATTERS</Text>
          <Text style={styles.whyMattersText}>
            Every additional provider you want to cover requires a proportional increase in scribes. There are no economies of scale — just linear cost growth. This is the fundamental constraint of the scribe model.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>THE BURDEN ON UNSUPPORTED PROVIDERS</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
          Your {calculations.providersWithoutSupport} providers without scribe support spend significant time on documentation:
        </Text>

        <View style={styles.burdenContainer}>
          <View style={styles.burdenCard}>
            <Text style={styles.burdenValue}>{formatNumber(calculations.unsupportedDocTimeHours)}</Text>
            <Text style={styles.burdenLabel}>HOURS / YEAR</Text>
            <Text style={styles.burdenLabel}>Total documentation time</Text>
          </View>
          <View style={styles.burdenCard}>
            <Text style={styles.burdenValue}>{formatNumber(calculations.pajamaTimeHours)}</Text>
            <Text style={styles.burdenLabel}>HOURS / YEAR</Text>
            <Text style={styles.burdenLabel}>After-hours ("pajama time")</Text>
          </View>
          <View style={[styles.burdenCard, styles.burdenCardLast]}>
            <Text style={styles.burdenValue}>{formatNumber(calculations.docTimePerUnsupportedProvider)}</Text>
            <Text style={styles.burdenLabel}>HOURS / YEAR</Text>
            <Text style={styles.burdenLabel}>Per unsupported provider</Text>
          </View>
        </View>

        <View style={styles.whyMattersBox}>
          <Text style={styles.whyMattersTitle}>WHY IT MATTERS</Text>
          <Text style={styles.whyMattersText}>
            {formatNumber(calculations.docTimePerUnsupportedProvider)} hours per year is approximately {Math.round(calculations.docTimePerUnsupportedProvider / 50)} hours per week spent on documentation. Much of this occurs outside clinic hours, contributing to burnout, reduced satisfaction, and work-life imbalance. This represents {fteEquivalents} FTE-equivalents of documentation time across your unsupported providers.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>THE LINEAR SCALING PROBLEM</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 8 }}>
          The cost curve for scribe coverage is a straight line — no efficiencies at scale:
        </Text>

        <ScalingGraph 
          currentCoverage={calculations.coveragePercent} 
          currentCost={calculations.totalScribeCost} 
          fullCost={calculations.fullScribeCost} 
        />

        <View style={styles.graphLabels}>
          <Text style={styles.graphLabel}>0% Coverage</Text>
          <Text style={styles.graphLabel}>100% Coverage</Text>
        </View>

        <View style={[styles.whyMattersBox, { marginTop: 8 }]}>
          <Text style={styles.whyMattersTitle}>WHY IT MATTERS</Text>
          <Text style={styles.whyMattersText}>
            The cost curve is linear. There's no point where scribes become more efficient at scale — every step up in coverage costs proportionally more.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/4</Text>
        </View>
      </Page>

      {/* PAGE 3: THE MATH */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW THE NUMBERS ARE CALCULATED</Text>
        <Text style={{ fontSize: 8, color: colors.darkGray, marginBottom: 10 }}>
          Every number in this analysis can be traced back to your inputs and transparent assumptions. Here's the math:
        </Text>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>SCRIBE PROGRAM COST</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.totalScribeCost)}</Text>
          </View>
          <View style={styles.gapCardSteps}>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Calculation:</Text></Text>
            <Text style={styles.gapStep}>        {inputs.scribeCount} scribes × ${inputs.scribeCostPerHour}/hr × {inputs.scribeHoursPerWeek} hrs/week × {SCRIBE_ASSUMPTIONS.weeksPerYear} weeks</Text>
            <Text style={styles.gapStep}>        = {formatCurrency(calculations.totalScribeCost)}/year</Text>
          </View>
        </View>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>COST TO SCALE TO 100%</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(calculations.fullScribeCost)}</Text>
          </View>
          <View style={styles.gapCardSteps}>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Current scribe-to-provider ratio</Text>
            <Text style={styles.gapStep}>        {inputs.scribeCount} scribes ÷ {inputs.providersWithScribes} providers = 1:{calculations.scribeRatio}</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Scribes needed for full coverage</Text>
            <Text style={styles.gapStep}>        {inputs.totalProviders} providers ÷ {calculations.scribeRatio} = {calculations.scribesNeededForFullCoverage} scribes</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Annual cost at full scale</Text>
            <Text style={styles.gapStep}>        {calculations.scribesNeededForFullCoverage} scribes × ${inputs.scribeCostPerHour}/hr × {inputs.scribeHoursPerWeek} hrs × {SCRIBE_ASSUMPTIONS.weeksPerYear} wks = {formatCurrency(calculations.fullScribeCost)}</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> Additional investment required</Text>
            <Text style={styles.gapStep}>        {formatCurrency(calculations.fullScribeCost)} - {formatCurrency(calculations.totalScribeCost)} = {formatCurrency(calculations.costToScale)} ({scaleMultiplier}x current)</Text>
          </View>
        </View>

        <View style={styles.gapCard}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>DOCUMENTATION BURDEN</Text>
            <Text style={styles.gapCardValue}>{formatNumber(calculations.unsupportedDocTimeHours)} hrs</Text>
          </View>
          <View style={styles.gapCardSteps}>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 1:</Text> Encounters per provider</Text>
            <Text style={styles.gapStep}>        {formatNumber(inputs.annualEncounters)} encounters ÷ {inputs.totalProviders} providers = {formatNumber(encountersPerProvider)} encounters/provider</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 2:</Text> Documentation time per unsupported provider</Text>
            <Text style={styles.gapStep}>        {formatNumber(encountersPerProvider)} enc × {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min = {formatNumber(docTimePerProviderHours)} hours/year</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 3:</Text> Total for all unsupported providers</Text>
            <Text style={styles.gapStep}>        {calculations.providersWithoutSupport} providers × {formatNumber(calculations.docTimePerUnsupportedProvider)} hrs = {formatNumber(calculations.unsupportedDocTimeHours)} hours</Text>
            <Text style={styles.gapStep}><Text style={styles.gapStepLabel}>Step 4:</Text> After-hours ("pajama time")</Text>
            <Text style={styles.gapStep}>        {formatNumber(calculations.unsupportedDocTimeHours)} hrs × {SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100}% = {formatNumber(calculations.pajamaTimeHours)} hours</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 3/4</Text>
        </View>
      </Page>

      {/* PAGE 4: TAKEAWAYS + METHODOLOGY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
          </View>
        </View>

        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <Text style={styles.takeawayItem}>• Your scribe investment covers {calculations.coveragePercent}% of providers at {formatCurrency(calculations.costPerProviderCovered)} per provider</Text>
          <Text style={styles.takeawayItem}>• {calculations.providersWithoutSupport} providers ({100 - calculations.coveragePercent}%) document without support — {formatNumber(calculations.unsupportedDocTimeHours)} hours annually</Text>
          <Text style={styles.takeawayItem}>• Each unsupported provider spends ~{Math.round(calculations.docTimePerUnsupportedProvider / 50)} hours/week on documentation, with {pajamaPercent}% after-hours</Text>
          <Text style={styles.takeawayItem}>• Scaling to full coverage would require {scaleMultiplier}x your current investment ({formatCurrency(calculations.costToScale)} additional)</Text>
          <Text style={styles.takeawayItem}>• The linear cost model means no efficiency gains at scale — each new provider costs the same</Text>
        </View>

        <View style={styles.questionBox}>
          <Text style={styles.questionText}>
            How can you extend documentation support to all {inputs.totalProviders} providers without a {scaleMultiplier}x increase in cost?
          </Text>
        </View>

        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>METHODOLOGY & ASSUMPTIONS</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>• {inputs.scribeCount} scribes</Text>
              <Text style={styles.methodologyItem}>• ${inputs.scribeCostPerHour}/hour per scribe</Text>
              <Text style={styles.methodologyItem}>• {inputs.scribeHoursPerWeek} hours/week</Text>
              <Text style={styles.methodologyItem}>• {inputs.providersWithScribes} providers with scribes</Text>
              <Text style={styles.methodologyItem}>• {inputs.totalProviders} total providers</Text>
              <Text style={styles.methodologyItem}>• {formatNumber(inputs.annualEncounters)} annual encounters</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Industry Assumptions</Text>
              <Text style={styles.methodologyItem}>• Documentation time without scribe: {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter</Text>
              <Text style={styles.methodologyItem}>• After-hours documentation: ~{SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100}% of total</Text>
              <Text style={styles.methodologyItem}>• Working weeks per year: {SCRIBE_ASSUMPTIONS.weeksPerYear}</Text>
              <Text style={styles.methodologyItem}>• FTE calculation: 2,000 hrs/year</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            Assumptions based on industry research on physician documentation patterns and scribe program benchmarks. Individual results vary based on specialty mix and operational factors.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 4/4</Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateScribePDF = async (
  inputs: ScribeInputs,
  calculations: ScribeCalculations
): Promise<void> => {
  const blob = await pdf(
    <ScribePDFDocument inputs={inputs} calculations={calculations} />
  ).toBlob();
  saveAs(blob, `scribe-program-analysis-${new Date().toISOString().split("T")[0]}.pdf`);
};

export default ScribePDFDocument;
