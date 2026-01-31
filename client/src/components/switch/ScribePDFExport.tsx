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
  
  contentSection: {
    padding: 40,
    paddingTop: 28,
  },
  
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
  metricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricLabelLight: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
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
  metricValueSmall: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
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
    color: colors.primary,
    fontWeight: "bold",
  },
  
  scalingViz: {
    marginTop: 16,
    marginBottom: 16,
  },
  scalingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  scalingLabel: {
    width: 70,
    fontSize: 9,
    color: colors.mediumGray,
  },
  scalingLabelBold: {
    width: 70,
    fontSize: 9,
    color: colors.black,
    fontWeight: "bold",
  },
  scalingBarOuter: {
    flex: 1,
    height: 20,
    marginRight: 12,
  },
  scalingCost: {
    width: 60,
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "right",
  },
  
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 20,
  },
  
  acknowledgmentBox: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  acknowledgmentText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  
  footer: {
    marginTop: "auto",
    marginLeft: 40,
    marginRight: 40,
    marginBottom: 24,
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
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  contentSectionFlex: {
    padding: 40,
    paddingTop: 28,
    flex: 1,
  },
  
  page2Hero: {
    backgroundColor: colors.slate900,
    padding: 40,
    paddingBottom: 28,
    alignItems: "center",
  },
  page2HeroTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  page2HeroSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 400,
  },
  
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
  insightValueAlert: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
  },
  
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
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  summaryItemSubtext: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 2,
  },
  
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
  
  methodologyText: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.5,
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

const formatCurrencyFull = (num: number): string => {
  return `$${num.toLocaleString()}`;
};

const ScalingBar = ({ percent, color, maxWidth = 320 }: { percent: number; color: string; maxWidth?: number }) => {
  const barWidth = Math.max((percent / 100) * maxWidth, 8);
  
  return (
    <Svg width={maxWidth} height={20}>
      <Rect x={0} y={0} width={maxWidth} height={20} fill={colors.backgroundGray} rx={4} />
      <Rect x={0} y={0} width={barWidth} height={20} fill={color} rx={4} />
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

  const turnoverRate = 0.40;
  const trainingCostPerScribe = 5000;
  const annualTurnoverCost = Math.round(inputs.scribeCount * turnoverRate * trainingCostPerScribe);
  const managementOverhead = Math.round(calculations.totalScribeCost * 0.15);
  const totalHiddenCosts = annualTurnoverCost + managementOverhead;
  const trueTotalCost = calculations.totalScribeCost + totalHiddenCosts;
  const trueCostPerProvider = Math.round(trueTotalCost / inputs.providersWithScribes);
  const scaleMultiplier = Math.round(calculations.fullScribeCost / calculations.totalScribeCost);

  return (
    <Document>
      {/* PAGE 1: YOUR STORY TODAY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>{today}</Text>
            <Text style={styles.heroMetaText}>Prepared by {displayPreparedBy}</Text>
          </View>
          <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 24 }} />
          <Text style={styles.heroClientName}>{displayClientName}</Text>
          <Text style={styles.heroTagline}>
            Your scribe program represents a strategic investment in documentation support.{"\n"}
            Here's what we learned about where it stands today—and what comes next.
          </Text>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>Your Program Today</Text>
          <Text style={styles.sectionTitle}>The Investment That Got You Here</Text>
          <Text style={styles.sectionSubtitle}>
            You've built a scribe program that supports {inputs.providersWithScribes} providers. That matters.
          </Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Annual Investment</Text>
              <Text style={styles.metricValue}>{formatCurrency(calculations.totalScribeCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Providers Covered</Text>
              <Text style={styles.metricValue}>{inputs.providersWithScribes}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Coverage Rate</Text>
              <Text style={styles.metricValue}>{calculations.coveragePercent}%</Text>
            </View>
            <View style={[styles.metricCardDark, styles.metricCardLast]}>
              <Text style={styles.metricLabelLight}>True Cost/Provider</Text>
              <Text style={styles.metricValueLight}>{formatCurrency(trueCostPerProvider)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.chapterLabel}>The Challenge</Text>
          <Text style={styles.sectionTitle}>What Scaling Looks Like</Text>
          
          <Text style={styles.storyText}>
            Right now, <Text style={styles.storyTextBold}>{calculations.providersWithoutSupport} providers</Text> ({100 - calculations.coveragePercent}% of your organization) document without support. That's <Text style={styles.storyTextBold}>{calculations.unsupportedDocTimeHours.toLocaleString()} hours</Text> of documentation time annually.
          </Text>

          <Text style={styles.storyText}>
            Scribe programs scale linearly. To cover every provider, your investment would grow from <Text style={styles.storyTextBold}>{formatCurrency(calculations.totalScribeCost)}</Text> to <Text style={styles.storyTextEmphasis}>{formatCurrency(calculations.fullScribeCost)}</Text>—a <Text style={styles.storyTextBold}>{scaleMultiplier}× increase</Text>.
          </Text>

          <View style={styles.scalingViz}>
            <View style={styles.scalingRow}>
              <Text style={styles.scalingLabelBold}>Today ({calculations.coveragePercent}%)</Text>
              <View style={styles.scalingBarOuter}>
                <ScalingBar percent={calculations.coveragePercent} color={colors.emerald} />
              </View>
              <Text style={styles.scalingCost}>{formatCurrency(calculations.totalScribeCost)}</Text>
            </View>
            <View style={styles.scalingRow}>
              <Text style={styles.scalingLabel}>Full coverage</Text>
              <View style={styles.scalingBarOuter}>
                <ScalingBar percent={100} color={colors.primary} />
              </View>
              <Text style={styles.scalingCost}>{formatCurrency(calculations.fullScribeCost)}</Text>
            </View>
          </View>

          <Text style={styles.storyText}>
            And that's before hidden costs. When you factor in <Text style={styles.storyTextBold}>~40% annual turnover</Text> and <Text style={styles.storyTextBold}>management overhead</Text>, your true program cost is closer to <Text style={styles.storyTextBold}>{formatCurrency(trueTotalCost)}/year</Text>.
          </Text>

          <Text style={[styles.storyText, { fontWeight: "bold", marginTop: 8 }]}>
            The bottom line: your scribe program works—but it can only grow one way: linearly.
          </Text>

          <View style={styles.acknowledgmentBox}>
            <Text style={styles.acknowledgmentText}>
              "Scribes bring real value—they're human, they build relationships with providers, they learn institutional nuances. This isn't about replacing what works. It's about asking whether there's a better path to scale."
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Image src={abridgeLogoPath} style={{ width: 70 }} />
          <Text style={styles.footerText}>Page 1 of 2</Text>
        </View>
        </View>
      </Page>

      {/* PAGE 2: THE OPPORTUNITY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
        <View style={styles.page2Hero}>
          <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 16 }} />
          <Text style={styles.page2HeroTitle}>What If There's Another Way?</Text>
          <Text style={styles.page2HeroSubtitle}>
            Scribes may serve strategic or academic purposes at your organization.{"\n"}
            But there's also an opportunity to scale documentation support differently.
          </Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>The Math You're Facing</Text>
          <Text style={styles.sectionTitle}>Three Numbers Worth Knowing</Text>
          <Text style={styles.sectionSubtitle}>
            These are the numbers that tell the story of where your program stands—and what it would take to go further.
          </Text>

          <View style={styles.insightCard}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Providers without documentation support today</Text>
              <Text style={styles.insightValue}>{calculations.providersWithoutSupport} of {inputs.totalProviders}</Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Additional investment needed for full scribe coverage</Text>
              <Text style={styles.insightValueAlert}>+{formatCurrency(calculations.costToScale)}/year</Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Hidden costs adding to your current program</Text>
              <Text style={styles.insightValue}>+{formatCurrency(totalHiddenCosts)} ({Math.round((totalHiddenCosts / calculations.totalScribeCost) * 100)}%)</Text>
            </View>
          </View>

          <View style={styles.opportunityBox}>
            <Text style={styles.opportunityTitle}>There's Another Way</Text>
            <Text style={styles.opportunityText}>
              AI-powered ambient documentation can support every provider—without the linear cost curve. No turnover. No training gaps. No coverage limits.{"\n"}{"\n"}
              Imagine giving all {inputs.totalProviders} providers documentation support tomorrow—without hiring a single additional scribe.
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Your Summary to Share</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Current Investment</Text>
                <Text style={styles.summaryItemValue}>{formatCurrency(trueTotalCost)}</Text>
                <Text style={styles.summaryItemSubtext}>including hidden costs</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Coverage Today</Text>
                <Text style={styles.summaryItemValue}>{calculations.coveragePercent}%</Text>
                <Text style={styles.summaryItemSubtext}>{inputs.providersWithScribes} of {inputs.totalProviders} providers</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Cost to Scale</Text>
                <Text style={styles.summaryItemValue}>{scaleMultiplier}×</Text>
                <Text style={styles.summaryItemSubtext}>{formatCurrency(calculations.costToScale)} additional</Text>
              </View>
            </View>
          </View>

          <View style={styles.ctaSection}>
            <Text style={styles.ctaText}>Ready to explore how AI can scale your documentation support?</Text>
            <Text style={styles.ctaLink}>Contact your Abridge partner to learn more</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 6 }} />
            <Text style={[styles.methodologyText, { maxWidth: 400 }]}>
              Based on {inputs.scribeCount} scribes at ${inputs.scribeCostPerHour}/hr × {inputs.scribeHoursPerWeek} hrs/week. Hidden costs: ~40% turnover + 15% overhead.
            </Text>
          </View>
          <Text style={styles.footerText}>Page 2 of 2</Text>
        </View>
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
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  
  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, `scribe-program-analysis-${new Date().toISOString().split("T")[0]}.pdf`);
  }
};

export default ScribePDFDocument;
