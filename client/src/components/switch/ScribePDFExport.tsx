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
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// MCKINSEY/BLOOMBERG COLOR PALETTE (matching outpatient PDF)
// ============================================================================

const brand = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  coral: "#E85A4F",
  warmGray: "#F8F7F6",
  lightGray: "#F5F4F3",
  midGray: "#E5E4E3",
  borderGray: "#D4D4D4",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
};

// ============================================================================
// PREMIUM TYPOGRAPHY & STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: brand.textPrimary,
    backgroundColor: brand.white,
  },

  // COVER PAGE
  coverPage: {
    backgroundColor: brand.black,
    height: "100%",
    padding: 0,
  },
  coverTop: {
    padding: 48,
    paddingBottom: 0,
  },
  coverLogo: {
    width: 90,
    height: 18,
    marginBottom: 80,
  },
  coverHero: {
    paddingHorizontal: 48,
    flex: 1,
    justifyContent: "center",
  },
  coverEyebrow: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: brand.white,
    lineHeight: 1.1,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    color: brand.textTertiary,
    lineHeight: 1.6,
    maxWidth: 380,
    marginBottom: 48,
  },
  coverMetricBlock: {
    marginBottom: 40,
  },
  coverMetricValue: {
    fontSize: 56,
    fontWeight: 700,
    color: brand.coral,
    letterSpacing: -2,
    lineHeight: 1,
  },
  coverMetricLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: brand.textTertiary,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  coverBottom: {
    padding: 48,
    paddingTop: 0,
  },
  coverMeta: {
    fontSize: 10,
    color: brand.textTertiary,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  coverDate: {
    fontSize: 10,
    color: brand.textTertiary,
    marginTop: 16,
  },

  // CONTENT PAGES
  contentPage: {
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 60,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  headerLogo: {
    width: 60,
    height: 12,
  },
  headerMeta: {
    fontSize: 9,
    color: brand.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // TYPOGRAPHY
  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: brand.textPrimary,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  sectionIntro: {
    fontSize: 11,
    color: brand.textSecondary,
    lineHeight: 1.7,
    marginBottom: 24,
    maxWidth: 480,
  },

  // METRICS GRID
  metricsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  metricBox: {
    flex: 1,
    padding: 20,
    backgroundColor: brand.warmGray,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  metricBoxDark: {
    flex: 1,
    padding: 20,
    backgroundColor: brand.black,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  metricLabelLight: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textTertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    color: brand.textPrimary,
  },
  metricValueCoral: {
    fontSize: 28,
    fontWeight: 700,
    color: brand.coral,
  },
  metricValueWhite: {
    fontSize: 28,
    fontWeight: 700,
    color: brand.white,
  },
  metricSubtext: {
    fontSize: 9,
    color: brand.textSecondary,
    marginTop: 6,
  },
  metricSubtextLight: {
    fontSize: 9,
    color: brand.textTertiary,
    marginTop: 6,
  },

  // NARRATIVE SECTIONS
  theorySection: {
    marginBottom: 24,
  },
  theoryLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  theoryText: {
    fontSize: 11,
    color: brand.textSecondary,
    lineHeight: 1.7,
    marginBottom: 8,
  },
  theoryTextBold: {
    fontWeight: 700,
    color: brand.textPrimary,
  },
  theoryTextCoral: {
    fontWeight: 700,
    color: brand.coral,
  },

  // SCALING VISUALIZATION
  scalingSection: {
    marginBottom: 24,
  },
  scalingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scalingLabel: {
    width: 100,
    fontSize: 10,
    color: brand.textSecondary,
  },
  scalingLabelBold: {
    width: 100,
    fontSize: 10,
    fontWeight: 700,
    color: brand.textPrimary,
  },
  scalingBarOuter: {
    flex: 1,
    marginRight: 16,
  },
  scalingCost: {
    width: 70,
    fontSize: 11,
    fontWeight: 700,
    color: brand.textPrimary,
    textAlign: "right",
  },
  scalingCostCoral: {
    width: 70,
    fontSize: 11,
    fontWeight: 700,
    color: brand.coral,
    textAlign: "right",
  },

  // INSIGHT BOX
  insightBox: {
    backgroundColor: brand.lightGray,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: brand.coral,
    marginBottom: 20,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  insightText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  // STEP BOXES (matching outpatient driver pages)
  stepContainer: {
    marginBottom: 16,
  },
  stepBox: {
    backgroundColor: brand.warmGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stepQuestion: {
    fontSize: 11,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 8,
  },
  stepFormula: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.5,
  },
  stepResult: {
    fontSize: 12,
    fontWeight: 700,
    color: brand.coral,
    marginTop: 8,
  },

  // SUMMARY BOX
  summaryBox: {
    backgroundColor: brand.black,
    padding: 24,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: brand.white,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 8,
    color: brand.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryItemValue: {
    fontSize: 22,
    fontWeight: 700,
    color: brand.white,
  },
  summaryItemSubtext: {
    fontSize: 8,
    color: brand.textTertiary,
    marginTop: 4,
  },

  // OPPORTUNITY SECTION
  opportunityBox: {
    backgroundColor: brand.warmGray,
    borderWidth: 1,
    borderColor: brand.coral,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  opportunityTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: brand.coral,
    marginBottom: 12,
    textAlign: "center",
  },
  opportunityText: {
    fontSize: 10,
    color: brand.textSecondary,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 380,
  },

  // FOOTER
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {},
  footerLogo: {
    width: 60,
    height: 12,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 8,
    color: brand.textTertiary,
    lineHeight: 1.5,
    maxWidth: 300,
  },
  footerPage: {
    fontSize: 9,
    color: brand.textSecondary,
  },

  // CTA
  ctaSection: {
    marginTop: 24,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 10,
    color: brand.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  ctaLink: {
    fontSize: 11,
    fontWeight: 700,
    color: brand.coral,
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

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const ScalingBar = ({ percent, color, maxWidth = 280 }: { percent: number; color: string; maxWidth?: number }) => {
  const barWidth = Math.max((percent / 100) * maxWidth, 8);
  
  return (
    <Svg width={maxWidth} height={16}>
      <Rect x={0} y={0} width={maxWidth} height={16} fill={brand.lightGray} rx={2} />
      <Rect x={0} y={0} width={barWidth} height={16} fill={color} rx={2} />
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

  const turnoverRate = (inputs.turnoverRate > 0 ? inputs.turnoverRate : 40) / 100;
  const trainingCostPerScribe = inputs.trainingCostPerScribe > 0 ? inputs.trainingCostPerScribe : 5000;
  const annualTurnoverCost = Math.round(inputs.scribeCount * turnoverRate * trainingCostPerScribe);
  const managementOverhead = Math.round(calculations.totalScribeCost * 0.15);
  const totalHiddenCosts = annualTurnoverCost + managementOverhead;
  const trueTotalCost = calculations.totalScribeCost + totalHiddenCosts;
  const trueCostPerProvider = Math.round(trueTotalCost / inputs.providersWithScribes);
  const scaleMultiplier = Math.round(calculations.fullScribeCost / calculations.totalScribeCost);

  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <View style={styles.coverTop}>
            <Image src={abridgeLogoPath} style={styles.coverLogo} />
          </View>
          
          <View style={styles.coverHero}>
            <Text style={styles.coverEyebrow}>SCRIBE PROGRAM ANALYSIS</Text>
            <Text style={styles.coverTitle}>Documentation Investment Evaluation</Text>
            <Text style={styles.coverSubtitle}>
              Understanding the true cost, coverage gaps, and scaling economics of your current scribe program.
            </Text>
            
            <View style={styles.coverMetricBlock}>
              <Text style={styles.coverMetricValue}>{formatCurrency(trueTotalCost)}</Text>
              <Text style={styles.coverMetricLabel}>True annual investment (including hidden costs)</Text>
            </View>
          </View>
          
          <View style={styles.coverBottom}>
            <Text style={styles.coverMeta}>Prepared for: {displayClientName}</Text>
            <Text style={styles.coverMeta}>Prepared by: {displayPreparedBy}</Text>
            <Text style={styles.coverDate}>{today}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2: CURRENT STATE ANALYSIS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.contentPage}>
          <View style={styles.pageHeader}>
            <Image src={abridgeLogoPath} style={styles.headerLogo} />
            <Text style={styles.headerMeta}>CURRENT STATE</Text>
          </View>

          <Text style={styles.sectionLabel}>YOUR PROGRAM TODAY</Text>
          <Text style={styles.sectionTitle}>The Investment That Got You Here</Text>
          <Text style={styles.sectionIntro}>
            You've built a scribe program that supports {inputs.providersWithScribes} of {inputs.totalProviders} providers. Here's what that investment looks like—including the costs that don't appear on a budget line.
          </Text>

          <View style={styles.metricsContainer}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Direct Investment</Text>
              <Text style={styles.metricValue}>{formatCurrency(calculations.totalScribeCost)}</Text>
              <Text style={styles.metricSubtext}>{inputs.scribeCount} scribes annually</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Provider Coverage</Text>
              <Text style={styles.metricValue}>{calculations.coveragePercent}%</Text>
              <Text style={styles.metricSubtext}>{inputs.providersWithScribes} of {inputs.totalProviders}</Text>
            </View>
            <View style={styles.metricBoxDark}>
              <Text style={styles.metricLabelLight}>True Cost/Provider</Text>
              <Text style={styles.metricValueCoral}>{formatCurrency(trueCostPerProvider)}</Text>
              <Text style={styles.metricSubtextLight}>with hidden costs</Text>
            </View>
          </View>

          <View style={styles.theorySection}>
            <Text style={styles.theoryLabel}>THE HIDDEN COSTS</Text>
            <Text style={styles.theoryText}>
              Beyond salaries, your scribe program carries operational costs that rarely appear in budget discussions:
            </Text>
            <Text style={styles.theoryText}>
              • <Text style={styles.theoryTextBold}>Turnover & Training:</Text> At ~{Math.round(turnoverRate * 100)}% annual turnover, you'll replace ~{Math.round(inputs.scribeCount * turnoverRate)} scribes this year at ${formatNumber(trainingCostPerScribe)} each = <Text style={styles.theoryTextCoral}>{formatCurrency(annualTurnoverCost)}</Text>
            </Text>
            <Text style={styles.theoryText}>
              • <Text style={styles.theoryTextBold}>Management Overhead:</Text> Scheduling, supervision, quality assurance, and admin support add ~15% = <Text style={styles.theoryTextCoral}>{formatCurrency(managementOverhead)}</Text>
            </Text>
            <Text style={styles.theoryText}>
              Total hidden costs: <Text style={styles.theoryTextCoral}>{formatCurrency(totalHiddenCosts)}</Text> ({Math.round((totalHiddenCosts / calculations.totalScribeCost) * 100)}% of direct investment)
            </Text>
          </View>

          <View style={styles.insightBox}>
            <Text style={styles.insightLabel}>KEY INSIGHT</Text>
            <Text style={styles.insightText}>
              "Scribes bring real value—they're human, they build relationships with providers, they learn institutional nuances. This isn't about replacing what works. It's about understanding whether there's a better path to scale."
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Image src={abridgeLogoPath} style={styles.footerLogo} />
          </View>
          <Text style={styles.footerPage}>Page 2 of 3</Text>
        </View>
      </Page>

      {/* PAGE 3: SCALING ECONOMICS */}
      <Page size="A4" style={styles.page}>
        <View style={styles.contentPage}>
          <View style={styles.pageHeader}>
            <Image src={abridgeLogoPath} style={styles.headerLogo} />
            <Text style={styles.headerMeta}>SCALING ECONOMICS</Text>
          </View>

          <Text style={styles.sectionLabel}>THE CHALLENGE</Text>
          <Text style={styles.sectionTitle}>What Scaling Scribes Looks Like</Text>
          <Text style={styles.sectionIntro}>
            Right now, {calculations.providersWithoutSupport} providers ({100 - calculations.coveragePercent}% of your organization) document without support—that's {formatNumber(calculations.unsupportedDocTimeHours)} hours of documentation time annually. Here's what closing that gap would cost.
          </Text>

          <View style={styles.stepContainer}>
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepLabel}>STEP 1</Text>
              </View>
              <Text style={styles.stepQuestion}>What would full scribe coverage cost?</Text>
              <Text style={styles.stepFormula}>
                {inputs.totalProviders} providers × 1 scribe each × current cost structure
              </Text>
              <Text style={styles.stepResult}>{formatCurrency(calculations.fullScribeCost)}/year</Text>
            </View>

            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepLabel}>STEP 2</Text>
              </View>
              <Text style={styles.stepQuestion}>How much additional investment is needed?</Text>
              <Text style={styles.stepFormula}>
                {formatCurrency(calculations.fullScribeCost)} (full) - {formatCurrency(calculations.totalScribeCost)} (current) = gap
              </Text>
              <Text style={styles.stepResult}>+{formatCurrency(calculations.costToScale)}/year additional</Text>
            </View>

            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepLabel}>STEP 3</Text>
              </View>
              <Text style={styles.stepQuestion}>What's the scaling multiplier?</Text>
              <Text style={styles.stepFormula}>
                Your investment would grow {scaleMultiplier}× to achieve 100% coverage. Scribes scale linearly—there are no economies of scale.
              </Text>
              <Text style={styles.stepResult}>{scaleMultiplier}× your current investment</Text>
            </View>
          </View>

          <View style={styles.scalingSection}>
            <View style={styles.scalingRow}>
              <Text style={styles.scalingLabelBold}>Today ({calculations.coveragePercent}%)</Text>
              <View style={styles.scalingBarOuter}>
                <ScalingBar percent={calculations.coveragePercent} color={brand.textPrimary} />
              </View>
              <Text style={styles.scalingCost}>{formatCurrency(calculations.totalScribeCost)}</Text>
            </View>
            <View style={styles.scalingRow}>
              <Text style={styles.scalingLabel}>Full coverage</Text>
              <View style={styles.scalingBarOuter}>
                <ScalingBar percent={100} color={brand.coral} />
              </View>
              <Text style={styles.scalingCostCoral}>{formatCurrency(calculations.fullScribeCost)}</Text>
            </View>
          </View>

          <View style={styles.opportunityBox}>
            <Text style={styles.opportunityTitle}>There's Another Way</Text>
            <Text style={styles.opportunityText}>
              Abridge can support every provider without the linear cost curve. Imagine giving all {inputs.totalProviders} providers documentation support tomorrow—without hiring a single additional scribe.
            </Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>YOUR SUMMARY TO SHARE</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Current Investment</Text>
                <Text style={styles.summaryItemValue}>{formatCurrency(trueTotalCost)}</Text>
                <Text style={styles.summaryItemSubtext}>including hidden costs</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Coverage Today</Text>
                <Text style={styles.summaryItemValue}>{calculations.coveragePercent}%</Text>
                <Text style={styles.summaryItemSubtext}>{inputs.providersWithScribes} of {inputs.totalProviders}</Text>
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
          <View style={styles.footerLeft}>
            <Image src={abridgeLogoPath} style={styles.footerLogo} />
            <Text style={styles.footerText}>
              Based on {inputs.scribeCount} scribes at ${inputs.scribeCostPerHour}/hr × {inputs.scribeHoursPerWeek} hrs/week.
            </Text>
          </View>
          <Text style={styles.footerPage}>Page 3 of 3</Text>
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
  const fileName = `scribe-program-analysis-${new Date().toISOString().split("T")[0]}.pdf`;
  
  if (isMobile) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: "Scribe Program Analysis" };
      
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }
    
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
};

export default ScribePDFDocument;
