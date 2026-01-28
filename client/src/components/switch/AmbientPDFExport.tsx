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
  Circle,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
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
  backgroundGray: "#F8FAFC",
  white: "#FFFFFF",
  emerald: "#059669",
  emeraldLight: "#ECFDF5",
  emeraldDark: "#047857",
  slate800: "#1e293b",
  slate900: "#0f172a",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  amber: "#D97706",
  amberLight: "#FFFBEB",
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
    paddingBottom: 36,
  },
  heroLabel: {
    fontSize: 8,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 10,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: 11,
    color: colors.lightGray,
    lineHeight: 1.7,
    maxWidth: 420,
  },
  
  heroCompact: {
    backgroundColor: colors.slate900,
    padding: 32,
    paddingTop: 28,
    paddingBottom: 24,
  },
  heroCompactLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: "center",
  },
  heroCompactTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroCompactSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 440,
    marginLeft: "auto",
    marginRight: "auto",
  },
  
  contentSection: {
    padding: 40,
    paddingTop: 32,
  },
  
  chapterLabel: {
    fontSize: 7,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: colors.mediumGray,
    marginBottom: 20,
    lineHeight: 1.6,
  },
  
  storyText: {
    fontSize: 10,
    color: colors.darkGray,
    lineHeight: 1.8,
    marginBottom: 14,
  },
  storyTextBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  
  scoreCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  scoreMaturity: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 12,
  },
  scoreBar: {
    width: "100%",
    maxWidth: 300,
  },
  
  metricsRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 16,
    marginRight: 10,
    alignItems: "center",
  },
  metricBoxLast: {
    marginRight: 0,
  },
  metricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
  },
  metricValueGreen: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.emerald,
  },
  metricSub: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 3,
  },
  
  dimensionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 10,
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
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionScore: {
    fontSize: 11,
    fontWeight: "bold",
  },
  dimensionRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dimensionItem: {
    flex: 1,
  },
  dimensionItemLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  dimensionItemValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  dimensionInsight: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.5,
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 6,
  },
  
  gapCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 10,
    marginBottom: 14,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.emerald,
  },
  gapCardBody: {
    padding: 12,
    backgroundColor: colors.backgroundGray,
  },
  gapStep: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.7,
    marginBottom: 3,
  },
  
  totalBox: {
    backgroundColor: colors.slate800,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 8,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.emerald,
    marginBottom: 4,
  },
  totalSubtext: {
    fontSize: 8,
    color: colors.lightGray,
  },
  
  insightCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: 6,
    marginBottom: 14,
  },
  insightTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primaryDark,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
  },
  
  benchmarkRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  benchmarkCard: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  benchmarkCardYou: {
    backgroundColor: colors.backgroundGray,
  },
  benchmarkCardTarget: {
    backgroundColor: colors.emeraldLight,
    borderWidth: 1,
    borderColor: colors.emerald,
  },
  benchmarkLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  benchmarkValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  benchmarkValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },
  
  takeawayCard: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  takeawayNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.slate800,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  takeawayNumberText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
  },
  takeawayContent: {
    flex: 1,
  },
  takeawayTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  takeawayText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  
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
  
  methodologySection: {
    marginTop: 16,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
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
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  methodologyItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 7,
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
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

const getScoreColor = (score: number): string => {
  if (score >= 80) return colors.emerald;
  if (score >= 60) return colors.amber;
  return colors.primary;
};

const getMaturityLabel = (score: number): string => {
  if (score >= 80) return "Mature Implementation";
  if (score >= 65) return "Developing Well";
  if (score >= 50) return "Early Progress";
  return "Just Getting Started";
};

const ScoreProgressBar = ({ score, width = 300 }: { score: number; width?: number }) => {
  const barWidth = Math.max((score / 100) * width, 4);
  const color = getScoreColor(score);
  
  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={colors.borderGray} rx={5} />
      <Rect x={0} y={0} width={barWidth} height={10} fill={color} rx={5} />
    </Svg>
  );
};

const DimensionBar = ({ score, width = 160 }: { score: number; width?: number }) => {
  const barWidth = Math.max((score / 100) * width, 4);
  const color = getScoreColor(score);
  
  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} fill={colors.borderGray} rx={3} />
      <Rect x={0} y={0} width={barWidth} height={6} fill={color} rx={3} />
    </Svg>
  );
};

const AmbientPDFDocument = ({ data }: { data: AmbientPDFData }) => {
  const { inputs, calculations } = data;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const monthlyGap = Math.round(calculations.annualGap / 12);
  const eligibleEncounters = Math.round((inputs.annualEncounters || 150000) * ABRIDGE_BENCHMARKS.utilization / 100);
  
  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1: YOUR STORY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.heroSection}>
          <Image src={abridgeLogoPath} style={{ width: 80, marginBottom: 24 }} />
          <Text style={styles.heroLabel}>Value Realization Assessment</Text>
          <Text style={styles.heroTitle}>Understanding Where You Are</Text>
          <Text style={styles.heroSubtitle}>
            You've invested in ambient AI. This assessment isn't about judging that decision — it's about understanding how much of the possible value you're currently capturing, and what the path forward looks like.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Your Value Realization Score</Text>
            <Text style={styles.scoreValue}>{calculations.realizationScore}%</Text>
            <Text style={[styles.scoreMaturity, { color: getScoreColor(calculations.realizationScore) }]}>
              {getMaturityLabel(calculations.realizationScore)}
            </Text>
            <View style={styles.scoreBar}>
              <ScoreProgressBar score={calculations.realizationScore} width={280} />
            </View>
          </View>
          
          <Text style={styles.storyText}>
            This score represents how close you are to what mature implementations typically achieve across four dimensions: utilization, efficiency, quality, and satisfaction. It's not a grade — it's a starting point for understanding.
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Utilization</Text>
              <Text style={styles.metricValue}>{inputs.utilization}%</Text>
              <Text style={styles.metricSub}>of providers using it</Text>
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
            <View style={[styles.metricBox, styles.metricBoxLast]}>
              <Text style={styles.metricLabel}>Satisfaction</Text>
              <Text style={styles.metricValue}>{inputs.satisfaction}%</Text>
              <Text style={styles.metricSub}>provider satisfaction</Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>What This Tells Us</Text>
            <Text style={styles.insightText}>
              {calculations.realizationScore >= 75 
                ? "You're ahead of most implementations we see. The focus now is refinement — finding the remaining friction points and addressing them systematically."
                : calculations.realizationScore >= 50
                ? "You've made real progress, but there's meaningful room to grow. The good news: the infrastructure is in place. Now it's about optimization."
                : "You're in the early stages of realizing value. This is normal — most organizations start here. The important thing is understanding why and having a path forward."
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>{today}</Text>
          <Text style={styles.footerText}>Page 1 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 2: WHAT WE'VE LEARNED */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 2 · Benchmarks</Text>
          <Text style={styles.heroCompactTitle}>What Mature Implementations Look Like</Text>
          <Text style={styles.heroCompactSubtitle}>
            These benchmarks come from studying hundreds of ambient AI deployments. They're not aspirational targets — they're what organizations actually achieve when adoption is healthy.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>The Four Dimensions</Text>
          <Text style={styles.sectionTitle}>How We Measure Value Realization</Text>
          <Text style={styles.sectionSubtitle}>
            Each dimension contributes to the overall picture. Low performance in one area often explains struggles in others.
          </Text>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>Utilization</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.utilizationScore) }]}>
                {calculations.utilizationScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionRow}>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>YOU</Text>
                <Text style={styles.dimensionItemValue}>{inputs.utilization}%</Text>
              </View>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionItemValue, { color: colors.emerald }]}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
              <View style={styles.dimensionItem}>
                <DimensionBar score={calculations.utilizationScore} />
              </View>
            </View>
            <Text style={styles.dimensionInsight}>
              Utilization measures how many providers consistently use the tool. When it's low, all other metrics suffer — you can't save time or improve quality for encounters that aren't documented.
            </Text>
          </View>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>Efficiency (Time Saved)</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.efficiencyScore) }]}>
                {calculations.efficiencyScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionRow}>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>YOU</Text>
                <Text style={styles.dimensionItemValue}>{inputs.timeSavedPerEncounter} min</Text>
              </View>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionItemValue, { color: colors.emerald }]}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              </View>
              <View style={styles.dimensionItem}>
                <DimensionBar score={calculations.efficiencyScore} />
              </View>
            </View>
            <Text style={styles.dimensionInsight}>
              This is the per-encounter documentation time reduction. When providers report low savings, it usually means workflow friction — too much editing, poor integration, or notes that don't match their style.
            </Text>
          </View>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>Quality (wRVU Improvement)</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.qualityScore) }]}>
                {calculations.qualityScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionRow}>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>YOU</Text>
                <Text style={styles.dimensionItemValue}>+{inputs.wrvuLift}%</Text>
              </View>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionItemValue, { color: colors.emerald }]}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
              <View style={styles.dimensionItem}>
                <DimensionBar score={calculations.qualityScore} />
              </View>
            </View>
            <Text style={styles.dimensionInsight}>
              Better documentation captures more of the work providers actually do. Higher wRVU lift often indicates baseline documentation was incomplete. Lower lift with already-strong documentation is equally healthy.
            </Text>
          </View>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>Satisfaction</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.satisfactionScore) }]}>
                {calculations.satisfactionScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionRow}>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>YOU</Text>
                <Text style={styles.dimensionItemValue}>{inputs.satisfaction}%</Text>
              </View>
              <View style={styles.dimensionItem}>
                <Text style={styles.dimensionItemLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionItemValue, { color: colors.emerald }]}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
              <View style={styles.dimensionItem}>
                <DimensionBar score={calculations.satisfactionScore} />
              </View>
            </View>
            <Text style={styles.dimensionInsight}>
              Provider satisfaction is a leading indicator. When it's low, utilization tends to follow — sometimes months later. It's worth understanding what's driving dissatisfaction before the numbers catch up.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 2 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: THE DIFFERENCE */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 3 · The Difference</Text>
          <Text style={styles.heroCompactTitle}>Understanding the Gap</Text>
          <Text style={styles.heroCompactSubtitle}>
            This isn't about what you're doing wrong. It's about understanding what's possible — and quantifying the difference between where you are and where mature implementations typically land.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>Annual Opportunity</Text>
          
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Annual Difference</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.totalSubtext}>
              The value difference between your current state and benchmark performance
            </Text>
          </View>
          
          <Text style={styles.storyText}>
            This number represents what organizations typically capture when they reach mature implementation. It's built from three components, each tied to a specific dimension:
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: colors.blueLight }]}>
              <Text style={styles.metricLabel}>Utilization</Text>
              <Text style={[styles.metricValue, { color: colors.blue }]}>{formatCurrency(calculations.utilizationGapValue)}</Text>
              <Text style={styles.metricSub}>from higher adoption</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: colors.purpleLight }]}>
              <Text style={styles.metricLabel}>Efficiency</Text>
              <Text style={[styles.metricValue, { color: colors.purple }]}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
              <Text style={styles.metricSub}>from time savings</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxLast, { backgroundColor: colors.emeraldLight }]}>
              <Text style={styles.metricLabel}>Quality</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(calculations.wrvuGapValue)}</Text>
              <Text style={styles.metricSub}>from wRVU capture</Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>How to Read This</Text>
            <Text style={styles.insightText}>
              These aren't guaranteed outcomes — they're what the math suggests based on benchmark performance. The actual path to capturing this value depends on addressing the specific barriers in your implementation. The next pages break down exactly how each number is calculated.
            </Text>
          </View>
          
          <Text style={styles.sectionTitle}>The Timing Factor</Text>
          <Text style={styles.storyText}>
            Value realization isn't just about whether you improve — it's about when. Every month that passes is another month the gap exists. This isn't pressure; it's just arithmetic.
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Monthly Impact</Text>
              <Text style={styles.metricValue}>{formatCurrency(monthlyGap)}</Text>
              <Text style={styles.metricSub}>per month</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>3-Year Projection</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(calculations.threeYearGap)}</Text>
              <Text style={styles.metricSub}>cumulative</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxLast]}>
              <Text style={styles.metricLabel}>Room to Grow</Text>
              <Text style={styles.metricValue}>{100 - calculations.realizationScore}%</Text>
              <Text style={styles.metricSub}>remaining potential</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 3 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: THE MATH */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 4 · Transparency</Text>
          <Text style={styles.heroCompactTitle}>The Math Behind the Numbers</Text>
          <Text style={styles.heroCompactSubtitle}>
            Every dollar traces back to your inputs and clearly stated assumptions. If something looks wrong, you can challenge it.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>Calculation Breakdown</Text>
          
          {calculations.utilizationGapValue > 0 && (
            <View style={styles.gapCard}>
              <View style={[styles.gapCardHeader, { backgroundColor: colors.blueLight }]}>
                <Text style={styles.gapCardTitle}>Utilization Opportunity</Text>
                <Text style={[styles.gapCardValue, { color: colors.blue }]}>{formatCurrency(calculations.utilizationGapValue)}</Text>
              </View>
              <View style={styles.gapCardBody}>
                <Text style={styles.gapStep}>
                  1. Your utilization: {inputs.utilization}% → Benchmark: {ABRIDGE_BENCHMARKS.utilization}% = {ABRIDGE_BENCHMARKS.utilization - inputs.utilization}% gap
                </Text>
                <Text style={styles.gapStep}>
                  2. Additional encounters if at benchmark: {formatNumber(Math.round(inputs.annualEncounters * (ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100))}
                </Text>
                <Text style={styles.gapStep}>
                  3. Time value: × {ABRIDGE_BENCHMARKS.timeSavedAvg} min × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion
                </Text>
                <Text style={styles.gapStep}>
                  4. Annual value: {formatCurrency(calculations.utilizationGapValue)}
                </Text>
              </View>
            </View>
          )}
          
          {calculations.efficiencyGapValue > 0 && (
            <View style={styles.gapCard}>
              <View style={[styles.gapCardHeader, { backgroundColor: colors.purpleLight }]}>
                <Text style={styles.gapCardTitle}>Efficiency Opportunity</Text>
                <Text style={[styles.gapCardValue, { color: colors.purple }]}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
              </View>
              <View style={styles.gapCardBody}>
                <Text style={styles.gapStep}>
                  1. Your time saved: {inputs.timeSavedPerEncounter} min → Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min gap
                </Text>
                <Text style={styles.gapStep}>
                  2. Eligible encounters: {formatNumber(eligibleEncounters)} (at {ABRIDGE_BENCHMARKS.utilization}% utilization)
                </Text>
                <Text style={styles.gapStep}>
                  3. Hours saved: {formatNumber(Math.round((ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter) * eligibleEncounters / 60))} hours/year
                </Text>
                <Text style={styles.gapStep}>
                  4. Value: × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}
                </Text>
              </View>
            </View>
          )}
          
          {calculations.wrvuGapValue > 0 && (
            <View style={styles.gapCard}>
              <View style={[styles.gapCardHeader, { backgroundColor: colors.emeraldLight }]}>
                <Text style={styles.gapCardTitle}>Quality Opportunity (wRVU)</Text>
                <Text style={styles.gapCardValue}>{formatCurrency(calculations.wrvuGapValue)}</Text>
              </View>
              <View style={styles.gapCardBody}>
                <Text style={styles.gapStep}>
                  1. Your wRVU lift: +{inputs.wrvuLift}% → Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}% = {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% gap
                </Text>
                <Text style={styles.gapStep}>
                  2. Base wRVU: {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} per encounter × {formatNumber(eligibleEncounters)} encounters
                </Text>
                <Text style={styles.gapStep}>
                  3. Additional wRVU: × {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% improvement
                </Text>
                <Text style={styles.gapStep}>
                  4. Value: × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution = {formatCurrency(calculations.wrvuGapValue)}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.methodologySection}>
            <Text style={styles.methodologyTitle}>Key Assumptions</Text>
            <View style={styles.methodologyGrid}>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyLabel}>Your Inputs</Text>
                <Text style={styles.methodologyItem}>• {formatNumber(inputs.providers || 75)} providers</Text>
                <Text style={styles.methodologyItem}>• {formatNumber(inputs.annualEncounters || 150000)} annual encounters</Text>
                <Text style={styles.methodologyItem}>• {inputs.utilization}% utilization rate</Text>
                <Text style={styles.methodologyItem}>• {inputs.timeSavedPerEncounter} min saved/encounter</Text>
              </View>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyLabel}>Value Assumptions</Text>
                <Text style={styles.methodologyItem}>• Provider rate: ${VALUE_ASSUMPTIONS.hourlyRate}/hour</Text>
                <Text style={styles.methodologyItem}>• wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue}</Text>
                <Text style={styles.methodologyItem}>• Time conversion: {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</Text>
                <Text style={styles.methodologyItem}>• wRVU attribution: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 4 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 5: WHAT WE'VE SEEN WORK */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 5 · Patterns</Text>
          <Text style={styles.heroCompactTitle}>What We've Seen Work</Text>
          <Text style={styles.heroCompactSubtitle}>
            From hundreds of implementations, certain patterns emerge. Here's what distinguishes organizations that reach full value realization from those that plateau.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>Common Patterns</Text>
          <Text style={styles.sectionTitle}>Why Some Implementations Succeed</Text>
          <Text style={styles.sectionSubtitle}>
            Technology alone doesn't change behavior. The organizations that capture full value share certain characteristics.
          </Text>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayNumber}>
              <Text style={styles.takeawayNumberText}>1</Text>
            </View>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>They Treat Adoption as a Human Challenge</Text>
              <Text style={styles.takeawayText}>
                Not a technology rollout. Change management isn't a phase — it's ongoing. The best implementations have dedicated resources for provider onboarding, feedback loops, and continuous improvement.
              </Text>
            </View>
          </View>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayNumber}>
              <Text style={styles.takeawayNumberText}>2</Text>
            </View>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>They Optimize Continuously</Text>
              <Text style={styles.takeawayText}>
                Set-it-and-forget-it doesn't work. Mature implementations review performance monthly, identify friction points, and make adjustments. The tool gets better because someone is paying attention.
              </Text>
            </View>
          </View>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayNumber}>
              <Text style={styles.takeawayNumberText}>3</Text>
            </View>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>They Customize Deeply</Text>
              <Text style={styles.takeawayText}>
                Generic configurations miss the nuances of different specialties and workflows. Organizations that invest in specialty-specific templates and workflows see significantly higher adoption and satisfaction.
              </Text>
            </View>
          </View>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayNumber}>
              <Text style={styles.takeawayNumberText}>4</Text>
            </View>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>They Have Executive Visibility</Text>
              <Text style={styles.takeawayText}>
                When leadership tracks ambient AI as a strategic initiative — not just an IT project — resources follow. Executive sponsorship correlates strongly with sustained adoption gains.
              </Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>The Bottom Line</Text>
            <Text style={styles.insightText}>
              Implementation quality matters more than the tool itself. Organizations that partner with teams who understand these challenges — who can provide the change management, optimization, and customization support — consistently outperform those who go it alone.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 5 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 6: YOUR SUMMARY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactLabel}>Page 6 · Summary</Text>
          <Text style={styles.heroCompactTitle}>Your Analysis at a Glance</Text>
          <Text style={styles.heroCompactSubtitle}>
            Everything we've covered, consolidated into the key takeaways.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Realization Score</Text>
              <Text style={[styles.metricValue, { color: getScoreColor(calculations.realizationScore) }]}>{calculations.realizationScore}%</Text>
              <Text style={styles.metricSub}>{getMaturityLabel(calculations.realizationScore)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Annual Opportunity</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.metricSub}>potential value</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>3-Year Impact</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(calculations.threeYearGap)}</Text>
              <Text style={styles.metricSub}>cumulative</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxLast]}>
              <Text style={styles.metricLabel}>Monthly Cost</Text>
              <Text style={[styles.metricValue, { color: colors.amber }]}>{formatCurrency(monthlyGap)}</Text>
              <Text style={styles.metricSub}>of current gap</Text>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Your Dimensions vs. Benchmark</Text>
          
          <View style={styles.benchmarkRow}>
            <View style={[styles.benchmarkCard, styles.benchmarkCardYou]}>
              <Text style={styles.benchmarkLabel}>Utilization - You</Text>
              <Text style={styles.benchmarkValue}>{inputs.utilization}%</Text>
            </View>
            <View style={[styles.benchmarkCard, styles.benchmarkCardTarget]}>
              <Text style={styles.benchmarkLabel}>Utilization - Target</Text>
              <Text style={styles.benchmarkValueGreen}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
            </View>
          </View>
          
          <View style={styles.benchmarkRow}>
            <View style={[styles.benchmarkCard, styles.benchmarkCardYou]}>
              <Text style={styles.benchmarkLabel}>Efficiency - You</Text>
              <Text style={styles.benchmarkValue}>{inputs.timeSavedPerEncounter} min</Text>
            </View>
            <View style={[styles.benchmarkCard, styles.benchmarkCardTarget]}>
              <Text style={styles.benchmarkLabel}>Efficiency - Target</Text>
              <Text style={styles.benchmarkValueGreen}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
            </View>
          </View>
          
          <View style={styles.benchmarkRow}>
            <View style={[styles.benchmarkCard, styles.benchmarkCardYou]}>
              <Text style={styles.benchmarkLabel}>Quality - You</Text>
              <Text style={styles.benchmarkValue}>+{inputs.wrvuLift}%</Text>
            </View>
            <View style={[styles.benchmarkCard, styles.benchmarkCardTarget]}>
              <Text style={styles.benchmarkLabel}>Quality - Target</Text>
              <Text style={styles.benchmarkValueGreen}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            </View>
          </View>
          
          <View style={styles.benchmarkRow}>
            <View style={[styles.benchmarkCard, styles.benchmarkCardYou]}>
              <Text style={styles.benchmarkLabel}>Satisfaction - You</Text>
              <Text style={styles.benchmarkValue}>{inputs.satisfaction}%</Text>
            </View>
            <View style={[styles.benchmarkCard, styles.benchmarkCardTarget, { marginRight: 0 }]}>
              <Text style={styles.benchmarkLabel}>Satisfaction - Target</Text>
              <Text style={styles.benchmarkValueGreen}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
            </View>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>What This Means</Text>
            <Text style={styles.insightText}>
              {calculations.realizationScore >= 75 
                ? `At ${calculations.realizationScore}%, you're outperforming most implementations. The ${formatCurrency(calculations.annualGap)} remaining opportunity is about refinement — finding edge cases and optimizing further. The foundation is strong.`
                : calculations.realizationScore >= 50
                ? `At ${calculations.realizationScore}%, you've made real progress. The ${formatCurrency(calculations.annualGap)} opportunity ahead isn't about starting over — it's about asking harder questions. Which providers aren't using it? Where are notes being edited? The answers are usually specific and addressable.`
                : `At ${calculations.realizationScore}%, you're early in the journey. That's normal. The ${formatCurrency(calculations.annualGap)} ahead represents what's possible with the right support. The encouraging part: you don't need to change everything. Usually it's a few specific things that explain most of the gap.`
              }
            </Text>
          </View>
          
          <View style={styles.methodologySection}>
            <Text style={styles.methodologyNote}>
              This assessment is for informational purposes only. All calculations are based on the inputs provided and industry benchmarks from mature ambient AI implementations. Actual results may vary based on implementation quality, organizational context, and other factors.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Image src={abridgeLogoPath} style={{ width: 60 }} />
          <Text style={styles.footerText}>Page 6 of 6</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateAmbientPDF(data: Omit<AmbientPDFData, 'calculations'> & { calculations: SwitchCalculations }): Promise<void> {
  const blob = await pdf(<AmbientPDFDocument data={data} />).toBlob();
  const fileName = `value-realization-assessment-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
}
