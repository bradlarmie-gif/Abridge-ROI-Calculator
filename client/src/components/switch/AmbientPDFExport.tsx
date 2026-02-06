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
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FFEBE6",
  black: "#1A1A1A",
  darkText: "#333333",
  gray: "#666666",
  lightGray: "#999999",
  border: "#E0E0E0",
  warmBeige: "#F5F0EB",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  pageHeader: {
    padding: 40,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageLabel: {
    fontSize: 11,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 1.6,
    maxWidth: 440,
  },

  contentSection: {
    padding: 40,
    paddingTop: 28,
  },

  contentSectionFlex: {
    padding: 40,
    paddingTop: 28,
    flex: 1,
  },

  chapterLabel: {
    fontSize: 11,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 20,
    lineHeight: 1.6,
  },

  bodyText: {
    fontSize: 12,
    color: colors.darkText,
    lineHeight: 1.8,
    marginBottom: 14,
  },

  scoreCard: {
    backgroundColor: colors.warmBeige,
    borderRadius: 10,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  scoreMaturity: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 14,
  },
  scoreBar: {
    width: "100%",
    maxWidth: 300,
  },

  metricsRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.warmBeige,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.black,
  },
  metricValueAccent: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
  metricSub: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 3,
    textAlign: "center",
  },

  dimensionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dimensionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionScore: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  dimensionRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
  },
  dimensionItem: {
    flex: 1,
  },
  dimensionItemLabel: {
    fontSize: 10,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dimensionItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionItemValueAccent: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  dimensionInsight: {
    fontSize: 11,
    color: colors.gray,
    lineHeight: 1.5,
    backgroundColor: colors.warmBeige,
    padding: 10,
    borderRadius: 6,
  },

  totalCard: {
    backgroundColor: colors.warmBeige,
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 56,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 6,
  },
  totalSubtext: {
    fontSize: 12,
    color: colors.gray,
    textAlign: "center",
  },

  valueStatCard: {
    flex: 1,
    backgroundColor: colors.warmBeige,
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },

  calloutBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.warmBeige,
    padding: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  calloutText: {
    fontSize: 12,
    color: colors.darkText,
    lineHeight: 1.6,
  },

  gapCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    marginBottom: 14,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gapCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
  gapCardBody: {
    padding: 14,
    backgroundColor: colors.white,
  },
  gapStep: {
    fontSize: 12,
    color: colors.darkText,
    lineHeight: 1.8,
    marginBottom: 4,
  },

  patternCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  patternNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warmBeige,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  patternNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  patternContent: {
    flex: 1,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  patternText: {
    fontSize: 12,
    color: colors.darkText,
    lineHeight: 1.5,
  },

  benchmarkRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 10,
  },
  benchmarkCardYou: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.warmBeige,
    alignItems: "center",
  },
  benchmarkCardTarget: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    alignItems: "center",
  },
  benchmarkLabel: {
    fontSize: 10,
    color: colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  benchmarkValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.black,
  },
  benchmarkValueAccent: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.primary,
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
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 10,
    color: colors.lightGray,
  },

  methodologySection: {
    marginTop: 16,
  },
  methodologyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.gray,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 16,
  },
  methodologyLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.gray,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  methodologyItem: {
    fontSize: 12,
    color: colors.darkText,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 10,
    color: colors.lightGray,
    lineHeight: 1.5,
    marginTop: 12,
    fontStyle: "italic",
  },
});

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
  clientName: string;
  preparedBy: string;
}

const formatCurrency = (num: number): string => {
  if (isNaN(num) || num === undefined) return "$0";
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => {
  if (isNaN(num) || num === undefined) return "0";
  return num.toLocaleString();
};

const getMaturityLabel = (score: number): string => {
  if (score >= 80) return "Mature Implementation";
  if (score >= 65) return "Developing Well";
  if (score >= 50) return "Early Progress";
  return "Just Getting Started";
};

const ScoreProgressBar = ({ score, width = 300 }: { score: number; width?: number }) => {
  const safeScore = isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  const barWidth = Math.max((safeScore / 100) * width, 4);

  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={colors.border} rx={5} />
      <Rect x={0} y={0} width={barWidth} height={10} fill={colors.primary} rx={5} />
    </Svg>
  );
};

const DimensionBar = ({ score, width = 160 }: { score: number; width?: number }) => {
  const safeScore = isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  const barWidth = Math.max((safeScore / 100) * width, 4);

  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} fill={colors.border} rx={3} />
      <Rect x={0} y={0} width={barWidth} height={6} fill={colors.primary} rx={3} />
    </Svg>
  );
};

const AmbientPDFDocument = ({ data }: { data: AmbientPDFData }) => {
  const { inputs, calculations } = data;

  const monthlyGap = Math.round(calculations.annualGap / 12);
  const eligibleEncounters = Math.round((inputs.annualEncounters || 150000) * ABRIDGE_BENCHMARKS.utilization / 100);

  const safePercent = (val: number) => isNaN(val) ? 0 : val;

  return (
    <Document>
      {/* COVER PAGE */}
      <PDFCoverPage
        reportLabel="AMBIENT ASSESSMENT"
        title={"Performance &\nOpportunity"}
        subtitle="Understanding Your Ambient AI Investment"
        clientName={data.clientName}
        preparedBy={data.preparedBy}
      />

      {/* ================================================================ */}
      {/* PAGE 2: YOUR PERFORMANCE PROFILE */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageLabel}>Your Performance Profile</Text>
            <Text style={styles.pageTitle}>Understanding Where You Are</Text>
            <Text style={styles.pageSubtitle}>
              You've invested in ambient AI. This assessment measures how much of the possible value you're currently capturing, and what the opportunity ahead looks like.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={styles.scoreLabel}>Your Value Realization Score</Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>{safePercent(calculations.realizationScore)}%</Text>
              <Text style={styles.scoreMaturity}>
                {getMaturityLabel(calculations.realizationScore)}
              </Text>
              <View style={styles.scoreBar}>
                <ScoreProgressBar score={calculations.realizationScore} width={280} />
              </View>
            </View>

            <Text style={styles.bodyText}>
              This score compares your metrics against what mature implementations typically achieve across four dimensions. It's not a grade — it's a starting point for understanding.
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Adoption</Text>
                <Text style={styles.metricValue}>{inputs.utilization}%</Text>
                <Text style={styles.metricSub}>of providers using AI</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Efficiency</Text>
                <Text style={styles.metricValue}>{inputs.timeSavedPerEncounter} min</Text>
                <Text style={styles.metricSub}>saved per encounter</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Quality</Text>
                <Text style={styles.metricValue}>+{inputs.wrvuLift}%</Text>
                <Text style={styles.metricSub}>wRVU improvement</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Experience</Text>
                <Text style={styles.metricValue}>{inputs.satisfaction}%</Text>
                <Text style={styles.metricSub}>would recommend</Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={styles.calloutTitle}>What This Tells Us</Text>
              <Text style={styles.calloutText}>
                {calculations.realizationScore >= 75
                  ? "You're ahead of most implementations we see. The focus now is refinement — finding the remaining friction points and addressing them systematically."
                  : calculations.realizationScore >= 50
                  ? "You've made real progress, but there's meaningful room to grow. The infrastructure is in place. The opportunity is in optimization."
                  : "You're in the early stages of realizing value. This is normal — most organizations start here. The important thing is understanding why and having a path forward."
                }
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 1 of 6</Text>
          </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: BENCHMARKS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageLabel}>Benchmarks</Text>
            <Text style={styles.pageTitle}>What Mature Implementations Achieve</Text>
            <Text style={styles.pageSubtitle}>
              These benchmarks reflect actual performance data from established ambient AI programs. They represent achievable ranges, not aspirational targets.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={styles.chapterLabel}>The Four Dimensions</Text>
            <Text style={styles.sectionTitle}>How We Measure Value Realization</Text>
            <Text style={styles.sectionSubtitle}>
              Each dimension contributes to the overall picture. Performance in one area often influences the others.
            </Text>

            <View style={styles.dimensionCard}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionName}>Adoption</Text>
                <Text style={styles.dimensionScore}>
                  {safePercent(calculations.utilizationScore)}% of benchmark
                </Text>
              </View>
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>YOU</Text>
                  <Text style={styles.dimensionItemValue}>{inputs.utilization}%</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                  <Text style={styles.dimensionItemValueAccent}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <DimensionBar score={calculations.utilizationScore} />
                </View>
              </View>
              <Text style={styles.dimensionInsight}>
                Adoption measures how many providers consistently use AI documentation. When adoption is below 60%, it typically indicates workflow friction rather than a technology problem.
              </Text>
            </View>

            <View style={styles.dimensionCard}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionName}>Efficiency (Time Saved)</Text>
                <Text style={styles.dimensionScore}>
                  {safePercent(calculations.efficiencyScore)}% of benchmark
                </Text>
              </View>
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>YOU</Text>
                  <Text style={styles.dimensionItemValue}>{inputs.timeSavedPerEncounter} min</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                  <Text style={styles.dimensionItemValueAccent}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <DimensionBar score={calculations.efficiencyScore} />
                </View>
              </View>
              <Text style={styles.dimensionInsight}>
                Per-encounter documentation time reduction. When providers report lower savings, it often reflects workflow friction — editing time, integration gaps, or notes that don't match their clinical style.
              </Text>
            </View>

            <View style={styles.dimensionCard}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionName}>Quality (wRVU Improvement)</Text>
                <Text style={styles.dimensionScore}>
                  {safePercent(calculations.qualityScore)}% of benchmark
                </Text>
              </View>
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>YOU</Text>
                  <Text style={styles.dimensionItemValue}>+{inputs.wrvuLift}%</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                  <Text style={styles.dimensionItemValueAccent}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <DimensionBar score={calculations.qualityScore} />
                </View>
              </View>
              <Text style={styles.dimensionInsight}>
                Better documentation captures clinical complexity more accurately. Higher wRVU lift often indicates baseline documentation was incomplete. Lift within the benchmark range with already-strong documentation is equally healthy.
              </Text>
            </View>

            <View style={styles.dimensionCard}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionName}>Provider Experience</Text>
                <Text style={styles.dimensionScore}>
                  {safePercent(calculations.satisfactionScore)}% of benchmark
                </Text>
              </View>
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>YOU</Text>
                  <Text style={styles.dimensionItemValue}>{inputs.satisfaction}%</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                  <Text style={styles.dimensionItemValueAccent}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
                </View>
                <View style={styles.dimensionItem}>
                  <DimensionBar score={calculations.satisfactionScore} />
                </View>
              </View>
              <Text style={styles.dimensionInsight}>
                Provider experience is a leading indicator of sustained adoption. When experience scores are low, adoption tends to follow. Understanding what's driving the experience is essential to long-term value.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 2 of 6</Text>
          </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: YOUR VALUE OPPORTUNITY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageLabel}>Your Value Opportunity</Text>
            <Text style={styles.pageTitle}>The Opportunity Ahead</Text>
            <Text style={styles.pageSubtitle}>
              This section quantifies the difference between your current performance and what mature implementations typically achieve. These are potential outcomes, not guarantees.
            </Text>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Annual Value Opportunity</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.totalSubtext}>
                Potential additional value per year based on benchmark performance
              </Text>
            </View>

            <Text style={styles.bodyText}>
              This value is built from three components, each tied to a specific dimension:
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.valueStatCard}>
                <Text style={styles.metricLabel}>Adoption</Text>
                <Text style={styles.metricValueAccent}>{formatCurrency(calculations.utilizationGapValue)}</Text>
                <Text style={styles.metricSub}>from higher adoption</Text>
              </View>
              <View style={styles.valueStatCard}>
                <Text style={styles.metricLabel}>Efficiency</Text>
                <Text style={styles.metricValueAccent}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
                <Text style={styles.metricSub}>from time savings</Text>
              </View>
              <View style={styles.valueStatCard}>
                <Text style={styles.metricLabel}>Quality</Text>
                <Text style={styles.metricValueAccent}>{formatCurrency(calculations.wrvuGapValue)}</Text>
                <Text style={styles.metricSub}>from wRVU capture</Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={styles.calloutTitle}>How to Read This</Text>
              <Text style={styles.calloutText}>
                These aren't guaranteed outcomes — they're what the math suggests based on benchmark performance. The actual path to capturing this value depends on addressing the specific factors in your implementation. The next page breaks down the calculations.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>The Timeline</Text>
            <Text style={styles.bodyText}>
              Value grows as implementation matures. Earlier action accelerates value capture.
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Monthly Opportunity</Text>
                <Text style={styles.metricValue}>{formatCurrency(monthlyGap)}</Text>
                <Text style={styles.metricSub}>potential value per month</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>3-Year Projection</Text>
                <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
                <Text style={styles.metricSub}>cumulative</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Room to Grow</Text>
                <Text style={styles.metricValue}>{100 - safePercent(calculations.realizationScore)}%</Text>
                <Text style={styles.metricSub}>remaining potential</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 3 of 6</Text>
          </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 5: THE MATH */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageLabel}>Transparency</Text>
            <Text style={styles.pageTitle}>The Math</Text>
            <Text style={styles.pageSubtitle}>
              Every number traces back to your inputs and clearly stated assumptions. Adjust any value to match your organization's reality.
            </Text>
          </View>

          <View style={styles.contentSectionFlex}>
            <Text style={styles.chapterLabel}>Calculation Breakdown</Text>

            {calculations.utilizationGapValue > 0 && (
              <View style={styles.gapCard}>
                <View style={styles.gapCardHeader}>
                  <Text style={styles.gapCardTitle}>Adoption Opportunity</Text>
                  <Text style={styles.gapCardValue}>{formatCurrency(calculations.utilizationGapValue)}</Text>
                </View>
                <View style={styles.gapCardBody}>
                  <Text style={styles.gapStep}>
                    1. Your adoption: {inputs.utilization}% {'\u2192'} Benchmark: {ABRIDGE_BENCHMARKS.utilization}% = {ABRIDGE_BENCHMARKS.utilization - inputs.utilization} point gap
                  </Text>
                  <Text style={styles.gapStep}>
                    2. Additional encounters at benchmark: {formatNumber(Math.round(inputs.annualEncounters * (ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100))}
                  </Text>
                  <Text style={styles.gapStep}>
                    3. Time value: {'\u00D7'} {ABRIDGE_BENCHMARKS.timeSavedAvg} min {'\u00D7'} ${VALUE_ASSUMPTIONS.hourlyRate}/hr {'\u00D7'} {VALUE_ASSUMPTIONS.timeConversionRate * 100}% conversion
                  </Text>
                  <Text style={styles.gapStep}>
                    4. Annual value: {formatCurrency(calculations.utilizationGapValue)}
                  </Text>
                </View>
              </View>
            )}

            {calculations.efficiencyGapValue > 0 && (
              <View style={styles.gapCard}>
                <View style={styles.gapCardHeader}>
                  <Text style={styles.gapCardTitle}>Efficiency Opportunity</Text>
                  <Text style={styles.gapCardValue}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
                </View>
                <View style={styles.gapCardBody}>
                  <Text style={styles.gapStep}>
                    1. Your time saved: {inputs.timeSavedPerEncounter} min {'\u2192'} Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min gap
                  </Text>
                  <Text style={styles.gapStep}>
                    2. Encounters with AI: {formatNumber(eligibleEncounters)} (at {ABRIDGE_BENCHMARKS.utilization}% adoption)
                  </Text>
                  <Text style={styles.gapStep}>
                    3. Additional hours saved: {formatNumber(Math.round((ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter) * eligibleEncounters / 60))} hours/year
                  </Text>
                  <Text style={styles.gapStep}>
                    4. Value: {'\u00D7'} ${VALUE_ASSUMPTIONS.hourlyRate}/hr {'\u00D7'} {VALUE_ASSUMPTIONS.timeConversionRate * 100}% conversion = {formatCurrency(calculations.efficiencyGapValue)}
                  </Text>
                </View>
              </View>
            )}

            {calculations.wrvuGapValue > 0 && (
              <View style={styles.gapCard}>
                <View style={styles.gapCardHeader}>
                  <Text style={styles.gapCardTitle}>Documentation Quality Opportunity (wRVU)</Text>
                  <Text style={styles.gapCardValue}>{formatCurrency(calculations.wrvuGapValue)}</Text>
                </View>
                <View style={styles.gapCardBody}>
                  <Text style={styles.gapStep}>
                    1. Your wRVU lift: +{inputs.wrvuLift}% {'\u2192'} Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}% = {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% gap
                  </Text>
                  <Text style={styles.gapStep}>
                    2. Base wRVU: {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} per encounter {'\u00D7'} {formatNumber(eligibleEncounters)} encounters
                  </Text>
                  <Text style={styles.gapStep}>
                    3. Additional wRVU: {'\u00D7'} {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% improvement
                  </Text>
                  <Text style={styles.gapStep}>
                    4. Value: {'\u00D7'} ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU {'\u00D7'} {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}% realization = {formatCurrency(calculations.wrvuGapValue)}
                  </Text>
                </View>
              </View>
            )}

            {calculations.utilizationGapValue === 0 && calculations.efficiencyGapValue === 0 && calculations.wrvuGapValue === 0 && (
              <View style={[styles.calloutBox, { marginTop: 10 }]}>
                <Text style={styles.calloutTitle}>You're at Benchmark</Text>
                <Text style={styles.calloutText}>
                  Your implementation is performing at or above benchmark across all dimensions. The focus now shifts from closing gaps to maintaining excellence and sharing your success story.
                </Text>
              </View>
            )}

            <View style={styles.methodologySection}>
              <Text style={styles.methodologyTitle}>Key Assumptions</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyLabel}>Your Inputs</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} {formatNumber(inputs.providers || 75)} providers</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} {formatNumber(inputs.annualEncounters || 150000)} annual encounters</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} {inputs.utilization}% adoption rate</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} {inputs.timeSavedPerEncounter} min saved/encounter</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} +{inputs.wrvuLift}% wRVU lift</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} {inputs.satisfaction}% would recommend</Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyLabel}>Value Assumptions</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} Provider cost: ${VALUE_ASSUMPTIONS.hourlyRate}/hour</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue}</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} Time conversion: {VALUE_ASSUMPTIONS.timeConversionRate * 100}%</Text>
                  <Text style={styles.methodologyItem}>{'\u2022'} wRVU realization: {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}%</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 4 of 6</Text>
          </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 6: PATTERNS */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageLabel}>Patterns</Text>
            <Text style={styles.pageTitle}>What We've Seen Work</Text>
            <Text style={styles.pageSubtitle}>
              Across hundreds of ambient AI implementations, these patterns consistently influence outcomes.
            </Text>
          </View>

          <View style={styles.contentSectionFlex}>
            <Text style={styles.chapterLabel}>Common Patterns</Text>
            <Text style={styles.sectionTitle}>Why Some Implementations Succeed</Text>
            <Text style={styles.sectionSubtitle}>
              Technology alone doesn't change behavior. The organizations that capture full value share certain characteristics.
            </Text>

            <View style={styles.patternCard}>
              <View style={styles.patternNumber}>
                <Text style={styles.patternNumberText}>1</Text>
              </View>
              <View style={styles.patternContent}>
                <Text style={styles.patternTitle}>Adoption Is a Human Challenge</Text>
                <Text style={styles.patternText}>
                  Change management isn't a phase — it's ongoing. The most effective implementations have dedicated resources for provider onboarding, feedback loops, and continuous improvement.
                </Text>
              </View>
            </View>

            <View style={styles.patternCard}>
              <View style={styles.patternNumber}>
                <Text style={styles.patternNumberText}>2</Text>
              </View>
              <View style={styles.patternContent}>
                <Text style={styles.patternTitle}>Continuous Optimization Matters</Text>
                <Text style={styles.patternText}>
                  Set-it-and-forget-it doesn't work. Mature implementations review performance regularly, identify friction points, and make adjustments. The tool improves because someone is paying attention.
                </Text>
              </View>
            </View>

            <View style={styles.patternCard}>
              <View style={styles.patternNumber}>
                <Text style={styles.patternNumberText}>3</Text>
              </View>
              <View style={styles.patternContent}>
                <Text style={styles.patternTitle}>Deep Customization Drives Results</Text>
                <Text style={styles.patternText}>
                  Generic configurations miss the nuances of different specialties and workflows. Organizations that invest in specialty-specific workflows see meaningfully higher adoption and satisfaction.
                </Text>
              </View>
            </View>

            <View style={styles.patternCard}>
              <View style={styles.patternNumber}>
                <Text style={styles.patternNumberText}>4</Text>
              </View>
              <View style={styles.patternContent}>
                <Text style={styles.patternTitle}>Executive Visibility Sustains Momentum</Text>
                <Text style={styles.patternText}>
                  When leadership tracks ambient AI as a strategic initiative — not just an IT project — resources and attention follow. Executive sponsorship correlates strongly with sustained adoption.
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={styles.calloutTitle}>The Bottom Line</Text>
              <Text style={styles.calloutText}>
                The technology matters. But the approach to implementation, adoption, and ongoing optimization matters just as much.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 5 of 6</Text>
          </View>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 7: YOUR SUMMARY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageLabel}>Summary</Text>
            <Text style={styles.pageTitle}>Your Complete Profile</Text>
            <Text style={styles.pageSubtitle}>
              Everything covered in this assessment, consolidated.
            </Text>
          </View>

          <View style={styles.contentSectionFlex}>
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Realization Score</Text>
                <Text style={styles.metricValue}>{safePercent(calculations.realizationScore)}%</Text>
                <Text style={[styles.metricSub, { color: colors.primary }]}>{getMaturityLabel(calculations.realizationScore)}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Annual Opportunity</Text>
                <Text style={styles.metricValueAccent}>{formatCurrency(calculations.annualGap)}</Text>
                <Text style={styles.metricSub}>potential value</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>3-Year Projection</Text>
                <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
                <Text style={styles.metricSub}>cumulative</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Monthly Opportunity</Text>
                <Text style={styles.metricValueAccent}>{formatCurrency(monthlyGap)}</Text>
                <Text style={styles.metricSub}>per month</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Your Dimensions vs. Benchmark</Text>

            <View style={styles.benchmarkRow}>
              <View style={styles.benchmarkCardYou}>
                <Text style={styles.benchmarkLabel}>Adoption - You</Text>
                <Text style={styles.benchmarkValue}>{inputs.utilization}%</Text>
              </View>
              <View style={styles.benchmarkCardTarget}>
                <Text style={styles.benchmarkLabel}>Adoption - Benchmark</Text>
                <Text style={styles.benchmarkValueAccent}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
            </View>

            <View style={styles.benchmarkRow}>
              <View style={styles.benchmarkCardYou}>
                <Text style={styles.benchmarkLabel}>Efficiency - You</Text>
                <Text style={styles.benchmarkValue}>{inputs.timeSavedPerEncounter} min</Text>
              </View>
              <View style={styles.benchmarkCardTarget}>
                <Text style={styles.benchmarkLabel}>Efficiency - Benchmark</Text>
                <Text style={styles.benchmarkValueAccent}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              </View>
            </View>

            <View style={styles.benchmarkRow}>
              <View style={styles.benchmarkCardYou}>
                <Text style={styles.benchmarkLabel}>Quality - You</Text>
                <Text style={styles.benchmarkValue}>+{inputs.wrvuLift}%</Text>
              </View>
              <View style={styles.benchmarkCardTarget}>
                <Text style={styles.benchmarkLabel}>Quality - Benchmark</Text>
                <Text style={styles.benchmarkValueAccent}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
            </View>

            <View style={styles.benchmarkRow}>
              <View style={styles.benchmarkCardYou}>
                <Text style={styles.benchmarkLabel}>Experience - You</Text>
                <Text style={styles.benchmarkValue}>{inputs.satisfaction}%</Text>
              </View>
              <View style={styles.benchmarkCardTarget}>
                <Text style={styles.benchmarkLabel}>Experience - Benchmark</Text>
                <Text style={styles.benchmarkValueAccent}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={styles.calloutTitle}>What This Means</Text>
              <Text style={styles.calloutText}>
                {calculations.realizationScore >= 75
                  ? `At ${safePercent(calculations.realizationScore)}%, you're outperforming most implementations. The ${formatCurrency(calculations.annualGap)} remaining opportunity is about refinement — finding edge cases and optimizing further. The foundation is strong.`
                  : calculations.realizationScore >= 50
                  ? `At ${safePercent(calculations.realizationScore)}%, you've made real progress. The ${formatCurrency(calculations.annualGap)} opportunity ahead isn't about starting over — it's about understanding which specific factors are limiting value and addressing them. The answers are usually specific and actionable.`
                  : `At ${safePercent(calculations.realizationScore)}%, you're early in the journey. That's normal. The ${formatCurrency(calculations.annualGap)} ahead represents what's possible with the right support. The encouraging part: you don't need to change everything. Usually it's a few specific things that explain most of the gap.`
                }
              </Text>
            </View>

            <View style={styles.methodologySection}>
              <Text style={styles.methodologyNote}>
                This assessment is for planning purposes. All calculations are based on inputs provided and Abridge benchmark data. Actual results depend on implementation approach, organizational readiness, and clinical workflow factors.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 6 of 6</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function generateAmbientPDF(data: Omit<AmbientPDFData, 'calculations'> & { calculations: SwitchCalculations }): Promise<void> {
  const blob = await pdf(<AmbientPDFDocument data={data} />).toBlob();
  const fileName = `value-realization-assessment-${new Date().toISOString().split('T')[0]}.pdf`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (isMobile) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: "Value Realization Assessment" };

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
}
