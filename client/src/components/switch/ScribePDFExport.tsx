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
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 8,
  },

  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  introText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  metricsGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 6,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.3,
  },

  spectrumBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  spectrumLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textAlign: "center",
    width: "20%",
  },
  spectrumLabelBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  spectrumBarContainer: {
    height: 16,
    position: "relative",
    marginBottom: 6,
  },
  spectrumExplanation: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginTop: 4,
  },

  findingsSection: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  findingsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  findingsNarrative: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  findingsSubsection: {
    marginBottom: 8,
  },
  findingsSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  findingsText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  findingsStrategic: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  findingsStrategicText: {
    fontSize: 7,
    color: colors.mediumGray,
    lineHeight: 1.5,
    fontStyle: "italic",
  },

  comparisonContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  comparisonBox: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    marginRight: 6,
  },
  comparisonBoxHighlight: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  comparisonLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  comparisonTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1,
  },
  comparisonRowLabel: {
    fontSize: 7,
    color: colors.mediumGray,
  },
  comparisonRowValue: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  comparisonTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonIncrease: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 2,
  },

  burdenContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  burdenCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    marginRight: 6,
  },
  burdenCardLast: {
    marginRight: 0,
  },
  burdenValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  burdenLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textAlign: "center",
  },

  scalingTable: {
    marginVertical: 8,
  },
  scalingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scalingCell: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  scalingCellHighlight: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginHorizontal: 2,
  },
  scalingArrow: {
    fontSize: 10,
    color: colors.lightGray,
    paddingHorizontal: 1,
  },
  scalingCoverage: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  scalingCost: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.darkGray,
    marginTop: 2,
  },
  scalingCostLarge: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 2,
  },
  scalingScribes: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },
  yourPosition: {
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
  },
  yourPositionText: {
    fontSize: 8,
    color: colors.white,
    textAlign: "center",
    fontWeight: "bold",
  },
  scalingInsight: {
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  insightText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    fontStyle: "italic",
  },

  conceptCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  conceptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conceptName: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  conceptValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
  },
  conceptDefinition: {
    fontSize: 7,
    color: colors.mediumGray,
    fontStyle: "italic",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  conceptEducation: {
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
  },
  conceptText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "bold",
  },

  gapCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapCardTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
  },
  gapCardValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardSteps: {
    padding: 6,
    backgroundColor: colors.backgroundGray,
  },
  gapStep: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 1,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },

  takeawaysBox: {
    marginBottom: 10,
  },
  takeawaysTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  takeawayItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
    paddingLeft: 8,
  },

  questionBox: {
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 9,
    color: colors.primaryDark,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 1.4,
  },

  methodologySection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 10,
  },
  methodologyColumnTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  methodologyItem: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 6,
    color: colors.lightGray,
    lineHeight: 1.4,
    marginTop: 6,
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

  twoTierSection: {
    marginTop: 10,
    marginBottom: 8,
  },
  twoTierTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  twoTierComparison: {
    flexDirection: "row",
  },
  tierCard: {
    flex: 1,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 6,
    padding: 8,
    marginRight: 6,
  },
  tierCardAlert: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#F87171",
    borderRadius: 6,
    padding: 8,
  },
  tierHeader: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  tierCount: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 6,
  },
  tierBenefits: {
    marginBottom: 6,
  },
  tierItem: {
    fontSize: 7,
    color: "#059669",
    marginBottom: 2,
  },
  tierItemAlert: {
    fontSize: 7,
    color: "#DC2626",
    marginBottom: 2,
  },
  tierCost: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 4,
    marginTop: 2,
  },

  footnote: {
    fontSize: 6,
    color: colors.lightGray,
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 1.4,
  },

  conceptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  conceptCardCompact: {
    width: "48%",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginRight: "2%",
    marginBottom: 6,
  },
  conceptNameCompact: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 2,
  },
  conceptValueCompact: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  conceptDescCompact: {
    fontSize: 6.5,
    color: colors.darkGray,
    lineHeight: 1.4,
  },
  conceptSummary: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  conceptSummaryText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
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

const formatNumber = (num: number): string => num.toLocaleString();

interface ScribeFindings {
  coverageNarrative: string;
  burdenStatement: string;
  scalingReality: string;
  strategicQuestion: string;
}

const getScribeFindings = (data: {
  coveragePercent: number;
  unsupportedProviders: number;
  totalProviders: number;
  costToScale: number;
  documentationHours: number;
  hoursPerProvider: number;
  scribeRatio: number;
}): ScribeFindings => {
  const { coveragePercent, unsupportedProviders, totalProviders, costToScale, documentationHours, hoursPerProvider, scribeRatio } = data;

  let coverageNarrative = '';
  let burdenStatement = '';
  let scalingReality = '';
  let strategicQuestion = '';

  if (coveragePercent < 15) {
    coverageNarrative = `At ${coveragePercent}% coverage, your scribe program supports a small fraction of your provider base. This creates a significant disparity: ${unsupportedProviders} providers handle documentation alone while a select few receive support.`;
    
    burdenStatement = `Your unsupported providers collectively spend ${formatNumber(documentationHours)} hours annually on documentation — that's ${hoursPerProvider} hours per provider per year, or roughly ${Math.round(hoursPerProvider/50)} hours per week.`;
    
    scalingReality = `To extend scribe coverage to all ${totalProviders} providers would require ${formatCurrency(costToScale)} in additional annual investment. At your current scribe-to-provider ratio of 1:${scribeRatio}, there's no way around this math.`;
    
    strategicQuestion = `Is it better to provide excellent support to ${coveragePercent}% of providers, or find a model that can provide meaningful support to 100%?`;
  } 
  else if (coveragePercent < 30) {
    coverageNarrative = `At ${coveragePercent}% coverage, your scribe program has grown beyond a pilot but still leaves the majority of providers unsupported. You've likely seen the value scribes provide — the question is how to extend that value without the linear cost scaling.`;
    
    const fteEquivalents = Math.round(documentationHours / 2000);
    burdenStatement = `The ${unsupportedProviders} providers without scribe support spend a combined ${formatNumber(documentationHours)} hours on documentation annually. That's ${fteEquivalents} FTE-equivalents of time.`;
    
    scalingReality = `Scaling from ${coveragePercent}% to 100% coverage with scribes would cost ${formatCurrency(costToScale)} more per year. The cost curve is a straight line with no efficiency gains at scale.`;
    
    strategicQuestion = `Continue expanding scribes incrementally (expensive), hold at current coverage (creates inequity), or explore alternative models for the unsupported majority?`;
  } 
  else if (coveragePercent < 50) {
    coverageNarrative = `At ${coveragePercent}% coverage, your scribe program is substantial but still leaves ${unsupportedProviders} providers without support. You've invested significantly — the question is whether doubling down on scribes or exploring complementary approaches makes more sense.`;
    
    burdenStatement = `Your unsupported providers still spend ${formatNumber(documentationHours)} hours annually on documentation. The burden on each individual is the same: ${hoursPerProvider} hours per year.`;
    
    scalingReality = `Completing the journey to 100% scribe coverage would require an additional ${formatCurrency(costToScale)} annually. At this investment level, the question of ROI becomes critical.`;
    
    strategicQuestion = `Would a hybrid approach work best: scribes for high-complexity providers, alternative solutions for others?`;
  } 
  else {
    coverageNarrative = `At ${coveragePercent}% coverage, your scribe program is among the more comprehensive we see. You've made a significant commitment to documentation support. The question at this stage is optimization and sustainability.`;
    
    burdenStatement = `The remaining ${unsupportedProviders} unsupported providers still spend ${formatNumber(documentationHours)} hours on documentation annually. Even at high coverage levels, there are gaps.`;
    
    scalingReality = `Reaching 100% coverage would require an additional ${formatCurrency(costToScale)} annually. The remaining gaps may be in settings or specialties where scribes are less practical.`;
    
    strategicQuestion = `How do you maintain quality and reduce turnover? How do you fill gaps where scribes don't fit? How do you prepare for evolving documentation technology?`;
  }

  return {
    coverageNarrative,
    burdenStatement,
    scalingReality,
    strategicQuestion,
  };
};

const CoverageBar = ({ coveragePercent }: { coveragePercent: number }) => {
  const barWidth = 460;
  const markerPosition = Math.max(10, (coveragePercent / 100) * barWidth);
  
  return (
    <Svg width={barWidth} height={16}>
      <Rect x={0} y={4} width={barWidth} height={8} fill={colors.primaryLight} rx={4} />
      <Rect x={0} y={4} width={markerPosition} height={8} fill={colors.primary} rx={4} />
      <Rect x={markerPosition - 1} y={0} width={3} height={16} fill={colors.primaryDark} rx={1} />
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

  const scaleMultiplier =
    calculations.totalScribeCost > 0
      ? Math.round(calculations.fullScribeCost / calculations.totalScribeCost)
      : 1;

  const fteEquivalents = Math.round(calculations.unsupportedDocTimeHours / 2000);
  const pajamaPercent = Math.round(
    (calculations.pajamaTimeHours / calculations.unsupportedDocTimeHours) * 100
  );
  const afterHoursPercent = SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100;

  const encountersPerProvider = Math.round(inputs.annualEncounters / inputs.totalProviders);
  const docTimePerProviderHours = Math.round((encountersPerProvider * SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe) / 60);
  
  const totalScribesNeeded = calculations.scribesNeededForFullCoverage;
  const fullCost = calculations.fullScribeCost;
  const costPerAdditionalProvider = inputs.scribeCount > 0 && inputs.providersWithScribes > 0
    ? Math.round(calculations.totalScribeCost / inputs.providersWithScribes)
    : 0;

  const findings = getScribeFindings({
    coveragePercent: calculations.coveragePercent,
    unsupportedProviders: calculations.providersWithoutSupport,
    totalProviders: inputs.totalProviders,
    costToScale: calculations.costToScale,
    documentationHours: calculations.unsupportedDocTimeHours,
    hoursPerProvider: calculations.docTimePerUnsupportedProvider,
    scribeRatio: calculations.scribeRatio,
  });

  return (
    <Document>
      {/* PAGE 1: THE FRAME + FINDINGS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{displayClientName}</Text>
            <Text style={styles.headerDate}>Prepared by {displayPreparedBy} · {today}</Text>
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
        </View>

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
            <Text style={styles.metricDescription}>{inputs.providersWithScribes} of {inputs.totalProviders} providers</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.costPerProviderCovered)}</Text>
            <Text style={styles.metricLabel}>Per Provider</Text>
            <Text style={styles.metricDescription}>Cost per covered provider</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{scaleMultiplier}x</Text>
            <Text style={styles.metricLabel}>To Scale</Text>
            <Text style={styles.metricDescription}>Investment for full coverage</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>THE COVERAGE SPECTRUM</Text>
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
          <Text style={{ fontSize: 8, color: colors.primary, textAlign: "center", fontWeight: "bold", marginTop: 2 }}>
            YOU: {calculations.coveragePercent}% ({inputs.providersWithScribes} providers)
          </Text>
          <Text style={styles.spectrumExplanation}>
            At {calculations.coveragePercent}% coverage, {calculations.providersWithoutSupport} of your {inputs.totalProviders} providers have no scribe documentation support.*
          </Text>
        </View>

        <View style={styles.findingsSection}>
          <Text style={styles.findingsTitle}>OUR FINDINGS</Text>
          <Text style={styles.findingsNarrative}>
            {findings.coverageNarrative}
          </Text>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>The Documentation Burden</Text>
            <Text style={styles.findingsText}>
              {findings.burdenStatement}
            </Text>
          </View>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>The Scaling Reality</Text>
            <Text style={styles.findingsText}>
              {findings.scalingReality}
            </Text>
          </View>
          <View style={styles.findingsStrategic}>
            <Text style={styles.findingsSubtitle}>Strategic Question</Text>
            <Text style={styles.findingsStrategicText}>
              {findings.strategicQuestion}
            </Text>
          </View>
        </View>

        <View style={styles.twoTierSection}>
          <Text style={styles.twoTierTitle}>THE TWO-TIER REALITY</Text>
          <View style={styles.twoTierComparison}>
            <View style={styles.tierCard}>
              <Text style={styles.tierHeader}>WITH SCRIBE</Text>
              <Text style={styles.tierCount}>{inputs.providersWithScribes} providers ({calculations.coveragePercent}%)</Text>
              <View style={styles.tierBenefits}>
                <Text style={styles.tierItem}>+ Documentation handled in real-time</Text>
                <Text style={styles.tierItem}>+ Focus remains on patient care</Text>
                <Text style={styles.tierItem}>+ Minimal after-hours documentation</Text>
                <Text style={styles.tierItem}>+ Reduced administrative burden</Text>
              </View>
              <Text style={styles.tierCost}>Cost: {formatCurrency(calculations.costPerProviderCovered)}/provider/year</Text>
            </View>
            <View style={styles.tierCardAlert}>
              <Text style={styles.tierHeader}>WITHOUT SCRIBE</Text>
              <Text style={styles.tierCount}>{calculations.providersWithoutSupport} providers ({100 - calculations.coveragePercent}%)</Text>
              <View style={styles.tierBenefits}>
                <Text style={styles.tierItemAlert}>- {formatNumber(calculations.docTimePerUnsupportedProvider)} hours/year on documentation</Text>
                <Text style={styles.tierItemAlert}>- ~{Math.round(calculations.docTimePerUnsupportedProvider / 50)} hours/week of note writing</Text>
                <Text style={styles.tierItemAlert}>- {afterHoursPercent}% occurs after clinic hours</Text>
                <Text style={styles.tierItemAlert}>- Contributing to burnout risk</Text>
              </View>
              <Text style={styles.tierCost}>Cost: Provider time + burnout</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footnote}>
          * This analysis focuses on human scribe support. Providers may have access to other documentation tools (transcription services, templates, voice recognition, etc.) not captured in this analysis.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/3</Text>
        </View>
      </Page>

      {/* PAGE 2: THE EVIDENCE + SCALING */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW SCRIBE PROGRAMS SCALE</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 6 }}>
          At your current scribe-to-provider ratio of 1:{calculations.scribeRatio}:
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
              <Text style={styles.comparisonRowLabel}>Ratio</Text>
              <Text style={styles.comparisonRowValue}>1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.comparisonTotal}>
              <Text style={styles.comparisonTotalValue}>{formatCurrency(calculations.totalScribeCost)}/yr</Text>
            </View>
          </View>
          <View style={styles.comparisonBoxHighlight}>
            <Text style={styles.comparisonLabel}>Full Coverage</Text>
            <Text style={styles.comparisonTitle}>{totalScribesNeeded} scribes → {inputs.totalProviders} providers</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Coverage</Text>
              <Text style={styles.comparisonRowValue}>100%</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Ratio</Text>
              <Text style={styles.comparisonRowValue}>1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.comparisonTotal}>
              <Text style={styles.comparisonTotalValue}>{formatCurrency(fullCost)}/yr</Text>
              <Text style={styles.comparisonIncrease}>+{formatCurrency(calculations.costToScale)} ({scaleMultiplier}x)</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>THE BURDEN ON UNSUPPORTED PROVIDERS</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 6 }}>
          Your {calculations.providersWithoutSupport} providers without scribe support:
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

        <Text style={styles.sectionTitle}>THE LINEAR SCALING PROBLEM</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 6 }}>
          What it costs to reach different coverage levels:
        </Text>

        <View style={styles.scalingTable}>
          <View style={styles.scalingRow}>
            <View style={styles.scalingCell}>
              <Text style={styles.scalingCoverage}>25%</Text>
              <Text style={styles.scalingCost}>{formatCurrency(fullCost * 0.25)}</Text>
              <Text style={styles.scalingScribes}>{Math.round(totalScribesNeeded * 0.25)} scribes</Text>
            </View>
            <Text style={styles.scalingArrow}>→</Text>
            <View style={styles.scalingCell}>
              <Text style={styles.scalingCoverage}>50%</Text>
              <Text style={styles.scalingCost}>{formatCurrency(fullCost * 0.50)}</Text>
              <Text style={styles.scalingScribes}>{Math.round(totalScribesNeeded * 0.50)} scribes</Text>
            </View>
            <Text style={styles.scalingArrow}>→</Text>
            <View style={styles.scalingCell}>
              <Text style={styles.scalingCoverage}>75%</Text>
              <Text style={styles.scalingCost}>{formatCurrency(fullCost * 0.75)}</Text>
              <Text style={styles.scalingScribes}>{Math.round(totalScribesNeeded * 0.75)} scribes</Text>
            </View>
            <Text style={styles.scalingArrow}>→</Text>
            <View style={styles.scalingCellHighlight}>
              <Text style={styles.scalingCoverage}>100%</Text>
              <Text style={styles.scalingCostLarge}>{formatCurrency(fullCost)}</Text>
              <Text style={styles.scalingScribes}>{totalScribesNeeded} scribes</Text>
            </View>
          </View>
        </View>

        <View style={styles.yourPosition}>
          <Text style={styles.yourPositionText}>
            You are currently at {calculations.coveragePercent}% coverage ({inputs.scribeCount} scribes, {formatCurrency(calculations.totalScribeCost)}/year)
          </Text>
        </View>

        <View style={styles.scalingInsight}>
          <Text style={styles.insightText}>
            Notice: Each step costs the same increment. Going from 25% to 50% costs the same as going from 75% to 100%. This is linear scaling — no efficiency at scale.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/3</Text>
        </View>
      </Page>

      {/* PAGE 3: KEY CONCEPTS + METHODOLOGY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>UNDERSTANDING THE KEY CONCEPTS</Text>

        {/* 2x2 COMPACT CONCEPT GRID */}
        <View style={styles.conceptGrid}>
          <View style={styles.conceptCardCompact}>
            <Text style={styles.conceptNameCompact}>COVERAGE</Text>
            <Text style={styles.conceptValueCompact}>{calculations.coveragePercent}%</Text>
            <Text style={styles.conceptDescCompact}>
              {calculations.providersWithoutSupport} of {inputs.totalProviders} providers handle documentation alone, creating a two-tier system.
            </Text>
          </View>
          <View style={styles.conceptCardCompact}>
            <Text style={styles.conceptNameCompact}>LINEAR SCALING</Text>
            <Text style={styles.conceptValueCompact}>1:{calculations.scribeRatio}</Text>
            <Text style={styles.conceptDescCompact}>
              Each additional provider costs {formatCurrency(costPerAdditionalProvider)}. No volume discounts at scale.
            </Text>
          </View>
          <View style={styles.conceptCardCompact}>
            <Text style={styles.conceptNameCompact}>DOCUMENTATION BURDEN</Text>
            <Text style={styles.conceptValueCompact}>{calculations.docTimePerUnsupportedProvider} hrs/yr</Text>
            <Text style={styles.conceptDescCompact}>
              ~{Math.round(calculations.docTimePerUnsupportedProvider/50)} hrs/week per provider. {afterHoursPercent}% occurs after clinic hours ("pajama time").
            </Text>
          </View>
          <View style={styles.conceptCardCompact}>
            <Text style={styles.conceptNameCompact}>HIDDEN COSTS</Text>
            <Text style={styles.conceptValueCompact}>30-50%</Text>
            <Text style={styles.conceptDescCompact}>
              Annual turnover rate. Plus training (4-8 weeks), coverage gaps, and productivity loss.
            </Text>
          </View>
        </View>

        <View style={styles.conceptSummary}>
          <Text style={styles.conceptSummaryText}>
            <Text style={styles.bold}>The core constraint: </Text>
            Scribe programs have high marginal costs — unlike technology where costs decrease with scale, each new provider costs the same. Scaling from {calculations.coveragePercent}% to 100% requires {scaleMultiplier}x your current investment.
          </Text>
        </View>

        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <View>
            <Text style={styles.takeawayItem}>• Your scribe investment covers {calculations.coveragePercent}% of providers at {formatCurrency(calculations.costPerProviderCovered)} per covered provider</Text>
            <Text style={styles.takeawayItem}>• {calculations.providersWithoutSupport} providers ({100 - calculations.coveragePercent}%) document without scribe support — {formatNumber(calculations.unsupportedDocTimeHours)} hours annually</Text>
            <Text style={styles.takeawayItem}>• Each unsupported provider spends ~{Math.round(calculations.docTimePerUnsupportedProvider / 50)} hours/week on documentation, with {afterHoursPercent}% after clinic hours</Text>
            <Text style={styles.takeawayItem}>• Scaling to full coverage would require {scaleMultiplier}x your current investment ({formatCurrency(calculations.costToScale)} additional)</Text>
            <Text style={styles.takeawayItem}>• Linear scaling means no efficiency gains at scale — each new provider costs the same as the first</Text>
          </View>
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>
              How can you extend documentation support to all {inputs.totalProviders} providers without a {scaleMultiplier}x increase in cost?
            </Text>
          </View>
        </View>

        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>METHODOLOGY & ASSUMPTIONS</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>• {inputs.scribeCount} scribes at ${inputs.scribeCostPerHour}/hr</Text>
              <Text style={styles.methodologyItem}>• {inputs.scribeHoursPerWeek} hours/week per scribe</Text>
              <Text style={styles.methodologyItem}>• {inputs.providersWithScribes} of {inputs.totalProviders} providers covered</Text>
              <Text style={styles.methodologyItem}>• {formatNumber(inputs.annualEncounters)} annual encounters</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Industry Assumptions</Text>
              <Text style={styles.methodologyItem}>• Doc time without scribe: {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter</Text>
              <Text style={styles.methodologyItem}>• After-hours documentation: ~{afterHoursPercent}% of total</Text>
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
          <Text style={styles.footerText}>Page 3/3</Text>
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
